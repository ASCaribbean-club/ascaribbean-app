# Spec — Profil de l'utilisateur (« Mon profil »)

> Statut : rédaction initiale du 2026-09-03. Aucune spec antérieure n'existe pour cet écran. **Prête pour designer-agent** — aucun point ouvert ne bloque la conception d'interface (§5).
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0/P1 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles, §3.1 gestion des comptes), `docs/ARCHITECTURE.md` (§7 permissions, §11 journal d'audit, §13.4/§13.5 arborescence), `docs/GOUVERNANCE.md` §7 (référent RGPD non désigné), `specs/coach-dashboard.md` (conventions §1-§5, précédent « cardinalité ≠ permission » PO-6/AC-CD-14), `specs/player-dashboard.md` (§3 documents, PO-PD-06), `specs/match_details_page.md` (précédent multi-rôles, `useActiveRole()`).
> État du code lu pour cadrer : `domain/entities/{user,membership,document,team,section}.ts`, `domain/policies/{rbac-matrix,actions,can}.ts`, `domain/repositories/*` (13 interfaces — **aucun `MembershipRepository`**), `domain/usecases/auth/GetCurrentUserUseCase.ts`, `data/mappers/user-mapper.ts`, `presentation/app/router.tsx`, `presentation/app/providers/active-role-provider.tsx`, `presentation/features/menu/MenuPage.tsx`, `presentation/shared/layout/{AppShell,BottomNav}.tsx`, `presentation/shared/formatters/{role-labels,player-position-labels}.ts`, `presentation/shared/query-keys.ts`, `supabase/migrations/20260811171754_initial_schema.sql`, `20260819153918_season_scoping_correction.sql`.
> Maquettes : registre `docs/designs/DESIGN_LINKS.md` §2 — **deux lignes**, toutes deux `actif`, ajoutées par l'agent PO le 2026-09-03 : `profile-page — variante multi-rôles` (`[v3] [Coach] Mob - Profil (Multi-rôles).dc.html`) et `profile-page — variante rôle unique` (`[v3] [Joueur] Mob - Profil Joueur.dc.html`). Conformément au §4 du registre, ces liens sont la référence visuelle et aucun autre n'est à demander.
> **Réserve maquettes** : l'agent PO **n'a pas pu ouvrir ces deux artifacts** — ni le MCP `claude_design`, ni l'outil `DesignSync` ne sont connectés dans cette session, et aucun accès web n'est disponible. Le périmètre ci-dessous vient donc **exclusivement** du CDC, de la matrice RBAC et du modèle de domaine réel ; les noms de fichiers ne servent qu'à confirmer **quelles deux variantes** sont visées. Même réserve que `specs/match_details_page.md` §6, et même conséquence : il est **probable** que les maquettes contiennent des blocs sans fondement dans le CDC (c'est arrivé sur les quatre écrans précédents). **Le CDC et la matrice priment, la maquette informe la mise en page.** designer-agent aura la prochaine tentative d'ouverture.

## 1. Périmètre

Écran « Mon profil » : la consultation par l'utilisateur de **son propre dossier**. C'est la traduction directe de la seule ligne de la matrice RBAC qui vaut ✅ pour **les 8 rôles** — « Voir son propre profil/dossier ».

C'est aussi le **premier écran du projet à rendre visible le modèle 8 rôles / compte multi-rôles** : jusqu'ici, l'application ne connaît que la paire `'coach' | 'player'` du sélecteur de tableau de bord (`presentation/app/providers/active-role-provider.tsx`). Cet écran, lui, doit rendre compte des huit rôles réels de `RoleAssignment` (§2).

Il remplace le stub `presentation/features/menu/MenuPage.tsx` (`// TODO(PO-1)`, `specs/coach-dashboard.md` §1 « Écarts maquette / CDC ») **ou s'atteint depuis lui** — arbitrage PO-PR-05 (§5), non bloquant pour la conception.

### Modules CDC concernés

| Module CDC | Priorité | Ce que cet écran en expose |
|---|---|---|
| Authentification et profils | **P0** | Identité (nom, courriel), rôles portés par le compte et leur portée, acceptation de la charte (CDC §3.1) |
| Documents et consentements | **P0** | **Liste en lecture seule** des pièces du dossier de l'utilisateur (`Document.type` + `Document.status`) — jamais le dépôt ni la validation d'une pièce |
| Adhérents et licences | **P0** | **Rien en v1** — voir « Hors périmètre » (aucun `MembershipRepository`, RLS « best-effort ») |

### Contenu retenu — v1 en lecture seule

Décision de cadrage centrale : **la v1 est intégralement en lecture seule.** Ce n'est pas une frilosité de périmètre, c'est un constat d'état de la base — `public.users` n'a **ni politique `UPDATE` ni politique `INSERT`** et `public.documents` n'a **aucune politique d'écriture**, les deux étant commentées comme délibérément laissées OPEN dans la migration initiale (« account provisioning […] is not specified anywhere in domain/ yet. Left closed (OPEN) rather than guessed », « upload/validation workflow is genuinely undefined, left OPEN »). Construire une édition ici obligerait à trancher en écrivant du code une question que la base a explicitement refusé de trancher.

1. **Bloc identité** : `User.fullName`, `User.email`, initiales/avatar. Aucune nouvelle lecture — l'objet `User` complet est déjà en mémoire via `useAuth()` / `GetCurrentUserUseCase`.
2. **Bloc rôles** : un élément par **rôle distinct** porté par le compte, libellé français via `formatRole()` (`presentation/shared/formatters/role-labels.ts`, les 8 rôles y sont déjà). Pour chaque rôle, sa **portée**, telle que la structure `RoleAssignment` la définit et pas autrement :
   - `player` → une équipe (`teamId`) ;
   - `coach` → une ou plusieurs équipes (`teamIds[]`, agrégées par `user-mapper.ts`) ;
   - `section-manager` → une section (`sectionId`) ;
   - `authorized-officer`, `treasurer`, `medical-referent`, `volunteer`, `admin` → **aucune portée** (club-wide) : aucune ligne de portée rendue, pas de tiret ni de placeholder.
   Les noms d'équipe viennent de `TeamRepository.findByIds`/`findById`, le nom de section de `SectionRepository.findById` — deux lectures déjà ouvertes en RLS (`teams_select_team_scoped`, `sections_select_authenticated`).
3. **Poste** (`User.position`, `formatPlayerPosition()`) : rendu **uniquement** pour le rôle `player`, et **omis si `null`** — traitement identique à celui déjà en place dans `RosterRow` (`specs/match_details_page.md`, correction n°10).
4. **Charte** : état d'acceptation dérivé de `User.charterAcceptedAt` (CDC §3.1 « activation après acceptation de la charte »). Donnée déjà portée par l'entité, aucune lecture supplémentaire. Affichage de la **date** d'acceptation : PO-PR-04 (§5), non bloquant.
5. **Documents** : liste de **ses propres** pièces (`DocumentRepository.listForUser`, déjà existant, `documents_select_own` déjà ouverte), en lecture seule, `type` + `status`. Aucune action : ni dépôt, ni remplacement, ni suppression, ni téléchargement. Voir §3 pour la réserve sur `type` et PO-PR-03 pour ce que cette liste **ne peut pas** dire.

### La bascule onglets / à plat — structurelle, donc traitée ici

Exigence fonctionnelle de la développeuse, reprise telle quelle : **« afficher des onglets uniquement si l'utilisateur a plusieurs rôles »**. Les deux maquettes enregistrées ne sont donc pas deux états d'une même mise en page mais **deux mises en page distinctes**, et le critère de bascule est une règle de périmètre, pas un détail de rendu.

**Ce qui compte comme « un rôle » — décision PR-1, à confirmer (PO-PR-01) :**

> Le nombre d'onglets est le nombre de **valeurs distinctes de `RoleAssignment['role']`** présentes dans `user.roles` — c'est-à-dire `new Set(user.roles.map((r) => r.role)).size`, sur l'union des **8** rôles de `domain/entities/user.ts`, jamais sur le nombre d'affectations.

