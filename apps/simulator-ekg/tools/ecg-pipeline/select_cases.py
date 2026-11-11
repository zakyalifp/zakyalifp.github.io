"""Seleksi kasus EKG nyata dengan kriteria ketat.

PTB-XL (Wagner et al. 2020) + PTB-XL+ (Strodthoff et al. 2023):
  - validated_by_human == True
  - tanpa catatan kualitas: baseline_drift, static_noise, burst_noise, electrodes_problems kosong
  - pernyataan diagnostik/bentuk utama dengan likelihood 100
    (pernyataan irama di PTB-XL tidak memiliki likelihood — nilainya 0 — sehingga untuk
     irama disyaratkan kesesuaian dengan pernyataan algoritma GE 12SL dari PTB-XL+)
  - pengukuran 12SL (PTB-XL+) harus konsisten dengan kriteria diagnosis
    (ambang disalin dari src/clinical/ecg-criteria.ts dan DIVERIFIKASI ULANG oleh
     scripts/validate-cases.ts saat CI)
  - lolos pemeriksaan kualitas sinyal (common.quality) saat konversi

Chapman-Shaoxing/Ningbo (Zheng et al. 2020/2022), untuk aritmia yang jarang di PTB-XL:
  - label dari dokter + validasi dokter kedua (tanpa skor likelihood)
  - diagnosis tunggal yang jelas (label irama + paling banyak 1 label tambahan non-konflik)
  - lolos pemeriksaan kualitas sinyal

Keluaran: .cache/selection.json
"""
from __future__ import annotations

import ast
import hashlib
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import CACHE, fetch, write_json  # noqa: E402

PTB = "ptb-xl/1.0.3"
PLUS = "ptb-xl-plus/1.0.1"
CHAP = "ecg-arrhythmia/1.0.0"

LIMB = ["I", "II", "III", "aVR", "aVL", "aVF"]
PREC = ["V1", "V2", "V3", "V4", "V5", "V6"]
ALL12 = LIMB + PREC
CONTIG = [("V1", "V2"), ("V2", "V3"), ("V3", "V4"), ("V4", "V5"), ("V5", "V6"), ("aVL", "I"), ("II", "aVF"), ("aVF", "III"), ("I", "-aVR"), ("-aVR", "II")]


def ste_threshold(lead: str, male: bool, age: float) -> float:
    """mm — identik dengan steThresholdMm() di src/clinical/ecg-criteria.ts (UDMI4/ESC23/PNPK26)."""
    if lead in ("V2", "V3"):
        if not male:
            return 1.5
        return 2.5 if age < 40 else 2.0
    return 1.0


def stable_order(ids):
    return sorted(ids, key=lambda i: hashlib.sha1(str(i).encode()).hexdigest())


def load_ptbxl():
    base = CACHE / "ptbxl"
    db = pd.read_csv(fetch(PTB, "ptbxl_database.csv", base / "ptbxl_database.csv"), index_col="ecg_id")
    db["scp"] = db.scp_codes.apply(ast.literal_eval)
    f = pd.read_csv(fetch(PLUS, "features/12sl_features.csv", CACHE / "ptbxlplus" / "12sl_features.csv"), index_col="ecg_id")
    sl = pd.read_csv(fetch(PLUS, "labels/12sl_statements.csv", CACHE / "ptbxlplus" / "12sl_statements.csv"), index_col="ecg_id")
    sl["st"] = sl.statements.apply(ast.literal_eval)
    db = db.join(f, how="inner").join(sl[["st"]], how="left")
    db["st"] = db["st"].apply(lambda x: x if isinstance(x, list) else [])
    clean = db[(db.validated_by_human == True) & db.baseline_drift.isna() & db.static_noise.isna() & db.burst_noise.isna() & db.electrodes_problems.isna()].copy()  # noqa: E712
    # ST per sadapan dalam mm (12SL STJ, mV → mm)
    for l in ALL12:
        clean[f"st_{l}"] = clean[f"ST_Amp_{l}"] * 10
    return clean


def has(scp: dict, code: str, lik: float = 100) -> bool:
    return code in scp and scp[code] >= lik


def rhythm(scp: dict, code: str) -> bool:
    return code in scp


def contiguous_ste(r, leads=None) -> list[str]:
    male = r.sex == 0
    age = r.age if r.age < 300 else 90
    pos = {l: r[f"st_{l}"] for l in ALL12}
    pos["-aVR"] = -pos["aVR"]
    hit = set()
    for a, b in CONTIG:
        if leads and not (a in leads and b in leads):
            continue
        ta = ste_threshold(a.strip("-"), male, age)
        tb = ste_threshold(b.strip("-"), male, age)
        if pos[a] >= ta and pos[b] >= tb:
            hit.update([a, b])
    return sorted(hit - {"-aVR"})


