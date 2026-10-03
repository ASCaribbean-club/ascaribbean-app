# Spec — Vue mobile Dirigeant habilité (`mobile-dirigeant-habilite`)

> Statut : **révisée le 2026-10-03** après les réponses de la développeuse aux points ouverts de la rédaction initiale (même jour). PO-DH-01 à PO-DH-05 et PO-DH-07 sont **tranchés**. **Aucun point ouvert ne bloque plus la transmission à designer-agent** : les points restants bloquent l'implémentation, la recette ou la mise en production, pas la conception. Voir §6.
> Demande d'origine (développeuse) : « User with role dirigeant habilité should have screens like coach, with the ability to create actus and filter by section like the designs ».
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0/P1, matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles, « double authentification… recommandée aux dirigeants »), `docs/ARCHITECTURE.md` (§7 permissions, §11 journal d'audit), `docs/GOUVERNANCE.md` (référent RGPD non désigné), `docs/DEFAULTS-A-CHALLENGER.md` (« Permissions d'écriture sur `club_news` »), `specs/coach-dashboard.md`, `specs/actus.md`, `specs/web-actus.md` (PO-WA-01/03/04/08/10), `specs/calendar.md` (PO-CA-05/06), `specs/create-convocation.md`, `specs/web-create-convocation.md` (sélection Section puis Équipe), `specs/menu.md`.
> État du code lu : `src/domain/policies/{rbac-matrix,can,actions,audit-actions}.ts`, `src/domain/entities/user.ts`, `src/domain/rules/active-role-scope.ts`, `src/domain/usecases/news/{Create,Update,Archive}ClubNewsUseCase.ts`, `src/presentation/app/{router.tsx,DashboardIndexPage.tsx}`, `src/presentation/app/providers/active-role-provider.tsx`, `src/presentation/features/coach-dashboard/useCoachDashboardViewModel.ts` (+ `components/`), `src/presentation/features/convocation/useCreateConvocationViewModel.ts`, `src/presentation/features/calendar/useCalendarViewModel.ts`, `src/presentation/features/news/useNewsViewModel.ts`, migrations `20260811171754_initial_schema.sql`, `20260819153918_season_scoping_correction.sql`, `20260821091519_convocation_creation_schema.sql`, `20260901120018_convocation_responder_visibility_correction.sql`, `20260903205143_convocation_responses_select_own_or_coach.sql`, `20260904205258_club_news.sql`, `20260917082318_web_actus_news_write_policies.sql`, `20260917174652_web_memberships_write_policies.sql`.

## Décisions de la développeuse — 2026-10-03

Ces décisions **priment** sur toute lecture antérieure.

| Réf. | Décision |
|---|---|
| **PO-DH-01** | Le `+` flottant du tableau de bord **crée une convocation**, comme celui du coach. **L'onglet Actus reçoit son propre `+`** pour créer une actu. L'adaptation du formulaire de convocation, qui demande une équipe alors que le Dirigeant n'en a pas, est traitée au §1.4. Elle se déduit du précédent backoffice et ne bloque pas |
| **PO-DH-02** | Les **brouillons sont pris en charge sur mobile**. L'onglet Actus du Dirigeant reprend la console backoffice, adaptée au mobile : une icône d'édition par actu (avec un écran d'édition), une pastille de statut (brouillon / publiée), une note indiquant qu'un brouillon n'est pas montré aux membres, et un filtre de statut (toutes / brouillons / publiées) |
| **PO-DH-03** | Le **Calendrier** est accessible au Dirigeant : tous les événements du club, filtrables par section via une **icône de filtre**. Le **détail de convocation** reste **différé** (défaut maintenu, signalé en PO-DH-15) |
| **PO-DH-04** | **Option B** : une nouvelle action `'news:create'` pour `admin` et `authorized-officer`, plus ce que demandent l'édition et les brouillons. Ces ajouts sont proposés et signalés au §2 |
| **PO-DH-05** | Le Dirigeant obtient la **lecture de `teams`** par élargissement de la RLS, et le **compteur de licenciés via une fonction qui ne renvoie que des agrégats**. `memberships` n'est jamais ouverte ligne à ligne |
| **PO-DH-07** | Le filtre liste **toutes les sections**. **Il n'existe pas de section Basket** : cette puce de la maquette est retirée. La carte « Prochain événement » **suit le filtre de section** |

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne n'existe au §2 du registre pour cette feature.** Un export PNG est présent dans le dépôt, `docs/designs/authorized-officer/[v4] [Dirigeant] Mob - Dashboard.png`, importé directement par la développeuse sans lien artifact. C'est le cas **`instantané seul`** du §4 du registre : on utilise l'instantané local, **et aucun lien artifact n'est à demander**.

L'agent PO n'écrit que dans `specs/`. Voici la ligne pré-rédigée, **à recopier telle quelle** dans le §2 du registre (PO-DH-12) :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| mobile-dirigeant-habilite — **vue Dirigeant habilité : tableau de bord mobile club-wide, filtre par section** (`[v4] [Dirigeant] Mob - Dashboard`) | — aucun lien fourni | 2026-10-03 | `docs/designs/authorized-officer/[v4] [Dirigeant] Mob - Dashboard.png` | **instantané seul** |

> Deux notes à joindre à la ligne. (a) **Un seul export, un seul écran** : le tableau de bord. Il n'existe **aucune maquette** pour l'onglet Actus du Dirigeant (liste, filtre de statut, création, édition), pour la variante Dirigeant du Calendrier ni pour le sélecteur d'équipe du formulaire de convocation. Ces écrans sont décrits par cette spec et seront conçus par composition de patrons existants (§5). (b) ⚠️ Le dossier `docs/designs/authorized-officer/` est en `??` dans `git status` et doit être commité avec cette ligne.

## 1. Périmètre

### Ce que c'est

C'est le **premier ensemble d'écrans mobiles d'un rôle club-wide**. Jusqu'ici, `ActiveRoleProvider` ne connaît que `'coach' | 'player'`, et un compte portant uniquement `authorized-officer` retombe sur le tableau de bord Joueur (`getDashboardRoles(...)[0] ?? 'player'`) alors qu'il n'a aucune équipe. Cette feature ferme la dette PO-CA-06 / PO-MN-07 **pour le seul rôle Dirigeant habilité**.

Elle couvre quatre volets :

1. **Tableau de bord Dirigeant** (§1.1), d'après la maquette.
2. **Calendrier Dirigeant** (§1.2), sans maquette.
3. **Onglet Actus Dirigeant** (§1.3) : liste avec brouillons, création, édition. Sans maquette.
4. **Création de convocation par le Dirigeant** (§1.4) : le formulaire existant, adapté à un rôle sans équipe.

Le **Menu** et le **Profil** sont inchangés : ils sont déjà identiques pour les 8 rôles.

### Rattachement CDC

| Volet | Module CDC | Priorité |
|---|---|---|
| Tableau de bord, Calendrier | Agrégation et navigation au-dessus de **Calendrier et convocations (P0)** et **Équipes et sections (P0)**. Les compteurs agrégés relèvent au mieux de **Statistiques et exports — tableaux de bord par rôle (P1)**. Même lecture que `specs/coach-dashboard.md` PO-1 | P0 pour la surface, P1 pour les indicateurs |
| Compteur « Licenciés » | **Adhérents et licences (P0)**, le module dont le Dirigeant habilité est le rôle principal | P0 |
| Création de convocation | **Calendrier et convocations (P0)**, ligne « Créer/modifier une convocation » de la matrice, ✅ Dirigeant | P0 |
| Rédaction des actus | Aucun module ne décrit littéralement le fil non ciblé (`specs/actus.md` PO-AT-02, **toujours ouvert**). Voisin le plus proche : **Communication (P1)** | Non tranchée |

### 1.1 Tableau de bord Dirigeant

1. **En-tête** : pastille de rôle « Dirigeant habilité », salutation avec le prénom, avatar ou initiales menant au profil (même comportement que `CoachHeader`). Ligne de contexte « Club entier · {N} sections · {M} licenciés ». La pastille fait passer d'un rôle de tableau de bord à l'autre (`toggleActiveRole`, voir « Comptes multi-rôles » au §2).
2. **Trois tuiles** : « Sections », « Licenciés », « Événements cette semaine ». Elles sont **club-wide et ne suivent pas le filtre**, comme la ligne de contexte (« Club entier »).
3. **Filtre par section, sous forme de puces** : « Toutes » plus une puce par ligne de `public.sections`. Aucune liste figée, **aucune puce Basket** (`sections.type` n'admet que `football`, `esport`, `echecs`, `domino`).
4. **Carte « Prochain événement »** : la prochaine convocation **dans la section filtrée**, avec son titre, la ligne date/heure · lieu et l'étiquette de section. Elle suit le filtre (PO-DH-07 tranché, ce qui corrige l'incohérence de la maquette où une carte Football apparaît sous la puce E-Sport).
5. **Liste « À venir — {section} »** : les convocations suivantes de la section filtrée, chacune avec titre, date/heure · lieu et étiquette de section. Un lien « Voir le calendrier » ouvre le Calendrier (§1.2).
6. **Bouton flottant `+`** : il **crée une convocation** (§1.4). Il n'est rendu que si `can(user, 'convocation:create')` est vrai.
7. **Nav basse à 4 entrées**, inchangée (`AppShell`).

**Non rendus**, parce que la maquette ne les montre pas : barre de réponses (le Dirigeant ne peut de toute façon pas lire `convocation_responses`, dont la politique `convocation_responses_select_own_or_coach` l'exclut), « Forme récente » / « Buts », bouton Alertes, sélecteur d'équipe.

### 1.2 Calendrier Dirigeant

C'est une **troisième variante** du Calendrier existant (`specs/calendar.md`), sélectionnée par le rôle actif `authorized-officer` :

- **Portée** : **toutes les convocations du club** pour les équipes de la saison en cours, à venir et passées (même règle que PO-CA-02).
- **Filtre par section** : accessible depuis une **icône de filtre** dans l'en-tête de l'écran, pas une rangée de puces. Il propose les mêmes valeurs que le tableau de bord (« Toutes » plus une entrée par section) et restreint à la fois la liste du jour et les puces de type sur la bande de jours et la grille du mois. Quand une section est sélectionnée, un **indicateur visible** le signale : un filtre actif ne doit jamais être caché.
- **État du filtre partagé** entre le tableau de bord et le Calendrier, au même niveau qu'`ActiveTeamProvider`, et non persisté. Choisir E-Sport sur le tableau de bord puis « Voir le calendrier » ouvre le Calendrier déjà filtré sur E-Sport. Valeur par défaut : « Toutes ».
- **Contenu d'une ligne** : le même que la ligne coach (liseré de type, titre, `ScheduleInfo`, adversaire et RDV pour un match, pastille `cancelled`, score d'un match passé), **plus l'étiquette de section**. Ne sont **pas** rendus : `ResponseBar` / `ResponseCountsRecap` (lecture des réponses non autorisée), `AttendanceConfirmationAlert` (réservée au coach), les actions Présent/Absent.
- **Lignes non tappables** tant que le détail de convocation n'a pas de variante Dirigeant (PO-DH-15). Une ligne qui mènerait à l'état « mauvais rôle » serait une porte qui ne s'ouvre pas.
- Le **sélecteur Sem/Mois**, les états vides et les contraintes tactiles sont repris tels quels de `specs/calendar.md`.

### 1.3 Onglet Actus Dirigeant

Quand le rôle actif est `authorized-officer`, l'onglet Actus devient une **console de rédaction mobile**, sur le modèle de `/admin/news` (`specs/web-actus.md`) adapté au mobile. Pour tout autre rôle actif, l'onglet reste **strictement le fil en lecture** de `specs/actus.md` : publiées et non expirées, identique pour tous.

Contenu de la vue Dirigeant :

1. **Note d'information** en tête de liste : « Les brouillons ne sont pas visibles des membres » (ou équivalent).
2. **Filtre de statut** : Toutes / Brouillons / Publiées. « Toutes » par défaut.
3. **Liste des actus** (voir la portée en §2 et PO-DH-14). Chaque entrée porte :
   - le titre ;
   - un extrait du contenu ;
   - la date (`published_at`, jamais `created_at`) ;
   - une **pastille de statut** ;
   - une **icône d'édition**, rendue seulement si l'utilisateur peut modifier cette actu.
4. **Bouton `+`** : il ouvre l'écran de création.
5. **Écran de création** et **écran d'édition** : routes plein écran poussées par-dessus l'onglet, sans nav basse. Les champs sont ceux de `NewsFormDialog` : titre, contenu, **statut (brouillon / publiée)**, date de publication (obligatoire seulement pour une actu publiée), expiration optionnelle et lien optionnel. L'édition est pré-remplie et met à jour **la même ligne**.
6. **Aucune** action d'archivage ni de suppression sur mobile : elles restent au backoffice, administrateur seul.

**Pastille de statut** : la développeuse demande « brouillon / publiée ». Or une actu publiée **et expirée** n'est plus montrée aux membres. L'étiqueter « Publiée » serait trompeur, précisément là où la note d'information promet la transparence sur ce que voient les membres. Position retenue : reprendre la logique de `NewsStatusBadge`, déjà construite : « Brouillon » si `status = 'draft'`, sinon « Publiée » si `isNewsVisible`, sinon « Expirée ». Le filtre « Publiées » inclut les expirées. → PO-DH-16, non bloquant.

### 1.4 Création de convocation par le Dirigeant

Le `+` du tableau de bord pousse `convocations/new`, le formulaire existant (`CreateConvocationForm`). Aujourd'hui, ce formulaire **n'a pas de sélecteur d'équipe** : il reçoit `teamId` (et `activeMemberCount`) par `location.state`, hérités de l'équipe courante du coach. Le Dirigeant n'a pas d'équipe courante.

**L'adaptation se déduit du précédent backoffice** (`specs/web-create-convocation.md` §1 point 3 : « l'équipe est choisie sur l'écran (Section puis Équipe) ») et ne pose pas de question bloquante :

- Quand l'écran est atteint **sans** `teamId` en état de route et que le rôle actif est `authorized-officer`, le formulaire affiche **en tête** un sélecteur **Section** (toutes les sections) puis un sélecteur **Équipe**, limité aux équipes de la saison en cours de la section choisie. Les deux sont obligatoires. Le flux coach est **inchangé**.
- La section est **pré-remplie** avec le filtre actif du tableau de bord quand il n'est pas « Toutes ».
- Les champs qui dépendent de l'équipe (adversaires d'un match, lieu d'entraînement) ne se chargent **qu'après** le choix d'une équipe. Changer d'équipe réinitialise l'adversaire. La lecture des adversaires est déjà ouverte (`team_opponents_select_authenticated`).
- `can(user, 'convocation:create', { teamId })` est vrai pour le Dirigeant (branche `default` de `can.ts`), et la RLS `convocations_insert_create` l'admet déjà (`private.has_role('authorized-officer')`). **Aucun changement RBAC ni RLS pour ce volet.**
- Après création, le tableau de bord et le Calendrier du Dirigeant se rafraîchissent (invalidation de leurs clés centralisées), en plus des clés coach déjà invalidées.
- Le nombre de destinataires (`recipientsCount`) dépend aujourd'hui d'`activeMemberCount`, fourni par le coach. Pour le Dirigeant, sa source n'est pas définie : PO-DH-17, non bloquant. À défaut, la mention est **absente**, pas affichée à zéro.

### Le filtre par section — règle centrale

- **Portée globale.** `authorized-officer` est club-wide : `RoleAssignment` ne lui donne aucun champ de portée, et la RLS l'admet sans borne. Toutes les sections sont proposées, y compris pour un compte Responsable de section + Dirigeant en vue Dirigeant.
- **Ce qu'il filtre** : les convocations seulement (carte, liste, Calendrier), via `convocations.team_id → teams.section_id`. Une équipe sans section (`section_id` nul) n'apparaît que sous « Toutes ».
- **Ce qu'il ne filtre pas** : les tuiles et la ligne de contexte, ainsi que les actus (`club_news` n'a pas de colonne de section, et `specs/actus.md` a fixé un fil non ciblé).
- **Ce n'est pas une frontière de sécurité** : il trie des données déjà autorisées par la RLS, donc il n'a pas d'entrée de matrice.

