# Spec — Création d'une convocation

> Statut : prête pour designer-agent puis mentor-agent. Les 9 points ouverts soulevés lors du cadrage initial (PO-CV-01 à PO-CV-09) ont été tranchés en séance de mentoring (développeuse, 2026-08-20) et sont intégrés directement dans les sections ci-dessous — il n'existe plus de liste de points ouverts séparée pour eux. Un écart entre les décisions de mentoring et l'état réel du code (`section-manager` absent de `rbac-matrix.ts`) a été identifié en relisant le dépôt et confirmé par la développeuse comme faisant partie de cette passe (§3). La question de l'autorisation de créer un adversaire a également été tranchée à cette occasion (§2 : administrateur uniquement). Un second écart, cette fois entre ce que ce document décrivait et ce qui a effectivement été construit (placement des champs de match et du titre de réunion : tables satellites `match_details` / `meeting_details`, et non colonnes de `Convocation`), a été constaté après coup et confirmé par la développeuse le 2026-08-21 — §2 est corrigé en conséquence, c'est le code construit qui fait foi. Seul le point d'entrée physique du Responsable de section reste non construit (§7) — la feature Calendrier qui doit le porter est aujourd'hui un stub.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles), `docs/season-scoping-correction.md` (saison en cours), `docs/ARCHITECTURE.md` (§7 permissions, §11 journal d'audit), `specs/coach-dashboard.md` (§1 « Hors périmètre », AC-CD-06/AC-CD-07, PO-6 sélecteur d'équipe).
> Maquettes : `docs/designs/create-convocation/` — 4 exports v3 Coach Mob (`… - match 1.png`, `… - match 2.png`, `… - meeting.png`, `… - training.png`). Deux corrections à leur apporter ressortent de cette passe — voir §8.
> État du code lu pour cadrer la spec : `domain/entities/convocation.ts`, `domain/repositories/{convocation,team}-repository.ts`, `domain/rules/convocation-rules.ts`, `domain/policies/{rbac-matrix,can,actions,response-deadline,season-scope,convocation-closure}.ts`, `data/repositories/TeamRepositoryImpl.ts`, `presentation/shared/query-keys.ts`, `presentation/features/coach-dashboard/useCoachDashboardViewModel.ts`, et les deux migrations existantes.

## 1. Périmètre

Écran de **création d'une convocation** pour une équipe, dans le module de présentation **Calendrier** (`presentation/features/calendar`, aujourd'hui un stub). `specs/coach-dashboard.md` §1 « Hors périmètre » assigne explicitement la création de convocation à Calendrier, pas au tableau de bord.

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Calendrier et convocations | **P0** | Création d'une convocation (entraînement, match, réunion) pour une équipe, destinataires = équipe entière |

Auteurs concernés dans cette passe : **Coach/Staff** et **Responsable de section** (voir §2).

### Emplacement du composant (résolution PO-CV-07)

Le formulaire de création n'est **pas** imbriqué dans `presentation/features/coach-dashboard`. Il vit dans sa propre feature :

```
presentation/features/convocation/
  CreateConvocationForm.tsx
  useCreateConvocationViewModel.ts
  components/
    MeetingAgendaField.tsx        (champ ordre du jour, type réunion uniquement)
```

Le bouton `+` du tableau de bord coach (`CreateConvocationFab`, déjà en place, conditionné à `convocation:create`) déclenche ce formulaire partagé — il ne le possède pas. Un futur point d'entrée Calendrier importerait le même composant. `CreateConvocationForm` peut accepter des `initialValues` en prop pour rester réutilisable visuellement par un futur écran de modification — décision d'interface à faible coût, anticipée maintenant. **Aucun `UpdateConvocationUseCase` ni ViewModel de modification n'est créé dans cette passe** : l'autorisation de modification (qui peut modifier, quels champs, effet sur des `ConvocationResponse` déjà existantes) n'est pas spécifiée. Le nom est réservé, pas implémenté.

**Écart avec le code actuel, à ne pas ignorer** : un écran Calendrier générique, point d'entrée universel pour les 4 rôles habilités (Coach, Responsable de section, Dirigeant habilité, Administrateur), n'existe pas dans ce dépôt — `presentation/features/calendar/CalendarPage.tsx` est un stub sans logique. Cette passe ne construit **que** le point d'entrée coach (le FAB du tableau de bord, déjà stubé). Le point d'entrée du Responsable de section reste ouvert — voir §7.

### Décision — l'équipe cible n'est pas choisie sur cet écran

Le formulaire **n'a pas de sélecteur d'équipe**. La convocation est créée pour l'équipe déjà présélectionnée au niveau du tableau de bord d'origine — la pastille sélecteur d'équipe en en-tête côté coach (`specs/coach-dashboard.md` PO-6, `useCoachDashboardViewModel.currentTeam`), déjà triée par équipe rattachée au coach pour la saison en cours. Cette équipe **borne toutes les actions** de l'écran : destinataires implicites (équipe entière) et l'insertion elle-même.

Le même principe s'appliquera à un responsable de section une fois son point d'entrée défini (§7) : une équipe pré-sélectionnée en amont, jamais un choix fait sur l'écran de création lui-même. Rendre le sélecteur d'équipe du tableau de bord réellement interactif pour un coach multi-équipes reste hors périmètre, comme dans `specs/coach-dashboard.md`.

### Ce que cette feature ne couvre pas

- **La sélection joueur par joueur.** Une convocation vise **toujours l'équipe entière**. Les maquettes `match 1.png` (bascule « Toute l'équipe » désactivée) et la liste de licenciés qu'elle révèle documentent une **passe ultérieure** — aucune liste de destinataires interactive rendue, aucun état de sélection persisté dans cette passe.
- **Le choix de l'équipe cible sur cet écran** — héritée du tableau de bord d'origine (ci-dessus).
- **Modification et annulation** d'une convocation existante (voir « Emplacement du composant » ci-dessus).
- **La clôture de la convocation** — pilotée par trigger (`domain/policies/convocation-closure.ts`), jamais par le formulaire de création.
- **L'échéance de réponse** — dérivée du type (`domain/policies/response-deadline.ts`), jamais un champ du formulaire.
- **La saisie de présence et les réponses des joueurs** — entités et écrans distincts.
- **L'envoi effectif d'une notification / d'un courriel** aux destinataires : le module Communication est **P1**, résolu ci-dessous (§6, PO-CV-06) par un libellé de bouton neutre.
- **La création en mode dégradé (hors connexion)** — la matrice n'accorde que la *consultation* en mode dégradé, jamais l'écriture.

