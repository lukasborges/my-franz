#!/usr/bin/env bash
# Rebuilds src/recipes-bundle from a local checkout of ferdium-recipes.
set -euo pipefail
SRC="${1:-$HOME/Projects/ferdium-app/recipes}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/src/recipes-bundle"
rm -rf "$DEST"
mkdir -p "$DEST/archives" "$DEST/icons"
cp "$SRC/all.json" "$SRC/featured.json" "$DEST/"
# The upstream archives omit icon.svg (Ferdium serves icons from a CDN), so
# repack every recipe from its source directory to ship the icon inside it.
for d in "$SRC"/recipes/*/; do
  id="$(basename "$d")"
  tar czf "$DEST/archives/$id.tar.gz" -C "$d" .
  [ -f "$d/icon.svg" ] && cp "$d/icon.svg" "$DEST/icons/$id.svg"
done
echo "bundled $(ls "$DEST/archives" | wc -l) recipes into $DEST"
