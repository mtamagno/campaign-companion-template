from __future__ import annotations

import unittest
import wave

from audio_buffer import BYTES_PER_SECOND, UtteranceBuffer
from transcriber import build_hotwords, clean_transcription, pcm_to_wav


class UtteranceBufferTests(unittest.TestCase):
    def test_emits_speaker_after_silence(self) -> None:
        buffer = UtteranceBuffer(silence_seconds=1, min_seconds=0.1, max_seconds=10)
        pcm = bytes(int(BYTES_PER_SECOND * 0.2))
        buffer.push(7, "Alice", pcm, now=5)

        self.assertEqual(buffer.pop_ready(now=5.5), [])
        utterances = buffer.pop_ready(now=6.1)

        self.assertEqual(len(utterances), 1)
        self.assertEqual(utterances[0].speaker, "Alice")
        self.assertEqual(utterances[0].pcm, pcm)

    def test_discards_too_short_audio(self) -> None:
        buffer = UtteranceBuffer(silence_seconds=1, min_seconds=0.5, max_seconds=10)
        buffer.push(7, "Alice", bytes(int(BYTES_PER_SECOND * 0.1)), now=1)
        self.assertEqual(buffer.pop_ready(now=3), [])

    def test_flushes_continuous_speech_at_maximum(self) -> None:
        buffer = UtteranceBuffer(silence_seconds=5, min_seconds=0.1, max_seconds=1)
        buffer.push(7, "Alice", bytes(BYTES_PER_SECOND), now=1)
        self.assertEqual(len(buffer.pop_ready(now=1)), 1)

    def test_wraps_discord_pcm_as_48khz_stereo_wav(self) -> None:
        pcm = bytes(BYTES_PER_SECOND)
        with wave.open(pcm_to_wav(pcm), "rb") as wav:
            self.assertEqual(wav.getframerate(), 48_000)
            self.assertEqual(wav.getnchannels(), 2)
            self.assertEqual(wav.getsampwidth(), 2)
            self.assertEqual(wav.getnframes(), 48_000)

    def test_filters_short_whisper_hallucinations(self) -> None:
        self.assertEqual(clean_transcription(" Grazie mille. "), "")
        self.assertEqual(clean_transcription("Grazie dallo spazio."), "")
        self.assertEqual(clean_transcription("Thank you for watching."), "")
        self.assertEqual(clean_transcription("Thanks everyone."), "")
        self.assertEqual(
            clean_transcription("Grazie, adesso possiamo entrare nel castello."),
            "Grazie, adesso possiamo entrare nel castello.",
        )

    def test_filters_accidental_prompt_echoes(self) -> None:
        self.assertEqual(
            clean_transcription("I nomi propri possibili sono Alice, Ember."),
            "",
        )

    def test_hotwords_remove_decorations_and_duplicates(self) -> None:
        self.assertEqual(
            build_hotwords(("Alice Wanderer 🐰", "፥ ። ֊ Ember", "alice wanderer")),
            "Alice Wanderer, Ember",
        )


if __name__ == "__main__":
    unittest.main()
