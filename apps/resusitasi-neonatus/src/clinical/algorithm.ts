/**
 * Algoritma Resusitasi Neonatus (AHA/AAP 2025 Fig. 2, S389) sebagai data untuk halaman
 * Referensi interaktif. Semua angka diambil dari guidelines.ts.
 */
import { COMPRESSIONS, CORD, HEART_RATE, OXYGEN, TIMING } from './guidelines';

export interface AlgoNode {
  id: string;
  kind: 'step' | 'question' | 'end';
  title: string;
  body?: string;
  next?: string;
  yes?: string;
  no?: string;
  /** Penanda alur 60 detik pertama */
  minuteOne?: boolean;
}

const HR100 = HEART_RATE.PPV_BELOW_BPM;
const HR60 = HEART_RATE.COMPRESSIONS_BELOW_BPM;
const RATIO = `${COMPRESSIONS.RATIO_COMPRESSIONS}:${COMPRESSIONS.RATIO_BREATHS}`;

export const ALGORITHM: Record<string, AlgoNode> = {
  start: { id: 'start', kind: 'step', title: 'Persiapan', body: 'Konseling antenatal · briefing tim & pembagian peran · cek kelengkapan alat.', next: 'birth' },
  birth: {
    id: 'birth',
    kind: 'step',
    title: 'Bayi lahir',
    body: `Jalankan rencana tali pusat (bayi tanpa kebutuhan resusitasi segera: tunda penjepitan ≥${CORD.DELAYED_CLAMP_MIN_S} detik).`,
    next: 'q-vigor',
    minuteOne: true,
  },
  'q-vigor': { id: 'q-vigor', kind: 'question', title: 'Cukup bulan? Tonus baik? Bernapas atau menangis?', yes: 'routine', no: 'initial', minuteOne: true },
  routine: { id: 'routine', kind: 'end', title: 'Bersama ibu', body: 'Kontak kulit ke kulit dengan orang tua · perawatan rutin · jaga suhu normal · evaluasi berkelanjutan.' },
  initial: {
    id: 'initial',
    kind: 'step',
    title: 'Langkah awal',
    body: 'Hangatkan & jaga suhu normal · keringkan · posisikan · stimulasi, bersihkan jalan napas bila perlu.',
    next: 'q-apnea',
    minuteOne: true,
  },
  'q-apnea': { id: 'q-apnea', kind: 'question', title: `Apnea atau megap-megap? HR kurang dari ${HR100}/menit?`, yes: 'ventilate', no: 'q-labored', minuteOne: true },
  'q-labored': { id: 'q-labored', kind: 'question', title: 'Napas berat (sulit) atau sianosis persisten?', yes: 'cpap', no: 'post' },
  cpap: { id: 'cpap', kind: 'step', title: 'Dukungan napas', body: 'Pulse oximeter · oksigen bila perlu · pertimbangkan CPAP.', next: 'post' },
  ventilate: {
    id: 'ventilate',
    kind: 'step',
    title: 'Ventilasi',
    body: `Mulai dalam ${TIMING.PPV_START_DEADLINE_S} detik · pulse oximeter tangan kanan · pertimbangkan monitor jantung (EKG).`,
    next: 'q-hr100',
    minuteOne: true,
  },
  'q-hr100': { id: 'q-hr100', kind: 'question', title: `HR kurang dari ${HR100}/menit?`, yes: 'corrective', no: 'post' },
  corrective: {
    id: 'corrective',
    kind: 'step',
    title: 'Langkah koreksi ventilasi',
    body: 'MR. SOPA (IDAI: SRIBTA) · pertimbangkan intubasi atau laryngeal mask · monitor jantung.',
    next: 'q-hr60',
  },
  'q-hr60': { id: 'q-hr60', kind: 'question', title: `HR kurang dari ${HR60}/menit?`, yes: 'compress', no: 'q-hr100' },
  compress: {
    id: 'compress',
    kind: 'step',
    title: 'Kompresi dada',
    body: `Intubasi atau laryngeal mask · kompresi dada · koordinasi ${RATIO} dengan ventilasi · oksigen ${OXYGEN.FIO2_DURING_COMPRESSIONS}% · UVC atau IO.`,
    next: 'q-hr60b',
  },
  'q-hr60b': { id: 'q-hr60b', kind: 'question', title: `HR masih kurang dari ${HR60}/menit?`, yes: 'epi', no: 'q-hr100' },
  epi: {
    id: 'epi',
    kind: 'step',
    title: 'Epinefrin',
    body: `UVC atau IO, ulang setiap ${TIMING.EPINEPHRINE_REPEAT_S.min / 60}–${TIMING.EPINEPHRINE_REPEAT_S.max / 60} menit. Bila HR tetap kurang dari ${HR60}: pertimbangkan hipovolemia dan pneumotoraks.`,
    next: 'q-hr60b',
  },
  post: { id: 'post', kind: 'end', title: 'Perawatan pascaresusitasi', body: 'Komunikasi dengan keluarga · debriefing tim · pantau napas, HR, SpO₂, suhu, glukosa.' },
};