- **≥ 2 rôles distincts** → variante **multi-rôles à onglets**, un onglet par rôle distinct.
- **1 rôle distinct** → variante **à plat**, sans barre d'onglets (pas un onglet unique, pas une barre à un seul élément).
- **0 rôle** → variante à plat, bloc rôles absent (§4, AC-PR-08). Cas réel : `user_roles` peut être vide, aucune contrainte ne l'interdit.

**Pourquoi ce critère plutôt que « une affectation = un onglet » :**

1. Le CDC lui-même définit le cumul comme un cumul de **rôles différents** : « Un utilisateur peut cumuler plusieurs rôles (ex. président et joueur) » (§3). Deux équipes ne font pas deux rôles, elles font une portée plus large du même rôle.
2. Compter les affectations serait **incohérent d'un rôle à l'autre** dans le modèle actuel : `user-mapper.ts` **agrège** les lignes `user_roles` d'un coach en une seule entrée `{ role: 'coach', teamIds: [...] }`, alors qu'il pousse une entrée **par ligne** pour `player` et `section-manager`. Un coach à deux équipes produit donc déjà **une** entrée, un joueur hypothétiquement inscrit à deux équipes en produirait **deux** : `user.roles.length` n'est pas une mesure exploitable, et l'écran ne doit pas se caler dessus.
3. Le projet a déjà tranché ce type de question dans le même sens : côté coach, la multi-équipe est traitée comme une **cardinalité de données** (sélecteur d'équipe) et non comme une affaire de rôle ni de permission (`specs/coach-dashboard.md` PO-6, AC-CD-14, « aucune permission distincte, c'est une question de cardinalité de données, pas d'autorisation »).

**Conséquence directe et assumée** : un coach affecté à deux équipes est un compte **mono-rôle** → **variante à plat**, ses deux équipes étant listées à l'intérieur de son unique bloc de rôle. Un compte Joueur + Coach est un compte **multi-rôles** → **variante à onglets**, deux onglets.

**Interdit explicite — ne pas réutiliser `useActiveRole()` ni le type `DashboardRole`.** `presentation/app/providers/active-role-provider.tsx` ne connaît que `'coach' | 'player'` et son propre commentaire borne sa portée au tableau de bord (« a section-manager/authorized-officer/admin account (no player/coach role) never gets a dashboard tab here »). Le profil d'un trésorier ou d'un référent médical n'a aucune raison de disparaître parce qu'un provider de dashboard ignore ces rôles. Les onglets de cet écran se dérivent **directement de `user.roles`**. Corollaire, tranché ici pour la v1 : sélectionner un onglet de profil **ne modifie pas** le rôle actif du tableau de bord, et réciproquement — deux états indépendants (PO-PR-02 pour le comportement cible).

### Hors périmètre — explicitement

- **Toute édition du profil** (nom, courriel, mot de passe, poste, photo) : aucune politique `UPDATE` sur `public.users`, question laissée OPEN en base. Aucun bouton « Modifier », aucun champ de saisie, aucune icône crayon — **absence, pas désactivation**.
- **Le dépôt, le remplacement et la validation d'une pièce** : aucune politique d'écriture sur `public.documents`, workflow « genuinely undefined » (PO-PD-06 de `specs/player-dashboard.md`, toujours ouvert). La liste est un affichage, jamais un point d'action.
- **Le statut de cotisation.** La matrice l'accorde pourtant « ✅ (soi-même) » au joueur — mais **Cotisations est P1** (CDC §4), aucune entité, aucune table, aucun repository n'existe. Aucun bloc, aucune carte, aucune mention, même vide (§3).
- **L'adhésion / la licence** (`Membership`, numéro de licence, statut, validité) : l'entité existe et la table aussi, mais **aucun `MembershipRepository`** n'existe et la RLS de `public.memberships` est commentée « best-effort self-row guess **pending a real spec** ». Construire dessus reviendrait à figer une politique explicitement provisoire — PO-PR-06 (§5).
- **Toute donnée de santé, d'aptitude ou de certificat médical**, y compris « soi-même » : §3.
- **Les points, badges et avantages ASC Legacy** : module **P1**, grille « à valider par le Bureau **avant** développement » (CDC §8). Pas même une valeur statique — traitement déjà retenu côté joueur (AC-PD-12), pas celui toléré côté coach (PO-1).
- **Les préférences de notification / de canal** : module **Communication, P1**.
- **Le dossier d'un autre membre**, pour tous les rôles y compris administrateur : cet écran ne charge jamais que `auth.uid()` (§2). L'accès de l'administrateur ou du dirigeant habilité aux dossiers de tiers est un **autre écran**, à spécifier ailleurs.
- **Le journal d'audit** : sa consultation est réservée à l'administrateur et relève d'un écran d'administration.
- **La déconnexion** : déjà portée par l'avatar des deux tableaux de bord (`CoachHeader.tsx`, `PlayerHeader.tsx`, `SignOutUseCase`). Si la maquette la place aussi ici, la reprise est acceptable **sans travail de domaine** (use case existant, aucune permission nouvelle, aucune journalisation — §3) ; ce spec ne l'exige pas.

### Périmètre de données — la règle centrale

**Toute donnée affichée par cet écran est une donnée de l'utilisateur connecté lui-même** (`auth.uid()`). Aucune donnée nominative d'un tiers, aucun agrégat d'équipe, aucune donnée de section. C'est l'écran le plus strictement borné du projet à ce jour : les quatre lectures qu'il fait (`users`, `user_roles`, `documents`, plus les libellés `teams`/`sections`) sont toutes couvertes par des politiques `*_select_own` ou par une lecture de référentiel non nominative.

Réserve de portée, à connaître avant implémentation : `user_roles_select_own` **n'a aucun filtre de saison**, alors que `teams_select_team_scoped` en a un depuis `20260819153918_season_scoping_correction.sql` (`season_id = (select id from public.current_season())`). Une affectation à une équipe d'une **saison passée** reste donc lisible dans `user_roles` alors que la ligne `teams` correspondante, elle, ne l'est plus → nom d'équipe non résolvable. Traitement retenu en v1 : AC-PR-06 (l'écran ne rend pas une portée dont le libellé est irrésolu, il ne rend pas non plus une erreur) ; question de fond : PO-PR-07.

## 2. RBAC

### Ligne de matrice applicable — une seule

**« Voir son propre profil/dossier »**, la seule ligne de la matrice qui vaut ✅ pour les huit rôles :

| Rôle | Valeur matrice | Interaction avec cet écran |
|---|---|---|
| Joueur / Joueuse | ✅ | Lecture de **son seul** dossier : identité, rôle `player` + son équipe, poste, charte, ses pièces. Aucune écriture |
| Coach / Staff | ✅ | Idem. Sa portée affichée est la **liste de ses équipes** (`teamIds[]`) — plusieurs équipes ne déclenchent **pas** la variante à onglets (§1, PR-1) |
| Responsable de section | ✅ | Idem. Portée affichée : **sa section** (`sectionId`) |
| Dirigeant habilité | ✅ | Idem. Aucune portée à afficher (rôle club-wide) |
| Trésorier | ✅ | Idem. **Aucune donnée financière n'est rendue pour autant** : la ligne « Voir le statut de cotisation ✅ » du trésorier porte sur le module Cotisations (**P1**, hors périmètre §1), pas sur cet écran |
| Référent médical | ✅ | Idem. **Aucune donnée de santé n'est rendue pour autant** — ni la sienne, ni a fortiori celle d'un tiers (§3) |
| Bénévole | ✅ | Idem. C'est, avec le profil, le seul écran du projet auquel ce rôle a accès à ce jour (« Pas d'accès aux dossiers adhérents ») |
| Administrateur | ✅ | Idem, **et rien de plus sur cet écran**. `users_select_own` accorde bien `private.is_admin()` en lecture globale, mais cet écran ne requête **jamais** qu'un `id` : celui de la session. La consultation d'un dossier tiers par un administrateur est un autre écran, avec ses propres exigences de traçabilité (CDC §11.3) |

Les douze autres lignes de la matrice sont sans objet ici : cet écran n'expose **aucune** action de création, de modification, d'export, de communication, de gestion de comptes ni de consultation de dossier tiers, pour aucun rôle.

### Aucune entrée de matrice, aucune action nouvelle

**Aucun ajout à `domain/policies/rbac-matrix.ts`, `actions.ts` ou `can.ts`.** Le commentaire d'en-tête de `rbac-matrix.ts` nomme littéralement ce cas comme RLS-only et volontairement absent de la matrice : « lecture de son propre profil/adhésion/documents ». L'écran ne décide rien avant sa requête — il rend ce que le repository lui renvoie, borné par RLS.

Objection à écarter explicitement : **la bascule onglets / à plat n'est pas une décision d'autorisation** et n'appelle donc pas d'entrée de matrice. C'est une **cardinalité de données** calculée sur `user.roles`, exactement au même titre que l'affichage conditionnel du sélecteur d'équipe côté coach (`specs/coach-dashboard.md`, « aucune permission distincte »). Un rôle ne devient pas plus ou moins autorisé parce qu'il est seul ou accompagné.

### Application technique

Conformément à `docs/ARCHITECTURE.md` §7 : la RLS est l'autorité. Ici, elle est **déjà entièrement en place et suffisante** — `users_select_own`, `user_roles_select_own`, `documents_select_own`, plus `teams_select_team_scoped` et `sections_select_authenticated` pour les libellés de portée. **Aucune migration n'est requise par cette feature** ; c'est même son principal atout de risque. Toute demande d'écriture (édition de profil, dépôt de pièce) en exigerait une, et rouvrirait une question laissée OPEN en base — d'où le périmètre lecture seule (§1).

## 3. Données sensibles

### Données de santé — aucune, et un vecteur d'entrée à tenir fermé

La matrice accorde « Consulter une donnée de santé (hors diagnostic) ✅ (soi-même) » au joueur. **Cette permission n'est pas exploitée en v1**, et son non-exercice est délibéré : le CDC réserve au **référent RGPD** la décision sur les « données santé réellement nécessaires » (§22, décision n°5), et ce référent est **toujours non désigné** (`docs/GOUVERNANCE.md` §7). Même blocage déjà consigné dans `specs/player-dashboard.md` (PO-PD-03) et `specs/match_details_page.md` (§3). Aucune donnée d'aptitude, d'indisponibilité médicale ou de diagnostic n'est rendue, pour aucun rôle, y compris pour le référent médical consultant son propre profil.

**Vecteur d'entrée réel à surveiller : `Document.type`.** C'est un `text` libre : rien n'empêche le club d'y avoir écrit « Certificat médical » ou « Certificat de non-contre-indication ». Rendre la liste des pièces avec leur `type` verbatim revient donc à afficher, sur l'écran de profil, un libellé potentiellement révélateur d'une démarche médicale.

Position retenue en v1, et son raisonnement : **la liste est rendue avec `type` + `status`**, parce que (a) ce sont les **propres pièces de l'utilisateur**, consultées **par lui-même** — il n'apprend rien qu'il ignore, contrairement au cas d'un tiers ; (b) une liste de pièces sans leur nature n'a aucune utilité (« 3 pièces, dont 2 manquantes » ne dit pas lesquelles). C'est un arbitrage **différent** de celui pris pour le bandeau d'alerte du tableau de bord joueur, où le libellé reste générique (`specs/player-dashboard.md` §3, PO-PD-06) — et la différence est assumée : un bandeau de dashboard est vu en permanence et par-dessus l'épaule, une liste de profil est une consultation délibérée du dossier.

⚠️ **Deux réserves consignées, pas résolues** (PO-PR-03) : (a) si le référent RGPD qualifie le libellé d'une pièce médicale de « donnée de santé » au sens du CDC §6.3, alors **son affichage devient une consultation à tracer** — par **trigger Postgres** sur `public.documents` (`ARCHITECTURE.md` §11 : un accès doit être tracé même hors application), jamais depuis le ViewModel ni le composant ; l'écran, lui, n'aurait pas à changer. (b) L'auto-consultation par la personne concernée est-elle un accès à tracer au même titre qu'une consultation par un tiers ? Le CDC §11.3 dit « consultation donnée santé » sans le préciser. **Point non tranché — signalé plutôt qu'omis silencieusement.**

### Données financières — aucune

Aucun statut de cotisation, montant, échéancier ou relance, y compris pour le trésorier consultant son propre profil (§1, §2). Module Cotisations **P1**, aucune table. Exclusion **active**, pas omission (AC-PR-10).

### Données personnelles de tiers — aucune

Aucun nom, aucune donnée d'un autre membre n'est lue ni rendue par cet écran, pour aucun rôle, administrateur compris (§2). Cet écran ne participe donc **pas** à la frontière « lecture nominative / export nominatif » ouverte par `specs/match_details_page.md` §3.

### Export nominatif — aucun

Aucun export CSV/PDF, aucune fonction de copie, aucun partage. À noter pour mémoire : le droit à la **réversibilité / export complet de ses données** (CDC §12 et §21) est une exigence transversale P0 réelle, mais elle n'a **pas** été instruite pour cet écran et n'y est pas implémentée — PO-PR-08 (§5), non bloquant.

### Journal d'audit — aucune action à tracer par cette feature

Aucune des actions sensibles du CDC §11.3 (création/suppression de compte, **changement de rôle**, consultation de donnée santé, modification de paiement, correction de points Legacy, export nominatif) n'est déclenchable depuis cet écran : il **affiche** des rôles, il n'en attribue ni n'en modifie aucun. La v1 étant en lecture seule, **aucune journalisation n'est requise**, sous la seule réserve du (a) ci-dessus sur `Document.type`.

⚠️ Rappel, non traité ici : **aucune table de journal d'audit n'existe dans `supabase/migrations/`** à ce jour. C'est une **exigence transversale P0 non résolue**, déjà signalée par `specs/create-convocation.md` §7, `specs/player-dashboard.md` §3 et `specs/match_details_page.md` §3 — distincte de cette feature, rappelée pour que le compteur ne redescende pas.

## 4. Critères d'acceptation

**AC-01** et **AC-02** sont ceux du CDC §17.2 et s'appliquent tels quels. Les critères propres à cet écran sont préfixés `AC-PR-`, même convention que `AC-CD-` (coach), `AC-PD-` (joueur), `AC-CV-` (convocation), `AC-MD-` (détail) ; à renuméroter dans la série officielle en recette (CDC disponible ici en PDF non extractible).

| Réf. | Critère |
|---|---|
| **AC-01** | Un utilisateur ne voit que **son propre** dossier : aucune donnée d'un autre membre n'est accessible depuis cet écran, ni à l'affichage ni dans les réponses API qui l'alimentent. Vérifié par appel direct à l'API, hors application, avec un jeton de chacun des rôles testés |
| **AC-02** | Un utilisateur demandant le profil d'un autre identifiant n'obtient aucun champ de ce profil — y compris avec un jeton coach ou responsable de section, dont la portée d'équipe/section ne s'étend **pas** à cet écran |
| AC-PR-01 | Un compte portant **au moins deux valeurs de rôle distinctes** rend la variante **à onglets**, avec exactement **un onglet par rôle distinct** — un coach affecté à deux équipes reste **un** rôle, donc **un** onglet |
| AC-PR-02 | Un compte portant **une seule** valeur de rôle distincte rend la variante **à plat**, **sans barre d'onglets** — pas une barre à un seul onglet, pas un onglet masqué en CSS |
| AC-PR-03 | Les libellés de rôle affichés sont ceux de `formatRole()` et couvrent les **8** rôles du CDC ; un compte trésorier, référent médical, bénévole, dirigeant habilité ou administrateur voit son rôle correctement libellé — aucun rôle ne disparaît de l'écran ni ne s'affiche en valeur technique brute (`'medical-referent'`) |
| AC-PR-04 | Les onglets **ne sont pas dérivés** de `useActiveRole()` / `DashboardRole` : un compte dont aucun rôle n'est `player` ni `coach` (ex. trésorier seul) rend son profil complet et correct (§1). Testable en unité sur le ViewModel, sans monter `ActiveRoleProvider` |
| AC-PR-05 | Sélectionner un onglet de rôle sur le profil **ne modifie pas** le rôle actif du tableau de bord ; revenir au Dashboard rend la même vue qu'avant (et réciproquement) — v1, PO-PR-02 |
| AC-PR-06 | La portée affichée suit la structure de `RoleAssignment` : équipe(s) pour `player`/`coach`, section pour `section-manager`, **aucune ligne de portée** pour les cinq rôles club-wide (pas de tiret, pas de « — », pas de bloc vide). Une portée dont le libellé n'est pas résolvable (équipe d'une saison passée, §1) est **omise**, sans erreur ni chargement infini |
| AC-PR-07 | Le poste (`User.position`) n'est rendu que pour le rôle `player`, et **omis** quand il vaut `null` — jamais « Non renseigné », jamais un emplacement réservé vide |
| AC-PR-08 | Un compte **sans aucune affectation de rôle** (`user_roles` vide) rend la variante à plat avec un bloc rôles **absent ou explicitement vide**, jamais une erreur, un écran blanc ou un chargement infini |
| AC-PR-09 | **Aucun contrôle d'édition n'est rendu** : ni champ de saisie, ni bouton « Modifier », ni icône crayon, ni action de dépôt/suppression de pièce, pour aucun rôle — **absence, pas désactivation** (§1) |
| AC-PR-10 | **Aucune donnée financière** (statut de cotisation, montant, échéancier, relance) n'apparaît à l'écran ni dans les réponses API qui l'alimentent, **y compris pour un jeton trésorier** |
| AC-PR-11 | **Aucune information de santé, d'aptitude, de diagnostic ou d'indisponibilité médicale** n'apparaît à l'écran ni dans les réponses API, **y compris pour un jeton référent médical consultant son propre profil** |
| AC-PR-12 | **Aucun indicateur ASC Legacy** (points, palier, badge, avantage) n'est rendu, **même avec une valeur statique** — la grille est « à valider par le Bureau avant développement » (CDC §8), même traitement qu'AC-PD-12 |
| AC-PR-13 | Aucune donnée d'adhésion/licence (numéro de licence, statut, date de validité) n'est rendue tant que PO-PR-06 n'est pas tranché — la table `memberships` n'est pas requêtée du tout par cet écran |
| AC-PR-14 | La liste des pièces ne rend que **les lignes `documents` de l'utilisateur** ; elle ne prétend **pas** être la liste des pièces **exigées** (aucune liste de pièces requises n'existe — PO-PD-06). Un dossier sans aucune ligne rend un état vide explicite, jamais une erreur |
| AC-PR-15 | L'état d'acceptation de la charte est dérivé de `User.charterAcceptedAt` et rendu avec un libellé textuel, jamais par la seule couleur ou une seule icône |
| AC-PR-16 | Affichage complet en moins de 3 secondes sur mobile en réseau normal (CDC §12) |
| AC-PR-17 | Contrastes conformes AA et navigation clavier opérationnelle (CDC §12) ; toute information portée par la couleur (statut d'une pièce, pastille de rôle, état de la charte) est **doublée d'un libellé textuel** |
| AC-PR-18 | Les contrôles interactifs (onglets de rôle, éventuelle flèche retour, éventuel bouton de déconnexion) ont une cible tactile d'au moins ~44px (`h-11`), vérifiée sur un viewport mobile réel — `CLAUDE.md` §6 |

## 5. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-PR-01** | **Confirmer la règle de cardinalité PR-1** (§1) : onglets ⟺ ≥ 2 **valeurs de rôle distinctes**, donc un coach à deux équipes reste en variante **à plat**. Le raisonnement est posé (CDC §3 « cumuler plusieurs rôles », incohérence de `roles.length` due à l'agrégation coach dans `user-mapper.ts`, précédent PO-6 du coach-dashboard) et la décision est **prise** ici plutôt que laissée en suspens ; elle demande une confirmation explicite parce qu'elle vient d'une exigence orale de la développeuse, pas du CDC | Développeuse | **Non** — décidée en v1 ; designer-agent conçoit sur cette base. À rouvrir seulement si la maquette multi-rôles montre sans ambiguïté un onglet par **équipe** |
| **PO-PR-02** | **Que devient la bascule de rôle à terme ?** La v1 rend les onglets de profil indépendants du rôle actif du tableau de bord (AC-PR-05). Faut-il un jour **un seul** concept de « rôle actif » couvrant profil + dashboard + écrans gatés, et alors élargir `active-role-provider.tsx` aux 8 rôles ? C'est la reformulation, à l'échelle des 8 rôles, de PO-2 (`specs/coach-dashboard.md`) et de la question ouverte n°1 de `specs/match_details_page.md` (les rôles hors joueur/coach n'atteignent aucun dashboard) | Bureau + développeuse | Non pour cet écran — mais **c'est la dette structurelle la plus visible du projet** et cet écran la rend palpable pour la première fois |
| **PO-PR-03** | **Le libellé d'une pièce (`Document.type`) est-il une donnée de santé, et son auto-consultation est-elle un accès à tracer ?** Deux sous-questions distinctes (§3) : (a) « Certificat médical » affiché en clair relève-t-il du CDC §6.3 ⇒ trigger Postgres sur `public.documents` ; (b) une consultation **par la personne concernée elle-même** est-elle traçable au même titre qu'une consultation par un tiers ? Rejoint la décision n°5 (CDC §22) | **Référent RGPD** — toujours **à désigner** (`docs/GOUVERNANCE.md` §7) | **Non pour la conception** : la mise en page de la liste est identique dans les deux issues, seule une journalisation côté base s'ajouterait. **Oui pour la mise en production** si la réponse est « donnée de santé » |
| **PO-PR-04** | **Faut-il afficher la date d'acceptation de la charte, ou seulement l'état ?** `charterAcceptedAt` porte l'horodatage ; le CDC §3.1 exige l'acceptation comme condition d'activation, sans dire qu'elle doit être restituée avec sa date. Question annexe : donner accès au **texte** de la charte depuis le profil (l'écran `CharterPage` existe, mais il est gaté par `RequireCharterAccepted` en amont) | Développeuse (+ Bureau pour le texte) | Non |
| **PO-PR-05** | **Cet écran remplace-t-il l'onglet « Menu », ou se place-t-il derrière lui ?** `MenuPage.tsx` est un stub et la nav basse est **fixe à 4 entrées** (`ARCHITECTURE.md` §13.4) : soit l'onglet Menu **devient** le profil, soit il reste une liste d'entrées dont « Mon profil » est la première, l'écran étant alors une route poussée par-dessus (patron `convocations/:id`). La réponse dépend de ce que la maquette multi-rôles montre en haut d'écran (barre d'onglets seule, ou en-tête de navigation + onglets) | Développeuse + designer-agent (à la lecture de la maquette) | **Non** — le contenu de l'écran est identique dans les deux cas ; seule l'accroche de navigation change |
| **PO-PR-06** | **Le profil affiche-t-il l'adhésion / la licence ?** `Membership` (numéro de licence, statut, validité) est un module **P0** (« Adhérents et licences ») et le CDC nomme explicitement « Joueur/Joueuse (son dossier) » parmi les rôles concernés — donc le besoin est fondé. Mais **aucun `MembershipRepository` n'existe**, et la RLS `memberships_select_own` est commentée « best-effort self-row guess **pending a real spec** ». Construire dessus figerait une politique explicitement provisoire | Bureau (+ Dirigeant habilité, titulaire du module) puis développeuse pour la RLS | **Non pour la v1** (AC-PR-13) — mais c'est le **manque le plus probable** du dossier vu par un joueur, et un bloc que la maquette montre peut-être déjà |
| **PO-PR-07** | **Une affectation de rôle sur une équipe de saison passée doit-elle apparaître au profil ?** `user_roles_select_own` n'a **aucun filtre de saison** alors que `teams_select_team_scoped` en a un (§1) : la ligne de rôle est lisible, le nom d'équipe ne l'est plus. Trois issues possibles — masquer la portée (retenu en v1, AC-PR-06), masquer l'affectation entière, ou assumer un historique de saisons au profil (et alors : quelle politique de lecture ?) | Développeuse (+ Bureau si un historique est souhaité) | Non — AC-PR-06 donne un comportement défini et sûr en attendant |
| **PO-PR-08** | **Où vit le droit à l'export de ses propres données** (réversibilité, CDC §12 et §21) ? Le profil en est l'emplacement naturel, mais rien n'est spécifié : format, périmètre (profil seul ou dossier complet), déclenchement, et si l'opération est elle-même à tracer comme « export nominatif » (CDC §11.3) | Bureau + référent RGPD | Non — absent de la v1, aucun bouton d'export |

## 6. Note pour designer-agent

- **Maquettes** : les deux lignes `profile-page` de `docs/designs/DESIGN_LINKS.md` §2, toutes deux `actif`. **Les utiliser directement, ne pas en redemander** (§4 du registre). Instantanés locaux à produire une fois la spec figée (§3 du registre).
- **Réserve** : l'agent PO **n'a pas pu ouvrir ces artifacts** (aucun accès web, MCP `claude_design` et `DesignSync` non connectés). Tu as la prochaine tentative. Il est **probable** que les maquettes contiennent des blocs sans fondement dans le CDC — c'est arrivé sur les quatre écrans précédents. **Le CDC et la matrice priment, la maquette informe la mise en page.**
- **Blocs à écarter s'ils apparaissent dans les maquettes** (constats de cadrage, pas des arbitrages à refaire) : tout contrôle d'édition (champ, bouton « Modifier », crayon) — AC-PR-09 ; tout dépôt/remplacement de pièce — §1 ; statut de cotisation, solde, échéancier — AC-PR-10 ; points/badges/paliers ASC Legacy, **même statiques** — AC-PR-12 ; certificat médical, aptitude, indisponibilité — AC-PR-11 ; numéro de licence et statut d'adhésion — AC-PR-13, PO-PR-06 ; préférences de notification — P1 ; bouton d'export/partage — PO-PR-08.
- **Les deux variantes sont deux mises en page, pas deux états.** Le critère de bascule est en §1 (PR-1) : **rôles distincts**, pas affectations. Concevoir l'entrée du ViewModel comme une liste `Role[]` (0, 1 ou n) plutôt que comme un booléen `isMultiRole` — ça garde AC-PR-01/02/08 vérifiables et évite de recoder la règle dans le composant.
- **Ne jamais brancher les onglets sur `useActiveRole()` ni sur `DashboardRole`** (§1, AC-PR-04) : un profil de trésorier ou de bénévole doit se rendre entièrement, et ces rôles n'existent pas dans ce provider.
- **États à couvrir** : mono-rôle (à plat) ; multi-rôles (onglets) ; **aucun rôle** (AC-PR-08) ; coach à plusieurs équipes (à plat, plusieurs équipes dans un seul bloc) ; rôle club-wide **sans aucune portée à afficher** (AC-PR-06 — pas d'espace compensatoire) ; poste `null` (AC-PR-07) ; dossier **sans aucune pièce** (AC-PR-14) ; portée d'équipe non résolvable (saison passée, §1).
- **Patterns à réutiliser plutôt qu'à réinventer** : la pastille de rôle et l'avatar à initiales des en-têtes de dashboard (`CoachHeader.tsx` / `PlayerHeader.tsx`) ; le primitive `Badge` pour les statuts de pièce ; la ligne de liste avec avatar + libellé + indicateur de fin de ligne de l'onglet « Effectif » (`specs/match_details_page.md`) ; si un en-tête à flèche retour est nécessaire (selon l'issue de PO-PR-05), `presentation/features/convocation/components/BackHeader.tsx`, `sticky top-0` (`CLAUDE.md` §6).
- **Vocabulaire couleur** : ne pas réemployer le vert/rouge déjà réservé à présent/absent pour un statut de pièce ou un état de charte — même précaution qu'`AC-MD-09`/correction n°9 de `specs/match_details_page.md`. Toute couleur est doublée d'un libellé (AC-PR-17).
- **Barre d'onglets** : si les rôles distincts sont nombreux (jusqu'à 8 théoriquement), prévoir le comportement de débordement sur un viewport mobile — cas rare mais structurellement possible, et non couvert par une maquette qui montrera vraisemblablement deux onglets.
- Rappel `CLAUDE.md` §9 : **aucun nom de personne** figurant dans les maquettes ne doit apparaître dans le code, les tests ou la documentation ; le nom affiché vient de `user.fullName` à l'exécution.

## UI design

### Réserve maquettes — confirmée, pas seulement reconduite

J'ai tenté d'ouvrir les deux liens du registre (`docs/designs/DESIGN_LINKS.md` §2, tous deux `actif` « sur déclaration de la développeuse ») avant d'écrire quoi que ce soit ci-dessous :

- Aucun outil `claude_design` / `DesignSync` n'est connecté dans cette session (même constat que l'agent PO).
- `WebFetch` sur `https://claude.ai/design/p/e7fa6de4-7d5b-42a5-93ff-f75669e9adbf?file=...` renvoie **HTTP 403** pour les deux fichiers — confirmé, pas supposé.
- `docs/designs/*.png` ne contient **aucun instantané pour cette feature** (glob vérifié) : le seul PNG existant est `v4_coach_dashboard.png`, un écran différent (tableau de bord coach). Il est réutilisé ci-dessous **uniquement pour son vocabulaire visuel** (avatar à initiales, `Pill`, palette sombre) — jamais comme référence de mise en page pour un écran de profil, qu'il ne montre pas.

