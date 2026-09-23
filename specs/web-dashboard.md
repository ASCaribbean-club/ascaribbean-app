# Spec — Backoffice web : tableau de bord d'accueil (`web-dashboard`)

> Statut : **première rédaction, 2026-09-23**. Cette tranche remplit l'écran `/admin/overview`, qui rend aujourd'hui `BackofficeEmptyState` inconditionnellement (`BackofficeOverviewPage.tsx`). Elle **lève pour ce seul écran** les interdictions posées par `specs/web-empty-state.md` (AC-WE-13 « aucune valeur chiffrée », AC-WE-16 « boutons inertes », AC-WE-17 « ligne de contexte omise ») — elles restent en vigueur partout ailleurs dans la coquille. **Aucune nouvelle action RBAC, aucune nouvelle politique RLS, aucune nouvelle table** : c'est une feature de **composition de lectures déjà en place** et de **réutilisation de dialogues déjà construits**. 8 questions ouvertes (PO-WD-01 à PO-WD-08), **aucune bloquante pour le handoff designer**.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (modules P0 « Authentification et profils », « Adhérents et licences », « Équipes et sections » ; modules P1 « Cotisations », « Communication », « **Statistiques et exports — tableaux de bord par rôle** » ; matrice RBAC lignes « Gérer comptes, rôles, paramétrage », « Voir le statut de cotisation », « Gérer échéanciers et relances » ; exigences transversales §11.3), `docs/roles-personas-as-caribbean.md` (rôle Administrateur : « Paramétrage, comptes, rôles, saisons, sécurité et audit », « actions sensibles journalisées » ; §3.1 gestion des comptes), `specs/web-empty-state.md` (coquille, `backoffice:access`, AC-WE-13/15/16/17, PO-WE-01, PO-WE-06, PO-WE-08, PO-WE-11), `specs/web-users.md` (§2.1 statut dérivé, §2.3 critères de complétude, §2.8 badge de navigation), `specs/web-memberships.md` (§2.8 badge, PO-WM-06, PO-WM-08, PO-WM-09), `specs/web-seasons.md`, `specs/section-and-teams.md`, `specs/web-actus.md` (PO-WA-09), `specs/menu.md` (§2/§3 — la déconnexion est hors matrice RBAC), `CLAUDE.md` §3/§4/§5/§6/§7/§9.
> État du code lu : `presentation/features/backoffice/{backoffice-nav.ts, components/BackofficeSidebar.tsx, components/BackofficeTopBar.tsx, components/BackofficePageHeader.tsx, dashboard/BackofficeDashboardLayout.tsx, dashboard/useBackofficeDashboardViewModel.ts, overview/BackofficeOverviewPage.tsx, users/*, memberships/*, teams/*, news/*}`, `presentation/app/router.tsx`, `presentation/app/RequireBackofficeSession.tsx`, `presentation/shared/query-keys.ts`, `presentation/features/menu/{useMenuViewModel.ts, components/LogoutButton.tsx}`, `domain/policies/{actions,rbac-matrix,user-status,user-completeness}.ts`, `domain/repositories/{user,membership,payment,season,section,team}-repository.ts`, `domain/usecases/users/CountUsersRequiringAttentionUseCase.ts`, `domain/usecases/memberships/CountMembershipsRequiringAttentionUseCase.ts`.
> Maquettes : `docs/designs/desktop/dashboard/[Admin] Web - Dashboard{,- 1,- 2}.png`, **les trois lues directement**. Voir §0.

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne n'existe au §2 du registre pour `web-dashboard`.** La développeuse a directement importé trois exports PNG dans `docs/designs/desktop/dashboard/`, sans fournir de lien artifact — **exactement le cas déjà rencontré neuf fois** (`menu`, `actus`, `player-vote`, `web-empty-state`, `web-actus`, `web-seasons`, `section-and-teams`, `web-memberships`, `web-users`). Le statut applicable est donc `instantané seul` au sens du §4 du registre : **aucun lien artifact n'est demandé**, ni maintenant ni lors d'une passe ultérieure. L'agent PO ne pouvant écrire que dans `specs/`, la ligne est **pré-rédigée ci-dessous, à recopier telle quelle** par le premier agent ou la développeuse ayant les droits d'écriture sur `docs/` (PO-WD-08) :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| web-dashboard — **backoffice desktop : tableau de bord d'accueil** (`[Admin] Web - Dashboard`, `… - 1`, `… - 2`) | — aucun lien fourni | 2026-09-23 | `docs/designs/desktop/dashboard/[Admin] Web - Dashboard{,- 1,- 2}.png` | **instantané seul** |

> **Deux notes à joindre à la ligne, dont une qui évite une confusion coûteuse.**
> (a) **Collision de noms de fichiers avec la ligne `web-empty-state`.** Cette ligne-là référence `docs/designs/desktop/connexion & empty state/[Admin] Web - Dashboard-{1,2,3}.png` : mêmes mots, **dossier différent, contenu différent**. Les exports de `connexion & empty state` sont trois **cadrages** de la coquille vide (page entière, zoom barre supérieure, zoom navigation latérale) ; ceux de `dashboard/` sont l'écran **rempli**, avec des données, une rangée d'actions et deux panneaux que la coquille n'a jamais montrés. Ne jamais substituer les uns aux autres sur la seule foi du nom de fichier.
> (b) **Les trois exports de `dashboard/` ne sont pas trois écrans mais un écran et deux de ses dialogues** (même famille de cas que `web-actus`, `section-and-teams`, `web-memberships`, `web-users`) : `Dashboard.png` = l'écran seul, et le seul pleinement lisible ; `Dashboard - 1.png` = écran + dialogue « Inviter un utilisateur » ; `Dashboard - 2.png` = écran + dialogue « Créer une équipe ». **Les deux dialogues sont déjà construits à l'identique** (`InviteUserDialog.tsx`, `TeamFormDialog.tsx`) — ce ne sont pas deux nouveaux composants à dessiner (§2.3). Le dialogue « Inviter un utilisateur » porte encore dans son texte le marqueur interne « *mécanisme à confirmer — OPEN-2* », **déjà levé** par `specs/web-users.md` §2.5 et déjà remplacé dans le code livré : ne pas le réintroduire.

## 1. Périmètre

### Ce que c'est

Le **contenu réel de la page d'accueil du backoffice**, sur la destination déjà existante `/admin/overview` (« Vue d'ensemble », premier item de `BACKOFFICE_NAV_ITEMS`, route d'index de `/admin`). Quatre blocs, tous illustrés par la maquette :

1. Une **rangée de 4 raccourcis d'action** qui ouvrent des **dialogues déjà construits** (inviter un utilisateur, créer une équipe, créer une adhésion, publier une actu).
2. Une **rangée de 4 cartes de compteurs**, **chacune cliquable** et menant à l'onglet correspondant du backoffice.
3. Deux **panneaux de travail** : « Cotisations non soldées » et « Invitations en attente ».
4. Dans la **navigation latérale** (chrome partagé, pas la page) : les **deux blocs « ALERTE »** laissés en suspens depuis `web-empty-state` (PO-WE-11) et un **bouton « Déconnexion »**.

Plus, sur cet écran seulement, la **ligne de contexte de l'en-tête** (« Saison … · N sections · club invitation-only »), omise jusqu'ici faute de données (AC-WE-17).

**Ce n'est pas un nouvel écran** : la route, la coquille, le garde d'accès, le titre « Bonjour, {prénom} » et l'entrée de navigation existent déjà. Cette tranche remplace le `BackofficeEmptyState` rendu par `BackofficeOverviewPage`.

**Aucun rapport avec `specs/coach-dashboard.md` ni `specs/player-dashboard.md`** : ce sont deux écrans **mobiles**, servant des rôles différents, avec leurs propres ViewModels et leurs propres `queryKeys`. Rien n'est partagé, rien n'est étendu, rien n'est renommé de leur côté (AC-WD-25).

### Rattachement CDC

| Élément | Module CDC | Priorité |
|---|---|---|
| L'écran lui-même (agrégats par rôle, sans export) | **Statistiques et exports** — « **Tableaux de bord par rôle**, exports CSV/PDF filtrés » (exports **hors périmètre**, §1) | **P1** |
| Carte « Utilisateurs actifs », panneau « Invitations en attente », raccourci « Inviter un utilisateur » | **Authentification et profils** — « Comptes, rôles, permissions, **invitation** » | **P0** |
| Carte « Adhésions à renouveler », panneau « Cotisations non soldées », raccourci « Créer une adhésion » | **Adhérents et licences** (P0) **et Cotisations** (P1, « sans encaissement en ligne ») | **P0 + P1** |
| Cartes « Sections » / « Saisons », raccourci « Créer une équipe » | **Équipes et sections** | **P0** |
| Raccourci « Publier une actu » | **Communication** | **P1** |
| Surface backoffice | Non — surface de rendu, pas un module (`specs/web-empty-state.md` §1) | — |

C'est la **première feature du backoffice dont le rattachement principal est P1** : un tableau de bord est littéralement nommé par le module « Statistiques et exports ». Conséquence à assumer : cette tranche **ne doit pas faire remonter de P1 par la bande**. Elle n'agrège que des données dont les écrans P0/P1 sous-jacents sont **déjà construits** — elle n'ouvre aucun module nouveau.

### Entre au périmètre

1. **La ligne de contexte de l'en-tête** (§2.7) — lève AC-WE-17 **pour `/admin/overview` uniquement**.
2. **La rangée de 4 raccourcis d'action** (§2.3), chacun ouvrant un **dialogue existant, non modifié** — lève AC-WE-16 **pour cet écran uniquement**.
3. **Les 4 cartes de compteurs** et leur navigation vers l'onglet associé (§2.1, §2.2) — lève AC-WE-13 **pour cet écran uniquement**.
4. **Les deux panneaux** « Cotisations non soldées » (avec son entrée « Encaisser », `RecordPaymentDialog` existant) et « Invitations en attente » (§2.4).
5. **Les deux blocs « ALERTE » de la navigation latérale** (§2.5) — **clôt PO-WE-11**, dernier reliquat de `web-empty-state`.
6. **Le bouton « Déconnexion »** en pied de navigation latérale (§2.6).

### Hors périmètre — explicitement

