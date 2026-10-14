import { createPosthogObservability } from '@presentation/shared/observability/posthog-adapter'
import { noopObservability } from '@presentation/shared/observability/noop-observability'
import type { Observability } from '@presentation/shared/observability/observability'

export interface ObservabilityContainer {
  observability: Observability
}

// Actif uniquement en production (build `vite build`) : en dev, rien n'est
// envoyé, pour ne pas polluer le seul projet PostHog (le plan gratuit n'en
// autorise qu'un). Pas de clé non plus → implémentation muette (tests, builds
// sans configuration). La clé projet `phc_…` est publique par conception
// (seule clé PostHog autorisée en VITE_).
export function createObservabilityContainer(): ObservabilityContainer {
  const projectKey = import.meta.env.VITE_POSTHOG_KEY
  if (!projectKey || !import.meta.env.PROD) return { observability: noopObservability }
  return {
    observability: createPosthogObservability({
      projectKey,
      host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    }),
  }
}