**Conséquence** : contrairement à `match_details_page.md` (qui disposait d'un export PNG local pour la vue joueur), cette passe ne dispose **d'aucune maquette lisible**, ni via lien ni via instantané. La mise en page ci-dessous est donc dérivée **entièrement** du §1-§5 de cette spec et des patrons déjà construits dans le code (`CoachHeader`/`PlayerHeader`, `BackHeader`, `Tabs`/`Badge`/`Avatar` shadcn, `RosterRow` du détail de convocation) — pas d'une lecture de maquette suivie de corrections, comme pour les quatre écrans précédents. Si un export PNG devient disponible plus tard, cette section est à relire en priorité pour d'éventuels blocs sans fondement CDC (même vigilance que `specs/match_details_page.md` §6 : ASC Legacy, « Forme récente », etc. y étaient apparus sans support de domaine).

**Suivi non bloquant** : produire l'instantané local une fois un accès disponible (`DESIGN_LINKS.md` §3, toujours `N/A` ici) — même remarque que PO-MD-08.

### Emplacement dans la nav (PO-PR-05)

Reste **non résolu**, pour la même raison que l'agent PO l'a laissé ouvert : la réponse dépend de ce que la maquette multi-rôles montre en haut d'écran (barre d'onglets seule vs en-tête + onglets), et cette maquette est précisément celle qu'aucun des deux agents n'a pu ouvrir. Je ne tranche pas à sa place à partir de rien.

