#!/usr/bin/env bash
# Installs the extra recipes into Franz's local dev recipe directory.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${XDG_CONFIG_HOME:-$HOME/.config}/Franz/recipes/dev"
mkdir -p "$DEST"
for dir in "$SRC"/*/; do
  name="$(basename "$dir")"
  rm -rf "$DEST/$name"
  cp -r "$dir" "$DEST/$name"
  echo "installed $name"
done
