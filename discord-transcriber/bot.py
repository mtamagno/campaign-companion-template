"""Discord bot for local, speaker-labelled session transcription."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime
import logging
import os
from pathlib import Path
from threading import Event, Lock, Thread

import discord
from discord.sinks import Sink
from dotenv import load_dotenv

from audio_buffer import Utterance, UtteranceBuffer
from transcriber import TranscriptionJob, WhisperWorker


BOT_DIR = Path(__file__).resolve().parent
load_dotenv(BOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
LOGGER = logging.getLogger("discord-transcriber")


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except ValueError as exc:
        raise SystemExit(f"{name} must be a number") from exc


def _safe_filename(value: str) -> str:
    safe = "".join(
        character
        for character in value
        if character.isalnum() or character in "-_ "
    )
    return safe.strip().replace(" ", "-")[:60] or "channel"


@dataclass(frozen=True)
class Settings:
    token: str
    model: str
    device: str
    compute_type: str
    language: str
    silence_seconds: float
    min_seconds: float
    max_seconds: float

    @classmethod
    def from_env(cls) -> "Settings":
        token = os.getenv("DISCORD_TOKEN", "").strip()
        if not token or token == "replace-me":
            raise SystemExit("DISCORD_TOKEN is not configured: copy .env.example to .env")
        return cls(
            token=token,
            model=os.getenv("WHISPER_MODEL", "small"),
            device=os.getenv("WHISPER_DEVICE", "cpu"),
            compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"),
            language=os.getenv("WHISPER_LANGUAGE", "en"),
            silence_seconds=_env_float("SILENCE_MS", 900) / 1000,
            min_seconds=_env_float("MIN_UTTERANCE_MS", 450) / 1000,
            max_seconds=_env_float("MAX_UTTERANCE_SECONDS", 25),
        )


class DiscordAudioSink(Sink):
    def __init__(
        self,
        buffer: UtteranceBuffer,
        participant_names: dict[int, str],
    ) -> None:
        super().__init__()
        self.buffer = buffer
        self.participant_names = participant_names

    def write(self, data, user) -> None:
        pcm = getattr(data, "pcm", b"")
        user_id = getattr(user, "id", None)
        if user_id is None or getattr(user, "bot", False) or not pcm:
            return
        display_name = (
            getattr(user, "display_name", None)
            or self.participant_names.get(user_id)
            or getattr(user, "name", None)
            or f"Discord user {user_id}"
        )
        self.participant_names[user_id] = display_name
        self.buffer.push(user_id, display_name, pcm)


class ActiveSession:
    def __init__(
        self,
        guild_id: int,
        guild_name: str,
        voice_channel_id: int,
        voice_channel_name: str,
        participant_names: dict[int, str],
        settings: Settings,
        worker: WhisperWorker,
    ) -> None:
        self.guild_id = guild_id
        self.voice_channel_id = voice_channel_id
        self.voice_channel_name = voice_channel_name
        self.participant_names = participant_names
        self.names = set(participant_names.values())
        self.settings = settings
        self.worker = worker
        self.buffer = UtteranceBuffer(
            settings.silence_seconds,
            settings.min_seconds,
            settings.max_seconds,
        )
        self.sink = DiscordAudioSink(self.buffer, participant_names)
        self._stop = Event()
        self._file_lock = Lock()
        self._segmenter = Thread(
            target=self._segment_loop,
            name=f"audio-segmenter-{guild_id}",
            daemon=True,
        )
        started = datetime.now()
        stamp = started.strftime("%Y-%m-%d_%H-%M-%S")
        channel_slug = _safe_filename(voice_channel_name)
        self.transcript_path = (
            BOT_DIR / "transcripts" / f"{stamp}_{channel_slug}_{guild_id}.md"
        )
        self.transcript_path.parent.mkdir(parents=True, exist_ok=True)
        participants = ", ".join(sorted(self.names, key=str.casefold)) or "none"
        self.transcript_path.write_text(
            "# Appunti della sessione Discord\n\n"
            f"- **Inizio:** {started.strftime('%d/%m/%Y %H:%M:%S')}\n"
            f"- **Server:** {guild_name}\n"
            f"- **Canale vocale:** {voice_channel_name}\n"
            f"- **Partecipanti iniziali:** {participants}\n"
            f"- **Modello:** {settings.model}\n\n"
            "## Session transcript\n\n",
            encoding="utf-8",
        )

    def start(self) -> None:
        self._segmenter.start()

    def add_participant(self, user_id: int, display_name: str) -> None:
        self.participant_names[user_id] = display_name
        self.names.add(display_name)

    def stop(self) -> None:
        self._stop.set()
        for utterance in self.buffer.flush_all():
            self._submit(utterance)

    def _segment_loop(self) -> None:
        while not self._stop.wait(0.1):
            for utterance in self.buffer.pop_ready():
                self._submit(utterance)

    def _submit(self, utterance: Utterance) -> None:
        self.names.add(utterance.speaker)
        self.worker.submit(
            TranscriptionJob(
                utterance,
                tuple(sorted(self.names, key=str.casefold)),
                self._save_transcription,
            )
        )

    def _save_transcription(self, speaker: str, text: str) -> None:
        timestamp = datetime.now().strftime("%H:%M:%S")
        with self._file_lock, self.transcript_path.open("a", encoding="utf-8") as output:
            output.write(f"- **{timestamp} — {speaker}:** {text}\n")
        LOGGER.info("Appunto salvato: %s — %s", speaker, text)


settings = Settings.from_env()
intents = discord.Intents.default()
bot = discord.Bot(intents=intents)
worker = WhisperWorker(
    settings.model,
    settings.device,
    settings.compute_type,
    settings.language,
)
sessions: dict[int, ActiveSession] = {}


async def _reply(ctx: discord.ApplicationContext, message: str) -> None:
    """Send control feedback visible only to the command author."""
    if ctx.response.is_done():
        await ctx.followup.send(message, ephemeral=True)
    else:
        await ctx.respond(message, ephemeral=True)


async def _voice_participant_names(
    guild: discord.Guild,
    voice_channel,
) -> dict[int, str]:
    """Resolve voice participants even when Discord's member cache is incomplete."""
    known_members = {member.id: member for member in voice_channel.members}
    participant_ids = set(getattr(voice_channel, "voice_states", {}))
    participant_ids.update(known_members)
    names: dict[int, str] = {}

    for user_id in participant_ids:
        member = known_members.get(user_id) or guild.get_member(user_id)
        if member is None:
            try:
                member = await guild.fetch_member(user_id)
            except discord.HTTPException:
                LOGGER.warning("Could not resolve the Discord name for %s", user_id)
                continue
        if not member.bot:
            names[user_id] = member.display_name

    return names


