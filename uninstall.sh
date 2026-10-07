#!/usr/bin/env bash
set -e

EXTENSION_UUID="app-grid-sorter@utilcom"
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"
RESTART_SHELL="${1:-}"

echo "Disabling extension..."
gnome-extensions disable "$EXTENSION_UUID" 2>/dev/null || true

if [ -d "$INSTALL_DIR" ]; then
  echo "Removing extension files..."
  rm -rf "$INSTALL_DIR"
fi

if [ "$RESTART_SHELL" = "--restart" ] || [ "$RESTART_SHELL" = "-r" ]; then
  echo "Restarting shell..."
  killall -HUP gnome-shell
fi

echo "Uninstallation complete."