- **Toute nouvelle action RBAC, politique RLS, table, colonne ou migration.** Cette feature n'écrit rien que les écrans existants n'écrivaient déjà, par les mêmes use cases et les mêmes politiques (§3). Si une contribution se retrouve à rédiger une migration pour cette feature, c'est qu'elle a dépassé le périmètre.
- **Le champ de recherche de la barre supérieure** (« Rechercher un utilisateur, une équipe… ») : **reste inerte**, AC-WE-15 reconduit. La maquette le montre mais ne montre aucun résultat, et aucun élément de cadrage ne dit ce qu'il cherche. C'est une feature à part entière.
- **L'icône de notifications et sa pastille rouge** : restent inertes et sans pastille. Aucun système de notification n'existe (raisonnement d'AC-WE-13 étendu à un indicateur non chiffré, déjà appliqué dans `BackofficeTopBar.tsx`).
- **L'entrée de navigation « Journal d'audit »** visible sur les trois exports : **non ajoutée** à `backoffice-nav.ts` (PO-WA-09 reconduit). Aucune infrastructure d'audit n'existe dans le dépôt (§4).
- **Les exports CSV/PDF** du module P1 « Statistiques et exports » : aucun contrôle d'export n'apparaît sur la maquette, et « Exporter des données » est une ligne de matrice à part, tracée par le CDC §11.3. Ne rien en déduire depuis ce tableau de bord.
- **Le pré-filtrage de la destination d'une carte** (par ex. « Adhésions à renouveler » → `/admin/memberships?status=pending`) : la demande dit « redirigé vers l'onglet associé », pas « vers l'onglet filtré », et `/admin/memberships` ne pilote aujourd'hui qu'un seul filtre par URL (`?user=`, `specs/web-users-membership-column.md` §2.3a). **Navigation simple vers l'onglet** → PO-WD-03.
- **Tout tableau de bord pour un autre rôle que Administrateur.** Le module P1 dit « tableaux de bord **par rôle** », la maquette n'en montre qu'un, et `backoffice:access` vaut `['admin']` (PO-WE-01 toujours ouvert). Aucune variante n'est spécifiée ici.
- **La double authentification administrateur** (PO-WE-04), **le MFA**, **la bascule mobile↔backoffice d'un compte multi-rôles** (PO-WE-06) : inchangés, non rouverts.
- **Le rendu mobile** : `/admin/*` reste derrière `RequireDesktopViewport`.

## 2. Modèle et règles

### Principe directeur — cet écran ne crée aucune lecture, il en compose

Toutes les valeurs de la maquette sont **déjà lisibles** par des méthodes de repository existantes, sous des `queryKeys` **déjà centralisées**. C'est la contrainte structurante de la feature, et elle a une conséquence non négociable : **le tableau de bord consomme les `queryKeys` existantes, il n'en crée pas de doublon pour les mêmes lectures** (AC-WD-02). Si l'écran inventait ses propres clés (`dashboardStats()` et consorts), les invalidations déjà écrites dans `useInviteUserDialogViewModel`, `useTeamFormDialogViewModel`, `useMembershipFormDialogViewModel`, `useNewsFormDialogViewModel`, `useRecordPaymentDialogViewModel` ne le rafraîchiraient plus : un compte invité depuis le tableau de bord n'apparaîtrait pas dans son propre compteur. En réutilisant les clés, **le rafraîchissement est acquis sans écrire une ligne d'invalidation nouvelle**.

### 2.1 Les 4 cartes de compteurs — source de chaque chiffre

| Carte (maquette) | Chiffre | Sous-ligne | Source, existante |
|---|---|---|---|
| **UTILISATEURS ACTIFS** | comptes dont `userStatus(charterAcceptedAt) === 'active'` | « N invitation(s) en attente » = comptes `'invited'` | `UserRepository.findAdminDirectory(currentSeasonId)` — clé `usersAdminDirectory()` |
| **ADHÉSIONS À RENOUVELER** | `CountMembershipsRequiringAttentionUseCase` | « Statut « en attente » » — **libellé fixe**, pas un calcul | clé `membershipsBadgeCount()` |
| **SECTIONS** | `SectionRepository.findAll().length` | « N équipes au total » = `TeamRepository.findAllForAdmin().length` | clés `sectionsAdminList()`, `teamsAdminList()` |
| **SAISONS** | `SeasonRepository.findAll().length` | libellé de la saison en cours | clés `seasonsAdminList()`, `seasonCurrent()` |

Quatre pièges, chacun déjà à portée de main :

1. **« Utilisateurs actifs » réutilise le prédicat du domaine `userStatus()`**, jamais un test inline `charterAcceptedAt !== null` recopié ici (`specs/web-users.md` §2.1 : le statut est un prédicat pur, couvert par Vitest, et il n'existe qu'une fois). La sous-ligne « invitation(s) en attente » est **le complément exact** du même prédicat, pas un second critère.
2. **« 4 actives » de la maquette est de la copie de maquette.** Une `Section` porte `id`, `name`, `type`, `createdAt` — **aucune notion d'actif/inactif n'existe dans le modèle**. Le mot est donc abandonné, pas simulé (PO-WD-06, AC-WD-06).
3. **« N équipes au total » est volontairement non filtré par saison** : `findAllForAdmin()` ne filtre pas (c'est sa raison d'être, `team-repository.ts`), et « au total » le dit. Ne pas y brancher `findByIds()`/`findCurrent()` par analogie avec les écrans mobiles.
4. **La carte « Adhésions à renouveler » hérite de PO-WM-06, elle ne le tranche pas.** Le use case existant compte les adhésions au statut `'pending'` de la saison en cours ; le libellé « à renouveler » de la maquette et sa propre sous-ligne « Statut « en attente » » ne disent pas la même chose. **Le chiffre de la carte et le badge « Adhésions » de la navigation viennent du même use case et doivent rester égaux à tout instant** (AC-WD-05) — deux définitions divergentes sur un même écran seraient pires que l'ambiguïté actuelle.

**Repli quand aucune saison n'est en cours** (`findCurrent()` → `null`, cas réel d'intersaison) : la carte « Saisons » affiche un texte explicite de type « Aucune saison en cours » à la place du libellé, la carte « Adhésions à renouveler » affiche `0` (repli déjà implémenté dans le use case), et la ligne de contexte de l'en-tête omet le segment saison (§2.7). **Jamais une carte vide, jamais une erreur d'écran, jamais un libellé inventé** (AC-WD-07).

### 2.2 Chaque carte de compteur est un lien vers son onglet

Demande explicite de la développeuse, cohérente avec la maquette (les cartes sont des surfaces pleines, pas des blocs décoratifs) :

| Carte | Destination |
|---|---|
| UTILISATEURS ACTIFS | `/admin/users` |
| ADHÉSIONS À RENOUVELER | `/admin/memberships` |
| SECTIONS | `/admin/sections` |
| SAISONS | `/admin/seasons` |

Trois règles :

- **Les destinations sont lues depuis `BACKOFFICE_NAV_ITEMS`** (`backoffice-nav.ts`), jamais réécrites en dur dans la page : ce fichier existe précisément pour que « la liste des destinations soit décidée une fois » (son propre commentaire). Une carte se rattache à un `BackofficeNavItemId`, pas à une chaîne `'/admin/users'` (AC-WD-08).
- **La carte « Sections » mène à `/admin/sections`**, pas à `/admin/teams`, malgré sa sous-ligne sur les équipes : le titre de la carte nomme la ressource, la sous-ligne est un contexte.
- **La navigation est une vraie navigation router** (`Link`/`NavLink`, pas un `onClick` + `navigate()` sur un `div`) : clic milieu, ouverture dans un nouvel onglet et navigation clavier doivent fonctionner — CDC §12 exige la navigation clavier (AC-WD-24).

### 2.3 La rangée d'actions — **réutiliser les dialogues, n'en construire aucun**

Instruction littérale de la développeuse (« *On click on actions like invite user, reuse existing create data dialogs* »), et les deux dialogues illustrés par les exports 1 et 2 sont **déjà construits à l'identique**.

| Raccourci (maquette) | Dialogue réutilisé, **tel quel** | Permission consommée |
|---|---|---|
| **Inviter un utilisateur** — « Envoi par e-mail » | `users/components/InviteUserDialog.tsx` (`{ isOpen, onClose }`) | `'user:invite'` |
| **Créer une équipe** — « Section, catégorie, coach » | `teams/components/TeamFormDialog.tsx` (`{ dialog: { mode: 'create' }, onClose }`) | `'team:write'` |
| **Créer une adhésion** — « Saison en cours » | `memberships/components/MembershipFormDialog.tsx` (`{ isOpen, onClose }`) | `'membership:write'` |
| **Publier une actu** — « Visible par le club » | `news/components/NewsFormDialog.tsx` (`{ dialog: { mode: 'create' }, onClose }`) | `'news:write'` |

Les quatre dialogues sont **autonomes** : chacun charge ses propres listes déroulantes via les `queryKeys` centralisées (TanStack Query dédoublonne) et invalide lui-même ce qu'il doit invalider. **Les monter depuis `BackofficeOverviewPage` ne demande donc aucune modification de leur part** — et c'est la ligne à tenir : **aucun des quatre composants ni des quatre ViewModels de dialogue n'est modifié par cette feature** (AC-WD-09).

Trois sous-titres de la maquette sont **de la copie, pas des spécifications de champs** — les reproduire comme des exigences ferait grossir des dialogues déjà spécifiés ailleurs :

- « Section, catégorie, coach » : `TeamFormDialog` a trois champs, `NOM` / `SECTION` / `SAISON`. **Il n'y a pas de champ « catégorie », et l'affectation d'un coach est un autre parcours** (`AssignCoachDialog`, action `'role:assign-coach'`, `specs/section-and-teams.md` §2.9). Ne rien ajouter.
- « Saison en cours » : `MembershipFormDialog` ne pré-sélectionne rien. Son paramètre de pré-sélection **a été volontairement retiré** (`specs/web-users-membership-column.md` §2.6) ; le réintroduire ici rouvrirait une décision déjà prise (AC-WD-10).
- « Envoi par e-mail » : rappel du canal, déjà traité par `specs/web-users.md` §2.5. Le canal SMTP reste une question d'exploitation (GOUVERNANCE.md §3), pas de code.