Ce qui **ne dépend pas** de cette question — le contenu ci-dessous est strictement identique dans les deux issues (PO-PR-05 le dit déjà) :

- **Option A — l'écran remplace `MenuPage.tsx`** : `ProfilePage` devient l'élément de la route `/menu`, à l'intérieur d'`AppShell` (barre de nav basse visible, comme Dashboard/Calendrier/Actus). Pas de flèche retour : c'est une destination de nav primaire, pas une route poussée.
- **Option B — l'écran est poussé depuis une liste « Menu »** : même patron que `convocations/:id` (`presentation/app/router.tsx`), en dehors d'`AppShell` — pas de barre de nav basse, en-tête à flèche retour réutilisant `BackHeader.tsx` **tel quel** (`title="Mon profil"`, `sticky top-0`, fond opaque, `size-11` déjà corrigé pour la cible tactile — CLAUDE.md §6).

Recommandation, à confirmer par la développeuse plutôt qu'imposée : **Option A**. L'écran « Mon profil » est un point d'arrivée, pas une étape intermédiaire d'une liste plus large — rien dans le §1-§5 ne décrit un « Menu » contenant plusieurs entrées dont le profil ne serait que la première. Mais je ne ferme pas PO-PR-05 : si la développeuse confirme qu'une liste Menu à plusieurs entrées est prévue (ex. un futur écran d'administration à côté du profil), c'est l'Option B qu'il faut scaffolder, avec `BackHeader` déjà prêt à l'emploi.