def _forget_partial_voice_client(guild: discord.Guild) -> None:
    """Remove a timed-out voice client so a retry can start cleanly."""
    voice_client = guild.voice_client
    if voice_client is None:
        return
    try:
        voice_client.stop()
        voice_client.cleanup()
    except Exception:
        LOGGER.exception("Partial voice connection cleanup failed")


def _consume_cancelled_task(task: asyncio.Task) -> None:
    try:
        task.result()
    except BaseException:
        pass


@bot.event
async def on_ready() -> None:
    LOGGER.info("Connected as %s", bot.user)


@bot.slash_command(description="Start voice notes saved only on the local computer")
async def trascrivi(ctx: discord.ApplicationContext) -> None:
    if ctx.guild is None or not isinstance(ctx.author, discord.Member):
        return await _reply(ctx, "This command works only inside a server.")
    if ctx.author.voice is None or ctx.author.voice.channel is None:
        return await _reply(ctx, "Join a voice channel first.")
    if ctx.guild.id in sessions:
        return await _reply(ctx, "I am already taking notes in this server. Use `/ferma`.")

    voice_channel = ctx.author.voice.channel
    permissions = voice_channel.permissions_for(ctx.guild.me)
    required_permissions = (
        ("View Channel", permissions.view_channel),
        ("Connect", permissions.connect),
        ("Speak", permissions.speak),
        ("Use Voice Activity", permissions.use_voice_activation),
    )
    missing_permissions = [name for name, enabled in required_permissions if not enabled]
    if missing_permissions:
        return await _reply(
            ctx,
            "I am missing these permissions in the voice channel: "
            + ", ".join(missing_permissions)
            + ". Enable them for the bot role in the channel settings.",
        )

    await ctx.respond(
        f"Connecting to voice channel `{voice_channel.name}`…",
        ephemeral=True,
    )
    participant_names = await _voice_participant_names(ctx.guild, voice_channel)
    voice_client = None
    try:
        connect_task = asyncio.create_task(
            voice_channel.connect(timeout=12.0, reconnect=False)
        )
        done, _ = await asyncio.wait({connect_task}, timeout=15.0)
        if connect_task not in done:
            connect_task.cancel()
            connect_task.add_done_callback(_consume_cancelled_task)
            _forget_partial_voice_client(ctx.guild)
            LOGGER.error("Hard timeout while connecting to channel %s", voice_channel.id)
            return await _reply(
                ctx,
                "Discord did not complete the voice connection within 15 seconds. "
                "Check the channel permission overrides and try again.",
            )

        voice_client = connect_task.result()
        is_dave = getattr(voice_client, "is_dave_connection", lambda: False)()
        if not is_dave:
            await voice_client.disconnect(force=True)
            return await _reply(
                ctx,
                "DAVE connection is not active: reinstall dependencies from "
                "`requirements.txt`.",
            )

        session = ActiveSession(
            ctx.guild.id,
            ctx.guild.name,
            voice_channel.id,
            voice_channel.name,
            participant_names,
            settings,
            worker,
        )
        sessions[ctx.guild.id] = session
        voice_client.start_recording(session.sink)
        session.start()
    except asyncio.TimeoutError:
        LOGGER.exception("Voice connection timed out")
        _forget_partial_voice_client(ctx.guild)
        return await _reply(
            ctx,
            "Discord did not complete the voice connection. "
            "Check the channel permissions and try again.",
        )
    except Exception:
        LOGGER.exception("Session startup failed")
        if voice_client is not None and voice_client.is_connected():
            await voice_client.disconnect(force=True)
        else:
            _forget_partial_voice_client(ctx.guild)
        return await _reply(ctx, "I could not join or listen to the voice channel.")

    await _reply(
        ctx,
        "Local transcription started. No text will be posted in chat: "
        f"notes are saved to `{session.transcript_path.name}`. Use `/ferma` to finish.",
    )


