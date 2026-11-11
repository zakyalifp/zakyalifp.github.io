import { lazy, Suspense, useEffect, useState } from 'react';
import { useRoute } from './router';
import { Layout } from './components/Layout';
import { Onboarding } from './components/Onboarding';
import { applyTheme, usePrefs } from './store/prefs';
import { useCatalog } from './store/catalog';
import { Home } from './pages/Home';

const Bank = lazy(() => import('./pages/Bank'));
const CaseView = lazy(() => import('./pages/CaseView'));
const Systematic = lazy(() => import('./pages/Systematic'));
const Quick = lazy(() => import('./pages/Quick'));
const Clinical = lazy(() => import('./pages/Clinical'));
const Monitor = lazy(() => import('./pages/Monitor'));
const Curriculum = lazy(() => import('./pages/Curriculum'));
const Debrief = lazy(() => import('./pages/Debrief'));
const Progress = lazy(() => import('./pages/Progress'));
const Sources = lazy(() => import('./pages/Sources'));
const About = lazy(() => import('./pages/About'));
const Reviewer = lazy(() => import('./pages/Reviewer'));
const Gallery = lazy(() => import('./pages/Gallery'));

const TITLES: Record<string, string> = {
  home: 'Beranda',
  bank: 'Bank Kasus',
  kasus: 'Kasus',
  latihan: 'Latihan',
  klinis: 'Kasus Klinis',
  monitor: 'Monitor Irama',
  kurikulum: 'Kurikulum',
  debriefing: 'Debriefing',
  progres: 'Progres',
  sumber: 'Sumber Data & Lisensi',
  tentang: 'Tentang',
  panduan: 'Panduan',
  reviewer: 'Mode Reviewer',
  galeri: 'Galeri pola sintetis',
  notfound: 'Tidak ditemukan',
};

export function App() {
  const route = useRoute();
  const theme = usePrefs((p) => p.theme);
  const onboarded = usePrefs((p) => p.onboarded);
  const setPrefs = usePrefs((p) => p.set);
  const load = useCatalog((s) => s.load);
  const [tour, setTour] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'sistem') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const h = () => applyTheme('sistem');
    mq?.addEventListener('change', h);
    return () => mq?.removeEventListener('change', h);
  }, [theme]);
  useEffect(() => {
    if (!onboarded && route.name === 'home' && !navigator.webdriver) setTour(true);
  }, [onboarded, route.name]);
  useEffect(() => {
    document.title = `${TITLES[route.name]} · Simulator EKG 12-Lead`;
    window.scrollTo(0, 0);
  }, [route.name, route.name === 'kasus' ? route.id : '']);

  const close = () => {
    setTour(false);
    setPrefs({ onboarded: true });
  };

  let page: React.ReactNode;
  switch (route.name) {
    case 'home':
      page = <Home onOnboarding={() => setTour(true)} />;
      break;
    case 'bank':
      page = <Bank />;
      break;
    case 'kasus':
      page = <CaseView id={route.id} />;
      break;
    case 'latihan':
      page = route.mode === 'sistematis' ? <Systematic level={route.level} cat={route.cat} /> : <Quick adaptive={route.mode === 'adaptif'} level={route.level} cat={route.cat} />;
      break;
    case 'klinis':
      page = <Clinical id={route.id} />;
      break;
    case 'monitor':
      page = <Monitor />;
      break;
    case 'kurikulum':
      page = <Curriculum />;
      break;
    case 'debriefing':
      page = <Debrief />;
      break;
    case 'progres':
      page = <Progress />;
      break;
    case 'sumber':
      page = <Sources />;
      break;
    case 'tentang':
    case 'panduan':
      page = <About onOnboarding={() => setTour(true)} />;
      break;
    case 'reviewer':
      page = <Reviewer />;
      break;
    case 'galeri':
      page = <Gallery page={route.page} />;
      break;
    default:
      page = (
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
          <a className="btn-primary mt-4 inline-flex" href="#/">
            Ke beranda
          </a>
        </div>
      );
  }
  return (
    <Layout route={route}>
      <Suspense fallback={<p className="px-4 py-10 text-center" role="status">Memuat…</p>}>{page}</Suspense>
      {tour && <Onboarding onClose={close} />}
    </Layout>
  );
}
