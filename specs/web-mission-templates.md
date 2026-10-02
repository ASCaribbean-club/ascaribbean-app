# Spec — Backoffice web : référentiel des missions (`web-mission-templates`)

> Statut : **première rédaction (2026-10-02)**. Règles métier tranchées par la développeuse, transmises par la session principale (§2). **Aucun point ouvert ne bloque** la conception ni l'implémentation (§6).
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (module P1 « Événements et bénévoles », lignes de matrice « Gérer postes/missions bénévoles » et « Gérer comptes, rôles, paramétrage », journal d'audit §11.3), `docs/roles-personas-as-caribbean.md` (Bénévole : « Missions, planning, consignes et confirmations » ; Administrateur : « Paramétrage… »), specs sœurs `web-localizations.md` (patron le plus proche : référentiel admin, pas de suppression), `web-seasons.md`, `CLAUDE.md` §3 à §9, `docs/ARCHITECTURE.md` §3.
> État du code lu : `domain/entities/convocation.ts` (`ConvocationType = 'training' | 'match' | 'meeting'`), `domain/policies/{actions,rbac-matrix}.ts`, `domain/usecases/training-locations/*`, `presentation/shared/errors/map-domain-error-to-ui-error.ts`, `presentation/features/backoffice/backoffice-nav.ts`, `presentation/app/router.tsx`, `presentation/shared/query-keys.ts`, `supabase/migrations/20260811171754_initial_schema.sql` (`convocations.type text check (type in ('training','match','meeting'))`), `20261001071613_web_localizations.sql`.
> Maquettes : `docs/designs/desktop/mission-template/[Admin] Web - Référentiel mission  {1,2,3,4}.png` (deux espaces avant le numéro), lues directement (§0).

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

Le registre **existe** à `docs/designs/DESIGN_LINKS.md` (et non `docs/DESIGN-LINKS.md`). **Aucune ligne pour `web-mission-templates`.** Quatre exports PNG sont présents, sans lien artifact : cas **`instantané seul`** (§2 et §4 du registre). **Aucun lien n'est demandé.**

L'agent PO n'écrit que dans `specs/`. Ligne **pré-rédigée, à recopier telle quelle** au §2 du registre (PO-MT-08) :

```
| web-mission-templates — **backoffice desktop : référentiel des missions (onglets par type, liste, dialogue d'ajout)** (`[Admin] Web - Référentiel mission  {1,2,3,4}`) | — aucun lien fourni | 2026-10-02 | `docs/designs/desktop/mission-template/[Admin] Web - Référentiel mission  {1,2,3,4}.png` | **instantané seul** |
```

Note à joindre : les quatre exports sont **un seul écran et ses états**. 4 = onglet Entraînement, liste avec une ligne inactive ; 3 = onglet Match, liste ; 2 = onglet Réunion, état vide ; 1 = onglet Réunion, état vide + dialogue « Ajouter une mission — Réunion ». La navigation latérale montre « Statistiques », absente de toute spec (même écart que PO-WA-09). ⚠️ Le dossier apparaît en `??` dans `git status` : à committer avec la ligne de registre.

**Ce que montrent les exports, factuellement** (sans décision UI, qui relève de designer-agent) : entrée de navigation « Référentiel missions » placée après « Convocations » ; titre « Référentiel des missions » ; bandeau « Les modifications s'appliquent aux prochaines convocations uniquement. Les convocations déjà créées ne sont pas modifiées. » ; trois onglets Entraînement / Match / Réunion ; bouton « + Mission » ; colonnes `MISSION`, `CAPACITÉ`, `STATUT` (Actif / Inactif) ; par ligne « Désactiver » ou « Réactiver » + crayon ; dialogue d'ajout titré avec le type de l'onglet, champ « LIBELLÉ », choix « CAPACITÉ PAR DÉFAUT » 1 / 2 / 3 personnes. **Pas illustré** : dialogue de modification, suppression (exclue par décision).

## 1. Périmètre

### Ce que c'est

Un **référentiel club-wide de modèles de mission**, par type de convocation, géré par l'Administrateur dans le backoffice web : **lister**, **créer**, **modifier** (libellé, capacité), **désactiver** et **réactiver**. De bout en bout : domaine, données, migration, écran backoffice.

Contexte (hors de cette passe) : les convocations porteront plus tard des missions auxquelles les membres s'inscrivent (« Apporter l'eau », « Laver les maillots »), pré-remplies à la création depuis les modèles actifs de leur type.

### Rattachement CDC

| Élément | Module CDC | Priorité |
|---|---|---|
| Modèles de mission | **Événements et bénévoles** — « Postes, missions, affectations, bilan » | **P1** |
| Gestion par l'Administrateur | Ligne « Gérer postes/missions bénévoles » (voir §3 : écart assumé) et rôle Administrateur « Paramétrage » | — |
| Surface backoffice | Surface de rendu (`specs/web-empty-state.md` §1) | — |

### Au périmètre

