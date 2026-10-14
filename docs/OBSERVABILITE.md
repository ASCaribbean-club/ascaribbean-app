# Suivi de l'observabilité — AS Caribbean

> Objectif : savoir **en un coup d'œil** ce qui est tracé dans l'application, comment, ce qui est volontairement désactivé et pourquoi. Document vivant : toute modification de `analytics-events.ts` ou des réglages PostHog met ce fichier à jour dans le même commit.
>
> Décisions de fond : `adr/0001-observabilite-posthog.md`. Réglages par défaut non analysés : `DEFAULTS-A-CHALLENGER.md`.

## 1. En bref

| Question | Réponse |
|---|---|
| Outil | PostHog Cloud **EU** (un seul outil : erreurs + usage) |
| Projet PostHog | « Default project » (id 306111), organisation « AS Caribbean » — titulaire : président ; développeur : membre |
| Actif où ? | **Production uniquement** (build `vite build` avec `VITE_POSTHOG_KEY`). En dev : rien n'est envoyé, jamais |
| Suivi d'erreurs | Actif par défaut (intérêt légitime : garder le service en état) |
| Mesure d'usage | **Désactivée par défaut**, activée par `enableAnalytics()` (consentement : point OUVERT) |
| Dashboard | « AS Caribbean — usage » : <https://eu.posthog.com/project/306111/dashboard/1024112> |
| Code | `src/presentation/shared/observability/` — `posthog-js` n'est importé que par `posthog-adapter.ts` |

## 2. Ce qui est tracé — table de correspondance

Tout événement passe par `track()` et **doit** figurer dans le catalogue `analytics-events.ts` (une propriété non prévue ne compile pas). Nommage `objet_verbe`, snake_case. Aucune propriété ne porte de nom, d'e-mail, d'identifiant de convocation/équipe/joueur, de montant, d'URL, ni de motif d'indisponibilité.

| Événement | Quand | Propriétés | Déclenché depuis | Insight du dashboard |
|---|---|---|---|---|
| `screen_viewed` | Changement de route | `route` (motif : `/convocations/:id`) | `ObservabilityRoot.tsx` | Écrans consultés ; Écrans consultés par rôle |
| `convocation_responded` | Un joueur répond présent/absent | `status`, `minutes_before_deadline`, `origin` (`dashboard`, `convocation_detail`, `calendar`), `convocation_type`, `convocation_date` | `usePlayerDashboardViewModel`, `useConvocationDetailViewModel`, `useCalendarViewModel` | Réponses aux convocations ; Préavis moyen de réponse |
| `convocation_response_rejected` | Réponse refusée par une règle métier (`DomainError`) | `error_class`, `origin`, `convocation_type`, `convocation_date` | `usePlayerDashboardViewModel` (détail et calendrier : non instrumenté) | Réponses refusées par une règle métier |
| `convocation_tab_viewed` | Onglet ouvert dans le détail d'une convocation (changement d'onglet ; l'onglet initial n'est pas compté) | `tab` (`infos`, `composition`, `effectif`, `missions`, `votes`, `resultat`), `convocation_type`, `convocation_date` | `useConvocationDetailViewModel` | Onglets des convocations consultés |
| `mission_claimed` | Un membre s'assigne une mission (self-service) | `convocation_type`, `convocation_date` (jamais la mission) | `useConvocationMissionsViewModel` | Missions et votes |
| `vote_cast` | Un vote (joueur du match) est enregistré | `convocation_type`, `convocation_date` (jamais le candidat) | `useConvocationDetailViewModel` | Missions et votes |
| `calendar_range_selected` | Bascule Semaine / Mois | `mode` | `useCalendarViewModel` | Calendrier : vue semaine ou mois, par rôle |
| `unavailability_declared` | Nouvelle indisponibilité déclarée | `notice_days` (jamais le type ni le motif) | `useUnavailabilityFormViewModel` | Indisponibilités déclarées et préavis moyen |
| `filter_applied` | Un filtre est posé ou remis sur « tout » | `screen`, `filter`, `active` (jamais la valeur choisie) | `useOfficerTeamSelection` (classement, disponibilités), `useTeamStatsViewModel`, `useTeamAvailabilityViewModel`, `useDuesListViewModel`, `useTreasurerDashboardViewModel`, `useCoachDashboardViewModel`, `useNewsViewModel` | Filtres appliqués par écran |
| `alert_clicked` | Clic sur une alerte / un bandeau | `alert` : `missing_document`, `pending_vote`, `dues_reminder`, `coach_alerts` | `usePlayerDashboardViewModel`, `useCoachDashboardViewModel`, `useDuesReminderViewModel` | Clics sur les alertes |
| `payment_link_opened` | Ouverture du lien de paiement de la cotisation | aucune | `useProfileViewModel` | Liens externes et lien de paiement |
| `external_link_opened` | Clic sur un lien externe | `target` : `news_link`, `club_site`, `instagram`, `donation`, `federation`, `club_rules`, `support` (jamais l'URL) | `useMenuViewModel`, `useNewsViewModel` | Liens externes et lien de paiement |
| `record_created` | Donnée créée par un utilisateur | `kind` : `convocation`, `news`, `expense`, `expense_category`, `payment`, `checkpoint`, `opening_balance`, `reimbursement`, `dues_reminder` (jamais le contenu ni le montant) | ViewModels de création (convocation, actus, finances, cotisations) | Données créées |
| `app_went_offline` | Perte de connexion détectée | aucune | `install-global-error-handlers.ts` | Passages hors ligne |
| `$exception` | Erreur inattendue (voir §3) | classe d'erreur, stack, `source`, `action` — **jamais le message** | `ErrorBoundary`, handlers globaux, `onError` des mutations | Erreurs inattendues de la semaine |

Propriétés ajoutées automatiquement à chaque événement : `active_role` (rôle courant du tableau de bord : `player`, `coach`, `authorized-officer`, `treasurer`), `roles` (tous les rôles du compte, propriété de personne), `distinct_id` (UUID interne, uniquement après `enableAnalytics()`), `$current_url`/`$pathname` **réécrits en motif de route**, `$geoip_disable: true`, ainsi que des données techniques d'appareil (navigateur, taille d'écran).

