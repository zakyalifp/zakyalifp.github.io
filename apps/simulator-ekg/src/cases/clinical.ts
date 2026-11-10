/**
 * Mode Kasus Klinis: vinyet + EKG (termasuk EKG serial yang berevolusi) + keputusan.
 * Angka waktu reperfusi diambil dari ACS_TIMING (ESC 2023 / PNPK 2026, terverifikasi).
 */
import { ACS_TIMING, TCA, TORSADES } from '../clinical/ecg-criteria';
import type { Competency, Level } from './diagnoses';

export type CaseRef = { id: string } | { dx: string; kind?: 'nyata' | 'sintetis'; n?: number };

export interface ClinicalOption {
  text: string;
  correct?: boolean;
  critical?: boolean;
  feedback: string;
}
export interface ClinicalStep {
  ecg: CaseRef;
  prompt: string;
  question: string;
  options: ClinicalOption[];
  competency: Competency;
}
export interface ClinicalScenario {
  id: string;
  title: string;
  level: Level;
  vignette: string;
  steps: ClinicalStep[];
}

const T = ACS_TIMING;

export const CLINICAL: ClinicalScenario[] = [
  {
    id: 'nyeri-dada-evolusi',
    title: 'Nyeri dada 40 menit — EKG serial',
    level: 'menengah',
    vignette: 'Pria 56 tahun, perokok, nyeri dada tertekan 40 menit, keringat dingin. TD 138/86, nadi 86. Puskesmas dengan fasilitas fibrinolitik; RS PCI terdekat ±150 menit.',
    steps: [
      {
        ecg: { id: 'ser-stemi-1' },
        prompt: `EKG pertama direkam ${T.ECG_WITHIN_MIN} menit setelah tiba.`,
        question: 'Interpretasi & langkah berikutnya?',
        competency: 'iskemia',
        options: [
          { text: 'T hiperakut anterior — curigai oklusi LAD dini; ulangi EKG tiap 15–30 menit, siapkan reperfusi', correct: true, feedback: 'Tepat. T besar, lebar, simetris di V2–V4 adalah tanda paling awal oklusi.' },
          { text: 'EKG normal varian — pulangkan dengan antasida', critical: true, feedback: 'Berbahaya: T hiperakut sering terlewat. Nyeri dada tipikal + T hiperakut = oklusi sampai terbukti bukan.' },
          { text: 'Hiperkalemia — beri kalsium glukonas', feedback: 'T runcing hiperkalemia berbasis sempit; di sini T lebar & simetris sesuai iskemia akut, klinis mendukung SKA.' },
        ],
      },
      {
        ecg: { id: 'ser-stemi-2' },
        prompt: '20 menit kemudian nyeri bertambah. EKG ulang:',
        question: `Transfer ke PCI diperkirakan >${T.PCI_MAX_DELAY_MIN} menit. Tindakan?`,
        competency: 'tatalaksana',
        options: [
          { text: `Fibrinolitik segera (target ≤${T.LYSIS_WITHIN_MIN} menit sejak diagnosis) lalu rujuk untuk angiografi ${T.POST_LYSIS_ANGIO_H.min}–${T.POST_LYSIS_ANGIO_H.max} jam (farmakoinvasif)`, correct: true, feedback: `Sesuai ESC 2023 & PNPK 2026: bila IKP primer tidak dapat dicapai ≤${T.PCI_MAX_DELAY_MIN} menit, fibrinolitik dalam ${T.REPERFUSION_WINDOW_H} jam onset.` },
          { text: 'Rujuk untuk IKP primer tanpa fibrinolitik walau perjalanan 150 menit', feedback: `Keterlambatan >${T.PCI_MAX_DELAY_MIN} menit menghilangkan keunggulan IKP primer; strategi farmakoinvasif dianjurkan.` },
          { text: 'Tunggu troponin sebelum memutuskan', critical: true, feedback: 'STEMI didiagnosis dari EKG + klinis; menunggu troponin menunda reperfusi.' },
        ],
      },
      {
        ecg: { id: 'ser-stemi-3' },
        prompt: 'Hari ke-3 pasca-reperfusi, bebas nyeri.',
        question: 'Gambaran EKG ini paling sesuai dengan?',
        competency: 'iskemia',
        options: [
          { text: 'Evolusi infark: gelombang Q/QS anterior dengan inversi T', correct: true, feedback: 'Tepat — evolusi yang diharapkan setelah infark anterior.' },
          { text: 'Reinfark akut — fibrinolitik ulang', feedback: 'Tidak ada elevasi ST baru; T inversi & Q adalah evolusi.' },
          { text: 'Sindrom Wellens', feedback: 'Wellens tanpa Q; di sini sudah ada Q/QS (infark selesai).' },
        ],
      },
    ],
  },
  {
    id: 'hiperkalemia-ckd',
    title: 'Lemas pada pasien CKD — sebelum & sesudah terapi',
    level: 'menengah',
    vignette: 'Wanita 63 tahun, CKD stadium 5, terlambat hemodialisis 5 hari. Lemas berat, nadi 54, TD 100/60.',
    steps: [
      {
        ecg: { id: 'ser-hyperk-before' },
        prompt: 'EKG saat datang:',
        question: 'Tindakan PERTAMA?',
        competency: 'elektrolit',
        options: [
          { text: 'Kalsium glukonas IV segera (stabilisasi membran), lalu insulin + dekstrosa, monitor & siapkan dialisis', correct: true, feedback: 'Pola sine wave = pra-henti jantung. Kalsium bekerja dalam menit; tidak menurunkan K⁺.' },
          { text: 'Tunggu hasil kalium serum dulu', critical: true, feedback: 'Pola sine wave adalah kegawatan — jangan menunggu laboratorium.' },
          { text: 'Amiodaron untuk "VT"', critical: true, feedback: 'Ini bukan VT; antiaritmia dapat memperburuk. Hiperkalemia berat.' },
        ],
      },
      {
        ecg: { id: 'ser-hyperk-after' },
        prompt: '30 menit setelah kalsium, insulin-dekstrosa, dan salbutamol:',
        question: 'Interpretasi?',
        competency: 'elektrolit',
        options: [
          { text: 'Perbaikan: QRS kembali sempit, P kembali, T masih runcing — lanjut terapi penurun K⁺ & dialisis', correct: true, feedback: 'Efek kalsium sementara (30–60 menit); K⁺ total belum turun — dialisis tetap diperlukan.' },
          { text: 'Normal, pulangkan', feedback: 'T masih runcing dan penyebab belum diatasi.' },
          { text: 'STEMI anterior', feedback: 'T runcing berbasis sempit tanpa elevasi ST — sisa hiperkalemia.' },
        ],
      },
    ],
  },
  {
    id: 'svt-palpitasi',
    title: 'Palpitasi mendadak',
    level: 'dasar',
    vignette: 'Wanita 27 tahun, berdebar mendadak 30 menit, sadar, TD 110/70, tanpa nyeri dada.',
    steps: [
      { ecg: { dx: 'svt', kind: 'nyata' }, prompt: 'EKG:', question: 'Tata laksana awal?', competency: 'tatalaksana', options: [
        { text: 'Manuver vagal (modifikasi Valsalva) → adenosin 6 mg IV cepat → 12 mg bila gagal', correct: true, feedback: 'SVT stabil: vagal lalu adenosin (konsisten dengan Simulator ACLS, AHA 2025).' },
        { text: 'Kardioversi tersinkron segera', feedback: 'Pasien stabil; kardioversi untuk yang tidak stabil.' },
        { text: 'Amiodaron 300 mg bolus', feedback: 'Dosis henti jantung, bukan untuk SVT stabil.' },
      ] },
      { ecg: { id: 'ser-svt-after' }, prompt: 'Setelah adenosin 6 mg:', question: 'Langkah berikutnya?', competency: 'tatalaksana', options: [
        { text: 'Irama sinus — observasi, edukasi manuver vagal, rujuk evaluasi (ablasi bila berulang)', correct: true, feedback: 'Konversi berhasil.' },
        { text: 'Beri adenosin 12 mg', feedback: 'Sudah sinus.' },
      ] },
    ],
  },
  {
    id: 'inferior-hipotensi',
    title: 'STEMI inferior dengan hipotensi',
    level: 'menengah',
    vignette: 'Pria 61 tahun, nyeri dada 2 jam, TD 86/58, JVP meningkat, paru bersih. Perawat menyiapkan nitrat sublingual.',
    steps: [
      { ecg: { dx: 'stemi-rv', kind: 'sintetis', n: 0 }, prompt: 'EKG 15 sadapan (termasuk V4R, V7–V9):', question: 'Sikap terhadap nitrat & cairan?', competency: 'tatalaksana', options: [
        { text: 'Infark ventrikel kanan: tunda nitrat, beri cairan bolus hati-hati, reperfusi segera', correct: true, feedback: 'Elevasi ST V4R + inferior III > II = RCA proksimal; pasien bergantung preload.' },
        { text: 'Lanjut nitrat sublingual untuk nyeri', critical: true, feedback: 'Nitrat dapat menyebabkan hipotensi berat pada infark RV.' },
        { text: 'Furosemid IV karena JVP tinggi', critical: true, feedback: 'JVP tinggi dengan paru bersih khas infark RV — diuretik memperburuk.' },
      ] },
    ],
  },
  {
    id: 'wellens-bebas-nyeri',
    title: 'Angina kemarin, sekarang bebas nyeri',
    level: 'lanjut',
    vignette: 'Pria 53 tahun, nyeri dada 20 menit kemarin malam, kini tanpa keluhan. Troponin awal sedikit meningkat.',
    steps: [
      { ecg: { dx: 'wellens-b', n: 0 }, prompt: 'EKG saat bebas nyeri:', question: 'Rencana?', competency: 'iskemia', options: [
        { text: 'Sindrom Wellens: rawat, antitrombotik, angiografi koroner dini; hindari uji latih beban', correct: true, feedback: 'Stenosis kritis LAD proksimal; uji latih dapat memicu infark anterior luas.' },
        { text: 'Uji latih beban treadmill rawat jalan', critical: true, feedback: 'Kontraindikasi relatif pada pola Wellens.' },
        { text: 'Pulangkan, EKG tidak menunjukkan elevasi ST', critical: true, feedback: 'Wellens adalah pola risiko tinggi meski tanpa elevasi ST.' },
      ] },
    ],
  },
  {
    id: 'demam-sinkop',
    title: 'Sinkop saat demam',
    level: 'lanjut',
    vignette: 'Pria 34 tahun, demam 39 °C karena ISPA, sinkop di kamar mandi. Ayahnya meninggal mendadak usia 40.',
    steps: [
      { ecg: { dx: 'brugada', n: 1 }, prompt: 'EKG:', question: 'Langkah yang tepat?', competency: 'konduksi', options: [
        { text: 'Pola Brugada tipe 1: turunkan demam agresif, monitor, rujuk elektrofisiologi (pertimbangan ICD)', correct: true, feedback: 'Demam memicu Brugada; sinkop + riwayat keluarga = risiko tinggi.' },
        { text: 'STEMI anterior — fibrinolitik', critical: true, feedback: 'Elevasi ST coved terbatas V1–V2 dengan T negatif, tanpa resiprokal: pola Brugada, bukan STEMI.' },
        { text: 'RBBB biasa — pulangkan', feedback: 'Sinkop + pola tipe 1 tidak boleh dipulangkan tanpa evaluasi.' },
      ] },
    ],
  },
  {
    id: 'sinkop-lansia',
    title: 'Lansia pusing dan hampir pingsan',
    level: 'dasar',
    vignette: 'Wanita 81 tahun, pusing berulang, nadi 36, TD 88/50, kesadaran menurun.',
    steps: [
      { ecg: { dx: 'chb', kind: 'sintetis', n: 0 }, prompt: 'EKG:', question: 'Tata laksana?', competency: 'tatalaksana', options: [
        { text: 'AV blok total simtomatik: atropin 1 mg IV (sering gagal pada lolos ventrikel) → pacing transkutan segera, rujuk pacu jantung', correct: true, feedback: 'Bradikardia tidak stabil; jangan menunda pacing.' },
        { text: 'Observasi, ulang EKG besok', critical: true, feedback: 'Hipotensi dan penurunan kesadaran = tidak stabil.' },
        { text: 'Adenosin 6 mg', critical: true, feedback: 'Adenosin memperberat blok AV.' },
      ] },
    ],
  },
  {
    id: 'overdosis-amitriptilin',
    title: 'Penurunan kesadaran setelah menelan obat',
    level: 'lanjut',
    vignette: 'Wanita 22 tahun ditemukan somnolen; kemasan amitriptilin kosong. Nadi 128, TD 92/60.',
    steps: [
      { ecg: { dx: 'tca', n: 0 }, prompt: 'EKG:', question: 'Terapi spesifik?', competency: 'elektrolit', options: [
        { text: `Natrium bikarbonat IV bolus (QRS ≥${TCA.QRS_SEIZURE_MS} ms, R terminal aVR), amankan jalan napas, monitor`, correct: true, feedback: 'Blokade kanal natrium; bikarbonat mempersempit QRS.' },
        { text: 'Amiodaron untuk QRS lebar', critical: true, feedback: 'Antiaritmia kelas Ia/Ic/III dapat memperburuk toksisitas TCA.' },
        { text: 'Flumazenil', feedback: 'Bukan antidot TCA dan dapat memicu kejang.' },
      ] },
    ],
  },
  {
    id: 'pasien-dingin',
    title: 'Ditemukan di luar ruangan pada dini hari',
    level: 'menengah',
    vignette: 'Pria 71 tahun ditemukan di sawah setelah hujan semalaman, menggigil, bingung. Suhu rektal 31 °C.',
    steps: [
      { ecg: { dx: 'hypothermia', n: 0 }, prompt: 'EKG:', question: 'Interpretasi & tindakan?', competency: 'elektrolit', options: [
        { text: 'Gelombang Osborn + bradikardia: penghangatan aktif, penanganan hati-hati (mudah VF)', correct: true, feedback: 'Gelombang J membesar seiring penurunan suhu.' },
        { text: 'STEMI inferolateral — aktivasi tim STEMI', feedback: 'Gelombang J di akhir QRS bukan elevasi ST iskemik; konteks hipotermia.' },
        { text: 'Atropin untuk bradikardia', feedback: 'Bradikardia hipotermia biasanya tidak responsif atropin; atasi suhu.' },
      ] },
    ],
  },
  {
    id: 'lbbb-nyeri-dada',
    title: 'Nyeri dada pada LBBB',
    level: 'lanjut',
    vignette: 'Wanita 66 tahun, diabetes, nyeri dada 1 jam, EKG lama menunjukkan LBBB.',
    steps: [
      { ecg: { dx: 'sgarbossa-lbbb', n: 1 }, prompt: 'EKG saat ini:', question: 'Kesimpulan?', competency: 'iskemia', options: [
        { text: 'Kriteria Sgarbossa modifikasi Smith positif → oklusi akut, reperfusi segera', correct: true, feedback: 'Elevasi ST diskordan dengan rasio ST/S ≤ −0,25 di V1–V3.' },
        { text: 'LBBB lama — tidak dapat dinilai, tunggu troponin', critical: true, feedback: 'Dengan Sgarbossa/Smith positif, oklusi dapat didiagnosis dari EKG.' },
        { text: 'Perikarditis', feedback: 'Pola terbatas di V1–V3 sesuai LBBB + oklusi.' },
      ] },
    ],
  },
  {
    id: 'qt-panjang-torsades',
    title: 'Kejang berulang di bangsal',
    level: 'menengah',
    vignette: 'Wanita 62 tahun mendapat ondansetron dan levofloksasin; K⁺ 2,9. Tiba-tiba tidak sadar sesaat lalu sadar kembali.',
    steps: [
      { ecg: { dx: 'torsades', n: 0 }, prompt: 'Rekaman monitor saat episode:', question: 'Tata laksana?', competency: 'tatalaksana', options: [
        { text: `Magnesium sulfat ${TORSADES.MAG_SULFATE_G.min}–${TORSADES.MAG_SULFATE_G.max} g IV, koreksi K⁺, hentikan obat pemanjang QT; tanpa nadi → defibrilasi`, correct: true, feedback: 'Torsades pada QT panjang didapat.' },
        { text: 'Amiodaron', critical: true, feedback: 'Amiodaron memperpanjang QT.' },
        { text: 'Diazepam untuk kejang', feedback: 'Ini sinkop aritmia, bukan kejang epileptik.' },
      ] },
    ],
  },
  {
    id: 'henti-jantung',
    title: 'Pasien kolaps di IGD',
    level: 'dasar',
    vignette: 'Pria 52 tahun dengan nyeri dada tiba-tiba kolaps, tidak bernapas, nadi tidak teraba.',
    steps: [
      { ecg: { dx: 'vf', n: 2 }, prompt: 'Monitor:', question: 'Tindakan?', competency: 'tatalaksana', options: [
        { text: 'RJP segera + defibrilasi (irama shockable)', correct: true, feedback: 'VF: kejut listrik secepatnya, minimalkan jeda kompresi.' },
        { text: 'Kardioversi tersinkron', critical: true, feedback: 'Tidak boleh SYNC pada VF.' },
        { text: 'Epinefrin dulu tanpa defibrilasi', critical: true, feedback: 'Defibrilasi adalah prioritas pada VF.' },
      ] },
      { ecg: { dx: 'asystole', n: 0 }, prompt: 'Setelah 2 siklus, monitor menunjukkan:', question: 'Langkah?', competency: 'tatalaksana', options: [
        { text: 'Konfirmasi di >1 sadapan/gain; RJP + epinefrin 1 mg tiap 3–5 menit, cari H & T', correct: true, feedback: 'Asistol: non-shockable.' },
        { text: 'Defibrilasi', critical: true, feedback: 'Asistol tidak di-shock.' },
      ] },
    ],
  },
];