- Table `public.mission_templates`, contraintes `check`, RLS administrateur seul, sans politique `delete` (§2.3).
- Entité, règles, erreur, action RBAC, dépôt, use cases (§2.2).
- DTO `Row`, mapper, `RepositoryImpl`.
- Écran backoffice : liste par type, création, modification, désactivation / réactivation ; entrée de navigation.

### Hors périmètre, explicitement

- Missions **attachées à une convocation**, inscriptions des membres, copie des modèles à la création d'une convocation.
- Tout écran coach, joueur ou bénévole ; tout écran mobile.
- **Suppression** d'un modèle : jamais (aucune méthode, aucune politique, aucun contrôle).
- Rattachement d'un modèle à une section ou une équipe (PO-MT-04).
- L'entrée « Statistiques » de la navigation de la maquette ; recherche, badges, pastille de la barre supérieure.
- Restructuration de `docs/ARCHITECTURE.md` (son §10 « Cap mobile-only » est en retard sur le backoffice web) : non traité ici.

## 2. Modèle et règles

### 2.1 Règles métier (tranchées)

| Règle | Valeur |
|---|---|
| Composition | type de convocation, libellé, capacité par défaut, **description optionnelle**, indicateur actif |
| Description | **optionnelle** ; rognée ; vide ou espaces seuls = absente (stockée `null`, entité `description: string \| null`) ; **500 caractères maximum** (`MAX_MISSION_DESCRIPTION_LENGTH`) — **valeur par défaut à confirmer par la développeuse** |
| Capacité par défaut | entier, **1 à 3 inclus** |
| Libellé | **non vide après rognage** |
| Cycle de vie | **jamais supprimé** ; désactivé / réactivé |
| Effet d'une modification | **convocations futures uniquement** — rien n'est recopié ni réécrit ailleurs (le bandeau de la maquette le dit à l'utilisateur) |
| Type de convocation | fixé à la création, **non modifiable** (le contrat `update` ne le porte pas) |
| Qui | **Administrateur seul**, lecture comprise |

### 2.2 Domaine

| Élément | Chemin | Contenu |
|---|---|---|
| Entité | `src/domain/entities/mission-template.ts` | `MissionTemplate { id, convocationType: ConvocationType, label, defaultCapacity, description: string \| null, isActive }` — `ConvocationType` importé de `entities/convocation.ts`, pas redéfini |
| Règles pures | `src/domain/policies/mission-rules.ts` | `MIN_MISSION_CAPACITY = 1`, `MAX_MISSION_CAPACITY = 3`, `isValidMissionCapacity(n)` (entier dans l'intervalle), `isValidMissionLabel(s)` (non vide après rognage), `MAX_MISSION_DESCRIPTION_LENGTH = 500`, `isValidMissionDescription(d: string \| null)` (null ou longueur ≤ 500) et `normalizeMissionDescription` (rognage, vide → `null`). Commentaire d'en-tête : **miroir des contraintes `check` SQL** de §2.3. Emplacement conforme à l'usage du dépôt (`team-form-rules.ts`, `match-lineup-rules.ts`), voir PO-MT-07 |
| Erreur | `src/domain/errors/invalid-mission-template-error.ts` | `InvalidMissionTemplateError extends DomainError` |
| Traduction | `src/presentation/shared/errors/map-domain-error-to-ui-error.ts` (+ son `.test.ts`) | Branche dédiée, **au-dessus** du repli `DomainError`, message français, ex. « Le libellé est obligatoire, la capacité doit être comprise entre 1 et 3 personnes et la description ne peut pas dépasser 500 caractères. » |
| Action RBAC | `src/domain/policies/actions.ts`, `rbac-matrix.ts`, `can.test.ts` | **Une seule** action nouvelle `'mission-template:manage': ['admin']` (§3) |
| Dépôt | `src/domain/repositories/mission-template-repository.ts` | `listAll(): Promise<MissionTemplate[]>` ; `create(input: Omit<MissionTemplate, 'id' \| 'isActive'>)` ; `update(id, input: Pick<MissionTemplate, 'label' \| 'defaultCapacity'>)` ; `setActive(id, isActive: boolean)`. **Aucune méthode de suppression** |
| Use cases | `src/domain/usecases/mission-templates/` | voir ci-dessous |

**Use cases** (patron `domain/usecases/training-locations/`) :

- `ListMissionTemplatesUseCase` — appelle `listAll()`. **Pas de `can()`** : la lecture est RLS seule, comme `ListTrainingLocationsUseCase` (critère d'en-tête de `rbac-matrix.ts`).
- `CreateMissionTemplateUseCase` — entrée `{ actorId, convocationType, label, defaultCapacity }`. Charge l'utilisateur, `ForbiddenError` si `can(user, 'mission-template:manage')` est faux ; rogne le libellé ; `InvalidMissionTemplateError` si `isValidMissionLabel` ou `isValidMissionCapacity` échoue, **avant tout appel réseau** ; le modèle créé est actif.
- `UpdateMissionTemplateUseCase` — entrée `{ actorId, missionTemplateId, label, defaultCapacity }`. Mêmes contrôles et même ordre.
- `SetMissionTemplateActiveUseCase` — entrée `{ actorId, missionTemplateId, isActive }`. Même contrôle `can()`. **Idempotent** : désactiver un modèle inactif (ou réactiver un actif) réussit sans erreur, comme `ArchiveTrainingLocationUseCase`. **Hypothèse** : nom et forme déduits (PO-MT-01).

### 2.3 Données et migration

- **Données** : `src/data/dto/MissionTemplateRow.ts` (`MissionTemplateRow`), `src/data/mappers/mission-template-mapper.ts` (+ test), `src/data/repositories/MissionTemplateRepositoryImpl.ts`. Erreurs Supabase via `data/errors/map-supabase-error.ts` : une violation de `check` remonte en `InvalidMissionTemplateError`, jamais en texte Postgres brut.
- **Migration nouvelle** (`supabase/migrations/<timestamp>_web_mission_templates.sql`, aucune migration existante modifiée) — table `public.mission_templates` :

| Colonne | Type / contrainte |
|---|---|
| `id` | `uuid primary key default gen_random_uuid()` |
| `convocation_type` | `text not null check (convocation_type in ('training','match','meeting'))` — même liste que `convocations.type` |
| `label` | `text not null check (btrim(label) <> '')` |
| `default_capacity` | `integer not null check (default_capacity between 1 and 3)` |
| `description` | `text` nullable, `check (description is null or char_length(description) <= 500)` — miroir de `isValidMissionDescription` |
| `is_active` | `boolean not null default true` |

Chaque `check` porte en commentaire SQL le nom de la règle TypeScript miroir (`isValidMissionLabel`, `isValidMissionCapacity` / `MIN_`/`MAX_MISSION_CAPACITY`). Une colonne `created_at` n'est ajoutée que si l'ordre de création est retenu (PO-MT-03).

- **RLS** activée, exactement trois politiques, chacune commentée `'mission-template:manage'` :

| Opération | Politique |
|---|---|
| `select` | `using (private.is_admin())` |
| `insert` | `with check (private.is_admin())` |
| `update` (modification, désactivation, réactivation) | `using` et `with check (private.is_admin())` |
| `delete` | **aucune** |

- **Type non modifiable en base** : `revoke update` puis `grant update (label, default_capacity, description, is_active)` au rôle `authenticated` (patron des `grant update (colonnes)` déjà en place), pour que `convocation_type` ne soit pas réécrivable même par appel direct.

### 2.4 Écran backoffice

Chemins à suivre, relevés dans le code (pas de restructuration) :

| Élément | Chemin |
|---|---|
| Page + ViewModel + composants locaux | `src/presentation/features/backoffice/mission-templates/` (`BackofficeMissionTemplatesPage.tsx`, `useBackofficeMissionTemplatesViewModel.ts`, `components/`) — patron `features/backoffice/localizations/` |
| Route | `src/presentation/app/router.tsx`, enfant de `BackofficeDashboardLayout` sous `/admin` (gardes `RequireBackofficeSession` → `RequireBackofficeAccess`), ex. `{ path: 'mission-templates', … }` |
| Navigation | `src/presentation/features/backoffice/backoffice-nav.ts` : nouvel `id` dans `BackofficeNavItemId` et entrée dans `BACKOFFICE_NAV_ITEMS` |
| Injection | `src/presentation/di/containers/mission-templates-container.ts` + `src/presentation/di/hooks/use-mission-templates-dependencies.ts` — patron `training-locations-container.ts` |
| Clés de requête | `src/presentation/shared/query-keys.ts`, une racine `['mission-templates']` |

Le ViewModel calcule `canManage = can(user, 'mission-template:manage')` ; les contrôles d'écriture ne sont rendus que s'il est vrai.

## 3. RBAC

### Ligne de matrice CDC applicable — et écart assumé

« **Gérer postes/missions bénévoles** » : Joueur ❌ · Coach ❌ · **Resp. section ✅ (sa section)** · **Dirigeant habilité ✅** · Trésorier ❌ · Référent médical ❌ · Bénévole ❌ (consulte/confirme) · **Administrateur ✅**.

**Décision de la développeuse : Administrateur seul.** C'est un **resserrement délibéré** par rapport à cette ligne, pas une lecture de celle-ci. Motifs défendables : un référentiel club-wide sans portée de section relève aussi du « paramétrage » (ligne « Gérer comptes, rôles, paramétrage », admin seul) ; `'backoffice:access'` est déjà `['admin']` (PO-WE-01), donc aucun autre rôle n'atteindrait l'écran ; moindre privilège. L'élargissement est PO-MT-02, non bloquant.

| Rôle | Lire le référentiel | Créer / modifier / désactiver / réactiver |
|---|---|---|
| Joueur/Joueuse | ❌ | ❌ |
| Coach/Staff | ❌ | ❌ |
| Responsable de section | ❌ (écart, PO-MT-02) | ❌ (écart, PO-MT-02) |
| Dirigeant habilité | ❌ (écart, PO-MT-02) | ❌ (écart, PO-MT-02) |
| Trésorier | ❌ | ❌ |
| Référent médical | ❌ | ❌ |
| Bénévole | ❌ | ❌ |
| **Administrateur** | ✅ club-wide | ✅ club-wide |

### Entrée de matrice

```
'mission-template:manage': ['admin']
```

- **Seul changement RBAC de cette feature.** Ni `'backoffice:access'`, ni `can.ts` ne changent : la `RoleAssignment` `admin` n'a pas de portée.
- Commentaire renvoyant à cette spec et aux trois politiques de §2.3 (miroir manuel, `CLAUDE.md` §7).
- Nom : forme demandée par la développeuse ; la convention du dépôt serait `mission_template:…` (PO-MT-06, cosmétique).

## 4. Données sensibles

| Nature | Cette feature |
|---|---|
| Données de santé | Aucune |
| Données financières | Aucune |
| Données nominatives | Aucune — un libellé de tâche et une capacité |
| Action du CDC §11.3 | Aucune |

**Audit** : rien n'est exigé par le CDC §11.3 ; **aucun code d'audit n'est ajouté** dans cette passe (même position par défaut que `web-localizations`, PO-WL-11). Voir PO-MT-05. **Rétention** : aucune purge.

**Noms dans la maquette** : la barre supérieure affiche un nom de personne ; il n'est repris nulle part (code, placeholders, tests, fixtures — `CLAUDE.md` §9).

## 5. Critères d'acceptation

Numérotation **`AC-MT-xx`**.

**Base de données**

- **AC-MT-01** — Une nouvelle migration crée `public.mission_templates` (§2.3). Aucune migration existante n'est modifiée.
- **AC-MT-02** — Un `insert` ou `update` avec `default_capacity` égal à 0, 4, ou nul est refusé ; 1, 2 et 3 sont acceptés. Un `label` vide ou réduit à des espaces est refusé. Un `convocation_type` hors `training`/`match`/`meeting` est refusé.
- **AC-MT-03** — RLS activée, exactement trois politiques (`select`, `insert`, `update`), toutes sur `private.is_admin()` et commentées `'mission-template:manage'`. **Aucune politique `delete`** : un `delete` échoue même pour un administrateur.
- **AC-MT-04** — Avec un jeton non administrateur (au moins `coach`, `authorized-officer`, `section-manager`, `volunteer`) : `select` renvoie zéro ligne, `insert` et `update` échouent.
- **AC-MT-05** — Un `update` de `convocation_type` échoue, y compris pour un administrateur. `label`, `default_capacity` et `is_active` restent modifiables par lui.

**Domaine**

- **AC-MT-06** — `MissionTemplate`, `mission-rules.ts`, `InvalidMissionTemplateError`, `MissionTemplateRepository` (`listAll`, `create`, `update`, `setActive`, **pas de suppression**), `MissionTemplateRow`, son mapper et `MissionTemplateRepositoryImpl` existent aux chemins de §2.2/§2.3. Aucun import de `data/` depuis `presentation/`.
- **AC-MT-07** — Tests Vitest de `mission-rules.ts` : `isValidMissionCapacity` vrai pour 1, 2, 3 ; faux pour 0, 4, 2.5, `NaN`. `isValidMissionLabel` faux pour `''` et `'   '`, vrai pour un libellé entouré d'espaces.
- **AC-MT-08** — `CreateMissionTemplateUseCase` et `UpdateMissionTemplateUseCase` : `ForbiddenError` sans le droit ; libellé rogné avant écriture ; `InvalidMissionTemplateError` sur libellé ou capacité invalide **sans aucun appel au dépôt**. Un modèle créé est actif. Testé avec des faux.
- **AC-MT-09** — `SetMissionTemplateActiveUseCase` : `ForbiddenError` sans le droit ; désactive et réactive ; idempotent dans les deux sens. Testé.
- **AC-MT-10** — `'mission-template:manage'` est ajoutée à `actions.ts` et vaut `['admin']` dans `rbac-matrix.ts`, avec commentaire de miroir. `can.test.ts` : `admin` → vrai ; `coach`, `authorized-officer`, `volunteer` → faux. **Aucune autre action ni aucun autre rôle** n'est ajouté ; `can.ts` et `'backoffice:access'` inchangés.
- **AC-MT-11** — `mapDomainErrorToUiError` traduit `InvalidMissionTemplateError` en message français dédié (branche au-dessus du repli `DomainError`), couvert par `map-domain-error-to-ui-error.test.ts`.

**Écran backoffice**

- **AC-MT-12** — Une entrée de navigation mène à la page, derrière les mêmes gardes que les autres entrées `/admin/*`, sans badge. « Statistiques » n'est pas ajoutée.
- **AC-MT-13** — La page filtre les modèles par type de convocation (Entraînement / Match / Réunion) et affiche pour chacun libellé, capacité et statut actif/inactif **porté par du texte**. Un modèle inactif reste listé. États chargement, erreur (français, jamais un message Supabase brut) et vide par type distincts.
- **AC-MT-14** — La création crée un modèle du **type actuellement sélectionné** ; la modification enregistre libellé et capacité sur la **même** ligne, sans changer le type. Le choix de capacité n'offre que 1, 2 ou 3.
- **AC-MT-15** — Désactiver / réactiver bascule `is_active` ; la liste reflète tout changement sans rechargement manuel (invalidation de la racine `['mission-templates']`). Un échec laisse le dialogue ouvert, saisies conservées, avec le message traduit.
- **AC-MT-16** — Les contrôles d'écriture ne sont rendus que si `canManage` est vrai (booléen du ViewModel, distinct de l'accès à la route). **Aucun contrôle de suppression**, nulle part, même désactivé.
- **AC-MT-17** — Contrôles interactifs à `h-11` minimum, dialogues utilisables au clavier, contrastes AA. Aucun nom de personne codé en dur.

## 6. Points ouverts

**Aucun point ne bloque le handoff vers designer-agent ni l'implémentation.**

| Réf. | Question | Pour qui | Bloquant ? |
|---|---|---|---|
| **PO-MT-01** | **Use case de (dés)activation — hypothèse.** La demande transmise était tronquée après Create/Update. Retenu par déduction : `SetMissionTemplateActiveUseCase { actorId, missionTemplateId, isActive }`, contrôle `can()` et idempotence, sur le patron `ArchiveTrainingLocationUseCase`. À confirmer, ou à remplacer par deux use cases `Deactivate…`/`Reactivate…` | Développeuse | Non |
| **PO-MT-02** | **Écart avec la matrice CDC.** « Gérer postes/missions bénévoles » donne ✅ au Responsable de section (sa section) et au Dirigeant habilité. Administrateur seul est un resserrement assumé. À valider par le Bureau ; un élargissement au Responsable de section exigerait une portée de section que ce référentiel n'a pas (PO-MT-04) | Bureau | Non |
| **PO-MT-03** | **Ordre d'affichage.** La maquette n'est pas alphabétique (ordre de création probable, inactifs en fin). Défaut proposé : actifs d'abord, puis ordre de création, ce qui exige `created_at` ; sinon alphabétique sans colonne nouvelle | Développeuse | Non |
| **PO-MT-04** | **Portée.** Référentiel club-wide, toutes sections confondues (aucune section sur la maquette) : un match d'e-sport recevrait « Laver les maillots ». Faut-il un rattachement par section, avant que la copie à la création de convocation ne soit construite ? | Bureau | Non pour cette passe |
| **PO-MT-05** | **Audit** des créations/modifications/(dés)activations : hors CDC §11.3. Tracer par cohérence avec saisons/sections/équipes, ou rester sans trace comme les lieux (PO-WL-11) ? | Développeuse | Non |
| **PO-MT-06** | **Nom de l'action.** Les actions du dépôt sont en `snake_case` avant les deux-points (`training_location:write`, `match_lineup:write`) ; la forme demandée est `mission-template:manage`. Garder, ou aligner en `mission_template:manage` ? | Développeuse | Non |
| **PO-MT-07** | **Emplacement de `mission-rules.ts`.** `ARCHITECTURE.md` §3 range ce type de règle (« qu'est-ce qui est vrai sur une donnée ») dans `domain/rules/`, mais le dépôt en place beaucoup dans `domain/policies/`. `policies/` retenu, comme demandé | Développeuse | Non |
| **PO-MT-08** | **Écritures hors `specs/`** : recopier la ligne du §0 dans `docs/designs/DESIGN_LINKS.md` et committer le dossier `docs/designs/desktop/mission-template/` (non suivi) | Développeuse | Non |
| **PO-MT-09** | **Lecture future par les créateurs de convocation.** La lecture est admin seule. Quand la copie à la création sera construite, un coach devra lire les modèles actifs de son type : élargir le `select`, ou copier côté base (fonction) ? À trancher dans la spec de cette passe future | Développeuse | Non (passe future) |
| **PO-MT-10** | **Libellés en double** dans un même type : aucune contrainte d'unicité prévue. En faut-il une ? À décider tôt : ajoutée plus tard, elle échouerait sur les doublons existants | Développeuse | Non |
| **PO-MT-11** | **Modification d'un modèle inactif.** Rien ne l'interdit en domaine ni en RLS ; la maquette 4 montre un crayon atténué sur la ligne inactive. Autorisée ou non ? | Développeuse / designer-agent | Non |

## 7. Note pour designer-agent

- Références : les quatre exports du §0. Dialogue de modification **non illustré** : le dériver du dialogue d'ajout (patron `TrainingLocationFormDialog`).
- Ne pas trancher en dessinant : modification d'une ligne inactive (PO-MT-11), confirmation avant désactivation (non demandée), ordre des lignes (PO-MT-03). Aucun contrôle de suppression, même désactivé.

## UI design

### Sources utilisées

1. `docs/designs/DESIGN_LINKS.md` : aucune ligne pour `web-mission-templates` (recherche faite). Cas `instantané seul` du §0 : **aucun lien n'est demandé**. La ligne pré-rédigée du §0 reste à recopier par la développeuse (PO-MT-08). Je n'écris pas dans `docs/`.
2. Les quatre exports, lus directement :
   - `docs/designs/desktop/mission-template/[Admin] Web - Référentiel mission  4.png` : onglet Entraînement, trois lignes dont une inactive (« Réactiver », crayon atténué).
   - `… 3.png` : onglet Match, liste plus longue (coupée en bas).
   - `… 2.png` : onglet Réunion, état vide avec bouton « + Ajouter une mission ».
   - `… 1.png` : état vide + dialogue « Ajouter une mission — Réunion » (libellé + trois boutons de capacité).
3. Patrons déjà construits, repris tels quels : `specs/web-localizations.md` « UI design » (bloc titre + tableau + `TrainingLocationFormDialog` à deux modes + états + `BackofficeEmptyState`), `specs/web-seasons.md`, `features/backoffice/localizations/`.

**Aucun composant visuel inédit** : une page de liste à onglets, un dialogue de formulaire, un état vide, tous déjà couverts. Pas de prototype Claude Design à demander. Seul le dialogue de modification n'est pas illustré : il est dérivé du dialogue d'ajout (ci-dessous).

### Où ça vit

- **Backoffice desktop**, nouvelle destination de la navigation latérale `/admin/*`. Les 4 entrées de la barre mobile ne changent pas (cette surface n'en fait pas partie).
- Entrée de `BACKOFFICE_NAV_ITEMS` : id `mission-templates`, libellé **« Référentiel missions »**, chemin `/admin/mission-templates`, icône `IconChecklist` (proposition, remplaçable par toute icône du jeu Tabler déjà utilisé), `emptyStateTitle` « Aucune mission à afficher pour l’instant ».
- **Position : juste après `convocations` (« Convocations ») et avant `news` (« Actus »)**, comme la maquette. Aucune autre entrée n'est réordonnée. Pas de badge. **« Statistiques » n'est pas ajoutée.** Mêmes gardes que les autres entrées (AC-MT-12).
- Page `features/backoffice/mission-templates/` : `BackofficeMissionTemplatesPage.tsx`, `useBackofficeMissionTemplatesViewModel.ts`, `components/`. Rendue dans l'`<Outlet/>` de `BackofficeDashboardLayout`.
- La barre supérieure de la maquette (recherche, pastille, nom de la personne connectée) est du chrome existant ou hors périmètre (§1). Rien n'est repris ni ajouté.

### Ce qui change par rôle

Reprend le §3, rien de redéfini.

| Rôle | Effet |
|---|---|
| **Administrateur** | Atteint la page. « + Mission », « Ajouter une mission », crayon, « Désactiver » / « Réactiver » rendus si `canManage = can(user, 'mission-template:manage')`, calculé par le ViewModel **séparément** de l'accès à la route |
| Tous les autres rôles | Porte fermée (`RequireBackofficeAccess`), aucun écran |

Si `canManage` est faux, les contrôles d'écriture **disparaissent** (jamais grisés) : le tableau reste lisible, sans colonne d'action. **Aucun contrôle de suppression**, même désactivé (AC-MT-16).

### Écran — page `/admin/mission-templates`

Structure verticale, dans l'ordre de la maquette :

1. **Titre** `h2` « Référentiel des missions ».
2. **Bandeau d'information** (`Alert` variante par défaut, pas destructive, icône d'info) : « Les modifications s'appliquent aux prochaines convocations uniquement. Les convocations déjà créées ne sont pas modifiées. » Toujours visible, aussi pendant le chargement. Il répond à l'effet de §2.1.
3. **Barre d'onglets + action**, sur une ligne : onglets à gauche, bouton à droite.
   - Onglets **Entraînement / Match / Réunion** : `tabs.tsx` (déjà vendu), un seul onglet actif, **Entraînement par défaut**. L'onglet actif est un état local du ViewModel (pas dans l'URL : rien dans le périmètre ne l'exige). Chaque déclencheur `h-11`. Le filtre se fait côté client sur la liste unique de `ListMissionTemplatesUseCase` (une seule requête, une seule racine `['mission-templates']`).
   - Bouton **« + Mission »** (`IconPlus` + texte), `h-11`, `rounded-full`, rendu si `canManage`. Ouvre le dialogue d'ajout **pour le type de l'onglet actif**.
   - **Style** : la maquette montre un vert plein (`bg-coach-green`) pour le bouton et pour l'onglet actif. Je suis la maquette ici (vert plein), plutôt que la puce blanche de `web-localizations` : le bouton est l'action primaire de l'écran et la maquette est la référence rendue. Un seul endroit à changer si les pages sont alignées plus tard.
4. **Tableau** (`table.tsx`, pas de `<table>` fait main), dans une carte arrondie comme la maquette.
   - Colonnes **MISSION**, **CAPACITÉ**, **STATUT**, plus une colonne d'action sans en-tête visible (`sr-only`). **Pas d'en-tête collant** (convention du projet pour les tableaux d'administration).
   - `MISSION` : libellé en `font-semibold` ; **si la description est non vide**, une seconde ligne en texte secondaire atténué sous le libellé (rien n'est rendu sinon). `CAPACITÉ` : « 1 personne » / « 2 personnes » / « 3 personnes » (singulier pour 1), texte secondaire. `STATUT` : « Actif » / « Inactif », **toujours en texte** (AC-MT-13). Le vert de « Actif » est un renfort, pas le porteur de l'information.
   - **Ligne inactive** : libellé et capacité atténués (`text-white/40`), statut « Inactif » en gris. L'atténuation est un renfort : le texte « Inactif » porte l'information. Elle reste listée.
   - **Ordre** : actifs d'abord, puis inactifs, au sein de chaque groupe l'ordre de création si `created_at` est retenu, sinon alphabétique (PO-MT-03, défaut proposé : actifs d'abord ; le tri est fait par le ViewModel, la maquette 4 le confirme avec l'inactif en dernier).
   - **Colonne d'action** (si `canManage`), alignée à droite, deux contrôles :
     - **« Désactiver »** sur une ligne active / **« Réactiver »** sur une ligne inactive : bouton à libellé texte (jamais une icône seule), `h-11`, `rounded-full`. « Désactiver » en style neutre (`variant="outline"`), « Réactiver » en vert plein (maquette 4). `aria-label` « Désactiver la mission « {libellé} » » / « Réactiver … ». **Sans confirmation** : l'action est réversible en un clic (« Réactiver ») et le use case est idempotent, donc un double-clic est sans danger. Pendant la mutation, le bouton de la ligne est `disabled` avec libellé « Désactivation… » / « Réactivation… ».
     - **Crayon** (`IconPencil`) : `Button` `variant="ghost"` `size="icon"`, `h-11 w-11`, `aria-label="Modifier la mission « {libellé} »"`. Ouvre le dialogue de modification.
   - Sur ligne inactive, la maquette 4 montre un crayon **atténué** : voir PO-MT-11 ci-dessous.

### Nouveau composant — `MissionTemplateFormDialog`

Un seul composant, deux modes `create` | `edit`, sur le patron `TrainingLocationFormDialog` (`dialog.tsx` déjà vendu). Largeur contenue (~`max-w-md`), comme la maquette 1.

| Paramètre | Création | Modification (non illustré) |
|---|---|---|
| Titre | « Ajouter une mission — {Type} » (maquette 1), {Type} = Entraînement / Match / Réunion de l'onglet actif | « Modifier la mission — {Type} » |
| Valeurs initiales | Libellé vide, capacité **1** présélectionnée (maquette 1) | Libellé et capacité de la ligne |
| Bouton de validation | « Ajouter » | « Enregistrer » |
| Use case | `CreateMissionTemplateUseCase` (type = onglet actif) | `UpdateMissionTemplateUseCase`, même ligne, jamais un doublon |
| Déclencheur | « + Mission » ou « + Ajouter une mission » (état vide) | Crayon |

**Le type n'est jamais un champ** : il est rappelé dans le titre et ne se modifie pas (§2.1, AC-MT-05). En modification, le type reste affiché dans le titre.

**Champs**, **empilés pleine largeur** :
- **LIBELLÉ** : `Label` en capitales (`text-xs font-semibold uppercase tracking-wider`), `Input` `h-11 rounded-xl`, `required`, placeholder générique « Ex. Apporter l'eau » (le libellé de la maquette est un exemple d'usage et ne contient aucun nom de personne ; il reste acceptable en placeholder).
- **DÉTAILS (optionnel)** : `Label` en capitales, `Textarea` (`textarea.tsx`, déjà vendu) `rounded-xl`, `min-h-20`, `maxLength` 500, plein largeur, placé entre LIBELLÉ et CAPACITÉ. Vide ou espaces seuls = absent (`null`). Valeur initiale en modification : la description de la ligne. Le maximum de 500 est une valeur par défaut **à confirmer par la développeuse**.
- **CAPACITÉ PAR DÉFAUT** : trois choix exclusifs « 1 personne » / « 2 personnes » / « 3 personnes », **`toggle-group.tsx`** (déjà vendu) en `type="single"`, trois items égaux sur une ligne (`grid grid-cols-3 gap-2`), chacun `h-11`, l'actif en vert plein (maquette 1). Le choix **ne peut pas être vide** : un clic sur l'item actif ne le désélectionne pas (ignorer la valeur vide dans le gestionnaire). Alternative équivalente : `radio-group.tsx` stylé en boutons. **Pas de champ numérique libre** : l'intervalle 1 à 3 est ainsi impossible à violer depuis l'écran (AC-MT-14).
- **Trois items côte à côte** : chaque item de la grille porte `min-w-0` et le libellé peut passer à la ligne ou se tasser, pour ne pas déborder de la colonne (CLAUDE.md §6). Vérifié dans un dialogue étroit, pas seulement en pleine largeur.

**Pied** : `Annuler` (`variant="outline"`, `h-11`, `rounded-full`, ferme sans écriture) puis le bouton de validation (`h-11`, `rounded-full`, vert plein), alignés à droite comme la maquette. Validation en `type="submit"` d'un `<form>` englobant (soumission au clavier avec Entrée). Focus initial sur le champ LIBELLÉ.

**États et messages de validation du dialogue**

| État | Rendu |
|---|---|
| Soumission en cours | Champs et boutons `disabled`, libellé « Ajout… » / « Enregistrement… » |
| Libellé vide ou d'espaces seuls (`required` natif laisse passer des espaces ; refus `InvalidMissionTemplateError`, AC-MT-08) | Dialogue ouvert, saisies conservées, `Alert` `variant="destructive"` en haut du formulaire : « Le libellé est obligatoire, la capacité doit être comprise entre 1 et 3 personnes et la description ne peut pas dépasser 500 caractères. » (message du §2.2, une seule chaîne pour les deux règles) |
| Description de plus de 500 caractères (défense en profondeur, le champ plafonne la saisie) | Même `Alert` |
| Capacité hors 1..3 | Impossible depuis l'écran (choix fermé). Défense en profondeur : même `Alert` |
| Échec réseau / base | Même `Alert`, texte français traduit, jamais de message Supabase brut. Dialogue ouvert, saisies conservées (AC-MT-15) |
| Succès | Le dialogue se ferme, la liste est rafraîchie par invalidation de la racine `['mission-templates']`. L'onglet actif ne change pas |

Si la développeuse veut un message **par champ** plutôt qu'un seul pour deux règles, il faudra deux erreurs de domaine distinctes ; non demandé, non fait.

### États de la page

| État | Rendu |
|---|---|
| Chargement | Lignes de squelette (`skeleton.tsx`) dans la carte du tableau, jamais un flash d'état vide. Titre, bandeau, onglets et bouton restent rendus |
| Erreur de chargement | `Alert` `variant="destructive"` au-dessus du tableau, message français (jamais un message Supabase brut), bouton « Réessayer » `h-11`. Onglets visibles |
| **Vide pour le type** (maquette 2) | Dans la carte, à la place du tableau : `BackofficeEmptyState` avec titre « Aucune mission pour « {Type} » » et texte « Les nouvelles convocations de ce type seront créées sans mission par défaut. », plus un bouton « + Ajouter une mission » (`h-11`, `rounded-full`, vert plein) qui ouvre le dialogue d'ajout. Les deux boutons « + Mission » (en-tête) et « + Ajouter une mission » coexistent comme sur la maquette. Si `canManage` est faux, pas de bouton. Un type dont **toutes** les lignes sont inactives n'est pas vide : le tableau les liste |
| Échec de (dés)activation | `Alert` `variant="destructive"` au-dessus du tableau, message traduit ; la ligne retrouve son état antérieur |

### Questions UI

Aucune ne bloque la construction. Défauts proposés, à confirmer.

- **PO-MT-11 — modification d'une ligne inactive.** **Défaut proposé : autorisée**, crayon rendu et actif, avec l'atténuation visuelle de la maquette 4 conservée sur le seul libellé de la ligne. Motif : rien ne l'interdit en domaine ni en RLS, corriger une faute avant réactivation est utile, et retirer le crayon serait un état « grisé » proche de ce que le projet évite. Si la développeuse veut l'interdire : retirer le crayon des lignes inactives (la place reste vide, pas de crayon grisé).
- **PO-MT-03 — ordre des lignes.** Défaut : actifs d'abord, puis inactifs, puis ordre de création (nécessite `created_at`) ou alphabétique sans colonne nouvelle. Le tri est dans le ViewModel, donc indépendant de la décision de schéma.
- **Confirmation avant désactivation** : proposée **absente** (réversible, idempotent). À ajouter sous forme d'`alert-dialog.tsx` sur le patron `ArchiveTrainingLocationDialog` si la développeuse la veut.
- **Style du bouton « + Mission »** : vert plein, suivant la maquette (voir « Écran »).
- **Persistance de l'onglet actif dans l'URL** : non retenue. À reconsidérer seulement si un lien profond vers un type devient utile.
- **Icône** `IconChecklist` : proposition.
- Aucun nom de personne de la maquette n'est repris (AC-MT-17).

### Composants shadcn mobilisés

| Élément | Primitive | Déjà vendue ? |
|---|---|---|
| Onglets de type | `tabs.tsx` | Oui |
| Tableau | `table.tsx` | Oui |
| Dialogue ajout/modification | `dialog.tsx` | Oui |
| Choix de capacité 1/2/3 | `toggle-group.tsx` (ou `radio-group.tsx`) | Oui |
| Chargement | `skeleton.tsx` | Oui |
| Champs, boutons | `input.tsx`, `label.tsx`, `button.tsx` | Oui |
| Bandeau et erreurs | `alert.tsx` | Oui |

Aucune primitive à ajouter. Aucune confirmation d'archivage donc pas d'`alert-dialog.tsx` pour cet écran, sauf décision contraire ci-dessus.
