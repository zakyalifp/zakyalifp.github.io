"""Unduh rekaman terpilih, cek kualitas, konversi ke EKG1 (8 sadapan Int16, 500 Hz), tulis manifest.

Keluaran (masuk repo, subset terkurasi):
  public/cases/real/<id>.ekg
  public/cases/real/manifest.json
"""
from __future__ import annotations

import ast
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import wfdb

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import CACHE, OUT_DIR, STORED, encode_ekg1, fetch, quality, write_json  # noqa: E402

PTB = "ptb-xl/1.0.3"
CHAP = "ecg-arrhythmia/1.0.0"
ALL12 = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]

PTBXL_CITE = "Wagner P, Strodthoff N, Bousseljot RD, et al. PTB-XL, a large publicly available electrocardiography dataset. Sci Data 2020;7:154. PhysioNet v1.0.3, doi:10.13026/kfzx-aw45"
PLUS_CITE = "Strodthoff N, Mehari T, Nagel C, et al. PTB-XL+, a comprehensive electrocardiographic feature dataset. Sci Data 2023;10:279. PhysioNet v1.0.1, doi:10.13026/nqsf-pc74"
CHAP_CITE = "Zheng J, Guo H, Chu H. A large scale 12-lead electrocardiogram database for arrhythmia study (v1.0.0). PhysioNet 2022, doi:10.13026/wgex-er52; Zheng J, et al. Sci Rep 2020;10:1-17"


def r_peaks(x: np.ndarray, fs: int) -> np.ndarray:
    """Deteksi R sederhana (energi turunan + ambang adaptif) — hanya untuk HR Chapman."""
    d = np.diff(x, prepend=x[0])
    e = np.convolve(d * d, np.ones(int(0.08 * fs)) / (0.08 * fs), mode="same")
    thr = 0.3 * np.percentile(e, 99)
    peaks = []
    refractory = int(0.25 * fs)
    i = 0
    while i < len(e):
        if e[i] > thr:
            j = min(len(e), i + int(0.12 * fs))
            k = i + int(np.argmax(np.abs(x[i:j] - np.median(x))))
            peaks.append(k)
            i = k + refractory
        else:
            i += 1
    return np.array(peaks)


def read_ptbxl(eid: int):
    sub = f"records500/{eid // 1000 * 1000:05d}/{eid:05d}_hr"
    for ext in (".hea", ".dat"):
        fetch(PTB, sub + ext, CACHE / "ptbxl" / (sub + ext))
    rec = wfdb.rdrecord(str(CACHE / "ptbxl" / sub))
    return rec, sub


def read_chapman(rec_name: str, rel_dir: str):
    for ext in (".hea", ".mat"):
        fetch(CHAP, f"{rel_dir}{rec_name}{ext}", CACHE / "chapman" / "rec" / f"{rec_name}{ext}")
    rec = wfdb.rdrecord(str(CACHE / "chapman" / "rec" / rec_name))
    return rec


def to_leads(rec) -> dict[str, np.ndarray]:
    names = [n.strip() for n in rec.sig_name]
    sig = rec.p_signal
    out = {}
    for l in STORED:
        idx = [i for i, n in enumerate(names) if n.upper() == l.upper()]
        if not idx:
            raise ValueError(f"sadapan {l} tidak ada")
        x = sig[:, idx[0]].astype(float)
        # Hanya koreksi offset DC (median); tidak ada filter lain agar segmen ST tidak terdistorsi.
        out[l] = x - np.median(x)
    return out


