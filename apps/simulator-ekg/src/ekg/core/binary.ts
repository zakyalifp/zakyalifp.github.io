/**
 * Format biner ringkas rekaman EKG nyata ("EKG1", little-endian):
 *   0  : 4 byte  magic 'EKG1'
 *   4  : uint16  fs (Hz)
 *   6  : uint16  jumlah sadapan (n)
 *   8  : uint32  jumlah sampel per sadapan
 *   12 : float32 mV per hitungan (LSB), mis. 0.001 = 1 µV
 *   16 : n byte  kode sadapan (0..7 = I, II, V1..V6; 8.. = V3R, V4R, V5R, V7, V8, V9)
 *   ...: padding ke kelipatan 2
 *   lalu n blok Int16 (per sadapan, berurutan).
 * Hanya 8 sadapan independen yang disimpan; III, aVR, aVL, aVF diturunkan (completeLeads).
 * Dibuat oleh tools/ecg-pipeline/convert.py.
 */
import type { EcgSignal, LeadName } from './types';
import { completeLeads } from './leads';

export const LEAD_CODES: LeadName[] = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V3R', 'V4R', 'V5R', 'V7', 'V8', 'V9'];

export function decodeEkg1(buf: ArrayBuffer): EcgSignal {
  const dv = new DataView(buf);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'EKG1') throw new Error('Berkas EKG tidak valid (magic)');
  const fs = dv.getUint16(4, true);
  const n = dv.getUint16(6, true);
  const len = dv.getUint32(8, true);
  const lsb = dv.getFloat32(12, true);
  const codes: number[] = [];
  for (let i = 0; i < n; i++) codes.push(dv.getUint8(16 + i));
  let off = 16 + n;
  if (off % 2) off++;
  if (off + n * len * 2 > buf.byteLength) throw new Error('Berkas EKG terpotong');
  const sig: EcgSignal = { fs, length: len, leads: {} };
  for (let k = 0; k < n; k++) {
    const lead = LEAD_CODES[codes[k]];
    const out = new Float32Array(len);
    const base = off + k * len * 2;
    for (let i = 0; i < len; i++) out[i] = dv.getInt16(base + i * 2, true) * lsb;
    if (lead) sig.leads[lead] = out;
  }
  return completeLeads(sig);
}

/** Encoder (dipakai uji & alat). */
export function encodeEkg1(sig: EcgSignal, leads: LeadName[], lsb = 0.001): ArrayBuffer {
  const n = leads.length;
  let off = 16 + n;
  if (off % 2) off++;
  const buf = new ArrayBuffer(off + n * sig.length * 2);
  const dv = new DataView(buf);
  'EKG1'.split('').forEach((c, i) => dv.setUint8(i, c.charCodeAt(0)));
  dv.setUint16(4, sig.fs, true);
  dv.setUint16(6, n, true);
  dv.setUint32(8, sig.length, true);
  dv.setFloat32(12, lsb, true);
  leads.forEach((l, i) => dv.setUint8(16 + i, LEAD_CODES.indexOf(l)));
  leads.forEach((l, k) => {
    const a = sig.leads[l]!;
    for (let i = 0; i < sig.length; i++) dv.setInt16(off + (k * sig.length + i) * 2, Math.max(-32768, Math.min(32767, Math.round(a[i] / lsb))), true);
  });
  return buf;
}
