/**
 * Build modul EKG bersama sebagai ES module tanpa framework (dipakai simulator
 * lain di repo, termasuk yang berbasis HTML/JS biasa). Output: dist/lib/ekg-module.js
 * Lihat docs/EKG_MODULE.md.
 */
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist/lib',
    emptyOutDir: false,
    target: 'es2020',
    lib: {
      entry: 'src/ekg/index.ts',
      formats: ['es'],
      fileName: () => 'ekg-module.js',
    },
  },
});