### Structure commune aux deux variantes

Trois zones empilées, dans cet ordre, quelle que soit la variante (à plat ou à onglets) :

1. **Bloc identité** — commun, jamais dupliqué par rôle.
2. **Bloc rôles** — seule zone qui change de forme entre les deux variantes (§1, PR-1).
3. **Bloc charte** puis **bloc documents** — communs, rendus **une seule fois**, en dehors de tout onglet.

Ce découpage n'est pas arbitraire : il suit directement la distinction déjà posée par le §1 de cette spec entre ce qui est **porté par `RoleAssignment`** (rôle + portée, point 2/3) et ce qui est **porté par `User` directement** (charte, documents — points 1/4/5). La charte et les documents ne sont pas des faits « par rôle » : les dupliquer dans chaque `TabsContent` de la variante à onglets répéterait la même information n fois pour une variable qui ne varie jamais avec le rôle actif. Décision de conception assumée ici, pas dictée mot pour mot par le CDC, mais dérivée directement de la structure de données du §1.

#### 1. Bloc identité — nouveau composant, volontairement pas une reprise de `CoachHeader`/`PlayerHeader`

`CoachHeader` et `PlayerHeader` portent trois choses que cet écran **ne doit pas** reprendre : (a) le pill de rôle cliquable, sémantiquement lié au sélecteur de tableau de bord (`onRoleClick`, TODO PO-2 — « switch active role ») — brancher ce composant ici laisserait deviner un lien avec `useActiveRole()` que AC-PR-04 interdit explicitement ; (b) la bannière diagonale décorative et le « Bonjour, {prénom} » — ton de salutation de tableau de bord, pas de consultation de dossier ; (c) la pastille de notification sur l'avatar, sans objet ici.