### Périmètre de données — la règle centrale

| Rôle auteur | Équipe(s) dans sa portée (source de l'équipe héritée) |
|---|---|
| Coach/Staff | Les équipes où il est affecté comme coach, saison en cours (`RoleAssignment.teamIds`) — AC-CD-06, AC-01/AC-02 |
| Responsable de section | **Toutes** les équipes de sa section (`RoleAssignment.sectionId` = `Team.sectionId`), saison en cours |

« Absence de saison en cours » (`current_season()` sans ligne) est un **état valide** : aucune équipe disponible, état vide explicite, jamais une erreur.

## 2. Modèle de données

### Convocation — champs par type

Trois types seulement — **la pastille « Autre » visible sur les 4 maquettes est retirée du périmètre P0** (résolution ci-dessous, ex-PO-CV-01). `ConvocationType` reste `'training' | 'match' | 'meeting'`, sans quatrième variante. Aucun signal produit n'existe pour ce que porterait « Autre » ; si elle revient un jour, elle sera traitée comme une nouvelle question de cadrage, pas une reprise de celle-ci.

| Champ | Types | Colonne / table |
|---|---|---|
| Équipe cible | tous | `Convocation.teamId` — héritée du tableau de bord, aucun champ de formulaire |
| Date + heure | tous | `Convocation.date` (`timestamptz`), horodatage unique |
| Lieu (texte libre) | Match, Réunion | `Convocation.location` (existant) |
| Lieu d'entraînement | Entraînement | `Convocation.location` (même colonne — voir « Lieu d'entraînement » ci-dessous) |
| Adversaire | Match | `MatchDetails.opponentId` → `opponents`, table satellite `match_details` (nouvelle — voir ci-dessous), **pas** un champ de `Convocation` |
| Lieu de la rencontre (Domicile / Extérieur) | Match | `MatchDetails.isHome` (`boolean not null`), même table satellite |
| RDV — heure, RDV — lieu | Match | `MatchDetails.meetingPointTime` (`timestamptz not null`), `MatchDetails.meetingPointLocation` (`text not null`), même table satellite |
| Titre | Réunion | `MeetingDetails.title` (`text not null`), table satellite `meeting_details` (nouvelle — voir ci-dessous), **pas** un champ de `Convocation` |
| Ordre du jour | Réunion | `MeetingDetails.agenda`, même table satellite `meeting_details`, **pas** un champ de `Convocation` |
| Auteur | tous | `Convocation.createdBy` (nouveau — seul champ ajouté à `Convocation` par cette passe, voir ci-dessous) |
| Destinataires | tous | aucune colonne, aucune ligne créée (voir « Destinataires » ci-dessous) |

Règle d'écriture inchangée : seuls les champs du type sélectionné sont persistés ; changer de type ne laisse fuiter aucun champ de l'ancien type. Le découpage en tables satellites ci-dessus rend cette règle structurelle plutôt que défendue à l'écriture : il n'existe littéralement pas d'emplacement où stocker un adversaire sur un entraînement.

### Écart entre la première rédaction de ce §2 et le code construit — confirmé, corrigé ici

La première version de cette section plaçait `opponentId`, `isHome`, `meetingPointTime`, `meetingPointLocation` et `title` en **colonnes directes** de `Convocation` / `public.convocations`, et réservait le patron de table satellite (clé primaire = clé étrangère) au seul `agenda`. **Ce n'est pas ce qui a été construit.** L'implémentation a déplacé les quatre champs de match dans une nouvelle table satellite `match_details` (entité `MatchDetails`, dépôt `MatchDetailsRepository`), et `title` dans `meeting_details` aux côtés d'`agenda`.

Raison retenue au moment de l'implémentation : un champ dont la validité dépend d'une autre colonne (`Convocation.type`) ne peut être que `null`able sur `convocations` — le schéma ne garantit alors plus rien (rien n'empêche un entraînement porteur d'un `opponent_id`, ni un match sans heure de RDV). Sur une satellite 1:1 les mêmes champs sont `not null`, et la cardinalité « au plus un bloc de détails par convocation » est tenue par la clé primaire elle-même. C'est exactement l'argument déjà retenu pour `agenda` dans cette même section, appliqué jusqu'au bout plutôt qu'à un seul champ.

**Confirmé par la développeuse (2026-08-21)** : ce découpage est la source de vérité pour la suite, il n'y a pas de retour au schéma en colonnes décrit initialement. `Convocation` ne reçoit de cette passe que `createdBy` — le seul champ ajouté qui ne soit conditionné par aucun type (symétrique de `closedBy` / `cancelledBy` déjà existants). Le reste de §2 (référentiel adversaires, lieu d'entraînement, non-matérialisation des destinataires, cascade de suppression) et §3 (RBAC) sont inchangés par cette correction.

```typescript
// domain/entities/convocation.ts — seul champ ajouté par cette passe
export interface Convocation {
  // ... champs existants ...
  createdBy: string
}

// domain/entities/match-details.ts — satellite 1:1, type 'match' uniquement
export interface MatchDetails {
  convocationId: string
  opponentId: string          // référence `opponents`, jamais `team_opponents`
  isHome: boolean
  meetingPointTime: string    // ISO — heure de RDV, distincte de Convocation.date (coup d'envoi)
  meetingPointLocation: string // distincte de Convocation.location (lieu de la rencontre)
}

// domain/entities/meeting-details.ts — satellite 1:1, type 'meeting' uniquement
export interface MeetingDetails {
  convocationId: string
  title: string
  agenda: string[]
}
```

Schéma correspondant — `supabase/migrations/20260821091519_convocation_creation_schema.sql` :

```sql
alter table public.convocations
  add column created_by uuid not null references public.users (id);

create table public.match_details (
  convocation_id uuid primary key references public.convocations (id) on delete cascade,
  opponent_id uuid not null references public.opponents (id),
  is_home boolean not null,
  meeting_point_time timestamptz not null,
  meeting_point_location text not null
);

create table public.meeting_details (
  convocation_id uuid primary key references public.convocations (id) on delete cascade,
  title text not null,
  agenda jsonb not null default '[]'::jsonb
);
```

