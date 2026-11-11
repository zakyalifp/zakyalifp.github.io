# Modul EKG bersama — API

Penampil 12 sadapan, synthesizer, dan monitor irama dikemas agar dapat dipakai simulator lain
di repo ini (ACLS, ATLS, neonatus). **PR ini belum mengintegrasikannya ke simulator lama.**

Dua cara pakai:

| Simulator | Cara impor |
|---|---|
| React + Vite (mis. `apps/resusitasi-neonatus`) | Impor sumber TypeScript langsung: `import { createEcgStream } from '../../simulator-ekg/src/ekg'` dan komponen React dari `../../simulator-ekg/src/ekg/react/…` (atau salin folder `src/ekg/`). |
| HTML/JS biasa (mis. `acls/`, `atls/`) | ES module tanpa framework hasil build: `/simulator-ekg/lib/ekg-module.js` (±20 kB gzip). |

```html
<canvas id="mon" style="width:100%;height:160px"></canvas>
<script type="module">
  import { createEcgStream, mountRhythmMonitor } from '/simulator-ekg/lib/ekg-module.js';
  const stream = createEcgStream({ rhythm: { kind: 'sinus', rate: 80 }, seed: 'acls-1' });
  const mon = mountRhythmMonitor(document.getElementById('mon'), stream, { lead: 'II', windowS: 6 });
  // ganti irama — transisi mulus pada denyut berikutnya
  setTimeout(() => stream.setRhythm({ kind: 'vf', coarse: true }), 8000);
</script>
```

## `createEcgStream(options): EcgStream`

| Opsi | Tipe | Keterangan |
|---|---|---|
| `rhythm` | `RhythmSpec` | Irama (lihat di bawah). |
| `morph` | `MorphSpec` | Morfologi QRS-ST-T (opsional). |
| `hr` | `number` | Pintasan laju untuk irama ber-`rate`. |
| `seed` | `string \| number` | Deterministik: seed sama → sinyal sama. |
| `fs` | `number` | Frekuensi sampling (default 250 Hz untuk monitor). |
| `leads` | `LeadName[]` | Default `['II']`. |
| `noise` | `NoiseSpec` | `{ emg, wander, mains, tremor, motion, leadOff }` (mV). |

Metode: `read(n)` → `{ [lead]: Float32Array }` (mV) · `setRhythm(rhythm, morph?)` · `rate`
(laju nominal, 0 untuk VF/asistol) · `time` (detik) · `qrsBetween(t0, t1)` (untuk "beep").

### `RhythmSpec` (ringkas)

```ts
{ kind: 'sinus', rate, prMs?, sa?, ectopy?: [{ type: 'pvc'|'pac', every?: 2|3, at?: number[], origin? }] }
{ kind: 'af', rate, irregularity?, fAmp? }          { kind: 'flutter', conduction: 2|3|4|'variable' }
{ kind: 'avnrt'|'avrt', rate }                      { kind: 'at', rate, block?: 1|2 }   { kind: 'mat', rate }
{ kind: 'junctional', rate, retro?: 'before'|'after'|'hidden' }     { kind: 'aivr', rate, sinusRate? }
{ kind: 'vt', rate, origin?: 'rvot'|'lv-lateral'|'lv-inferoapical'|'lv-basal'|'fascicular', sinusRate?, captureAt?, fusionAt? }
{ kind: 'torsades', rate }   { kind: 'vf', coarse: boolean }   { kind: 'asystole', pRate? }   { kind: 'bidirectional-vt', rate }
{ kind: 'avb', degree: 1|'mobitz1'|'mobitz2'|'2to1'|'high'|3, atrialRate, prMs?, ratio?, escapeRate?, escape? }
{ kind: 'paced', mode: 'VVI'|'AAI'|'DDD', rate, fault?: 'noncapture'|'undersensing' }
```

### `MorphSpec` (ringkas)

`conduction` (`'normal'|'rbbb'|'lbbb'|'lafb'|'lpfb'|'rbbb-lafb'|'wpw-ll'|…`), `axisShift`, `qrsScale`,
`qrsWiden`, `lvh`, `rvh`, `strain`, `oldMi`, `st: [{ territory, mm, shape? }]` (elevasi/depresi
dalam mm di sadapan indeks teritori: `anterior`, `inferior`, `inferiorRv`, `lateral`, `posterior`,
`diffuseSubendo`, `pericarditis`, …), `tExtra`, `tPeaked` (hiperkalemia), `u`, `qtc`, `osborn`,
`brugada`, `tcaTerminal`, `dextro`, `alternans`, `prDepression`, `wellens`.

## `synthesize(spec): { signal, beats, truth }`

EKG 12 sadapan 10 detik 500 Hz (opsional `extraLeads` untuk V3R–V5R, V7–V9; `electrodes`
untuk salah pasang). `truth` = laju, PR, QRS, QT, QTc Bazett/Fridericia, aksis dari model.

## Penampil

- Vanilla: `mount12LeadViewer(canvas, signal, settings?, annotations?)` → `EcgViewerCore`
  (`setSignal`, `setSettings({ layout: '3x4'|'6x2'|'single', speed: 25|50, gain: 5|10|20 })`,
  `setTool('pan'|'caliper'|'amp'|'ruler')`, `setMarch`, `setAnnotationsVisible`, `zoomBy`, `resetView`).
- React: `<Ecg12LeadViewer signal settings annotations showAnnotations tool onMeasure />`
  (`src/ekg/react/Ecg12LeadViewer.tsx`).
- Monitor: `mountRhythmMonitor(canvas, stream, { lead, windowS, gain, onBeat, speed })` atau
  `<EcgRhythmMonitor stream={…} />`.

## Data nyata

`decodeEkg1(arrayBuffer)` membaca format biner `EKG1` (8 sadapan Int16 1 µV, 500 Hz) dan
menurunkan III/aVR/aVL/aVF. Rekaman ada di `/simulator-ekg/cases/real/*.ekg` dengan
`manifest.json` (lisensi CC BY 4.0, wajib atribusi — lihat `DATA_LICENSES.md`).