### Hors périmètre — explicitement

- **Le détail de convocation** pour le Dirigeant (PO-DH-15) : liste nominative des répondants, onglets, contrôles `'mission:manage'`.
- **L'archivage et la suppression d'une actu** depuis le mobile, et l'accès au backoffice (`'backoffice:access'` reste `['admin']`).
- **La modification, l'annulation ou la clôture d'une convocation** par le Dirigeant (`'convocation:update'` ne le contient pas).
- **Les écrans poussés réservés au coach** : Alertes, Statistiques d'équipe, Disponibilités, Classement.
- **Toute donnée financière** (« Voir le statut de cotisation ✅ » n'est pas exploité), **tout export**, **les événements club et missions bénévoles** (P1).
- **Les autres rôles sans tableau de bord** : PO-CA-06 / PO-MN-07 restent ouverts pour eux.

## 2. RBAC

### Lignes de la matrice applicables au Dirigeant habilité

| Permission (matrice) | Dirigeant habilité | Conséquence |
|---|---|---|
| Voir son propre profil/dossier | ✅ | En-tête, profil |
| Voir les dossiers des autres membres | ✅ (sans qualificatif) | **Fonde** la lecture club-wide des convocations, la lecture des équipes et le compteur de licenciés. Aucun nom de tiers n'est rendu dans cette feature |
| Créer/modifier une convocation | ✅ (sans qualificatif) | `'convocation:create'` déjà accordé, ce qui fonde le `+` du tableau de bord (§1.4). La *modification* n'est pas exploitée (`'convocation:update'` inchangé) |
| Consulter une convocation en mode dégradé | ✅ | Le mode dégradé n'est pas implémenté (PO-CA-01), et rien ne l'annonce |
| Saisir une évaluation sportive | ❌ | Aucun contrôle de présence, de composition ni de résultat |
| Consulter une donnée de santé | ❌ | Aucune |
| Voir le statut de cotisation | ✅ | Non exploité |
| Gérer postes/missions bénévoles | ✅ | `'mission:manage'` déjà accordé. Ne s'exprime que dans le détail de convocation, qui est différé |
| Envoyer une communication ciblée | ✅ | Ligne la plus proche de la rédaction d'actus. Elle est **cohérente avec** l'ouverture décidée, mais **ne la fonde pas à elle seule** (`specs/actus.md` §3). C'est la décision de la développeuse qui fonde l'ouverture |
| Exporter des données | ✅ | Non exploité |
| Gérer comptes, rôles, paramétrage / Journal d'audit | ❌ | — |

### Entrées existantes réutilisées, sans changement

- `'convocation:create'` contient déjà `authorized-officer` (branche `default` de `can.ts`, club-wide).
- `'mission:manage'` contient déjà `authorized-officer`. Il n'est pas exploité dans cette passe.
- La lecture des convocations et des sections reste **RLS-only**. Le filtre par section n'a pas d'entrée de matrice.

### Changements de matrice — **proposés et signalés, pas ajoutés en silence** (`CLAUDE.md` §7)

Aujourd'hui, une seule action, `'news:write': ['admin']`, garde la création (`CreateClubNewsUseCase`), la modification (`UpdateClubNewsUseCase`) **et l'archivage** (`ArchiveClubNewsUseCase`). L'option B tranchée (PO-DH-04) scinde la création. Le flux d'édition et de brouillons décidé en PO-DH-02 demande de scinder aussi la modification. Sans ça, élargir `'news:write'` donnerait au Dirigeant **l'archivage, qui n'a aucun écran mobile**, soit un droit sans écran (même raisonnement que `'membership:write'`).

**Proposition :**

| Action | Rôles | Use case gardé | Statut |
|---|---|---|---|
| `'news:create'` | `['admin', 'authorized-officer']` | `CreateClubNewsUseCase` (passe de `'news:write'` à `'news:create'`) | **Nouvelle, tranchée** (PO-DH-04) |
| `'news:update'` | `['admin', 'authorized-officer']` | `UpdateClubNewsUseCase` (passe de `'news:write'` à `'news:update'`) | **Nouvelle, proposée** : requise par l'écran d'édition (PO-DH-02) |
| `'news:write'` | `['admin']`, **inchangée** | `ArchiveClubNewsUseCase` et l'accès à la console backoffice | Son périmètre se **réduit** à l'archivage et à la console. Son commentaire d'en-tête dans `rbac-matrix.ts` est à réécrire en conséquence. La renommer (ex. `'news:archive'`) serait plus juste, mais reste hors périmètre de cette passe et à décider par la développeuse |

Les deux nouvelles actions sont club-wide pour les deux rôles : aucune branche de `can.ts` n'est à ajouter, la branche `default` suffit. Pour l'administrateur, la console `/admin/news` reste fonctionnellement identique (il détient les trois actions). `can.test.ts` doit couvrir : `admin` et `authorized-officer` vrais pour `news:create` et `news:update`, `authorized-officer` **faux** pour `news:write`, et `coach`, `treasurer` et `section-manager` faux pour les trois.

### Politiques RLS sur `club_news` — **proposées et signalées**

| Politique (nouvelle migration) | Clause | Miroir de |
|---|---|---|
| `club_news_insert_authorized_officer` | `with check (private.has_role('authorized-officer') and created_by = (select auth.uid()) and status in ('draft','published'))` | `'news:create'` |
| `club_news_select_authorized_officer` | `using (private.has_role('authorized-officer') and status in ('draft','published'))`. Brouillons et publiées (y compris expirées) de **tous les auteurs** (PO-DH-14). **Jamais `archived`** | lecture nécessaire au filtre de statut et à la relecture d'un brouillon |
| `club_news_update_authorized_officer` | `using (private.has_role('authorized-officer') and status in ('draft','published')) with check (private.has_role('authorized-officer') and status in ('draft','published'))`. Le Dirigeant **ne peut pas archiver** : la base le refuse même si l'interface ne le propose pas | `'news:update'` |

- Les politiques admin existantes (`club_news_select_admin`, `_insert_admin`, `_update_admin`) sont **inchangées**. Leur commentaire de miroir passe de `'news:write'` à l'action correspondante.
- `club_news_select_visible` est **inchangée** : les 6 autres rôles ne voient toujours que les publiées non expirées.
- **Aucune politique `delete`.**
- La contrainte `club_news_published_has_date` est inchangée, et la validation du domaine en est déjà le miroir.

**Contradiction à porter en recette.** Avec ces politiques, `specs/actus.md` AC-AT-05 (« identique quel que soit le rôle ») devient faux **pour un second rôle**, après l'admin (PO-WA-01). → PO-DH-13.

### Lecture des équipes et des licenciés (PO-DH-05 tranché) — **proposées et signalées**

- **`teams`** : élargir `teams_select_team_scoped` avec une branche `or (private.has_role('authorized-officer') and season_id = (select id from public.current_season()))`. Saison en cours seulement, même borne que la branche membre d'équipe. C'est le même patron que la correction ex-PO-MD-05 sur `convocations_select_team_scoped`. Cette ouverture ne concerne que le nom, la section et la saison de l'équipe, aucune donnée nominative.
- **Compteurs** : une fonction `security definer` étroite (nom proposé `get_club_overview()`). Elle vérifie elle-même `private.has_role('authorized-officer') or private.is_admin()` et lève `42501` sinon. Elle ne renvoie **que des entiers** (sections, licenciés, éventuellement événements de la semaine), **sans paramètre** à falsifier. Même patron que `get_team_roster` / `get_my_attendance_summary`. **`memberships_select_own` n'est pas modifiée.**
- Ce sont des lectures RLS-only, sans entrée de matrice : `presentation/` rend ce que renvoient le dépôt et la fonction.

### Comptes multi-rôles

- `DashboardRole` (présentation) et son miroir structurel `ActiveDashboardRole` (`domain/rules/active-role-scope.ts`) gagnent `'authorized-officer'` **dans le même changement**. `DashboardIndexPage`, `useCalendarViewModel` (son aiguilleur `buildSelectedDayItems`) et l'onglet Actus se branchent sur ce rôle actif.
- **Un compte portant uniquement `authorized-officer`** ouvre directement sur la vue Dirigeant.
- **Coach + Dirigeant** : deux vues distinctes, jamais fusionnées. La vue Coach reste bornée aux équipes du coach (AC-02). On bascule avec la pastille de rôle. L'onglet Actus en vue Coach reste le fil en lecture.
- **Ordre de bascule** : joueur → coach → dirigeant. Un compte Joueur + Dirigeant ouvre donc sur la vue Joueur (PO-DH-08, défaut retenu, non bloquant).
- `hasActiveRoleForConvocation` ne gagne **pas** de branche `authorized-officer` dans cette passe : le détail est différé (PO-DH-15). Ne pas la pré-remplir.
- **Règle d'affichage** : un contrôle non autorisé est **absent, jamais grisé**. La RLS fait foi et se teste avec un jeton contre la base.

## 3. Données sensibles

| Nature | Cette feature | Conséquence |
|---|---|---|
| **Santé** | Aucune | Aucun trigger d'accès |
| **Financière** | Aucune rendue. Le compteur « Licenciés » s'appuie probablement sur `memberships`, qui porte des données de cotisation | La fonction ne renvoie **qu'un entier** : aucun statut de paiement, montant ni identifiant (AC-DH-19). La définition de « licencié » reste ouverte (PO-DH-06) |
| **Nominative de tiers** | Aucune : agrégats, échéances d'équipe, noms d'équipe | La liste nominative des répondants n'apparaît nulle part, puisque le détail est différé |
| **Contenu éditorial libre** | **Oui, surface élargie** : un rôle non administrateur crée **et modifie** des actus, y compris celles d'autres auteurs, depuis un téléphone | Voir ci-dessous |

**Journal d'audit (PO-DH-09, à trancher avant mise en production).** `audit-actions.ts` exclut délibérément `news.created` / `news.updated`. Cette exclusion a été posée pour une écriture réservée à l'administrateur. Or **une modification ne laisse aucune trace aujourd'hui** : `club_news` n'a ni `updated_at` ni `updated_by` (`specs/web-actus.md` §2.1). Avec un second rôle autorisé à réécrire l'actu d'un autre auteur, c'est le cas le plus gênant, et la question PO-WA-04 devient pressante. Si une trace est décidée, elle part **du use case**, jamais d'un composant (`ARCHITECTURE.md` §11).

**Création de convocation** : ce n'est pas une action sensible au sens du CDC §11.3. `created_by` suffit, comme pour le coach.

**RGPD (reprend PO-WA-10)** : noms de licenciés dans le texte libre, droit à l'image sur un lien d'album. Le nombre de rédacteurs augmente. Arbitrage du référent RGPD, **toujours non désigné**.

**Sécurité du compte (PO-DH-10)** : la MFA est « recommandée aux dirigeants », et ce rôle gagne des droits d'écriture club-wide sur mobile. Hors périmètre, signalé.

**Export : aucun.**

## 4. Critères d'acceptation

**AC-01** et **AC-02** (CDC §17.2) s'appliquent tels quels à la vue Coach d'un compte multi-rôles. Les critères propres à cette feature sont préfixés **`AC-DH-`**.

**Accès et rôle actif**

| Réf. | Critère |
|---|---|
| AC-DH-01 | Un compte portant **uniquement** `authorized-officer` ouvre sur le tableau de bord Dirigeant, jamais sur la vue Joueur ni sur un écran vide |
| AC-DH-02 | Un compte Coach + Dirigeant bascule avec la pastille de rôle. La vue Coach reste strictement bornée à ses équipes (AC-02, vérifié par jeton contre l'API). Aucune vue fusionnée |
| AC-DH-03 | Un compte sans `authorized-officer` n'atteint jamais les variantes Dirigeant (tableau de bord, Calendrier, console Actus), même en forçant l'état du rôle actif |
| AC-DH-04 | `DashboardRole` et `ActiveDashboardRole` incluent `'authorized-officer'`, modifiés dans le même changement, et chacun cite l'autre. Le domaine n'importe rien de `presentation/` |

**Tableau de bord et filtre**

| Réf. | Critère |
|---|---|
| AC-DH-05 | Les tuiles et la ligne de contexte sont club-wide et **ne changent pas** quand on change de section |
| AC-DH-06 | « Événements cette semaine » ne compte que des convocations des équipes de la saison en cours, `cancelled` exclues, sur la période arrêtée en PO-DH-11 |
| AC-DH-07 | Les puces de filtre correspondent **exactement** aux lignes de `public.sections`, plus « Toutes ». Aucune puce figée, **aucune puce Basket**. Une section ajoutée en base apparaît sans changement de code |
| AC-DH-08 | Un compte Responsable de section + Dirigeant voit toutes les sections en vue Dirigeant |
| AC-DH-09 | Choisir une section restreint **la carte « Prochain événement » et la liste « À venir »** aux convocations dont l'équipe porte ce `section_id`. Le titre de la liste devient « À venir — {section} ». Sous « Toutes », les équipes sans section sont incluses |
| AC-DH-10 | Une section sans échéance à venir affiche un état vide explicite pour la carte et la liste. Jamais une carte d'une autre section, une erreur ou un chargement infini. Même chose sans saison en cours ou sans convocation |
| AC-DH-11 | Chaque échéance porte une étiquette de section doublée d'un libellé textuel (CDC §12) |
| AC-DH-12 | Aucune barre de réponses, aucun « Forme récente »/« Buts », aucun bouton Alertes ni sélecteur d'équipe n'est rendu |
| AC-DH-13 | Avec un jeton Dirigeant, l'API renvoie les convocations et les équipes de **toutes** les sections de la saison en cours, et **aucune** équipe d'une saison antérieure. Vérifié contre la base |

**Calendrier**

| Réf. | Critère |
|---|---|
| AC-DH-14 | En vue Dirigeant, le Calendrier liste toutes les convocations du club (à venir et passées) des équipes de la saison en cours. Le filtre de section s'ouvre depuis une icône de l'en-tête, s'applique à la liste **et** aux puces de type de la bande et de la grille, et son état actif est signalé visiblement |
| AC-DH-15 | Le filtre de section est **partagé** entre le tableau de bord et le Calendrier : une section choisie sur l'un est active sur l'autre. « Voir le calendrier » ouvre le Calendrier avec le filtre en cours |
| AC-DH-16 | Aucune `ResponseBar`, aucun `ResponseCountsRecap`, aucune `AttendanceConfirmationAlert` ni aucune action Présent/Absent n'est rendue en vue Dirigeant. Tant que PO-DH-15 n'est pas levé, **aucune ligne n'est tappable**, ni sur le tableau de bord ni sur le Calendrier : aucune porte vers l'état « mauvais rôle » |

**Création de convocation**

| Réf. | Critère |
|---|---|
| AC-DH-17 | Le `+` du tableau de bord Dirigeant ouvre `convocations/new` avec un sélecteur Section puis Équipe en tête, tous deux obligatoires. L'équipe est limitée à la saison en cours et à la section choisie. La section est pré-remplie depuis le filtre actif quand il n'est pas « Toutes ». **Le flux coach (équipe héritée, pas de sélecteur) est inchangé** |
| AC-DH-18 | Les adversaires et lieux ne se chargent qu'une fois l'équipe choisie, et changer d'équipe réinitialise l'adversaire. La convocation créée apparaît sur le tableau de bord et dans le Calendrier Dirigeant sans rechargement manuel. Aucune entrée de matrice ni politique RLS n'est ajoutée pour ce volet |

**Actus**

| Réf. | Critère |
|---|---|
| AC-DH-19 | La réponse de la fonction de compteurs ne contient **que des entiers** : aucune ligne de `memberships`, aucun statut de cotisation, aucun montant, aucun identifiant. Elle lève une erreur pour un jeton qui n'est ni Dirigeant ni admin. `memberships_select_own` est inchangée |
| AC-DH-20 | La matrice reçoit **exactement** `'news:create'` et `'news:update'` = `['admin', 'authorized-officer']`. `'news:write'` reste `['admin']`. Les use cases Create et Update utilisent respectivement `'news:create'` et `'news:update'`, Archive reste sur `'news:write'`. Aucune autre action ni aucun autre rôle n'est ajouté. `'backoffice:access'` est inchangée |
| AC-DH-21 | Avec un jeton Dirigeant, contre la base : `insert` en `draft` ou `published` avec `created_by` = soi réussit, avec un `created_by` tiers ou en `archived` échoue ; `select` renvoie les brouillons et publiées (expirées comprises) de tous les auteurs, **aucune** ligne `archived` ; `update` d'un brouillon ou d'une publiée réussit, et le passage à `archived` échoue ; tout `delete` échoue. Avec un jeton Coach, Trésorier ou Responsable de section, les lectures restent celles d'AC-AT-04 et toute écriture échoue |
| AC-DH-22 | En vue Dirigeant, l'onglet Actus affiche la note « brouillons non visibles des membres », le filtre Toutes / Brouillons / Publiées, et pour chaque entrée la pastille de statut (§1.3, PO-DH-16) et l'icône d'édition. Aucun contrôle d'archivage ni de suppression n'est rendu. En vue Coach ou Joueur, le même compte voit le fil en lecture inchangé |
| AC-DH-23 | Le `+` de l'onglet Actus ouvre l'écran de création et l'icône d'édition ouvre l'écran d'édition pré-rempli, qui met à jour la **même** ligne. Les validations passent par le domaine (titre et contenu non vides, date exigée pour une actu publiée). En cas d'échec, les saisies sont conservées et un message en français s'affiche, jamais un message brut de Supabase. Après succès, la liste Dirigeant et `queryKeys.newsFeed()` sont invalidées |
| AC-DH-24 | Un brouillon créé ou modifié par un Dirigeant n'apparaît **jamais** dans le fil d'un autre rôle (jeton Joueur contre la base). Passé en « Publiée » avec une date, il y apparaît |

**Transverse**

| Réf. | Critère |
|---|---|
| AC-DH-25 | Aucune donnée de santé ni financière n'est rendue, et aucun export n'est proposé, sur aucun écran de la feature |
| AC-DH-26 | Les écrans poussés (création de convocation, création et édition d'actu) ont un en-tête de retour `sticky top-0` et une barre de validation `sticky bottom-0`. Les contrôles ont une cible ≥ `h-11`. Toute paire côte à côte porte `min-w-0` (dates, Section/Équipe). Les puces de filtre défilent horizontalement avec des cibles ≥ 44 px. Vérifié sur un viewport mobile réel (`CLAUDE.md` §6) |
| AC-DH-27 | Aucun nom de personne de la maquette n'est repris dans le code, les tests ou les fixtures (`CLAUDE.md` §9) |
| AC-DH-28 | Aucun import de `data/` depuis `presentation/`. Les ViewModels calculent les booléens (`canCreateConvocation`, `canCreateNews`, `canEditNews`). Les clés de requête sont centralisées dans `query-keys.ts` |
| AC-DH-29 | Affichage du tableau de bord en moins de 3 s sur mobile, à vérifier sur un club de plusieurs dizaines d'équipes. Contrastes AA vérifiés sur le thème sombre, notamment les puces inactives et les pastilles de statut |
| AC-DH-30 | Non-régression : les vues Coach et Joueur (tableau de bord, Calendrier, création de convocation), le fil Actus des autres rôles, le Menu et la console `/admin/news` sont inchangés en rendu et en comportement |

## 5. Note pour designer-agent

- **Maquette** : seulement `docs/designs/authorized-officer/[v4] [Dirigeant] Mob - Dashboard.png` (statut `instantané seul`, **ne pas demander de lien**). Les autres écrans sont à concevoir **par composition de patrons existants** :
  - **Tableau de bord** : `CoachHeader`, `NextTrainingOrMatchCard`, `UpcomingList`, `CreateConvocationFab`, `ScheduleInfo`, `EmptyState`. Les éléments nouveaux sont les tuiles de compteurs, la rangée de puces et l'étiquette de section.
  - **Calendrier** : l'écran existant (`CalendarRangeNav`, `CalendarConvocationRow`…), avec une icône de filtre dans `CalendarHeader` et un indicateur de filtre actif. Le choix entre feuille, menu et autre sélecteur pour les sections revient à designer-agent.
  - **Console Actus mobile** : `NewsCard` comme base de ligne, `NewsStatusBadge` (trois valeurs, PO-DH-16), le filtre de statut (même famille visuelle que les puces de section), une note d'information, un `+` flottant. Écrans de création et d'édition : un seul formulaire paramétré par mode, comme `NewsFormDialog`, mais en route plein écran (`BackHeader` sticky, barre de validation sticky).
  - **Formulaire de convocation** : ajouter un bloc Section puis Équipe en tête de `CreateConvocationForm`, rendu seulement pour le Dirigeant (patron de `specs/web-create-convocation.md`).
- **À ne pas concevoir** : barre de réponses, Forme/Buts, Alertes, sélecteur d'équipe du coach, puce Basket, archivage ou suppression d'actu, données financières, lignes tappables vers le détail (PO-DH-15).

## 6. Points ouverts

| Réf. | Question | Pour qui | Bloquant ? |
|---|---|---|---|
| ~~PO-DH-01~~ | ~~Cible du `+`~~ **Tranché (2026-10-03)** : convocation sur le tableau de bord, actu sur l'onglet Actus (§1.3, §1.4) | — | — |
| ~~PO-DH-02~~ | ~~Brouillons sur mobile~~ **Tranché** : oui, console mobile avec édition, pastille, note et filtre de statut (§1.3) | — | — |
| ~~PO-DH-03~~ | ~~Écrans au-delà du tableau de bord~~ **Tranché** : Calendrier club-wide avec filtre de section par icône (§1.2). Le détail reste différé (PO-DH-15) | — | — |
| ~~PO-DH-04~~ | ~~Forme du changement de matrice~~ **Tranché** : option B. La modification est scindée de la même façon (`'news:update'`, §2), ce qui reste à confirmer à l'implémentation sans bloquer. **La confirmation du Bureau sur PO-WA-08 (Dirigeant habilité rédacteur) reste à obtenir** | Bureau | Non pour construire, à obtenir avant mise en production |
| ~~PO-DH-05~~ | ~~Accès `teams` et compteur~~ **Tranché** : RLS `teams` élargie (saison en cours) et fonction d'agrégats (§2) | — | — |
| **PO-DH-06** | **Qu'est-ce qu'un « licencié » ?** Adhésion active de la saison en cours (`memberships`, `archived_at is null`) ? Rôle Joueur dans une équipe de la saison ? Licence fédérale, qui n'existe pas en base ? Et « Sections » compte-t-il toutes les sections ou seulement celles qui ont une équipe dans la saison ? Famille de `coach-dashboard` PO-6b | Bureau + développeuse | Non pour la conception. **Oui pour la justesse** de la fonction de compteurs |
| ~~PO-DH-07~~ | ~~Lectures de maquette~~ **Tranché** : toutes les sections, pas de Basket, la carte suit le filtre. Les tuiles restent club-wide (défaut maintenu, non contredit). Pour la carte « Prochain événement », le défaut est maintenu : les trois types, puisque le libellé est « événement » | — | — |
| PO-DH-08 | Ordre de bascule de la pastille : défaut joueur → coach → dirigeant | Développeuse | Non |
| **PO-DH-09** | Journaliser la création **et surtout la modification** d'une actu, maintenant qu'un rôle non administrateur peut réécrire l'actu d'un autre auteur et qu'aucune colonne `updated_at`/`updated_by` n'existe ? Étend PO-WA-04 | Référent RGPD / Bureau | Non pour construire. **À trancher avant mise en production** |
| PO-DH-10 | MFA « recommandée aux dirigeants », plus pertinente avec des droits d'écriture mobiles | Bureau / développeuse | Non |
| PO-DH-11 | Bornes de « cette semaine » : défaut semaine calendaire du lundi au dimanche (cohérent avec `getWeekDates`), échéances passées de la semaine comprises, `cancelled` exclues | Développeuse | Non |
| PO-DH-12 | Recopier la ligne du §0 dans `DESIGN_LINKS.md` et committer `docs/designs/authorized-officer/` | Designer-agent / développeuse | Non |
| **PO-DH-13** | `specs/actus.md` AC-AT-05 (« identique pour les 8 rôles ») et §7 (« aucun point d'entrée de rédaction sur mobile ») sont contredits par cette spec, en plus de PO-WA-01. Il faut les amender (cette passe ne modifie pas `actus.md`) | Développeuse | Non pour construire. **Oui pour la recette** |
| PO-DH-14 | **Portée de l'édition** : la décision dit « chaque actu a une icône d'édition », d'où le défaut retenu : le Dirigeant voit et modifie **toutes** les actus brouillon/publiées, y compris celles d'un administrateur ou d'un autre Dirigeant (comme l'admin dans le backoffice). Alternative : ses propres actus seulement (`created_by = auth.uid()` dans les politiques `select` des brouillons et `update`). Sans incidence visuelle, l'icône est conditionnée par un booléen par ligne | Développeuse (+ Bureau) | Non. Le défaut s'applique s'il n'est pas contredit |
| PO-DH-15 | **Détail de convocation pour le Dirigeant** : différé (défaut maintenu). L'ouverture du Calendrier ne l'impose pas, mais elle rend sa demande probable : des lignes non tappables sur deux écrans se remarqueront vite. Une passe dédiée devra trancher la liste nominative des répondants (fondée par « Voir les dossiers des autres membres ✅ », mais la RLS des réponses exclut aujourd'hui le Dirigeant), les contrôles `'mission:manage'` déjà accordés et la branche `authorized-officer` de `hasActiveRoleForConvocation` | Développeuse | Non pour cette passe |
| PO-DH-16 | **Pastille d'une actu publiée expirée** : la décision dit « brouillon / publiée ». Le défaut retenu ajoute « Expirée » (logique `NewsStatusBadge`), pour que la console ne présente pas comme visible une actu que les membres ne voient plus. Le filtre « Publiées » inclut les expirées | Développeuse | Non. Le défaut s'applique s'il n'est pas contredit |
| PO-DH-17 | **Nombre de destinataires dans le formulaire de convocation du Dirigeant** : le coach le fournit via `activeMemberCount`. Pour le Dirigeant, faut-il l'exposer par équipe (extension de la fonction d'agrégats) ou l'omettre ? Défaut : omis, mention absente | Développeuse | Non |
| PO-DH-18 | `useCreateConvocationViewModel` reçoit aujourd'hui `teamId` par l'état de route, qui est perdu au rechargement (TODO existant). Avec un sélecteur d'équipe sur l'écran, le Dirigeant n'a plus ce problème, mais les deux sources (état de route pour le coach, sélecteur pour le Dirigeant) devront coexister proprement dans le ViewModel | Développeuse (implémentation) | Non |
| PO-DH-19 | Renommer `'news:write'` (désormais limité à l'archivage et à la console) en `'news:archive'` ou équivalent ? Hors périmètre de cette passe | Développeuse | Non |

## Transmission

**Prêt pour transmission à designer-agent : oui.** Aucun point ouvert restant ne porte sur la mise en page :

- **PO-DH-14, PO-DH-16 et PO-DH-17** ont un défaut appliqué, sans incidence structurelle sur la conception ;
- **PO-DH-06** porte sur la justesse d'une valeur ;
- **PO-DH-09 et PO-DH-04** (confirmation du Bureau) sont à trancher avant la mise en production ;
- **PO-DH-13** est à traiter avant la recette.

Un seul écran a une maquette (le tableau de bord). Calendrier Dirigeant, console Actus mobile et bloc Section/Équipe du formulaire de convocation sont à composer à partir des patrons listés au §5.

## UI design

> Rédigé par designer-agent le 2026-10-03. Références ouvertes pour cette section : `docs/designs/authorized-officer/[v4] [Dirigeant] Mob - Dashboard.png` (statut `instantané seul`, aucun lien demandé), `docs/designs/v4_coach_dashboard.png`, `docs/designs/calendar/[v0] [Coach] Mob - Calendrier.png`, `docs/designs/actus/[v0] Mob - Actus.png`, `docs/designs/create-convocation/[v3] [Coach] Mob - Create convocation - {match 1,training,meeting}.png`, `docs/designs/desktop/actus/[Admin] Web - Actus-{2,3}.png` (console et dialogues backoffice). Les permissions ne sont pas redéfinies ici : tout renvoie au §2 (RBAC) et aux booléens `canCreateConvocation`, `canCreateNews`, `canEditNews` calculés par les ViewModels (AC-DH-28). Règle de rendu constante : un contrôle non autorisé est **absent, jamais grisé**.

### 0. Principes communs

- **Palette et primitives** : mêmes jetons « palette fixe » que les écrans coach (`bg-coach-bg`, `coach-green`, `coach-red-text`, `text-white/xx`). Les primitives shadcn déjà vendorées suffisent : `Button`, `Input`, `Textarea`, `Select`, `Label`, `Badge`, `Alert`, `Skeleton`, `ToggleGroup`, `Popover`, `RadioGroup`, `AlertDialog`, `Avatar`. **Aucun `npx shadcn add` n'est requis** (pas de `Sheet`, voir l'écran 2).
- **Cibles tactiles** : tout contrôle interactif a une cible ≥ 44 px (`h-11` / `size-11`), à surcharger au site d'appel (CLAUDE.md §6). Les champs reprennent `FIELD_CLASSNAME` (`convocation/components/field-style.ts`), pas le `h-8` par défaut de shadcn.
- **Paires côte à côte** : chaque item de grille/flex porte `min-w-0`. Les rangées de dates reprennent `FIELD_ROW_CLASSNAME` (`grid-cols-[repeat(auto-fit,minmax(130px,1fr))]`) avec `DateTimeInput` : la colonne se réduit à sa largeur, le champ natif ne déborde pas sur son voisin. À vérifier sur un viewport mobile réel (AC-DH-26).
- **Étiquette de section** (nouvelle, très petite) : texte seul, `text-[11.5px] font-extrabold`, aligné à droite de la ligne ou du coin de carte, comme dans la maquette (« Football » en rouge, « E-Sport » en vert). Toujours **du texte**, jamais une couleur seule (AC-DH-11). La couleur de teinte est portée par une table de correspondance `section.type → classe` côté présentation ; un type sans entrée (`echecs`, `domino`, section future) retombe sur le neutre `text-white/70`. Utiliser les variantes `*-text` des jetons pour tenir le contraste AA sur fond noir (AC-DH-29).
- **Équipe sans section** (`section_id` nul) : étiquette textuelle neutre « Sans section », visible seulement sous « Toutes » (règle du filtre, §1).
- **Pastille de rôle en compte multi-rôles** : la `Pill` de `CoachHeader` est reprise telle quelle, avec le libellé `formatRole('authorized-officer')` = « Dirigeant habilité ». Le chevron `▾` n'apparaît que si le compte a au moins deux rôles de tableau de bord distincts. Un tap appelle `toggleActiveRole` et fait passer à la vue suivante (joueur, coach, dirigeant, PO-DH-08). Pour un compte à un seul rôle, la pastille est rendue non cliquable (même rendu `disabled` que la `Pill` d'équipe mono-équipe du coach). Le Calendrier et l'onglet Actus n'ont **pas** de pastille de rôle (AC-CA-07, `NewsPage`) : le changement de rôle se fait uniquement depuis le tableau de bord, et ces deux écrans reflètent le rôle actif au moment où on les ouvre.

### 1. Tableau de bord Dirigeant (nav : Dashboard)

Route racine du tableau de bord, choisie par `DashboardIndexPage` quand le rôle actif est `authorized-officer`. Nouvelle page `DirigeantDashboardPage` + ViewModel, à côté de `CoachDashboardPage` (le coach n'est pas paramétré : les deux vues ne se ressemblent pas assez pour justifier des props qui allument/éteignent la moitié de l'écran).

Structure, de haut en bas, conforme à la maquette `[v4] [Dirigeant] Mob - Dashboard.png` :

1. **En-tête** : reprise de `CoachHeader` en `sticky top-0` (fond opaque `bg-coach-bg`, image de fond dégradée). Pastille de rôle à gauche, **avatar/initiales seul à droite** (menant au profil, `size-9.5`, bordure `coach-red`). Pas de bouton Alertes, pas de pastille d'équipe, pas de repère de jour. Titre « Bonjour, {prénom} » en `text-[30px] font-black`. Ligne de contexte « Club entier · {N} sections · {M} licenciés » avec un `Dot` neutre (`bg-white/40`, comme la maquette ; le coach utilise un point vert). Variante de composant : `CoachHeader` reçoit aujourd'hui des props propres au coach (équipes, alertes) ; l'implémentation peut soit en extraire un `DashboardHeader` commun, soit créer un `DirigeantHeader` frère. Dans les deux cas, ne pas passer de props « factices » au `CoachHeader`.
2. **Trois tuiles** : `grid grid-cols-3 gap-3`, chaque tuile `min-w-0`, `rounded-2xl border border-white/10 bg-white/5`, nombre en `text-[22px] font-extrabold` centré, libellé en dessous en `text-[12px] font-semibold text-white/60`, qui **passe à la ligne** (« Événements cette semaine » tient sur deux lignes dans la maquette). Tuiles **non interactives** (pas de `role="button"`, pas de survol) : pas de porte vers un écran inexistant. Elles ne suivent pas le filtre (AC-DH-05). Hauteur égale : `items-stretch`.
3. **Filtre par section** : sur-titre « FILTRER PAR SECTION » (`text-[12px] font-bold tracking-wider uppercase text-white/50`), puis la rangée de puces. Composant : **`ToggleGroup` shadcn en mode `single`** (déjà vendoré), une entrée « Toutes » puis une par ligne de `public.sections` (ordre de la base). Rendu : conteneur `overflow-x-auto` sans barre de défilement (même technique que `TabsList` dans `ConvocationDetailPage`), `flex gap-2 px-5.5 -mx-5.5` pour que la rangée saigne jusqu'au bord, **la dernière puce visiblement coupée** à droite comme dans la maquette (indice de défilement). Chaque puce `h-11 shrink-0 rounded-full px-4`, texte `text-[14px] font-semibold` ; **inactive** : `border border-white/12 bg-white/5 text-white/80` ; **active** : fond blanc, texte noir, comme la maquette. Le ViewModel ignore une valeur vide (retap sur la puce active ne la désélectionne pas : « Toutes » est le seul état neutre). La puce active est amenée dans la zone visible à l'ouverture (le filtre est partagé avec le Calendrier, AC-DH-15). *Écart assumé avec la maquette* : les puces y mesurent environ 30 px de haut ; elles passent à 44 px pour respecter la cible tactile (CLAUDE.md §6), le surcoût vertical est de 14 px.
4. **Carte « Prochain événement »** : `rounded-2xl border border-white/10 bg-white/5 p-5`, sur-titre « PROCHAIN ÉVÉNEMENT » en vert (`coach-green-label`), étiquette de section en haut à droite, titre `text-[20px] font-extrabold` et ligne « Jeudi 18h30 · Stade municipal » en `ScheduleInfo`. Le titre suit la maquette : type + « — » + nom d'équipe (« Entraînement — Seniors Football »), le nom d'équipe étant l'information qui distingue deux échéances d'une même section. **Carte non tappable** : pas de `role="button"`, pas de chevron, pas de `cursor-pointer` (AC-DH-16). Pas de barre de réponses (AC-DH-12). Variante sans réponses de `NextTrainingOrMatchCard` ou composant frère `NextEventCard` : à l'implémentation de trancher, tant que la carte coach n'est pas polluée de props conditionnelles.
5. **Liste « À venir — {section} »** : en-tête `flex items-baseline justify-between` : titre `text-[15px] font-extrabold` (« À venir — E-Sport », « À venir — Toutes les sections » sous « Toutes ») et lien « Voir le calendrier » (`text-coach-green-link`, **zone de tap portée à `h-11`** : le « Voir tout » du coach est plus petit, ne pas le copier tel quel). Lignes : reprise de la ligne de `UpcomingList` (liseré de type `CONVOCATION_TYPE_ACCENT`, titre `text-[13.5px] font-bold`, ligne date/lieu) mais **sans le badge `x/y` de réponses**, remplacé par l'étiquette de section à droite. Lignes **non tappables** (retirer le `onClick`, pas de `cursor-pointer`). Liseré : il suit le **type** de la convocation comme partout ailleurs ; la maquette le montre vert pour un tournoi d'e-sport, ce qui est cohérent avec la teinte du type « match » existante et ne crée aucune règle nouvelle. Nombre de lignes : celui que le coach affiche déjà (ne pas inventer une limite).
6. **Bouton flottant `+`** : `CreateConvocationFab` réutilisé tel quel (`fixed right-6 bottom-24`, `size-13`, `coach-green`, libellé accessible « Créer une convocation »), rendu seulement si `canCreateConvocation`. Prévoir `pb-28` en bas du contenu (contre `pb-16` chez le coach) : l'ajout d'une longue liste ne doit pas laisser la dernière ligne sous le bouton.
7. **Nav basse** : inchangée.

**États**

- *Chargement* : l'en-tête s'affiche immédiatement (prénom et initiales viennent de la session). Tuiles, carte et liste montrent des `Skeleton` (3 tuiles, 1 carte, 3 lignes). Les puces, issues de `public.sections`, ont leur propre squelette (4 puces) : ne pas bloquer le reste de l'écran dessus.
- *Erreur globale* (échec de lecture des convocations) : message `role="alert"` « Impossible de charger les échéances. » + bouton « Réessayer » `h-11` à la place de la carte et de la liste, l'en-tête et les puces restent. *Erreur des seuls compteurs* : les tuiles affichent « — » à la place du nombre et la ligne de contexte omet la partie manquante ; le reste de l'écran n'est pas bloqué, la mention est sobre, pas de bandeau d'alarme.
- *Vide, section sans échéance* : la carte devient « Aucun événement à venir en {section} » (texte `text-white/60`, même gabarit de carte, jamais la carte d'une autre section, AC-DH-10) et la liste « Aucune échéance à venir ». *Vide, club entier ou pas de saison en cours* : « Aucun événement à venir » / « Aucune saison en cours », avec le même gabarit ; l'état « pas de saison » ne propose pas le `+` d'action supplémentaire (le FAB reste régi par `canCreateConvocation`).
- *Équipes sans section* : leurs échéances apparaissent sous « Toutes » avec l'étiquette « Sans section », et sont absentes dès qu'une section est choisie.
- *Section ajoutée en base* : une puce de plus apparaît sans changement de code (AC-DH-07).

### 2. Calendrier — variante Dirigeant (nav : Calendrier)

Même écran `CalendarPage` (bascule Sem/Mois `RangeModeToggle`, `CalendarRangeNav`, `WeekDayStrip` / `MonthGrid`, liste du jour), sélectionnée par le rôle actif. Référence : `docs/designs/calendar/[v0] [Coach] Mob - Calendrier.png`. Les états vides, la bande de jours et la grille sont repris de `specs/calendar.md`.

- **Icône de filtre dans l'en-tête** : `CalendarHeader` n'a volontairement pas d'emplacement à droite (AC-CA-07 interdit l'avatar). On lui ajoute une prop optionnelle `filterSlot` (ou `onFilterClick` + `isFilterActive`) : un `Button` `size-11` rond (`bg-white/8`, comme le bouton Alertes du coach), icône `IconFilter` (Tabler, déjà la bibliothèque du dépôt), `aria-label="Filtrer par section"`, placé à droite de la ligne titre / mois-année. **Rendu seulement pour le rôle actif Dirigeant** : la prop est absente pour le coach et le joueur, leur en-tête reste identique (AC-DH-30). L'AC-CA-07 reste vrai : l'icône n'est pas un avatar ni une pastille de rôle.
- **Sélecteur de section** : un **`Popover` shadcn ancré à l'icône** (déjà vendoré, donc rien à installer), contenant un `RadioGroup` « Toutes » + une ligne par section, chaque ligne `h-11` pleine largeur avec le libellé à gauche et la coche de la valeur active. Choix à la place d'une feuille basse : `Sheet` n'est pas dans le dépôt, il introduirait une primitive et un patron d'ouverture nouveaux pour un choix à 5 valeurs. Un choix ferme le popover et applique le filtre immédiatement (pas de bouton « Appliquer »). Alternative si la développeuse préfère la feuille : voir Q-UI-03.
- **Indicateur de filtre actif** : un filtre actif ne doit jamais être caché (§1.2). Deux signes cumulés, aucun n'étant une couleur seule : (a) un petit point `coach-green` sur l'icône de filtre, doublé de `aria-label="Filtrer par section, E-Sport actif"` ; (b) **une puce descriptive sous l'en-tête**, « Section : E-Sport ✕ » (`IconX`), `h-11`, `rounded-full`, qui **retire le filtre d'un tap** (retour à « Toutes »). Absente sous « Toutes ».
- **Lignes** : `CalendarConvocationRow` en mode « sans réponses » : liseré de type, titre (avec suffixe adversaire pour un match), `ScheduleInfo` (adversaire, RDV), pastille `cancelled`, score d'un match passé, **plus l'étiquette de section** à droite du titre. **Ni** `ResponseBar`, `ResponseCountsRecap`, `AttendanceConfirmationAlert`, ni `ResponseActions` (AC-DH-16). **Lignes non tappables** : retirer `role="button"`, `tabIndex`, le `onClick` et le `min-h-11` de cible (une ligne qui ne mène nulle part ne doit pas se présenter comme un bouton ni recevoir le focus clavier). Le composant doit donc accepter `onOpen` optionnel et un bloc de réponses de type « aucun ».
- **État vide filtré** : « Aucun événement pour {section} ce jour » + bouton de texte « Afficher toutes les sections » `h-11` (remet « Toutes »). L'état vide sans filtre reste celui du calendrier existant. Les puces de type de la bande et de la grille se recalculent selon le filtre.
- **Chargement / erreur** : repris du Calendrier existant, sans état propre au Dirigeant.

### 3. Actus — console de rédaction du Dirigeant (nav : Actus)

`NewsPage` garde le fil de lecture pour tous les autres rôles actifs. Pour `authorized-officer`, une vue console remplace la liste (composant distinct `NewsManagementList`, **pas** des props conditionnelles sur `NewsCard`, qui reste le composant de lecture, cf. `docs/designs/actus/[v0] Mob - Actus.png`). Sources visuelles : `NewsCard` pour le gabarit de ligne et la console web (`docs/designs/desktop/actus/[Admin] Web - Actus-{2,3}.png`) pour les informations affichées.

Structure :

1. **Titre** « Actus du club » et liseré tricolore : identiques au fil.
2. **Note d'information** : `Alert` shadcn (variante par défaut, pas destructive) avec `IconInfoCircle`, texte « Les brouillons ne sont pas visibles des membres. », `text-[13px]`. Permanente et non fermable : elle porte une garantie, pas une astuce.
3. **Filtre de statut** : `ToggleGroup` `single`, **même famille visuelle que les puces de section** (§1 point 3) mais **trois entrées qui se partagent la largeur** (`flex` avec `flex-1 min-w-0`, `h-11`) : « Toutes » / « Brouillons » / « Publiées ». Pas de défilement horizontal : trois libellés courts tiennent à 320 px. « Toutes » par défaut, non désélectionnable. « Publiées » inclut les expirées (§1.3).
4. **Liste** : séparateur `border-b border-white/8` entre les entrées, comme le fil. Chaque entrée :
   - ligne méta : date (`published_at`, jamais `created_at`) en `text-[11.5px] font-extrabold tracking-wider text-coach-green-label`, avec la **pastille de statut** à droite de la date ; pour un brouillon sans date, la mention « Sans date » en `text-white/50`, **pas** de date de création de substitution ;
   - titre `text-[16px] font-bold` (deux lignes maximum, `line-clamp-2`) ;
   - extrait du contenu `line-clamp-2`, `text-[13.5px] text-white/60`, **sans « Voir plus »** (le texte intégral est dans l'écran d'édition) ;
   - **icône d'édition** `IconPencil`, bouton `size-11` en haut à droite de l'entrée, `aria-label="Modifier l'actu {titre}"`, rendue seulement si `canEditNews` pour cette ligne (booléen par ligne, PO-DH-14). La zone de titre/extrait doit réserver cette colonne (`min-w-0 flex-1` + bouton `shrink-0`) pour que l'icône ne chevauche jamais le texte.
   - **Aucun** contrôle d'archivage ni de suppression (AC-DH-22). La ligne entière n'est pas tappable, seule l'icône l'est (une seule cible d'édition, sans ambiguïté avec le tap pour déplier du fil).
   - Un lien externe n'est pas affiché dans la liste (il se voit à l'édition).
5. **Pastille de statut** : `NewsStatusBadge` réutilisé (Brouillon neutre, Expirée rouge, publiée verte, toujours texte + couleur). *Écart de libellé à trancher à l'implémentation* : le composant backoffice affiche « **Active** » pour une actu visible, alors que la décision mobile dit « Publiée ». Position : ajouter une prop de libellé (ou un petit mappage côté mobile) pour afficher « Publiée » sur mobile **sans changer** le libellé « Active » de la console web (AC-DH-30). Non bloquant, voir Q-UI-04.
6. **Bouton flottant `+`** : même position et même gabarit que `CreateConvocationFab` (`fixed right-6 bottom-24 size-13 rounded-full bg-coach-green`), `aria-label="Créer une actu"`, rendu seulement si `canCreateNews`. Le composant actuel codant en dur son libellé, l'extraire en FAB partagé avec une prop `label` (déplacement dans `presentation/shared/components/`, le coach-dashboard l'importera depuis là). `pb-28` en bas de liste pour dégager le dernier élément.

**États** : *Chargement* : 3 lignes `Skeleton` (date + titre + 2 lignes d'extrait) sous la note et le filtre, qui restent affichés. *Erreur* : `role="alert"` « Impossible de charger les actus. » + « Réessayer » `h-11`. *Vide* : un message par filtre, jamais une erreur : « Aucune actu pour le moment » (Toutes), « Aucun brouillon » (Brouillons), « Aucune actu publiée » (Publiées), via `EmptyState` ou le texte `text-[13px] text-white/50` du fil actuel ; le `+` reste présent dans tous les cas. *Succès d'une création ou d'une édition* : retour à la liste, qui est rechargée (AC-DH-23). Après une création, la liste se replace sur le filtre qui montre la nouvelle actu : le filtre de statut n'est pas modifié automatiquement ; si l'actu créée ne correspond pas au filtre actif, un message bref (toast ou ligne `role="status"`) « Actu enregistrée en brouillon / publiée » confirme l'enregistrement. La confirmation visuelle repose donc sur ce message, pas sur l'apparition de la ligne.

### 4. Écrans de création et d'édition d'actu (plein écran, sans nav basse)

Routes poussées par-dessus l'onglet Actus (création et édition : un seul composant `NewsEditorPage` paramétré par mode, comme `NewsFormDialog` l'est pour le backoffice, avec un `key` qui remonte le formulaire quand la cible change). Sans `AppShell` / nav basse (comme `convocations/new`).

- **En-tête** : `BackHeader` partagé (`presentation/shared/layout/BackHeader`), déjà `sticky top-0` à fond opaque (CLAUDE.md §6). Titres « Nouvelle actu » / « Modifier l'actu ».
- **Champs**, dans l'ordre (mêmes champs et mêmes validations que `NewsFormDialog`, qui reste l'autorité fonctionnelle), via `FormField` + `FIELD_CLASSNAME` ; libellés `text-xs font-semibold tracking-wider uppercase` comme le dialogue :
  1. **Titre** : `Input` `h-11`.
  2. **Contenu** : `Textarea` `rounded-xl`, `rows={6}` sur mobile (le dialogue web en a 3), `text-base` pour éviter le zoom de saisie iOS, redimensionnement vertical désactivé.
  3. **Statut** : `Select` `h-11` « Brouillon » / « Publiée » (pas de 3ᵉ option : jamais « Archivée », cf. §1.3). Un `Select` plutôt qu'un interrupteur à deux positions pour rester à parité avec le backoffice et ne pas associer vert/rouge à un statut.
  4. **Dates**, **côte à côte** : « Date de publication » et « Expiration (optionnel) », `FIELD_ROW_CLASSNAME` avec `DateTimeInput type="date"`, chaque `FormField` en `min-w-0`. Pour éviter une rangée aux libellés de hauteurs différentes, les deux libellés tiennent sur une ligne ; l'obligation de la date de publication pour une actu publiée est portée par un `*` dans le libellé quand le statut vaut « Publiée », et par une ligne d'aide sous la rangée « Facultative pour un brouillon » quand il vaut « Brouillon ». Repli à une colonne si le contrôle natif ne tient pas à 320 px (c'est ce que fait déjà `auto-fit`).
  5. **Lien (optionnel)** : `Input type="url"` `inputMode="url"` `h-11`, placeholder `https://...`.
- **Barre de validation** : `sticky bottom-0` avec le même dégradé, `pb-[max(1.25rem,env(safe-area-inset-bottom))]`, reprise de la barre de `CreateConvocationForm` : un bouton plein largeur `rounded-full` blanc / texte noir, libellés « Créer l'actu » / « Enregistrer » et, pendant l'envoi, « Création… » / « Enregistrement… » (mêmes verbes que le dialogue web). Désactivé tant que `canSubmit` est faux (titre, contenu, date si publiée). Pas de bouton « Annuler » : la flèche de l'en-tête joue ce rôle, comme l'écran de convocation. Contenu défilant avec `pb-28` pour que le dernier champ ne reste pas sous la barre.
- **Erreur d'enregistrement** : les saisies sont conservées. Message en français dans un `Alert variant="destructive"` `role="alert"` en tête de formulaire (sous l'en-tête sticky, remonté en vue avec `scrollIntoView`), jamais un message brut de Supabase (AC-DH-23). Les erreurs de validation de champ restent en ligne sous le champ, en `text-[12px] font-semibold text-coach-red-text`, comme `fieldError` du formulaire de convocation.
- **Sortie avec saisies non enregistrées** : si le formulaire est modifié, la flèche de retour ouvre un `AlertDialog` « Abandonner les modifications ? » (Abandonner / Continuer), sur le modèle de `LineupDiscardDialog`. Sans modification, le retour est immédiat. Ajout de conception, non demandé : retirable sans impact sur le reste (Q-UI-05).
- **Édition, états propres** : (a) *chargement* de l'actu : squelettes de champs sous l'en-tête ; (b) *introuvable* (actu archivée entre-temps par un administrateur, ou lien périmé) : état vide `EmptyState` « Cette actu est introuvable » + bouton « Retour » `h-11` (même patron que `NotFoundState`) ; (c) *édition d'une actu publiée et expirée* : formulaire normal, la date d'expiration passée est simplement visible ; aucun avertissement supplémentaire. Le formulaire est pré-rempli et met à jour la **même ligne**.

