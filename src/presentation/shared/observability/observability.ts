import type { Role } from '@domain/entities/user'
import type { AnalyticsEvent } from './analytics-events'

export type ErrorSource = 'error_boundary' | 'window_error' | 'unhandled_rejection' | 'mutation'

// Contexte d'une erreur remontée : uniquement des valeurs non identifiantes.
export interface ErrorContext {
  source: ErrorSource
  // Nom stable de l'action en échec ("respond_to_convocation"), jamais un message.
  action?: string
}

// Seul contrat que le reste de l'app connaît. Changer d'outil = réécrire
// posthog-adapter.ts uniquement.
export interface Observability {
  track(event: AnalyticsEvent): void
  reportError(error: unknown, context: ErrorContext): void
  // Active la mesure d'usage (démarre désactivée — consentement OPEN, cf.
  // DEFAULTS-A-CHALLENGER.md). Le suivi d'erreurs, lui, est toujours actif.
  enableAnalytics(): void
  // UUID interne + noms de rôles uniquement.
  identify(userId: string, roles: Role[]): void
  // Rôle courant du tableau de bord (joueur, coach…) : ajouté à chaque événement.
  setActiveRole(role: string): void
  reset(): void
}
