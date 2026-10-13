#!/usr/bin/env bash
set -euo pipefail

BOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$BOT_DIR/.venv"

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  python3 -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/python" -m pip install --disable-pip-version-check -r "$BOT_DIR/requirements.txt"
exec "$VENV_DIR/bin/python" "$BOT_DIR/bot.py"
