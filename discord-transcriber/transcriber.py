"""Single background worker around faster-whisper."""

from __future__ import annotations

from dataclasses import dataclass
from importlib.util import find_spec
from io import BytesIO
import os
from queue import Queue
from threading import Event, Thread
from typing import Callable
import logging
import wave

from audio_buffer import CHANNELS, SAMPLE_RATE, SAMPLE_WIDTH, Utterance


LOGGER = logging.getLogger(__name__)
ResultCallback = Callable[[str, str], None]
_CUDA_DLL_HANDLES: list[object] = []
_LOW_VALUE_HALLUCINATIONS = {
    "grazie",
    "grazie mille",
    "grazie a tutti",
    "grazie per l'attenzione",
    "alla prossima",
}
_PROMPT_LEAK_PREFIXES = (
    "i nomi propri possibili sono",
    "trascrizione fedele in italiano",
)


def clean_transcription(text: str) -> str:
    """Drop short stock phrases Whisper commonly invents from background noise."""
    cleaned = " ".join(text.split()).strip()
    normalized = cleaned.casefold().rstrip(".!?,;:")
    if normalized in _LOW_VALUE_HALLUCINATIONS:
        return ""
    if normalized.startswith(_PROMPT_LEAK_PREFIXES):
        return ""
    if normalized.startswith("grazie ") and len(normalized.split()) <= 4:
        return ""
    return cleaned


def build_hotwords(names: tuple[str, ...]) -> str:
    """Build a bounded, de-duplicated list without Discord decoration noise."""
    cleaned_names: list[str] = []
    seen: set[str] = set()
    for name in names:
        cleaned = " ".join(
            "".join(char if char.isalnum() or char in " -'" else " " for char in name).split()
        ).strip(" -'")
        key = cleaned.casefold()
        if not cleaned or key in seen:
            continue
        seen.add(key)
        cleaned_names.append(cleaned[:80])
        if len(cleaned_names) >= 40:
            break
    return ", ".join(cleaned_names)


def configure_cuda_dlls() -> None:
    """Make NVIDIA's pip-installed CUDA DLLs visible to CTranslate2 on Windows."""
    if os.name != "nt" or _CUDA_DLL_HANDLES:
        return

    dll_dirs: list[str] = []
    for package in ("nvidia.cublas", "nvidia.cudnn", "nvidia.cuda_nvrtc"):
        spec = find_spec(package)
        if spec is None or not spec.submodule_search_locations:
            continue
        dll_dir = next(iter(spec.submodule_search_locations)) + "\\bin"
        if os.path.isdir(dll_dir):
            dll_dirs.append(dll_dir)
            _CUDA_DLL_HANDLES.append(os.add_dll_directory(dll_dir))

    if dll_dirs:
        # CTranslate2 uses its own loader, which also needs these directories in
        # the current process PATH. This does not change the user's global PATH.
        os.environ["PATH"] = os.pathsep.join(dll_dirs + [os.environ["PATH"]])


@dataclass(frozen=True)
class TranscriptionJob:
    utterance: Utterance
    names: tuple[str, ...]
    callback: ResultCallback


def pcm_to_wav(pcm: bytes) -> BytesIO:
    output = BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setnchannels(CHANNELS)
        wav.setsampwidth(SAMPLE_WIDTH)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm)
    output.seek(0)
    return output


class WhisperWorker:
    def __init__(
        self,
        model_name: str,
        device: str,
        compute_type: str,
        language: str,
    ) -> None:
        self.model_name = model_name
        self.device = device
        self.compute_type = compute_type
        self.language = language
        self._queue: Queue[TranscriptionJob | None] = Queue()
        self._ready = Event()
        self._load_error: str | None = None
        self._thread = Thread(target=self._run, name="whisper-worker", daemon=True)

    @property
    def status(self) -> str:
        if self._load_error:
            return f"errore: {self._load_error}"
        if self._ready.is_set():
            return "pronto"
        return "caricamento modello"

    def start(self) -> None:
        self._thread.start()

    def submit(self, job: TranscriptionJob) -> None:
        self._queue.put(job)

    def stop(self) -> None:
        self._queue.put(None)

    def _run(self) -> None:
        try:
            if self.device in {"cuda", "auto"}:
                configure_cuda_dlls()

            from faster_whisper import WhisperModel

            LOGGER.info(
                "Caricamento Whisper %s su %s (%s)",
                self.model_name,
                self.device,
                self.compute_type,
            )
            model = WhisperModel(
                self.model_name,
                device=self.device,
                compute_type=self.compute_type,
            )
            # Force one encoder pass so CUDA/runtime problems are reported at
            # startup instead of during the first spoken sentence.
            silent_pcm = bytes(SAMPLE_RATE * CHANNELS * SAMPLE_WIDTH)
            warmup_segments, _ = model.transcribe(
                pcm_to_wav(silent_pcm),
                language=self.language,
                beam_size=1,
                vad_filter=False,
            )
            list(warmup_segments)
            self._ready.set()
            LOGGER.info("Modello Whisper pronto")
        except Exception as exc:  # the error is surfaced via /stato and logs
            self._load_error = str(exc)
            LOGGER.exception("Impossibile caricare Whisper")
            return

        while True:
            job = self._queue.get()
            if job is None:
                return
            try:
                names = build_hotwords(job.names)
                segments, _ = model.transcribe(
                    pcm_to_wav(job.utterance.pcm),
                    language=self.language,
                    beam_size=5,
                    vad_filter=True,
                    vad_parameters={
                        "threshold": 0.65,
                        "min_speech_duration_ms": 350,
                        "min_silence_duration_ms": 300,
                    },
                    no_speech_threshold=0.5,
                    log_prob_threshold=-0.8,
                    hallucination_silence_threshold=1.0,
                    condition_on_previous_text=False,
                    hotwords=names or None,
                )
                text = clean_transcription(
                    " ".join(segment.text.strip() for segment in segments)
                )
                if text:
                    job.callback(job.utterance.speaker, text)
            except Exception:
                LOGGER.exception("Trascrizione fallita per %s", job.utterance.speaker)
