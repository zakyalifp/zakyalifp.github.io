/**
 * Penghitung kunjungan anonim (GoatCounter) — tanpa cookie, tanpa data pribadi.
 * Versi bawaan Simulator EKG dari /assets/counter.js situs utama (kode situs sama).
 * Tidak aktif di localhost/jaringan lokal dan saat diuji otomatis (navigator.webdriver).
 */
import { SITE } from '../config/site';

const base = () => `https://${SITE.GOATCOUNTER_CODE}.goatcounter.com`;

export function countingDisabled(loc: Pick<Location, 'hostname' | 'protocol'> = location, nav: Pick<Navigator, 'webdriver'> = navigator): boolean {
  const h = loc.hostname;
  return (
    !SITE.GOATCOUNTER_CODE ||
    !h ||
    loc.protocol === 'file:' ||
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '[::1]' ||
    /^(10|192\.168)\./.test(h) ||
    nav.webdriver === true
  );
}

/** Kirim satu kunjungan (sekali per pemuatan halaman). */
export function startVisitCounter(): void {
  if (countingDisabled()) return;
  const w = window as unknown as { __zapCounterLoaded?: boolean };
  if (w.__zapCounterLoaded) return;
  w.__zapCounterLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `${base()}/count`;
  document.head.appendChild(s);
}

/** "1,234" (format GoatCounter) → "1.234" (format Indonesia). */
export function formatCount(raw: string): string {
  const digits = raw.replace(/[^0-9]+/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
}

const cache = new Map<string, Promise<string | null>>();

/**
 * Jumlah kunjungan: 'TOTAL' = seluruh situs; atau path halaman (mis. '/simulator-ekg/').
 * Angka dari GoatCounter di-cache server hingga ±4 jam.
 */
export function fetchVisitCount(path: string): Promise<string | null> {
  if (countingDisabled()) return Promise.resolve(null);
  const key = path === 'TOTAL' ? 'TOTAL' : encodeURIComponent(path);
  let p = cache.get(key);
  if (!p) {
    p = fetch(`${base()}/counter/${key}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<{ count?: string }>) : null))
      .then((d) => (d?.count ? formatCount(String(d.count)) || null : null))
      .catch(() => null);
    cache.set(key, p);
  }
  return p;
}