### 5. Formulaire de convocation — bloc Section puis Équipe (Dirigeant)

`CreateConvocationForm` (route `convocations/new`, référence : `docs/designs/create-convocation/[v3] [Coach] Mob - Create convocation - *.png`) reste identique pour le coach (équipe héritée par `location.state`, aucun sélecteur, `RecipientsCard` conservée, AC-DH-17/30). Pour le rôle actif Dirigeant atteignant l'écran **sans** `teamId`, un bloc est ajouté **en tête**, avant `TypeSelector` :

- **Section** : `FormField` « Section » + `Select` `h-11` (`FIELD_CLASSNAME`), une entrée par ligne de `public.sections`. Pré-remplie avec le filtre actif du tableau de bord quand il n'est pas « Toutes » ; modifiable.
- **Équipe** : `FormField` « Équipe » + `Select` `h-11`, limité aux équipes de la saison en cours de la section choisie. **Désactivé** tant qu'aucune section n'est choisie, placeholder « Choisir d'abord une section ».
- **Disposition : deux champs empilés, pas côte à côte.** Les noms d'équipe sont longs (« Seniors Football ») et un `Select` côte à côte les tronquerait à 320 px. Si l'implémentation choisit malgré tout une rangée, chaque colonne porte `min-w-0` et la valeur du `Select` se tronque avec des points de suspension (`truncate`) ; ce n'est pas la recommandation.
- Les deux champs sont obligatoires. Tant que l'un manque, le bouton « Créer la convocation » reste désactivé et `fieldError` indique « Choisissez une section puis une équipe. » (même emplacement que les autres erreurs du formulaire).
- **Champs dépendants de l'équipe** (adversaire d'un match, lieu d'entraînement) : visibles mais **désactivés** avec le placeholder « Choisir d'abord une équipe » tant qu'aucune équipe n'est choisie ; ils se chargent ensuite. **Changer d'équipe** remet l'adversaire à son placeholder (sans message). Les champs indépendants de l'équipe (type, date, heure, lieu libre, réunion) restent utilisables dès l'ouverture.
- **États du sélecteur d'équipe** : *chargement* : placeholder « Chargement des équipes… » et champ désactivé ; *erreur* : texte `role="alert"` « Impossible de charger les équipes. » + « Réessayer » `h-11` (patron des lieux d'entraînement, `retryLoadTrainingLocations`) ; *section sans équipe cette saison* : liste désactivée et ligne d'aide « Aucune équipe cette saison pour cette section. » en `text-[12px] text-white/60`, jamais une liste vide silencieuse.
- **`RecipientsCard`** : **absente** pour le Dirigeant (PO-DH-17, défaut maintenu : mention omise, pas affichée à zéro). Elle reviendra si le comptage par équipe est décidé.
- Le cas « équipe introuvable » de l'écran du coach (`!vm.hasTeam`) ne s'applique pas au Dirigeant : l'absence d'équipe est un état normal du formulaire, pas une impasse.