Les deux satellites portent leur propre RLS, aucune n'hérite automatiquement de celle de `convocations` : `select` borné à l'équipe par une jointure de retour sur `convocations.team_id` (ces tables ne portent pas de `team_id` propre), et `insert` qui reprend à l'identique le contrôle de rôles de `convocations_insert_create` (coach de l'équipe / responsable de section de l'équipe / dirigeant habilité / administrateur — §3). Les tables `opponents` / `team_opponents` et le correctif RLS saison + branche `section-manager` sur `convocations_insert_create` sont inchangés par rapport à la rédaction initiale : seule la localisation des champs de match et du titre de réunion a changé.

### Écriture — un point d'entrée par type, une transaction

Conséquence directe du découpage ci-dessus : créer une convocation de type match ou réunion, c'est écrire **deux lignes dans deux tables**, ce qui doit être atomique (une satellite refusée ne doit pas laisser une convocation orpheline derrière elle). `ConvocationRepository` expose donc une méthode par type plutôt qu'un `create()` générique suivi d'un `upsert` de satellite :

```typescript
// domain/repositories/convocation-repository.ts
createTraining(input: CreateTrainingConvocationInput): Promise<Convocation>
createMatch(input: CreateMatchConvocationInput): Promise<Convocation>
createMeeting(input: CreateMeetingConvocationInput): Promise<Convocation>
```

`CreateConvocationUseCase` prend en entrée une union discriminée sur `type` (chaque champ spécifique est obligatoire dans sa propre variante, donc un input `match` sans heure de RDV est une erreur de compilation, pas un trou à l'exécution), applique l'autorisation puis les règles métier de §5, et aiguille vers la méthode du type. Côté `data/`, chaque méthode appelle une fonction Postgres dédiée — `create_training_convocation`, `create_match_convocation`, `create_meeting_convocation` — qui insère la ligne `convocations` puis, le cas échéant, sa satellite dans un même corps PL/pgSQL, donc une même transaction. Ces fonctions sont **volontairement `not SECURITY DEFINER`** : elles s'exécutent avec les droits de l'appelant, de sorte que `convocations_insert_create` **et** la politique `insert` de la satellite s'appliquent réellement à l'intérieur de la fonction. Ne pas y ajouter `SECURITY DEFINER` sans une décision explicite et séparée.

### Adversaire — référentiel (résolution, ex-PO-CV-02)

Deux tables :

```sql
create table public.opponents (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table public.team_opponents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  opponent_id uuid not null references public.opponents (id) on delete cascade,
  unique (team_id, opponent_id)
);
```

`opponents` est plat et global — l'identité d'un club adverse ne change pas d'une saison à l'autre. `team_opponents` est la relation qui borne le choix proposé dans le sélecteur « Choisir un adversaire » : `teams` porte déjà `season_id` et implique la catégorie via sa section, donc scoper par `team_id` donne saison + catégorie sans dupliquer aucune colonne. Le champ persisté pour la convocation est `opponent_id` (référence directe à `opponents`), pas `team_opponents.id` — il vit sur `match_details`, voir l'écart confirmé ci-dessus.

**Autorisation de créer un adversaire — tranché** : réservé à l'**Administrateur** dans cette passe (pas au coach, pas à la volée depuis l'écran de convocation). Une ouverture possible au **Dirigeant habilité**, uniquement pour une future version web, est envisagée mais **pas construite maintenant** — ni écran, ni permission ajoutée à `rbac-matrix.ts` pour ce cas dans cette passe ; à spécifier séparément le jour où la version web existe. L'écran de gestion des adversaires lui-même (où l'administrateur crée une ligne `opponents`) n'est pas dans le périmètre de cette spec — seul le fait que ce droit lui soit réservé l'est. Un futur import du calendrier fédéral alimentera vraisemblablement `team_opponents` par `team_id`, en retrouvant ou créant des lignes `opponents` — aucun changement de schéma anticipé pour cet usage, seulement noté pour ne pas être reconstruit de zéro plus tard.

### Lieu d'entraînement (résolution, ex-PO-CV-03)

Aucune nouvelle table. `Convocation.location` reste un texte libre, sans changement au modèle. Une liste figée dans le code applicatif (`const TRAINING_LOCATIONS = [...] as const`, `presentation/features/convocation/`) alimente uniquement un select/autocomplete du formulaire — non imposée au niveau domaine ni base. Déclencheur de révision (passage à une vraie table) : si cette liste se met à changer avec une fréquence réelle en pratique. Pas avant.

### Ordre du jour de réunion et patron des tables satellites (résolution, ex-PO-CV-04)

Table satellite 1:1, dont la clé primaire **est** la clé étrangère (DDL ci-dessus) — rend la cardinalité 1:1 impossible à violer au niveau du schéma plutôt que défendue côté applicatif.

`agenda` est un simple `string[]` ordonné pour cette passe — l'ordre du tableau **est** l'ordre d'affichage, pas de colonne `position`, pas d'`id` par point, pas de statut « fait » (aucune fonctionnalité n'a besoin de traiter un point d'ordre du jour comme une entité à part entière aujourd'hui). `Convocation` ne porte **aucun** champ `agenda` ni `title` — `meeting_details` possède ces deux concepts entièrement (voir l'écart confirmé ci-dessus pour `title`).

```typescript
// domain/repositories/meeting-details-repository.ts
export interface MeetingDetailsRepository {
  upsert(details: MeetingDetails): Promise<MeetingDetails>
  findByConvocationId(convocationId: string): Promise<MeetingDetails | null>
}

// domain/repositories/match-details-repository.ts — même forme 1:1, ajouté par
// le découpage confirmé ci-dessus
export interface MatchDetailsRepository {
  upsert(details: MatchDetails): Promise<MatchDetails>
  findByConvocationId(convocationId: string): Promise<MatchDetails | null>
}
```

Ceci établit le patron général pour de futurs détails par type de convocation (compte-rendu de match, vote — déjà envisagés ailleurs) : une table par type, 1:1 via `convocation_id` en clé primaire, créée seulement quand un besoin concret et spécifié existe pour ce type. Ce patron est désormais appliqué **deux fois** dans cette passe (`meeting_details`, `match_details`), et non plus une seule. **`training_details` n'est pas créée dans cette passe** — le concept de « programme » d'entraînement évoqué en séance n'a ni forme définie ni fonctionnalité qui en dépende. Le nom est réservé mentalement, la table n'est pas ébauchée ; `create_training_convocation` n'insère donc qu'une ligne `convocations`, et n'existe que pour offrir une surface de création homogène par type.

