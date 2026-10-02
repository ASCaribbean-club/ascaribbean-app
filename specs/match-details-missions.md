# Spec — Missions d'une convocation, mobile joueur et coach (`match-details-missions`)

> Statut : **première rédaction (2026-10-02)**, branche `feature/match-details-missions`. Règles métier données par la développeuse (brief du 2026-10-02), reprises au §2 sans les réinterpréter. **Une question bloque l'écriture de la migration** (PO-MM-01). **Aucune ne bloque le passage à designer-agent** (§7).
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (module P1 « Événements et bénévoles », ligne de matrice « Gérer postes/missions bénévoles », exigences transversales), `docs/roles-personas-as-caribbean.md`, `CLAUDE.md` §3 à §9, `docs/ARCHITECTURE.md`, specs sœurs `web-mission-templates.md` (référentiel, prérequis), `create-convocation.md` (§2 « Écriture — un point d'entrée par type, une transaction »), `match_details_page.md` (écran hôte), `player-dashboard.md` (carte « Prochaine convocation »).
> État du code lu : voir §0.1 et §0.2. Maquettes : `docs/designs/match-missions/` (§0).

## 0. Registre des maquettes et vérifications préalables

### Registre (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne pour `match-details-missions`.** Sept exports PNG sont présents dans le dépôt, sans lien artifact : cas **`instantané seul`** (§2 et §4 du registre). **Aucun lien n'est demandé.**

L'agent PO n'écrit que dans `specs/`. Ligne **pré-rédigée, à recopier telle quelle** au §2 du registre (PO-MM-14) :

```
| match-details-missions — **missions d'une convocation, vue coach (gestion) et vue joueur (inscription)** (`[v3] [Coach] Mob - Match details - Missions {1,2,3,4,5}`, `[v3] [Joueur] Mob - Match details - Missions {1,2}`) | — aucun lien fourni | 2026-10-02 | `docs/designs/match-missions/[v3] [Coach] Mob - Match details - Missions {1,2,3,4,5}.png`, `docs/designs/match-missions/[v3] [Joueur] Mob - Match details - Missions {1,2}.png` | **instantané seul** |
```

Note à joindre : les sept exports sont **un seul onglet et ses états**. Coach 1 = liste ; Coach 2 = sélecteur « Choisir un membre » ouvert ; Coach 3 = confirmation de suppression d'une mission qui a des inscrits (« 1 personne est inscrite, elle sera retirée. ») ; Coach 4 = confirmation de retrait d'un inscrit (« Retirer … de cette mission ? ») ; Coach 5 = idem + formulaire « Nouvelle mission ponctuelle ». Joueur 1 = missions ouvertes (« Je m'en charge », « Me retirer ») ; Joueur 2 = missions fermées (bandeau « Les missions sont fermées. En cas d'empêchement, contactez directement un référent de l'équipe. »). ⚠️ Le dossier est en `??` dans `git status` : à committer avec la ligne de registre.

**Ce que les exports signalent pour le périmètre** (sans décision UI, qui relève de designer-agent) :
- Les boutons « Fermer (démo) » / « Rouvrir (démo) » des exports joueur sont des **artefacts de démonstration**, pas des contrôles. L'état fermé se déduit de la donnée (§2.3).
- Des inscrits et des candidats portent le badge **« BÉNÉVOLE »** : le rôle Bénévole est **hors périmètre** de cette passe (§1). Rien de ce qui le concerne n'est construit.
- Les barres d'onglets des exports (« Convocations », « Disposition », « Messager… ») ne correspondent pas aux onglets construits de `ConvocationDetailPage.tsx`. Cette feature n'en renomme aucun.
- Seul le type **match** est illustré ; la feature couvre les trois types (§1).
- Les noms de personnes des exports ne sont repris nulle part (`CLAUDE.md` §9).

### 0.1 Vérification préalable — `Convocation.date` porte bien l'heure de début ✅

Les deux échéances de cette feature (30 min avant le début) dépendent de cette valeur. **Vérifié, résultat positif :**

| Couche | Fichier | Constat |
|---|---|---|
| Base | `supabase/migrations/20260811171754_initial_schema.sql` l. 120 | `date timestamptz not null` — un horodatage, pas un `date` |
| RPC de création | `20260821092153_convocation_rpc_search_path_fix.sql`, `20261001071613_web_localizations.sql` l. 141-159 | paramètre `p_date timestamptz`, inséré tel quel |
| DTO | `src/data/dto/convocation-dto.ts` l. 11 | `date: string` (ISO renvoyé par PostgREST, avec heure et fuseau) |
| Mapper | `src/data/mappers/convocation-mapper.ts` l. 10 | `date: row.date`, recopié sans troncature |
| Entité | `src/domain/entities/convocation.ts` l. 10 | `date: string`, commenté `// ISO date` — **commentaire trompeur** : la valeur porte l'heure. `CreateConvocationUseCase.ts` l. 15 le dit correctement (« kickoff (match) / start time (training, meeting) ») |
| Usage existant | `src/domain/policies/response-deadline.ts` l. 31-33 | `new Date(convocation.date)` puis soustraction de minutes : le patron que `mission-deadline.ts` reprend |

Correction cosmétique proposée, non bloquante : préciser le commentaire de l'entité (« ISO timestamp — start time ») dans la même passe.

### 0.2 Flux de création existant — ce qui doit changer

| Couche | Élément | État actuel |
|---|---|---|
| Use case | `src/domain/usecases/convocation/CreateConvocationUseCase.ts` | `can(user, 'convocation:create', { teamId, sectionId })`, règles (date passée, RDV), puis aiguillage `createTraining` / `createMatch` / `createMeeting` |
| Dépôt | `src/data/repositories/ConvocationRepositoryImpl.ts` l. 64-120 | trois appels `.rpc('create_training_convocation' \| 'create_match_convocation' \| 'create_meeting_convocation', …)` |
| Base | `create_training_convocation(uuid, uuid, timestamptz, uuid)` (`20261001071613_web_localizations.sql`), `create_match_convocation(…)`, `create_meeting_convocation(…)` (`20260821092153_convocation_rpc_search_path_fix.sql`) | trois fonctions PL/pgSQL, **`security invoker`** (non `definer`), `set search_path = ''` ; insèrent `convocations` puis la satellite éventuelle dans une transaction |
| Autorisation effective | RLS `convocations_insert_create` (`20260821091519_convocation_creation_schema.sql` l. 96-103) + `match_details_insert_create` / `meeting_details_insert_create` | s'applique **parce que** les fonctions sont `invoker` |
| Triggers `BEFORE INSERT` | date passée (`create-convocation.md` §5), lieu archivé (`convocations_training_location_not_archived`) | s'appliquent quel que soit le mode de la fonction |

Le backoffice web (`web-create-convocation.md`) ne déclare **aucune** fonction de création propre (la migration `20261001120000_web_create_convocation.sql` ne contient que des `update_*_convocation`) : modifier les trois RPC couvre les deux points d'entrée.

**Changement demandé (règle 1)** : dans **chacune des trois** fonctions `create_*_convocation`, après l'insertion de la convocation (et de sa satellite), copier dans `convocation_missions` les modèles **actifs** de `mission_templates` dont `convocation_type` = le type créé : `template_id` = id du modèle, `label` = libellé du modèle, `capacity` = `default_capacity`. Aucune ligne `mission_assignments` créée. Tout dans le même corps PL/pgSQL : la convocation et ses missions sont créées ensemble ou pas du tout. Signatures, `ConvocationRepository`, `CreateConvocationUseCase` et `ConvocationRepositoryImpl` **inchangés** (la copie est invisible pour le domaine).

**Conflit avec une décision antérieure, à acter** : `create-convocation.md` §2 dit « Ne pas y ajouter `SECURITY DEFINER` sans une décision explicite et séparée ». Le brief demande `security definer`, pour que les coachs n'aient pas besoin de lire `mission_templates` (RLS admin seul). Le brief vaut décision explicite, **mais** passer ces fonctions en `definer` **désactive dans leur corps** `convocations_insert_create` et les politiques `insert` des satellites. Conséquences **obligatoires** si cette voie est retenue :
- la fonction refait elle-même, au début, le contrôle de portée de `convocations_insert_create` (`is_coach_of_team(p_team_id) or is_section_manager_of_team(p_team_id) or has_role('authorized-officer') or is_admin()`) et lève `42501` sinon ;
- elle refuse `p_created_by <> auth.uid()` (aujourd'hui la RLS ne le vérifie pas non plus ; en `definer`, rien d'autre ne le ferait) ;
- les commentaires de `create-convocation.md` §2 et de `web_localizations.sql` (« Still NOT security definer ») deviennent faux et sont à mettre à jour.

Une voie plus étroite existe : laisser les trois fonctions `invoker` et n'appeler qu'un helper `security definer` limité à la lecture des modèles actifs d'un type. C'est **PO-MM-01**, bloquant pour la migration.

Une modification ultérieure de la convocation ne recopie rien : le type n'est pas modifiable (`grant update` hors `type`, `web-create-convocation.md`), et les missions sont un instantané.

## 1. Périmètre

### Ce que c'est

Les **missions bénévoles d'une convocation**, sur mobile, pour les profils **Joueur/Joueuse** et **Coach/Staff** (et les autres rôles qui ont `mission:manage`, voir §3) :
- à la création d'une convocation, les modèles actifs de son type sont **copiés** en missions non attribuées ;
- un joueur de l'équipe **s'inscrit** à une mission ou **se retire**, jusqu'à 30 minutes avant le début ;
- un gestionnaire **inscrit / retire** n'importe quel membre éligible, **supprime** une mission, **ajoute** une mission ponctuelle, sans échéance ;
- une ligne discrète « Votre mission : … » sur la carte « Prochaine convocation » du tableau de bord joueur.

### Rattachement CDC

| Élément | Module CDC | Priorité |
|---|---|---|
| Missions d'une convocation, affectations | **Événements et bénévoles** — « Postes, missions, affectations, bilan » | **P1** |
| Écran hôte | Calendrier et convocations (détail d'une convocation, `match_details_page.md`) | P0 (écran existant) |

### Prérequis existants, réutilisés et jamais redéclarés

`MissionTemplate` (`src/domain/entities/mission-template.ts`), `MIN_MISSION_CAPACITY` / `MAX_MISSION_CAPACITY` / `isValidMissionCapacity` / `isValidMissionLabel` (`src/domain/policies/mission-rules.ts`), table `public.mission_templates` (`20261002164033_web_mission_templates.sql`), patron d'erreurs `data/errors/map-supabase-error.ts` → `presentation/shared/errors/map-domain-error-to-ui-error.ts`.

### Au périmètre

- Migration : tables `convocation_missions`, `mission_assignments`, leurs RLS, RPC `claim_mission`, modification des trois `create_*_convocation`.
- Domaine : entités, règles, politique d'échéance, deux actions RBAC, interfaces de dépôt, sept use cases, deux erreurs.
- Données : DTO, mappers, `RepositoryImpl`, branches d'erreur.
- Présentation : section missions sur l'écran de détail existant (`src/presentation/features/convocation/ConvocationDetailPage.tsx`), ligne sur `NextConvocationCard.tsx`.
- Entrée `docs/DEFAULTS-A-CHALLENGER.md` (tâche, §2.6).

### Hors périmètre, explicitement

- **Bénévole** : lecture, éligibilité, RLS, tableau de bord (passe suivante), malgré le badge « BÉNÉVOLE » des maquettes.
- Événements de club (`teamId = null`) et un type `event` : n'existent pas dans le modèle actuel.
- Toute **notification** (module Communication, P1 distinct).
- Un statut « mission faite », un bilan, des points **ASC Legacy**.
- Modification d'une mission existante (libellé, capacité) : non demandée.
- Re-synchronisation des missions avec le référentiel : jamais (instantané, voir §2.1).
- Les onglets des maquettes absents du code, les boutons « (démo) ».

## 2. Modèle et règles

### 2.1 Schéma (repris du brief, verbatim pour les colonnes)

```sql
convocation_missions (
  id uuid primary key default gen_random_uuid(),
  convocation_id uuid not null references convocations(id) on delete cascade,
  template_id uuid references mission_templates(id) on delete set null, -- null = mission ponctuelle
  label text not null,                                                  -- copié, jamais lu en direct
  capacity int not null check (capacity between 1 and 3)                -- miroir de mission-rules.ts
)
mission_assignments (
  mission_id uuid not null references convocation_missions(id) on delete cascade,
  user_id uuid not null references users(id),
  assigned_by uuid not null references users(id), -- = user_id en auto-inscription
  assigned_at timestamptz not null default now(),
  primary key (mission_id, user_id)
)
```

- **Pourquoi le libellé est copié** : un modèle renommé plus tard ne doit pas réécrire les convocations passées. Les missions d'une convocation sont un **instantané**.
- Le `check (capacity between 1 and 3)` porte en commentaire SQL le nom de son miroir (`isValidMissionCapacity`, `MIN_`/`MAX_MISSION_CAPACITY`), comme `mission_templates` (`CLAUDE.md` §7). Un `check (btrim(label) <> '')` miroir de `isValidMissionLabel` est attendu par cohérence avec `mission_templates`, mais **absent du brief** : PO-MM-09.
- La `description` du modèle n'est **pas** copiée (le brief n'en prévoit pas la colonne) : PO-MM-08.
- `mission_assignments` est une table d'**état courant** (`CLAUDE.md` §6) : la clé primaire composite interdit le doublon, un retrait est un `delete`.

### 2.2 Règles métier (tranchées par la développeuse)

| # | Règle | Autorité |
|---|---|---|
| R1 | **Copie à la création** des modèles actifs du type, non attribués, dans la même transaction que la convocation (§0.2) | Base (RPC) |
| R2 | **Capacité 1 à 3** ; une inscription au-delà est refusée → `MissionFullError`. Le comptage et l'insertion se font **dans la même transaction**, dans `claim_mission`, de sorte que deux personnes visant la dernière place ne passent pas toutes les deux (verrou sur la ligne mission, ex. `select … for update`, avant de compter) | Base (RPC) |
| R3 | **Échéance de 30 minutes avant `Convocation.date`** pour l'auto-inscription **et** l'auto-retrait. Passé l'échéance → `MissionDeadlinePassedError` ; le message invite à contacter directement un référent de l'équipe | **Use case seul** (risque accepté, §2.3) |
| R4 | Deux actions RBAC, `mission:self-assign` et `mission:manage` (§3). L'exemption d'échéance est attachée à `mission:manage`, **jamais à une liste de rôles codée en dur** | Domaine + RLS |
| R5 | Un joueur n'agit que sur **sa propre** ligne d'affectation (RLS `user_id = auth.uid()` en insertion et suppression) | Base (RLS) |
| R5b | ⚠️ **HYPOTHÈSE** — les actions joueur ne sont possibles que sur une convocation **`open`** (ni `closed`, ni `cancelled`). Posée par le brief comme hypothèse, à confirmer (PO-MM-03) | Domaine + RLS |
| R6 | Un gestionnaire peut **supprimer une mission** (ses affectations partent en cascade ; l'interface demande confirmation quand elle a des inscrits) et **ajouter une mission ponctuelle** (`template_id = null`, capacité 1 à 3, libellé non vide) | Domaine + RLS |

### 2.3 Échéance — `src/domain/policies/mission-deadline.ts` (nouveau)

- Fichier **distinct** de `response-deadline.ts` : délai **fixe de 30 minutes**, pas par type.
- Forme attendue, sur le patron de `canPlayerRespond` : une constante `MISSION_SELF_SERVICE_DEADLINE_MINUTES = 30` et une fonction pure qui reçoit la convocation et `now`, renvoie vrai tant que `now` est **strictement avant** `date − 30 min` **et** que la convocation est `open` (R5b).
- **En-tête du fichier, à écrire** (exigence du brief) : la règle n'est tenue **que** dans les use cases, comme l'échéance de réponse. Un contournement suppose d'appeler l'API hors de l'application ; le risque est jugé négligeable et **accepté** (une mission bénévole tardive n'a pas d'enjeu de sécurité ni de donnée sensible). Aucune garde SQL temporelle n'est donc posée sur `mission_assignments` pour l'auto-service ; ce n'est pas un oubli.
- Renvoi documentaire : le brief cite « §3.1 de la spec convocation » ; `specs/match-stats.md` (MS-12) renvoie au même raisonnement sous le nom `convocation-domain-correction.md` §3.1, **fichier introuvable dans le dépôt** (déjà relevé par PO-MS-12). L'en-tête renvoie donc à `response-deadline.ts` et à cette spec, pas à ce fichier.
- `isClosed` (§2.5) = `!` cette fonction. L'état « fermé » des maquettes n'est **jamais** un interrupteur manuel.

### 2.4 Domaine

| Élément | Chemin | Contenu |
|---|---|---|
| Entités | `src/domain/entities/convocation-mission.ts` | `ConvocationMission { id, convocationId, templateId: string \| null, label, capacity }` ; `MissionAssignment { missionId, userId, assignedBy, assignedAt }` |
| Échéance | `src/domain/policies/mission-deadline.ts` | §2.3 |
| Éligibilité | `src/domain/policies/mission-rules.ts` (fichier existant, **ajout**) | fonction pure d'éligibilité recevant l'identifiant visé et **la liste des membres de l'équipe en paramètre** (même patron que `requiredUserIds` dans `convocation-closure.ts`) ; pas de lecture de dépôt dans la règle. Les constantes existantes ne sont ni dupliquées ni déplacées |
| Erreurs | `src/domain/errors/mission-full-error.ts`, `mission-deadline-passed-error.ts` | `MissionFullError`, `MissionDeadlinePassedError`, toutes deux `extends DomainError`. Erreur de saisie de mission ponctuelle : PO-MM-07 |
| Actions RBAC | `actions.ts`, `rbac-matrix.ts`, `can.ts` | §3 |
| Dépôts | `src/domain/repositories/convocation-mission-repository.ts` (et, si séparé, `mission-assignment-repository.ts`) | lister les missions d'une convocation avec leurs affectations ; réclamer (via `claim_mission`) ; retirer une affectation ; ajouter une mission ponctuelle ; supprimer une mission. Forme exacte laissée à l'implémentation |
| Use cases | `src/domain/usecases/convocation-missions/` | voir ci-dessous |

**Use cases** (chacun charge l'utilisateur et la convocation, résout `teamId`/`sectionId` comme `CreateConvocationUseCase`, puis applique `can()` **avant** toute règle métier) :

| Use case | Action | Contrôles, dans l'ordre |
|---|---|---|
| `ListConvocationMissionsUseCase` | lecture | aucun `can()` (lecture RLS seule, critère d'en-tête de `rbac-matrix.ts`) |
| `ClaimMissionUseCase` | soi-même s'inscrit | `can(user, 'mission:self-assign', { teamId })` → `ForbiddenError` ; éligibilité → `ForbiddenError` ; si **pas** `can(user, 'mission:manage', …)`, échéance → `MissionDeadlinePassedError` ; puis `claim_mission` (capacité → `MissionFullError`) |
| `ReleaseMissionUseCase` | soi-même se retire | idem sans capacité |
| `AssignMemberToMissionUseCase` | gestionnaire inscrit un membre | `can(user, 'mission:manage', { teamId, sectionId })` ; éligibilité de la cible ; **pas d'échéance** ; capacité tenue en base |
| `RemoveMemberFromMissionUseCase` | gestionnaire retire un membre | `mission:manage` ; pas d'échéance |
| `AddAdHocMissionUseCase` | gestionnaire ajoute une mission ponctuelle | `mission:manage` ; libellé rogné, `isValidMissionLabel` et `isValidMissionCapacity` **avant tout appel réseau** |
| `RemoveMissionUseCase` | gestionnaire supprime une mission | `mission:manage` ; la cascade supprime les affectations |

**Exemption d'échéance** : un utilisateur qui a `mission:manage` sur l'équipe n'est pas soumis à l'échéance, **même quand il s'inscrit lui-même**, parce que la règle teste l'action et non le rôle (R4). Couvert par un test dédié (AC-MM-14).

### 2.5 Données, migration, RLS

- **Données** : `src/data/dto/ConvocationMissionRow.ts`, `MissionAssignmentRow.ts` (lignes de tables, `CLAUDE.md` §4) ; un `XxxDto` si la lecture passe par une RPC ou une jointure sans vue (noms d'inscrits) ; mappers dans `src/data/mappers/` (+ tests) ; `src/data/repositories/ConvocationMissionRepositoryImpl.ts`.
- **Erreurs** (`src/data/errors/map-supabase-error.ts`) : branche nommée pour le refus « complet » levé par `claim_mission` (jeton de message dédié, ex. `mission_full`, sur le patron de `convocation_not_editable`) → `MissionFullError` ; jamais le repli `NotFoundError`. La branche existante `error.message.includes('mission_templates')` ne doit pas capturer par erreur une violation sur `convocation_missions` (le nom de table ne contient pas `mission_templates`, mais l'ordre des branches est à vérifier en test).
- **Migration nouvelle** `supabase/migrations/<timestamp>_match_details_missions.sql`, aucune migration existante modifiée (les trois fonctions sont recréées par `create or replace`).
- **RLS**, chaque politique commentée avec le nom de l'action miroir :

| Table | Opération | Qui |
|---|---|---|
| `convocation_missions` | `select` | même prédicat que `convocations_select_team_scoped` via la convocation parente (`is_team_member`, `is_section_manager_of_team`, `authorized-officer`, `admin`) |
| `convocation_missions` | `insert` (mission ponctuelle), `delete` | `'mission:manage'` : prédicat de `convocations_insert_create` via la convocation parente. L'insertion à la création passe par la RPC (§0.2) |
| `mission_assignments` | `select` | même prédicat de lecture, via mission → convocation |
| `mission_assignments` | `insert` / `delete` de soi | `'mission:self-assign'` : `user_id = auth.uid()`, joueur de l'équipe, convocation `open` (R5b). **Sans** garde temporelle (§2.3). En `insert`, `assigned_by = auth.uid()` |
| `mission_assignments` | `insert` / `delete` pour autrui | `'mission:manage'` : prédicat de portée ci-dessus ; la cible doit être éligible (miroir SQL de la règle d'éligibilité) ; `assigned_by = auth.uid()` |

- **Capacité et chemins d'écriture** : R2 exige que la capacité tienne en base. Si une politique `insert` directe existe sur `mission_assignments` (R5), un appel direct contourne le comptage de `claim_mission`. Il faut donc soit qu'**aucun** `insert` direct ne soit accordé (toute inscription passe par `claim_mission`), soit qu'un trigger `BEFORE INSERT` verrouille la mission et compte. Choix ouvert : **PO-MM-02**, bloquant pour la migration. Dans les deux cas, AC-MM-05 s'applique à **tout** chemin.
- `claim_mission` sert aussi à l'inscription d'un tiers par un gestionnaire (sinon la capacité ne tiendrait pas pour lui) : sa signature reçoit l'utilisateur visé, et la fonction vérifie elle-même que l'appelant est soit cette personne, soit titulaire de `mission:manage` sur l'équipe. À confirmer dans PO-MM-02.

### 2.6 Tâche documentaire

Ajouter dans `docs/DEFAULTS-A-CHALLENGER.md` (fichier localisé, format §« Format d'une entrée ») une entrée **« Délai d'auto-service de 30 minutes »** : Où `domain/policies/mission-deadline.ts` ; Valeur actuelle 30 min avant le début, fixe pour tous les types ; Pourquoi provisoirement : choix produit, non mesuré ; À challenger : après usage réel (retraits de dernière minute, missions liées au RDV plutôt qu'au coup d'envoi, PO-MM-05) ; Priorité : après premiers retours réels. En français.

### 2.7 Présentation

| Élément | Chemin |
|---|---|
| Section missions | `src/presentation/features/convocation/` — sur l'écran existant `ConvocationDetailPage.tsx` ; composants locaux sous `components/` (ou un sous-dossier `missions/`, sur le patron `lineup/`). Onglet ou section : décision de designer-agent (les maquettes montrent un onglet « Missions ») |
| ViewModel | **un** ViewModel missions (`useConvocationMissionsViewModel.ts`) exposant **par mission** : `canClaim`, `canRelease`, `canManage`, `isClosed`, plus les données affichées. Le composant ne branche que sur ces booléens (`CLAUDE.md` §4) |
| Erreurs | `onError` des mutations → `mapDomainErrorToUiError` ; deux branches nouvelles dans `src/presentation/shared/errors/map-domain-error-to-ui-error.ts` (+ test), **au-dessus** du repli `DomainError` : `MissionFullError` (« Cette mission est déjà complète. ») ; `MissionDeadlinePassedError` (message invitant à contacter directement un référent de l'équipe, cohérent avec le bandeau de la maquette Joueur 2) |
| Clés de requête | `src/presentation/shared/query-keys.ts`, racine dédiée, ex. `['convocation-missions', convocationId]` ; invalidée après chaque mutation |
| Injection | conteneur et hook de dépendances sur le patron existant (`presentation/di/`) |
| Tableau de bord joueur | `src/presentation/features/player-dashboard/components/NextConvocationCard.tsx` : une ligne discrète « Votre mission : {libellé} », **aucun nouveau bloc**, rien si le joueur n'a aucune mission. Plusieurs missions : PO-MM-11 |

## 3. RBAC

### Ligne de matrice CDC applicable — et écart à valider

« **Gérer postes/missions bénévoles** » : Joueur ❌ · **Coach ❌** · Resp. section ✅ (sa section) · Dirigeant habilité ✅ · Trésorier ❌ · Référent médical ❌ · Bénévole ❌ (consulte/confirme) · Administrateur ✅.

Le brief donne `mission:manage` **au Coach (son équipe)**, que la ligne CDC exclut. C'est un **élargissement par rapport au CDC**, pas une lecture de celui-ci ; il est cohérent avec la portée de `convocation:create` (le coach crée la convocation qui porte ces missions). À faire valider par le Bureau : **PO-MM-04**, non bloquant pour la conception. `mission:self-assign` (s'inscrire soi-même) ne correspond à aucune ligne du CDC : c'est une action nouvelle, sans précédent dans la matrice, au même titre que `vote:cast` (`player-vote.md` §2).

### Entrées de matrice (seuls changements RBAC de cette feature)

```
'mission:self-assign': ['player'],                                          // équipe de la convocation
'mission:manage': ['coach', 'section-manager', 'authorized-officer', 'admin'], // = portée de 'convocation:create'
```

- `can.ts` est modifié **dans le même changement** : `mission:self-assign` ajoutée à `requiresTeamScope` de la branche `player` ; `mission:manage` ajoutée à `requiresTeamScope` de la branche `coach` et à la liste comparant `sectionId` de la branche `section-manager` (le piège déjà corrigé pour `convocation:create`, `vote:cast`, etc.). `authorized-officer` et `admin` passent par la branche par défaut (club-wide), comme pour `convocation:create`.
- Le Coach n'a pas `mission:self-assign` : il s'inscrit lui-même par `mission:manage`, sans échéance. Faut-il qu'un coach soit éligible comme inscrit : PO-MM-06.

| Rôle | Lire les missions | S'inscrire / se retirer (échéance) | Gérer (sans échéance) |
|---|---|---|---|
| Joueur/Joueuse | ✅ équipe de la convocation | ✅ sa propre ligne, équipe, `open` | ❌ |
| Coach/Staff | ✅ son équipe | — (couvert par gérer) | ✅ son équipe (**écart CDC**, PO-MM-04) |
| Responsable de section | ✅ sa section | — | ✅ sa section |
| Dirigeant habilité | ✅ | — | ✅ |
| Trésorier, Référent médical | ❌ | ❌ | ❌ |
| Bénévole | hors périmètre (passe suivante) | hors périmètre | ❌ |
| Administrateur | ✅ | — | ✅ |

Point d'entrée mobile : l'écran de détail ne connaît aujourd'hui que les variantes `player` et `coach` (rôle actif, `DEFAULTS-A-CHALLENGER.md` « Variante de l'écran détail convocation pilotée par l'onglet de rôle actif »). Responsable de section, Dirigeant habilité et Administrateur ont donc le droit **sans écran mobile** pour l'exercer dans cette passe ; ce n'est pas corrigé ici.

## 4. Données sensibles

| Nature | Cette feature |
|---|---|
| Données de santé | **Aucune.** Une mission est une tâche logistique ; aucun motif d'indisponibilité n'est saisi ni affiché |
| Données financières | Aucune |
| Données nominatives | **Oui, limitées** : qui est inscrit à quelle mission, visible des membres de l'équipe. Même périmètre de visibilité que l'effectif déjà affiché ; la forme des noms côté joueur (prénom seul sur la maquette) relève de PO-MM-10 |
| Action du CDC §11.3 | **Aucune** (ni compte, ni rôle, ni santé, ni paiement, ni points Legacy, ni export) |

- **Audit** : aucune journalisation exigée ; aucun code d'audit ajouté. L'inscription d'un tiers par un gestionnaire est tracée par la donnée elle-même (`assigned_by`, `assigned_at`), ce qui est une donnée métier, pas un journal d'audit. Voir PO-MM-12.
- **Rétention / effacement** : `mission_assignments.user_id` et `assigned_by` référencent `users(id)` **sans** `on delete` (brief). Une suppression de compte serait alors bloquée par ces lignes. À trancher avec le référent RGPD au regard de `docs/RETENTION-PURGE.md` : PO-MM-13. La purge relève de Supabase, jamais de `domain/` (`CLAUDE.md` §6).

## 5. Critères d'acceptation

Numérotation **`AC-MM-xx`**.

**Base de données**

- **AC-MM-01** — Une nouvelle migration crée `convocation_missions` et `mission_assignments` (§2.1) ; aucune migration existante n'est modifiée. `capacity` hors 1..3 (0, 4, nul) est refusée en `insert`.
- **AC-MM-02** — Créer une convocation de chacun des trois types, par chacun des trois RPC, crée **une** ligne `convocation_missions` par modèle **actif** du type (libellé et capacité copiés, `template_id` renseigné, aucune affectation) ; un modèle inactif ou d'un autre type n'est pas copié ; aucun modèle actif → zéro mission, sans erreur.
- **AC-MM-03** — Atomicité : si l'insertion d'une mission échoue (forcée en test), **aucune** ligne `convocations` ni satellite n'est créée.
- **AC-MM-04** — Renommer ou désactiver un modèle **après** la création ne change ni le libellé ni l'existence des missions déjà copiées. Supprimer un modèle (opération impossible aujourd'hui, test direct en base) met `template_id` à `null` sans supprimer la mission.
- **AC-MM-05** — Capacité : sur une mission de capacité N avec N inscrits, toute nouvelle inscription est refusée, **par tout chemin d'écriture** (RPC ou `insert` direct). Deux inscriptions concurrentes visant la dernière place : exactement une réussit.
- **AC-MM-06** — Un jeton joueur ne peut insérer ni supprimer une affectation dont `user_id` ≠ son propre id ; ne peut agir sur une mission d'une équipe dont il n'est pas joueur ; ne peut agir sur une convocation `closed` ou `cancelled` (R5b, hypothèse).
- **AC-MM-07** — Un jeton coach peut inscrire/retirer un joueur éligible, ajouter une mission ponctuelle et supprimer une mission **de son équipe uniquement** ; refusé sur une autre équipe. Même vérification pour `section-manager` sur sa section.
- **AC-MM-08** — Les jetons trésorier, référent médical et bénévole sans autre rôle ne lisent aucune mission ni affectation.
- **AC-MM-09** — Supprimer une mission supprime ses affectations (cascade) ; supprimer une convocation supprime ses missions et affectations.
- **AC-MM-10** — Si les RPC de création passent en `security definer` : un jeton sans portée sur l'équipe et un `p_created_by` ≠ `auth.uid()` sont refusés par la fonction elle-même (tests contre la base). Un coach n'a toujours aucun `select` sur `mission_templates` (AC-MT-04 inchangé).

**Domaine**

- **AC-MM-11** — `mission-deadline.ts` : vrai à `date − 31 min`, faux à `date − 30 min` et après, faux si `status` ≠ `open` ; en-tête documentant le risque accepté (§2.3). Testé.
- **AC-MM-12** — Règle d'éligibilité : vraie pour un identifiant présent dans la liste passée, fausse sinon, fausse pour une liste vide. Aucune lecture de dépôt. Testée.
- **AC-MM-13** — `can.test.ts` : `mission:self-assign` vrai pour un joueur de l'équipe, faux pour un joueur d'une autre équipe, faux pour coach/trésorier/bénévole ; `mission:manage` vrai pour coach de l'équipe, faux pour coach d'une autre équipe, vrai pour section-manager de la section, faux hors section, vrai pour `authorized-officer` et `admin`, faux pour `player`. Aucune autre action ni rôle ajouté.
- **AC-MM-14** — Use cases testés avec des faux en mémoire : `ForbiddenError` sans le droit **avant** tout autre contrôle ; `MissionDeadlinePassedError` pour `Claim`/`Release` passé l'échéance **sans appel au dépôt** ; **exemption** : un titulaire de `mission:manage` (y compris pour sa propre inscription) n'est jamais refusé pour l'échéance ; `MissionFullError` propagée depuis le dépôt ; `AddAdHocMission` refuse libellé vide et capacité hors 1..3 sans appel au dépôt.
- **AC-MM-15** — Mappers testés (Row ↔ entité, `template_id` nul compris). `map-supabase-error` traduit le refus « complet » en `MissionFullError`, jamais en `NotFoundError` ni en texte Postgres brut.
- **AC-MM-16** — `MissionTemplate`, `MIN_`/`MAX_MISSION_CAPACITY` et les validateurs existants sont importés, jamais redéclarés. Aucun import de `data/` depuis `presentation/`.

**Présentation**

- **AC-MM-17** — `mapDomainErrorToUiError` a deux branches nouvelles (`MissionFullError`, `MissionDeadlinePassedError`), au-dessus du repli, couvertes par `map-domain-error-to-ui-error.test.ts`. Le message d'échéance invite à contacter un référent de l'équipe.
- **AC-MM-18** — Le composant ne branche que sur `canClaim`, `canRelease`, `canManage`, `isClosed` fournis par le ViewModel. Un contrôle non autorisé est **absent**, pas grisé.
- **AC-MM-19** — Vue joueur : « s'inscrire » rendu seulement si `canClaim` (pas déjà inscrit, place libre, avant échéance, convocation `open`) ; « se retirer » seulement si `canRelease`. Après l'échéance : aucun des deux, et l'indication que les missions sont fermées.
- **AC-MM-20** — Vue gestionnaire : ajout/retrait d'un membre, suppression de mission et ajout de mission ponctuelle rendus si `canManage`, **y compris après l'échéance**. La suppression d'une mission **qui a des inscrits** demande une confirmation ; sans inscrit, elle peut être directe. Le choix de capacité n'offre que 1, 2 ou 3.
- **AC-MM-21** — Le sélecteur de membres ne propose que des membres éligibles, sans ceux déjà inscrits à la mission ; aucun bénévole n'y figure dans cette passe.
- **AC-MM-22** — Toute mutation réussie rafraîchit la section sans rechargement manuel ; un échec affiche le message traduit et laisse l'état antérieur.
- **AC-MM-23** — La carte « Prochaine convocation » affiche « Votre mission : … » si le joueur a au moins une affectation, rien sinon ; aucun nouveau bloc.
- **AC-MM-24** — États chargement, erreur (jamais un message Supabase brut) et vide (aucune mission) distincts. Contrôles à `h-11` minimum ; information jamais portée par la seule couleur (complet, inscrit, fermé) ; aucun nom de personne codé en dur ; aucun bouton « (démo) ».

## 6. Points ouverts

| Réf. | Question | Pour qui | Bloquant ? |
|---|---|---|---|
| **PO-MM-01** | **Mode des RPC de création.** Le brief demande `security definer` pour les trois `create_*_convocation`, ce qui contredit `create-convocation.md` §2 et supprime l'application de `convocations_insert_create` et des politiques des satellites dans leur corps (§0.2). Option A : `definer` + garde de portée et `p_created_by = auth.uid()` réécrits dans chaque fonction. Option B : fonctions laissées `invoker`, lecture des modèles par un helper `definer` étroit. À confirmer explicitement | Développeuse | **Oui, pour la migration** ; non pour designer-agent |
| **PO-MM-02** | **Capacité contre insertion directe.** R2 (comptage dans `claim_mission`) et R5 (politique `insert` de soi) se contredisent : une politique `insert` directe contourne le comptage. Pas d'`insert` direct (tout passe par `claim_mission`, qui reçoit alors l'utilisateur visé et vérifie l'appelant) ou trigger de comptage ? | Développeuse | **Oui, pour la migration** ; non pour designer-agent |
| **PO-MM-03** | **Hypothèse R5b** : actions joueur seulement sur une convocation `open`. Et pour un gestionnaire, sur `closed` / `cancelled` / passée : autorisé, ou même restriction ? | Développeuse | Non |
| **PO-MM-04** | **Écart CDC** : `mission:manage` accordé au Coach, que la ligne « Gérer postes/missions bénévoles » exclut ; `mission:self-assign` pour le Joueur n'a pas de ligne CDC | Bureau | Non |
| **PO-MM-05** | **Repère de l'échéance pour un match** : 30 min avant le coup d'envoi (`Convocation.date`), alors que le RDV (`meetingPointTime`) peut être bien plus tôt. Une mission « apporter l'eau » se joue au RDV. Garder le coup d'envoi ? | Développeuse | Non |
| **PO-MM-06** | **Qui est éligible comme inscrit** : joueurs de l'équipe seulement (proposé, cohérent avec la maquette, hors bénévoles), ou aussi le staff (`is_team_member` inclut les coachs) ? Source de la liste : effectif courant de l'équipe | Développeuse | Non |
| **PO-MM-07** | **Erreur de saisie d'une mission ponctuelle** : réutiliser `InvalidMissionTemplateError` (message parlant de « modèle ») ou créer une erreur dédiée ? Le brief interdit de redéclarer, pas d'ajouter | Développeuse | Non |
| **PO-MM-08** | **Description du modèle** non copiée (pas de colonne). La perdre est-il voulu ? | Développeuse | Non |
| **PO-MM-09** | **`check (btrim(label) <> '')`** sur `convocation_missions.label`, miroir de `isValidMissionLabel` : à ajouter (absent du brief) ? | Développeuse | Non |
| **PO-MM-10** | **Noms affichés côté joueur** : la maquette joueur montre des prénoms seuls (et « Vous »), la maquette coach des noms complets. Choix de minimisation ou artefact ? Et d'où viennent les noms (les joueurs n'ont pas forcément de lecture directe de `users`) : réutiliser une source d'effectif existante plutôt qu'ouvrir une lecture nouvelle | Développeuse / designer-agent | Non |
| **PO-MM-11** | **Plusieurs missions** pour un même joueur sur la carte du tableau de bord (la maquette joueur en montre deux) : toutes listées, la première, ou un compte ? | Développeuse / designer-agent | Non |
| **PO-MM-12** | **Double inscription** (même personne, même mission) : succès idempotent ou erreur visible ? Clé primaire composite dans les deux cas | Développeuse | Non |
| **PO-MM-13** | **Effacement de compte** : `user_id` / `assigned_by` sans `on delete` bloquent la suppression d'un utilisateur. `cascade`, `set null` (impossible sur `not null`) ou anonymisation ? | Référent RGPD / développeuse | Non pour cette passe ; à trancher avant production |
| **PO-MM-14** | **Écritures hors `specs/`** : recopier la ligne du §0 dans `docs/designs/DESIGN_LINKS.md`, committer `docs/designs/match-missions/` (non suivi) | Développeuse / designer-agent | Non |
| **PO-MM-15** | **Badge de rôle** (« JOUEUR ») par inscrit dans les maquettes : quel rôle afficher pour un compte multi-rôles ? Utile seulement quand les bénévoles arriveront ; l'afficher dès cette passe ? | Designer-agent | Non |
| **PO-MM-16** | **Ordre des missions** dans la liste (ordre de création, alphabétique, modèles puis ponctuelles) : non précisé. Une colonne `created_at` n'est pas dans le brief | Développeuse | Non |

## 7. Note pour designer-agent

- Références : les sept exports du §0, lus comme un onglet et ses états. Ne pas reproduire les boutons « (démo) », ni le badge « BÉNÉVOLE », ni les onglets absents du code.
- Les booléens par mission (`canClaim`, `canRelease`, `canManage`, `isClosed`) sont le seul contrat avec le composant ; « fermé » se déduit de l'échéance ou du statut.
- Ne pas trancher en dessinant : forme des noms côté joueur (PO-MM-10), plusieurs missions sur la carte (PO-MM-11), badge de rôle (PO-MM-15), ordre (PO-MM-16).
- PO-MM-01 et PO-MM-02 ne concernent que la migration ; ils ne bloquent pas la conception.

## UI design

> Rédigé le 2026-10-02. Registre : ligne `match-details-missions` ajoutée à `docs/designs/DESIGN_LINKS.md` §2 (statut `instantané seul`, aucun lien à demander, snapshot lu directement).

### Sources utilisées

1. `docs/designs/match-missions/[v3] [Coach] Mob - Match details - Missions {1,2,3,4,5}.png` et `[v3] [Joueur] Mob - Match details - Missions {1,2}.png` : un seul onglet et ses états (voir §0). Référence visuelle principale.
2. §1 à §5 de la présente spec (périmètre, RBAC, AC-MM-17 à 24), prioritaires sur les exports.
3. Code existant réutilisé : `ConvocationDetailPage.tsx` (`Tabs` shadcn, `TabsList` défilante, onglets conditionnels par disponibilité), `BackHeader.tsx`, `NextConvocationCard.tsx`, et la maquette `specs/match_details_page.md` « UI design » (hero, pastille de statut, onglets Infos/Effectif/Votes...).

### Emplacement dans la nav

- **Aucune nouvelle destination.** L'écran hôte est la route plein écran `convocations/:id`, hors `AppShell`, déjà décrite dans `match_details_page.md` « Emplacement dans la nav ».
- **Missions = un onglet de plus de la barre `Tabs` existante** (pas une section empilée sous un autre onglet). Justification : les exports le montrent comme onglet « Missions », la barre est déjà défilante et à onglets conditionnels (`vm.lineup.isTabAvailable`, résultat), et les missions ont leurs propres états (liste, formulaire, confirmations) qui alourdiraient Infos ou Effectif. Position : **après « Effectif »**, avant les onglets de résultat (les exports placent Missions entre Effectif et Votes côté joueur). L'onglet suit la même règle que les autres : **absent** (jamais grisé) si la convocation n'a aucune mission **et** que l'utilisateur n'a pas `canManage` ; présent avec l'état vide sinon. Les trois types de convocation l'affichent (les exports n'illustrent que le match).
- Onglets des exports absents du code (« Convocations », « Disposition », « Stats ») et sans lien avec cette feature : non reproduits. Le bouton retour reste `BackHeader` (`sticky top-0`, fond opaque, CLAUDE.md §6) ; l'onglet défile sous le bloc épinglé BackHeader + hero + `TabsList` existant, sans rien ajouter de sticky.
- Un seul `useConvocationMissionsViewModel` alimente l'onglet ; la variante joueur ou coach suit le rôle actif (`useActiveRole()`), comme le reste de l'écran. Aucun rendu dédié pour Responsable de section, Dirigeant habilité, Administrateur (§3 : droit sans écran mobile dans cette passe).

### Ce qui change par rôle

Reprend le tableau RBAC du §3, rien de redéfini. Le composant ne branche que sur les booléens du ViewModel, un contrôle non autorisé est **absent**, jamais grisé (AC-MM-18).

| Variante | Rôle(s) (§3) | Ce que l'on voit | Réf. visuelle |
|---|---|---|---|
| **Joueur** | `mission:self-assign` | Liste en lecture, inscrits visibles, « Je m'en charge » / « Me retirer » selon `canClaim` / `canRelease`. Aucun contrôle de gestion | Joueur 1 et 2 |
| **Coach / gestionnaire** | `mission:manage` | Liste avec retrait d'inscrit, inscription d'un membre, suppression de mission, « + Mission ponctuelle ». Contrôles présents **même après l'échéance** | Coach 1 à 5 |

Un compte coach qui est aussi joueur voit la variante du rôle actif (limite déjà acceptée, `match_details_page.md`). Un coach (qui n'a pas `mission:self-assign`) s'inscrit lui-même via le sélecteur « Inscrire », sans échéance, comme tout gestionnaire.

### Structure de l'onglet

Ordre vertical, sans en-tête ajouté (le titre de section « MISSIONS » des exports est le libellé de l'onglet, pas un second titre, sauf si l'équipe de dev veut le garder comme sur les exports) :

1. **Bandeau « missions fermées »** (variante joueur seulement, seulement si `isClosed`) : voir « Échéance dépassée ».
2. **Liste de cartes de mission**, une par mission, ordre selon PO-MM-16 (non tranché ici).
3. **Bouton « + Mission ponctuelle »** en fin de liste (variante gestionnaire, si `canManage`) : bordure en pointillé pleine largeur, comme Coach 1.

États de l'onglet : chargement (squelette de cartes), erreur (message traduit, jamais le message Supabase brut, avec action « Réessayer »), vide. Vide : texte « Aucune mission pour cette convocation. » avec, côté gestionnaire, le bouton « + Mission ponctuelle » toujours visible sous le texte (c'est son seul moyen d'en créer une) ; côté joueur, texte seul. Réutiliser le composant d'état vide existant (`EmptyState`) plutôt que d'en créer un.

### Carte de mission (nouveau composant local, `missions/MissionCard`)

Réutilise le primitive shadcn `Card` et le fond de carte sombre des exports ; pas de nouveau patron visuel (carte compacte + pastilles, comme les lignes existantes de l'Effectif). Contenu :

- **Ligne titre** : libellé à gauche (retour à la ligne autorisé, `min-w-0`), compteur « inscrits / capacité » à droite (« 1 / 2 »). Le compteur est toujours doublé d'un mot : quand `inscrits = capacité`, la carte affiche **« Complet »** en texte sous la liste (comme Coach 1 et Joueur 1) ; l'état n'est jamais porté par la seule couleur du compteur (vert/gris des exports) (AC-MM-24).
- **Inscrits** : une pastille (`Badge` outline) par personne, retour à la ligne si plusieurs. Variante joueur : la pastille de l'utilisateur courant est libellée « Vous » et distinguée par un contour d'accent **et** par le texte « Vous êtes inscrit·e » sous la liste. Variante gestionnaire : chaque pastille porte une croix de retrait.
- **Pied de carte** : zone d'action décrite par état ci-dessous.
- Mission ponctuelle : même carte, rien ne la distingue visuellement (aucune donnée n'impose un marquage).

**Noms affichés** : PO-MM-10 non tranchée. Le composant reçoit une chaîne `displayName` déjà prête du ViewModel ; il ne décide pas de la forme (prénom seul ou nom complet).
**Badges de rôle (« JOUEUR ») sur les pastilles** : PO-MM-15 non tranchée. **Non construits par défaut** ; le composant n'a pas d'emplacement réservé. Les badges « BÉNÉVOLE » ne sont pas construits (hors périmètre, §1).

### États par mission

Les quatre booléens fournis par le ViewModel sont le seul contrat. Ils ne se recoupent pas arbitrairement : `isClosed` = échéance passée **ou** convocation non `open` pour la variante joueur (§2.3) ; `canManage` ignore `isClosed`.

| Booléen | Rendu quand vrai | Rendu quand faux |
|---|---|---|
| `canClaim` | Bouton plein « Je m'en charge » (accent vert, pleine ou demi-largeur, `h-11`), en pied de carte, comme Joueur 1 « Laver les maillots » | Absent. Pas de bouton grisé, y compris quand la mission est complète ou que l'utilisateur est déjà inscrit |
| `canRelease` | Bouton secondaire « Me retirer » (`h-11`), à droite de « Vous êtes inscrit·e » comme Joueur 1 | Absent |
| `canManage` | Croix de suppression de mission en haut à droite de la carte, croix de retrait sur chaque pastille d'inscrit, bouton « + Inscrire » tant que la mission n'est pas complète, comme Coach 1 | Aucun de ces trois contrôles |
| `isClosed` | Variante joueur : aucun bouton d'action (déjà couvert par `canClaim`/`canRelease` faux), carte en lecture seule, bandeau en tête de l'onglet | Rien |

Combinaisons à rendre explicitement (jamais d'état « vide de sens ») :
- Joueur, mission complète, non inscrit : pas de bouton, texte « Complet ».
- Joueur, mission non complète, échéance passée : pas de bouton, mention portée par le bandeau (pas répétée par carte).
- Joueur, mission à 0 inscrit, fermée : carte avec titre et compteur « 0 / N » uniquement (Joueur 2 « Laver les maillots »).
- Gestionnaire, mission complète : « Complet » affiché, pas de « + Inscrire », mais retrait et suppression restent possibles.

Le bouton « + Inscrire » du gestionnaire est le seul bouton d'inscription visible côté gestionnaire ; il n'y a **pas** de « Je m'en charge » côté coach (le coach se choisit dans le sélecteur).

### Échéance dépassée (variante joueur)

- **Bandeau** en tête de l'onglet, texte exact de Joueur 2 : « Les missions sont fermées. En cas d'empêchement, contactez directement un référent de l'équipe. » Rendu quand l'échéance est passée ou que la convocation n'est pas `open` (même booléen `isClosed`, R3 et R5b). Pastille ronde à gauche + texte : l'information est portée par le texte, pas par la couleur.
- **Message d'erreur** : si une action échoue parce que l'échéance a passé entre le chargement et le clic (`MissionDeadlinePassedError`), un toast d'erreur (même mécanisme que les autres erreurs de mutation) affiche le message de `mapDomainErrorToUiError` (AC-MM-17), qui **invite à contacter directement un référent de l'équipe**, aligné mot pour mot avec le bandeau. Après l'erreur, la liste est rechargée : le bandeau apparaît et les boutons disparaissent.
- Variante gestionnaire : **ni bandeau ni restriction** (exemption `mission:manage`, R4).
- Aucun bouton « Fermer (démo) » ni « Rouvrir (démo) » : artefacts du prototype, non construits (§0, §7).

### Ajout d'une mission ponctuelle (gestionnaire)

Reprend Coach 5. Un tap sur « + Mission ponctuelle » **remplace le bouton** par un formulaire en carte, **en ligne** dans la liste (pas de feuille modale) :

1. Titre de section « Nouvelle mission ponctuelle ».
2. Champ texte « Libellé » (shadcn `Input`, `h-11`), placeholder « Ex. Installer les barrières », pleine largeur.
3. Choix de capacité : trois chips exclusives, « 1 personne », « 2 personnes », « 3 personnes » (patron chips-filtres déjà utilisé ailleurs ; valeur par défaut 1, comme Coach 5). Source des bornes : `MIN_`/`MAX_MISSION_CAPACITY`, jamais codées en dur dans le composant. **Alignement mobile** : les trois chips sont sur une ligne `grid-cols-3`, **chaque item avec `min-w-0`** pour rétrécir à sa colonne (CLAUDE.md §6) ; le texte peut passer sur deux lignes (« 2 / personnes ») plutôt que déborder sur 360 px. Chaque chip fait `h-11` minimum.
4. Deux boutons, `grid-cols-2`, `min-w-0` sur chaque item, `h-11` : « Annuler » (secondaire) et « Ajouter » (principal). « Ajouter » est inactif tant que le libellé rogné est vide (validation `isValidMissionLabel`) ; c'est le **seul** contrôle grisé de la feature, car c'est un champ de saisie d'un formulaire, pas une permission (la règle « absent, pas grisé » vise les droits). Pendant la mutation : « Ajouter » désactivé avec indicateur.
5. Succès : formulaire refermé, nouvelle mission visible en bas de liste, bouton « + Mission ponctuelle » restauré. Échec : message traduit sous le formulaire, saisie conservée. Erreur de saisie côté domaine : PO-MM-07 non tranchée, message générique en attendant.
6. « Annuler » referme sans rien enregistrer.

### Suppression d'une mission (gestionnaire)

- Croix en haut à droite de la carte, **cible tactile 44 × 44 px** (`size-11`), alors que la croix des exports mesure environ 36 px ; l'icône peut rester petite, la zone cliquable non.
- **Sans inscrit** : suppression **directe**, sans confirmation (AC-MM-20), la carte disparaît à la réussite.
- **Avec inscrit** : confirmation **en ligne dans la carte** (Coach 3), sous la liste d'inscrits : texte « {N} personne(s) est/sont inscrite(s), elle(s) sera/seront retirée(s). » (accord singulier/pluriel, « 1 personne est inscrite, elle sera retirée. » sur l'export), puis « Annuler » (secondaire) et « Confirmer » (rouge destructif, comme l'export), `grid-cols-2`, `min-w-0`, `h-11`. Une seule confirmation ouverte à la fois dans l'onglet : en ouvrir une referme les autres. Pas de `AlertDialog` modal : on garde le patron en ligne des exports, plus léger sur mobile.
- Pendant la mutation : « Confirmer » désactivé avec indicateur ; échec : texte d'erreur dans la confirmation, état préservé.

### Inscrire un membre (gestionnaire)

- Bouton secondaire « + Inscrire » (`h-11`) sous les pastilles, visible tant que la mission n'est pas complète.
- Tap : un **panneau « Choisir un membre » s'ouvre en ligne** dans la carte (Coach 2) : liste de lignes de `h-11` minimum, une par membre éligible **sans** ceux déjà inscrits à cette mission (AC-MM-21), plus un lien « Fermer » en bas. Tap sur un membre : inscription immédiate, panneau refermé, liste rafraîchie. Pas de bouton de validation séparé.
- Liste longue (équipe complète) : le panneau a une **hauteur maximale avec défilement interne** plutôt que d'allonger la page (l'export Coach 2 empile onze lignes sans plafond). Pas de champ de recherche dans cette passe (équipes de taille modeste ; non demandé).
- Pas de badge de rôle sur les lignes (PO-MM-15), pas de bénévoles (§1). Liste vide (tous déjà inscrits ou aucun éligible) : texte « Aucun membre disponible » et le lien « Fermer ».
- Une seule mission peut avoir son panneau ouvert à la fois.
- Source des membres éligibles et éligibilité du staff : PO-MM-06 (non tranchée) ; le composant reçoit la liste déjà filtrée du ViewModel.
- Échec (mission devenue complète entre-temps, `MissionFullError`) : message « Cette mission est déjà complète. » dans le panneau, liste rafraîchie.

### Retirer un membre (gestionnaire)

- Croix sur chaque pastille d'inscrit ; **zone tactile 44 px** obtenue par un bouton `size-11` englobant, quitte à faire dépasser la pastille (la pastille de l'export mesure environ 46 px de haut, la croix seule moins).
- Tap : confirmation en ligne dans la carte (Coach 4) : « Retirer {nom} de cette mission ? » + « Annuler » / « Confirmer » (rouge), mêmes règles que la suppression (`grid-cols-2`, `min-w-0`, `h-11`, une confirmation ouverte à la fois).
- Pas d'échéance côté gestionnaire. Retrait de soi-même par un joueur : voir « Me retirer » (sans confirmation, comme Joueur 1 ; action réversible tant que l'échéance n'est pas passée).

### Carte « Prochaine convocation » du tableau de bord joueur

- Ajout d'**une seule ligne discrète** dans `NextConvocationCard.tsx` : « Votre mission : {libellé} », texte secondaire, petite taille, au-dessus ou sous la ligne de lieu/heure existante, sans icône ni nouveau bloc ni nouvelle carte. Rendue seulement si le joueur a au moins une affectation, absente sinon (AC-MM-23).
- La carte garde son `onOpen` actuel ; la ligne n'est pas un lien séparé et ne crée pas d'action propre.
- **Plusieurs missions** : PO-MM-11 non tranchée. Le composant reçoit une chaîne `missionsLine` déjà composée par le ViewModel ; il ne décide ni du nombre ni du séparateur. Préparer un `truncate` sur une ligne pour le cas d'un libellé long.

### Cibles tactiles et mise en page mobile (CLAUDE.md §6)

- Tous les boutons, chips, `Input`, lignes du sélecteur : `h-11` (44 px) minimum, à surcharger à l'appel (pas le `h-8` shadcn par défaut). Croix de pastille et croix de carte : `size-11` autour d'une icône plus petite.
- Paires côte à côte : (a) chips de capacité `grid-cols-3`, (b) Annuler / Confirmer et Annuler / Ajouter en `grid-cols-2`, (c) ligne titre de carte « libellé + compteur » en `flex`, (d) « Vous êtes inscrit·e » + « Me retirer » en `flex`. **Chaque item reçoit `min-w-0`** (libellé en `truncate` ou retour à la ligne autorisé) pour rétrécir à sa colonne au lieu de chevaucher son voisin. À vérifier sur un viewport mobile réel (360 px), pas seulement une fenêtre desktop redimensionnée.
- Aucune information portée par la seule couleur : « Complet », « Vous êtes inscrit·e », « Les missions sont fermées » toujours en texte.
- Primitives shadcn à privilégier : `Card`, `Badge`, `Button`, `Input`, `Tabs` (déjà installés). Une chip de capacité peut être un `Button` de variante outline avec `aria-pressed` (ou `ToggleGroup` si installé ; à ajouter via `npx shadcn add toggle-group` plutôt que fait à la main). Pas de nouvelle dépendance justifiée sinon.

### Écarts volontaires avec les exports

| Export | Ce qu'on fait |
|---|---|
| Boutons « Fermer (démo) » / « Rouvrir (démo) » | Non construits |
| Badge « BÉNÉVOLE » (inscrits, candidats) | Non construit (§1) |
| Badge « JOUEUR » par inscrit | Non construit par défaut (PO-MM-15 ouverte) |
| Pastille « CONVOQUÉE » du hero joueur, onglets « Convocations / Disposition / Stats » | Non concernés ; le hero et les onglets restent ceux de `match_details_page.md` |
| Noms complets côté coach, prénoms seuls côté joueur | Forme non figée (PO-MM-10) |
| Panneau « Choisir un membre » sans plafond de hauteur | Plafond + défilement interne |
| Croix de pastille et de carte ~36 px | Zone tactile 44 px |

### Composants

- **Réutilisés tels quels** : `BackHeader`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `Card`, `Badge`, `Button`, `Input`, `EmptyState`, mécanisme de toast d'erreur existant.
- **Nouveaux, non des nouveaux patrons visuels** : `MissionsTab`, `MissionCard`, panneau « Choisir un membre », formulaire « Nouvelle mission ponctuelle », confirmation en ligne. Ce sont des compositions de cartes, chips, boutons et champs déjà employés ailleurs, directement issues des exports ; aucune demande de prototype Claude Design supplémentaire n'est nécessaire.
- **Seul patron relativement nouveau** : la confirmation **en ligne dans la carte** (pas un `AlertDialog`). Justifié par les exports Coach 3, 4 et 5, qui l'illustrent explicitement.

### Questions ouvertes UI

Aucune n'est bloquante. Aucune n'est résolue ici ; elles renvoient aux points du §6.

1. **PO-MM-10** — forme des noms (prénom seul ou complet) côté joueur ; le composant prend une chaîne prête.
2. **PO-MM-11** — plusieurs missions sur la carte du tableau de bord ; le composant prend une chaîne prête.
3. **PO-MM-15** — badge de rôle par inscrit : non construit par défaut.
4. **PO-MM-16** — ordre des missions : non précisé, le composant rend l'ordre reçu.
5. **PO-MM-07** — message d'erreur de saisie d'une mission ponctuelle : message générique en attendant.
6. **Nouvelle, mineure, côté UI** : suppression d'une mission sans inscrit directe (suivi d'AC-MM-20) : un tap accidentel sur la croix supprime sans retour possible (l'annulation n'existe pas). À confirmer par la développeuse ; non bloquant, une confirmation systématique reste possible plus tard sans changer le contrat des booléens.
7. **Nouvelle, mineure** : onglet Missions absent quand aucune mission et pas `canManage` (choix ci-dessus) ; alternative, toujours l'afficher avec l'état vide. À confirmer.

**Prêt pour transmission à mentor-agent : oui.** Aucune question bloquante pour l'UI.
