import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AS Caribbean',
        short_name: 'AS Caribbean',
        description: "Application du club AS Caribbean",
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#aa3bff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Stratégie de base à l'amorçage : précache de l'app shell (JS/CSS/HTML).
        // Les stratégies runtime (API Supabase, mode dégradé) se spécifient
        // lors du module Calendrier — cf. ARCHITECTURE.md section 14.
        globPatterns: ['**/*.{js,css,html,svg,ico,png}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@domain': path.resolve(dirname, 'src/domain'),
      '@data': path.resolve(dirname, 'src/data'),
      '@presentation': path.resolve(dirname, 'src/presentation'),
    },
  },
})
