# Pipeline EKG nyata (PTB-XL, PTB-XL+, Chapman-Shaoxing/Ningbo)

Skrip ini **tidak dijalankan di CI**. Hasilnya (subset terkurasi) sudah ada di
`public/cases/real/` (berkas `.ekg` + `manifest.json`). Jalankan ulang hanya bila ingin
mengubah kriteria seleksi.

```bash
cd apps/simulator-ekg
python3 -m pip install -r tools/ecg-pipeline/requirements.txt
# opsional: lokasi data mentah (default tools/ecg-pipeline/.cache, di-gitignore)
export ECG_DATA_DIR=/path/data-mentah
# (Chapman) unduh semua header .hea ke $ECG_DATA_DIR/chapman/hea + all_records.txt
python3 tools/ecg-pipeline/select_cases.py   # → .cache/selection.json
python3 tools/ecg-pipeline/build.py          # → public/cases/real/*.ekg + manifest.json
```

## Sumber & lisensi
| Dataset | Versi | Lisensi | Unduhan tanpa akun |
|---|---|---|---|
| PTB-XL | 1.0.3 | CC BY 4.0 | `https://physionet-open.s3.amazonaws.com/ptb-xl/1.0.3/` (mirror: physionet.org/files) |
| PTB-XL+ (fitur 12SL) | 1.0.1 | CC BY 4.0 | `https://physionet-open.s3.amazonaws.com/ptb-xl-plus/1.0.1/` |
| Chapman-Shaoxing/Ningbo (ecg-arrhythmia) | 1.0.0 | CC BY 4.0 | `https://physionet-open.s3.amazonaws.com/ecg-arrhythmia/1.0.0/` |

Dataset berlisensi non-komersial atau yang melarang redistribusi **tidak dipakai**.

## Kriteria seleksi (ringkas)
- PTB-XL: `validated_by_human`, tanpa catatan noise/drift/elektroda, label diagnostik
  likelihood 100, kesesuaian dengan pernyataan GE 12SL (PTB-XL+) untuk irama, dan
  pengukuran 12SL konsisten dengan kriteria (mis. STEMI: elevasi ST memenuhi ambang
  UDMI-4 di ≥2 sadapan berdekatan + stadium infark I).
- Chapman: label dokter + validasi dokter kedua, diagnosis tunggal yang jelas.
- Semua: lolos cek kualitas sinyal (`common.quality`: baseline wander, noise frekuensi
  tinggi, sadapan datar/saturasi).
- Konversi: 8 sadapan independen (I, II, V1–V6) Int16 1 µV/LSB, 500 Hz; hanya koreksi
  offset DC (tanpa filter) agar segmen ST tidak terdistorsi.
