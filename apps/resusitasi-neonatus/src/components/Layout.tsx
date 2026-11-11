import type { ReactNode } from 'react';
import { href, type Route } from '../router';
import { SITE, DISCLAIMER } from '../config/site';
import { usePrefs, type Theme } from '../store/prefs';
import { useSim } from '../store/sim';
import { cx } from '../lib/format';

const NAV: Array<{ r: Route; label: string }> = [
  { r: { name: 'home' }, label: 'Skenario' },
  { r: { name: 'riwayat' }, label: 'Riwayat' },
  { r: { name: 'referensi' }, label: 'Referensi' },
  { r: { name: 'tentang' }, label: 'Tentang' },
];

export function Layout({ route, children, minimal }: { route: Route; children: ReactNode; minimal?: boolean }) {
  const theme = usePrefs((p) => p.theme);
  const setPrefs = usePrefs((p) => p.set);
  const examActive = useSim((s) => !!s.state && s.mode === 'ujian');
  const next: Record<Theme, Theme> = { sistem: 'terang', terang: 'gelap', gelap: 'sistem' };
  const themeLabel: Record<Theme, string> = { sistem: 'Tema: ikuti sistem', terang: 'Tema: terang', gelap: 'Tema: gelap' };

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-slate-900">
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <a href={href({ name: 'home' })} className="flex shrink-0 items-center gap-2 font-bold text-slate-900 dark:text-white">
            <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="28" height="28" className="h-7 w-7" />
            <span className="hidden sm:inline">{SITE.APP_NAME}</span>
            <span className="sm:hidden">Resusitasi Neonatus</span>
          </a>
          {!minimal && (
            <nav aria-label="Navigasi utama" className="ml-auto flex items-center gap-1 overflow-x-auto">
              {NAV.map(({ r, label }) => {
                const locked = r.name === 'referensi' && examActive;
                return (
                  <a
                    key={r.name}
                    href={locked ? undefined : href(r)}
                    aria-current={route.name === r.name ? 'page' : undefined}
                    aria-disabled={locked || undefined}
                    title={locked ? 'Referensi dikunci selama Mode Ujian' : undefined}
                    className={cx(
                      'shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium',
                      route.name === r.name ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                      locked && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    {label}
                    {locked && ' 🔒'}
                  </a>
                );
              })}
            </nav>
          )}
          <button
            type="button"
            onClick={() => setPrefs({ theme: next[theme] })}
            className={cx('shrink-0 rounded-lg p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800', minimal && 'ml-auto')}
            aria-label={`${themeLabel[theme]} — ketuk untuk mengganti`}
            title={themeLabel[theme]}
            data-testid="theme-toggle"
          >
            <span aria-hidden="true">{theme === 'gelap' ? '🌙' : theme === 'terang' ? '☀️' : '🖥️'}</span>
          </button>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      {!minimal && (
        <footer className="border-t border-slate-200 bg-slate-50 px-4 py-6 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          <div className="mx-auto max-w-6xl space-y-2">
            <p>
              <strong>Disclaimer:</strong> {DISCLAIMER}
            </p>
            <p>
              Acuan: {SITE.GUIDELINE_LABEL}, disesuaikan dengan konteks Indonesia. Tanpa login, tanpa pengumpulan data pribadi (hanya penghitung kunjungan anonim) — riwayat hanya disimpan di perangkat Anda. ·{' '}
              <a className="underline" href={SITE.MAIN_SITE_URL}>
                Situs utama
              </a>{' '}
              · v{SITE.VERSION}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
