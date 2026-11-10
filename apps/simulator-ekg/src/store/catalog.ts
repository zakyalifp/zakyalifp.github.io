import { create } from 'zustand';
import type { CaseMeta } from '../cases/model';
import { SYNTH_METAS } from '../cases/model';
import { loadCatalog } from '../cases/loader';

interface CatalogStore {
  cases: CaseMeta[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  load: () => Promise<void>;
}

export const useCatalog = create<CatalogStore>((set, get) => ({
  cases: SYNTH_METAS,
  status: 'idle',
  load: async () => {
    if (get().status === 'loading' || get().status === 'ready') return;
    set({ status: 'loading' });
    try {
      const cases = await loadCatalog();
      const realCount = cases.filter((c) => c.kind === 'nyata').length;
      set({ cases, status: 'ready', error: realCount ? undefined : 'Data EKG nyata gagal dimuat (periksa koneksi); kasus sintetis tetap tersedia.' });
    } catch (e) {
      set({ status: 'error', error: String(e) });
    }
  },
}));

/** Kasus yang dapat dipakai latihan (tanpa pembanding). */
export function quizCases(all: CaseMeta[], opts: { level?: string; cat?: string; includeSynthetic?: boolean } = {}): CaseMeta[] {
  return all.filter((c) => !c.reference && (!opts.level || c.level === opts.level) && (!opts.cat || c.category === opts.cat) && (opts.includeSynthetic !== false || c.kind === 'nyata'));
}
