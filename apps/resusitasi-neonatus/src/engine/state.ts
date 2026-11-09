import type { Domain, Scenario } from './schema';
import { SIM } from '../clinical/guidelines';
import { MODEL } from './model';

export type Phase = 'prebirth' | 'running' | 'ended';
export type VentMode = 'none' | 'ppv' | 'cpap' | 'freeflow';
export type Interface = 'mask' | 'lma' | 'ett';
export type EttPosition = 'trachea' | 'right-main' | 'shallow' | 'esophagus';
export type PulseOxSite = 'tangan-kanan' | 'tangan-kiri' | 'kaki';
export type ParamValue = string | number | boolean;
export type Params = Record<string, ParamValue>;

export interface Judgement {
  t: number;
  code: string;
  ok: boolean;
  critical: boolean;
  domain: Domain;
  msg: string;
}

export interface LogEntry {
  t: number;
  action: string;
  label: string;
  params?: Params;
  detail?: string;
}

export interface BusyTask {
  action: string;
  label: string;
  startedAt: number;
  endsAt: number;
  hands: number;
  interruptsVent: boolean;
  params?: Params;
}

export interface DrugDose {
  t: number;
  drug: 'epinefrin' | 'nacl' | 'd10' | 'nalokson' | 'bikarbonat';
  route: string;
  mg?: number;
  ml: number;
  mgPerKg?: number;
  mlPerKg?: number;
}

export interface VitalSample {
  t: number;
  hr: number;
  spo2: number;
  fio2: number;
  temp: number;
}

export interface SimState {
  t: number;
  phase: Phase;
  endReason?: 'selesai' | 'waktu-habis' | 'dihentikan';
  // ---- fisiologi (tersembunyi) ----
  hr: number;
  spo2: number;
  temp: number;
  asphyxia: number;
  cardiac: number;
  volumeDeficit: number;
  drive: number;
  tone: number;
  goodOxygenationS: number;
  stimulated: boolean;
  ventEff: number; // efektivitas ventilasi VTP 0–1
  spontEff: number; // efektivitas napas spontan 0–1
  gastricDistension: number;
  // ---- intervensi ----
  cord: { decision: 'belum' | 'tunda' | 'segera' | 'milking'; clampedAt: number | null };
  warmer: boolean;
  dried: boolean;
  wrapped: boolean;
  hat: boolean;
  skinToSkin: boolean;
  positioned: boolean;
  suctioned: boolean;
  initialAssessed: boolean;
  pulseOx: { site: PulseOxSite | null; placedAt: number | null };
  ecg: { placedAt: number | null };
  tempProbe: boolean;
  vent: {
    mode: VentMode;
    iface: Interface;
    maskSmall: boolean;
    pip: number;
    peep: number;
    fio2: number;
    rate: number;
    startedAt: number | null;
    firstStartedAt: number | null;
  };
  mr: { M: boolean; R: boolean; S: boolean; O: boolean; P: number; A: boolean };
  ett: { placed: boolean; size: number; depth: number; position: EttPosition | null; confirmed: boolean; attempts: number };
  lma: boolean;
  ogt: boolean;
  oralAirway: boolean;
  prone: boolean;
  npa: boolean;
  compressions: { active: boolean; startedAt: number | null; firstStartedAt: number | null; technique: string; ratio: string; totalS: number };
  access: { uvcAt: number | null; ioAt: number | null };
  drugs: DrugDose[];
  pendingEffects: Array<{ at: number; kind: 'epi'; factor: number; overdose: boolean }>;
  infusions: Array<{ start: number; end: number; ml: number; mlPerKg: number }>;
  pneumothorax: { active: boolean; side: 'kiri' | 'kanan' | null; resolved: boolean; at: number | null };
  barotraumaS: number;
  hyperoxiaS: number;
  staff: number;
  helpArrivesAt: number | null;
  busy: BusyTask[];
  // ---- catatan ----
  log: LogEntry[];
  judgements: Judgement[];
  flags: Record<string, number | boolean | string>;
  history: VitalSample[];
  lastEffectiveVentStart: number | null;
  effectiveVentS: number; // detik VTP/napas efektif berturut-turut
  stableS: number;
  stabilizedAt: number | null;
  lastAuscultation: { t: number; hr: number; userHr?: number } | null;
  glucoseResult: number | null;
}

export function createInitialState(sc: Scenario): SimState {
  const h = sc.hidden;
  const cardiac = 1 - h.cardiacDepression;
  const s: SimState = {
    t: 0,
    phase: 'prebirth',
    hr: 0,
    spo2: MODEL.SPO2_AT_BIRTH,
    temp: h.initialTempC,
    asphyxia: h.asphyxia,
    cardiac,
    volumeDeficit: h.volumeDeficit,
    drive: 0,
    tone: 0,
    goodOxygenationS: 0,
    stimulated: false,
    ventEff: 0,
    spontEff: 0,
    gastricDistension: 0,
    cord: { decision: 'belum', clampedAt: null },
    warmer: false,
    dried: false,
    wrapped: false,
    hat: false,
    skinToSkin: false,
    positioned: false,
    suctioned: false,
    initialAssessed: false,
    pulseOx: { site: null, placedAt: null },
    ecg: { placedAt: null },
    tempProbe: false,
    vent: { mode: 'none', iface: 'mask', maskSmall: false, pip: 0, peep: 0, fio2: 21, rate: 0, startedAt: null, firstStartedAt: null },
    mr: { M: false, R: false, S: false, O: false, P: 0, A: false },
    ett: { placed: false, size: 0, depth: 0, position: null, confirmed: false, attempts: 0 },
    lma: false,
    ogt: false,
    oralAirway: false,
    prone: false,
    npa: false,
    compressions: { active: false, startedAt: null, firstStartedAt: null, technique: '', ratio: '', totalS: 0 },
    access: { uvcAt: null, ioAt: null },
    drugs: [],
    pendingEffects: [],
    infusions: [],
    pneumothorax: { active: false, side: null, resolved: false, at: null },
    barotraumaS: 0,
    hyperoxiaS: 0,
    staff: sc.staffAtBirth,
    helpArrivesAt: null,
    busy: [],
    log: [],
    judgements: [],
    flags: {},
    history: [],
    lastEffectiveVentStart: null,
    effectiveVentS: 0,
    stableS: 0,
    stabilizedAt: null,
    lastAuscultation: null,
    glucoseResult: null,
  };
  // HR & napas awal saat lahir ditentukan oleh asfiksia & fungsi miokard
  s.hr = MODEL.hrTarget(s.asphyxia, s.cardiac, s.volumeDeficit, SIM.BASELINE_HR);
  s.drive = MODEL.driveTarget(s, sc);
  s.tone = MODEL.toneTarget(s.asphyxia, h.gaWeeks);
  return s;
}

export function cloneState(s: SimState): SimState {
  return structuredClone(s);
}