Composant neuf, `ProfileIdentityHeader` (nom indicatif) :
- Avatar à initiales — même styliste que `Avatar`/`AvatarFallback` déjà vendored (`shared/components/ui/avatar.tsx`), même palette (`bg-coach-green`/texte blanc) pour rester cohérent visuellement avec le reste de l'app, **sans** la bordure rouge ni la pastille de notification (pas de sens hors contexte dashboard).
- `user.fullName` en titre, `user.email` en sous-texte — aucune autre donnée (le bloc identité du §1 point 1 s'arrête là).
- Pas de bouton, pas d'icône crayon (AC-PR-09) : ce bloc n'est jamais cliquable au-delà de l'avatar lui-même s'il porte la déconnexion (voir ci-dessous).
- **Déconnexion** : si Option A (remplace Menu), l'avatar des dashboards porte déjà cette action (`CoachHeader`/`PlayerHeader` §1 « Hors périmètre » du spec — reprise acceptée sans travail de domaine). Reprendre ici le même patron `AlertDialog` de confirmation sur tap de l'avatar est cohérent et n'ajoute aucune permission ni journalisation nouvelle. Si Option B (poussé), la déconnexion reste portée par les avatars des dashboards, pas dupliquée ici — le spec ne l'exige pas (§1).
- Pas `sticky` : ce bloc scrolle avec le reste du contenu (seul un éventuel `BackHeader`, Option B, doit rester sticky — CLAUDE.md §6). Il n'y a pas de contenu long au-dessus qui justifierait de le fixer.

#### 2. Bloc rôles — variante à plat (0 ou 1 rôle distinct)

- **1 rôle distinct** : une carte unique, titrée `formatRole(role)`. Contenu, selon la structure de `RoleAssignment` (§1 point 2, AC-PR-06) :
  - `player` → une ligne « Équipe » avec le nom résolu ; puis, seulement si `position !== null`, une ligne « Poste » via `formatPlayerPosition()` — même traitement omis-si-null que `RosterRow` (AC-PR-07).
  - `coach` → une ligne « Équipe(s) » listant chaque nom résolu de `teamIds[]` — **plusieurs lignes ou une liste à puces si `teamIds.length > 1`**, jamais un onglet par équipe (rappel PR-1 : un coach à deux équipes reste **un** rôle, donc **une** carte). Un nom non résolvable (saison passée, §1) est simplement omis de la liste, sans ligne vide ni tiret (AC-PR-06) — si *toutes* les équipes d'un coach tombent dans ce cas, la ligne « Équipe(s) » elle-même est omise plutôt que rendue vide.
  - `section-manager` → une ligne « Section » avec le nom résolu.
  - `authorized-officer`, `treasurer`, `medical-referent`, `volunteer`, `admin` → **aucune ligne de portée** (AC-PR-06) : la carte ne contient que le titre de rôle, rien d'autre — pas de ligne « Portée : — ».
- **0 rôle distinct** (AC-PR-08) : le bloc rôles est **absent** (pas de carte, pas de titre de section « Rôles »), cohérent avec la convention déjà posée pour les cartes de menu (« disparaît, ne se grise jamais ») plutôt qu'un état vide explicite à afficher — les deux issues sont acceptables selon AC-PR-08, celle-ci est retenue pour la cohérence avec le reste de l'app. Le reste de l'écran (identité, charte, documents) se rend normalement : un compte sans rôle a quand même un dossier.

#### 2bis. Bloc rôles — variante à onglets (2+ rôles distincts)

- `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, primitives shadcn déjà vendored (`shared/components/ui/tabs.tsx`) — pas de composant à onglets réinventé.
- Un `TabsTrigger` par **rôle distinct** (`formatRole(role)`), jamais par affectation ni par équipe (AC-PR-01).
- Contenu de chaque `TabsContent` : **identique** à la carte unique de la variante à plat ci-dessus, pour ce rôle-là seulement — même composant de rendu (`RoleScopeBlock`, voir « Composants » plus bas), simplement enveloppé différemment (carte autonome en variante à plat, panneau d'onglet en variante à onglets) plutôt que dupliqué en deux implémentations.
- **Cible tactile** (CLAUDE.md §6) : `TabsTrigger` du primitive vendored est dimensionné `h-9`/`py-1` (~36px), sous le seuil ~44px. À corriger au niveau du call-site de cet écran (`h-11` sur `TabsList`/`TabsTrigger`), même logique que la correction déjà appliquée à `BackHeader` (`size-9.5` → `size-11`, `specs/match_details_page.md`) — signalé explicitement ici plutôt que laissé à découvrir en recette (AC-PR-18).
- **Débordement horizontal** (§6 note pour designer-agent : « jusqu'à 8 onglets théoriquement ») : Radix `Tabs` ne gère pas lui-même le débordement — `TabsList` est `inline-flex w-fit`, donc au-delà de 3-4 libellés de rôle sur un viewport mobile étroit, les onglets se compressent ou débordent le cadre. **À corriger au call-site** : `overflow-x-auto` + `flex-nowrap` sur le conteneur de `TabsList`, jamais un retour à la ligne (qui casserait le patron d'onglets à une seule rangée) ni une troncature de libellé (« Responsable de sec… » n'est pas un libellé acceptable, AC-PR-03 exige le libellé complet). Cas rare en pratique (8 rôles simultanés) mais à couvrir dès le scaffolding, pas en correctif plus tard.

#### 3. Bloc charte — commun, une seule fois

Une ligne unique, hors `TabsContent` : libellé « Charte du club » + état textuel dérivé de `charterAcceptedAt !== null` — jamais une pastille de couleur seule (AC-PR-15, AC-PR-17). **Vocabulaire couleur : ne pas reprendre le vert/rouge déjà réservé présent/absent** (rappel §6 du spec, même précaution que `match_details_page.md` correction n°9) — proposition : icône + texte neutres (ex. coche discrète non `coach-green`, plutôt une teinte du primitive `Badge` `outline`/`secondary`), jamais `bg-coach-green`/`bg-coach-red`.

Remarque de cadrage, pas une décision de conception : la route qui porte cet écran est déjà derrière `RequireCharterAccepted` (`presentation/app/router.tsx`) — en pratique, un compte qui atteint cet écran a donc **toujours** `charterAcceptedAt !== null`. Le composant reste néanmoins écrit à partir du booléen réel plutôt que codé en dur « toujours acceptée », parce que rien dans le spec ne garantit que cette route restera la seule à monter cet écran (Option B ci-dessus, ou une évolution future).

Date d'acceptation : **non affichée**, PO-PR-04 restant non tranché. Le composant est construit pour accueillir une ligne de date supplémentaire sans restructuration si PO-PR-04 se résout en ce sens — pas une raison de bloquer le scaffolding.

#### 4. Bloc documents — commun, une seule fois

- En-tête de section : « Mes documents » + compteur (« N document(s) »), même position/style que les en-têtes déjà établis ailleurs (ex. « DESTINATAIRES · N sélectionnés », repris par `match_details_page.md`).
- Une ligne par document (`DocumentRow`, nouveau mais **variation** d'un patron de liste existant, pas un nouveau langage visuel) : `type` à gauche (texte brut — c'est un champ libre, §3, aucun mapping de libellé n'existe ni n'est à inventer ici), `status` à droite via `Badge`.
- **Palette de statut** (4 valeurs de `DocumentStatus`), avec la même contrainte que la charte — jamais le vert/rouge présent/absent, jamais `coach-green`/`coach-red` :
  - `valid` → `Badge` positif mais dans une teinte **distincte** du vert déjà réservé (proposition : variante `outline` ou une teinte bleue/sarcelle, à confirmer avec la développeuse — pas un choix figé ici) + texte « Valide ».
  - `pending_validation` → réutilise l'accent ambre déjà établi dans l'app pour un statut « en cours » non conflictuel (déjà utilisé pour l'accent du type « réunion » et pour le badge « a répondu » côté joueur, `match_details_page.md` correction n°9) + texte « En attente de validation ».
  - `rejected` → un marqueur négatif mais **pas** `coach-red` (proposition : variante `destructive` du primitive `Badge`, un rouge nettement moins saturé que `coach-red`, à confirmer) + texte « Refusée ».
  - `missing` → neutre (`outline` ou gris) + texte « Manquante ».
  Chaque état est **toujours** doublé du texte, jamais la couleur seule (AC-PR-17). La palette précise (valeurs de teinte) est une proposition de designer-agent à confirmer par la développeuse en scaffolding, pas une couleur imposée par une maquette — signalé en « Questions ouvertes UI ».
- **Liste vide** (AC-PR-14) : ligne de substitution explicite « Aucun document », jamais une section absente en silence (à la différence du bloc rôles à 0 rôle, où l'absence complète est le choix retenu — ici la présence du bloc documents lui-même n'est jamais conditionnelle, seul son contenu peut être vide, parce que « Mes documents » est un module attendu pour tout compte alors que « Rôles » ne l'est structurellement pas pour un compte à 0 affectation).
- **Chargement** : pas de composant `Skeleton` encore vendored dans ce repo (vérifié) — ne pas en introduire un seul pour cet écran sans besoin identifié ailleurs ; un état de chargement textuel simple (« Chargement… ») suffit pour AC-PR-16, cohérent avec l'absence de tout autre patron de squelette dans le reste de l'app à ce jour.

### États à couvrir (récapitulatif)

| État | Traitement |
|---|---|
| 1 rôle distinct | Variante à plat, carte unique |
| 2+ rôles distincts | Variante à onglets, un `TabsTrigger` par rôle |
| 0 rôle distinct (AC-PR-08) | Bloc rôles absent ; identité/charte/documents se rendent normalement |
| Coach à plusieurs équipes | Une seule carte/`TabsContent` « Coach », plusieurs lignes d'équipe à l'intérieur |
| Rôle club-wide (5 rôles) | Carte/`TabsContent` sans aucune ligne de portée (AC-PR-06) |
| Poste `null` | Ligne « Poste » omise (AC-PR-07) |
| Portée non résolvable (saison passée, §1) | Ligne d'équipe/section omise ; ligne « Équipe(s) » elle-même omise si plus aucune ne reste |
| Documents : liste vide (AC-PR-14) | Ligne de substitution explicite, jamais une section absente |
| Documents : chargement | Texte de chargement, pas de spinner seul |
| Onglets : débordement (jusqu'à 8 rôles) | `overflow-x-auto` sur `TabsList`, jamais de troncature de libellé ni de retour à la ligne |

### Composants réutilisés vs nouveaux

- **Réutilisés tels quels** : `Avatar`/`AvatarFallback`, `Badge`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` (shadcn), `formatRole`, `formatPlayerPosition`, `AlertDialog` (confirmation de déconnexion, si Option A), `BackHeader.tsx` (si Option B).
- **Nouveaux, variations d'un patron existant plutôt qu'un nouveau langage visuel** : `ProfileIdentityHeader` (identité seule, dérivé de `CoachHeader`/`PlayerHeader` mais délesté de tout ce qui est spécifique au tableau de bord — justifié ci-dessus) ; `RoleScopeBlock` (contenu d'une carte de rôle, partagé entre la carte autonome à plat et le `TabsContent` à onglets — un seul composant de rendu, deux enveloppes) ; `DocumentRow`/liste de documents (ligne label + `Badge`, variation de la ligne de liste déjà vue pour l'effectif de convocation, sans avatar) ; `CharterStatusRow` (label + état textuel).
- **Aucun composant réellement nouveau au sens de la contrainte du rôle** : pas de pattern visuel inédit introduit sans justification — la structure à onglets elle-même est un primitive shadcn déjà vendored, pas un composant maison.

### ViewModel — ce que `useProfileViewModel` doit exposer

Pour que `ProfilePage` reste sans logique métier (CLAUDE.md §4/§6 — la Page ne fait que brancher sur des booléens déjà calculés) :

- `distinctRoles: Role[]` — **pas un booléen** (rappel explicite du §6 de ce spec) : `[...new Set(user.roles.map((r) => r.role))]`. `hasTabs` et `hasNoRoles` s'en dérivent dans le ViewModel, pas recalculés dans la Page.
- `hasTabs: boolean` = `distinctRoles.length >= 2`.
- `hasNoRoles: boolean` = `distinctRoles.length === 0`.
- `roleBlocks: { role: Role; scopeLines: string[]; showPosition: boolean }[]` — un par rôle distinct. `scopeLines` déjà résolu (noms d'équipe/section déjà fetchés via `TeamRepository`/`SectionRepository`, portées non résolvables déjà filtrées — AC-PR-06) et déjà en français ; tableau vide pour les 5 rôles club-wide, jamais un tableau à un seul élément placeholder. `showPosition` = `role === 'player' && user.position !== null` (la Page appelle `formatPlayerPosition` elle-même, formatage pur, pas une règle métier).
- `charterAccepted: boolean` = `user.charterAcceptedAt !== null` (pas de champ `charterAcceptedAt` brut nécessaire côté Page tant que PO-PR-04 reste non affiché).
- `documents: { type: string; status: DocumentStatus }[]`, `documentsLoading: boolean`, `hasDocuments: boolean` = `documents.length > 0`.
- `isLoading`/`error` globaux pour la résolution des noms d'équipe/section et la liste de documents — l'identité (`User` complet) est déjà en mémoire via `useAuth()` (§1 point 1), donc pas de nouvel état de chargement pour ce bloc-là spécifiquement.

### Questions ouvertes UI

Aucune n'est bloquante pour la transmission à mentor-agent.

1. **PO-PR-05, toujours ouvert côté designer.** Recommandation Option A (remplace `MenuPage.tsx`) donnée ci-dessus, mais non imposée — je n'ai pas pu lire la maquette qui aurait dû trancher. Les deux options scaffoldent le même contenu ; seule la coquille de navigation change.
2. **Palette de statut des 4 `DocumentStatus`** et de l'état de charte : proposition donnée (éviter `coach-green`/`coach-red`, réutiliser l'ambre déjà établi pour « en attente », variante `destructive`/`outline` du `Badge` pour les deux autres), mais les teintes précises restent à confirmer avec la développeuse en scaffolding — pas de maquette pour arbitrer.
3. **PO-PR-04 (date de charte) et PO-PR-06 (adhésion/licence)** : non tranchés par le spec, donc non conçus ici au-delà de « le composant charte laisse la place à une ligne de date sans restructuration » — pas une omission, une conséquence directe du point ouvert.

**Prêt pour transmission à mentor-agent : oui**, sous réserve des 3 points ci-dessus (aucun bloquant) et de PO-PR-05 (non bloquant, §5 du spec le confirme déjà).

## 7. Addendum 2026-09-04 — équipe/section/coach/saison/adhésion

Demande développeuse directe (hors relecture de maquette) : enrichir `useProfileViewModel` avec l'équipe, la section, le coach de l'utilisateur, le nom de la saison, et l'adhésion — le tout pour un futur bloc dédié de l'écran. Trois de ces cinq points étaient déjà couverts ou presque (§1 point 2 ci-dessus) ; deux ne l'étaient pas et chacun bute sur une règle posée plus haut dans ce même spec. Les deux arbitrages ci-dessous ont été validés explicitement par la développeuse avant implémentation (pas un choix pris seul à sa place).

### Équipe / section — déjà en périmètre, rien de nouveau ici

`roleBlocks[].scopeLines` (§1 point 2, ci-dessus) résout déjà le nom d'équipe pour `player`/`coach` et le nom de section pour `section-manager`. Aucun changement de forme. **Correction annexe, non demandée mais bloquante pour que « section » fonctionne réellement** : `SectionRepositoryImpl.findById`/`findAll` et `toSection` (mapper) étaient des stubs `throw new Error(... not implemented yet)` laissés par mentor-agent — un compte `section-manager` obtenait donc une erreur, pas un nom de section. Implémentés ici à l'identique du patron déjà établi par `TeamRepositoryImpl`/`team-mapper.ts` (même `select`/`mapSupabaseError`/`maybeSingle`), RLS déjà ouverte (`sections_select_authenticated`), aucune migration requise.

### Saison — pas un champ autonome, rattaché à l'adhésion

Aucune des lectures existantes de l'écran ne porte de saison affichée telle quelle (`TeamRepositoryImpl` filtre déjà sur la saison courante en interne, sans l'exposer). Plutôt que d'ajouter un champ `currentSeasonLabel` isolé, la saison est résolue **avec** l'adhésion (ci-dessous) : une adhésion n'a de sens qu'accolée à la saison qu'elle couvre (« adhésion 2026-2027 »), donc `GetProfileMembershipUseCase` retourne les deux ensemble plutôt que de forcer la Page à recouper deux requêtes indépendantes.

