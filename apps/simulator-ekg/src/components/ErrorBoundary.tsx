import { Component, type ReactNode } from 'react';

/** Mencegah layar kosong bila terjadi galat tak terduga; menawarkan pemulihan. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Terjadi kesalahan tak terduga</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Riwayat latihan Anda tetap aman. Muat ulang halaman untuk melanjutkan.</p>
        <p className="mt-2 font-mono text-xs text-slate-500">{this.state.error.message}</p>
        <button type="button" className="btn-primary mt-4" onClick={() => { location.hash = '#/'; location.reload(); }}>
          Kembali ke katalog
        </button>
      </div>
    );
  }
}