**Visibilité conditionnelle** : un raccourci dont la permission est fausse **disparaît**, il n'est pas rendu désactivé — patron déjà retenu partout dans ce dépôt (« une carte de menu disparaît plutôt que d'apparaître désactivée », `specs/web-empty-state.md` UI design). Les quatre permissions sont évaluées **séparément**, jamais regroupées en un booléen `canDoAdminStuff` : `'membership:write'` et `'news:write'` peuvent s'élargir indépendamment (PO-WM-08, PO-WA-08) — même discipline que `useBackofficeMembershipsViewModel` pour `canWriteMembership`/`canRecordPayment` (AC-WD-11).

### 2.4 Les deux panneaux

#### a. « Cotisations non soldées » — le bloc financier

Contenu de la maquette : un titre, une sous-ligne d'agrégat (« N adhésion(s) · M€ restant à percevoir »), un lien « Voir les adhésions », puis une liste de lignes portant initiales, nom, **barre de progression**, montant restant, « X€ / Y€ versés », et un bouton **« Encaisser »**.

Tout est calculable à partir des **quatre lectures que `useBackofficeMembershipsViewModel` effectue déjà** (`membershipsAdminList`, `membershipPaymentsAdminList`, `seasonsAdminList`, `usersAdminList`) et des règles du domaine déjà écrites (`sumPaymentsCents`, `membershipPaymentStatus`). **Rien de nouveau côté `domain/` ni `data/`.**

Trois règles :

1. **L'assemblage d'une ligne n'est pas dupliqué.** `MembershipAdminRow` porte une décision non triviale — `effectiveAmountDueCents` (montant de l'adhésion, à défaut tarif de la saison converti en centimes), documentée comme une décision développeuse dans son propre commentaire. **La recopier dans le ViewModel du tableau de bord la ferait diverger au premier changement.** L'assemblage doit donc être **partagé** entre `/admin/memberships` et `/admin/overview` (hook ou fonction partagée de la feature `memberships`), jamais réécrit (AC-WD-12 — même exigence qu'AC-WM-13 et AC-WU-17).
2. **Le prédicat « non soldée » est `membershipPaymentStatus(...) !== 'paid'`**, la fonction du domaine que la colonne COTISATION de `/admin/memberships` utilise déjà — pas une comparaison de montants réécrite dans la page.
3. **« Encaisser » ouvre `RecordPaymentDialog`**, non modifié, avec la même ligne `MembershipAdminRow` en cible. Le bouton n'est rendu que si `'payment:record'` est vrai. **Constater un versement déjà survenu — jamais un encaissement en ligne** (CDC §7.2, P2 : « sans encaissement en ligne »), point que le nom de l'action `'payment:record'` porte déjà (AC-WD-13).

**Portée saison** : le panneau est borné à la **saison en cours**, comme le badge « Adhésions » et comme le filtre par défaut de `/admin/memberships` (§2.6b de `web-memberships`). Sans saison en cours, le panneau affiche son état vide, jamais un agrégat toutes saisons confondues (PO-WD-05, AC-WD-14).

#### b. « Invitations en attente »

Liste des comptes dont `userStatus(charterAcceptedAt) === 'invited'` : initiales, nom, e-mail, pastille « Invité ». Lien « Voir les utilisateurs » → `/admin/users`. Source : `usersAdminDirectory()`, **la même lecture que la carte « Utilisateurs actifs »** — un seul appel, deux affichages (AC-WD-15). La pastille réutilise `UserStatusBadge` de `/admin/users` plutôt qu'une seconde pastille de statut.

#### c. États vides et débordement — les deux panneaux

- **Panneau vide = bonne nouvelle, et ça doit se lire comme tel** : « Aucune cotisation en attente », « Aucune invitation en attente ». Jamais un panneau absent (l'écran changerait de forme selon les données), jamais un « 0 » nu (AC-WD-16).
- **Débordement** : la maquette montre 3 lignes et 1 ligne, sans contrôle de pagination ni « voir plus ». Position retenue, à confirmer : **un plafond d'affichage**, le lien d'en-tête du panneau (« Voir les adhésions » / « Voir les utilisateurs ») servant de chemin de débordement, avec une mention du reste quand il y en a. Valeur du plafond et formulation → **PO-WD-02**.

### 2.5 Les deux blocs « ALERTE » de la navigation latérale — **clôt PO-WE-11**

| Bloc (maquette) | Contenu | Source |
|---|---|---|
| **1** | « N adhésion(s) et M invitation(s) à traiter » + « Traiter maintenant » | N = `membershipsBadgeCount()` (le **même** chiffre que la carte et le badge) ; M = comptes `'invited'` (le **même** que la sous-ligne de la carte « Utilisateurs actifs ») |
| **2** | « N utilisateur(s) sans rôle assigné : {nom(s)} » + « Voir les utilisateurs » → `/admin/users` | comptes dont `missingElementFacts.hasRole === false`, lus depuis `usersAdminDirectory()` |

**Le piège principal, à écrire noir sur blanc dans le code** : le bloc 2 compte **le critère 1 seul** (`hasRole`), **pas** `hasMissingElement()` qui en combine quatre par OU (`specs/web-users.md` §2.3). Le badge rouge de l'entrée « Utilisateurs » et ce bloc ALERTE **afficheront donc des chiffres différents, et c'est correct** : ils ne mesurent pas la même chose. Ne « corriger » ni l'un ni l'autre pour les faire coïncider (AC-WD-17). Le fait `hasRole` est **déjà porté** par `AdminUserDirectoryEntry.missingElementFacts` : le consommer de là, jamais re-dériver depuis `roles.length` — une seule source par fait (AC-WD-18).

**Destination de « Traiter maintenant » (bloc 1) : non tranchée.** La phrase nomme deux ressources (adhésions, invitations) et le lien est unique. Position retenue par défaut : `/admin/memberships`, la première ressource nommée → **PO-WD-01**.

**Affichage des noms (bloc 2)** : la maquette n'illustre que le cas à un seul compte. Règle au-delà de un (tous ? les premiers, suivis d'un « et N autres » ? aucun nom ?) → **PO-WD-02**.

**Où ces blocs vivent, et ce que ça coûte.** La demande dit « alerts on left menu » et la maquette les place en pied de `BackofficeSidebar` — donc en **chrome partagé, visible sur les 7 destinations**, pas seulement sur `/admin/overview`. Conséquence assumée : la lecture `usersAdminDirectory()` (nécessaire pour **nommer** les comptes sans rôle) se déclenche sur tout le backoffice, alors que les deux badges existants n'y déclenchent que des comptages légers. Position retenue : **réutiliser `usersAdminDirectory()`**, sans nouvelle méthode de repository ni nouvelle clé — à l'échelle d'un club, c'est une lecture de quelques dizaines de lignes, déjà en cache dès que l'administrateur a visité `/admin/users`. Si la mesure dément cette hypothèse, le repli est une lecture dédiée et légère (`{ id, fullName }[]` des comptes sans rôle) sur le modèle des deux use cases de comptage existants → **PO-WD-04**.

Chaque bloc, comme les deux badges de navigation, est **son propre composant enfant isolé** dans `BackofficeSidebar.tsx` (patron déjà en place pour `MembershipsNavBadge`/`UsersNavBadge`), afin que sa requête ne se déclenche que pour lui. **Un bloc dont le compte vaut 0 ne s'affiche pas** — même règle que les badges (`if (count <= 0) return null`), et même raison : une alerte permanente à zéro devient du bruit (AC-WD-19).

### 2.6 Le bouton « Déconnexion »

En pied de navigation latérale, sous les blocs ALERTE. **Aucune nouveauté fonctionnelle** : il appelle le `SignOutUseCase` existant, via `useAuthDependencies`, exactement comme `useMenuViewModel` côté mobile.

- **Aucune entrée de matrice, aucune action nouvelle** : `specs/menu.md` §2/§3 a déjà tranché que la déconnexion est hors matrice RBAC (AC-WD-20).
- **Pas de `navigate()` manuel après la déconnexion** : la session disparaît, `RequireBackofficeSession` redirige de lui-même vers `/admin/login` — **jamais vers `/login` mobile** (AC-WE-08 reconduit, AC-WD-21).
- **Le composant est local au backoffice**, pas un import de `features/menu/components/LogoutButton.tsx` : celui-ci est stylé pour la palette mobile (pilule sombre, bordure `white/15`). On reprend **son patron** — confirmation par `AlertDialog` avant de déconnecter — pas son rendu. Le pas de confirmation n'est pas illustré par la maquette (elle ne montre qu'un bouton) → **PO-WD-07**, avec la confirmation comme position par défaut, par cohérence avec le mobile.

### 2.7 La ligne de contexte de l'en-tête

« Saison {libellé} · {N} sections · club invitation-only ». Les deux valeurs sont désormais disponibles (`seasonCurrent()`, `sectionsAdminList()`) : AC-WE-17 est levée **pour cet écran seulement**. Le segment « club invitation-only » est du **texte statique** — c'est un rappel de la nature de l'application (CDC : comptes par invitation), pas une valeur calculée.

Deux modifications de composants existants, toutes deux limitées à `/admin/overview` :

- `BackofficePageHeader` gagne la ligne de contexte et **perd ses deux boutons `disabled`** (« Nouvelle section », « Inviter un utilisateur ») : la maquette ne les montre plus, la rangée d'actions du §2.3 les remplace et les dépasse. Ce composant n'a **qu'un seul appelant** (`BackofficeOverviewPage`) — aucun autre écran n'est affecté (AC-WD-22).
- Sans saison en cours, **le segment saison disparaît**, la ligne ne se casse pas (AC-WD-07).

### 2.8 Découpe en couches — ce que la feature ajoute vraiment

