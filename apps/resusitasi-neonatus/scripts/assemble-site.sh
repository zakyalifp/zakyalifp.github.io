#!/usr/bin/env bash
# Menggabungkan situs lama (HTML statis di root repo) + build simulator ke satu folder
# untuk GitHub Pages. Pemakaian: bash apps/resusitasi-neonatus/scripts/assemble-site.sh _site
set -euo pipefail
OUT="${1:-_site}"
ROOT="$(git rev-parse --show-toplevel)"
APP="$ROOT/apps/resusitasi-neonatus"
test -f "$APP/dist/index.html" || { echo "Build simulator belum ada (jalankan npm run build)"; exit 1; }
rm -rf "$OUT"
mkdir -p "$OUT"
# Salin seluruh situs lama apa adanya, kecuali folder kerja/development.
( cd "$ROOT" && tar --exclude=./.git --exclude=./.github --exclude=./apps --exclude="./$OUT" --exclude='./node_modules' -cf - . ) | tar -xf - -C "$OUT"
# Simulator di /resusitasi-neonatus/
mkdir -p "$OUT/resusitasi-neonatus"
cp -R "$APP/dist/." "$OUT/resusitasi-neonatus/"
# Matikan pemrosesan Jekyll agar file disajikan apa adanya.
touch "$OUT/.nojekyll"
echo "Situs digabung di $OUT:"; ls "$OUT"
