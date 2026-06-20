import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { existsSync, copyFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Build a release identifier for Sentry: `chessmate@<version>+<commit>`. The
// commit comes from the CI/host (Netlify `COMMIT_REF`, GitHub `GITHUB_SHA`) when
// available, so prod errors map to an exact build even before a DSN is wired.
const pkgVersion = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8'),
).version as string;
const commit = (process.env.COMMIT_REF || process.env.GITHUB_SHA || '').slice(0, 7);
const appRelease = `chessmate@${pkgVersion}${commit ? `+${commit}` : ''}`;

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    // Exposed as import.meta.env.VITE_APP_RELEASE for Sentry release tagging.
    'import.meta.env.VITE_APP_RELEASE': JSON.stringify(appRelease),
  },
  plugins: [
    // Copy stockfish.js from node_modules to public/ at build time — eliminates CDN dependency
    {
      name: 'copy-stockfish',
      buildStart() {
        const src = resolve(__dirname, 'node_modules/stockfish.js/stockfish.js');
        const dest = resolve(__dirname, 'public/stockfish.js');
        try {
          if (existsSync(src)) copyFileSync(src, dest);
        } catch (e) {
          console.warn('[copy-stockfish] Could not copy stockfish.js:', e);
        }
      },
    },
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'ChessMate - AI Chess Mentor',
        short_name: 'ChessMate',
        description: 'Your personal AI-powered chess analysis and improvement tool',
        theme_color: '#22c55e',
        background_color: '#1e293b',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom', 'chess.js'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          chess: ['chess.js'],
          ui: ['lucide-react'],
        },
      },
    },
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    hmr: {
      overlay: false,
    },
  },
});
