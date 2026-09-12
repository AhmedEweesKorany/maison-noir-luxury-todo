#!/usr/bin/env bash
# ◆ MAISON NOIR smart launcher (Linux + macOS)
# Reuses the running server if :PORT answers, else starts it detached,
# then opens the atelier in your default browser.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
PORT="47329"
NO_BROWSER="${MAISON_NO_BROWSER:-0}"
for arg in "$@"; do
  case "$arg" in
    --no-browser) NO_BROWSER="1" ;;
    *) [[ "$arg" =~ ^[0-9]+$ ]] && PORT="$arg" ;;
  esac
done
URL="http://127.0.0.1:${PORT}/"

if curl -fs -o /dev/null --max-time 2 "$URL" 2>/dev/null; then
  echo "◆ Maison already gilded at $URL"
else
  echo "◆ Igniting the maison on :${PORT} ..."
  nohup python3 "$HERE/server.py" -p "$PORT" --no-browser > "$HERE/.maison.log" 2>&1 &
  for _ in $(seq 1 50); do
    curl -fs -o /dev/null --max-time 1 "$URL" 2>/dev/null && break
    sleep 0.2
  done
fi

if [ "$NO_BROWSER" = "1" ]; then echo "◆ (browser suppressed) $URL"; exit 0; fi
if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then open "$URL" &
else python3 -c "import webbrowser; webbrowser.open('$URL')" >/dev/null 2>&1 & fi
echo "◆ Atelier: $URL"
