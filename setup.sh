#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js 24 from https://nodejs.org/"
  exit 1
fi

exec node tools/campaign-manager/server.mjs --open