def no_ste(r) -> bool:
    return not contiguous_ste(r)


def std_leads(r, mm=1.0) -> list[str]:
    return [l for l in ALL12 if r[f"st_{l}"] <= -mm]


def sokolow(r) -> float:
    return (-r.S_Amp_V1 + max(r.R_Amp_V5, r.R_Amp_V6)) * 10


def cornell(r) -> float:
    return (r.R_Amp_aVL - r.S_Amp_V3) * 10


def q_leads(r, ms=30, mm=1.0, leads=("II", "III", "aVF")) -> list[str]:
    return [l for l in leads if r[f"Q_Dur_{l}"] >= ms and -r[f"Q_Amp_{l}"] * 10 >= mm]


def norm_intervals(r) -> bool:
    return 60 <= r.HR_Ventr_Global <= 100 and 120 <= r.PR_Int_Global <= 200 and r.QRS_Dur_Global < 110 and -30 <= r.R_AxisFrontal_Global <= 90 and r.QT_IntBazett_Global < 450


# Aturan: (kunci diagnosis, jumlah target, fungsi filter baris, pernyataan 12SL yang wajib ada [opsional], anotasi)
RULES = [
    ("sinus-normal", 6, lambda r: has(r.scp, "NORM") and rhythm(r.scp, "SR") and len(r.scp) <= 3 and norm_intervals(r) and "NML" in r.st),
    ("sinus-brady", 3, lambda r: rhythm(r.scp, "SBRAD") and (has(r.scp, "NORM", 80) or len(r.scp) <= 2) and 38 <= r.HR_Ventr_Global < 58 and r.QRS_Dur_Global < 110 and "SBRAD" in r.st),
    ("sinus-tachy", 3, lambda r: rhythm(r.scp, "STACH") and r.HR_Ventr_Global > 105 and r.QRS_Dur_Global < 110 and "STACH" in r.st and not any(c in r.scp for c in ("AFIB", "AFLT", "PSVT", "SVTAC"))),
    ("sinus-arrhythmia", 3, lambda r: rhythm(r.scp, "SARRH") and has(r.scp, "NORM", 80) and ("SAR" in r.st or "MSAR" in r.st) and r.QRS_Dur_Global < 110),
    ("af", 4, lambda r: rhythm(r.scp, "AFIB") and "AFIB" in r.st and r.QRS_Dur_Global < 120 and not any(c in r.scp for c in ("PACE", "AFLT", "CLBBB", "CRBBB"))),
    ("flutter", 3, lambda r: rhythm(r.scp, "AFLT") and "FLUT" in r.st and r.QRS_Dur_Global < 120),
    ("svt", 3, lambda r: (rhythm(r.scp, "PSVT") or rhythm(r.scp, "SVTAC")) and r.HR_Ventr_Global >= 140 and r.QRS_Dur_Global < 120),
    ("pac", 3, lambda r: has(r.scp, "PAC") and rhythm(r.scp, "SR") and "PAC" in r.st and r.QRS_Dur_Global < 110),
    ("pvc", 3, lambda r: has(r.scp, "PVC") and rhythm(r.scp, "SR") and "PVC" in r.st and "BIGU" not in r.scp and r.QRS_Dur_Global < 110),
    ("bigeminy", 3, lambda r: rhythm(r.scp, "BIGU") and ("BIGEM" in r.st or "PVC" in r.st)),
    ("trigeminy", 3, lambda r: rhythm(r.scp, "TRIGU")),
    ("av1", 3, lambda r: has(r.scp, "1AVB") and rhythm(r.scp, "SR") and r.PR_Int_Global >= 220 and r.QRS_Dur_Global < 110 and len(r.scp) <= 3),
    ("mobitz1", 3, lambda r: has(r.scp, "2AVB") and "MBZI" in r.st),
    ("mobitz2", 3, lambda r: has(r.scp, "2AVB") and "MBZII" in r.st),
    ("chb", 3, lambda r: has(r.scp, "3AVB") and "CHB" in r.st),
    ("wpw", 3, lambda r: has(r.scp, "WPW") and "WPW" in r.st and r.PR_Int_Global < 130 and r.QRS_Dur_Global >= 100),
    ("paced", 3, lambda r: has(r.scp, "PACE") and ("VPR" in r.st or "AVDPR" in r.st or "ASVPR" in r.st)),
    ("rbbb", 3, lambda r: has(r.scp, "CRBBB") and "RBBB" in r.st and r.QRS_Dur_Global >= 120 and "LAFB" not in r.scp and "LPFB" not in r.scp and -30 <= r.R_AxisFrontal_Global <= 90 and rhythm(r.scp, "SR")),
    ("lbbb", 3, lambda r: has(r.scp, "CLBBB") and "LBBB" in r.st and r.QRS_Dur_Global >= 120 and rhythm(r.scp, "SR")),
    ("lafb", 3, lambda r: has(r.scp, "LAFB") and "AFB" in r.st and r.R_AxisFrontal_Global <= -45 and r.QRS_Dur_Global < 120 and "CRBBB" not in r.scp and rhythm(r.scp, "SR") and len(r.scp) <= 3),
    ("lpfb", 3, lambda r: has(r.scp, "LPFB") and r.R_AxisFrontal_Global >= 90 and r.QRS_Dur_Global < 120 and "CRBBB" not in r.scp and "RVH" not in r.scp),
    ("bifascicular", 3, lambda r: has(r.scp, "CRBBB") and has(r.scp, "LAFB") and r.QRS_Dur_Global >= 120 and r.R_AxisFrontal_Global <= -45),
    ("stemi-anterior", 3, lambda r: any(has(r.scp, c) for c in ("ASMI", "AMI", "ALMI")) and str(r.infarction_stadium1).startswith("Stadium I") and str(r.infarction_stadium1) in ("Stadium I", "Stadium I-II") and len(contiguous_ste(r, PREC)) >= 2),
    ("stemi-inferior", 3, lambda r: any(has(r.scp, c) for c in ("IMI", "ILMI", "IPMI", "IPLMI")) and str(r.infarction_stadium1) in ("Stadium I", "Stadium I-II") and len(contiguous_ste(r, ["II", "III", "aVF"])) >= 2),
    ("stemi-lateral", 3, lambda r: any(has(r.scp, c) for c in ("LMI", "ALMI", "ILMI")) and str(r.infarction_stadium1) in ("Stadium I", "Stadium I-II") and len(contiguous_ste(r, ["I", "aVL", "V5", "V6"])) >= 2),
    ("old-mi-inferior", 3, lambda r: has(r.scp, "IMI") and str(r.infarction_stadium1) in ("Stadium III",) and len(q_leads(r)) >= 2 and no_ste(r) and r.QRS_Dur_Global < 120),
    ("old-mi-anterior", 3, lambda r: has(r.scp, "ASMI") and str(r.infarction_stadium1) in ("Stadium III",) and no_ste(r) and r.QRS_Dur_Global < 120 and r.R_Amp_V2 < 0.15),
    ("nstemi-std", 3, lambda r: any(has(r.scp, c) for c in ("INJAS", "INJAL", "INJIL", "INJIN", "INJLA", "ISC_", "ISCAL", "ISCIL")) and len(std_leads(r, 1.0)) >= 3 and no_ste(r) and r.QRS_Dur_Global < 110 and "LVH" not in r.scp and "DIG" not in r.scp),
    ("ischemic-twi", 3, lambda r: any(has(r.scp, c) for c in ("ISCAL", "ISCAS", "ISCAN", "ISCIL", "ISCIN", "ISCLA")) and no_ste(r) and r.QRS_Dur_Global < 110 and sum(1 for l in PREC if r[f"T_Amp_{l}"] <= -0.1) >= 2 and "LVH" not in r.scp),
    ("aneurysm", 3, lambda r: has(r.scp, "ANEUR")),
    ("lvh-strain", 3, lambda r: has(r.scp, "LVH") and (sokolow(r) >= 35 or cornell(r) > (28 if r.sex == 0 else 20)) and r.QRS_Dur_Global < 120 and (r.st_V5 <= -0.5 or r.st_V6 <= -0.5) and (r.T_Amp_V6 < -0.1 or r.T_Amp_V5 < -0.1)),
    ("lvh", 3, lambda r: has(r.scp, "LVH") and sokolow(r) >= 35 and r.QRS_Dur_Global < 115 and r.st_V5 > -0.5 and r.st_V6 > -0.5 and r.T_Amp_V5 > 0.1),
    ("rvh", 3, lambda r: has(r.scp, "RVH") and "RVH" in r.st),
    ("lae", 3, lambda r: has(r.scp, "LAO/LAE") and "LAE" in r.st and r.QRS_Dur_Global < 110),
    ("rae", 3, lambda r: has(r.scp, "RAO/RAE") and "RAE" in r.st),
    ("low-voltage", 3, lambda r: "LVOLT" in r.scp and "LOWV" in r.st and all(r[f"QRS_AmpPP_{l}"] < 0.5 for l in LIMB)),
    ("long-qt", 3, lambda r: has(r.scp, "LNGQT") and "LNGQT" in r.st and r.QT_IntBazett_Global >= 470 and r.QRS_Dur_Global < 120),
    ("digoxin", 3, lambda r: has(r.scp, "DIG")),
]

