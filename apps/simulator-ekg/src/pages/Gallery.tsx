/** Galeri semua pola sintetis (tersembunyi: #/galeri?hal=1) — untuk validasi & screenshot PR. */
import { useEffect, useState } from 'react';
import { SERIAL_METAS, SYNTH_METAS, type LoadedCase } from '../cases/model';
import { loadCase } from '../cases/loader';
import { DIAGNOSES } from '../cases/diagnoses';
import { Ecg12LeadViewer } from '../ekg/react/Ecg12LeadViewer';
import { href } from '../router';

const PER = 8;
const ALL = [...SYNTH_METAS.filter((m) => !m.reference), ...SERIAL_METAS];

export default function Gallery({ page }: { page: number }) {
  const pages = Math.ceil(ALL.length / PER);
  const items = ALL.slice((page - 1) * PER, page * PER);
  const [loaded, setLoaded] = useState<LoadedCase[]>([]);
  useEffect(() => {
    setLoaded([]);
    void Promise.all(items.map(loadCase)).then(setLoaded);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="mx-auto max-w-7xl px-4 py-4" data-testid="gallery">
      <h1 className="text-xl font-bold">
        Galeri pola sintetis — halaman {page}/{pages} ({ALL.length} EKG)
      </h1>
      <nav className="my-2 flex flex-wrap gap-1" aria-label="Halaman galeri">
        {Array.from({ length: pages }, (_, i) => (
          <a key={i} className={`ctrl ${i + 1 === page ? 'ctrl-on' : ''}`} href={href({ name: 'galeri', page: i + 1 })}>
            {i + 1}
          </a>
        ))}
      </nav>
      <div className="grid gap-3 lg:grid-cols-2" data-ready={loaded.length === items.length ? 'ya' : 'tidak'} data-testid="gallery-grid">
        {loaded.map((c) => (
          <figure key={c.meta.id} className="card !p-2">
            <figcaption className="mb-1 text-sm">
              <strong>◆ {DIAGNOSES[c.meta.dx].label}</strong> <span className="font-mono text-xs">{c.meta.id}</span>
            </figcaption>
            <Ecg12LeadViewer signal={c.signal} settings={{ speed: 25, gain: 10, layout: '3x4', extraRow: c.meta.extraLeads }} annotations={c.annotations} showAnnotations={false} />
          </figure>
        ))}
      </div>
    </div>
  );
}
