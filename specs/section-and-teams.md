# Spec — Backoffice web : sections & équipes (`section-and-teams`)

> Statut : **passe 2 fusionnée** — périmètre initial sur `public.sections`/`public.teams` (création/modification), complété par l'affichage et l'affectation d'un coach à une équipe (première écriture sur `public.user_roles` de toute l'application). Les deux tables et leurs politiques de lecture **existent déjà** (`20260811171754_initial_schema.sql`, `20260819153918_season_scoping_correction.sql`) — cette passe leur donne un chemin d'écriture depuis l'application, plus le chemin d'affectation d'un coach.
> Sources passe 1 : `docs/priorisation-fonctionnelle-as-acaribbean.md` (module P0 « Équipes et sections », matrice RBAC, exigences transversales §11.3), `docs/roles-personas-as-caribbean.md` (rôles Administrateur et Responsable de section), `docs/season-scoping-correction.md` (AC-CD-01, §1 « une équipe est propre à une saison », §5.1 rollover hors périmètre), `specs/web-seasons.md` (patron d'action `season:write`, console de référentiel admin, PO-WS-05), `specs/web-actus.md` (patron de console d'écriture backoffice), `specs/web-empty-state.md` (coquille backoffice, `backoffice:access`, PO-WE-01/03/10), `CLAUDE.md` §3/§4/§5/§6/§7/§9.
> Sources passe 2 (ajout) : module P0 « Authentification et profils — Comptes, rôles, permissions », `docs/roles-personas-as-caribbean.md` §3/§3.1 (gestion des comptes, comptes multi-rôles).
> État du code lu (passe 1) : `supabase/migrations/{20260811171754_initial_schema,20260819153918_season_scoping_correction,20260917122358_web_seasons_write_policies}.sql`, `domain/entities/{section,team,user}.ts`, `domain/policies/{actions,rbac-matrix,can,season-scope}.ts`, `domain/repositories/{section,team,season}-repository.ts`, `data/repositories/TeamRepositoryImpl.ts`, `presentation/features/backoffice/{backoffice-nav.ts,sections/BackofficeSectionsPage.tsx,seasons/*}`, `presentation/shared/query-keys.ts`.
> État du code relu (passe 2, ajout) : table `public.user_roles`, contrainte `user_roles_scope_check`, index partiels `user_roles_{team_scoped,section_scoped,global}_idx`, politiques `user_roles_select_own`/`users_select_own`/`teams_select_team_scoped`, `presentation/features/backoffice/users/BackofficeUsersPage.tsx` (stub, aucune action de rôle n'existe encore nulle part dans le dépôt).
> Maquettes passe 1 : `docs/designs/desktop/section-and-teams/[Admin] Web - Section and team - {1,2}.png` — **périmées pour la mise en page**, mais restent la **seule référence visuelle** des dialogues « Créer une section » / « Créer une équipe », qu'aucun export passe 2 ne rejoue. Voir §0.
> Maquettes passe 2 : `docs/designs/desktop/section-and-teams/v1/[Admin] Web - {Section - 1, Team - 1, Assign-coach}.png`, **lues directement**, remplacent les précédentes pour la mise en page (onglets/écrans avec filtres, colonne coach, dialogue d'affectation). Voir §0.

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Une ligne existe déjà** pour `section-and-teams`, au statut `instantané seul` (posée en passe 1). Conformément au §4 du registre, ce statut signifie « utiliser l'instantané local versionné et **ne pas demander de lien artifact** » — **aucun lien n'est donc demandé ici, ni maintenant ni lors d'une passe ultérieure.**

Ce qui change en passe 2 : **l'instantané référencé par la ligne existante n'est plus le bon** pour la mise en page. Il pointait vers `[Admin] Web - Section and team - {1,2}.png` (racine du dossier), remplacés par trois exports dans le sous-dossier `v1/`. Les anciens exports **ne sont pas supprimés** du dépôt ni de la ligne : ils restent l'unique référence visuelle des deux dialogues de création, et sont conservés comme antériorité — même logique que le §2 « Historique des remplacements » du registre pour un lien remplacé.

L'agent PO ne peut écrire que dans `specs/` (PO-ST-09). Ligne **pré-rédigée, à recopier telle quelle** dans le tableau du §2 du registre par le premier agent ou la développeuse ayant les droits d'écriture sur `docs/` :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| section-and-teams — **backoffice desktop : sections & équipes, avec coachs** (`[Admin] Web - {Section - 1, Team - 1, Assign-coach}`) | — aucun lien fourni | 2026-09-17 | `docs/designs/desktop/section-and-teams/v1/[Admin] Web - {Section - 1,Team - 1,Assign-coach}.png` — remplace `[Admin] Web - Section and team - {1,2}.png` (passe 1, conservés dans le dépôt comme antériorité pour les deux dialogues de création) | **instantané seul** |

> Note à joindre à la ligne : **trois exports passe 2 = deux écrans (ou deux onglets) et une boîte de dialogue**, pas trois écrans. `Section - 1` = liste des sections seule ; `Team - 1` = liste des équipes seule ; `Assign-coach` = la liste des équipes, en pleine page avec la coquille backoffice, recouverte par le dialogue « Assigner un rôle ». Seul `Assign-coach` montre la coquille (barre supérieure, navigation latérale, blocs ALERTE) ; les deux autres sont cadrés sur le seul corps de page. Les deux exports passe 1 restent la seule référence des dialogues « Créer une section »/« Créer une équipe » : eux-mêmes montraient **un seul écran et ses deux boîtes de dialogue** (export 1 = liste + « Créer une équipe », export 2 = liste + « Créer une section »), les deux s'occultant mutuellement des zones différentes du fond — ce qui reste occulté dans les deux (le `TYPE` de `Séniors`/`Elite`, le `NOM` de trois lignes d'équipes en passe 1) est signalé au §1 plutôt que deviné.

## 1. Périmètre

### Ce que c'est

Le **chemin d'écriture sur le référentiel structurel du club** — `public.sections` et `public.teams` — rendu dans le backoffice web desktop sur la destination **déjà prévue** `/admin/sections` (« Sections & Équipes », `backoffice-nav.ts`, `IconUsersGroup`), **complété par l'affichage du coach de chaque équipe/section et par l'affectation d'un coach à une ou plusieurs équipes** (écriture sur `public.user_roles`). Mise en page : onglets ou écrans distincts (Sections / Équipes), chacun avec sa liste filtrable, son bouton de création et une action de modification par ligne ; le panneau Équipes gagne une action « + Coach » par ligne. Voir « Note de cadrage — onglets, ou deux destinations ? » ci-dessous pour le point de routage non tranché.

Cette tranche remplace le stub `BackofficeSectionsPage.tsx` (qui rend aujourd'hui `BackofficeEmptyState` inconditionnellement, sans requête ni use case, cf. AC-WE-11/AC-WE-12) et **répond à PO-WE-10 pour l'entrée « Sections & Équipes »** : oui, cette entrée est bien une console d'administration du référentiel sections/équipes, désormais complétée par l'affectation des coachs qui y sont rattachés.

### Rattachement CDC

| Élément | Module CDC | Priorité |
|---|---|---|
| Création/modification de sections et d'équipes | **Équipes et sections** — « Effectifs, staffs, saisons » | **P0** |
| Affectation d'un coach à une équipe | **Authentification et profils** — « Comptes, rôles, permissions » (l'écriture touche `user_roles`, pas `teams`/`sections` — §D) | **P0** |
| Rôle porteur | Administrateur — « Paramétrage, comptes, rôles, saisons, sécurité et audit » ; ligne de matrice « Gérer comptes, rôles, **paramétrage** » (✅ Administrateur seul) | — |
| Surface backoffice | Non — le backoffice est une **surface de rendu**, pas un module (`specs/web-empty-state.md` §1) | — |

Rattachement direct : le module P0 « Équipes et sections » liste l'Administrateur parmi ses rôles principalement concernés. **Attention toutefois : le module est plus large que cette passe.** « Effectifs » et « staffs » y figurent et **ne sont couverts qu'en partie** (le staff « coach » l'est, pas les joueurs) — voir « Reste hors périmètre ».

### Ce que les maquettes montrent, factuellement

Titre de page « **Sections & équipes** », dans la coquille backoffice déjà construite.

**Écran/onglet « Sections »** (`Section - 1`) — bouton **« + Section »** en tête, **un filtre** « Tous les types ». Tableau à **quatre** colonnes : `NOM`, `TYPE`, `ÉQUIPES`, **`COACH(S)`**, plus une **action d'édition par ligne** (crayon, comme `/admin/seasons`). Quatre lignes, toutes lisibles en passe 2 : `Senior masculin` / Football / `3` / `Marc Boucher` ; `Senior féminin` / Football / `1` / `—` ; `Séniors` / Domino / `0` / `—` ; `Elite` / Echecs / `1` / `—`. **Aucun bouton « + Coach » sur cet écran.**

**Écran/onglet « Équipes »** (`Team - 1`, `Assign-coach`) — bouton **« + Équipe »** en tête, **trois filtres** : « Toutes les sections », « Toutes les saisons », **« Avec ou sans coach »**. Tableau à **quatre** colonnes : `NOM`, `SECTION`, `SAISON`, **`COACH(S)`**, plus **deux** actions par ligne : bouton **« + Coach »** et crayon d'édition. Cinq lignes : `Groupe A` / Senior masculin / `2025-2026` / `Marc Boucher` ; `Groupe B` / Senior masculin / `2025-2026` / `—` ; `Seniors féminines` / Senior féminin / `2025-2026` / `—` ; `Elite U18` / Elite / `2025-2026` / `—` ; `Groupe A` / Senior masculin / `2024-2025` / `—`. La colonne `SAISON` distingue visuellement `2025-2026` (vert) de `2024-2025` (gris) — voir §2.4.

**Dialogue « Créer une section »** (export passe 1) : `NOM` (saisie texte, exemple « Ex. Senior masculin »), `TYPE (SPORT)` (liste déroulante « Choisir… »), boutons `Annuler` / `Créer`.

**Dialogue « Créer une équipe »** (export passe 1) : `NOM` (saisie texte, exemple « Ex. Groupe A »), `SECTION` (liste déroulante « Choisir… »), `SAISON` (liste déroulante « Choisir… »), et une **mention explicative en italique, à considérer comme une règle métier posée par la maquette** :

> « Section et saison sont obligatoires : une équipe est propre à une saison et n'est jamais réutilisée d'une saison à l'autre. »

Boutons `Annuler` / `Créer`.

**Dialogue « Assigner un rôle »** (`Assign-coach`, passe 2) — ouvert depuis le bouton « + Coach » d'une ligne d'équipe. Trois champs : `UTILISATEUR` (liste déroulante « Choisir… »), `RÔLE` (liste déroulante « Choisir… »), `ÉQUIPES` (**liste de cases à cocher**, une par équipe existante, libellé `{nom} · {section} ({saison})`, incluant l'équipe de la saison `2024-2025`, une case déjà cochée). Mention explicative en italique, **règle métier posée par la maquette** au même titre que celle du dialogue « Créer une équipe » :

> « Un coach peut être assigné à plusieurs équipes : cochez toutes celles concernées. »

Boutons `Annuler` / `Assigner`.

Ce que les maquettes **ne montrent pas**, et qui compte autant : aucun dialogue de **modification** ; aucun contrôle de **suppression** ou d'archivage ; **aucune colonne d'effectif ou de liste de joueurs** ; **aucun contrôle de retrait** d'un coach (ni « × », ni bouton « Retirer », ni menu contextuel) ; **le contenu des listes déroulantes `UTILISATEUR` et `RÔLE`** (toutes deux sur « Choisir… ») ; **aucune ligne d'équipe portant plus d'un nom de coach** ; aucune pagination, aucun tri explicite, aucun état vide.

### Correspondance champs ↔ colonnes existantes

Aucune des deux tables `sections`/`teams` n'est redéfinie ici. La colonne `COACH(S)` ne correspond à aucune colonne : elle vient d'une **jointure en lecture** vers `public.user_roles` (rôle `coach`) et `public.users`, jamais stockée sur `sections` ni `teams` (§D 2.11).

| Libellé maquette | Colonne | Note |
|---|---|---|
| Sections `NOM` | `sections.name` | obligatoire, `text` |
| Sections `TYPE` | `sections.type` | obligatoire, **`check` existant : `football` / `esport` / `echecs` / `domino`** — miroir de `SectionType` (`domain/entities/section.ts`). Voir PO-ST-02 |
| Sections `ÉQUIPES` | **aucune colonne** — valeur **dérivée** (comptage de `teams`) | voir §2.3 |
| Sections `COACH(S)` | **aucune colonne** — jointure `teams → user_roles (role='coach') → users`, agrégée par section | voir §D 2.11, AC-ST-43 |
| Équipes `NOM` | `teams.name` | obligatoire, `text` |
| Équipes `SECTION` | `teams.section_id` | **nullable en base aujourd'hui** — voir §2.2 |
| Équipes `SAISON` | `teams.season_id` | **nullable en base aujourd'hui** — voir §2.2 |
| Équipes `COACH(S)` | **aucune colonne** — jointure `user_roles (role='coach', team_id) → users` | voir §D 2.11, AC-ST-42 |

### Entre au périmètre (passe 2, nouveau)

1. **La colonne `COACH(S)`** sur les deux tableaux — nom(s) du ou des comptes portant le rôle `coach` sur cette équipe (ou ces équipes, pour une section), et un état explicite « aucun coach » sinon.
2. **Le signalement d'une équipe sans coach.** À noter honnêtement : la maquette ne rend **pas** un avertissement visuel (pas d'icône, pas de badge, pas de couleur d'alerte) — elle rend un simple tiret cadratin `—`, doublé d'un **filtre** « Avec ou sans coach » qui rend l'absence de coach interrogeable. Cette spec retient donc : **un état textuel explicite, jamais une cellule vide** (AC-ST-42), et laisse à designer-agent le choix d'un traitement visuel supplémentaire, sous réserve qu'il ne soit **jamais porté par la couleur seule** (reconduction d'AC-ST-19/AC-WS-29).
3. **L'affectation d'un coach à une ou plusieurs équipes**, depuis le bouton « + Coach » d'une ligne d'équipe — écriture de lignes `public.user_roles` de rôle `coach` (§D, §3).
4. **Les filtres** : type (sections) ; section, saison, présence d'un coach (équipes). Sortent du « aucun filtre » de la passe 1.

### Hors périmètre — explicitement

- **L'inscription des joueurs et de tout autre rôle que coach.** Le dialogue est intitulé « Assigner un rôle » et propose un sélecteur `RÔLE`, mais son point d'entrée est « + Coach », sa mention explicative parle de coach, et sa liste d'équipes à cases multiples n'a de sens que pour un coach (`RoleAssignment` ne donne **qu'une** équipe à un joueur : `{ role: 'player'; teamId: string }`). **Cette passe n'assigne que le rôle `coach`.** Voir PO-ST-12 — si la réponse est « n'importe quel rôle », la fonctionnalité appartient à la console « Utilisateurs », pas à celle-ci.
- **La console de gestion des comptes et des rôles en général** (`/admin/users`, entrée `users` déjà présente dans `backoffice-nav.ts`, `BackofficeUsersPage.tsx` aujourd'hui stub). Invitation, activation, désactivation, révocation, attribution des six autres rôles : relève du module P0 « Authentification et profils » et d'une spec à écrire. **Cette passe ouvre volontairement la porte la plus étroite possible.**
- **Le retrait d'un coach.** Aucun contrôle de retrait n'est visible dans les exports. **Aucune politique `delete` sur `user_roles`, aucun use case de retrait, aucun bouton.** Le seul point d'ambiguïté (décocher une case déjà cochée) est un point ouvert, pas une fonctionnalité déduite : PO-ST-13.
- **La suppression et l'archivage** d'une section ou d'une équipe. Aucun contrôle de ce type dans les maquettes ⇒ **aucune politique `delete`**, aucun bouton. Une section est référencée par `teams.section_id` et `user_roles.section_id`, une équipe par `user_roles.team_id`, `convocations.team_id` et d'autres — une suppression n'est pas une opération anodine. Voir PO-ST-06.
- **Le rollover de saison.** Reste hors périmètre au sens de `docs/season-scoping-correction.md` §5.1 et de PO-WS-05. Cette console fournit le **chemin manuel** pour créer les équipes de la saison N+1 et désormais pour leur affecter un coach, ce qui en couvre une bonne part ; la réaffectation des **joueurs** n'est toujours couverte nulle part. PO-WS-05 n'est donc **pas refermé** — voir PO-ST-05 (amendé).
- **Toute modification du périmètre de lecture existant.** `teams_select_team_scoped` (AC-CD-01), `sections_select_authenticated`, `user_roles_select_own`, `users_select_own`, `current_season()`, `TeamRepositoryImpl.findById/findByIds` et leur filtre de saison courante sont **inchangés** (AC-ST-24, AC-ST-35).
- **L'ajout d'un nouveau type de sport.** La liste des quatre valeurs de `SectionType` est fixée par un `check` en base et par le type domaine ; cette passe n'en ajoute aucune (PO-ST-02).
- **Tout affichage côté mobile.** Aucun écran mobile ne change.
- **Le champ de recherche de la barre supérieure**, les badges numériques de navigation, et les blocs « ALERTE » visibles dans `Assign-coach » (« 2 adhésion(s)... », « 1 utilisateur(s) sans rôle assigné : … ») — déjà exclus par AC-WE-13/AC-WE-15 ; le second porte de surcroît un **nom de personne** (AC-ST-20). Point à ne pas confondre avec le point 2 ci-dessus : ces blocs comptent des **utilisateurs sans rôle**, pas des **équipes sans coach**. La **8ᵉ entrée de navigation « Journal d'audit »** visible dans `Assign-coach` est également hors périmètre (PO-WA-09), à ne pas ajouter à `backoffice-nav.ts` — même si §4 rend son existence future nécessaire.

### Note de cadrage — onglets, ou deux destinations ?

La mise en page passe à des onglets (un pour les sections, un pour les équipes) et relève de designer-agent. Un fait à ne pas laisser passer sous silence, parce qu'il ne relève pas de la mise en page mais du routage : la navigation latérale de `Assign-coach` montre **« Sections » et « Équipes » comme deux entrées distinctes**, avec « Équipes » sélectionnée — soit potentiellement deux destinations, pas deux onglets d'une même page. Les deux lectures sont défendables et ne changent rien à ce document (périmètre, RBAC, AC et données sensibles identiques dans les deux cas), mais la seconde implique une modification de `backoffice-nav.ts` (`id: 'sections'` scindé, `emptyStateTitle` combiné à revoir, route `/admin/teams` à créer). **Arbitrage laissé à designer-agent et à la développeuse** ; signalé ici pour qu'il soit pris sciemment.

## 2. Modèle et règles

### 2.1 Aucune colonne nouvelle sur `sections` — et une traçabilité inexistante sur `teams`

`sections` porte `id`, `name`, `type`, `created_at`. `teams` porte `id`, `name`, `section_id`, `season_id` — **et rien d'autre** : pas de `created_at`, pas de `created_by`, pas de `updated_at`, pas de `updated_by`. Une équipe créée ou modifiée ne laisse donc **aucune trace, ni en base ni ailleurs** ; une section garde au moins sa date de création, sans savoir par qui. Même constat que `specs/web-seasons.md` §2.1, et cette spec **n'ajoute pas** ces colonnes de sa propre initiative — voir §4 et PO-ST-03.

### 2.2 `section_id` et `season_id` : obligatoires côté produit, nullables côté base

Les deux colonnes sont déclarées `references … ` **sans `not null`**, avec ce commentaire dans la migration initiale :

> « section_id / season_id are nullable: whether a Team can exist without a Section/Season is explicitly OPEN per spec, not decided in this pass. »

**Cette question OPEN est tranchée par la maquette elle-même**, et dans le même sens que le reste du dépôt — ce n'est donc pas un arbitrage inventé ici :

1. la mention en italique du dialogue « Créer une équipe » dit littéralement « Section et saison sont **obligatoires** » ;
2. `domain/entities/team.ts` déclare déjà `sectionId: string` et `seasonId: string`, **non optionnels** ;
3. `docs/season-scoping-correction.md` §1 pose qu'« une nouvelle ligne `Team` est créée chaque saison plutôt que mutée sur place », ce qu'une équipe sans saison rendrait impossible à interpréter ;
4. `teams_select_team_scoped` filtre sur `season_id = (select id from public.current_season())` : une équipe sans `season_id` serait **invisible à ses propres membres** tout en existant.

Conséquence : le use case de création **refuse** une équipe sans section ou sans saison (AC-ST-11), et la migration de cette passe **pose `not null` sur les deux colonnes** (AC-ST-05). Cette pose est **conditionnée** à l'absence de lignes existantes à `null` : s'il en existe, appliquer le même principe que `season-scoping-correction.md` §5.2 — **ne rien résoudre silencieusement, signaler et s'arrêter** (PO-ST-01).

### 2.3 La colonne `ÉQUIPES` est un comptage dérivé, jamais une colonne

Il n'existe aucune colonne de comptage sur `sections`. La valeur se déduit d'un comptage de `teams` par `section_id`.

**Sur quel périmètre compter ?** Les chiffres de la maquette ne sont cohérents qu'avec un comptage **toutes saisons confondues** : `Senior masculin` affiche `3` alors que seules **deux** équipes de cette section apparaissent en `2025-2026` (`Groupe A`, `Groupe B`) — la troisième est la ligne `2024-2025`. `Senior féminin` affiche `1`, cohérent avec sa seule équipe visible. La maquette passe 2 **reconfirme** cette lecture sans la documenter davantage. C'est la lecture la plus cohérente avec les lignes visibles, **elle n'est pas confirmée par un document de cadrage** : voir PO-ST-07 (amendé).

Contrainte ferme quel que soit l'arbitrage : le comptage doit s'appuyer sur les lignes `teams` que l'appelant a le droit de lire, **jamais sur une fonction `security definer` qui contournerait la RLS** sans contrôle d'administrateur explicite (AC-ST-08).

### 2.4 Le libellé de saison d'une équipe : réutiliser le prédicat d'état existant

La colonne `SAISON` distingue visuellement `2025-2026` (vert) de `2024-2025` (gris), soit « saison en cours » vs « saison passée ». **Ne pas réécrire cette règle** : le prédicat d'état à trois valeurs (terminée / en cours / à venir) a été écrit dans `domain/policies/season-scope.ts` par `specs/web-seasons.md` (AC-WS-12) et est déjà couvert par Vitest. Une équipe rattachée à une saison **à venir** existe normalement (cas d'usage de préparation de la saison suivante, §1) : le rendu doit donc supporter **trois** états, pas deux — même piège qu'AC-WS-18. Voir PO-ST-08 (déjà résolu par réutilisation, non rouvert).

### 2.5 Ce que la base ne garantit pas, et que cette passe n'ajoute pas

Aucune contrainte d'unicité n'existe sur `sections.name`, ni sur `teams (name, section_id, season_id)`. Deux équipes homonymes dans la même section et la même saison sont donc acceptées par la base et **indiscernables** partout ailleurs dans l'application (sélecteur d'équipe, en-tête de convocation, tableau de bord coach). Cette spec **n'invente pas** de contrainte d'unicité — voir PO-ST-10. Ce qu'elle exige en revanche, et qu'aucune contrainte ne couvre : le use case rejette un `name` vide ou réduit à des espaces, **avant l'appel réseau**, via une `DomainError` (AC-ST-11).

### 2.6 Politiques RLS — quatre ajouts sur `sections`/`teams`, aucun sur la lecture

Les deux tables portent aujourd'hui **une seule** politique chacune, en lecture (`sections_select_authenticated` : tout compte authentifié lit toutes les sections ; `teams_select_team_scoped` : son équipe de la saison en cours, **ou tout, pour un administrateur**). Quatre politiques sont à ajouter dans une **nouvelle migration**, sans toucher aux existantes :

1. `sections_insert_admin` — `with check (private.is_admin())`
2. `sections_update_admin` — `using (private.is_admin())` et `with check (private.is_admin())`
3. `teams_insert_admin` — `with check (private.is_admin())`
4. `teams_update_admin` — `using (private.is_admin())` et `with check (private.is_admin())`

**Aucune politique `select` supplémentaire n'est nécessaire**, et c'est un point à vérifier plutôt qu'à supposer : la branche `or private.is_admin()` de `teams_select_team_scoped` est **délibérément non filtrée par saison** (« Admin is intentionally left unrestricted », migration `20260819153918`), ce qui est exactement ce dont la liste administrative a besoin pour afficher la ligne `2024-2025` de la maquette. **Aucune politique `delete`** (§1).

`private.is_admin()` existe déjà, et les `grant select, insert, update, delete … to authenticated` couvrent déjà les deux tables : rien à créer de ce côté. Miroir manuel obligatoire des deux côtés (`CLAUDE.md` §7) : chaque politique porte en commentaire SQL le nom de l'action qu'elle miroite, et les entrées de matrice renvoient aux politiques.

**Aucune règle temporelle n'est posée sur `teams_update_admin`**, contrairement à `seasons_update_admin` (« saison terminée non modifiable ») : rien dans les documents de cadrage ne l'exige pour une équipe, et la maquette affiche le crayon **y compris sur la ligne `2024-2025`**. Ne pas étendre la règle des saisons par analogie — voir PO-ST-04.

Les politiques d'écriture sur `public.user_roles` (l'affectation de coach) sont traitées séparément, en §2.9/§2.11 et AC-ST-33.

### 2.7 Domaine

- `SectionRepository` **conserve `findById()` et `findAll()` inchangées** (consommées par `GetProfileRoleScopesUseCase` et `useConvocationDetailViewModel`) et gagne `create(...)` et `update(...)`.
- `TeamRepository` **conserve `findByIds()`, `findById()` et `countActiveMembers()` inchangées** — leur filtre sur la saison courante porte AC-CD-01 — et gagne une lecture administrative **non filtrée par saison** ainsi que `create(...)` et `update(...)`. Une seule interface par ressource, **pas de `BackofficeTeamRepository` séparé** (même position que `NewsRepository` et `SeasonRepository`).
- Quatre use cases dans `domain/usecases/` (`CreateSectionUseCase`, `UpdateSectionUseCase`, `CreateTeamUseCase`, `UpdateTeamUseCase`), fonctions async pures — aucun import React / Supabase / TanStack Query, aucun `useQuery` à l'intérieur (`CLAUDE.md` §3/§6). Un cinquième, `AssignCoachToTeamsUseCase` (ou équivalent), s'y ajoute — voir §2.9/AC-ST-40.
- Les listes ont besoin de **libellés** et non d'identifiants (`SECTION` = nom de section, `SAISON` = libellé de saison, `ÉQUIPES` = comptage, `COACH(S)` = nom(s) de compte). Que ce soit résolu par une vue (`XxxRow`), par une jointure en ligne (`XxxDto`) ou par composition de repositories dans un use case, **un mapper reste obligatoire entre le DTO et l'entité** (`CLAUDE.md` §4, « never skip it, even for a simple table »).
- Clés de requête centralisées dans `presentation/shared/query-keys.ts`, jamais en ligne (`CLAUDE.md` §4). Elles doivent être **distinctes** des clés `coachTeams` / `playerTeam` / `team` existantes : ces dernières servent des lectures filtrées par la saison courante, la liste administrative non — partager une entrée de cache ferait fuiter des équipes hors saison dans les écrans mobiles d'un compte multi-rôles admin+coach (même raisonnement que `newsAdminList` vs `newsFeed`, AC-ST-22).

### 2.8 Une équipe peut avoir **plusieurs** coachs — et un coach plusieurs équipes

Les deux sens sont établis, chacun par des éléments convergents, aucun par déduction isolée :

**Un coach → plusieurs équipes** : la mention en italique du dialogue le dit littéralement ; `domain/entities/user.ts` déclare `{ role: 'coach'; teamIds: string[] }` (pluriel) ; le commentaire de `user_roles` dans la migration initiale dit « coach can have many rows, one per team ».

**Une équipe → plusieurs coachs** : (a) l'en-tête de colonne est `COACH(S)`, pluriel explicite, sur les deux tableaux ; (b) le bouton « + Coach » est rendu sur **toutes** les lignes d'équipe, **y compris `Groupe A` qui affiche déjà `Marc Boucher`** — un bouton d'ajout sur une ligne déjà pourvue n'a de sens que si un second coach est possible ; (c) en base, l'index unique `user_roles_team_scoped_idx (user_id, role, team_id)` n'interdit que le **doublon d'un même compte sur une même équipe**, jamais deux comptes distincts sur la même équipe.

Conséquence : **relation many-to-many, aucune contrainte 1:1 à poser**, et surtout aucune règle « remplacer le coach existant » à inventer. Ce qui reste indéterminé est le **rendu** d'une cellule à plusieurs noms (aucune ligne de maquette n'en montre) et l'existence éventuelle d'un plafond décidé par le Bureau : PO-ST-15.

### 2.9 Ce que l'affectation écrit — `user_roles`, jamais `teams`

Affecter un coach **n'écrit rien dans `public.teams` ni dans `public.sections`**. Une ligne est insérée dans `public.user_roles` : `user_id` = le compte choisi, `role = 'coach'`, `team_id` = l'équipe cochée, `section_id = null` (imposé par `user_roles_scope_check`). Une ligne par équipe cochée : cocher trois équipes insère trois lignes, ce n'est pas un tableau stocké.

C'est le point le plus structurant de cette passe : la ressource écrite n'est pas celle affichée. Deux conséquences immédiates — le nommage de l'action RBAC (§3) et le classement en donnée sensible (§4).

### 2.10 Idempotence — une affectation déjà existante n'est pas une erreur

Le dialogue s'ouvre avec une case **déjà cochée** dans la maquette, et sa liste énumère **toutes** les équipes, pas seulement celles où le coach manque. Un administrateur peut donc soumettre un couple (compte, équipe) qui existe déjà. L'index unique partiel `user_roles_team_scoped_idx` ferait échouer l'insertion avec une erreur Postgres brute.

Règle retenue, qui ne fait qu'expliciter la contrainte existante : **une affectation déjà en place est absorbée sans erreur et sans doublon** (`on conflict do nothing` sur cet index). Ce n'est pas l'upsert-« dernière valeur gagne » de `CLAUDE.md` §6 (`ConvocationResponse`, `AttendanceRecord`) : il n'y a aucune colonne à écraser, la ligne est sa propre valeur. Voir AC-ST-36.

### 2.11 Lecture — aucune nouvelle politique `select` n'est nécessaire, et c'est à vérifier plutôt qu'à supposer

Les deux colonnes `COACH(S)` ont besoin de joindre `teams → user_roles (role = 'coach') → users (full_name)`. Les politiques existantes le permettent déjà **pour un administrateur, et pour lui seul** :

- `user_roles_select_own` : `using (user_id = auth.uid() or private.is_admin())` ;
- `users_select_own` : `using (auth.uid() = id or private.is_admin())`.

Donc : **aucune politique `select` à ajouter**, et surtout **aucune fonction `security definer` à écrire** pour contourner la RLS sur cette jointure — même interdit qu'AC-ST-08 pour le comptage `ÉQUIPES`. Corollaire de non-régression à tester explicitement : pour un compte non administrateur, ces deux politiques restent « sa propre ligne uniquement », donc le nom des autres membres ne devient lisible nulle part ailleurs dans l'application du fait de cette passe (AC-ST-35).

La liste déroulante `UTILISATEUR` du dialogue s'appuie sur la même lecture administrative de `public.users`. Ce qu'elle contient exactement (tous les comptes ? seulement ceux ayant accepté la charte ? seulement les comptes actifs ?) n'est pas lisible dans l'export : PO-ST-12.

## 3. RBAC

### Rôle titulaire — écriture sur `sections`/`teams`

**L'écriture sur `sections` et `teams` est réservée à l'Administrateur** dans cette passe :

- la matrice RBAC comporte la ligne « **Gérer comptes, rôles, paramétrage** » : ❌ pour les sept autres rôles, ✅ pour l'Administrateur seul. Le référentiel structurel du club est du paramétrage club-wide au sens propre ;
- `roles-personas-as-caribbean.md` décrit l'Administrateur par « Paramétrage, comptes, rôles, saisons, sécurité et audit », et **aucun autre rôle n'y est décrit comme créant une section ou une équipe** ;
- moindre privilège (`roles-personas`, « Règle de sécurité ») ;
- les maquettes sont cadrées « Espace admin » et vivent sur `/admin/*`, derrière `backoffice:access` (`['admin']`).

**Le rôle qui mérite discussion est le Responsable de section**, pas les six autres. Le CDC lui donne « pilotage de sa section, événements, **effectifs**, documents et rapports », et la matrice lui accorde plusieurs lignes « ✅ (sa section) ». On pourrait en déduire qu'il crée les équipes **de sa propre section**. Mais : (a) aucune ligne de matrice ne dit « créer une équipe » ; (b) sa limite explicite est « pas d'administration hors périmètre » — or **créer une section est par construction hors de tout périmètre de section** (la section n'existe pas encore, il n'y a aucun `sectionId` à comparer) ; (c) `can.ts` borne ce rôle par `assignment.sectionId === context.sectionId`, comparaison qui n'a pas de sens sur une création de section. Position retenue : **`['admin']` pour les deux actions**, l'élargissement de la seule action `team:write` au Responsable de section restant un arbitrage produit à trancher (PO-ST-05), pas une extrapolation à faire ici.

**Réutiliser `'section:manage'` serait une erreur, à écarter explicitement** — même raisonnement que `specs/web-seasons.md` §3. Cette action vaut `['section-manager', 'admin']` et son contrôle de portée dans `can.ts` compare `assignment.sectionId` à `context.sectionId` : sur une **création**, ce contexte n'existe pas, et la branche retournerait donc silencieusement `false` pour un responsable de section (ou `true` si l'appelant omettait le contexte — pire). La proximité du libellé de navigation ne vaut pas proximité de périmètre.

### Tableau par rôle — écriture `sections`/`teams`

| Rôle | Lecture `sections` (RLS existante, inchangée) | Lecture `teams` (RLS existante, inchangée) | Accès à `/admin/sections` | Créer / modifier une section | Créer / modifier une équipe |
|---|---|---|---|---|---|
| Joueur/Joueuse | ✅ toutes | ✅ son équipe, saison en cours | ❌ | ❌ | ❌ |
| Coach/Staff | ✅ toutes | ✅ ses équipes, saison en cours | ❌ | ❌ | ❌ |
| Responsable de section | ✅ toutes | ✅ ses équipes, saison en cours | ❌ (PO-WE-01) | ❌ — **et surtout pas via `section:manage`** | ❌ **dans cette passe** (PO-ST-05) |
| Dirigeant habilité | ✅ toutes | ✅ ses équipes, saison en cours | ❌ (PO-WE-01) | ❌ | ❌ |
| Trésorier | ✅ toutes | ✅ ses équipes, saison en cours | ❌ | ❌ | ❌ |
| Référent médical | ✅ toutes | ✅ ses équipes, saison en cours | ❌ | ❌ | ❌ |
| Bénévole | ✅ toutes | ✅ ses équipes, saison en cours | ❌ | ❌ | ❌ |
| **Administrateur** | ✅ toutes | ✅ **toutes, toutes saisons** | ✅ | ✅ | ✅ |

### Entrées de matrice — `'section:write'`, `'team:write'`, `'role:assign-coach'`, toutes `['admin']`

```
'section:write': ['admin'],
'team:write': ['admin'],
'role:assign-coach': ['admin'],
```

**`'section:write'`/`'team:write'`** — deux actions, nommées sur le patron de `'news:write'` et `'season:write'`, chacune couvrant création et modification ensemble (aucun document ne distingue un rôle qui pourrait faire l'une sans l'autre).

**Pourquoi deux actions et non une seule.** Ce n'est pas de la symétrie décorative : les deux ressources n'ont pas la même population candidate à terme. Créer une **section** relève du paramétrage club-wide (Administrateur) ; créer une **équipe dans sa section** est précisément ce que PO-ST-05 pose comme question ouverte pour le Responsable de section. Une action unique rendrait cet élargissement impossible sans donner du même geste le droit de créer des sections — exactement l'effet de bord silencieux que `news:write` et `season:write` ont été créées pour éviter (`actions.ts`, commentaire de `news:write`).

**Pourquoi des entrées de matrice, et pas seulement de la RLS.** Critère commenté en tête de `rbac-matrix.ts` : `presentation/` doit décider de rendre ou non « + Section », « + Équipe », « + Coach » et les deux crayons **avant toute requête**. Même objection honnête que pour `news:write` et `season:write` — aujourd'hui la décision est constante, `backoffice:access` et cette population coïncidant exactement — et même position retenue, pour la même raison : PO-WE-01 est ouvert, et sans actions distinctes son élargissement donnerait silencieusement le droit de restructurer le club ou d'attribuer des rôles à des rôles dont personne ne l'a validé.

**`'role:assign-coach'` — nommage examiné à part, parce que le titulaire n'y prête à aucune discussion mais le nom si.** Le CDC est net : ligne de matrice « Gérer comptes, rôles, paramétrage » — ❌ pour les sept autres rôles, ✅ **Administrateur seul** ; `roles-personas` décrit l'Administrateur par « Paramétrage, comptes, **rôles**, saisons, sécurité et audit » et aucun autre rôle n'y attribue de rôle. `['admin']` n'est donc pas discutable. Le nommage l'est, et `CLAUDE.md` §7 (« ne pas ajouter d'entrées de matrice au-delà de ce que la spec demande ») en fait un choix structurant :

- **Écarté — `'user:write'` / `'role:assign'` générique.** C'est la lecture littérale du dialogue (« Assigner un rôle », sélecteur `RÔLE` libre), et c'est précisément pour cela qu'il faut l'écarter ici. Une action générique couvrirait l'attribution du rôle `admin` lui-même (élévation de privilège) ainsi que celle des six autres rôles, alors que cet écran n'offre qu'un point d'entrée « + Coach ». La créer ici reviendrait à construire la console « Utilisateurs » par une porte dérobée, sans que le module P0 « Authentification et profils » ait jamais été spécifié — scope creep à refuser explicitement.
- **Écarté — `'team:assign-coach'`.** Se lit bien mais désigne la **mauvaise ressource** : l'écriture ne touche pas `public.teams` (§2.9). La politique RLS vivrait sur `user_roles` alors que son nom d'action dirait `team`, cassant la lecture en miroir qu'impose `CLAUDE.md` §7 ; et un futur contributeur serait fondé à replier cette action dans `'team:write'` par voisinage de préfixe, donnant à quiconque peut créer une équipe le droit d'attribuer des rôles.
- **Retenu — `'role:assign-coach'`.** Le préfixe nomme la ressource réellement écrite (une affectation de rôle) ; le suffixe **borne l'action au seul rôle `coach`**, seule portée qu'un mécanisme RLS puisse vérifier littéralement (`role = 'coach'` dans le `with check`, AC-ST-33). Même discipline que `'news:write'`/`'season:write'` : une action **étroite** plutôt que repliée dans une voisine, pour qu'un élargissement futur reste une décision explicite. Écart assumé au patron `resource:verb` (`assign-coach` et non `assign`) : il porte tout le sens — `'role:assign'` serait l'action générique écartée ci-dessus.

**Aucun contrôle de portée n'est à ajouter dans `can.ts`**, pour les trois actions : `'admin'` est club-wide par construction (le `RoleAssignment` admin ne porte ni `teamId` ni `sectionId`), et la branche `default` du `switch` renvoie déjà `true`. Si PO-ST-05 élargit un jour `'team:write'` et/ou `'role:assign-coach'` à `'section-manager'`, **la branche `section-manager` de `can.ts` devra être étendue en même temps** — l'ajouter à la seule matrice laisserait un responsable de section créer une équipe ou affecter un coach dans **n'importe quelle** section (piège déjà rencontré sur `'convocation:create'`, cf. le commentaire de `rbac-matrix.ts`).

### Tableau par rôle — affectation d'un coach

| Rôle | Voit la colonne `COACH(S)` | Voit « + Coach » | Affecte un coach à une équipe |
|---|---|---|---|
| Joueur/Joueuse | ❌ — n'atteint pas `/admin/*`, et `user_roles_select_own`/`users_select_own` ne lui donnent que sa propre ligne | ❌ | ❌ |
| Coach/Staff | ❌ (idem) | ❌ | ❌ |
| Responsable de section | ❌ (idem, PO-WE-01) | ❌ | ❌ **dans cette passe** — voir la réserve `can.ts` ci-dessus |
| Dirigeant habilité | ❌ (idem) | ❌ | ❌ |
| Trésorier | ❌ | ❌ | ❌ |
| Référent médical | ❌ | ❌ | ❌ |
| Bénévole | ❌ | ❌ | ❌ |
| **Administrateur** | ✅ tous comptes, toutes équipes, toutes saisons | ✅ si `can(user, 'role:assign-coach')` | ✅ rôle `coach` uniquement |

### Comptes multi-rôles

**Pour `'section:write'`/`'team:write'` : sans effet.** Un compte `admin` + `coach` voit la console comme administrateur ; aucun rôle actif (`active-role-scope.ts`) n'intervient, la console ne dépendant que de la présence du rôle `admin`. PO-WE-06 reste ouvert et n'est pas traité ici.

**Pour `'role:assign-coach'` : un effet réel.** Affecter un coach **modifie le `RoleAssignment` d'un compte**, donc sa portée applicative : ses équipes visibles, son tableau de bord coach, son droit de créer une convocation (`can.ts`, branche `'coach'`, `assignment.teamIds.includes(context.teamId)`). Deux cas à traiter sciemment :

1. **Le compte affecté est celui qui opère** (admin + coach, cumul explicitement prévu par le CDC — « un utilisateur peut cumuler plusieurs rôles ») : son propre `User.roles` en cache devient périmé à la seconde où il valide. Son périmètre doit être relu, pas laissé tel quel jusqu'au prochain rechargement (AC-ST-46).
2. **Le compte affecté est un autre utilisateur** : rien n'est poussé vers sa session. Il découvrira son équipe à sa prochaine ouverture. Aucune notification n'est demandée par les maquettes et **aucune n'est inventée ici** — à signaler au Bureau si un avis est attendu, mais ce n'est pas un manque de cette spec.

## 4. Données sensibles

**Le tableau de la passe 1 devient faux à partir de cette passe et est remplacé par celui-ci.**

| Nature | Cette feature | Conséquence |
|---|---|---|
| **Données de santé** | Aucune | Aucun trigger d'audit d'accès, aucun filtre de colonne |
| **Données financières** | Aucune | — |
| **Données nominatives** | **Oui.** La colonne `COACH(S)` affiche le nom de personnes réelles sur deux tableaux ; la liste déroulante `UTILISATEUR` énumère des comptes du club ; la ligne écrite dans `user_roles` **désigne une personne** | Lecture réservée à l'administrateur par les politiques existantes (§2.11), **non relâchées**. **Pas d'export** : un affichage à l'écran n'est pas un « export nominatif » au sens du CDC §11.3, et aucun chemin d'export n'est ajouté (AC-ST-48) |
| **Changement de rôle** | **Oui** — affecter le rôle `coach` à un compte | **Exigence d'audit, voir ci-dessous** |
| **Donnée de référence structurante** | **Oui — sections et équipes pilotent la visibilité de presque tout le reste** | Voir ci-dessous |

`teams` ne contient aucune donnée personnelle **et pilote pourtant la visibilité de presque tout le reste** : `user_roles.team_id` (portée des rôles joueur et coach), `convocations.team_id`, et la politique `teams_select_team_scoped` elle-même. Trois conséquences concrètes :

1. **Modifier le `season_id` d'une équipe existante est une opération à effet de bord silencieux.** Déplacer une équipe vers une autre saison la fait **disparaître de la vue de ses propres membres** (`season_id = current_season()`), sans rien supprimer ni signaler : ses convocations deviennent inatteignables par leur écran habituel, et le tableau de bord de son coach se vide. La maquette ne pose aucune restriction sur ce champ à la modification — voir PO-ST-04.
2. **Modifier le `section_id` d'une équipe** change la section de rattachement dont dépendent les contrôles de portée du Responsable de section (`can.ts`, `'convocation:create'` / `'section:manage'`) : l'équipe change de « propriétaire » fonctionnel sans que personne n'en soit informé.
3. **Aucune de ces modifications n'est tracée aujourd'hui** (§2.1) : `teams` ne porte même pas de `created_at`.

**Journal d'audit — ce n'est plus une question ouverte, c'est une exigence.** La passe 1 pouvait raisonnablement laisser ouvert le traçage de la création/modification d'une section ou d'une équipe : absente du CDC §11.3. **Ce n'est plus le cas pour l'affectation d'un coach.** L'exigence transversale « non optionnelle » du CDC §11.3 énumère les actions à tracer et y inscrit littéralement le « **changement de rôle** ». Affecter le rôle `coach` à un compte sur une équipe **est** un changement de rôle. `roles-personas-as-caribbean.md` borne d'ailleurs l'Administrateur par « **actions sensibles journalisées** ». Donc, sans arbitrage à demander : **cette action doit être tracée**, et conformément à `CLAUDE.md` §6, elle relève du cas « action métier » — **journalisée depuis le use case dans `domain/`**, parce que l'intention (qui a décidé, pour quel compte, sur quelles équipes) n'existe pas au niveau SQL, **jamais depuis un composant**, et pas depuis un trigger (réservé aux **accès** en lecture : consultation santé, export nominatif).

**Le problème, et il est réel** : *rien* n'existe pour recevoir cette trace. Aucune table d'audit dans `supabase/migrations/` (vérifié : les deux seules occurrences du mot « audit » y sont des commentaires), aucun `AuditRepository`, aucun point d'appel dans un use case existant, et l'entrée de navigation « Journal d'audit » des maquettes est explicitement hors périmètre (PO-WA-09). Cette spec **ne conçoit pas la table d'audit** — schéma, granularité, rétention (`RETENTION-PURGE.md`) et surface de consultation sont une feature à part entière, et l'inventer ici serait le même scope creep que celui refusé en §3. Ce qu'elle pose en revanche : **l'affectation d'un coach ne doit pas partir en production sans trace**. Voir **PO-ST-14**, le seul point ouvert de cette passe qui bloque une mise en production (AC-ST-37).

Pour la création/modification de sections et d'équipes elles-mêmes, la question reste dans les mêmes termes qu'en passe 1 (absentes du CDC §11.3, mais rôle Administrateur borné par « actions sensibles journalisées », et effet de bord silencieux sur la visibilité d'autrui) — voir PO-ST-03, désormais **partiellement absorbée** par PO-ST-14 pour le volet mécanisme d'audit, sa sous-question propre (colonnes `created_at`/`created_by`/`updated_*` manquantes sur `teams`/`sections`, et sur `user_roles`) restant ouverte séparément.

**Rétention et purge.** Aucune. Une section, une équipe ou une affectation de coach passées sont des éléments d'historique référencés par `user_roles` et `convocations` ; rien dans `RETENTION_PURGE.md` ne prévoit de les effacer, et cette spec n'offre pas de suppression ni de retrait (§1).

**Nom de personne dans les maquettes.** Les exports affichent des noms et prénoms (barre supérieure, `Marc Boucher`, bloc « ALERTE »). `CLAUDE.md` §9 l'interdit partout, y compris en exemple ou en fixture — même règle qu'AC-WE-14, AC-WA-21 et AC-WS-19, reprise ici en AC-ST-20 : tout nom affiché à l'écran provient des données, jamais codé en dur.

## 5. Critères d'acceptation

Numérotation **`AC-ST-xx`**, préfixe à deux lettres par feature comme AC-WE, AC-WA, AC-WS, AC-AT, AC-CD, AC-PD, AC-PV. La série continue sur les deux passes : aucun numéro n'est réutilisé, aucun ne devient orphelin.

**Base de données et RLS — `sections`/`teams` (passe 1)**

- **AC-ST-01** — Une nouvelle migration ajoute exactement **quatre** politiques : `insert` et `update` administrateur sur `public.sections`, `insert` et `update` administrateur sur `public.teams`, toutes appuyées sur `private.is_admin()`. **Aucune politique `delete`, aucune politique `select` supplémentaire.**
- **AC-ST-02** — `sections_select_authenticated` et `teams_select_team_scoped` ne sont ni modifiées, ni supprimées, ni remplacées. En particulier, la branche `or private.is_admin()` de `teams_select_team_scoped` reste **non filtrée par saison** : avec un jeton administrateur, `select` sur `teams` renvoie les équipes de **toutes** les saisons (c'est ce qui permet la ligne `2024-2025` de la maquette).
- **AC-ST-03** — Avec un jeton **non administrateur**, tout `insert` et tout `update` sur `sections` et sur `teams` échoue. Testé pour au moins un `section-manager`, afin de vérifier qu'aucun élargissement par analogie avec `'section:manage'` n'a eu lieu (§3).
- **AC-ST-04** — Avec un jeton **joueur**, `select` sur `teams` continue de ne renvoyer que ses équipes de la saison en cours : la migration de cette passe ne relâche aucune portée de lecture (non-régression AC-CD-01).
- **AC-ST-05** — `teams.section_id` et `teams.season_id` passent `not null` dans la même migration, **après vérification qu'aucune ligne existante ne porte de `null`**. Si une telle ligne existe, la migration n'est pas appliquée en l'état : le cas est **signalé et non résolu silencieusement** (§2.2, PO-ST-01, même principe que `season-scoping-correction.md` §5.2).
- **AC-ST-06** — Le `check` sur `sections.type` est **inchangé** : ses quatre valeurs restent `football`, `esport`, `echecs`, `domino`, et aucune n'est ajoutée ni retirée (PO-ST-02).
- **AC-ST-07** — Chaque politique porte un commentaire SQL nommant l'action qu'elle miroite (`'section:write'` ou `'team:write'`), et les entrées de matrice renvoient aux politiques (miroir manuel, `CLAUDE.md` §7).
- **AC-ST-08** — Le comptage d'équipes par section ne s'appuie sur aucune fonction `security definer` contournant la RLS sans contrôle d'administrateur explicite (§2.3). Aucune colonne de comptage n'est ajoutée à `sections`.

**Domaine — `sections`/`teams` (passe 1)**

- **AC-ST-09** — `'section:write'` et `'team:write'` sont ajoutées à `domain/policies/actions.ts` et valent `['admin']` dans `rbac-matrix.ts`. **Aucune autre action, aucun autre rôle n'est ajouté** (`CLAUDE.md` §7) au-delà de celles de cette spec — en particulier `'section:manage'`, `'season:write'` et `'backoffice:access'` sont inchangées, et `can.ts` n'est pas modifié (§3).
- **AC-ST-10** — Une couverture Vitest de `can()` vérifie que `'section:write'`/`'team:write'` sont accordées à `admin` et **refusées à `section-manager`**, quel que soit le `sectionId` passé en contexte (`domain/policies` est la priorité de test n°1, `CLAUDE.md` §8).
- **AC-ST-11** — Les use cases de création refusent, **depuis le domaine** (`DomainError`, pas une validation de composant) et **avant tout appel réseau** : un `name` vide ou réduit à des espaces ; un `type` de section hors des quatre valeurs de `SectionType` ; une équipe sans `sectionId` ou sans `seasonId` (§2.2).
- **AC-ST-12** — `SectionRepository.findById()` / `findAll()` et `TeamRepository.findByIds()` / `findById()` / `countActiveMembers()` sont **inchangées** en signature et en comportement ; les interfaces gagnent la lecture administrative et `create(...)` / `update(...)`. **Aucun second repository** de sections ou d'équipes n'est créé (§2.7).
- **AC-ST-13** — La lecture administrative des équipes **n'applique pas** le filtre sur la saison courante, contrairement à `findByIds`/`findById` : elle renvoie les équipes de toutes les saisons, y compris quand `current_season()` ne renvoie rien (césure estivale — état valide, pas une erreur).
- **AC-ST-14** — `CreateSectionUseCase`, `UpdateSectionUseCase`, `CreateTeamUseCase` et `UpdateTeamUseCase` existent dans `domain/usecases/`, sans aucun import React, Supabase, TanStack Query ni `window`, et sans `useQuery`/`useMutation` à l'intérieur.
- **AC-ST-15** — Un mapper existe entre chaque DTO et l'entité correspondante, y compris pour les formes jointes (nom de section, libellé de saison, comptage), nommées `XxxRow` si elles correspondent à une table/vue et `XxxDto` sinon (`CLAUDE.md` §4).

**Écran `/admin/sections` — `sections`/`teams` (passe 1)**

- **AC-ST-16** — `/admin/sections` ne rend plus `BackofficeEmptyState` inconditionnellement : il rend les tableaux « Sections » (colonnes `NOM`, `TYPE`, `ÉQUIPES`, `COACH(S)`) et « Équipes » (colonnes `NOM`, `SECTION`, `SAISON`, `COACH(S)`), chacun avec son bouton de création et une action d'édition par ligne.
- **AC-ST-17** — Les colonnes `SECTION` et `SAISON` du tableau des équipes affichent le **nom** de la section et le **libellé** de la saison, jamais un identifiant technique.
- **AC-ST-18** — La colonne `ÉQUIPES` est un comptage **dérivé** des lignes `teams`, jamais lu depuis une colonne (§2.3), et le périmètre de comptage retenu est celui tranché par PO-ST-07.
- **AC-ST-19** — L'état de la saison d'une équipe est calculé par le **prédicat existant** de `domain/policies/season-scope.ts` (AC-WS-12), **sans le dupliquer ni le réécrire**, et supporte ses **trois** valeurs (terminée / en cours / à venir). Un éventuel traitement visuel n'est jamais porté par la couleur seule : toujours doublé d'un texte (CDC §12, reconduction d'AC-WS-29).
- **AC-ST-20** *(révisé, passe 2)* — « + Section » et le crayon des sections ne sont rendus que si `can(user, 'section:write')` ; « + Équipe » et le crayon des équipes que si `can(user, 'team:write')` ; **« + Coach » que si `can(user, 'role:assign-coach')`** — trois booléens calculés **séparément** par le ViewModel, et séparément du fait d'avoir atteint la route (§3). Aucun nom de personne n'est codé en dur, y compris ceux des maquettes (`Marc Boucher`, le nom de la barre supérieure, celui du bloc « ALERTE »), y compris en placeholder ou en fixture de test (`CLAUDE.md` §9) : **tout nom affiché provient des données**.
- **AC-ST-21** *(révisé, passe 2 — l'interdiction d'affectation est levée pour le seul coach, celle de suppression ne l'est pas)* — **Aucun contrôle de suppression ni d'archivage** n'est rendu, à aucun endroit de l'écran (ni ligne, ni dialogue, ni menu contextuel), pour une section comme pour une équipe — comportement voulu, pas un oubli (§1, PO-ST-06). **Aucun contrôle de retrait d'un coach** non plus (§1, PO-ST-13). L'**affectation d'un coach** est en revanche désormais **au périmètre** (« + Coach » + dialogue « Assigner un rôle »). Restent hors périmètre et ne doivent apparaître nulle part : l'inscription d'un **joueur**, l'affectation d'un **responsable de section**, d'un **dirigeant**, d'un **bénévole** ou de tout autre rôle, ainsi que toute colonne d'effectif ou liste de joueurs (§1, PO-ST-12).
- **AC-ST-22** — Après une création ou une modification réussie, **les deux tableaux** reflètent le changement sans rechargement manuel de la page — créer une équipe change aussi le comptage `ÉQUIPES` de sa section. L'invalidation passe par des clés centralisées dans `presentation/shared/query-keys.ts` (jamais en ligne), **distinctes** de `coachTeams` / `playerTeam` / `team` / `section` (§2.7).
- **AC-ST-23** — Les trois états sont couverts et distincts pour chaque tableau : chargement (jamais un flash de liste vide), erreur (message lisible en français issu d'une `DomainError` traduite, jamais un message brut Supabase), liste vide (état vide explicite — **cas normal au démarrage du club, jamais une erreur**). Un échec de création/modification laisse le dialogue ouvert **avec les saisies conservées**. Le dialogue « Créer une équipe » reste utilisable quand **aucune section** ou **aucune saison** n'existe encore : il l'indique explicitement plutôt que d'offrir deux listes déroulantes vides (voir PO-ST-11).
- **AC-ST-24** — Une modification enregistre sur la **même** ligne (pas de doublon), et le dialogue de modification est **pré-rempli** avec les valeurs de la ligne sélectionnée.

**Transverse et non-régression (passe 1)**

- **AC-ST-25** — `current_season()`, `isCurrentSeason`, le prédicat d'état d'AC-WS-12, `TeamRepositoryImpl.findById/findByIds` et leur filtre de saison, la politique `teams_select_team_scoped` d'AC-CD-01 et le scoping des équipes du tableau de bord coach sont **inchangés** en définition et en comportement. Vérifiable en régression.
- **AC-ST-26** *(révisé, passe 2)* — Créer ou modifier une **section** ou une **équipe** n'écrit **aucune** ligne `user_roles`, ne rattache aucune personne et ne duplique aucun effectif. Vérifiable : après une création ou une modification depuis cet écran, le compte des lignes `user_roles` est inchangé. **Seule** l'action explicite « Assigner » du dialogue écrit dans `user_roles`, et **uniquement** des lignes de rôle `coach` (AC-ST-33, AC-ST-40).
- **AC-ST-27** — Aucun écran mobile ne change de rendu, de route ou de comportement du fait de cette tranche (reconduction d'AC-WE-20 et d'AC-WS-26).
- **AC-ST-28** — La console est desktop-only : le garde de largeur existant (`RequireDesktopViewport` / `BackofficeDesktopOnlyPage`, AC-WE-18) s'applique inchangé, et aucun dossier `presentation/desktop/` ni `presentation/mobile/` n'est créé (AC-WE-19, `CLAUDE.md` §5).
- **AC-ST-29** — Un compte authentifié **sans** le rôle `admin` n'atteint pas `/admin/sections` (garde `backoffice:access`, AC-WE-09) ; et même s'il l'atteignait, AC-ST-03 et AC-ST-34 garantissent qu'il n'écrit rien — le front n'est pas la sécurité (`CLAUDE.md` §6).
- **AC-ST-30** — CDC §12 : les dialogues sont **entièrement utilisables au clavier** (tabulation, soumission, fermeture par `Échap`, focus piégé et restitué), et les contrastes du fond sombre sont **vérifiés** au niveau AA, pas supposés.
- **AC-ST-31** — Aucun appel Supabase depuis `presentation/`, aucun import de `data/` depuis `presentation/` : câblage par le conteneur DI (`CLAUDE.md` §3). Le ViewModel calcule, la Page ne fait que brancher des booléens.
- **AC-ST-32** — **Remplacé par AC-ST-48** (voir §4 : la feature devient nominative en passe 2, ce critère « aucune donnée nominative » n'est plus exact).

**Base de données et RLS — affectation de coach (passe 2)**

- **AC-ST-33** — Une migration ajoute **exactement une** politique d'écriture sur `public.user_roles` : `user_roles_insert_assign_coach`, `for insert to authenticated`, `with check (private.is_admin() and role = 'coach' and team_id is not null and section_id is null)`. C'est la **première** politique d'écriture jamais posée sur cette table. Le prédicat `role = 'coach'` n'est pas décoratif : il est le miroir SQL du **suffixe** de l'action `'role:assign-coach'` et la seule garantie qu'un jeton administrateur ne puisse pas s'attribuer, depuis le client, un rôle autre que `coach` (§3). **Aucune politique `update`, aucune politique `delete`** sur `user_roles`. Commentaire SQL nommant l'action miroitée (`CLAUDE.md` §7).
- **AC-ST-34** — Avec un jeton **non administrateur**, tout `insert` sur `user_roles` échoue. Testé pour au moins un `coach` (qui pourrait vouloir s'ajouter une équipe) et un `section-manager` (pour vérifier qu'aucun élargissement par analogie avec `'section:manage'` n'a eu lieu, même contrôle qu'AC-ST-03).
- **AC-ST-35** — `user_roles_select_own`, `users_select_own` et `teams_select_team_scoped` ne sont ni modifiées, ni remplacées, ni doublées d'une fonction `security definer` qui contournerait la RLS sur la jointure des coachs (même interdit qu'AC-ST-08). Non-régression testée : avec un jeton **joueur**, `select` sur `user_roles` ne renvoie que ses propres lignes et `select` sur `users` que son propre profil — le nom des autres membres n'est lisible nulle part de plus du fait de cette passe.
- **AC-ST-36** — Affecter un couple (compte, équipe) **déjà existant** ne produit ni doublon, ni erreur remontée à l'utilisateur : l'insertion est absorbée (`on conflict do nothing` sur `user_roles_team_scoped_idx`). Vérifiable : soumettre deux fois la même affectation laisse exactement une ligne et un écran en succès (§2.10).
- **AC-ST-37** — L'affectation est **journalisée** comme « changement de rôle » au sens du CDC §11.3, **depuis le use case dans `domain/`** et jamais depuis un composant ni un trigger (`CLAUDE.md` §6, §4). Aucune infrastructure d'audit n'existant aujourd'hui, ce critère est **bloquant pour la mise en production, non pour la construction** : tant que PO-ST-14 n'est pas tranché, la feature ne doit pas être livrée en production, et l'absence de trace doit être signalée, jamais contournée en silence.

**Domaine — affectation de coach (passe 2)**

- **AC-ST-38** — `'role:assign-coach'` est ajoutée à `domain/policies/actions.ts` et vaut `['admin']` dans `rbac-matrix.ts`. **Aucune action générique `'role:assign'` ou `'user:write'` n'est créée** (§3) ; `'section:write'`, `'team:write'`, `'section:manage'`, `'season:write'`, `'backoffice:access'` sont inchangées ; **`can.ts` n'est pas modifié**.
- **AC-ST-39** — Couverture Vitest de `can()` : l'action est accordée à `admin` et **refusée aux sept autres rôles**, quels que soient les `teamId`/`sectionId` passés en contexte — en particulier à `coach` (un coach ne s'auto-affecte pas) et à `section-manager` (`domain/policies` est la priorité de test n°1, `CLAUDE.md` §8).
- **AC-ST-40** — Un use case d'affectation existe dans `domain/usecases/` (`AssignCoachToTeamsUseCase` ou équivalent), fonction async pure — aucun import React / Supabase / TanStack Query, aucun `useQuery`/`useMutation` à l'intérieur. Il refuse **depuis le domaine** (`DomainError`, avant tout appel réseau) : un identifiant de compte absent ; une **liste d'équipes vide** (soumettre sans cocher). Il **n'écrit jamais** un `role` autre que `'coach'` ni un `section_id` non nul, quelle que soit la valeur reçue de la couche présentation.
- **AC-ST-41** — La lecture qui alimente les deux colonnes `COACH(S)` passe par un **mapper** entre le DTO et l'entité, y compris pour la forme jointe/agrégée — `XxxRow` si une vue la porte, `XxxDto` sinon (`CLAUDE.md` §4, reconduction d'AC-ST-15). **Aucun repository supplémentaire** de sections ou d'équipes n'est créé (reconduction d'AC-ST-12). Les clés de requête sont centralisées dans `presentation/shared/query-keys.ts`, **distinctes** de `coachTeams`/`playerTeam`/`team` (reconduction d'AC-ST-22 : la lecture administrative n'est pas filtrée par la saison courante, les clés mobiles le sont).

**Écran — affectation de coach (passe 2)**

- **AC-ST-42** — Le tableau des équipes porte une colonne `COACH(S)` affichant le **nom** du ou des comptes de rôle `coach` de cette équipe. Une équipe sans coach affiche un état **explicite et textuel**, jamais une cellule vide, et **jamais un signalement porté par la couleur seule** (CDC §12, reconduction d'AC-ST-19/AC-WS-29).
- **AC-ST-43** — Le tableau des sections porte une colonne `COACH(S)` affichant les coachs **distincts** des équipes de cette section (un coach de deux équipes d'une même section n'est compté et affiché qu'une fois). Le périmètre saisonnier de l'agrégation est celui tranché par PO-ST-07, **le même** que celui du comptage `ÉQUIPES` — les deux colonnes ne peuvent pas répondre à deux périmètres différents sur la même ligne.
- **AC-ST-44** — Les filtres des maquettes sont rendus et fonctionnels : type (tableau des sections) ; section, saison, **présence d'un coach** (tableau des équipes). Le filtre « sans coach » renvoie **exactement** les lignes dont la colonne `COACH(S)` est vide — même source de vérité que la colonne, jamais un second calcul.
- **AC-ST-45** — Le dialogue « Assigner un rôle » n'offre **que** le rôle `coach` dans cette passe (§1, PO-ST-12) ; il n'offre **en aucun cas** le rôle `admin`. Sa liste d'équipes est à **sélection multiple** (un coach peut être affecté à plusieurs équipes, §2.8). Il est ouvert depuis le « + Coach » d'une ligne, et l'équipe de cette ligne est la cible par défaut.
- **AC-ST-46** — Après une affectation réussie, **les deux tableaux** reflètent le changement sans rechargement manuel (la colonne `COACH(S)` de l'équipe **et** celle de sa section), par invalidation de clés centralisées. Cas à ne pas manquer : si le compte affecté est **celui qui opère** (cumul admin + coach), son propre `User.roles` est relu plutôt que laissé périmé — sans quoi son périmètre coach affiché reste faux jusqu'au prochain rechargement (§3).
- **AC-ST-47** — Les trois états du dialogue suivent le patron déjà établi (reconduction d'AC-ST-23) : soumission en cours (champs et boutons désactivés) ; échec (le dialogue **reste ouvert**, les saisies et les cases cochées sont **conservées**, message français issu d'une `DomainError`, jamais un message brut Supabase) ; succès (fermeture + rafraîchissement). Le dialogue est entièrement utilisable au clavier, y compris la liste de cases à cocher (reconduction d'AC-ST-30).
- **AC-ST-48** — Cette feature ne lit ni n'écrit aucune donnée de **santé** ni **financière**. Elle affiche en revanche des données **nominatives** (§4) : aucun chemin d'**export** (CSV, PDF, presse-papiers, impression) n'est ajouté, et aucune lecture nominative n'est ouverte à un rôle non administrateur (AC-ST-35). **Remplace AC-ST-32**, devenue inexacte sur le volet nominatif.

## 6. Points ouverts

| Réf. | Question | Pour qui | Bloquant ? |
|---|---|---|---|
| **PO-ST-01** | **Lignes `teams` existantes à `section_id` ou `season_id` nuls.** La pose du `not null` (AC-ST-05) échouera s'il en existe. Combien y en a-t-il, et que valent-elles (données de test à supprimer, ou vraies équipes à rattacher) ? **À vérifier avant d'écrire la migration**, pas pendant | Développeuse | **Non pour la spec** — **oui pour appliquer la migration** |
| **PO-ST-02** | **Les quatre sports suffisent-ils ?** `sections.type` est contraint à `football` / `esport` / `echecs` / `domino`. Un administrateur qui voudrait créer une section d'un autre sport ne le peut pas : il faut une migration **et** une modification du type domaine. Un club « multisport » a-t-il vocation à rester à ces quatre disciplines ? Et quels **libellés français** afficher dans la colonne `TYPE` et dans la liste déroulante (« E-sport », « Échecs », « Domino » — aucun n'existe aujourd'hui dans le code) ? | Bureau / développeuse | Non |
| **PO-ST-03** | **Faut-il journaliser la création et la modification d'une section et d'une équipe ?** Absente du CDC §11.3, mais le rôle Administrateur est borné par « actions sensibles journalisées », et déplacer une équipe de saison ou de section modifie silencieusement la visibilité et le périmètre de rôles d'autrui (§4). *Amendé passe 2 :* le volet « faut-il un mécanisme d'audit et où vit-il » est **absorbé par PO-ST-14**, qui répond oui pour l'affectation de coach (CDC §11.3 explicite). Sous-question propre restant ouverte : faut-il ajouter `created_at`/`created_by`/`updated_at`/`updated_by` à `teams` (qui n'a **aucune** colonne de traçabilité) et `created_by`/`updated_*` à `sections` — et `user_roles`, qui n'en porte pas non plus, ce que PO-ST-14 doit couvrir pour l'affectation elle-même ? | Référent RGPD / Bureau | Non pour construire — **à trancher avant mise en production** |
| **PO-ST-04** | **Que contient le dialogue de modification, et que peut-on y changer ?** Aucune maquette ne l'illustre (§0). Trois sous-questions : (a) le `section_id` et le `season_id` d'une équipe sont-ils modifiables après création, sachant qu'en changer rend l'équipe invisible à ses membres ou la fait changer de responsable (§4) ? (b) le `type` d'une section est-il modifiable une fois qu'elle porte des équipes ? (c) une équipe d'une **saison terminée** reste-t-elle modifiable — la maquette affiche le crayon sur la ligne `2024-2025`, et **aucune règle du type « saison terminée non modifiable » n'est étendue ici par analogie** (§2.6) | Développeuse / Bureau | Non pour construire — **oui pour figer le dialogue de modification** |
| **PO-ST-05** | **Qui rattache les personnes aux équipes, et quand ?** *Amendé passe 2 :* **partiellement refermé**. Le rattachement des **coachs** reçoit une première réponse : l'Administrateur, depuis cet écran (§3, §D). Restent ouverts : (a) l'élargissement de `'team:write'` **et** de `'role:assign-coach'` au Responsable de section pour sa seule section (le CDC le décrit pilotant « les effectifs de sa section ») ; (b) le rattachement des **joueurs**, non couvert par aucun écran ; (c) le retrait d'un rôle (PO-ST-13) ; (d) le **rollover complet** — créer les équipes de la saison N+1 et y affecter les coachs ne réaffecte toujours aucun joueur, donc **PO-WS-05 n'est toujours pas refermé** | Bureau / développeuse | **Non pour cette tranche** — mais à traiter **avant** la première bascule de saison réelle en production |
| **PO-ST-06** | **Aucune suppression.** Décision durable (une section et une équipe ne se suppriment jamais, c'est de l'historique référencé par `user_roles`, `convocations`, `teams.section_id`) ou report ? Que fait-on d'une section ou d'une équipe créée par erreur — avec un nom faux, ou rattachée à la mauvaise saison ? Aujourd'hui le seul recours prévu est la modification | Bureau / développeuse | Non |
| **PO-ST-07** | **Périmètre du comptage `ÉQUIPES` et de l'agrégation `COACH(S)` des sections.** *Amendé passe 2 :* toutes saisons confondues (seule lecture cohérente avec les chiffres de la maquette, §2.3 : `Senior masculin` = 3 alors que 2 seulement sont en `2025-2026` — **reconfirmé** par la maquette passe 2 sans plus de précision) ou équipes de la saison en cours (plus utile au pilotage, mais contredit l'export) ? La colonne `COACH(S)` des sections pose **exactement la même question** et doit recevoir **la même réponse** (AC-ST-43) : un coach de la saison passée doit-il apparaître sur la ligne de section ? Un comptage et une liste de coachs « toutes saisons » croîtront indéfiniment année après année et cesseront vite de vouloir dire quelque chose | Développeuse / Bureau | Non |
| **PO-ST-08** | **Rendu de la colonne `SAISON`.** La maquette distingue `2025-2026` (vert) de `2024-2025` (gris) sans libellé textuel. Faut-il un libellé d'état explicite (contrainte AC-ST-19 : jamais la couleur seule), et quel traitement pour une saison **à venir**, absente de la maquette alors qu'elle est le cas normal d'une préparation de saison (§2.4) ? **Déjà résolu par réutilisation** de `SeasonStatusBadge`/du prédicat à trois états de `web-seasons` (AC-WS-12) — non rouvert par la passe 2 | Designer / développeuse | Non pour construire — déjà tranché pour figer l'écran |
| **PO-ST-09** | *Amendé passe 2 :* Ligne `section-and-teams` à recopier dans `docs/designs/DESIGN_LINKS.md` §2 (statut `instantané seul`) — la ligne pré-rédigée en passe 1 pointait vers des instantanés désormais périmés pour la mise en page ; ligne de **remplacement** pré-rédigée au §0 de cette spec, à recopier telle quelle. **Aucun lien artifact à demander**, le statut `instantané seul` de la ligne existante l'interdit explicitement (§4 du registre) | Développeuse / premier agent ayant les droits sur `docs/` | Non |
| **PO-ST-10** | **Unicité des noms.** Aucune contrainte n'empêche deux sections homonymes, ni deux équipes homonymes dans la même section et la même saison — indiscernables ensuite partout dans l'application (§2.5). Faut-il une contrainte d'unicité, et sur quelles colonnes exactement ? **Non tranché ni inventé ici** | Développeuse / Bureau | Non |
| **PO-ST-11** | **Ordre d'affichage, pagination, et amorçage.** *Amendé passe 2 :* les **filtres existent désormais** et entrent au périmètre (AC-ST-44) — le « aucun filtre, aucun tri, aucune pagination » de la passe 1 ne vaut plus que pour le **tri** et la **pagination**, toujours indéterminés. Le cas d'amorçage (aucune section, aucune saison) reste ouvert et gagne un troisième volet : au premier usage, **aucun compte ne porte encore le rôle `coach`** — la liste `UTILISATEUR` du dialogue peut donc être vide, état à rendre intelligible plutôt qu'à laisser muet (même traitement qu'AC-ST-23 pour les listes `SECTION`/`SAISON` vides) | Développeuse | Non |
| **PO-ST-12** | **Que contiennent exactement les listes déroulantes `RÔLE` et `UTILISATEUR` du dialogue « Assigner un rôle » ?** Les deux sont sur « Choisir… » dans l'export, donc invisibles. (a) `RÔLE` : le dialogue s'intitule « Assigner un rôle » et porte un sélecteur de rôle, ce qui suggère un outil générique ; mais le point d'entrée est « + Coach », la mention explicative parle de coach, et une liste d'équipes à cases multiples n'a de sens que pour un coach. **Position retenue ici : `coach` seul** (§1, AC-ST-45). Si la réponse est « n'importe quel rôle », ce dialogue appartient à la console « Utilisateurs », pas à celle-ci, et l'action RBAC change (§3). (b) `UTILISATEUR` : tous les comptes du club ? seulement ceux ayant accepté la charte (`charterAcceptedAt`, CDC §3.1) ? seulement les comptes actifs ? | Développeuse / Bureau | **Non pour la conception** (position retenue explicite) — **oui pour figer le dialogue** |
| **PO-ST-13** | **Décocher une équipe déjà cochée retire-t-il l'affectation ?** Aucun contrôle de retrait n'est visible dans les exports, mais le dialogue s'ouvre avec une case **déjà cochée** : deux lectures possibles. (a) La liste désigne les équipes **à ajouter**, pré-cochée sur la ligne d'où l'on vient — « Assigner » n'insère que, ne retire rien (**position retenue**, cohérente avec l'absence de tout contrôle de retrait, §1/AC-ST-21). (b) La liste reflète l'**état complet** des équipes du coach — « Assigner » serait alors un remplacement, et décocher = retirer une affectation. La lecture (b) fait exister un chemin de `delete` sur `user_roles`, donc une politique RLS, un use case, et un **second** « changement de rôle » à journaliser (CDC §11.3, §4) — ce n'est pas un détail d'ergonomie. **Ne pas trancher en écrivant le composant** | Développeuse / Bureau | **Non pour la conception** — **oui avant d'implémenter le dialogue** |
| **PO-ST-14** | **Où va la trace du changement de rôle ?** Le CDC §11.3 impose de tracer les changements de rôle ; affecter un coach en est un ; `roles-personas` borne l'Administrateur par « actions sensibles journalisées ». **L'exigence n'est pas ouverte — le mécanisme l'est** : aucune table d'audit, aucun `AuditRepository`, aucun point d'appel n'existe dans le dépôt, et l'entrée de navigation « Journal d'audit » des maquettes est hors périmètre (PO-WA-09). Trois sous-questions : cette feature construit-elle le socle d'audit (schéma, écriture depuis le use case, rétention selon `RETENTION-PURGE.md`), ou attend-elle une spec d'audit dédiée ? Si elle attend, l'affectation de coach peut-elle être livrée **sans trace** en attendant — la réponse honnête est non pour la production ? Quelle granularité : une entrée par affectation, ou une par soumission multi-équipes ? **Englobe et dépasse PO-ST-03** | Référent RGPD / Bureau / développeuse | **Non pour construire l'écran** — **oui pour la mise en production** (AC-ST-37) |
| **PO-ST-15** | **Plusieurs coachs sur une même équipe : rendu et plafond.** Le many-to-many est établi (§2.8), mais **aucune ligne de maquette ne montre deux noms dans une cellule** `COACH(S)` : liste séparée par des virgules, empilement, troncature avec « +N », avatars ? Question connexe pour le Bureau : y a-t-il une règle du club plafonnant le nombre de coachs par équipe, ou distinguant un coach principal d'un adjoint ? Rien dans le CDC ne le dit, et **aucune hiérarchie entre coachs n'est inventée ici** (`user_roles` n'a pas de colonne pour la porter) | Designer / Bureau | Non |
| **PO-ST-16** | **Affecter un coach à une équipe d'une saison passée ou à venir.** Le bouton « + Coach » et la liste de cases à cocher du dialogue incluent **la ligne `2024-2025`**. Deux effets opposés : sur une saison **passée**, l'affectation crée un rôle que `teams_select_team_scoped` rend invisible à son propre titulaire (filtre `season_id = current_season()`) — utile pour reconstituer un historique, déroutant sinon ; sur une saison **à venir**, c'est au contraire le geste qui **préparerait le rollover** et commencerait à refermer PO-WS-05/PO-ST-05. Faut-il autoriser, restreindre, ou seulement avertir ? Aucune règle temporelle n'est posée ici par analogie avec `seasons_update_admin` (même position qu'au §2.6) | Bureau / développeuse | Non |

### Sur la surface desktop — question posée au cadrage, déjà tranchée ailleurs

Les maquettes vivent sous `docs/designs/desktop/` et portent « Web » dans leur nom, alors que `CLAUDE.md` §1 décrit une application **mobile-only**. **Ce n'est pas un point ouvert propre à cette feature**, et il n'en ouvre pas un nouveau : la tension a déjà été instruite comme **PO-WE-03** (`specs/web-empty-state.md` §5) — l'interdiction de `CLAUDE.md` §5 vise un **dossier à symétrie vide** (`presentation/desktop/` + `presentation/mobile/`), pas l'existence d'écrans desktop, et `ARCHITECTURE.md` §10 prévoit la bascule desktop au seul niveau du rendu. La décision est **déjà appliquée dans le code** (backoffice `/admin/*`, `RequireDesktopViewport`, aucun dossier `presentation/desktop/`), `web-actus` et `web-seasons` s'y sont inscrites sans la rouvrir, et cette feature la reconduit sans la modifier (AC-ST-28), sur une destination de navigation qui **existe déjà**.

Ce qui reste, et qui n'appartient ni à cette spec ni à `web-empty-state`, c'est une question de **gouvernance produit** : le Bureau valide-t-il qu'une partie du paramétrage club (dont la structure sections/équipes/coachs, P0) ne soit accessible que depuis un ordinateur ? Elle ne bloque rien ici.

## 7. Note pour designer-agent

- **Maquettes de référence, passe 2** : les **trois** exports de `docs/designs/desktop/section-and-teams/v1/`. **Maquettes passe 1**, périmées pour la mise en page mais à conserver : `docs/designs/desktop/section-and-teams/[Admin] Web - Section and team - {1,2}.png` restent la **seule** référence visuelle des deux dialogues de création « Créer une section »/« Créer une équipe », qu'aucun export `v1/` ne rejoue — à lire pour ces deux dialogues uniquement. Le dialogue de **modification** n'est illustré nulle part (PO-ST-04).
- Patrons déjà construits dans le même backoffice, à réutiliser plutôt qu'à dédoubler : `presentation/features/backoffice/seasons/components/{SeasonFormDialog,SeasonTable,SeasonStatusBadge,SeasonTableSkeleton}.tsx` et leurs équivalents `news/`. La section « UI design » actuelle de cette spec (ci-dessous) décrit une mise en page à **deux panneaux côte à côte** — **périmée**, à refaire par designer-agent pour des onglets ou deux écrans distincts avec filtres (§1 « Note de cadrage »). Ce qui y reste valable et n'a pas à être redécidé : la réutilisation de `SeasonStatusBadge` et du prédicat d'état à trois valeurs pour la colonne `SAISON` (PO-ST-08), les cibles tactiles `h-11` au site d'appel, l'interdiction de la couleur seule, la mention en italique du dialogue « Créer une équipe » qui est une règle métier et non une décoration, et le fait que la colonne `ÉQUIPES` est dérivée.
- Point de routage à trancher au passage (§1 « Note de cadrage ») : onglets sur `/admin/sections`, ou **deux destinations distinctes** comme la navigation latérale de `Assign-coach` le montre (« Sections » et « Équipes » séparées, 8 entrées au total) ? La seconde implique une modification de `backoffice-nav.ts`. Rien dans ce document ne dépend de ce choix.
- Contraintes issues de cette passe, à ne pas contredire : « + Coach » est rendu **sur toutes les lignes d'équipe, y compris celles qui ont déjà un coach** (AC-ST-45, §2.8) ; une équipe sans coach a un état **textuel** explicite, pas seulement un tiret ni une couleur (AC-ST-42) ; **aucun contrôle de retrait** d'un coach ne doit apparaître, même désactivé, tant que PO-ST-13 n'est pas tranché ; aucun contrôle de suppression ou d'archivage, à aucun endroit (AC-ST-21) ; aucun contrôle d'affectation d'un rôle **autre que coach** — pas de joueur, pas de responsable de section (AC-ST-21, PO-ST-12).
- Deux points ouverts touchent directement la conception et **ne doivent pas être refermés en silence en dessinant** : **PO-ST-15** (rendu d'une cellule à plusieurs coachs — aucune maquette n'en montre) et **PO-ST-12** (contenu des deux listes déroulantes du dialogue « Assigner un rôle » — la position retenue pour `RÔLE` est `coach` seul).
- Cibles tactiles `h-11` au site d'appel pour toutes les listes déroulantes et saisies texte (`CLAUDE.md` §6), y compris sur desktop. Si deux champs sont un jour posés côte à côte, `min-w-0` sur chaque élément de grille est obligatoire.
- Le cas d'amorçage n'est pas un cas limite : **au premier usage, les listes sont vides et aucune saison n'existe peut-être encore**, et **aucun compte ne porte encore le rôle `coach`** (PO-ST-11 amendé). Les dialogues doivent rester intelligibles dans cet état (AC-ST-23) plutôt que d'offrir des listes déroulantes « Choisir… » sans option.
- Les mentions en italique des dialogues « Créer une équipe » et « Assigner un rôle » **sont des règles métier, pas des décorations** (§2.2, §1) : les conserver, telles quelles ou reformulées, et ne pas les supprimer au motif qu'elles alourdissent le formulaire.
- Aucun nom de personne des maquettes ne doit être repris (`Marc Boucher`, le nom de la barre supérieure, celui du bloc « ALERTE » — AC-ST-20), aucun compteur de navigation, badge numérique ou bloc « ALERTE » ne doit être introduit (reconduction d'AC-WE-13). La **8ᵉ entrée de navigation « Journal d'audit »** visible dans `Assign-coach` est hors périmètre (PO-WA-09) : ne pas l'ajouter à `backoffice-nav.ts`.

## UI design

> **Statut : à jour (passe 2).** Remplace intégralement la section précédente (mise en page passe 1 à deux panneaux côte à côte, aucune colonne/dialogue coach — périmée). Basée sur les trois exports `docs/designs/desktop/section-and-teams/v1/` (lus directement) et sur les deux exports passe 1 pour les seuls dialogues de création.

### Sources utilisées, par ordre de priorité effectif

1. **`docs/designs/DESIGN_LINKS.md` §2** — ligne `section-and-teams`, statut **`instantané seul`**, aucun lien artifact à demander (§0/§4 du registre).
2. **`docs/designs/desktop/section-and-teams/v1/[Admin] Web - {Section - 1, Team - 1, Assign-coach}.png`** — lus directement. `Section - 1` = liste des sections seule ; `Team - 1` = liste des équipes seule ; `Assign-coach` = liste des équipes en pleine page (coquille backoffice visible, navigation latérale à l'appui du choix de routage ci-dessous) recouverte par le dialogue « Assigner un rôle ».
3. **`docs/designs/desktop/section-and-teams/[Admin] Web - Section and team - {1,2}.png`** (passe 1) — toujours et uniquement la référence visuelle des dialogues « Créer une section »/« Créer une équipe », qu'aucun export `v1/` ne rejoue (§0, §7).
4. **`presentation/features/backoffice/seasons/components/{SeasonTable,SeasonFormDialog,SeasonStatusBadge,SeasonTableSkeleton}.tsx`**, **`presentation/features/backoffice/news/components/NewsFormDialog.tsx`** et les deux pages `BackofficeSeasonsPage.tsx`/`BackofficeNewsPage.tsx` — patrons de page, de tableau et de dialogue déjà construits et en production dans ce même backoffice, lus intégralement pour cette passe.
5. **`presentation/features/backoffice/components/BackofficeEmptyState.tsx`** et **`backoffice-nav.ts`** — composant d'état vide déjà générique (icône + titre + description optionnelle), registre des entrées de navigation à modifier (voir décision de routage).
6. `wireframes-basiques-as-caribbean.md` — non consultée comme référence de mise en page (écran desktop à tableaux de données, sans équivalent visuel côté mobile ; les 4 destinations de nav mobile fixes qu'il documente ne s'appliquent pas au backoffice, qui a sa propre navigation latérale déjà établie par `web-empty-state`/`web-actus`/`web-seasons`). Principe conceptuel repris : une carte/un contrôle **disparaît**, il n'apparaît pas désactivé.
7. `specs/section-and-teams.md` §3 (RBAC), §5 (critères d'acceptation) et §7 (note pour designer-agent) — autoritaires sur ce qui doit apparaître ou non.

### Décision de routage — deux destinations, pas des onglets

**Choix retenu : scinder l'entrée `sections` de `backoffice-nav.ts` en deux destinations distinctes**, `/admin/sections` (« Sections ») et `/admin/teams` (« Équipes »), plutôt que des onglets sur une même page. Justification :

- la maquette `Assign-coach` est la seule des trois à montrer la coquille complète, et elle rend explicitement **deux entrées de navigation latérale séparées** (« Sections » et « Équipes », cette dernière sélectionnée) — pas un strip d'onglets au-dessus d'un tableau. Suivre la maquette littéralement plutôt que réinterpréter ;
- aucun écran de ce backoffice n'utilise `tabs.tsx` à ce jour (Saisons, Actus, Utilisateurs, Adhésions sont tous des pages mono-ressource) — introduire des onglets ici créerait une deuxième convention de navigation dans le même backoffice sans que la maquette l'exige, alors que la scission en deux entrées **prolonge** la convention déjà en place (une entrée de nav = une ressource = une page) ;
- `tabs.tsx` est déjà vendu (`ls src/presentation/shared/components/ui/` le confirme) mais n'est mobilisé nulle part ailleurs dans ce dépôt — son absence d'usage réel est un signal supplémentaire pour ne pas l'introduire sans une raison propre à cette feature.

**Conséquence sur `backoffice-nav.ts`** (§1 « Note de cadrage » l'annonçait, tranché ici) :

- `BackofficeNavItemId` gagne `'teams'` à côté de `'sections'` ;
- l'entrée existante `id: 'sections'` est **conservée mais son libellé change** : `label: 'Sections'` (au lieu de « Sections & Équipes »), `emptyStateTitle: 'Aucune section à afficher pour l'instant'` (au lieu de « Aucune section ni équipe... ») ;
- une **nouvelle** entrée est ajoutée juste après : `{ id: 'teams', label: 'Équipes', path: '/admin/teams', icon: IconShirtSport, emptyStateTitle: 'Aucune équipe à afficher pour l'instant' }`. `IconShirtSport` existe dans `@tabler/icons-react` (vérifié dans `node_modules`) et se distingue de `IconUsersGroup` (déjà pris par `sections`) et de `IconUsers` (déjà pris par `users`) ;
- `router.tsx` gagne `{ path: 'teams', element: <BackofficeTeamsPage /> }` à côté de `{ path: 'sections', element: <BackofficeSectionsPage /> }`, tous deux enfants du même `BackofficeDashboardLayout` — aucun autre changement de garde (`RequireBackofficeAccess`, `RequireDesktopViewport` restent au-dessus des deux, inchangés) ;
- `BackofficeSectionsPage.tsx` (le stub actuel) est réécrit pour ne plus rendre que le tableau **Sections** ; `BackofficeTeamsPage.tsx` est un **nouveau** fichier, structurellement jumeau, qui rend le tableau **Équipes**.
- La **8ᵉ entrée « Journal d'audit »** visible dans `Assign-coach` **n'est pas ajoutée** (PO-WA-09) — la scission en deux entrées ne porte la liste à 7, pas 8.

Rien dans ce choix ne change le périmètre, le RBAC ni les critères d'acceptation de cette spec (§1 le confirmait déjà) : les deux pages partagent exactement les mêmes ViewModels/use cases que ceux déjà prévus, seule leur destination de rendu diffère d'un simple onglet.

### Où ça vivent

Deux entrées de la navigation latérale du backoffice, adjacentes : **« Sections »** (`/admin/sections`, `IconUsersGroup`) et **« Équipes »** (`/admin/teams`, `IconShirtSport`, nouvelle). `BackofficeDashboardLayout` continue d'envelopper les deux pages sans changement (barre supérieure sticky, navigation latérale, en-tête générique). Cette passe **remplace** `BackofficeSectionsPage.tsx` (qui rend aujourd'hui `BackofficeEmptyState` inconditionnellement) et **crée** `BackofficeTeamsPage.tsx` — répondant à PO-WE-10 pour les deux entrées.

### Ce qui change par rôle

Reprend tel quel le RBAC déjà écrit en §3 — trois booléens distincts calculés par les ViewModels, jamais collapsés en un seul :

| Élément d'écran | Booléen ViewModel | Action `can()` |
|---|---|---|
| Bouton « + Section », crayon d'édition sur une ligne de section | `canWriteSections` | `'section:write'` |
| Bouton « + Équipe », crayon d'édition sur une ligne d'équipe | `canWriteTeams` | `'team:write'` |
| Bouton « + Coach » sur une ligne d'équipe | `canAssignCoach` | `'role:assign-coach'` |

Pour les sept rôles non-administrateur, `/admin/*` n'est de toute façon pas atteint (`backoffice:access`, AC-ST-29) : ces deux pages n'ont donc qu'un seul état de rendu observable en pratique aujourd'hui (administrateur, les trois booléens à `true`) — mais les trois contrôles restent **calculés et rendus séparément**, pas fusionnés en un seul `canManageStructure`, pour que l'élargissement futur d'une seule action (PO-ST-05) n'active pas silencieusement les deux autres. Aucune carte/bouton n'apparaît grisé : un booléen à `false` fait disparaître le contrôle (reconduction du principe déjà appliqué à `SeasonTable`/`NewsTable`).

### Écran « Sections » (`/admin/sections`)

Reprend le squelette exact de `BackofficeSeasonsPage.tsx`/`BackofficeNewsPage.tsx` (`flex flex-1 flex-col gap-6`) :

1. **En-tête** : `<h2>Sections</h2>` (`text-xl font-bold`) + bouton **« + Section »** (`Button h-11 rounded-full bg-coach-green`, icône `IconPlus`), rendu seulement si `canWriteSections`.
2. **Filtre** : un seul `Select` (`SelectTrigger h-11 rounded-xl`), placeholder « Tous les types », options = les quatre valeurs fixes de `SectionType` + l'option « Tous les types » par défaut (aucune option supplémentaire, PO-ST-02 — le `check` en base n'en compte que quatre). Libellés français : seul « Football » est confirmé par la maquette ; « E-sport », « Échecs », « Domino » sont des propositions à valider (PO-ST-02, non bloquant pour construire l'écran, `esport`/`echecs`/`domino` en interne restent les valeurs `check`).
3. **Tableau `SectionTable`** — colonnes `NOM`, `TYPE`, `ÉQUIPES`, `COACH(S)`, puis une colonne d'actions (crayon seul, rendu si `canWriteSections`, patron `SeasonTable` identique : `Button variant="ghost" size="icon" className="h-11 w-11 rounded-full"`). **Aucun bouton « + Coach » sur cet écran** (AC-ST-45 — l'affectation part toujours d'une ligne d'équipe, jamais d'une ligne de section, même si une section n'a« aucune » équipe et donc aucune ligne où cliquer).
4. **`ÉQUIPES`** — comptage dérivé (déjà spécifié §2.3/AC-ST-18), texte simple, jamais un badge ni une couleur.
5. **`COACH(S)`** — nouveau composant `CoachListCell` (détaillé ci-dessous), alimenté par les coachs **distincts** des équipes de la section (AC-ST-43).
6. **Trois états**, identiques au patron `SeasonTable`/`NewsTable` : chargement → `SectionTableSkeleton` (nouveau, jumeau de `SeasonTableSkeleton`) ; erreur → `Alert variant="destructive"` avec message français ; liste vide → `BackofficeEmptyState` (réutilisé tel quel, `icon`/`emptyStateTitle` de l'entrée `sections`).
7. **État « résultat de filtre vide »**, distinct de l'état vide ci-dessus et **non couvert par un AC explicite mais nécessaire dès que le filtre existe** (AC-ST-44) : si `rows.length === 0` **et** un filtre est actif (type ≠ « Tous les types »), ne pas afficher le même `BackofficeEmptyState` qu'au démarrage du club (qui suggérerait à tort qu'aucune section n'existe) — réutiliser le **même composant** avec un `title`/`description` différents (« Aucune section ne correspond à ce filtre » / description invitant à réinitialiser), en s'appuyant sur son prop `description` déjà prévu et jamais utilisé jusqu'ici. Pas un nouveau composant : une variante d'appel du composant existant.

### Écran « Équipes » (`/admin/teams`)

Même squelette :

1. **En-tête** : `<h2>Équipes</h2>` + bouton **« + Équipe »** (même style que « + Section »), rendu si `canWriteTeams`.
2. **Trois filtres côte à côte** : `SECTION` (« Toutes les sections »), `SAISON` (« Toutes les saisons »), présence de coach (« Avec ou sans coach », trois options : « Tous » par défaut / « Avec coach » / « Sans coach » — AC-ST-44 : ce filtre doit répondre **exactement** à la même source que la colonne `COACH(S)`, jamais un second calcul). Rendu en `flex flex-wrap gap-3`, chaque `Select` en `min-w-[200px] flex-1 min-w-0` — **trois champs côte à côte, `min-w-0` obligatoire sur chacun** (`CLAUDE.md` §6) même si la console est desktop-only (`RequireDesktopViewport`) : la fenêtre peut être redimensionnée jusqu'au plancher desktop autorisé, et trois `SelectTrigger` sans `min-w-0` se chevaucheraient au même titre qu'une paire Date/Heure mobile. `h-11` sur les trois déclencheurs.
3. **Tableau `TeamTable`** — colonnes `NOM`, `SECTION`, `SAISON`, `COACH(S)`, puis **deux** actions par ligne : bouton **« + Coach »** (`variant="outline" h-11 rounded-full`, texte seul, pas d'icône — fidèle à la maquette, qui ne montre pas de glyphe sur ce bouton contrairement à « + Section »/« + Équipe ») rendu si `canAssignCoach`, **sur toutes les lignes sans exception, y compris celles qui affichent déjà un coach** (AC-ST-45, §2.8 — ne jamais conditionner ce bouton à l'absence de coach) ; puis le crayon d'édition, rendu si `canWriteTeams`.
4. **`SECTION`** — nom de la section (texte simple, jamais un identifiant, AC-ST-17).
5. **`SAISON`** — réutilise **`SeasonStatusBadge`** et le prédicat à trois états déjà écrit (PO-ST-08, déjà résolu, non rouvert) : la cellule rend `{season.label}` en texte, suivi du badge `SeasonStatusBadge status={status}` — pas une nouvelle teinte de texte réinventée à partir de la couleur vert/gris de la maquette. Ce composant porte déjà son propre texte à côté de la couleur (AC-WS-29/AC-ST-19 : jamais la couleur seule), donc rien à ajouter pour se conformer à cette règle ici ; il gère aussi nativement le troisième état « à venir », absent de la maquette mais requis (§2.4).
6. **`COACH(S)`** — même composant `CoachListCell` que sur l'écran Sections, alimenté cette fois par les coachs de **cette seule** équipe (AC-ST-42).
7. **Trois états** (chargement/erreur/vide) identiques au patron ci-dessus, plus le même état « résultat de filtre vide » que pour Sections — ici avec trois filtres pouvant être actifs simultanément, le test de « filtre actif » est `section !== 'all' || saison !== 'all' || coachFilter !== 'all'`.

### Nouveau composant — `CoachListCell`

Aucun précédent dans ce backoffice ; partagé entre `SectionTable` et `TeamTable` (un seul composant, pas deux variantes dupliquées). Props : `coaches: { id: string; fullName: string }[]` — une liste déjà résolue par le ViewModel, ce composant ne fait aucune requête ni jointure.

- **Aucun coach** (`coaches.length === 0`) — rend le texte **« Aucun coach »** (`text-white/50` ou équivalent atténué déjà utilisé ailleurs pour un état neutre), **jamais** une cellule vide ni un simple tiret cadratin `—` (AC-ST-42). C'est une **déviation assumée de la maquette**, qui ne rend qu'un `—` : le tiret ne satisfait pas l'exigence « état textuel explicite » posée par la spec elle-même (§1, point 2), qui l'emporte sur la fidélité littérale au pixel ici. Aucune icône, aucune couleur d'alerte — texte seul.
- **Un coach** (`coaches.length === 1`) — rend son `fullName` en texte simple, comme la maquette (`Marc Boucher` y figure, mais aucun nom n'est codé en dur : provient toujours de `coaches[0].fullName`, AC-ST-20).
- **Plusieurs coachs** (`coaches.length > 1`) — **aucune maquette n'illustre ce cas** (PO-ST-15, non tranché). Traitement retenu ici, délibérément minimal pour ne pas inventer un nouveau pattern visuel (avatars, pastilles, troncature « +N ») sans référence : une **liste de noms séparés par une virgule**, en texte simple, sur autant de lignes que le retour à la ligne naturel du navigateur l'impose (`whitespace-normal`, pas de troncature forcée). Ce n'est pas un nouveau composant visuel au sens du garde-fou de ce rôle — c'est la même primitive texte que le cas à un seul nom, simplement concaténée — donc pas de prototype Claude Design à produire avant de construire. Si le Bureau confirme un jour un plafond ou une hiérarchie coach principal/adjoint (PO-ST-15), ce rendu sera revisité alors, pas anticipé ici.

### Nouveau composant — `AssignCoachDialog`

Aucun précédent dans ce backoffice (contrairement à `SectionFormDialog`/`TeamFormDialog`, qui suivent le patron `SeasonFormDialog`/`NewsFormDialog` sans le modifier — voir plus bas). Ouvert depuis le bouton « + Coach » d'une ligne d'équipe ; un seul composant, pas un mode supplémentaire d'un dialogue existant (le formulaire écrit une ressource différente — `user_roles`, pas `teams`/`sections`, §2.9 — et n'a ni valeurs pré-remplies au sens `edit`, ni bouton « Enregistrer »).

Champs, dans l'ordre de la maquette `Assign-coach` :

1. **`UTILISATEUR`** — `Select` (`SelectTrigger h-11 rounded-xl`, placeholder « Choisir… »). Contenu exact de la liste **non tranché** (PO-ST-12b) : le ViewModel expose déjà la liste que retourne la lecture administrative de `public.users`, ce composant ne filtre rien de plus. **Amorçage** (PO-ST-11 amendé) : si la liste est vide (aucun compte éligible), `Select disabled` + texte d'aide `text-xs text-muted-foreground` (même traitement que `SECTION`/`SAISON` vides dans `TeamFormDialog`), pas une liste déroulante muette.
2. **`RÔLE`** — **déviation assumée de la maquette**, qui rend un `Select` ouvert sur « Choisir… » comme s'il y avait un choix : ici, un seul rôle est permis dans cette passe (AC-ST-45, PO-ST-12a « position retenue : coach seul »). Rendu comme un champ **verrouillé plutôt qu'un vrai choix à faire** — `Select` avec une **unique** option « Coach », **pré-sélectionnée** à l'ouverture (pas de placeholder « Choisir… » sur ce champ précis, puisqu'il n'y a rien à choisir), accompagné d'un texte d'aide « Seul le rôle Coach peut être assigné depuis cet écran ». Objectif : ne jamais suggérer visuellement une liberté de choix que le RBAC (§3) et AC-ST-45 interdisent — présenter un `Select` avec un seul item cliquable serait plus fidèle au pixel mais plus trompeur qu'un champ clairement figé.
3. **`ÉQUIPES`** — liste de cases à cocher (`checkbox.tsx`, **déjà vendu** — vérifié dans `src/presentation/shared/components/ui/`, aucun `npx shadcn add` nécessaire), sélection multiple, une ligne par équipe existante (toutes saisons confondues, y compris une saison passée — §2.8, PO-ST-16 non bloquant ici), libellé `{nom équipe} · {nom section} ({libellé saison})`. Chaque ligne est un `<label>` cliquable enveloppant `Checkbox` + texte, avec un padding vertical portant sa hauteur cliquable à `min-h-11` (`CLAUDE.md` §6 : la case elle-même fait moins de 44px chez shadcn, c'est la zone cliquable totale de la ligne qui doit l'atteindre, pas la case seule). **Pré-cochée à l'ouverture** : uniquement l'équipe de la ligne d'où le dialogue a été ouvert (AC-ST-45) — ce pré-cochage est un simple confort de saisie, **indépendant** de savoir si le compte choisi dans `UTILISATEUR` coache déjà cette équipe ou une autre (rien dans la maquette ne montre l'état des cases se remettre à jour quand `UTILISATEUR` change, et cette spec n'invente pas ce comportement).
4. **Mention en italique**, sous la liste de cases, règle métier reprise verbatim ou reformulée : « Un coach peut être assigné à plusieurs équipes : cochez toutes celles concernées. »
5. **Boutons** : `Annuler` (`variant="outline" h-11 rounded-full`) / `Assigner` (`h-11 rounded-full bg-coach-green`, patron identique à `Créer`/`Enregistrer`).

**Comportement de soumission — point à ne pas mal interpréter en codant** : cliquer « Assigner » envoie **uniquement** la liste des équipes **actuellement cochées** au use case d'affectation, qui insère (`on conflict do nothing`, AC-ST-36) une ligne par équipe cochée. **Décocher une case qui était cochée à l'ouverture ne déclenche aucun retrait** — aucune ligne `user_roles` n'est supprimée, quel que soit l'état des cases au moment du clic (AC-ST-21, PO-ST-13 non tranché). Concrètement : une équipe décochée puis « Assigner » cliqué se comporte exactement comme si elle n'avait jamais été cochée — ni ajout, ni retrait. Ce n'est pas un choix ergonomique évident (l'utilisateur pourrait raisonnablement s'attendre à ce que décocher retire), mais c'est la seule lecture cohérente avec l'absence totale de tout contrôle/politique/use case de retrait dans cette passe (§1) — **ne pas construire un chemin de suppression pour rendre le geste plus intuitif** sans que PO-ST-13 soit tranché.

**Trois états** (reconduction d'AC-ST-23/AC-ST-47) : soumission en cours → champs, cases et boutons `disabled` ; échec → dialogue **reste ouvert**, sélections **conservées**, `Alert variant="destructive"` avec message français issu d'une `DomainError` ; succès → fermeture + invalidation des clés de requête des deux tableaux (`COACH(S)` de l'équipe **et** de sa section, AC-ST-46) + relecture du `User.roles` de l'opérateur si le compte affecté est le sien (AC-ST-46, cumul admin+coach). Entièrement utilisable au clavier, y compris la liste de cases (reconduction d'AC-ST-30).

### Composants formulaire — patron réutilisable tel quel, inchangé de la passe 1

**`SectionFormDialog`** et **`TeamFormDialog`**, deux composants **séparés** (pas un dialogue générique paramétré par ressource) — même position que `SeasonFormDialog`/`NewsFormDialog`. Patron déjà établi : un composant par ressource, paramétré par un mode (`create` | `edit`), remonté via `key` au changement de cible plutôt que réinitialisé par un `useEffect`.

**`SectionFormDialog`** — aucune référence visuelle pour le mode modification (PO-ST-04), seul le mode création est illustré :

| Paramètre | Mode création | Mode modification |
|---|---|---|
| Titre | « Créer une section » | « Modifier la section » |
| Valeurs initiales | Champs vides | Pré-remplies depuis la ligne sélectionnée (AC-ST-24) |
| Bouton de validation | « Créer » | « Enregistrer » |
| Use case appelé | `CreateSectionUseCase` | `UpdateSectionUseCase` |

Champs, dans l'ordre de la maquette :
1. **`NOM`** — `Label` + `Input h-11 rounded-xl`, placeholder « Ex. Senior masculin », `required`.
2. **`TYPE (SPORT)`** — `Label` + `Select` (`SelectTrigger h-11 rounded-xl`, `SelectValue` placeholder « Choisir… »), quatre options fixes (`football`/`esport`/`echecs`/`domino`, PO-ST-02), `required`. Empilé sous `NOM`, aucun `grid-cols-2`/`min-w-0` à prévoir.

**`TeamFormDialog`** — mode création entièrement illustré, mode modification non illustré (PO-ST-04) :

| Paramètre | Mode création | Mode modification |
|---|---|---|
| Titre | « Créer une équipe » | « Modifier l'équipe » |
| Valeurs initiales | Champs vides | Pré-remplies depuis la ligne sélectionnée (AC-ST-24) |
| Bouton de validation | « Créer » | « Enregistrer » |
| Use case appelé | `CreateTeamUseCase` | `UpdateTeamUseCase` |

Champs, dans l'ordre de la maquette — **tous empilés verticalement, aucun côte à côte** :
1. **`NOM`** — `Input h-11 rounded-xl`, placeholder « Ex. Groupe A », `required`.
2. **`SECTION`** — `Select` (`SelectTrigger h-11 rounded-xl`, placeholder « Choisir… »), options = liste des sections existantes (nom), `required`.
3. **`SAISON`** — `Select` (`SelectTrigger h-11 rounded-xl`, placeholder « Choisir… »), options = liste des saisons existantes (libellé), `required`.
4. **Mention en italique**, sous les deux listes déroulantes, règle métier, pas une décoration : « Section et saison sont obligatoires : une équipe est propre à une saison et n'est jamais réutilisée d'une saison à l'autre. »

**Amorçage** : `SECTION`/`SAISON` sans option → `Select` `disabled` + texte d'aide explicite (style `text-xs text-muted-foreground` déjà utilisé dans `NewsFormDialog`) plutôt que deux listes vides et muettes. Bouton de validation `disabled` tant que l'une des deux listes est vide.

### Composants shadcn mobilisés

| Élément visuel | Primitive | Déjà vendue ? |
|---|---|---|
| Tableaux | `table.tsx` | Oui |
| Dialogues de création/modification/affectation | `dialog.tsx` | Oui |
| Cases à cocher (dialogue « Assigner un rôle ») | `checkbox.tsx` | **Oui** — vérifié par `ls src/presentation/shared/components/ui/`, aucun `npx shadcn add` nécessaire |
| Lignes de chargement | `skeleton.tsx` | Oui |
| Champs `Input`/`Select`/boutons | `input.tsx`, `label.tsx`, `select.tsx`, `button.tsx` | Oui |
| Badge d'état de saison (réutilisé) | `badge.tsx` (via `SeasonStatusBadge`) | Oui |
| Messages d'erreur | `alert.tsx` | Oui |
| Filtres (type, section, saison, présence de coach) | `select.tsx`, réutilisé tel quel comme filtre à choix unique — **aucune nouvelle primitive** : trois `Select` de plus, pas un composant « groupe de filtres » générique | Oui |
| Onglets | `tabs.tsx` | Vendu mais **délibérément non utilisé** (voir décision de routage) |
| Encadrement en panneaux/cartes | `card.tsx` | Non repris — les deux écrans passe 2 suivent le patron `SeasonTable`/`NewsTable` (tableau pleine largeur, pas de `Card`), pas le patron « panneaux » de la passe 1 |

### Cibles tactiles et champs côte à côte

`h-11` au site d'appel pour tous les `Input`/`SelectTrigger`/`Button` (`CLAUDE.md` §6), y compris les trois filtres de l'écran Équipes — aucune valeur par défaut `h-8` shadcn laissée telle quelle. Les trois filtres côte à côte de l'écran Équipes (`SECTION`/`SAISON`/présence de coach) portent chacun `min-w-0` (voir « Écran Équipes » ci-dessus) : premier cas réel de champs côte à côte dans cette feature, au sens de `CLAUDE.md` §6, à ne pas laisser sans cette classe au moment de coder. Chaque ligne de la liste de cases à cocher du dialogue « Assigner un rôle » a une hauteur cliquable totale `min-h-11`, même si la case elle-même est plus petite.

### Ce qui ne doit pas apparaître — rappel, non redéfini ici

Aucun contrôle de suppression ni d'archivage, à aucun endroit, pour une section comme pour une équipe (AC-ST-21). Aucun contrôle de retrait d'un coach, même désactivé, même sous forme de case qu'on pourrait décocher avec un effet réel (PO-ST-13 — voir « Comportement de soumission » ci-dessus). Aucun contrôle d'affectation d'un rôle autre que coach — ni colonne effectif, ni rattachement joueur/responsable de section/dirigeant/bénévole (AC-ST-21, PO-ST-12). Aucun nom de personne codé en dur, y compris ceux des maquettes (`Marc Boucher`, le nom de la barre supérieure, celui du bloc « ALERTE » — AC-ST-20). Aucun compteur de navigation, badge numérique ou bloc « ALERTE » (reconduction d'AC-WE-13). La 8ᵉ entrée « Journal d'audit » visible dans `Assign-coach` n'est pas ajoutée à `backoffice-nav.ts` (PO-WA-09).

### Questions UI — récapitulatif, non bloquantes pour construire

- **PO-ST-02** — libellés français des quatre types de section : seul « Football » est confirmé par la maquette ; « E-sport »/« Échecs »/« Domino » sont des propositions non validées.
- **PO-ST-04** — contenu du dialogue de modification (sections et équipes) : délibérément non tranché, `SectionFormDialog`/`TeamFormDialog` en mode `edit` réutilisent la même disposition que la création faute d'autre référence.
- **PO-ST-08** — déjà résolu par réutilisation de `SeasonStatusBadge` ; non rouvert ici.
- **PO-ST-11** — ordre d'affichage et pagination des deux tableaux : non déterminable depuis les maquettes.
- **PO-ST-12** — contenu exact des listes `RÔLE` (position retenue ici : « Coach » seul, verrouillé) et `UTILISATEUR` (non tranché — la liste vient telle quelle de la lecture administrative de `public.users`, sans filtre supplémentaire côté écran) du dialogue d'affectation.
- **PO-ST-13** — décocher une équipe déjà cochée : traité ici comme un no-op au clic sur « Assigner » (aucun retrait), conformément à la position retenue en §1 — **non tranché définitivement**, à confirmer avant la mise en production du dialogue.
- **PO-ST-15** — rendu d'une cellule `COACH(S)` à plusieurs noms : traité ici par une liste de noms séparés par une virgule, choix minimal justifié par l'absence de référence visuelle plutôt qu'un nouveau pattern (avatars, troncature) inventé sans maquette.
