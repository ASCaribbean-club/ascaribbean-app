# Spec — Indisponibilités des joueurs (`player-unavailability`)

> Statut : rédaction initiale du 2026-10-01, branche `feature/mobile-team-page`. **Passe « domaine seul »** : entité, policies pures, entrées RBAC, interface de repository, tests. Rien dans `data/`, `presentation/` ni `supabase/` dans cette passe (`CLAUDE.md` §7).
> Emplacement : `docs/specs/` à la demande explicite de la développeuse (cohérent avec `ARCHITECTURE.md` §13.1 et `docs/designs/DESIGN_LINKS.md` §3), et non `specs/` comme les specs précédentes.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (module « Présences et suivi sportif » P0, matrice RBAC, décision n°5), `docs/roles-personas-as-caribbean.md`, `docs/ARCHITECTURE.md` §11, `docs/RETENTION_PURGE.md` §2/§4, `src/domain/policies/can.ts`, `src/domain/entities/user.ts`, `specs/player-stats.md` (format et précédents RBAC).
> Décisions ci-dessous : **décisions de la développeuse**, transmises au cadrage du 2026-10-01 — consignées, pas proposées.

## 0. Maquettes — statut de registre

Cinq instantanés existent dans `docs/designs/team-availability/` : `[v1] Mob - Équipe (Disponibilités)-{1,2,3,4,5}.png` (non encore commités au moment de la rédaction — `git status` les rend en `??`).

`docs/designs/DESIGN_LINKS.md` §2 n'a **aucune ligne** pour cette feature. Les instantanés existant déjà, le §4 du registre place ce cas en **`instantané seul`** : aucun lien artifact à demander à la développeuse, ni maintenant ni plus tard. Ligne pré-rédigée, à recopier par l'agent designer :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| player-unavailability — **page Équipe mobile, disponibilités** (`[v1] Mob - Équipe (Disponibilités)-{1..5}`) | — aucun lien fourni | 2026-10-01 | `docs/designs/team-availability/[v1] Mob - Équipe (Disponibilités)-{1,2,3,4,5}.png` | **instantané seul** |

Les maquettes ne sont ni décrites ni évaluées ici. La section « UI design » sera ajoutée par designer-agent dans une passe ultérieure.

## 1. Périmètre

**Besoin** : joueurs et coach consultent la liste courante de l'équipe avec la disponibilité de chacun — disponible, suspendu, malade/blessé (ce dernier présenté aux coéquipiers comme « indisponible »), avec date de début et date de fin pour tout statut autre que « disponible ».

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Présences et suivi sportif — « **indisponibilités santé** » | **P0** | Indisponibilité médicale, sous-module santé sensible (CDC §6.3) |
| Présences et suivi sportif — suivi sportif | **P0** | Suspension (rattachement par extension : le CDC ne nomme pas explicitement la suspension — constat, pas résolution) |

### Modèle retenu

- **Entité séparée et bornée dans le temps, `Unavailability`** — ni un événement de match, ni un champ de `User`. **Aucun `status` n'est ajouté à `User`.**
- **« Disponible » n'est jamais stocké** : c'est l'absence d'indisponibilité active, calculée à la lecture.
- `src/domain/entities/unavailability.ts` — union discriminée sur `kind` :

| Champ | Type | Porté par |
|---|---|---|
| `id` | `string` | base |
| `userId` | `string` | base |
| `startsOn` | date ISO (`YYYY-MM-DD`) | base |
| `declaredBy` | `string` (userId du coach) | base |
| `declaredAt` | horodatage de déclaration | base |
| `kind` | `'medical'` | `MedicalUnavailability` |
| `expectedReturnOn` | `string \| null` — `null` = durée indéterminée | `MedicalUnavailability` |
| `kind` | `'suspension'` | `SuspensionUnavailability` |
| `matchCount` | `number` — **informatif uniquement**, aucun décompte automatique | `SuspensionUnavailability` |
| `reason` | `string \| null` | `SuspensionUnavailability` |
| `liftedOn` | `string \| null` — levée **manuelle**, `null` = toujours active | `SuspensionUnavailability` |

