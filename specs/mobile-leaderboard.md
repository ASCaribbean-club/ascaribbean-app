# Spec — Classements de l'équipe, vue mobile (`mobile-leaderboard`)

> Statut : **rédaction initiale du 2026-10-01** (product-owner-agent), branche `feature/mobile-leaderboard`. **Révisée le même jour, second passage** : PO-LB-01 et PO-LB-02 — les deux points bloquants — sont **TRANCHÉS par la développeuse** (voir l'addendum ci-dessous). **Plus aucun point bloquant** : designer-agent et l'implémentation sont ouverts. 5 points ouverts restants (PO-LB-03 → PO-LB-07), tous non bloquants, plus la forme technique de PO-LB-01 (défaut retenu, à confirmer en revue).
> Demande développeuse (verbatim, transmise par l'orchestrateur) : « Enable leaderboard card in menu tab for mobile user to be able to see leaderboard for goal, cards (yellow/red). Base on designs: docs/designs/learderboard/ (3 PNGs). It's same design for all player and coach. Except coach has no 'position' emphasized. And player and coach only see leaderboard for selected team (current team). »
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0/P1/P2 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, multi-rôles), `specs/menu.md` (carte « Classement » désactivée, AC-MN-04, PO-MN-04), `specs/match-stats.md` (MS-09, AC-MS-07/09/10/19, PO-MS-02, PO-MS-08), `specs/player-stats.md` (PO-PS-01/03/05/09/10, AC-PS-15), `specs/coach-team-stats.md` (PO-CTS-01/02/05/06, AC-CTS-08), `specs/coach-dashboard.md` (PO-6, sélecteur d'équipe), `specs/player-dashboard.md` (un joueur = une équipe).
> Code et base lus pour cadrer : `src/presentation/features/menu/{MenuPage,useMenuViewModel}.tsx`, `src/presentation/app/providers/{active-team,active-role}-provider.tsx`, `src/presentation/features/coach-team-stats/useTeamStatsViewModel.ts`, `src/domain/policies/{rbac-matrix,can}.ts`, `src/data/repositories/MatchEventRepositoryImpl.ts`, `supabase/migrations/20260924100000_match_statistics_schema.sql`, `…20260929112002_player_stats_own_cards_rls.sql`, `…20260929100000_coach_team_stats_get_team_roster.sql`, `…20260901120018_convocation_responder_visibility_correction.sql`.

## Addendum — 2026-10-01 (second passage, décisions développeuse)

Les deux points bloquants de la première rédaction sont tranchés par la développeuse, dans cette même session. Ils **priment** sur le corps de la spec là où ils le contredisent ; le corps a été mis à jour en conséquence, le raisonnement d'origine est conservé (barré) au §5.

1. **PO-LB-01 — cartons des coéquipiers visibles d'un joueur : OUI.** Le joueur voit, pour chaque coéquipier de son équipe courante, le **nombre** de cartons jaunes et rouges — onglets Jaunes/Rouges et compteurs secondaires sur chaque ligne de chaque onglet. **Cette décision vaut décision PO-MS-02 pour le rôle Joueur/Joueuse.**
   - ⚠️ **Divergence explicite, décidée par la développeuse** : elle déroge à **MS-09** (`specs/match-stats.md` — tout événement non-`goal` staff-only) et renverse la position de **PO-PS-09** (`specs/player-stats.md` — publication des cartons d'un coéquipier à un joueur « interdite en l'état »). Ni l'un ni l'autre fichier n'est réécrit ; la divergence est tracée ici, même procédé que PO-PS-01/PO-PS-03. La consultation du Bureau (co-décideur nommé par PO-MS-02) n'a pas été mentionnée : décision **développeuse**, signalée, pas silencieuse.
   - **Forme technique (sous-question (c)) non précisée par la développeuse → défaut de la spec retenu** : **compteurs par joueur seuls**, via une **fonction en base bornée à l'équipe de saison courante de l'appelant**, renvoyant noms + compteurs. Les **lignes brutes** `match_events` de type carton restent **staff-only** (AC-MS-09/AC-MS-10 intacts sur la table). **Ne pas élargir `match_events_select_scoped`. Ne pas élargir `get_team_roster`.** Non bloquant, défaut retenu, **à confirmer en revue**.
   - La variante de repli « si non » (vue joueur sans onglets cartons) est **sans objet** — AC-LB-08 réécrit.

2. **PO-LB-02 — règle de classement : tranchée.**
   - **Ex æquo = même rang**, classement de compétition standard (1, 2, 2, 4).
   - **Joueurs à zéro inclus** sur les trois onglets, rendus dans un **style atténué (gris)**.
   - **L'ordre d'affichage à l'intérieur d'une égalité n'est qu'un ordre de présentation** (ex. alphabétique, ou buts décroissants sur les onglets cartons) — il ne change **jamais** le numéro de rang, identique pour tous les ex æquo. Le critère exact de départage d'affichage n'est pas figé par la développeuse : libre à la conception/implémentation, pourvu qu'il soit déterministe (AC-LB-13).
   - **Conséquence** : la barre « VOUS » a **toujours** un rang, puisqu'un joueur à zéro est classé.

## 0. Maquette — statut de registre

Trois instantanés existent dans le dépôt :

- `docs/designs/learderboard/Mob - Classements - 1.png` (onglet Buteurs)
- `docs/designs/learderboard/Mob - Classements - 2.png` (onglet Jaunes)
- `docs/designs/learderboard/Mob - Classements - 3.png` (onglet Rouges)

⚠️ Le dossier s'appelle **`learderboard`** (coquille) — chemin réel du dépôt, à reprendre verbatim, ne pas « corriger » dans un renvoi sans renommer le dossier. ⚠️ Les trois PNG sont **non commités** (`git status` : `?? docs/designs/learderboard/`) — à committer avec la ligne de registre ci-dessous.

`docs/designs/DESIGN_LINKS.md` §2 n'a **aucune ligne** pour cette feature. Les instantanés locaux existant, le §4 du registre place ce cas en **`instantané seul`** : aucun lien artifact à demander, ni maintenant ni plus tard. **Ligne à ajouter** (l'agent PO n'écrit pas hors de `specs/` — à recopier par designer-agent) :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| mobile-leaderboard — **classements de l'équipe (buteurs, jaunes, rouges), vue joueur et vue coach** (`Mob - Classements - {1,2,3}`) | — aucun lien fourni | 2026-10-01 | `docs/designs/learderboard/Mob - Classements - {1,2,3}.png` | **instantané seul** |

Les trois exports sont **un seul écran dans trois états d'onglet**, rendus en **vue joueur** (ligne propre mise en avant + barre « VOUS » en pied). Aucune variante coach n'est exportée : selon la demande, elle est identique **sans** la mise en avant de la position. ⚠️ La maquette montre des ex æquo à rangs séquentiels (deux joueurs à 2 jaunes classés 5ᵉ et 6ᵉ) : **corrigé par PO-LB-02** (même rang). Le contenu visuel n'est pas évalué ici.

⚠️ `CLAUDE.md` §9 : la maquette affiche des noms de personnes — aucun ne doit apparaître dans le code, les tests, les commits ni la documentation.

## 1. Périmètre

Un écran **en lecture seule** listant les joueurs de l'**équipe courante** classés selon trois critères, un par onglet : **buts**, **cartons jaunes**, **cartons rouges**, sur la **saison en cours**. Atteint depuis la carte « Classement » du Menu, aujourd'hui désactivée, qui devient navigable.

### Rattachement CDC et priorité

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Statistiques et exports — « tableaux de bord par rôle » | **P1** | La forme de l'écran (restitution agrégée). **Aucun export** |
| ~~Résultats et compétitions~~ | **inexistant** | Buts et cartons ne relèvent d'**aucun module du CDC** — constat hérité de PO-MS-08/PO-PS-08, **non résolu**. La donnée vient de `match_events` (`specs/match-stats.md`) par construction technique |

⚠️ **Ce n'est pas le « classements » d'ASC Legacy** (module P1, « points, badges, avantages, classements », grille à valider par le Bureau avant développement — CDC §8). Un classement de buteurs n'est pas un classement de points et ne doit jamais en tenir lieu (même règle qu'AC-CTS-08).

⚠️ **Glissement de sens de la carte du Menu** : `specs/menu.md` concevait « Classement » comme un **classement de championnat** (« 4e · 11 pts · J6 », source fédérale, P2). La présente feature y branche un **classement individuel interne à l'équipe**. Le classement de championnat reste hors périmètre.

### Contenu retenu — v1

| Élément | Source | Remarque |
|---|---|---|
| Onglet **Buteurs** | `match_events.event_type = 'goal'` (penalties transformés inclus, MS-16) | Jamais dérivé du score (`goals_for`, MS-01) |
| Onglet **Jaunes** | `event_type = 'yellow_card'` | Ouvert au joueur sous forme de compteurs (PO-LB-01 tranché) |
| Onglet **Rouges** | `event_type = 'red_card'` | Idem |
| Compteurs secondaires par ligne (les deux autres métriques) | mêmes agrégats | Visibles sur chaque ligne, pour le joueur comme pour le coach |
| Rang, nom, valeur de l'onglet actif | agrégat + effectif de l'équipe | Ex æquo = même rang (1, 2, 2, 4) ; joueurs à zéro inclus, style atténué (PO-LB-02 tranché) |
| **Mise en avant de sa propre ligne + barre « VOUS »** (rang, nom, valeur, accès à sa ligne) | — | **Vue joueur uniquement** (demande développeuse). Jamais pour la vue coach |

`penalty_missed` n'est **ni compté ni affiché** (staff-only pour tous, non demandé).

### Équipe et saison — « équipe sélectionnée (courante) »

- **Coach/Staff** : l'équipe sélectionnée via `ActiveTeamProvider` (`selectedCoachTeamId`), repli sur la première équipe, exactement comme `useTeamStatsViewModel`/`useCoachDashboardViewModel`. Aucun sélecteur d'équipe **sur cet écran**.
- **Joueur/Joueuse** : son unique équipe (`RoleAssignment.teamId`, hypothèse « un joueur = une équipe », `specs/player-dashboard.md`).
- **Compte multi-rôles** : l'équipe suit le **rôle actif** du tableau de bord (`ActiveRoleProvider`), comme la carte « Statistiques » (PO-CTS-06).
- **Saison** : en cours uniquement, évaluée par Postgres (`current_season()`) ; une ligne `teams` existe par saison. Aucun sélecteur de saison (absent de la maquette — PO-PS-06/PO-CTS-03 inchangés).
- **Compétitions** : toutes, `competition_type` n'existant toujours pas en base (PO-LB-03).

### Point d'entrée — carte « Classement » du Menu activée

La demande développeuse (« Enable leaderboard card in menu tab ») **tranche**, pour cette carte, le point laissé ouvert par `specs/menu.md` (addendum point 2, PO-MN-04) et maintenu par `specs/player-stats.md` (PO-PS-01) et `specs/coach-team-stats.md` (PO-CTS-06) :

- « Classement » devient une carte de navigation réelle (`MenuNavCard`) vers cet écran, rendue **à l'identique pour les 8 rôles**, sans condition `can()` — même règle qu'AC-PS-15.
- **`AC-MN-04` ne conserve plus que l'interdit de valeur chiffrée fabriquée** : plus aucune carte « Suivi de l'équipe » n'est désactivée. Sous-titre neutre, jamais « 4e · 11 pts · J6 ».
- `specs/menu.md` **n'est pas réécrit** — divergence assumée et tracée ici, même procédé que PO-PS-01.

### Hors périmètre — explicitement

- Toute écriture, toute correction d'un compteur.
- Tout export, copie, partage.
- Le classement de championnat de l'équipe (P2, source fédérale).
- Points, paliers, badges, avantages ASC Legacy, même statiques.
- Filtre de compétition, sélecteur de saison, sélecteur d'équipe sur l'écran.
- Les vues `team_match_record` / `team_scorer_ranking` : jamais construites (PO-CTS-02), et définies **championnat seul** (AC-MS-07) — ne pas les construire ni les détourner pour cet écran.
- Classements d'assiduité, de note ou de vote (homme du match — PO-PS-04).
- La lecture des **lignes brutes** de cartons d'un coéquipier par un joueur (seuls les compteurs sont ouverts, PO-LB-01).
- Accès pour les rôles autres que Joueur/Joueuse et Coach/Staff (PO-LB-05).

## 2. RBAC

### Lecture de la matrice CDC

Ligne applicable : « **Voir les dossiers des autres membres** » — Joueur ❌, Coach ❌ (son équipe, hors financier), Resp. section ✅ (sa section), Dirigeant ✅, Trésorier ❌ (financier), Référent médical ❌ (santé), Bénévole ❌, Admin ✅. Le nom et les buts d'un coéquipier sont déjà admis comme visibles de toute l'équipe (MS-09 : le contexte d'équipe partagé n'est pas « voir le dossier »). Les **compteurs de cartons** d'un coéquipier sont désormais ouverts au joueur par décision développeuse (PO-LB-01, vaut PO-MS-02 pour le joueur) — **dérogation explicite à MS-09**, pas une lecture de la matrice.

| Rôle | Interaction avec cet écran |
|---|---|
| **Joueur / Joueuse** | Lecture, **son équipe uniquement**, trois onglets. Compteurs de buts et de cartons de chaque coéquipier (jamais les lignes brutes de cartons). Sa propre ligne mise en avant + barre « VOUS » |
| **Coach / Staff** | Lecture, **équipe sélectionnée uniquement** (parmi ses équipes). Trois onglets — les cartons de son équipe lui sont déjà ouverts (`match_staff_events:view`, MS-09). **Aucune mise en avant de position** |
| Responsable de section | Carte rendue (8 rôles), aucun classement servi en tant que tel : état vide. Matrice ✅ sur sa section — écart assumé, PO-LB-05 |
| Dirigeant habilité | Idem, PO-LB-05 |
| Trésorier | Carte rendue, état vide. Aucune donnée sportive d'un tiers |
| Référent médical | Carte rendue, état vide. Un carton n'est pas une donnée de santé et ne s'ouvre pas à ce titre |
| Bénévole | Carte rendue, état vide |
| Administrateur | Carte rendue, état vide. Aucun point d'entrée admin construit (statu quo RLS non retiré) — PO-LB-05 |

Les rôles sans tableau de bord tombent sur le rôle actif par défaut `'player'` (`active-role-provider.tsx`) sans équipe : c'est l'état vide « aucune équipe », jamais une erreur (dette PO-MN-07, non introduite ici).

**AC-01 / AC-02 (CDC §17.2)** s'appliquent intégralement : la borne de portée est **l'équipe courante** de l'appelant.

### Aucune entrée de matrice

Critère de `rbac-matrix.ts` (et décision du 2026-08-11) : une entrée ne se justifie que si `presentation/` doit décider quelque chose **avant ou indépendamment** du résultat de la requête.

- **Mise en avant de la position** : dépend du **rôle actif** du tableau de bord, pas d'une autorisation — c'est une variante de présentation, au même titre que la bascule onglets/à plat de `profile-page` (« cardinalité, pas autorisation »). **Pas d'entrée.**
- **Écran** : rendu pour quiconque l'atteint ; le contenu est ce que la base renvoie (classement de son équipe, ou état vide). **Pas d'entrée** — RLS/fonction en base seules.
- **Onglets cartons** : PO-LB-01 tranché oui → mêmes onglets pour joueur et coach, aucune décision front. **Pas d'entrée.**

Si l'implémentation choisit quand même de garder l'écran par `can()`, réutiliser `match_goals:view` (`['player','coach']`, déjà dans les deux `requiresTeamScope` de `can.ts`) plutôt que créer `leaderboard:view` — à signaler, pas à inventer (`CLAUDE.md` §7).

### Application technique — la sécurité réelle est en base

- **Coach** : `match_events_select_scoped` lui ouvre déjà toutes les lignes de son équipe ; `get_team_roster(p_team_id)` lui ouvre déjà l'effectif (coach/admin seuls).
- **Joueur** : aujourd'hui il ne peut lire **ni** les lignes de cartons d'un coéquipier (liste blanche `goal`, AC-MS-09/10), **ni** l'effectif nominatif de son équipe hors contexte de convocation (`get_team_roster` exclut délibérément `is_team_member` ; `users_select_own` reste fermé).
- **Forme retenue (défaut de la spec, PO-LB-01 (c) — non bloquant, à confirmer en revue)** : **une fonction en base nouvelle**, bornée en interne à l'équipe de **saison courante** de l'appelant (`private.is_team_member` / `private.is_coach_of_team`, `current_season()`), renvoyant **par joueur de l'effectif : `user_id`, nom affiché, nombre de buts, de jaunes, de rouges** — jamais de ligne brute `match_events`, jamais une autre colonne de `users`. Même patron que PO-PS-02 (agrégats seuls, la RLS de la table reste fermée).
- **Interdits** : **ne pas élargir `match_events_select_scoped`** (les lignes brutes de cartons restent staff-only, AC-MS-09/AC-MS-10 inchangés — y compris dans l'onglet « Résultat » côté API) ; **ne pas élargir `get_team_roster`** (sa borne coach/admin est un choix documenté de `coach-team-stats`, AC-CTS-02).
- Toute fonction ajoutée : `set search_path = ''`, noms schéma-qualifiés, aucun paramètre d'identité de l'appelant (`auth.uid()` interne), `execute` révoqué de `public`/`anon`, accordé à `authenticated`, commentaire SQL nommant la règle et la décision PO-LB-01. Si elle est `SECURITY DEFINER`, le prédicat d'équipe explicite **est** la frontière d'autorisation (leçon de `get_convocation_responders`) ; une vue d'agrégat éventuelle est en `security_invoker = true` (AC-MS-19).

## 3. Données sensibles

- **Santé** : aucune. Un carton n'est **pas** une donnée de santé (`specs/match-stats.md` §3) — ne jamais le rapprocher du périmètre du Référent médical.
- **Financier** : aucune. Pas d'amende disciplinaire chiffrée (relèverait de Cotisations, P1).
- **Données nominatives de tiers — le vrai sujet.** Les **buts** d'un coéquipier sont déjà publics dans l'équipe (MS-09). Les **cartons** sont une **donnée nominative défavorable**, staff-only par construction (« discrétion disciplinaire », MS-09). La décision PO-LB-01 **publie et classe** désormais leurs **compteurs** à toute l'équipe — choix assumé par la développeuse, dérogeant explicitement à MS-09 et à PO-PS-09. La protection résiduelle tient à la forme retenue : **compteurs seuls**, aucune ligne brute (match, date) d'un carton de coéquipier n'est exposée au joueur (AC-LB-08).
- **Journal d'audit** : aucune action du CDC §11.3 n'est déclenchée (consulter un classement n'est ni une consultation de donnée santé, ni un export nominatif). La frontière avec « export nominatif » tient **parce qu'il n'y a aucun export** (AC-LB-11) ; en ajouter un en ferait une action tracée par **trigger Postgres**, jamais depuis un composant. La table `audit_log` existe (`web-audit-logs`) mais n'est pas sollicitée par cette feature.
- **Rétention** : rien de stocké, tout est calculé à la lecture — aucune catégorie de rétention nouvelle.

## 4. Critères d'acceptation

`AC-01`/`AC-02` du CDC §17.2 ; critères propres préfixés **`AC-LB-`** (même convention qu'`AC-PS-`/`AC-CTS-`), à renuméroter en recette.

| Réf. | Critère |
|---|---|
| **AC-01** | Aucune donnée d'un membre extérieur à l'équipe courante de l'appelant n'est accessible, ni à l'écran ni dans la réponse API |
| **AC-02** | Un jeton joueur ou coach de l'équipe A demandant le classement de l'équipe B n'obtient **aucun champ** — vérifié **par appel direct à l'API**, hors application. Un coach multi-équipes n'obtient que ses propres équipes |
| AC-LB-01 | La carte « Classement » du Menu est navigable vers cet écran, rendue à l'identique pour les 8 rôles, sans valeur chiffrée fabriquée en sous-titre ; « Statistiques » est inchangée ; `BottomNav` n'est pas modifiée |
| AC-LB-02 | L'écran est en **lecture seule** : aucune requête d'écriture n'est émise depuis cette route |
| AC-LB-03 | L'équipe affichée est l'équipe **sélectionnée** (`ActiveTeamProvider`) pour un coach, l'équipe unique pour un joueur, celle du **rôle actif** pour un compte multi-rôles. Aucun sélecteur d'équipe n'est rendu sur l'écran |
| AC-LB-04 | Tous les compteurs sont bornés à la **saison en cours** évaluée par Postgres (`current_season()`), jamais par une date client |
| AC-LB-05 | Le compteur de buts compte les lignes `match_events` `event_type = 'goal'`, `is_penalty` inclus, jamais dérivé de `goals_for` ; `penalty_missed` n'est ni compté ni renvoyé |
| AC-LB-06 | Pour un même joueur et une même saison, les valeurs (buts, jaunes, rouges) sont **identiques** à celles de `player-stats` (vue joueur) et de `coach-team-stats` (vue coach) — une seule règle de comptage, pas une troisième |
| AC-LB-07 | **Vue joueur** : sa propre ligne est mise en avant et une barre « VOUS » affiche **toujours** son rang, son nom et la valeur de l'onglet actif — y compris à zéro, un joueur à zéro étant classé (PO-LB-02). En cas d'ex æquo, la barre affiche le **rang partagé**. **Vue coach** : aucune ligne mise en avant, aucune barre « VOUS », y compris si le compte coach est aussi joueur de cette équipe (PO-LB-06) |
| AC-LB-08 | Un jeton joueur obtient, pour chaque coéquipier de son équipe courante, les **compteurs** de jaunes et de rouges (onglets Jaunes/Rouges et compteurs secondaires de chaque ligne — PO-LB-01). En revanche, **aucune ligne brute** `match_events` de type carton d'un coéquipier ne lui est renvoyée : un `SELECT` direct sur `public.match_events` avec un jeton joueur ne renvoie toujours que les lignes `goal` de son équipe et ses propres lignes (AC-MS-09/AC-MS-10 inchangés). Vérifié par appel direct à l'API. ~~Variante de repli « onglets cartons absents de la vue joueur »~~ — **sans objet** depuis PO-LB-01 |
| AC-LB-09 | La lecture joueur ne renvoie que `user_id`, nom affiché et compteurs — aucune autre colonne de `users`, aucun identifiant de ligne `match_events`. Vérifié sur la **forme de la réponse API** (leçon d'AC-MD-08) |
| AC-LB-10 | Aucun point, palier, badge ni avantage ASC Legacy n'est rendu, même statique ; le classement n'est jamais présenté comme un classement de points |
| AC-LB-11 | Aucun export, partage ni copie n'est rendu, pour aucun rôle — absence, pas désactivation |
| AC-LB-12 | Aucun filtre de compétition ni sélecteur de saison n'est rendu (absence, pas contrôle inerte) |
| AC-LB-13 | **Rang** : classement de compétition standard — les ex æquo partagent le **même** numéro de rang et le rang suivant saute d'autant (valeurs 9, 7, 7, 3 → rangs 1, 2, 2, 4). L'ordre d'affichage à l'intérieur d'une égalité est un critère de présentation **déterministe** (deux chargements donnent le même ordre) qui ne modifie **jamais** le numéro de rang |
| AC-LB-14 | **Tous les joueurs de l'effectif courant** figurent dans chacun des trois onglets, y compris à **zéro** ; une ligne dont la valeur de l'onglet actif est zéro est rendue dans un **style atténué (gris)**, sans que la couleur porte seule l'information (la valeur « 0 » reste lisible en texte) |
| AC-LB-15 | États vides distincts et explicites, jamais une erreur ni un chargement infini : aucune saison courante, aucune équipe (dont les 6 rôles sans tableau de bord), effectif vide. « Aucun match joué » n'est **pas** un état vide : l'effectif est rendu à zéro, style atténué (AC-LB-14) |
| AC-LB-16 | En-tête à flèche retour `sticky top-0`, fond opaque ; la barre « VOUS » reste visible au défilement sans masquer la dernière ligne (`CLAUDE.md` §6) |
| AC-LB-17 | Onglets et contrôles : cible tactile ≥ ~44 px (`h-11`), `min-w-0` sur les éléments côte à côte, vérifiés sur un viewport mobile réel ; la couleur (pastilles jaune/rouge/vert, style atténué) est toujours doublée d'un libellé textuel ; contrastes AA, navigation clavier (CDC §12) |
| AC-LB-18 | Affichage complet en moins de 3 s sur mobile en réseau normal (CDC §12) |

## 5. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-LB-01** | ~~**Un joueur voit-il les cartons jaunes/rouges de ses coéquipiers ?** Renversement de MS-09/AC-MS-09 et de PO-PS-09 ; PO-MS-02 nomme « Développeuse / Bureau ». À confirmer : (a) vaut décision PO-MS-02 ? (b) Bureau consulté ? (c) forme technique ?~~ **TRANCHÉ (2026-10-01, décision développeuse)** : **oui**, compteurs par joueur sur les onglets Jaunes/Rouges et sur chaque ligne. (a) **Vaut décision PO-MS-02 pour le rôle joueur.** (b) Bureau non mentionné — décision développeuse, divergence explicite avec MS-09 et PO-PS-09, tracée en addendum. (c) **Non précisée → défaut retenu** : compteurs seuls via fonction en base bornée à l'équipe de saison courante de l'appelant, `match_events_select_scoped` et `get_team_roster` **non élargis** (§2) | Développeuse (tranché) | **Non — résolu.** Forme technique (c) : **non bloquante, défaut retenu, à confirmer en revue** |
| **PO-LB-02** | ~~**Règle de classement** (rangs séquentiels ou partagés, départage, zéros inclus ?)~~ **TRANCHÉ (2026-10-01, décision développeuse)** : ex æquo = **même rang** (1, 2, 2, 4) ; joueurs à **zéro inclus**, style **atténué (gris)** ; l'ordre à l'intérieur d'une égalité n'est qu'un ordre d'affichage (ex. alphabétique, ou buts décroissants sur les onglets cartons), sans effet sur le rang. La barre « VOUS » a donc toujours un rang (AC-LB-07/13/14) | Développeuse (tranché) | **Non — résolu.** Le critère exact d'ordre d'affichage dans une égalité est laissé à la conception, pourvu qu'il soit déterministe |
| **PO-LB-03** | **Toutes compétitions ou championnat seul ?** `competition_type` n'existe pas (bloc STOP de la migration `match-stats`, PO-CTS-01) ; `team_scorer_ranking` était défini championnat seul (AC-MS-07). Position v1 de fait : toutes compétitions, comme `player-stats` (PO-PS-05) et `coach-team-stats` — mais la divergence avec AC-MS-07 est à acter, pas à laisser implicite | Développeuse + Bureau | Non — v1 toutes compétitions |
| **PO-LB-04** | **Joueur ayant quitté l'équipe / événement d'un compte hors effectif courant** : apparaît-il au classement ? L'effectif se lit depuis `user_roles` courant (même limite acceptée que PO-PS-10/ex-PO-CV-05) | Développeuse | Non — par défaut l'effectif courant fait foi, à confirmer |
| **PO-LB-05** | **Élargissement** à Responsable de section, Dirigeant habilité, Administrateur (matrice ✅ sur « dossiers des autres membres ») — même écart assumé que PO-CTS-05/PO-MS-01 ; ces rôles n'ont pas de tableau de bord ni d'équipe active | Bureau + développeuse | Non |
| **PO-LB-06** | **Compte coach et joueur de la même équipe, rôle actif coach** : AC-LB-07 retient « aucune mise en avant » (lecture stricte de la demande, la variante suit le rôle actif). À confirmer | Développeuse | Non |
| **PO-LB-07** | **Convocations annulées / matchs sans score** : leurs événements comptent-ils ? AC-LB-06 impose l'alignement sur `player-stats`/`coach-team-stats` ; si ces deux écrans divergent entre eux sur ce point, le signaler plutôt que choisir | Développeuse | Non |

### Ce qui reste explicitement OPEN et ne doit pas être résolu implicitement

- Ne pas ajouter `competition_type` « en passant » avec une valeur de reprise devinée.
- Ne pas construire `team_scorer_ranking` pour cet écran.
- Ne pas élargir `match_events_select_scoped` ni `get_team_roster` — la forme retenue pour PO-LB-01 s'en passe ; toute autre forme se décide en revue, pas à l'implémentation.
- Aucune grille ASC Legacy, aucune colonne « points ».

## 6. Note pour designer-agent

- **Maquette** : `docs/designs/learderboard/Mob - Classements - {1,2,3}.png`, statut `instantané seul` — ne rien demander ; ajouter la ligne de registre du §0.
- **Deux variantes, un écran** : vue joueur = maquette telle quelle (trois onglets, compteurs de cartons des coéquipiers inclus — PO-LB-01) ; vue coach = identique **sans** ligne mise en avant **ni** barre « VOUS » (AC-LB-07).
- **Correction vs maquette — rangs** : ex æquo au **même rang** (1, 2, 2, 4), pas les rangs séquentiels de la maquette (PO-LB-02, AC-LB-13). Choisir un ordre d'affichage déterministe à l'intérieur d'une égalité.
- **Lignes à zéro** : toujours rendues, style atténué gris, valeur « 0 » lisible (AC-LB-14) ; la barre « VOUS » affiche toujours un rang, partagé le cas échéant.
- **Point d'entrée** : carte « Classement » du Menu → `MenuNavCard` (patron déjà utilisé par « Statistiques »), sous-titre neutre.
- **États** : AC-LB-15. **Mobile** : AC-LB-16/17 (`BackHeader` sticky, barre « VOUS » ancrée en bas sur le patron `sticky bottom-0`, `h-11`, `min-w-0`, couleur jamais seule).
- Rappel `CLAUDE.md` §9 : aucun nom de la maquette dans le code, les tests ou la doc.

## UI design

> designer-agent, 2026-10-01. Références ouvertes : `docs/designs/learderboard/Mob - Classements - 1.png` (Buteurs), `… - 2.png` (Jaunes), `… - 3.png` (Rouges) — dossier orthographié `learderboard` tel quel. Références de langage visuel réutilisées : `docs/designs/stats/coach/[Mobile] Coacg - Stats 1.png` (ligne d'effectif, compteurs secondaires), `docs/designs/menu/[v0] Mob - Menu.png` (grille de cartes du Menu). Aucun composant visuel nouveau n'est nécessaire : l'écran est une liste de lignes avec onglets, des patrons déjà couverts. Aucune question bloquante (voir « Questions ouvertes »).

### 1. Emplacement dans la navigation

- **Destination : Menu** (l'une des 4 entrées fixes). Entrée par la carte « Classement » de la section « Suivi de l'équipe » (`MenuPage.tsx`), aujourd'hui un `DisabledMenuCard`.
- **Route poussée, hors `AppShell`** : même statut que `/stats`, `/team-stats` et `/profile` (`router.tsx`) — pas de `BottomNav`, flèche retour. Nouvelle route proposée : `/leaderboard` (nom à confirmer à l'implémentation). `BottomNav` inchangée (AC-LB-01).
- **Carte du Menu** : remplacer `DisabledMenuCard` par `MenuNavCard` (`src/presentation/features/menu/components/MenuNavCard.tsx`), icône `IconTrophy` conservée, titre « Classement », **sous-titre neutre « Buts, cartons »** (jamais « 4e · 11 pts · J6 », AC-MN-04). Rendue à l'identique pour les 8 rôles, sans `can()`, en place dans la grille 2 colonnes à côté de « Statistiques » (déjà `min-w-0`, `truncate`). Un rôle sans équipe atteint l'écran et voit l'état vide (AC-LB-15), pas une carte masquée.

### 2. Structure de l'écran (de haut en bas)

1. **`BackHeader`** (`src/presentation/shared/layout/BackHeader.tsx`, déjà `sticky top-0`, fond opaque `bg-coach-bg`, bouton retour `size-11`) avec `title="Classements"`. Réutilisé tel quel, pas de variante.
2. **Barre d'onglets** Buteurs / Jaunes / Rouges, sous le header. Trois onglets de largeur égale ou ajustée au contenu, **pas** de sélecteur d'équipe, de saison ni de compétition (AC-LB-03/12). Voir §4.
3. **Liste de lignes** de l'onglet actif (§3), une `<ol>` ; espacement vertical entre lignes comme `TeamRosterStatRow` (`gap-2`).
4. **Barre « VOUS »** ancrée en pied (vue joueur uniquement, §5).

Conteneur : `flex min-h-screen flex-col bg-coach-bg text-white`, marges latérales `px-5.5` (comme `TeamStatsPage`). Le contenu de liste prend un `pb` suffisant pour que la dernière ligne ne soit jamais masquée par la barre « VOUS » (AC-LB-16) ; en vue coach (pas de barre), `pb-10` comme `TeamStatsPage`.

### 3. Anatomie d'une ligne

De gauche à droite, une seule rangée, hauteur ≥ 44 px (ligne entière, même non interactive — cohérence de rythme) :

| Zone | Contenu | Remarque |
|---|---|---|
| **Rang** | Numéro (ex. « 1 », « 2 », « 2 », « 4 »), largeur fixe (~`w-8`), `tabular-nums`, aligné à gauche | Les 3 premiers rangs gardent l'accent de la maquette (or / blanc / bronze) — **la couleur est décorative, le chiffre porte l'information**. Les ex æquo reçoivent le **même** chiffre ET la même couleur (deux joueurs au rang 2 sont tous deux « blanc »). Le rang suivant saute (1, 2, 2, 4). Correction vs maquette 2 (5ᵉ/6ᵉ séquentiels) |
| **Nom** | Nom affiché, `truncate`, `min-w-0 flex-1` | Pas d'avatar : la maquette n'en montre aucun (le rang remplace l'identité visuelle). N'ajoute pas `InitialsAvatar` |
| **Compteurs secondaires** | Sous le nom, petite ligne : les **deux autres** métriques que celle de l'onglet actif, chacune = pastille + valeur | Onglet Buteurs : jaune, rouge. Onglet Jaunes : buts, rouge. Onglet Rouges : buts, jaune. Pastille buts = `Dot` cerclé vert (maquette 2/3), jaune/rouge = `Dot` plein (`bg-coach-amber` / `bg-coach-red`, déjà utilisés par `TeamRosterStatRow`). Valeur toujours en chiffre ; chaque paire pastille+valeur porte un `sr-only` (« 2 jaunes », « 0 rouge », « 14 buts ») — la pastille seule ne signifie rien pour un lecteur d'écran |
| **Valeur principale** | Grand chiffre à droite (`text-[20px] font-black`, aligné droite, `shrink-0 tabular-nums`) | Valeur de l'onglet actif, toujours lisible en texte, y compris « 0 » (AC-LB-14) |

Classes de couleur : les tokens `coach-*` existants (`coach-bg`, `coach-green`/`coach-green-text`, `coach-amber`, `coach-red`/`coach-red-text`). Préférer les utilitaires Tailwind prédéfinis aux valeurs entre crochets quand il en existe (mémoire projet) ; les tailles `text-[20px]` suivent la convention déjà présente dans `TeamRosterStatRow`.

**Fond de ligne** : même carte discrète que `TeamRosterStatRow` (`rounded-2xl border border-white/15 bg-white/8`) ou le trait de séparation plat de la maquette — au choix de l'implémentation, **sans introduire un troisième style** ; la maquette est à fond transparent avec filet bas, et c'est la référence prioritaire. Retenir le filet bas de la maquette pour une liste de classement dense.

**Ordre d'affichage et départage (PO-LB-02, déterministe)** — critère proposé, à valider en revue :
- Tri principal : valeur de l'onglet, décroissante.
- Départage **d'affichage seulement** (jamais le rang) : sur **Buteurs**, jaunes puis rouges croissants n'est PAS retenu (trop punitif, et la valeur-cartons n'est pas un mérite) ; on retient **ordre alphabétique du nom affiché** (insensible à la casse et aux accents) pour **les trois onglets**, plus simple à expliquer et sans lecture implicite de discipline. Dernier recours si deux noms sont identiques : `user_id`. Résultat : deux chargements donnent le même ordre (AC-LB-13).
- Les ex æquo adjacents n'ont aucun séparateur visuel particulier ; le chiffre de rang répété suffit.

**Style atténué (valeur = 0 dans l'onglet actif, AC-LB-14)** : la ligne entière en `opacity` réduite / texte `text-white/40` (nom, rang, valeur « 0 » et compteurs), sans changer la mise en page. Contraste à vérifier AA pour le **texte lisible** : si `text-white/40` sur `bg-coach-bg` ne tient pas 4.5:1, monter à `text-white/50` ou `/60` — la lisibilité prime sur l'effet « gris » (la valeur « 0 » doit rester lisible). La couleur n'est pas seule : le chiffre « 0 » est affiché. Les rangs des joueurs à zéro suivent la règle compétition (ex. 5 joueurs à 0 sur 10 après 5 classés : tous au rang 6). La pastille colorée du compteur secondaire à zéro est elle aussi atténuée, comme dans la maquette (pastille sombre à 0).

Les lignes de l'effectif ne sont **pas interactives** (aucun détail joueur n'est prévu) : `<li>` simple, pas de `Link`, pas de chevron, pas d'état pressé. Seule la barre « VOUS » est un contrôle (§5).

### 4. Onglets Buteurs / Jaunes / Rouges

- **Composant** : shadcn `Tabs` / `TabsList` / `TabsTrigger` déjà installé (`src/presentation/shared/components/ui/tabs.tsx`), **pas de `npx shadcn add` requis**. Variante visuelle de la maquette : onglets **soulignés** (texte + pastille ronde/carrée colorée + trait coloré sous l'actif, filet gris sur toute la largeur), et non la « pilule » segmentée par défaut du `TabsList`. Surcharger au site d'appel : `TabsList` sans fond (`bg-transparent`), `h-11`, `w-full justify-start gap-6`, `rounded-none` ; `TabsTrigger` `h-11 flex-none px-0` + trait bas coloré via `data-[state=active]`. Ne pas modifier `tabs.tsx` (vendored, CLAUDE.md §2) — les surcharges vivent dans le composant de l'écran. À défaut d'être praticable, la bascule existante `TeamStatsFilterSegment` (`src/presentation/features/coach-team-stats/components/TeamStatsFilterSegment.tsx`) est le repli (même problème résolu, à ouvrir avant de réécrire).
- **Contenu** : un seul panneau de liste, ré-rendu selon l'onglet actif (même `<ol>`, données déjà chargées pour les trois — une requête, pas trois). `TabsContent` unique ou valeur de l'onglet dans l'état du ViewModel.
- **Accent par onglet** : vert (Buteurs), jaune/ambre (Jaunes), rouge (Rouges) — pastille de l'onglet, trait souligné, valeur principale de la ligne propre et barre « VOUS » (§5) reprennent la couleur de l'onglet actif, comme dans les trois maquettes.
- **Libellé** : « Buteurs », « Jaunes », « Rouges » toujours en texte, pastille décorative (`aria-hidden`).
- **Défaut** : Buteurs. L'onglet actif est un état local d'écran, non persisté, non dans l'URL.
- **Touch target** : `h-11` minimum, trois onglets tiennent sur 320 px de large (texte ~15 px + pastille + `gap-6`) ; `min-w-0` sur la rangée. Si un viewport très étroit l'étouffe, réduire `gap` avant de tronquer un libellé.
- **Clavier / a11y** : Radix `Tabs` fournit `role="tablist"`/`tab`/`tabpanel`, flèches gauche/droite, `aria-selected`. Garder le `TabsContent` associé pour que `aria-controls` soit valide.

### 5. Ligne mise en avant et barre « VOUS » (vue joueur uniquement)

**Qui** : rôle actif joueur (PO-LB-06 : un compte coach+joueur en rôle actif coach n'a ni l'un ni l'autre). Variante de présentation sur le **rôle actif**, pas une permission (§2, aucune entrée de matrice) : le ViewModel expose un booléen, le composant branche dessus.

**Ligne propre** (liste) : fond teinté de la couleur de l'onglet actif (vert / ambre / rouge, faible opacité) + fine bordure de même teinte, nom en gras blanc, valeur principale dans la couleur de l'onglet, petite pastille ronde de la couleur de l'onglet à côté du nom (comme maquette). **La mise en avant ne repose pas que sur la couleur** : nom en gras ET libellé accessible `sr-only` « Vous » ajouté devant le nom, et `aria-current="true"` sur le `<li>`. Si la ligne propre est à zéro, le **style atténué ne s'applique pas** : l'emphase l'emporte (mise en avant > atténuation), la valeur « 0 » est dans la couleur de l'onglet comme maquette 3 — décision de design à confirmer (voir Questions ouvertes, UI-LB-01).

**Barre « VOUS »** : conteneur `sticky bottom-0` (patron des barres de soumission ancrées, CLAUDE.md §6), pleine largeur moins marges, **opaque** (le fond teinté sur fond noir de la maquette doit reposer sur un fond plein `bg-coach-bg` en dessous, sinon les lignes transparaissent), marge basse `pb-[max(1rem,env(safe-area-inset-bottom))]` (pas de `BottomNav` sur cette route, donc rien d'autre ne l'occupe). Contenu : libellé « VOUS » (petites capitales espacées, `tracking-wider`), `#<rang> · <nom>`, valeur de l'onglet actif dans la couleur d'onglet, flèche vers le bas. Fond, bordure et valeur reprennent la teinte de l'onglet actif (vert / ambre / rouge), comme les trois maquettes.
- **Rang** : toujours présent, **rang partagé** en cas d'égalité (ex. « #2 »), y compris pour un joueur à zéro (AC-LB-07).
- **Interaction** : c'est un **bouton** (`h-11` minimum, ~48 px comme maquette) qui fait **défiler la liste jusqu'à la ligne propre** (scroll into view) et l'amène visible ; la flèche vers le bas de la maquette signale cet accès. Quand la ligne propre est déjà entièrement visible dans la fenêtre, la barre reste affichée mais le geste est inoffensif (pas de masquage dynamique, plus simple et plus prévisible). Pas de navigation, pas de modale. Le focus clavier reste sur le bouton, et on déplace le focus sur la ligne propre après le scroll pour les lecteurs d'écran (`tabIndex={-1}` programmatique sur la ligne) — ou, plus simple, pas de déplacement de focus et un `aria-label` explicite sur le bouton (« Aller à ma ligne, rang 4, 3 cartons jaunes ») ; choix laissé à l'implémentation, le second est suffisant.
- **Changement d'onglet** : la barre se met à jour avec le rang et la valeur de l'onglet (le rang d'un même joueur diffère d'un onglet à l'autre : #6 Buteurs, #4 Jaunes, #6 Rouges dans les maquettes).
- **Vue coach** : ni ligne mise en avant, ni barre. La liste est identique, `pb-10` (pas de réserve pour la barre).

### 6. États

Les écrans de chargement/erreur des écrans poussés actuels (`TeamStatsPage`) sont de simples `<p>` ; ici, les équivalents sont **un peu plus soignés mais sans nouveau composant**.

| État | Rendu |
|---|---|
| **Chargement** | `BackHeader` et barre d'onglets restent affichés (ils ne dépendent pas des données), puis ~8 lignes **`Skeleton`** (`src/presentation/shared/components/ui/skeleton.tsx`, déjà installé — pas de `npx shadcn add`) à la hauteur d'une ligne réelle, pour éviter un saut de mise en page. Pas de barre « VOUS » ni squelette de barre. `aria-busy="true"` sur la liste, texte `sr-only` « Chargement du classement ». Cible : affichage complet < 3 s (AC-LB-18) |
| **Erreur** | `BackHeader` conservé (retour toujours possible), message `role="alert"` « Impossible de charger le classement. », bouton **« Réessayer »** `h-11` (relance la requête — `refetch` du ViewModel). Jamais d'écran blanc ni de chargement infini (AC-LB-15). Un message d'erreur n'expose aucun détail technique |
| **Aucune équipe** (dont les 6 rôles sans tableau de bord) | `EmptyState` partagé (`src/presentation/shared/components/EmptyState.tsx`, icône + un message) avec « Aucune équipe à afficher pour le moment. » Pas d'onglets ni de barre « VOUS » |
| **Aucune saison en cours** | Même composant, message distinct : « Aucune saison en cours actuellement. » (wording déjà utilisé par `TeamStatsPage`, AC-CTS-16) |
| **Effectif vide** | Même composant, message distinct : « Aucun joueur dans cette équipe pour le moment. » |
| **Aucun match joué** | **Pas un état vide** (AC-LB-15) : la liste complète est rendue, toutes lignes à 0 en style atténué, tous au **rang 1** (égalité totale). Pour le joueur, la barre « VOUS » affiche « #1 · … · 0 ». Une **ligne d'information discrète sous les onglets** (« Aucun but cette saison pour l'instant. » / « Aucun carton jaune… » / « Aucun carton rouge… »), `text-[13px] text-white/50`, seulement quand **tous** les compteurs de l'onglet actif sont à zéro, explique l'écran uniforme sans le masquer. Pas d'état vide trompeur |

Les trois états vides (équipe / saison / effectif) partagent un composant mais **trois libellés différents** (AC-LB-15 : distincts et explicites). Pas de nouveau composant : `EmptyState` suffit (message unique).

### 7. Ce qui change par rôle (renvoi au §2 RBAC — rien n'est redéfini ici)

| Rôle actif | Écran |
|---|---|
| **Joueur / Joueuse** | 3 onglets, effectif de **son** équipe, compteurs de cartons des coéquipiers inclus (PO-LB-01), **ligne propre mise en avant + barre « VOUS »** |
| **Coach / Staff** | Identique **sans** ligne mise en avant ni barre « VOUS ». Équipe = équipe sélectionnée au tableau de bord (aucun sélecteur ici) |
| Les 6 autres rôles | Carte rendue ; l'écran affiche l'état « Aucune équipe » |

Un même composant de liste sert les deux vues : seul un booléen (`showOwnRowEmphasis` calculé par le ViewModel depuis le rôle actif, jamais `can()`) et l'identifiant du joueur courant diffèrent.

### 8. Composants

| Besoin | Composant | Installation |
|---|---|---|
| Onglets | shadcn `Tabs`/`TabsList`/`TabsTrigger` (`ui/tabs.tsx`) | Déjà présent. **Aucun `npx shadcn add`**. Note : le fichier est signalé « hand-authored » dans son en-tête — recoller à `npx shadcn diff tabs` à l'occasion |
| Squelettes | shadcn `Skeleton` (`ui/skeleton.tsx`) | Déjà présent |
| Avatar | shadcn `Avatar` | **Non utilisé** (maquette sans avatar) |
| Bouton « VOUS » / « Réessayer » | shadcn `Button` (`ui/button.tsx`), surcharge `h-11` | Déjà présent |
| Retour | `BackHeader` (`shared/layout/`) | Existant |
| États vides | `EmptyState` (`shared/components/`) | Existant |
| Pastilles | `Dot` (`shared/components/Dot.tsx`) | Existant ; la pastille « buts » cerclée (maquettes 2/3) peut nécessiter une variante (bordure sans fond) via `className`, à l'appel |
| **Nouveaux composants locaux** (`presentation/features/<leaderboard>/components/`) | `LeaderboardTabs`, `LeaderboardRow`, `YouBar` (+ éventuellement `LeaderboardSkeleton`) | Locaux à la feature, pas partagés (un seul consommateur) |

Aucun composant ne se justifie dans `shared/` : un seul écran les consomme. **Aucun `npx shadcn add` nécessaire pour cette feature.**

### 9. Mobile : cibles tactiles et côte à côte (CLAUDE.md §6)

- Onglets : `h-11`. Barre « VOUS » : `h-11` minimum (la maquette ~48 px convient). Bouton « Réessayer » : `h-11`. Retour : `size-11` déjà en place.
- **Rangée de ligne** (rang | nom | valeur) : disposition côte à côte — rang à largeur fixe (`w-8 shrink-0`), nom `min-w-0 flex-1` + `truncate`, valeur `shrink-0`. **Chaque élément flex porte `min-w-0` ou `shrink-0` explicitement** ; sans `min-w-0` sur le bloc du nom, un nom long pousse la valeur hors écran. Vérifier avec un nom long à **320–360 px** de large.
- **Rangée des compteurs secondaires** (deux paires pastille+valeur) : `flex` avec `gap`, `min-w-0`, aucun retour à la ligne forcé ; deux paires de ≤ 3 caractères tiennent sans troncature à 320 px.
- **Barre « VOUS »** : contenu en trois zones (« VOUS » | `#rang · nom` | valeur+flèche) ; la zone du nom est `min-w-0 flex-1 truncate`, les deux autres `shrink-0`.
- À vérifier à un **vrai viewport mobile**, pas une fenêtre de bureau redimensionnée.

### 10. Accessibilité (AC-LB-17, CDC §12)

- Liste sémantique : `<ol>` (le rang a un sens ordonné), chaque ligne `<li>`. Les ex æquo : chiffre répété, pas d'`aria-label` incohérent avec l'ordre.
- Rien n'est porté par la couleur seule : onglets (libellé), rang (chiffre), valeur « 0 » (chiffre), ligne propre (gras + `sr-only` « Vous » + `aria-current`), atténuation (chiffre toujours lisible).
- Contrastes AA 4.5:1 pour tout texte (y compris atténué, §3) ; vérifier l'or/bronze des rangs 1 et 3 sur `coach-bg`.
- Pastilles et icônes décoratives en `aria-hidden` ; compteurs secondaires avec un équivalent `sr-only` (« 2 jaunes »).
- Navigation clavier : retour → onglets (flèches) → liste (non focalisable, pas d'éléments interactifs) → bouton « VOUS ». Anneau de focus visible (`focus-visible:ring` des primitives shadcn).
- Barre « VOUS » : changement d'onglet = mise à jour de son texte, qu'un lecteur d'écran annoncera si on lui donne `aria-live="polite"` — **ne pas** l'ajouter (bruit à chaque changement d'onglet) ; le texte est lu en parcourant l'écran.
- `prefers-reduced-motion` : le scroll vers la ligne propre est `behavior: 'auto'` quand l'utilisateur a demandé moins d'animation, `smooth` sinon.

### 11. Ligne de registre `DESIGN_LINKS.md` (non écrite par ce rôle)

Ce rôle n'écrit que dans `specs/` : **la ligne du §0 de cette spec n'est pas reportée dans `docs/designs/DESIGN_LINKS.md`**. À ajouter par la développeuse ou l'orchestrateur, textuellement comme au §0, **avec** le commit des trois PNG non suivis (`docs/designs/learderboard/`).

### Questions ouvertes (UI)

| Réf. | Question | Bloquant ? |
|---|---|---|
| UI-LB-01 | **Ligne propre à zéro** : la mise en avant l'emporte sur l'atténuation (retenu ici, cohérent avec maquette 3 où la ligne propre à 0 est rouge et vive). Alternative : atténuer aussi la ligne propre mais garder bordure et barre « VOUS ». À confirmer par la développeuse | Non |
| UI-LB-02 | **Critère d'ordre d'affichage dans une égalité** : alphabétique proposé (§3) pour les trois onglets ; la spec laisse le critère à la conception (PO-LB-02) | Non |
| UI-LB-03 | **Sous-titre de la carte du Menu** : « Buts, cartons » proposé ; ne pas mentionner « classement de championnat » ni de points (AC-LB-10) | Non |
| UI-LB-04 | **Barre « VOUS » : comportement du tap** : scroll vers la ligne propre (retenu, la flèche de la maquette l'implique). Autre lecture possible : flèche purement indicative sans action. À confirmer | Non |
| UI-LB-05 | **Nom de route** `/leaderboard` à confirmer à l'implémentation (le dossier du design est `learderboard` — la coquille ne doit pas se propager dans le code) | Non |

Aucune question **bloquante**. Aucun nouveau pattern visuel hors maquette : pas de prototype Claude Design à demander.
