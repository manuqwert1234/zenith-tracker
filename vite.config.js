import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Cloud sync / push (Firebase) is optional and dynamically imported —
        // don't precache it, so browsers that never use it never fetch it.
        globIgnores: ['**/firebaseSync-*.js', '**/CloudSyncSection-*.js', '**/PushReminderSection-*.js'],
      },
      manifest: {
        name: 'CalTrack',
        short_name: 'CalTrack',
        description: 'A private, local-first calorie & nutrition tracker with photo food logs and AI-friendly exports.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
