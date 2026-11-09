/**
 * Koefisien MATEMATIS model fisiologi simulator.
 *
 * Ini BUKAN angka klinis/rekomendasi pedoman: ini konstanta laju dan bentuk kurva
 * yang dipilih supaya respons pasien virtual terasa realistis (mis. HR naik dalam
 * 15–30 detik setelah ventilasi efektif). Semua ambang klinis (HR 60/100, target SpO2,
 * dosis, dsb.) tetap diambil dari src/clinical/guidelines.ts.
 */
import type { Scenario } from './schema';
import type { SimState } from './state';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const MODEL = {
  SPO2_AT_BIRTH: 50,
  // --- SpO2 ---
  SPO2_FLOOR: 30,
  SPO2_BASE: 40,
  SPO2_GAIN_ROOM_AIR: 55,
  SPO2_GAIN_PER_FIO2: 0.65,
  SPO2_TAU_RISE_S: 90,
  SPO2_TAU_FALL_S: 40,
  // --- utang oksigen (asfiksia) ---
  ASPHYXIA_RECOVERY_VENT: 1.0,
  ASPHYXIA_RECOVERY_OXY: 0.8,
  ASPHYXIA_RECOVERY_CPR_PERFUSION: 0.6,
  PERFUSION_FLOOR: 0.5,
  ASPHYXIA_ACCUM_APNEA: 0.35,
  ASPHYXIA_ACCUM_HYPOX: 0.15,
  // --- HR ---
  HR_MIN_ASPHYXIA: 30,
  HR_TAU_UP_S: 6,
  HR_TAU_DOWN_S: 8,
  HR_CAP_BASE: 15,
  HR_CAP_SLOPE: 100,
  HR_CAP_FREE_ABOVE: 0.75,
  ASYSTOLE_BELOW_CARDIAC: 0.05,
  // --- miokard ---
  CARDIAC_NATURAL_RECOVERY: 0.006,
  CARDIAC_CPR_GAIN: 0.0025,
  CARDIAC_DECAY: 0.0015,
  CARDIAC_EPI_GAIN: 0.35,
  CARDIAC_FREE_RECOVERY_ABOVE: 0.45,
  EPI_UNDERDOSE_FACTOR: 0.4,
  EPI_ETT_FACTOR: 0.6,
  EPI_OVERDOSE_HR_SPIKE: 60,
  VOLUME_DEFICIT_CARDIAC_FACTOR: 1.6,
  VOLUME_DEFICIT_PER_BOLUS: 0.25,
  // --- napas spontan & tonus ---
  DRIVE_APNEA_ABOVE_ASPHYXIA: 60,
  DRIVE_GASP_ABOVE_ASPHYXIA: 40,
  DRIVE_GASP_LEVEL: 0.2,
  DRIVE_TAU_S: 10,
  TONE_ZERO_AT_ASPHYXIA: 70,
  TONE_TAU_S: 20,
  // --- efektivitas ventilasi ---
  EFFECTIVE_VENT: 0.6,
  VISIBLE_CHEST_MIN: 0.25,
  MASK_WRONG_SIZE: 0.5,
  MASK_LEAK: 0.35,
  POSITION_ISSUE: 0.4,
  SECRETIONS: 0.4,
  SECRETIONS_LMA: 0.7,
  MOUTH_CLOSED: 0.6,
  ROBIN_MASK: 0.3,
  LMA_UNDERSIZED_PATIENT: 0.6,
  ETT_RIGHT_MAIN: 0.65,
  ETT_SHALLOW: 0.5,
  ETT_ESOPHAGUS: 0.05,
  ETT_TOO_SMALL_LEAK: 0.7,
  PRESSURE_SLOPE: 12,
  PRESSURE_MIN_FACTOR: 0.15,
  RATE_OFF_RANGE: 0.7,
  COMPRESSION_WRONG_RATIO_VENT: 0.6,
  PNEUMOTHORAX_VENT: 0.35,
  PNEUMOTHORAX_LUNG: 0.6,
  CDH_DISTENSION_RATE: 0.01,
  CDH_DECOMPRESS_RATE: 0.05,
  CDH_DISTENSION_IMPACT: 0.6,
  // --- napas spontan ---
  CHOANAL_NO_AIRWAY: 0.2,
  CHOANAL_CRY_ABOVE_ASPHYXIA: 20,
  ROBIN_SPONT: 0.3,
  SECRETIONS_SPONT: 0.6,
  RDS_SPONT_NO_CPAP: 0.7,
  RDS_SPONT_CPAP: 1,
  RDS_NO_PEEP_LUNG: 0.7,
  PNEUMOTHORAX_SPONT: 0.5,
  // --- kompresi ---
  CPR_TWO_FINGER: 0.75,
  CPR_WRONG_RATIO: 0.7,
  CPR_NO_VENT: 0.3,
  // --- suhu (°C per detik pada bayi basah tanpa penghangat, aterm) ---
  TEMP_LOSS_BASE: 0.004,
  TEMP_GA_FACTOR: (ga: number) => (ga < 28 ? 2.5 : ga < 32 ? 1.8 : ga < 37 ? 1.3 : 1),
  TEMP_DRIED_OR_WRAPPED: 0.35,
  TEMP_DRIED_VERY_PRETERM: 0.6,
  TEMP_HAT: 0.85,
  TEMP_WARMER_GAIN: 0.003,
  TEMP_WARMER_SERVO_C: 37.2,
  TEMP_SKIN_TO_SKIN_GAIN: 0.0035,
  TEMP_SKIN_TO_SKIN_MAX_C: 37.2,
  TEMP_GRADIENT_REF: 12,
  TEMP_AMBIENT: 25,
  // --- lain-lain ---
  SUCTION_VAGAL_HR_DROP: 30,
  HISTORY_EVERY_S: 5,
  POSTDUCTAL_OFFSET: 4,
  POSTDUCTAL_OFFSET_PPHN: 12,

  /** HR target dari asfiksia, fungsi miokard, dan defisit volume. */
  hrTarget(asphyxia: number, cardiac: number, volumeDeficit: number, baseline: number): number {
    const fromAsphyxia = baseline - (asphyxia * (baseline - MODEL.HR_MIN_ASPHYXIA)) / 100;
    const effCardiac = Math.min(cardiac, 1 - volumeDeficit * MODEL.VOLUME_DEFICIT_CARDIAC_FACTOR);
    if (effCardiac < MODEL.ASYSTOLE_BELOW_CARDIAC) return 0;
    const cap = effCardiac >= MODEL.HR_CAP_FREE_ABOVE ? Infinity : MODEL.HR_CAP_BASE + MODEL.HR_CAP_SLOPE * effCardiac;
    return Math.max(0, Math.min(fromAsphyxia, cap));
  },

  driveTarget(s: SimState, sc: Scenario): number {
    const h = sc.hidden;
    if (s.asphyxia > MODEL.DRIVE_APNEA_ABOVE_ASPHYXIA || s.hr < 60) return 0;
    if (s.asphyxia > MODEL.DRIVE_GASP_ABOVE_ASPHYXIA) return MODEL.DRIVE_GASP_LEVEL;
    let d = h.baseDrive * clamp(1 - Math.max(0, s.asphyxia - 10) / 40, 0, 1);
    if (h.driveRecoveryS > 0 && s.goodOxygenationS < h.driveRecoveryS) d = Math.min(d, 0.05);
    if (h.respondsToStimulation && !s.stimulated) d = Math.min(d, 0.05);
    return d;
  },

  toneTarget(asphyxia: number, ga: number): number {
    const base = ga < 28 ? 0.6 : ga < 32 ? 0.8 : 1;
    return clamp(1 - asphyxia / MODEL.TONE_ZERO_AT_ASPHYXIA, 0, 1) * base;
  },
};
