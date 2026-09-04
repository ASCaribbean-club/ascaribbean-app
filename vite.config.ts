import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Read directly from package.json rather than `process.env.npm_package_version`:
// that env var is only populated when the dev/build command is invoked through
// npm's own script runner, and comes back `undefined` under pnpm/yarn or a
// direct `vite` invocation — reading the file works the same way regardless
// of how the command was launched.
const { version: appVersion } = JSON.parse(readFileSync(path.resolve(dirname, 'package.json'), 'utf-8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Typed in src/vite-env.d.ts — consumed by useMenuViewModel.ts (AC-MN-09).
    APP_VERSION: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AS Caribbean',
        short_name: 'AS Caribbean',
        description: "Application du club AS Caribbean",
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#030201',
        theme_color: '#030201',
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
      '@': path.resolve(dirname, 'src'),
    },
  },
})