# Chapman: SNOMED CT → kunci
SN = {
    "SR": "426783006",
    "AVNRT": "233896004",
    "AVRT": "233897008",
    "AT": "713422000",
    "SVT": "426761007",
    "AF": "164890007",
    "2AVB1": "54016002",
    "2AVB2": "28189009",
    "ERV": "428417006",
    "WAVN": "195101003",
}
CHAP_RULES = [
    ("svt", 3, lambda dx: (SN["AVNRT"] in dx or SN["AVRT"] in dx or SN["SVT"] in dx) and len(dx) <= 2),
    ("atrial-tachy", 3, lambda dx: SN["AT"] in dx and len(dx) <= 2),
    ("mobitz1", 3, lambda dx: SN["2AVB1"] in dx and len(dx) <= 3),
    ("mobitz2", 3, lambda dx: SN["2AVB2"] in dx and len(dx) <= 3),
    ("early-repol", 3, lambda dx: SN["ERV"] in dx and SN["SR"] in dx and len(dx) == 2),
    ("flutter", 2, lambda dx: SN["AF"] in dx and len(dx) <= 2),
]


def load_chapman():
    hdir = CACHE / "chapman" / "hea"
    rows = []
    if not hdir.exists():
        return pd.DataFrame(columns=["rec", "age", "sex", "dx"])
    for p in sorted(hdir.glob("*.hea")):
        txt = p.read_text(errors="ignore")
        age = sex = None
        dx: list[str] = []
        for line in txt.splitlines():
            if line.startswith("#Age:"):
                try:
                    age = int(line.split(":")[1])
                except ValueError:
                    age = None
            elif line.startswith("#Sex:"):
                sex = line.split(":")[1].strip()
            elif line.startswith("#Dx:"):
                dx = [d.strip() for d in line.split(":")[1].split(",") if d.strip()]
        rows.append({"rec": p.stem, "age": age, "sex": sex, "dx": dx})
    return pd.DataFrame(rows)


