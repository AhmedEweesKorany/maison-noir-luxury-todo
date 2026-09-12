#!/usr/bin/env bash
# ◆ MAISON NOIR — macOS Spotlight shortcut installer
# RUN THIS ON A MAC (this script needs macOS tools: osacompile + open):
#   1. Copy the whole maison-noir-luxury-todo folder to your Mac
#   2. Install Python 3 (python.org installer, or: brew install python)
#   3. In Terminal:  cd <folder> && chmod +x install-macos.sh launch.sh && ./install-macos.sh
#   4. Press Cmd+Space, type:  maison todo
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$HOME/Applications"
APP="$APP_DIR/Maison Todo.app"

if ! command -v osacompile >/dev/null; then
  echo "✕ osacompile not found — run this script on macOS." >&2
  exit 1
fi

mkdir -p "$APP_DIR"
# AppleScript wrapper: start (or reuse) the server, then open the browser.
osacompile -o "$APP" -e "do shell script \"sh '$HERE/launch.sh' >/dev/null 2>&1 &\"" 2>/dev/null
# launch.sh already opens the browser itself; the trailing & detaches it.

echo "◆ Installed → $APP"
echo "  Press Cmd+Space, type:  maison todo"
echo "  First launch: right-click the app > Open (once) to clear Gatekeeper,"
echo "  or:  xattr -d com.apple.quarantine \"$APP\""
echo "  Optional icon: open assets/icon.png, Cmd+C, Get Info on the app,"
echo "  click its icon, Cmd+V."
echo "  Uninstall: delete Maison Todo.app from ~/Applications."