### Adhésion — résout PO-PR-06, exclusion §1/AC-PR-13 levée délibérément

PO-PR-06 (§5) et AC-PR-13 excluaient l'adhésion de la v1 : aucun `MembershipRepository` n'existait, et `memberships_select_own` était commentée « best-effort […] pending a real spec ». Résolu ici sur confirmation développeuse — **AC-PR-13 est amendé**, pas contredit silencieusement : la table `memberships` est désormais interrogée, mais strictement en lecture, strictement la ligne de l'utilisateur (`memberships_select_own` suffisait déjà, aucune RLS nouvelle nécessaire pour ce point précis).

- `MembershipRepository.findForUserAndSeason(userId, seasonId)` — pas un simple `findForUser(userId)` : `memberships` n'a **aucune contrainte d'unicité** sur `user_id` (une ligne par saison au fil du temps est une lecture valide du schéma), donc « l'» adhésion d'un utilisateur n'a de sens qu'une fois la saison fixée. `GetProfileMembershipUseCase` résout la saison courante (`SeasonRepository.findCurrent()`, même fonction Postgres `current_season()` que `TeamRepositoryImpl`) puis cherche la ligne `memberships` de cette saison précise. Absence de ligne (membre pas encore réinscrit) → `null`, état valide, pas une erreur.
- Aucune donnée financière nouvelle exposée : `Membership` (domain/entities/membership.ts) porte `status`/`licenceNumber`/`validUntil`, jamais un montant ni un échéancier — AC-PR-10 reste intact.
- **Champ `type: string` d'un `Document`** (§3, réserve santé) : aucun rapport avec cet addendum, non retouché.

