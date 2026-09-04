# Spec — Calendrier

> Statut : **rédaction initiale du 2026-09-04**. Aucune spec antérieure n'existait pour cet écran — il n'est à ce jour qu'un stub (`presentation/features/calendar/CalendarPage.tsx`, « Bientôt disponible »), pourtant déjà cible de trois renvois d'autres specs : `specs/coach-dashboard.md` AC-CD-08 (« Voir tout »), `specs/player-dashboard.md` §1 point 5 (idem) et `specs/create-convocation.md` §7 (point d'entrée du Responsable de section). 7 points ouverts (PO-CA-01 à PO-CA-07) ; le seul qui conditionnait la mise en page (**PO-CA-02**, échéances passées) a été tranché le 2026-09-04 par la développeuse — voir §5.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles), `docs/ARCHITECTURE.md` (§7 permissions, §11 journal d'audit, §13.4 nav basse, **§14 « stratégie de cache hors ligne… à spécifier lors du module Calendrier »**), `specs/coach-dashboard.md` (§1 points 3-4, AC-CD-04/05/08, PO-5, PO-6b), `specs/player-dashboard.md` (§1 point 5, AC-PD-03/04/06/09, PO-PD-02/03/05), `specs/match_details_page.md` (§1, §2, §3, AC-MD-06/09/10/13), `specs/create-convocation.md` (§1, §7), `specs/menu.md` (§1, nav basse).
> Maquettes : `docs/designs/calendar/` — 5 exports v0, **une vue coach** (`[v0] [Coach] Mob - Calendrier.png`) et **quatre vues joueur** (`[v0] [Joueur] Mob - Calendrier_1.png` à `_4.png`). Registre `docs/designs/DESIGN_LINKS.md` §2 : **aucune ligne n'existe encore pour cette feature**. Aucun lien artifact n'a été fourni et les instantanés sont déjà versionnés dans le dépôt — c'est le cas **`instantané seul`** du §4 du registre, celui du précédent `menu` : la référence existe dans le dépôt, **aucun lien n'est à demander**. Les deux lignes à inscrire au registre sont rédigées en §6 ; l'agent PO n'a pas pu les y écrire lui-même dans cette passe (outillage d'édition indisponible), c'est le seul point de procédure du §4 resté en suspens. L'agent PO n'a pas ouvert ces PNG (lecture réservée à designer-agent) : leur existence et leur découpage 1 coach / 4 joueur ont servi à cadrer le périmètre, pas à décider de la mise en page.
> État du code lu pour cadrer : `presentation/features/calendar/CalendarPage.tsx` (stub), `presentation/app/router.tsx`, `presentation/app/providers/active-role-provider.tsx`, `presentation/shared/query-keys.ts`, `presentation/shared/components/{ResponseBar,ResponseActions,ScheduleInfo,EmptyState}.tsx`, `domain/entities/convocation.ts`, `domain/rules/convocation-rules.ts`, `domain/policies/{rbac-matrix,can,actions,response-deadline}.ts`, `domain/repositories/{convocation,convocation-response,convocation-responders}-repository.ts`, `domain/usecases/coach-dashboard/ListUpcomingTeamConvocationsUseCase.ts`, `domain/usecases/player-dashboard/{ListUpcomingConvocationsForPlayerUseCase,RespondToConvocationUseCase}.ts`, `domain/usecases/convocation/GetConvocationRosterForCoachUseCase.ts`.

## 1. Périmètre

**Deuxième des 4 onglets fixes de la nav basse** (Dashboard · Calendrier · Actus · Menu, `ARCHITECTURE.md` §13.4). C'est l'écran de **liste des échéances d'une équipe** — la vue exhaustive dont les deux tableaux de bord ne montrent qu'un extrait (« prochaine échéance » + « À venir » tronquée + lien « Voir tout »).

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Calendrier et convocations | **P0** | Liste des convocations de l'équipe : entraînements, matchs, réunions. C'est le module que le CDC nomme littéralement d'après cet écran. Le **mode dégradé offline**, également nommé dans la ligne de module, **n'est pas implémenté par cette passe** — PO-CA-01 |
| Présences et suivi sportif | **P0** | **Réponses déclarées** (`ConvocationResponse`) seulement : l'agrégat par échéance côté coach, et la réponse propre du joueur avec son action Présent/Absent. **Ni saisie de présence, ni `AttendanceRecord`** |

### Note de vocabulaire — « barre de présences » ≠ présences

La demande initiale parle d'une *attendance bar*. Le composant existant s'appelle `ResponseBar` et c'est le bon nom : il agrège des **`ConvocationResponse`** (intention déclarée par le joueur avant l'échéance), **jamais** des **`AttendanceRecord`** (fait constaté par le coach à l'échéance). Les deux entités restent distinctes (`CLAUDE.md` §6, AC-CD-04, AC-MD-06) : un joueur ayant répondu « présent » n'est pas un joueur présent. Cette spec dit donc **barre de réponses** partout, y compris là où la maquette dirait autre chose.

### Contenu retenu

1. **Titre d'écran « Calendrier »**, sans flèche retour : destination de nav primaire, comme Dashboard/Actus/Menu (`specs/menu.md` §1 point 1).
2. **Liste des échéances de l'équipe**, une ligne/carte par convocation, portant au minimum : type (entraînement / match / réunion, avec son liseré coloré déjà établi), date + heure (`Convocation.date`), lieu (`Convocation.location`), et pour un match l'adversaire (`MatchDetails.opponentId` → `Opponent.name`) et l'heure de RDV (`MatchDetails.meetingPointTime`). **Trois types, pas de quatrième** (`specs/create-convocation.md` §2 : la pastille « Autre » est hors P0).
3. **Statut de l'échéance** : `closed` / `cancelled` signalés par une pastille toujours doublée d'un libellé textuel ; `open` n'affiche **aucune** pastille (règle déjà tranchée, AC-MD-05).
4. **Barre de réponses — vue coach uniquement** : répartition présents / absents / en attente pour l'échéance, réutilisation directe de `ResponseBar`. Indicateur, **pas** un point d'action : aucune relance (Communication est **P1**, `specs/coach-dashboard.md` PO-4, AC-CD-05b).
5. **Réponse à l'échéance — vue joueur uniquement** : sa **propre** `ConvocationResponse` et l'action Présent/Absent, réutilisation de `RespondToConvocationUseCase`, `canPlayerRespond` et de l'action `'convocation:respond'` déjà existantes. **Aucun nouveau use case, aucune nouvelle permission, aucune entrée de matrice** — c'est le même mécanisme que le tableau de bord joueur et que l'écran de détail, à un troisième point d'appel près.
6. **Navigation vers le détail** : taper une échéance pousse `convocations/:id` (`ConvocationDetailPage`, déjà construit). Le Calendrier **renvoie**, il ne duplique pas le détail — même règle que les deux tableaux de bord.

### Contrainte explicite — aucun avatar

**Aucun avatar n'est rendu sur cet écran**, sous aucune forme : ni photo, ni cercle à initiales (`InitialsAvatar`), ni écusson d'équipe (`TeamCrestAvatar`), ni pile d'avatars de répondants. Contrainte posée par la développeuse (2026-09-04), reprise ici comme critère testable (AC-CA-07). Elle est cohérente avec le périmètre de données de l'écran : le Calendrier n'affiche **aucune identité nominative de tiers** (§3) — la liste nominative des répondants vit sur l'écran de détail, pas ici.

### Hors périmètre — explicitement

- **Le mode dégradé offline** (PO-CA-01). La matrice l'accorde aux 8 rôles et la ligne de module P0 le nomme, mais aucun cache hors ligne n'existe dans le projet (`specs/coach-dashboard.md` PO-5, `ARCHITECTURE.md` §14). Rien ne doit **annoncer** un mode dégradé qui n'existe pas (AC-CA-20).
- **Les `AttendanceRecord`** : ni affichés, ni saisis, ni requêtés. La saisie appartient à Suivi sportif ; l'affichage côté joueur rouvrirait PO-PD-02, laissé fermé en base.
- **Le motif d'absence** (`ConvocationResponse.reason`) : ni saisi, ni affiché, pour personne — PO-PD-03 non tranché par le référent RGPD (§3).
- **La liste nominative des répondants** : elle vit sur `convocations/:id` (`RosterList`), jamais dans une liste d'échéances.
- **La modification, l'annulation et la clôture** d'une convocation : `UpdateConvocationUseCase` reste un nom réservé, la clôture est pilotée par trigger, aucune politique RLS `UPDATE` sur `convocations` (`specs/match_details_page.md` §1).
- **La création d'une convocation** : le formulaire existe (`convocations/new`) mais **son point d'entrée depuis le Calendrier n'est pas construit par cette passe** — PO-CA-04.
- **Tout événement autre qu'une convocation d'équipe** : événement club, mission bénévole, loto — module « Événements et bénévoles », **P1** (`specs/coach-dashboard.md`, écart « Loto du club »).
- **Toute donnée de résultat** (score, classement, journée de championnat, forme) : aucun module « résultats et compétitions » en P0/P1/P2 (PO-PD-07, AC-MN-04).
- **Tout export, partage ou ajout à un calendrier système** (ICS, Google Agenda) : le coach comme le joueur ont « Exporter des données ❌ » dans la matrice, et un flux ICS est un export nominatif d'échéances hors du périmètre maîtrisé par le club (§3).
- **Tout indicateur ASC Legacy** (module **P1**, grille « à valider par le Bureau avant développement »).
- **Le sélecteur d'équipe** pour un coach multi-équipes : no-op assumé depuis `specs/coach-dashboard.md` PO-6, non rouvert ici (PO-CA-05).

### Périmètre de données — la règle centrale

Toute échéance affichée est bornée à **l'équipe de l'utilisateur pour la saison en cours**, jamais « toutes les équipes de la section », jamais « tout le club » — même règle que les deux tableaux de bord (AC-CD-01, AC-01/AC-02 du CDC §17.2). La source est `ConvocationRepository.listForTeam(teamId)`, dont la RLS (`convocations_select_team_scoped`) borne déjà à l'équipe, et dont l'équipe est elle-même bornée à la saison en cours par `teams_select_team_scoped`.

« Aucune équipe », « aucune saison en cours » et « aucune échéance » sont trois **états valides** : état vide explicite, jamais une erreur ni un chargement infini (AC-CA-11).

## 2. RBAC

### Lignes de matrice applicables

**« Consulter une convocation en mode dégradé »** — seule ligne de la matrice portant sur la *consultation* d'une convocation :

| Rôle | Valeur matrice | Traduction sur cette feature |
|---|---|---|
| Les 8 rôles | ✅ | Droit de consultation universel. En RLS, `convocations_select_team_scoped` le borne à l'appartenance d'équipe, plus `section-manager` / `authorized-officer` dans leur portée et `admin` (correction ex-PO-MD-05, AC-MD-16). Le « mode dégradé » lui-même n'est pas implémenté (PO-CA-01) |

**« Voir les dossiers des autres membres »** — gouverne la barre de réponses :

| Rôle | Valeur matrice | Traduction sur cette feature |
|---|---|---|
| Joueur/Joueuse | ❌ | **Aucun agrégat d'équipe, aucun statut d'un coéquipier.** Le joueur ne voit que **sa propre** réponse par échéance (AC-PD-09, PO-PD-05 toujours ouvert) |
| Coach/Staff | ❌ (son équipe, hors financier) | Autorisé pour son équipe : barre de réponses agrégée par échéance. Agrégat seul — aucune identité nominative sur cet écran (§1, contrainte « aucun avatar ») |
| Responsable de section | ✅ (sa section) | Droit acquis, **mais aucun accès pratique** : `ActiveRoleProvider` ne connaît que `'coach' \| 'player'`, donc ce rôle n'atteint aujourd'hui aucun tableau de bord ni aucune variante de rôle (PO-CA-06, dette préexistante) |
| Dirigeant habilité | ✅ | Idem — droit acquis, aucun point d'entrée |
| Trésorier | ❌ (financier seulement) | Consultation acquise par la ligne universelle, aucune barre de réponses, aucune donnée financière (§3) |
| Référent médical | ❌ (santé seulement, tracé) | Idem. Son périmètre santé est un écran distinct et tracé |
| Bénévole | ❌ | Idem. Ses missions relèvent d'« Événements et bénévoles », **P1**, hors de cet écran |
| Administrateur | ✅ | Accès par l'administration (`private.is_admin()`), jamais par auto-affectation à une équipe |

**« Créer/modifier une convocation »** — pertinente uniquement pour le point d'entrée de création, **non construit par cette passe** (PO-CA-04). Rappel de la ligne telle quelle : Coach ✅ (son équipe), Responsable de section ✅ (sa section), Dirigeant habilité ✅, Administrateur ✅ ; Joueur, Trésorier, Référent médical, Bénévole ❌.

### Action métier de l'écran

Une seule, **déjà existante** : `'convocation:respond'`, `['player']` dans `rbac-matrix.ts`, bornée dans `can.ts` par `assignment.teamId === context.teamId`, et bornée dans le temps par `canPlayerRespond` (délai par type + `status === 'open'`).

**Aucun ajout à `domain/policies/{actions,rbac-matrix,can}.ts` par cette feature.** La lecture des échéances reste **RLS-only**, conformément au critère commenté en tête de `rbac-matrix.ts` : `presentation/` ne décide rien avant la requête, il rend ce que le repository a renvoyé. La seule décision prise avant requête est de rendre ou non l'action Présent/Absent, via `can(...)` + `canPlayerRespond` — mécanisme déjà en place.

### Variantes de rendu par rôle

Le choix de variante suit **strictement l'onglet de rôle actif** (`useActiveRole()`), comme sur l'écran de détail — pas un recalcul à partir de `user.roles` (`specs/match_details_page.md`, « Emplacement dans la nav », résolution du 2026-09-01).

| Bloc | Vue joueur | Vue coach |
|---|---|---|
| Liste des échéances (type, date/heure, lieu, adversaire, RDV) | ✅ | ✅ |
| Pastille de statut `closed` / `cancelled` | ✅ | ✅ |
| Barre de réponses agrégée (présents / absents / en attente) | ❌ (matrice, PO-PD-05) | ✅ |
| Sa propre réponse + action Présent/Absent | ✅ (dans la fenêtre de réponse) | ❌ (un coach ne répond pas) |
| Statut de réponse d'un coéquipier | ❌ | ❌ **sur cet écran** (agrégat seulement ; le détail nominatif est sur `convocations/:id`) |
| Présences constatées (`AttendanceRecord`) | ❌ | ❌ |
| Point d'entrée de création (`+`) | ❌ | Non construit — PO-CA-04 |

**Règle d'affichage** (moindre privilège, CDC §3 ; `ARCHITECTURE.md` §7) : un bloc non autorisé est **absent**, jamais grisé ni suivi d'une erreur au clic.

## 3. Données sensibles

### Données de santé — aucune, vecteur d'entrée tenu fermé

Aucune donnée de santé, d'aptitude ou de diagnostic (AC-CD-09, AC-PD-08, AC-MD-18).

Le vecteur reste **`ConvocationResponse.reason`**, texte libre pouvant recueillir un motif médical. Il n'est **ni affiché, ni saisissable** sur cet écran, pour aucun rôle, tant que **PO-PD-03** n'est pas tranché par le **référent RGPD** — toujours **non désigné** (`docs/GOUVERNANCE.md` §7). `RespondToConvocationUseCase` écrit déjà `reason: null` en dur, donc l'action de réponse de cet écran ne peut pas en produire.

### Données financières — aucune

Aucun statut de cotisation, montant, échéancier ou relance, **y compris pour un jeton trésorier**. Module Cotisations **P1**. Exclusion active, pas omission (AC-CA-10).

### Données personnelles de tiers — aucune sur cet écran

C'est la différence de nature entre le Calendrier et l'écran de détail : le détail expose une **liste nominative** de l'effectif convoqué (via `get_convocation_responders`, fonction `SECURITY DEFINER` délibérément étroite) ; **le Calendrier n'expose qu'un agrégat chiffré**, côté coach seulement. Aucun nom, aucune initiale, aucun avatar, aucun statut individuel de tiers (§1, AC-CA-04, AC-CA-07).

Conséquence à ne pas perdre de vue : la contrainte de **recomposition** posée en `specs/match_details_page.md` §3 (bloc « qui a répondu » + agrégat = statut individuel reconstitué) **ne se déclenche pas ici**, puisque l'écran ne porte jamais les deux — mais elle se déclencherait immédiatement si une liste de répondants était ajoutée à cet écran. À traiter comme un interdit structurel, pas comme une préférence de mise en page.

### Journal d'audit — aucune action à tracer par cette feature

Consulter un calendrier ne figure pas dans les actions sensibles du CDC §11.3. Répondre à une convocation non plus (responsabilité déjà portée par `user_id` + `responded_at`, `specs/player-dashboard.md` §3). **Aucune journalisation requise.**

⚠️ Rappel de dette, non introduite ici : **aucune table de journal d'audit n'existe dans `supabase/migrations/`** — exigence transversale **P0 non résolue**, déjà signalée par `specs/create-convocation.md` §7, `specs/player-dashboard.md` §3, `specs/match_details_page.md` §3, `specs/profile-page.md` §3 et `specs/menu.md` §3.

### Réserve RGPD propre à cette feature — le cache hors ligne

⚠️ Le mode dégradé exigé par le CDC pour ce module (PO-CA-01) implique de **persister sur l'appareil** des échéances d'équipe et, potentiellement, des réponses de convocation. C'est une **copie locale de données personnelles hors du périmètre maîtrisé par le club** (appareil personnel, éventuellement partagé, éventuellement celui d'un mineur), qui pose au minimum : quoi mettre en cache, pour combien de temps, comment le purger à la déconnexion ou à la révocation d'un compte (CDC §3.1, « révocation immédiate en cas de départ »). Ces questions relèvent du **référent RGPD** et de la politique de rétention (`docs/RETENTION-PURGE.md`), pas d'un choix de bibliothèque de cache. Signalé plutôt qu'omis — c'est la raison pour laquelle PO-CA-01 n'est pas traité comme un simple point technique.