La logique d'aiguillage (quel dépôt appeler selon le type de convocation) vit dans un use case, jamais dans un ViewModel ni un composant :

```typescript
// domain/usecases/convocation/GetConvocationDetailsUseCase.ts
export class GetConvocationDetailsUseCase {
  constructor(
    private readonly meetingDetails: MeetingDetailsRepository,
    private readonly matchDetails: MatchDetailsRepository,
    // trainingDetails : à ajouter quand training_details existera
  ) {}

  async execute(convocation: Convocation): Promise<MeetingDetails | MatchDetails | null> {
    switch (convocation.type) {
      case 'meeting':
        return this.meetingDetails.findByConvocationId(convocation.id)
      case 'match':
        return this.matchDetails.findByConvocationId(convocation.id)
      case 'training':
        // Aucun dépôt de détails configuré pour ce type : soit un appelant
        // demande des détails pour un type non supporté (bug), soit
        // training_details devient nécessaire (§2/§7, trou de spec assumé).
        throw new Error(`No details repository configured for convocation type: ${convocation.type}`)
      default: {
        const _exhaustive: never = convocation.type
        throw new Error(`Unhandled convocation type: ${_exhaustive}`)
      }
    }
  }
}
```

`match` n'est plus une branche « non supportée » comme dans la rédaction initiale : elle a désormais un vrai dépôt satellite, conséquence directe de l'écart confirmé ci-dessus. Seul `training` reste sans détails.

**Note d'emplacement de fichier** : ce use case est scaffoldé en `domain/usecases/convocation/GetConvocationDetailsUseCase.ts` (dossier par feature, fichier en PascalCase), et non en `domain/usecases/get-convocation-details.ts` comme l'écrivait l'exemple de code de la première rédaction. C'est la convention réellement établie dans le dépôt (`domain/usecases/coach-dashboard/GetCoachTeamsUseCase.ts`, `ARCHITECTURE.md` « usecases/ — un dossier par feature ») qui prime sur le chemin littéral d'un extrait de spec. Noté ici pour que ce ne soit pas relu plus tard comme un second écart non documenté.

Le `never` exhaustif fait échouer la compilation si un nouveau `ConvocationType` est ajouté sans mettre à jour ce switch. Couverture attendue : un test Vitest de ce use case avec des dépôts factices en mémoire, même patron que `can.test.ts` / `convocation-closure.test.ts`.

### Destinataires — pas de matérialisation (résolution, ex-PO-CV-05)

**Aucune ligne `ConvocationResponse` n'est créée à la création de la convocation.** Une ligne n'existe qu'à partir du moment où un joueur répond réellement (présent/absent), via l'`upsert` et la politique RLS `INSERT` déjà existants (le joueur écrit sa propre ligne) — inchangés, aucune nouvelle politique nécessaire.

« Nombre de convoqués » et « en attente » se calculent à la lecture, ne sont jamais stockés :

```
convoqués  = effectif courant de l'équipe (déjà nécessaire ailleurs pour l'affichage de l'effectif)
présents   = COUNT(convocation_responses WHERE status = 'present')
absents    = COUNT(convocation_responses WHERE status = 'absent')
en attente = convoqués - présents - absents   -- jamais persisté
```

Ce calcul inter-tables relève d'une vue ou d'une fonction Postgres (`ARCHITECTURE.md` §3), pas d'une composition côté client via la syntaxe de ressources imbriquées de Supabase JS. Cette passe ne construit pas cette vue — elle n'est pas nécessaire pour la seule création ; sa nécessité et son nom concret devront être posés au moment où l'écran qui l'affiche (tableau de bord ou détail de convocation) sera implémenté.

**Limite explicitement acceptée, à ne pas « corriger » plus tard sans déclencheur réel** : un joueur qui n'a jamais répondu puis quitte l'équipe peut silencieusement disparaître du compteur « en attente » d'une convocation *passée*, si ce compteur est recalculé après le changement d'effectif. Palliatif si cela devient un problème réel en pratique : recréer l'événement. Ne pas construire de support de convoqués ad hoc ni de snapshot d'effectif pour couvrir ce cas — à revisiter seulement sur signalement effectif.

Cette décision reste couplée à la question, toujours ouverte, de la source de vérité des « convoqués requis » évoquée dans `specs/coach-dashboard.md` (PO-6b, portée du compteur licenciés) — non résolue par cette passe.

**Suppression en cascade, confirmé** : `convocation_responses` et `attendance_records` ont déjà `on delete cascade` vers `convocations.id` (migration initiale) ; `meeting_details` et `match_details` en héritent nativement puisque leur clé primaire est la clé étrangère. Exception à garder en tête pour plus tard, sans l'implémenter maintenant : une future référence de la table de journal d'audit (absente du schéma à ce jour — voir §7) vers `convocation_id` ne devra **pas** être en cascade — une trace d'audit doit survivre à la suppression de ce qu'elle trace (intention du CDC §11.3).

## 3. RBAC

### Ligne de matrice applicable

« **Créer/modifier une convocation** », lue telle quelle dans `priorisation-fonctionnelle-as-acaribbean.md` :

| Rôle | Valeur matrice | Traduction sur cette feature |
|---|---|---|
| Joueur/Joueuse | ❌ | Aucun accès, aucun point d'entrée rendu (AC-CD-07) |
| Coach/Staff | ✅ (son équipe) | Crée pour l'équipe héritée du tableau de bord. Point d'entrée : FAB `+` |
| Responsable de section | ✅ (sa section) | Crée pour l'équipe héritée du tableau de bord, parmi toute équipe de sa section. Point d'entrée non défini — §7 |
| Dirigeant habilité | ✅ | Permission acquise, non scopée dans `can.ts` ni en RLS aujourd'hui. Aucun point d'entrée créé pour lui dans cette passe — statu quo |
| Trésorier, Référent médical, Bénévole | ❌ | Aucun accès |
| Administrateur | ✅ | Accès par l'administration, pas par auto-affectation à une équipe |

### Écart identifié entre la séance de mentoring et le code actuel — confirmé, corrigé dans cette passe

