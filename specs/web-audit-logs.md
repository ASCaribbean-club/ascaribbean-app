# Spec — Backoffice web : journal d'audit (`web-audit-logs`)

> Statut : **rédaction initiale du 2026-09-30** (product-owner-agent), à partir d'une **séance de cadrage avec la développeuse** dont les décisions sont reprises ci-dessous **comme tranchées, pas comme propositions** (§2). Aucune question ouverte ne bloque le handoff vers designer-agent (§7).
> Cette tranche **crée l'infrastructure d'audit du dépôt** — la table, la vue de lecture, la politique RLS, l'action RBAC et l'écran de consultation. Elle **ne branche aucun émetteur** : aucune ligne ne sera écrite par l'application tant que les passes suivantes (une par action tracée) n'auront pas été faites. C'est volontaire et c'est le point le plus important à comprendre avant de lire le reste (§1).
> Sources CDC : `docs/priorisation-fonctionnelle-as-acaribbean.md` (exigence transversale **§11.3 « Journal d'audit »**, non négociable dès le P0 ; matrice RBAC, lignes « **Consulter le journal d'audit** » et « Consulter une donnée de santé »), `docs/roles-personas-as-caribbean.md` (rôle **Administrateur** : « Paramétrage, comptes, rôles, saisons, sécurité et **audit** » / « Actions sensibles journalisées » ; comptes multi-rôles), `docs/RETENTION_PURGE.md` (§2, lignes « Journal d'audit — logs techniques » et « Journal d'audit — **actions sensibles** » ; §5 « Implémentation technique » ; §6 « Ce qui reste à valider »).
> Docs d'architecture : `docs/ARCHITECTURE.md` **§3** (`domain/` pur), **§6** (ViewModel/composant passif, TanStack Query reste en `presentation/`), **§7** (RLS = sécurité réelle, policies `domain/` = ergonomie, mirroring manuel), **§11** (**où placer le journal d'audit** : trigger Postgres pour un accès, use case pour une action métier, **jamais un composant**), **§13** (arborescence). `CLAUDE.md` §3/§4/§5/§6/§7/§8/§9.
> Specs antérieures reprises **sans réinterprétation** : `specs/web-empty-state.md` (coquille backoffice, `backoffice:access`, `RequireDesktopViewport`/`RequireBackofficeSession`/`RequireBackofficeAccess`, `BackofficeEmptyState`, **PO-WE-01**, **PO-WE-04**, **PO-WE-08**, **AC-WE-13**), `specs/web-users.md` (§4 et **PO-WU-07** — « aucune infrastructure d'audit n'existe », **PO-WU-08**), `specs/web-users-role-edit-remove.md` (§4, PO-WU-07 « aggravé une seconde fois »), `specs/web-actus.md` / `specs/web-seasons.md` / `specs/section-and-teams.md` / `specs/web-memberships.md` (patrons de tableau, de badge de navigation et de politiques d'écriture du backoffice).
> Code et schéma lus pour cadrer : `supabase/migrations/20260811171754_initial_schema.sql` (`public.users`, `public.user_roles`, `private.is_admin()`, `users_select_own`), `20260901120018_convocation_responder_visibility_correction.sql` (**seul précédent de vue `security_invoker = true`** du dépôt), `20260818145523_team_active_headcount_open_access.sql` (précédent de vue `security_invoker = false`, et pourquoi), `20260918122440_web_users_write_policies.sql`, `domain/policies/{actions,rbac-matrix,can}.ts`, `presentation/features/backoffice/{backoffice-nav.ts,components/BackofficeSidebar.tsx}`, `presentation/app/router.tsx` (groupe `/admin`).
> Maquettes : `docs/designs/desktop/audit/[Admin] Web - audit - menu.png` et `… - content.png`. **Non ouvertes par l'agent PO dans cette passe** — voir §0.

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne n'existe au §2 du registre pour `web-audit-logs`.** Deux exports PNG sont pourtant déjà présents dans le dépôt (`docs/designs/desktop/audit/`, **non encore commités** au moment de la rédaction — `git status` les rend en `??`). C'est le cas déjà rencontré dix fois (`menu`, `actus`, `player-vote`, `web-empty-state`, `web-actus`, `web-seasons`, `section-and-teams`, `web-memberships`, `web-users`, `match-stats`…) : le statut applicable au sens du §4 du registre est **`instantané seul`**, et **aucun lien artifact n'est demandé**, ni maintenant ni lors d'une passe ultérieure.

L'agent PO n'écrivant que dans `specs/`, la ligne est **pré-rédigée ci-dessous, à recopier telle quelle** par designer-agent (même procédé que pour toutes les lignes précédentes) :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| web-audit-logs — **backoffice desktop : journal d'audit** (`[Admin] Web - audit - {menu,content}`) | — aucun lien fourni | 2026-09-30 | `docs/designs/desktop/audit/[Admin] Web - audit - {menu,content}.png` | **instantané seul** |

> Note à joindre à la ligne : **les deux exports ne sont pas deux écrans mais un point d'entrée et une page** — `… - menu.png` montre la navigation latérale du backoffice avec la nouvelle entrée « Journal d'audit », `… - content.png` le tableau lui-même et ses filtres. Deux points propres à ce cas : (a) **l'agent PO n'a volontairement pas ouvert ces exports** — le périmètre de cette spec vient des décisions de cadrage du 2026-09-30 et du CDC §11.3, pas d'une lecture de maquette ; designer-agent est le premier à les lire et c'est lui qui en tire la section « UI design » ; (b) **les fichiers n'étaient pas encore commités** à la rédaction de cette spec — à committer en même temps que la ligne de registre, faute de quoi le registre pointerait vers un instantané absent du dépôt, exactement ce que le §1 du registre existe pour éviter.

**Une section « UI design » sera ajoutée à la fin de ce document par designer-agent**, à partir de ces deux exports. Cette spec ne décrit aucune mise en page : elle fixe le périmètre, le modèle, les droits et les critères de recette (§7).

## 1. Périmètre

### Ce que c'est

Une **destination supplémentaire du backoffice web desktop**, `/admin/audit` (« **Journal d'audit** »), réservée à l'Administrateur : un **tableau des actions sensibles tracées** — *qui* a fait *quoi* et *quand* — **filtrable par plage de dates et par action**, paginé.

Et, en dessous de l'écran, ce que le dépôt n'a jamais eu : **la table `audit_log` elle-même**. C'est la dette transversale que **onze specs consécutives** ont signalée sans la traiter (`create-convocation` §7, `player-dashboard` §3, `match_details_page` §3, `profile-page` §3, `menu` §3, `calendar`, `coach-attendance-confirmation` §3, `player-vote` §3, `match-stats` §3, `edit-match-details` §4, `coach-team-stats` §3, `coach-alerts` §3), et que `web-users` a transformée en **PO-WU-07**, « la question ouverte la plus pressante ». Cette passe en construit **le réceptacle et la lecture** — pas l'écriture.

### Rattachement CDC

| Élément | Module / exigence CDC | Priorité |
|---|---|---|
| Table `audit_log`, vue de lecture, politique RLS | **Exigence transversale §11.3 — « Journal d'audit »**, explicitement « **non négociable dès le P0** », pas une fonctionnalité optionnelle | **P0** |
| Écran de consultation `/admin/audit` | Matrice RBAC, ligne « **Consulter le journal d'audit** » (✅ Administrateur, ❌ les sept autres) ; rôle Administrateur — « sécurité et **audit** » | **P0** |
| Rétention 3 ans des actions sensibles | `RETENTION_PURGE.md` §2 — **non implémentée ici** (§1, hors périmètre) | — |
| Surface backoffice | Non — le backoffice est une **surface de rendu**, pas un module (`specs/web-empty-state.md` §1) | — |

### Ce que cette passe livre, et dans cet ordre

1. **La table `audit_log`** — une seule, sans table de référence associée (§2.1).
2. **La vue `audit_log_entries`** (`security_invoker = true`), qui joint `public.users` pour le **nom de l'acteur** (§2.4).
3. **Une seule politique RLS** : `SELECT`, Administrateur (§2.5).
4. **Une seule action RBAC nouvelle** : `audit:read` (§3).
5. **L'écran** `/admin/audit` : tableau, filtres date + action, pagination « charger plus », états vide / chargement / erreur (§2.6).
6. **Le vocabulaire d'actions** : sept codes stables, contraints en base par un `CHECK`, miroités à la main en union TypeScript (§2.2, §2.3).

### Hors périmètre — décidé, pas ouvert

Chaque point ci-dessous est une **exclusion tranchée en séance de cadrage**, à ne pas rouvrir à l'implémentation ni à traiter comme une question en suspens :

- **Aucun émetteur.** Pas de trigger de consultation de donnée santé, aucun appel de journalisation depuis un use case (changement de rôle, correction Legacy, désactivation de compte, export, purge). **Chaque émetteur est une passe séparée, rattachée à sa propre feature** — c'est ce qui permet à celle-ci de rester courte et vérifiable. Conséquence assumée, à énoncer plutôt qu'à découvrir : **en sortie de cette passe, la table est vide et le restera**, donc l'état nominal de l'écran est son état vide (AC-AU-18).
- **Aucune table de référence `actions` / `audit_actions`.** Le vocabulaire d'actions est défini par le **code** (ce sont les triggers et les use cases qui les émettent), pas par une donnée qu'un administrateur pourrait paramétrer (§2.2).
- **Aucune politique `INSERT` / `UPDATE` / `DELETE` sur `audit_log`.** La table est **append-only du point de vue du client** : plus tard, seuls des triggers, des fonctions `SECURITY DEFINER` et le job de purge (`service_role`) y écriront (§2.5).
- **Aucune implémentation de rétention ni de purge.** Elle vit côté Supabase (job planifié), jamais dans `domain/` (`CLAUDE.md` §6, `ARCHITECTURE.md` §12.8), et fait l'objet d'une passe distincte adossée à `RETENTION_PURGE.md`.
- **La consultation du journal par l'administrateur n'est elle-même pas journalisée.** Le CDC ne trace la **lecture** que pour la donnée de santé (§11.3, §6.3) ; tracer la lecture du journal dans le journal est une décision de gouvernance, pas une lecture du CDC (§6, PO-AU-06).
- **La colonne `metadata` n'est pas rendue** dans cette passe, et **`target_id` n'est jamais résolu en un nom lisible** : aucune jointure au-delà de l'acteur (§2.4).
- **Aucun changement RBAC au-delà de `audit:read`** : ni élargissement d'une entrée existante, ni nouvelle portée, ni modification de `can.ts` (§3).
- **Aucun export** (CSV, PDF, presse-papier) du journal. Un export nominatif est lui-même une action sensible au sens du CDC §11.3 — le construire ici serait ajouter une action à tracer dans la passe qui construit le traçage (§6, PO-AU-07).
- **Aucun log technique** (connexion, navigation, action non sensible) dans cette table. `RETENTION_PURGE.md` §2 en fait une **catégorie distincte**, à durée de vie 6-12 mois contre 3 ans — les mélanger dans une table unique rendrait la politique de rétention inapplicable. La question « faut-il journaliser la connexion au backoffice ? » reste **PO-WE-08**, chez le référent RGPD, et n'est **pas** tranchée ici.
- **Aucune correction de `public.users` / `public.user_roles`** pour y ajouter `created_by` / `updated_by` / `updated_at` : c'est **PO-WU-08**, une question d'**attribution de la donnée elle-même**, distincte du journal (`specs/web-users.md` §4). Le journal ne la referme pas.
- **Aucune MFA administrateur.** `PO-WE-04` reste ouvert et non traité — mention faite ici uniquement parce que cet écran est, de tout le dépôt, celui dont la valeur de preuve dépend le plus de la robustesse de l'authentification de son unique lecteur (§4).

## 2. Modèle et règles

### 2.1 Une table, et une seule — pourquoi pas de table de référence

**Une ligne d'audit doit être auto-descriptive** : lisible dans un `pg_dump` froid ou un CSV, des années plus tard, **sans jointure pour comprendre ce qui s'est passé**. C'est l'exigence de réversibilité du CDC (§12/§21) appliquée à la trace elle-même, et c'est la raison pour laquelle :

- **il n'y a pas de table `actions`** : un code d'action résolu par jointure vers une ligne qu'une purge, une renumérotation ou un oubli d'export rendrait absente est une ligne d'audit **muette** ;
- **le vocabulaire n'est pas de la donnée** : les actions tracées existent parce qu'un trigger ou un use case les émet. Une table que l'administrateur pourrait éditer laisserait croire qu'ajouter une ligne crée une traçabilité — alors que seule l'ajout d'un **émetteur** en crée une.

La jointure vers `public.users` (§2.4) ne contredit pas ce principe : elle sert **l'affichage** (nom lisible), pas la **compréhension** (l'`actor_id` reste dans la ligne).

### 2.2 `action` — un code texte stable, contraint par `CHECK`, jamais un `ENUM`

**Forme du code : `namespace.verbe_au_passé`.** Sept codes pour cette passe, **exactement sept** :

| Code | Ce qu'il tracera (quand son émetteur existera) | Ligne du CDC §11.3 correspondante |
|---|---|---|
| `health_data.viewed` | Consultation d'une donnée de santé — **trigger Postgres** obligatoire (`ARCHITECTURE.md` §11 : la trace doit survivre à un contournement de l'application) | « consultation donnée santé » |
| `role.granted` | Assignation d'un rôle (`AssignRoleUseCase`, `AssignCoachUseCase`) | « changement de rôle » |
| `role.revoked` | Retrait d'une affectation (`RemoveRoleAssignmentUseCase`) | « changement de rôle » |
| `account.deactivated` | Désactivation d'un compte (chemin non construit à ce jour — PO-WU-05) | « création/suppression compte » |
| `legacy_points.corrected` | Correction manuelle de points ASC Legacy (module P1, non construit) | « correction points Legacy » |
| `export.nominative` | Export nominatif (aucun chemin d'export dans le dépôt à ce jour) | « export nominatif » |
| `purge.executed` | Exécution du job de purge — **`RETENTION_PURGE.md` §5.4 : « une purge est une action sensible »** | (hors §11.3, exigé par `RETENTION_PURGE.md`) |

**`CHECK` et non `ENUM`** : un type `ENUM` Postgres se modifie par `ALTER TYPE`, non transactionnel en pratique et pénible à faire reculer ; un `CHECK` sur du `text` se remplace par un `drop constraint` / `add constraint` ordinaire dans une migration, et reste **lisible tel quel** dans un dump. Conséquence à assumer : **ajouter un code est une migration**, pas une ligne de données — c'est le prix de l'absence de table de référence (§2.1), et c'est délibéré.

**Écart connu et borné avec le CDC §11.3, à énoncer plutôt qu'à masquer** : la liste du CDC nomme aussi « **modification paiement** » et « **création** de compte », qui n'ont **pas** de code dans ce lot initial. Ce n'est pas un oubli mais la conséquence directe de « aucun émetteur dans cette passe » : un code sans émetteur est du vocabulaire mort. `payment.recorded` et le code de création de compte (invitation) seront ajoutés **par la passe de leur émetteur respectif**, chacun coûtant une ligne de `CHECK` et une ligne d'union TypeScript. **Ne pas les ajouter ici par anticipation** (`CLAUDE.md` §7).

### 2.3 Miroir TypeScript — `domain/policies/audit-actions.ts`

Le `CHECK` SQL est miroité **à la main** par une union TypeScript, jamais généré (`CLAUDE.md` §7, `ARCHITECTURE.md` §7.3) :

- `domain/policies/audit-actions.ts` exporte le type `AuditAction` (les sept codes) et un **garde pur** du genre `isKnownAuditAction(code: string): code is AuditAction` ;
- **les deux côtés portent en commentaire le nom de l'autre** : la migration nomme `domain/policies/audit-actions.ts`, le fichier TS nomme la contrainte SQL et sa migration — même convention que toutes les politiques RLS existantes du dépôt ;
- **aucun libellé français ne vit en base.** Les libellés d'affichage sont une préoccupation de `presentation/`, jamais une colonne, jamais un commentaire SQL faisant autorité.

**Le journal survit au code, et le code doit le supporter.** Une ligne peut porter un code **absent de l'union** (code retiré, renommé, ou écrit par une version ultérieure puis revenue en arrière). **La lecture d'une telle ligne ne doit jamais lever d'exception** : ni le mapper, ni le ViewModel, ni le composant. Le rendu est alors **« Action inconnue (`<code brut>`) »** — le code brut est affiché, pas avalé (AC-AU-08).

Conséquence acceptée, pas une anomalie : le **filtre par action** propose les codes **connus** (l'union), donc un code inconnu n'est pas filtrable ; il reste visible tant qu'aucun filtre d'action n'est appliqué.

### 2.4 Colonnes et lecture

**Colonnes décidées** (celles que la feature exige réellement) : un identifiant, un **horodatage** de l'action, l'**acteur**, l'**action**, la **cible**, et un sac à contexte.

| Colonne | Nature | Note |
|---|---|---|
| `id` | `uuid`, clé primaire | — |
| `occurred_at` | `timestamptz not null default now()` | Rendu à l'écran ; sert la plage de dates et le tri |
| `actor_id` | `uuid`, **nullable**, référence `public.users(id)` | **Nullable délibérément** : `purge.executed` est émis par un job planifié `service_role` (`RETENTION_PURGE.md` §5), sans acteur humain — rendu « Système » côté `presentation/`. Le comportement de la référence en cas de disparition de l'utilisateur est **PO-AU-01**, à ne surtout pas poser en `on delete cascade` (une ligne d'audit ne disparaît pas avec son acteur) |
| `action` | `text not null`, `CHECK` sur les sept codes (§2.2) | — |
| `target_id` | `uuid`, nullable, **sans clé étrangère** | Le sujet de l'action (typiquement l'utilisateur concerné). Pas de FK : la trace doit survivre à la disparition de sa cible. **Non résolu en nom dans cette passe** (§1) |
| `metadata` | `jsonb`, nullable | Le motif/l'intention que le niveau SQL ne connaît pas (`ARCHITECTURE.md` §11). **Non rendu dans cette passe** (§1) |

