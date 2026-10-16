/// <reference types="vite/client" />

// Declaration merging: TS merges this interface with the empty ImportMetaEnv
// declared by vite/client above, so import.meta.env gets typed/autocompleted
// without redeclaring ImportMeta itself.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // Clé projet PostHog (`phc_…`) : publique par conception, seule clé PostHog
  // autorisée en VITE_. Absente → observabilité muette.
  // Clé VAPID PUBLIQUE (Web Push) : seule moitié de la paire autorisée en VITE_.
  // La clé privée est un secret de l'Edge Function send-push, JAMAIS en VITE_.
  readonly VITE_VAPID_PUBLIC_KEY?: string
  readonly VITE_POSTHOG_KEY?: string
  readonly VITE_POSTHOG_HOST?: string
}

// Fed by vite.config.ts's `define: { APP_VERSION: ... }` (reads
// package.json's version directly at build time — this just declares its
// type for TS). Replaces any hardcoded version string in the UI, e.g.
// specs/menu.md AC-MN-09's version footer.
declare const APP_VERSION: string
