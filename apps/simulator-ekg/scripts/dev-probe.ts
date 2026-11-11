// Alat bantu pengembangan: cetak ringkasan pengukuran pola sintetis.
import { synthesize, type SynthSpec } from '../src/ekg/synth/synth';
import { measureLeads } from '../src/ekg/core/measure';
import { STANDARD_LEADS, type LeadName } from '../src/ekg/core/types';

export function probe(name: string, spec: SynthSpec, extra = false) {
  const r = synthesize({ ...spec, extraLeads: extra || spec.extraLeads });
  const leads: LeadName[] = [...STANDARD_LEADS, ...(extra ? (['V4R', 'V7', 'V8', 'V9'] as LeadName[]) : [])];
  const m = measureLeads(r.signal, r.beats, leads, (b) => b.kind === r.beats.find((x) => x.qrs !== null)?.kind);
  const f = (x: number) => (x >= 0 ? ' ' : '') + x.toFixed(1);
  console.log(`\n== ${name} | HR ${r.truth.hr} PR ${r.truth.prMs} QRS ${r.truth.qrsMs} QT ${r.truth.qtMs} QTcB ${r.truth.qtcBazettMs} axis ${r.truth.axisDeg} reg ${r.truth.regular}`);
  console.log('lead   R     S    stJ  stJ60   T');
  for (const l of leads) {
    const x = m[l];
    if (x) console.log(`${l.padEnd(4)} ${f(x.r)} ${f(x.s)} ${f(x.stJ)} ${f(x.stJ60)} ${f(x.t)}`);
  }
  return r;
}
const which = process.argv[2] ?? 'normal';
const specs: Record<string, SynthSpec> = {
  normal: { rhythm: { kind: 'sinus', rate: 72 }, seed: 1 },
  rbbb: { rhythm: { kind: 'sinus', rate: 72 }, morph: { conduction: 'rbbb' }, seed: 1 },
  lbbb: { rhythm: { kind: 'sinus', rate: 72 }, morph: { conduction: 'lbbb', qtc: 420 }, seed: 1 },
  lafb: { rhythm: { kind: 'sinus', rate: 72 }, morph: { conduction: 'lafb' }, seed: 1 },
  lpfb: { rhythm: { kind: 'sinus', rate: 72 }, morph: { conduction: 'lpfb' }, seed: 1 },
  ant: { rhythm: { kind: 'sinus', rate: 88 }, morph: { st: [{ territory: 'anteriorProximal', mm: 3.5, shape: 'convex' }], tExtra: [{ territory: 'anterior', mm: 4 }] }, seed: 1 },
  inf: { rhythm: { kind: 'sinus', rate: 70 }, morph: { st: [{ territory: 'inferiorRv', mm: 3 }] }, seed: 1 },
  post: { rhythm: { kind: 'sinus', rate: 80 }, morph: { st: [{ territory: 'posterior', mm: 1.2 }] }, seed: 1 },
  avr: { rhythm: { kind: 'sinus', rate: 105 }, morph: { st: [{ territory: 'diffuseSubendo', mm: 1.5, shape: 'downsloping' }] }, seed: 1 },
  lvh: { rhythm: { kind: 'sinus', rate: 72 }, morph: { lvh: 1, strain: 'lv' }, seed: 1 },
};
if (specs[which]) probe(which, specs[which], which === 'post' || which === 'inf');
const more: Record<string, SynthSpec> = {
  wpw: { rhythm: { kind: 'sinus', rate: 75, prMs: 100 }, morph: { conduction: 'wpw-ll', deltaS: 0.045 }, seed: 2 },
  brug: { rhythm: { kind: 'sinus', rate: 70 }, morph: { brugada: 1, conduction: 'irbbb' }, seed: 2 },
  wellB: { rhythm: { kind: 'sinus', rate: 70 }, morph: { wellens: 'B' }, seed: 2 },
  wellA: { rhythm: { kind: 'sinus', rate: 70 }, morph: { wellens: 'A' }, seed: 2 },
  dew: { rhythm: { kind: 'sinus', rate: 90 }, morph: { st: [{ territory: 'posterior', mm: -2, shape: 'upsloping', index: 'V3' }], tExtra: [{ territory: 'anterior', mm: 9, symmetric: true }] }, seed: 2 },
  hk3: { rhythm: { kind: 'sinus', rate: 70 }, morph: { tPeaked: 1 }, seed: 2 },
  hypok: { rhythm: { kind: 'sinus', rate: 70 }, morph: { tScale: 0.3, u: 0.18, st: [{ territory: 'subendoLateral', mm: -0.6, shape: 'downsloping' }] }, seed: 2 },
  osb: { rhythm: { kind: 'sinus', rate: 42 }, morph: { osborn: 0.35, qtc: 480 }, seed: 2 },
  tca: { rhythm: { kind: 'sinus', rate: 125 }, morph: { qrsWiden: 1.35, tcaTerminal: 0.4 }, seed: 2 },
  dig: { rhythm: { kind: 'sinus', rate: 70, prMs: 200 }, morph: { st: [{ territory: 'subendoLateral', mm: -1.5, shape: 'scooped' }], tScale: 0.4, qtc: 360 }, seed: 2 },
  peri: { rhythm: { kind: 'sinus', rate: 100 }, morph: { st: [{ territory: 'pericarditis', mm: 2, shape: 'concave' }], prDepression: 1 }, seed: 2 },
  paced: { rhythm: { kind: 'paced', mode: 'VVI', rate: 70 }, seed: 2 },
  vt: { rhythm: { kind: 'vt', rate: 170 }, seed: 2 },
};
if (more[which]) probe(which, more[which]);
