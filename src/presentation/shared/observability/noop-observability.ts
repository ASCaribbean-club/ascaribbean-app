import type { Observability } from './observability'

// Utilisé quand VITE_POSTHOG_KEY est absent (dev sans clé, tests) : l'app
// tourne identique, rien n'est envoyé.
export const noopObservability: Observability = {
  track: () => {},
  reportError: () => {},
  enableAnalytics: () => {},
  identify: () => {},
  setActiveRole: () => {},
  reset: () => {},
}
