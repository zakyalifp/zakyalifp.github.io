/** Router hash (#/...) — aman untuk GitHub Pages (tidak pernah 404 saat dimuat ulang). */
import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'bank' }
  | { name: 'kasus'; id: string }
  | { name: 'latihan'; mode: 'sistematis' | 'cepat' | 'adaptif'; level?: string; cat?: string }
  | { name: 'klinis'; id?: string }
  | { name: 'monitor' }
  | { name: 'kurikulum' }
  | { name: 'debriefing' }
  | { name: 'progres' }
  | { name: 'sumber' }
  | { name: 'tentang' }
  | { name: 'panduan' }
  | { name: 'reviewer' }
  | { name: 'notfound' };

function parseQuery(q: string | undefined): Record<string, string> {
  const o: Record<string, string> = {};
  if (!q) return o;
  for (const kv of q.split('&')) {
    const [k, v] = kv.split('=');
    if (k) o[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }
  return o;
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '').replace(/^\/+/, '');
  const [path, query] = raw.split('?');
  const q = parseQuery(query);
  const [a, b] = path.split('/').map(decodeURIComponent);
  switch (a ?? '') {
    case '':
      return { name: 'home' };
    case 'bank':
      return { name: 'bank' };
    case 'kasus':
      return b ? { name: 'kasus', id: b } : { name: 'bank' };
    case 'latihan':
      if (b === 'sistematis' || b === 'cepat' || b === 'adaptif') return { name: 'latihan', mode: b, level: q.tingkat, cat: q.kategori };
      if (b === 'klinis') return { name: 'klinis', id: q.id };
      if (b === 'monitor') return { name: 'monitor' };
      return { name: 'home' };
    case 'kurikulum':
      return { name: 'kurikulum' };
    case 'debriefing':
      return { name: 'debriefing' };
    case 'progres':
      return { name: 'progres' };
    case 'sumber':
      return { name: 'sumber' };
    case 'tentang':
      return { name: 'tentang' };
    case 'panduan':
      return { name: 'panduan' };
    case 'reviewer':
      return { name: 'reviewer' };
    default:
      return { name: 'notfound' };
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'home':
      return '#/';
    case 'kasus':
      return `#/kasus/${encodeURIComponent(r.id)}`;
    case 'latihan': {
      const q = [r.level ? `tingkat=${encodeURIComponent(r.level)}` : '', r.cat ? `kategori=${encodeURIComponent(r.cat)}` : ''].filter(Boolean).join('&');
      return `#/latihan/${r.mode}${q ? `?${q}` : ''}`;
    }
    case 'klinis':
      return r.id ? `#/latihan/klinis?id=${encodeURIComponent(r.id)}` : '#/latihan/klinis';
    case 'monitor':
      return '#/latihan/monitor';
    default:
      return `#/${r.name}`;
  }
}

export function navigate(r: Route): void {
  const h = href(r);
  if (location.hash !== h) location.hash = h;
  else window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash, () => '');
  return parseHash(hash);
}