### 6. Récapitulatif des composants

| Composant | Nature | Primitives shadcn / existant réutilisé |
|---|---|---|
| `DirigeantDashboardPage` | Nouveau | `Skeleton`, `Button`, `EmptyState` ; `Pill`, `Dot`, `Avatar` via l'en-tête |
| En-tête Dirigeant | Variante de `CoachHeader` | Voir §1 point 1 |
| Tuile de compteur | Nouveau (très simple) | div stylée avec les jetons coach, pas de primitive |
| Rangée de puces de section | Nouveau patron (aucun filtre à puces n'existe dans le dépôt, la maquette l'impose) | `ToggleGroup` `single` |
| Étiquette de section | Nouveau (texte) | — |
| Carte « Prochain événement » Dirigeant | Variante sans réponses / non tappable | `ScheduleInfo` |
| Ligne « À venir » Dirigeant | Variante de la ligne `UpcomingList` | `CONVOCATION_TYPE_ACCENT`, `ScheduleInfo` |
| FAB `+` | Existant, à rendre générique (`label`) | `Button` |
| Filtre de section du Calendrier | Nouveau | `Popover` + `RadioGroup`, `Button` |
| Puce « Section : X ✕ » | Nouveau (petit) | `Button` ou `Badge` + `IconX` |
| `CalendarConvocationRow` sans réponses | Variante (props optionnelles) | existant |
| `NewsManagementList` + ligne | Nouveau | `Alert`, `ToggleGroup`, `Badge`, `Skeleton`, `NewsStatusBadge` |
| `NewsEditorPage` | Nouveau (route plein écran) | `BackHeader`, `FormField`, `Input`, `Textarea`, `Select`, `DateTimeInput`, `Alert`, `AlertDialog`, `Button` |
| Bloc Section / Équipe | Nouveau dans `CreateConvocationForm` | `FormField`, `Select` |