⚠️ **`metadata` ne contient jamais de contenu médical** — voir §4, c'est une contrainte, pas une recommandation.

**La lecture passe par une vue, pas par une jointure côté client.** `public.audit_log_entries`, `security_invoker = true`, joint `public.users` en **`left join`** (l'acteur peut être nul, ou avoir disparu) pour exposer le **nom d'affichage** de l'acteur à côté des colonnes de `audit_log`. Trois raisons, dans l'ordre :

1. **Aucune ressource imbriquée PostgREST côté client** — le dépôt a déjà tranché ce point avec `public.convocation_responders` (`20260901120018`), seul précédent de vue `security_invoker = true` : la frontière de lecture se décrit en SQL, une fois.
2. **`security_invoker = true`, et pas `false`** : la vue **n'ajoute aucun prédicat** ; les RLS des tables sous-jacentes s'appliquent au vrai appelant — `audit_log_select_admin` sur `audit_log`, `users_select_own` (`auth.uid() = id or private.is_admin()`) sur `users`. Un administrateur passe les deux. C'est l'inverse exact du choix fait pour `team_active_headcount` (`security_invoker = false`, parce que la RLS sous-jacente y aurait faussé un agrégat) — ici, il n'y a **rien à contourner**, et contourner serait une faille.
3. **Filtrage et pagination s'appliquent à la vue**, donc **côté serveur** (§2.6).

### 2.5 Politiques RLS — une, et une seule

- `alter table public.audit_log enable row level security;`
- **`audit_log_select_admin`** — `for select to authenticated using (private.is_admin())`. Miroir de l'action `audit:read` (§3), nommée en commentaire SQL comme toutes les politiques du dépôt.
- **Aucune politique `INSERT` / `UPDATE` / `DELETE`.** RLS étant refus par défaut, leur absence suffit ; **les privilèges sont en plus explicitement révoqués** pour `authenticated` (défense en profondeur, même geste que `revoke update on public.users from authenticated` dans `20260918122440`) — une politique manquante et un privilège révoqué ne protègent pas contre les mêmes erreurs futures.
- **Sur la vue** : `revoke all ... from public; grant select ... to authenticated;` — même geste que `convocation_responders`.
- Les futurs émetteurs écriront via **trigger**, **fonction `SECURITY DEFINER`** ou **`service_role`** (job de purge) : aucun d'eux n'a besoin d'une politique client, et c'est précisément l'intérêt de n'en ouvrir aucune.

### 2.6 Filtres, tri et pagination — **côté serveur, sans exception**

| Point | Décision |
|---|---|
| **Filtre plage de dates** | Sur `occurred_at`. Deux bornes, **chacune facultative** (une plage ouverte d'un côté est valide) |
| **Filtre par action** | **Une ou plusieurs** actions parmi les codes connus (§2.3). Aucune sélection = aucun filtre |
| **Tri** | `occurred_at` **décroissant** — le plus récent en tête. Défaut posé ici ; aucun document ne le tranche, et c'est la lecture naturelle d'un journal. Pas de tri par colonne dans cette passe |
| **Pagination** | **Par décalage (`offset`), page de 50**, bouton « charger plus » qui **ajoute** à la liste rendue plutôt que de la remplacer |
| **Où ça se passe** | **Dans la requête**, jamais dans un `.filter()` JavaScript sur un tableau déjà chargé. Une table de 3 ans d'actions sensibles n'est pas un tableau à charger en entier (AC-AU-12) |

**Défaut posé sur les bornes de dates**, faute de document qui tranche : bornes **interprétées dans le fuseau du navigateur**, borne de fin **incluse jusqu'à la fin de la journée**. À corriger par la développeuse si elle préfère l'UTC — c'est une décision d'implémentation, pas un arbitrage produit, et elle ne bloque rien.

### 2.7 Domaine, données, présentation — la découpe attendue

Ce ne sont pas des décisions produit, ce sont les conséquences de `CLAUDE.md` §3/§4/§5 sur cette feature :

- `domain/entities/audit-log-entry.ts` — `AuditLogEntry`, avec `action: string` **et non `AuditAction`** : c'est ce qui rend AC-AU-08 structurellement possible plutôt que défensif ;
- `domain/policies/audit-actions.ts` — `AuditAction`, `isKnownAuditAction` (§2.3) ;
- `domain/repositories/audit-log-repository.ts` — interface, avec un type de filtre explicite (bornes, actions, décalage, taille de page) ;
- `domain/usecases/audit/ListAuditLogEntriesUseCase.ts` — fonction async pure, **aucun `useQuery`** (`ARCHITECTURE.md` §6) ;
- `data/dto/` — **`AuditLogEntryRow`** (suffixe `Row` : une vue à colonnes stables compte comme une ligne de table, `CLAUDE.md` §4), `data/mappers/`, `data/repositories/AuditLogRepositoryImpl.ts` ;
- `presentation/features/backoffice/audit/` — `BackofficeAuditPage.tsx` + `useBackofficeAuditViewModel.ts` + composants locaux ; **les libellés français des actions vivent ici**, jamais ailleurs ;
- `presentation/shared/query-keys.ts` — clé centralisée, **discriminants = les filtres et la page** (changer un filtre doit changer la clé), jamais de `queryKey` en ligne ;
- **Nav** : une **8ᵉ entrée** dans `BACKOFFICE_NAV_ITEMS` (`backoffice-nav.ts`), route `/admin/audit` dans le groupe `/admin` existant de `router.tsx` — même garde que les sept autres (`RequireDesktopViewport` → `RequireBackofficeSession` → `RequireBackofficeAccess` → `BackofficeDashboardLayout`). **Aucun badge numérique** : `BackofficeNavItem` n'a délibérément pas de champ `badge` générique (commentaire de `backoffice-nav.ts`, AC-WE-13), et rien dans la demande ne définit ce qu'un compteur compterait ici.
- **Index** attendus pour tenir l'exigence d'affichage < 3 s (CDC §12) sur trois ans de données : au minimum sur `occurred_at` décroissant, et le couple `(action, occurred_at desc)` si le filtre par action se révèle coûteux. À vérifier par `explain`, pas par intuition.

## 3. RBAC

### Lecture de la matrice — littérale, sans interprétation

La matrice du CDC porte **une ligne dédiée**, et c'est le cas le moins ambigu du dépôt :

| Permission | Joueur/Joueuse | Coach/Staff | Resp. section | Dirigeant habilité | Trésorier | Référent médical | Bénévole | Administrateur |
|---|---|---|---|---|---|---|---|---|
| **Consulter le journal d'audit** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |

Sept ❌ sans qualificatif, un ✅ sans portée. `docs/roles-personas-as-caribbean.md` dit la même chose dans les deux sens : l'Administrateur a « sécurité et **audit** » dans ses droits, et « **actions sensibles journalisées** » dans ses limites — **il lit le journal, et il y figure**.

Une seconde ligne de la matrice éclaire cet écran et ne doit pas être lue de travers :

| Permission | … | Administrateur |
|---|---|---|
| Consulter une donnée de santé (hors diagnostic) | … | **❌ (sauf audit)** |

« **sauf audit** » veut dire : l'administrateur voit **qu'une consultation de donnée santé a eu lieu**, jamais **son contenu**. C'est une contrainte de modèle, pas d'affichage — voir §4 et AC-AU-14.

### Action — exactement une, nouvelle

| Action | Rôles | Portée | Miroir RLS |
|---|---|---|---|
| **`audit:read`** | `['admin']` | **Club-wide par construction** — l'affectation `admin` n'a aucun champ de portée dans `RoleAssignment` | `audit_log_select_admin` (`private.is_admin()`) sur `public.audit_log` |

**Pourquoi une entrée de matrice et pas du RLS seul** — critère écrit en tête de `rbac-matrix.ts` : une entrée n'a sa place ici que si `presentation/` doit décider quelque chose **avant ou indépendamment du résultat de la requête**. C'est exactement le cas : la **présence de l'entrée « Journal d'audit » dans la navigation latérale** se décide avant toute requête. Même forme que `backoffice:access`, `news:write`, `season:write`.

**`can.ts` n'est pas modifié** : `admin` étant club-wide, la branche par défaut (qui renvoie `true` pour tout rôle sans cas de portée propre) suffit — même situation que `backoffice:access`/`season:write`/`user:invite`. ⚠️ **Si `PO-WE-01` élargissait un jour `backoffice:access` à d'autres rôles, cette entrée-ci ne devrait pas suivre par défaut** : la matrice ne donne cette ligne à personne d'autre, et l'élargir serait un arbitrage du Bureau, pas un effet de bord d'une autre décision.

### Tableau par rôle

| Rôle | Traduction sur cette feature |
|---|---|
| Joueur / Joueuse | **Aucun accès.** Ni l'entrée de nav, ni la route, ni les données |
| Coach / Staff | Aucun accès |
| Responsable de section | Aucun accès — et, contrairement à `match-stats`/`coach-team-stats` où le refus est un **écart assumé** faute d'arbitrage, ici c'est une **lecture littérale de la matrice** : ❌ explicite |
| Dirigeant habilité | Aucun accès. Même remarque |
| Trésorier | Aucun accès |
| Référent médical | **Aucun accès** — le rôle dont les consultations sont **tracées** n'est pas celui qui lit la trace. Ce n'est pas un détail : c'est ce qui donne sa valeur à la trace (§4) |
| Bénévole | Aucun accès |
| **Administrateur** | **Seul rôle servi.** Lecture seule, club-wide, sans restriction de portée |

**Règle d'affichage** (moindre privilège, `roles-personas` § « Règle de sécurité ») : pour tout autre rôle, **l'entrée de navigation et l'écran sont absents** — jamais grisés, jamais suivis d'une erreur au clic. Une arrivée par URL directe est déjà traitée par la coquille existante (`RequireBackofficeAccess` → écran de refus explicite, `specs/web-empty-state.md` AC-WE-09) : **rien de nouveau à construire pour ce cas**.

**Comptes multi-rôles** : le backoffice ne passe pas par `ActiveRoleProvider` (`router.tsx`, groupe `/admin`) — un compte cumulant `admin` et `coach` accède au journal sur cette surface sans notion de « rôle actif », exactement comme pour les sept autres destinations. Aucune nouveauté, aucune bascule à construire.

**AC-01 / AC-02 (CDC §17.2)** s'appliquent trivialement : cet écran ne rend aucune donnée d'équipe ni de dossier de membre. Ils restent néanmoins à vérifier **par appel direct à l'API** dans leur forme « un jeton non-admin n'obtient aucune ligne » (AC-AU-05).

## 4. Données sensibles

| Nature | Cette feature | Conséquence |
|---|---|---|
| **Données de santé** | **Aucune donnée de santé n'entre dans cette table** — mais elle **trace leur consultation** (`health_data.viewed`) | Contrainte dure : ni diagnostic, ni aptitude, ni motif médical, ni dans `metadata`, ni ailleurs. Une ligne dit **qui**, **quand**, **sur qui** — jamais **quoi** (CDC §6.3 et matrice « ❌ (sauf audit) » — AC-AU-14) |
| **Données financières** | Aucune dans ce lot de codes (`payment.recorded` n'existe pas encore, §2.2) | Rien à ajouter ici. Reviendra avec l'émetteur de `web-memberships` |
| **Données nominatives** | **Oui, et c'est l'objet même** : le journal associe un acteur nommé à une action datée, et souvent à une cible | Lecture **Administrateur seul**, une seule politique RLS, **aucun chemin d'export construit** (§1) |
| **Journal d'audit** | **C'est la feature** | Voir ci-dessous |

**Cette feature est le journal d'audit — elle ne s'y ajoute pas, elle le crée.** Trois points à ne pas confondre :

1. **Elle ne lève pas PO-WU-07 à elle seule.** PO-WU-07 (`specs/web-users.md` §4, aggravé par `specs/web-users-role-edit-remove.md` §4) demande que **l'invitation d'un compte, l'assignation et le retrait d'un rôle soient tracés**. Cette passe fournit **la destination** de ces appels, pas les appels. Les commentaires nommant PO-WU-07 posés dans `InviteUserUseCase` / `AssignRoleUseCase` / `RemoveRoleAssignmentUseCase` **restent en place, tels quels** : c'est leur passe respective qui les remplacera par un vrai appel. **Ne pas les câbler ici** (`CLAUDE.md` §7 : ne pas résoudre ce qu'une spec marque hors périmètre).
2. **Elle ne répond pas à PO-WU-08.** Savoir « qui a assigné ce rôle » via le journal, et savoir « qui a créé cette ligne » via une colonne `created_by`, sont deux besoins différents ; le second reste ouvert.
3. **La valeur de preuve du journal dépend entièrement de l'authentification de son unique lecteur.** L'écran est réservé à l'Administrateur, rôle pour lequel le CDC impose une **double authentification obligatoire** (`roles-personas` §3.1, « MFA admin » en P0) — **non implémentée** (`PO-WE-04`). Livrer la consultation du journal avant la MFA n'est pas un blocage technique, mais c'est un **écart daté à assumer explicitement** plutôt qu'à découvrir en audit. Signalé, non tranché ici.

**Rétention.** `RETENTION_PURGE.md` §2 classe ces lignes en « Journal d'audit — **actions sensibles** » : rétention **longue (3 ans proposés)**, **archivage froid sans purge automatique** avant cette échéance — à l'opposé des logs techniques (6-12 mois, purgés). Ce document est explicitement une **proposition à valider** par le référent RGPD et le Bureau (§6), et le **référent RGPD n'est toujours pas désigné** (`GOUVERNANCE.md`). Aucune colonne `expires_at` n'est posée dans cette passe : la marquer avant que la durée soit validée figerait une décision qui n'appartient pas au développement (PO-AU-03).

**Tension à signaler, non résolue** : `RETENTION_PURGE.md` prévoit la **pseudonymisation des comptes désactivés à 12 mois**, alors que les lignes d'audit vivent **3 ans**. Un acteur peut donc être pseudonymisé **avant** que la trace de ses actions n'expire — la jointure de la vue renverrait alors un nom vidé. Ce n'est pas un bug à corriger au vol, c'est un arbitrage RGPD (PO-AU-01).

**Noms de personnes.** Les maquettes en contiennent presque certainement (toutes les précédentes en contenaient). `CLAUDE.md` §9 les interdit **partout** — code, commentaires, commits, documentation, exemples, placeholders **et fixtures de test**. Les jeux d'essai de cette feature (indispensables, puisque la table sera vide, §6 note d'implémentation) se construisent avec des rôles et des identifiants, jamais avec un nom réel (AC-AU-19).

## 5. Critères d'acceptation

Numérotation **`AC-AU-xx`**, préfixe à deux lettres par feature comme `AC-WE`, `AC-WA`, `AC-WS`, `AC-ST`, `AC-WM`, `AC-WU`, `AC-MS`, `AC-AL`. `AC-01`/`AC-02` sont ceux du CDC §17.2.

### Base de données

| Réf. | Critère |
|---|---|
| **AC-AU-01** | `public.audit_log` existe, **RLS activée**, et porte au minimum `id`, `occurred_at`, `actor_id`, `action`, `target_id`, `metadata` (§2.4) |
| **AC-AU-02** | La colonne `action` est contrainte par un **`CHECK`** énumérant **exactement les sept codes** du §2.2 — ni `ENUM` Postgres, ni clé étrangère vers une table de référence. Une insertion d'un code hors liste échoue |
| **AC-AU-03** | **Aucune table `actions` / `audit_actions`** n'est créée. Vérifiable par diff de migration |
| **AC-AU-04** | `public.audit_log` porte **exactement une politique RLS** : `audit_log_select_admin`, `for select`, `private.is_admin()`. Aucune politique `INSERT` / `UPDATE` / `DELETE`, et les privilèges correspondants sont **explicitement révoqués** pour `authenticated` |
| **AC-01 / AC-AU-05** | **Par appel direct à l'API, hors application** : un jeton **joueur**, **coach**, **responsable de section**, **dirigeant**, **trésorier**, **référent médical** ou **bénévole** obtient **zéro ligne** de `audit_log` **et** de `audit_log_entries`. Un jeton **admin** obtient les lignes |
| **AC-02 / AC-AU-06** | **Par appel direct à l'API**, un jeton **admin** qui tente un `INSERT`, un `UPDATE` ou un `DELETE` sur `audit_log` **échoue**. Le droit de lire n'est pas le droit d'écrire, et surtout pas celui de réécrire |
| **AC-AU-07** | La vue `public.audit_log_entries` est en **`security_invoker = true`**, joint `public.users` en **`left join`** et n'ajoute **aucun prédicat** de son cru. Un acteur nul ou disparu ne fait **pas** disparaître la ligne du résultat |

### Vocabulaire d'actions

| Réf. | Critère |
|---|---|
| **AC-AU-08** | Une ligne portant un code **absent de l'union TypeScript** est lue **sans exception** — ni dans le mapper, ni dans le ViewModel, ni au rendu — et s'affiche **« Action inconnue (`<code brut>`) »**. Couvert par un test pur sur le résolveur de libellé **et** un test de mapper, sur un code volontairement inconnu |
| **AC-AU-09** | `domain/policies/audit-actions.ts` énumère **exactement les mêmes sept codes** que le `CHECK` SQL, **miroités à la main**, chaque côté nommant l'autre en commentaire. Aucune génération de l'un depuis l'autre |
| **AC-AU-10** | **Aucun libellé français n'existe en base** — ni colonne, ni valeur par défaut, ni vue. Les libellés vivent dans `presentation/` |
| **AC-AU-11** | Le filtre par action propose les **codes connus**. Une ligne portant un code inconnu reste visible **quand aucun filtre d'action n'est appliqué** |

### Écran

| Réf. | Critère |
|---|---|
| **AC-AU-12** | Le filtrage (dates, actions) **et** la pagination s'exécutent **côté serveur** : modifier un filtre déclenche **une nouvelle requête**, jamais un filtrage JavaScript d'un tableau déjà chargé. Vérifiable à l'inspection réseau |
| **AC-AU-13** | Pagination par **décalage, 50 lignes par page**. « Charger plus » **ajoute** les lignes suivantes à la liste rendue, sans recharger ni réordonner les précédentes. Les filtres en cours **s'appliquent aussi** aux pages suivantes |
| **AC-AU-14** | **Aucune donnée de santé n'est rendue ni transportée.** Une ligne `health_data.viewed` affiche qui/quand (et la cible, non résolue) — **jamais** un diagnostic, une aptitude ou un motif médical. `metadata` n'étant pas rendue dans cette passe, ce critère se vérifie aussi **dans la charge utile de la réponse API**, pas seulement à l'écran |
| **AC-AU-15** | `metadata` n'est **pas affichée**, et `target_id` **n'est jamais résolu** en nom : la requête ne joint **que** `public.users` pour l'acteur |
| **AC-AU-16** | La consultation de cet écran **n'écrit aucune ligne** dans `audit_log` — ni depuis le composant, ni depuis le use case, ni par trigger |
| **AC-AU-17** | Le tri par défaut est **`occurred_at` décroissant**. Une ligne sans acteur (`actor_id is null`) est rendue de façon explicite (« Système »), jamais par une cellule vide indistinguable d'un chargement raté |
| **AC-AU-18** | **Trois états distincts, jamais confondus** : (a) **journal vide** — cas nominal de cette passe, puisqu'aucun émetteur n'existe (`BackofficeEmptyState`, patron des sept autres écrans) ; (b) **aucun résultat pour les filtres appliqués** — message différent de (a), avec un moyen évident de revenir à la liste complète ; (c) **erreur de chargement**. Un chargement en cours n'est jamais rendu comme un journal vide |
| **AC-AU-19** | **Aucun nom de personne** en dur : ni dans un libellé, ni dans un placeholder de filtre, ni dans une fixture de test, ni dans un jeu d'essai commité (`CLAUDE.md` §9). Les noms rendus viennent **exclusivement** de la ligne lue à l'exécution |

### Intégration, architecture, transverse

| Réf. | Critère |
|---|---|
| **AC-AU-20** | **`audit:read` est la seule entrée RBAC ajoutée** — `['admin']` — et `can.ts` **n'est pas modifié**. Aucune autre action, aucun autre rôle, aucune autre portée touchés. Vérifiable par diff |
| **AC-AU-21** | **Aucun émetteur n'est construit** : aucun trigger d'audit, aucun appel de journalisation dans un use case existant ou nouveau. Les commentaires nommant **PO-WU-07** dans les use cases d'invitation / d'assignation / de retrait de rôle sont **inchangés** |
| **AC-AU-22** | **Aucune implémentation de rétention ou de purge** : pas de colonne `expires_at`, pas de job planifié, rien dans `domain/` qui connaisse une durée de vie (`CLAUDE.md` §6) |
| **AC-AU-23** | L'écran vit derrière la coquille existante — `RequireDesktopViewport` → `RequireBackofficeSession` → `RequireBackofficeAccess` → `BackofficeDashboardLayout` — et **n'ajoute aucun garde nouveau**. L'entrée de navigation est la **8ᵉ**, **sans badge numérique** |
| **AC-AU-24** | Aucun import de `data/` depuis `presentation/` ; le use case est une fonction async **sans React ni Supabase** ; la `queryKey` est **centralisée** dans `presentation/shared/query-keys.ts` et **discriminée par les filtres et la page** (`CLAUDE.md` §3/§4/§6) |
| **AC-AU-25** | Affichage complet en **moins de 3 secondes** (CDC §12) sur un volume représentatif de trois ans d'actions sensibles — avec la pagination d'AC-AU-13 **et** un index adapté, vérifié par `explain`, pas supposé |
| **AC-AU-26** | Contrastes **AA**, navigation **clavier** complète sur les filtres, le tableau et « charger plus » (CDC §12). Toute information portée par la couleur (type d'action) est **doublée d'un libellé textuel** |

## 6. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-AU-01** | **Que devient l'acteur quand son compte disparaît ou est pseudonymisé ?** Deux faits se heurtent : `public.users.id` est en `on delete cascade` depuis `auth.users`, et `RETENTION_PURGE.md` §2 pseudonymise les comptes désactivés **à 12 mois** alors que les lignes d'audit vivent **3 ans**. Position posée par cette spec, à confirmer : **la ligne d'audit ne disparaît jamais avec son acteur** (donc surtout pas de `on delete cascade` sur `actor_id`). Reste ouvert : `on delete set null` (l'acteur devient anonyme, la trace perd sa valeur de preuve) **ou** conservation d'un libellé dénormalisé dans la ligne (la trace reste lisible, mais une donnée nominative survit à la pseudonymisation — ce que la pseudonymisation vise justement à éviter) | **Référent RGPD** (toujours **non désigné**, `GOUVERNANCE.md`) + Bureau | **Non pour la conception.** Oui avant le job de purge, et avant le premier émetteur réellement branché |
| **PO-AU-02** | **`target_id` suffit-il ?** Sans colonne indiquant *de quelle table* relève la cible, sa résolution future dépend entièrement du code d'action. Tant qu'aucun émetteur n'existe et que la cible n'est pas résolue à l'écran, la question n'a pas de conséquence. Elle devra être tranchée **par la première passe d'émetteur**, pas rouverte ici | Développeuse | Non |
| **PO-AU-03** | **Durée de rétention réelle.** Les 3 ans de `RETENTION_PURGE.md` sont une **proposition explicitement à valider** (§6 de ce document), et son point 3 fait de la **désignation du référent RGPD** un **prérequis à la validation de l'ensemble**. Aucune colonne `expires_at` n'est posée tant que la durée n'est pas validée (§4) | Référent RGPD + Bureau | Non |
| **PO-AU-04** | **La liste des sept codes couvre-t-elle ce que le Bureau attend ?** Elle couvre le §11.3 du CDC sauf « modification paiement » et la « création » de compte, absents faute d'émetteur (§2.2). Chaque ajout futur coûte une migration de `CHECK` — le Bureau a donc intérêt à dire **maintenant** s'il en attend d'autres (suppression d'un événement de match, modération d'un vote — déjà soulevé par `specs/match-stats.md` PO-MS-13 et `specs/player-vote.md` PO-PV-12), même si aucun n'est construit dans cette passe | Bureau + référent RGPD | Non |
| **PO-AU-05** | **Qui lit réellement ce journal ?** L'Administrateur est à la fois **l'unique lecteur** et l'un des acteurs les plus tracés — et sa propre consultation n'est pas journalisée (décision de cette passe). Un journal que seul l'audité peut lire a une valeur de preuve limitée. Ce n'est pas un problème technique mais un **point de gouvernance** : faut-il un second lecteur (Bureau, référent RGPD), un export périodique vers l'archive froide, ou l'acceptation explicite de cette limite ? | Bureau + référent RGPD | Non |
| **PO-AU-06** | **Faut-il journaliser la consultation du journal ?** Non dans cette passe (décidé). Le CDC ne trace la lecture que pour la donnée de santé, mais la limite du rôle Administrateur (« actions sensibles journalisées ») pourrait s'entendre autrement. **Question jumelle de PO-WE-08** (journaliser la connexion au backoffice) — à traiter **avec elle**, pas séparément | Référent RGPD + Bureau | Non |
| **PO-AU-07** | **Export du journal.** Rien n'est construit (§1). Deux besoins le rouvriront : la **réversibilité** (CDC §12/§21) et l'**archivage froid** de `RETENTION_PURGE.md` §3. À noter pour le jour où : un export nominatif est **lui-même** une action à tracer (`export.nominative`, §2.2) — la feature d'export devra émettre sa propre ligne | Bureau + développeuse | Non |

### Ce qui reste explicitement OPEN et ne doit pas être résolu implicitement

- **Les émetteurs.** Ajouter « juste un petit trigger » ou « juste un appel » dans un use case existant à l'occasion de cette passe est **hors périmètre**, quelle que soit l'évidence apparente (`CLAUDE.md` §7).
- **PO-WU-07 et PO-WU-08** restent ouverts, tels quels, avec les mêmes destinataires (§4).
- **PO-WE-04 (MFA administrateur)** reste ouvert, et cet écran en augmente l'enjeu sans le traiter (§4).
- **La durée de rétention et le sort de la donnée nominative après pseudonymisation** : aucune décision unilatérale côté développement (PO-AU-01, PO-AU-03).

## 7. Note pour designer-agent

- **Aucun point ouvert ne bloque cette conception.** PO-AU-01 à PO-AU-07 portent tous sur l'après (émetteurs, rétention, gouvernance) ou sur des détails de schéma sans effet sur la mise en page.
- **Maquettes : `docs/designs/desktop/audit/[Admin] Web - audit - menu.png` et `… - content.png`**, **non ouvertes par l'agent PO** — tu es le premier à les lire. La **ligne de registre pré-rédigée au §0** (statut `instantané seul`, note d'accompagnement incluse) est à committer **telle quelle** dans `docs/designs/DESIGN_LINKS.md`, même procédé que pour toutes les lignes précédentes. **Aucun lien artifact n'est à demander.** ⚠️ Vérifier au passage que les deux PNG sont bien **commités** (ils ne l'étaient pas à la rédaction de cette spec).
- **Réemployer, ne pas inventer.** C'est la **8ᵉ destination d'un backoffice déjà construit** : `BackofficeSidebar` + `BACKOFFICE_NAV_ITEMS` (8ᵉ entrée, libellé « Journal d'audit », icône du jeu `@tabler/icons-react` déjà utilisé), patron de tableau de `UserTable`/`NewsTable`/`SeasonTable`, `BackofficeEmptyState`, `…TableSkeleton`. Rappel mémoire projet : **pas d'en-tête collant sur un tableau d'admin** (`SeasonTable` est l'exception, pas le modèle).
- **Un seul rôle, une seule variante.** Administrateur uniquement (§3) — aucune bascule d'affichage par rôle à concevoir, et le refus d'accès par URL directe est **déjà traité** par la coquille (`RequireBackofficeAccess`), rien à dessiner.
- **Trois états à distinguer nettement** (AC-AU-18) : journal **vide** (cas nominal de cette passe — aucun émetteur n'existe, donc c'est l'état que la développeuse verra à la livraison), **aucun résultat pour les filtres** (avec un retour évident à la liste complète), **erreur**. Plus le chargement, et le chargement de page suivante (« charger plus »), qui ne doit pas faire disparaître les lignes déjà affichées.
- **Ce que le tableau rend** : date/heure, acteur (nom, ou « Système » quand il n'y en a pas — AC-AU-17), action (**libellé français**, ou « Action inconnue (`<code>`) » — AC-AU-08). `metadata` **non rendue**, `target_id` **non résolu** (§1) — si la maquette montre une colonne « cible » avec un nom lisible, **c'est hors périmètre de cette passe** : le signaler dans la section UI design plutôt que de la concevoir.
- **Filtres** : plage de dates (deux bornes, chacune facultative) et actions (multi-sélection parmi les codes connus). Tout est **côté serveur** (AC-AU-12) — donc chaque changement de filtre est un aller-retour réseau, ce que l'état de chargement doit rendre lisible.
- **Pagination « charger plus »**, 50 par page (AC-AU-13) — pas de pagination numérotée, pas de défilement infini implicite.
- **Jamais de contenu médical, jamais un nom en dur** (AC-AU-14, AC-AU-19, `CLAUDE.md` §9) — les maquettes en contiennent probablement, comme toutes les précédentes : ne pas les recopier.
- Surface **desktop-only**, dans la coquille existante — pas de variante mobile à concevoir (`specs/web-empty-state.md`).

## UI design

> **Registre des maquettes** — ligne `web-audit-logs` ajoutée telle que pré-rédigée au §0, avec sa note d'accompagnement, dans `docs/designs/DESIGN_LINKS.md` §2 (statut `instantané seul`). ⚠️ **Les deux PNG (`docs/designs/desktop/audit/[Admin] Web - audit - {menu,content}.png`) n'étaient toujours pas commités au moment de cette rédaction** (`git status` les rend en `??`) — cet agent n'a pas d'accès aux commandes git/shell pour les committer lui-même : à faire par la développeuse, **en même temps que la ligne de registre**, sans quoi celui-ci pointerait vers un instantané absent du dépôt.

### Sources utilisées, par ordre de priorité effectif

1. `docs/designs/DESIGN_LINKS.md` §4 — aucune ligne n'existait pour `web-audit-logs` ; ligne pré-rédigée par l'agent PO au §0 de cette spec, recopiée telle quelle (même procédé que `menu`, `actus`, `player-vote`, `web-empty-state`, `web-actus`, `web-seasons`, `section-and-teams`, `web-users`, `match-stats`, `player-stats`, `coach-team-stats`). Aucun lien artifact à demander.
2. **Les deux exports**, ouverts pour la première fois par cet agent (§0 de la spec : l'agent PO ne les a volontairement pas ouverts). Voir la note ajoutée au registre pour le détail complet des écarts constatés, repris section par section ci-dessous.
3. **Composants déjà construits dans ce backoffice, relus pour cette passe** : `presentation/features/backoffice/memberships/{BackofficeMembershipsPage,components/MembershipTable}.tsx` (patron écran liste + tableau + filtres + états), `presentation/features/backoffice/teams/components/AssignCoachDialog.tsx` (seul précédent de sélection multiple du dépôt — liste à cocher bordée, scrollable, `min-h-11` par ligne), `presentation/features/backoffice/seasons/components/SeasonFormDialog.tsx` (paire de champs `type="date"` côte à côte, piège `min-w-0` déjà documenté), `presentation/features/backoffice/components/{BackofficeEmptyState,BackofficePageHeader,BackofficeSidebar}.tsx`, `presentation/features/backoffice/news/components/NewsTableSkeleton.tsx`, `presentation/features/backoffice/backoffice-nav.ts`, `presentation/shared/components/ui/table.tsx` (le conteneur `overflow-x-auto` existe déjà dans la primitive — voir plus bas), `presentation/shared/components/ui/badge.tsx`.
4. `wireframes-basiques-as-caribbean.md` — **non consultée comme référence de mise en page**, même raisonnement que `web-users`/`section-and-teams`/`web-memberships` : écran desktop à tableau de données, backoffice, sans équivalent visuel dans les 4 écrans mobiles fixes. Le motif de filtre par « chips » qu'il documente pour la coquille mobile n'est donc pas repris tel quel — voir plus bas pourquoi le multi-sélecteur d'actions s'appuie plutôt sur le patron desktop déjà en production (`AssignCoachDialog`).
5. `specs/web-audit-logs.md` §1 à §7 — autoritaire sur le périmètre, le modèle, le RBAC, les critères de recette et les points ouverts. Cette section **ne rouvre aucun** des PO-AU-01 à PO-AU-07 et respecte à la lettre les exclusions du §1 (aucun émetteur, aucune résolution de `target_id`, aucune colonne `metadata` rendue, aucun export).

### ⚠️ Écart avec le cadrage générique reçu pour cette tâche

La consigne de conception reçue pour cette tâche présente par défaut cette feature comme si elle vivait dans la coquille **mobile** à 4 destinations fixes (Dashboard / Calendrier / Actus / Menu) et demande une « carte Menu ». **Ce n'est pas le cas ici, et la spec est sans ambiguïté sur ce point** (§1 « Ce que c'est » : « une destination supplémentaire du **backoffice web desktop** » ; note pour designer-agent, dernière ligne : « Surface **desktop-only**… pas de variante mobile à concevoir »). C'est exactement la même situation que `specs/web-users.md` a déjà tranchée explicitement dans sa propre section UI design : *« Les 4 destinations fixes du nav mobile (Dashboard / Calendrier / Actus / Menu) sont **sans objet ici** : ce nav-là régit la coquille mobile membre, pas le backoffice desktop. »* Cette section applique donc la même lecture : pas de carte Menu, pas de nav mobile adaptative — une **8ᵉ entrée de la navigation latérale du backoffice** (`BackofficeSidebar`), exactement comme les sept passes précédentes de ce même module. Les exigences de fond derrière la consigne générique (cibles tactiles réelles, `min-w-0` sur les paires de champs côte à côte) **restent, elles, pleinement applicables** : ce backoffice les applique déjà « y compris sur desktop » (formule reprise telle quelle de `specs/web-users.md`, §6 `CLAUDE.md` s'appliquant sans exception de plateforme) — rien n'est perdu, seul le véhicule (carte Menu vs entrée de nav latérale) change.

### Où ça vit

**Une 8ᵉ entrée** dans `BACKOFFICE_NAV_ITEMS` (`backoffice-nav.ts`), route `/admin/audit`, dans le groupe `/admin` existant de `router.tsx` — même garde que les sept autres (`RequireDesktopViewport` → `RequireBackofficeSession` → `RequireBackofficeAccess` → `BackofficeDashboardLayout`), **aucun garde nouveau** (AC-AU-23). Libellé « **Journal d'audit** », fidèle au mockup. Icône proposée : `IconHistory` (`@tabler/icons-react`, déjà la dépendance du jeu d'icônes de ce backoffice) — un choix de cet agent, pas dicté par le mockup (l'export « menu » rend un simple carré, aucune icône n'y est lisible) ; à confirmer ou remplacer par la développeuse, n'importe quelle icône déjà du jeu convient.

