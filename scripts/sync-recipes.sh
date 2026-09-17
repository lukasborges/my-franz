#!/usr/bin/env bash
# Rebuilds src/recipes-bundle from a local checkout of ferdium-recipes.
set -euo pipefail
SRC="${1:-$HOME/Projects/ferdium-app/recipes}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/src/recipes-bundle"
rm -rf "$DEST"
mkdir -p "$DEST/archives" "$DEST/icons"
cp "$SRC/all.json" "$SRC/featured.json" "$DEST/"
cp "$SRC"/archives/*.tar.gz "$DEST/archives/"
for d in "$SRC"/recipes/*/; do
  id="$(basename "$d")"
  [ -f "$d/icon.svg" ] && cp "$d/icon.svg" "$DEST/icons/$id.svg"
done
echo "bundled $(ls "$DEST/archives" | wc -l) recipes into $DEST"
