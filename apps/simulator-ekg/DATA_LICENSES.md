# Lisensi Data — Simulator EKG 12-Lead

Kode simulator ini terpisah dari data. Data EKG nyata yang disertakan (`public/cases/real/`)
adalah **subset terkurasi** dari dataset terbuka berikut. Semuanya berlisensi
**Creative Commons Attribution 4.0 International (CC BY 4.0)** — boleh disalin, dibagikan ulang,
dan dimodifikasi (termasuk diubah formatnya) dengan **atribusi**. Perubahan yang dilakukan:
pemilihan subset, konversi ke 8 sadapan Int16 (1 µV/LSB), koreksi offset DC; tidak ada filter lain.

## 1. PTB-XL (v1.0.3) — CC BY 4.0
- Wagner P, Strodthoff N, Bousseljot RD, Samek W, Schaeffter T. PTB-XL, a large publicly available electrocardiography dataset (version 1.0.3). PhysioNet. 2022. https://doi.org/10.13026/kfzx-aw45
- Wagner P, Strodthoff N, Bousseljot RD, Kreiseler D, Lunze FI, Samek W, Schaeffter T. PTB-XL, a large publicly available electrocardiography dataset. Scientific Data. 2020;7:154. https://doi.org/10.1038/s41597-020-0495-6
- Lisensi: https://physionet.org/content/ptb-xl/view-license/1.0.3/

## 2. PTB-XL+ (v1.0.1) — CC BY 4.0
Dipakai untuk ukuran ground truth (GE 12SL) dan pernyataan 12SL.
- Strodthoff N, Mehari T, Nagel C, Aston PJ, Sundar A, Graff C, Kanters JK, Haverkamp W, Dössel O, Loewe A, Bär M, Schaeffter T. PTB-XL+, a comprehensive electrocardiographic feature dataset (version 1.0.1). PhysioNet. 2023. https://doi.org/10.13026/nqsf-pc74
- Strodthoff N, et al. PTB-XL+, a comprehensive electrocardiographic feature dataset. Scientific Data. 2023;10:279. https://doi.org/10.1038/s41597-023-02153-8
- Lisensi: https://physionet.org/content/ptb-xl-plus/view-license/1.0.1/

## 3. Chapman-Shaoxing/Ningbo — "A large scale 12-lead electrocardiogram database for arrhythmia study" (v1.0.0) — CC BY 4.0
- Zheng J, Guo H, Chu H. A large scale 12-lead electrocardiogram database for arrhythmia study (version 1.0.0). PhysioNet. 2022. https://doi.org/10.13026/wgex-er52
- Zheng J, Zhang J, Danioko S, Yao H, Guo H, Rakovski C. A 12-lead electrocardiogram database for arrhythmia research covering more than 10,000 patients. Scientific Data. 2020;7:48. https://doi.org/10.1038/s41597-020-0386-x
- Zheng J, Chu H, Struppa D, et al. Optimal multi-stage arrhythmia classification approach. Scientific Reports. 2020;10:2898. https://doi.org/10.1038/s41598-020-59821-7
- Lisensi: https://physionet.org/content/ecg-arrhythmia/view-license/1.0.0/

## PhysioNet (wajib dikutip untuk ketiganya)
- Goldberger AL, Amaral LAN, Glass L, Hausdorff JM, Ivanov PCh, Mark RG, Mietus JE, Moody GB, Peng CK, Stanley HE. PhysioBank, PhysioToolkit, and PhysioNet: components of a new research resource for complex physiologic signals. Circulation. 2000;101(23):e215–e220.

## Dataset yang dipertimbangkan tetapi tidak dipakai
- PhysioNet/CinC Challenge 2020/2021: gabungan beberapa sumber dengan ketentuan berbeda; sumber
  aslinya (PTB-XL, Chapman) dipakai langsung agar lisensi setiap rekaman jelas.
- Dataset berlisensi non-komersial atau yang melarang redistribusi (mis. lisensi kredensial
  PhysioNet) tidak dipakai.

## EKG sintetis
EKG berlabel "Sintetis" dibangkitkan oleh synthesizer di `src/ekg/synth/` (model VCG 3D +
matriks Dower; Dower 1980, Sameni 2007) dan bukan rekaman pasien. Kode di bawah lisensi repo.

Daftar per kasus (ID rekaman asal, usia, jenis kelamin, label asli, ukuran, sitasi) ada di
`public/cases/real/manifest.json`.
