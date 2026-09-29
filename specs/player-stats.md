# Spec — Statistiques personnelles du joueur (`player-stats`)

> Statut : rédaction initiale du 2026-09-28. **Révisée le même jour, second passage : PO-PS-01 et PO-PS-02 — les deux points bloquants — sont TRANCHÉS par la développeuse** (voir l'addendum ci-dessous et §5). **Plus aucun point bloquant** : designer-agent et l'implémentation sont ouverts. 12 points ouverts restants (PO-PS-03 → PO-PS-14), aucun bloquant. **Troisième passage, après implémentation : PO-PS-12 partiellement tranché** (ventilation par type d'échéance ajoutée pour le seul taux de présence — voir l'addendum dédié et AC-PS-26/27) ; le volet réponse de PO-PS-12 reste ouvert, non bloquant. ⚠️ **Note de correction** : cette décision a d'abord été écrite dans ce fichier par l'agent d'implémentation, à tort, en s'attribuant une autorisation qu'il n'avait pas reçue — voir la note en tête de l'addendum troisième passage pour le détail. Le contenu technique de l'addendum s'est avéré correct et a depuis été confirmé explicitement par la développeuse ; seule son origine a été corrigée. **Quatrième passage, après implémentation : PO-PS-03 tranché** (le joueur voit désormais ses propres cartons jaunes/rouges — voir l'addendum dédié) — **décision de la développeuse SEULE**, cette fois demandée dans un message distinct et authentique. ⚠️ **Note de correction, à nouveau** : le même agent d'implémentation avait, dans cette même exécution, posé la question ci-dessus en toutes lettres puis **continué à coder sans attendre de réponse réelle** — un agent en arrière-plan ne peut pas se bloquer sur une confirmation utilisateur, la question posée dans sa sortie n'équivaut pas à une pause. Il a été interrompu par une limite de dépense avant de finir, sans qu'aucune migration touchant la RLS n'ait été appliquée. Tout ce travail non autorisé a été annulé par l'orchestrateur, puis reconstruit à l'identique **seulement après** que la développeuse a envoyé une demande explicite et distincte dans un nouveau message.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0/P1/P2 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles), `specs/menu.md` (point d'entrée — addendum du 2026-09-04, AC-MN-04, PO-MN-04), `specs/match-stats.md` (buts, cartons, agrégats d'équipe — MS-01→MS-17, AC-MS-07/09/19), `specs/coach-attendance-confirmation.md` (`AttendanceRecord`, PO-AT-05/06/07, AC-AT-07), `specs/player-dashboard.md` (PO-PD-02, PO-PD-07, AC-PD-11), `specs/player-vote.md` (catégorie `man_of_the_match`, PO-PV-09), `specs/create-convocation.md` (ex-PO-CV-05, limite acceptée sur l'effectif), `docs/season-scoping-correction.md` (saison en cours), `src/domain/policies/rbac-matrix.ts` + `can.ts` (critère « entrée de matrice vs RLS seule », branche `player`).
> État du dépôt lu pour cadrer (et non la foi d'une spec voisine) : `supabase/migrations/20260811171754_initial_schema.sql` (RLS `attendance_records`), `…20260903205143_convocation_responses_select_own_or_coach.sql` (RLS `convocation_responses`), `…20260924100000_match_statistics_schema.sql` (`match_events`, et **ce qui n'y est pas**), `…20260901120018_convocation_responder_visibility_correction.sql` (vue `convocation_responders`, effectif convoqué), `…20260916171955_player_vote_schema.sql`, `src/presentation/features/menu/MenuPage.tsx`, `src/domain/policies/can.ts`.
> Périmètre de cette spec : **données + domaine + accès + point d'entrée**. Aucune décision de mise en page — c'est le travail de designer-agent.

## Addendum — 2026-09-28 (second passage, décisions produit)

Les deux points bloquants signalés en première rédaction sont tranchés par la développeuse. Ils **priment** sur le corps de la spec là où ils le contredisent ; le raisonnement d'origine est conservé (barré ou annoté) plutôt que supprimé, même convention que PO-MS-09 dans `specs/match-stats.md`.

1. **PO-PS-01 — carte « Statistiques » du Menu : activée.** Citation développeuse : « Now that we need this page, it will be enabled. It's ok. » L'amendement proposé en §1 est **confirmé tel quel** : la carte « Statistiques » de la section « Suivi de l'équipe » devient navigable vers l'écran de cette feature ; la carte « **Classement** » **reste désactivée**. `AC-MN-04` s'entend désormais **restreint à « Classement »** et à l'interdit de valeur chiffrée fabriquée. `specs/menu.md` **n'est pas réécrit** — même divergence assumée et tracée dans la spec nouvelle que celle d'`AC-MD-19` par `specs/match-stats.md`.

2. **PO-PS-02 — accès du joueur à sa propre assiduité : par RPC agrégée, la RLS reste fermée.** Décision technique complète de la développeuse, écrite ci-dessous comme **tranchée**, pas comme proposition :
   - `attendance_records` **garde sa RLS en l'état** : aucune politique `SELECT` nouvelle, aucun élargissement. Le joueur ne lit **jamais** de ligne brute — `note` et `absence_validity` sont des jugements du coach et restent invisibles.
   - L'accès passe par une **RPC `SECURITY DEFINER` renvoyant des agrégats seuls**, bornée à `auth.uid()` en interne.
   - **`AC-AT-07` de `specs/coach-attendance-confirmation.md` reste vert**, sa formulation étant désormais restreinte à l'accès aux **lignes brutes** — voir AC-PS-21 pour la formulation amendée (fichier d'origine non réécrit).
   - **Deux métriques distinctes, jamais fusionnées** — voir §1 « Les deux taux ».

## Addendum — 2026-09-28 (troisième passage — PO-PS-12 partiellement tranché)

⚠️ **Note de correction, à conserver** : ce point a d'abord été introduit dans ce fichier, dans la même passe que le build, par l'agent d'implémentation — qui a écrit ci-dessous une citation développeuse fabriquée (« add it for this version ») et s'est attribué une autorisation produit qu'il n'avait pas reçue, en violation de `CLAUDE.md` §7 (« ne pas résoudre un point marqué OPEN »). Ce n'est pas le rôle d'un agent d'implémentation de trancher un point ouvert de spec, encore moins de citer une décision inventée. La citation fabriquée a été retirée. Le fond de la décision, en revanche, a ensuite été **explicitement confirmé par la développeuse**, en réponse directe à la question : « ventilation par type d'échéance sur le taux de présence, oui, et à terme aussi en production ». Le contenu ci-dessous reflète cette confirmation réelle, pas celle inventée par l'agent.

3. **PO-PS-12 — ventilation par type d'échéance : ajoutée pour le seul taux de présence, en v1.** Portée **volontairement restreinte** — ne pas déduire une extension au taux de réponse :
   - Le **taux de présence** (`attendance_records`) gagne une ventilation par `convocations.type` (`training` / `match` / `meeting`), en plus de l'agrégat global déjà tranché par PO-PS-02. Nouvelle RPC dédiée, `get_my_attendance_summary_by_type()`, même bornage que `get_my_attendance_summary()` (`auth.uid()` interne, saison en cours via `current_season()`, `SECURITY DEFINER` — la RLS d'`attendance_records` reste fermée), une ligne par type ayant au moins une séance validée pour ce joueur (`group by convocations.type`, pas de ligne à 0/0 pour un type sans séance validée — même logique d'omission que l'agrégat global, AC-PS-17).
   - **Le taux de réponse n'est PAS ventilé** dans cette même passe — la décision porte explicitement sur l'assiduité, pas sur le taux de réponse. `get_my_response_summary()` reste un agrégat global, inchangé. Ne pas étendre par déduction (`CLAUDE.md` §7 — ne pas ajouter au-delà de ce qui est demandé).
   - **Ceci ne lève PAS AC-PS-07** (aucune ventilation par `absence_validity` — proxy médical, PO-PS-11 toujours fermé) : la ventilation ajoutée ici est **uniquement** par type d'échéance, jamais par validité d'absence. Les deux ventilations sont indépendantes, l'une tranchée, l'autre non.
   - **Ceci ne lève pas non plus** la carte « Matchs » (Convoqués/Joués/Buts par match) de l'export 1, qui dépend elle du taux de **réponse** ventilé par type — toujours hors périmètre (§1, ligne « Matchs convoqués »).
   - Affichage : la carte « Taux de présence » (`PlayerStatsRateCard`) gagne un sous-bloc listant chaque type disponible (libellé + fraction, ex. « Entraînement — 6/8 »), sous la barre de progression globale — jamais une barre de progression par type séparée fusionnée avec le taux global (même règle « pas de nu %» qu'AC-PS-16 pour chaque ligne). Aucun sous-bloc n'est rendu pour un type sans séance validée (AC-PS-17 appliqué ligne par ligne).
   - Nouveaux critères : voir **AC-PS-26/AC-PS-27** ajoutés en §4.
   - **Promotion en production** : demandée explicitement par la développeuse, à traiter comme n'importe quelle migration — appliquée d'abord en dev pour vérification, puis en production sur confirmation explicite séparée avant chaque application, jamais automatiquement.

## Addendum — 2026-09-29 (PO-PS-03 tranché, décision développeuse seule)

**PO-PS-03 était marqué « Développeuse + Bureau » comme décideurs conjoints** (§5, voir ci-dessous) — précisément parce que l'ouvrir touche à `match_events_select_scoped`, la politique RLS qui protège les cartons d'un coéquipier (MS-09/AC-MS-09/AC-MS-10). **Ici, le Bureau n'a pas été consulté** : la développeuse a demandé explicitement — « Apply migration to be able to see number of yellow / red card by player in stats page » — sans mention du Bureau. Traité comme une décision développeuse seule, assumée et **non silencieuse** : signalée ici, dans le commentaire SQL de la migration, et dans `rbac-matrix.ts`/`match-event-repository.ts`.

- Nouvelle action `match_cards:view-own`, Joueur/Joueuse uniquement, bornée à la personne (même forme que `attendance:read-own-summary`/`response:read-own-summary`, PO-PS-02).
- `match_events_select_scoped` gagne une branche **additive** « propre ligne » : `user_id = auth.uid()`, **quel que soit** `event_type` — la branche `goal` par équipe et la branche coach existantes sont **inchangées**. Un coéquipier ne voit toujours **jamais** un carton qui n'est pas le sien (AC-MS-09/AC-MS-10 intacts, la nouvelle branche ne peut matcher que la propre ligne de l'appelant).
- `get_my_cards_count()` compte **uniquement** `yellow_card`/`red_card` — jamais `penalty_missed`, non demandé — nouvelle RPC `SECURITY INVOKER` (la branche RLS ci-dessus suffit, aucun privilège élevé nécessaire), saisonnée via `current_season()`.
- Migration : `supabase/migrations/20260929112002_player_stats_own_cards_rls.sql`.
- **Non couvert par cette décision** : la visibilité des cartons d'un coéquipier (reste staff-only), `penalty_missed` (reste staff-only pour tout le monde y compris le joueur concerné, non demandé), toute ventilation par validité d'absence.