- **`MedicalUnavailability` n'a volontairement aucun champ texte libre** (RGPD art. 9) : une note contiendrait des diagnostics — même vecteur que `ConvocationResponse.reason` / `attendance_records.note`.
- **Aucun `teamId` sur l'entité** : la portée d'une suspension n'est pas tranchée (PO-PU-03). Le rattachement à l'équipe se résout via l'effectif.

### Policies — `src/domain/policies/availability.ts`

- `isUnavailabilityActive(u, now)` — `now` est une date ISO fournie par l'appelant (la policy ne lit jamais l'horloge) :
  - `medical` : `startsOn <= now` **et** (`expectedReturnOn === null` **ou** `now < expectedReturnOn`) ;
  - `suspension` : même forme avec `liftedOn` ;
  - `switch` exhaustif sur `kind`, branche `default` typée `never`.
  - Borne de fin **exclusive** : le jour de `expectedReturnOn` / `liftedOn`, la personne est disponible.
- `getAvailabilityStatus(list, now)` → `'available' | 'medical' | 'suspended'`. Si une indisponibilité médicale **et** une suspension sont actives simultanément, **`medical` l'emporte — règle provisoire**, inscrite dans `docs/DEFAULTS-A-CHALLENGER.md` (traité séparément).
- `toTeammateStatus(status)` → `'available' | 'unavailable' | 'suspended'`. `medical` → `'unavailable'`. Le **motif médical et `expectedReturnOn` n'atteignent jamais un coéquipier** — la projection ne renvoie qu'un statut.

### Repository — interface seule

`src/domain/repositories/unavailability-repository.ts`, `UnavailabilityRepository` :

- `create(input: Omit<Unavailability, 'id'>)`
- `update(u: Unavailability)`
- `findByUser(userId)`
- `findByTeam(teamId)` — résolu **via l'effectif** dans le futur `Impl` (aucun `teamId` sur l'entité).

### Hors périmètre — explicitement

- Tout `data/` (`Impl`, DTO, mapper), tout `presentation/` (page, ViewModel), toute migration SQL, RLS, trigger d'audit, job de purge.
- Tout use case (déclarer, lever, lister) — non demandé dans cette passe.
- Tout lien avec `ConvocationResponse` / `AttendanceRecord`, et tout pré-remplissage automatique d'un « absent » à partir d'une indisponibilité.
- Le décompte automatique des matchs de suspension (PO-PU-04).
- Toute action RBAC au-delà des deux listées en §2.

## 2. RBAC

### Lecture de la matrice CDC

| Rôle | Ligne(s) de matrice pertinente(s) | Traduction sur cette feature |
|---|---|---|
| **Joueur / Joueuse** | « Voir les dossiers des autres membres » ❌ ; « Consulter une donnée de santé » ✅ (soi-même) | `availability:read-team`, **sa propre équipe**, **projection coéquipier uniquement** (`toTeammateStatus`) |
| **Coach / Staff** | « Voir les dossiers des autres membres » ❌ (son équipe, hors financier) ; « Consulter une donnée de santé » ❌ (**aptitude seulement, si accordée**) | `availability:declare` et `availability:read-team`, **ses équipes**, statut complet (`medical` / `suspended` / `available`) — voir PO-PU-05 |
| Responsable de section | ✅ (sa section) sur les dossiers | **Aucun accès dans cette passe** — PO-PU-02 |
| Dirigeant habilité | ✅ sur les dossiers | **Aucun accès** — PO-PU-02 |
| Trésorier | ❌ (financier seulement) | Aucun accès |
| Référent médical | ✅ donnée de santé, « nominatif très restreint et tracé » | **Aucun accès dans cette passe** — PO-PU-02 |
| Bénévole | ❌ | Aucun accès |
| Administrateur | ✅ dossiers ; ❌ santé (sauf audit) | **Aucun accès dans cette passe** — PO-PU-02 |

### Deux actions nouvelles — et exactement deux

| Action | Rôles | Portée |
|---|---|---|
| `availability:declare` | **Coach/Staff** | Son équipe (`context.teamId ∈ assignment.teamIds`) |
| `availability:read-team` | **Joueur/Joueuse**, **Coach/Staff** | Sa propre équipe (joueur : `assignment.teamId === context.teamId` ; coach : `context.teamId ∈ assignment.teamIds`) |

