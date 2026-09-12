#!/usr/bin/env bash
# MAISON NOIR launcher — strange port :47329
set -e
cd "$(dirname "$0")"
PORT="${1:-47329}"
echo "◆ Opening MAISON NOIR on http://127.0.0.1:${PORT}/ ..."
python3 server.py -p "$PORT"
