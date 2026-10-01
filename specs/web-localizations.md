# Spec — Backoffice web : lieux d'entraînement (`web-localizations`)

> Statut : **deuxième rédaction (2026-10-01), trois décisions de la développeuse intégrées** : PO-WL-01 (lien par clé étrangère), PO-WL-02 (action RBAC `'training_location:write'`) et PO-WL-03 (archivage, pas de suppression) sont tranchés. **Aucun point ouvert bloquant** : prête pour designer-agent puis l'implémentation (PO-WL-10 reste à trancher avant mise en production, §6).
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (module P0 « Calendrier et convocations », ligne de matrice « Gérer comptes, rôles, paramétrage », journal d'audit CDC §11.3), `docs/roles-personas-as-caribbean.md` (Administrateur : « Paramétrage… »), `specs/create-convocation.md` §2 « Lieu d'entraînement (résolution, ex-PO-CV-03) », §5, §7 et §8, `specs/edit-match-details.md` (`'convocation:update'`, match uniquement), `docs/DEFAULTS-A-CHALLENGER.md` « Liste des lieux d'entraînement (PO-CV-03) », specs sœurs `web-seasons.md`, `team-opponents.md`, `web-audit-logs.md` (addendum « neuf émetteurs create/edit »), `CLAUDE.md` §3/§4/§6/§7/§9.
> État du code lu : `supabase/migrations/20260811171754_initial_schema.sql` (`convocations.location text not null`), `20260821092153_convocation_rpc_search_path_fix.sql` (`create_training_convocation(p_location text)`), `20260925150603_edit_match_details_write_policy.sql` (`grant update (date, location)`, match uniquement), `domain/entities/convocation.ts` (`location: string`, `ConvocationArrangements = Pick<Convocation, 'date' | 'location'>`), `data/repositories/ConvocationRepositoryImpl.ts` (lectures `from('convocations')`, RPC par type), `presentation/features/convocation/{training-locations.ts,CreateConvocationForm.tsx,useCreateConvocationViewModel.ts}`, `domain/usecases/convocation/CreateConvocationUseCase.ts`, `domain/policies/{rbac-matrix,audit-actions}.ts`, `presentation/features/backoffice/backoffice-nav.ts`.
> Maquettes : `docs/designs/desktop/localizations/[Admin] Web - Localization - 1.png` et `… - 2.png`, lues directement (§0).

### Historique de révision

- **2026-10-01, deuxième rédaction.** Décisions de la développeuse, transmises par la session principale :
  - **PO-WL-01 tranché — clé étrangère.** Une convocation d'entraînement référence son lieu par `training_location_id`, et non plus par une copie du nom. Motif : si le nom ou l'adresse changent, les utilisateurs doivent voir la mise à jour. Touche §1, §2.2, §2.3, §2.5, §2.6, AC-WL-04 et suivants, §7.
  - **PO-WL-03 tranché — archivage, jamais de suppression.** Colonne `is_archived` (défaut `false`) et bouton « Archiver » sur la page d'administration. Un lieu archivé n'est plus proposé dans le formulaire de convocation, mais reste résolu pour les convocations qui le référencent. Le désarchivage n'est pas demandé : PO-WL-14, non bloquant.
  - **PO-WL-02 tranché — nouvelle action `'training_location:write': ['admin']`**, sur le patron de `'season:write'`. Touche §2.4, §2.5, §3, AC-WL-08 et AC-WL-09.
  - **Conséquence, non décidée séparément :** PO-WL-08 (portée de la lecture RLS) devient sans objet. Les joueurs doivent pouvoir résoudre le lieu de leurs convocations (§2.4).

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne n'existe au registre pour `web-localizations`.** Deux exports PNG sont présents dans le dépôt, sans lien artifact : cas **`instantané seul`** (§2 et §4 du registre). **Aucun lien n'est demandé**, ni maintenant ni lors d'une passe ultérieure.

L'agent PO n'écrit que dans `specs/`. Ligne **pré-rédigée, à recopier telle quelle** au §2 du registre par la développeuse ou le premier agent ayant les droits sur `docs/` (PO-WL-12) :

```
| web-localizations — **backoffice desktop : lieux d'entraînement (liste + dialogue d'ajout)** (`[Admin] Web - Localization - {1,2}`) | — aucun lien fourni | 2026-10-01 | `docs/designs/desktop/localizations/[Admin] Web - Localization - {1,2}.png` | **instantané seul** |
```

Note à joindre sous le tableau : les deux exports ne sont pas deux écrans mais **un écran et son dialogue d'ajout**.
- `- 2` = liste seule (export recadré, navigation latérale coupée après « Lieux »).
- `- 1` = même liste + dialogue « Ajouter un lieu ».

Ni dialogue de modification ni bouton « Archiver » ne sont illustrés, bien qu'un crayon figure sur chaque ligne. La navigation latérale de `- 1` montre une entrée « Statistiques » qui n'existe dans aucune spec (même écart que PO-WA-09 / note `web-audit-logs`). ⚠️ Le dossier `docs/designs/desktop/localizations/` apparaît en `??` dans `git status` : à committer en même temps que la ligne de registre.

**Ce que montrent les exports, factuellement :**

- Entrée de navigation latérale **« Lieux »**, placée après « Actus ».
- Titre **« Lieux d'entraînement »**, sous-titre « Informations constantes réutilisées lors de la planification des entraînements. », bouton primaire **« + Nouveau lieu »**.
- Tableau à **deux colonnes**, `NOM` et `ADRESSE`, plus une **icône crayon** par ligne. Deux lignes d'exemple.
- Dialogue **« Ajouter un lieu »** : champs **« NOM DU LIEU »** et **« ADRESSE »** (texte, placeholders d'exemple), boutons **Annuler** / **Ajouter**.

**Ce qu'ils ne montrent pas :** suppression, bouton d'archivage (ajouté par décision, PO-WL-03), état « archivé », dialogue de modification, rattachement à une section ou une équipe, pagination, filtre, recherche, compteur d'usage, carte ou coordonnées GPS.

## 1. Périmètre

### Ce que c'est

Trois volets, liés par une même table :

1. **Backoffice (desktop)** — une nouvelle destination « Lieux » dans la navigation `/admin/*`, où l'Administrateur **liste**, **ajoute**, **modifie** et **archive** les lieux d'entraînement (nom + adresse).
2. **Création d'un entraînement (mobile)** — le sélecteur « Lieu d'entraînement » de `CreateConvocationForm` propose les lieux **non archivés** de cette table, et la convocation créée **référence** le lieu par `training_location_id`.
3. **Affichage d'un entraînement** — partout où le lieu d'une convocation d'entraînement est affiché, son **nom** (et son **adresse**, §2.6) sont **résolus par jointure** sur la table, donc toujours à jour.

### Rattachement CDC

| Élément | Module CDC | Priorité |
|---|---|---|
| Lieux proposés à la création d'un entraînement, et affichés sur la convocation | **Calendrier et convocations** — « Entraînements… » | **P0** |
| Gestion du référentiel par l'Administrateur | Ligne de matrice « **Gérer comptes, rôles, paramétrage** » ; rôle Administrateur « **Paramétrage** » | — |
| Surface backoffice | Surface de rendu, pas un module (`specs/web-empty-state.md` §1) | — |

### Ce que cette feature remplace — décision antérieure révisée

`specs/create-convocation.md` §2 (ex-PO-CV-03) avait tranché : **pas de table**, une liste figée `TRAINING_LOCATIONS` dans le code, et `Convocation.location` en texte libre. Le déclencheur de révision prévu était : « si cette liste se met à changer avec une fréquence réelle ». La même position est consignée dans `docs/DEFAULTS-A-CHALLENGER.md`.

**La demande de la développeuse qui ouvre cette feature est ce déclencheur**, et sa décision sur PO-WL-01 va plus loin que le remplacement de la liste : le lieu d'un entraînement devient une **référence**, plus un texte. Par ailleurs, le fichier `training-locations.ts` porte encore un `TODO` indiquant que ses trois valeurs sont des **placeholders jamais remplacés** : la liste actuelle n'a aucune valeur réelle à préserver.

Conséquences hors `specs/` à porter par la développeuse : l'entrée « Liste des lieux d'entraînement (PO-CV-03) » de `DEFAULTS-A-CHALLENGER.md` peut être close (PO-WL-12). Amendement proposé pour `specs/create-convocation.md` : voir §7.

### Au périmètre

- Table `public.training_locations` (§2.1) et ses politiques RLS (§2.4).
- Colonne `convocations.training_location_id` (clé étrangère) et l'adaptation de `convocations` qu'elle impose (§2.2).
- Nouvelle version de `create_training_convocation`, qui prend un identifiant de lieu et refuse un lieu archivé (§2.3).
- Lecture des convocations avec le lieu résolu par jointure, et adaptation des écrans qui affichent un lieu d'entraînement (§2.6).
- Écran backoffice : liste à deux colonnes, dialogue d'ajout, dialogue de modification (crayon, pré-rempli), bouton « Archiver ». Le dialogue de modification n'est pas illustré : il reprend le dialogue d'ajout (patron `SeasonFormDialog`/`NewsFormDialog`).
- Nouvelle entrée dans `BACKOFFICE_NAV_ITEMS`, libellé « Lieux ».
- Nouvelle action RBAC `'training_location:write': ['admin']` (§3).
- Suppression de `training-locations.ts`.

### Hors périmètre, explicitement

- **Suppression physique** d'un lieu : jamais, par décision (PO-WL-03). Aucune politique `delete`, aucun contrôle de suppression.
- **Désarchivage** : non demandé (PO-WL-14).
- **Lieux des matchs et des réunions** : restent du texte libre dans `convocations.location` (`create-convocation.md` §2), inchangés. Le « RDV — lieu » de match aussi.
- **Changer le lieu d'une convocation d'entraînement existante** : aucun chemin d'édition n'existe pour les entraînements (`'convocation:update'` ne couvre que le match), et cette feature n'en ouvre pas. `training_location_id` n'entre pas dans le `grant update (date, location)` existant.
- **Reprise des convocations d'entraînement existantes** : elles gardent leur `location` texte, sans rattachement automatique (§2.2, PO-WL-13).
- **Rattachement d'un lieu à une section ou une équipe** (PO-WL-05), carte, géolocalisation, coordonnées.
- **L'entrée « Statistiques »** de la navigation de la maquette.
- Champ de recherche de la barre supérieure, badges, pastille de notification (reconduction d'AC-WE-13/AC-WE-15).

## 2. Modèle et règles

### 2.1 Table nouvelle `public.training_locations`

| Colonne | Type | Règle |
|---|---|---|
| `id` | `uuid` pk, `default gen_random_uuid()` | — |
| `name` | `text not null` | Obligatoire, rogné, non vide (`check (btrim(name) <> '')`) |
| `address` | `text not null` | Obligatoire, rogné, non vide. **Position provisoire**, voir PO-WL-04 |
| `is_archived` | `boolean not null default false` | **PO-WL-03 tranché.** `true` = plus proposé à la création d'un entraînement, toujours résolu pour l'affichage |

Pas de colonne de portée (section/équipe), pas de contrainte d'unicité sur `name` (PO-WL-06), pas de `archived_at`/`archived_by` (voir PO-WL-11). Si l'ordre d'affichage par date de création est retenu (PO-WL-07), un `created_at timestamptz not null default now()` devient nécessaire : c'est la seule colonne additionnelle envisagée.

### 2.2 Lien convocation → lieu : clé étrangère (PO-WL-01 tranché)

**Décision :** une convocation d'entraînement référence son lieu par **`convocations.training_location_id uuid references public.training_locations (id)`**.

- **Aucune action en cascade.** Pas de `on delete cascade` ni de `set null` : aucune suppression n'existe (PO-WL-03), et la valeur par défaut (`no action`) garantit qu'une suppression faite directement en base échouerait au lieu d'effacer silencieusement le lieu d'un entraînement.
- Nom et adresse **ne sont pas copiés** sur la convocation : ils sont lus par jointure (§2.6).
- Une modification du lieu dans le backoffice est donc **visible immédiatement**, y compris sur les convocations passées. C'est l'effet voulu par la décision.

**Coexistence avec la colonne texte `location`, conservée.** `location` reste la colonne du lieu des **matchs** et des **réunions**, ainsi que des **entraînements créés avant cette feature** (lignes héritées, en texte libre). Elle **n'est ni supprimée ni renommée**. Le schéma doit donc exprimer deux formes valides, au lieu du `location text not null` actuel :

| Type | Forme valide après cette feature |
|---|---|
| `match`, `meeting` | `location` non nul, `training_location_id` nul (inchangé en pratique) |
| `training` créé après cette feature | `training_location_id` non nul, `location` nul |
| `training` hérité | `location` non nul, `training_location_id` nul — conservé tel quel |

Mise en œuvre attendue :
- `location` passe en `null`able.
- Une contrainte `check` impose : `training_location_id` nul pour un type autre que `training` ; `location` non nul pour un type autre que `training` ; pour `training`, au moins l'un des deux non nul.

La forme exacte de la contrainte relève de l'implémentation. Elle doit accepter toutes les lignes existantes **sans réécriture**.

**Conséquence domaine, à ne pas manquer.** `Convocation.location` n'est plus toujours une chaîne : il devient `string | null`, et `Convocation` gagne une référence au lieu (identifiant, et nom + adresse résolus pour l'affichage). Le choix exact de forme est laissé à l'implémentation : objet `trainingLocation` imbriqué, ou union discriminée. `ConvocationArrangements = Pick<Convocation, 'date' | 'location'>` (édition de match, `edit-match-details.md`) hérite de ce changement de type. Un match a toujours un `location` non nul, garanti par la contrainte ci-dessus, et le chemin d'édition du match ne doit pas devenir capable d'écrire `null`.

**Convocations d'entraînement existantes.** Elles ne sont **pas rattachées automatiquement** : leur `location` texte reste affiché tel quel (§2.6). Un rattachement par correspondance exacte de nom est envisageable, mais c'est PO-WL-13, non bloquant. Les valeurs actuelles viennent de placeholders, ce qui en réduit l'intérêt.

### 2.3 Écriture : `create_training_convocation` et son contrôle

- **Signature.** La fonction prend un identifiant de lieu (`p_training_location_id uuid`) **à la place** de `p_location text`, et insère `training_location_id` avec `location` nul. Postgres distingue les surcharges par types d'arguments : l'ancienne signature `(…, p_location text)` doit être **supprimée explicitement** dans la nouvelle migration, sinon les deux coexistent et l'ancienne reste appelable avec du texte libre.
- **Sécurité inchangée.** La fonction reste **non `SECURITY DEFINER`** (`create-convocation.md` §2, « Écriture »). Le contrôle de rôle reste celui de `convocations_insert_create`, **inchangé** dans ses branches (coach de l'équipe, responsable de section, dirigeant habilité, administrateur).
- **Refus d'un lieu archivé — autorité en base.** Créer une convocation qui référence un lieu **archivé** doit être refusé, et ce refus doit valoir **même hors de la fonction**, puisque `convocations_insert_create` permet un `insert` direct sur `convocations`. Le contrôle vit donc dans un trigger `BEFORE INSERT` sur `convocations`, sur le patron du trigger « date passée » déjà en place (`create-convocation.md` §5), ou dans la clause `with check` de la politique d'insertion. Pas uniquement dans la fonction. Un lieu inexistant est déjà refusé par la clé étrangère.
- **Le refus ne vaut qu'à l'insertion.** Archiver un lieu n'invalide aucune convocation existante : elle reste valide, et son lieu reste résolu.
- **Miroir domaine (UX seulement).** `CreateConvocationUseCase` reçoit, pour le type `training`, un `trainingLocationId` à la place de `location`. Il refuse un identifiant manquant par `DomainError` avant tout appel réseau. Le refus « lieu archivé » remonte de la base, puis est traduit en message lisible (§2.5). `ConvocationRepository.createTraining` change de signature en conséquence. Les entrées `match` et `meeting` sont inchangées.
- **Aucune modification ultérieure du lien.** `training_location_id` n'est ajouté à aucun `grant update` : il ne se modifie pas après création (§1, hors périmètre).

### 2.4 RLS de `training_locations`

| Opération | Politique | Qui |
|---|---|---|
| `select` | lecture de **toutes** les lignes, archivées comprises | **tout compte authentifié** |
| `insert` | `with check (private.is_admin())` | Administrateur |
| `update` (modification et archivage) | `using` et `with check (private.is_admin())` | Administrateur |
| `delete` | **aucune** | — |

**Lecture : tout compte authentifié, archivées comprises — et ce n'est plus une option (ex-PO-WL-08).** Avec la clé étrangère, afficher le lieu d'un entraînement demande de lire sa ligne `training_locations`. Or les **joueurs** lisent les convocations de leur équipe. Restreindre la lecture aux rôles créateurs de convocation casserait l'affichage côté joueur. Masquer les lignes archivées casserait l'affichage des convocations qui les référencent. Le filtrage « non archivés » du formulaire est donc un **filtre de requête**, pas une restriction RLS. La donnée n'est ni nominative ni sensible (lieux publics). La lecture est **RLS seule**, sans entrée de matrice (critère de `rbac-matrix.ts`).

**L'archivage passe par la politique `update`**, sans politique dédiée. Les politiques `insert` et `update` portent chacune en commentaire SQL le nom de l'action **`'training_location:write'`** qu'elles miroitent, et l'entrée de matrice renvoie à ces deux politiques (miroir manuel, `CLAUDE.md` §7).

### 2.5 Domaine

- Entité `TrainingLocation { id, name, address, isArchived }` (`domain/entities/`).
- `TrainingLocationRepository` (`domain/repositories/training-location-repository.ts`) :
  - `findAll()` : liste d'administration, archivées comprises ;
  - lecture des seuls lieux **non archivés**, pour le formulaire ;
  - `create(input)`, `update(id, input)` et `archive(id)`.
  - **Aucune méthode de suppression.**
- Use cases (`domain/usecases/<dossier de feature>/`) : lecture de la liste d'administration, lecture des lieux proposables, création, modification, archivage.
  - Création, modification et archivage refusent l'écriture si `can(user, 'training_location:write')` est faux.
  - Création et modification **rognent** nom et adresse, et refusent par `DomainError`, **avant tout appel réseau**, une valeur vide après rognage.
  - L'archivage d'un lieu déjà archivé est **idempotent** : succès, sans erreur.
- `TrainingLocationRow` + mapper (`CLAUDE.md` §4), `TrainingLocationRepositoryImpl`.
- Une erreur de domaine dédiée (ou un mapping d'erreur existant) traduit le refus « lieu archivé » de §2.3 en message français. Aucun texte Postgres brut n'atteint un composant.
- **Clés de requête** centralisées dans `presentation/shared/query-keys.ts`, sous **une même racine de ressource** pour la liste d'administration et la liste proposable : une seule invalidation de racine rafraîchit les deux (même raisonnement que `teamOpponents(teamId)` dans `team-opponents`).

### 2.6 Lecture et affichage d'un entraînement

**Résolution par jointure, côté `data/`.** Les lectures de `convocations` (`ConvocationRepositoryImpl`, `from('convocations')`) doivent ramener, pour un entraînement référencé, le **nom** et l'**adresse** du lieu.

- Le mécanisme relève de l'implémentation : vue `security_invoker = true`, ou sélection jointe. Une vue a la préférence de `ARCHITECTURE.md` §3 pour une lecture inter-tables, et ce dépôt en a déjà plusieurs.
- Il doit respecter la RLS de l'appelant : aucune vue `security_invoker = false` n'est introduite pour cela.
- DTO et mapper portent les champs résolus (`CLAUDE.md` §4).
- Les RPC de lecture qui renvoient des convocations doivent être vérifiées une par une pour savoir si elles exposent `location`. Celles qui l'exposent suivent la même règle.

**Règle d'affichage unique, dans `domain/`.** Une fonction pure donne le libellé de lieu à afficher pour toute convocation : nom du lieu référencé s'il existe, sinon `location` texte (match, réunion, entraînement hérité). Les composants ne recomposent jamais cette règle eux-mêmes.

**Écrans concernés** (affichent aujourd'hui `location`, liste issue de la lecture du code) :
- `ScheduleInfo` ;
- `ConvocationHero` et `InfosTab` (détail de convocation) ;
- `CalendarConvocationRow` ;
- `CoachAlertRow` ;
- `NextConvocationCard` et `UpcomingConvocationList` (tableau de bord joueur) ;
- `UpcomingList` et `NextTrainingOrMatchCard` (tableau de bord coach).

Tous affichent le **nom résolu** à la place du texte. L'**adresse** est affichée **au minimum sur le détail de convocation**. Sa présence dans les lignes de liste et les cartes est une décision de designer-agent (§8). Pour un entraînement hérité, aucune adresse n'est disponible : l'écran n'affiche que le texte, sans emplacement vide.

**Lieu archivé :** affiché normalement sur les convocations qui le référencent. Aucun marqueur « archivé » côté mobile.

**Fraîcheur :** une modification de lieu ne réécrit aucune ligne `convocations`. Elle est visible à la prochaine lecture des convocations, selon le cache de chaque appareil. Aucune invalidation inter-appareils n'est construite.

### 2.7 Formulaire de création d'entraînement (mobile)

- Le ViewModel de `CreateConvocationForm` charge les **lieux non archivés** via le use case dédié. Le composant n'importe plus `TRAINING_LOCATIONS`, et `training-locations.ts` est supprimé. La valeur sélectionnée est l'**identifiant** du lieu, plus un texte.
- **Liste vide = état valide, pas une erreur.** Au déploiement, la table est vide : tant qu'aucun administrateur n'a saisi de lieu, **aucun entraînement ne peut être créé**. Le sélecteur rend un état vide explicite (même traitement que le sélecteur « Adversaire » sans option, `create-convocation.md` « UI design »), jamais une saisie libre de repli. Voir PO-WL-10.
- **Lieu archivé entre l'ouverture du formulaire et la soumission :** la création est refusée (§2.3). Le formulaire reste ouvert, saisies conservées, avec un message lisible invitant à choisir un autre lieu.
- Chargement et erreur de chargement des options : états distincts et lisibles, message en français.
- **Les valeurs placeholder de `training-locations.ts` ne sont pas reprises en données d'amorçage** : ce ne sont pas des lieux réels.
- Libellé d'option : le nom seul, comme aujourd'hui. L'affichage de l'adresse dans le sélecteur relève de PO-WL-09.

## 3. RBAC

### Ligne de matrice applicable

« **Gérer comptes, rôles, paramétrage** » : ✅ Administrateur seul, ❌ pour les sept autres rôles. Un référentiel de lieux club-wide est du paramétrage. Pour la création d'entraînement, c'est la ligne « **Créer/modifier une convocation** » qui s'applique, **inchangée**. Pour l'affichage, ce sont les règles existantes de lecture des convocations, **inchangées**.

| Rôle | Accès à la page backoffice | Ajouter / modifier / archiver un lieu | Choisir un lieu à la création d'un entraînement | Voir le lieu résolu d'un entraînement |
|---|---|---|---|---|
| Joueur/Joueuse | ❌ | ❌ | ❌ | ✅ (convocations de son équipe) |
| Coach/Staff | ❌ | ❌ | ✅ (son équipe) | ✅ |
| Responsable de section | ❌ (PO-WE-01) | ❌ | ✅ (sa section) — point d'entrée non construit (`create-convocation.md` §7) | selon la lecture existante des convocations |
| Dirigeant habilité | ❌ (PO-WE-01) | ❌ | ✅ — aucun point d'entrée | selon la lecture existante |
| Trésorier | ❌ | ❌ | ❌ | selon la lecture existante |
| Référent médical | ❌ | ❌ | ❌ | selon la lecture existante |
| Bénévole | ❌ | ❌ | ❌ | selon la lecture existante |
| **Administrateur** | ✅ | ✅ (club-wide) | ✅ | ✅ |

### Entrée de matrice — `'training_location:write': ['admin']` (PO-WL-02 tranché le 2026-10-01)

**Décision de la développeuse :** une **nouvelle action**, sur le patron de `'season:write'`.

```
'training_location:write': ['admin']
```

- **Pourquoi une action à part, et pas une action existante.** `presentation/` doit décider, avant toute requête, s'il rend « + Nouveau lieu », le crayon et « Archiver » (critère en tête de `rbac-matrix.ts`). Une action distincte évite qu'un élargissement futur de `'backoffice:access'` (PO-WE-01) donne silencieusement l'écriture des lieux à d'autres rôles. C'est le même raisonnement que pour `'season:write'` et `'news:write'`.
- **Une seule action couvre ajout, modification et archivage.** Aucun document ne distingue un rôle qui ferait l'un sans l'autre : pas d'action d'archivage séparée.
- **Club-wide par construction.** La `RoleAssignment` `admin` ne porte aucun champ de portée, donc **`can.ts` n'est pas modifié**.
- **Miroir manuel** (`CLAUDE.md` §7) : l'entrée porte en commentaire la référence à cette spec et aux deux politiques `training_locations` `insert`/`update` qu'elle miroite. Ces politiques nomment l'action en commentaire SQL (§2.4).
- **Rien d'autre ne change dans la matrice.** Ni `'backoffice:access'`, ni `'convocation:create'` : la clé étrangère change la forme de l'entrée, pas qui peut créer.

### Comptes multi-rôles

Un compte administrateur + coach qui ajoute, modifie ou archive un lieu voit le changement dans son sélecteur et ses convocations à la prochaine lecture (même racine de clé, §2.5). Aucun autre effet.

## 4. Données sensibles

| Nature | Cette feature | Conséquence |
|---|---|---|
| Données de santé | Aucune | — |
| Données financières | Aucune | — |
| Données nominatives | **Aucune** — un lieu est un nom et une adresse de site sportif, pas de personne | Pas de matière RGPD, pas d'export nominatif. Lecture ouverte à tout compte authentifié sans enjeu (§2.4) |
| Action du CDC §11.3 | **Aucune** | Pas d'exigence d'audit issue du CDC |

**Effet de bord à énoncer (conséquence de PO-WL-01).** Modifier le nom ou l'adresse d'un lieu **réécrit l'affichage de toutes les convocations qui le référencent**, passées comprises, sans qu'aucune ligne `convocations` ne change. C'est voulu. Mais une modification hâtive (par exemple « renommer » un lieu pour en faire un autre, au lieu d'en créer un nouveau) déplacerait rétroactivement l'historique de tous les entraînements concernés. Aucun garde-fou n'est inventé ici. Cela pèse dans PO-WL-11.

**Journal d'audit (PO-WL-11).** Le CDC §11.3 ne nomme pas ces actions. Mais la développeuse a délibérément élargi le journal aux créations/modifications de données structurelles d'administration (addendum « neuf émetteurs » de `web-audit-logs.md` : saisons, sections, équipes, adhésions, utilisateurs), tandis que `team-opponents` est resté sans trace (PO-TO-05). Cette spec **n'ajoute aucun code d'audit** (`CLAUDE.md` §7). Si une trace est décidée, elle part du use case, jamais d'un composant, et le `check` de `audit_log.action` doit être élargi en miroir de `audit-actions.ts`.

**Rétention.** Aucune purge : `RETENTION_PURGE.md` ne vise pas cette donnée, et un lieu référencé par une convocation ne peut de toute façon pas disparaître (§2.2).

**Noms dans la maquette.** La barre supérieure affiche un nom de personne. Les lignes d'exemple et les placeholders sont des noms de lieux réels, dont l'un porte un nom de personne. Rien de tout cela n'est repris dans le code, les placeholders, les tests ou les fixtures (`CLAUDE.md` §9, AC-WL-20).

## 5. Critères d'acceptation

Numérotation **`AC-WL-xx`**.

**Base de données et RLS**

- **AC-WL-01** — Une nouvelle migration crée `public.training_locations` (§2.1), dont `is_archived boolean not null default false`. La RLS est activée, avec exactement trois politiques : `select` pour tout compte authentifié, **lignes archivées comprises** ; `insert` et `update` appuyées sur `private.is_admin()`, chacune commentée avec le nom de l'action `'training_location:write'`. **Aucune politique `delete`.** Aucune migration existante n'est modifiée.
- **AC-WL-02** — Avec un jeton **non administrateur** (au moins `coach` et `section-manager`), tout `insert` et tout `update` sur `training_locations` échoue, archivage compris. Le `select` réussit pour un `player` et un `coach`, y compris sur une ligne archivée.
- **AC-WL-03** — Un `insert` ou `update` dont `name` (ou `address`, sous réserve de PO-WL-04) est vide ou réduit à des espaces est refusé par la base.
- **AC-WL-04** — `convocations` gagne `training_location_id uuid references training_locations (id)`, **sans action en cascade**. `location` devient `null`able. Une contrainte impose les trois formes valides de §2.2. **Toutes les lignes existantes sont acceptées sans réécriture**, et aucune n'est modifiée par la migration. Un `delete` direct en base sur un lieu référencé échoue.
- **AC-WL-05** — `create_training_convocation` prend un identifiant de lieu et insère `training_location_id` avec `location` nul. **L'ancienne signature à `p_location text` n'existe plus.** La fonction reste non `SECURITY DEFINER`. `convocations_insert_create` est inchangée dans ses branches de rôle. `create_match_convocation` et `create_meeting_convocation` sont inchangées.
- **AC-WL-06** — Créer un entraînement référençant un lieu **archivé** échoue, **par la fonction comme par un `insert` direct** sur `convocations`. Archiver un lieu ne modifie ni n'invalide aucune convocation existante. `training_location_id` ne fait partie d'aucun `grant update`.

**Domaine**

- **AC-WL-07** — `TrainingLocation`, `TrainingLocationRepository` (liste d'administration, liste non archivée, `create`, `update`, `archive` — pas de suppression), `TrainingLocationRow`, son mapper et `TrainingLocationRepositoryImpl` existent aux emplacements de `CLAUDE.md` §4/§5. Aucun import de `data/` depuis `presentation/`.
- **AC-WL-08** — Les use cases de création, modification et archivage refusent l'écriture si `can(user, 'training_location:write')` est faux. Création et modification rognent nom et adresse, et refusent par `DomainError`, **sans appel réseau**, une valeur vide après rognage. L'archivage d'un lieu déjà archivé réussit sans erreur. Couverts par Vitest, refus sans le droit compris.
- **AC-WL-09** — `'training_location:write'` est ajoutée à `domain/policies/actions.ts` et vaut `['admin']` dans `rbac-matrix.ts`, avec un commentaire renvoyant à cette spec et aux deux politiques qu'elle miroite. **Aucune autre action ni aucun autre rôle n'est ajouté.** `'backoffice:access'`, `'convocation:create'` et `can.ts` sont inchangés. Le test de `can()` couvre `admin` → vrai, et au moins `coach` et `section-manager` → faux.
- **AC-WL-10** — `CreateConvocationUseCase` reçoit `trainingLocationId` (et non `location`) pour le type `training`, et le refuse s'il est absent, sans appel réseau. Les variantes `match`/`meeting` sont inchangées. Le refus « lieu archivé » remonte en message français, jamais en texte Postgres brut. Tests Vitest existants adaptés.
- **AC-WL-11** — `Convocation` porte le lieu référencé (identifiant, nom, adresse résolus) et un `location` `null`able. Une fonction pure de `domain/`, couverte par Vitest, donne le libellé de lieu à afficher : nom référencé s'il existe, sinon `location`. Les trois formes de §2.2 sont testées. Le chemin d'édition de match (`ConvocationArrangements`) ne peut pas écrire un `location` nul.

**Écran backoffice**

- **AC-WL-12** — Une entrée « Lieux » est ajoutée à `BACKOFFICE_NAV_ITEMS`, protégée par les mêmes gardes que les autres (`RequireDesktopViewport` → `RequireBackofficeSession` → `RequireBackofficeAccess`), sans badge numérique. L'entrée « Statistiques » de la maquette n'est **pas** ajoutée.
- **AC-WL-13** — La page affiche le titre « Lieux d'entraînement », le sous-titre de la maquette, et un tableau à deux colonnes `NOM` / `ADRESSE` avec, par ligne, un crayon et une action « Archiver ». Un lieu archivé reste listé, **signalé comme archivé par un texte** (pas par la couleur seule), sans action « Archiver ». États chargement, erreur (en français, jamais un message Supabase brut) et liste vide (état vide explicite, cas normal au démarrage) distincts.
- **AC-WL-14** — « + Nouveau lieu » ouvre le dialogue « Ajouter un lieu » (champs « NOM DU LIEU », « ADRESSE », boutons « Annuler » / « Ajouter »). Le crayon ouvre un dialogue de modification **pré-rempli**, qui enregistre sur la **même** ligne. « Archiver » positionne `is_archived = true`. Ces trois contrôles ne sont rendus que si `can(user, 'training_location:write')` est vrai — booléen calculé par le ViewModel, **séparément** du fait d'avoir atteint la route.
- **AC-WL-15** — Après un ajout, une modification ou un archivage réussi, la liste reflète le changement sans rechargement manuel, par invalidation de la racine de clé de §2.5. Un échec laisse le dialogue ouvert, saisies conservées, avec un message lisible en français. « Annuler » ferme sans écriture. **Aucun contrôle de suppression**, nulle part, même désactivé. **Aucun contrôle de désarchivage** (PO-WL-14).

**Mobile — création et affichage**

- **AC-WL-16** — Le sélecteur « Lieu d'entraînement » propose exactement les lieux **non archivés**, et soumet un identifiant. `training-locations.ts` et toute référence à `TRAINING_LOCATIONS` ont disparu du code. Un lieu ajouté depuis le backoffice apparaît au chargement suivant, sans déploiement. Un lieu archivé n'apparaît plus.
- **AC-WL-17** — Table vide (ou tous les lieux archivés) : le sélecteur rend un état vide explicite, aucune saisie libre de repli n'est proposée, la soumission reste impossible, et aucune erreur n'est levée. Chargement et erreur de chargement ont chacun un état intelligible. Un refus « lieu archivé » à la soumission laisse le formulaire ouvert, saisies conservées. Les types Match et Réunion sont inchangés (lieu en texte libre).
- **AC-WL-18** — Sur tous les écrans de §2.6, un entraînement référencé affiche le **nom courant** du lieu. Après modification du lieu dans le backoffice, la lecture suivante affiche le nouveau nom, **sans qu'aucune ligne `convocations` n'ait été écrite**. L'adresse courante est affichée au moins sur le détail de convocation. Un lieu archivé reste affiché normalement. Un entraînement hérité affiche son texte `location`, sans adresse et sans emplacement vide. Matchs et réunions sont inchangés.
- **AC-WL-19** — La lecture du lieu résolu respecte la RLS de l'appelant : un joueur voit le lieu des convocations de son équipe, et aucune vue `security_invoker = false` n'est introduite.

**Transverse**

- **AC-WL-20** — Contrôles interactifs à `h-11` minimum au site d'appel, dialogues utilisables au clavier, contrastes AA vérifiés. **Aucun nom de personne ni nom de lieu réel de la maquette** n'est codé en dur, y compris en placeholder ou en fixture (`CLAUDE.md` §9).
- **AC-WL-21** — Aucun code d'audit n'est ajouté par cette passe, sauf décision explicite sur PO-WL-11.

## 6. Points ouverts

**Aucun point ouvert ne bloque la conception ni l'implémentation.** Seul PO-WL-10 doit être tranché avant la mise en production.

| Réf. | Question | Pour qui | Bloquant ? |
|---|---|---|---|
| **PO-WL-01** | ~~Lien convocation ↔ lieu~~ **Tranché (2026-10-01) : clé étrangère `training_location_id`**, nom et adresse résolus par jointure. Voir §2.2, §2.3, §2.6 | — | Résolu |
| **PO-WL-02** | ~~Action RBAC d'écriture~~ **Tranché (2026-10-01) : nouvelle action `'training_location:write': ['admin']`**, patron `'season:write'`, couvrant ajout, modification et archivage. Voir §3, AC-WL-09 | — | Résolu |
| **PO-WL-03** | ~~Suppression / archivage~~ **Tranché (2026-10-01) : pas de suppression ; `is_archived` + bouton « Archiver »**. Voir §2.1, §2.3, AC-WL-13/14 | — | Résolu |
| **PO-WL-04** | **Adresse obligatoire ?** La maquette ne marque aucun champ comme facultatif. Par défaut : obligatoire. Un lieu sans adresse connue (terrain prêté, lieu temporaire) serait alors impossible à saisir | Développeuse | Non |
| **PO-WL-05** | **Portée des lieux.** Liste globale, toutes sections confondues (aucune colonne de section sur la maquette) : un coach de basket verra les lieux du football. Faut-il un rattachement par section ? (Point déjà soulevé dans `DEFAULTS-A-CHALLENGER.md`) | Bureau | Non |
| **PO-WL-06** | **Doublons.** Aucune contrainte d'unicité sur `name`. Deux lieux homonymes seraient indiscernables dans le sélecteur mobile (nom seul). Faut-il une contrainte, et sur quelle forme normalisée ? À trancher tôt : une contrainte ajoutée plus tard échouerait sur les doublons existants | Développeuse | Non |
| **PO-WL-07** | **Ordre d'affichage** (backoffice et sélecteur). La maquette (« Stade… » au-dessus de « Gymnase… ») n'est pas alphabétique, ce qui suggère l'ordre de création. Par défaut : ordre alphabétique du nom, sans colonne nouvelle. L'ordre de création exigerait `created_at` (§2.1). Sous-question : les archivés en fin de liste d'administration ? | Développeuse | Non |
| **PO-WL-08** | ~~Portée de la lecture RLS~~ **Sans objet depuis PO-WL-01** : la lecture doit être ouverte à tout compte authentifié, archivées comprises, sinon un joueur ne peut plus résoudre le lieu de ses convocations (§2.4) | — | Résolu par conséquence |
| **PO-WL-09** | **Libellé d'option du sélecteur mobile** : nom seul (défaut, comportement actuel) ou nom + adresse ? Lié à PO-WL-06 | Développeuse / designer-agent | Non |
| **PO-WL-10** | **Transition de mise en production.** Au déploiement, la table est vide, et plus aucun entraînement ne peut être créé tant qu'un administrateur n'a pas saisi les lieux réels (§2.7). Faut-il déployer le backoffice et saisir les lieux **avant** de basculer le formulaire mobile, ou amorcer la table par une migration avec la liste réelle fournie par le Bureau ? (Les placeholders actuels ne sont pas réels) | Développeuse / Bureau | Non pour construire. **Oui avant mise en production** |
| **PO-WL-11** | **Audit.** Tracer création, modification et archivage de lieu, par cohérence avec l'élargissement saisons/sections/équipes, ou rester sans trace comme `team-opponents` (PO-TO-05) ? Hors CDC §11.3. L'argument se renforce avec PO-WL-01 : une modification réécrit l'affichage de l'historique (§4) | Développeuse | Non |
| **PO-WL-12** | **Écritures hors `specs/`** : recopier la ligne de registre du §0 dans `DESIGN_LINKS.md` (et committer les PNG non suivis) ; clore ou réécrire l'entrée « Liste des lieux d'entraînement (PO-CV-03) » de `DEFAULTS-A-CHALLENGER.md` | Développeuse | Non |
| **PO-WL-13** | **Rattachement des entraînements hérités.** Les entraînements créés avant cette feature gardent leur `location` texte (§2.2). Faut-il une reprise qui renseigne `training_location_id` par correspondance exacte de nom, une fois les lieux réels saisis ? Faible intérêt si les valeurs existantes ne sont que des placeholders de test ; à décider selon les données réellement présentes en production | Développeuse | Non |
| **PO-WL-14** | **Désarchivage.** Non demandé : un lieu archivé par erreur ne peut être remis en service qu'en base, ou en recréant un lieu (doublon, PO-WL-06). Faut-il une action « Réactiver » ? Faut-il aussi une confirmation avant « Archiver » ? | Développeuse | Non |

## 7. Amendement proposé pour `specs/create-convocation.md`

Non appliqué par cette passe (la spec existante n'est pas réécrite), à valider par la développeuse. Ajouter en tête de §2 « Lieu d'entraînement » :

> **Amendement du 2026-10-01 — révisé par `specs/web-localizations.md`.** Le déclencheur de révision prévu ci-dessous est atteint, et la résolution d'origine est remplacée.
> - La liste figée `TRAINING_LOCATIONS` est remplacée par la table `public.training_locations`, gérée par l'Administrateur depuis le backoffice (ajout, modification, archivage).
> - Une convocation d'entraînement référence désormais son lieu par la clé étrangère `convocations.training_location_id`, nom et adresse étant résolus par jointure.
> - `Convocation.location` reste un texte pour les matchs, les réunions et les entraînements antérieurs, et devient `null`able.
> - `create_training_convocation` prend un identifiant de lieu, et un lieu archivé est refusé à l'insertion.
> - La ligne « Volatilité de la liste des lieux d'entraînement » du §7 est close.
> - Dans le tableau du §2, la ligne « Lieu d'entraînement » se lit `Convocation.trainingLocation` (via `training_location_id`).
> - Les mentions de `TRAINING_LOCATIONS` en §8 et « UI design » se lisent « options = lieux non archivés de `training_locations` ».

## 8. Note pour designer-agent

- **Références** : les deux exports du §0.
  - Dialogue de modification **non illustré** : le dériver du dialogue d'ajout (titre de modification, champs pré-remplis, bouton d'enregistrement), sur le patron `SeasonFormDialog`/`NewsFormDialog` déjà construit.
  - Bouton **« Archiver »** non illustré : placement à proposer (par ligne, à côté du crayon). L'état « archivé » d'une ligne est porté par un texte, pas par la couleur seule (AC-WL-13).
- **Navigation** : la maquette place « Lieux » après « Actus », mais l'ordre réel de `BACKOFFICE_NAV_ITEMS` diffère déjà de la maquette sur d'autres entrées. Proposer une position, sans réordonner les entrées existantes.
- **Mobile — formulaire** : pas de nouvelle maquette, le sélecteur existe déjà (`training.png`). Seuls ses états vide / chargement / erreur et le refus « lieu archivé » à la soumission sont à concevoir (§2.7, AC-WL-17).
- **Mobile — affichage (nouveau travail de conception)** : l'adresse d'un entraînement doit apparaître **au moins sur le détail de convocation** (§2.6, AC-WL-18). Sa présence dans les lignes de liste et les cartes (Calendrier, tableaux de bord, alertes coach) est à décider. Un entraînement hérité n'a pas d'adresse : pas d'emplacement vide. Matchs et réunions ne changent pas.
- **Ne pas trancher en dessinant** : désarchivage et confirmation d'archivage (PO-WL-14), adresse dans le sélecteur (PO-WL-09), rattachement par section (PO-WL-05). Aucun contrôle de suppression, même désactivé (AC-WL-15).
- **Placeholders** : texte d'exemple générique, ni les noms de lieux de la maquette, ni aucun nom de personne (AC-WL-20).

## UI design

### Sources utilisées

1. `docs/designs/DESIGN_LINKS.md` : aucune ligne pour `web-localizations` à ce jour (recherche faite). Cas `instantané seul` du §0 : **aucun lien n'est demandé**. La ligne pré-rédigée du §0 reste à recopier par la développeuse (PO-WL-12). Je n'écris pas dans `docs/`.
2. `docs/designs/desktop/localizations/[Admin] Web - Localization - 2.png` (liste) et `- 1.png` (liste + dialogue « Ajouter un lieu »), lus directement. Ils confirment le §0 : titre, sous-titre, bouton « + Nouveau lieu », tableau `NOM` / `ADRESSE`, crayon par ligne, dialogue à deux champs empilés et deux boutons (Annuler / Ajouter).
3. Patrons déjà construits, repris tels quels : `specs/web-seasons.md` « UI design » (bloc titre + tableau + `SeasonFormDialog` à deux modes + états), `specs/web-actus.md` (`ArchiveNewsDialog.tsx`, confirmation par `alert-dialog`), `BackofficeEmptyState`, `BACKOFFICE_NAV_ITEMS`. `specs/web-memberships.md` et `specs/web-users.md` : même coquille, rien de plus à en tirer pour cet écran.
4. Mobile : `specs/create-convocation.md` « UI design » (« Adversaire et Lieu d'entraînement — pas de composant nouveau ») et sa maquette `training.png` citée au §8.

**Aucun composant visuel inédit** : tout est une variation d'un patron existant. Pas de prototype Claude Design à demander. Seul le rendu de l'adresse sur le détail de convocation mobile n'a pas de référence rendue (voir « Mobile — affichage »). C'est une ligne de texte secondaire, pas une nouvelle forme.

### Où ça vit

- **Backoffice desktop.** Nouvelle destination de la navigation latérale `/admin/*`. Les 4 entrées de la barre mobile ne changent pas (cette surface n'en fait pas partie).
  - Entrée : id `locations`, libellé **« Lieux »**, chemin `/admin/locations`, icône `IconMapPin` (proposition, remplaçable par toute icône du jeu déjà utilisé).
  - `emptyStateTitle` : « Aucun lieu d’entraînement à afficher pour l’instant ».
  - **Position : dans `BACKOFFICE_NAV_ITEMS`, juste après `news` (« Actus ») et avant `audit`**. C'est la place de la maquette (après « Actus »). Aucune autre entrée n'est réordonnée. Pas de badge. « Statistiques » n'est pas ajoutée (AC-WL-12).
  - Mêmes gardes que les autres entrées. Il n'y a aucun stub à remplacer : c'est une nouvelle page `features/backoffice/localizations/` (Page + ViewModel + composants locaux).
- **Mobile.** Pas de nouvel écran : le sélecteur « Lieu d'entraînement » de `CreateConvocationForm` (destination Calendrier, parcours de création existant) et l'affichage du lieu dans les écrans listés au §2.6.

### Ce qui change par rôle

Reprend le §3, rien de redéfini.

| Rôle | Backoffice « Lieux » | Sélecteur de lieu (mobile) | Affichage du lieu |
|---|---|---|---|
| **Administrateur** | Atteint la page. « + Nouveau lieu », crayon et « Archiver » rendus si `canWrite = can(user, 'training_location:write')`, calculé par le ViewModel **séparément** de l'accès à la route (comme `season:write`) | Oui | Oui |
| Coach/Staff (équipe) | Porte fermée (`RequireBackofficeAccess`) | Oui | Oui |
| Responsable de section, Dirigeant habilité | Porte fermée (PO-WE-01) | Sélecteur existant, aucun point d'entrée construit | Selon la lecture existante |
| Joueur/Joueuse | Porte fermée | Non | Oui (équipe) |
| Trésorier, Référent médical, Bénévole | Porte fermée | Non | Selon la lecture existante |

Si `canWrite` est faux, les trois contrôles **disparaissent** (jamais grisés) : le tableau reste lisible, sans colonne d'action. Aucun contrôle de suppression ni de désarchivage, même désactivé (AC-WL-15).

### Écran backoffice — liste (`/admin/locations`)

Dans l'`<Outlet/>` de `BackofficeDashboardLayout`, sous l'en-tête générique, comme `/admin/seasons`.

**Bloc de titre**
- `h2` « Lieux d'entraînement », sous-titre « Informations constantes réutilisées lors de la planification des entraînements. » (texte de la maquette).
- Bouton « + Nouveau lieu » (`IconPlus` + texte), aligné à droite, `h-11`, `rounded-full`. Rendu uniquement si `canWrite`. Ouvre le dialogue d'ajout.
- **Style : puce blanche d'action d'ajout** (convention récente des chips du backoffice, `border-white/15 bg-white/10 text-white/70`, `hover:bg-white/20`), avec la hauteur `h-11` au lieu de `h-7`. **Écart à signaler** : la maquette montre un bouton vert plein, et `BackofficeSeasonsPage`/`BackofficeNewsPage` utilisent encore `bg-coach-green` dans le code lu. Je suis la consigne de la développeuse (puce blanche) ; si les deux autres pages sont alignées plus tard, le changement est une seule classe.

**Tableau** (`table.tsx`, déjà vendu, pas de `<table>` fait main)
- Colonnes `NOM` et `ADRESSE` comme la maquette, plus une colonne d'action sans en-tête visible (`sr-only`). **Pas de colonne « Statut »** : la maquette a deux colonnes, l'état archivé se porte dans la cellule `NOM`.
- **Pas d'en-tête collant** (convention du projet pour les tableaux d'administration). Contrairement à la section « UI design » de `web-seasons.md`, ne pas poser `sticky top-16`.
- `NOM` : `font-semibold`. `ADRESSE` : texte secondaire (`text-muted-foreground`).
- **Ordre** : alphabétique du nom, lieux archivés **en fin de liste** (défaut retenu en attendant PO-WL-07, non bloquant).
- **Colonne d'action** (si `canWrite`), deux contrôles alignés à droite, chacun avec une cible tactile réelle :
  - **Crayon** (`IconPencil`) : `Button` `variant="ghost"` `size="icon"`, `h-11 w-11`, `aria-label="Modifier le lieu « {nom} »"`. Ouvre le dialogue de modification. **Rendu aussi sur une ligne archivée** (corriger une faute de frappe d'un lieu encore référencé reste utile, et le §1 ne l'interdit pas). À confirmer, voir questions.
  - **« Archiver »** : bouton à libellé texte (pas une icône seule : l'action n'a pas de retour arrière dans l'interface), `IconArchive` + « Archiver », `h-11`, `rounded-full`, même style de puce neutre. `aria-label="Archiver le lieu « {nom} »"`. **Rendu seulement sur une ligne non archivée** ; sur une ligne archivée la place reste vide, pas de variante grisée.
- **Ligne archivée** : un badge neutre « Archivé » (`badge.tsx`, mêmes classes que « Terminée » de `SeasonStatusBadge` : `border-white/15 bg-white/10 text-white/70`) accolé au nom, et le texte de la ligne légèrement atténué. **Le texte du badge porte l'information**, pas l'atténuation (AC-WL-13). Aucun badge sur les lignes actives.
- Aucune recherche, filtre, pagination, compteur d'usage (§0 « ce qu'ils ne montrent pas »).

### Nouveau composant — `TrainingLocationFormDialog`

Un seul composant, deux modes `create` | `edit`, sur le patron `SeasonFormDialog`/`NewsFormDialog` (pas de variante dupliquée). `dialog.tsx` déjà vendu.

| Paramètre | Création | Modification |
|---|---|---|
| Titre | « Ajouter un lieu » (maquette) | « Modifier le lieu » |
| Valeurs initiales | Champs vides | `name` et `address` de la ligne |
| Bouton de validation | « Ajouter » (maquette) | « Enregistrer » |
| Use case | Création | Modification, même ligne (jamais un doublon) |
| Déclencheur | « + Nouveau lieu » | Crayon |

**Champs**, **empilés pleine largeur** comme la maquette (`1.png`) : `Label` en capitales « NOM DU LIEU » / « ADRESSE » (style `text-xs font-semibold uppercase tracking-wider`), `Input` `h-11 rounded-xl`, `required`. Placeholders génériques (« Ex. Stade municipal », « Ex. 1 rue du Stade, Ville » ; jamais ceux de la maquette, AC-WL-20). **Aucune paire côte à côte**, donc pas de `min-w-0` à poser ici. Si un jour une paire apparaît, chaque item de grille doit le porter (CLAUDE.md §6).

**Pied** : `Annuler` (`variant="outline"`, `h-11`, `rounded-full`, ferme sans écriture) à gauche du bouton de validation (`h-11`, `rounded-full`, `bg-coach-green` comme la maquette). Validation en `type="submit"` d'un `<form>` englobant (soumission au clavier).

**États du dialogue**

| État | Rendu |
|---|---|
| Soumission en cours | Champs et boutons `disabled`, libellé « Ajout… » / « Enregistrement… » |
| Valeur vide après rognage (`required` natif laisse passer des espaces seuls ; refus `DomainError` du use case, AC-WL-08) | Dialogue ouvert, saisies conservées, `Alert` `variant="destructive"` en haut du formulaire. **Messages à écrire** dans `mapDomainErrorToUiError` (nom obligatoire, adresse obligatoire) : pièce manquante, pas une question de mise en page |
| Échec réseau / base | Même `Alert`, texte français traduit, jamais de message Supabase brut |
| Succès | Le dialogue se ferme, la liste est rafraîchie par invalidation de la racine de clé du §2.5 |

### Archivage — `ArchiveTrainingLocationDialog`

**Confirmation proposée, en attendant PO-WL-14.** Le spec laisse ouverte la question d'une confirmation. Je propose d'en mettre une, car l'archivage n'a aucun retour arrière dans l'interface et réécrit le sélecteur de tous les créateurs de convocations. Elle reprend `ArchiveNewsDialog.tsx` à l'identique de structure (`alert-dialog.tsx`, déjà vendu) :

- Titre « Archiver ce lieu ? ». Description : « « {nom} » ne sera plus proposé lors de la création d'un entraînement. Les entraînements qui l'utilisent déjà continuent de l'afficher. » Mentionner explicitement que **le lieu n'est pas supprimé**.
- Boutons `Annuler` (`h-11 rounded-full`) et `Archiver` (`h-11 rounded-full`). **Pas de rouge** : ce n'est pas une suppression et le rouge du dépôt est réservé aux états annulés/rejetés. Style de puce neutre renforcée (ex. `bg-white text-black`).
- En cours : les deux boutons `disabled`, libellé « Archivage… ». Le dialogue reste ouvert pendant la mutation (`event.preventDefault()` sur l'action, comme `ArchiveNewsDialog`) et ne se ferme qu'au succès.
- Échec : `Alert` destructive dans le dialogue, dialogue conservé.
- Succès : fermeture, la ligne passe en « Archivé » (déplacée en fin de liste) sans rechargement.
- **Si la développeuse préfère un archivage direct sans confirmation**, retirer ce composant : le bouton de ligne appelle alors le use case immédiatement. L'idempotence du use case (§2.5) rend un double-clic sans danger.

### États de l'écran liste

| État | Rendu |
|---|---|
| Chargement | Lignes de squelette (`skeleton.tsx`), jamais un flash de liste vide. Le bloc titre reste rendu |
| Erreur de chargement | `Alert` `variant="destructive"` au-dessus du tableau, message français |
| **Liste vide (cas normal au démarrage, PO-WL-10)** | `BackofficeEmptyState` avec « Aucun lieu d’entraînement à afficher pour l’instant ». Le bloc titre et « + Nouveau lieu » restent rendus au-dessus (seul moyen de saisir le premier lieu). Si `canWrite` est faux, pas de bouton |
| Tous archivés | Pas un état vide : le tableau liste les lignes archivées |

### Mobile — sélecteur « Lieu d'entraînement » (`CreateConvocationForm`, type Entraînement)

Aucune nouvelle forme : `Select` shadcn (déjà vendu) comme aujourd'hui, avec `SelectTrigger` à `h-11` minimum. Sa seule différence : ses options viennent du use case des lieux **non archivés**, et la valeur soumise est l'identifiant.

| État | Rendu |
|---|---|
| Options chargées | Libellé d'option = **nom seul** (comportement actuel, PO-WL-09 non tranché). **Proposition optionnelle** : une fois un lieu choisi, son adresse s'affiche sous le champ en `text-xs text-muted-foreground`, sans lever l'ambiguïté des homonymes dans la liste (PO-WL-06) mais sans changer le libellé d'option. À retirer sans impact si la développeuse ne la veut pas |
| Chargement | Champ désactivé, texte « Chargement des lieux… » |
| Erreur de chargement | Message inline en français sous le champ + bouton « Réessayer » (`h-11`). Soumission impossible |
| **Liste vide (ou tout archivé)** | Champ désactivé, texte « Aucun lieu d’entraînement disponible. Un administrateur doit en ajouter. » Aucune saisie libre de repli, aucune erreur, bouton de création désactivé comme pour tout formulaire incomplet (même traitement que le sélecteur « Adversaire » vide). Ce n'est pas un état d'erreur visuel |
| Refus « lieu archivé » à la soumission | Le formulaire **reste ouvert, saisies conservées** ; le lieu choisi est vidé, la liste est rechargée (invalidation de la racine de clé), et un message inline en français sous le champ : « Ce lieu n’est plus disponible. Choisissez un autre lieu. » Le texte est à ajouter au mapping d'erreur (AC-WL-10) |

Match et Réunion : champ lieu en texte libre inchangé. Le sélecteur de lieu n'apparaît que pour le type Entraînement.

### Mobile — affichage du lieu (lecture)

- **Détail de convocation** (`ConvocationHero`, `InfosTab`) : le **nom** résolu à la place du texte, et, **pour un entraînement référencé**, l'**adresse** sur une seconde ligne secondaire (`text-xs`/`text-sm text-muted-foreground`) directement sous le nom, dans la même ligne « Lieu ». C'est le minimum exigé (AC-WL-18).
- **Entraînement hérité** (texte `location`, pas d'adresse) : nom seul, **aucune seconde ligne vide, aucun tiret de remplacement**. Match et Réunion identiques.
- **Lignes de liste et cartes** (`CalendarConvocationRow`, `CoachAlertRow`, `NextConvocationCard`, `UpcomingConvocationList`, `UpcomingList`, `NextTrainingOrMatchCard`) : **nom seul**, pas d'adresse. Motif : ces surfaces sont compactes, tronquent déjà le lieu sur une ligne (lignes date/heure · lieu · RDV des addenda coach/joueur), et l'adresse est consultable en un tap sur le détail. C'est une proposition, la décision est à la développeuse (§8).
- Lieu archivé : affiché normalement, aucun marqueur côté mobile (§2.6).
- L'adresse longue passe à la ligne (`break-words`, pas de troncature sur le détail).

### Composants shadcn mobilisés

| Élément | Primitive | Déjà vendue ? |
|---|---|---|
| Tableau | `table.tsx` | Oui |
| Dialogue ajout/modification | `dialog.tsx` | Oui |
| Confirmation d'archivage | `alert-dialog.tsx` | Oui |
| Chargement | `skeleton.tsx` | Oui |
| Champs, boutons | `input.tsx`, `label.tsx`, `button.tsx` | Oui |
| Badge « Archivé » | `badge.tsx` | Oui |
| Erreurs | `alert.tsx` | Oui |
| Sélecteur mobile | `select.tsx` | Oui |

Aucune primitive à ajouter.

### Questions UI

Aucune ne bloque la construction.

- **Confirmation d'archivage** (PO-WL-14) : proposée ci-dessus, à valider ou retirer.
- **Crayon sur une ligne archivée** : proposé rendu. À confirmer.
- **Style du bouton « + Nouveau lieu »** : puce blanche selon la consigne, la maquette montre du vert plein.
- **Adresse sous le sélecteur mobile** (PO-WL-09) et **adresse dans les lignes de liste** : propositions optionnelles ci-dessus, non tranchées par la maquette.
- **Ordre des lignes** : alphabétique, archivés en fin (PO-WL-07).
- **Messages d'erreur à écrire** : nom vide, adresse vide, lieu archivé à la soumission.
- Aucun nom de lieu ni de personne de la maquette n'est repris (AC-WL-20).