**Justification des nouveaux patrons** (règle : réutiliser d'abord) : la rangée de puces et les tuiles viennent de la maquette, donc ne sont pas inventées ; le filtre de statut des Actus est la même famille visuelle que la rangée de puces ; le sélecteur du Calendrier compose un `Popover` et un `RadioGroup` déjà présents ; la console Actus est une composition de patrons existants (§5 de la spec). Aucun composant n'est « genuinely new » au point d'exiger un prototype avant de poursuivre ; la question d'un prototype optionnel est posée en Q-UI-03.

### 7. Contraintes tactiles et accessibilité — à vérifier à l'implémentation

- Cibles ≥ 44 px : puces, icône de filtre, icône d'édition, FAB (`size-13`), champs, boutons « Réessayer », lien « Voir le calendrier ».
- Les deux rangées de `ToggleGroup` exposent un nom accessible (« Filtrer par section », « Filtrer par statut ») et l'état sélectionné ; la couleur n'est jamais le seul signe (puce active = fond blanc **et** `aria-checked`, pastilles de statut = texte, étiquettes de section = texte).
- Contrastes AA à mesurer sur fond noir : puces inactives, étiquettes de section teintées, pastilles « Brouillon » et « Expirée », texte `text-white/50` des états vides (AC-DH-29).
- Écrans poussés : `BackHeader` `sticky top-0` opaque, barre de validation `sticky bottom-0`, `safe-area-inset` respectées (AC-DH-26).

### 8. Questions UI ouvertes

**Aucune question bloquante.** Les points ci-dessous ont un défaut appliqué, sans incidence sur la structure des écrans ; ils ne résolvent aucun point PO-DH ouvert.

| Réf. | Question | Défaut appliqué |
|---|---|---|
| Q-UI-01 | **Teintes des sections.** La maquette ne montre que Football (rouge) et E-Sport (vert). Quelle teinte pour `echecs`, `domino` et toute section future ? | Neutre `text-white/70` pour tout type sans entrée dans la table de correspondance |
| Q-UI-02 | **Point rouge sur l'avatar** de la maquette : sa signification n'est définie dans aucune spec (le coach n'a pas ce signal, son badge d'alertes est ailleurs). | Non rendu ; à reprendre si une notification Dirigeant est décidée |
| Q-UI-03 | **Sélecteur de section du Calendrier** : `Popover` (défaut, rien à installer) ou feuille basse (`npx shadcn add sheet`, plus ergonomique au pouce mais nouvelle primitive et nouveau patron d'ouverture) ? Et souhaitez-vous un prototype Claude Design (export PNG) pour le Calendrier filtré et la console Actus, qui n'ont aucune maquette ? | `Popover` ; pas de prototype requis pour avancer |
| Q-UI-04 | **Libellé « Publiée » (mobile) contre « Active » (console web)** pour `NewsStatusBadge`. Faut-il aligner la console web sur « Publiée » (hors périmètre, AC-DH-30) ? | Libellé propre au mobile, web inchangé |
| Q-UI-05 | **Confirmation avant d'abandonner un formulaire d'actu modifié** (`AlertDialog`) : ajout de conception non demandé. | Inclus ; retirable |
| Q-UI-06 | **Équipe sans section et création de convocation** : le parcours Section puis Équipe ne permet pas de choisir une équipe dont `section_id` est nul, alors qu'elle apparaît sous « Toutes » au tableau de bord. Ajouter une entrée « Sans section » au sélecteur, ou considérer ce cas comme un défaut de données que l'administrateur corrige ? | Non proposée dans le sélecteur (le formulaire suit la spec §1.4 à la lettre) |
| Q-UI-07 | **Titre des échéances** : « Type — nom d'équipe » comme dans la carte de la maquette, dont la source (nom d'équipe) dépend de la lecture de `teams` accordée par PO-DH-05. Le titre « Tournoi E-Sport régional » de la ligne de liste de la maquette ne correspond à aucun champ du modèle de convocation actuel (type, adversaire, titre de réunion) ; il n'est donc pas reproduit. | Type + nom d'équipe, avec suffixe adversaire / titre de réunion comme `CalendarConvocationRow` |
| Q-UI-08 | **Changement de rôle depuis le Calendrier ou les Actus** : ces deux écrans n'ont pas de pastille de rôle (AC-CA-07), un compte multi-rôles ne sait donc pas quelle vue il regarde autrement que par le filtre / la note. Acceptable ? | Oui ; le changement reste sur le tableau de bord |

**Conséquence sur les points PO** : cette conception ne touche ni PO-DH-06 (définition de « licencié », porte sur la justesse du compteur), ni PO-DH-09, PO-DH-13, PO-DH-15 (lignes non tappables, conformément à AC-DH-16). PO-DH-12 : la ligne du registre `docs/designs/DESIGN_LINKS.md` §2 a été ajoutée par designer-agent le 2026-10-03 ; `docs/designs/authorized-officer/` reste à committer par la développeuse.
