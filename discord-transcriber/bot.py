"""Discord bot for local, speaker-labelled Italian transcription."""

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
        raise SystemExit(f"{name} deve essere un numero") from exc


def _safe_filename(value: str) -> str:
    safe = "".join(
        character
        for character in value
        if character.isalnum() or character in "-_ "
    )
    return safe.strip().replace(" ", "-")[:60] or "canale"


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
            raise SystemExit("DISCORD_TOKEN non configurato: copia .env.example in .env")
        return cls(
            token=token,
            model=os.getenv("WHISPER_MODEL", "small"),
            device=os.getenv("WHISPER_DEVICE", "cpu"),
            compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"),
            language=os.getenv("WHISPER_LANGUAGE", "it"),
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
            or f"Utente Discord {user_id}"
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
        participants = ", ".join(sorted(self.names, key=str.casefold)) or "nessuno"
        self.transcript_path.write_text(
            "# Appunti della sessione Discord\n\n"
            f"- **Inizio:** {started.strftime('%d/%m/%Y %H:%M:%S')}\n"
            f"- **Server:** {guild_name}\n"
            f"- **Canale vocale:** {voice_channel_name}\n"
            f"- **Partecipanti iniziali:** {participants}\n"
            f"- **Modello:** {settings.model}\n\n"
            "## Trascrizione\n\n",
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
                LOGGER.warning("Impossibile risolvere il nome Discord per %s", user_id)
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
        LOGGER.exception("Pulizia della connessione vocale parziale fallita")


def _consume_cancelled_task(task: asyncio.Task) -> None:
    try:
        task.result()
    except BaseException:
        pass


@bot.event
async def on_ready() -> None:
    LOGGER.info("Connesso come %s", bot.user)


@bot.slash_command(description="Avvia gli appunti vocali salvati solo sul PC locale")
async def trascrivi(ctx: discord.ApplicationContext) -> None:
    if ctx.guild is None or not isinstance(ctx.author, discord.Member):
        return await _reply(ctx, "Questo comando funziona solo dentro un server.")
    if ctx.author.voice is None or ctx.author.voice.channel is None:
        return await _reply(ctx, "Entra prima in un canale vocale.")
    if ctx.guild.id in sessions:
        return await _reply(ctx, "Sto già prendendo appunti in questo server. Usa `/ferma`.")

    voice_channel = ctx.author.voice.channel
    permissions = voice_channel.permissions_for(ctx.guild.me)
    required_permissions = (
        ("Visualizza canale", permissions.view_channel),
        ("Connetti", permissions.connect),
        ("Parla", permissions.speak),
        ("Usa attività vocale", permissions.use_voice_activation),
    )
    missing_permissions = [name for name, enabled in required_permissions if not enabled]
    if missing_permissions:
        return await _reply(
            ctx,
            "Mi mancano questi permessi nel canale vocale: "
            + ", ".join(missing_permissions)
            + ". Abilitali per il ruolo `Campaign Scribe` nelle impostazioni del canale.",
        )

    await ctx.respond(
        f"Connessione al canale vocale `{voice_channel.name}` in corso…",
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
            LOGGER.error("Timeout rigido durante la connessione al canale %s", voice_channel.id)
            return await _reply(
                ctx,
                "Discord non ha completato la connessione vocale entro 15 secondi. "
                "Controlla gli override dei permessi del canale e riprova.",
            )

        voice_client = connect_task.result()
        is_dave = getattr(voice_client, "is_dave_connection", lambda: False)()
        if not is_dave:
            await voice_client.disconnect(force=True)
            return await _reply(
                ctx,
                "Connessione DAVE non attiva: reinstalla le dipendenze dal file "
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
        LOGGER.exception("Timeout durante la connessione vocale")
        _forget_partial_voice_client(ctx.guild)
        return await _reply(
            ctx,
            "Discord non ha completato la connessione vocale. "
            "Controlla i permessi del canale e riprova.",
        )
    except Exception:
        LOGGER.exception("Avvio della sessione fallito")
        if voice_client is not None and voice_client.is_connected():
            await voice_client.disconnect(force=True)
        else:
            _forget_partial_voice_client(ctx.guild)
        return await _reply(ctx, "Non riesco a entrare o ascoltare il canale vocale.")

    await _reply(
        ctx,
        "Trascrizione locale avviata. Nessun testo verrà pubblicato nella chat: "
        f"gli appunti finiscono in `{session.transcript_path.name}`. Usa `/ferma` per terminare.",
    )


@bot.event
async def on_voice_state_update(member, before, after) -> None:
    """Keep speaker names current when somebody joins during a session."""
    if getattr(member, "bot", False) or after.channel is None:
        return
    session = sessions.get(member.guild.id)
    if session is not None and after.channel.id == session.voice_channel_id:
        session.add_participant(member.id, member.display_name)


@bot.slash_command(description="Ferma gli appunti e fa uscire il bot")
async def ferma(ctx: discord.ApplicationContext) -> None:
    if ctx.guild is None:
        return await _reply(ctx, "Questo comando funziona solo dentro un server.")
    session = sessions.pop(ctx.guild.id, None)
    voice_client = ctx.guild.voice_client
    if session is None or voice_client is None:
        return await _reply(ctx, "Non c'è una trascrizione attiva.")

    if voice_client.is_recording():
        voice_client.stop_recording()
    session.stop()
    await voice_client.disconnect()
    await _reply(
        ctx,
        f"Trascrizione fermata. Appunti locali: `{session.transcript_path.name}`.",
    )


@bot.slash_command(description="Mostra lo stato della trascrizione locale")
async def stato(ctx: discord.ApplicationContext) -> None:
    session = sessions.get(ctx.guild.id) if ctx.guild else None
    active = (
        f"attiva nel canale `{session.voice_channel_name}`; file `{session.transcript_path.name}`"
        if session
        else "non attiva"
    )
    await _reply(ctx, f"Trascrizione: {active}. Whisper `{settings.model}`: {worker.status}.")


@bot.slash_command(description="Mostra gli utenti Discord riconosciuti come parlanti")
async def partecipanti(ctx: discord.ApplicationContext) -> None:
    if ctx.guild is None or not isinstance(ctx.author, discord.Member):
        return await _reply(ctx, "Questo comando funziona solo dentro un server.")
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
    await _reply(ctx, "Partecipanti: " + (", ".join(names) if names else "nessuno"))


if __name__ == "__main__":
    worker.start()
    try:
        bot.run(settings.token)
    finally:
        for active_session in sessions.values():
            active_session.stop()
        worker.stop()
