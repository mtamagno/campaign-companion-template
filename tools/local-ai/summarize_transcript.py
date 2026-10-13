"""Turn a local Campaign Scribe transcript into a bilingual session draft."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.request import Request, urlopen


OUTPUT = Path(__file__).resolve().parent / "output" / "session-draft.json"
BILINGUAL = {
    "type": "object",
    "required": ["en", "it"],
    "properties": {"en": {"type": "string"}, "it": {"type": "string"}},
}
SCHEMA = {
    "type": "object",
    "required": ["title", "summary", "location", "keyEvents", "prose", "storySoFar"],
    "properties": {
        "title": BILINGUAL,
        "summary": BILINGUAL,
        "location": BILINGUAL,
        "keyEvents": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["description"],
                "properties": {"description": BILINGUAL},
            },
        },
        "prose": BILINGUAL,
        "storySoFar": BILINGUAL,
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("transcript", type=Path)
    parser.add_argument("--model", default="qwen3:8b")
    parser.add_argument("--endpoint", default="http://127.0.0.1:11434/api/chat")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    transcript = args.transcript.read_text(encoding="utf-8")
    if len(transcript) > 180_000:
        raise SystemExit("Transcript exceeds 180,000 characters; split it into parts first.")
    prompt = (
        "Summarize this tabletop session as factual campaign notes in English and "
        "Italian. Preserve player-character and NPC names. Do not add events, motives, "
        "rules, or setting facts absent from the transcript. Keep secrets only if they "
        "were spoken aloud. Use <hr> between prose sections. Transcript:\n\n"
        + transcript
    )
    payload = {
        "model": args.model,
        "stream": False,
        "format": SCHEMA,
        "options": {"temperature": 0.1},
        "messages": [{"role": "user", "content": prompt}],
    }
    request = Request(
        args.endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=900) as response:
        result = json.load(response)
    draft = json.loads(result["message"]["content"])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(draft, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Session draft written to {args.output}")


if __name__ == "__main__":
    main()