## 3. Erreurs — trois points de capture, une classification

| Point de capture | Ce qu'il attrape | `source` |
|---|---|---|
| `ErrorBoundary` (racine de l'app) | Plantage pendant le rendu | `error_boundary` |
| `window.onerror` + `unhandledrejection` | Erreurs hors rendu, promesses non gérées | `window_error`, `unhandled_rejection` |
| `onError` d'une mutation (ViewModel) | Action utilisateur en échec — **uniquement `usePlayerDashboardViewModel` pour l'instant** | `mutation` |

Règle (`should-report-error.ts`, testée) : une `DomainError` n'est **pas** une erreur remontée (règle métier attendue) ; au plus un événement d'usage (`convocation_response_rejected`). Tout le reste (réseau, inconnu, bug) est remonté.

Avant envoi, `scrub-event.ts` ne garde que : classe d'erreur, stack trace, `source`, `action`, motif de route, `roles`. Le message d'erreur est supprimé.

## 4. Ce qui est désactivé, et pourquoi

| Fonctionnalité | État | Dans le code | Dans PostHog (vérifié) | Pourquoi |
|---|---|---|---|---|
| Enregistrement de sessions (replay) | Désactivé | `disable_session_recording: true` | `session_recording_opt_in: false` | Filme l'écran : noms de membres, effectifs |
| Autocapture (clics) | Désactivé | `autocapture: false` | `autocapture_opt_out: true` | Capture le texte des éléments cliqués (noms de membres) |
| Pages vues automatiques | Désactivé | `capture_pageview: false` | — | Enverrait l'URL résolue (`/convocations/<uuid>`) ; remplacé par `screen_viewed` en motif de route |
| Capture d'exceptions automatique | Désactivé | `capture_exceptions: false` | `autocapture_exceptions_opt_in: true` (inoffensif, SDK coupé) | Les erreurs passent par nos 3 points de capture, classées par `shouldReportError` |
| Heatmaps, clics morts, rage-clicks | Désactivé | `capture_heatmaps`, `capture_dead_clicks`, `rageclick: false` | `heatmaps_opt_in: false` | Même risque que l'autocapture |
| Logs console, performance réseau | Désactivé | — | `capture_console_log_opt_in`, `capture_performance_opt_in: false` | Peuvent contenir des données saisies |
| Web vitals | Désactivé | — | `autocapture_web_vitals_opt_in: false` | Hors besoin actuel |
| Sondages, feature flags | Désactivé | `disable_surveys: true`, `advanced_disable_feature_flags: true` | `surveys_opt_in: false` | Hors besoin ; évite des appels réseau inutiles |
| Géolocalisation par IP | Désactivée | `$geoip_disable: true` sur chaque événement | `anonymize_ips: true` | PostHog déduisait ville et code postal de l'IP (constaté lors du test) |
| Cookies | Aucun | `persistence: 'localStorage'` | — | Pas de bandeau cookies nécessaire pour le suivi |
| Mesure d'usage | Coupée jusqu'à `enableAnalytics()` | `before_send` | — | Consentement OPEN (voir `DEFAULTS-A-CHALLENGER.md`) |
| Source maps publiques | Interdites | `sourcemap: 'hidden'` + suppression | — | Voir §7 |

## 5. Données jamais envoyées

Nom, e-mail, téléphone, nom d'équipe ou de section choisi dans un filtre, identifiant de convocation/joueur/équipe, montants, URL résolues ou externes, **motif d'indisponibilité ("blessé"/"malade")** et type d'indisponibilité, messages d'erreur. Ce sont des données de santé (RGPD art. 9) ou potentiellement identifiantes.

## 6. Environnements

- **Production** : `VITE_POSTHOG_KEY` définie dans Netlify avec la portée **Production** uniquement (pas « Deploy previews » ni « Branch deploys »).
- **Développement** : aucun envoi. `createObservabilityContainer()` renvoie une implémentation muette si `import.meta.env.PROD` est faux ou si la clé est absente.
- **Pourquoi pas un projet PostHog « dev »** : le plan gratuit n'autorise qu'un projet (création refusée, constaté). Passer à un plan payant est une décision de facturation du président.
- Événements d'essai de la vérification initiale (14/10/2026) : suppression des 2 personnes de test et de leurs événements demandée à PostHog (traitement asynchrone, quelques heures à quelques jours). Un événement `$exception` anonyme (sans profil de personne) ne peut pas être supprimé par l'API : à supprimer à la main dans PostHog (Error tracking → issue → supprimer) s'il apparaît encore dans « Erreurs inattendues ». Avant la mise en production, vérifier que le dashboard est vide.

## 7. Source maps

`vite build` génère des `.map` « hidden » (aucune référence dans le bundle). `npm run build:release` (commande de build Netlify) les envoie à PostHog via `posthog-cli sourcemap process`, puis **supprime tous les `.map` de `dist/`**, même si l'envoi échoue.

- Déploiement constaté : **build Netlify directement depuis Git** (pas de `netlify.toml`, la CI GitHub ne déploie pas). La commande de build Netlify doit donc être `npm run build:release`.
- Secrets Netlify (build uniquement, **jamais** `VITE_`) : `POSTHOG_CLI_API_KEY` (clé API **personnelle**, périmètre « source maps »), `POSTHOG_CLI_PROJECT_ID` (306111), `POSTHOG_CLI_HOST` (`https://eu.posthog.com`).
- La clé projet `phc_…` est publique par conception (elle ne permet que d'envoyer des événements) ; la clé personnelle donne accès au projet : elle ne doit jamais entrer dans le bundle.
- Vérification manuelle (non exécutable depuis l'assistant : pas de clé personnelle) : après le premier déploiement, provoquer une erreur, ouvrir Error tracking dans PostHog et vérifier que la stack affiche `src/...` et non `index-xxxx.js`.

## 8. Dashboard « AS Caribbean — usage »

| Insight | Question |
|---|---|
| Réponses aux convocations (présent / absent) | 1 — les joueurs répondent-ils ? |
| Préavis moyen de réponse (minutes avant la clôture) | 1 — combien de temps avant la clôture ? |
| Réponses refusées par une règle métier | signal produit (réponses tardives) |
| Écrans consultés (les moins utilisés en bas) | 2 et **5** — quels écrans ne sont jamais ouverts ? |
| Écrans consultés par rôle | 2 — quel rôle utilise quoi |
| Calendrier : vue semaine ou mois, par rôle | 2 — les coachs utilisent-ils la vue mois ? |
| Passages hors ligne | 3 — besoin du mode dégradé |
| Erreurs inattendues de la semaine | 4 — erreurs de la semaine |
| Filtres appliqués par écran | usage des filtres |
| Clics sur les alertes | alertes réellement ouvertes |
| Données créées (trésorier, actus, convocations) | créations par type |
| Liens externes et lien de paiement | liens externes et paiement |
| Indisponibilités déclarées et préavis moyen (jours) | préavis des indisponibilités |
| Onglets des convocations consultés | `convocation_tab_viewed` par `tab` et `convocation_type` |
| Missions et votes | `mission_claimed`, `vote_cast` par `convocation_type` |

Limite connue : « mode dégradé hors ligne » n'existe pas encore dans l'application ; la question 3 mesure donc les **pertes de connexion**, pas l'usage du mode dégradé.

## 9. Ajouter un événement

1. Ajouter le membre dans `analytics-events.ts` (et toute nouvelle propriété dans `CATALOGUE_PROP_KEYS` de `scrub-event.ts` — le compilateur l'impose).
2. L'émettre depuis un ViewModel (`useObservability().track(...)`), jamais depuis un composant ni un use case.
3. Mettre à jour les tableaux §2 et §8 de ce document.
4. Se demander : cette propriété peut-elle identifier quelqu'un ou révéler une donnée de santé ? Si doute, ne pas l'envoyer.
