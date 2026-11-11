/** Pemuat data kasus (lazy): manifest nyata via fetch, sinyal per kasus. */
import { decodeEkg1 } from '../ekg/core/binary';
import type { LoadedCase, CaseMeta, RealManifestEntry } from './model';
import { SERIAL_METAS, SYNTH_METAS, realAnnotations, realMeta, resolveSynthAnnotations } from './model';

const BASE = import.meta.env.BASE_URL;
let manifestPromise: Promise<RealManifestEntry[]> | null = null;

export function caseUrl(path: string): string {
  return `${BASE}cases/real/${path}`;
}

export function loadRealManifest(): Promise<RealManifestEntry[]> {
  manifestPromise ??= fetch(caseUrl('manifest.json'))
    .then((r) => {
      if (!r.ok) throw new Error(`Manifest gagal dimuat (${r.status})`);
      return r.json();
    })
    .then((j: { cases: RealManifestEntry[] }) => j.cases)
    .catch((e) => {
      manifestPromise = null;
      throw e;
    });
  return manifestPromise;
}

export async function loadCatalog(): Promise<CaseMeta[]> {
  let real: CaseMeta[] = [];
  try {
    real = (await loadRealManifest()).map(realMeta);
  } catch {
    real = [];
  }
  return [...SYNTH_METAS, ...real];
}

const cache = new Map<string, Promise<LoadedCase>>();

export function loadCase(meta: CaseMeta): Promise<LoadedCase> {
  const hit = cache.get(meta.id);
  if (hit) return hit;
  const p = (async (): Promise<LoadedCase> => {
    if (meta.kind === 'sintetis' && meta.synth) {
      const { synthesize } = await import('../ekg/synth/synth');
      const r = synthesize(meta.synth.spec);
      const dur = r.signal.length / r.signal.fs;
      const truth = {
        hr: r.truth.hr || null,
        atrialRate: r.truth.atrialRate,
        pr: r.truth.prMs,
        qrs: r.truth.qrsMs,
        qt: r.truth.qtMs,
        qtcB: r.truth.qtcBazettMs,
        qtcF: r.truth.qtcFridericiaMs,
        axis: r.truth.axisDeg,
        source: 'model synthesizer',
      };
      return { meta: { ...meta, truth }, signal: r.signal, annotations: resolveSynthAnnotations(meta.synth, r.beats, dur), beats: r.beats, truth };
    }
    if (!meta.real) throw new Error('Data kasus tidak lengkap');
    const res = await fetch(caseUrl(meta.real.file));
    if (!res.ok) throw new Error(`Rekaman ${meta.id} gagal dimuat (${res.status})`);
    const signal = decodeEkg1(await res.arrayBuffer());
    return { meta, signal, annotations: realAnnotations(meta.real), beats: [], truth: meta.truth! };
  })();
  cache.set(meta.id, p);
  p.catch(() => cache.delete(meta.id));
  return p;
}

export function findSerial(id: string): CaseMeta | undefined {
  return SERIAL_METAS.find((m) => m.id === id) ?? SYNTH_METAS.find((m) => m.id === id);
}

/** Paket offline per kategori: unduh & cache rekaman nyata (service worker CacheFirst). */
export async function downloadOfflinePack(metas: CaseMeta[], onProgress?: (done: number, total: number) => void): Promise<number> {
  const real = metas.filter((m) => m.real);
  let done = 0;
  const cacheApi = 'caches' in self ? await caches.open('ekg-cases') : null;
  for (const m of real) {
    const url = caseUrl(m.real!.file);
    try {
      if (cacheApi) {
        const hit = await cacheApi.match(url);
        if (!hit) await cacheApi.add(url);
      } else await fetch(url);
    } catch {
      /* lanjutkan */
    }
    done++;
    onProgress?.(done, real.length);
  }
  if (cacheApi) {
    try {
      await cacheApi.add(caseUrl('manifest.json'));
    } catch {
      /* abaikan */
    }
  }
  return done;
}
