// Dernier rempart avant l'envoi : liste blanche de propriétés par type
// d'événement. Tout ce dont on n'est pas sûr qu'il ne contienne pas de donnée
// personnelle est supprimé (messages d'erreur, URLs résolues, referrer, titres).
// Fichier pur (sans posthog-js) pour rester testable.
import type { AnalyticsEvent } from './analytics-events'

export interface OutgoingEvent {
  event: string
  properties?: Record<string, unknown>
  $set?: Record<string, unknown>
  $set_once?: Record<string, unknown>
}

type CataloguePropKey = AnalyticsEvent extends infer E ? (E extends { props: infer P } ? keyof P : never) : never

// Record exhaustif : ajouter une propriété au catalogue sans l'ajouter ici
// ne compile pas, et inversement (la liste blanche suit le catalogue).
const CATALOGUE_PROP_KEYS: Record<CataloguePropKey, true> = {
  route: true,
  status: true,
  minutes_before_deadline: true,
  error_class: true,
  mode: true,
  notice_days: true,
  screen: true,
  filter: true,
  active: true,
  alert: true,
  target: true,
  kind: true,
  convocation_type: true,
  convocation_date: true,
  origin: true,
  tab: true,
}

const COMMON_KEYS = [...Object.keys(CATALOGUE_PROP_KEYS), 'token', 'distinct_id', '$lib', '$lib_version', '$device_id', '$session_id', '$window_id', '$is_identified', '$process_person_profile', '$browser', '$os', '$device_type', '$screen_width', '$screen_height', '$viewport_width', '$viewport_height', 'roles', 'source', 'action', 'active_role']

const EXCEPTION_KEYS = ['$exception_list', '$exception_level', '$exception_fingerprint', '$exception_handled', '$exception_types', '$exception_sources', '$exception_functions']

interface ExceptionEntry {
  type?: unknown
  mechanism?: unknown
  stacktrace?: unknown
}

// Garde la classe d'erreur et la stack ; supprime `value` (le message), qui
// peut embarquer un nom ou une valeur saisie.
function scrubExceptionList(list: unknown): unknown {
  if (!Array.isArray(list)) return []
  return list.map((entry: ExceptionEntry) => ({
    type: typeof entry?.type === 'string' ? entry.type : 'Error',
    mechanism: entry?.mechanism,
    stacktrace: entry?.stacktrace,
  }))
}

export function scrubEvent(event: OutgoingEvent, routePattern: string): OutgoingEvent {
  const source = event.properties ?? {}
  const allowed = event.event === '$exception' ? [...COMMON_KEYS, ...EXCEPTION_KEYS] : COMMON_KEYS
  const properties: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in source) properties[key] = source[key]
  }
  if (event.event === '$exception') {
    properties['$exception_list'] = scrubExceptionList(source['$exception_list'])
  }
  // Même sur un événement custom, le SDK ajoute l'URL résolue : on la remplace
  // par le motif de route.
  properties['$current_url'] = routePattern
  properties['$pathname'] = routePattern
  // Sans ceci PostHog déduit ville / code postal de l'IP côté serveur.
  properties['$geoip_disable'] = true

  // Propriétés de personne : seuls les rôles sont autorisés.
  const roles = event.$set?.roles
  const scrubbed: OutgoingEvent = { event: event.event, properties }
  if (roles !== undefined) scrubbed.$set = { roles }
  return scrubbed
}
