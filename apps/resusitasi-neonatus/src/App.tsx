import { useEffect, useState } from 'react';
import { useRoute } from './router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Briefing, NotFound } from './pages/Briefing';
import { SimPage } from './pages/Sim';
import { Debrief } from './pages/Debrief';
import { History } from './pages/History';
import { Reference } from './pages/Reference';
import { About } from './pages/About';
import { Onboarding } from './components/Onboarding';
import { applyTheme, usePrefs } from './store/prefs';

export function App() {
  const route = useRoute();
  const theme = usePrefs((p) => p.theme);
  const onboarded = usePrefs((p) => p.onboarded);
  const setPrefs = usePrefs((p) => p.set);
  const [tour, setTour] = useState(false);

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
    const titles: Record<string, string> = {
      home: 'Skenario',
      briefing: 'Briefing',
      sim: 'Simulasi',
      debrief: 'Debriefing',
      riwayat: 'Riwayat',
      referensi: 'Referensi',
      tentang: 'Tentang',
      notfound: 'Tidak ditemukan',
    };
    document.title = `${titles[route.name]} · Simulator Resusitasi Neonatus`;
    if (route.name !== 'sim') window.scrollTo(0, 0);
  }, [route.name]);

  const closeTour = () => {
    setTour(false);
    setPrefs({ onboarded: true });
  };

  let page: React.ReactNode;
  switch (route.name) {
    case 'home':
      page = <Home onOnboarding={() => setTour(true)} />;
      break;
    case 'briefing':
      page = <Briefing id={route.id} />;
      break;
    case 'sim':
      page = <SimPage id={route.id} />;
      break;
    case 'debrief':
      page = <Debrief />;
      break;
    case 'riwayat':
      page = <History />;
      break;
    case 'referensi':
      page = <Reference />;
      break;
    case 'tentang':
      page = <About />;
      break;
    default:
      page = <NotFound />;
  }
  return (
    <Layout route={route} minimal={route.name === 'sim'}>
      {page}
      {tour && <Onboarding onClose={closeTour} />}
    </Layout>
  );
}
