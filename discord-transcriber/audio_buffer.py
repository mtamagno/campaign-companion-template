"""Fast, thread-safe segmentation of Discord PCM audio by speaker."""

from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
import time


SAMPLE_RATE = 48_000
CHANNELS = 2
SAMPLE_WIDTH = 2
BYTES_PER_SECOND = SAMPLE_RATE * CHANNELS * SAMPLE_WIDTH


@dataclass(frozen=True)
class Utterance:
    user_id: int
    speaker: str
    pcm: bytes

    @property
    def duration_seconds(self) -> float:
        return len(self.pcm) / BYTES_PER_SECOND


@dataclass
class _SpeakerAudio:
    speaker: str
    pcm: bytearray = field(default_factory=bytearray)
    last_packet_at: float = 0.0


class UtteranceBuffer:
    """Collect PCM packets without blocking Pycord's receive thread."""

    def __init__(
        self,
        silence_seconds: float,
        min_seconds: float,
        max_seconds: float,
    ) -> None:
        self.silence_seconds = silence_seconds
        self.min_bytes = int(min_seconds * BYTES_PER_SECOND)
        self.max_bytes = int(max_seconds * BYTES_PER_SECOND)
        self._speakers: dict[int, _SpeakerAudio] = {}
        self._lock = Lock()

    def push(
        self,
        user_id: int,
        speaker: str,
        pcm: bytes,
        now: float | None = None,
    ) -> None:
        if not pcm:
            return
        timestamp = time.monotonic() if now is None else now
        with self._lock:
            audio = self._speakers.setdefault(user_id, _SpeakerAudio(speaker=speaker))
            audio.speaker = speaker
            audio.pcm.extend(pcm)
            audio.last_packet_at = timestamp

    def pop_ready(self, now: float | None = None) -> list[Utterance]:
        timestamp = time.monotonic() if now is None else now
        ready: list[Utterance] = []
        with self._lock:
            for user_id, audio in list(self._speakers.items()):
                idle = timestamp - audio.last_packet_at
                if idle >= self.silence_seconds or len(audio.pcm) >= self.max_bytes:
                    del self._speakers[user_id]
                    if len(audio.pcm) >= self.min_bytes:
                        ready.append(Utterance(user_id, audio.speaker, bytes(audio.pcm)))
        return ready

    def flush_all(self) -> list[Utterance]:
        ready: list[Utterance] = []
        with self._lock:
            speakers = self._speakers
            self._speakers = {}
        for user_id, audio in speakers.items():
            if len(audio.pcm) >= self.min_bytes:
                ready.append(Utterance(user_id, audio.speaker, bytes(audio.pcm)))
        return ready