Aucune autre action, aucun autre rôle (`CLAUDE.md` §7).

### Piège `can.ts` — ici le réflexe habituel est le **bon** geste

Contrairement aux actions bornées à une personne de `specs/player-stats.md` (AC-PS-20), ces deux actions sont **bornées à une équipe** :

- `availability:read-team` **doit** être ajoutée au `requiresTeamScope` de la branche `player` ;
- `availability:declare` **et** `availability:read-team` **doivent** être ajoutées au `requiresTeamScope` de la branche `coach`.

Sans cela, un joueur ou un coach de l'équipe A passerait `can()` pour l'équipe B (écart déjà corrigé cinq fois dans ce fichier). Ajout dans le **même changement** que l'entrée `rbac-matrix.ts`.

Le front ne décide que de l'affichage ; la sécurité réelle viendra de la RLS (suivi sécurité, §3).

## 3. Données sensibles

### Données de santé — oui

Une `MedicalUnavailability` est une **donnée de santé** (catégorie spéciale RGPD art. 9), même sans aucun texte libre : le seul fait `kind = 'medical'` plus une date de retour prévue en est une (CDC §6.3, `RETENTION_PURGE.md` §2 — « indisponibilités santé »). Mesures de minimisation tenues **dans cette passe** :

- aucun champ texte libre sur la variante médicale ;
- la projection coéquipier (`toTeammateStatus`) réduit `medical` à `'unavailable'`, sans date de retour ;
- aucun `status` dérivé stocké sur `User`.

### Suivi sécurité — à consigner, **à ne pas construire dans cette passe**

La projection front est **de l'UX seulement** (`CLAUDE.md` §6). Un joueur interrogeant directement la table via l'API Supabase verrait encore `kind = 'medical'` et `expectedReturnOn`. La future migration **doit** :

