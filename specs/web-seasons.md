# Spec — Backoffice web : gestion des saisons (`web-seasons`)

> Statut : **première tranche d'écriture sur `public.seasons`**. La table, la contrainte de non-chevauchement, la fonction `current_season()`, l'erreur de domaine et son message d'interface **existent déjà** (`docs/season-scoping-correction.md`, migration `20260819153918_season_scoping_correction.sql`) — cette passe ne les crée pas, elle leur donne enfin un chemin d'écriture depuis l'application.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (module P0 « Équipes et sections », matrice RBAC, exigences transversales §11.3), `docs/roles-personas-as-caribbean.md` (rôle Administrateur : « Paramétrage, comptes, rôles, **saisons**, sécurité et audit »), `docs/season-scoping-correction.md` (AC-CD-01, contrainte de non-chevauchement, `current_season()`, §5.1 rollover hors périmètre), `specs/web-empty-state.md` (coquille backoffice, `backoffice:access`, AC-WE-18, PO-WE-01/03/09/10), `specs/web-actus.md` (patron de console d'écriture backoffice, AC-WA-xx), `docs/DEFAULTS-A-CHALLENGER.md`, `CLAUDE.md` §3/§5/§6/§7/§9.
> État du code lu : `supabase/migrations/{20260811171754_initial_schema,20260819153918_season_scoping_correction}.sql`, `domain/entities/season.ts`, `domain/policies/{season-scope,actions,rbac-matrix}.ts`, `domain/repositories/season-repository.ts`, `domain/errors/overlapping-season-error.ts`, `data/repositories/SeasonRepositoryImpl.ts`, `data/errors/map-supabase-error.ts`, `presentation/shared/errors/map-domain-error-to-ui-error.ts`, `presentation/features/backoffice/{backoffice-nav.ts,seasons/BackofficeSeasonsPage.tsx,desktop-gate/BackofficeDesktopOnlyPage.tsx}`.
> Maquette : `docs/designs/desktop/seasons/[Admin] Web - Seasons - 1.png`, **lue directement**. Voir §0 — export tronqué.

> **Amendement du 2026-09-17 (2).** Une **colonne nouvelle** est ajoutée à `public.seasons` : **`cotisation_amount_cents`** (`cotisationAmountCents` côté domaine) — le **montant de cotisation de référence de la saison**, entier de centimes, **nullable** (§2.7). Elle entre dans `CreateSeasonUseCase`/`UpdateSeasonUseCase`, dans les signatures `SeasonRepository.create`/`update`, et dans le dialogue de création/modification sous la forme d'un **quatrième champ**.
> **Motif, à énoncer parce qu'il vient d'une autre spec** : `specs/web-memberships.md` avait d'abord logé le montant dû sur la ligne d'adhésion (`memberships.amount_due_cents`) ; cette décision a été **abandonnée avant implémentation**. Le montant de cotisation vit désormais **sur la saison**, et `web-memberships` le **lit** via `membership.seasonId` pour sa colonne `COTISATION`, son filtre payé/partiel/non payé et sa règle d'activation — voir `specs/web-memberships.md`, « Amendement du 2026-09-17 (2) ».
> **Ce que l'amendement touche dans cette spec** : §1 (correspondance des champs), §2.1 (qui n'est donc plus « aucune colonne nouvelle »), §2.6 (domaine), **§2.7 nouvelle**, §4 (la feature touche désormais une **donnée financière**, non nominative), **AC-WS-08 et AC-WS-31 amendés**, **AC-WS-33 à AC-WS-36 ajoutés**, **PO-WS-10 à PO-WS-12 ajoutés**, PO-WS-03 complété, §7 et « UI design » complétés.
> **Ce qu'il ne touche pas** : la contrainte de non-chevauchement, le statut dérivé à trois valeurs, la règle « saison terminée non modifiable », le RBAC (`'season:write': ['admin']`) et le hors-périmètre du §1 — tous **inchangés**.

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne n'existe au §2 du registre pour la feature `web-seasons`.** Un export PNG est présent dans le dépôt (`docs/designs/desktop/seasons/`), importé directement par la développeuse sans lien artifact — même cas de figure que `menu`, `actus`, `player-vote`, `web-empty-state` et `web-actus`, pour lequel le registre a une valeur de statut dédiée : **`instantané seul`**. Conformément au §4 du registre, ce statut signifie « utiliser l'instantané local versionné et **ne pas demander de lien artifact** ». **Aucun lien n'est donc demandé ici, ni maintenant ni lors d'une passe ultérieure.**

Le §4 demande à l'agent d'ajouter lui-même la ligne manquante. L'agent PO **ne peut écrire que dans `specs/`** — même limite que pour `actus` (PO-AT-07), `player-vote`, `web-empty-state` et `web-actus` (PO-WA-11). Ligne **pré-rédigée, à recopier telle quelle** dans le tableau du §2 du registre par le premier agent ou la développeuse ayant les droits d'écriture sur `docs/` (PO-WS-08) :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| web-seasons — **backoffice desktop : gestion des saisons** (`[Admin] Web - Seasons - 1`) | — aucun lien fourni | 2026-09-17 | `docs/designs/desktop/seasons/[Admin] Web - Seasons - 1.png` | **instantané seul** |

