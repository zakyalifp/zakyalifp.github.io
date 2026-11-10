/**
 * Penurunan sadapan ekstremitas dari sadapan I dan II (hukum Einthoven & Goldberger).
 *
 *   III = II − I
 *   aVR = −(I + II) / 2
 *   aVL = I − II / 2
 *   aVF = II − I / 2
 *
 * Sumber: Kligfield P, et al. Recommendations for the standardization and interpretation
 * of the electrocardiogram: Part I. Circulation 2007;115:1306–1324 (definisi sadapan).
 */
import type { EcgSignal, LeadName, StandardLead } from './types';
import { STANDARD_LEADS } from './types';

export function deriveIII(I: number, II: number): number {
  return II - I;
}
export function deriveAVR(I: number, II: number): number {
  return -(I + II) / 2;
}
export function deriveAVL(I: number, II: number): number {
  return I - II / 2;
}
export function deriveAVF(I: number, II: number): number {
  return II - I / 2;
}

/** Lengkapi sadapan III, aVR, aVL, aVF dari I dan II (in-place, mengembalikan sinyal yang sama). */
export function completeLeads(sig: EcgSignal): EcgSignal {
  const I = sig.leads.I;
  const II = sig.leads.II;
  if (!I || !II) throw new Error('Sadapan I dan II wajib ada untuk menurunkan sadapan ekstremitas.');
  const n = sig.length;
  const III = new Float32Array(n);
  const aVR = new Float32Array(n);
  const aVL = new Float32Array(n);
  const aVF = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = I[i];
    const b = II[i];
    III[i] = b - a;
    aVR[i] = -(a + b) / 2;
    aVL[i] = a - b / 2;
    aVF[i] = b - a / 2;
  }
  sig.leads.III = III;
  sig.leads.aVR = aVR;
  sig.leads.aVL = aVL;
  sig.leads.aVF = aVF;
  return sig;
}

/** Sudut heksaksial setiap sadapan ekstremitas pada bidang frontal (derajat). */
export const HEXAXIAL_ANGLE: Record<'I' | 'II' | 'III' | 'aVR' | 'aVL' | 'aVF', number> = {
  I: 0,
  II: 60,
  III: 120,
  aVR: -150,
  aVL: -30,
  aVF: 90,
};

/**
 * Elektroda ekstremitas relatif terhadap Wilson central terminal (RA + LA + LL = 0).
 * Dipakai untuk simulasi salah pasang elektroda secara fisik konsisten.
 */
export function limbElectrodes(I: number, II: number): { RA: number; LA: number; LL: number } {
  const RA = -(I + II) / 3;
  return { RA, LA: RA + I, LL: RA + II };
}

export function isStandardLead(l: LeadName): l is StandardLead {
  return (STANDARD_LEADS as readonly string[]).includes(l);
}