| Couche | Ajout |
|---|---|
| `domain/` | **Rien.** Aucun use case, aucune entité, aucun repository, aucune politique. Les prédicats nécessaires (`userStatus`, `hasMissingElement`/`MissingElementFacts`, `membershipPaymentStatus`, `sumPaymentsCents`, `seasonStatus`) existent tous. |
| `data/` | **Rien.** Aucune méthode de repository, aucun DTO, aucun mapper, aucune migration. |
| `presentation/` | Le ViewModel de l'écran (`useBackofficeOverviewViewModel` ou l'extension de `useBackofficeDashboardViewModel` — nommage au développeur), les composants de la page (cartes d'action, cartes de compteur, deux panneaux), les deux composants de bloc ALERTE et le bouton de déconnexion dans `BackofficeSidebar.tsx`, et l'assemblage partagé de `MembershipAdminRow` (§2.4a). |

**Si cette table doit être démentie pendant l'implémentation, c'est un signal de dépassement de périmètre, pas un détail** (AC-WD-01). Le ViewModel fait tout le calcul ; `BackofficeOverviewPage` ne branche que des booléens et des chaînes déjà calculées (`CLAUDE.md` §6).

## 3. RBAC

### Ce que la matrice CDC dit des données affichées

| Permission (matrice CDC) | Joueur | Coach | Resp. section | Dirigeant habilité | Trésorier | Réf. médical | Bénévole | **Administrateur** |
|---|---|---|---|---|---|---|---|---|
| Gérer comptes, rôles, paramétrage | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Voir les dossiers des autres membres | ❌ | ❌ (son équipe, hors financier) | ✅ (sa section) | ✅ | ❌ (financier seulement) | ❌ (santé seulement, tracé) | ❌ | ✅ |
| Voir le statut de cotisation | ✅ (soi-même) | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Gérer échéanciers et relances | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ (paramétrage) |
| Envoyer une communication ciblée | ❌ | ✅ (son équipe) | ✅ (sa section) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Consulter le journal d'audit | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Qui accède à cet écran

**`'backoffice:access'` = `['admin']`**, inchangé. `/admin/overview` est une sous-route de la coquille déjà gardée par `RequireBackofficeAccess` : **aucun garde nouveau n'est ajouté**, et un accès direct par URL sans session ou sans le rôle est déjà traité (AC-WE-08/AC-WE-09).

**Observation à remonter, pas une décision à prendre ici** : cet écran est le premier à réunir **sur une seule vue** de la donnée nominative club-wide (noms, e-mails) et de la donnée financière nominative (montants dus, montants versés par personne). Ce sont exactement les deux lignes de matrice où **Trésorier** et **Dirigeant habilité** portent un ✅ — et où Coach, Bénévole et Référent médical portent un ❌ explicite. Autrement dit : **PO-WE-01 (qui entre dans le backoffice) et PO-WM-08 (quels rôles gèrent les cotisations) deviennent plus coûteux à laisser ouverts** avec cet écran qu'avec les précédents. Élargir `backoffice:access` sans découper ce tableau de bord donnerait mécaniquement à un Responsable de section une vue **club-wide** là où ses droits sont **bornés à sa section**, et à un Coach une vue financière que la matrice lui refuse. **Cette spec n'élargit rien** (moindre privilège) et signale le point → PO-WD-04 n'est pas ce sujet ; c'est PO-WE-01, reconduit et aggravé.

### Les permissions consommées par les écritures de l'écran

**Aucune nouvelle.** Cinq actions existantes, chacune évaluée séparément via `usePermission`, chacune déjà miroitée côté RLS par la feature qui l'a introduite :

| Point d'entrée | Action | Miroir RLS (existant) |
|---|---|---|
| Raccourci « Inviter un utilisateur » | `'user:invite'` | aucune politique `INSERT` sur `public.users` — la vérification serveur de l'Edge Function d'invitation est le vrai garde (`specs/web-users.md` §2.5) |
| Raccourci « Créer une équipe » | `'team:write'` | `teams_insert_admin` |
| Raccourci « Créer une adhésion » | `'membership:write'` | `memberships_insert_admin` |
| Raccourci « Publier une actu » | `'news:write'` | `club_news_insert_admin` |
| Bouton « Encaisser » | `'payment:record'` | `membership_payments_insert_admin` |

**Rappel `CLAUDE.md` §6, qui vaut double sur un écran d'agrégats** : ces vérifications front sont de l'UX (afficher ou masquer un raccourci). **La sécurité réelle est la RLS**, et c'est elle qui décide de ce que chaque lecture renvoie. Un compte non administrateur qui atteindrait cet écran ne verrait pas des compteurs faux : il verrait des compteurs **calculés sur ce que la RLS lui renvoie** — soit, pour `users`/`memberships`, sa seule ligne. Ce n'est pas une protection suffisante en soi, c'est la raison pour laquelle le garde de route reste la première barrière.

### Comptes multi-rôles

Un compte `admin` + `coach` conserve **une session pour deux surfaces** : `/` (mobile) et `/admin` (backoffice), sans passerelle (PO-WE-06, non rouvert). Le bouton « Déconnexion » de cette feature **déconnecte la session entière**, donc les deux surfaces — comportement attendu et identique à celui du menu mobile, à ne pas « améliorer » en déconnexion partielle (AC-WD-21).

## 4. Données sensibles

| Nature | Cette tranche | Conséquence |
|---|---|---|
| **Données de santé** | **Aucune** | Aucun trigger d'audit d'accès requis (`ARCHITECTURE.md` §11). Aucun agrégat santé n'apparaît sur la maquette : **ne pas en ajouter un**, ce serait le cas d'usage le plus strictement encadré du CDC (§6.3, accès « nominatif très restreint et tracé ») |
| **Données financières** | **Oui, et de façon nouvelle** : montants dus et versés **par personne nommée**, agrégat « M€ restant à percevoir », et un point d'entrée d'écriture (« Encaisser ») | Voir ci-dessous |
| **Données nominatives club-wide** | **Oui** : noms et e-mails (panneau « Invitations en attente »), noms (panneau cotisations, bloc ALERTE) | Voir ci-dessous |
| **Identifiants de connexion** | Non — la connexion vit sur `/admin/login`, inchangée | — |

**Le point financier, sans le lisser.** Le CDC §11.3 liste « **modification de paiement** » parmi les actions dont la traçabilité est **non négociable dès le P0**. Cette feature **ajoute un second point d'entrée** à une écriture qui en avait déjà un (`/admin/memberships`), sans qu'aucune infrastructure d'audit n'existe dans le dépôt. Elle **ne crée pas** le manquement — `specs/web-memberships.md` PO-WM-09 le porte déjà — mais elle **l'étend à un second chemin**, ce qui rend l'absence de journal un peu plus difficile à tenir à chaque tranche. À dire tel quel au Bureau, pas à noyer. Quand le journal existera, la trace se posera **dans le use case** (`RecordPaymentUseCase`), pas dans un composant, et elle couvrira les deux points d'entrée d'un coup (`CLAUDE.md` §6).

**Le point nominatif, qui est nouveau.** Jusqu'ici, une liste nominative club-wide se voyait après que l'administrateur ait **navigué** vers `/admin/users` ou `/admin/memberships`. Ce tableau de bord en met une **sur la page d'atterrissage**, doublée de montants dus par personne, visible dès la connexion. Le CDC §11.3 trace « l'**export** nominatif », pas la consultation d'une liste — la lettre du texte ne l'exige donc pas. Mais `roles-personas-as-caribbean.md` pose pour l'Administrateur la limite « **actions sensibles journalisées** », et le rôle Référent médical montre que le CDC sait exiger une trace **à la consultation** quand l'enjeu le justifie. **Le point est ouvert, pas résolu par omission** → **PO-WD-06 bis / PO-WD-07** (voir §5), à instruire par le référent RGPD **avec** PO-WE-08 (journaliser la connexion), dont c'est la question jumelle.

**Aucun export.** Le module P1 auquel cet écran se rattache s'appelle « Statistiques **et exports** » ; la moitié « exports » est explicitement hors périmètre (§1). C'est important pour la ligne d'audit : tant qu'aucun bouton d'export n'existe, l'événement « export nominatif » du CDC §11.3 n'est pas déclenchable depuis cet écran (AC-WD-23).

**Noms de personnes.** La maquette affiche un prénom/nom dans l'en-tête, l'avatar, les trois lignes de cotisations, la ligne d'invitation et le bloc ALERTE. `CLAUDE.md` §9 interdit tout nom réel dans le code, les commentaires, les commits et la documentation, **y compris en exemple ou en fixture**. Toutes ces valeurs viennent de la base à l'exécution ; **aucune n'est codée en dur, y compris dans un test** (AC-WE-14 reconduit, AC-WD-26). Cette spec n'en reproduit aucun.

**RGPD.** Aucun traitement nouveau n'est introduit : ce sont les mêmes données, lues par les mêmes politiques, présentées autrement. Ce qui change est l'**exposition** (page d'atterrissage plutôt que page consultée volontairement) — ce qui est précisément ce que PO-WD-07 demande d'arbitrer. Le référent RGPD n'est toujours pas désigné (`GOUVERNANCE.md` §7, CDC §22 décision n°5), ce qui **bloque l'arbitrage, pas la construction**.

## 5. Critères d'acceptation

Numérotation `AC-WD-xx`, feature nouvelle — aucune série existante ne couvre ce périmètre.

**Périmètre et couches**

- **AC-WD-01** — Cette feature n'ajoute **aucune** migration, table, colonne, politique RLS, action RBAC, entrée de `rbacMatrix`, entité, use case, interface ni méthode de repository. Vérifiable par `git diff --stat` : `supabase/`, `src/domain/` et `src/data/` sont **inchangés**, à l'exception d'aucun fichier.
- **AC-WD-02** — Toutes les lectures de l'écran passent par des `queryKeys` **déjà présentes** dans `presentation/shared/query-keys.ts` (`usersAdminDirectory`, `membershipsBadgeCount`, `membershipsAdminList`, `membershipPaymentsAdminList`, `usersAdminList`, `seasonsAdminList`, `seasonCurrent`, `sectionsAdminList`, `teamsAdminList`). **Aucune clé nouvelle** n'est créée pour une lecture déjà couverte.
- **AC-WD-03** — Conséquence testable d'AC-WD-02 : inviter un utilisateur depuis le tableau de bord **met à jour la carte « Utilisateurs actifs », le panneau « Invitations en attente » et les blocs ALERTE sans rechargement manuel**, sans qu'aucune ligne d'invalidation nouvelle ait été écrite. Idem pour créer une équipe (carte « Sections »), créer une adhésion et encaisser un versement (carte « Adhésions à renouveler » et panneau cotisations).
- **AC-WD-04** — `BackofficeOverviewPage` ne contient **aucun calcul métier** : uniquement des branchements sur des booléens/chaînes déjà produits par son ViewModel (`CLAUDE.md` §6).

**Cartes de compteurs**

- **AC-WD-05** — Le chiffre de la carte « Adhésions à renouveler », celui du badge de l'entrée « Adhésions » et le N du bloc ALERTE 1 **proviennent du même use case** et sont **égaux à tout instant**.
- **AC-WD-06** — La carte « Sections » n'affiche **pas** le mot « actives » de la maquette : aucune notion d'activité n'existe sur `Section`. Elle affiche le nombre de sections, et en sous-ligne le nombre total d'équipes (non filtré par saison).
- **AC-WD-07** — Sans saison en cours (`findCurrent()` → `null`) : la carte « Saisons » affiche un texte explicite à la place du libellé, la carte « Adhésions à renouveler » affiche `0`, le panneau cotisations affiche son état vide, et la ligne de contexte omet le segment saison. **Aucune erreur d'écran, aucun libellé inventé, aucun `null` rendu.**
- **AC-WD-08** — Les 4 cartes de compteur sont des liens vers `/admin/users`, `/admin/memberships`, `/admin/sections`, `/admin/seasons`, avec des destinations **résolues depuis `BACKOFFICE_NAV_ITEMS`**, jamais des chaînes écrites en dur dans la page.
- **AC-WD-24** — Ces liens sont de vrais liens router (navigation clavier, `Entrée`, clic milieu, focus visible) — CDC §12.

**Actions**

- **AC-WD-09** — Les quatre raccourcis montent `InviteUserDialog`, `TeamFormDialog`, `MembershipFormDialog`, `NewsFormDialog` **sans modifier ni ces composants ni leurs ViewModels**. Aucun nouveau dialogue de création n'est écrit par cette feature.
- **AC-WD-10** — `MembershipFormDialog` est ouvert **sans pré-sélection de saison ni d'utilisateur** : son paramètre de pré-sélection, retiré par `specs/web-users-membership-column.md` §2.6, n'est pas réintroduit.
- **AC-WD-11** — Chaque raccourci est masqué (et non rendu désactivé) quand sa permission est fausse. Les cinq permissions (`'user:invite'`, `'team:write'`, `'membership:write'`, `'news:write'`, `'payment:record'`) sont évaluées **indépendamment**, jamais agrégées en un booléen unique.

**Panneaux**

- **AC-WD-12** — L'assemblage d'une ligne de cotisation (`MembershipAdminRow` : `effectiveAmountDueCents`, `paidCents`, `paymentStatus`) est **partagé** avec `/admin/memberships`, jamais recopié. Une modification de la règle de montant dû se répercute sur les deux écrans par construction.
- **AC-WD-13** — « Encaisser » ouvre `RecordPaymentDialog` (non modifié), n'apparaît que si `'payment:record'` est vrai, et **ne déclenche aucun encaissement en ligne** : c'est la saisie d'un versement déjà survenu (CDC §7.2).
- **AC-WD-14** — Le panneau « Cotisations non soldées » est borné à la **saison en cours**, cohérent avec le badge « Adhésions » et avec le filtre par défaut de `/admin/memberships`.
- **AC-WD-15** — La carte « Utilisateurs actifs », sa sous-ligne « N invitation(s) en attente » et le panneau « Invitations en attente » sont alimentés par **une seule et même lecture** (`usersAdminDirectory()`), via le prédicat du domaine `userStatus()` — jamais un test `charterAcceptedAt !== null` réécrit dans la page.
- **AC-WD-16** — Un panneau sans donnée affiche un **état vide explicite et positif** (« Aucune cotisation en attente », « Aucune invitation en attente »), jamais un panneau absent ni un « 0 » nu.

**Blocs ALERTE et déconnexion**

- **AC-WD-17** — Le bloc ALERTE « sans rôle assigné » compte **le seul critère `hasRole`**, pas `hasMissingElement()` (4 critères). Son chiffre **peut légitimement différer** du badge rouge de l'entrée « Utilisateurs » ; aucun des deux n'est modifié pour les faire coïncider. Le code porte ce fait en commentaire explicite.
- **AC-WD-18** — Ce prédicat consomme `AdminUserDirectoryEntry.missingElementFacts.hasRole`, jamais une re-dérivation depuis `roles.length`.
- **AC-WD-19** — Un bloc ALERTE dont le compte vaut 0 **ne s'affiche pas** (même règle que les deux badges de navigation). Chaque bloc est son propre composant enfant isolé, pour que sa requête ne se déclenche que pour lui.
- **AC-WD-20** — La déconnexion appelle le `SignOutUseCase` existant via le conteneur DI. **Aucune entrée de matrice, aucune action, aucun use case nouveau** (`specs/menu.md` §2/§3).
- **AC-WD-21** — Après déconnexion, la redirection vers `/admin/login` provient de `RequireBackofficeSession`, **sans `navigate()` manuel**, et **jamais vers `/login`** (mobile). La session est terminée pour les deux surfaces d'un compte multi-rôles.

**Non-régression et transverse**

- **AC-WD-22** — `BackofficePageHeader` perd ses deux boutons `disabled` et gagne la ligne de contexte ; **aucun autre écran du backoffice ne change de rendu** (ce composant n'a qu'un appelant). AC-WE-13/AC-WE-16/AC-WE-17 restent en vigueur pour les 6 autres destinations.
- **AC-WD-23** — Aucun contrôle d'export (CSV, PDF, presse-papier, impression) n'est rendu. Aucune entrée de navigation « Journal d'audit » n'est ajoutée à `backoffice-nav.ts` (PO-WA-09 reconduit). Le champ de recherche de la barre supérieure et l'icône de notifications **restent inertes** (AC-WE-15 reconduit).
- **AC-WD-25** — Aucun écran mobile ne change : `specs/coach-dashboard.md` et `specs/player-dashboard.md`, leurs ViewModels et leurs `queryKeys` sont intacts. Vérifiable en régression sur les deux tableaux de bord mobiles.
- **AC-WD-26** — Aucun nom de personne n'est codé en dur, nulle part : ni dans un composant, ni dans un commentaire, ni dans une fixture de test, y compris ceux de la maquette (`CLAUDE.md` §9).
- **AC-WD-27** — CDC §12 : contrastes vérifiés au niveau **AA** sur les éléments colorés porteurs de sens de cet écran (montants en rouge/orange, barres de progression, pastilles d'alerte) — et **aucune information portée par la couleur seule** : un montant restant, un statut de cotisation et une alerte sont des **mots** avant d'être une couleur (même exigence qu'AC-WM-33, AC-WU-28, AC-PR-17).
- **AC-WD-28** — Toute erreur de lecture remonte en **message français issu d'une `DomainError` traduite** (`mapDomainErrorToUiError`), jamais une charge utile Supabase brute ni une page blanche. Une lecture en échec **dégrade son seul bloc** — l'écran ne devient pas entièrement inutilisable parce qu'une des huit lectures a échoué.

## 6. Questions ouvertes

**PO-WD-01 — Où mène « Traiter maintenant » (bloc ALERTE 1) ?** *(Développeuse — n'empêche ni la conception ni la construction, une valeur par défaut est retenue.)*
La phrase nomme deux ressources (« N adhésion(s) **et** M invitation(s) à traiter »), le lien est unique. Défaut retenu : `/admin/memberships`. Alternatives : `/admin/users`, ou deux liens au lieu d'un.

**PO-WD-02 — Plafond d'affichage des deux panneaux, et des noms du bloc ALERTE 2.** *(Développeuse / designer.)*
La maquette illustre 3 lignes, 1 ligne et 1 nom — soit exactement les cas où la question ne se pose pas. Combien de lignes un panneau affiche-t-il au maximum avant de renvoyer vers son onglet ? Et au-delà d'un compte sans rôle, le bloc ALERTE liste-t-il tous les noms, les premiers suivis d'un « et N autres », ou aucun ?

**PO-WD-03 — Une carte de compteur doit-elle pré-filtrer sa destination ?** *(Développeuse — hors périmètre de cette passe.)*
« Adhésions à renouveler » menant à `/admin/memberships` **filtré sur le statut « en attente »** serait plus utile qu'une arrivée sur la liste complète. Ça demande d'étendre le pilotage par URL des filtres de cet écran (seul `?user=` existe aujourd'hui) — une modification de `/admin/memberships`, pas de ce tableau de bord. La demande ne le réclame pas ; à instruire séparément.

**PO-WD-04 — Coût des blocs ALERTE en chrome partagé.** *(Développeuse — à mesurer, pas à trancher à l'avance.)*
Les placer dans `BackofficeSidebar` (comme la maquette et la demande) déclenche `usersAdminDirectory()` sur les 7 destinations du backoffice, alors que les deux badges existants n'y déclenchent que des comptages légers. Position retenue : réutiliser la lecture existante (taille club). Repli si la mesure dément : une lecture dédiée et légère des comptes sans rôle, sur le modèle des deux use cases de comptage — ce qui ferait alors sortir la feature de sa promesse « aucun ajout `domain`/`data` » (AC-WD-01), donc à décider consciemment.

**PO-WD-05 — Portée saison du panneau « Cotisations non soldées ».** *(Développeuse / Trésorier.)*
Retenu : saison en cours, par cohérence avec le badge et le filtre par défaut de `/admin/memberships`. À confirmer : une cotisation impayée d'une saison **passée** doit-elle disparaître de ce panneau ? C'est de l'argent qui reste dû — mais un panneau qui ne redescend jamais à zéro devient du bruit.

**PO-WD-06 — « 4 actives » : une section peut-elle être inactive ?** *(Bureau / développeuse — non bloquant, le mot est abandonné en attendant.)*
Le modèle ne connaît pas la notion. Si le club en a besoin (une section mise en sommeil une saison), c'est une colonne et une règle à spécifier — pas un mot à afficher sans rien derrière.

**PO-WD-07 — Faut-il journaliser la consultation de ce tableau de bord ?** *(Référent RGPD / Bureau — question jumelle de PO-WE-08, à instruire avec elle.)*
Cet écran met une liste nominative club-wide **et** des montants dus par personne sur la page d'atterrissage, visibles dès la connexion, là où il fallait jusqu'ici naviguer vers un écran dédié. Le CDC §11.3 trace l'« export nominatif », pas la consultation — la lettre n'exige donc rien. Mais `roles-personas-as-caribbean.md` pose « actions sensibles journalisées » pour le rôle Administrateur. Si une trace est décidée : trigger Postgres (accès donnée) ou use case (action métier) selon `ARCHITECTURE.md` §11, et quelle rétention (`RETENTION_PURGE.md`) ? Rappel du contexte : **aucune infrastructure d'audit n'existe** (PO-WM-09, PO-WA-09), et cette feature **ajoute un second chemin** vers une écriture de paiement que le CDC §11.3 nomme explicitement (§4).

**PO-WD-08 — Deux confirmations mineures.** *(Développeuse.)*
(a) La déconnexion passe-t-elle par une confirmation `AlertDialog`, comme côté mobile, ou est-ce un bouton direct comme le laisse penser la maquette ? Défaut retenu : confirmation. (b) La ligne de registre des maquettes pré-rédigée au §0 doit être recopiée dans `docs/designs/DESIGN_LINKS.md` par un agent ayant les droits d'écriture sur `docs/` — **avec sa note (a) sur la collision de noms de fichiers avec `web-empty-state`**, qui est le vrai enjeu de cette ligne.

**Points reconduits, non rouverts ici** : PO-WE-01 (rôles admis au backoffice — **aggravé** par cet écran, §3), PO-WE-04 (MFA administrateur), PO-WE-06 (compte multi-rôles, deux surfaces), PO-WE-08 (journaliser la connexion), PO-WM-06 (définition d'« adhésion à traiter » — la carte l'hérite, ne la tranche pas), PO-WM-08 (rôles des cotisations), PO-WM-09 / PO-WA-09 (journal d'audit inexistant).

## 7. Handoff

Le périmètre visuel est **entièrement couvert** par les trois exports, et les deux dialogues qu'ils illustrent sont déjà construits. Aucune question ouverte ne bloque la conception : PO-WD-01/02/06/08 portent sur de la copie ou un plafond d'affichage (valeurs par défaut fournies), PO-WD-03/04/05 sont des arbitrages produit ou de performance sans effet sur la mise en page, PO-WD-07 est un arbitrage RGPD qui ne change rien à ce qui est dessiné.

**La spec est transmissible à designer-agent en l'état**, avec cinq consignes à ne pas perdre en route :

1. **Ne dessiner aucun dialogue** : les quatre sont construits et ne changent pas (AC-WD-09).
2. **Les 4 cartes de compteur sont des liens**, pas des blocs décoratifs (AC-WD-08/AC-WD-24).
3. **Le mot « actives » disparaît de la carte « Sections »** (AC-WD-06), et le marqueur « OPEN-2 » du dialogue d'invitation ne revient pas (§0).
4. **Les états « sans saison en cours » et « panneau vide » sont à dessiner** : ce sont des cas normaux, pas des erreurs (AC-WD-07/AC-WD-16).
5. **Aucun nom de la maquette ne survit au dessin** (AC-WD-26), et rien d'important ne doit reposer sur la couleur seule (AC-WD-27).

## UI design

> **Statut : première rédaction, 2026-09-23.** Écrite le même jour que la spec, sans réserve bloquante à lever (§7 de la spec) : les huit questions ouvertes portent sur de la copie, un plafond d'affichage ou un arbitrage produit/RGPD sans effet sur la mise en page — chacune est reportée ci-dessous avec la valeur par défaut que la spec retient, pas retranchée à cette passe.

### Sources utilisées, par ordre de priorité effectif

1. **`docs/designs/DESIGN_LINKS.md` §4** — aucune ligne §2 n'existe encore pour `web-dashboard` ; conformément au §4 du registre et à la ligne pré-rédigée par l'agent PO au §0 de la spec, **aucun lien artifact n'est demandé**. La ligne pré-rédigée reste à recopier dans le registre par la développeuse ou un agent ayant les droits d'écriture sur `docs/` (PO-WD-08b) — non fait par cette passe, qui ne peut écrire que dans `specs/`.
2. **Les trois exports `docs/designs/desktop/dashboard/[Admin] Web - Dashboard{, - 1, - 2}.png`**, tous les trois lus directement. `Dashboard.png` est le seul pleinement lisible (l'écran seul) ; `Dashboard - 1.png` et `Dashboard - 2.png` sont le même écran assombri par, respectivement, le dialogue « Inviter un utilisateur » et le dialogue « Créer une équipe » (§0 de la spec) — **aucun des deux dialogues n'est redessiné ici**, les deux composants existants (`InviteUserDialog.tsx`, `TeamFormDialog.tsx`) sont montés tels quels (AC-WD-09). Le contenu assombri sous les deux dialogues (cartes de compteurs, panneaux) reste cohérent d'un export à l'autre — pas d'information supplémentaire à en tirer au-delà de `Dashboard.png`.
3. **Composants déjà construits dans ce backoffice, relus intégralement pour cette passe** : `presentation/features/backoffice/components/{BackofficeSidebar,BackofficeTopBar,BackofficePageHeader,BackofficeEmptyState}.tsx`, `presentation/features/backoffice/dashboard/{BackofficeDashboardLayout,useBackofficeDashboardViewModel}.ts(x)`, `presentation/features/backoffice/overview/BackofficeOverviewPage.tsx`, `presentation/features/backoffice/backoffice-nav.ts`, `presentation/features/backoffice/memberships/{useBackofficeMembershipsViewModel,useMembershipsNavBadge}.ts`, `presentation/features/backoffice/memberships/components/{MembershipCotisationSummary,RecordPaymentDialog}.tsx`, `presentation/features/backoffice/users/{useBackofficeUsersViewModel,useUsersNavBadge}.ts`, `presentation/features/backoffice/users/components/{UserStatusBadge,UserMissingElementIndicator}.tsx`, `presentation/features/backoffice/users/components/InviteUserDialog.tsx`, `presentation/features/backoffice/teams/components/TeamFormDialog.tsx`, `presentation/features/backoffice/memberships/components/MembershipFormDialog.tsx`, `presentation/features/backoffice/news/components/NewsFormDialog.tsx`, `presentation/features/menu/components/LogoutButton.tsx`. Cette passe **réutilise leurs patrons visuels et leurs prédicats plutôt que d'en inventer de nouveaux**, conformément à la consigne du rôle.
4. `wireframes-basiques-as-caribbean.md` — non consultée comme référence de mise en page, même raisonnement que `web-users`/`web-memberships`/`section-and-teams` : écran desktop d'agrégats, backoffice, sans équivalent visuel dans les 4 écrans mobiles fixes (Dashboard/Calendrier/Actus/Menu). Ce tableau de bord backoffice **n'est pas** l'écran mobile `player-dashboard`/`coach-dashboard` malgré le nom partagé (AC-WD-25, §1 de la spec) — aucune parenté de mise en page entre les deux.
5. `specs/web-dashboard.md` §1 à §6 — autoritaires sur le périmètre, le modèle et le RBAC. Cette section les **met en œuvre**, elle ne rouvre aucune des huit questions ouvertes (§6 de la spec).

### Où ça vit

Une seule destination, **déjà présente** dans `backoffice-nav.ts` : `/admin/overview` (« Vue d'ensemble », `IconLayoutDashboard`, route d'index de `/admin`). Cette passe **remplace** le rendu actuel (`BackofficeEmptyState` inconditionnel dans `BackofficeOverviewPage.tsx`) — même geste que `web-actus`/`web-seasons`/`section-and-teams`/`web-memberships`/`web-users` avant elle. Aucun nouvel écran, aucun onglet, aucune sous-route.

**Ce n'est pas une des 4 destinations fixes du nav mobile** (Dashboard / Calendrier / Actus / Menu, `wireframes-basiques-as-caribbean.md`) : ce nav-là régit la coquille mobile membre, sans rapport avec cette tranche. Le backoffice a sa propre navigation latérale fixe, désormais à **7 entrées** (Vue d'ensemble, Utilisateurs, Sections, Équipes, Saisons, Adhésions, Actus) déjà câblées dans `BackofficeSidebar.tsx` — cette passe ne touche à aucune entrée de cette liste, seul le contenu de « Vue d'ensemble » change, et la navigation latérale elle-même **gagne** les deux blocs ALERTE et le bouton de déconnexion en pied de colonne (chrome partagé, visible sur les 7 destinations — §2.5/§2.6 de la spec).

### Ce qui change par rôle

Reprend tel quel le RBAC du §3 de la spec, sans le redéfinir. `'backoffice:access' = ['admin']` inchangé : dans cette passe, un seul rôle atteint jamais cet écran, donc les cinq booléens d'écriture ci-dessous valent tous `true` en pratique pour ce rôle — ils restent cinq booléens **indépendants**, jamais fusionnés en un `canDoAdminStuff` (§2.3 de la spec, même discipline que `web-users`/`web-memberships`) :

| Élément d'écran | Booléen ViewModel | Action `can()` | Statut de construction |
|---|---|---|---|
| Accès à `/admin/overview`, lecture des 8 sources agrégées | garde de route existante (`backoffice:access`) | `'backoffice:access'` | **Construit** — RLS seule suffit, aucune entrée `can()` dédiée pour une lecture |
| Raccourci « Inviter un utilisateur » | `canInviteUser` | `'user:invite'` | **Construit ailleurs**, réutilisé (`specs/web-users.md` §2.5) |
| Raccourci « Créer une équipe » | `canWriteTeam` | `'team:write'` | **Construit ailleurs**, réutilisé (`specs/section-and-teams.md`) |
| Raccourci « Créer une adhésion » | `canWriteMembership` | `'membership:write'` | **Construit ailleurs**, réutilisé (`specs/web-memberships.md`) |
| Raccourci « Publier une actu » | `canWriteNews` | `'news:write'` | **Construit ailleurs**, réutilisé (`specs/web-actus.md`) |
| Bouton « Encaisser » (panneau cotisations) | `canRecordPayment` | `'payment:record'` | **Construit ailleurs**, réutilisé (`specs/web-memberships.md`) |
| Cartes de compteurs, panneaux, blocs ALERTE (lecture seule) | — | aucune — même raisonnement que l'icône d'avertissement de `web-users` (« aucune entrée n'est créée » pour une lecture) | — |
| Bouton « Déconnexion » | — | aucune — hors matrice RBAC (`specs/menu.md` §2/§3, AC-WD-20) | **Construit ailleurs**, réutilisé (`SignOutUseCase`) |

**Aucune de ces six actions n'est nouvelle** (§2.3/§3 de la spec) : cette passe ne fait qu'évaluer les cinq permissions d'écriture **séparément** pour décider si chaque raccourci/bouton **apparaît**, jamais s'il apparaît grisé (règle du dépôt, « une carte de menu disparaît plutôt que d'apparaître désactivée » — reconduite ici à l'identique pour la rangée d'actions et pour le bouton « Encaisser »).

### Composition de l'écran, de haut en bas

1. **En-tête** (`BackofficePageHeader`, modifié) — §2.7/AC-WD-22.
2. **Rangée de 4 raccourcis d'action** — §2.3/AC-WD-09/AC-WD-11, nouveau composant `DashboardActionCard`.
3. **Rangée de 4 cartes de compteurs** — §2.1/§2.2, nouveau composant `DashboardStatCard`.
4. **Deux panneaux côte à côte** : « Cotisations non soldées » et « Invitations en attente » — §2.4, nouveaux composants `UnpaidDuesPanel`/`PendingInvitationsPanel`.
5. *(Chrome partagé, pas cette page)* — deux blocs ALERTE et le bouton « Déconnexion » en pied de `BackofficeSidebar` — §2.5/§2.6.

Squelette de page : `flex flex-col gap-6`, même schéma que les autres écrans du backoffice (`BackofficeMembershipsPage.tsx` et consorts) — pas un nouveau système de grille.

#### 1. En-tête — `BackofficePageHeader`, deux changements, un seul appelant

Le composant existant perd ses deux boutons `disabled` (« Nouvelle section », « Inviter un utilisateur ») — la rangée d'actions du point 2 les remplace et les dépasse — et gagne la **ligne de contexte** sous le titre « Bonjour, {prénom} » : « Saison {libellé} · {N} sections · club invitation-only » (§2.7). Le segment saison est construit à partir de `seasonCurrent()` (déjà lu par le reste de l'écran) et le nombre de sections à partir de `sectionsAdminList()` (idem) — **aucune nouvelle lecture** pour cette seule ligne. Le segment « club invitation-only » est du texte statique, jamais calculé.

**Sans saison en cours** : le segment saison disparaît de la ligne, elle ne se casse pas — reste « {N} sections · club invitation-only » (AC-WD-07). Ce composant n'a qu'un seul appelant (`BackofficeOverviewPage`), donc ce changement ne se propage à aucun autre écran (AC-WD-22).

#### 2. Rangée d'actions — nouveau composant `DashboardActionCard`

Quatre tuiles en ligne (`flex flex-wrap gap-3` ou `grid grid-cols-4 gap-3` selon la largeur disponible — les deux satisfont le renvoi à la ligne que montre la maquette au-delà du plancher desktop), chacune un **vrai `button`** (jamais un `div` cliquable), composée de :
- un carré d'icône à gauche (icône « + », `size-11`, coin arrondi) ;
- un titre en gras (« Inviter un utilisateur », « Créer une équipe », « Créer une adhésion », « Publier une actu ») ;
- une sous-ligne muette, plus petite, qui est **de la copie, pas une exigence de champ** (§2.3 de la spec : « Section, catégorie, coach » ne veut pas dire que `TeamFormDialog` gagne un champ catégorie, ni « Saison en cours » que `MembershipFormDialog` pré-sélectionne quoi que ce soit — AC-WD-10).

Seule la première tuile (« Inviter un utilisateur ») porte un traitement plein, coloré (`bg-coach-green`, carré d'icône et texte blancs) — reprise du traitement déjà utilisé par l'ancien bouton `disabled` de `BackofficePageHeader` avant son retrait. Les trois autres sont en traitement neutre (`variant="outline"`, carré d'icône `bg-muted`) — même hiérarchie que la maquette, qui ne colore que la première tuile.

**Chaque tuile fait `h-11` minimum sur sa hauteur de contenu** (CLAUDE.md §6 — cible tactile réelle même sur cet écran desktop, même raisonnement déjà tenu par `UserMissingElementIndicator` : « une cible tactile réelle même sur cet écran desktop-only »). **Visibilité conditionnelle, jamais grisée** : une tuile dont la permission (`canInviteUser`/`canWriteTeam`/`canWriteMembership`/`canWriteNews`) est fausse **disparaît** de la rangée — les trois autres se redistribuent, la rangée ne laisse jamais un espace vide à sa place (AC-WD-11). Un administrateur sans aucune des quatre permissions (cas théorique, hors périmètre RBAC actuel où `backoffice:access` vaut `['admin']` pur) verrait une rangée vide plutôt qu'un bloc à quatre emplacements grisés — comportement cohérent avec le reste du dépôt, non illustré par la maquette (aucune des quatre permissions n'est aujourd'hui refusée à un administrateur).

**Clic** : chaque tuile appelle un `onClick` qui ouvre le dialogue correspondant, monté au niveau de `BackofficeOverviewPage` exactement comme `BackofficeUsersPage`/`BackofficeTeamsPage` montent les leurs — un état local par dialogue (`isInviteDialogOpen`, `teamDialog: TeamDialogState`, `isMembershipDialogOpen`, `newsDialog: NewsDialogState`), passé tel quel aux composants existants :

| Tuile | Dialogue monté | Prop d'ouverture |
|---|---|---|
| Inviter un utilisateur | `InviteUserDialog` | `{ isOpen, onClose }` |
| Créer une équipe | `TeamFormDialog` | `{ dialog: { mode: 'create' }, onClose }` |
| Créer une adhésion | `MembershipFormDialog` | `{ isOpen, onClose }` |
| Publier une actu | `NewsFormDialog` | `{ dialog: { mode: 'create' }, onClose }` |

**Aucun de ces quatre composants ni de leurs ViewModels n'est modifié** (AC-WD-09) : ils chargent leurs propres options et invalident leurs propres `queryKeys` — le rafraîchissement des cartes/panneaux de ce même écran (point 3 et 4) est acquis par la réutilisation de ces mêmes `queryKeys`, jamais par un callback `onSuccess` qui recharge manuellement l'écran (AC-WD-02/AC-WD-03).

#### 3. Rangée de compteurs — nouveau composant `DashboardStatCard`

Quatre cartes en ligne (`grid grid-cols-4 gap-3` sur desktop), chacune un **vrai lien de routeur** (`NavLink`/`Link`, jamais un `onClick` + `navigate()` sur un `div` — AC-WD-24), dont la destination est résolue depuis `BACKOFFICE_NAV_ITEMS` par `id` (`'users'`, `'memberships'`, `'sections'`, `'seasons'`), jamais une chaîne écrite en dur (AC-WD-08). Chaque carte porte : un libellé en petites majuscules muettes (« UTILISATEURS ACTIFS »…), un chiffre en grand et gras, et une sous-ligne muette (« N invitation(s) en attente »…). Toute la surface de la carte est cliquable (`display: block` sur le lien lui-même, pas seulement sur le chiffre), avec un état `:hover`/`:focus-visible` visible — même exigence de navigation clavier que le reste du backoffice (CDC §12, AC-WD-24).

| Carte | Chiffre | Sous-ligne | Destination |
|---|---|---|---|
| UTILISATEURS ACTIFS | `userStatus() === 'active'` count | « N invitation(s) en attente » | `/admin/users` |
| ADHÉSIONS À RENOUVELER | `CountMembershipsRequiringAttentionUseCase` | « Statut « en attente » » (libellé fixe) | `/admin/memberships` |
| SECTIONS | nombre de sections | « N équipes au total » | `/admin/sections` |
| SAISONS | nombre de saisons | libellé de la saison en cours | `/admin/seasons` |

**Le mot « actives » de la maquette (carte SECTIONS) n'est pas repris** — `Section` ne porte aucune notion d'activité (AC-WD-06, PO-WD-06). La carte affiche donc simplement le nombre de sections, sans qualificatif.

**Trois états, par carte** (chaque carte se dégrade indépendamment — AC-WD-28, « une lecture en échec dégrade son seul bloc ») :
- **Chargement** — le chiffre est remplacé par un bloc muet animé (`animate-pulse`, largeur fixe approximative d'un chiffre à 1-2 caractères), jamais un flash à `0`.
- **Erreur** — le chiffre est remplacé par un tiret muet (`—`) avec un `title`/`aria-label` portant le message français traduit (`mapDomainErrorToUiError`) ; la carte reste un lien actif vers son onglet (l'erreur porte sur l'agrégat affiché ici, pas sur l'écran de destination).
- **Valeur normale** — y compris `0`, qui est une vraie donnée (ex. « 0 adhésion à renouveler ») et **jamais traité comme un état vide** de la carte.

**Repli « sans saison en cours »** (`seasonCurrent()` → `null`, AC-WD-07) : la carte SAISONS affiche un texte explicite (« Aucune saison en cours ») à la place du libellé de saison en sous-ligne — le chiffre du nombre de saisons enregistrées, lui, reste affiché normalement (ce n'est pas ce chiffre qui manque). La carte ADHÉSIONS À RENOUVELER affiche `0` (repli déjà porté par le use case). **Jamais une carte vide, jamais un libellé inventé.**

#### 4. Les deux panneaux

Disposés côte à côte (`grid grid-cols-2 gap-4` sur desktop, `min-w-0` sur chaque colonne par cohérence avec la règle CLAUDE.md §6 même si le plancher `RequireDesktopViewport` limite le risque de chevauchement réel ici — la règle s'applique à toute paire de blocs côte à côte, pas seulement aux champs de formulaire). Chaque panneau porte un en-tête (titre + agrégat en sous-ligne à gauche, lien « Voir… » à droite), puis une liste de lignes, puis — en l'absence de ligne — un état vide positif.

##### a. `UnpaidDuesPanel` — « Cotisations non soldées »

Titre, sous-ligne d'agrégat (« N adhésion(s) · M€ restant à percevoir », calculée sur les lignes affichées, pas sur l'ensemble du club), lien « Voir les adhésions » (`/admin/memberships`). Chaque ligne : avatar à initiales (réutilise le composant `Avatar`/`AvatarFallback` déjà utilisé par `BackofficeTopBar`), nom, puis à droite `MembershipCotisationSummary` **réutilisé tel quel** (le même composant que la colonne COTISATION de `/admin/memberships` — montant, texte et barre de progression, jamais une seconde implémentation, §2.4a/AC-WD-12) et un bouton « Encaisser » qui ouvre `RecordPaymentDialog` **non modifié**, avec la ligne `MembershipAdminRow` cliquée comme cible.

L'assemblage de chaque ligne (`MembershipAdminRow` — `effectiveAmountDueCents`, `paidCents`, `paymentStatus`) est **la même fonction** que celle que `useBackofficeMembershipsViewModel.ts` calcule déjà en ligne (§2.4a de la spec, AC-WD-12) : cette passe demande d'**extraire** cette fonction d'assemblage (aujourd'hui un bloc `.map(...)` inline dans ce hook) en une fonction partagée, importée par les deux ViewModels — jamais recopiée. Le prédicat « non soldée » est `membershipPaymentStatus(...) !== 'paid'`, appliqué aux mêmes lignes après assemblage, borné à la **saison en cours** (§2.4a point 2, PO-WD-05 : portée retenue par défaut, à confirmer par le Trésorier).

Le bouton « Encaisser » n'est rendu que si `canRecordPayment` est vrai.

##### b. `PendingInvitationsPanel` — « Invitations en attente »

Titre, lien « Voir les utilisateurs » (`/admin/users`). Chaque ligne : avatar à initiales, nom, e-mail (texte secondaire), et `UserStatusBadge` **réutilisé tel quel** (la même pastille orange « Invité » que la colonne STATUT de `/admin/users`) — jamais une seconde pastille de statut inventée pour ce panneau. Source : les comptes de `usersAdminDirectory()` dont `userStatus(charterAcceptedAt) === 'invited'` — **la même lecture** que la carte « Utilisateurs actifs » du point 3, un seul appel réseau pour les deux affichages (AC-WD-15).

##### c. États des deux panneaux — trois états, chacun indépendant

- **Chargement** — 2-3 lignes muettes animées (`animate-pulse`), même famille visuelle que `MembershipTableSkeleton`/`UserTableSkeleton` adaptée à une ligne de panneau plutôt qu'à une ligne de tableau.
- **Erreur** — `Alert variant="destructive"` **scopée au panneau**, pas à l'écran entier (AC-WD-28) : le panneau en échec affiche son message français traduit, l'autre panneau et les cartes de compteurs restent fonctionnels.
- **Vide** — texte positif explicite (« Aucune cotisation en attente », « Aucune invitation en attente »), jamais un panneau absent (la page changerait de forme selon les données) ni un « 0 » nu (AC-WD-16).

**Plafond d'affichage** (PO-WD-02, non tranché) : position par défaut retenue pour cette passe — **5 lignes maximum par panneau**, le lien d'en-tête (« Voir les adhésions »/« Voir les utilisateurs ») servant de chemin de débordement, avec une mention du reste sous la dernière ligne quand il y en a (« et 3 de plus »). Aucune pagination, aucun bouton « voir plus » in-situ — ce n'est ni illustré par la maquette (3 lignes, 1 ligne) ni demandé. **À confirmer par la développeuse avant implémentation**, cette passe ne fait que proposer une valeur plutôt que de laisser le plafond non spécifié.

### Sidebar — chrome partagé, pas cette page

#### Les deux blocs ALERTE — deux nouveaux composants isolés, jumeaux des badges existants

`BackofficeSidebar.tsx` porte déjà deux composants enfants isolés pour ses deux badges numériques (`MembershipsNavBadge`, `UsersNavBadge`) — patron explicitement à copier, pas à réinventer (§2.5 de la spec, AC-WD-19). Cette passe ajoute, en pied de colonne, **deux nouveaux composants du même genre**, chacun sa propre requête isolée :

- **`MembershipsAndInvitationsAlert`** — « N adhésion(s) et M invitation(s) à traiter » + lien « Traiter maintenant ». N = `membershipsBadgeCount()` (le **même** chiffre que la carte de compteur et le badge de nav « Adhésions », AC-WD-05) ; M = comptes `'invited'` de `usersAdminDirectory()` (le **même** que la sous-ligne de la carte « Utilisateurs actifs »). Destination du lien : `/admin/memberships` par défaut (PO-WD-01, non tranché — la phrase nomme deux ressources, le lien est unique ; alternative envisageable : deux liens distincts, un par ressource nommée).
- **`MissingRoleAlert`** — « N utilisateur(s) sans rôle assigné : {nom(s)} » + lien « Voir les utilisateurs » (`/admin/users`). N et les noms viennent de `usersAdminDirectory()`, filtrés sur `missingElementFacts.hasRole === false` **uniquement** (pas `hasMissingElement()`, qui combine quatre critères par OU — AC-WD-17/AC-WD-18). Ce chiffre **diffère légitimement** du badge rouge de l'entrée « Utilisateurs » (qui compte les quatre critères) : ne pas les faire coïncider.

**Chaque bloc dont le compte vaut 0 ne s'affiche pas** — même règle que les deux badges de navigation existants (AC-WD-19). **Affichage des noms au-delà d'un seul compte** (PO-WD-02, second volet, non tranché) : position par défaut retenue — les trois premiers noms, séparés par une virgule, suivis de « et N autres » au-delà du troisième ; aucun nom du dépôt n'est codé en dur, ces valeurs viennent toutes de l'exécution (AC-WD-26).

**Style visuel** : chaque bloc reprend un traitement de carte compacte (fond légèrement teinté, bordure de la même teinte — rouge/`coach-red` pour le bloc 1 dont le décompte porte sur des actions en retard, ambre/`coach-amber` pour le bloc 2 dont le décompte porte sur un dossier incomplet, cohérent avec l'usage de ces deux teintes ailleurs dans ce backoffice), un titre en majuscules courtes (« ALERTE »), une ligne de texte, et un lien texte souligné en couleur d'accent. **Jamais la couleur seule** : chaque bloc porte un mot (« ALERTE ») en plus de sa teinte (AC-WD-27).

#### Le bouton « Déconnexion » — nouveau composant local, patron mobile repris, pas son rendu

Nouveau composant `BackofficeLogoutButton`, local à `presentation/features/backoffice/components/` — **pas un import de `features/menu/components/LogoutButton.tsx`**, qui est stylé pour la palette mobile (pilule sombre, bordure `white/15`). On reprend son **patron** (`AlertDialog` de confirmation avant appel à `SignOutUseCase`, PO-WD-08a — position par défaut : confirmation, par cohérence avec le mobile) mais pas son rendu : la palette `dark` du backoffice (déjà posée par `BackofficeDashboardLayout`) donne un traitement de bouton différent, cohérent avec le reste de la navigation latérale (`h-11`, largeur pleine de la colonne, `variant="outline"`).

**Aucune nouveauté fonctionnelle** (AC-WD-20) : appelle le `SignOutUseCase` existant via le conteneur DI, exactement comme `useMenuViewModel` côté mobile. **Pas de `navigate()` manuel** après déconnexion — `RequireBackofficeSession` redirige de lui-même vers `/admin/login`, jamais vers `/login` mobile (AC-WD-21).

### Récapitulatif des nouveaux composants

| Composant | Dossier proposé | Rôle |
|---|---|---|
| `DashboardActionCard` | `presentation/features/backoffice/overview/components/` | Une tuile de la rangée d'actions ; ouvre un dialogue existant, disparaît si sa permission est fausse |
| `DashboardStatCard` | `presentation/features/backoffice/overview/components/` | Une carte de compteur ; vrai lien router vers l'onglet associé, 3 états (chargement/erreur/valeur) |
| `UnpaidDuesPanel` | `presentation/features/backoffice/overview/components/` | Panneau « Cotisations non soldées » ; réutilise `MembershipCotisationSummary`/`RecordPaymentDialog`, assemblage de ligne partagé avec `/admin/memberships` |
| `PendingInvitationsPanel` | `presentation/features/backoffice/overview/components/` | Panneau « Invitations en attente » ; réutilise `UserStatusBadge`, même lecture que la carte « Utilisateurs actifs » |
| `MembershipsAndInvitationsAlert` | `presentation/features/backoffice/components/` (ajouté dans `BackofficeSidebar.tsx`) | Bloc ALERTE 1, jumeau isolé de `MembershipsNavBadge`/`UsersNavBadge` |
| `MissingRoleAlert` | `presentation/features/backoffice/components/` (ajouté dans `BackofficeSidebar.tsx`) | Bloc ALERTE 2, idem |
| `BackofficeLogoutButton` | `presentation/features/backoffice/components/` (ajouté dans `BackofficeSidebar.tsx`) | Déconnexion, patron mobile repris, rendu propre au backoffice |
| `useBackofficeOverviewViewModel` (ou extension d'`useBackofficeDashboardViewModel`, nommage laissé au développeur — §2.8 de la spec) | `presentation/features/backoffice/overview/` | Compose les lectures existantes (aucune nouvelle `queryKey`, AC-WD-02), calcule les 5 booléens de permission séparément, expose l'état des 4 dialogues |

**Aucun de ces composants ne duplique une lecture ou un prédicat déjà écrit ailleurs** (AC-WD-02/AC-WD-12/AC-WD-15) — chacun consomme une `queryKey` ou une fonction de domaine existante, à l'exception de l'extraction de l'assemblage `MembershipAdminRow` en fonction partagée, seul refactor de couche `presentation/` que cette passe demande explicitement.

### Questions ouvertes reportées (non bloquantes)

Reprises telles quelles de `specs/web-dashboard.md` §6, avec la position que cette section retient à défaut d'arbitrage :

- **PO-WD-01** (destination de « Traiter maintenant ») — retenu : `/admin/memberships`.
- **PO-WD-02** (plafond d'affichage des panneaux ; noms du bloc ALERTE 2) — retenu : 5 lignes par panneau ; 3 noms puis « et N autres ».
- **PO-WD-03** (pré-filtrage de destination d'une carte) — hors périmètre de cette passe, non dessiné.
- **PO-WD-04** (coût des blocs ALERTE en chrome partagé) — mesure technique, sans effet sur ce qui est dessiné.
- **PO-WD-05** (portée saison du panneau cotisations) — retenu : saison en cours.
- **PO-WD-06** (« actives » sur la carte Sections) — mot abandonné, rien à afficher à sa place tant que non tranché.
- **PO-WD-07** (journalisation de la consultation) — arbitrage RGPD, sans effet sur le dessin.
- **PO-WD-08a** (confirmation avant déconnexion) — retenu : `AlertDialog` de confirmation, patron mobile repris.
- **PO-WD-08b** (recopie de la ligne de registre) — action documentaire, hors portée de cette section.

Aucune de ces neuf questions ne bloque la construction : chacune porte une valeur par défaut déjà posée ci-dessus, à confirmer plutôt qu'à deviner à nouveau lors de l'implémentation.