### Coach de l'utilisateur — exception explicite à AC-01/AC-02, RLS nouvelle

C'est le seul des cinq points qui entre en conflit frontal avec une règle *dure* du spec, pas avec un simple point OPEN : §1 « Périmètre de données » et §3 « Données personnelles de tiers » excluent **toute** donnée nominative d'un tiers de cet écran, et AC-01/AC-02 en sont la traduction en critère d'acceptation. Le nom du coach d'un joueur est, par construction, la donnée d'un tiers (un autre membre du compte). `users_select_own` (RLS) ne permettait d'ailleurs même pas cette lecture avant cet addendum — ce n'était pas qu'une question de spec, la base l'interdisait techniquement.

**Décision, confirmée par la développeuse avant implémentation** : lever l'exclusion pour ce seul cas, avec le tracé le plus étroit possible plutôt qu'un accès large à `public.users` :

- **AC-01/AC-02 sont amendés** : « aucune donnée d'un autre membre », sauf le nom du/des coach(s) de sa propre équipe, pour un joueur consultant son propre profil. Ça reste la seule exception des deux critères.
- Nouvelle RPC `SECURITY DEFINER` `get_team_coaches(p_team_id)` (`supabase/migrations/20260904083306_profile_team_coaches.sql`), calquée sur le patron déjà posé par `get_convocation_responders` (`20260901120018_convocation_responder_visibility_correction.sql`) : deux colonnes seulement (`user_id`, `full_name`), aucune autre colonne de `users`, et le contrôle de portée (`private.is_team_member(p_team_id) or private.is_admin()`) vit **dans la fonction**, pas dans une politique RLS élargie sur `users` — élargir `users_select_own` à `is_team_member` aurait ouvert la lecture de *toute* colonne d'un coéquipier pour un besoin qui est en réalité juste « un nom affiché ». `users_select_own` reste donc inchangée.
- `domain/repositories/coach-repository.ts` expose `TeamCoach { id, fullName }` — pas l'entité `User` complète, pour ne pas laisser un futur appelant récupérer email/rôles/poste d'un tiers par accident.
- `GetProfileRoleScopesUseCase` résout `coachNames: string[]` uniquement pour le rôle `player` (un coach n'a pas besoin de voir « qui coache mon équipe », il l'est) ; les 6 autres rôles retournent un tableau vide, même convention que `scopeLines`.

**Migration non appliquée par cette passe** : le fichier SQL existe dans `supabase/migrations/` mais n'a pas été poussé vers l'instance Supabase (action sur système partagé, hors périmètre d'une modification de code seule) — à appliquer explicitement (`supabase db push` ou MCP `apply_migration`) avant que `get_team_coaches` soit appelable en pratique.

### État d'implémentation vs. maquette — même situation que charte/documents

Comme déjà noté par `useProfileViewModel.ts`/`ProfilePage.tsx` pour la charte et les documents (§1 point 4/5, écart maquette/spec déjà flaggé) : `coachNames`, `membership` et `membershipSeasonLabel` sont désormais résolus et exposés par le ViewModel, mais **`ProfilePage.tsx` ne les rend pas encore** — aucune des deux maquettes enregistrées ne montre de bloc adhésion/coach (§"Réserve maquettes", ce spec n'a jamais pu les ouvrir). ViewModel en avance sur le rendu, situation déjà tolérée ailleurs dans ce fichier plutôt qu'un blocage — le rendu reste à concevoir (nouveau composant, ou extension de `RoleScopeBlock`/nouveau bloc « Adhésion » à la suite du bloc rôles).