1. exposer les données des coéquipiers par une **vue Postgres ou une RPC** renvoyant **uniquement** le statut projeté — jamais la table brute ;
2. restreindre la lecture directe de la table brute à **l'intéressé lui-même et à son coach** ;
3. ajouter un **trigger d'audit** sur la lecture des indisponibilités médicales (`ARCHITECTURE.md` §11 — accès à une donnée de santé → trigger Postgres) ;
4. inclure la table dans la **purge des données de santé** (`docs/RETENTION_PURGE.md` §2, et §4 pour l'archivage — non tranché, référent RGPD).

### Données financières — aucune

### Journal d'audit

- **Lecture** d'une indisponibilité médicale : action sensible CDC §11.3 (« consultation donnée santé ») → trigger Postgres, passe migration (point 3 ci-dessus). Aucune journalisation depuis un composant ni depuis cette passe domaine.
- **Écriture** (déclaration, levée, modification) par un coach : ne figure pas explicitement dans la liste CDC §11.3. Non tranché — PO-PU-06.

## 4. Critères d'acceptation

`AC-01`/`AC-02` sont ceux du CDC §17.2. Préfixe propre : **`AC-PU-`**, à renuméroter dans la série officielle en recette. Tous testables en Node, sans mock (`CLAUDE.md` §8).

| Réf. | Critère |
|---|---|
| **AC-01** | Un joueur ne voit, pour ses coéquipiers, que le statut projeté (`toTeammateStatus`) — jamais `kind = 'medical'` ni `expectedReturnOn` *(tenu côté domaine dans cette passe ; côté API, conditionné au suivi sécurité §3)* |
| **AC-02** | `can(user, 'availability:read-team' \| 'availability:declare', { teamId })` est faux pour une équipe à laquelle l'utilisateur n'est pas affecté (joueur et coach), et pour tout rôle autre que ceux listés en §2 |
| AC-PU-01 | `Unavailability` est une union discriminée sur `kind` (`'medical'` \| `'suspension'`) ; `MedicalUnavailability` **ne porte aucun champ texte libre** ; aucune variante ne porte de `teamId` ; `User` ne gagne aucun champ `status` |
| AC-PU-02 | `isUnavailabilityActive` — pour chaque `kind` : faux **avant** `startsOn` ; vrai **le jour de** `startsOn` et pendant ; faux **le jour de** la date de fin (`expectedReturnOn` / `liftedOn`, borne exclusive) et après ; vrai indéfiniment après `startsOn` si la date de fin est `null` |
| AC-PU-03 | `isUnavailabilityActive` utilise un `switch` exhaustif sur `kind` avec branche `never` : ajouter un `kind` à l'union sans le traiter est une erreur de compilation |
| AC-PU-04 | `getAvailabilityStatus([], now)` renvoie `'available'` ; une liste ne contenant que des indisponibilités inactives renvoie `'available'` |
| AC-PU-05 | `getAvailabilityStatus` renvoie `'medical'` si seule une médicale est active, `'suspended'` si seule une suspension est active, et **`'medical'` si les deux sont actives** (règle provisoire, `DEFAULTS-A-CHALLENGER.md`) |
| AC-PU-06 | `toTeammateStatus` : `'available'` → `'available'`, `'suspended'` → `'suspended'`, `'medical'` → `'unavailable'` — chaque branche testée ; la valeur de retour ne contient aucune date |
| AC-PU-07 | Les policies ne lisent jamais l'horloge : `now` est toujours un paramètre |
| AC-PU-08 | `rbac-matrix.ts` : `availability:declare` → `['coach']` ; `availability:read-team` → `['player', 'coach']`. Aucune autre entrée ajoutée |
| AC-PU-09 | `can.ts` : `availability:read-team` figure dans le `requiresTeamScope` de la branche `player` ; les deux actions figurent dans celui de la branche `coach` ; `can.test.ts` couvre, pour chaque action, la même équipe (vrai), une autre équipe (faux), un coach multi-équipes, et un rôle non autorisé (faux) |
| AC-PU-10 | `UnavailabilityRepository` expose exactement `create(Omit<Unavailability, 'id'>)`, `update(Unavailability)`, `findByUser(userId)`, `findByTeam(teamId)` — interface seule, aucune implémentation |
| AC-PU-11 | `src/domain/` n'importe ni React, ni Supabase, ni TanStack Query ; aucun fichier n'est créé dans `data/`, `presentation/` ni `supabase/` par cette passe |

## 5. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-PU-01** | **Détail médical montré aux coéquipiers.** Masqué par défaut via `toTeammateStatus` (`medical` → « indisponible »). Afficher « Malade / Blessé » aux coéquipiers exige l'accord du référent RGPD (CDC §22, décision n°5 — référent **toujours non désigné**, `docs/GOUVERNANCE.md`) | Référent RGPD | Non pour le domaine (le masquage par défaut est construit) |
| **PO-PU-02** | **Accès des autres rôles** (Responsable de section, Dirigeant habilité, Référent médical, Administrateur). La matrice leur donne des droits pertinents (dossiers de section/club, donnée de santé pour le référent médical) ; non décidé. Seuls Coach/Staff et Joueur/Joueuse sont dans le périmètre | Développeuse + Bureau | Non |
| **PO-PU-03** | **Portée d'une suspension** (équipe / compétition / tout le club). Non tranché, d'où l'absence de `teamId` sur l'entité ; `findByTeam` passe par l'effectif dans le futur `Impl` | Bureau | Non pour le domaine. À trancher avant l'`Impl` si la portée n'est pas « la personne » |
| **PO-PU-04** | **Décompte automatique des matchs de suspension.** Différé : `matchCount` est informatif, la levée est manuelle via `liftedOn` | Développeuse | Non |
| **PO-PU-05** | **Le coach voit-il `medical` et `expectedReturnOn` ?** Décision développeuse : oui (statut complet). La matrice CDC dit pourtant, ligne « Consulter une donnée de santé » : Coach/Staff ❌ « **aptitude seulement, si accordée** », et la priorisation insiste pour séparer l'aptitude de la donnée de santé complète. Distinguer `medical` de `suspended` et exposer une date de retour va au-delà d'un simple apte/inapte. **Tranché par la développeuse (2026-10-01)** : la matrice CDC n'est qu'une indication ; le coach voit le statut complet. À rementionner au référent RGPD lors de sa nomination — décision n°5 | Développeuse | Non pour le domaine. Plus bloquant pour la passe migration/RLS |
| **PO-PU-06** | **Journalisation des écritures** (déclaration/levée d'une indisponibilité médicale par un coach). Non listée explicitement en CDC §11.3 ; la création d'une donnée de santé par un tiers pourrait relever de la traçabilité CDC §6.3 | Référent RGPD + développeuse | Non pour le domaine (aucun use case dans cette passe) |
| **PO-PU-07** | **Le joueur voit-il sa propre indisponibilité médicale complète** (avec `expectedReturnOn`) ? La matrice l'autorise (« donnée de santé ✅ soi-même ») mais la décision ne donne au joueur que la projection coéquipier pour `read-team` | Développeuse | Non |
| **PO-PU-08** | **Règles de validité** : `expectedReturnOn`/`liftedOn` antérieur ou égal à `startsOn`, `matchCount` négatif ou nul, chevauchement de deux indisponibilités du même `kind`. Aucune règle définie ; aucune validation dans cette passe (pas de use case) | Développeuse | Non pour le domaine. À trancher avec le premier use case d'écriture |
| **PO-PU-09** | **Fuseau horaire du « aujourd'hui »** passé en `now` (appareil du client vs date évaluée par Postgres, cf. le précédent `current_season()` de `docs/season-scoping-correction.md`) | Développeuse | Non pour le domaine (`now` est un paramètre) |

## UI design

> Pour la **future passe présentation** — rien n'est construit dans la passe domaine actuelle. Références : `docs/designs/team-availability/[v1] Mob - Équipe (Disponibilités)-{1..5}.png` (registre `DESIGN_LINKS.md` §2 : `instantané seul`, ligne ajoutée le 2026-10-01). PO-PU-01 et PO-PU-05 ne sont pas supposés tranchés : le design ci-dessous suit le **comportement par défaut sûr** (masqué pour le joueur), avec la divergence des maquettes signalée.

### 0. Lecture des maquettes

| Export | Contenu |
|---|---|
| 1 | Liste, bascule « Coach » active : bandeau de 3 compteurs, chips de filtre, une carte par joueur avec pastille de statut, sous-titre de dates, chevron `>` |
| 5 | Même liste, bascule « Joueur » active : mêmes cartes, **sans chevron**. Montre pourtant « Malade / Blessé » et les dates |
| 2 | Feuille basse « Statut de {joueur} » : 3 options radio (Disponible / Malade-Blessé / Suspendu) |
| 3 / 4 | Feuille basse après choix Malade / Blessé, puis Suspendu : « Date de début », « Date de fin (optionnel) », boutons Retour / Confirmer (désactivé tant que rien n'est saisi) |

Deux éléments ne sont **pas à construire** : la bascule « Coach / Joueur » du titre (artefact de démonstration du prototype ; la vue se déduit de `can()` et des rôles) et le décompte « 18 licenciés », incohérent avec les 10 lignes listées (donnée factice).

### 1. Emplacement dans la navigation

- Destination : **Menu** (onglet « Menu » actif sur les exports). Écran poussé depuis la grille du Menu, avec flèche de retour : **pas de nouvelle entrée de barre du bas**.
- Point d'entrée : **une carte « Disponibilités » dans la grille du Menu** (réf. `docs/designs/menu/[v0] Mob - Menu.png`), visible seulement si `can(user, 'availability:read-team', { teamId })` est vrai (joueur, coach). Sinon la carte **disparaît** (jamais grisée). Les autres rôles (PO-PU-02) n'ont pas la carte.
- **Divergence** : la barre du bas des maquettes affiche « Dashboard / Calendrier / **Recherche** / Menu ». La contrainte du projet est Dashboard / Calendrier / **Actus** / Menu. À traiter comme une erreur de prototype ; la barre construite reste celle du projet (Q-UI-03).

### 2. Écran liste d'équipe (`TeamAvailabilityPage`)

De haut en bas :

1. **En-tête collant** `sticky top-0`, fond opaque (CLAUDE.md §6) : flèche de retour (cible `h-11 w-11`), titre « Disponibilités », sous-titre « {équipe} · {n} licenciés ».
2. **Bandeau de 3 compteurs** (grille 3 colonnes, `min-w-0` sur chaque tuile) : vert, orange, rouge. Informatif, **non interactif** (les chips filtrent).
3. **Chips de filtre** (patron chips existant, ex. Calendrier) : Tous / Disponibles / Malades / Suspendus. Rangée à défilement horizontal, chaque chip `h-11`. Filtre local au ViewModel, sélection unique, « Tous » par défaut.
4. **Liste de cartes compactes**, une par joueur de l'effectif (tri alphabétique par défaut, non tranché par les maquettes). Carte : avatar à initiales, nom, sous-titre, pastille de statut à droite. Hauteur ≥ 44 px (maquettes ~59 px). Nom `truncate` + `min-w-0`, pastille `shrink-0`.
5. Barre du bas inchangée.

Réutilise le patron carte compacte de `docs/designs/v4_coach_dashboard.png` et les chips du Calendrier (`docs/designs/calendar/`). **Nouveaux composants** (justifiés : aucun équivalent) : `AvailabilityBadge` (pastille de statut) et `AvailabilityStatusSheet` (feuille de déclaration, §4), cette dernière via le primitif shadcn `Drawer`/`Sheet` plutôt qu'un composant maison. Couleurs tirées de la maquette (vert / orange / rouge), **toujours doublées du libellé texte**.

### 3. Par rôle (permissions : voir §2 RBAC, non redéfinies ici)

| Élément | Coach/Staff (`read-team` + `declare`) | Joueur/Joueuse (`read-team`) |
|---|---|---|
| Pastilles | Disponible / **Malade / Blessé** / Suspendu | Disponible / **Indisponible** / Suspendu |
| Tuile et chip du milieu | « N Malades » / chip « Malades » | « N Indisponibles » / chip « Indisponibles » (jamais « Malades ») |
| Sous-titre disponible | « Aucune indisponibilité » | idem, ou omis (Q-UI-02) |
| Sous-titre médical | « Depuis le {début} » ou « Du {début} au {retour prévu} » | **Aucune date**, rien de médical (AC-PU-06 : la projection ne porte aucune date) |
| Sous-titre suspension | « Du {début} au {fin} » ; « Depuis le {début} » si `liftedOn` nul | **Aucune date** par défaut (Q-UI-01) |
| Interaction de carte | Carte entière cliquable, chevron, ouvre la feuille | **Non interactive** : pas de chevron, pas d'état pressé |

« Malade / Blessé » n'apparaît **dans aucun texte, aria-label ou attribut** de la vue joueur. Le ViewModel joueur ne reçoit que `'available' | 'unavailable' | 'suspended'` : la vue ne peut pas afficher plus que ce qu'elle reçoit. Le joueur voit sa propre ligne comme celle des autres (PO-PU-07 non tranché).

Borne de fin **exclusive** (le jour de `expectedReturnOn` / `liftedOn`, la personne est disponible) : « Du 15 sept. au 6 oct. » des maquettes est ambigu, à formuler « jusqu'au 5 oct. » ou « retour le 6 oct. » (Q-UI-04).

### 4. Flux de déclaration (coach uniquement, `availability:declare`)

1. Le coach touche une carte : **feuille basse « Statut de {nom} »** (export 2), trois choix radio `h-11` minimum, statut courant présélectionné et coché.
2. Choix **Malade / Blessé** ou **Suspendu** : étape formulaire (exports 3 / 4) : rappel du statut (pastille + libellé coloré), **Date de début**, **Date de fin (optionnel)**. Les deux champs sont **empilés pleine largeur** dans les maquettes : pas de paire côte à côte, donc pas de risque de chevauchement. Champs natifs `type="date"`, `h-11`.
   - Pied de feuille : **Retour** et **Confirmer** côte à côte, **à spécifier comme rétrécissant à leur colonne** : conteneur `flex`, chaque bouton `flex-1 min-w-0 h-11`. Rangée ancrée `sticky bottom-0`, fond opaque.
   - **Confirmer désactivé** (gris, export 3) tant que Date de début est vide. Date de fin vide = durée indéterminée (`null`).
   - **Aucun champ texte libre** sur Malade / Blessé (RGPD art. 9, §1) : ni motif ni note.
3. Choix **Disponible** sur un joueur indisponible : **non illustré** (Q-UI-05). Sur un joueur déjà disponible : ferme la feuille sans écriture.
4. Confirmer : feuille fermée, liste mise à jour (invalidation de requête), toast. Pendant l'envoi : Confirmer en chargement et désactivé, Retour inactif. Erreur : message dans la feuille, saisie conservée, feuille ouverte.
5. Fin ≤ début : règle non définie (PO-PU-08) ; message en ligne provisoire « La date de fin doit être postérieure à la date de début », à confirmer.

**Absent des maquettes** : une `SuspensionUnavailability` porte `matchCount` et `reason` ; la feuille Suspendu n'a ni l'un ni l'autre (Q-UI-06). Ne pas les inventer.

### 5. États

| État | Comportement |
|---|---|
| Chargement | Squelettes de cartes (avatar rond + 2 lignes + pastille) ; en-tête et chips affichés, compteurs en squelette |
| Effectif vide | `EmptyState` existant : « Aucun joueur dans cette équipe », sans chips actifs |
| Filtre sans résultat | Message en ligne « Aucun joueur dans cette catégorie », chip actif conservé |
| Tout le monde disponible | Liste normale ; tuiles orange et rouge à « 0 » (atténuées, non masquées) ; chips toujours affichés |
| Erreur de chargement | Message avec bouton « Réessayer » `h-11` ; en-tête conservé |
| Hors équipe | Garde ViewModel via `can()` ; la RLS reste la vraie protection (§3) |

### 6. Questions UI ouvertes

| Réf. | Question | Bloquant ? |
|---|---|---|
| **Q-UI-00 (lié PO-PU-01)** | **L'export 5 (vue « Joueur ») montre « Malade / Blessé » et des dates à un coéquipier**, exactement ce que PO-PU-01 et AC-01 interdisent par défaut. Cette section suit la règle du domaine (« Indisponible », sans date). Corriger la maquette, ou obtenir l'accord du référent RGPD (toujours non désigné) | **Oui pour la vue joueur de la présentation** : ne pas construire « Malade / Blessé » côté joueur tant que PO-PU-01 n'est pas tranché. Non bloquant pour le domaine |
| **Q-UI-00b (lié PO-PU-05)** | La vue coach complète (« Malade / Blessé », dates de retour) suppose la décision « statut complet », contraire à la matrice CDC (« aptitude seulement »). Conçue ainsi. **Tranché par la développeuse (2026-10-01)** : la matrice CDC n'est qu'une indication | Développeuse |
| Q-UI-01 | Le joueur voit-il les **dates d'une suspension** (export 5 : oui) ? La projection n'en porte aucune ; une suspension n'est pas une donnée de santé, mais l'exposer demande une projection distincte | Non, défaut : aucune date |
| Q-UI-02 | « Aucune indisponibilité » dans la vue joueur : garder ou omettre ? | Non |
| Q-UI-03 | Barre du bas « Recherche » vs « Actus » : confirmer l'erreur de prototype | Non |
| Q-UI-04 | Formulation de la date de fin (borne exclusive) | Non |
| Q-UI-05 | Comment lever une indisponibilité (choix « Disponible » absent des maquettes) : date de fin = aujourd'hui, ou action dédiée ? | Non, avant la passe use cases |
| Q-UI-06 | Saisie de `matchCount` / `reason` pour une suspension : champ à ajouter (numérique `h-11` ; si côte à côte avec un autre champ, `min-w-0` obligatoire) ou valeur par défaut ? Sans maquette : prototype Claude Design à produire si le champ est retenu | Non pour le domaine ; bloque la forme finale de la feuille Suspendu |
| Q-UI-07 | Coach (ou joueur) de **plusieurs équipes** : aucun sélecteur dans les maquettes. Prototype à produire si sélecteur | Non |
| Q-UI-08 | Suspension et indisponibilité médicale simultanées : le domaine renvoie `medical` ; la feuille ne montre qu'un statut, le coach ne voit pas la suspension sous-jacente | Non |
| Q-UI-09 | Autres rôles (PO-PU-02) : aucune vue conçue | Non |