> Deux notes à joindre à la ligne. (a) **L'export est tronqué** : une bande blanche coupe la page après la première ligne du tableau ; la deuxième ligne n'est lisible qu'à moitié et les éventuelles suivantes sont absentes. (b) **Aucune boîte de dialogue n'est illustrée** — contrairement à `web-actus` (`Actus-2`/`Actus-3`), l'export ne montre que la liste et le bouton « + Nouvelle saison ». Le formulaire de création/modification n'a donc **aucune référence visuelle** ; voir PO-WS-01. *(Amendement du 2026-09-17 (2) : cette absence de référence vaut a fortiori pour le quatrième champ « Cotisation (€) » ajouté au dialogue par §2.7 — il n'apparaît sur aucune maquette de cette feature.)*

## 1. Périmètre

### Ce que c'est

Le **chemin d'écriture sur `public.seasons`**, rendu dans le backoffice web desktop (`/admin/seasons`, `presentation/features/backoffice/seasons/`) : une **liste de toutes les saisons** et un **formulaire de création**, plus une **modification limitée aux saisons non terminées**. C'est exactement la demande formulée par la développeuse (« Admin should be able to create a season […] should not be able to create overlapping seasons by dates […] Past season cannot be edited too »).

Cette tranche remplace le stub `BackofficeSeasonsPage.tsx`, dont le commentaire cite PO-WE-10 comme motif de non-construction — et **répond à PO-WE-10 pour l'entrée « Saisons »** : oui, cette entrée de navigation est bien une console d'administration du référentiel des saisons.

**Point de départ inhabituel, à ne pas refaire par mégarde** : contrairement à `web-actus`, l'essentiel de l'infrastructure existe déjà et a été construit *sans chemin d'écriture*, en prévision de celui-ci. Sont **déjà en place et à réutiliser tels quels, sans les redéfinir** :

| Élément | Où | État |
|---|---|---|
| Table `public.seasons` (`id`, `label`, `start_date`, `end_date`) | `20260811171754_initial_schema.sql` | existe |
| Colonne générée `season_range daterange` (`'[]'`, bornes inclusives) | `20260819153918_…` | existe, `GENERATED ALWAYS … STORED` |
| Contrainte `seasons_no_overlap` (`EXCLUDE USING gist`) | `20260819153918_…` | existe — **c'est elle qui interdit le chevauchement** |
| Fonction `current_season()` | `20260819153918_…` | existe |
| Politique `seasons_select_authenticated` | `20260811171754_…` | existe — tout compte authentifié lit **toutes** les lignes |
| `OverlappingSeasonError` + mapping Postgres `23P01` | `domain/errors/`, `data/errors/map-supabase-error.ts` | existe |
| Message d'interface « Les dates de cette saison chevauchent une saison existante. » (variante `inline`) | `presentation/shared/errors/map-domain-error-to-ui-error.ts` | existe, **testé** |
| `isCurrentSeason(season, now)` | `domain/policies/season-scope.ts` | existe |
| Entrée de navigation « Saisons » (`/admin/seasons`, `IconCalendarStats`) | `backoffice-nav.ts` | existe |

Autrement dit : la règle métier centrale de cette feature (« pas de chevauchement ») est **déjà appliquée et déjà traduite en message utilisateur**. Cette passe branche l'interface dessus, elle ne la réimplémente pas.

### Rattachement CDC

| Élément | Module CDC | Priorité |
|---|---|---|
| Gestion des saisons | **Équipes et sections** — « Effectifs, staffs, **saisons** » | **P0** |
| **Montant de cotisation de référence de la saison** *(amendement du 2026-09-17 (2), §2.7)* | **Cotisations** — « **Tarification**, échéancier, relance, export — sans encaissement en ligne (7.2) » | **P1** |
| Rôle porteur | Administrateur — « Paramétrage, comptes, rôles, **saisons**, sécurité et audit » (`roles-personas`, §3 du CDC) | — |
| Surface backoffice | Non — le backoffice est une **surface de rendu**, pas un module (`specs/web-empty-state.md` §1) | — |

Différence notable avec `web-actus`, qui n'avait **aucun** rattachement CDC littéral (PO-AT-02 toujours ouvert) : ici le rattachement est explicite et double — le mot « saisons » figure tel quel dans la ligne de module P0 *et* dans la définition du rôle Administrateur. **Aucune extrapolation n'est nécessaire pour justifier cette feature ni son titulaire.**

*(Amendement : le montant de cotisation, lui, se rattache au seul mot « **Tarification** » de la ligne P1 « Cotisations ». C'est un rattachement réel mais **muet sur la granularité** — le CDC ne dit nulle part si un tarif est unique pour le club, par section, ou par catégorie d'âge. Voir PO-WS-10 : cette spec retient le montant **par saison** parce que c'est la décision prise par la développeuse, pas parce que le CDC la désigne.)*

### Contenu retenu — d'après la maquette, factuellement

**Liste** : un titre de page « Saisons », un bouton primaire **« + Nouvelle saison »** en haut à droite, et un tableau à **quatre colonnes** — `LIBELLÉ`, `DÉBUT`, `FIN`, `STATUT` — plus une **action d'édition par ligne** (icône crayon en bout de ligne). Ligne pleinement lisible : `2025-2026` / `2025-09-01` / `2026-06-30` / **« En cours »** (vert). Les dates sont rendues au format `AAAA-MM-JJ`, comme la colonne `DATE` de `web-actus`.

La deuxième ligne est **coupée par la troncature de l'export** (§0) : on devine `2024-2025` et des dates de la saison précédente, et un libellé de statut dont **seule l'initiale majuscule « P » est lisible**. Cette spec **ne lui attribue aucun texte** — voir PO-WS-01.

Ce que la maquette **ne montre pas**, et qui compte autant : aucune boîte de dialogue de création ni de modification, aucun contrôle de suppression, aucun contrôle d'archivage, **aucun statut « à venir »**, aucun rattachement d'équipes ou d'adhésions à la saison, aucun bouton « clôturer la saison », aucune pagination, aucun filtre — **et aucun montant de cotisation, ni en colonne ni ailleurs** *(amendement : le champ du §2.7 est donc un ajout assumé au contenu illustré, comme l'archivage l'est pour `web-memberships`)*.

### Correspondance champs ↔ colonnes existantes

La table `seasons` n'est **pas redéfinie** ici.

| Libellé maquette | Colonne | Note |
|---|---|---|
| `LIBELLÉ` | `label` | obligatoire. Type domaine `SeasonLabel = ` `` `${number}-${number}` `` — voir §2.1, ce n'est pas du texte libre |
| `DÉBUT` | `start_date` | obligatoire, `date` (pas de composante horaire) |
| `FIN` | `end_date` | obligatoire, `date` |
| `STATUT` | **aucune colonne** — valeur **dérivée** des dates | voir §2.2 |
| **« Cotisation (€) »** — *hors maquette, amendement du 2026-09-17 (2)* | **`cotisation_amount_cents` — colonne à créer** | **facultatif**, entier de centimes, `>= 0`, **nullable**. Saisi en euros dans le dialogue, stocké en centimes. Voir §2.7 |
| — | `season_range` | **jamais saisie ni envoyée** : colonne générée, calculée par Postgres |

### Hors périmètre — explicitement

- **Le rollover de saison.** `docs/season-scoping-correction.md` §5.1 le met explicitement hors périmètre (« Do not build it as part of this pass — flag it as a follow-up spec once the Bureau's actual rollover workflow is confirmed »), et **cette spec ne le rouvre pas non plus**. Créer une saison **ne crée aucune ligne `teams`**, ne réaffecte aucun `user_roles`, ne duplique aucun effectif. C'est le piège principal de cette feature : « créer la saison 2026-2027 » depuis cet écran ne prépare **rien** d'autre que la ligne de référentiel. Voir PO-WS-05.
- **La suppression et l'archivage.** Aucune action de ce type dans la maquette ⇒ **aucune politique `delete`**, aucun bouton. Une saison est de surcroît référencée par `teams.season_id` et `memberships.season_id` : une suppression n'est pas une opération anodine. Voir PO-WS-06.
- **`current_season()`, `isCurrentSeason` et le scoping des équipes.** Inchangés, ni dans leur définition ni dans leur comportement. La politique RLS `teams` issue d'AC-CD-01 n'est pas touchée.
- **La question OPEN §3.3 de `docs/season-scoping-correction.md`** (jour de césure entre deux saisons) : **non tranchée ici non plus**, conformément à l'instruction de ce document (« do not silently decide a default gap/no-gap policy »). Voir PO-WS-04.
- **Tout affichage de saison côté mobile.** Aucun écran mobile ne change.
- **Tout calcul de cotisation** *(amendement du 2026-09-17 (2))* : cette feature **écrit un tarif de référence, elle ne calcule rien**. Aucun paiement, aucune adhésion, aucun état « payé / partiel / non payé », aucun montant par personne n'est lu ni écrit ici — tout cela vit dans `specs/web-memberships.md` (AC-WS-36). Aucune table de tarification par section ou par catégorie n'est créée (PO-WS-10).
- **Les autres destinations du backoffice** et les points ouverts non liés de `specs/web-empty-state.md` (PO-WE-01, PO-WE-04, PO-WE-06) et de `specs/web-actus.md`.
- **Le champ de recherche de la barre supérieure**, les badges numériques et la pastille de notifications — déjà exclus par AC-WE-13/AC-WE-15, reconduits tels quels.

## 2. Modèle et règles

### 2.1 Aucune colonne nouvelle — et une conséquence à assumer

> **Amendé le 2026-09-17 (2) : le titre de cette section ne vaut plus que pour les trois champs de la maquette.** Ceux-ci se logent toujours intégralement dans les colonnes existantes ; l'amendement ajoute **exactement une** colonne, `cotisation_amount_cents`, qui ne vient pas de la maquette mais d'une décision de modèle prise avec `web-memberships` (§2.7, AC-WS-33). Le reste de cette section est inchangé.

Les trois champs de la maquette se logent intégralement dans les colonnes existantes. **Aucun `ALTER TABLE` n'est nécessaire** *pour eux* (§2.7 en ajoute un, et un seul).

Conséquence à énoncer plutôt qu'à découvrir plus tard : `public.seasons` **ne porte aucune colonne de traçabilité**, pas même `created_at` (contrairement à `sections`, qui en a une dans la même migration), et évidemment ni `created_by`, ni `updated_at`, ni `updated_by`. **Une saison créée ou modifiée ne laisse donc aujourd'hui strictement aucune trace, ni en base ni ailleurs.** C'est le même constat que `specs/web-actus.md` §2.1, en plus marqué (là-bas `created_by`/`created_at` existaient au moins). Voir §4 et PO-WS-03 — cette spec **n'ajoute pas** ces colonnes de sa propre initiative. *(L'amendement du 2026-09-17 (2) rend ce constat plus lourd, pas moins : la valeur désormais modifiable sans trace est un **montant**, voir §4.)*

**Sur `SeasonLabel`** : le type domaine est `` `${number}-${number}` ``, pas `string`. La maquette (`2025-2026`) le respecte. Un champ « LIBELLÉ » rendu comme une saisie texte libre produirait donc des valeurs que le type domaine déclare impossibles — sans que Postgres ne s'y oppose, `label` étant un `text` nu sans `check`. Cette spec **n'invente pas** la règle de saisie (dérivé des dates ? deux champs d'année ? masque ?) → PO-WS-02. Elle exige seulement que la valeur produite soit conforme au type déjà écrit (AC-WS-09).

### 2.2 La colonne `STATUT` est dérivée, pas stockée — et elle a trois valeurs, pas deux

Il n'existe aucune colonne de statut sur `seasons`. Le statut se déduit intégralement des dates, comparées à la date du jour.

`isCurrentSeason(season, now)` existe déjà, mais **ne suffit pas** : c'est un booléen, et « pas la saison en cours » recouvre deux cas que cette feature doit impérativement distinguer, puisque l'un est modifiable et l'autre non :

| État | Condition | Modifiable ? |
|---|---|---|
| **Terminée** | `end_date < ` date du jour | **non** (règle centrale de cette spec) |
| **En cours** | `start_date ≤ ` date du jour `≤ end_date` | oui |
| **À venir** | date du jour `< start_date` | oui |

Un nouveau prédicat pur est donc nécessaire dans `domain/policies/season-scope.ts` — **à côté de `isCurrentSeason`, sans la modifier ni la dupliquer** (elle est référencée par la RLS `teams` et couverte par un test).

**L'état « à venir » n'est pas un cas limite : c'est le résultat normal de la fonctionnalité demandée.** Un administrateur qui crée la saison 2026-2027 en mars 2026 produit mécaniquement une ligne « à venir ». La maquette ne montre pourtant aucun libellé pour cet état (elle ne contient qu'une saison en cours et une saison passée tronquée) → PO-WS-01, **le seul point ouvert de cette spec qui touche l'UI** *(l'amendement en ajoute deux, PO-WS-10 et PO-WS-12 ; voir §6)*.

### 2.3 Bornes : « passée » se décide par `end_date`, contre `current_date` évalué par Postgres

Question posée explicitement au cadrage. Position retenue, et ses deux composantes :

**(a) Le critère est `end_date`, pas `start_date`.** Une saison est « passée » quand elle est **terminée**, c'est-à-dire quand sa date de fin est révolue. Une saison en cours a nécessairement une `start_date` passée sans être pour autant « une saison passée » — c'est précisément la ligne « En cours » de la maquette (`début 2025-09-01`, déjà dépassé au 2026-09-17). Utiliser `start_date` rendrait la saison en cours non modifiable, ce qui contredirait la maquette, qui affiche le crayon sur cette ligne-là.

**(b) La date de référence est `current_date` évalué par Postgres, jamais l'horloge du navigateur.** Ce n'est pas une préférence de style, c'est la reconduction littérale de la règle déjà écrite en tête de `domain/policies/season-scope.ts` et dans la migration `20260819153918` : « `now()` must be evaluated by Postgres, never trusted from a client-supplied date ». Conséquence directe : **la règle « une saison terminée ne se modifie pas » doit vivre dans la clause `using` de la politique RLS `update`**, et le prédicat de domaine correspondant est **de l'UX seulement** (masquer le crayon), jamais la sécurité — `CLAUDE.md` §6. Une horloge de poste avancée de trois mois ne doit pas ouvrir la modification d'une saison close.

**(c) Inclusivité de `end_date` : la dernière journée appartient encore à la saison.** `end_date = ` date du jour ⇒ la saison est **en cours**, donc modifiable. Ce n'est pas un arbitrage nouveau : c'est la seule valeur cohérente avec `season_range = daterange(start_date, end_date, '[]')` (bornes inclusives, déjà en base) et avec `isCurrentSeason` (`now <= end`). Retenir l'inverse créerait une journée où `current_season()` renvoie encore la saison alors que l'écran la déclarerait terminée. **La question OPEN §3.3 de `season-scoping-correction.md` reste néanmoins ouverte** : elle porte sur un autre point (faut-il un jour de césure *entre deux saisons*), pas sur celui-ci.

### 2.4 Le chevauchement est refusé par la base, pas par une vérification préalable

`seasons_no_overlap` (`EXCLUDE USING gist (season_range WITH &&)`) rejette déjà tout `insert`/`update` produisant un recouvrement, **quel que soit le chemin d'écriture**. Le use case **ne doit pas** implémenter la règle en allant d'abord lire les saisons existantes pour comparer les bornes côté client : deux créations concurrentes passeraient toutes deux la vérification avant que l'une n'écrive (course classique), et la règle se retrouverait écrite à deux endroits dont un seul fait autorité. Le chemin correct est celui déjà outillé de bout en bout : tentative d'écriture → Postgres `23P01` → `OverlappingSeasonError` → message `inline` existant.

**Une validation reste toutefois à faire dans le domaine, et elle n'est couverte par aucune contrainte** : `start_date ≤ end_date`. Aucun `check` ne l'impose sur la table. Passée telle quelle à Postgres, une saisie inversée fait échouer la construction du `daterange` avec un code d'erreur **non répertorié** dans `data/errors/map-supabase-error.ts`, dont la branche `default` renvoie… `NotFoundError`. L'administrateur verrait donc un message de ressource introuvable pour une date mal saisie. Le use case doit rejeter ce cas **avant** l'appel réseau, via une `DomainError` (AC-WS-10). *(L'amendement ajoute une seconde validation de même nature, sur le montant : §2.7, AC-WS-34.)*

### 2.5 Politiques RLS — deux ajouts, aucun sur la lecture

`public.seasons` porte aujourd'hui **une seule** politique, `seasons_select_authenticated` (lecture de toutes les lignes par tout compte authentifié). Deux politiques sont à ajouter dans une **nouvelle migration**, sans toucher à l'existante :

1. **Insertion administrateur** — `with check (private.is_admin())`.
2. **Mise à jour administrateur, restreinte aux saisons non terminées** — `using (private.is_admin() and end_date >= current_date)` **et** `with check (private.is_admin() and end_date >= current_date)`. Les deux clauses sont nécessaires et ne disent pas la même chose : `using` interdit de *cibler* une saison déjà terminée, `with check` interdit de *produire* par la modification une ligne déjà terminée (repousser une saison dans le passé en une seule requête, se mettant ainsi hors de portée de toute modification ultérieure).

**Aucune politique `select` supplémentaire n'est nécessaire** — différence nette avec `web-actus`, où la liste administrative exigeait une lecture élargie : ici la politique de lecture existante renvoie déjà **toutes** les saisons, passées comprises, à tout compte authentifié. **Aucune politique `delete`** (§1).

`private.is_admin()` existe déjà — rien à créer côté helper. Miroir manuel obligatoire des deux côtés (`CLAUDE.md` §7) : les deux politiques portent en commentaire le nom de l'action `'season:write'`, et l'entrée de matrice renvoie aux politiques.

**Amendement du 2026-09-17 (2) — deux conséquences, aucune politique de plus.** `cotisation_amount_cents` est écrite par ces **mêmes** deux politiques : **aucune politique supplémentaire n'est créée** pour le montant (AC-WS-33), exactement comme `web-memberships` §2.9 ne créait pas de politique dédiée au montant dû. Et puisque la politique `update` porte `end_date >= current_date`, **le montant d'une saison terminée est figé** — y compris pour corriger une faute de frappe. Ce n'est pas un effet de bord découvert après coup : c'est la règle centrale de cette spec appliquée à un champ de plus. Voir PO-WS-11.

### 2.6 Domaine

- `SeasonRepository` (`domain/repositories/season-repository.ts`) **conserve `findCurrent()` inchangée** — elle est consommée par le scoping des équipes (AC-CD-01) — et gagne `findAll()` (liste administrative) ainsi que `create(...)` et `update(...)`. Une seule interface par ressource, pas de `BackofficeSeasonRepository` séparé (même position que `NewsRepository` dans `web-actus`). **Amendement du 2026-09-17 (2)** : les entrées de `create(...)` et `update(...)` portent en outre `cotisationAmountCents` (**facultatif, `number | null`**, §2.7) ; `findCurrent()` et `findAll()` ne changent pas de signature, seule l'entité qu'elles renvoient porte un champ de plus.
- Deux use cases, `CreateSeasonUseCase` et `UpdateSeasonUseCase` (`domain/usecases/`), fonctions async pures — aucun import React / Supabase / TanStack Query (`CLAUDE.md` §3/§6). **Amendement** : leurs entrées acceptent `cotisationAmountCents` et le valident (AC-WS-34) ; la conversion euros → centimes est un travail de ViewModel, **jamais** un flottant transmis au domaine ni écrit en base.
- Le nouveau prédicat de statut (§2.2) vit dans `domain/policies/season-scope.ts`, à côté de `isCurrentSeason`, et est couvert par Vitest — `domain/policies` est la priorité de test n°1 (`CLAUDE.md` §8), et le fichier a déjà son test.
- `SeasonRepositoryImpl` écrit `label`, `start_date`, `end_date` **et, depuis l'amendement, `cotisation_amount_cents`** — et **jamais `season_range`** (colonne générée : l'inclure dans un `insert`/`update` fait échouer la requête). Le mapper `SeasonRow → Season` porte la colonne nouvelle (mapper obligatoire, `CLAUDE.md` §4).
- Clés de requête centralisées dans `presentation/shared/query-keys.ts` (`CLAUDE.md` §4) — jamais inline.

### 2.7 Montant de cotisation de la saison — colonne ajoutée par l'amendement du 2026-09-17 (2)

**D'où vient cette colonne.** Pas de la maquette (§0 : aucun montant n'y figure), mais d'une décision de modèle prise **avec** `specs/web-memberships.md` : le montant dû par un adhérent avait d'abord été logé sur la ligne d'adhésion (`memberships.amount_due_cents`), puis la développeuse a décidé qu'il vivrait **sur la saison**. `web-seasons` en devient donc le **seul chemin d'écriture** ; `web-memberships` n'en est plus que le **lecteur**.

