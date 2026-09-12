#!/usr/bin/env bash
# ◆ MAISON NOIR — Linux system shortcut installer
# Installs a "Maison Todo" launcher so Super-key search / app menu finds it.
#   ./install-linux.sh            install (or re-install after moving the folder)
#   ./install-linux.sh --uninstall   remove it again
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
TARGET="$TARGET_DIR/maison-noir.desktop"

if [ "${1:-}" = "--uninstall" ]; then
  rm -f "$TARGET"
  update-desktop-database "$TARGET_DIR" >/dev/null 2>&1 || true
  command -v kbuildsycoca6 >/dev/null && kbuildsycoca6 --noincremental >/dev/null 2>&1 || true
  echo "◆ Maison Todo shortcut removed."
  exit 0
fi

mkdir -p "$TARGET_DIR"
sed "s|@@APPDIR@@|$HERE|g" "$HERE/maison-noir.desktop" > "$TARGET"
chmod +x "$TARGET"

if command -v desktop-file-validate >/dev/null; then
  desktop-file-validate "$TARGET" && echo "◆ desktop entry valid"
fi
update-desktop-database "$TARGET_DIR" >/dev/null 2>&1 || true
command -v kbuildsycoca6 >/dev/null && kbuildsycoca6 --noincremental >/dev/null 2>&1 || true

echo "◆ Installed → $TARGET"
echo "  Press Super (or open your app menu), type:  maison todo"
echo "  Verify with:  gtk-launch maison-noir"
echo "  Uninstall:    ./install-linux.sh --uninstall"
