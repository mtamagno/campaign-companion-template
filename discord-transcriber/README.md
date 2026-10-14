# Discord Session Scribe

Discord Session Scribe is an optional, local note-taking bot for groups that
play in a Discord voice channel. It joins the channel of the person who runs
`/trascrivi`, keeps each Discord user's audio separate, transcribes speech with
faster-whisper and appends timestamped lines to a local Markdown file.

```text
- **21:34:08 — Alice:** We should speak to the keeper before entering the tower.
- **21:34:19 — Bruno:** I check whether we still have healing potions.
```

Speaker labels come from Discord display names; the bot performs no biometric
voice identification. Names are also supplied to Whisper as hints to improve
proper-noun accuracy.

> The Scribe is never required by QuestKeeper. Handwritten notes or any notes
> app work just as well: enter the recap and key events in the Campaign
> Manager's **Sessions** tab after the game.

## Privacy first

- Transcripts stay in `discord-transcriber/transcripts/` on the computer
  running the bot.
- Transcribed text is not posted into Discord channels.
- Command replies are private/ephemeral.
- PCM audio exists in memory only while a short utterance is segmented and is
  not saved as an audio recording.
- `.env`, virtual environments, transcripts, logs and PID files are ignored by
  Git.

Tell every participant before listening begins, obtain informed consent and
follow your server rules and local law.

## Start it from Campaign Manager

After completing the one-time setup below, open Campaign Manager and choose
**Discord Session Scribe** in the sidebar. The panel can prepare dependencies,
start the bot, show its live status and log, and stop it at the end of play.

You may also run the platform launcher directly:

- Windows: `discord-transcriber/start.bat`
- macOS or Linux: `discord-transcriber/start.sh`

The first launch creates `.venv`, installs the pinned dependencies and
downloads the selected Whisper model. Later launches reuse the local
environment and model cache.

## Requirements

- Python 3.11 or newer on Windows, macOS or Linux;
- internet access for the first dependency/model download;
- roughly 4 GB of initial free space for the environment and model cache;
- optional NVIDIA GPU with about 10 GB VRAM for the default `large-v3` CUDA
  profile.

CPU-only use is supported. Choose a smaller model and the `cpu`/`int8` profile
in `.env` when necessary.

## Create and invite the Discord bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications)
   and create an application.
2. Open **Bot**, generate a token and treat it like a password.
3. Copy `.env.example` to `.env`, then place the token in `DISCORD_TOKEN`.
4. In **OAuth2 → URL Generator**, select `bot` and `applications.commands`.
5. Grant **View Channels**, **Send Messages**, **Connect**, **Speak** and
   **Use Voice Activity**.
6. Open the generated URL and authorize the application for your server.

No Message Content Intent or other privileged intent is required. For private
voice channels, the bot role needs the same permissions in the channel or
category overrides.

Discord voice calls require DAVE/E2EE support. `requirements.txt` therefore
pins a precise Pycord revision that supports DAVE receiving. Do not install
`discord.py` in the same virtual environment because both projects expose the
same `discord` Python package.

## Configure transcription

Copy the example file:

```powershell
Copy-Item discord-transcriber/.env.example discord-transcriber/.env
```

Linux/macOS equivalent:

```bash
cp discord-transcriber/.env.example discord-transcriber/.env
```

Available values:

| Variable                |      Default | Purpose                                                |
| ----------------------- | -----------: | ------------------------------------------------------ |
| `DISCORD_TOKEN`         | `replace-me` | Secret bot token                                       |
| `WHISPER_MODEL`         |   `large-v3` | faster-whisper model                                   |
| `WHISPER_DEVICE`        |       `cuda` | `cuda` or `cpu`                                        |
| `WHISPER_COMPUTE_TYPE`  |    `float16` | GPU/CPU precision                                      |
| `WHISPER_LANGUAGE`      |         `en` | Spoken-language code, such as `en`, `it`, `es` or `de` |
| `SILENCE_MS`            |        `900` | Silence that closes one utterance                      |
| `MIN_UTTERANCE_MS`      |        `450` | Minimum accepted speech duration                       |
| `MAX_UTTERANCE_SECONDS` |         `25` | Maximum size of one buffered segment                   |

For CPU use, a practical starting point is:

```dotenv
WHISPER_MODEL=small
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
```

## During a session

1. Start the Scribe from Campaign Manager or a launcher.
2. Join the Discord voice channel with the other participants.
3. In a text channel on the same server, run `/trascrivi`.
4. Wait for the private confirmation containing the local transcript filename.
5. At the end, run `/ferma` and wait for the last buffered phrase to finish.

Commands currently keep their original short Italian names:

- `/trascrivi` — start a new local transcript and join voice;
- `/ferma` — flush pending phrases, stop and leave voice;
- `/stato` — show model, channel and current file;
- `/partecipanti` — show the Discord names used for speaker attribution.

The Markdown file can be opened while play continues; recognized phrases are
appended immediately. Simultaneous speakers remain separate because Discord
delivers one stream per user, although their lines can arrive slightly out of
chronological order when one transcription finishes first.

## Long sessions

The model is loaded once. Audio is not accumulated for the whole game: every
active per-speaker buffer is capped at 25 seconds (about 4.8 MB), and the final
Markdown usually occupies only a few megabytes. More simultaneous speakers
increase inference work but do not merge their voices.

For important games, occasionally check `/stato` and the local log, and prevent
the host computer from sleeping.

## Troubleshooting

### The command stays on “thinking”

The bot applies a strict 15-second voice connection timeout. Check channel and
category permission overrides, then try again.

### The bot does not join voice

Verify **View Channel**, **Connect**, **Speak** and **Use Voice Activity** for
the bot role at both server and channel level.

### The transcript contains only its heading

The connection can be healthy without text. Whisper writes a line only when
voice activity detection finds speech; silence, breaths and short noise are
ignored.

### CUDA cannot be loaded

Update the NVIDIA driver, remove and recreate `.venv`, then relaunch. Windows
CUDA 12 runtime packages are installed inside the virtual environment and do
not modify the global `PATH`.

## Tests

```powershell
$env:PYTHONPATH = $PWD
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe -m pip check
```

The tests cover segmentation, speaker attribution, silence-hallucination
filters and PCM/WAV conversion.