**Forme exacte.**

| Élément | Valeur retenue | Pourquoi |
|---|---|---|
| Colonne | `cotisation_amount_cents` | Reprend mot pour mot la convention de nommage déjà posée par `web-memberships` (`amount_cents` sur les paiements, `amount_due_cents` sur l'adhésion avant abandon) : suffixe `_cents`, jamais un nom qui laisserait croire à des euros |
| Champ domaine | `cotisationAmountCents` sur `Season` (`domain/entities/season.ts`) | camelCase côté domaine, snake_case côté DTO, mapper entre les deux (`CLAUDE.md` §4) |
| Type SQL | `integer` | **Entier de centimes, jamais un `float`/`numeric` à virgule flottante** — même discipline et même motif que `web-memberships` §2.2 : `300€` saisi en flottant se réécrit `299,99999…`, et un total qui ne tombe jamais juste fausserait l'état « payé » calculé ailleurs |
| Nullabilité | **`null` autorisé** | Une saison peut exister **avant** que le Bureau n'ait fixé le tarif — créer la saison 2026-2027 en mars 2026 est le cas normal de cette feature (§2.2), et le tarif n'est pas nécessairement voté à cette date. Imposer `not null` rendrait impossible ce qui est aujourd'hui possible |
| Contrainte | `check (cotisation_amount_cents >= 0)` | Un montant **nul** (`0`) est un cas métier légitime (saison gratuite, section exonérée) ; un montant **négatif** n'en est pas un |
| Valeur par défaut | **aucune** (`null`) | Ne jamais faire naître un tarif de `0€` par défaut : `0` et `null` ne disent pas la même chose, voir ci-dessous |

**`null` et `0` doivent rester distinguables, et c'est la précision la plus importante de cette section.** `null` = « **tarif non fixé** » ; `0` = « **gratuit** ». Les confondre ferait passer, côté `web-memberships`, toute adhésion d'une saison sans tarif à l'état « payé » dès le premier centime encaissé — ou pire, sans aucun paiement. Conséquences : la base n'a pas de `default 0`, le formulaire ne pré-remplit pas `0` (§ « UI design »), et `web-memberships` traite l'absence comme un état à part (PO-WM-02 de cette spec-là).

**Ce que cette colonne n'est pas.** Ni un montant encaissé, ni un montant dû par personne, ni un échéancier, ni une table de tarification. Aucune ligne `memberships`, aucun paiement, aucun état de règlement n'est écrit ni lu par cette feature (AC-WS-36). Elle est **écrite ici, consommée ailleurs** — `specs/web-memberships.md` la lit via `membership.seasonId` pour sa colonne `COTISATION`, son filtre payé/partiel/non payé, sa règle d'activation (AC-WM-35) et, le cas échéant, son badge de navigation.

**Validation, et où elle vit.** Comme `start_date ≤ end_date` (§2.4), elle est levée **depuis le use case, avant tout appel réseau**, sous forme de `DomainError` : valeur **absente acceptée** ; valeur présente devant être un **entier** (pas un flottant : une saisie de `300,005 €` n'a pas de représentation en centimes) et **`>= 0`**. Le `check` en base est le miroir SQL de cette règle, pas son unique gardien (`CLAUDE.md` §6/§7).

**Effet de masse à énoncer, comme pour les bornes.** Modifier `cotisation_amount_cents` d'une saison **en cours** change instantanément l'état de règlement (« payé / partiel / non payé ») de **toutes** les adhésions de cette saison, sans qu'aucune ligne `memberships` ni aucun paiement ne soit touché — et sans qu'aucune trace n'en subsiste (§2.1). Relever le tarif en cours de saison fait ainsi rebasculer en « partiel » des adhésions affichées « payé » la veille. C'est la même famille d'effet que le déplacement des bornes (§4), sur une donnée financière cette fois. **Aucun garde-fou n'est inventé ici** → PO-WS-11.

## 3. RBAC

### Rôle titulaire — le cas le mieux étayé du dépôt à ce jour

**L'écriture sur `seasons` est réservée à l'Administrateur.** Contrairement à `web-actus` (où PO-AT-01 devait être tranché faute de ligne CDC), la question ne demande ici **aucun arbitrage** :

- `docs/roles-personas-as-caribbean.md` liste littéralement « **saisons** » dans les droits principaux du rôle Administrateur, et **d'aucun autre rôle**.
- La matrice RBAC comporte la ligne « **Gérer comptes, rôles, paramétrage** » : ❌ pour les sept autres rôles, ✅ pour l'Administrateur seul. Le référentiel des saisons est du paramétrage club-wide au sens propre.
- Moindre privilège (`roles-personas`, « Règle de sécurité »).

**Réutiliser `'section:manage'` serait une erreur, à écarter explicitement** : cette action vaut `['section-manager', 'admin']`, et un `section-manager` est **borné à sa section** (`can.ts`). Une saison est une donnée de référence **club-wide**, non scopée — l'adosser à `section:manage` donnerait silencieusement à chaque responsable de section le droit de créer une saison pour tout le club, et surtout de **modifier les bornes de la saison en cours**, dont dépend la visibilité des équipes de tous les autres (§4). La proximité du libellé de navigation (« Sections & Équipes » / « Saisons ») ne vaut pas proximité de périmètre.

**Amendement du 2026-09-17 (2) — une nuance à poser, pas une modification de la matrice.** Le montant de cotisation étant une donnée **financière** (§2.7, §4), la matrice RBAC du CDC nomme un autre rôle sur cette nature de donnée : le **Trésorier** (« Gérer échéanciers et relances », ✅ non qualifié ; « Tarification » relève du même module P1). `'season:write'` **reste néanmoins `['admin']` dans cette spec** — le Trésorier n'a aujourd'hui aucun accès à `/admin/*` (`backoffice:access` vaut `['admin']`, PO-WE-01 ouvert), et lui accorder ici un droit qu'il ne pourrait pas exercer construirait une politique sans chemin applicatif, exactement le raisonnement déjà tenu par `specs/web-memberships.md` §3. La question est **la même** que PO-WM-08 et n'est **pas rouverte ici** : elle est simplement étendue au tarif de saison, et rattachée à PO-WS-10.

### Tableau par rôle

| Rôle | Lecture de `seasons` (RLS existante, inchangée) | Accès à `/admin/seasons` | Création | Modification |
|---|---|---|---|---|
| Joueur/Joueuse | ✅ toutes les lignes | ❌ | ❌ | ❌ |
| Coach/Staff | ✅ toutes les lignes | ❌ | ❌ | ❌ |
| Responsable de section | ✅ toutes les lignes | ❌ (PO-WE-01) | ❌ — **et surtout pas via `section:manage`** | ❌ |
| Dirigeant habilité | ✅ toutes les lignes | ❌ (PO-WE-01) | ❌ | ❌ |
| Trésorier | ✅ toutes les lignes | ❌ | ❌ *dans cette passe* — voir la nuance ci-dessus et PO-WS-10 | ❌ *dans cette passe* |
| Référent médical | ✅ toutes les lignes | ❌ | ❌ | ❌ |
| Bénévole | ✅ toutes les lignes | ❌ | ❌ | ❌ |
| **Administrateur** | ✅ toutes les lignes | ✅ | ✅ | ✅ **sauf saison terminée** |

Aucune portée section/équipe sur aucune de ces cases : `seasons` est club-wide et `admin` ne porte pas de champ de portée dans `RoleAssignment`.

*(Note de lecture, amendement : la colonne `cotisation_amount_cents` étant sur `seasons`, elle hérite de la politique `seasons_select_authenticated` — **tout compte authentifié lit le tarif de toutes les saisons**. C'est cohérent avec la ligne de matrice « Voir le statut de cotisation ✅ (soi-même) » côté joueur et sans danger : un tarif n'est pas une donnée nominative (§4). Aucune politique de lecture n'est restreinte ni ajoutée pour autant, AC-WS-02 reste vraie telle quelle.)*

### Entrée de matrice proposée — `'season:write': ['admin']`

Action nouvelle, **couvrant création et modification ensemble** (aucun document ne distingue un rôle qui pourrait faire l'une sans l'autre), nommée sur le patron de `'news:write'` — le précédent le plus proche : même surface, même population, même couple création/modification.

```
'season:write': ['admin']
```

Justification au regard du critère commenté en tête de `rbac-matrix.ts` : `presentation/` doit décider de rendre ou non « + Nouvelle saison » et l'icône crayon, **avant toute requête**. Même objection honnête que pour `news:write` — aujourd'hui la décision est constante, `backoffice:access` et cette population coïncidant exactement — et **même position retenue, pour la même raison** : PO-WE-01 est ouvert sur l'élargissement de `backoffice:access` à Dirigeant habilité et/ou Responsable de section, et sans action distincte cet élargissement donnerait silencieusement le droit de créer et modifier des saisons à des rôles dont personne ne l'a validé. Ici l'effet de bord serait plus grave que pour les actus : voir §4.

**Aucune action nouvelle n'est créée par l'amendement du 2026-09-17 (2)** : le montant de cotisation est un champ de la ressource `seasons`, écrit par `'season:write'`, **pas** une action distincte (`CLAUDE.md` §7 — ne pas ajouter d'entrée de matrice au-delà de ce que la spec demande).

### La règle « saison terminée non modifiable » n'est **pas** une règle RBAC

Point de conception à ne pas confondre, puisqu'il touche deux fichiers différents :

- **Qui** a le droit de modifier une saison → matrice RBAC, `'season:write': ['admin']`. Réponse identique pour toutes les lignes.
- **Quelles lignes** sont modifiables → prédicat métier d'état, fonction des dates (§2.2/§2.3). Réponse différente ligne par ligne, et changeant toute seule au fil du temps.

La matrice répond à « quels rôles », pas à « quelles lignes » : y encoder la temporalité la dénaturerait. Le précédent existe déjà dans le dépôt — `domain/policies/convocation-closure.ts` est une politique d'état distincte de la matrice, pas une entrée de matrice. Concrètement : `can(user, 'season:write')` **et** le prédicat d'état doivent être vrais tous les deux, et **la politique RLS `update` porte la conjonction des deux** (§2.5). Le front n'est pas la sécurité.

### Comptes multi-rôles

Sans effet ici. Un compte `admin` + `coach` voit la console comme administrateur ; aucun rôle actif (`active-role-scope.ts`) n'intervient, la console ne dépendant que de la présence du rôle `admin`. PO-WE-06 reste ouvert et n'est pas traité ici.

## 4. Données sensibles

| Nature | Cette feature | Conséquence |
|---|---|---|
| **Données de santé** | Aucune | Aucun trigger d'audit d'accès, aucun filtre de colonne |
| **Données financières** | **Oui depuis l'amendement du 2026-09-17 (2)** — `cotisation_amount_cents` est un **tarif**, pas une transaction : aucun encaissement, aucun montant dû par personne, aucune ligne de paiement, aucun rattachement nominatif | `RETENTION_PURGE.md` vise les « Données financières (cotisations) » **nominatives** — un tarif de saison n'en est pas une. L'enjeu réel est la **traçabilité de la modification** et son **effet de masse** (§2.7) : PO-WS-03 amendé, PO-WS-11 |
| **Données nominatives** | **Aucune** — une saison est un libellé, deux dates et, désormais, un montant de référence ; sans aucun lien vers une personne | Pas d'« export nominatif » au sens du CDC §11.3 ; pas de matière RGPD |
| **Donnée de référence structurante** | **Oui, et c'est le point à ne pas manquer** | Voir ci-dessous |

**C'est la feature la moins chargée en données personnelles du backoffice — et paradoxalement l'une des plus sensibles au sens de l'intégrité.** Les bornes d'une saison ne décrivent personne, mais elles **pilotent la visibilité des données d'autrui** : `current_season()` est consommée par la politique RLS `teams` issue d'AC-CD-01 (`season_id = (select id from public.current_season())`). Trois conséquences concrètes, toutes vérifiables dans la migration `20260819153918` :

1. **Modifier les bornes de la saison en cours est une opération de masse déguisée.** Avancer `end_date` d'un jour peut faire basculer `current_season()` sur une autre ligne — ou sur aucune — et donc changer d'un coup les équipes visibles par chaque coach du club. L'écran ne ressemble en rien à une action de masse ; la règle « saison terminée non modifiable » (§2.3) protège le passé, mais **la saison en cours reste modifiable et c'est elle qui porte ce risque**.
2. **Une saison en cours modifiée de travers peut produire un trou.** `current_season()` renvoie zéro ligne pendant une césure entre deux saisons — état valide et déjà géré (`findCurrent(): Promise<Season | null>`, `maybeSingle()`, tableaux de bord en état vide plutôt qu'en erreur). Mais si l'état vide est *involontaire*, tous les coachs voient un tableau de bord vide sans aucun message expliquant pourquoi. Voir PO-WS-07.
3. **Aucune de ces modifications n'est tracée aujourd'hui** (§2.1) : la table ne porte même pas de `created_at`.

**Quatrième conséquence, ajoutée par l'amendement du 2026-09-17 (2) — de même nature, sur une donnée financière.** Modifier `cotisation_amount_cents` d'une saison en cours **réécrit l'état de règlement de toutes les adhésions de cette saison** (§2.7) sans toucher une seule ligne `memberships` et sans laisser de trace. Une adhésion affichée « payé » la veille peut repasser « partiel » du seul fait d'une saisie sur cet écran-ci — et, côté `web-memberships`, cela interagit avec la règle d'activation AC-WM-35 (statut `active` ⇒ cotisation soldée). C'est le premier cas du dépôt où **une écriture dans une feature en modifie l'affichage financier d'une autre**. Voir PO-WS-11.

**Journal d'audit (PO-WS-03).** Le CDC §11.3 énumère les actions à tracer (création/suppression de compte, changement de rôle, consultation de donnée santé, modification de paiement, correction de points Legacy, export nominatif) — **la création ou la modification d'une saison n'y figure pas**. Lecture littérale : rien à tracer. Mais `roles-personas` borne le rôle Administrateur par « **actions sensibles journalisées** », et les trois points ci-dessus décrivent précisément une action sensible : club-wide, à effet de bord silencieux sur la visibilité d'autrui, et aujourd'hui sans aucune trace. L'argument est **matériellement plus fort que pour `web-actus`** (PO-WA-04), où l'enjeu se limitait à la réécriture d'un texte éditorial. Cette spec **ne trancherait pas à la place du Bureau / du référent RGPD** ; si une trace est décidée : **depuis le use case**, action métier porteuse d'intention, **jamais depuis un composant** (`CLAUDE.md` §6), avec une rétention à fixer (`RETENTION_PURGE.md`). *(Amendement : l'argument se renforce encore d'un cran pour le montant — `specs/web-memberships.md` §4 tient l'écriture d'un montant dû pour une écriture financière relevant de la même famille que la « modification paiement » du §11.3, et la question d'infrastructure y est ouverte sous PO-WM-09.)*

**Rétention et purge.** Aucune. Une saison passée est un élément d'historique référencé par `teams.season_id` et `memberships.season_id` ; rien dans `RETENTION_PURGE.md` ne prévoit de l'effacer, et cette spec n'offre pas de suppression (§1). *(Le tarif d'une saison passée est de surcroît figé par la politique `update` elle-même, §2.5.)*

**Nom de personne dans la maquette.** L'export affiche un nom et un prénom dans la barre supérieure. `CLAUDE.md` §9 l'interdit partout, y compris en exemple ou en fixture — même règle qu'AC-WE-14 et AC-WA-21, reprise ici en AC-WS-19. Cette spec ne le reproduit pas.

## 5. Critères d'acceptation

Numérotation **`AC-WS-xx`**, préfixe à deux lettres par feature comme AC-WE, AC-WA, AC-AT, AC-CD, AC-PD, AC-PV.

**Base de données et RLS**

- **AC-WS-01** — Une nouvelle migration ajoute sur `public.seasons` exactement deux politiques : un `insert` administrateur et un `update` administrateur, toutes deux appuyées sur `private.is_admin()`. **Aucune politique `delete`, aucune politique `select` supplémentaire.**
- **AC-WS-02** — La politique `seasons_select_authenticated` existante n'est ni modifiée, ni supprimée, ni remplacée : avec un jeton de n'importe lequel des 8 rôles, `select` sur `seasons` renvoie **toutes** les lignes, passées comprises.
- **AC-WS-03** — Avec un jeton **non administrateur**, tout `insert` et tout `update` sur `seasons` échoue. Testé pour au moins un `section-manager`, afin de vérifier qu'aucun élargissement par analogie avec `'section:manage'` n'a eu lieu (§3).
- **AC-WS-04** — Avec un jeton administrateur, un `update` **sur une saison dont `end_date < current_date` échoue** (clause `using`), et un `update` qui **repousserait** une saison dans le passé échoue également (clause `with check`). Testé contre la base avec un jeton, hors application.
- **AC-WS-05** — Avec un jeton administrateur, un `insert` dont les dates recouvrent une saison existante échoue avec le code Postgres `23P01`, **par la contrainte `seasons_no_overlap` existante** : la migration de cette passe ne la redéfinit pas, ne la duplique pas et n'ajoute aucun trigger de vérification concurrent. Vérifié pour un recouvrement total, un recouvrement partiel et une saison strictement incluse dans une autre.
- **AC-WS-06** — Deux saisons **adjacentes sans recouvrement** (`2025-09-01 → 2026-06-30` puis `2026-07-01 → 2027-06-30`) sont acceptées toutes les deux : la contrainte n'est pas trop stricte.
- **AC-WS-07** — Les deux politiques portent chacune un commentaire SQL nommant l'action `'season:write'` qu'elles miroitent, et l'entrée de matrice renvoie aux politiques (miroir manuel, `CLAUDE.md` §7). La politique `update` commente en outre la règle « saison terminée non modifiable » et renvoie au prédicat de domaine correspondant.
- **AC-WS-08** *(amendé le 2026-09-17 (2))* — **Une seule colonne est ajoutée à `seasons`** par l'ensemble de cette spec, `cotisation_amount_cents` (AC-WS-33) : **ni `created_at`, ni `created_by`, ni `updated_at`, ni `updated_by`, ni colonne de statut, ni colonne de montant encaissé**, et `season_range`, `seasons_no_overlap` et `current_season()` sont inchangés. *(Rédaction d'origine, conservée pour mémoire : « Aucune colonne n'est ajoutée à `seasons` dans cette passe » — vraie pour la première tranche, remplacée par l'amendement.)*
- **AC-WS-33** *(ajouté le 2026-09-17 (2))* — La migration ajoute sur `public.seasons` **exactement une** colonne, **`cotisation_amount_cents`** : `integer` (**entier de centimes, jamais un flottant**), **nullable**, **sans valeur par défaut**, avec un `check (cotisation_amount_cents >= 0)`. Un `null` (« tarif non fixé ») et un `0` (« gratuit ») sont **tous deux acceptés et restent distinguables** en base (§2.7) ; une valeur négative est refusée. Elle est écrite par les politiques `insert`/`update` administrateur d'AC-WS-01, **sans aucune politique supplémentaire**, et reste donc **non modifiable sur une saison terminée** (AC-WS-04 s'applique telle quelle). **Aucune table de tarification** n'est créée, **aucune colonne n'est ajoutée à `memberships`** par cette spec.

**Domaine**

- **AC-WS-09** — `'season:write'` est ajoutée à `domain/policies/actions.ts` et vaut `['admin']` dans `rbac-matrix.ts`. **Aucune autre action, aucun autre rôle n'est ajouté** (`CLAUDE.md` §7) — en particulier `'section:manage'` et `'backoffice:access'` sont inchangées. *(L'amendement du 2026-09-17 (2) n'ajoute **aucune** action : le montant est un champ de `seasons`, écrit par `'season:write'`.)*
- **AC-WS-10** — Le use case de création refuse, **depuis le domaine** (`DomainError`, pas une validation de composant) et **avant tout appel réseau**, un `label` vide, une date manquante et une saisie où `start_date > end_date` (§2.4). Le chevauchement, lui, **n'est pas** pré-vérifié côté client : il remonte de la base.
- **AC-WS-11** — Le libellé produit est conforme au type `SeasonLabel` déjà écrit (`` `${number}-${number}` ``) ; aucun élargissement de ce type en `string` n'est fait pour contourner le problème (§2.1, PO-WS-02).
- **AC-WS-12** — `domain/policies/season-scope.ts` gagne un prédicat d'état à trois valeurs (terminée / en cours / à venir), couvert par Vitest, **sans modifier `isCurrentSeason` ni dupliquer sa règle**. Les cas limites testés incluent explicitement `end_date = ` date du jour → **en cours**, pas terminée (§2.3c).
- **AC-WS-13** — `SeasonRepository.findCurrent()` est **inchangée** en signature et en comportement ; l'interface gagne `findAll()`, `create(...)`, `update(...)`. Aucun second repository de saisons n'est créé.
- **AC-WS-14** — `CreateSeasonUseCase` et `UpdateSeasonUseCase` existent dans `domain/usecases/`, sans aucun import React, Supabase, TanStack Query ni `window`, et sans `useQuery`/`useMutation` à l'intérieur.
- **AC-WS-15** — Aucune écriture n'envoie la colonne générée `season_range` (§2.6).
- **AC-WS-16** — Un chevauchement remonte jusqu'à l'interface sous la forme du message **déjà existant et déjà testé** « Les dates de cette saison chevauchent une saison existante. » (variante `inline`), via `23P01` → `OverlappingSeasonError` → `mapDomainErrorToUiError`. **Aucun nouveau message n'est écrit pour ce cas**, aucun code Postgres brut n'atteint un composant.
- **AC-WS-34** *(ajouté le 2026-09-17 (2))* — L'entité `Season` porte `cotisationAmountCents: number | null`, et `SeasonRepository.create(...)`/`update(...)` ainsi que `CreateSeasonUseCase`/`UpdateSeasonUseCase` l'acceptent en entrée **facultative**. Les use cases refusent, **depuis le domaine** (`DomainError`) et **avant tout appel réseau** : une valeur **non entière** et une valeur **négative** ; une valeur **absente ou `null` est acceptée** (§2.7). Couvert par Vitest (refus et acceptation, `0` accepté, `null` accepté). La **conversion euros → centimes est faite par le ViewModel**, jamais dans `domain/` et jamais sous forme de flottant persisté. `findCurrent()` et `findAll()` gardent leur signature ; le mapper `SeasonRow → Season` porte la colonne nouvelle (mapper obligatoire, `CLAUDE.md` §4).

**Écran `/admin/seasons`**

- **AC-WS-17** — `/admin/seasons` ne rend plus `BackofficeEmptyState` inconditionnellement : il rend un tableau à quatre colonnes `LIBELLÉ`, `DÉBUT`, `FIN`, `STATUT`, plus une action d'édition par ligne. Les dates sont rendues au format `AAAA-MM-JJ`, via le formateur déjà en place (`presentation/shared/formatters/date-input.ts`), sans second formatage de date.
- **AC-WS-18** — La colonne `STATUT` est calculée depuis les dates par le prédicat d'AC-WS-12, **jamais lue depuis une colonne** et jamais recalculée en ligne dans le composant. Une saison à venir est rendue dans son propre état, **distinct** de « en cours » et de « terminée » (§2.2, libellé exact : PO-WS-01).
- **AC-WS-19** — « + Nouvelle saison » et l'icône crayon ne sont rendus que si `can(user, 'season:write')` — booléen calculé par le ViewModel, **séparément** du fait d'avoir atteint la route (§3). Aucun nom de personne n'est codé en dur, y compris celui de la maquette, y compris en placeholder ou en fixture de test (`CLAUDE.md` §9).
- **AC-WS-20** — Sur une ligne **terminée**, l'icône crayon **n'est pas rendue** — elle n'apparaît pas grisée ni désactivée, conformément au principe déjà appliqué dans ce dépôt (« une carte disparaît, elle n'apparaît pas désactivée », `specs/web-actus.md`). Sur une ligne **en cours** ou **à venir**, elle est rendue et active.
- **AC-WS-21** — **Aucun contrôle de suppression ni d'archivage** n'est rendu, à aucun endroit de l'écran (ni ligne, ni dialogue, ni menu contextuel) — comportement voulu, pas un oubli (§1, PO-WS-06).
- **AC-WS-22** — Après une création ou une modification réussie, la liste reflète le changement **sans rechargement manuel de la page** (invalidation via une clé centralisée dans `presentation/shared/query-keys.ts`, jamais une `queryKey` inline). L'invalidation couvre aussi la clé servant `findCurrent()` si celle-ci est mise en cache : modifier les bornes de la saison en cours change ce que `current_season()` renvoie (§4).
- **AC-WS-23** — Les trois états sont couverts et distincts : chargement (jamais un flash de liste vide), erreur (message lisible en français issu d'une `DomainError` traduite, jamais un message brut Supabase), liste vide (état vide explicite — **cas normal au démarrage du club, jamais une erreur**). Un échec de création/modification laisse le dialogue ouvert **avec les saisies conservées** — critique ici, le cas d'échec le plus probable étant le chevauchement, que l'administrateur doit pouvoir corriger sans tout ressaisir.
- **AC-WS-24** — Une modification enregistre sur la **même** ligne (pas de création d'un doublon), et le dialogue de modification est **pré-rempli** avec les valeurs de la ligne sélectionnée.
- **AC-WS-35** *(ajouté le 2026-09-17 (2))* — Le dialogue de création/modification porte un **quatrième champ**, « Cotisation (€) » : **facultatif** (jamais `required`), saisi **en euros**, converti en centimes par le ViewModel avant l'appel au use case. En mode modification il est **pré-rempli** depuis `cotisationAmountCents` converti en euros, et **laissé vide** quand la valeur est `null` — **jamais pré-rempli à `0`**, `0` signifiant « gratuit » et non « tarif non fixé » (§2.7). Le **tableau de la liste reste à quatre colonnes** : aucune colonne de montant n'y est ajoutée par cet amendement (PO-WS-12). Le champ n'est atteignable que depuis un dialogue déjà conditionné par `can(user, 'season:write')` (AC-WS-19) — **aucun second contrôle de droit n'est ajouté**.

**Transverse et non-régression**

- **AC-WS-25** — `current_season()`, `isCurrentSeason`, `SeasonRepositoryImpl.findCurrent()`, la politique RLS `teams` d'AC-CD-01 et le scoping des équipes du tableau de bord coach sont **inchangés** en définition et en comportement. Vérifiable en régression. *(L'ajout d'un champ sur l'entité `Season` ne change ni la signature ni le comportement de ces éléments — seuls le mapper et le DTO portent une colonne de plus.)*
- **AC-WS-26** — Aucun écran mobile ne change de rendu, de route ou de comportement du fait de cette tranche (reconduction d'AC-WE-20).
- **AC-WS-27** — La console est desktop-only : le garde de largeur existant (`RequireDesktopViewport` / `BackofficeDesktopOnlyPage`, AC-WE-18) s'applique inchangé, et aucun dossier `presentation/desktop/` ni `presentation/mobile/` n'est créé (AC-WE-19, `CLAUDE.md` §5).
- **AC-WS-28** — Un compte authentifié **sans** le rôle `admin` n'atteint pas `/admin/seasons` (garde `backoffice:access`, AC-WE-09) ; et même s'il l'atteignait, AC-WS-03 garantit qu'il n'écrit rien — le front n'est pas la sécurité (`CLAUDE.md` §6).
- **AC-WS-29** — CDC §12 : le dialogue est **entièrement utilisable au clavier** (tabulation, soumission, fermeture par `Échap`, focus piégé et restitué), et les contrastes du fond sombre sont **vérifiés** au niveau AA, pas supposés. Le statut n'est jamais porté par la couleur seule : toujours doublé d'un texte (patron `StatusBadge` / `NewsStatusBadge` déjà en place).
- **AC-WS-30** — Aucun appel Supabase depuis `presentation/`, aucun import de `data/` depuis `presentation/` : câblage par le conteneur DI (`CLAUDE.md` §3). Le ViewModel calcule, la Page ne fait que brancher des booléens.
- **AC-WS-31** *(amendé le 2026-09-17 (2))* — Aucune donnée de **santé** ni **nominative** n'est lue ou écrite par cette feature. La **seule** donnée financière qu'elle touche est le **tarif de référence** `cotisation_amount_cents` (§4) : ni encaissement, ni montant dû par personne, ni ligne de paiement, ni rattachement à un compte. *(Rédaction d'origine, conservée pour mémoire : « Aucune donnée de santé, financière ou nominative n'est lue ou écrite par cette feature. »)*
- **AC-WS-32** — Créer une saison **ne crée aucune ligne `teams`**, ne modifie aucun `user_roles` et ne duplique aucun effectif (§1, PO-WS-05). Vérifiable : après une création depuis cet écran, le compte des lignes `teams` et `user_roles` est inchangé.
- **AC-WS-36** *(ajouté le 2026-09-17 (2))* — Cette feature **écrit un tarif et ne calcule rien** : aucun état de règlement (« payé / partiel / non payé »), aucune somme de paiements, aucune lecture ni écriture sur `memberships` ou sur la table de paiements n'est effectuée depuis `/admin/seasons`, son ViewModel ou ses use cases. La consommation de `cotisation_amount_cents` appartient entièrement à `specs/web-memberships.md`. Vérifiable : après une modification de montant depuis cet écran, **aucune ligne `memberships` n'a été écrite**.

## 6. Points ouverts

| Réf. | Question | Pour qui | Bloquant ? |
|---|---|---|---|
| **PO-WS-01** | **Libellés des trois états de la colonne `STATUT`.** La maquette ne donne que « **En cours** » (vert) ; le statut de la deuxième ligne est coupé par la troncature de l'export (§0), seule son initiale « P » est lisible, et **l'état « à venir » n'est illustré nulle part** alors qu'il est le résultat normal d'une création (§2.2). Quels libellés et quels traitements visuels pour les trois états ? | Designer / développeuse | **Non pour construire** (un repli lisible existe), **oui pour figer l'écran** |
| **PO-WS-02** | **Saisie du `LIBELLÉ`.** Le type domaine est `` `${number}-${number}` ``, pas `string` (§2.1) : champ texte libre avec validation, deux champs d'année, ou libellé **dérivé automatiquement** des dates saisies (`2025-09-01` + `2026-06-30` → `2025-2026`) ? La dérivation supprimerait un champ et rendrait la valeur toujours conforme, mais interdirait tout libellé hors convention (saison civile, saison à cheval atypique). | Développeuse / Bureau | Non |
| **PO-WS-03** | **Faut-il journaliser la création et la modification d'une saison ?** Absente du CDC §11.3, mais le rôle Administrateur est borné par « actions sensibles journalisées », et modifier les bornes de la saison en cours change la visibilité des équipes de tous les coachs (§4). Sous-question indissociable : faut-il ajouter `created_at`/`created_by`/`updated_at`/`updated_by`, la table n'ayant **aucune** colonne de traçabilité (§2.1) ? Si oui : depuis le use case, jamais depuis un composant, et quelle rétention ? Même famille que PO-WA-04. **Amendement du 2026-09-17 (2)** : la question change de poids — la modification porte désormais aussi sur un **montant**, et `specs/web-memberships.md` §4 tient l'écriture d'un montant dû pour une écriture financière de la même famille que la « modification paiement » du CDC §11.3 (PO-WM-09, infrastructure d'audit inexistante) | Référent RGPD / Bureau | Non pour construire — **à trancher avant mise en production** |
| **PO-WS-04** | **Jour de césure entre deux saisons.** Question OPEN §3.3 de `docs/season-scoping-correction.md`, **délibérément non tranchée ici** conformément à l'instruction de ce document : le club veut-il des saisons strictement contiguës, ou une césure estivale assumée pendant laquelle `current_season()` ne renvoie rien ? La contrainte `seasons_no_overlap` accepte les deux ; le formulaire ne doit pas imposer l'un des deux par un défaut implicite | Bureau | Non |
| **PO-WS-05** | **Rollover de saison — reste hors périmètre, et c'est contre-intuitif depuis cet écran.** Créer la saison N+1 ici ne crée aucune équipe et ne réaffecte aucun coach (§1, `season-scoping-correction.md` §5.1) : le jour où la nouvelle saison devient « en cours », `current_season()` bascule et **tous les tableaux de bord coach se vident**, faute de `teams` rattachées à la nouvelle saison. Quel est le parcours réel attendu par le Bureau, et faut-il au minimum un avertissement sur cet écran ? Spec de suivi à prévoir. *(Amendement : le rollover emporte désormais aussi la question du **tarif** de la saison N+1 — est-il repris de N par défaut, ou ressaisi ? Rien ne le dit, voir PO-WS-10.)* | Bureau / développeuse | **Non pour cette tranche** — mais à traiter **avant** la première bascule de saison réelle en production |
| **PO-WS-06** | **Aucune suppression.** Décision durable (une saison ne se supprime jamais, c'est de l'historique référencé par `teams.season_id` et `memberships.season_id`) ou report ? Que fait-on d'une saison créée par erreur, notamment avec des dates fausses qui bloquent la création de la vraie par chevauchement — la corriger tant qu'elle n'est pas terminée est le seul recours prévu aujourd'hui | Bureau / développeuse | Non |
| **PO-WS-07** | **Garde-fous sur la modification de la saison en cours.** La règle demandée protège les saisons **terminées**, mais c'est la saison **en cours** qui porte le risque réel (§4) : en déplacer les bornes peut vider `current_season()` ou la faire basculer, changeant la visibilité des équipes pour tout le club. Faut-il une confirmation explicite, un avertissement, ou une restriction supplémentaire ? Rien dans les documents de cadrage ne l'exige — **aucun garde-fou n'est inventé ici** | Bureau / développeuse | Non |
| **PO-WS-08** | Ligne `web-seasons` à recopier dans `docs/designs/DESIGN_LINKS.md` §2 (statut `instantané seul`, avec les deux notes sur la troncature et l'absence de dialogue) — pré-rédigée au §0 ; aucun lien artifact à demander | Développeuse / premier agent ayant les droits sur `docs/` | Non |
| **PO-WS-09** | Ordre d'affichage et pagination : non déterminables, l'export étant tronqué (§0). Antéchronologique par `start_date` (saison la plus récente en tête) est l'hypothèse la plus simple et **cohérente avec la seule ligne pleinement visible** de la maquette (`2025-2026` au-dessus de `2024-2025`), non confirmée. Même indétermination que PO-WA-12 | Développeuse | Non |
| **PO-WS-10** *(ajouté le 2026-09-17 (2))* | **Un seul tarif par saison suffit-il — et où vivent les dérogations ?** Le CDC dit « **Tarification** » (module P1 « Cotisations ») sans jamais préciser la granularité, et nomme pourtant des cas qui n'ont plus d'endroit où vivre depuis que le montant a quitté la ligne d'adhésion : **exonération**, **réduction famille**, tarif différent **par section** ou par **catégorie d'âge**. Avec `cotisation_amount_cents` sur la saison, tous les adhérents d'une saison doivent exactement le même montant, sans exception possible et sans motif mémorisé. Faut-il (a) s'en tenir là pour cette tranche, (b) prévoir une dérogation par adhésion dans une passe ultérieure de `web-memberships`, (c) une table de tarification par section/catégorie ? Sous-question connexe : qui fixe ce tarif — l'Administrateur, ou le **Trésorier** que le CDC désigne sur ce module (§3) ? | **Bureau / Trésorier / développeuse** | Non pour construire cette tranche — **oui avant la première saison facturée réellement** |
| **PO-WS-11** *(ajouté le 2026-09-17 (2))* | **Deux effets de la modification du montant, aucun garde-fou inventé ici.** (a) **Rétroactivité** : changer `cotisation_amount_cents` d'une saison **en cours** fait basculer l'état de règlement de **toutes** ses adhésions (§2.7, §4) — une ligne « payé » peut redevenir « partiel » sans qu'aucun paiement ne bouge, avec un effet direct sur la règle d'activation AC-WM-35 de `web-memberships`. Faut-il un avertissement, une confirmation, une trace ? (b) **Gel** : la politique `update` interdisant de modifier une saison terminée (§2.5), le montant d'une saison passée est **définitivement figé**, y compris en cas d'erreur de saisie constatée après la fin de saison. Est-ce acceptable, ou faut-il une voie de correction ? | Bureau / Trésorier / développeuse | Non pour construire — **oui avant la première modification de tarif en cours de saison** |
| **PO-WS-12** *(ajouté le 2026-09-17 (2))* | **Le montant doit-il apparaître dans la liste `/admin/seasons` ?** L'amendement n'ajoute **aucune** colonne au tableau à quatre colonnes (AC-WS-35) : la maquette est tronquée et ne montre aucun montant (§0), et rien ne dit que l'administrateur a besoin de voir le tarif sans ouvrir le dialogue. Une cinquième colonne `COTISATION` serait pourtant le seul moyen de repérer d'un coup d'œil une saison **sans tarif fixé** (`null`, §2.7) — cas qui, côté `web-memberships`, rend tout état de règlement incalculable (PO-WM-02 de cette spec-là) | Développeuse / designer-agent | Non |

### Sur la surface desktop — question posée au cadrage, déjà tranchée ailleurs

Point soulevé explicitement par la développeuse : `CLAUDE.md` §1 décrit une application **mobile-only**, et cette maquette vit sous `docs/designs/desktop/`. **Ce n'est pas un point ouvert propre à cette feature**, et il n'en ouvre pas un nouveau :

- La tension a déjà été identifiée et instruite comme **PO-WE-03** (`specs/web-empty-state.md` §5), qui relève que l'interdiction de `CLAUDE.md` §5 vise un **dossier à symétrie vide** (`presentation/desktop/` + `presentation/mobile/`), pas l'existence d'écrans desktop — `ARCHITECTURE.md` §10 prévoyant d'ailleurs la bascule desktop au seul niveau du rendu.
- La décision est **déjà appliquée dans le code** : le backoffice desktop existe (`/admin/*`, 6 entrées de navigation), le garde de largeur est construit (`RequireDesktopViewport`, `BackofficeDesktopOnlyPage`), et aucun dossier `presentation/desktop/` n'a été créé. `web-actus` s'est inscrite dans ce cadre sans le rouvrir.
- Cette feature **reconduit ce cadre sans le modifier** (AC-WS-27) et n'ajoute aucune route, la destination `/admin/seasons` existant déjà dans `backoffice-nav.ts`.

Ce qui reste, et qui n'appartient ni à cette spec ni à `web-empty-state`, c'est une question de **gouvernance produit** : le Bureau valide-t-il qu'une partie du paramétrage club (dont les saisons, P0) ne soit accessible que depuis un ordinateur ? Elle ne bloque rien ici, la surface étant déjà construite et peuplée. **PO-WE-09** (valeur exacte du seuil, texte du message) reste ouvert côté `web-empty-state` et n'est pas repris ici.

## 7. Note pour designer-agent

- Maquette de référence : `docs/designs/desktop/seasons/[Admin] Web - Seasons - 1.png`. **Export tronqué et sans aucune boîte de dialogue** (§0) : la liste est illustrée, le formulaire de création/modification ne l'est pas. Le patron le plus proche et déjà construit est `presentation/features/backoffice/news/components/NewsFormDialog.tsx` — s'en inspirer plutôt que d'inventer une seconde convention de dialogue dans le même backoffice.
- Contraintes issues de cette passe, à ne pas contredire : la colonne `STATUT` est **dérivée des dates**, jamais un champ modifiable, et compte **trois** valeurs et non deux (terminée / en cours / à venir) ; le crayon **disparaît** sur une ligne terminée, il n'apparaît pas grisé ; aucun contrôle de suppression ou d'archivage ne doit apparaître, pas même désactivé ; le statut n'est jamais porté par la couleur seule (AC-WS-29).
- **Deux champs de date côte à côte** (`DÉBUT` / `FIN`) : si le dialogue les pose sur une même ligne, `min-w-0` sur chaque élément de grille est obligatoire — piège des `<input type="date">` documenté dans `CLAUDE.md` §6, déjà rencontré sur `NewsFormDialog`. Cibles tactiles `h-11` au site d'appel, y compris sur desktop (même raison qu'au § « Cibles tactiles » de `specs/web-empty-state.md`).
- **Un quatrième champ à placer, sans aucune référence visuelle** *(amendement du 2026-09-17 (2))* : **« Cotisation (€) »** (§2.7, AC-WS-35). Points fermes, à ne pas contredire : il est **facultatif** ; il est saisi **en euros** et converti en centimes par le ViewModel ; **il n'est jamais pré-rempli à `0`** — un champ vide signifie « tarif non fixé », un `0` signifie « gratuit », et confondre les deux casse le calcul de règlement de `web-memberships`. Son **placement exact dans le dialogue** relève de designer-agent (proposition de la section « UI design » : sous la paire `DÉBUT`/`FIN`). Signaler à la développeuse que ce champ ne vient d'aucune maquette.
- **Rien n'est décidé sur la liste** *(amendement)* : le tableau reste à **quatre colonnes**, aucune colonne de montant n'y est ajoutée (AC-WS-35, PO-WS-12). Si designer-agent estime qu'une saison **sans tarif** doit être repérable depuis la liste, c'est à poser à la développeuse, pas à trancher en silence.
- Le cas d'erreur le plus fréquent de cet écran est le **chevauchement de dates**, dont le message existe déjà en variante `inline` : il doit s'afficher **dans le dialogue, sans le fermer ni vider les champs** (AC-WS-23). Ce n'est pas un cas rare à traiter en dernier, c'est le parcours d'échec principal.
- Aucun nom de personne de la maquette ne doit être repris (AC-WS-19), et aucun compteur, badge numérique ou bloc « ALERTE » ne doit être introduit (reconduction d'AC-WE-13).
- **PO-WS-01 est le seul point ouvert de la première tranche qui touche la mise en page** : les libellés des trois états de statut. Il ne bloque pas la conception — un repli lisible se pose trivialement — mais il doit être posé à la développeuse au moment du rendu plutôt que tranché en silence. **L'amendement en ajoute deux**, PO-WS-10 (granularité du tarif : un seul montant par saison, aucune dérogation possible aujourd'hui) et PO-WS-12 (montant affiché ou non dans la liste) — non bloquants eux non plus.

## UI design

> **Amendement du 2026-09-17 (2) — section à réconcilier sur un point, et un seul.** Cette section a été rédigée **avant** l'ajout de `cotisation_amount_cents` (§2.7). Le `SeasonFormDialog` décrit ci-dessous portait **trois** champs ; il en porte désormais **quatre**, le quatrième étant « Cotisation (€) » — **facultatif**, saisi en euros, **jamais pré-rempli à `0`** (AC-WS-35), et **sans aucune référence visuelle** (la maquette ne montre aucun dialogue, §0). Une proposition de placement et de forme est écrite ci-dessous au point 3 des « Champs » ; le placement définitif relève de designer-agent. Le **tableau de la liste n'est pas touché** : quatre colonnes, aucun montant (PO-WS-12). Le reste de la section est inchangé.
>
> *Statut d'origine, conservé pour mémoire :* la section a été rédigée à partir de l'export lu directement et des patrons déjà construits dans ce backoffice.

### Sources utilisées, par ordre de priorité effectif

1. **`docs/designs/DESIGN_LINKS.md` §2** — aucune ligne n'existait pour `web-seasons`. Ligne pré-rédigée par l'agent PO au §0 de cette spec, recopiée telle quelle par le présent agent avec ses deux notes explicatives (troncature de l'export, absence de boîte de dialogue) — même mécanique que `menu`, `actus`, `player-vote`, `web-empty-state` et `web-actus` : statut **`instantané seul`**, aucun lien artifact demandé, ni maintenant ni à une passe ultérieure. Voir « Registre » ci-dessous.
2. **`docs/designs/desktop/seasons/[Admin] Web - Seasons - 1.png`**, lu directement. Confirme factuellement §0 de cette spec : titre « Saisons », bouton primaire vert plein « + Nouvelle saison » aligné à droite, tableau à quatre colonnes `LIBELLÉ` / `DÉBUT` / `FIN` / `STATUT`, une ligne pleinement lisible (`2025-2026` / `2025-09-01` / `2026-06-30` / badge vert « En cours »), une icône crayon en bout de ligne dans un bouton circulaire sombre, et une deuxième ligne coupée par une bande blanche de troncature juste sous la première — seul le haut de `2024-2025` et le début d'un mot commençant par « P » en dépassent, sans qu'aucune couleur de badge ne soit lisible dessus. Aucune boîte de dialogue visible.
3. **`docs/designs/desktop/actus/[Admin] Web - Actus-{2,3}.png`** et la section « UI design » de `specs/web-actus.md`, pour le patron de dialogue de formulaire déjà construit et déjà en production dans ce même backoffice (`NewsFormDialog.tsx`) — repris ci-dessous plutôt que redessiné, conformément à la note du §7 de cette spec.
4. **`docs/designs/desktop/connexion & empty state/[Admin] Web - Dashboard-{1,2,3}.png`** et la section « UI design » de `specs/web-empty-state.md`, pour la coquille déjà construite (barre supérieure sticky, navigation latérale à 6 entrées dont « Saisons », en-tête générique) dans laquelle cette feature s'insère sans la redessiner.
5. `wireframes-basiques-as-caribbean.md` — non consulté comme référence de mise en page, même raison que pour `web-actus` et `web-empty-state` : écran desktop à table de données, sans équivalent visuel côté mobile. Seul un principe conceptuel en est repris, déjà cité par le §7 de cette spec : une carte/un contrôle disparaît plutôt que d'apparaître désactivé.
6. Code déjà construit, lu et réutilisé sans être redessiné : `presentation/features/backoffice/news/components/{NewsFormDialog,NewsTable,NewsStatusBadge}.tsx`, `presentation/features/convocation/components/StatusBadge.tsx` (patron badge neutre « Clôturée »), `presentation/features/profile/components/{MembershipStatusBadge,DocumentStatusBadge}.tsx` (patron badge ambre « pending »), `presentation/features/backoffice/components/BackofficeEmptyState.tsx`, `presentation/features/backoffice/backoffice-nav.ts` (entrée `seasons`, icône `IconCalendarStats`, `emptyStateTitle` déjà écrit), `presentation/features/backoffice/seasons/BackofficeSeasonsPage.tsx` (le stub que cette passe remplace), `presentation/shared/formatters/date-input.ts`, `presentation/shared/query-keys.ts`, `presentation/styles/global.css` (jetons `coach-green`, `coach-red`, `coach-amber`), `domain/entities/season.ts`, `domain/policies/season-scope.ts`. **Les trois primitives shadcn nécessaires (`dialog.tsx`, `table.tsx`, `skeleton.tsx`) sont déjà vendues** (commit « add shadcn dialog, table, skeleton and textarea primitives ») — contrairement à `web-actus`, rien à ajouter via `npx shadcn add` pour cette passe.
7. `specs/web-seasons.md` §3 (RBAC), §5 (critères d'acceptation) et §7 (note pour designer-agent) — autoritaires sur ce qui doit apparaître ou non ; appliqués ci-dessous, pas rediscutés.

### Registre (`docs/designs/DESIGN_LINKS.md`)

Ligne ajoutée au §2 du registre par le présent agent, reprenant telle quelle la formulation pré-rédigée par l'agent PO au §0 de cette spec (l'agent PO ne pouvant écrire que dans `specs/`, PO-WS-08) :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| web-seasons — **backoffice desktop : gestion des saisons** (`[Admin] Web - Seasons - 1`) | — aucun lien fourni | 2026-09-17 | `docs/designs/desktop/seasons/[Admin] Web - Seasons - 1.png` | **instantané seul** |

Avec les deux notes déjà rédigées au §0 : (a) export tronqué, deuxième ligne à moitié illisible, aucune ligne suivante visible ; (b) aucune boîte de dialogue illustrée — le formulaire de création/modification n'a donc aucune référence visuelle, d'où le recours au patron `NewsFormDialog.tsx` ci-dessous plutôt qu'à une nouvelle convention.

### Où ça vit

Troisième entrée de la navigation latérale du backoffice déjà prévue (« Saisons », `/admin/seasons`, `IconCalendarStats`, `backoffice-nav.ts`) — **aucune nouvelle destination**, aucun nouvel écran hors des 4 destinations de navigation mobile puisque ce backoffice desktop n'en fait de toute façon pas partie (§ « Sur la surface desktop », déjà tranché, non rouvert ici). Cette passe **remplace** le rendu de `BackofficeSeasonsPage.tsx`, qui affiche aujourd'hui inconditionnellement `BackofficeEmptyState` avec un commentaire citant PO-WE-10 comme motif de non-construction (commentaire à retirer avec le reste du stub) — et répond du même geste à PO-WE-10 pour cette entrée précise (§1 de cette spec).

**Ce qui ne change pas, réutilisé tel quel** : `BackofficeDashboardLayout` continue d'envelopper la page (barre supérieure sticky, navigation latérale à 6 entrées, en-tête générique « Bonjour, {prénom} »). Le bloc titre « Saisons » + bouton « + Nouvelle saison » est un nouveau bloc propre à cette page, rendu par `BackofficeSeasonsPage` à l'intérieur de l'`<Outlet/>`, sous l'en-tête générique existant — même construction que le bloc « Actus » + « + Nouvelle actu » de `web-actus`.

### Ce qui change par rôle

Reprend le §3 (RBAC) de cette spec, rien de redéfini ici :

| Rôle | Atteint `/admin/seasons` | Voit « + Nouvelle saison » et l'icône crayon par ligne modifiable |
|---|---|---|
| **Administrateur** (`can(user, 'backoffice:access')`) | ✅ (seul rôle qui franchit la porte du backoffice) | ✅ si `can(user, 'season:write')` — aujourd'hui toujours vrai pour un administrateur |
| Les 7 autres rôles (y compris Responsable de section) | ❌ — bloqués en amont par `RequireBackofficeAccess` (PO-WE-01) | Sans objet, l'écran n'est jamais atteint |

**Point à ne pas sauter, même si les deux populations coïncident aujourd'hui** (repris du §3) : `'season:write'` est une action **distincte** de `'backoffice:access'` et surtout distincte de `'section:manage'` — un Responsable de section ne doit voir apparaître ni le bouton ni le crayon, même le jour où PO-WE-01 élargirait `backoffice:access`. Le ViewModel calcule `canWrite = can(user, 'season:write')` séparément de l'accès à la route ; la Page ne conditionne que sur ce booléen, jamais sur le seul fait d'avoir atteint l'écran.

**La ligne « quelles saisons sont modifiables » n'est pas un second niveau de RBAC** (§3, « La règle "saison terminée non modifiable" n'est pas une règle RBAC ») : c'est un état par ligne, indépendant du rôle, qui déclenche la disparition du crayon sur ce composant-ci uniquement (voir le tableau `NewsTable` ci-dessous). Le front n'étant pas la sécurité, la règle réelle vit dans la clause RLS `update` (§2.5) — l'interface ne fait que refléter le même prédicat côté lecture (AC-WS-12).

### Écran — liste (`/admin/seasons`)

Reprend l'arrière-plan de la maquette §0.

**Bloc de titre**, au-dessus du tableau, dans l'`<Outlet/>` :
- `h2` « Saisons » (même gabarit que le `h2` « Actus » de `web-actus`, niveau de titre inférieur au `h1` « Bonjour, {prénom} » de l'en-tête générique).
- Bouton primaire « + Nouvelle saison », `h-11`, `rounded-full`, `bg-coach-green`, aligné à droite — même traitement que « + Nouvelle actu ». Ouvre le dialogue de création. **Rendu uniquement si `canWrite`**, jamais grisé.

**Tableau**, quatre colonnes dans l'ordre de la maquette — `LIBELLÉ`, `DÉBUT`, `FIN`, `STATUT` — plus une colonne d'action (icône crayon) sans en-tête visible (`sr-only`), même structure que `NewsTable.tsx` :

- **Primitive** : `table.tsx`, déjà vendue (§ Sources ci-dessus) — pas de `<table>` fait main.
- **En-tête de colonnes collant** : `sticky top-16 z-10 bg-background` sur chaque `<th>` (pas sur `<thead>`, piège déjà documenté et corrigé dans `NewsTable.tsx`), sous la barre supérieure déjà `sticky top-0`.
- **`LIBELLÉ`** : `font-semibold`, comme la maquette (`2025-2026`).
- **`DÉBUT` / `FIN`** : `toDateInputValue` (`presentation/shared/formatters/date-input.ts`), format `AAAA-MM-JJ` — même formateur que `web-actus`, aucun second formatage de date (AC-WS-17).
- **`STATUT`** : voir composant dédié ci-dessous.
- **Aucune colonne de montant** *(amendement du 2026-09-17 (2))* : `cotisation_amount_cents` existe désormais (§2.7) mais **n'est pas rendue dans la liste** — quatre colonnes, inchangées (AC-WS-35, PO-WS-12).
- **Colonne d'action** : icône crayon (`IconPencil`), bouton `variant="ghost"` `size="icon"`, cible tactile `h-11 w-11` (override, pas le `size-8` par défaut), `aria-label="Modifier la saison « {libellé} »"`. **Rendu uniquement si `canWrite` ET si la saison n'est pas terminée** (le prédicat d'état d'AC-WS-12, calculé par le ViewModel — jamais recalculé en ligne dans le composant, AC-WS-18) : sur une ligne terminée, la cellule d'action est simplement **vide**, le crayon **ne se rend pas** — pas de variante grisée/`disabled`, même principe que le crayon absent sur une actu archivée dans `NewsTable.tsx`.
- **Aucune icône corbeille, aucun menu contextuel, nulle part** : `NewsTable` a une colonne d'action à deux icônes (crayon + corbeille) ; celle des saisons n'en a qu'une, structurellement — pas de composant `ArchiveSeasonDialog` équivalent à `ArchiveNewsDialog`, puisqu'aucune suppression ni archivage n'existe pour cette ressource (§1, PO-WS-06, AC-WS-21).
- **Ordre des lignes** : non déterminable depuis la maquette tronquée (PO-WS-09, non bloquant) — antéchronologique par `start_date` (saison la plus récente en tête) est l'hypothèse retenue par le PO et cohérente avec la seule paire de lignes lisible (`2025-2026` au-dessus de `2024-2025`) ; pas une décision de cet agent à trancher différemment.

### Nouveau composant — `SeasonStatusBadge`

Justifié comme `NewsStatusBadge` l'a été pour `web-actus` : aucune primitive existante ne rend un badge à **trois** valeurs dérivées d'un prédicat pur, mais le patron est déjà en place deux fois dans ce dépôt et n'a besoin que d'être étendu, pas réinventé.

- Entrée : le résultat déjà calculé par le nouveau prédicat d'état d'AC-WS-12 (`'ended' | 'current' | 'upcoming'`, ou équivalent) — jamais un second calcul de dates dans le composant.
- **En cours** → badge vert, texte « En cours » — seule valeur illustrée par la maquette (§0) ; mêmes classes que `StatusBadge.open`/`NewsStatusBadge.visible=true` (`border-coach-green/35 bg-coach-green/15 text-coach-green-text`).
- **Terminée** → badge neutre, texte « Terminée » — ni positif ni négatif, un état qui décrit une fin de période, pas un échec. Réutilise le traitement déjà défini pour « Clôturée » dans `StatusBadge.tsx` (`border-white/15 bg-white/10 text-white/70`) plutôt que le rouge : le rouge de ce dépôt est réservé aux états annulés/rejetés (`StatusBadge.cancelled`, `DocumentStatusBadge.rejected`), pas aux états simplement passés.
- **À venir** → badge ambre, texte « À venir ». Réutilise le traitement déjà défini pour l'état « en attente » (`MembershipStatusBadge.pending`, `DocumentStatusBadge.pending_validation`, `border-coach-amber/35 bg-coach-amber/15 text-coach-amber`) : une saison à venir n'est ni un succès ni un échec, elle est **en attente de démarrer** — c'est exactement la sémantique déjà portée par ce jeton ailleurs dans l'app, et il n'est actuellement utilisé nulle part dans ce backoffice.
- **Aucune quatrième valeur**, et le statut n'est jamais porté par la seule couleur : le texte accompagne systématiquement le badge (AC-WS-29), pas d'icône seule.

**PO-WS-01, non bloquant pour construire, à confirmer avant de figer l'écran** : les trois libellés ci-dessus (« Terminée », « En cours », « À venir ») reprennent mot pour mot le tableau d'états du §2.2 de cette spec plutôt que d'inventer une formulation propre à l'UI — c'est le repli le plus défendable en l'absence de référence visuelle pour les états « terminée » et « à venir », mais ni les trois libellés ni les deux couleurs proposées (« Terminée » en neutre, « À venir » en ambre) n'ont de confirmation visuelle : la maquette ne montre que « En cours » en vert, et le fragment « P » de la deuxième ligne pourrait tout aussi bien correspondre à un libellé différent de « Terminée » (« Passée », « Précédente »…) avec une autre couleur. À poser à la développeuse/au Bureau au moment du rendu, pas tranché en silence au-delà de ce repli.

### Nouveau composant — dialogue de création/modification (`SeasonFormDialog`)

Justifié : même absence de référence visuelle que pour `NewsFormDialog` en son temps (§0), mais un patron directement analogue existe déjà et fonctionne en production dans ce même backoffice — il est repris ici plutôt que réinventé, conformément à la note du §7 de cette spec. **Un seul composant, paramétré par un mode** (`create` | `edit`), pas deux dialogues dupliqués :

| Paramètre | Mode création | Mode modification |
|---|---|---|
| Titre du dialogue | « Créer une saison » | « Modifier la saison » |
| Valeurs initiales | Champs vides | Pré-remplies depuis la ligne sélectionnée (`label`, `startDate` → `toDateInputValue`, `endDate` → idem, **`cotisationAmountCents` → euros, ou champ vide si `null`**) — AC-WS-24, AC-WS-35 |
| Bouton de validation | « Créer » | « Enregistrer » |
| Use case appelé à la soumission | `CreateSeasonUseCase` | `UpdateSeasonUseCase` (même ligne, jamais un doublon) |
| Accessible depuis | Bouton « + Nouvelle saison » | Icône crayon d'une ligne non terminée — jamais atteignable depuis une ligne terminée, le déclencheur lui-même ne se rend pas (voir ci-dessus) |

**Champs** :

1. **`LIBELLÉ`** — `Label` + `Input` `h-11 rounded-xl`, pleine largeur, placeholder « Ex. 2026-2027 », `required`. Un champ texte simple, comme `TITRE` dans `NewsFormDialog` — **pas** deux champs d'année séparés ni de dérivation automatique depuis les dates : ce choix précis (texte libre validé contre le type `SeasonLabel` vs. dérivation, PO-WS-02) reste ouvert et n'est pas tranché par cette section, qui ne fixe que l'empreinte visuelle (un seul champ, une seule ligne) — identique dans les deux cas envisagés par PO-WS-02.
2. **`DÉBUT` / `FIN`**, **côte à côte sur une même rangée** (`grid grid-cols-2 gap-3`) — contrairement à `NewsFormDialog`, où `DATE`/`DATE D'EXPIRATION` sont empilés parce qu'ils ne forment pas une paire naturelle ; ici `DÉBUT` et `FIN` sont la paire de colonnes adjacentes de la maquette liste elle-même, et les regrouper visuellement dans le formulaire reflète cette relation. **Obligatoire à ce site d'appel, CLAUDE.md §6** : chaque `Input type="date"` reçoit `min-w-0` sur son élément de grille (les deux grid items, pas seulement celui de droite) — un `<input type="date">` a un plancher de largeur intrinsèque lié à sa valeur segmentée (jj/mm/aaaa), et sans `min-w-0` un des deux champs chevauchera l'autre sur une largeur de dialogue étroite, y compris en desktop (une fenêtre redimensionnée ou une fenêtre de navigateur non maximisée réduit la largeur du dialogue). Cible tactile `h-11` sur chacun, même si la surface est desktop (même raison que `NewsFormDialog`). Vérifier au viewport réel du dialogue, pas seulement sur une capture large.
   - **`DÉBUT`** — `Label` + `Input type="date"` `h-11 rounded-xl min-w-0`, `required`.
   - **`FIN`** — `Label` + `Input type="date"` `h-11 rounded-xl min-w-0`, `required`.
3. **`COTISATION (€)`** — *champ ajouté par l'amendement du 2026-09-17 (2) (§2.7, AC-WS-35), **aucune référence visuelle** : proposition, placement à confirmer par designer-agent.* `Label` + `Input type="number" step="1" min="0" inputMode="decimal"` `h-11 rounded-xl`, pleine largeur, suffixe visuel `€`, **jamais `required`** — une saison peut être créée avant que le tarif ne soit voté (§2.7). Placé **sous** la paire `DÉBUT`/`FIN` (dernier champ du formulaire) : c'est le seul champ facultatif et le seul qui ne relève pas de l'identité temporelle de la saison. **Champ laissé vide quand `cotisationAmountCents` vaut `null`, jamais pré-rempli à `0`** — `0` signifie « gratuit » et `null` « tarif non fixé », deux états que `web-memberships` distingue (§2.7). Saisi **en euros**, converti en centimes par le ViewModel avant l'appel au use case — jamais un flottant transmis au domaine ni écrit en base (même règle que `specs/web-memberships.md` §2.2). Un texte d'aide bref sous le champ (`text-xs text-muted-foreground`), du type « Montant de référence appliqué aux adhésions de cette saison », est **proposé** pour que l'administrateur comprenne qu'il écrit une valeur consommée ailleurs (§2.7, AC-WS-36) — formulation exacte à la main de designer-agent.

**Pied de dialogue** : deux boutons alignés à droite, `Annuler` (`variant="outline"`, `h-11`, `rounded-full`), `Créer`/`Enregistrer` (`h-11`, `rounded-full`, `bg-coach-green`) — même traitement que `NewsFormDialog`. `Annuler` ferme sans appeler de use case ; le bouton de validation est `type="submit"` d'un `<form>` englobant (soumission au clavier depuis n'importe quel champ, AC-WS-29).

### États du dialogue

| État | Rendu |
|---|---|
| Soumission en cours | Les champs (quatre depuis l'amendement) et les deux boutons passent `disabled` ; le bouton de validation affiche « Création… » / « Enregistrement… » — même mécanique que `NewsFormDialog`/`BackofficeLoginPage` |
| **Échec par chevauchement de dates (cas le plus fréquent, §7 de cette spec)** | Le dialogue **reste ouvert**, les champs **conservent leur saisie** ; un `Alert`/`AlertDescription` (`variant="destructive"`) apparaît en haut du formulaire avec le message **déjà existant et déjà testé** « Les dates de cette saison chevauchent une saison existante. » (`OverlappingSeasonError` → `mapDomainErrorToUiError`, variante `inline`) — aucun nouveau texte à écrire pour ce cas (AC-WS-16, AC-WS-23) |
| Échec par `start_date > end_date` (validation domaine avant tout appel réseau, AC-WS-10) | Même emplacement d'`Alert`, dialogue conservé et champs préservés — mais **le texte du message n'est pas encore écrit** dans `mapDomainErrorToUiError` à ce jour (seul le message de chevauchement existe) : signalé ici comme une pièce manquante à produire lors de la construction, pas une question de mise en page |
| **Échec par montant invalide** (non entier ou négatif — validation domaine, AC-WS-34) *(amendement du 2026-09-17 (2))* | Même emplacement d'`Alert`, dialogue conservé et champs préservés. **Même réserve que la ligne précédente** : le message d'interface correspondant reste à écrire dans `mapDomainErrorToUiError` — pièce manquante à ne pas découvrir en recette |
| Libellé vide ou date manquante | Empêché nativement par `required` avant même la soumission (comportement natif du navigateur sur le `<form>`) ; si un cas y échappe malgré tout, même emplacement d'`Alert` que ci-dessus. **Le champ « Cotisation (€) » n'est pas `required`** : le laisser vide est un cas normal, jamais une erreur |
| Succès | Le dialogue se ferme ; la liste reflète le changement sans rechargement manuel — invalidation de la `queryKey` centralisée (AC-WS-22). **Point propre à cette feature, absent de `web-actus`** : si la saison modifiée est la saison en cours, l'invalidation doit couvrir **aussi** la clé qui sert `findCurrent()` (si elle est mise en cache), pas seulement celle de la liste admin — une bascule des bornes de la saison en cours change ce que `current_season()` renvoie pour tous les tableaux de bord coach (§4). *(Amendement : une modification du **montant** a un effet du même ordre sur les écrans de `web-memberships`, qui lisent la saison — l'invalidation côté `/admin/memberships` relève de cette spec-là, pas de celle-ci.)* |

### États de l'écran liste

| État | Rendu |
|---|---|
| Chargement initial (`findAll()` en cours) | Lignes de squelette (`skeleton.tsx`, déjà vendu), pas un tableau vide ni un spinner plein écran — jamais un flash de liste vide (AC-WS-23) |
| Erreur de chargement | `Alert` `variant="destructive"` au-dessus du tableau, message français traduit d'une `DomainError`, jamais un message brut Supabase |
| **Liste vide (0 ligne)** — cas normal au démarrage du club, jamais une erreur (AC-WS-23) | Réutilise `BackofficeEmptyState` telle quelle, avec le libellé déjà écrit dans `backoffice-nav.ts` pour l'entrée `seasons` : « Aucune saison à afficher pour l'instant ». Le bloc titre (« Saisons » + bouton « + Nouvelle saison ») reste rendu au-dessus, **y compris dans cet état** — c'est le seul moyen pour un administrateur de créer la toute première saison du club, exactement comme le bouton « + Nouvelle actu » reste visible au-dessus d'un `BackofficeEmptyState` sur `/admin/news` |

### Composants shadcn mobilisés

| Élément visuel | Primitive | Déjà vendue ? |
|---|---|---|
| Tableau de la liste | `table.tsx` | Oui |
| Dialogue création/modification | `dialog.tsx` | Oui |
| Lignes de chargement | `skeleton.tsx` | Oui |
| Champs Libellé/Début/Fin **et Cotisation**, boutons | `input.tsx`, `label.tsx`, `button.tsx` | Oui |
| Badge de statut | `badge.tsx` | Oui |
| Message d'erreur (liste et dialogue) | `alert.tsx` | Oui |

Aucune primitive à ajouter pour cette passe (§ Sources, point 6) — différence notable avec `web-actus`, où `dialog`/`table`/`skeleton` restaient à vendre. *(L'amendement du 2026-09-17 (2) n'en ajoute aucune non plus : le champ « Cotisation (€) » est un `input.tsx` de plus.)*

### Questions UI — récapitulatif, non bloquantes pour construire

- **PO-WS-01** (seule question de la première tranche qui touche la mise en page, §7) — libellés et couleurs des trois états de statut : repli proposé ci-dessus (« Terminée » neutre / « En cours » vert confirmé / « À venir » ambre), à confirmer avant de figer l'écran.
- **PO-WS-02** — saisie du `LIBELLÉ` (texte libre validé vs. dérivé des dates) : sans effet sur l'empreinte visuelle retenue ici (un seul champ, une seule ligne), donc non traité plus avant par cette section.
- **PO-WS-10 / PO-WS-12** *(amendement du 2026-09-17 (2))* — le champ « Cotisation (€) » n'a **aucune référence visuelle** : son placement (proposé en dernier champ du dialogue) et l'opportunité d'une colonne de montant dans la liste (**non ajoutée** ici) restent à confirmer avec la développeuse. Rappel ferme quel que soit l'arbitrage : champ **facultatif**, **jamais pré-rempli à `0`**.
- Un message d'interface reste à écrire pour le cas `start_date > end_date` (AC-WS-10) **et pour le cas d'un montant invalide** (AC-WS-34) — `mapDomainErrorToUiError` n'a aujourd'hui de variante que pour le chevauchement. Pas une question de conception, mais deux textes manquants à ne pas découvrir en recette.
