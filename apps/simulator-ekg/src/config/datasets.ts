/** Sitasi lengkap dataset EKG yang dipakai (juga di DATA_LICENSES.md). */
export interface DatasetInfo {
  id: string;
  name: string;
  version: string;
  license: string;
  licenseUrl: string;
  url: string;
  citations: string[];
  usedFor: string;
  selection: string;
}

export const PHYSIONET_CITE = 'Goldberger AL, Amaral LAN, Glass L, et al. PhysioBank, PhysioToolkit, and PhysioNet: components of a new research resource for complex physiologic signals. Circulation 2000;101(23):e215–e220.';

export const DATASETS: DatasetInfo[] = [
  {
    id: 'ptbxl',
    name: 'PTB-XL, a large publicly available electrocardiography dataset',
    version: '1.0.3',
    license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    licenseUrl: 'https://physionet.org/content/ptb-xl/view-license/1.0.3/',
    url: 'https://physionet.org/content/ptb-xl/1.0.3/',
    citations: [
      'Wagner P, Strodthoff N, Bousseljot RD, Samek W, Schaeffter T. PTB-XL, a large publicly available electrocardiography dataset (version 1.0.3). PhysioNet. 2022. doi:10.13026/kfzx-aw45',
      'Wagner P, Strodthoff N, Bousseljot RD, Kreiseler D, Lunze FI, Samek W, Schaeffter T. PTB-XL, a large publicly available electrocardiography dataset. Scientific Data 2020;7:154. doi:10.1038/s41597-020-0495-6',
      PHYSIONET_CITE,
    ],
    usedFor: 'Sebagian besar EKG nyata (500 Hz, 10 detik).',
    selection: 'Label divalidasi manusia, likelihood 100 untuk pernyataan diagnostik, tanpa catatan noise/drift/masalah elektroda, lolos cek kualitas sinyal, konsisten dengan pengukuran 12SL.',
  },
  {
    id: 'ptbxlplus',
    name: 'PTB-XL+, a comprehensive electrocardiographic feature dataset',
    version: '1.0.1',
    license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    licenseUrl: 'https://physionet.org/content/ptb-xl-plus/view-license/1.0.1/',
    url: 'https://physionet.org/content/ptb-xl-plus/1.0.1/',
    citations: [
      'Strodthoff N, Mehari T, Nagel C, Aston PJ, Sundar A, Graff C, Kanters JK, Haverkamp W, Dössel O, Loewe A, Bär M, Schaeffter T. PTB-XL+, a comprehensive electrocardiographic feature dataset (version 1.0.1). PhysioNet. 2023. doi:10.13026/nqsf-pc74',
      'Strodthoff N, Mehari T, Nagel C, et al. PTB-XL+, a comprehensive electrocardiographic feature dataset. Scientific Data 2023;10:279. doi:10.1038/s41597-023-02153-8',
      PHYSIONET_CITE,
    ],
    usedFor: 'Ground truth pengukuran EKG nyata PTB-XL (laju, PR, QRS, QT, QTc, aksis, ST per sadapan) dari algoritma GE 12SL, serta pernyataan 12SL sebagai konfirmasi irama.',
    selection: 'Fitur 12SL untuk rekaman PTB-XL terpilih.',
  },
  {
    id: 'chapman',
    name: 'A large scale 12-lead electrocardiogram database for arrhythmia study (Chapman University & Shaoxing/Ningbo People’s Hospital)',
    version: '1.0.0',
    license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    licenseUrl: 'https://physionet.org/content/ecg-arrhythmia/view-license/1.0.0/',
    url: 'https://physionet.org/content/ecg-arrhythmia/1.0.0/',
    citations: [
      'Zheng J, Guo H, Chu H. A large scale 12-lead electrocardiogram database for arrhythmia study (version 1.0.0). PhysioNet. 2022. doi:10.13026/wgex-er52',
      'Zheng J, Zhang J, Danioko S, Yao H, Guo H, Rakovski C. A 12-lead electrocardiogram database for arrhythmia research covering more than 10,000 patients. Scientific Data 2020;7:48. doi:10.1038/s41597-020-0386-x',
      'Zheng J, Chu H, Struppa D, et al. Optimal multi-stage arrhythmia classification approach. Scientific Reports 2020;10:2898. doi:10.1038/s41598-020-59821-7',
      PHYSIONET_CITE,
    ],
    usedFor: 'Aritmia yang jarang di PTB-XL: SVT (AVNRT/AVRT), takikardia atrium, Mobitz I, repolarisasi dini, flutter.',
    selection: 'Label dokter + validasi dokter kedua, diagnosis tunggal yang jelas, lolos cek kualitas sinyal. Ukuran interval otomatis tidak tersedia (hanya laju).',
  },
];

export const REJECTED_DATASETS = [
  { name: 'CinC/PhysioNet Challenge 2020/2021', reason: 'Gabungan beberapa sumber dengan ketentuan berbeda; sumber aslinya (PTB-XL, Chapman) dipakai langsung agar lisensi jelas.' },
];