@bot.event
async def on_voice_state_update(member, before, after) -> None:
    """Keep speaker names current when somebody joins during a session."""
    if getattr(member, "bot", False) or after.channel is None:
        return
    session = sessions.get(member.guild.id)
    if session is not None and after.channel.id == session.voice_channel_id:
        session.add_participant(member.id, member.display_name)


@bot.slash_command(description="Stop taking notes and leave the voice channel")
async def ferma(ctx: discord.ApplicationContext) -> None:
    if ctx.guild is None:
        return await _reply(ctx, "This command works only inside a server.")
    session = sessions.pop(ctx.guild.id, None)
    voice_client = ctx.guild.voice_client
    if session is None or voice_client is None:
        return await _reply(ctx, "There is no active transcription.")

    if voice_client.is_recording():
        voice_client.stop_recording()
    session.stop()
    await voice_client.disconnect()
    await _reply(
        ctx,
        f"Transcription stopped. Local notes: `{session.transcript_path.name}`.",
    )


@bot.slash_command(description="Show local transcription status")
async def stato(ctx: discord.ApplicationContext) -> None:
    session = sessions.get(ctx.guild.id) if ctx.guild else None
    active = (
        f"active in `{session.voice_channel_name}`; file `{session.transcript_path.name}`"
        if session
        else "inactive"
    )
    await _reply(ctx, f"Transcription: {active}. Whisper `{settings.model}`: {worker.status}.")


@bot.slash_command(description="Show Discord users recognized as speakers")
async def partecipanti(ctx: discord.ApplicationContext) -> None:
    if ctx.guild is None or not isinstance(ctx.author, discord.Member):
        return await _reply(ctx, "This command works only inside a server.")
    session = sessions.get(ctx.guild.id)
    if session:
        names = sorted(session.names, key=str.casefold)
    elif ctx.author.voice and ctx.author.voice.channel:
        names = sorted(
            (
                member.display_name
                for member in ctx.author.voice.channel.members
                if not member.bot
            ),
            key=str.casefold,
        )
    else:
        names = []
    await _reply(ctx, "Participants: " + (", ".join(names) if names else "none"))


if __name__ == "__main__":
    worker.start()
    try:
        bot.run(settings.token)
    finally:
        for active_session in sessions.values():
            active_session.stop()
        worker.stop()
