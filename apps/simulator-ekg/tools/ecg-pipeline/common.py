"""Utilitas bersama pipeline EKG (unduh dengan mirror, format biner EKG1, kualitas sinyal)."""
from __future__ import annotations

import json
import os
import struct
import time
import urllib.request
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
APP = HERE.parent.parent
# Data mentah (tidak masuk repo). Bisa dialihkan lewat env ECG_DATA_DIR.
CACHE = Path(os.environ.get("ECG_DATA_DIR", HERE / ".cache"))
OUT_DIR = APP / "public" / "cases" / "real"

# Mirror: bucket S3 publik PhysioNet (tanpa akun) lalu situs PhysioNet.
MIRRORS = {
    "ptb-xl/1.0.3": [
        "https://physionet-open.s3.amazonaws.com/ptb-xl/1.0.3",
        "https://physionet.org/files/ptb-xl/1.0.3",
    ],
    "ptb-xl-plus/1.0.1": [
        "https://physionet-open.s3.amazonaws.com/ptb-xl-plus/1.0.1",
        "https://physionet.org/files/ptb-xl-plus/1.0.1",
    ],
    "ecg-arrhythmia/1.0.0": [
        "https://physionet-open.s3.amazonaws.com/ecg-arrhythmia/1.0.0",
        "https://physionet.org/files/ecg-arrhythmia/1.0.0",
    ],
}

STORED = ["I", "II", "V1", "V2", "V3", "V4", "V5", "V6"]
LEAD_CODES = ["I", "II", "V1", "V2", "V3", "V4", "V5", "V6", "V3R", "V4R", "V5R", "V7", "V8", "V9"]


def fetch(dataset: str, rel: str, dest: Path, retries: int = 4) -> Path:
    """Unduh `rel` dari dataset ke `dest` (lewati bila sudah ada). Coba semua mirror."""
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    last = None
    for base in MIRRORS[dataset]:
        for attempt in range(retries):
            try:
                with urllib.request.urlopen(f"{base}/{rel}", timeout=60) as r:
                    data = r.read()
                tmp = dest.with_suffix(dest.suffix + ".part")
                tmp.write_bytes(data)
                tmp.replace(dest)
                return dest
            except Exception as e:  # noqa: BLE001
                last = e
                time.sleep(2 ** attempt)
    raise RuntimeError(f"Gagal mengunduh {dataset}/{rel}: {last}")


def encode_ekg1(leads: dict[str, np.ndarray], fs: int, lsb_mv: float = 0.001) -> bytes:
    """Format biner ringkas EKG1 (lihat src/ekg/core/binary.ts)."""
    names = [l for l in LEAD_CODES if l in leads]
    n = len(names)
    length = len(leads[names[0]])
    header = b"EKG1" + struct.pack("<HHIf", fs, n, length, lsb_mv) + bytes(LEAD_CODES.index(l) for l in names)
    if len(header) % 2:
        header += b"\x00"
    body = b"".join(np.clip(np.round(leads[l] / lsb_mv), -32768, 32767).astype("<i2").tobytes() for l in names)
    return header + body


def quality(sig: dict[str, np.ndarray], fs: int) -> dict:
    """Metrik kualitas sederhana per rekaman (mV). Ambang dipakai di select_cases."""
    out = {}
    worst_wander = 0.0
    worst_hf = 0.0
    flat = []
    sat = []
    for name, x in sig.items():
        x = np.asarray(x, dtype=float)
        if not np.all(np.isfinite(x)):
            return {"ok": False, "reason": f"NaN di {name}"}
        # baseline wander: rentang rata-rata bergerak 1 detik
        k = fs
        mv = np.convolve(x, np.ones(k) / k, mode="valid")
        wander = float(mv.max() - mv.min())
        # noise frekuensi tinggi: MAD turunan kedua (proksi EMG/50 Hz); robust terhadap
        # lonjakan pacu jantung yang jarang
        d2 = np.diff(x, 2)
        hf = float(1.4826 * np.median(np.abs(d2 - np.median(d2))))
        rng = float(np.percentile(x, 99.5) - np.percentile(x, 0.5))
        if rng < 0.08:
            flat.append(name)
        if np.mean(np.abs(x) > 9.5) > 0.002:
            sat.append(name)
        worst_wander = max(worst_wander, wander)
        worst_hf = max(worst_hf, hf)
    out.update({"wanderMv": round(worst_wander, 3), "hfMv": round(worst_hf, 4), "flatLeads": flat, "saturated": sat})
    out["ok"] = worst_wander < 0.6 and worst_hf < 0.02 and not flat and not sat
    if not out["ok"]:
        out["reason"] = "wander" if worst_wander >= 0.6 else "hf" if worst_hf >= 0.02 else "flat/sat"
    return out


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
