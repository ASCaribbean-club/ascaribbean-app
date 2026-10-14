// SEUL fichier du dépôt autorisé à importer posthog-js (règle
// dependency-cruiser `posthog-only-in-adapter`). Changer d'outil = réécrire ce
// fichier ; le reste de l'app ne connaît que l'interface Observability.
import posthog, { type CaptureResult } from 'posthog-js'
import type { Role } from '@domain/entities/user'
import type { AnalyticsEvent } from './analytics-events'
import type { ErrorContext, Observability } from './observability'
import { scrubEvent, type OutgoingEvent } from './scrub-event'

interface PosthogAdapterOptions {
  projectKey: string
  host: string
}

export function createPosthogObservability({ projectKey, host }: PosthogAdapterOptions): Observability {
  let analyticsEnabled = false
  let currentRoute = 'unknown'
  let identity: { userId: string; roles: Role[] } | null = null

  posthog.init(projectKey, {
    api_host: host,
    // Chaque réglage ci-dessous est une contrainte de confidentialité : ne pas
    // « simplifier » vers les défauts du SDK.
    autocapture: false, // capturerait le texte des éléments cliqués (noms de membres)
    capture_pageview: false, // pages vues émises à la main, en motif de route
    capture_pageleave: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    rageclick: false,
    disable_session_recording: true,
    disable_surveys: true,
    capture_exceptions: false, // erreurs captées par nos 3 points, classées par shouldReportError
    advanced_disable_feature_flags: true,
    person_profiles: 'identified_only',
    persistence: 'localStorage', // pas de cookie
    before_send: (result: CaptureResult | null) => {
      if (!result) return null
      // Mesure d'usage coupée tant que enableAnalytics() n'a pas été appelée :
      // seules les exceptions passent (intérêt légitime — garder le service).
      if (!analyticsEnabled && result.event !== '$exception') return null
      return scrubEvent(result as unknown as OutgoingEvent, currentRoute) as unknown as CaptureResult
    },
  })

  return {
    track(event: AnalyticsEvent) {
      if (event.name === 'screen_viewed') currentRoute = event.props.route
      if (!analyticsEnabled) return
      posthog.capture(event.name, event.props)
    },
    reportError(error: unknown, context: ErrorContext) {
      posthog.captureException(error, { source: context.source, action: context.action })
    },
    enableAnalytics() {
      analyticsEnabled = true
      // L'identification est retenue tant que la mesure est coupée.
      if (identity) posthog.identify(identity.userId, { roles: identity.roles })
    },
    identify(userId, roles) {
      identity = { userId, roles }
      // Les rôles accompagnent les erreurs (autorisé) ; l'UUID, lui, n'est
      // envoyé qu'une fois la mesure d'usage activée.
      posthog.register({ roles })
      if (analyticsEnabled) posthog.identify(userId, { roles })
    },
    setActiveRole(role) {
      posthog.register({ active_role: role })
    },
    reset() {
      identity = null
      posthog.reset()
    },
  }
}
