"""Build original, model-agnostic image prompts from a campaign draft."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--draft", type=Path, default=ROOT / "output" / "campaign-draft.json")
    parser.add_argument("--output", type=Path, default=ROOT / "output" / "image-prompts.json")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    draft = json.loads(args.draft.read_text(encoding="utf-8"))
    safety = (
        "original tabletop fantasy design, no copyrighted characters, no logos, "
        "no signatures, no readable text"
    )
    prompts = [
        {
            "id": "campaign-hero",
            "aspect_ratio": "16:9",
            "prompt": (
                f"Campaign key art for {draft['title']}: {draft['pitch']}. "
                f"Cinematic environment, welcoming ensemble mood, {safety}"
            ),
        }
    ]
    for index, character in enumerate(draft.get("characters", []), start=1):
        prompts.append(
            {
                "id": f"character-{index}",
                "aspect_ratio": "2:3",
                "prompt": (
                    f"Full-body character reference for {character['name']}, "
                    f"{character['concept']}. Neutral background, coherent practical outfit, "
                    f"natural anatomy, {safety}"
                ),
            }
        )
    for index, npc in enumerate(draft.get("npcs", []), start=1):
        prompts.append(
            {
                "id": f"npc-{index}",
                "aspect_ratio": "4:5",
                "prompt": (
                    f"Portrait of {npc['name']}, {npc['role']}, motivated by "
                    f"{npc['desire']}. Expressive lighting, {safety}"
                ),
            }
        )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(prompts, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Prompt pack written to {args.output}")


if __name__ == "__main__":
    main()
