/**
 * Router berbasis hash (#/...). Aman untuk GitHub Pages: memuat ulang halaman
 * tidak pernah menghasilkan 404 karena server selalu menyajikan index.html.
 */
import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'briefing'; id: string }
  | { name: 'sim'; id: string }
  | { name: 'debrief' }
  | { name: 'riwayat' }
  | { name: 'referensi' }
  | { name: 'tentang' }
  | { name: 'notfound' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '');
  const [a, b] = path.split('/').map(decodeURIComponent);
  switch (a ?? '') {
    case '':
      return { name: 'home' };
    case 'skenario':
      return b ? { name: 'briefing', id: b } : { name: 'home' };
    case 'sim':
      return b ? { name: 'sim', id: b } : { name: 'home' };
    case 'debriefing':
      return { name: 'debrief' };
    case 'riwayat':
      return { name: 'riwayat' };
    case 'referensi':
      return { name: 'referensi' };
    case 'tentang':
      return { name: 'tentang' };
    default:
      return { name: 'notfound' };
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'home':
      return '#/';
    case 'briefing':
      return `#/skenario/${encodeURIComponent(r.id)}`;
    case 'sim':
      return `#/sim/${encodeURIComponent(r.id)}`;
    case 'debrief':
      return '#/debriefing';
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