def main():
    sel = json.loads((CACHE / "selection.json").read_text())
    db = pd.read_csv(CACHE / "ptbxl" / "ptbxl_database.csv", index_col="ecg_id")
    feat = pd.read_csv(CACHE / "ptbxlplus" / "12sl_features.csv", index_col="ecg_id")
    sl = pd.read_csv(CACHE / "ptbxlplus" / "12sl_statements.csv", index_col="ecg_id")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    count: dict[str, int] = {}
    rejected = []
    for item in sel["ptbxl"]:
        dx = item["dx"]
        if count.get(dx, 0) >= item["want"]:
            continue
        eid = item["ecg_id"]
        try:
            rec, sub = read_ptbxl(eid)
            leads = to_leads(rec)
        except Exception as e:  # noqa: BLE001
            rejected.append({"id": eid, "reason": str(e)})
            continue
        q = quality(leads, int(rec.fs))
        if not q["ok"]:
            rejected.append({"id": f"ptbxl-{eid}", "dx": dx, "reason": q.get("reason")})
            continue
        r = db.loc[eid]
        f = feat.loc[eid]
        cid = f"ptbxl-{eid:05d}"
        (OUT_DIR / f"{cid}.ekg").write_bytes(encode_ekg1(leads, int(rec.fs)))
        age = int(r.age) if r.age < 300 else 90
        def num(v):
            return None if pd.isna(v) else round(float(v), 1)
        manifest.append({
            "id": cid,
            "dataset": "PTB-XL",
            "datasetVersion": "1.0.3",
            "recordId": str(eid),
            "recordPath": sub,
            "file": f"{cid}.ekg",
            "dx": dx,
            "age": age,
            "ageNote": "≥90 (disamarkan dataset)" if r.age >= 300 else None,
            "sex": "L" if r.sex == 0 else "P",
            "labels": {k: float(v) for k, v in ast.literal_eval(r.scp_codes).items()},
            "labels12sl": ast.literal_eval(sl.loc[eid].statements) if eid in sl.index else [],
            "infarctionStadium": None if pd.isna(r.infarction_stadium1) else str(r.infarction_stadium1),
            "heartAxisLabel": None if pd.isna(r.heart_axis) else str(r.heart_axis),
            "validatedByHuman": bool(r.validated_by_human),
            "measures": {
                "source": "PTB-XL+ GE 12SL",
                "hr": num(f.HR_Ventr_Global),
                "atrialRate": num(f.HR_Atrial_Global),
                "pr": num(f.PR_Int_Global),
                "qrs": num(f.QRS_Dur_Global),
                "qt": num(f.QT_Int_Global),
                "qtcB": num(f.QT_IntBazett_Global),
                "qtcF": num(f.QT_IntFridericia_Global),
                "axis": num(f.R_AxisFrontal_Global),
                "pAxis": num(f.P_AxisFront_Global),
                "tAxis": num(f.T_AxisFront_Global),
            },
            "stMm": {l: round(float(f[f"ST_Amp_{l}"]) * 10, 2) for l in ALL12 if not pd.isna(f[f"ST_Amp_{l}"])},
            "tMm": {l: round(float(f[f"T_Amp_{l}"]) * 10, 2) for l in ALL12 if not pd.isna(f[f"T_Amp_{l}"])},
            "rMm": {l: round(float(f[f"R_Amp_{l}"]) * 10, 2) for l in ALL12 if not pd.isna(f[f"R_Amp_{l}"])},
            "sMm": {l: round(float(-f[f"S_Amp_{l}"]) * 10, 2) for l in ALL12 if not pd.isna(f[f"S_Amp_{l}"])},
            "qMs": {l: round(float(f[f"Q_Dur_{l}"]), 0) for l in ALL12 if not pd.isna(f[f"Q_Dur_{l}"])},
            "quality": q,
            "license": "CC BY 4.0",
            "citation": [PTBXL_CITE, PLUS_CITE],
        })
        count[dx] = count.get(dx, 0) + 1
    # Chapman
    rec_dirs = {}
    allrec = CACHE / "chapman" / "all_records.txt"
    if allrec.exists():
        for line in allrec.read_text().splitlines():
            if line.strip():
                rec_dirs[line.rsplit("/", 1)[1]] = line.rsplit("/", 1)[0] + "/"
    chap_count: dict[str, int] = {}
    for item in sel["chapman"]:
        dx = item["dx"]
        if chap_count.get(dx, 0) >= item["want"]:
            continue
        name = item["rec"]
        if name not in rec_dirs:
            continue
        try:
            rec = read_chapman(name, rec_dirs[name])
            leads = to_leads(rec)
        except Exception as e:  # noqa: BLE001
            rejected.append({"id": name, "reason": str(e)})
            continue
        q = quality(leads, int(rec.fs))
        if not q["ok"]:
            rejected.append({"id": f"chapman-{name}", "dx": dx, "reason": q.get("reason")})
            continue
        comments = {c.split(":")[0].strip("# "): c.split(":", 1)[1].strip() for c in rec.comments if ":" in c}
        pk = r_peaks(leads["II"], int(rec.fs))
        rr = np.diff(pk) / rec.fs
        hr = round(60 / float(np.median(rr)), 0) if len(rr) >= 2 else None
        cid = f"chapman-{name}"
        (OUT_DIR / f"{cid}.ekg").write_bytes(encode_ekg1(leads, int(rec.fs)))
        try:
            age = int(comments.get("Age", ""))
        except ValueError:
            age = None
        manifest.append({
            "id": cid,
            "dataset": "Chapman-Shaoxing/Ningbo",
            "datasetVersion": "1.0.0",
            "recordId": name,
            "recordPath": rec_dirs[name] + name,
            "file": f"{cid}.ekg",
            "dx": dx,
            "age": age,
            "sex": "L" if comments.get("Sex", "").lower().startswith("m") else "P",
            "labels": {"snomed": comments.get("Dx", "")},
            "labels12sl": [],
            "validatedByHuman": True,
            "measures": {"source": "deteksi R otomatis (hanya laju)", "hr": hr, "pr": None, "qrs": None, "qt": None, "qtcB": None, "qtcF": None, "axis": None},
            "quality": q,
            "license": "CC BY 4.0",
            "citation": [CHAP_CITE],
        })
        chap_count[dx] = chap_count.get(dx, 0) + 1
    manifest.sort(key=lambda m: (m["dx"], m["id"]))
    write_json(OUT_DIR / "manifest.json", {"version": 1, "generatedBy": "tools/ecg-pipeline/build.py", "cases": manifest})
    write_json(CACHE / "rejected.json", rejected)
    tot = {}
    for m in manifest:
        tot[m["dx"]] = tot.get(m["dx"], 0) + 1
    print(json.dumps(tot, indent=1))
    print(f"Total {len(manifest)} kasus nyata; ditolak {len(rejected)} (lihat .cache/rejected.json)")


if __name__ == "__main__":
    main()
