"""Queue one prompt using a user-supplied ComfyUI API workflow."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.request import Request, urlopen


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workflow", type=Path, required=True)
    parser.add_argument("--prompt-node", required=True, help="Node ID containing inputs.text")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--endpoint", default="http://127.0.0.1:8188/prompt")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    workflow = json.loads(args.workflow.read_text(encoding="utf-8"))
    node = workflow.get(str(args.prompt_node))
    if not isinstance(node, dict) or not isinstance(node.get("inputs"), dict):
        raise SystemExit(f"Prompt node {args.prompt_node!r} not found in API workflow")
    node["inputs"]["text"] = args.prompt
    request = Request(
        args.endpoint,
        data=json.dumps({"prompt": workflow}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=30) as response:
        result = json.load(response)
    print(f"Queued ComfyUI prompt: {result.get('prompt_id', 'unknown id')}")


if __name__ == "__main__":
    main()
