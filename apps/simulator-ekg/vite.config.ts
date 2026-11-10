/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Disajikan di https://<situs>/simulator-ekg/
const BASE = '/simulator-ekg/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Simulator EKG 12-Lead',
        short_name: 'Simulator EKG',
        description: 'Latihan interpretasi EKG 12 sadapan untuk dokter umum dan residen: EKG nyata (PTB-XL) dan sintetis, alat ukur, mode belajar.',
        lang: 'id',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: '#0b1220',
        theme_color: '#1b2a4a',
        categories: ['education', 'medical'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Hanya cangkang aplikasi yang di-precache. Data kasus TIDAK di-precache:
        // di-cache saat dibuka (runtime) atau lewat tombol "unduh paket offline".
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        globIgnores: ['cases/**', 'lib/**'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith(`${BASE}cases/`),
            handler: 'CacheFirst',
            options: { cacheName: 'ekg-cases', expiration: { maxEntries: 600 } },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