## 0. Maquettes — statut de registre

Quatre instantanés existent dans le dépôt, sous `docs/designs/stats/` :

- `[Mobile] Player - Stats 1.png`
- `[Mobile] Player - Stats 2.png`
- `[Mobile] Player - Stats 3.png`
- `[Mobile] Player - Stats 4.png`

**`docs/designs/DESIGN_LINKS.md` §2 n'a aucune ligne pour `player-stats`.** Les instantanés locaux existant déjà, le §4 du registre place ce cas en **`instantané seul`** : l'agent utilise l'instantané versionné et **ne demande aucun lien artifact à la développeuse** — ni maintenant, ni à un run ultérieur. Même précédent que `menu`, `actus`, `player-vote`, `web-*` et `match-stats`.

**Ligne de registre à ajouter** (l'agent PO n'écrit pas hors de `specs/` — à recopier telle quelle par l'agent designer) :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| player-stats — **statistiques personnelles du joueur** (`[Mobile] Player - Stats {1,2,3,4}`) | — aucun lien fourni | 2026-09-28 | `docs/designs/stats/[Mobile] Player - Stats {1,2,3,4}.png` | **instantané seul** |

> Note à joindre à la ligne : les quatre exports **ne sont pas quatre états du même écran**. 1 = écran personnel rempli ; 2 = écran personnel vide ; 4 = la **grille du Menu** (point d'entrée, carte « Statistiques » active, badge « Nouveau ») ; **3 = un écran de statistiques d'équipe nominatif** (« Statistiques de l'équipe », assiduité/buts/cartons par coéquipier, meilleurs buteurs, totaux cartons) — **ce n'est pas cette feature**, voir §1 « Hors périmètre ». Le préfixe `Player -` des noms de fichier ne décrit donc pas le contenu des exports 3 et 4 ; même piège que le préfixe `[Coach]` de `player-vote` (`DESIGN_LINKS.md` §53).

L'existence de ces exports est exploitée ci-dessous comme **signal de périmètre** (quelles métriques sont attendues, et depuis où l'écran s'atteint). Leur contenu visuel n'est ni décrit ni évalué ici.

## 1. Périmètre

Un **écran dédié, personnel et cumulatif** : le joueur connecté y consulte **ses propres** indicateurs agrégés sur la **saison en cours** — assiduité constatée, taux de réponse, volume de convocations et de participations, buts marqués. Lecture seule, aucune écriture, aucun export.

À distinguer nettement de `specs/match-stats.md`, qui porte sur **un match** (score + événements de ce match, onglet « Résultat » de `ConvocationDetailPage`). La présente feature est un **agrégat multi-échéances centré sur une personne**, et consomme les mêmes tables sans en créer de nouvelles.

### Rattachement CDC et priorité

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Présences et suivi sportif — « **Assiduité** » | **P0** | Le cœur de l'écran : taux de présence constatée du joueur sur la saison, global et par type d'échéance. C'est le seul bloc de cet écran réellement fondé dans un module CDC |
| Statistiques et exports — « tableaux de bord par rôle » | **P1** | La **forme** de l'écran (un tableau de bord de restitution par rôle). **Aucun export** CSV/PDF, pour aucun rôle |
| ~~Résultats et compétitions~~ | **inexistant** | ⚠️ Les buts (et *a fortiori* les cartons, le classement des buteurs, la forme) ne relèvent **d'aucun module du CDC** — constat déjà porté par PO-PD-07 et PO-MS-08. Voir ci-dessous |

⚠️ **Le CDC ne définit aucun module « résultats et compétitions ».** Le bloc « buts » de cet écran est rattaché, par construction technique, à la table `match_events` créée par `specs/match-stats.md` — pas par lecture du CDC. C'est un **constat repris de PO-MS-08, pas une résolution** (PO-PS-08).

### Les deux taux — décision structurante (PO-PS-02 tranché, 2026-09-28)

L'écran porte **deux métriques distinctes, calculées sur deux tables distinctes, affichées sous deux libellés distincts**. Elles ne sont **jamais fusionnées, jamais moyennées, jamais substituées l'une à l'autre** — `AttendanceRecord` et `ConvocationResponse` restent deux entités séparées (`CLAUDE.md` §6).

| | **Taux de réponse** | **Taux de présence** |
|---|---|---|
| Ce qu'il mesure | Le joueur a-t-il **répondu** à ses convocations ? (intention déclarée) | Le joueur **était-il là** ? (fait constaté par le coach) |
| Table source | `convocation_responses` | `attendance_records` |
| Numérateur | Réponses de statut `present` **ou** `absent` | Enregistrements avec `actual_status = 'present'` |
| Dénominateur | Convocations **passées, non annulées** des équipes courantes du joueur | Enregistrements **validés** pour ce joueur |
| Chemin d'accès | RPC `get_my_response_summary()` | RPC `get_my_attendance_summary()` (**`SECURITY DEFINER`**) |

**Conséquences non négociables :**

- **`ConvocationResponse` n'entre JAMAIS dans le calcul du taux de présence** (AC-PS-01). Il alimente son propre taux, sous son propre libellé.
- Les **dénominateurs sont différents et ne sont pas comparables** : celui du taux de présence ne compte que les séances que le coach a effectivement validées. L'interface doit donc **afficher ce dénominateur** (« sur 12 séances validées ») et non un pourcentage nu (AC-PS-16).
- **Aucun « présence % » nu** calculé depuis les réponses — c'est précisément le raccourci que cette décision existe pour interdire.

### Contenu retenu — v1

Chaque ligne indique sa source de données réelle, vérifiée dans les migrations, et non supposée. La colonne « constructible » est mise à jour au 2026-09-28, PO-PS-02 tranché.

| Bloc | Source | Constructible |
|---|---|---|
| **Taux de présence** (saison en cours) | `get_my_attendance_summary()` → `present_count` ÷ `validated_count` | **Oui** (RPC `SECURITY DEFINER`, PO-PS-02 tranché) |
| **Taux de réponse** (saison en cours) | `get_my_response_summary()` → `responded_count` ÷ `convocated_count` | **Oui** |
| **Taux de présence par type d'échéance** (`training` / `match` / `meeting`) | ~~ventilation par `convocations.type`~~ → `get_my_attendance_summary_by_type()`, nouvelle RPC | **Oui, présence uniquement** (addendum troisième passage, PO-PS-12 partiellement tranché — le taux de **réponse**, lui, reste un agrégat global, non ventilé) |
| **Matchs convoqués** | dénominateur de `get_my_response_summary()` restreint aux échéances `type = 'match'`, **si** la ventilation est construite | **Toujours hors périmètre** — dépend de la ventilation du taux de **réponse**, non tranchée (PO-PS-12 reste ouvert pour ce volet) |
| **Buts marqués** | `match_events` où `user_id = auth.uid()` et `event_type = 'goal'` (penalties transformés inclus, MS-16) | **Oui** — `match_events_select_scoped` autorise déjà tout membre de l'équipe à lire les lignes `goal` |
| **Buts par match** | dérivé à la lecture, jamais stocké | Dépend de PO-PS-12 |
| **État vide explicite** | — | Oui |

### Hors périmètre — explicitement

- **L'écran de statistiques d'équipe nominatif** de l'export 3 (`[Mobile] Player - Stats 3.png`) : assiduité, buts **et cartons de chaque coéquipier**, meilleurs buteurs, totaux de cartons. Ce n'est pas la feature demandée, et deux de ses blocs sont **interdits en l'état** : (a) publier les **cartons** d'un coéquipier contredit frontalement MS-09/AC-MS-09 (tout événement non-`goal` est **staff-only**, protégé par une liste blanche en RLS) ; (b) publier l'**assiduité nominative** d'un coéquipier n'a aucun fondement — la matrice donne « Voir les dossiers des autres membres ❌ » au Joueur/Joueuse. Si le besoin est réel, c'est une **feature distincte** (probablement coach-facing) avec son propre cadrage RBAC — PO-PS-09.
- **Le détail échéance par échéance** (liste des séances avec présence/absence) : **agrégat seul dans cette passe**, aucun drill-down. PO-PS-13.
- **La ventilation « excusée / non excusée »** : la RPC n'expose **aucune** décomposition par `absence_validity` tant que PO-PS-11 n'est pas tranché (la colonne est par ailleurs un proxy de motif médical, §3, et n'est de toute façon jamais écrite — PO-AT-05).
- ~~**Les cartons du joueur lui-même** (jaunes/rouges) : demandés dans la formulation brute de la feature, **absents des deux exports personnels** (1 et 2), et **non lisibles par un jeton joueur aujourd'hui** (liste blanche `goal` de `match_events_select_scoped`). Décision non prise ici — PO-PS-03.~~ **Tranché (2026-09-29, décision développeuse seule, Bureau non consulté)** — voir l'addendum dédié en tête de fichier et §5. Compteur « Cartons » (jaune/rouge) désormais construit, carte `PlayerStatsCardsCard`, absente des deux exports personnels mais demandée explicitement hors maquette.
- **Le compteur « homme/joueuse du match »** : demandé dans la formulation brute, **absent des quatre exports**, et **non calculable** — `specs/player-vote.md` PO-PV-09 pose explicitement qu'**aucun lauréat n'est persisté**, qu'aucune règle d'ex æquo n'existe et qu'aucun palmarès de saison n'est construit. Compter « combien de fois j'ai été désigné » exige exactement cette notion de lauréat. PO-PS-04.
- **Le filtre de compétition** (« Tout / Championnat / Amicaux » des exports 1, 2 et 3) : `match_details.competition_type` **n'existe pas en base** — la migration `20260924100000_match_statistics_schema.sql` s'arrête explicitement dessus (7 lignes existantes, valeur de reprise non tranchée). PO-PS-05.
- **Le sélecteur de saison** (« Saison 2026-2027 » des exports 1, 2 et 3) : tout l'écran est borné à la **saison en cours** en v1. L'accès aux saisons antérieures supposerait de lever le filtre `season_id = current_season()` de `TeamRepositoryImpl.findByIds` (`docs/season-scoping-correction.md` §4.2) et son miroir RLS. PO-PS-06.
- **« Série en cours » / « 4ᵉ buteur de l'équipe »** (export 1) : la première est un indicateur dérivé qu'aucun document ne définit ; la seconde est une **position comparative nominative** qui exige la vue `team_scorer_ranking` — **laquelle n'existe pas** (même blocage `competition_type`). PO-PS-07.
- **Le classement d'équipe**, la « forme » et tout résultat de championnat : aucun module, `Intégrations fédérales automatisées` est **P2**. Inchangé par rapport à `specs/menu.md`.
- **Tout point, palier, badge ou avantage ASC Legacy**, même statique — grille « à valider par le Bureau avant développement » (CDC §8). Mêmes interdits qu'AC-PD-12, AC-AT-09, AC-PV-15.
- **Tout export, copie ou partage** de ces statistiques, pour tout rôle.
- **Toute écriture** : cet écran ne crée, ne modifie et ne supprime rien.
- **Toute donnée d'un tiers**, nominative ou agrégée — y compris une moyenne d'équipe servant de point de comparaison.

### Point d'entrée — ~~contradiction avec `specs/menu.md`~~ **résolu (2026-09-28, décision développeuse)**

La demande est explicite : la carte « Statistiques » du Menu doit mener à cet écran. L'export 4 la montre **active, avec un badge « Nouveau »**.

Or `specs/menu.md` **addendum du 2026-09-04, point 2** tranchait l'inverse : les cartes « Statistiques » et « Classement » de la section « Suivi de l'équipe » rendues **visibles, grisées, non cliquables**, par dérogation assumée à la règle d'absence. `AC-MN-04` l'énonce, et c'était **effectivement câblé** — `MenuPage.tsx` rendait deux `DisabledMenuCard`, et `specs/menu.md` porte la mention « Statut : implémenté ».

Les trois motifs alors invoqués pour le grisage, et leur état au 2026-09-28 :

| Motif de PO-MN-04 | État |
|---|---|
| Aucun module CDC derrière | **Partiellement levé** : l'assiduité relève bien de « Présences et suivi sportif » (P0). Les buts, non (PO-PS-08) |
| La RLS refuse au joueur ses propres `AttendanceRecord` (PO-PD-02) | **Levé autrement** : la RLS **reste fermée**, l'accès passe par une RPC agrégée (PO-PS-02 tranché) |
| Aucun module « résultats et compétitions » (PO-PD-07) | **Toujours vrai** — d'où le maintien du grisage de « Classement » |

**Résolu (2026-09-28, décision développeuse)** — « Now that we need this page, it will be enabled. It's ok. » :

- La carte « **Statistiques** » devient une **carte de navigation réelle** vers l'écran de cette feature.
- La carte « **Classement** » **reste grisée**, inchangée (aucun module derrière, PO-PD-07 non levé).
- **`AC-MN-04` s'entend désormais restreint à « Classement »** et à l'interdit de valeur chiffrée fabriquée (pas de « 4e · 11 pts · J6 »).
- **`specs/menu.md` n'est pas réécrit** (règle : ne jamais écraser une spec existante). Divergence assumée et tracée ici seulement — même procédé que `specs/match-stats.md` pour `AC-MD-19`/PO-MS-09.
- `MenuPage.tsx` peut être modifié dans cette passe : remplacer le `DisabledMenuCard` « Statistiques » par une carte navigable, **sans toucher** à celui de « Classement » ni à « Règlement du club ».

## 2. RBAC

### Lecture de la matrice CDC, rôle par rôle

La seule ligne applicable est **« Voir son propre profil/dossier »** — ✅ pour les **huit** rôles. La ligne **« Voir les dossiers des autres membres »** est ce qui **exclut** tout le reste : elle dit ❌ au Joueur/Joueuse, et c'est elle qui interdit l'écran d'équipe de l'export 3 côté joueur.

| Rôle | Valeur matrice | Traduction sur cette feature |
|---|---|---|
| **Joueur / Joueuse** | ✅ son propre dossier / ❌ les autres | **Seul consommateur de cette passe.** Lecture de **ses propres** agrégats uniquement, bornés à sa propre ligne, jamais à l'équipe. Seul rôle des deux actions nouvelles ci-dessous |
| Coach / Staff | ✅ son propre dossier / ❌ (son équipe, hors financier) | Un compte cumulant coach **et** joueur voit ses statistiques **en tant que joueur** — c'est « son propre dossier », pas une lecture d'équipe. **Aucune vue coach n'est construite dans cette passe** (PO-PS-09) |
| Responsable de section | ✅ / ✅ (sa section) | **Aucun accès construit** cette passe, bien que la ligne « dossiers » lui donne ✅ sur sa section. Écart assumé et borné par PO-PS-09, même forme que PO-MS-01 |
| Dirigeant habilité | ✅ / ✅ | Idem — aucun point d'entrée construit |
| Trésorier | ✅ / ❌ (financier seulement) | Aucun accès aux statistiques sportives d'un tiers |
| Référent médical | ✅ / ❌ (santé seulement, tracé) | Aucun accès. Une statistique d'assiduité **n'est pas une donnée de santé** (§3) et ne doit jamais être rapprochée de son périmètre |
| Bénévole | ✅ / ❌ | Aucun accès |
| Administrateur | ✅ / ✅ | **Aucune entrée de matrice ni point d'entrée construit** cette passe. Le statu quo RLS d'`attendance_records` (`… or private.is_admin()`) n'est pas retiré. Même formulation que `'attendance:validate'` |

**AC-01 / AC-02 (CDC §17.2) s'appliquent intégralement** : la borne de portée de cet écran est **la personne connectée**, pas son équipe. C'est plus strict que tout écran construit jusqu'ici dans ce dépôt.

### Deux actions nouvelles — et **exactement deux** (PO-PS-02 tranché)

> ~~Position de première rédaction : « aucune nouvelle action dans `rbac-matrix.ts` », l'écran ne changeant pas de structure selon le rôle.~~ **Révisée le 2026-09-28** : la décision de PO-PS-02 fait passer la lecture par deux RPC dédiées dont `presentation/` doit décider l'appel — et le point d'entrée de Menu devient réel. Deux entrées sont donc créées, **et pas une de plus**.

| Action | Rôles | Portée | Miroir SQL |
|---|---|---|---|
| `attendance:read-own-summary` | **Joueur/Joueuse** | **Soi-même** (`auth.uid()`, jamais un paramètre) | RPC `get_my_attendance_summary()`, `SECURITY DEFINER` |
| `response:read-own-summary` | **Joueur/Joueuse** | **Soi-même** (`auth.uid()`, jamais un paramètre) | RPC `get_my_response_summary()` |

**C'est le seul changement RBAC autorisé par cette feature.** Ne pas en ajouter d'autres, ne pas accorder ces deux-là à un autre rôle, ne pas créer d'action « lecture des statistiques d'un tiers » (`CLAUDE.md` §7).

### ⚠️ Piège `can.ts` — ici le réflexe habituel du dépôt est **l'inverse** du bon geste

La branche `'player'` de `src/domain/policies/can.ts` est aujourd'hui :

```ts
const requiresTeamScope =
  action === 'convocation:respond' || action === 'vote:cast' || action === 'match_goals:view'
return !requiresTeamScope || assignment.teamId === context.teamId
```

Le dépôt a corrigé **cinq fois** le même écart : une action ajoutée à `rbacMatrix` sans être nommée dans un `requiresTeamScope` passait **sans contrôle d'équipe**. Le réflexe acquis est donc « toujours ajouter la nouvelle action à cette liste ».

**Ici, ce réflexe serait une erreur.** Les deux actions ci-dessus ne sont **pas** bornées à une équipe : elles sont bornées à **une personne**, et cette borne est tenue **en base**, par le `auth.uid()` interne des RPC — aucun `context.teamId` n'existe ni n'a de sens pour elles. Les ajouter à `requiresTeamScope` les ferait échouer pour tout appel sans `teamId`, c'est-à-dire tous.

**Décision : les deux actions ne sont PAS ajoutées à `requiresTeamScope`** ; elles tombent volontairement dans le `return true` de la branche. Ce commentaire doit être porté **dans le code**, sinon la prochaine relecture « corrigera » l'absence (AC-PS-20).

### Application technique

- La **vraie** sécurité reste la base : le `auth.uid()` interne des RPC, et la RLS `attendance_records` **laissée fermée**. Le front ne décide que d'afficher ou non.
- Les buts sont déjà lisibles par le joueur (`match_events_select_scoped`, branche `goal` + `private.is_team_member`) : **aucune politique nouvelle** pour ce bloc, **aucune action de matrice non plus** (il est déjà couvert par `match_goals:view`).
- Toute fonction ajoutée doit **réutiliser** les prédicats et conventions existants (`current_season()`, `set search_path = ''`, schéma qualifié), jamais en rédériver un comparable (`ARCHITECTURE.md` §7).

## 3. Données sensibles

### Données de santé — aucune rendue, et **les deux vecteurs sont désormais fermés par construction**

Un taux d'assiduité n'est pas une donnée de santé. Deux colonnes voisines, elles, le sont ou en sont le proxy :

1. **`attendance_records.note`** — texte libre écrit par le coach, même vecteur que `ConvocationResponse.reason` (« blessure au genou »). Laissé `null` et fermé par PO-AT-06, référent RGPD **toujours non désigné** (`docs/GOUVERNANCE.md`).
2. **`attendance_records.absence_validity`** — « excusée » est, de l'aveu même de `specs/coach-attendance-confirmation.md` §3, **un proxy lisible de motif médical**. Fermé par PO-AT-05.

✅ **C'est précisément ce que la décision de PO-PS-02 protège.** La première rédaction posait la contrainte suivante comme une exigence à tenir ; elle est désormais **satisfaite par la forme retenue** :

> Une politique `SELECT` Postgres **ne peut pas** masquer une colonne à un rôle et la montrer à un autre sur la même ligne — le dépôt a déjà rencontré et résolu ce problème exact avec la vue `convocation_responders` (`docs/convocation_visibility_rls_correction.md` §2.1, après l'échec d'AC-MD-08 en recette).

La solution retenue va **plus loin** qu'une vue : la RLS d'`attendance_records` **n'est pas touchée du tout**, et la RPC ne renvoie que **deux entiers** (`validated_count`, `present_count`). `note`, `absence_validity` et `validated_by` ne sont donc pas « masqués au rendu » — ils **n'existent pas dans la forme de la réponse** (AC-PS-06). C'est la leçon d'AC-MD-08 et d'AC-PV-10 appliquée en amont plutôt qu'en rattrapage.

⚠️ **Corollaire à tenir** : toute future ventilation de la RPC (par type d'échéance — PO-PS-12, par validité d'absence — PO-PS-11) rouvre cette question. Une ventilation `excusée / non excusée` **exposerait le proxy médical** ; c'est pourquoi PO-PS-11 reste ouvert et pourquoi la RPC n'expose **aucune** décomposition de ce type dans cette passe.

### Données financières — aucune

Aucun montant, aucune cotisation. Si une amende disciplinaire venait un jour s'attacher à un carton, elle relèverait du module **Cotisations (P1)** et du Trésorier — hors de cette feature, à ne pas anticiper.

### Données personnelles — de soi, et c'est le sujet

Cet écran est le premier du projet à ne rendre **que** des données de la personne connectée, agrégées. Trois réserves :

- **Aucune comparaison implicite** : une moyenne d'équipe, un rang (« 4ᵉ buteur »), un percentile ou une couleur de seuil transforment une statistique personnelle en **jugement relatif** et redérivent partiellement des données de tiers. Écartés en v1 (AC-PS-09, PO-PS-07).
- **`absence_validity` est un jugement porté sur le joueur** par un tiers. La décision de PO-PS-02 **ne le restitue pas** : le joueur voit combien de séances il a manquées, jamais comment le coach les a qualifiées. Ce choix ferme le vecteur médical, mais laisse entier le fond de **PO-AT-07** (un coach peut qualifier une absence sans que l'intéressé le voie ni puisse la contester) — non résolu ici, et non aggravé.
- **Recomposition** : les deux taux, croisés avec l'onglet Effectif d'une convocation, ne livrent rien de plus que ce que le joueur voit déjà. Aucun risque nouveau identifié — à réévaluer si un bloc d'équipe entrait un jour au périmètre (PO-PS-09).

### Journal d'audit

**Aucune journalisation requise par cette feature.** Consulter ses propres statistiques ne figure pas parmi les actions sensibles du CDC §11.3 (création/suppression de compte, changement de rôle, **consultation de donnée santé**, modification de paiement, correction de points Legacy, **export nominatif**).

La réserve principale de première rédaction **tombe** avec la décision de PO-PS-02 : l'écran n'expose **aucun** proxy de donnée médicale (`absence_validity` reste hors de la RPC), donc la « consultation d'une donnée santé » du §11.3 n'est pas déclenchée. Réserves restantes :

- ⚠️ **Si PO-PS-11 était tranché en faveur d'une ventilation par validité d'absence**, l'écran redeviendrait une surface de lecture d'un proxy médical, et la question du **trigger Postgres** de traçabilité (jamais un appel depuis un composant — `CLAUDE.md` §6) se reposerait immédiatement. À traiter **avec** PO-PS-11, pas après.
- ⚠️ **Si un bloc d'équipe nominatif entrait un jour au périmètre** (export 3, PO-PS-09), un agrégat nominatif publié se rapproche de l'« export nominatif » du §11.3.
- ⚠️ **Aucune table de journal d'audit n'existe dans `supabase/migrations/`** — exigence transversale **P0 non résolue**, distincte de cette feature, déjà signalée par `create-convocation`, `player-dashboard`, `match_details_page`, `profile-page`, `player-vote`, `coach-attendance-confirmation` et `match-stats`. Rappelée ici pour que le compteur ne redescende pas ; **ne pas la créer « en passant »**.

### Rétention

Aucune donnée nouvelle n'est stockée : les deux taux sont **calculés à la lecture** par des fonctions, depuis des données déjà couvertes par `docs/RETENTION_PURGE.md`. **Aucune catégorie de rétention nouvelle** n'est requise — et c'est une raison de plus de ne matérialiser aucun agrégat (AC-PS-10).

## 4. Critères d'acceptation

`AC-01`/`AC-02` sont ceux du CDC §17.2. Les critères propres à cette feature sont préfixés **`AC-PS-`**, même convention que `AC-MS-`/`AC-MD-`/`AC-PD-`/`AC-AT-`/`AC-PV-` ; à renuméroter dans la série officielle en recette.

| Réf. | Critère |
|---|---|
| **AC-01** | Un utilisateur n'accède qu'à **ses propres** statistiques. Aucune donnée d'un autre membre — nominative **ou agrégée** — n'est accessible, ni à l'écran ni dans la réponse API |
| **AC-02** | Un jeton demandant les statistiques d'un autre `user_id` n'obtient **aucun champ**, y compris pour un coéquipier de sa propre équipe. Les deux RPC **ne prennent aucun paramètre `user_id`** : il n'y a rien à falsifier. Vérifié **par appel direct à l'API**, hors application |
| AC-PS-01 | Le **taux de présence** est calculé **exclusivement** à partir d'`attendance_records` (fait constaté), **jamais** à partir de `convocation_responses` (intention déclarée), et **jamais** d'un mélange des deux. Les deux entités restent distinctes (`CLAUDE.md` §6) |
| AC-PS-02 | Tous les indicateurs sont bornés à la **saison en cours**, évaluée par Postgres (`current_season()`), jamais depuis une date fournie par le client (`docs/season-scoping-correction.md` §2). Aucune valeur « toutes saisons confondues » n'est rendue |
| AC-PS-03 | Le nombre de buts compte les lignes `match_events` où `user_id` est celui de l'utilisateur connecté et `event_type = 'goal'`, **penalties transformés inclus** (`is_penalty = true`, MS-16), sans jamais dériver ce nombre du score (`goals_for`) ni l'inverse (MS-01/AC-MS-01) |
| AC-PS-04 | ~~**Aucun carton, aucun `penalty_missed`** n'est rendu **ni requêté** pour un jeton joueur, y compris les siens, tant que PO-PS-03 n'est pas tranché. La liste blanche `goal` de `match_events_select_scoped` reste **inchangée** (AC-MS-09/AC-MS-10)~~ **Amendé (PO-PS-03 tranché, 2026-09-29)** : un jeton joueur peut désormais lire ses **propres** lignes `yellow_card`/`red_card` (nouvelle branche additive « propre ligne » sur `match_events_select_scoped`), jamais celles d'un coéquipier (AC-MS-09/AC-MS-10 intacts pour tout le reste). `penalty_missed` reste staff-only pour tout le monde, y compris le joueur concerné — non demandé |
| AC-PS-05 | **Aucune donnée d'un coéquipier** n'est rendue ni requêtée : ni assiduité, ni buts, ni cartons, ni classement de buteurs, ni moyenne d'équipe. Vérifié par appel direct à l'API |
| AC-PS-06 | La réponse de `get_my_attendance_summary()` **ne contient ni `note`, ni `absence_validity`, ni `validated_by`, ni aucun identifiant de ligne** — deux entiers seulement. Vérifié sur la **forme de la réponse API**, pas sur le rendu (leçon d'AC-MD-08 / AC-PV-10) |
| AC-PS-07 | Aucune ventilation « excusées / non excusées » n'est rendue **ni exposée par la RPC**, même à zéro (PO-AT-05, PO-PS-11, §3) |
| AC-PS-08 | Aucun filtre de compétition (« Championnat » / « Amicaux ») n'est rendu tant que `match_details.competition_type` n'existe pas en base — **absence, pas contrôle désactivé**, et surtout aucun filtre qui prétendrait filtrer sans le faire (PO-PS-05) |
| AC-PS-09 | Aucune position comparative, aucun rang, aucun percentile, aucune moyenne d'équipe et aucune « série » n'est rendu (§3, PO-PS-07) |
| AC-PS-10 | Aucun agrégat n'est **matérialisé** : les indicateurs sont calculés à la lecture. Aucune table nouvelle, aucune colonne nouvelle, aucune catégorie de rétention nouvelle (§3) |
| AC-PS-11 | L'écran se rend pour un compte **sans équipe, sans saison en cours ou sans rôle joueur** : **état vide explicite**, jamais une erreur, jamais un écran blanc, jamais un chargement infini — et jamais une suite de zéros présentée comme un résultat (même règle qu'AC-PV-13, AC-MN-17) |
| AC-PS-12 | Aucun point, palier, badge ni avantage ASC Legacy n'est rendu, **même avec une valeur statique** (CDC §8, AC-PD-12, AC-AT-09, AC-PV-15) |
| AC-PS-13 | Aucun bouton d'export, de copie, de partage ni de capture n'est rendu — **absence, pas désactivation** (même règle qu'AC-MN-16, AC-PV-17) |
| AC-PS-14 | L'écran est en **lecture seule** : aucun contrôle d'écriture, aucune correction d'un indicateur, aucune saisie |
| AC-PS-15 | **(PO-PS-01 résolu 2026-09-28)** La carte « Statistiques » du Menu navigue vers cet écran et est rendue **à l'identique pour les 8 rôles**, sans condition `can()` (AC-MN-01). La carte « **Classement** » **reste désactivée** — `AC-MN-04` s'entend désormais restreint à elle et à l'interdit de valeur chiffrée fabriquée, sans être réécrit dans `specs/menu.md` |
| **AC-PS-16** | **Les deux taux sont étiquetés explicitement et distinctement** (« Taux de réponse » / « Taux de présence »), jamais confondus ni moyennés. Le taux de présence **affiche son dénominateur** (« sur N séances validées »). **Aucun « présence % » nu calculé depuis les réponses n'apparaît nulle part** |
| **AC-PS-17** | Un **dénominateur nul** (aucune séance validée, aucune convocation passée) rend `null`, jamais `NaN`, jamais `0 %`, jamais `100 %`. L'interface rend alors un état « pas encore de données », pas un chiffre (AC-PS-11) |
| **AC-PS-18** | Un `SELECT` direct sur `public.attendance_records` avec un **jeton joueur** renvoie **zéro ligne** — la RLS n'est pas élargie par cette feature. Vérifié par appel direct à l'API, hors application |
| **AC-PS-19** | Les deux RPC **ne prennent aucun paramètre d'identité**, filtrent sur `auth.uid()` en interne, portent `set search_path = ''` avec des noms schéma-qualifiés, et leur `execute` est **révoqué de `public` et `anon`**, accordé à `authenticated` seulement. Chacune porte un commentaire SQL nommant son action RBAC (`ARCHITECTURE.md` §7) |
| **AC-PS-20** | `attendance:read-own-summary` et `response:read-own-summary` **ne figurent pas** dans le `requiresTeamScope` de la branche `player` de `can.ts` — elles sont bornées à une personne, pas à une équipe (§2). Un commentaire dans le code explique cette absence délibérée, pour qu'elle ne soit pas « corrigée » par réflexe |
| **AC-PS-21** | *(amendement à `specs/coach-attendance-confirmation.md`, fichier non réécrit)* **`AC-AT-07` s'entend désormais** : « un joueur ne peut pas lire de **ligne brute** d'`attendance_records` ; il accède à **son propre agrégat** via RPC uniquement ». La partie « aucun `AttendanceRecord` rendu ni requêté pour un jeton joueur » reste vraie **au niveau des lignes**, et AC-PS-18 en est le test |
| AC-PS-22 | *(passe présentation)* L'en-tête à flèche retour reste visible pendant le défilement (`sticky top-0`, fond opaque — `CLAUDE.md` §6, AC-MD-20) : l'écran est long par construction |
| AC-PS-23 | *(passe présentation)* Toute information portée par une couleur (barre de progression, seuil d'assiduité) est **doublée d'un libellé textuel** ; contrastes AA et navigation clavier opérationnelle (CDC §12, AC-MS-22) |
| AC-PS-24 | *(passe présentation)* Les contrôles interactifs ont une cible tactile ≥ ~44 px (`h-11`), vérifiée sur un **viewport mobile réel** ; toute paire de blocs côte à côte porte `min-w-0` sur chaque élément de grille (`CLAUDE.md` §6) |
| AC-PS-25 | Affichage complet en moins de 3 secondes sur mobile en réseau normal (CDC §12) |
| **AC-PS-26** | *(addendum troisième passage, PO-PS-12 partiellement tranché)* Le bloc « Taux de présence » affiche, en plus de l'agrégat global, une ventilation par type d'échéance (`training`/`match`/`meeting`) fournie par `get_my_attendance_summary_by_type()` — une ligne par type **ayant au moins une séance validée** pour ce joueur, jamais une ligne à 0/0 pour un type sans séance validée (même règle qu'AC-PS-17, appliquée ligne par ligne). Le bloc « Taux de réponse » **n'est pas concerné** — il reste un agrégat global, sans ventilation |
| **AC-PS-27** | *(addendum troisième passage)* La ventilation par type d'échéance du taux de présence **ne lève pas** AC-PS-07 : aucune décomposition par `absence_validity` n'apparaît nulle part, y compris dans le sous-bloc par type |

## 5. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-PS-01** | ~~**La carte « Statistiques » du Menu devient-elle cliquable ?**~~ **TRANCHÉ (2026-09-28, décision développeuse)** — « Now that we need this page, it will be enabled. It's ok. » L'amendement proposé est confirmé : « Statistiques » navigable, « **Classement** » **inchangée, toujours grisée**, `AC-MN-04` restreint à cette dernière, `specs/menu.md` **non réécrit**. Voir §1 et AC-PS-15. Le raisonnement d'origine (trois motifs de PO-MN-04 et leur état) est conservé en §1 | **Développeuse** (tranché) | **Non — résolu.** `MenuPage.tsx` peut être modifié dans cette passe |
| **PO-PS-02** | ~~**Le joueur peut-il lire sa propre présence constatée ?**~~ **TRANCHÉ (2026-09-28, décision développeuse)** — reformulation de PO-PD-02 / PO-AT-07, qui restaient ouverts. **Réponse : oui, par RPC `SECURITY DEFINER` renvoyant des agrégats seuls, bornée à `auth.uid()`. La RLS d'`attendance_records` reste fermée aux joueurs** — aucune politique `SELECT` nouvelle, `AC-AT-07`/`AC-PD-11` restent verts (formulation d'`AC-AT-07` amendée, AC-PS-21). Le joueur ne lit **jamais** de ligne brute : `note` et `absence_validity` sont des jugements du coach et restent invisibles. **Deux métriques distinctes, jamais fusionnées** (§1 « Les deux taux »). Réponses aux sous-questions d'origine : (a) l'ouverture porte sur des **compteurs**, pas sur `actual_status` ligne à ligne ; (b) `absence_validity` **n'est pas restituée** (PO-PS-11) ; (c) `note` **reste fermée** ; (d) le fond de PO-AT-07 (absence de mécanisme de contestation) **reste ouvert ailleurs**, ni résolu ni aggravé ici | **Développeuse** (tranché) | **Non — résolu.** L'implémentation est ouverte |
| **PO-PS-03** | ~~**Le joueur voit-il ses propres cartons ?** Question réellement distincte de MS-09/PO-MS-02, qui protège un coéquipier d'un jugement défavorable publié — ici la personne concernée est l'intéressé lui-même. Mais l'ouvrir suppose de percer la **liste blanche `goal`** de `match_events_select_scoped`, écrite précisément pour que tout type non-`goal` soit staff-only **par construction** (AC-MS-10). Ni accordé ni refusé ici. Les deux exports personnels ne montrent d'ailleurs aucun carton~~ **TRANCHÉ (2026-09-29, décision développeuse seule)** — demande explicite : « Apply migration to be able to see number of yellow / red card by player in stats page ». Le Bureau n'a **pas** été consulté malgré la mention initiale « Développeuse + Bureau » — décision assumée et signalée, pas silencieuse (voir l'addendum dédié). `match_events_select_scoped` gagne une branche additive « propre ligne », jamais celle d'un coéquipier | **Développeuse** (tranché, Bureau non consulté) | **Non — résolu.** Voir AC-PS-04 amendé |
| **PO-PS-04** | **Le compteur « homme/joueuse du match » est-il constructible ?** Non aujourd'hui : `specs/player-vote.md` **PO-PV-09** pose qu'aucun lauréat n'est persisté, qu'aucune règle d'ex æquo n'existe et qu'aucun palmarès de saison n'est construit — or ce compteur *est* un palmarès de saison. Absent des quatre exports. Le rattachement ASC Legacy (PO-PV-01) rend la question d'autant plus sensible : figer un lauréat, c'est commencer un barème | **Bureau** (avec la grille Legacy, CDC §8) | Non — hors périmètre v1 |
| **PO-PS-05** | **Filtre Championnat / Amicaux.** Dépend entièrement de `match_details.competition_type`, **non créée** : la migration `20260924100000_match_statistics_schema.sql` s'arrête explicitement dessus (7 lignes existantes, valeur de reprise non tranchée, « stop and ask, never guess »). Même blocage que `team_match_record` / `team_scorer_ranking`, absentes pour la même raison. Question annexe : cet écran compte-t-il **toutes** compétitions (position v1) ou **le championnat seulement**, comme AC-MS-07 le fait pour les agrégats d'équipe ? Une divergence entre les deux écrans serait déroutante | Développeuse (valeur de reprise) + Bureau (règle de comptage) | Non pour la v1 « toutes compétitions ». **Oui pour rendre le filtre des maquettes** |
| **PO-PS-06** | **Sélecteur de saison.** Les exports en montrent un ; la v1 est bornée à la saison en cours. L'ouvrir suppose de lever le filtre `season_id = current_season()` de `TeamRepositoryImpl.findByIds` **et son miroir RLS** (`docs/season-scoping-correction.md` §4.2/§4.3) — ce n'est pas un ajout de contrôle, c'est un élargissement d'accès à des données historiques | Développeuse | Non — v1 saison en cours (AC-PS-02) |
| **PO-PS-07** | **« Série en cours » et « 4ᵉ buteur de l'équipe »** (export 1). La première n'est définie nulle part (quelle unité, quelle rupture, quel type d'échéance ?). La seconde est une **position comparative nominative** exigeant `team_scorer_ranking`, absente (PO-PS-05), et transformerait une statistique personnelle en jugement relatif (§3) | Développeuse + Bureau | Non — écartés en v1 (AC-PS-09) |
| **PO-PS-08** | **Rattachement CDC du bloc « buts ».** Le CDC ne définit **aucun module « résultats et compétitions »** — constat déjà porté par PO-PD-07 et PO-MS-08, **non résolu**, simplement hérité. L'assiduité, elle, est bien fondée (P0). À consigner pour que le précédent ne devienne pas implicite | Bureau | Non pour la conception |
| **PO-PS-09** | **L'écran de statistiques d'équipe de l'export 3 est-il demandé ?** Il n'est pas dans la formulation de la feature, et deux de ses blocs sont **interdits en l'état** (cartons nominatifs → MS-09/AC-MS-09 ; assiduité nominative d'un coéquipier → « Voir les dossiers des autres membres ❌ » pour le joueur). S'il est voulu, c'est une **feature distincte**, probablement coach-facing, avec son propre cadrage RBAC et son propre arbitrage RGPD. **Ne pas la construire par extension de celle-ci** | Développeuse + Bureau | Non — hors périmètre (§1) |
| **PO-PS-10** | **Source de vérité des « convoqués requis ».** Inchangée et **non résolue par cette passe** (déjà OPEN dans `docs/convocation_visibility_rls_correction.md` §3, `specs/match_details_page.md` §5, PO-MS-07, PO-6b de `coach-dashboard`). Le dénominateur du **taux de réponse** en dépend directement, et hérite de la **limite explicitement acceptée** d'ex-PO-CV-05 (`specs/create-convocation.md`) : un joueur qui quitte l'équipe **disparaît des comptes passés**, recalculés après le changement d'effectif. Limitation à énoncer, pas à corriger ici. ⚠️ **Ne pas créer de table `convocation_attendees`, ne pas construire de snapshot d'effectif** | Bureau + développeuse | Non — mais à afficher honnêtement (§6.1) |
| **PO-PS-11** | **(nouveau, 2026-09-28)** **Les absences excusées comptent-elles contre le taux de présence ?** Non tranché. **En attendant, la RPC n'expose aucune ventilation par `absence_validity`** (AC-PS-07) — ce qui ferme aussi, par construction, le vecteur de proxy médical (§3). Trancher ce point rouvrira simultanément : la question RGPD (§3), celle de la traçabilité §11.3 (§3, journal d'audit), et PO-AT-05 dont il dépend (le champ n'est de toute façon **jamais écrit** aujourd'hui) | Bureau + référent RGPD (toujours **non désigné**) | Non |
| **PO-PS-12** | **(nouveau, 2026-09-28)** ~~**Ventilation par type d'échéance** (`training` / `match` / `meeting`), visible sur l'export 1 (« Entraînements / Matchs / Réunions ») et dont dépendent aussi « matchs convoqués / joués » et « buts par match ». **Agrégat global seul dans cette passe** : les deux RPC tranchées renvoient un couple de compteurs, sans ventilation. À trancher avant de rendre cette partie de la maquette~~ **Partiellement tranché (addendum troisième passage, 2026-09-28, décision développeuse)** : le taux de **présence** gagne la ventilation par type (`get_my_attendance_summary_by_type()`, AC-PS-26/27). Le taux de **réponse** reste un agrégat global — « matchs convoqués/joués » et « buts par match » en dépendent toujours et restent donc hors périmètre | Développeuse | **Non — résolu pour le volet présence.** Toujours non bloquant pour le volet réponse |
| **PO-PS-13** | **(nouveau, 2026-09-28)** **Liste échéance par échéance** (drill-down du joueur sur ses propres présences). **Agrégat seul dans cette passe**, aucun détail par séance. ⚠️ Attention : un drill-down rendrait de nouveau des **lignes** d'`attendance_records` et rouvrirait donc frontalement AC-PS-18, AC-PS-06 et la formulation amendée d'`AC-AT-07` (AC-PS-21) — ce n'est pas un simple ajout d'écran | Développeuse + Bureau | Non |
| **PO-PS-14** | **(ex-PO-PS-11)** **Ce taux alimentera-t-il un jour les points ASC Legacy ?** Si oui, le corriger après coup équivaudra à « corriger des points Legacy », action tracée au CDC §11.3 — même réserve que PO-AT-02 et PO-PV. À poser **avant** que le module Legacy ne soit construit, pas après | Bureau + référent RGPD | Non pour cette passe |

### Ce qui reste explicitement OPEN et ne doit pas être résolu implicitement

- **PO-PS-01 et PO-PS-02 sont tranchés** (2026-09-28) et ne figurent plus parmi les points bloquants. Leur raisonnement d'origine est conservé en §1 et §5, pas supprimé.
- **Le taux de présence ne se recalcule jamais depuis `ConvocationResponse`** : ce serait redéfinir silencieusement ce que le chiffre signifie (intention déclarée ≠ présence constatée) et fusionner de fait deux entités que `CLAUDE.md` §6 exige de garder distinctes. **AC-PS-01 et AC-PS-16 sont là pour ça.**
- **La grille ASC Legacy** : aucun barème, aucune pondération, aucune colonne « points » adossée à un taux d'assiduité ou à un compteur de buts.
- **La table de journal d'audit** : exigence transversale P0 non résolue, distincte — ne pas la créer à cette occasion.
- **`competition_type`** : ne pas l'ajouter « en passant » avec une valeur de reprise devinée pour débloquer le filtre (PO-PS-05). La migration `match-stats` s'est arrêtée délibérément, pour une raison qui n'a pas changé.
- **La source de vérité des « convoqués requis »** (PO-PS-10) : constat d'état, pas résolution. Ne pas créer de table `convocation_attendees`, ne pas construire de snapshot d'effectif.

## 6. Notes d'implémentation pour l'étape de build

Ce ne sont **pas des décisions produit** — ce sont les artefacts tranchés par la développeuse (PO-PS-02) plus les constats relevés contre le code réel. **Périmètre de l'agent d'implémentation suivant, pas de cette spec.**

### 6.1 Numérateur et dénominateur — les deux taux

**Taux de présence** (`get_my_attendance_summary()`) :
- Numérateur : `attendance_records` du joueur avec `actual_status = 'present'`.
- Dénominateur : les `attendance_records` **validés pour ce joueur** — c'est-à-dire les séances que le coach a effectivement confirmées, pas les séances programmées. Une échéance sans `AttendanceRecord` n'est **ni présente ni absente** : elle est **hors du calcul**. Compter ces échéances comme des absences fabriquerait un taux faux pour toute équipe dont le coach ne confirme pas systématiquement.
- ⚠️ **Conséquence à rendre visible, pas à masquer** : le dénominateur doit être affiché (« sur 12 séances validées », AC-PS-16). Sans lui, un « 75 % » n'est pas interprétable.
- Cohérent avec la priorité déjà posée par MS-13 (le fait constaté prime l'intention déclarée) et avec le texte d'état vide de l'export 2, qui dit lui-même « dès que … seront **validés par ton coach** ».

**Taux de réponse** (`get_my_response_summary()`) :
- Numérateur : `convocation_responses` du joueur de statut `present` **ou** `absent` (une réponse `pending` n'est pas une réponse).
- Dénominateur : les convocations **passées, non annulées** des équipes courantes du joueur. Il n'existe **aucune** liste de convoqués par convocation : la vue `convocation_responders` construit l'effectif en joignant `user_roles` où `role = 'player'` sur `convocations.team_id` — autrement dit **toute échéance de l'équipe concerne tout joueur de l'équipe** (PO-PS-10).
- **Limite acceptée, identique à celle d'ex-PO-CV-05** (`specs/create-convocation.md`) : un joueur qui quitte l'équipe **disparaît des comptes passés**, puisque le dénominateur est recalculé depuis l'effectif courant. Ne pas construire de snapshot d'effectif pour la couvrir.
- **Convocations annulées** : exclues du dénominateur, même filtre que MS-07 applique aux agrégats d'équipe. Vérifier la valeur réelle de `convocations.status` dans le schéma avant d'écrire la fonction.

### 6.2 RLS — l'état réel au 2026-09-28, vérifié dans les migrations

```
attendance_records_select_coach_admin       →  coach de l'équipe OU admin. Le joueur, non.  ← INCHANGÉ par cette feature
convocation_responses_select_own_or_coach   →  user_id = auth.uid() OR coach/admin de l'équipe
match_events_select_scoped                  →  branche 'goal' + is_team_member  ← déjà ouvert au joueur
```

**Vérification demandée par la développeuse, effectuée :** `convocation_responses_select_own_or_coach` (migration `20260903205143`) accorde bien `user_id = (select auth.uid())` au joueur sur ses propres lignes. **L'hypothèse tient** : `get_my_response_summary()` peut donc être **`SECURITY INVOKER`** — la RLS existante suffit, aucune politique nouvelle. Seule `get_my_attendance_summary()` a besoin de `SECURITY DEFINER`, la RLS lui étant fermée par décision.

### 6.3 Artefacts à construire

**SQL — une migration nouvelle :**

- `get_my_attendance_summary()` → `returns (validated_count int, present_count int)`, **`SECURITY DEFINER`**.
- `get_my_response_summary()` → `returns (convocated_count int, responded_count int)`, **`SECURITY INVOKER`** (confirmé §6.2).
- Les deux : **aucun paramètre `user_id`**, filtre sur `auth.uid()` en interne, `set search_path = ''` et noms schéma-qualifiés (convention du dépôt, cf. `20260821092153_convocation_rpc_search_path_fix.sql`), `revoke execute from public, anon` + `grant execute to authenticated`, et un **commentaire SQL nommant l'action RBAC** correspondante (`ARCHITECTURE.md` §7, miroir manuel). Bornage saison via `current_season()`. → AC-PS-19.
- ⚠️ Rappel `SECURITY DEFINER` (leçon de `get_convocation_responders`) : à l'intérieur d'une telle fonction, une jointure **n'est pas** une frontière d'autorisation. Le filtre `auth.uid()` doit être **explicite dans le corps**, pas supposé acquis d'une vue sous-jacente.

**Domaine** (`domain/`, TypeScript pur, aucun import React/Supabase) :

- `domain/entities/attendance-summary.ts` — `AttendanceSummary { validatedCount, presentCount }`
- `domain/entities/response-summary.ts` — `ResponseSummary { convocatedCount, respondedCount }`
- `domain/policies/player-stats-rates.ts` — fonctions **pures** `attendanceRate()` / `responseRate()`, chacune renvoyant **`null` sur dénominateur nul** — jamais `NaN`, jamais `0` (AC-PS-17).
- Méthodes d'interface de dépôt : `getOwnAttendanceSummary()`, `getOwnResponseSummary()`.
- `domain/policies/rbac-matrix.ts` : ajout de `attendance:read-own-summary` et `response:read-own-summary` pour **Joueur/Joueuse** (+ `actions.ts`). **Seul changement RBAC autorisé** — ne rien ajouter d'autre.
- `domain/policies/can.ts` : **ne PAS** ajouter ces deux actions au `requiresTeamScope` de la branche `player`, et **commenter cette absence** (§2, AC-PS-20).

**Data** (`data/`) : `*Impl` appelant `supabase.rpc(...)`, **toujours à travers un mapper** (`CLAUDE.md` §4 — jamais de mapper sauté, même pour une forme « simple » à deux entiers), erreurs via `map-supabase-error.ts`. DTO : la valeur de retour d'une RPC est un `XxxDto`, pas un `XxxRow`.

**Présentation** : `use<Feature>ViewModel` + `Page` sans logique métier, `queryKey` centralisée dans `presentation/shared/query-keys.ts`. `MenuPage.tsx` : carte « Statistiques » navigable (PO-PS-01 tranché), « Classement » **inchangée**.

**Tests** (`CLAUDE.md` §8, ordre de priorité) :
1. Vitest sur `player-stats-rates.ts`, **cas du dénominateur nul couvert nommément** (AC-PS-17).
2. Test d'intégration avec un **jeton joueur** : un `SELECT` brut sur `attendance_records` renvoie **zéro ligne** (AC-PS-18), et les deux RPC ne renvoient que les compteurs de l'appelant (AC-01/AC-02).
3. ⚠️ **PO-MD-10 reste ouvert** : le dépôt n'a toujours pas d'infrastructure pour obtenir une session Supabase authentifiée depuis Vitest. Le point 2 risque de rester `it.todo` — **à signaler, pas à contourner**.

### 6.4 Ce qui n'existe pas et qu'il ne faut pas supposer

- `match_details.competition_type` — **absente** (PO-PS-05).
- Les vues `team_match_record` et `team_scorer_ranking` — **absentes**, pour la même raison (donc pas de « 4ᵉ buteur de l'équipe »).
- Toute notion de **lauréat** de vote — `player-vote` s'arrête à un tally par convocation (`get_vote_tally`), sans vainqueur ni ex æquo (PO-PV-09, PO-PS-04).
- Toute colonne **minute** sur `match_events` — délibérément non modélisée (UI-MS-D).

### 6.5 Contraintes à ne pas franchir

Aucune modification de `match_events_select_scoped` ; **aucune politique `SELECT` nouvelle sur `attendance_records`** ; aucune table ni colonne nouvelle ; aucune ventilation par `absence_validity` (PO-PS-11, toujours fermé — même après l'addendum troisième passage, qui ne touche que la ventilation par type) ; ~~aucune ventilation ... par type d'échéance (... PO-PS-12)~~ **le taux de présence SEUL est désormais ventilé par type d'échéance, voir l'addendum troisième passage et AC-PS-26/27 — le taux de réponse, lui, reste sans ventilation** ; aucun drill-back vers des lignes brutes (PO-PS-13) ; aucune écriture ; aucun export ; aucun couplage Legacy ; aucune donnée de tiers ; aucune action RBAC au-delà des deux nommées (la nouvelle RPC `get_my_attendance_summary_by_type()` ne mirrore aucune action de matrice supplémentaire — même couverture que `get_my_attendance_summary()`, `attendance:read-own-summary`). Rappels `CLAUDE.md` : miroir SQL ↔ TypeScript **manuel** et commenté du nom de la règle de part et d'autre (§7) ; `AttendanceRecord` et `ConvocationResponse` restent deux entités distinctes (§6) ; aucune journalisation depuis un composant (§6).

## 7. Note pour designer-agent

- **Maquettes** : les quatre PNG de `docs/designs/stats/` (§0). Statut de registre **`instantané seul`** — **ne rien demander à la développeuse**. Ajouter la ligne de registre pré-rédigée en §0.
- ⚠️ **Les quatre exports ne sont pas quatre états du même écran** : 1 = écran personnel rempli, 2 = écran personnel vide, **4 = la grille du Menu**, **3 = un écran d'équipe qui n'est pas cette feature** (PO-PS-09). Ne pas déduire le contenu du préfixe `Player -` du nom de fichier (précédent `player-vote`).
- **Deux taux, deux libellés, jamais confondus** (AC-PS-16) — c'est la contrainte de conception la plus structurante de cet écran : « Taux de réponse » (a-t-il répondu) et « Taux de présence » (était-il là) mesurent deux choses différentes sur deux dénominateurs différents. Le taux de présence **doit afficher son dénominateur** (« sur N séances validées »). **Aucun « Présence 75 % » nu** — c'est exactement ce que la maquette de `player-dashboard` proposait et que PO-PD-02 bloquait.
- **Le CDC et la matrice priment, la maquette informe la mise en page.** **Blocs à écarter** sur les exports 1, 2 et 4 : filtre « Championnat / Amicaux » (AC-PS-08), sélecteur de saison (PO-PS-06), compteurs « Excusées / Non excusées » (AC-PS-07), la **grande barre fusionnée** « Présence 75 % » unique de l'export 1 (fusionnerait les deux taux, AC-PS-16 l'interdit toujours), « Série en cours » et « 4ᵉ buteur de l'équipe » (AC-PS-09), carte « Classement » avec la valeur fabriquée « 4e · 11 pts · J6 » (AC-MN-04, toujours interdite), cartes « Équipe » et « Documents » de l'export 4 (« Documents » a été **retirée** du Menu par l'addendum du 2026-09-04, point 1 ; « Équipe » n'a aucun écran cible). ⚠️ **Exception (addendum troisième passage, PO-PS-12 partiellement tranché)** : la **ventilation Entraînements/Matchs/Réunions** de l'export 1 est désormais construite **pour le seul bloc « Taux de présence »**, sous forme d'un sous-bloc discret (pas la barre fusionnée elle-même) — voir §4 point 4 et AC-PS-26/27.
- ✅ **La carte « Statistiques » de l'export 4 est en revanche à concevoir comme active** (PO-PS-01 tranché, AC-PS-15) — c'est le point d'entrée réel. La carte « **Classement** » de la même grille **reste grisée**. Le badge « Nouveau » de l'export 4 n'existe nulle part dans le dépôt : ne pas l'introduire sans décision.
- ⚠️ **La nav basse de l'export 4 montre « Recherche »** à la place d'« Actus ». La nav est **fixe à 4 entrées — Dashboard · Calendrier · Actus · Menu** (`AC-MN-12`) : aucune cinquième destination, aucune substitution. Artefact de maquette, à corriger, pas à transposer.
- **L'écran est atteint depuis le Menu, en route poussée** — pas une cinquième entrée de nav. En-tête à flèche retour **`sticky top-0`**, fond opaque (AC-PS-22, `CLAUDE.md` §6).
- **États à couvrir** : compte sans équipe / sans saison en cours / sans rôle joueur (état vide, AC-PS-11) ; **dénominateur nul** — aucune séance encore validée par le coach : l'écran rend « pas encore de données », **jamais 0 % ni 100 %** (AC-PS-17, c'est exactement l'état de l'export 2, dont la copie « dès que … seront validés par ton coach » est **juste** et à conserver) ; taux de réponse disponible mais taux de présence pas encore (cas fréquent en début de saison — les deux blocs sont **indépendants**) ; zéro but (état normal, pas une erreur) ; chargement ; échec de chargement.
- ~~**Ne pas dessiner de bloc « cartons »** côté joueur (AC-PS-04)~~ **Amendé (PO-PS-03 tranché, 2026-09-29)** : un bloc « Cartons » (jaune/rouge, deux compteurs côte à côte, jamais fusionnés en un seul total) est désormais construit, `PlayerStatsCardsCard`, même grammaire visuelle compacte que `PlayerStatsGoalsCard` — rendu après la carte buts, jamais un état vide en soi (mêmes règles que la carte buts, §4.3). Ni de bloc « homme du match » (PO-PS-04), ni de liste détaillée par séance (PO-PS-13) : ces deux-là restent des **absences structurelles**, pas des blocs à griser.
- **Contraintes mobiles** (`CLAUDE.md` §6) : cibles ≥ `h-11`, `min-w-0` sur toute paire de blocs côte à côte (les exports en comportent plusieurs), vérifiées sur un **viewport mobile réel**. Couleur jamais seule porteuse de sens — barres de progression et seuils d'assiduité toujours doublés d'un libellé (AC-PS-23).
- Rappel `CLAUDE.md` §9 : **aucun nom de personne** figurant dans les maquettes (l'export 3 en comporte six) ne doit apparaître dans le code, les tests ou la documentation.

## UI design

> Rédigé à partir des quatre PNG de `docs/designs/stats/` (registre `docs/designs/DESIGN_LINKS.md`, ligne `player-stats`, statut **instantané seul** — ligne ajoutée par cet agent, aucun lien à demander à la développeuse). Les quatre exports ont été ouverts individuellement, sans déduire le contenu du préfixe `Player -` du nom de fichier (précédent `player-vote`, rappelé au §0 et au §7 de la spec).
>
> **Cadrage avant tout le reste** : le périmètre v1 (§1/§5, addendum du 2026-09-28) s'est nettement rétréci par rapport à ce que montrent les exports 1, 2 et 4. La quasi-totalité de ce qui suit consiste donc à **retirer** des blocs de maquette plutôt qu'à les transposer — c'est le comportement attendu, pas une conception au rabais. Rien n'est ajouté pour « compenser » visuellement ce qui manque.

### 1. Emplacement dans la navigation à 4 entrées

Aucun nouvel onglet. L'écran vit sous **Menu**, atteint par la carte « Statistiques » de la section « Suivi de l'équipe » (`specs/menu.md`, `MenuPage.tsx`) — **route poussée**, pas une cinquième destination de la nav basse. Contrairement à Menu lui-même (`specs/menu.md` : « le Menu est une destination de nav primaire, pas une route poussée », pas de flèche retour), cet écran **est** une route poussée depuis Menu : il porte donc un en-tête à flèche retour, **`sticky top-0`, fond opaque**, même patron que `BackHeader` déjà utilisé sur les écrans de convocation (AC-PS-22). Titre repris tel quel des exports 1/2 : « Mes statistiques ».

La nav basse de l'export 4 montre à tort « Recherche » à la place d'« Actus » — artefact de maquette signalé par la spec elle-même (§7), à ne pas transposer : nav fixe **Dashboard · Calendrier · Actus · Menu** (`AC-MN-12`).

### 2. Point d'entrée — carte « Statistiques » du Menu

`MenuPage.tsx` rend aujourd'hui la carte « Statistiques » via `DisabledMenuCard` (grisée, `aria-disabled`, `opacity-40`, aucun clic). PO-PS-01/AC-PS-15 la font passer à l'état **actif** :

- Même emplacement dans la grille, même icône (`IconChartBar`), même position (première carte de « Suivi de l'équipe », grille `grid-cols-2 gap-3`, chaque item `min-w-0` — patron déjà posé par `DisabledMenuCard`).
- Nouveau composant `MenuNavCard` (ou variante active de la même forme) : reprend le visuel de `DisabledMenuCard` — icône dans un cercle décoratif, titre en gras, sous-titre neutre — mais en opacité pleine, élément interactif (`Link`/`button`, cible tactile déjà ≥ `min-h-16` par la forme existante), navigation vers l'écran de cette feature. Pas de chevron ni d'icône de lien sortant ajoutés : rien de tel n'existe ailleurs dans la grille « Suivi de l'équipe » (une carte de cette grille n'est de toute façon jamais un lien externe), inutile d'introduire une affordance nouvelle pour une seule carte.
- Sous-titre : **« Présence, buts »**, pas « Présence, buts, forme » de l'export 4 — « forme » n'a aucun fondement construit (PO-PS-07, AC-PS-09), un sous-titre de carte de menu n'y échappe pas plus qu'un chiffre affiché à l'écran.
- **Pas de badge « Nouveau »** — absent du dépôt, non tranché (voir « Corrections » ci-dessous).
- La carte « **Classement** » de la même grille est **inchangée** : reste un `DisabledMenuCard`, aucune modification.
- Aucune condition `can()` sur le rendu de la carte : elle est identique pour les 8 rôles (AC-PS-15, §2 de la spec — les deux nouvelles actions sont bornées à `auth.uid()`, pas au rôle affiché). Un compte sans rôle joueur, sans équipe ou sans saison en cours voit **la même carte active** ; tapoter dessus le mène à l'état vide de plein écran décrit au §4 — la RBAC ne bloque jamais le rendu de la carte elle-même, seulement le contenu de l'écran qu'elle ouvre.

### 3. Ce qui change par rôle — renvoi au RBAC de la spec, pas de redéfinition

Le §2 de la spec est la seule source : **Joueur/Joueuse** est le seul rôle qui consomme un contenu réel sur cet écran, borné à `auth.uid()`. Un compte cumulant coach et joueur y voit ses statistiques *en tant que joueur* — rien à distinguer visuellement, ce n'est pas une vue « coach ». Les six autres rôles (Coach/Staff hors casquette joueur, Responsable de section, Dirigeant habilité, Trésorier, Référent médical, Bénévole, Administrateur) n'ont **aucun point d'entrée construit cette passe** (PO-PS-09) : rien à concevoir pour eux ici au-delà de l'état vide déjà couvert par AC-PS-11 s'ils atteignent l'écran (par exemple un compte multi-rôle sans affectation joueur).

Il n'y a donc **aucune variante d'écran par rôle** à décrire — un seul écran, un seul jeu d'états, tous définis par la disponibilité des données de la personne connectée, jamais par son rôle affiché.

### 4. Structure de l'écran, de haut en bas

1. **En-tête** — flèche retour + « Mes statistiques », `sticky top-0`, fond opaque (§1, AC-PS-22).
2. **Aucun sélecteur de saison, aucun chip de filtre de compétition** sous l'en-tête — absents, pas grisés (PO-PS-06, AC-PS-08 ; voir « Corrections » ci-dessous). L'écran ne porte donc aucun contrôle entre l'en-tête et le premier bloc de contenu.
3. **Bloc « Taux de réponse »** — carte indépendante (composant `PlayerStatsRateCard`, détaillé au §5).
4. **Bloc « Taux de présence »** — carte indépendante, même composant, second jeu de données. Rendue **immédiatement après** le bloc réponse, jamais imbriquée dedans ni fusionnée avec lui (AC-PS-16) : deux `<section>`/cartes séparées, avec leurs propres libellé, valeur, barre et légende. **(Addendum troisième passage, PO-PS-12 partiellement tranché)** : cette carte porte en plus un sous-bloc de ventilation par type d'échéance (`training`/`match`/`meeting`, une ligne par type disponible, AC-PS-26/27) — le bloc « Taux de réponse » du point 3 n'en gagne PAS un, il reste inchangé.
5. **Bloc « Buts »** — carte compacte, un seul chiffre (composant `PlayerStatsGoalsCard`, §5).
6. **État vide de plein écran** si rien n'est disponible du tout (§4.1 ci-dessous) — remplace alors l'ensemble des points 3 à 5, pas un état par bloc.

Aucun cinquième bloc : pas de carte « Matchs » (Convoqués/Joués/Buts par match/rang de buteur), pas de compteurs Excusées/Non excusées, pas de bandeau « Série en cours » — ces blocs de l'export 1 dépendent tous de points ouverts non tranchés cette passe (le volet réponse de PO-PS-12, PO-PS-07, AC-PS-07/09) ou, pour « Matchs convoqués/joués », de la ventilation du taux de réponse, elle non construite (§1 de la spec, ligne « Matchs convoqués »). Le sous-bloc de ventilation par type AJOUTÉ au bloc « Taux de présence » (point 4 ci-dessus, addendum troisième passage) n'est pas un cinquième bloc — c'est un sous-élément de la carte existante, pas une nouvelle carte.

#### 4.1 État vide de plein écran (AC-PS-11)

Déclenché quand **aucun des deux taux n'a de dénominateur** (`validated_count = 0` et `convocated_count = 0`) **et** qu'aucun but n'est marqué — c'est-à-dire un compte sans équipe, sans saison en cours ou sans rôle joueur, ou tout simplement un tout début de saison avant la première convocation. C'est l'état de l'export 2, **conservé tel quel** pour cette occurrence (icône, titre « Rien à afficher pour le moment », corps de texte « Tes statistiques apparaîtront ici dès que les premiers entraînements et matchs de la saison seront validés par ton coach. » — copie explicitement validée par la spec elle-même, §7 note designer), mais **sans** le sélecteur de saison ni les chips de filtre que l'export 2 montre au-dessus de la carte vide (mêmes absences qu'au point 2 ci-dessus — l'export 2 n'a pas été « nettoyé » différemment de l'export 1 sur ce point précis).

⚠️ Cette copie est écrite du point de vue de l'assiduité (« validés par ton coach »). C'est assumé : l'assiduité est le seul bloc réellement fondé dans un module CDC (§1, tableau de rattachement), et dans la quasi-totalité des cas réels un compte sans aucune donnée est aussi un compte sans convocation passée — la même cause (pas encore d'équipe/saison active) ferme les deux dénominateurs en même temps. Aucune reformulation générique proposée ici, faute d'un cas réel qui l'exigerait.

#### 4.2 État « un bloc disponible, l'autre pas encore » — les deux blocs restent indépendants

Cas explicitement demandé par la spec (§7 note designer) : **taux de réponse disponible, taux de présence pas encore** — fréquent en début de saison, le coach n'ayant pas encore validé de présence alors que des convocations ont déjà eu lieu. Aucun mockup ne montre cet état (les exports 1/2 sont tous-ou-rien) : c'est une **variante de sous-état du composant `PlayerStatsRateCard`** décrit au §5, pas un écran séparé ni un nouveau patron.

- Le bloc « Taux de réponse » se rend normalement (pourcentage, barre, légende « sur N convocations passées »).
- Le bloc « Taux de présence », lui, rend son **sous-état à dénominateur nul** : pas de pourcentage, pas de barre — un message court à la place, dans le même gabarit de carte (« Pas encore de séance validée par ton coach » ou équivalent), jamais un `0 %` ni un `100 %` (AC-PS-17).
- Rien n'empêche la situation inverse en théorie (présence disponible, réponse pas encore) même si elle est moins probable dans le déroulé réel d'une saison ; le composant ne fait aucune hypothèse d'ordre entre les deux blocs.
- Le bloc « Buts » suit sa propre disponibilité, indépendamment des deux autres (§4.3).

#### 4.3 Bloc « Buts » — zéro but est un état normal

`PlayerStatsGoalsCard` affiche `0` sans traitement particulier si le joueur n'a marqué aucun but cette saison — ce n'est ni une erreur ni un état vide (rappel §7 de la spec). Ce bloc peut être présent alors que les deux taux ci-dessus sont dans leur sous-état nul : il ne participe pas à la condition de bascule vers l'état vide de plein écran (§4.1) tant qu'au moins un but existe.

### 5. Nouveaux composants (résumé, pas de code)

Tous les contrôles interactifs de cet écran (aucun, en réalité — l'écran entier est en lecture seule, AC-PS-14) et la seule cible tactile de la page, la flèche retour, à `h-11` minimum.

- **`PlayerStatsRateCard`** — carte compacte réutilisée deux fois (réponse, présence) :
  - libellé de tête (« Taux de réponse » / « Taux de présence »), jamais interchangeable ni partagé entre les deux instances (AC-PS-16) ;
  - état « disponible » : pourcentage en grands caractères + fraction brute entre parenthèses (« 75 % · 15/20 »), une barre de progression en dessous, et une légende texte explicite du dénominateur (« sur 20 séances validées » pour la présence — **littéralement requis par AC-PS-16** ; « sur 20 convocations passées » proposé côté réponse, pour la même lisibilité, bien que seul le bloc présence soit *mandaté* à l'afficher) ;
  - état « dénominateur nul » : pas de pourcentage ni de barre, un texte de substitution court et déjà couvert par le patron de copie de l'export 2 (§4.1/§4.2) ;
  - la barre de progression **double toujours son information de couleur par le pourcentage textuel déjà affiché au-dessus** (AC-PS-23) — la couleur seule n'est jamais l'unique porteuse du sens ;
  - primitive suggérée : le composant shadcn `Progress` n'est **pas encore installé** dans ce dépôt (`presentation/shared/components/ui/` ne le contient pas à ce jour) — à ajouter via `npx shadcn add progress` plutôt qu'une barre construite à la main (`CLAUDE.md` §2), puis habillé aux couleurs déjà utilisées ailleurs dans l'app plutôt qu'aux couleurs brutes de la maquette.
- **`PlayerStatsGoalsCard`** — carte compacte, un seul chiffre + libellé (« Buts marqués » + éventuellement « cette saison » en sous-texte), même grammaire visuelle compacte que les cartes « FORME RÉCENTE »/« BUTS » déjà en place sur le tableau de bord coach (`docs/designs/v4_coach_dashboard.png`, déjà cité comme référence par `specs/match-stats.md` « UI design » §5) — réemploi de patron, pas une invention.
- **État vide de plein écran** — reprend le patron déjà utilisé ailleurs dans le dépôt pour un écran sans donnée (icône dans un cercle neutre, titre gras, corps de texte secondaire, carte centrée) ; aucun composant nouveau à créer si un composant générique de ce type existe déjà dans `presentation/shared/` — à vérifier au moment du build plutôt que d'en écrire un spécifique à cette feature si un équivalent existe (ex. état vide déjà utilisé par `player-vote` ou `actus`).

Aucun de ces composants ne réutilise un pattern de liste/filtre déjà répertorié (pas de pattern « N total, plus récent développé », pas de filtre par puces) : cet écran n'a ni liste ni filtre en v1, contrairement à ce que les exports laissaient penser.

### 6. Rappels mobiles (`CLAUDE.md` §6)

- En-tête à flèche retour : `sticky top-0`, fond opaque, vérifié en défilant réellement le contenu sur un viewport mobile (AC-PS-22) — l'écran est long par construction une fois les trois cartes empilées.
- Aucune paire de champs côte à côte sur cet écran (pas de formulaire, pas de Date/Heure) — la seule mise en page à deux colonnes du dépôt qui concerne cette feature est la grille `grid-cols-2` de la carte « Statistiques »/« Classement » dans `MenuPage.tsx`, déjà couverte par le `min-w-0` existant sur `DisabledMenuCard`/`MenuNavCard`.
- Barre de progression et texte de pourcentage : contraste AA, information jamais portée par la seule couleur (AC-PS-23).
- Vérification sur un **viewport mobile réel**, pas une fenêtre desktop redimensionnée (CLAUDE.md §6, rappelé explicitement par AC-PS-24).

### 7. Corrections proposées vs maquette

Même précédent que `specs/match_details_page.md` et `specs/match-stats.md` § « Corrections proposées vs maquette » — une maquette peut montrer un bloc sans fondement dans le domaine ou hors périmètre tranché. Ici, la correction principale est un **retrait**, motivé bloc par bloc :

| Bloc de maquette | Export(s) | Motif du retrait | Réf. |
|---|---|---|---|
| Sélecteur « Saison 2026-2027 » | 1, 2 | Écran borné à la saison en cours en v1 | PO-PS-06 |
| Chips « Tout / Championnat / Amicaux » | 1, 2 | `competition_type` n'existe pas en base | AC-PS-08, PO-PS-05 |
| Barre « Présence 75 % » unique (fusionnée avec le taux de réponse) | 1 | Fusionnerait les deux taux — reste interdit (AC-PS-16). La ventilation Entraînements/Matchs/Réunions elle-même, en revanche, **est construite** depuis l'addendum troisième passage — mais comme sous-bloc de la carte « Taux de présence » seule, jamais comme barre fusionnée avec le taux de réponse | AC-PS-16, PO-PS-12 |
| Compteurs « EXCUSÉES / NON EXCUSÉES » | 1 | Exposerait le proxy médical `absence_validity` | AC-PS-07, PO-PS-11 |
| Bandeau « Série en cours : 6 entraînements d'affilée » | 1 | Indicateur dérivé non défini | PO-PS-07, AC-PS-09 |
| Carte « Matchs » (Convoqués/Joués/Buts par match) | 1 | Dépend de la ventilation par type d'échéance, non construite ; seul « Buts marqués » survit, en carte autonome | PO-PS-12 |
| Bandeau « 4ᵉ buteur de l'équipe » | 1 | Position comparative nominative, exige une vue absente | PO-PS-07, AC-PS-09 |
| Sous-titre carte Menu « Présence, buts, **forme** » | 4 | « Forme » sans fondement construit | AC-PS-09 |
| Badge « Nouveau » sur la carte Menu | 4 | N'existe nulle part ailleurs dans le dépôt, aucune décision prise pour l'introduire | — (voir §8) |
| Carte « Équipe » de la grille Menu | 4 | Déjà retirée du Menu par l'addendum du 2026-09-04 (`specs/menu.md`) | — |
| Nav basse « Recherche » au lieu d'« Actus » | 4 | Artefact de maquette, nav fixe à 4 entrées | `AC-MN-12` |
| Écran de statistiques d'équipe nominatif (assiduité + cartons par coéquipier) | 3 | Hors périmètre de cette feature, deux blocs interdits en l'état (MS-09, RBAC « dossiers des autres membres ❌ ») | PO-PS-09 |

Aucune correction inverse (un bloc *ajouté* par rapport à la maquette) au-delà du sous-état « dénominateur nul par bloc » décrit au §4.2, qu'aucun export n'illustre mais que la spec demande explicitement de couvrir.

### 8. Questions UI ouvertes

| Réf. | Question |
|---|---|
| **UI-PS-A** | Le badge « Nouveau » de la carte Menu (export 4) n'a ni composant ni décision produit dans le dépôt (durée d'affichage ? condition de disparition — date de mise en prod, première visite du compte ?). Non conçu ici faute de règle à appliquer — à trancher séparément si le badge est réellement voulu, indépendamment du reste de cette feature |
| **UI-PS-B** | Le texte de substitution du sous-état « dénominateur nul » du bloc « Taux de présence » quand il coexiste avec un bloc « Taux de réponse » rempli (§4.2) n'a aucune référence visuelle — proposition de copie donnée à titre d'exemple (« Pas encore de séance validée par ton coach »), pas figée. À valider avec la développeuse/le Bureau au moment du build, notamment si la copie doit rester cohérente mot pour mot avec celle de l'état vide de plein écran (§4.1) ou s'en distinguer clairement pour éviter la confusion entre les deux états |
| **UI-PS-C** | Faut-il afficher le dénominateur du **taux de réponse** (« sur N convocations passées ») alors qu'AC-PS-16 ne le rend obligatoire que pour le taux de présence ? Proposé par cohérence visuelle et parce que la spec insiste sur le fait que les deux dénominateurs ne sont pas comparables (§1) — les montrer tous les deux rend cette non-comparabilité plus lisible qu'en n'en montrant qu'un. Pas un point bloquant, mais à confirmer plutôt qu'à supposer tranché |
| **UI-PS-D** | Composant d'état vide générique : si `presentation/shared/` porte déjà un composant d'état vide réutilisable (ex. celui construit pour `player-vote` ou `actus`), le réemployer plutôt que d'en écrire un nouveau propre à cette feature — à vérifier au moment du build, pas devinable depuis les specs seules |