Le compte-rendu de mentoring qui a résolu PO-CV-07 affirme que le Responsable de section est « déjà » couvert par la permission `convocation:create` et qu'aucun changement de `rbac-matrix.ts` n'est nécessaire. **Ce n'est pas le cas dans ce dépôt** : `domain/policies/rbac-matrix.ts` définit aujourd'hui `'convocation:create': ['coach', 'authorized-officer', 'admin']` — `section-manager` en est absent. Sans cet ajout, un Responsable de section échoue le contrôle `can()` et ne peut littéralement pas créer de convocation, ce qui contredit à la fois ce compte-rendu et le périmètre de cette spec (§1, §3).

**Confirmé par la développeuse (2026-08-20)** : ajouter `'section-manager'` à `convocation:create` fait partie de cette passe. Corriger aussi le branchement correspondant dans `can.ts` — son `case 'section-manager'` ne teste aujourd'hui que `action !== 'section:manage'`, ce qui laisserait passer `convocation:create` **sans vérifier que la section de l'utilisateur correspond à celle de l'équipe ciblée**. `AuthorizationContext` porte déjà `teamId` et `sectionId` : le correctif consiste à vérifier `context.sectionId === team.sectionId` (ou équivalent) pour cette action précise, pas à ouvrir `section-manager` sans restriction. Aucun autre changement de matrice n'est fait dans cette passe.

### Application technique

Chaque restriction existe **en RLS Postgres (autorité)** et en miroir dans `rbac-matrix.ts` + `can.ts` (ergonomie). Le tableau de bord ne proposant qu'une équipe déjà bornée par rôle, AC-CD-06 et AC-CV-04 se testent avec un jeton contre la base, hors application.

**Écart RLS déjà identifié pour ce chemin** : la politique `convocations_insert_create` couvre la branche coach par `private.is_coach_of_team(team_id)`, qui **ne filtre pas par saison** — un coach peut aujourd'hui insérer sur une équipe de saison antérieure. Aucun helper `private.is_section_manager_of_section` n'existe non plus. Les deux sont nécessaires à l'implémentation (AC-CD-06, AC-CV-04).

## 4. Données sensibles

- **Données de santé, financières : aucune.** Cohérent avec `specs/coach-dashboard.md` §3.
- **Données personnelles : le nom des destinataires.** Aucune liste nominative n'est rendue dans cette passe (§2, « Destinataires ») ; seul un agrégat (effectif de l'équipe) alimente le libellé du bouton.
- **Auteur de la convocation (résolution, ex-PO-CV-08)** : `created_by` (§2) est une **donnée métier ordinaire**, symétrique de `closed_by` / `cancelled_by` déjà existants — pas une entrée de journal d'audit. Elle sert l'affichage, le filtrage, et une future logique d'autorisation de modification. Elle n'est couplée à aucun mécanisme d'audit.
- **Journal d'audit : toujours absent du schéma.** La création d'une convocation ne figure pas dans la liste des actions sensibles du CDC §11.3 — aucune journalisation n'est donc requise pour cette action précise. L'absence totale d'une table de journal d'audit dans `supabase/migrations/` reste une exigence transversale P0 séparée, non résolue par cette passe.
- **Export : aucun** depuis cet écran.
- **Rétention** : hors périmètre, vit côté Supabase (`CLAUDE.md` §6).

## 5. Règles métier

### Date passée interdite

Une convocation **ne peut pas être créée avec une date/heure passée**.

- **Autorité : un trigger `BEFORE INSERT` Postgres** sur `public.convocations`. Un `CHECK` ne convient pas — Postgres exige une expression immuable, et `now()` ne l'est pas.
- **Miroir lisible** : une fonction pure dans `domain/rules/convocation-rules.ts` (à côté d'`isUpcoming`), utilisée par le ViewModel pour un retour immédiat. Miroir manuel, commenté des deux côtés (`CLAUDE.md` §7).
- La règle porte sur l'insertion : une convocation devenue passée reste valide, elle n'est pas invalidée rétroactivement.

### Cohérence RDV / coup d'envoi — résolution, ex-PO-CV-09

Validation ajoutée bien qu'elle ne soit sourcée ni par le CDC ni par les maquettes — choix délibéré : une validation coûte moins cher à retirer plus tard qu'à greffer une fois les parcours de création généralisés.

```typescript
// domain/policies/match-scheduling-rules.ts

/**
 * Vérifie que l'heure de RDV précède le coup d'envoi, le même jour.
 * Non sourcée par le CDC ni les maquettes — ajoutée par prudence
 * (spec create-convocation.md, résolution PO-CV-09). À assouplir si un
 * cas légitime de RDV la veille ou sur plusieurs jours se présente.
 */
export function isValidMatchSchedule(rdvTime: Date, matchTime: Date): boolean {
  const sameDay =
    rdvTime.getFullYear() === matchTime.getFullYear() &&
    rdvTime.getMonth() === matchTime.getMonth() &&
    rdvTime.getDate() === matchTime.getDate()

  return sameDay && rdvTime < matchTime
}
```

Appliquée au niveau du use case (`CreateConvocationUseCase`), pas seulement du formulaire — le ViewModel peut appeler la même fonction pour un retour rapide, mais le use case est l'autorité qui rejette une soumission invalide :

```typescript
if (input.type === 'match' && !isValidMatchSchedule(input.rdvTime, input.matchTime)) {
  throw new InvalidScheduleError('RDV time must precede kickoff, same day.')
}
```

Couverture attendue : test Vitest (`match-scheduling-rules.test.ts`), même priorité que `response-deadline.test.ts` / `convocation-closure.test.ts` (`CLAUDE.md` §8).

## 6. Libellé du bouton — résolution, ex-PO-CV-06

Les 4 maquettes affichent « Envoyer à N joueurs ». **Libellé retenu pour cette passe : « Créer la convocation »** (ou formulation neutre équivalente) — aucun envoi actif (courriel/push) n'est déclenché par cette action, le module Communication étant P1 et hors périmètre. À revisiter avec le Bureau une fois ce module construit et qu'un envoi réel peut justifier un libellé plus orienté action. Correction de maquette à porter par designer-agent — voir §8.

## 7. Points encore ouverts

Uniquement ce qui reste sans réponse après cette passe de résolution :

| Réf. | Question | Bloquant ? |
|---|---|---|
| Volatilité de la liste des lieux d'entraînement | La liste figée `TRAINING_LOCATIONS` doit passer en table réelle si elle se met à changer avec une fréquence réelle en pratique | Non |
| Source de vérité des « convoqués requis » | PO-6b de `specs/coach-dashboard.md`, toujours ouvert, couplé à §2 « Destinataires » de cette spec | Non |
| `training_details` | Concept de « programme » d'entraînement sans forme ni fonctionnalité dépendante définie — nom réservé, table non ébauchée | Non |
| `UpdateConvocationUseCase` | Autorisation de modification non spécifiée (qui, quels champs, effet sur des réponses déjà existantes) — nom réservé uniquement | Non |
| Table de journal d'audit | Absente du schéma, exigence transversale P0 distincte de cette feature | Non |
| Ouverture future à Dirigeant habilité pour la création d'adversaires | Envisagée uniquement pour une future version web (§2) — non spécifiée, non construite dans cette passe | Non |
| **Point d'entrée du Responsable de section — confirmé mais non construit** | Confirmé (développeuse, 2026-08-20) : passe par la feature **Calendrier** (`presentation/features/calendar`), pas par un tableau de bord de section dédié — cohérent avec §1 (la création de convocation appartient à Calendrier, pas à un tableau de bord). Mais Calendrier est aujourd'hui un stub sans aucun écran fonctionnel : construire son point d'entrée (bouton `+`, navigation vers `CreateConvocationForm`, résolution de l'équipe courante pour un responsable de section) n'est **pas** dans cette passe | Non pour l'écran de création lui-même, mais empêche d'ouvrir ce rôle en pratique tant que Calendrier n'existe pas |