### Export — aucun

Aucun export, aucun partage, **aucun flux ICS ni ajout à un calendrier système** (§1). Un flux ICS serait un export nominatif d'échéances vers un service tiers, alors que ni le coach ni le joueur n'ont la permission « Exporter des données ».

## 4. Critères d'acceptation

**AC-01** et **AC-02** sont ceux du CDC §17.2 et s'appliquent tels quels. Les critères propres à cet écran sont préfixés `AC-CA-`, même convention que `AC-CD-` (coach), `AC-PD-` (joueur), `AC-CV-` (création), `AC-MD-` (détail), `AC-PR-` (profil), `AC-MN-` (menu) ; à renuméroter dans la série officielle en recette (CDC disponible ici en PDF non extractible).

| Réf. | Critère |
|---|---|
| **AC-01** | Aucune donnée d'un membre extérieur à l'équipe de l'utilisateur n'est accessible depuis cet écran, ni à l'affichage ni dans les réponses API |
| **AC-02** | Un membre de l'équipe A ne voit aucune échéance de l'équipe B. Vérifié par appel direct à l'API, jeton joueur **et** jeton coach, hors application |
| AC-CA-01 | Seules les échéances de l'équipe de l'utilisateur pour la **saison en cours** sont listées ; une convocation d'une équipe de saison antérieure n'y figure pas |
| AC-CA-02 | Les **trois** types (entraînement, match, réunion) sont rendus sans erreur ; aucun quatrième type n'existe. Un match rend son adversaire et son heure de RDV ; un entraînement ne rend aucun champ de type qu'il ne possède pas, sans espace vide compensatoire |
| AC-CA-03 | La barre de réponses est calculée à partir des seules **`ConvocationResponse`** ; une présence constatée (`AttendanceRecord`) saisie a posteriori ne la modifie pas (identique à AC-CD-04 / AC-MD-06) |
| AC-CA-04 | Pour un **jeton joueur**, aucun agrégat d'équipe et aucun statut de réponse d'un tiers n'apparaît — ni à l'écran, ni dans la **forme même** des réponses API qui alimentent l'écran. Vérifié par appel direct à l'API, hors application (même mode de vérification qu'AC-MD-08, qui a échoué en recette pour avoir été évalué contre le rendu) |
| AC-CA-05 | Le statut affiché au joueur pour une échéance est **sa propre `ConvocationResponse`**, jamais un `AttendanceRecord`, jamais un agrégat (identique à AC-PD-03) |
| AC-CA-06 | Répondre depuis cet écran ne crée pas de seconde ligne : **une seule ligne** par `(convocation_id, user_id)`, dernière valeur gagne (identique à AC-PD-04 / AC-MD-14). Une réponse sur une convocation d'une autre équipe, ou au nom d'un autre utilisateur, est refusée **par la base**, pas seulement par l'interface |
| **AC-CA-07** | **Aucun avatar n'est rendu sur cet écran** : ni photo, ni cercle à initiales, ni écusson d'équipe, ni pile d'avatars de répondants — pour aucun rôle, dans aucun état (contrainte développeuse, §1) |
| AC-CA-08 | Passé l'échéance de réponse propre au type, ou si la convocation n'est plus `open` (`canPlayerRespond` couvre les deux), l'action Présent/Absent n'est plus rendue — **absence, pas désactivation** (identique à AC-PD-06 / AC-MD-13) |
| AC-CA-09 | Aucun `AttendanceRecord` n'est rendu ni requêté depuis cet écran, pour aucun rôle (PO-PD-02 / PO-MD-04 restant fermés) |
| AC-CA-10 | Aucune donnée financière et aucune information de santé, d'aptitude ou de diagnostic n'apparaît à l'écran ni dans les réponses API, pour aucun jeton — **y compris trésorier et référent médical** |
| AC-CA-11 | Un compte **sans équipe**, **sans saison en cours** ou **sans aucune échéance** obtient un état vide explicite — jamais une erreur, un écran blanc ni un chargement infini |
| AC-CA-12 | Taper une échéance ouvre `convocations/:id` ; le Calendrier ne duplique aucun contenu du détail (liste nominative des répondants, ordre du jour, motif d'annulation) |
| AC-CA-13 | `ConvocationResponse.reason` n'est **ni affiché, ni saisissable** sur cet écran, pour aucun rôle (§3, PO-PD-03) |
| AC-CA-14 | Aucun bouton ni menu de modification, d'annulation, de clôture, de relance, d'export, de partage ou d'ajout à un calendrier système n'est rendu — absence, pas désactivation |
| AC-CA-15 | Aucune donnée de résultat (score, buteur, classement, journée de championnat, forme) n'est rendue, **même statique** — contrairement à la tolérance accordée au tableau de bord coach (AC-CD-05c), qui n'est pas étendue à cet écran |
| AC-CA-16 | `closed` et `cancelled` sont signalés par une pastille toujours doublée d'un libellé textuel ; `open` n'affiche aucune pastille (identique à AC-MD-05) |
| AC-CA-17 | Toute information portée par la couleur (liseré de type, segments de la barre de réponses, statut de sa propre réponse, pastille de statut) est doublée d'un libellé textuel ; contrastes conformes AA et navigation clavier opérationnelle (CDC §12) |
| AC-CA-18 | Le Calendrier reste la **2ᵉ entrée de la nav basse fixe** ; cette feature n'ajoute aucune cinquième destination et ne modifie pas `BottomNav`. Le détail et la création restent des routes plein écran poussées par-dessus l'onglet, hors `AppShell` |
| AC-CA-19 | Les contrôles interactifs (ligne d'échéance tappable, boutons Présent/Absent, éventuels filtres) ont une cible tactile d'au moins ~44px (`h-11`), et tout couple de champs/cartes côte à côte porte `min-w-0` — vérifié sur un viewport mobile réel (`CLAUDE.md` §6) |
| AC-CA-20 | Tant que PO-CA-01 n'est pas tranché, **rien n'annonce un mode dégradé** : pas de mention « disponible hors connexion », pas d'indicateur de synchronisation, pas de contenu périmé présenté comme à jour. Hors connexion, l'écran rend un état d'erreur/vide honnête |
| AC-CA-21 | Affichage complet en moins de 3 secondes sur mobile en réseau normal (CDC §12) — à vérifier spécifiquement sur une liste longue et sur le coût de la barre de réponses par échéance (PO-CA-03) |

## 5. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-CA-01** | **Le mode dégradé offline — le CDC le nomme dans la ligne de module P0 « Calendrier et convocations », et `ARCHITECTURE.md` §14 renvoie explicitement sa spécification « lors du module Calendrier », c'est-à-dire ici.** Trois sous-questions, aucune tranchée : (a) **quoi** mettre en cache (les échéances seules ? les réponses aussi ? sur quelle profondeur temporelle ?) ; (b) **comment** — `persistQueryClient` + IndexedDB est la piste notée dans `ARCHITECTURE.md`, jamais validée ; (c) **la purge** — que devient le cache local à la déconnexion, à la révocation d'un compte (CDC §3.1) ou à l'expiration d'une durée de rétention (`docs/RETENTION-PURGE.md`) ? Le (c) est une question **RGPD**, pas technique (§3) | Développeuse (technique) + **référent RGPD** (cache local de données personnelles) — référent toujours à désigner (`docs/GOUVERNANCE.md` §7) | **Non pour la mise en page** (AC-CA-20 couvre l'absence). **Oui pour affirmer le module P0 complet** : c'est la seule exigence nommée du module qui reste non couverte |
| **PO-CA-02** | ~~L'écran liste-t-il les échéances passées, et sous quelle forme ?~~ **Tranché le 2026-09-04 par la développeuse : oui, les échéances passées restent visibles dans la liste, mais en lecture seule** — la paire d'actions Présent/Absent cède la place à une pastille de statut non interactive (le pattern déjà visible sur la maquette `_3`, où « Absent » apparaît en pastille pleine plutôt qu'en bouton). Sous-question (b) tranchée dans le même sens que l'existant : la pastille reflète la **réponse déclarée** (`ConvocationResponse`), pas une présence constatée — **PO-MD-04 reste fermé**, aucune donnée `AttendanceRecord` n'apparaît sur cet écran. Sous-question (a) (segmentation « À venir » / « Passées ») laissée à designer-agent — la décision porte sur la lecture seule, pas sur la structure de liste. Question jumelle **PO-MD-07** reste ouverte pour `match_details_page` | Développeuse | **Non — tranché, ne bloque plus la conception** |
| **PO-CA-03** | **Le dénominateur de la barre de réponses, sur une liste.** `ListUpcomingTeamConvocationsUseCase` calcule aujourd'hui ses compteurs via `summarizeResponses(responses)`, donc **un joueur convoqué n'ayant jamais répondu n'est compté nulle part** — le total ne vaut pas le nombre de convoqués, contrairement à AC-CD-05. L'écran de détail a résolu ça en passant par `ConvocationRespondersRepository` (`GetConvocationRosterForCoachUseCase` + `summarizeRosterStatuses`), mais cette solution coûte **une requête d'effectif par échéance** : acceptable pour une échéance, à mesurer pour une liste (AC-CA-21). Reste couplé à la question, toujours ouverte, de la **source de vérité des « convoqués requis »** (`specs/coach-dashboard.md` PO-6b, `specs/create-convocation.md` §2 « Destinataires ») — **ne pas la résoudre implicitement en créant une table `convocation_attendees`** | Développeuse (+ Bureau pour PO-6b) | Non pour la conception — la barre se dessine à l'identique quel que soit le mode de calcul. **Oui pour la justesse d'AC-CD-05** sur cet écran |
| **PO-CA-04** | **Le Calendrier porte-t-il le bouton `+` de création de convocation ?** `specs/create-convocation.md` §7 le dit explicitement (« passe par la feature Calendrier, pas par un tableau de bord de section ») et c'est **le seul obstacle restant à l'ouverture du rôle Responsable de section**, dont la permission est acquise depuis 2026-08-20 sans point d'entrée. Le formulaire (`convocations/new`) et la permission (`convocation:create`) existent déjà ; il ne manque que l'accroche et la résolution de l'équipe courante. **Non demandé dans la demande initiale de cette feature** — signalé, pas ajouté (`CLAUDE.md` §7) | Développeuse | Non pour cette passe — mais le point reste bloquant pour le Responsable de section tant qu'il n'est pas fait |
| **PO-CA-05** | **Quelle équipe pour un coach multi-équipes, et quelle portée pour un Responsable de section ?** Le sélecteur d'équipe des tableaux de bord est un no-op assumé (`specs/coach-dashboard.md` PO-6) : le Calendrier hérite donc d'une équipe unique, sans moyen d'en changer. Pour un Responsable de section, « sa section » signifierait **plusieurs équipes dans une même liste**, ce que ni le modèle de lecture ni la maquette ne couvrent | Développeuse (+ Bureau) | Non — une équipe unique en v1, cohérent avec l'existant |
| **PO-CA-06** | **Rappel de dette, non introduite ici** : `ActiveRoleProvider` ne connaît que `'coach' \| 'player'`, donc Responsable de section, Dirigeant habilité, Trésorier, Référent médical, Bénévole et Administrateur n'atteignent aucune variante de rôle — alors que la matrice leur accorde la consultation d'une convocation (les quatre premiers) ou un périmètre plus large (les deux suivants). Même question de fond que PO-MN-07, PO-PR-02 et la question ouverte n°1 de `specs/match_details_page.md` | Bureau + développeuse | Non pour cet écran — signalé pour que la dette reste visible |
| **PO-CA-07** | **Le joueur voit-il combien de coéquipiers ont répondu ?** Reformulation à l'échelle du Calendrier de **PO-PD-05**, toujours ouvert : les maquettes du tableau de bord joueur affichaient un « 12/14 convoqués » que la RLS permet mais que la matrice (« Voir les dossiers des autres membres ❌ ») ne fonde pas. **Non rendu en v1** (AC-CA-04). Si les maquettes joueur de cet écran en montrent un, c'est un écart maquette/CDC à corriger, pas un fait nouveau | Bureau | Non — non rendu en v1 |

## 6. Note pour designer-agent

- **Maquettes** : `docs/designs/calendar/` — `[v0] [Coach] Mob - Calendrier.png` (vue coach) et `[v0] [Joueur] Mob - Calendrier_1.png` à `_4.png` (vue joueur, 4 exports). **Aucun lien artifact n'existe pour cette feature, ne pas en redemander** (§4 du registre, cas `instantané seul` — même situation que `menu`). L'agent PO n'a pas ouvert ces PNG — **c'est la première lecture réelle**, et elle peut faire apparaître des blocs sans fondement, comme sur les cinq écrans précédents (ASC Legacy, « Mes stats », « Forme récente », « Loto du club », pastille « Autre », « Déplacements »). **Le CDC et la matrice RBAC priment, la maquette informe la mise en page.**
- **Lignes à inscrire au registre `docs/designs/DESIGN_LINKS.md` §2** — non écrites par l'agent PO faute d'outil d'édition dans cette passe, à ajouter sous la ligne `menu` :

  ```
  | calendar — **vue coach** (`[v0] [Coach] Mob - Calendrier`) | — aucun lien fourni | 2026-09-04 | `docs/designs/calendar/[v0] [Coach] Mob - Calendrier.png` | **instantané seul** |
  | calendar — **vue joueur** (`[v0] [Joueur] Mob - Calendrier_1..4`) | — aucun lien fourni | 2026-09-04 | `docs/designs/calendar/[v0] [Joueur] Mob - Calendrier_{1,2,3,4}.png` | **instantané seul** |
  ```

  À signaler en même temps : le §5 du registre note qu'une colonne `Variante` deviendrait défendable « à la troisième occurrence » d'une feature à plusieurs lignes de rôle. `calendar` **est** cette troisième occurrence, après `match_details_page` et `profile-page` — le déclencheur que le registre s'était fixé est atteint, arbitrage à rendre par la développeuse.
- **PO-CA-02 est tranché** (§5) : les échéances passées restent dans la liste, en lecture seule (pastille de statut, pas de paire Présent/Absent) — pas de présences constatées, PO-MD-04 reste fermé. Reste à la charge de designer-agent : décider si une segmentation « À venir » / « Passées » est nécessaire à la lisibilité, ou si le seul changement de composant (pastille vs. boutons) suffit — sous-question (a), non tranchée par la développeuse.
- **Contrainte non négociable — aucun avatar** (AC-CA-07) : ni `InitialsAvatar`, ni `TeamCrestAvatar`, ni photo, ni pile de répondants, même si les maquettes en montrent. Contrainte de la développeuse, et cohérente avec le fait que cet écran ne porte aucune identité nominative (§3).
- **Blocs à écarter s'ils apparaissent** : score / classement / journée de championnat / forme (AC-CA-15) ; liste nominative des répondants (§3) ; « X/Y convoqués » côté joueur (PO-CA-07, AC-CA-04) ; motif d'absence (AC-CA-13) ; pointage de présences (AC-CA-09) ; boutons relancer / modifier / annuler / exporter / partager / « Ajouter à mon agenda » (AC-CA-14) ; mention « disponible hors connexion » (AC-CA-20) ; événement club ou mission bénévole dans la liste (P1, §1).
- **Patrons à réutiliser plutôt qu'à réinventer** — cet écran n'a besoin d'**aucun composant visuel inédit** :
  - `presentation/features/coach-dashboard/components/UpcomingList.tsx` et `presentation/features/player-dashboard/components/UpcomingConvocationList.tsx` : les deux listes « À venir » sont déjà exactement la ligne d'échéance de cet écran, en version tronquée. Le Calendrier est leur version longue — la même ligne, pas une nouvelle.
  - `presentation/shared/components/ResponseBar.tsx` (barre tri-segments + légende textuelle ; masquée quand `total === 0`, légende conservée — décision du 2026-09-02), `ResponseActions.tsx` (paire Présent/Absent, `canRespond` / `myResponse`), `ScheduleInfo.tsx` (date/heure · lieu · chip RDV), `EmptyState.tsx`.
  - `presentation/features/convocation/components/StatusBadge.tsx` (pastille `closed`/`cancelled`), `presentation/shared/formatters/{convocation-type-accent,convocation-labels,match-schedule}.ts` (liserés colorés par type, libellés, formats d'horaire).
- **États à couvrir** : aucune équipe / aucune saison en cours / aucune échéance (AC-CA-11) ; échéance `closed` et `cancelled` dans la liste (AC-CA-16) ; échéance dont personne n'a répondu, côté coach (barre masquée, légende 0/0/0 — comportement déjà tranché) ; échéance hors fenêtre de réponse côté joueur (action **absente**, pas grisée, AC-CA-08) ; liste longue (défilement, performance, AC-CA-21).
- **Nav** : titre d'écran « Calendrier » **sans flèche retour** — destination primaire à l'intérieur d'`AppShell` (donc avec nav basse), pas une route poussée. Pas de `sticky` nécessaire faute de flèche retour à préserver (même raisonnement que `specs/menu.md`). Le détail et la création restent des routes plein écran poussées par-dessus (AC-CA-18).
- **Contraintes mobiles** (`CLAUDE.md` §6) : cibles ≥ 44px (`h-11`) sur la ligne tappable et les boutons Présent/Absent ; `min-w-0` sur tout couple d'éléments côte à côte ; vérification sur un viewport mobile réel, pas une fenêtre desktop redimensionnée (AC-CA-19).
- Rappel `CLAUDE.md` §9 : aucun nom de personne figurant dans les maquettes ne doit apparaître dans le code, les tests ou la documentation.

## 7. Note pour mentor-agent

- **Aucune entrée de `rbac-matrix.ts` / `actions.ts` / `can.ts` à ajouter** (§2). La lecture est RLS-only ; la seule action est `'convocation:respond'`, déjà en place.
- **Aucune migration attendue par cette passe** : `convocations_select_team_scoped` (corrigée par ex-PO-MD-05) et les politiques `convocation_responses_insert/update_respond` couvrent déjà ce que l'écran lit et écrit. ⚠️ Les deux écarts de **PO-PD-04** restent entiers et ne sont pas corrigés ici : (a) l'échéance de réponse (`response-deadline.ts`) n'a **aucun miroir SQL**, (b) les politiques d'écriture ne vérifient pas le `status` de la convocation. Cet écran devient un **troisième** point d'appel de la réponse — donc un troisième endroit où l'interface est le seul garde-fou, contrairement à `ARCHITECTURE.md` §7.
- **Réutiliser les use cases existants avant d'en créer** : `ListUpcomingTeamConvocationsUseCase` (coach) et `ListUpcomingConvocationsForPlayerUseCase` (joueur) rendent déjà exactement la forme attendue par cet écran. Si PO-CA-02 impose les échéances passées, **étendre le filtre** de ces use cases (ou en ajouter un dérivé) plutôt que de dupliquer la logique de tri/assemblage.
- **Deux clés de query distinctes**, comme partout ailleurs : la forme retournée diffère entre vue coach (`responseCounts`) et vue joueur (`myResponse`), y compris pour un compte cumulant les deux rôles. Clés centralisées dans `presentation/shared/query-keys.ts`, forme `[ressource, ...discriminants]` — ne pas réutiliser `teamUpcomingConvocations` / `playerUpcomingConvocations` si le périmètre temporel de cet écran diffère de celui des tableaux de bord (PO-CA-02).
- **`GetConvocationDetailsUseCase.execute` lève pour `type === 'training'`** (branche volontaire). `ListUpcomingConvocationsForPlayerUseCase` la contourne déjà par un `if (type === 'training') return null` assorti d'un TODO ; `specs/match_details_page.md` §7 demande de ne pas ajouter un troisième contournement en silence. Si cet écran passe par ce chemin, **le résoudre proprement** plutôt que de recopier la garde.
- **Ne pas implémenter dans cette passe** : cache hors ligne (PO-CA-01), bouton `+` de création (PO-CA-04), affichage ou saisie de présences, liste nominative des répondants, sélecteur d'équipe fonctionnel, table `convocation_attendees`, table de journal d'audit.

## UI design

### Sources utilisées, par ordre effectif

1. `docs/designs/DESIGN_LINKS.md` §2 — aucune ligne n'existait encore pour `calendar` malgré le renvoi préparé en §6 de cette spec (l'agent PO n'avait pas pu l'écrire faute d'outil d'édition). Les deux lignes qu'il avait rédigées (vue coach, vue joueur) ont été ajoutées au registre dans cette passe, statut **instantané seul** — aucun lien artifact à demander.
2. Les 5 PNG de `docs/designs/calendar/` — première lecture réelle (l'agent PO ne les avait pas ouverts). Ce sont les vraies maquettes de cet écran, donc prioritaires sur toute description écrite.
3. Le présent spec, §1 (Périmètre) et §2 (RBAC) — pour trancher les blocs de la maquette qui n'ont pas de fondement CDC/RBAC.
4. Le code déjà lu : `ResponseBar.tsx`, `ResponseActions.tsx`, `ScheduleInfo.tsx`, `EmptyState.tsx`, `StatusBadge.tsx`, `UpcomingList.tsx`, `UpcomingConvocationList.tsx`, `convocation-type-accent.ts` — pour vérifier que ce que la maquette montre correspond bien à un patron déjà posé ailleurs dans l'app, et sous quelle forme exacte (props, classes, thème).

`wireframes-basiques-as-caribbean.md` n'existe pas dans ce dépôt (vérifié — seul `docs/ARCHITECTURE.md` et `docs/DEFAULTS-A-CHALLENGER.md` le citent) ; le patron « bascule Semaine/Mois » qu'il est censé établir pour l'écran Calendrier n'a donc pu être vérifié que via les PNG eux-mêmes, qui le montrent de façon cohérente sur les 5 exports (coach et joueur) — traité ci-dessous comme le patron de référence de cet écran, pas comme une invention.

**Écart de thème signalé, pas corrigé ici** : les 5 PNG sont exportés sur fond clair, texte sombre. Tous les composants existants listés au point 4 (`ResponseBar`, `ResponseActions`, `ScheduleInfo`, `StatusBadge`, les lignes de `UpcomingList`/`UpcomingConvocationList`) sont écrits pour le thème sombre déjà en place dans l'app (texte `white`/`white/NN`, tokens `coach-green`/`coach-red`/`coach-amber`). La conception ci-dessous réutilise ces composants **tels quels**, donc sur fond sombre — pas de nouveau thème clair à créer pour coller à l'export.

### Emplacement dans la nav

**2ᵉ des 4 onglets fixes** (Dashboard · **Calendrier** · Actus · Menu), à l'intérieur d'`AppShell`, donc avec nav basse visible et **sans flèche retour** (AC-CA-18 ; même traitement que `specs/menu.md`). La nav basse elle-même n'est pas de la conception de cette feature — `BottomNav.tsx` existe déjà et n'est pas modifié.

**Écart de maquette à ne pas reproduire** : les 4 exports vue joueur remplacent l'onglet « Actus » par « Recherche » (icône loupe) dans leur nav basse. Aucune spec de cet écran ni de `specs/menu.md` ne prévoit d'écran Recherche comme destination de nav fixe, et la contrainte de nav (4 entrées fixes, jamais adaptatives par rôle) l'interdit de toute façon. La nav basse réellement rendue reste `Dashboard · Calendrier · Actus · Menu`, identique pour les deux rôles — exploration de maquette à ignorer, pas un point à trancher.

### Ce qui change par rôle (voir §2 « Variantes de rendu par rôle » — repris ici, pas redéfini)

- **Coach/Staff** : chaque ligne d'échéance porte la barre de réponses agrégée (`ResponseBar`, tri-segments + légende chiffrée). Jamais d'action Présent/Absent, jamais de pastille de réponse individuelle. Le bouton `+` visible en bas à droite de la maquette coach n'est **pas construit** (PO-CA-04, non demandé par cette passe) — absent, pas grisé.
- **Joueur/Joueuse** : chaque ligne porte **sa propre** réponse. Dans la fenêtre de réponse (`canPlayerRespond` vrai) : la paire `ResponseActions` (Présent/Absent, pleine largeur, déjà conforme `h-11`/`min-w-0`). Hors fenêtre ou échéance non `open` (passée, `closed`, `cancelled`) : la paire disparaît, remplacée par une pastille de statut en lecture seule (voir « Composant nouveau » ci-dessous) — jamais de bar, jamais de statut d'un tiers (AC-CA-04).
- **Responsable de section, Dirigeant habilité, Trésorier, Référent médical, Bénévole, Administrateur** : droit de consultation acquis en RBAC (§2) mais **aucune variante conçue ici** — `ActiveRoleProvider` ne connaît que `'coach' | 'player'` (PO-CA-06, dette déjà signalée). Rien à ajouter tant que ce point n'est pas résolu ; un compte multi-rôles atteint cet écran par l'un de ses deux rôles actifs, exactement comme les deux tableaux de bord.

### Structure de l'écran, de haut en bas

1. **En-tête** : titre « Calendrier », sous-titre mois + année (« Aoû 2026 »), lecture seule. **Aucun avatar, aucune pastille de rôle** à droite du titre (AC-CA-07) — contrairement aux deux exports, qui portent un cercle à initiales (« MB »/« CP ») avec point rouge : à retirer intégralement, y compris son point de notification (cohérent avec le récent retrait de la pastille de notification décorative des en-têtes, déjà fait ailleurs dans l'app).

2. **Navigateur de plage — composant nouveau, voir justification plus bas** : libellé de portée (« Cette semaine » / « Ce mois »), bascule à deux états **Sem | Mois**, chevrons précédent/suivant de part et d'autre.
   - **Mode Semaine** (état par défaut à l'ouverture, jour du jour sélectionné) : bande de 7 cellules (L à D), chaque cellule affiche la lettre du jour, le quantième, et, s'il existe au moins une échéance ce jour-là, jusqu'à 3 puces colorées reprenant **exactement** `CONVOCATION_TYPE_ACCENT` (vert entraînement / ambre réunion / rouge match — déjà le code couleur du reste de l'app, rien à réinventer), un « + » si une 4ᵉ existe. Le jour sélectionné porte un fond plein (couleur d'accent existante de l'app, pas une nouvelle couleur).
   - **Mode Mois** : grille du mois complet (jusqu'à 6 lignes de 7), mêmes puces par jour. Les cases avant le 1ᵉʳ du mois sont rendues en placeholders vides non interactifs (cadre discret), pas des jours du mois précédent cliquables — cohérent avec le fait que la portée de données reste la saison en cours (§1) et non un mois calendaire arbitraire.
   - Taper un jour le sélectionne et filtre la liste en dessous ; taper les chevrons déplace la semaine/le mois affiché.

3. **Liste des échéances du jour sélectionné** :
   - En mode Mois, un petit en-tête de section rappelle la date choisie (« 5 Aoû », comme l'export `_2`) puisque la grille peut être scrollée hors de vue ; en mode Semaine, pas d'en-tête répété, la bande de jours reste la référence visuelle immédiate au-dessus (comme les exports `_1`/`_3`/`_4`).
   - Chaque ligne reprend **la forme déjà posée par `UpcomingList`/`UpcomingConvocationList`** (liseré coloré par type, libellé de type en gras, sous-ligne date/heure/lieu via `formatEventSchedule`/`ScheduleInfo`) — c'est la version longue de cette même ligne, pas une nouvelle ligne. **Aucune icône emoji** (⚽/📋/🏆) : les deux composants existants n'en portent pas, le liseré coloré porte déjà cette information textuellement doublée par le libellé — ne pas ajouter ce que la maquette montre en plus.
   - Pour un match : ajout de l'adversaire et du chip RDV via `ScheduleInfo` (AC-CA-02) — **absent des 4 échéances de la maquette coach** (son jeu de données ne peuplait pas ces champs), à ajouter quand même, la spec le demande explicitement.
   - Pastille `StatusBadge` (`closed`/`cancelled`, jamais pour `open`, AC-CA-16) en haut à droite de la ligne, réutilisée telle quelle.
   - Bloc de réponse en bas de ligne, selon le rôle (voir section précédente) : `ResponseBar` (coach) ou `ResponseActions`/pastille en lecture seule (joueur).
   - Toute la ligne reste tappable vers `convocations/:id` (AC-CA-12), sauf la zone des boutons Présent/Absent eux-mêmes (déjà le comportement de `ResponseActions`, qui gère son propre `onClick` — pas un nouveau mécanisme à concevoir).

4. **États vides (AC-CA-11)** :
   - Aucune équipe / aucune saison en cours / aucune échéance dans toute la portée de l'utilisateur : le navigateur de plage n'a pas de sens à afficher (rien à parcourir) — écran réduit au titre + `EmptyState` (icône + message centré, composant déjà existant), pas de bande de jours vide.
   - Le jour/la semaine/le mois sélectionné n'a aucune échéance, mais l'utilisateur en a ailleurs dans sa portée : le navigateur de plage reste affiché, seule la zone de liste porte un message centré simple (« Aucun événement ce jour », export `_4`) — plus léger que le plein `EmptyState`, pour ne pas donner l'impression que tout l'écran est vide alors que d'autres jours ont du contenu.

### Composant nouveau

**1. Navigateur de plage Semaine/Mois** (nom proposé `CalendarRangeNav`) — **seul patron réellement inédit de cet écran**, à justifier puisque la consigne est de réutiliser avant d'inventer : aucun des composants listés en §6 de cette spec (`UpcomingList`, `ResponseBar`, `ResponseActions`, `ScheduleInfo`, `EmptyState`, `StatusBadge`) ne couvre une sélection de date ou une navigation temporelle — ils rendent tous une ligne ou un état, jamais un calendrier. Les 5 maquettes le montrent de façon cohérente et systématique (bascule Sem/Mois, bande de jours à puces, grille mensuelle à puces), ce qui en fait un patron d'écran établi pour Calendrier plutôt qu'une improvisation d'un seul export — traité comme tel. États à couvrir : semaine avec/sans jour sélectionné ayant des échéances, mois avec cases de bourrage en tête de grille, jour sélectionné hors de la saison en cours (voir question ouverte 2).

**2. Pastille de réponse en lecture seule** (nom proposé `ResponseStatusPill`, ou un troisième mode de `ResponseActions`) — extension mineure plutôt qu'un composant entièrement neuf, mais listée séparément parce que `ResponseActions` ne rend aujourd'hui, quand `canRespond` est faux, qu'**une ligne de texte pleine largeur** (« Vous avez répondu : absent ») ou rien du tout — jamais la pastille compacte alignée à droite que montre l'export `_3` et que **PO-CA-02 a explicitement tranchée** comme le patron à suivre pour les échéances passées de cet écran (§5). Trois états, toujours doublés d'un libellé (AC-CA-17) : `présent` (pastille pleine, ton vert — même famille que `ResponseBar`/`ResponseActions`), `absent` (pastille pleine, ton rouge), et `myResponse === null` — **cas non montré par la maquette** — pastille neutre « Sans réponse » (même famille neutre que `StatusBadge` pour `closed`). Réutilise les tokens de couleur déjà en place, n'en introduit aucun nouveau.

### Contraintes tactiles mobiles (CLAUDE.md §6, AC-CA-19) — spécifiques au nouveau navigateur

- **Bande de jours (mode Semaine)** : 7 cellules sur la largeur de l'écran (~50px chacune sur un iPhone SE à 375px) — largeur suffisante, mais chaque cellule doit recevoir `min-w-0` dans son conteneur flex/grid (les puces + le quantième ne doivent pas forcer une largeur intrinsèque supérieure à la piste) et une hauteur plancher `min-h-11` malgré son contenu court (lettre + chiffre + puces) — à vérifier sur un viewport 360–375px réel, pas une fenêtre desktop réduite.
- **Grille du mois** : jusqu'à 7 colonnes × 6 lignes sur un même écran — chaque cellule doit rester ≥44px dans les deux dimensions ; la cible tactile est la cellule entière, pas seulement le glyphe du quantième.
- **Bascule Sem | Mois + chevrons** : les chevrons sont dessinés ~32px sur la maquette — à porter à `h-11 w-11` (cercle) ; chaque segment de la bascule reçoit `min-w-0`.
- **`ResponseActions` et le reste des composants réutilisés** sont déjà conformes (existants, `h-11`/`min-w-0` déjà en place) — rien à revérifier au-delà de leur intégration dans la nouvelle ligne.

### Segmentation « À venir » / « Passées » — réponse à PO-CA-02, sous-question (a)

**Pas de segmentation par onglets supplémentaire.** Le navigateur de plage donne déjà un accès direct à n'importe quelle date passée (chevron précédent, ou sélection dans la grille du mois) ; ajouter un second niveau de segmentation « À venir »/« Passées » par-dessus serait redondant avec cette navigation par date. La distinction lecture-seule reste portée par le composant de ligne lui-même (paire de boutons → pastille), comme la développeuse l'a tranché — cette section referme donc explicitement la sous-question (a) laissée ouverte en §6.

### Questions ouvertes UI

1. **Marqueur « aujourd'hui »** : les 5 exports ne montrent que le cas où le jour sélectionné est aussi aujourd'hui. Une fois qu'un autre jour est sélectionné (bascule de semaine, ou mois différent), faut-il un repère visuel secondaire distinguant « aujourd'hui » de « jour sélectionné » ? Non tranché par la maquette.
2. **Bornes de navigation** : les chevrons précédent/suivant doivent-ils être désactivés/masqués une fois sortis de la saison en cours (§1, « aucune échéance d'une saison antérieure »), ou simplement mener à l'état vide « Aucun événement ce jour » sans erreur ? Recommandation : la seconde option, plus simple et déjà couverte par AC-CA-11 — à confirmer par la développeuse plutôt que deviné ici.
3. **Registre `DESIGN_LINKS.md` §5** : le déclencheur « colonne `Variante` à la 3ᵉ occurrence d'une feature multi-rôles » est atteint avec `calendar` (après `match_details_page`, `profile-page`) — arbitrage renvoyé à la développeuse par le registre lui-même, pas tranché ici.
