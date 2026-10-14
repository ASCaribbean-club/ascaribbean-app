// Catalogue typé = liste blanche des événements analytics (même esprit que
// domain/policies/actions.ts). `track()` n'accepte que ces membres : une
// propriété non prévue ne compile pas. Nommage `objet_verbe`, snake_case.
//
// Interdits, quel que soit l'événement : nom, e-mail, téléphone, identifiant
// de convocation/équipe/joueur, motif d'indisponibilité ("blessé"/"malade").
// Valeurs fermées : jamais un libellé saisi, un nom de section/équipe ni une URL.
export type FilterScreen =
  | 'team_stats'
  | 'team_availability'
  | 'dues_list'
  | 'treasurer_dashboard'
  | 'leaderboard'
  | 'coach_dashboard'
  | 'news'
  | 'calendar'
export type FilterKind = 'section' | 'team' | 'status' | 'roster' | 'tag' | 'favorites'
export type AlertKind = 'missing_document' | 'pending_vote' | 'dues_reminder' | 'coach_alerts'
export type ExternalLinkTarget = 'news_link' | 'club_site' | 'instagram' | 'donation' | 'federation' | 'club_rules' | 'support'
export type RecordKind =
  | 'convocation'
  | 'news'
  | 'expense'
  | 'expense_category'
  | 'payment'
  | 'checkpoint'
  | 'opening_balance'
  | 'reimbursement'
  | 'dues_reminder'

// Contexte d'une convocation : type et date uniquement — jamais l'identifiant,
// l'équipe, l'adversaire ni le lieu.
export type ConvocationType = 'training' | 'match' | 'meeting'
interface ConvocationProps {
  convocation_type: ConvocationType
  // Jour de la convocation, AAAA-MM-JJ (heure locale).
  convocation_date: string
}
// Écran d'où part la réponse.
export type ConvocationOrigin = 'dashboard' | 'convocation_detail' | 'calendar'
export type ConvocationTab = 'infos' | 'composition' | 'effectif' | 'missions' | 'votes' | 'resultat'

export type AnalyticsEvent =
  // Écran ouvert — `route` est un motif ("/convocations/:id"), jamais une URL résolue.
  | { name: 'screen_viewed'; props: { route: string } }
  // Réponse d'un joueur à une convocation, avec le préavis restant avant la
  // clôture des réponses (minutes, arrondi à l'entier).
  | { name: 'convocation_responded'; props: ConvocationProps & { status: 'present' | 'absent'; minutes_before_deadline: number; origin: ConvocationOrigin } }
  // Réponse refusée par une règle métier (DomainError) : signal produit, pas un bug.
  | { name: 'convocation_response_rejected'; props: ConvocationProps & { error_class: string; origin: ConvocationOrigin } }
  // Onglet ouvert dans le détail d'une convocation.
  | { name: 'convocation_tab_viewed'; props: ConvocationProps & { tab: ConvocationTab } }
  // Un membre s'assigne une mission d'une convocation (jamais la mission ni son libellé).
  | { name: 'mission_claimed'; props: ConvocationProps }
  // Un vote (joueur du match) est enregistré — jamais le candidat ni la catégorie.
  | { name: 'vote_cast'; props: ConvocationProps }
  // Bascule Semaine / Mois du Calendrier.
  | { name: 'calendar_range_selected'; props: { mode: 'week' | 'month' } }
  // Indisponibilité déclarée — préavis en jours, jamais le type ni le motif.
  | { name: 'unavailability_declared'; props: { notice_days: number } }
  // Filtre appliqué sur un écran. `active` = un filtre est posé (false = remis
  // sur « tout »). La valeur choisie n'est jamais envoyée.
  | { name: 'filter_applied'; props: { screen: FilterScreen; filter: FilterKind; active: boolean } }
  // Clic sur une alerte / un bandeau du tableau de bord.
  | { name: 'alert_clicked'; props: { alert: AlertKind } }
  // Ouverture du lien de paiement de la cotisation (jamais l'URL ni le montant).
  | { name: 'payment_link_opened'; props: Record<string, never> }
  // Clic sur un lien externe (menu, actus) — la cible est une valeur fermée, pas l'URL.
  | { name: 'external_link_opened'; props: { target: ExternalLinkTarget } }
  // Donnée créée par un utilisateur (trésorier, actus, convocation…) — le type
  // seulement, jamais le contenu ni le montant.
  | { name: 'record_created'; props: { kind: RecordKind } }
  // Perte de connexion détectée (le mode dégradé hors ligne n'existe pas
  // encore : ce signal mesure le besoin avant de le construire).
  | { name: 'app_went_offline'; props: Record<string, never> }

export type AnalyticsEventName = AnalyticsEvent['name']
