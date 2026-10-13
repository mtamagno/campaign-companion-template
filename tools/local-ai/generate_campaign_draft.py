"""Create an original campaign draft through Ollama structured output."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.request import Request, urlopen


OUTPUT = Path(__file__).resolve().parent / "output" / "campaign-draft.json"
SCHEMA = {
    "type": "object",
    "required": ["title", "pitch", "themes", "characters", "npcs", "opening_session"],
    "properties": {
        "title": {"type": "string"},
        "pitch": {"type": "string"},
        "themes": {"type": "array", "items": {"type": "string"}},
        "characters": {
            "type": "array",
            "minItems": 3,
            "maxItems": 6,
            "items": {
                "type": "object",
                "required": ["name", "concept", "hope", "fear", "secret"],
                "properties": {
                    "name": {"type": "string"},
                    "concept": {"type": "string"},
                    "hope": {"type": "string"},
                    "fear": {"type": "string"},
                    "secret": {"type": "string"},
                },
            },
        },
        "npcs": {
            "type": "array",
            "minItems": 3,
            "maxItems": 8,
            "items": {
                "type": "object",
                "required": ["name", "role", "desire"],
                "properties": {
                    "name": {"type": "string"},
                    "role": {"type": "string"},
                    "desire": {"type": "string"},
                },
            },
        },
        "opening_session": {
            "type": "object",
            "required": ["title", "location", "hook", "scenes"],
            "properties": {
                "title": {"type": "string"},
                "location": {"type": "string"},
                "hook": {"type": "string"},
                "scenes": {"type": "array", "items": {"type": "string"}},
            },
        },
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default="qwen3:8b")
    parser.add_argument("--language", choices=("en", "it"), default="en")
    parser.add_argument("--brief", required=True)
    parser.add_argument("--endpoint", default="http://127.0.0.1:11434/api/chat")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    language = "Italian" if args.language == "it" else "English"
    prompt = (
        f"Create a concise tabletop role-playing campaign draft in {language}. "
        "Everything must be original: do not use published settings, adventures, "
        "characters, trademarks, or imitate a named living artist. Make the cast "
        "cooperative, playable, and connected by useful tensions. Brief: "
        f"{args.brief}"
    )
    payload = {
        "model": args.model,
        "stream": False,
        "format": SCHEMA,
        "options": {"temperature": 0.4},
        "messages": [{"role": "user", "content": prompt}],
    }
    request = Request(
        args.endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=600) as response:
        result = json.load(response)
    draft = json.loads(result["message"]["content"])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(draft, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Draft written to {args.output}")


if __name__ == "__main__":
    main()
