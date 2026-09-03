# Spec — Tableau de bord Joueur/Joueuse

> Statut : première rédaction (product-owner-agent, 2026-08-25), **révisée le même jour après ajout des maquettes** `docs/designs/player-dashboard/`. 7 points ouverts (PO-PD-01 à PO-PD-07). Aucun ne bloque la mise en page générale ; **PO-PD-02 et PO-PD-03 bloquent deux blocs précis des maquettes** (bloc « Mes stats » et variante « Absent »), PO-PD-01 et PO-PD-04 bloquent l'implémentation. Voir §5.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0/P1 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles), `docs/ARCHITECTURE.md` (§7 permissions, §11 journal d'audit, §13.4 nav basse), `docs/season-scoping-correction.md` (saison en cours), `specs/coach-dashboard.md` (patterns d'écran, PO-1/PO-2/PO-5, AC-CD-xx), `specs/create-convocation.md` (§2 modèle de données, §4 données sensibles, §6 libellé de bouton).
> Maquettes : `docs/designs/player-dashboard/v2_joueur_dashboard.png` (état par défaut) et `docs/designs/player-dashboard/v2_joueur_dashboard_absent.png` (variante après choix « Absent »).
> État du code lu pour cadrer : `domain/entities/{user,convocation,document}.ts`, `domain/policies/{rbac-matrix,can,actions,response-deadline,season-scope}.ts`, `domain/rules/convocation-rules.ts`, `domain/repositories/convocation-response-repository.ts`, `presentation/app/router.tsx`, `presentation/features/coach-dashboard/useCoachDashboardViewModel.ts`, `supabase/migrations/20260811171754_initial_schema.sql` (RLS `convocation_responses`, `attendance_records`, `documents`, `teams`).

**Statut des maquettes** : les deux exports v2 sont lisibles et ont servi de base à cette révision. Comme pour le tableau de bord coach, ils ne sont **pas une source de vérité fonctionnelle** — ils contiennent plusieurs blocs sans fondement dans le CDC, relevant du P1, ou contredisant l'état actuel des politiques RLS (voir §1 « Écarts maquette / CDC »). Le CDC et la matrice RBAC priment ; les maquettes informent la mise en page et confirment ce qui est réellement attendu.

## 1. Périmètre

Écran d'accueil de l'utilisateur portant le rôle **Joueur/Joueuse**, après authentification. Comme le tableau de bord coach, c'est une **surface d'agrégation et de navigation** au-dessus de modules P0 existants — à une différence près : il porte **une vraie action métier**, la réponse à une convocation, qui n'a aujourd'hui aucun autre point d'entrée dans l'application.

### Modules CDC concernés

| Module CDC | Priorité | Ce que le tableau de bord en expose |
|---|---|---|
| Authentification et profils | P0 | Identité de l'utilisateur connecté, rôle actif, équipe de rattachement |
| Calendrier et convocations | P0 | Prochaine échéance de son équipe + liste « À venir ». « Joueur/Joueuse (consultation) » dans la priorisation |
| Présences et suivi sportif | P0 | **Uniquement la réponse déclarée** (`ConvocationResponse`). Ni assiduité constatée, ni évaluation, ni progression, ni indisponibilité santé — voir « Écarts » et PO-PD-02 |
| Documents et consentements | P0 | **Alerte de pièce manquante uniquement** (`Document.status = 'missing'`), pas la gestion des pièces elle-même — voir PO-PD-06 |

### Contenu retenu — issu des maquettes et fondé dans le CDC

1. **En-tête** : pastille du rôle actif (« Joueur »), salutation avec le prénom, initiales/avatar avec pastille de notification. Pastille de contexte d'équipe accolée (« SM Groupe A » dans les maquettes).
   - **Pastille de rôle** : porte un chevron dans les maquettes. Même traitement que côté coach — cliquable visuellement, **no-op en v1**, `// TODO(PO-2)` au point d'accroche (décision `specs/coach-dashboard.md` PO-2, reprise telle quelle, pas rouverte ici).
   - **Pastille d'équipe** : purement informative, **jamais un sélecteur** — `RoleAssignment` modélise le joueur avec un `teamId` **unique** (`domain/entities/user.ts`, hypothèse « one team per player » explicitement commentée dans le code). Rien à sélectionner tant que cette hypothèse tient. À distinguer du sélecteur d'équipe du coach (AC-CD-14), qui est un no-op *en attendant* une bascule ; ici il n'y a pas de bascule à attendre.
   - Comportement de la pastille de notification de l'avatar : hors périmètre de cette feature (même traitement que côté coach).
2. **Bandeau d'alerte « Document manquant »** : rendu **seulement** si l'utilisateur a au moins un `Document` de statut `missing` (ou `rejected`). Fondé : module Documents et consentements (P0), permission « Voir son propre profil/dossier ✅ », RLS `documents_select_own` déjà en place, `DocumentStatus` déjà modélisé. Ce qui déclenche l'alerte et la liste des pièces réellement exigées restent à définir — **PO-PD-06**. Le bandeau **renvoie** vers l'écran de ses documents ; il n'implémente aucun dépôt ni validation de pièce (aucune politique d'écriture n'existe, volontairement laissée OPEN en base).
3. **Carte « Prochaine convocation »** : la convocation ouverte la plus proche de son équipe, quel que soit son type — type, intitulé, date/heure, lieu ; pour un match, adversaire, domicile/extérieur, heure et lieu de RDV (`match_details`, `specs/create-convocation.md` §2) ; pour une réunion, titre et ordre du jour (`meeting_details`).
   - **Son propre statut de réponse** y est lisible : présent / absent / en attente.
4. **Action « Présent » / « Absent »**, dans cette carte :
   - Bornée par l'échéance de réponse dérivée du type (`domain/policies/response-deadline.ts` — `canPlayerRespond`). Passé cette échéance, l'action n'est plus rendue (absence, pas grisé — règle du moindre privilège, §2).
   - Une réponse est un **upsert** sur `(convocation_id, user_id)`, dernière valeur gagne (`CLAUDE.md` §6, contrainte d'unicité déjà en base) — jamais un ajout de ligne. Un joueur peut donc changer d'avis tant que l'échéance n'est pas passée.
   - **Le champ « Raison de l'absence » de la variante `_absent` n'est pas rendu en v1** : la colonne `convocation_responses.reason` existe et reste `null`. Décision de périmètre motivée en §3 — c'est le point le plus important de cette révision (**PO-PD-03**).
   - **Point à trancher en conception** : le choix « Présent » est un commit en un tap, alors que la variante `_absent` en fait un parcours en deux temps (choix, puis validation). Quelle que soit la forme retenue, la sémantique reste un upsert unique — la réponse ne doit pas être persistée deux fois, ni rester en suspens sans que l'écran le montre.
5. **Liste « À venir »** : échéances suivantes de son équipe (liseré coloré par type, intitulé, date/heure, lieu), lien « Voir tout » vers le Calendrier (écran aujourd'hui stub — même limite que côté coach).
6. **Navigation basse à 4 entrées** : Dashboard · Calendrier · Actus · Menu — nav fixe de l'`AppShell` partagé (`ARCHITECTURE.md` §13.4), rien de spécifique à cette feature. L'onglet Actus reste le stub établi par AC-CD-05d (Communication est P1).

### Écarts maquette / CDC

Même grille de lecture que `specs/coach-dashboard.md` §1. Un bloc présent dans une maquette n'est pas pour autant fondé.

| Bloc des maquettes | Problème | Renvoi | Statut v1 |
|---|---|---|---|
| **« 320 pts · Argent »** (sous la salutation) | Module **ASC Legacy = P1**, et sa grille (barèmes, seuils, badges) est explicitement « à valider par le Bureau **avant développement** » (CDC §8, point ouvert des deux documents de cadrage) | — | **Retiré de la v1.** Contrairement aux blocs statiques tolérés côté coach (PO-1), il ne s'agit pas ici d'un indicateur sans module : le CDC interdit explicitement de développer avant validation de la grille. Ne pas afficher de valeur, même hardcodée |
| **« DERNIER MATCH » (score, pastille V, « Titulaire · 78' »)** | Aucun module « résultats et compétitions » n'existe dans la priorisation P0/P1 — même constat que pour « Forme récente » côté coach. « Titulaire · 78' » va plus loin : c'est une donnée de **suivi sportif individuel** (temps de jeu) qu'aucune entité ne porte et qu'aucune permission ne décrit | PO-PD-07 | Ouvert |
| **« MES STATS » (Matchs, Buts, Présence 92 %, « Voir le détail »)** | Deux problèmes distincts : Matchs/Buts relèvent du même module de résultats inexistant, et **« Présence 92 % » suppose l'accès du joueur à ses `AttendanceRecord`** — que la RLS actuelle lui refuse explicitement. Par ailleurs « Statistiques et exports » est **P1** | PO-PD-02, PO-PD-07 | Ouvert — **la maquette contredit la RLS en vigueur**, ce n'est pas un simple choix d'affichage |
| **« 12/14 convoqués » / « 8/10 participants »** sur les lignes « À venir » | Ce sont des **agrégats de réponses de l'équipe**. La RLS les autorise déjà techniquement (lecture bornée à l'équipe), mais la matrice pose « Voir les dossiers des autres membres ❌ » pour le joueur, et rien dans le CDC ne fonde ce besoin côté joueur (c'est un indicateur de pilotage coach) | PO-PD-05 | Ouvert — non rendu en v1 par défaut |
| **Champ « Raison de l'absence, pour le coach… » + bouton « Envoyer au coach »** (variante `_absent`) | Texte libre pouvant recueillir un motif médical, sur une colonne lisible par **toute l'équipe** (pas seulement le coach, contrairement à ce que suggère le libellé). Voir §3 | PO-PD-03 | **Non rendu en v1** — bloqué tant que le référent RGPD n'a pas tranché |
| **Libellé « Envoyer au coach »** | Suggère un envoi (courriel/notification) ; aucun envoi n'a lieu — c'est un upsert en base, et le module **Communication est P1**. Même problème que « Envoyer à N joueurs » résolu en « Créer la convocation » (`specs/create-convocation.md` §6) | — | Libellé neutre à retenir si le bloc revient un jour (PO-PD-03) |
| **Menu « ⋮ » en bout de chaque ligne « À venir »** | Aucune action n'est définie pour ce menu, et le joueur n'a aucune permission d'écriture sur une convocation | — | **Non rendu en v1** (absence, pas grisé). Le tap sur la ligne renvoie au détail de l'échéance, c'est la seule interaction |
| **Prénom affiché dans les maquettes** | `CLAUDE.md` §9 : aucun nom de personne réelle dans le code, les tests, les commentaires ou la documentation | — | Le prénom vient de `user.fullName` à l'exécution ; ne recopier aucun nom des maquettes dans une fixture ou un exemple |

### Hors périmètre — explicitement

- **Historique de présence / assiduité constatée** (`AttendanceRecord`) : voir PO-PD-02 et l'écart « MES STATS » ci-dessus.
- **Évaluations sportives, progression, observations** : la matrice donne la saisie au coach ; la *restitution au joueur* n'est décrite nulle part (ni matrice, ni module). Non inventée ici.
- **Toute donnée de santé, d'aptitude ou de diagnostic** — voir §3.
- **Statut de cotisation.** La matrice l'accorde au joueur pour lui-même (✅ soi-même), mais le module Cotisations est **P1** et aucune table correspondante n'existe. Rien n'est rendu en v1 ; ce n'est pas un refus de permission, c'est un module non construit. Absent des maquettes, cohérent.
- **Gestion des documents** (dépôt, remplacement, consultation d'une pièce) : seul le **bandeau d'alerte** est dans le périmètre (point 2). Aucune politique d'écriture n'existe sur `documents`, volontairement laissée OPEN en base.
- **Annonces / actualités internes** : module Communication, **P1**. L'onglet Actus reste un stub (AC-CD-05d) ; aucun bloc d'annonces sur le tableau de bord, ce que les maquettes confirment.
- **Création ou modification d'une convocation** : ❌ pour le joueur dans la matrice. Aucun bouton `+` — les maquettes n'en montrent aucun, cohérent.
- **Mode dégradé offline** : la matrice accorde la consultation en mode dégradé à tous les rôles, mais aucun mode dégradé n'est implémenté à ce jour (décision `specs/coach-dashboard.md` PO-5 ; stratégie de cache toujours ouverte, `ARCHITECTURE.md` §14). Non implémenté ici non plus — à traiter avec le module Calendrier.
- **Le détail d'une échéance, le Calendrier et l'écran Documents eux-mêmes** : le tableau de bord y **renvoie**, il ne les implémente pas.

### Périmètre de données — la règle centrale

Toute donnée affichée est bornée à **l'équipe où l'utilisateur est affecté comme Joueur/Joueuse pour la saison en cours** (AC-01/AC-02 du CDC §17.2 ; `docs/season-scoping-correction.md`), et à **ses propres** lignes pour tout ce qui est nominatif (`ConvocationResponse`, `Document`). La RLS `teams_select_team_scoped` applique déjà le filtre `season_id = (select id from public.current_season())` pour un membre d'équipe.

« Absence de saison en cours » (`current_season()` sans ligne) est un **état valide** : aucune équipe, aucune échéance, état vide explicite — jamais une erreur.

## 2. RBAC

### Rôle titulaire de l'écran

**Joueur/Joueuse.** Permissions lues directement dans la matrice, et leur traduction sur cet écran :

| Permission (matrice RBAC) | Valeur pour Joueur/Joueuse | Conséquence sur le tableau de bord |
|---|---|---|
| Voir son propre profil/dossier | ✅ | En-tête (identité, rôle actif, équipe) et bandeau d'alerte de pièce manquante — les deux portent sur **ses propres** données |
| Voir les dossiers des autres membres | ❌ | Aucune donnée nominative d'un coéquipier n'est rendue. Les agrégats de réponses de l'équipe des maquettes sont eux-mêmes écartés en v1 (PO-PD-05) |
| Créer/modifier une convocation | ❌ | Aucun bouton `+`, aucun menu d'action sur une échéance (AC-CD-07, même règle) |
| Consulter une convocation en mode dégradé | ✅ | Sans objet en v1 : pas de mode dégradé implémenté (§1, cohérent avec PO-5 coach) |
| Saisir une évaluation sportive | ❌ | — |
| Consulter une donnée de santé (hors diagnostic) | ✅ (soi-même) | **Non exploitée ici** : aucune donnée de santé n'est rendue ni saisissable sur cet écran (§3). La permission reste acquise pour un futur écran dédié, tracé |
| Voir le statut de cotisation | ✅ (soi-même) | **Non exploitée en v1** : module Cotisations P1, non construit (§1) |
| Gérer échéanciers et relances | ❌ | — |
| Gérer postes/missions bénévoles | ❌ | — |
| Envoyer une communication ciblée | ❌ | Le bouton « Envoyer au coach » de la variante `_absent` **n'est pas un envoi** et ne s'appuie pas sur cette permission (§1, écarts) |
| Exporter des données | ❌ | Aucun export, aucune fonction de copie |
| Gérer comptes, rôles, paramétrage | ❌ | — |
| Consulter le journal d'audit | ❌ | — |

**Action métier de l'écran** : `'convocation:respond'`, déjà présente dans `domain/policies/rbac-matrix.ts` (`['player']`) et bornée dans `can.ts` par `assignment.teamId === context.teamId`. **Aucune nouvelle entrée de matrice, aucune nouvelle action n'est créée par cette feature.** La lecture de ses propres documents et convocations reste RLS-only, sans entrée de matrice, conformément au critère commenté en tête de `rbac-matrix.ts` (une entrée ne se justifie que si `presentation/` doit décider d'afficher ou masquer quelque chose avant la requête).

**Règle d'affichage** (moindre privilège, CDC §3 ; `ARCHITECTURE.md` §7) : une action non autorisée donne lieu à une **carte absente**, pas à une carte grisée ni à une erreur au clic. Seule exception admise, déjà posée par `specs/create-convocation.md` : un contrôle de formulaire désactivé pour cause de saisie incomplète.

### Autres rôles face à cet écran

Les comptes multi-rôles sont la norme (CDC §3). Cet écran n'est donc pas « l'écran d'un utilisateur » mais **« la vue Joueur d'un utilisateur »** — ce que la pastille de rôle des maquettes rend explicite.

| Rôle | Interaction avec cet écran |
|---|---|
| Coach/Staff | Aucun accès à cette vue en tant que coach. Un compte cumulant Joueur + Coach a droit aux deux vues ; la bascule passe par la pastille de rôle, **non fonctionnelle en v1** (PO-2) — d'où PO-PD-01 |
| Responsable de section, Dirigeant habilité, Trésorier, Bénévole | Aucun accès. Leur périmètre est distinct et hors de cette spec |
| Référent médical | Aucun accès. Son périmètre santé est un écran distinct et tracé |
| Administrateur | ✅ sur les permissions sous-jacentes, mais l'accès à une vue Joueur passe par l'administration, jamais par une auto-affectation à une équipe |

### Application technique

Chaque restriction existe **en RLS Postgres (autorité)** et en miroir dans `rbac-matrix.ts` / `can.ts` (ergonomie), conformément à `ARCHITECTURE.md` §7. Les politiques nécessaires existent déjà : `convocations_select_team_scoped`, `convocation_responses_select_team_scoped`, `convocation_responses_insert_respond` et `convocation_responses_update_respond` (les deux dernières scopées à `user_id = auth.uid()` + `private.is_player_of_team(c.team_id)`), `documents_select_own`. **Deux écarts sont toutefois identifiés côté base — voir PO-PD-04.**

## 3. Données sensibles

### Données de santé — aucune rendue, et un vecteur d'entrée que les maquettes rouvrent

Aucun indicateur de santé, d'aptitude ou de diagnostic n'est affiché sur cet écran (même position que `specs/coach-dashboard.md` §3, AC-CD-09).

La variante `v2_joueur_dashboard_absent.png` introduit en revanche un **champ texte libre « Raison de l'absence, pour le coach… »**, qui alimenterait `ConvocationResponse.reason`. Deux problèmes distincts, aucun des deux tranché :

**(a) Nature de la donnée.** Rien n'empêche un membre d'y écrire un motif médical (« blessure », « certificat », « rendez-vous à l'hôpital »). La colonne deviendrait de fait un réceptacle de donnée de santé déclarée, sans les garanties d'accès restreint et de traçabilité exigées par le CDC §6.3 et §11.3. Le CDC réserve explicitement au **référent RGPD** la décision sur les « données santé réellement nécessaires » (§22, décision n°5) — et ce référent n'est **pas encore désigné** (`docs/GOUVERNANCE.md` §7).

**(b) Destinataires réels ≠ destinataires suggérés.** Le libellé dit « pour le coach ». La politique en vigueur, `convocation_responses_select_team_scoped`, autorise la lecture à `private.is_team_member(...)` — c'est-à-dire **tous les joueurs et coachs de l'équipe**. Un motif d'absence saisi aujourd'hui serait lisible par les coéquipiers, ce que le libellé de la maquette laisse croire impossible. Un écart de ce type entre la promesse faite à l'utilisateur et la réalité de la politique d'accès est exactement ce que le CDC cherche à éviter.

**Décision de périmètre pour cette passe** : le champ motif **n'est pas rendu** ; la colonne existe en base et reste `null`. Ce n'est pas une résolution de la question de fond — c'est le seul choix qui n'engage rien avant arbitrage, et il est réversible à moindre coût. **PO-PD-03**, arbitrage attendu du référent RGPD.

### Données financières — aucune

Aucune donnée de cotisation, de montant ou de relance (§1). Module P1 non construit, absent des maquettes.

### Données personnelles de tiers — aucune

Aucun nom ni statut de réponse d'un coéquipier. Les agrégats non nominatifs des maquettes (« 12/14 convoqués ») sont eux-mêmes écartés en v1 — PO-PD-05.

### Données de son propre dossier — le bandeau d'alerte

Le bandeau « Document manquant » expose un **statut de pièce** de l'utilisateur lui-même. Donnée personnelle ordinaire, couverte par « Voir son propre profil/dossier ✅ » et par `documents_select_own`. Ne pas y faire figurer la **nature** d'une pièce si celle-ci peut être médicale (certificat d'aptitude) sans arbitrage préalable — le libellé reste générique tant que PO-PD-06 n'est pas tranché.

### Export nominatif — aucun

Permission absente pour le joueur. Aucun export depuis cet écran.

### Actions métier journalisées — aucune

Répondre à une convocation ne figure pas dans la liste des actions sensibles du CDC §11.3 (création/suppression de compte, changement de rôle, consultation de donnée santé, modification de paiement, correction de points Legacy, export nominatif). **Aucune journalisation d'audit n'est requise pour cette action.** La responsabilité de la réponse est déjà portée par la donnée métier elle-même (`user_id` + `responded_at`), au même titre que `created_by` / `closed_by` sur `Convocation` (`specs/create-convocation.md` §4).

⚠️ Si PO-PD-03 était tranché en faveur du champ motif, cette conclusion serait **à rouvrir** : un motif d'absence qualifié de donnée de santé ferait de sa consultation une action à tracer (CDC §11.3, trigger Postgres — `ARCHITECTURE.md` §11), pas un simple champ de plus.

L'absence totale d'une table de journal d'audit dans `supabase/migrations/` reste une **exigence transversale P0 non résolue**, distincte de cette feature — déjà signalée par `specs/create-convocation.md` §7, rappelée ici sans être traitée.

## 4. Critères d'acceptation

**AC-01** et **AC-02** sont ceux de la section 17.2 du CDC et s'appliquent tels quels. Les critères propres à cet écran sont préfixés `AC-PD-`, même convention que `AC-CD-` (coach) et `AC-CV-` (convocation), faute d'accès au numérotage complet de la section 17.2 (CDC disponible ici en PDF non extractible) ; à renuméroter dans la série officielle lors de la recette.

| Réf. | Critère |
|---|---|
| **AC-01** | Un joueur ne voit que son propre dossier — aucune donnée d'un membre extérieur à son équipe n'est accessible, ni à l'écran ni dans la réponse API |
| **AC-02** | Un joueur affecté à l'équipe A ne voit aucune échéance, aucune convocation et aucune réponse de l'équipe B. Vérifié par appel direct à l'API avec un jeton joueur, hors application |
| AC-PD-01 | Seule l'équipe de la **saison en cours** où l'utilisateur est affecté comme Joueur/Joueuse alimente l'écran ; une affectation de saison antérieure n'y figure pas. Sans saison en cours (`current_season()` vide), l'écran rend un état vide explicite, pas une erreur |
| AC-PD-02 | Un joueur sans échéance à venir obtient un état vide explicite — jamais une erreur ni un chargement infini |
| AC-PD-03 | Le statut affiché pour chaque échéance est **sa propre `ConvocationResponse`** (intention déclarée), jamais un `AttendanceRecord` (présence constatée) : une présence saisie a posteriori par le coach ne modifie pas le statut affiché sur cet écran |
| AC-PD-04 | Répondre deux fois à la même échéance ne crée pas deux lignes : `convocation_responses` conserve **une seule ligne** par `(convocation_id, user_id)`, la dernière valeur gagne. Vaut aussi pour un parcours « Absent » en deux temps : un seul enregistrement final, pas un état intermédiaire persisté |
| AC-PD-05 | Une tentative de réponse sur une convocation d'une autre équipe, ou au nom d'un autre utilisateur, est refusée **par la base**, pas seulement par l'interface (jeton joueur, appel direct à l'API) |
| AC-PD-06 | Passé l'échéance de réponse propre au type (`canPlayerRespond`), l'action de réponse n'est plus rendue à l'écran — absence, pas désactivation |
| AC-PD-07 | Aucune donnée financière (statut de cotisation, montant, relance) n'apparaît à l'écran ni dans les réponses API qui l'alimentent, pour un jeton joueur |
| AC-PD-08 | Aucune information de santé, d'aptitude ou de diagnostic n'apparaît à l'écran ; **aucun champ de saisie libre susceptible d'en recueillir une n'est rendu** — le champ « Raison de l'absence » des maquettes est absent et `convocation_responses.reason` reste `null` pour toute réponse créée par cet écran (§3, PO-PD-03) |
| AC-PD-09 | Aucune donnée nominative d'un coéquipier (nom, statut de réponse individuel) n'est rendue. En v1, **aucun agrégat de réponses de l'équipe** non plus — les compteurs « N/M convoqués » des maquettes ne sont pas rendus tant que PO-PD-05 n'est pas tranché |
| AC-PD-10 | Aucune carte ni bouton correspondant à une action non autorisée (création ou modification de convocation, export, gestion de comptes, saisie d'évaluation) n'est rendu — absence, pas désactivation. Inclut le menu « ⋮ » des lignes « À venir » |
| AC-PD-11 | Aucun historique de présence (`AttendanceRecord`) n'est rendu ni requêté pour un jeton joueur, tant que PO-PD-02 n'est pas tranché — inclut le taux « Présence 92 % » du bloc « Mes stats » |
| AC-PD-12 | Aucun indicateur ASC Legacy (points, palier, badge) n'est rendu, même avec une valeur statique — la grille est « à valider par le Bureau avant développement » (CDC §8) |
| AC-PD-13 | Le bandeau d'alerte n'est rendu que si l'utilisateur a effectivement au moins une pièce en statut `missing` (ou `rejected`) ; il est **absent** sinon, et ne porte aucune mention de la nature d'une pièce potentiellement médicale (PO-PD-06) |
| AC-PD-14 | Chaque bloc renvoie vers l'écran du module correspondant (« Voir tout » → Calendrier, échéance → détail, alerte → ses documents) ; le tableau de bord ne duplique aucune saisie autre que la réponse à une convocation |
| AC-PD-15 | Affichage complet en moins de 3 secondes sur mobile en réseau normal (CDC §12) |
| AC-PD-16 | Contrastes conformes AA — à vérifier spécifiquement sur le thème sombre des maquettes (textes gris sur fond noir, bandeau d'alerte rouge, vert des liens) — et navigation clavier opérationnelle (CDC §12) |
| AC-PD-17 | L'information portée par la couleur (statut présent/absent/en attente, liseré de type d'échéance, bandeau d'alerte) est doublée d'un libellé textuel |
| AC-PD-18 | Le clic sur la pastille de rôle en en-tête ne produit aucun effet visible en v1 ; `// TODO(PO-2)` au point d'accroche — cohérent avec AC-CD-13. La pastille d'équipe est purement informative et n'est pas cliquable |

## 5. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-PD-01** | **Comment un compte atteint-il sa vue Joueur ?** `presentation/app/router.tsx` rend aujourd'hui `CoachDashboardPage` sur la route index, sans branchement par rôle (commentaire explicite : « Not role-branched here (PO-2 role switching is a no-op in v1) »). Introduire un second tableau de bord force la question laissée ouverte par PO-2 de `specs/coach-dashboard.md` : branchement par rôle sur la route index, tableau de bord composé, ou bascule réellement câblée sur la pastille de rôle ? Le cas du compte cumulant Joueur + Coach doit être tranché explicitement, pas subi | Développeuse (+ Bureau pour le modèle cible) | **Bloque l'implémentation**, pas la conception : le contenu de l'écran ne dépend pas de la réponse |
| **PO-PD-02** | **Le joueur peut-il consulter sa propre assiduité constatée (`AttendanceRecord`) ?** La RLS le lui refuse aujourd'hui et le commente comme « closed/undecided ». Le module « Présences et suivi sportif » (P0) liste pourtant Joueur/Joueuse parmi ses rôles concernés, et **les maquettes affichent un taux « Présence 92 % » avec un lien « Voir le détail »** — donc le besoin est réel côté club. Ouvrir cette lecture suppose une nouvelle politique RLS et, éventuellement, une entrée de matrice | Bureau (+ développeuse pour la RLS) | **Bloque le bloc « Mes stats »** des maquettes ; ne bloque pas le reste de l'écran (AC-PD-11) |
| **PO-PD-03** | **Le motif d'absence saisi par le joueur (`ConvocationResponse.reason`) est-il une donnée de santé ?** Champ texte libre présent dans la maquette `_absent`. Deux sous-questions : (a) sa nature (donnée de santé ⇒ accès restreint + traçabilité §11.3, et §3 de cette spec à rouvrir) ; (b) sa visibilité réelle — `convocation_responses_select_team_scoped` le rend lisible par **toute l'équipe**, alors que le libellé promet « pour le coach ». Si le champ est retenu, faut-il restreindre la lecture de cette colonne, la tracer, ou proposer des motifs fermés sans catégorie médicale ? Rejoint la décision n°5 du CDC (§22) | **Référent RGPD** — à désigner (`docs/GOUVERNANCE.md` §7) | **Bloque la variante « Absent » des maquettes.** Le reste de l'action de réponse (présent/absent sans motif) est implémentable sans attendre |
| **PO-PD-04** | **Deux écarts côté base sur la réponse à une convocation** : (a) l'échéance de réponse (`domain/policies/response-deadline.ts`) n'a **aucun miroir SQL** — un joueur peut aujourd'hui répondre après l'échéance par appel direct à l'API, l'interface étant le seul garde-fou (contraire à `ARCHITECTURE.md` §7) ; (b) les politiques `convocation_responses_insert/update_respond` ne vérifient pas le **statut** de la convocation — une réponse reste possible sur une convocation `closed` ou `cancelled`. S'y ajoute un point déjà marqué OPEN dans le code : le délai `meeting: 60` de `RESPONSE_DEADLINE_MINUTES` est une valeur provisoire non confirmée | Développeuse (délais : Bureau) | **Bloque l'implémentation** de l'action de réponse — l'écran serait le seul à faire respecter une règle métier |
| **PO-PD-05** | **Le joueur voit-il combien de coéquipiers ont répondu ?** Les maquettes l'affichent (« 12/14 convoqués », « 8/10 participants »). La RLS le permet déjà, mais la matrice pose « Voir les dossiers des autres membres ❌ » et le CDC ne fonde pas ce besoin côté joueur. Si retenu : agrégat seul, ou liste nominative ? Les deux n'ont pas les mêmes implications RGPD. À noter aussi : le dénominateur (« convoqués ») dépend de la source de vérité des convoqués requis, toujours ouverte (`specs/coach-dashboard.md` PO-6b, `specs/create-convocation.md` §2) | Bureau | Non — non rendu en v1 (AC-PD-09) |
| **PO-PD-06** | **Qu'est-ce qui déclenche l'alerte « Document manquant » ?** `Document` porte un `type` en texte libre et un `status`, mais **aucune liste de pièces exigées** n'existe (par saison ? par catégorie ? par section ?), aucun repository, et aucune politique d'écriture (dépôt/validation laissés OPEN en base). Question annexe mais non neutre : si une pièce exigée est un certificat médical, le libellé de l'alerte ne doit pas révéler de nature médicale (§3) | Bureau (+ Dirigeant habilité, titulaire du module Adhérents et licences) | Non pour la mise en page — le bandeau se conçoit indépendamment de la règle qui l'allume |
| **PO-PD-07** | **Blocs « Dernier match » et « Mes stats » (Matchs, Buts, temps de jeu)** : aucun module « résultats et compétitions » n'existe dans la priorisation P0/P1, et « Statistiques et exports » est P1. Même nature que PO-1 côté coach, tranché là-bas en faveur de valeurs statiques hardcodées avec `// TODO(PO-1)`. Faut-il appliquer ici le même traitement, ou retirer ces blocs des maquettes ? Le sous-cas « Titulaire · 78' » (temps de jeu individuel) va plus loin que le coach : aucune entité ne le porte et aucune permission ne le décrit | Bureau + développeuse | Non — mais la réponse change la moitié basse de l'écran, donc à trancher **avant** que designer-agent fige la mise en page |

## 6. Note pour designer-agent

- **Maquettes de référence** : `docs/designs/player-dashboard/v2_joueur_dashboard.png` et `v2_joueur_dashboard_absent.png`. Elles couvrent la mise en page complète ; les patterns visuels (en-tête à pastilles + avatar, carte d'échéance, ligne de liste à liseré coloré, cartes jumelles, nav basse à 4 entrées) sont ceux déjà établis par `docs/designs/v4_coach_dashboard.png` et `specs/coach-dashboard.md` — les réappliquer plutôt qu'en inventer.
- **Corrections à apporter aux maquettes** (constats de cadrage, pas des choix à refaire) :
  1. Retirer « 320 pts · Argent » (ASC Legacy P1, grille non validée — AC-PD-12).
  2. Retirer le champ « Raison de l'absence » et le bouton « Envoyer au coach » de la variante `_absent` (PO-PD-03, AC-PD-08). La variante se réduit alors à l'état sélectionné du bouton « Absent ».
  3. Retirer les compteurs « 12/14 convoqués » / « 8/10 participants » des lignes « À venir » (PO-PD-05, AC-PD-09).
  4. Retirer le menu « ⋮ » en bout de ligne (aucune action définie, aucune permission d'écriture — AC-PD-10).
  5. Le taux « Présence 92 % » du bloc « Mes stats » est suspendu à PO-PD-02 ; les blocs « Dernier match » et « Mes stats » dans leur ensemble à PO-PD-07. **Ne pas figer cette moitié d'écran avant arbitrage.**
- **Différences structurelles assumées par rapport au tableau de bord coach** : pas de bouton flottant `+`, pas de sélecteur d'équipe fonctionnel (pastille d'équipe informative), pas de barre de répartition des réponses. En contrepartie : un bandeau d'alerte conditionnel, un statut de réponse personnel, et l'action présent/absent — seul contrôle réellement interactif de l'écran.
- **États à couvrir explicitement** : pas d'équipe / pas de saison en cours (AC-PD-01), aucune échéance à venir (AC-PD-02), aucune pièce manquante (bandeau absent, AC-PD-13), échéance de réponse dépassée (action absente, AC-PD-06), réponse déjà donnée et modifiable tant que l'échéance n'est pas passée (AC-PD-04).
- **Parcours « Absent »** : une fois le champ de motif retiré, trancher si « Absent » est un commit en un tap comme « Présent », ou conserve une confirmation. Contrainte de spec : un seul upsert, pas d'état intermédiaire persisté (AC-PD-04).
- Rappel `CLAUDE.md` §9 : le prénom des maquettes ne doit apparaître nulle part dans le code, les tests ou la documentation.

**Prêt pour transmission à designer-agent : oui, avec une réserve.** La moitié haute de l'écran (en-tête, alerte, carte de convocation, liste « À venir ») est entièrement cadrée. La moitié basse (« Dernier match » / « Mes stats ») dépend de PO-PD-02 et PO-PD-07, qui ne sont pas des questions d'interface : les trancher avant de figer la mise en page évite un aller-retour. PO-PD-01 et PO-PD-04 restent bloquants pour l'implémentation, pas pour la conception.

## UI design

**Sources utilisées, par ordre de priorité effectif** : `docs/designs/player-dashboard/v2_joueur_dashboard.png` et `v2_joueur_dashboard_absent.png` (maquettes de référence pour cet écran), `docs/designs/v4_coach_dashboard.png` (vocabulaire visuel déjà établi et normatif pour ce projet — en-tête à pastilles, carte d'échéance, ligne de liste à liseré coloré, nav basse), et le présent spec (§1 Périmètre, §2 RBAC, §5 Points ouverts, §6 corrections). Aucun fichier `wireframes-basiques-as-caribbean.md` n'existe dans ce dépôt — comme déjà noté par `specs/coach-dashboard.md` §UI design, les deux maquettes existantes en tiennent lieu.

Les cinq corrections de §6 sont reprises ci-dessous comme des faits acquis, pas comme des choix à rouvrir.

### Emplacement dans la nav

Écran **Dashboard**, premier des 4 onglets fixes (Dashboard · Calendrier · Actus · Menu), état par défaut à l'ouverture pour un compte dont le rôle actif est Joueur/Joueuse. Aucun nouvel onglet. La nav basse appartient à l'`AppShell` partagé (`ARCHITECTURE.md` §13.4) — rien à concevoir ici pour la nav elle-même, seulement son état actif (« Dashboard » surligné, même traitement que côté coach).

Pour un compte cumulant Joueur + Coach, cet écran et `CoachDashboardPage` sont deux rendus distincts du même onglet Dashboard, sélectionnés par le rôle actif — le mécanisme de sélection est PO-PD-01, hors conception (§5).

### Structure de l'écran, de haut en bas

1. **En-tête** — reprend tel quel le pattern de `docs/designs/v4_coach_dashboard.png` §UI design point 1, avec les adaptations déjà actées en §1/§2 de cette spec :
   - Pastille de rôle (« Joueur ») : même traitement no-op que côté coach, `// TODO(PO-2)` (AC-PD-18).
   - Pastille d'équipe (« SM Groupe A ») : visuellement identique à la pastille de rôle, mais **sans chevron cliquable actif ni sémantique de sélecteur** — c'est un badge informatif, pas une variation du sélecteur d'équipe du coach. Ne pas lui donner l'affordance tactile (pas de « pressed state ») d'un contrôle interactif, pour ne pas laisser croire à une bascule possible.
   - Avatar/initiales + pastille de notification : hors périmètre (§1 point 1), reprise identique.
   - Salutation « Bonjour, {prénom} » — `user.fullName` à l'exécution, aucun prénom des maquettes recopié en dur (CLAUDE.md §9).
   - **Pas de ligne de contexte « équipe · effectif · J{repère} »** comme côté coach : rien dans le périmètre de cette spec ne fonde un tel repère pour le joueur (pas de PO-7 équivalent ici). La salutation est suivie directement du bandeau d'alerte ou de la carte de convocation.
   - **Aucune valeur ASC Legacy** (correction §6.1) : la ligne « 320 pts · Argent » sous la salutation est purement et simplement supprimée, pas remplacée par un espace vide compensatoire ni par un placeholder.

2. **Bandeau d'alerte « Document manquant »** — composant nouveau pour ce projet, mais variation directe du langage visuel déjà en place (carte pleine largeur, fond de couleur sémantique), pas un pattern inédit :
   - **Déclenchement** : rendu seulement si l'utilisateur a au moins un `Document` de statut `missing` ou `rejected` parmi les siens (AC-PD-13). Absence sinon — pas de bandeau vide, pas de bandeau grisé.
   - **Layout** : carte pleine largeur, fond rouge plein (même rouge sémantique que l'état « Absent » sélectionné de la carte de convocation, pour rester cohérent avec la palette déjà utilisée dans la maquette), icône ronde à gauche, deux lignes de texte à droite — libellé court en petites capitales (« ALERTE ») puis texte principal en gras. **Le texte reste générique** : « Document manquant » (singulier ou pluriel selon le nombre de pièces concernées, à décider en implémentation, mais jamais un nom de pièce) — tant que PO-PD-06 n'est pas tranché, ne jamais faire figurer une nature de pièce potentiellement médicale (§3, note du bandeau).
   - **Cible** : toute la carte est tappable (zone ≥ 44px de haut — la maquette donne déjà une hauteur confortable, à conserver) et renvoie vers l'écran des documents de l'utilisateur. **Cet écran n'existe pas encore dans `router.tsx`** à ce jour — même statut que le lien « Voir tout » vers un Calendrier aujourd'hui stub (§1 point 5) : le bandeau route vers sa cible logique, l'écran lui-même reste à construire par une autre feature.
   - **États** : présent / absent uniquement (AC-PD-13) ; pas d'état intermédiaire, pas de badge de comptage (« 2 pièces manquantes ») — non fondé par la spec, à ne pas inventer.

3. **Carte « Prochaine convocation »** — reprend la structure de la carte « Prochain match » du coach (bandeau supérieur, titre, méta date/heure/lieu), adaptée :
   - Bandeau supérieur : libellé « PROCHAINE CONVOCATION » (pas de badge compte à rebours type « J-3 » — non fondé dans cette spec, absent des maquettes joueur).
   - Icône de type d'échéance + intitulé (ex. « Entraînement — Seniors ») ; pour un match, adversaire + domicile/extérieur + heure de RDV (§1 point 3) ; pour une réunion, titre + ordre du jour, selon `match_details`/`meeting_details`.
   - Ligne date/heure · lieu.
   - **Pas de barre de réponses tri-segments** (celle-ci est un indicateur d'équipe côté coach, écartée ici par PO-PD-05 — AC-PD-09) : la carte ne montre que le statut de réponse **du joueur lui-même**, porté par l'état des boutons Présent/Absent eux-mêmes (voir point 4) plutôt que par un texte séparé — évite de dupliquer l'information entre un libellé de statut et l'état visuel des boutons.
   - Tape sur la carte hors zone des boutons : renvoie au détail de l'échéance dans Calendrier (AC-PD-14), même règle que côté coach.

4. **Action « Présent » / « Absent »**, dans la carte de convocation :
   - Deux boutons **côte à côte** (`grid-cols-2` ou `flex` équivalent), pleine largeur de la carte à eux deux. **Contrainte mobile explicite (CLAUDE.md §6)** : chaque bouton reçoit `min-w-0` pour pouvoir rétrécir sous son contenu texte sur un écran étroit, et une hauteur minimale `h-11` (~44px) — ne pas reprendre tel quel un composant Button shadcn non surchargé (`h-8` par défaut trop petit). À vérifier sur un viewport mobile réel, pas une fenêtre desktop redimensionnée.
   - **Rendu conditionné par l'échéance de réponse** (AC-PD-06, `canPlayerRespond`) : passé le délai, **les deux boutons disparaissent** (absence, pas désactivation) — remplacés par un libellé texte simple donnant le statut final si une réponse a été enregistrée (« Vous avez répondu : présent » / « absent »), ou rien du tout si aucune réponse n'a été donnée avant l'échéance. Pas de nouvel état visuel à inventer au-delà d'un texte simple, cohérent avec la règle du moindre privilège déjà appliquée partout ailleurs sur cet écran.
   - **États des boutons avant l'échéance** :
     - Aucune réponse encore donnée : les deux boutons sont au même niveau visuel (contour, fond transparent), aucun n'est présélectionné.
     - Une réponse a été donnée : le bouton correspondant passe à l'état plein/actif (fond rouge plein pour « Absent » sélectionné, d'après `v2_joueur_dashboard_absent.png` ; traitement symétrique — fond vert plein — à prévoir pour « Présent » sélectionné, cohérent avec la palette déjà utilisée pour le statut présent/absent ailleurs sur l'écran), l'autre reste au contour. C'est cet état visuel qui porte le statut de réponse (point 3 ci-dessus), doublé d'un libellé accessible (attribut `aria-pressed` ou équivalent + texte visible, AC-PD-17) — la couleur seule ne suffit jamais.
   - **Correction §6.2 appliquée** : ni champ de motif, ni bouton « Envoyer au coach » — la variante `_absent` se réduit à l'état sélectionné du bouton « Absent » décrit ci-dessus, aucun contenu supplémentaire ne se déploie sous la carte.
   - **Interaction retenue pour « Absent » — répond au point laissé ouvert par §1 point 4 de cette spec** : une fois le champ de motif et le bouton d'envoi retirés (correction §6.2), il ne reste plus de contenu justifiant un parcours en deux temps. Le tap sur « Absent » **commit directement** l'upsert, exactement comme « Présent » — un seul geste, un seul enregistrement, cohérent avec AC-PD-04 (pas d'état intermédiaire persisté, pas d'état intermédiaire *affiché* non plus). Si un motif d'absence est réintroduit un jour (PO-PD-03 tranché en ce sens), ce point sera à rouvrir — un parcours en deux temps redeviendrait défendable à ce moment-là, pas avant.
   - Une réponse déjà donnée reste modifiable tant que l'échéance n'est pas dépassée : retaper l'autre bouton bascule l'état (upsert, AC-PD-04), sans confirmation supplémentaire, dans les deux sens.

5. **Liste « À venir »**
   - En-tête de section : « À venir » à gauche, lien « Voir tout » à droite (renvoie vers Calendrier, AC-PD-14) — pattern identique au coach.
   - Chaque ligne : liseré vertical coloré à gauche par type d'échéance (même code couleur que côté coach, à réutiliser tel quel plutôt qu'en redéfinir un), icône de type, titre, sous-ligne date/heure · lieu.
   - **Corrections §6.3 et §6.4 appliquées** : ni compteur « N/M convoqués » en bas de ligne, ni menu « ⋮ » en bout de ligne. La ligne se limite à liseré + icône + titre + sous-ligne date/heure/lieu — rien à droite de la ligne.
   - Tape sur une ligne : renvoie au détail de l'échéance (AC-PD-14), seule interaction disponible sur la ligne (§1 point 5, écart « ⋮ »).
   - État vide (AC-PD-02) : message explicite (« Aucune échéance à venir » ou équivalent) à la place de la liste, même traitement que côté coach.

6. **Fin de l'écran en v1** — **le tableau de bord joueur s'arrête après la liste « À venir »**, immédiatement suivie de la nav basse. Les blocs « Dernier match » et « Mes stats » du bas des maquettes (score, pastille V, « Titulaire · 78' », Matchs/Buts/Présence, « Voir le détail ») **ne sont pas conçus dans cette passe** — ni retirés silencieusement en gardant un espace vide, ni remplacés par un placeholder, ni traités avec des valeurs statiques hardcodées comme le bloc « Forme récente » du coach (précédent PO-1, explicitement écarté ici : PO-PD-07 n'est pas tranché de la même façon, §6 point 5). Tant que PO-PD-02 (accès du joueur à son `AttendanceRecord`) et PO-PD-07 (existence d'un module résultats/compétitions) ne sont pas arbitrés par le Bureau, cette moitié d'écran n'a pas de mise en page — elle sera reprise dans une révision ultérieure de cette section une fois l'un ou l'autre tranché. Un joueur qui répondrait « présent » puis reverrait l'écran ne doit rien voir apparaître sous la liste « À venir » au-delà du padding de fin de scroll standard.

7. **Nav basse à 4 entrées** — cf. « Emplacement dans la nav » ci-dessus, rien de spécifique à concevoir.

### Ce qui change par rôle

Cet écran n'est rendu que pour un utilisateur dont le rôle actif est Joueur/Joueuse (§2 « Rôle titulaire de l'écran ») ; les autres rôles n'y accèdent pas dans cet état (§2 « Autres rôles face à cet écran », tableau — un compte Coach seul, ou Responsable/Dirigeant/Trésorier/Bénévole/Référent médical, ne voit jamais ce rendu). Comme pour le tableau de bord coach, il n'y a pas de variation de contenu *au sein* de l'écran par combinaison de rôles simultanés — pas de fusion Joueur+Coach en un seul écran. Les seules variations, toutes déjà couvertes par les permissions du §2 :

- **Bandeau d'alerte** : présent seulement si l'utilisateur a une pièce `missing`/`rejected` — question de données, pas d'autorisation différenciée (tout Joueur/Joueuse a la même permission « voir son propre dossier »).
- **Boutons Présent/Absent** : présents seulement avant l'échéance de réponse — question de fenêtre temporelle (`canPlayerRespond`), pas de permission variable au sein du rôle.
- **Carte de convocation et liste « À venir »** : absentes de tout contenu si aucune équipe de saison en cours n'est affectée, ou si aucune échéance n'existe (états vides explicites, AC-PD-01/AC-PD-02) — pas une variante par sous-rôle, un état de données.
- Aucun autre bloc n'est conditionné par un sous-cas de permission : les blocs financiers, santé, agrégats d'équipe, export sont **catégoriquement absents**, jamais des variantes cachées/affichées (§2, règle du moindre privilège).

### Composants réutilisés vs nouveau

- **Réutilisés directement** de `docs/designs/v4_coach_dashboard.png` (via son propre §UI design, qui fait référence pour ce projet) : en-tête à pastilles + avatar, carte d'échéance (bandeau + titre + méta), ligne de liste à liseré coloré, nav basse à 4 entrées.
- **Réutilisés directement** de `docs/designs/player-dashboard/v2_joueur_dashboard.png` et `_absent.png`, une fois les corrections §6 appliquées : structure de la carte « Prochaine convocation », paire de boutons Présent/Absent avec état sélectionné plein, liste « À venir » allégée.
- **Nouveau composant** : le bandeau d'alerte « Document manquant » (point 2 ci-dessus). Justification : aucun écran existant du projet (coach dashboard inclus) n'a encore eu besoin d'une bannière d'alerte conditionnelle pleine largeur — mais ce n'est **pas** un pattern visuel inédit à faire produire en prototype séparé : la maquette `v2_joueur_dashboard.png` le montre déjà rendu, avec une palette (rouge plein, icône ronde, deux lignes de texte) directement dérivée de la palette sémantique déjà en usage sur l'écran (rouge = absent/alerte, vert = présent/positif). Repris tel quel depuis la maquette, sans modification de layout — seule la copie et la cible de navigation sont précisées ci-dessus.
- Aucun autre composant réellement inédit n'est nécessaire pour cette version.

### Questions ouvertes UI

- **Moitié basse de l'écran suspendue** (voir point 6 ci-dessus) : dépend de l'arbitrage Bureau sur PO-PD-02 et PO-PD-07. Cette section UI design sera rouverte pour couvrir « Dernier match »/« Mes stats » une fois l'un ou l'autre tranché — pas une question à deviner ici.
- **Variante « Absent » si PO-PD-03 est tranché en faveur d'un motif** : si le référent RGPD valide un jour un champ de motif (§3), le point « une réponse « Absent » est-elle un commit en un tap ou un parcours en deux temps » redevient ouvert — la réponse retenue ci-dessus (commit en un tap) n'est valable que tant que le motif reste hors périmètre.
- Aucune autre question bloquante : PO-PD-01 et PO-PD-04 sont des questions d'implémentation/routage, pas de mise en page (§5, tableau), et n'affectent aucun choix pris dans cette section.

**Prêt pour transmission à mentor-agent : oui, avec la même réserve que celle déjà posée en §6 — la moitié basse de l'écran reste hors conception tant que PO-PD-02/PO-PD-07 ne sont pas arbitrés.**

## UI design — addendum : lignes date/heure · lieu · RDV (carte « Prochaine convocation »)

**Demande, identique côté coach** : la carte « Prochaine convocation » (point 3 ci-dessus) rend aujourd'hui `formatMatchSchedule()`/`formatEventSchedule()` dans un unique `<p className="text-[12.5px] whitespace-pre-line text-white/60">` — trois lignes de texte brut jointes par `\n` pour une convocation de type match (date/heure, lieu, RDV), sans hiérarchie visuelle. Le même besoin d'un traitement plus ergonomique a été formulé côté coach (`specs/coach-dashboard.md`, même addendum) ; la solution retenue est **partagée entre les deux cartes**, pas dupliquée.

### Composant réutilisé : `ScheduleInfo`

Voir `specs/coach-dashboard.md` UI design — addendum pour la description complète du composant (`presentation/shared/components/ScheduleInfo.tsx`, props `dateIso`/`location`/`meetingPointTime`, layout en 3 éléments à poids visuel décroissant, badge `Badge` réutilisé pour la ligne RDV). Rien n'est spécifique à la vue joueur dans ce composant : il est déjà pensé partagé, au même titre que `ResponseActions`/`ResponseBar`.

**Particularité de cette carte** : `NextConvocationCard.tsx` rend une convocation de **n'importe quel type** (§1 point 3 de cette spec), pas seulement un match — `ScheduleInfo` s'applique sans changement aux trois cas :

- **Match** (`matchDetails` présent) : les trois éléments (date/heure, lieu, badge RDV) — identique au rendu coach.
- **Entraînement ou réunion** : `meetingPointTime` vaut `null`/`undefined`, seules les deux premières lignes (date/heure, lieu) sont rendues, pas de badge — même dégradation que côté coach pour une convocation non-match.

### Ce qui change par rôle

Rien : pure reformulation de mise en page des trois données déjà lues par cette carte (§1 point 3, §2). Aucun nouveau champ affiché — en particulier, ce composant ne réintroduit ni agrégat d'équipe (PO-PD-05/AC-PD-09), ni donnée de santé (§3/AC-PD-08) : il ne fait que restructurer visuellement `convocation.date`, `convocation.location` et `matchDetails.meetingPointTime`, trois champs déjà dans le périmètre validé de cette spec.

### Touche mobile

Aucun contrôle interactif introduit (texte, icônes et badge statiques) — pas de cible tactile à dimensionner pour ce composant. Les boutons Présent/Absent (point 4 de la spec ci-dessus, `h-11`/`min-w-0` déjà spécifiés) sont un bloc distinct, rendu séparément sous `ScheduleInfo` dans la carte ; cet addendum ne les modifie pas.

### Questions ouvertes UI

Aucune — cf. `specs/coach-dashboard.md` UI design — addendum. Ce composant ne rouvre aucun des points ouverts de cette spec (§5) : il ne dépend ni de PO-PD-02 ni de PO-PD-07 (moitié basse de l'écran, toujours hors conception — voir point 6 de la section « Structure de l'écran » ci-dessus, inchangé par cet addendum).