## 8. Note pour designer-agent

- **Les 3 variantes Match / Entraînement / Réunion sont couvertes par les maquettes** de `docs/designs/create-convocation/`.
- **Corrections à apporter aux maquettes** (constats de cette passe, pas des choix de designer-agent à refaire) :
  1. Retirer la 4ᵉ pastille « Autre » du sélecteur de type (§2).
  2. Remplacer le libellé du bouton « Envoyer à N joueurs » par « Créer la convocation » (§6).
- **Aucun sélecteur d'équipe sur cet écran** (§1) : l'équipe cible est celle déjà affichée en en-tête du tableau de bord d'origine.
- **Bloc DESTINATAIRES** : conserver la carte « Toute l'équipe » comme information, sans interactivité — la bascule désactivée et la liste de licenciés de `match 1.png` appartiennent à une passe ultérieure.
- **Adversaire** : liste déroulante alimentée par `team_opponents` de l'équipe courante (§2) — comportement de sélection simple, pas de création d'adversaire depuis cet écran (question encore ouverte, §7).
- **Lieu d'entraînement** : liste déroulante/autocomplete alimentée par une liste figée côté code, pas une vraie recherche de référentiel (§2).
- Les maquettes contiennent des noms de licenciés fictifs : ils ne doivent apparaître **nulle part** dans le code, les tests ou la documentation (`CLAUDE.md` §9) — sans objet ici, la liste nominative n'étant pas construite.

## 9. Note pour mentor-agent

Éléments à scaffolder en plus du formulaire lui-même :

- `domain/entities/meeting-details.ts` (`MeetingDetails` : `title` **et** `agenda` — §2, écart confirmé)
- `domain/entities/match-details.ts` (`MatchDetails` : `opponentId`, `isHome`, `meetingPointTime`, `meetingPointLocation` — §2, écart confirmé)
- `domain/repositories/meeting-details-repository.ts` (`MeetingDetailsRepository`) et `domain/repositories/match-details-repository.ts` (`MatchDetailsRepository`), même forme 1:1
- `domain/usecases/convocation/GetConvocationDetailsUseCase.ts` (`GetConvocationDetailsUseCase`, switch exhaustif, branches `meeting` et `match` — §2 ; dossier par feature + PascalCase, cf. note d'emplacement de fichier en §2)
- `domain/policies/match-scheduling-rules.ts` (`isValidMatchSchedule` — §5)
- `domain/rules/convocation-rules.ts` : ajouter la règle miroir « pas de date passée » (§5)
- `domain/entities/convocation.ts` : ajouter `createdBy`, **et rien d'autre** (§2) — ne pas y ajouter `agenda`, `title`, ni les champs de match : ils vivent dans `MeetingDetails` / `MatchDetails`
- `domain/repositories/convocation-repository.ts` : une méthode de création **par type** (`createTraining` / `createMatch` / `createMeeting`), la création d'une convocation et de sa satellite étant une seule écriture logique (§2, « Écriture »)
- `domain/policies/rbac-matrix.ts` + `can.ts` : ajouter `section-manager` à `convocation:create`, scopé par section (§3 — écart signalé, à corriger, pas à ignorer)
- Migration SQL : colonne `created_by` sur `convocations`, tables `opponents`, `team_opponents`, `match_details`, `meeting_details` (avec leur RLS `select` bornée à l'équipe et `insert` miroir de `convocations_insert_create`), une fonction de création par type (`not SECURITY DEFINER`), trigger de date passée, correctif RLS saison + branche `section-manager` sur `convocations_insert_create`
- `presentation/features/convocation/` (§1) : `CreateConvocationForm.tsx`, `useCreateConvocationViewModel.ts`, `components/MeetingAgendaField.tsx`
- Tests Vitest à prévoir dès le scaffolding : `GetConvocationDetailsUseCase.test.ts`, `match-scheduling-rules.test.ts` (même priorité que les policies existantes, `CLAUDE.md` §8)

**Ne pas implémenter dans cette passe** : `UpdateConvocationUseCase`, `training_details`, la table de journal d'audit, l'écran Calendrier générique (§7).

## UI design

**Sources utilisées, par ordre de priorité effectif** : les 4 exports `docs/designs/create-convocation/[v3] [Coach] Mob - Create convocation - {match 1, match 2, training, meeting}.png` (référence visuelle principale pour la mise en page des 3 variantes) ; `docs/designs/v4_coach_dashboard.png` pour le point d'entrée FAB et le vocabulaire visuel déjà posé (pastilles colorées par type, liseré de couleur, bouton pleine largeur) ; le présent spec (§1 Périmètre, §2 modèle de données, §3 RBAC, §5 règles métier, §6 libellé, §8 note designer-agent). Aucun fichier `wireframes-basiques-as-caribbean.md` n'existe dans ce dépôt à ce jour (déjà constaté dans `specs/coach-dashboard.md`) — sans objet ici, les 4 maquettes dédiées suffisent à couvrir l'écran.

### Emplacement dans la nav

Cet écran n'est **pas** un contenu d'onglet parmi les 4 fixes. C'est une route plein écran poussée par-dessus l'écran d'origine, sans chrome de nav basse visible (conforme aux 4 maquettes : aucune n'affiche la barre à 4 entrées, seulement une flèche retour en haut à gauche). Ce n'est pas une 5ᵉ destination — c'est le même patron qu'un écran de composition/formulaire poussé au-dessus d'un onglet, courant en mobile, qui ne casse pas la contrainte des 4 entrées fixes puisqu'aucune entrée de nav n'y mène directement : on y arrive uniquement par une action contextuelle (le FAB) depuis un écran qui, lui, appartient à un des 4 onglets.

- **Point d'entrée construit dans cette passe** : le FAB `+` du tableau de bord Coach, déjà spécifié côté visuel dans `specs/coach-dashboard.md` (« UI design », point 5) — cette passe ne le reconçoit pas, elle construit ce qu'il ouvre.
- **Rattachement conceptuel** : Calendrier (§1 du présent spec). Le jour où l'écran Calendrier existera, son propre bouton `+` poussera exactement le même composant `CreateConvocationForm` — rien à reconcevoir à ce moment-là, seulement un second appelant.
- Flèche retour (haut gauche, cf. maquettes) : ramène à l'écran d'origine (le tableau de bord coach dans cette passe), sans confirmation de perte de saisie — non spécifié en §5/§8, donc non ajouté ici (voir « Questions ouvertes UI »).

### Structure de l'écran, de haut en bas

Trois variantes d'un même formulaire, sélecteur de type en tête commun à toutes.

1. **En-tête** : flèche retour + titre « Nouvelle convocation », identique quelle que soit la variante (cf. les 4 maquettes) — pas de titre dynamique par type.

2. **Sélecteur TYPE** — rangée de pastilles-boutons, **3 désormais, pas 4** :
   - **Correction obligatoire vs maquettes (§8, point 1)** : la 4ᵉ pastille « Autre » (point violet) est supprimée entièrement, pas grisée, pas masquée conditionnellement — retirée du composant. Conséquence de mise en page à noter : les 3 pastilles restantes (Match — point rouge, Entraînement — point vert, Réunion — point orange) tiennent sur une seule rangée à la largeur d'écran des maquettes ; le retrait de la 4ᵉ élimine donc aussi le retour à la ligne visible dans les 4 exports, sans qu'il y ait de recomposition à concevoir au-delà de ça.
   - Une pastille sélectionnée est pleine couleur avec point blanc et texte blanc gras (cf. maquettes) ; les non-sélectionnées restent sombres avec point coloré. État par défaut à l'ouverture : Match (cohérent avec les 4 maquettes, qui montrent toutes Match présélectionné) — à confirmer, voir « Questions ouvertes UI ».
   - Changer de pastille réinitialise instantanément la zone de champs sous le sélecteur pour n'afficher que les champs du type choisi (§2, « règle d'écriture inchangée ») — aucune transition ou confirmation nécessaire, cohérent avec une simple bascule d'état de formulaire contrôlé.