def main():
    sel = {"ptbxl": [], "chapman": []}
    clean = load_ptbxl()
    print(f"PTB-XL bersih: {len(clean)} rekaman")
    used = set()
    for key, n, fn, *_ in RULES:
        cand = []
        for eid, r in clean.iterrows():
            try:
                if fn(r):
                    cand.append(eid)
            except (KeyError, TypeError, ValueError):
                continue
        cand = [c for c in stable_order(cand) if c not in used]
        # variasi usia/jenis kelamin: ambil bergantian
        males = [c for c in cand if clean.loc[c].sex == 0]
        females = [c for c in cand if clean.loc[c].sex == 1]
        pick = []
        while len(pick) < n * 2 and (males or females):
            if males:
                pick.append(males.pop(0))
            if females and len(pick) < n * 2:
                pick.append(females.pop(0))
        # cadangan ganda (sebagian bisa gugur di cek kualitas sinyal)
        print(f"  {key:18s} kandidat {len(cand):4d} → dipilih {min(len(pick), n)} (+cadangan)")
        for c in pick:
            used.add(c)
            sel["ptbxl"].append({"dx": key, "ecg_id": int(c), "want": n})
    chap = load_chapman()
    print(f"Chapman header: {len(chap)}")
    have = {}
    for item in sel["ptbxl"]:
        have[item["dx"]] = have.get(item["dx"], 0) + 1
    for key, n, fn in CHAP_RULES:
        cand = [r.rec for r in chap.itertuples() if fn(set(r.dx))]
        cand = stable_order(cand)
        print(f"  chapman {key:12s} kandidat {len(cand):4d}")
        for c in cand[: n * 3]:
            sel["chapman"].append({"dx": key, "rec": c, "want": n})
    write_json(CACHE / "selection.json", sel)
    print("Tersimpan:", CACHE / "selection.json")


if __name__ == "__main__":
    main()