**Pas de badge numérique** sur cette entrée (AC-AU-23, écho d'AC-WE-13) — `BackofficeNavItem` n'a délibérément pas de champ `badge` générique, et rien ici ne définit ce qu'un compteur compterait (contrairement à « Utilisateurs »/« Adhésions »). L'export « menu » confirme d'ailleurs cette lecture : l'entrée « Journal d'audit » y est active (fond distinct) mais **ne porte aucune pastille rouge**, à la différence de « Utilisateurs » (1) et « Adhésions » (2) sur le même export.

**Entrée rendue sans condition `can()` supplémentaire**, comme les sept autres — `BackofficeSidebar.tsx` boucle aujourd'hui sur `BACKOFFICE_NAV_ITEMS` sans filtrer par permission (la coquille entière est déjà gardée par `backoffice:access: ['admin']`, §3) : ajouter un filtre `audit:read` par-dessus serait une garde redondante avec `RequireBackofficeAccess`, pas un besoin nouveau. ⚠️ **Repris de la spec, à ne pas oublier si la situation change** : « Si `PO-WE-01` élargissait un jour `backoffice:access` à d'autres rôles, cette entrée-ci ne devrait pas suivre par défaut » (§3) — le jour où `backoffice:access` cesse d'être `['admin']` seul, l'entrée « Journal d'audit » (et sa route) devront alors être filtrées explicitement par `audit:read`, qui restera lui, `['admin']`.

### Ce qui change par rôle

Reprend le §3 sans le redéfinir. **Un seul rôle atteint cet écran** : Administrateur — les sept autres n'ont ni l'entrée de nav, ni la route, ni les données (§3, « Tableau par rôle »). Aucune bascule d'affichage à concevoir, aucune variante de rôle. Le refus par URL directe pour un compte non-admin est déjà couvert par la coquille existante (`RequireBackofficeAccess`, `specs/web-empty-state.md` AC-WE-09) — rien à dessiner pour ce cas.

Un compte multi-rôle (ex. `admin` + `coach`) accède au journal sans notion de « rôle actif » (le backoffice ne passe pas par `ActiveRoleProvider`, §3) — aucune nouveauté.

### Écran liste (`/admin/audit`)

Reprend le squelette `flex flex-1 flex-col gap-6` déjà utilisé par `BackofficeMembershipsPage`/`BackofficeSeasonsPage`/`BackofficeSectionsPage`.

1. **En-tête** : `<h2>Journal d'audit</h2>` (`text-xl font-bold`), et sous le titre une ligne d'explication reprise du mockup — copie fidèle, c'est une phrase de contexte utile, pas une affirmation technique à vérifier : *« Chaque action sensible est journalisée. Lecture seule. »* (retrait de la liste entre parenthèses du mockup — « rôles, adhésions, paiements, données de santé » — qui énumère des exemples plus larges que les sept codes réellement construits dans cette passe, §2.2 ; une liste d'exemples qui déborde le vocabulaire livré serait trompeuse le jour où l'écran est mis en production avec zéro émetteur branché, AC-AU-18). **Aucun bouton d'action** en en-tête (à la différence de `Utilisateurs`/`Adhésions`) : l'écran est lecture seule, §1/§2.5 n'ouvrent aucune politique d'écriture côté client.
2. **Compteur en tête d'écran** — le mockup affiche « 8 entrée(s) » en haut à droite du titre. **Repris, avec une portée réduite** : afficher un total exact supposerait une seconde requête de comptage que rien au §2 ne demande (le §2 ne liste que la lecture paginée, §2.6). Le nombre affiché ici est donc **le nombre de lignes actuellement chargées côté client** (accumulées par « Charger plus »), pas un total serveur — libellé « **{N} entrée(s) chargée(s)** » plutôt que « {N} entrée(s) » nu, pour ne pas laisser croire à un total. Élément à faible priorité : peut être omis en premier jet sans rouvrir aucun AC.
3. **Filtres, tous côté serveur (AC-AU-12)** — `flex flex-wrap items-end gap-3` :
   - **Plage de dates** — deux `Input type="date"`, `Du` / `au` (fidèle au mockup), regroupés dans un sous-conteneur `flex gap-3` : `<div className="flex min-w-0 flex-col gap-1.5"><Label>Du</Label><Input type="date" className="h-11 min-w-0 w-40 rounded-xl" /></div>` et son jumeau `au`. **`min-w-0` obligatoire sur chacun des deux** (`CLAUDE.md` §6) — même piège déjà documenté sur la paire Début/Fin de `SeasonFormDialog` : la valeur segmentée d'un `<input type="date">` porte un plancher de largeur intrinsèque qui chevauche son voisin sans ce garde-fou, y compris sur un backoffice desktop redimensionnable jusqu'au plancher de `RequireDesktopViewport`. Chaque borne est **facultative** (§2.6) — aucun `required`, un champ vide correspond à une plage ouverte de ce côté.
   - **Filtre par action, multi-sélection** — voir composant dédié ci-dessous, aucune référence visuelle exacte (le mockup ne montre qu'un `Select` simple « Toutes les actions », alors que §2.6 exige explicitement « une ou plusieurs actions »).
   - **Ce qui n'est PAS repris du mockup** : le quatrième champ « Tous les acteurs » (un `Select`). Aucun filtre par acteur n'existe au §2.6 de la spec, qui n'en mentionne que deux (date, action) — l'ajouter serait une portée non demandée (`CLAUDE.md` §7, « ne pas résoudre par anticipation »). Signalé ici plutôt que construit silencieusement.
4. **Tableau à quatre colonnes** — `DATE`, `ACTEUR`, `ACTION`, `CIBLE`, dans cet ordre. Dans le conteneur natif de la primitive `Table` (`presentation/shared/components/ui/table.tsx`, déjà `relative w-full overflow-x-auto` par construction) : **le tableau défile horizontalement dans son propre conteneur, jamais la page entière** — déjà garanti par la primitive elle-même, rien à ajouter. **Pas d'en-tête collant** (`sticky top-0`) sur ce tableau — rappel mémoire projet : seul `SeasonTable` en porte un, c'est l'exception du dépôt, pas le patron à suivre.
   - `DATE` — `occurred_at`, format `JJ/MM/AAAA à HH:MM` (nouveau petit formatteur local, `presentation/features/backoffice/audit/format-audit-date.ts` — le mockup rend un format ISO `AAAA-MM-JJ HH:MM:SS`, écart délibéré pour rester cohérent avec le reste du backoffice, aucun autre écran de ce dépôt n'affiche de date au format ISO brut). Tri décroissant par défaut, déjà porté par la requête (§2.6) — **pas de tri par colonne au clic** dans cette passe.
   - `ACTEUR` — trois rendus distincts, aucun ne doit jamais être une cellule vide (AC-AU-17) :
     - `actor_id` non nul, nom résolu par la vue → nom complet, texte simple.
     - `actor_id` **nul** (émission système, ex. `purge.executed`) → **« Système »** (AC-AU-17, §2.4). Le mockup illustre déjà ce rendu pour deux de ses huit lignes de démonstration (« Changement de statut d'adhésion », « Expiration d'une adhésion ») — cohérent, repris tel quel.
     - `actor_id` **non nul mais nom introuvable côté vue** (jointure `left join` qui ne retrouve rien, ex. un compte disparu ou pseudonymisé — tension explicitement signalée §4/PO-AU-01, sans y être résolue) → **« Compte supprimé »**, un texte **distinct** de « Système » : les deux cas racontent une histoire différente (aucun acteur humain vs. un acteur humain dont la trace du nom s'est perdue) et les confondre masquerait la seconde situation. **Cette section ne tranche pas PO-AU-01** (le sort réel de la référence, `on delete set null` vs. dénormalisation) — elle décide seulement comment un nom absent s'affiche *si/quand* ce cas se présente, ce qui est une décision de rendu, pas une décision de rétention.
     - `text-muted-foreground italic` pour « Système » et « Compte supprimé » (les deux sont des valeurs de repli, pas un nom réel) — jamais la même graisse que le texte d'un vrai nom.
   - `ACTION` — **deux lignes dans la cellule**, patron déjà illustré par le mockup pour ce cas précis et directement réutilisable : libellé français en gras (`font-semibold`), code brut en dessous (`text-xs font-mono text-muted-foreground`). Trois cas :
     - code connu (une des sept valeurs de `domain/policies/audit-actions.ts`) → libellé français ci-dessous, résolu par un nouveau petit formatteur local **`formatAuditAction()`**, `presentation/features/backoffice/audit/format-audit-action-label.ts` (§2.7 : « les libellés français des actions vivent ici, jamais ailleurs », jamais en base) ;

       | Code | Libellé proposé | Source |
       |---|---|---|
       | `role.granted` | Attribution d'un rôle | mockup, repris tel quel |
       | `role.revoked` | Retrait d'un rôle | mockup, repris tel quel |
       | `health_data.viewed` | Consultation de données de santé | mockup, repris tel quel |
       | `account.deactivated` | Désactivation d'un compte | proposé par cet agent, aucun équivalent au mockup |
       | `legacy_points.corrected` | Correction de points Legacy | proposé par cet agent, aucun équivalent au mockup |
       | `export.nominative` | Export nominatif | proposé par cet agent, aucun équivalent au mockup |
       | `purge.executed` | Exécution d'une purge | proposé par cet agent, aucun équivalent au mockup |

     - code **inconnu** de l'union TypeScript (AC-AU-08) → première ligne **« Action inconnue »**, seconde ligne le code brut tel quel — même mise en page à deux lignes, jamais d'exception levée par le composant.
     - **Ce que le mockup montre et que cette passe ne construit pas** : cinq des huit lignes de démonstration du mockup portent un code qui **n'existe dans aucun des sept codes du §2.2** (`user.invited`, `membership.payment_recorded`, `membership.status_changed`, `team.created`, `membership.expired`) — cohérent avec « aucun code sans émetteur » (§2.2, « ne pas les ajouter ici par anticipation ») : ces cinq codes viendront, un jour, de passes distinctes qui n'existent pas encore. Signalé pour que le mockup ne soit pas lu comme une checklist de codes à couvrir dès maintenant.
   - `CIBLE` — **écart annoncé par le §7 de la spec, confirmé à la lecture, mais pas exactement sous la forme attendue.** Le mockup rend `type · identifiant court` (ex. `user · u1`, `membership · m1`, `team · t4`), déjà **conforme** à l'exigence « jamais résolu en nom » d'AC-AU-15. Mais **le type ne peut pas être construit dans cette passe** : le modèle du §2.4 ne porte **aucune colonne `target_type`** — seul `target_id`, un `uuid` nu, sans FK. C'est très exactement **PO-AU-02** (« `target_id` suffit-il ? … la question devra être tranchée par la première passe d'émetteur, pas rouverte ici », non bloquant). Rendu retenu pour cette passe : **le `target_id` seul**, tronqué aux huit premiers caractères suivis de `…` (`font-mono text-xs`, ex. `a1b2c3d4…`) quand non nul, **« — »** quand nul — **sans préfixe de type**. Ce n'est donc **pas** le mockup à l'identique : c'est une réduction assumée de ce qu'il montre, cohérente avec le schéma réellement livré par cette passe et avec PO-AU-02 restant ouvert pour la suite.
5. **Cinq états, jamais confondus** (AC-AU-18, plus le chargement de page suivante) :
   - **Chargement initial** → nouveau composant `AuditTableSkeleton`, jumeau de `NewsTableSkeleton`/`MembershipTableSkeleton` (4 colonnes, lignes statiques `Skeleton`), jamais un flash de tableau vide.
   - **Erreur** → `Alert variant="destructive"`, message français traduit d'une `DomainError`, jamais une charge utile brute Supabase/PostgREST.
   - **Journal vide, aucun filtre actif** → **cas nominal de cette passe** (§1 : zéro émetteur construit, donc la table est vide et le restera jusqu'à la première passe d'émetteur) : `BackofficeEmptyState` avec `icon={navItem.icon}` et `title={navItem.emptyStateTitle}` (`"Aucune entrée de journal d'audit à afficher pour l'instant"`, à ajouter à `backoffice-nav.ts` dans le même style que les sept autres entrées). **Ce n'est pas une erreur, ni un signe que l'écran est mal câblé** — c'est l'état que la développeuse verra réellement à la livraison.
   - **Aucun résultat pour les filtres appliqués** → **message distinct**, exigé par AC-AU-18 : `BackofficeEmptyState` avec `title="Aucune entrée pour ces filtres"` (repris tel quel du texte demandé pour cette tâche) et une action de retour évidente — un bouton texte `variant="ghost"` « Réinitialiser les filtres » sous le message, même registre que le bouton de réinitialisation de `MembershipsPage` (« Réinitialisez les filtres pour voir toutes les adhésions »), ici sous forme de contrôle cliquable plutôt que de simple phrase, puisque AC-AU-18 demande explicitement « un moyen évident de revenir à la liste complète ».
   - **Chargement de la page suivante (« Charger plus »)** → voir ci-dessous ; **ne doit jamais faire disparaître ni réordonner les lignes déjà rendues** (AC-AU-13).

### Nouveau composant — sélecteur multiple d'actions

Aucune référence visuelle exacte (le mockup montre un `Select` à sélection unique, la spec exige une sélection multiple, §2.6) — traité comme les précédents éléments sans mockup de ce dépôt (icône d'avertissement de ligne, pastille de rôle cliquable de `specs/web-users.md`) : **réutiliser un patron déjà en production plutôt qu'en inventer un nouveau.**

Le seul patron de sélection multiple déjà construit dans ce backoffice est la liste à cocher bordée d'`AssignCoachDialog` (équipes d'un coach) — **directement transposable** ici (sept options fixes et connues, comme les équipes d'un coach sont un ensemble fixe et connu à l'instant T) :

- **Déclencheur** — `Button variant="outline" h-11 rounded-xl`, largeur de contenu, libellé dynamique : `"Toutes les actions"` quand rien n'est coché, `"{N} action(s)"` sinon (jamais la liste des libellés en toutes lettres dans le bouton, qui déborderait vite au-delà de sept options).
- **Contenu** — primitive shadcn `Popover`, **absente du dépôt à ce jour** (`npx shadcn add popover`, `CLAUDE.md` §2, même geste que `Tooltip` ajouté pour `specs/web-users.md`), ancré sous le déclencheur. À l'intérieur : **la même mise en page qu'`AssignCoachDialog`**, réutilisée telle quelle — `<div className="flex max-h-64 flex-col overflow-y-auto rounded-xl border border-border">`, une `Checkbox` par code d'action connu (§2.3, les sept codes de l'union TypeScript — **jamais** un code inconnu, cohérent avec AC-AU-11) dans une `<label className="flex min-h-11 items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">`, libellé = `formatAuditAction()` (le même formatteur que la colonne `ACTION`, jamais redupliqué).
- **Pied du contenu** — deux boutons texte discrets, `variant="ghost"`, `h-11` : « Tout sélectionner » / « Réinitialiser » — confort, pas une exigence du §2.6, mais évite sept clics répétés pour revenir à « aucun filtre ».
- **Sélection affichée hors du menu** — les actions cochées se rendent en **`Badge` neutres, retirables**, `flex flex-wrap gap-1.5` sous la ligne de filtres (même traitement visuel que les pastilles de rôle de `specs/web-users.md`, `border-white/15 bg-white/10 text-white/70`), chacune suivie d'un petit `IconX` cliquable (`size-3`, `aria-label="Retirer le filtre {libellé}"`) pour la retirer sans rouvrir le menu. Reprend un composant déjà établi (`Badge`) plutôt que d'inventer un nouveau composant "chip" — écart volontaire avec le patron de chips de `wireframes-basiques-as-caribbean.md` (mobile, sans objet ici, voir plus haut).
- **Aucune sélection = aucun filtre** (§2.6) — le bouton déclencheur et l'absence de `Badge` en dessous le disent déjà sans texte supplémentaire.

### Pagination — « Charger plus »

- **Bouton unique**, centré sous le tableau : `<Button variant="outline" className="h-11 rounded-full">Charger plus</Button>` — jamais de pagination numérotée, jamais de défilement infini implicite (§2.6, note pour designer-agent).
- **États** : libellé « Charger plus » tant qu'une page suivante peut exister (la dernière page reçue comptait exactement 50 lignes) ; `disabled`, libellé « Chargement… » pendant la requête ; **bouton absent** (pas grisé) dès que la dernière page reçue comptait moins de 50 lignes — plus rien à charger, pas une erreur.
- **Un changement de filtre réinitialise la pagination** : la liste accumulée est **remplacée**, pas complétée, et repart de la première page de 50 — cohérent avec AC-AU-12 (chaque changement de filtre = une nouvelle requête) et AC-AU-13 (« les filtres en cours s'appliquent aussi aux pages suivantes », ce qui suppose qu'un changement de filtre reparte de zéro plutôt que de mélanger deux jeux de filtres dans une même liste accumulée).
- **« Charger plus » ajoute** les lignes suivantes sans recharger ni réordonner les précédentes (AC-AU-13) — le bouton reste à sa position sous les lignes déjà rendues, pas de saut de défilement.

### Ce que cette section ne dessine délibérément pas

Repris du §7 de la spec et confirmé à la lecture des deux exports, pour qu'aucun de ces points ne soit redécouvert à l'implémentation :

- **Aucune ligne dépliable, aucun contenu `metadata` affiché** — le mockup montre une ligne développée (chevron vers le bas) révélant un bloc JSON (`role`, `scope`, `previous`) pour sa première ligne. C'est exactement ce qu'AC-AU-14/AC-AU-15 excluent (« `metadata` n'est pas affichée »). **Aucun chevron, aucune ligne expansible, aucune requête ne rapportant `metadata` côté client.**
- **Aucune colonne `SOURCE`** — le mockup en montre une (`usecase` / `trigger` / `job`, en couleur). Le modèle du §2.4 ne porte aucune colonne de ce nom ni d'équivalent ; ce n'est ni de la donnée disponible, ni un champ demandé par les critères de recette. Non construite.
- **Aucun filtre par acteur** — voir plus haut.
- **Aucun export** du journal (§1, PO-AU-07) — aucun bouton, aucune icône de téléchargement, y compris si un futur mockup en suggérait un.
- **Aucun nom de personne** recopié des exports dans cette section ni dans une fixture — les trois noms visibles au mockup (acteur connecté, deux lignes d'exemple) ne sont répétés nulle part ci-dessus, conformément à `CLAUDE.md` §9 et AC-AU-19.

### Points ouverts propres à cette section (aucun bloquant)

- **Icône de nav** (`IconHistory`, proposée ci-dessus) — à confirmer par la développeuse, aucune icône n'est lisible sur l'export « menu ».
- **Libellés français des quatre codes sans équivalent au mockup** (`account.deactivated`, `legacy_points.corrected`, `export.nominative`, `purge.executed`) — proposés ci-dessus par cet agent, à valider ou ajuster librement puisqu'ils vivent en `presentation/` (§2.3, aucune conséquence base de données).
- **Compteur « {N} entrée(s) chargée(s)** » — nice-to-have explicitement dégradé par rapport au total exact du mockup (qui supposerait une requête de comptage non demandée par le §2) ; peut être omis sans rouvrir aucun critère de recette.
- Aucun de ces points ne recoupe PO-AU-01 à PO-AU-07 : tous restent ouverts, tels quels, avec les mêmes destinataires (§6 de la spec).

## Addendum du 2026-09-30 — premiers émetteurs réels

Cette passe **n'a construit aucun émetteur** (§1, AC-AU-21) — c'est resté vrai jusqu'à une passe de suivi, réalisée le même jour, qui en a branché les deux premiers :

- `role.granted` et `role.revoked` ont désormais de vrais émetteurs, câblés dans trois use cases existants qui portaient chacun un commentaire nommant explicitement ce manque (`AssignRoleUseCase`, `AssignCoachToTeamsUseCase`, `RemoveRoleAssignmentUseCase`) — voir `specs/web-users.md` §4 (PO-WU-07) et `specs/section-and-teams.md` §4 (PO-ST-14).
- Le chemin d'écriture qui rend ça possible : `public.record_audit_log_entry`, une fonction `SECURITY DEFINER` (`supabase/migrations/20260930131500_audit_log_record_rpc.sql`), gardée par `private.is_admin()` et lisant `auth.uid()` côté serveur (jamais un `actorId` fourni par le client). `domain/repositories/audit-log-repository.ts` gagne une méthode `record()`, implémentée par `data/repositories/AuditLogRepositoryImpl.ts` via `this.client.rpc(...)`.
- **Aucun des critères d'acceptation de cette passe n'est modifié.** En particulier : `public.audit_log` ne porte toujours **aucune** politique `INSERT`/`UPDATE`/`DELETE` cliente (AC-AU-04, AC-AU-06) — la fonction `SECURITY DEFINER` reste le **seul** chemin d'écriture, exactement comme §2.5 l'annonçait déjà pour les futurs émetteurs.
- `EditRoleAssignmentScopeUseCase` reste **délibérément exclu** de cette passe de suivi — sa reconciliation coach (insertions et suppressions dans le même appel) n'a pas d'équivalent mécanique évident en un seul appel `record()`. Son propre commentaire "blocked on PO-WU-07" reste, mis à jour pour préciser qu'il l'est spécifiquement pour lui, pas faute d'infrastructure.

## Addendum du 2026-09-30 (plus tard le même jour) — `target_type`, `source`, `metadata` rendue

Une maquette plus récente que la passe initiale exige trois éléments que celle-ci excluait explicitement (§1, AC-AU-15). Amendement délibéré, dirigé par la développeuse, de deux des critères d'acceptation de cette même spec — pas une dérive de périmètre :

- **`target_type` ajouté** — colonne `text`, nullable, **sans `CHECK`** (contrairement à `action`) : un libellé purement informatif de ce que `target_id` désigne, pas une décision de sécurité à fermer. Résout **PO-AU-02** (« `target_id` suffit-il ? ») par « non, il lui faut son type ». La colonne Cible du tableau rend désormais `targetType · shortTargetId` (ex. `user · a1b2c3d4…`) quand `targetType` est connu, et retombe sur le rendu id-seul d'aujourd'hui pour une ligne écrite avant l'ajout de cette colonne (`targetType` alors `null`). `AssignRoleUseCase`, `RemoveRoleAssignmentUseCase` et `AssignCoachToTeamsUseCase` passent désormais `targetType: 'user'` à leurs appels `record()` existants — mécanique, la cible de ces trois use cases est toujours le compte affecté.
- **`source` ajouté** — nouveau concept, colonne `text not null`, **`CHECK`-contrainte** (comme `action`) sur exactement trois valeurs : `'usecase'` (un appel de use case métier, le seul chemin existant à ce jour, via `public.record_audit_log_entry`), `'job'` (un job planifié `service_role`, ex. la future purge — aucun construit ici), `'trigger'` (un trigger Postgres, ex. la future consultation de donnée santé — aucun construit ici). `default 'usecase'` couvre le backfill des lignes déjà écrites (toutes issues de `record_audit_log_entry`, qui n'a jamais écrit autre chose) ; `record_audit_log_entry` continue de fixer `source = 'usecase'` explicitement, **hardcodé**, jamais reçu en paramètre — un client ne doit jamais pouvoir prétendre à une autre source, même raisonnement de spoofing déjà tenu pour `actor_id`/`auth.uid()`. Mirroité à la main dans `domain/policies/audit-sources.ts` (`AUDIT_SOURCES`, `AuditLogSource`, `isAuditSource`), même forme qu'`audit-actions.ts`. Rendue à l'écran en badge coloré (nouvelle colonne SOURCE) — `usecase` en ton positif, `trigger` en ton d'alerte, `job` en ton neutre, toujours doublé du libellé textuel. **Aucun émetteur `trigger`/`job` réel n'est construit par cet amendement** : la valeur est rendue *possible* à écrire, pas branchée à un émetteur — signalé explicitement, hors périmètre ici.
- **`metadata` rendue** — **supersède AC-AU-15** (« `metadata` n'est pas affichée ») pour cette seule portion du critère ; le reste d'AC-AU-15 (« `target_id` n'est jamais résolu en nom ») reste pleinement en vigueur. Sûr de lever cette exclusion : `metadata` **ne porte jamais de contenu santé/médical**, contrainte déjà posée en commentaire de colonne sur `public.audit_log.metadata` depuis la passe initiale (§2.4) et jamais remise en cause depuis. Chaque ligne devient dépliable via un chevron, révélant `metadata` imprimée en JSON dans un bloc monospace — **uniquement** quand `metadata` n'est pas un objet vide (`{}` : pas d'affordance de dépliage du tout). Repliée par défaut. État purement `presentation/`, aucun changement de ViewModel.

**Ce que cet amendement ne fait pas, à ne pas rouvrir** : aucun filtre par `source`/`target_type` (la maquette n'en montre pas), aucun émetteur `trigger`/`job` réel construit, aucune modification d'`EditRoleAssignmentScopeUseCase` (toujours exclu, voir l'addendum précédent).

## Addendum du 2026-09-30 (encore plus tard le même jour) — quatre nouveaux émetteurs (`membership`/`user`)

Suite directe des deux addenda ci-dessus : quatre nouveaux codes d'action et leurs émetteurs réels, câblés en suivant très exactement le patron déjà posé pour `role.granted`/`role.revoked` (même constructeur `AuditLogRepository` injecté, même `try`/`catch`/`console.error` après une écriture métier déjà réussie, jamais avant, jamais dans le même transaction que l'écriture métier).

**Les quatre codes**, chacun rattaché au CDC §11.3 (ou à sa famille la plus proche) :

| Code | Émetteur | `targetId` | `targetType` | `metadata` |
|---|---|---|---|---|
| `membership.payment_recorded` | `RecordPaymentUseCase` | `input.membershipId` | `'membership'` | `{ amountCents, paidAt }` — pas sensible, un montant et une date, le détail d'archive que la ligne existe pour garder |
| `membership.archived` | `ArchiveMembershipUseCase` | `input.membershipId` | `'membership'` | `{}` — rien à ajouter au-delà de ce que la ligne `memberships` (archived_at/archived_by) dit déjà |
| `user.invited` | `InviteUserUseCase` | l'id du **compte nouvellement créé** (pas l'acteur) | `'user'` | `{ email, fullName }` — contenu identifiant nécessaire pour « qui a été invité », pas excessif |
| `password_reset.issued` | `GeneratePasswordResetLinkUseCase` | `input.targetUserId` | `'user'` | `{}` |

**Migration** : `supabase/migrations/20260930150000_audit_log_membership_user_actions.sql` — élargit `audit_log_action_check` (drop/add, même convention que l'ouverture initiale du §2.2, jamais un `ALTER TYPE`) à onze codes. `domain/policies/audit-actions.ts` (`AUDIT_ACTIONS`) mirroité à la main, chaque côté nommant l'autre en commentaire (CLAUDE.md §7).

**Trois de ces quatre chemins n'ont eu besoin d'aucun changement d'infrastructure** au-delà d'ajouter `AuditLogRepository` au constructeur et un appel `record()` après l'écriture métier (`RecordPaymentUseCase`, `ArchiveMembershipUseCase`, `GeneratePasswordResetLinkUseCase` — ce dernier avait déjà `input.targetUserId` sous la main). **`InviteUserUseCase` est le seul cas non mécanique** : `UserRepository.invite()` ne renvoyait jusqu'ici que `{ url }` (`InvitationLink`), sans l'id du compte que la fonction Edge `invite-user` (mode `'create'`) crée pourtant elle-même (`invited.user.id`, jamais renvoyé au client). Sans cet id, aucun `targetId` fiable n'existe pour la ligne `user.invited`.

**Résolution retenue, et pourquoi** — trois changements, strictement additifs :

1. **`supabase/functions/invite-user/index.ts`**, branche `'create'` uniquement : la réponse JSON finale porte désormais `id: invited.user.id` en plus de `url`. Les branches `'reissue'`/`'reset-password'` sont inchangées — leurs appelants connaissent déjà l'id de la cible (c'est leur propre paramètre d'entrée), rien à leur renvoyer.
2. **`src/data/dto/invite-user-dto.ts`** — `InviteUserResponseDto` gagne un champ `id?: string`, documenté comme propre au mode `'create'`.
3. **`src/domain/repositories/user-repository.ts`** — `InvitationLink` gagne `userId?: string`. Une alternative a été pesée et écartée : un type distinct (`CreatedInvitationLink extends InvitationLink { userId: string }`), plus honnête pour `invite()` seul (le seul appelant qui a réellement toujours un id) mais qui aurait cassé une vingtaine de fixtures de test existantes à travers le dépôt (`fakeUserRepository().invite` renvoyant un simple `{ url }` comme stub non lié au test lui-même). Le champ optionnel sur le type existant est le changement le plus étroit ; `reissueInvitationLink()`/`generatePasswordResetLink()` ne le peuplent jamais et aucun de leurs appelants ne le lit.

`data/repositories/UserRepositoryImpl.invite()` fait suivre `data!.id` jusqu'à `userId`. `InviteUserUseCase` utilise `link.userId` comme `targetId` de son appel `record()`.

**Ce que cet amendement ne fait pas** : aucun autre code d'action ajouté au-delà des quatre listés ici (pas de `team.created`, `season.created`, `news.*`) ; `EditRoleAssignmentScopeUseCase`, `CreateMembershipUseCase`, `UpdateMembershipUseCase` et `ReissueInvitationLinkUseCase` restent tous les quatre hors périmètre, non touchés ; aucun déploiement de la fonction Edge n'est fait depuis cette passe (le fichier est préparé, pas déployé — même règle que pour toute migration, l'application/le déploiement se fait après revue) ; aucune politique RBAC nouvelle (les trois actions RBAC déjà en jeu — `payment:record`, `membership:write`, `user:invite` — étaient déjà `['admin']`-only, vérifié avant d'écrire cette passe, donc la garde `private.is_admin()` déjà posée sur `record_audit_log_entry` couvre les quatre nouveaux codes sans modification).

## Addendum du 2026-09-30 (dernière passe du jour) — neuf émetteurs create/edit, un élargissement délibéré du périmètre

**Ceci n'est pas une continuation de routine des quatre passes d'émetteurs précédentes — c'est un élargissement assumé d'un principe posé par la passe initiale.** Le §2.1 de cette spec posait « le vocabulaire n'est pas de la donnée » dans un but précis : n'ouvrir le journal qu'aux **actions sensibles au sens du CDC §11.3** (changement de rôle, paiement, consultation de donnée santé, correction Legacy, export nominatif, création/suppression de compte, purge). Les quatre passes d'émetteurs précédentes (`role.granted`/`role.revoked`, puis `membership.payment_recorded`/`membership.archived`/`user.invited`/`password_reset.issued`) respectaient toutes cette frontière : chaque code correspond à une ligne du §11.3, ou à sa famille la plus proche (voir la table du quatrième addendum). **Aucun des neuf codes ci-dessous ne correspond à une ligne du CDC §11.3.** Ce sont de simples traces de création/modification pour de la donnée structurante d'administration — adhésion, saison, section, équipe (création + modification), et utilisateur (modification seule).

Ce point a été signalé explicitement à la développeuse avant d'écrire quoi que ce soit (« ceci élargit le principe du §2.1 au-delà des actions sensibles — vous le voulez quand même ? ») et **confirmé après cette mise en tension** : la développeuse veut cette couverture élargie pour **adhésion, saison, section, équipe** (création + modification) et **utilisateur** (modification seule — la création reste couverte par `user.invited`, §4 du troisième addendum). Elle a **explicitement exclu** `news.created`/`news.updated` de cet élargissement : `CreateClubNewsUseCase`/`UpdateClubNewsUseCase` restent intacts, non touchés.

**Les neuf codes**, aucun rattaché à une ligne du CDC §11.3 (voir ci-dessus) :

| Code | Émetteur | `targetId` | `targetType` | `metadata` |
|---|---|---|---|---|
| `membership.created` | `CreateMembershipUseCase` | l'id de l'adhésion créée (chemin `create()` **ou** chemin `replaceArchived()` de recréation, §2.7/PO-WM-03 — les deux émettent le même code) | `'membership'` | `{ seasonId, status }` |
| `membership.updated` | `UpdateMembershipUseCase` | `input.membershipId` | `'membership'` | `{ status }` |
| `season.created` | `CreateSeasonUseCase` | l'id de la saison créée | `'season'` | `{ label }` |
| `season.updated` | `UpdateSeasonUseCase` | `input.seasonId` | `'season'` | `{ label }` |
| `section.created` | `CreateSectionUseCase` | l'id de la section créée | `'section'` | `{ name, type }` |
| `section.updated` | `UpdateSectionUseCase` | `input.sectionId` | `'section'` | `{ name, type }` |
| `team.created` | `CreateTeamUseCase` | l'id de l'équipe créée | `'team'` | `{ name, sectionId, seasonId }` |
| `team.updated` | `UpdateTeamUseCase` | `input.teamId` | `'team'` | `{ name, sectionId, seasonId }` |
| `user.updated` | `UpdateUserFullNameUseCase` | `input.userId` | `'user'` | `{}` — le nouveau `fullName` n'est pas jugé excessif à journaliser, mais la ligne `users` elle-même le dit déjà ; gardé minimal par choix, pas par contrainte |

**Migration** : `supabase/migrations/20260930160000_audit_log_create_edit_actions.sql` — élargit `audit_log_action_check` (drop/add, même convention que les deux ouvertures précédentes, jamais un `ALTER TYPE`) à vingt codes. Le commentaire de la migration énonce explicitement l'élargissement de périmètre, pas seulement la liste des codes. `domain/policies/audit-actions.ts` (`AUDIT_ACTIONS`) mirroité à la main, chaque côté nommant l'autre en commentaire (CLAUDE.md §7).

**Aucun changement RBAC ni RLS requis.** Les cinq actions RBAC sous-jacentes (`membership:write`, `season:write`, `section:write`, `team:write`, `user:write`) sont toutes déjà `['admin']`-only dans `domain/policies/rbac-matrix.ts` (vérifié avant d'écrire cette passe) — la garde `private.is_admin()` déjà posée sur `public.record_audit_log_entry` couvre donc les neuf nouveaux codes sans modification de cette fonction, de la vue `audit_log_entries`, ni d'`audit_log_select_admin`.

**Câblage mécanique pour huit des neuf chemins** : même patron que les cinq émetteurs précédents (constructeur `AuditLogRepository` injecté, `record()` appelé après l'écriture métier déjà réussie, `try`/`catch`/`console.error` — jamais de rejet de la promesse du use case). Seul `CreateMembershipUseCase` porte une nuance : il a **deux chemins de succès** (`membershipRepository.create()` pour une création normale, `membershipRepository.replaceArchived()` pour la recréation après archivage sans paiement, §2.7/PO-WM-03) — les deux émettent `membership.created`, factorisé dans une méthode privée commune plutôt que dupliqué.

**DI** : les instances `AuditLogRepositoryImpl` déjà présentes dans `memberships-container.ts`, `section-and-teams-container.ts` et `users-container.ts` sont **réutilisées telles quelles** pour les nouveaux use cases (même instance, pas une seconde) — cohérent avec le principe déjà appliqué aux passes précédentes. `seasons-container.ts` n'en avait encore aucune : une nouvelle instance `AuditLogRepositoryImpl` y est ajoutée, suivant le même patron par-conteneur que tous les autres conteneurs.

**Ce que cet amendement ne fait pas** : aucun code `news.*` ajouté, `CreateClubNewsUseCase`/`UpdateClubNewsUseCase` intacts (exclusion explicite de la développeuse, ci-dessus) ; aucun `user.created` (déjà couvert par `user.invited`, §4 du troisième addendum) ; aucune autre entrée RBAC, aucune modification de `can.ts` ; aucun autre use case touché au-delà des neuf listés ; la migration est préparée, **pas appliquée** — application soumise à confirmation, comme toute migration de ce dépôt.
