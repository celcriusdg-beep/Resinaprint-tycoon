import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The production build is written to ../riftshop so the repository's static
// hosting serves the game at /riftshop/. All paths are relative.
export default defineConfig({
  base: './',
  build: { outDir: '../riftshop', emptyOutDir: true, target: 'es2020', chunkSizeWarningLimit: 1600 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png', 'favicon.svg'],
      manifest: {
        name: 'Rift Shop',
        short_name: 'Rift Shop',
        description: 'Run a Riftbound card shop.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0d0a16',
        theme_color: '#0d0a16',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Card pictures come from Riot's CDN; keep the ones you've seen for offline play.
        runtimeCaching: [{
          urlPattern: ({ url }) => url.hostname === 'cmsassets.rgpub.io',
          handler: 'CacheFirst',
          options: { cacheName: 'card-art', expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 120 }, cacheableResponse: { statuses: [0, 200] } },
        }],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
