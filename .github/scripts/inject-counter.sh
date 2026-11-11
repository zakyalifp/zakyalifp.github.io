#!/usr/bin/env bash
# Sisipkan penghitung kunjungan anonim (assets/counter.js, GoatCounter) ke setiap halaman HTML
# di folder situs hasil gabungan (default _site) yang belum memuatnya. Dijalankan saat deploy
# agar kode sumber simulator lama tidak perlu diubah. Simulator EKG dilewati (punya versi
# bawaan, ditandai komentar "goatcounter").
set -euo pipefail
OUT="${1:-_site}"
TAG='<script src="/assets/counter.js" defer></script>'
n=0
while IFS= read -r -d '' f; do
  if grep -qi 'counter.js\|goatcounter' "$f"; then continue; fi
  if grep -qi '</body>' "$f"; then
    sed -i "s#</body>#${TAG}</body>#I" "$f"
    n=$((n + 1))
  fi
done < <(find "$OUT" -name '*.html' -not -path "$OUT/simulator-ekg/*" -print0)
echo "Penghitung kunjungan disisipkan ke $n halaman."