3. **Zone de champs, spécifique au type sélectionné** (reprend telle quelle la disposition des maquettes, aux 2 corrections §8 près) :
   - **Match** (`match 2.png`, état non déplié de la liste de licenciés — référence de mise en page prioritaire à `match 1.png` qui montre l'état hors périmètre) : Adversaire (select/autocomplete, cf. « Adversaire » ci-dessous) → Lieu de la rencontre (bascule à 2 boutons Domicile/Extérieur, un seul actif à la fois, style segmented control déjà illustré) → Date + Heure (deux champs texte côte à côte) → Lieu (texte libre) → RDV — heure + RDV — lieu (deux champs texte côte à côte). Aucun champ supplémentaire.
   - **Entraînement** (`training.png`) : Date + Heure (côte à côte) → Lieu d'entraînement (select/autocomplete, valeur pré-remplie visible dans la maquette : comportement de select standard, pas un champ texte libre malgré l'apparence).
   - **Réunion** (`meeting.png`) : Titre (texte libre) → Date + Heure (côte à côte) → Lieu (texte libre) → **Ordre du jour** (nouveau composant, voir ci-dessous).
   - Champs sans valeur passée en `initialValues` : texte de substitution (« Ex: Samedi 22 août », etc.) tel qu'illustré — le formulaire de création s'ouvre vide, ces exemples ne sont que des placeholders, pas des valeurs par défaut à soumettre.

4. **Bloc DESTINATAIRES** — carte « Toute l'équipe », état informationnel uniquement :
   - **Correction obligatoire vs maquettes (§8, point 4)** : conserver l'apparence de l'état activé illustré dans `match 2.png` / `training.png` / `meeting.png` (interrupteur vert, poussoir à droite, sous-titre « Par défaut pour entraînements et matchs ») — jamais l'état désactivé de `match 1.png` (interrupteur gris + liste de 12 licenciés cochables), qui documente une passe ultérieure hors périmètre.
   - L'interrupteur reste **visuellement à l'identique** (vert, activé) mais devient **non interactif** : aucun gestionnaire de tap, aucun état pressed/disabled visible. C'est le même traitement que la pastille de rôle et le sélecteur d'équipe du tableau de bord coach (`specs/coach-dashboard.md`, « no-op en v1 ») — pas un nouveau pattern, une réapplication directe de celui-là. Ne pas le rendre grisé/estompé : un interrupteur grisé lirait comme « désactivé » ou « non disponible », alors qu'il représente un état toujours vrai (toute la portée de la contrainte « pas d'état désactivé » du projet, bien que formulée pour les cartes de menu, s'applique par analogie ici).
   - Le compteur « N sélectionnés » en haut à droite de la carte affiche l'effectif courant de l'équipe héritée (même source que le compteur licenciés du tableau de bord) — pas de logique de sélection, un simple nombre lu.

5. **Bouton de soumission**, pleine largeur, ancré en bas au-dessus de la zone sûre (pas au-dessus d'une nav basse puisqu'il n'y en a pas sur cet écran) :
   - **Correction obligatoire vs maquettes (§8, point 2)** : libellé **« Créer la convocation »**, jamais « Envoyer à N joueurs » (§6) — aucune variable N dans le libellé, le bouton ne change pas de texte selon l'effectif ni selon le type.
   - Désactivé (grisé, seul cas légitime d'état désactivé sur cet écran — un formulaire incomplet n'est pas une carte de menu conditionnée par une permission, la règle « pas de grisé » du projet vise spécifiquement les cartes de menu et les toggles non fonctionnels ci-dessus, pas la validation de formulaire) tant que les champs obligatoires du type courant ne sont pas remplis. Message d'erreur inline sous le premier champ en défaut lors d'une tentative de soumission bloquée par le use case (date passée, RDV après coup d'envoi — §5) : pattern de champ en erreur standard (bordure rouge + texte d'aide rouge sous le champ), pas de nouveau composant.

### Nouveau composant — `MeetingAgendaField`

Champ « Ordre du jour », type Réunion uniquement (§1, arborescence de fichiers). Reprend tel quel le patron de `meeting.png` :

- En-tête de section : « Ordre du jour » à gauche, compteur « N points » à droite (même position/style que « N sélectionnés » du bloc DESTINATAIRES).
- Liste ordonnée : chaque point = pastille numérotée ronde (1, 2, 3…) + texte du point + icône de suppression (×) à droite. La numérotation reflète l'ordre du tableau `agenda` (§2) — pas de glisser-déposer pour réordonner dans cette passe, non illustré par la maquette et non demandé par la spec.
- Ligne d'ajout : champ texte en pointillés « Ajouter un point... » + bouton `+` carré accolé à droite. Valider (touche Entrée ou tap sur `+`) ajoute le point en fin de liste et vide le champ ; un champ vide ne produit pas d'ajout.
- Texte d'aide statique sous la liste : « Envoyé avec la convocation » (déjà dans la maquette) — purement informatif, aucune interaction.
- Suppression d'un point : tap sur `×` retire l'élément et renumérote les pastilles suivantes ; aucune confirmation, cohérent avec le faible coût de l'erreur (le point peut être retapé).
- Liste vide acceptée à la soumission (§2 ne rend pas l'ordre du jour obligatoire) : pas d'état d'erreur particulier à concevoir pour une liste à 0 point.

### Adversaire et Lieu d'entraînement — pas de composant nouveau

Les deux sont des sélecteurs ordinaires (§8, points 5) :

- **Adversaire** (Match) : `Select` shadcn/ui standard, options = `team_opponents` de l'équipe héritée (§2). Pas d'action « créer un adversaire » depuis ce select (§7, point encore ouvert, non construit ici) — si la liste est vide pour l'équipe, le select s'affiche avec un état vide standard du composant (« Aucun adversaire disponible » ou équivalent), pas une redirection vers un écran de création.
- **Lieu d'entraînement** (Entraînement) : `Select`/`Combobox` shadcn/ui standard, options = `TRAINING_LOCATIONS` figée (§2) — pas une recherche de référentiel externe, un simple choix dans une liste courte.

### Composants réutilisés vs nouveaux

- **Réutilisés directement des 4 maquettes** : sélecteur TYPE (pastilles colorées), champs texte/date/heure, bascule Domicile/Extérieur, carte DESTINATAIRES, bouton pleine largeur en bas d'écran — mêmes styles que ceux déjà établis par `docs/designs/v4_coach_dashboard.png` (pastilles, cartes, bouton blanc plein).
- **Nouveau, mais pas un nouveau pattern visuel** : `MeetingAgendaField` est une liste numérotée avec ajout/suppression — variation directe d'un pattern de liste déjà vu (ligne + action à droite, comme la liste « À venir » du tableau de bord), pas une forme inédite.
- **Aucun composant réellement inédit** n'est nécessaire : la seule différence structurelle avec les maquettes est un retrait (pastille Autre, liste de destinataires interactive) et une désactivation d'interactivité (toggle DESTINATAIRES), jamais un ajout de forme nouvelle.

### Ce qui change par rôle

Reprend §3 du présent spec, rien de redéfini ici :

- **Joueur/Joueuse, Trésorier, Référent médical, Bénévole** : aucun accès, aucun point d'entrée rendu — cet écran n'existe pour eux nulle part dans l'UI (pas de FAB, pas de lien).
- **Coach/Staff** : accès via le FAB du tableau de bord (seul point d'entrée construit dans cette passe). Le formulaire est identique pour tous les coachs ; l'équipe héritée varie selon l'équipe courante du tableau de bord d'origine, jamais choisie sur cet écran (§1).
- **Responsable de section** : permission acquise côté RBAC (§3) mais **aucun point d'entrée UI construit dans cette passe** — le bouton `+` de Calendrier qui le porterait n'existe pas encore (§7, non bloquant pour cette spec). Rien à concevoir ici pour lui au-delà du constat : le composant `CreateConvocationForm` lui-même n'a besoin d'aucune variation visuelle par rôle, seule la source de l'équipe héritée diffère (§1, tableau « Périmètre de données »), ce qui est un détail de câblage ViewModel, pas de mise en page.
- **Dirigeant habilité, Administrateur** : permission acquise, aucun point d'entrée UI créé dans cette passe pour l'un ou l'autre (§3) — statu quo, rien à concevoir.

### Questions ouvertes UI

Aucune n'est bloquante pour la transmission à mentor-agent — les 3 variantes sont entièrement couvertes par les maquettes une fois les 2 corrections de §8 appliquées. Deux points mineurs à trancher en implémentation, sans impact sur la structure ci-dessus :

1. **Pastille de type présélectionnée à l'ouverture.** Les 4 maquettes montrent toutes Match sélectionné par défaut, mais rien dans la spec ne confirme que Match doit être le type par défaut plutôt qu'aucune sélection forcée (obligeant un choix actif) — à trancher en implémentation, comportement à faible coût dans un sens comme dans l'autre.
2. **Confirmation de sortie sur formulaire rempli.** Aucune maquette ni section de spec ne traite le cas d'un tap sur la flèche retour après saisie partielle (perte de saisie silencieuse vs. confirmation) — non demandé, donc non conçu ici ; à lever seulement si signalé en usage réel, cohérent avec la philosophie « pas de garde-fou avant besoin constaté » déjà appliquée ailleurs dans ce spec (§2, limite du compteur « en attente »).

**Prêt pour transmission à mentor-agent : oui.**
