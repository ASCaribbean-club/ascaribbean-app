# Spec — Backoffice web : adhésions et cotisations (`web-memberships`)

> Statut : **première tranche d'écriture sur `public.memberships`**, et **première ressource financière du dépôt**. La table `memberships` existe depuis la migration initiale mais son commentaire dit littéralement « No repository exists yet for this entity […] RLS here is a best-effort self-row guess **pending a real spec** » — cette spec est ce « real spec ». Une **table enfant de paiements reste entièrement à créer** : rien dans le dépôt ne stocke aujourd'hui un montant, ni dû, ni encaissé.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (module P0 « Adhérents et licences », module **P1 « Cotisations »**, matrice RBAC lignes « Voir le statut de cotisation » / « Gérer échéanciers et relances », exigences transversales §11.3 — **« modification paiement »**), `docs/roles-personas-as-caribbean.md` (rôles Trésorier, Dirigeant habilité, Administrateur), `docs/RETENTION_PURGE.md` (ligne « Données financières (cotisations, section 4 du CDC) »), `specs/web-empty-state.md` (coquille backoffice, `backoffice:access`, AC-WE-13, **PO-WE-01**, **PO-WE-11**), `specs/web-actus.md` (patron de console d'écriture backoffice), `specs/web-seasons.md` (prédicat d'état de saison à trois valeurs, patron `season:write`), `specs/section-and-teams.md` (patron de liste filtrable, colonne dérivée, `not null` posé a posteriori), `specs/profile-page.md` (lecture mobile de l'adhésion), `CLAUDE.md` §3/§4/§5/§6/§7/§9.
> État du code lu : `supabase/migrations/{20260811171754_initial_schema,20260818120000_team_active_headcount_view}.sql`, `domain/entities/membership.ts`, `domain/rules/membership-rules.ts`, `domain/repositories/membership-repository.ts`, `domain/usecases/profile/GetProfileMembershipUseCase.ts`, `domain/policies/{actions,rbac-matrix,can,season-scope}.ts`, `data/repositories/MembershipRepositoryImpl.ts`, `presentation/features/profile/components/MembershipStatusBadge.tsx`, `presentation/features/backoffice/backoffice-nav.ts`, `presentation/shared/query-keys.ts`.
> Maquettes : `docs/designs/desktop/membership/[Admin] Web - Membership - {1,2}.png` **et `[Admin] Web - Membership - payment{,-1}.png`** (ces deux dernières ajoutées au dépôt le 2026-09-17), **toutes lues directement**. Voir §0.

> **Amendement du 2026-09-17.** Deux nouvelles maquettes (`payment`, `payment-1`) ont été lues. Elles **résolvent PO-WM-01** — le montant dû vit sur la ligne d'adhésion, saisi via un champ « Cotisation totale (€) » (§2.1) —, **illustrent enfin le dialogue de paiement** (§1), et montrent une **édition dans une ligne de tableau dépliable** au lieu d'un dialogue de modification (§1, §7 : information neuve laissée à designer-agent). S'y ajoute une **règle métier posée par la développeuse**, dérivable d'aucune maquette : le statut `active` exige une licence renseignée **et** une cotisation soldée (§2.4, AC-WM-35, AC-WM-36). Le reste de la spec est inchangé ; les points ouverts PO-WM-03, PO-WM-05, PO-WM-08 et PO-WM-09 restent entiers.

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Une ligne existe désormais au §2 du registre pour `web-memberships`**, au statut **`instantané seul`** — elle a été recopiée depuis cette section après la première rédaction de cette spec (la rédaction initiale disait « aucune ligne n'existe »). Conformément au §4 du registre, ce statut signifie « utiliser l'instantané local versionné et **ne pas demander de lien artifact** ». **Aucun lien n'est donc demandé ici, ni maintenant ni lors d'une passe ultérieure.**

**Ce qui reste à faire sur le registre** : la ligne inscrite ne cite que les deux exports `{1,2}`, alors que **deux exports supplémentaires ont été ajoutés au dépôt le 2026-09-17** (`[Admin] Web - Membership - payment.png`, `[Admin] Web - Membership - payment-1.png`), lus directement dans cette passe d'amendement. L'agent PO ne pouvant écrire que dans `specs/`, la ligne **à jour est pré-rédigée ci-dessous, à recopier telle quelle** en remplacement de l'existante par le premier agent ou la développeuse ayant les droits d'écriture sur `docs/` (PO-WM-11) :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| web-memberships — **backoffice desktop : adhésions et cotisations** (`[Admin] Web - Membership - {1,2,payment,payment-1}`) | — aucun lien fourni | 2026-09-17 | `docs/designs/desktop/membership/[Admin] Web - Membership - {1,2}.png`, `… - payment.png`, `… - payment-1.png` | **instantané seul** |

> Note à joindre à la ligne : **les quatre exports ne sont pas quatre écrans mais un seul écran et trois de ses états** (même famille de cas que `web-actus` et `section-and-teams`) — l'export 1 = la liste seule, filtre de saison positionné sur `2025-2026 (en cours)` ; l'export 2 = la même liste, filtre positionné sur « Toutes les saisons », recouverte par le dialogue « Nouvelle adhésion » ; **`payment`** = la même liste recouverte par le dialogue « Enregistrer un paiement » ; **`payment-1`** = la même liste, **première ligne dépliée en édition dans le tableau**. Deux points à ne pas manquer en relisant : (a) **le dialogue de paiement, absent des deux premiers exports, est illustré par `payment`** — la réserve initiale de cette spec (« aucun dialogue de paiement n'est illustré ») est **levée** ; (b) **aucun contrôle d'archivage ni de suppression n'apparaît sur aucun des quatre exports**, alors que la demande de la développeuse en prévoit un — voir §1 et PO-WM-05.

## 1. Périmètre

### Ce que c'est

Le **chemin d'écriture sur `public.memberships`** (l'adhésion d'un membre pour une saison : licence, statut, validité, **montant dû**), rendu dans le backoffice web desktop sur la destination **déjà prévue** `/admin/memberships` (« Adhésions », `backoffice-nav.ts`, `IconCreditCard`), **plus le suivi du paiement échelonné de la cotisation attachée à cette adhésion** — lequel suppose une **ressource enfant qui n'existe pas encore en base**.

Cette tranche remplace le stub de `/admin/memberships` (qui rend aujourd'hui `BackofficeEmptyState` inconditionnellement) et **répond à PO-WE-10 pour l'entrée « Adhésions »**. Elle répond aussi **partiellement à PO-WE-11** : le badge numérique de la seule entrée « Adhésions » entre au périmètre ; celui de « Utilisateurs » et les deux blocs « ALERTE » restent hors périmètre (AC-WE-13 reconduit).

### Rattachement CDC — deux modules, deux priorités

C'est la première feature du backoffice qui **chevauche deux modules de priorités différentes**, et ça compte pour l'arbitrage de contenu :

| Élément | Module CDC | Priorité |
|---|---|---|
| Adhésion : dossier, statut, numéro de licence, validité | **Adhérents et licences** — « Dossiers, statuts, pièces » | **P0** |
| Cotisation : montant dû, paiements successifs, état payé/partiel/non payé | **Cotisations** — « Tarification, échéancier, relance, export — **sans encaissement en ligne** (7.2) » | **P1** |
| Rôles nommés par le CDC | Dirigeant habilité (adhérents, licences, paiements) ; Trésorier (cotisations, échéanciers) ; Administrateur (paramétrage) | — |
| Surface backoffice | Non — le backoffice est une **surface de rendu**, pas un module (`specs/web-empty-state.md` §1) | — |

**Conséquence à énoncer d'entrée** : le bouton « + Paiement » **enregistre un paiement déjà reçu hors application** (espèces, chèque, virement). Il n'encaisse rien. Le « Paiement en ligne intégré » est explicitement **P2 / différé** dans le CDC, et « sans encaissement en ligne » est écrit noir sur blanc dans la ligne P1 « Cotisations ». Aucun prestataire de paiement, aucun formulaire de carte, aucun webhook ne doit apparaître dans cette tranche.

### Ce que les maquettes montrent, factuellement

Titre de page « **Adhésions** », dans la coquille backoffice déjà construite, avec une **ligne d'explication sous le titre** : « Un renouvellement crée toujours une nouvelle ligne — l'historique par saison est conservé. » Bouton primaire **« + Nouvelle adhésion »** en haut à droite.

**Trois filtres** en ligne, sous le titre : **saison** (`2025-2026 (en cours)` dans l'export 1, `Toutes les saisons` dans l'export 2), **statut** (`Tous les statuts`), **cotisation** (`Toute cotisation`).

**Tableau à sept colonnes** : `UTILISATEUR`, `SAISON`, `LICENCE`, `STATUT`, `VALIDE JUSQU'AU`, `COTISATION`, `ACTIONS`. Quatre lignes, toutes sur la saison `2025-2026` et toutes avec `VALIDE JUSQU'AU` = `2026-06-30` :

| # | `LICENCE` | `STATUT` | `COTISATION` |
|---|---|---|---|
| 1 | *(vide)* | **En attente** (rouge/orange) | `0€ / 300€`, barre de progression vide, texte rouge |
| 2 | `FR-88104` | **En attente** | `0€ / 300€`, barre vide, texte rouge |
| 3 | `FR-10233` | **Active** (vert) | `300€ / 300€`, barre pleine, texte vert |
| 4 | `FR-33291` | **Active** | `150€ / 300€`, barre à moitié, texte ambre |

*(Les noms des quatre lignes ne sont pas reproduits ici : `CLAUDE.md` §9 interdit tout nom de personne dans le code comme dans la documentation, y compris en exemple.)*

**Colonne `ACTIONS`**, identique sur les quatre lignes : un bouton **« + Paiement »** et une **icône dans un bouton circulaire sombre** — sur la ligne dépliée de l'export `payment-1`, cette icône est un **chevron** (voir plus bas).

**Navigation latérale** : un **badge numérique rouge « 2 » sur l'entrée « Adhésions »** (et « 1 » sur « Utilisateurs »).

**Dialogue « Nouvelle adhésion »** (export 2) — cinq champs : `UTILISATEUR` (liste déroulante « Choisir… »), `SAISON` (liste déroulante « Choisir… »), `NUMÉRO DE LICENCE` (saisie texte, exemple `Ex. FR-12345`), `STATUT` (liste déroulante « Choisir… »), `VALIDE JUSQU'AU` (champ date `jj/mm/aaaa`). Mention explicative en italique, **à considérer comme une règle métier posée par la maquette** au même titre que celles des dialogues de `section-and-teams` :

> « Un renouvellement insère toujours une nouvelle ligne (jamais de mise à jour) pour préserver l'historique par saison. »

Boutons `Annuler` / `Enregistrer`.

**Dialogue « Enregistrer un paiement »** (export `payment`, ajouté le 2026-09-17) — ouvert par-dessus la liste. **Deux champs empilés** : `MONTANT (€)` (saisie, exemple `Ex. 50`) et `DATE DU VERSEMENT` (champ date `jj/mm/aaaa`). Mention explicative en italique, elle aussi **à considérer comme une règle métier posée par la maquette** :

> « La cotisation peut être versée en plusieurs fois : ce montant s'ajoute aux versements déjà enregistrés. »

Boutons `Annuler` / `Enregistrer`. Cette mention **confirme mot pour mot** le caractère cumulatif et non écrasant des paiements posé au §2.2. Aucun champ de moyen de paiement, aucune note libre : le dialogue s'arrête à deux champs.

**Ligne dépliée en édition** (export `payment-1`, ajouté le 2026-09-17) — la première ligne du tableau est dépliée **dans le tableau lui-même**, pas dans une boîte de dialogue, et le bouton d'icône de la colonne `ACTIONS` (à droite de « + Paiement ») y est rendu en **chevron**. Le panneau déplié tient sur deux colonnes :

- **à gauche, « INFORMATIONS DU JOUEUR »** : le nom et l'adresse e-mail du compte (tous deux d'apparence non modifiable), un champ `Licence` (vide sur cette ligne), un champ date (`30/06/2026`), une liste déroulante de statut (`En attente`), et — point décisif pour cette spec — un champ **« Cotisation totale (€) »** portant la valeur **`300`** ;
- **à droite, « HISTORIQUE DES VERSEMENTS »** : la liste des versements de l'adhésion, réduite ici à « Aucun versement enregistré. », cette ligne n'en portant aucun.

Ni `UTILISATEUR` ni `SAISON` n'apparaissent comme champs à choisir dans ce panneau : ce sont l'**identité de la ligne**, pas des valeurs qu'on y modifie.

Ce que les maquettes **ne montrent toujours pas**, et qui compte autant : **aucun contrôle d'archivage ou de suppression** ; **aucune ligne au statut « Suspendue »** ; aucun échéancier, aucune relance, aucun export ; aucune pagination, aucun tri explicite, aucun état vide. **Deux manques relevés par la rédaction initiale sont en revanche comblés** par les exports `payment`/`payment-1` : le **champ de montant dû** (« Cotisation totale (€) », qui résout PO-WM-01) et le **dialogue de paiement**.

### Entre au périmètre

1. **La liste filtrable** des adhésions, avec ses sept colonnes et ses trois filtres, **filtre de saison positionné par défaut sur la saison en cours** (§2.6).
2. **La création et la modification** d'une adhésion — création par le dialogue à cinq champs (export 2), modification par les champs d'édition de la **ligne dépliée** (export `payment-1`), qui portent en outre le **montant dû** (§2.1). Le **déclencheur** de la modification (dialogue de modification ou dépliage de la ligne) est une **information neuve** à réconcilier par designer-agent (§7) — cette spec ne la tranche pas.
3. **L'enregistrement d'un paiement partiel ou total**, plusieurs fois dans le temps pour une même adhésion (§2.2), par le dialogue illustré par l'export `payment` — **et la lecture de l'historique des versements** de l'adhésion, que l'export `payment-1` rend visible sans ouvrir ce dialogue.
4. **L'archivage d'une adhésion** par une icône, en lieu et place d'une suppression (§2.5) — **demandé par la développeuse, absent des maquettes** : c'est un ajout assumé au contenu illustré, pas une lecture de la maquette.
5. **Le badge numérique de l'entrée « Adhésions »** (§2.7).
6. **La règle d'activation du statut** (`active` ⇒ licence renseignée **et** cotisation soldée, §2.4) — **posée par la développeuse**, dérivable d'aucune maquette : c'est une contrainte de validation à la création comme à la modification, plus une ligne d'explication à l'écran.

### Hors périmètre — explicitement

- **L'encaissement en ligne** (P2, et « sans encaissement en ligne » dans la ligne P1 elle-même). Aucun prestataire, aucun moyen de paiement en ligne.
- **L'échéancier et les relances** (« Tarification, échéancier, relance » — le reste du module P1 « Cotisations »). Un paiement enregistré ici porte une date de réception, **pas une date d'échéance à venir**, et aucune notification n'est déclenchée. La ligne de matrice « Gérer échéanciers et relances » sert ici à identifier le **rôle titulaire** (§3), pas à importer la fonctionnalité.
- **Les exports financiers** (ligne de matrice « Exporter des données — ✅ Trésorier (financier) ») : aucun bouton d'export, aucun CSV/PDF.
- **Le journal d'audit lui-même.** Le CDC §11.3 exige la traçabilité de la « modification paiement », **aucune infrastructure d'audit n'existe dans le dépôt** (aucune table, aucun trigger, aucun appel depuis un use case), et l'entrée de navigation « Journal d'audit » visible dans les maquettes reste hors périmètre (PO-WA-09) : **ne pas l'ajouter à `backoffice-nav.ts`**. Cette spec pose l'exigence et son emplacement (§4), elle ne construit pas le journal.
- **Les pièces justificatives et documents** (`public.documents`, module P0 « Documents et consentements ») : la colonne `LICENCE` est un numéro saisi, pas une pièce téléversée ni un statut de validation fédérale.
- **Tout affichage côté mobile.** `GetProfileMembershipUseCase`, `MembershipRepository.findForUserAndSeason()`, `memberships_select_own` et l'écran profil sont **inchangés** (AC-WM-28). En particulier, **aucun paiement n'est affiché au membre** dans cette tranche.
- **Le parcours d'invitation d'un utilisateur** (bloc ALERTE « … et 1 invitation(s) à traiter »), le badge de l'entrée « Utilisateurs », les deux blocs « ALERTE » et le champ de recherche de la barre supérieure — déjà exclus par AC-WE-13/AC-WE-15 ; le second bloc ALERTE porte de surcroît un **nom de personne** (`CLAUDE.md` §9).

## 2. Modèle et règles

### 2.1 `memberships` — les cinq champs du dialogue tiennent dans les colonnes existantes, le montant dû demande **une colonne de plus**

| Libellé maquette | Colonne | Note |
|---|---|---|
| `UTILISATEUR` | `user_id` | `not null`, `references users (id) on delete cascade` |
| `SAISON` | `season_id` | **nullable en base aujourd'hui** — voir §2.6 |
| `LICENCE` | `licence_number` | **nullable**, et la ligne 1 de la maquette le confirme (cellule vide = cas normal, pas une erreur) |
| `STATUT` | `status` | `check (status in ('pending','active','suspended'))` — voir §2.4 |
| `VALIDE JUSQU'AU` | `valid_until` | `date not null` |
| **« Cotisation totale (€) »** — montant **dû** | **`amount_due_cents`, colonne à créer** | Vit **sur la ligne d'adhésion**, saisi par l'administrateur (export `payment-1`) — **PO-WM-01 résolu**. Entier de centimes, **nullable** (le dialogue de création ne porte pas le champ) |
| `COTISATION` — montant **encaissé** | **aucune colonne** | Dérivé de la somme des paiements, **jamais stocké** — §2.2 et §2.3 |
| — | *(traçabilité)* | **aucune colonne** : ni `created_at`, ni `created_by`, ni `updated_at`, ni `updated_by` — §4 |

**Le montant dû (`/ 300€`) a désormais un endroit où vivre, et la maquette le désigne sans ambiguïté** : un champ **« Cotisation totale (€) »**, valeur `300`, saisi directement dans la ligne d'adhésion dépliée (export `payment-1`). **PO-WM-01 est donc résolu en faveur de la première des deux lectures que cette spec avait posées** : une colonne **`amount_due_cents` sur l'adhésion**, saisissable et modifiable **par adhésion**, et **non** une table de tarification par section/saison. Trois conséquences immédiates :

1. **La colonne `COTISATION`, le filtre « payé / partiel / non payé » et le badge de navigation sont calculables** : ils ne dépendent plus d'un arbitrage à venir. Les passages de cette spec qui les qualifiaient de bloqués ne le sont plus.
2. Le montant est **saisi en euros** (le libellé dit « (€) ») et **stocké en entiers de centimes**, exactement comme l'`amount_cents` des paiements (§2.2) : la conversion est un travail de ViewModel/mapper, jamais un flottant en base.
3. Un tarif **par adhésion** absorbe nativement les cas que le CDC nomme (exonération, réduction famille) sans table de tarification — mais il n'en **mémorise pas la raison** : aucun champ de motif n'apparaît dans la maquette, et aucun n'est inventé ici.

**Un écart subsiste entre les deux maquettes, et il n'est pas tranché** : le dialogue « Nouvelle adhésion » (export 2) **ne porte pas** le champ de montant, alors que la ligne dépliée (export `payment-1`) le porte. Une adhésion peut donc **naître sans montant dû**, et la colonne doit rester **nullable** — c'est exactement le cas limite « montant dû nul ou non paramétré » déjà posé au §2.3, désormais concret, et rattaché à **PO-WM-02**.

### 2.2 Les paiements sont une table enfant **append-only** — et c'est une exception explicite à `CLAUDE.md` §6

Une adhésion reçoit **plusieurs paiements successifs** (`0€ → 150€ → 300€`). C'est une relation 1-N, pas un champ « montant payé » à écraser. La mention en italique du dialogue « Enregistrer un paiement » le dit mot pour mot : « ce montant **s'ajoute** aux versements déjà enregistrés » (§1).

**Point de conception à ne surtout pas confondre avec le patron existant du dépôt** : `CLAUDE.md` §6 impose « upsert-on-conflict, not insert-and-grow » pour toute table d'**état courant** (`ConvocationResponse`, `AttendanceRecord`), qui sont « last-value-wins ». **Un paiement est l'inverse exact** : c'est un **fait daté et cumulatif**, un journal, pas un état courant. Écraser une ligne de paiement détruirait l'historique comptable que `RETENTION_PURGE.md` impose de conserver. Donc : **insertion d'une nouvelle ligne à chaque paiement, jamais d'upsert, jamais de `on conflict`**, et **aucune politique `update` ni `delete` dans cette passe** (AC-WM-06). Le corollaire — comment corriger un paiement saisi de travers — est un vrai trou, traité en PO-WM-04.

Forme minimale de la table enfant, telle qu'elle découle de ce qui précède (colonnes au-delà de cette liste : PO-WM-04) :

- `id`, `membership_id` (référence l'adhésion), `amount_cents`, `paid_at` (date de réception du paiement, le `DATE DU VERSEMENT` de la maquette), `recorded_by` (le compte qui a saisi), `recorded_at` (horodatage de saisie).
- **Montants en entiers de centimes, jamais en `float`.** `300€` saisi en flottant se réécrit `299,99999…` et un total qui ne tombe jamais juste sur le montant dû fausserait l'état « payé » lui-même. Le formatage `300€` est un travail de `presentation/shared/formatters/`, pas un type de colonne.
- `amount_cents` **strictement positif** : un remboursement ou un avoir n'est pas spécifié ici (PO-WM-04).

### 2.3 L'état de cotisation est **dérivé d'une somme**, jamais stocké

Même discipline que la colonne `STATUT` de `web-seasons` (dérivée des dates) et que la colonne `ÉQUIPES` de `section-and-teams` (comptage) : **aucune colonne « payé/partiel/non payé »**, aucune colonne « total encaissé ». L'état se calcule à partir de `sum(amount_cents)` des paiements de l'adhésion, comparée au **montant dû porté par l'adhésion** (`amount_due_cents`, §2.1).

| État | Condition | Rendu maquette |
|---|---|---|
| **Non payé** | somme encaissée = 0 | `0€ / 300€`, rouge, barre vide |
| **Partiel** | 0 < somme < montant dû | `150€ / 300€`, ambre, barre partielle |
| **Payé** | somme ≥ montant dû | `300€ / 300€`, vert, barre pleine |

Deux cas limites que les maquettes n'illustrent pas et que cette spec **ne tranche pas** : la **sur-perception** (somme > montant dû — « payé », mais avec quel rendu ?) et le **montant dû nul ou inconnu** (adhésion exonérée, ou adhésion créée sans montant) — PO-WM-02. **Depuis la résolution de PO-WM-01, ces deux cas ne sont plus en attente d'une source de montant** : le montant dû existe (§2.1), seul leur **rendu** reste à confirmer — et le second est rendu concret par l'écart entre le dialogue de création (sans champ de montant) et la ligne dépliée (avec champ de montant).

Trois contraintes fermes quel que soit l'arbitrage :
1. Le **prédicat est une fonction pure du domaine** (`domain/policies/` ou `domain/rules/`), couvert par Vitest — priorité de test n°1 (`CLAUDE.md` §8).
2. Le **filtre « cotisation », la colonne `COTISATION` et la règle d'activation du §2.4 consomment le même prédicat** : plusieurs implémentations divergeraient au premier cas limite.
3. La somme doit s'appuyer sur les lignes que l'appelant a le droit de lire, **jamais sur une fonction `security definer` qui contournerait la RLS** sans contrôle d'administrateur explicite — même interdit qu'AC-ST-08.

### 2.4 Le statut demandé existe déjà — ne pas le réinventer

La demande (« Status can be waiting, suspended or active ») correspond **exactement** à ce qui est déjà en base et dans le domaine :

| Demande | `MembershipStatus` (`domain/entities/membership.ts`) | `check` en base | Libellé français déjà écrit (`MembershipStatusBadge.tsx`) |
|---|---|---|---|
| waiting | `pending` | `'pending'` | **En attente** |
| active | `active` | `'active'` | **Active** |
| suspended | `suspended` | `'suspended'` | **Suspendue** |

Les deux premiers libellés sont **confirmés mot pour mot par la maquette**. **Aucune valeur nouvelle, aucun `check` à modifier, aucun libellé à réécrire** (AC-WM-10) : le composant de badge existe, il est déjà couvert par AC-PR-17 (« jamais la couleur seule ») et il est réutilisé tel quel.

**Piège à éviter** : `domain/rules/membership-rules.ts` expose déjà `isActive(membership)`, qui vaut `status === 'active' && !isExpired(...)` — c'est-à-dire **statut ET validité**. La colonne `STATUT` de la maquette rend le **statut stocké seul** (une adhésion `active` expirée s'afficherait « Active »). Les deux notions coexistent légitimement, mais **`isActive()` ne doit pas servir à peindre cette colonne** sous peine de faire diverger silencieusement le backoffice de l'écran profil mobile. Accessoirement, `isExpired()` compare à `Date.now()`, l'horloge du navigateur — à ne jamais utiliser comme critère de sécurité (`season-scope.ts`, « `now()` must be evaluated by Postgres »).

#### Règle d'activation — une contrainte d'écriture, pas un habillage d'écran (nouvelle, posée par la développeuse le 2026-09-17)

**Aucune maquette ne la montre** : c'est une règle métier donnée directement par la développeuse, consignée ici parce qu'elle contraint le modèle. Une adhésion ne peut porter le statut **`active`** que si **les deux** conditions suivantes sont réunies au moment de l'écriture :

1. `licence_number` est **renseigné et non vide** (une chaîne d'espaces ne compte pas) ;
2. la cotisation est **intégralement réglée** au sens du prédicat du §2.3 — somme des paiements **≥** `amount_due_cents`.

Quatre précisions, parce que chacune est une occasion de se tromper :

- **C'est une validation d'écriture, pas seulement un affichage.** Le refus est levé **depuis le use case dans `domain/`** (`DomainError`), **avant tout appel réseau**, à la **création comme à la modification** (AC-WM-35). Un contrôle rendu uniquement dans le formulaire laisserait passer l'écriture par tout autre chemin.
- **Elle ne porte que sur la transition vers `active`.** `pending` et `suspended` restent libres de licence comme de paiement — sans quoi une adhésion en attente de licence deviendrait impossible à enregistrer, ce qu'infirment les lignes 1 et 2 de la maquette.
- **Aucune rétrogradation automatique n'est introduite.** Une adhésion déjà `active` dont le montant dû serait ensuite relevé n'est pas ramenée à `pending` : aucune donnée de cadrage ne le demande, et une réécriture de statut déclenchée par un paiement (ou par l'édition d'un montant) serait une règle bien plus lourde — à ne pas inventer ici.
- **Elle ne remplace pas `isActive()`** (« Piège à éviter » ci-dessus) : `isActive()` croise statut **et** validité à la **lecture** ; cette règle-ci contraint ce que le statut **stocké** a le droit de valoir à l'**écriture**. Les deux coexistent et ne doivent pas être fusionnées.

**Cas limite non tranché** : une adhésion **sans** `amount_due_cents` (créée par le dialogue, qui ne porte pas le champ — §2.1) peut-elle passer `active` ? « Cotisation soldée » n'a pas de sens évident face à un montant dû absent → rattaché à **PO-WM-02**, qui doit désormais répondre aussi à cette question.

**Cette règle doit en outre être énoncée à l'administrateur sur l'écran**, sous forme d'une **ligne d'explication informative** placée près de celle qui existe déjà sous le titre (« Un renouvellement crée toujours une nouvelle ligne… ») — demande explicite de la développeuse. **La formulation exacte relève de designer-agent** (§7, AC-WM-36) : contrairement à la phrase existante, qui est reprise mot pour mot de la maquette, aucune maquette ne fournit celle-ci, et cette spec ne l'invente pas.

### 2.5 Archiver, pas supprimer — et ce n'est pas un quatrième statut

La demande est explicite : l'icône « supprime » en **archivant**. Deux manières de le modéliser, une seule est correcte ici :

- **Écartée — ajouter `'archived'` au `check` de `status`.** Ça mélangerait deux axes indépendants : l'**état administratif** de l'adhésion (en attente / active / suspendue) et le **cycle de vie de l'enregistrement** (visible / archivé). Une adhésion archivée conserve le statut qu'elle avait, et il faut pouvoir le relire. Ça casserait de surcroît `MembershipStatus`, le badge, et la lecture mobile.
- **Retenue — une colonne d'horodatage d'archivage nullable** (`archived_at`, plus `archived_by` pour la traçabilité de l'auteur, §4), `null` = ligne vivante. **Aucune politique `delete`** n'est ajoutée sur `memberships` (AC-WM-05) : c'est un enregistrement financier et nominatif, sa suppression relève de `RETENTION_PURGE.md`, pas d'un clic dans une liste.

Conséquences de lecture, à ne pas laisser implicites : la liste administrative **exclut les archivées par défaut** ; `memberships_select_own` et la lecture mobile **doivent également les exclure**, sans quoi une adhésion archivée continuerait d'apparaître sur l'écran profil du membre (AC-WM-28). Le fait qu'aucun écran ne permette de **revoir** les archives est assumé pour cette passe (PO-WM-05).

### 2.6 Saison : `not null` à poser, filtre par défaut sur la saison en cours

**(a) `season_id` est nullable en base**, avec ce commentaire dans la migration initiale : « same OPEN nullability question as teams.season_id ». Cette question a été tranchée pour `teams` par `specs/section-and-teams.md` §2.2, et **les mêmes éléments convergent ici** : le dialogue rend `SAISON` comme un champ à choisir, `domain/entities/membership.ts` déclare déjà `seasonId: string` **non optionnel**, `MembershipRepository.findForUserAndSeason(userId, seasonId)` n'a aucun sens sans saison, et la vue `team_active_headcount` joint déjà `m.season_id = t.season_id`. Donc : le use case **refuse** une adhésion sans saison, et la migration **pose `not null`** — **conditionnée** à l'absence de lignes existantes à `null` ; s'il en existe, **ne rien résoudre silencieusement, signaler et s'arrêter** (même principe que PO-ST-01).

**(b) Le filtre de saison est positionné par défaut sur la saison en cours**, comme le montre l'export 1 (`2025-2026 (en cours)`). La saison courante est celle que **Postgres** désigne (`current_season()` / `SeasonRepository.findCurrent()`), **jamais l'horloge du navigateur**, et le suffixe « (en cours) » du libellé doit réutiliser le **prédicat d'état à trois valeurs** écrit par `web-seasons` (AC-WS-12), pas un second test inline.

**(c) Le cas « aucune saison en cours » est un état valide, pas une erreur** : `findCurrent()` renvoie `null` pendant une césure entre deux saisons (`GetProfileMembershipUseCase` le gère déjà ainsi). L'écran doit alors afficher un repli **explicite** — pas une liste vide sans explication, ni une erreur. Le repli exact (dernière saison ? « Toutes les saisons » ? message ?) : PO-WM-07.

### 2.7 Recréer après archivage — la règle demandée, et ce qu'elle ne dit pas

Deux règles coexistent, et **elles ne portent pas sur la même clé** — les confondre serait l'erreur la plus coûteuse de cette feature :

- **Renouvellement** (même membre, **saison différente**) → **toujours une nouvelle ligne, jamais une mise à jour**. C'est la mention en italique du dialogue et la ligne d'explication sous le titre, toutes deux explicites. L'historique par saison est la raison d'être de la table.
- **Recréation** (même membre, **même saison**, après archivage) → la règle demandée par la développeuse : à la création, vérifier l'existence d'une adhésion **archivée** pour ce couple et, le cas échéant, « la remplacer » par la nouvelle.

Ce que « remplacer » veut dire n'est **pas déterminé** par les documents ni par les maquettes, et les deux lectures ont des conséquences financières différentes — une adhésion archivée peut porter des paiements déjà encaissés :

- **(R1)** désarchiver la ligne existante et l'écraser avec les nouvelles valeurs → **une seule ligne, les paiements déjà enregistrés restent rattachés** ;
- **(R2)** insérer une nouvelle ligne et laisser l'archivée en l'état → **les paiements restent sur la ligne morte**, et l'encaissement paraît reparti de zéro.

→ **PO-WM-03**, second point réellement bloquant pour l'implémentation (pas pour la conception UI).

**Une contrainte technique s'impose en revanche dans les deux cas**, et elle n'est pas discutable : `MembershipRepositoryImpl.findForUserAndSeason()` utilise `.maybeSingle()`. Deux lignes **non archivées** pour un même couple `(user_id, season_id)` feraient donc **échouer l'écran profil mobile du membre**, pas seulement le backoffice. Aucune contrainte d'unicité n'existe aujourd'hui sur la table. Il en faut une, **partielle** : unique sur `(user_id, season_id)` **là où `archived_at is null`** — ce qui autorise autant d'archives que nécessaire tout en garantissant une seule ligne vivante par membre et par saison (AC-WM-07). Sa pose est soumise à la même réserve qu'au §2.6a : s'il existe déjà des doublons, signaler et s'arrêter.

### 2.8 Le badge de navigation — et une divergence entre la demande et la maquette

La demande est précise : afficher près du titre de menu **le nombre d'adhésions non intégralement payées**. La maquette affiche bien un badge `2` sur l'entrée « Adhésions »… mais **`2` n'est pas le nombre de lignes non intégralement payées de cette même maquette, qui est de 3** (`0€`, `0€`, `150€/300€`). `2` est exactement le nombre de lignes au statut **« En attente »**, ce que corrobore le bloc ALERTE de la même colonne : « **2 adhésion(s)** et 1 invitation(s) à traiter ».

La maquette et la demande **ne comptent donc pas la même chose**. Cette spec **ne tranche pas à la place de la développeuse** → PO-WM-06. Trois contraintes valent quel que soit l'arbitrage :

1. Le badge est rendu dans la **navigation latérale**, donc sur **tous** les écrans du backoffice : il lui faut une **lecture de comptage dédiée et légère**, jamais le chargement de la liste complète, et sa propre `queryKey`.
2. `backoffice-nav.ts` ne porte **aucun champ de badge** aujourd'hui, et son commentaire dit pourquoi (« a count is invented data until PO-WE-11 says what it counts »). Cette passe lève cette réserve **pour la seule entrée `memberships`** : le badge de `users` et les blocs ALERTE restent non construits (AC-WE-13 reconduit).
3. Le périmètre du comptage est **la saison en cours**, cohérent avec le filtre par défaut (§2.6b) — un compteur toutes saisons confondues ne décroîtrait jamais et deviendrait du bruit permanent. Point confirmé par personne : rattaché à PO-WM-06.

### 2.9 Politiques RLS

**Sur `public.memberships`**, la seule politique existante est `memberships_select_own` (`user_id = auth.uid() or private.is_admin()`), qualifiée de « best-effort self-row guess pending a real spec ». À ajouter dans une **nouvelle migration** :

1. `memberships_insert_admin` — `with check (private.is_admin())`
2. `memberships_update_admin` — `using (private.is_admin())` et `with check (private.is_admin())` (l'archivage passe par cette politique : c'est un `update` de `archived_at`, pas un `delete` ; l'écriture du **montant dû** y passe également — aucune politique supplémentaire n'est créée pour `amount_due_cents`)
3. **Aucune politique `delete`.**
4. `memberships_select_own` est **amendée** pour exclure les lignes archivées du côté « propre ligne » (§2.5), sans changer la branche administrateur — qui doit, elle, continuer de tout voir.

**Sur la table de paiements** (nouvelle) : `enable row level security`, `insert` administrateur, **aucune politique `update` ni `delete`** (§2.2), et une politique `select` **calquée sur celle du parent** (sa propre ligne, ou administrateur) — un membre qui peut lire son adhésion mais pas les paiements qui y sont rattachés serait une incohérence de modèle, même si **aucun écran mobile ne les consomme dans cette passe**.

`private.is_admin()` existe déjà. Les `grant` sont à étendre à la nouvelle table. Miroir manuel obligatoire des deux côtés (`CLAUDE.md` §7) : chaque politique porte en commentaire SQL le nom de l'action qu'elle miroite, et les entrées de matrice renvoient aux politiques.

### 2.10 Domaine

- `MembershipRepository` **conserve `findForUserAndSeason()` inchangée** (consommée par `GetProfileMembershipUseCase`) et gagne une lecture administrative filtrable, `create(...)`, `update(...)`, `archive(...)`. Une seule interface par ressource — **pas de `BackofficeMembershipRepository` séparé** (même position que `NewsRepository`, `SeasonRepository`, `TeamRepository`).
- Une interface de repository **distincte pour les paiements** : ressource distincte, table distincte, cycle de vie distinct (append-only). Elle doit servir **deux lectures** : la somme encaissée par adhésion (colonne `COTISATION`) et la **liste des versements d'une adhésion** (panneau « HISTORIQUE DES VERSEMENTS », export `payment-1`).
- Use cases dans `domain/usecases/`, fonctions/classes async pures — aucun import React / Supabase / TanStack Query, aucun `useQuery` à l'intérieur (`CLAUDE.md` §3/§6) : création, modification, archivage d'une adhésion ; enregistrement d'un paiement ; comptage pour le badge.
- La liste a besoin de **libellés** et non d'identifiants (`UTILISATEUR` = nom du compte, `SAISON` = libellé de saison, `COTISATION` = somme dérivée). Que ce soit résolu par une vue (`XxxRow`), une jointure en ligne (`XxxDto`) ou une composition de repositories, **un mapper reste obligatoire entre le DTO et l'entité** (`CLAUDE.md` §4). Note issue de l'export `payment-1` : le panneau d'édition affiche aussi l'**adresse e-mail** du compte — donnée du compte utilisateur, pas de l'adhésion ; elle est **lue**, jamais écrite depuis cet écran.
- Clés de requête centralisées dans `presentation/shared/query-keys.ts`, jamais inline, et **distinctes de `profileMembership`** : cette dernière sert la lecture mobile d'une seule ligne filtrée par la saison en cours ; partager une entrée de cache ferait fuiter des adhésions d'autrui dans l'écran profil d'un compte multi-rôles admin+joueur (même raisonnement que `newsAdminList` vs `newsFeed`).

## 3. RBAC

### Le cas le plus inconfortable du backoffice à ce jour — à dire franchement

Pour `seasons`, `sections`, `teams` et `club_news`, le rôle titulaire était l'Administrateur sans discussion. **Ici, le CDC nomme explicitement deux autres rôles**, et les deux lignes de matrice pertinentes ne disent pas la même chose :

| Ligne de la matrice RBAC (CDC) | Joueur | Coach | Resp. section | **Dirigeant habilité** | **Trésorier** | Réf. médical | Bénévole | **Administrateur** |
|---|---|---|---|---|---|---|---|---|
| Voir le statut de cotisation | ✅ (soi-même) | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Gérer échéanciers et relances | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ **(paramétrage)** |
| Voir les dossiers des autres membres | ❌ | ❌ (son équipe, hors financier) | ✅ (sa section) | ✅ | **❌ (financier seulement)** | ❌ | ❌ | ✅ |

Trois constats, tous littéraux :

1. **Le Trésorier est le rôle désigné du module « Cotisations »** (`roles-personas` : « Cotisations, échéanciers, relances, exports financiers »), et le seul à porter un ✅ non qualifié sur « Gérer échéanciers et relances ».
2. **Le Trésorier est en revanche ❌ sur « Voir les dossiers des autres membres », avec la mention « (financier seulement) ».** Or cet écran mélange les deux natures : `LICENCE`, `STATUT` et `VALIDE JUSQU'AU` relèvent du dossier d'adhérent ; `COTISATION` relève du financier. **Donner l'écran entier au Trésorier contredirait cette ligne ; le lui refuser entièrement contredirait la précédente.**
3. **Le ✅ de l'Administrateur sur « Gérer échéanciers et relances » est qualifié « (paramétrage) »** — ce qui, lu strictement, n'est pas « enregistre un paiement ».

**Constat aggravé par la résolution de PO-WM-01** (2026-09-17) : le **montant dû vivant désormais sur la ligne d'adhésion** (`amount_due_cents`, §2.1), l'action `'membership:write'` écrit **à la fois** du dossier d'adhérent **et** une donnée financière. La scission en deux actions ci-dessous reste juste — un paiement est bien une ressource distincte — mais elle **ne suffit plus** à séparer proprement les deux natures le jour où un Trésorier entrerait dans le périmètre. **Constat versé à PO-WM-08, qui n'est pas tranché ici.**

### Position retenue pour cette passe — `['admin']`, et pourquoi c'est un pis-aller assumé

**Les deux actions valent `['admin']` dans cette tranche**, pour une raison opérationnelle et non doctrinale : `backoffice:access` vaut `['admin']` (`specs/web-empty-state.md`, **PO-WE-01 toujours ouvert**). Un Trésorier ne peut aujourd'hui **pas atteindre `/admin/*`** ; lui accorder `payment:record` construirait un droit que personne ne peut exercer, et une politique RLS sans chemin applicatif.

**Mais c'est la première feature où cette position étroite s'écarte du CDC plutôt que de le suivre.** Pour les saisons, `['admin']` *était* la lecture du CDC. Ici, `['admin']` est un **repli temporaire** : livrer le module « Cotisations » sans que le Trésorier puisse y accéder contredit frontalement `roles-personas`. **PO-WE-01 cesse donc d'être une question de confort pour cette feature** — voir PO-WM-08, à trancher **avant mise en production**, pas avant la conception.

**Réutiliser `'section:manage'` ou `'backoffice:access'` comme substitut serait une erreur**, même raisonnement qu'en `web-seasons` §3 et `section-and-teams` §3 : une adhésion est une donnée club-wide, nominative et financière, et un `section-manager` est borné à sa section.

### Entrées de matrice proposées — deux actions, pas une

```
'membership:write': ['admin'],
'payment:record': ['admin'],
```

**Pourquoi deux, et non `'membership:write'` seule.** Ce n'est pas de la symétrie décorative : ce sont les **deux natures que la matrice RBAC sépare elle-même** (dossier d'adhérent vs. financier), et **leurs populations candidates divergent dès que PO-WE-01/PO-WM-08 seront tranchés** — Dirigeant habilité du côté du dossier, Trésorier du côté du paiement. Une action unique rendrait cet élargissement impossible sans accorder du même geste les deux droits à tout le monde — exactement l'effet de bord silencieux que la scission `'section:write'`/`'team:write'` a été créée pour éviter.

**Pourquoi `'payment:record'` et non `'membership:pay'`.** Le préfixe nomme la **ressource réellement écrite** (une ligne de paiement, table enfant), comme `'role:assign-coach'` nomme `user_roles` et non `teams`. Le verbe `record` dit ce que l'action fait vraiment : **constater un encaissement déjà survenu**, jamais encaisser (§1).

**Aucun contrôle de portée n'est à ajouter dans `can.ts`** : `'admin'` est club-wide par construction (le `RoleAssignment` admin ne porte ni `teamId` ni `sectionId`), et la branche `default` du `switch` renvoie déjà `true`. **Si PO-WM-08 élargit un jour ces actions à `'treasurer'` ou `'authorized-officer'`, ces deux rôles sont eux aussi club-wide** (`domain/entities/user.ts` : « authorized-officer, treasurer, … → no scope field ») — l'élargissement ne demanderait donc pas de nouvelle branche de portée, **contrairement** à `'section-manager'`. C'est une différence importante, et c'est précisément ce qui rend cet élargissement peu coûteux le jour où il sera validé.

### Tableau par rôle

| Rôle | Lit sa propre adhésion (RLS existante) | Atteint `/admin/memberships` | Crée / modifie une adhésion (montant dû compris) | Archive | Enregistre un paiement |
|---|---|---|---|---|---|
| Joueur/Joueuse | ✅ (sa ligne, hors archivées — §2.5) | ❌ | ❌ | ❌ | ❌ |
| Coach/Staff | ✅ (sa ligne) | ❌ | ❌ | ❌ | ❌ |
| Responsable de section | ✅ (sa ligne) | ❌ (PO-WE-01) | ❌ | ❌ | ❌ |
| **Dirigeant habilité** | ✅ (sa ligne) | ❌ **dans cette passe** (PO-WM-08) | ❌ *dans cette passe* — **✅ au CDC** | ❌ | ❌ |
| **Trésorier** | ✅ (sa ligne) | ❌ **dans cette passe** (PO-WM-08) | ❌ — et **❌ au CDC aussi** sur le volet dossier | ❌ | ❌ *dans cette passe* — **✅ au CDC** |
| Référent médical | ✅ (sa ligne) | ❌ | ❌ | ❌ | ❌ |
| Bénévole | ✅ (sa ligne) | ❌ | ❌ | ❌ | ❌ |
| **Administrateur** | ✅ toutes, archivées comprises | ✅ | ✅ | ✅ | ✅ |

### Comptes multi-rôles

Sans effet ici : la console ne dépend que de la **présence** du rôle `admin`, pas du rôle actif (`active-role-scope.ts`). PO-WE-06 reste ouvert et n'est pas traité. À noter tout de même pour le jour où PO-WM-08 sera tranché : un compte **admin + joueur** verrait sa propre adhésion dans la liste administrative — cas normal, mais un compte **trésorier + joueur** verrait la sienne au milieu de celles qu'il gère, ce qui mérite d'être posé sciemment plutôt que découvert.

## 4. Données sensibles

**C'est la feature la plus chargée du backoffice à ce jour, et la première à toucher une exigence non négociable du CDC de plein fouet.**

| Nature | Cette feature | Conséquence |
|---|---|---|
| **Données de santé** | Aucune | Aucun trigger d'audit d'accès, aucun filtre de colonne |
| **Données financières** | **Oui — c'est l'objet même** : montant dû (**désormais une colonne de l'adhésion**, §2.1), montants encaissés, état de règlement | `RETENTION_PURGE.md` + audit §11.3 — voir ci-dessous |
| **Données nominatives** | **Oui** — chaque ligne associe un **nom**, une **adresse e-mail** (panneau d'édition, export `payment-1`), un **numéro de licence** et une **situation financière**. Le rapprochement de ces éléments est plus sensible que chacun pris isolément | Écran nominatif club-wide ; tout export futur relèverait de « export nominatif » (§11.3) |
| **Journal d'audit** | **Exigé explicitement** | Voir ci-dessous |

**Journal d'audit — ce n'est pas une question ouverte ici, contrairement à `web-actus` et `web-seasons`.** Le CDC §11.3 énumère les actions à tracer et y inscrit littéralement « **modification paiement** ». Pour les saisons et les actus, l'argument d'audit était une extrapolation défendable (PO-WS-03, PO-WA-04) ; **ici, l'exigence est écrite**. Trois conséquences :

1. **L'écriture d'un paiement — et sa correction éventuelle (PO-WM-04) — doit être journalisée**, de même que l'archivage d'une adhésion (une action qui soustrait une situation financière de la vue courante). **La modification du montant dû** (`amount_due_cents`, §2.1) relève de la même famille : c'est une écriture financière, même si elle ne porte pas sur un encaissement.
2. **D'où le log part** est déjà tranché par `CLAUDE.md` §6 : une action métier porteuse d'intention se journalise **depuis le use case dans `domain/`**, **jamais depuis un composant**. Un trigger Postgres ne conviendrait que pour tracer un **accès en lecture** (ce qui n'est pas exigé ici).
3. **Aucune infrastructure d'audit n'existe dans le dépôt** : pas de table, pas de trigger, aucun appel de journalisation nulle part. **Cette spec ne la construit pas** (§1, hors périmètre) — elle constate que la première fonctionnalité qui en a formellement besoin est celle-ci → **PO-WM-09**, à trancher **avant mise en production**.

**Traçabilité minimale, à ne pas confondre avec le journal d'audit.** `memberships` ne porte **aucune** colonne de traçabilité (§2.1). Même si le journal d'audit est reporté, la table de paiements **doit** porter `recorded_by`/`recorded_at` (§2.2) et l'archivage `archived_by`/`archived_at` (§2.5) : sans eux, « qui a saisi ce paiement » est irrécupérable, y compris pour le trésorier lui-même. Ce n'est pas un doublon du journal, c'est l'attribution de la donnée elle-même. Les colonnes équivalentes sur l'adhésion (`created_by`/`updated_by`) : PO-WM-10.

**Rétention et purge.** `RETENTION_PURGE.md` classe les « Données financières (cotisations, section 4 du CDC) » à part : durée de conservation **comptable légale**, « à faire confirmer par le trésorier/expert-comptable du club », **archivage froid obligatoire avant toute purge**, et un avertissement explicite — « **ne pas appliquer les durées ci-dessus sans validation comptable** ». Deux points de vigilance concrets :

- **`memberships.user_id … on delete cascade`** : supprimer un compte détruirait ses adhésions, et par ricochet ses paiements. C'est cohérent avec la politique du document (un compte est **désactivé puis pseudonymisé**, jamais supprimé) **tant que cette politique est tenue** — mais la cascade, elle, ne le vérifie pas. À poser sciemment pour la table de paiements (PO-WM-04) plutôt qu'à recopier par réflexe.
- Toute purge/rétention vit dans **Supabase (job planifié)**, **jamais dans `domain/`** (`CLAUDE.md` §6). Rien de tel n'est construit ici.

**Noms de personnes dans les maquettes.** Les quatre exports affichent des noms de membres, un nom dans la barre supérieure, un nom dans le bloc ALERTE et, pour `payment-1`, un nom **et une adresse e-mail** dans le panneau d'édition. `CLAUDE.md` §9 l'interdit partout, y compris en exemple ou en fixture de test — cette spec ne les reproduit pas (§1), et AC-WM-27 le reconduit.

## 5. Critères d'acceptation

Numérotation **`AC-WM-xx`**, préfixe à deux lettres par feature comme AC-WE, AC-WA, AC-WS, AC-ST.

**Base de données et RLS**

- **AC-WM-01** — Une nouvelle migration ajoute sur `public.memberships` exactement deux politiques d'écriture (`insert` administrateur, `update` administrateur), toutes deux appuyées sur `private.is_admin()`. **Aucune politique `delete`.**
- **AC-WM-02** — La table de paiements est créée avec RLS activée, une politique `insert` administrateur, une politique `select` calquée sur celle du parent (sa propre ligne, ou administrateur), et **aucune politique `update` ni `delete`** (§2.2). Les `grant` de la migration initiale sont étendus à cette table.
- **AC-WM-03** — Les montants sont stockés en **entiers de centimes**, jamais en `float`/`numeric` à virgule flottante, et `amount_cents` porte un `check` de stricte positivité (§2.2).
- **AC-WM-04** — Avec un jeton **non administrateur**, tout `insert`/`update` sur `memberships` et tout `insert` sur les paiements échoue. Testé pour au moins un `treasurer` et un `authorized-officer`, afin de vérifier qu'aucun élargissement par analogie avec les lignes de matrice du §3 n'a eu lieu par anticipation.
- **AC-WM-05** — L'archivage est un `update` de `archived_at` (+ `archived_by`), **jamais un `delete`** : après archivage, la ligne existe toujours et ses paiements aussi.
- **AC-WM-06** — Un paiement enregistré **ne peut être ni modifié ni supprimé** par l'application ni par un jeton administrateur direct (aucune politique ne le permet) ; un second paiement s'ajoute en **nouvelle ligne**, sans `on conflict`, sans upsert (§2.2 — exception explicite à `CLAUDE.md` §6, à commenter comme telle dans la migration).
- **AC-WM-07** — Un index unique **partiel** garantit une seule adhésion **non archivée** par couple `(user_id, season_id)` ; plusieurs lignes archivées pour le même couple restent acceptées (§2.7).
- **AC-WM-08** — `season_id` passe `not null`. Si des lignes à `null` (ou des doublons au sens d'AC-WM-07) existent déjà, **la migration n'est pas appliquée en l'état** : le cas est signalé, pas résolu silencieusement (§2.6a).
- **AC-WM-09** — Chaque politique porte un commentaire SQL nommant l'action (`'membership:write'` ou `'payment:record'`) qu'elle miroite, et les entrées de matrice renvoient aux politiques (miroir manuel, `CLAUDE.md` §7).
- **AC-WM-34** — La même migration ajoute sur `public.memberships` une colonne **`amount_due_cents`** (le « Cotisation totale (€) » de l'export `payment-1`, §2.1) : **entier de centimes**, jamais un flottant ; **nullable**, le dialogue de création ne portant pas le champ ; contrainte à une valeur **`>= 0`** — un montant dû nul est un cas métier légitime (exonération), un montant négatif non. Elle est écrite par les politiques `insert`/`update` administrateur d'AC-WM-01, **sans politique supplémentaire**, et **aucune table de tarification n'est créée** (PO-WM-01 résolu dans l'autre sens).

**Domaine**

- **AC-WM-10** — `MembershipStatus`, le `check` de `status` et les trois libellés français de `MembershipStatusBadge` sont **inchangés** : aucune valeur ajoutée, aucun libellé réécrit, et **`'archived'` n'est pas un statut** (§2.4, §2.5).
- **AC-WM-11** — `'membership:write'` et `'payment:record'` sont ajoutées à `domain/policies/actions.ts` et valent `['admin']` dans `rbac-matrix.ts`. **Aucune autre action, aucun autre rôle n'est ajouté** (`CLAUDE.md` §7) — `'backoffice:access'`, `'section:manage'` et les entrées existantes sont inchangées.
- **AC-WM-12** — L'état de cotisation (non payé / partiel / payé) est calculé par un **prédicat pur du domaine couvert par Vitest**, à partir de la somme des paiements et du montant dû ; il n'est **jamais** lu depuis une colonne stockée, ni recalculé en ligne dans un composant (§2.3).
- **AC-WM-13** — La colonne `COTISATION`, le filtre « cotisation » **et la règle d'activation d'AC-WM-35** consomment **le même** prédicat qu'AC-WM-12 — une seule implémentation, vérifiable.
- **AC-WM-14** — Les use cases (création, modification, archivage, enregistrement de paiement, comptage du badge) vivent dans `domain/usecases/`, **sans aucun import React, Supabase, TanStack Query ni `window`**, et sans `useQuery`/`useMutation` à l'intérieur.
- **AC-WM-15** — Le use case de création refuse, **depuis le domaine** (`DomainError`) et **avant tout appel réseau** : un utilisateur non choisi, une saison non choisie, un statut absent, une `valid_until` absente. Un `licence_number` vide est un cas **valide** (§2.1, ligne 1 de la maquette) ; un `amount_due_cents` **absent** l'est également à la création (le dialogue ne porte pas le champ, §2.1), sous réserve de PO-WM-02.
- **AC-WM-16** — Le use case d'enregistrement d'un paiement refuse, depuis le domaine, un montant nul ou négatif, et une date de paiement absente.
- **AC-WM-17** — `MembershipRepository.findForUserAndSeason()` est **inchangée** en signature ; l'interface gagne la lecture administrative filtrable, `create`, `update`, `archive`. **Aucun second repository d'adhésions** n'est créé ; les paiements ont leur propre interface, qui expose la somme encaissée **et** la liste des versements d'une adhésion (§2.10).
- **AC-WM-18** — `isActive()` et `isExpired()` de `domain/rules/membership-rules.ts` **ne servent pas** à peindre la colonne `STATUT`, qui rend le statut stocké seul (§2.4). Ces deux fonctions sont inchangées.
- **AC-WM-35** — Le statut **`active`** ne peut être écrit, à la **création comme à la modification**, que si l'adhésion porte **à la fois** (a) un `licence_number` **non vide** et (b) une cotisation **intégralement réglée** au sens du prédicat pur du §2.3 (somme des paiements **≥** montant dû). Le refus est levé **depuis le use case dans `domain/`** sous forme de `DomainError`, **avant tout appel réseau**, et est couvert par Vitest — cas de refus (licence absente ou vide de blancs ; cotisation partielle ; aucun paiement) **et** cas d'acceptation. Les statuts `pending` et `suspended` ne sont **pas** contraints, et **aucune rétrogradation automatique** d'une adhésion déjà `active` n'est introduite (§2.4).

**Écran `/admin/memberships`**

- **AC-WM-19** — L'écran ne rend plus `BackofficeEmptyState` inconditionnellement : il rend un tableau à sept colonnes `UTILISATEUR`, `SAISON`, `LICENCE`, `STATUT`, `VALIDE JUSQU'AU`, `COTISATION`, `ACTIONS`, et trois filtres (saison, statut, cotisation). Les dates sont au format `AAAA-MM-JJ` via le formateur déjà en place (`presentation/shared/formatters/date-input.ts`), sans second formatage.
- **AC-WM-20** — Au chargement, le filtre de saison est positionné sur la **saison en cours** telle que désignée par Postgres (`current_season()`), et son libellé porte la mention d'état issue du prédicat d'AC-WS-12 — **jamais un test recalculé sur l'horloge du navigateur** (§2.6b).
- **AC-WM-21** — Quand aucune saison n'est en cours (césure), l'écran affiche un **repli explicite** et non une liste vide sans explication ni une erreur (§2.6c, forme exacte : PO-WM-07).
- **AC-WM-22** — Les adhésions **archivées n'apparaissent pas** dans la liste (§2.5), et l'action d'archivage retire la ligne de la liste sans rechargement manuel.
- **AC-WM-23** — « + Nouvelle adhésion » et le contrôle d'édition d'une ligne ne sont rendus que si `can(user, 'membership:write')` ; « + Paiement » que si `can(user, 'payment:record')` — booléens calculés par le ViewModel, **séparément** du fait d'avoir atteint la route. Un contrôle non autorisé **disparaît**, il n'apparaît pas grisé (convention déjà appliquée dans ce dépôt).
- **AC-WM-24** — Enregistrer un paiement met à jour la colonne `COTISATION` de la ligne, **l'historique des versements de cette ligne** et le badge de navigation sans rechargement manuel (invalidation via des clés centralisées dans `presentation/shared/query-keys.ts`, jamais une `queryKey` inline).
- **AC-WM-25** — Les trois états sont couverts et distincts : chargement (jamais un flash de liste vide), erreur (message lisible en français issu d'une `DomainError` traduite, jamais un message brut Supabase), liste vide (**cas normal en début de saison, jamais une erreur**). Un échec de création ou de paiement laisse le formulaire ouvert **avec les saisies conservées**.
- **AC-WM-26** — Une modification enregistre sur la **même** ligne (pas de doublon), et les champs d'édition sont **pré-remplis** avec les valeurs de la ligne sélectionnée — **quel que soit le déclencheur retenu** (dialogue de modification, ou **ligne dépliable dans le tableau** comme le montre l'export `payment-1` ; réconciliation confiée à designer-agent, §7). Le champ **« Cotisation totale (€) »** y est modifiable au même titre que les autres (§2.1), et `UTILISATEUR`/`SAISON` n'y sont **pas** modifiables.
- **AC-WM-27** — **Aucun nom de personne n'est codé en dur**, y compris ceux des maquettes, y compris en placeholder ou en fixture de test (`CLAUDE.md` §9). Le badge de l'entrée « Utilisateurs », les deux blocs « ALERTE » et l'entrée de navigation « Journal d'audit » **ne sont pas construits** (AC-WE-13 reconduit, PO-WA-09).
- **AC-WM-36** — L'écran **énonce la règle d'activation d'AC-WM-35** à l'administrateur, sous forme d'une **ligne d'explication informative** placée près de celle qui existe déjà sous le titre (« Un renouvellement crée toujours une nouvelle ligne — l'historique par saison est conservé. »). Elle est **informative et permanente, jamais une alerte d'erreur**, et lisible sans interaction. **Sa formulation exacte est fixée par designer-agent** : aucune maquette ne la fournit, et cette spec ne l'écrit pas (§2.4, §7). Par ailleurs, une tentative d'enregistrement en `active` qui ne satisfait pas la règle affiche le message français traduit de la `DomainError` et laisse les saisies conservées (reconduction d'AC-WM-25).

**Transverse et non-régression**

- **AC-WM-28** — L'écran profil mobile est **inchangé** : `GetProfileMembershipUseCase`, `MembershipRepository.findForUserAndSeason()` et `MembershipStatusBadge` gardent leur comportement, à la seule exception voulue que les adhésions **archivées** n'y remontent plus (§2.5). Vérifiable en régression, y compris le cas « aucune adhésion » et le cas « aucune saison en cours ».
- **AC-WM-29** — La vue `team_active_headcount` (qui joint `memberships` sur `status = 'active'` et `valid_until >= current_date`) est **inchangée**, et le compteur « N licenciés » du tableau de bord coach ne change pas de valeur du fait de cette tranche pour des données identiques.
- **AC-WM-30** — Aucun écran mobile ne change de rendu, de route ou de comportement (reconduction d'AC-WE-20) ; la console reste desktop-only via le garde de largeur existant (AC-WE-18), et aucun dossier `presentation/desktop/` ni `presentation/mobile/` n'est créé.
- **AC-WM-31** — Aucun appel Supabase depuis `presentation/`, aucun import de `data/` depuis `presentation/` : câblage par le conteneur DI (`CLAUDE.md` §3). Le ViewModel calcule, la Page ne fait que brancher des booléens.
- **AC-WM-32** — Aucune intégration de paiement en ligne, aucun prestataire, aucun webhook, aucun champ de carte n'apparaît nulle part (§1, P2 du CDC).
- **AC-WM-33** — CDC §12 : les dialogues **et la ligne dépliable, le cas échéant,** sont **entièrement utilisables au clavier** (tabulation, soumission, `Échap`, focus piégé et restitué pour un dialogue ; dépliage annoncé et atteignable au clavier pour une ligne extensible), les contrastes du fond sombre sont **vérifiés** au niveau AA, et **ni le statut ni l'état de cotisation ne sont jamais portés par la couleur seule** — toujours doublés d'un texte (`0€ / 300€` est déjà textuel ; la barre de progression seule ne suffirait pas).

## 6. Points ouverts

| Réf. | Question | Pour qui | Bloquant ? |
|---|---|---|---|
| **PO-WM-01** | ~~D'où vient le montant dû (`/ 300€`) ?~~ — **RÉSOLU le 2026-09-17 par l'export `[Admin] Web - Membership - payment-1.png`** : la ligne dépliée porte un champ **« Cotisation totale (€) »** (valeur `300`), saisi par adhésion. Le montant dû vit donc dans une colonne **`amount_due_cents` sur `memberships`** (§2.1, AC-WM-34), **et non** dans une table de tarification par section/saison. Un reliquat **non bloquant** est transféré à PO-WM-02 : le champ étant absent du dialogue de création, une adhésion peut naître sans montant dû | — (tranché par la maquette) | **Non — résolu.** N'est plus un préalable à l'implémentation |
| **PO-WM-02** | **Cas limites de l'état de cotisation** (§2.3) : sur-perception (somme > dû) — « payé » avec quel rendu ? montant dû nul (adhésion exonérée) — « payé » d'office ou état à part ? montant dû **absent** (adhésion créée par le dialogue, qui ne porte pas le champ — §2.1) — que montrer plutôt qu'un `/ 0€` trompeur, et une telle adhésion peut-elle passer au statut `active` au sens d'AC-WM-35 ? **Ne dépend plus de PO-WM-01** : le montant dû existe désormais, seul le **rendu** et le **traitement de l'absence** restent à confirmer | Développeuse / Trésorier / designer-agent | Non pour construire — le rendu proposé en « UI design » est un **défaut sûr**, à confirmer |
| **PO-WM-03** | **Que veut dire « remplacer » lors d'une recréation après archivage ?** (R1) désarchiver et écraser la ligne existante, les paiements déjà encaissés restant rattachés ; ou (R2) insérer une nouvelle ligne, les paiements restant sur la ligne archivée (§2.7). Conséquence financière directe, non tranchée par les maquettes. Sous-question : une **confirmation explicite** est-elle demandée à l'administrateur (« une adhésion archivée existe pour ce membre et cette saison »), ou le remplacement est-il silencieux ? | **Développeuse / Bureau** | **OUI pour l'implémentation** (pas pour la conception UI, sauf le dialogue de confirmation éventuel) |
| **PO-WM-04** | **Corriger un paiement saisi de travers.** La table est append-only et sans politique `update`/`delete` (§2.2) — donc un montant erroné est aujourd'hui définitif. Écriture d'**annulation** (ligne d'avoir, montant négatif ⇒ le `check` de positivité tombe), ou `update` autorisé **avec motif obligatoire et journalisation** (ce que suggère le libellé « modification paiement » du CDC §11.3) ? Sous-questions rattachées : faut-il une colonne **moyen de paiement** (espèces / chèque / virement — **absente du dialogue « Enregistrer un paiement »**, à ne pas inventer) et une note libre ? Quel comportement `on delete` entre paiements et adhésion, au regard de la rétention comptable (§4) ? | **Trésorier / Bureau / développeuse** | Non pour cette tranche — **à trancher avant la première saisie réelle** |
| **PO-WM-05** | **L'archivage n'est illustré nulle part.** Les maquettes ne montrent ni icône de corbeille/archive, ni confirmation, ni écran de consultation des archives (§1, §2.5). Confirmation avant archivage ? Peut-on **désarchiver** autrement qu'en recréant (PO-WM-03) ? Peut-on archiver une adhésion **portant déjà des paiements** — et si oui, faut-il un avertissement, la situation financière disparaissant alors de la vue courante ? | **Développeuse / Bureau** | Non pour construire, **oui pour figer l'écran** (designer-agent doit dessiner un contrôle que la maquette ne montre pas) |
| **PO-WM-06** | **Que compte le badge de l'entrée « Adhésions » ?** La demande dit « adhésions non intégralement payées » (= **3** sur la maquette) ; la maquette affiche **2**, soit exactement le nombre d'adhésions au statut « En attente », ce que corrobore son propre bloc ALERTE « 2 adhésion(s) … à traiter » (§2.8). Les deux définitions sont défendables et ne donnent pas le même nombre. Sous-question : le comptage porte-t-il sur la **saison en cours** (position retenue par défaut) ou toutes saisons confondues ? Résout **partiellement PO-WE-11** | **Développeuse** | Non pour construire (le rendu est le même), **oui pour que le chiffre affiché soit juste** |
| **PO-WM-07** | **Repli du filtre de saison quand aucune saison n'est en cours** (césure estivale, §2.6c) : basculer sur « Toutes les saisons », sur la dernière saison terminée, ou afficher un message dédié ? Même famille que PO-WS-05/PO-WS-07 — la bascule de saison est déjà identifiée comme un moment à risque | Développeuse / Bureau | Non |
| **PO-WM-08** | **Qui doit réellement tenir cet écran ?** Position retenue `['admin']` pour cette passe, **en écart assumé avec le CDC** (§3) : la matrice donne « Gérer échéanciers et relances » au **Trésorier** (✅ non qualifié) et le dossier adhérent/licence au **Dirigeant habilité**, tandis que le Trésorier est ❌ sur « Voir les dossiers des autres membres » — or cet écran mêle les deux natures, **et davantage encore depuis que le montant dû vit sur la ligne d'adhésion** (§3, PO-WM-01 résolu : `'membership:write'` écrit désormais aussi du financier). Faut-il (a) élargir `backoffice:access` (**PO-WE-01**), (b) accorder `'payment:record'` au Trésorier et `'membership:write'` au Dirigeant habilité, (c) **masquer les colonnes de dossier** (`LICENCE`, `STATUT`, `VALIDE JUSQU'AU`) à un Trésorier ? Note utile : `treasurer` et `authorized-officer` étant **club-wide sans champ de portée**, l'élargissement ne demanderait **aucune** nouvelle branche dans `can.ts` — contrairement à `section-manager` | **Bureau / référent RGPD / développeuse** | Non pour cette tranche — **oui avant mise en production** : livrer le module « Cotisations » sans accès Trésorier contredit le CDC |
| **PO-WM-09** | **Journal d'audit — exigence écrite, infrastructure inexistante.** Le CDC §11.3 inscrit littéralement « **modification paiement** » parmi les actions à tracer, et **aucune table, aucun trigger, aucun appel de journalisation n'existe dans le dépôt** (§4). Construit-on le journal d'audit **avant** d'ouvrir la saisie de paiements en production, ou accepte-t-on une période non tracée ? Quelle rétention (`RETENTION_PURGE.md` propose 3 ans pour les actions sensibles) ? Le journal est une **spec à part entière** (l'entrée de navigation existe déjà dans les maquettes) | **Bureau / référent RGPD** | Non pour construire cet écran — **oui avant mise en production**. Premier cas du dépôt où une exigence « non négociable » du CDC est atteinte de front |
| **PO-WM-10** | **Traçabilité minimale sur `memberships`** : la table ne porte **aucune** colonne `created_at`/`created_by`/`updated_at`/`updated_by` (§2.1). Les ajoute-t-on dans cette passe (cohérent avec `archived_by` et `recorded_by`, que cette spec exige déjà), ou les laisse-t-on au journal d'audit (PO-WM-09) ? Même famille que PO-WS-03 et PO-WA-04, avec un enjeu supérieur : la donnée est financière et nominative — **et le montant dû, désormais modifiable par adhésion, en fait partie** | Développeuse / référent RGPD | Non |
| **PO-WM-11** | **Ligne `web-memberships` du registre `docs/designs/DESIGN_LINKS.md` §2 à mettre à jour** : elle existe (statut `instantané seul`) mais ne cite que les exports `{1,2}` ; **les deux exports `payment` et `payment-1` ajoutés le 2026-09-17 n'y figurent pas**. Ligne de remplacement pré-rédigée au §0, à recopier telle quelle ; aucun lien artifact à demander | Développeuse / premier agent ayant les droits sur `docs/` | Non |
| **PO-WM-12** | **`VALIDE JUSQU'AU` est saisi à la main** dans le dialogue, alors que les quatre lignes de la maquette portent toutes la date de **fin de la saison choisie** (`2026-06-30`). Valeur par défaut pré-remplie depuis `season.end_date` (saisie restant modifiable), ou champ entièrement libre ? Non déterminable depuis la maquette | Développeuse | Non |
| **PO-WM-13** | **Ordre d'affichage, tri et pagination** : non illustrés (quatre lignes seulement). Un club entier tient-il sans pagination sur cet écran ? Même indétermination que PO-WA-12 et PO-WS-09 | Développeuse | Non |

## 7. Note pour designer-agent

- Maquettes de référence : `docs/designs/desktop/membership/[Admin] Web - Membership - {1,2}.png` **et `… - payment.png` / `… - payment-1.png`** (ajoutées le 2026-09-17) — **un seul écran et trois de ses états**, pas quatre écrans (§0).
- **Le dialogue de paiement est désormais illustré** (`payment`) : la réserve « aucun dialogue de paiement n'est illustré », qui avait conduit la section « UI design » à le composer par analogie avec `NewsFormDialog.tsx`, est **levée**. La section est à **réconcilier avec la maquette** — deux champs seulement (`MONTANT (€)`, `DATE DU VERSEMENT` — noter le libellé, différent du « DATE DE PAIEMENT » proposé), la mention en italique reproduite au §1, et `Annuler`/`Enregistrer`.
- **Information neuve à arbitrer — le déclencheur de la modification.** L'export `payment-1` montre l'édition d'une adhésion **en ligne, dans une ligne de tableau dépliable** (bouton chevron dans la colonne `ACTIONS`, à droite de « + Paiement »), champs d'édition à gauche (« INFORMATIONS DU JOUEUR ») et **« HISTORIQUE DES VERSEMENTS » à droite** — et non dans une boîte de dialogue de modification, comme la passe précédente l'avait supposé par analogie avec `/admin/seasons` et `/admin/actus`. **Cette spec ne tranche pas la mise en page** : il revient à designer-agent de réconcilier la section « UI design » (colonne `ACTIONS`, dialogue de modification, `RecordPaymentDialog` et son historique) avec ce que montre la maquette, et de signaler à la développeuse toute conséquence sur les patrons déjà construits. Trois faits à conserver quel que soit l'arbitrage : l'historique des versements est **visible sans ouvrir le dialogue de paiement** ; son état vide est illustré (« Aucun versement enregistré. ») ; `UTILISATEUR` et `SAISON` ne sont **pas** des champs modifiables du panneau déplié (AC-WM-26).
- **Un champ de plus à placer** : **« Cotisation totale (€) »** (§2.1 — PO-WM-01 résolu), saisi en euros, modifiable par adhésion. Il apparaît dans la ligne dépliée mais **pas** dans le dialogue « Nouvelle adhésion » : écart à **signaler à la développeuse** plutôt qu'à combler en silence (PO-WM-02).
- **Une ligne d'explication de plus à rédiger et à placer** : la règle « statut `active` ⇒ licence renseignée **et** cotisation soldée » (§2.4, AC-WM-35) doit être énoncée à l'administrateur **près de la phrase déjà présente sous le titre** (AC-WM-36). **Sa formulation exacte relève de designer-agent** : contrairement à « Un renouvellement crée toujours une nouvelle ligne… », qui est reprise mot pour mot de la maquette, aucune maquette ne fournit celle-ci et l'agent PO ne l'a volontairement pas écrite. Ton **informatif** (`text-sm text-muted-foreground`), jamais une alerte d'erreur permanente.
- **Un contrôle est à dessiner que la maquette ne montre pas** : l'archivage par icône sur chaque ligne (§1, PO-WM-05). Il doit se lire comme « archiver », **jamais comme « supprimer définitivement »** — c'est une adhésion financière et nominative, rien n'est effacé (§2.5).
- Contraintes issues de cette passe, à ne pas contredire : la colonne `STATUT` rend les **trois** valeurs existantes et leurs libellés déjà écrits (`En attente` / `Active` / **`Suspendue`**, cette dernière n'étant illustrée nulle part) ; la colonne `COTISATION` est **dérivée d'une somme**, jamais un champ modifiable — **à ne pas confondre avec « Cotisation totale (€) », qui est le montant dû et l'est, lui, bel et bien** ; ni le statut ni l'état de cotisation ne sont portés par la **couleur seule** (AC-WM-33 — la barre de progression ne compte pas comme doublure textuelle) ; aucun contrôle de suppression définitive ne doit apparaître, pas même désactivé.
- **Réutiliser `MembershipStatusBadge`** (`presentation/features/profile/components/`) plutôt que de redessiner un badge de statut : ses trois libellés et ses trois teintes existent, sont déjà en production côté mobile et sont déjà couverts par AC-PR-17.
- **Trois filtres côte à côte**, et des champs d'édition qui, dans la ligne dépliée, sont **effectivement côte à côte** (la date et la liste de statut le sont dans l'export `payment-1`) : `min-w-0` obligatoire sur chaque élément de grille (piège des `<input type="date">` documenté dans `CLAUDE.md` §6, déjà rencontré sur `NewsFormDialog`). Cibles tactiles `h-11` au site d'appel, y compris sur desktop.
- Aucun nom de personne des maquettes ne doit être repris (AC-WM-27) — **ni l'adresse e-mail visible dans le panneau d'édition de `payment-1`**, qui est une donnée à lire depuis le compte, jamais une valeur codée en dur. Ni le badge de l'entrée « Utilisateurs », ni les deux blocs « ALERTE », ni l'entrée « Journal d'audit » ne doivent être introduits.
- **Deux points ouverts touchent encore la mise en page** : PO-WM-05 (le contrôle d'archivage, à dessiner sans référence) et PO-WM-02 (le rendu des cas limites de la colonne `COTISATION`, dont le cas désormais concret d'une adhésion créée **sans** montant dû). Ni l'un ni l'autre ne bloque la conception ; ils doivent être posés à la développeuse au moment du rendu plutôt que tranchés en silence. **PO-WM-01 n'est plus un point ouvert** (§2.1).

## UI design

> **Statut : réconcilié — amendement du 2026-09-17.** Cette section avait été rédigée sur les seuls exports `{1,2}`. Les deux exports supplémentaires (`payment`, `payment-1`) ont été lus directement (outil `Read`) et **trois réconciliations ont été faites** : (1) le dialogue de paiement, désormais illustré, est décrit tel qu'il apparaît (deux champs, dont le libellé exact `DATE DU VERSEMENT` — la section précédente écrivait `DATE DE PAIEMENT`, corrigé ci-dessous) ; (2) le **déclencheur de modification devient la ligne de tableau dépliable** de l'export `payment-1` (chevron dans `ACTIONS`, panneau à deux colonnes) et **remplace** le dialogue « Modifier adhésion » que cette section avait supposé par analogie avec `SeasonTable`/`SectionTable`/`TeamTable` — la création (« + Nouvelle adhésion ») reste, elle, un dialogue séparé, inchangée ; (3) le champ **« Cotisation totale (€) »** est placé dans ce panneau déplié (jamais dans le dialogue de création, qu'aucune maquette ne montre porter ce champ) et une **ligne d'explication informative** pour la règle d'activation (AC-WM-36) est rédigée et placée sous le titre. Le reste de la section, non touché par ces trois points, demeure tel quel.
>
> *Statut d'origine, conservé pour mémoire :* **à jour.** Les deux maquettes alors disponibles ont été lues directement (outil `Read`, pas seulement la description de l'agent PO) avant de rédiger cette section. Trois éléments demandés par la développeuse **n'avaient alors aucune illustration** dans les maquettes (dialogue de paiement, contrôle d'archivage, badge — ce dernier étant illustré mais avec un comptage contesté par PO-WM-06) : ils sont dessinés ci-dessous par **composition de patrons déjà construits dans ce même backoffice**, jamais par un nouveau patron visuel inventé sans référence — aucun prototype Claude Design supplémentaire n'était donc nécessaire pour cette passe (voir « Question de conception bloquante » en fin de section pour la seule réserve réelle).

### Sources utilisées, par ordre de priorité effectif

1. **`docs/designs/DESIGN_LINKS.md` §2** — aucune ligne n'existe encore pour `web-memberships` ; conformément au §4 du registre et à la ligne pré-rédigée par l'agent PO au §0 de cette spec, **aucun lien artifact n'est demandé** : statut `instantané seul` à recopier tel quel (PO-WM-11).
2. **`docs/designs/desktop/membership/[Admin] Web - Membership - {1,2}.png`** — lues directement ici. Confirment factuellement le contenu du §1 : liste à sept colonnes, trois filtres, dialogue « Nouvelle adhésion » à cinq champs, bouton « + Paiement » sur chaque ligne sans dialogue associé, badge rouge « 2 » sur l'entrée « Adhésions », **aucune icône d'archivage nulle part**. **Complétée depuis par `… - payment.png` et `… - payment-1.png`** (lues directement le 2026-09-17, réconciliation amendée ici) : contenu exact du dialogue « Enregistrer un paiement » et mise en page de la ligne dépliable d'édition avec son champ « Cotisation totale (€) ».
3. **Composants déjà construits dans ce backoffice, lus intégralement** : `presentation/features/backoffice/news/components/{NewsFormDialog,ArchiveNewsDialog,NewsTable}.tsx`, `presentation/features/backoffice/seasons/components/SeasonTable.tsx`, `presentation/features/backoffice/sections/components/SectionTable.tsx`, `presentation/features/backoffice/backoffice-nav.ts`, `presentation/features/backoffice/components/BackofficeSidebar.tsx`, `presentation/features/profile/components/MembershipStatusBadge.tsx`. Ce sont les patrons de dialogue, de tableau, de confirmation destructrice-mais-pas-vraiment et de badge de statut à réutiliser tels quels plutôt qu'à redessiner.
4. `wireframes-basiques-as-caribbean.md` — non consultée comme référence de mise en page, même raisonnement que `section-and-teams.md` : écran desktop à tableau de données, sans équivalent visuel côté mobile. Principe conceptuel repris : un contrôle **disparaît** faute de droit, il n'apparaît jamais désactivé.
5. `specs/web-memberships.md` §1 à §6 — autoritaires sur ce qui doit apparaître, sur le RBAC et sur les critères d'acceptation ; cette section ne redéfinit aucune permission.

### Où ça vit

**Une seule destination de navigation**, déjà présente dans `backoffice-nav.ts` : `/admin/memberships` (« Adhésions », `IconCreditCard`). Cette passe **remplace** le rendu actuel (`BackofficeEmptyState` inconditionnel) par l'écran décrit ci-dessous — même geste que `web-actus`/`web-seasons`/`section-and-teams` (réponse à PO-WE-10 pour cette entrée). Aucune nouvelle entrée de navigation, aucun onglet : un seul écran, un seul tableau, **un dialogue de création** (« Nouvelle adhésion »), **un dialogue de paiement** (`RecordPaymentDialog`) et **une ligne dépliable en édition** (`MembershipEditRow`, dans le tableau lui-même — pas un troisième dialogue, réconciliation du 2026-09-17).

### Ce qui change par rôle

Reprend tel quel le RBAC du §3, sans le redéfinir — deux booléens de ViewModel, calculés et rendus **séparément**, jamais fusionnés en un seul `canManageMembership` (même raisonnement que `section-and-teams` pour `canWriteSections`/`canWriteTeams`/`canAssignCoach` : un futur élargissement de `'payment:record'` seul, par exemple au Trésorier via PO-WM-08, ne doit pas activer silencieusement l'autre) :

| Élément d'écran | Booléen ViewModel | Action `can()` |
|---|---|---|
| Bouton « + Nouvelle adhésion », icône de bascule d'édition (crayon ↔ chevron) sur une ligne, icône d'archivage sur une ligne | `canWriteMembership` | `'membership:write'` |
| Bouton « + Paiement » sur une ligne | `canRecordPayment` | `'payment:record'` |

Dans cette passe, `backoffice:access` valant `['admin']` (PO-WE-01, toujours ouvert) et les deux actions ci-dessus valant également `['admin']` (§3), l'écran n'a **qu'un seul état de rendu observable en pratique aujourd'hui** : un administrateur, les deux booléens à `true`. Les deux contrôles restent néanmoins câblés sur deux booleans distincts dès cette passe, pour que l'élargissement éventuel de PO-WM-08 (Trésorier sur le paiement, Dirigeant habilité sur le dossier) n'exige aucun remaniement de l'écran, seulement un changement dans `rbac-matrix.ts`. Un booléen à `false` fait **disparaître** le contrôle correspondant — jamais un bouton grisé (reconduction du principe déjà appliqué à `SeasonTable`/`NewsTable`/`SectionTable`).

### Écran liste (`/admin/memberships`)

Reprend le squelette exact de `BackofficeNewsPage.tsx`/`BackofficeSeasonsPage.tsx` (`flex flex-1 flex-col gap-6`) :

1. **En-tête** : `<h2>Adhésions</h2>` (`text-xl font-bold`) + **deux** lignes d'explication empilées en dessous, toutes deux `text-sm text-muted-foreground` (même style, jamais une alerte) — la maquette n'a de la place que pour une ligne aujourd'hui, mais rien n'empêche d'en empiler une seconde sous le titre, le bouton restant aligné à droite sur toute la hauteur du bloc :
   1. La phrase déjà illustrée par la maquette, reprise **mot pour mot** : « Un renouvellement crée toujours une nouvelle ligne — l'historique par saison est conservé. » (règle métier, même statut que les mentions en italique de `section-and-teams`).
   2. **Ligne nouvelle, rédigée ici pour AC-WM-36** (§2.4, aucune maquette ne la fournit) : « Le statut « Active » exige une licence renseignée et une cotisation intégralement réglée. » — **informative et permanente**, jamais un état d'erreur ni un `Alert` : même balise, même taille, même couleur que la ligne précédente, simplement la ligne suivante du même bloc (`<p>` empilé, pas de bordure ni d'icône d'alerte). Elle reste affichée que la règle soit respectée ou non sur les lignes visibles — ce n'est pas un message conditionnel. Une tentative d'écriture qui viole la règle affiche, elle, séparément, le message `DomainError` traduit prévu par AC-WM-25/AC-WM-36, au point d'échec (dans le panneau déplié, voir plus bas) — jamais à cet emplacement d'en-tête.

   Bouton **« + Nouvelle adhésion »** (`Button h-11 rounded-full bg-coach-green px-4 font-bold text-white`, icône `IconPlus`) en haut à droite, rendu seulement si `canWriteMembership`.
2. **Trois filtres côte à côte**, `flex flex-wrap gap-3`, chacun `SelectTrigger h-11 rounded-xl min-w-[200px] flex-1 min-w-0` — **`min-w-0` obligatoire sur chacun des trois** (`CLAUDE.md` §6, même piège déjà documenté et déjà rencontré sur `NewsFormDialog` et sur les trois filtres de `TeamTable`) : trois `Select` côte à côte sur une largeur desktop redimensionnable jusqu'au plancher autorisé par `RequireDesktopViewport` se chevaucheraient sans elle.
   - **`SAISON`** — voir « Filtre de saison par défaut » ci-dessous.
   - **`STATUT`** — placeholder « Tous les statuts », options = les trois valeurs déjà écrites (« En attente » / « Active » / « Suspendue », mêmes libellés que `MembershipStatusBadge`, AC-WM-10) + l'option par défaut. Aucune option « Archivée » : les lignes archivées ne remontent jamais dans cette lecture administrative (§2.5), un filtre qui prétendrait les montrer serait trompeur.
   - **`COTISATION`** — placeholder « Toute cotisation », options « Non payé » / « Partiel » / « Payé », **consommant le même prédicat pur du domaine que la colonne `COTISATION`** (AC-WM-13 — un seul calcul, deux points d'affichage). Si l'arbitrage de PO-WM-01/PO-WM-02 introduit un état « cotisation non définie » (voir plus bas), ce filtre gagnera une quatrième option du même nom — non ajoutée ici par anticipation, faute d'arbitrage.
3. **Tableau à sept colonnes**, dans l'ordre exact de la maquette : `UTILISATEUR`, `SAISON`, `LICENCE`, `STATUT`, `VALIDE JUSQU'AU`, `COTISATION`, `ACTIONS` (dernière colonne : en-tête `sr-only`, même patron que `NewsTable`/`SeasonTable`, pour ne pas casser l'alignement des cellules avec un texte visible absent de la maquette).
   - `UTILISATEUR` — nom du compte, texte simple (`font-semibold`), jamais un identifiant (résolu par le mapper, §2.10).
   - `SAISON` — libellé de saison, texte simple. Contrairement à `TeamTable` (`section-and-teams`), **`SeasonStatusBadge` n'est pas dupliqué ici** : la maquette ne montre aucun badge d'état sur cette colonne (les quatre lignes sont toutes `2025-2026`, sans indication d'état), et ajouter un badge d'état de saison sur *chaque ligne d'adhésion* ferait doublon avec le filtre `SAISON` déjà positionné sur l'état courant juste au-dessus — à ne pas introduire sans que la maquette ou la développeuse le demande.
   - `LICENCE` — texte simple, **cellule vide acceptée comme cas normal** (`—` ou vide, pas un état d'erreur), conformément à la ligne 1 de la maquette et à AC-WM-15.
   - `STATUT` — **`MembershipStatusBadge` réutilisé tel quel**, sans le redessiner (déjà en production côté mobile, déjà couvert par AC-PR-17 « jamais la couleur seule »). Rend le **statut stocké seul** (§2.4) — jamais `isActive()`/`isExpired()`.
   - `VALIDE JUSQU'AU` — date au format `AAAA-MM-JJ`, même traitement que `SeasonTable.startDate`/`endDate` (colonne `date` native, déjà sérialisée dans ce format par PostgREST, **pas** de second passage par `toDateInputValue(new Date(...))` qui décalerait le jour dans les fuseaux derrière UTC — AC-WM-19).
   - `COTISATION` — voir sous-section dédiée ci-dessous.
   - `ACTIONS` — trois contrôles possibles par ligne, dans cet ordre (gauche à droite, sévérité croissante — même logique de tri que `NewsTable` qui place le crayon avant la corbeille) :
     1. **« + Paiement »** — `Button variant="outline" h-11 rounded-full`, texte seul (fidèle à la maquette, pas d'icône), rendu si `canRecordPayment`. **Rendu sur toutes les lignes sans exception, y compris une ligne déjà à `300€ / 300€`** — ne pas le masquer une fois « payé » : la sur-perception (PO-WM-02) n'est pas tranchée, un masquage préjugerait la réponse.
     2. **Icône de bascule d'édition (crayon ↔ chevron)** — voir sous-section dédiée « Ligne dépliable d'édition » ci-dessous. **Ceci corrige l'hypothèse initiale de cette section**, qui proposait ici une icône crayon ouvrant un dialogue « Modifier adhésion » par analogie avec `SeasonTable`/`SectionTable`/`TeamTable` : l'export `payment-1` montre que la modification se fait **dans la ligne elle-même**, pas dans un dialogue. `Button variant="ghost" size="icon" className="h-11 w-11 rounded-full"`, rendu si `canWriteMembership`.
     3. **Icône d'archivage** — voir sous-section dédiée ci-dessous (composant non illustré par la maquette, PO-WM-05).
4. **Trois états**, patron identique à `NewsTable`/`SeasonTable` : chargement → `MembershipTableSkeleton` (nouveau, jumeau de `NewsTableSkeleton`/`SeasonTableSkeleton`, jamais un flash de liste vide) ; erreur → `Alert variant="destructive"` avec message français traduit d'une `DomainError` ; liste vide → `BackofficeEmptyState` (réutilisé tel quel, `icon`/`emptyStateTitle` de l'entrée `memberships`) — **cas normal en début de saison** (AC-WM-25), pas une erreur.
5. **État « résultat de filtre vide »**, distinct de l'état vide ci-dessus (même geste que `section-and-teams` §"Écran Sections" point 7, non couvert par un AC explicite mais nécessaire dès que des filtres existent) : si `rows.length === 0` et qu'au moins un des trois filtres est actif, réutiliser le **même** `BackofficeEmptyState` avec un `title`/`description` différents (« Aucune adhésion ne correspond à ces filtres ») plutôt que le message de démarrage de club, qui suggérerait à tort qu'aucune adhésion n'existe.

### Colonne `COTISATION` — rendu par état, y compris les cas limites (PO-WM-02)

Le rendu confirmé par la maquette pour les trois états déjà tranchés par §2.3 :

| État | Texte | Couleur | Barre de progression |
|---|---|---|---|
| Non payé | `0€ / 300€` | rouge (`text-destructive` ou équivalent déjà utilisé, à aligner sur le rouge de la maquette) | vide |
| Partiel | `150€ / 300€` | ambre (même teinte que `coach-amber` déjà utilisée par `MembershipStatusBadge` pour « En attente ») | remplie à hauteur du ratio payé/dû |
| Payé | `300€ / 300€` | vert (même teinte que `MembershipStatusBadge` pour « Active ») | pleine |

Le texte `X€ / Y€` porte **toujours** l'information (AC-WM-33 — la barre seule ne compte pas comme doublure textuelle, elle est décorative). La barre est un simple `div` avec largeur en pourcentage, pas un composant `Progress` shadcn distinct si aucune de ses fonctionnalités (accessibilité ARIA de type range) n'est nécessaire au-delà de l'affichage — à confirmer au moment de coder, non bloquant ici.

**Deux cas limites que PO-WM-02 laisse ouverts** — la conception ci-dessous n'est **pas** une résolution de ce point ouvert, seulement un rendu par défaut sûr à construire en attendant l'arbitrage, choisi pour ne jamais afficher un chiffre trompeur :

- **Sur-perception** (somme encaissée > montant dû, ex. `350€ / 300€`) — l'état dérivé reste « Payé » (§2.3 : `somme ≥ montant dû`), donc **même teinte verte, même texte doublé**. Seule la barre change : elle est **plafonnée visuellement à 100 %** (jamais un dépassement du conteneur), le texte affichant lui le montant réel non plafonné (`350€ / 300€`, jamais arrondi à `300€ / 300€` qui masquerait un trop-perçu). Aucune nouvelle couleur inventée pour ce cas — un violet ou un bleu « sur-payé » serait un quatrième état non demandé.
- **Montant dû nul ou non paramétré** — plutôt qu'un `X€ / 0€` qui afficherait une division par zéro sur la barre et ferait passer trivialement n'importe quelle ligne à « Payé » dès le premier centime encaissé, le rendu proposé est un **état textuel distinct et neutre** : `Cotisation non définie`, en `text-muted-foreground`, sans barre de progression et sans les trois couleurs existantes (ni rouge, ni ambre, ni vert — un quatrième état visuellement neutre, pas une réutilisation trompeuse d'une des trois teintes). C'est un texte, pas une couleur seule (conforme AC-WM-33) : il n'est pas nécessaire d'y adjoindre autre chose.

Si PO-WM-01/PO-WM-02 tranchent différemment (exonération = « Payé » d'office, par exemple), seul le prédicat du domaine change — la colonne continue de consommer le résultat tel quel (AC-WM-12/AC-WM-13), aucun remaniement de mise en page n'est nécessaire.

### Nouveau composant — ligne dépliable d'édition (`MembershipEditRow`, déclenchée par le chevron de `ACTIONS`)

**Illustré directement par l'export `payment-1`** — ceci remplace la proposition initiale de cette section (un dialogue « Modifier adhésion » calqué sur `SeasonTable`/`SectionTable`/`TeamTable`), écartée depuis que la maquette montre l'édition **dans la ligne elle-même** (§0, §1, §7). Aucune maquette ne fournit ce patron ailleurs dans le dépôt : c'est un **nouveau composant**, mais dont la mise en page est **entièrement dictée par la maquette**, pas inventée — pas de prototype Claude Design supplémentaire nécessaire pour celui-ci.

**Déclenchement et bascule d'icône** — le second bouton de la colonne `ACTIONS` (§ ci-dessus) porte **une seule icône à la fois**, qui change avec l'état :
- **Ligne repliée** (état par défaut, celui des exports 1/2/`payment` et des lignes 2 à 4 de `payment-1`) — icône **crayon** (`IconPencil`), `aria-label="Modifier l'adhésion de « {Utilisateur} »"`. Cliquer **déplie** la ligne.
- **Ligne dépliée** (celui de la ligne 1 de `payment-1`) — icône **chevron** (`IconChevronDown` tourné, ou `IconChevronUp`), `aria-label="Réduire l'adhésion de « {Utilisateur} »"`. Cliquer **replie** la ligne, sans enregistrer si le formulaire n'a pas été soumis (comportement identique à un `Annuler` de dialogue — voir gestion des saisies non enregistrées plus bas).

Une seule ligne dépliée à la fois suffit pour cette passe (rien dans la maquette ni dans la demande n'exige un dépliage multiple) ; déplier une seconde ligne referme la première — évite un tableau à la hauteur imprévisible avec plusieurs formulaires ouverts en même temps.

**Mise en page du panneau déplié** — inséré **dans le tableau**, entre la ligne concernée et la suivante (`<tr>` supplémentaire à `colSpan` plein, pas une superposition), **deux colonnes côte à côte** (`grid grid-cols-2 gap-6`, chaque colonne `min-w-0` — même piège CLAUDE.md §6 que les trois filtres, ici avec un enjeu réel puisque la colonne de gauche empile elle-même des champs côte à côte, voir plus bas) :

- **Colonne gauche — « INFORMATIONS DU JOUEUR »** (`text-xs font-semibold uppercase text-muted-foreground` en en-tête de colonne, même traitement typographique que les en-têtes de colonnes du tableau) :
  1. **Nom** et **e-mail** du compte — deux champs d'apparence **non modifiable** (`Input disabled`, ou simple texte dans un encadré visuellement identique à un champ désactivé pour rester cohérent avec la maquette qui les rend comme des champs grisés plutôt que du texte nu) : donnée du compte utilisateur, **lue, jamais écrite** depuis cet écran (§2.10). Ni l'un ni l'autre n'est un champ de formulaire au sens de la soumission.
  2. **`Licence`** — `Input h-11 rounded-xl`, `placeholder` vide accepté (cellule vide = cas normal, §2.1), pré-rempli avec `licence_number` existant.
  3. **`Valide jusqu'au` et statut, côte à côte** (`grid grid-cols-2 gap-3`, **chaque cellule `min-w-0` obligatoire** — piège documenté CLAUDE.md §6 pour tout `<input type="date">`, déjà rencontré sur `NewsFormDialog`/`TeamTable`, et **concrètement visible ici** puisque la maquette les met effectivement côte à côte) : `Input type="date" h-11 rounded-xl` pour la date, `SelectTrigger h-11 rounded-xl` pour le statut (trois options déjà écrites, `MembershipStatusBadge`, AC-WM-10).
  4. **« Cotisation totale (€) »** (`amount_due_cents`, §2.1, AC-WM-34) — `Label` + `Input type="number" step="0.01" min="0" h-11 rounded-xl`, suffixe visuel `€`, pré-rempli avec la valeur existante (`300` dans l'exemple), **modifiable** (AC-WM-26). Saisi en euros, converti en centimes par le ViewModel avant l'appel au use case, même règle qu'au §2.1/AC-WM-34 — jamais un flottant, jamais un centime brut exposé à la saisie. **Ce champ n'apparaît que dans ce panneau, jamais dans le dialogue « Nouvelle adhésion »** : aucune maquette ne le montre à la création, écart déjà signalé et non comblé par cette section (§7, PO-WM-02) — il n'est **pas ajouté** au dialogue de création.
  - **`UTILISATEUR` et `SAISON` n'apparaissent pas comme champs** dans ce panneau (AC-WM-26) : la maquette les affiche uniquement dans la ligne elle-même (colonnes déjà visibles à gauche du tableau), pas dans le panneau déplié — ce sont l'identité de la ligne, pas des valeurs à choisir une seconde fois. Rien à afficher en double ici.
- **Colonne droite — « HISTORIQUE DES VERSEMENTS »** (même traitement typographique d'en-tête) : **réutilise le composant de liste de paiements** décrit ci-dessous pour `RecordPaymentDialog` (`PaymentHistoryList`, extrait en composant partagé — voir juste après) plutôt que d'en écrire un second. État vide identique à celui déjà spécifié pour le dialogue : « Aucun versement enregistré. » (texte exact de la maquette, `text-sm text-muted-foreground`), sans bouton d'ajout dans ce panneau — l'ajout d'un paiement reste le geste **« + Paiement »** de la colonne `ACTIONS`, pas un formulaire dupliqué ici.

**Pied du panneau** — `Annuler` (`variant="outline" h-11 rounded-full`, replie la ligne sans écrire, saisies perdues) / `Enregistrer` (`h-11 rounded-full bg-coach-green font-bold text-white`, libellé `Enregistrement…` pendant la soumission). Un échec (y compris un refus AC-WM-35/AC-WM-36 — statut `active` demandé sans licence ou sans cotisation soldée) affiche un `Alert variant="destructive" role="alert"` **dans le panneau, sous les deux colonnes**, message français traduit d'une `DomainError`, **le panneau reste déplié et les saisies conservées** (reconduction d'AC-WM-25). Un succès replie la ligne et invalide la ligne du tableau (statut, cotisation potentiellement inchangée puisque ce panneau ne touche pas aux paiements) sans rechargement manuel.

**RecordPaymentDialog reste-t-il nécessaire à côté de ce panneau ?** Oui, et ce n'est pas redondant : « + Paiement » est cliquable **sur une ligne repliée** (les exports 1, 2 et `payment` le montrent sans qu'aucune ligne ne soit dépliée), donc le dialogue doit continuer à porter son **propre** historique pour rester utilisable indépendamment du dépliage — obliger l'administrateur à déplier la ligne avant de pouvoir enregistrer un paiement ajouterait un clic que la maquette ne demande pas. Ce que cette réconciliation change en revanche : la liste d'historique elle-même (formatage, état vide, ordre) est **extraite en un composant partagé** (`PaymentHistoryList`, prenant la liste déjà résolue par le ViewModel en prop) **consommé aux deux endroits** — dans `RecordPaymentDialog` et dans la colonne droite du panneau déplié — plutôt que réécrite deux fois. Un seul composant, deux points d'usage, même donnée (§2.10).

### Nouveau composant — `RecordPaymentDialog` (déclenché par « + Paiement »)

**Aucune maquette ne l'illustre pour son propre déclenchement** — mais le contenu du dialogue, lui, **est** désormais illustré par l'export `payment` (§0, §1) : deux champs (`MONTANT (€)`, `DATE DU VERSEMENT`), la mention en italique reproduite au §1, `Annuler`/`Enregistrer`. Composé à partir de deux patrons déjà en production dans ce backoffice plutôt qu'inventé : la structure de formulaire de `NewsFormDialog.tsx` (dialogue shadcn, champs empilés, pied de page `Annuler`/bouton d'action, trois états soumission/échec/succès) et une **liste plate, la plus récente en tête** pour l'historique (`PaymentHistoryList`, désormais partagée avec le panneau déplié ci-dessus) — pas le patron « N total, le plus récent déplié » des convocations mobiles (`wireframes-basiques-as-caribbean.md`), qui suppose un seul élément méritant d'être déplié parmi plusieurs équivalents : ici, chaque paiement est un fait daté et cumulatif de même nature (§2.2), aucun n'a de raison d'être mis en avant plus qu'un autre — une simple liste chronologique inversée suffit et n'invente aucun nouveau motif visuel.

**Contenu, de haut en bas :**

1. **Titre** — « Enregistrer un paiement ».
2. **Ligne de contexte**, `text-sm text-muted-foreground` : `{Utilisateur} · saison {libellé} — {somme encaissée}€ / {montant dû}€ réglés à ce jour`. Reprend **le même texte** que la cellule `COTISATION` de la ligne d'où le dialogue a été ouvert (même prédicat, AC-WM-13) — pas un second calcul inline dans ce composant.
3. **`PaymentHistoryList`** (composant partagé, voir ci-dessus) — rendu seulement si le ViewModel a déjà résolu la liste (aucun appel réseau depuis ce composant, §2.10) :
   - **Aucun paiement encore enregistré** — texte **« Aucun versement enregistré. »** (`text-sm text-muted-foreground`) — libellé exact repris de l'état vide illustré par l'export `payment-1` (« HISTORIQUE DES VERSEMENTS »), pour que les deux points d'usage du composant affichent mot pour mot le même texte ; jamais une section vide sans explication.
   - **Au moins un paiement** — liste compacte, plus récent en premier, une ligne par paiement : date à gauche (`AAAA-MM-JJ`, même formateur que le reste de l'écran), montant à droite (`Xé`, `font-medium`), `text-sm`, séparateur léger entre lignes (`divide-y divide-border`), **aucun contrôle de modification ou de suppression sur une ligne d'historique** (§2.2 — append-only, aucune politique `update`/`delete`, AC-WM-06). Pas de pagination interne dans cette passe (une adhésion reçoit rarement plus de quelques paiements) — à revisiter si l'usage réel montre le contraire.
4. **Séparateur visuel** (`border-t border-border`, ou simple `pt-4`) entre l'historique et le formulaire d'ajout.
5. **Formulaire d'ajout**, deux champs **empilés verticalement** (pas côte à côte : dialogue déjà étroit type `NewsFormDialog` — `sm:max-w-[480px]` —, et rien n'oblige à les mettre en ligne pour seulement deux champs ; choix qui évite d'emblée le piège `min-w-0` plutôt que de le documenter pour le contourner) :
   - **`MONTANT`** — `Label` + `Input type="number" step="0.01" min="0.01" inputMode="decimal" h-11 rounded-xl`, suffixe visuel `€`, `required`. Saisi en euros (expérience utilisateur), **converti en centimes par le ViewModel avant l'appel au use case** — jamais un `Input` en centimes bruts, et jamais une multiplication flottante `× 100` non maîtrisée à cette frontière (§2.2 — le stockage en centimes est une contrainte de domaine, pas une contrainte de saisie ; la conversion elle-même est un point d'implémentation à traiter avec soin, hors du ressort de cette section). Aucun plafond client contre le montant dû : **le formulaire n'empêche pas une sur-perception** (PO-WM-02 non tranché, un plafond préjugerait la réponse).
   - **`DATE DU VERSEMENT`** — libellé **corrigé** pour reprendre mot pour mot celui de l'export `payment` (cette section écrivait auparavant « DATE DE PAIEMENT », discrepancy relevée par la passe PO) — `Label` + `Input type="date" h-11 rounded-xl`, `required`, **pré-rempli à la date du jour** (un paiement reçu aujourd'hui est le cas le plus fréquent), modifiable (un chèque reçu la veille et saisi le lendemain doit pouvoir porter sa vraie date de réception, §2.2).
   - **Aucun champ « moyen de paiement »** — délibérément absent : ni les maquettes ni la demande ne le montrent, et PO-WM-04 le signale explicitement comme **à ne pas inventer** sans arbitrage. Si le Bureau le confirme plus tard, il prendra place ici, entre `MONTANT` et `DATE DU VERSEMENT`, sans changer le reste de la mise en page.
6. **Message d'erreur** — `Alert variant="destructive" role="alert"`, message français issu d'une `DomainError` traduite (jamais un message brut Supabase), affiché si l'enregistrement échoue ; le dialogue **reste ouvert avec les saisies conservées** (AC-WM-25).
7. **Pied de page** — `Annuler` (`variant="outline" h-11 rounded-full`) / `Enregistrer` (`h-11 rounded-full bg-coach-green font-bold text-white`, libellé `Enregistrement…` pendant la soumission), bouton de soumission `disabled` tant que le montant n'est pas strictement positif ou que la date est absente (reflète AC-WM-16 côté UI, en plus du refus déjà posé côté domaine).

**À la fermeture réussie** : invalidation de la cellule `COTISATION` de la ligne concernée **et** du badge de navigation, sans rechargement manuel (AC-WM-24, clés centralisées dans `query-keys.ts`) — comportement déjà établi, décrit ici pour mémoire, pas reconçu.

### Nouveau contrôle — icône d'archivage (PO-WM-05, non illustré par les maquettes)

**Précédent trouvé dans ce backoffice** : `ArchiveNewsDialog.tsx` (club_news), seul cas existant d'archivage-plutôt-que-suppression dans ce dépôt. Repris comme structure de confirmation, **avec deux différences délibérées** imposées par le §7 de cette spec (« il doit se lire comme « archiver », jamais comme « supprimer définitivement » ») et par la nature financière/nominative de la ressource :

- **Icône** — `IconArchive` (`@tabler/icons-react`), pas `IconTrash` : `Button variant="ghost" size="icon" className="h-11 w-11 rounded-full"`, `aria-label="Archiver l'adhésion de « {Utilisateur} »"`. Couleur **neutre** (`text-muted-foreground`, hover `text-foreground`), **pas** `text-destructive` comme la corbeille de `NewsTable` : contrairement à une actu supprimée du fil, archiver une adhésion ne retire rien à personne d'irréversible dans l'instant (les paiements restent rattachés, §2.5) — une teinte rouge suggérerait une gravité que le geste n'a pas, et contredirait le principe « ne jamais lire comme une suppression définitive ».
- **Placement** — troisième et dernière icône de la colonne `ACTIONS`, après « + Paiement » et le crayon (voir tableau ci-dessus), rendue si `canWriteMembership`. **Jamais rendue sur une ligne déjà archivée** — sans objet, puisque les lignes archivées ne remontent pas dans cette liste (§2.5).
- **Dialogue de confirmation** — `AlertDialog` (même primitive shadcn qu'`ArchiveNewsDialog`), titre **« Archiver cette adhésion ? »** (jamais « Supprimer »). Corps, texte à adapter mais portant ces trois idées, dans cet ordre :
  1. Ce qui disparaît : « Cette adhésion ne sera plus visible dans la liste ni sur le profil mobile du membre. »
  2. Ce qui ne disparaît pas : « Elle est conservée avec son historique de paiements — elle n'est pas supprimée. »
  3. **Condition** : si le ViewModel sait déjà que la ligne porte au moins un paiement enregistré (`somme encaissée > 0`), une troisième phrase d'avertissement s'ajoute : « Cette adhésion a déjà reçu {somme}€ de paiements — l'archivage retire cette situation financière de la vue courante, sans effacer les paiements eux-mêmes. » **Cette troisième phrase est une proposition de conception, pas un arbitrage de PO-WM-05** (« peut-on archiver une adhésion portant déjà des paiements — et si oui, faut-il un avertissement » reste explicitement ouvert) : elle répond à la question par « oui, on peut, avec un avertissement contextuel », ce qui semble la lecture la plus sûre pour une donnée financière, mais reste à confirmer avec la développeuse/le Bureau avant construction définitive.
  - Boutons : `Annuler` (`variant="outline" h-11 rounded-full`) / `Archiver` (`h-11 rounded-full`, couleur neutre ou ambre plutôt que le rouge `bg-coach-red` qu'utilise `ArchiveNewsDialog` — même raisonnement de gravité que pour l'icône), libellé `Archivage…` pendant la soumission.
- **Après confirmation** — la ligne disparaît de la liste sans rechargement manuel (AC-WM-22), et le badge de navigation se met à jour au même titre qu'un paiement (une adhésion « En attente » archivée doit sortir du compteur, quel que soit l'arbitrage final de PO-WM-06).
- **Ce qui n'est délibérément pas construit** : aucun écran ni contrôle de consultation des archives, aucun bouton de désarchivage direct (§2.5 l'assume explicitement pour cette passe — la seule voie de retour est la recréation décrite en §2.7, PO-WM-03).

### Badge de navigation sur l'entrée « Adhésions »

**Aucun précédent construit dans ce dépôt** : `backoffice-nav.ts` ne porte aujourd'hui aucun champ de badge (son propre commentaire dit pourquoi — « a count is invented data until PO-WE-11 says what it counts »), et `BackofficeSidebar.tsx` ne rend rien de tel. C'est donc le **premier** badge de navigation réellement dessiné pour ce backoffice, à construire spécifiquement pour l'entrée `memberships` (§2.8 le prévoit explicitement, en résolution **partielle** de PO-WE-11 — celui de `users` et les deux blocs ALERTE restent hors périmètre, AC-WE-13 reconduit).

- **Rendu** — un petit `Badge` (primitive shadcn déjà vendue) circulaire, fond rouge plein (même famille de rouge que `bg-coach-red`, déjà un token établi dans ce dépôt via `ArchiveNewsDialog`), texte blanc gras, taille compacte (`text-[11px]`, `h-5 min-w-5 px-1.5`, `rounded-full`), positionné **immédiatement après le libellé** « Adhésions » dans la ligne de navigation — fidèle à la maquette (pastille rouge « 2 » collée au texte, pas dans un coin flottant de l'icône).
- **Visibilité** — affiché seulement si le compte est strictement positif ; masqué (pas un `0` affiché en permanence) quand il vaut zéro, pour ne pas transformer un signal d'attention en bruit constant.
- **Source du chiffre** — **non résolue ici, volontairement** : PO-WM-06 reste entièrement ouvert (adhésions non intégralement payées, comme le demande la développeuse, vs. adhésions au statut « En attente », comme le rend la maquette — deux nombres différents sur les mêmes quatre lignes). Le rendu ci-dessus **fonctionne à l'identique quel que soit le nombre finalement retenu** : un seul entier, une seule pastille, aucune mise en page ne dépend de la définition exacte. Ce que cette section fixe malgré tout, conformément à §2.8 : le badge vient d'une **lecture de comptage dédiée et légère** (jamais le chargement de la liste complète des adhésions pour compter côté client), avec sa propre `queryKey`, et le comptage est borné à la **saison en cours** (cohérent avec le filtre par défaut de l'écran).
- **Repli si aucune saison n'est en cours** — si PO-WM-07 (repli du filtre de saison) et PO-WM-06 (portée du comptage) aboutissent tous deux à « pas de saison en cours = pas de badge », le badge disparaît simplement (aucun `0` ni aucun état d'erreur affiché dans la navigation) plutôt que d'afficher un chiffre calculé sur une saison qui n'existe pas.

### Filtre de saison par défaut et repli (§2.6)

- **Cas normal** — au chargement, le `Select` `SAISON` est positionné sur la saison désignée par `current_season()` (Postgres, jamais l'horloge du navigateur, AC-WM-20), avec le **même suffixe d'état** que `web-seasons` (`2025-2026 (en cours)`) — issu du prédicat à trois valeurs déjà écrit pour `SeasonStatusBadge`/`AC-WS-12`, pas un second test inline. C'est exactement ce que montre l'export 1 de la maquette.
- **Cas de césure (§2.6c, PO-WM-07 non tranché)** — l'écran ne doit **jamais** se retrouver silencieusement sur une liste vide sans explication ni sur une erreur (AC-WM-21). Rendu proposé, cohérent avec le comportement déjà décrit pour le badge ci-dessus : le `Select` se positionne sur **« Toutes les saisons »** (l'option déjà présente dans la maquette, export 2) plutôt que sur une saison arbitraire, accompagné d'une ligne `text-sm text-muted-foreground` sous les filtres : « Aucune saison n'est actuellement en cours — toutes les saisons sont affichées. » **Cette bascule précise n'est pas un arbitrage définitif de PO-WM-07** (l'alternative « dernière saison terminée » reste également défendable et n'est pas exclue) : elle est proposée ici parce que l'option existe déjà dans le `Select` de la maquette et qu'elle ne nécessite aucun nouveau composant, pas parce que les documents de cadrage la confirment.

### Composants shadcn mobilisés

| Élément visuel | Primitive | Déjà vendue ? |
|---|---|---|
| Tableau `MembershipTable` | `table.tsx` | Oui |
| Dialogue « Nouvelle adhésion » et `RecordPaymentDialog` | `dialog.tsx` | Oui |
| Ligne dépliable d'édition (`MembershipEditRow`) | `<tr>` supplémentaire dans `table.tsx`, pas un `dialog.tsx` — la modification n'est **plus** un dialogue (réconciliation du 2026-09-17) | Oui (aucune nouvelle primitive shadcn) |
| Historique des versements (`PaymentHistoryList`) | Composant partagé, liste `div`/`divide-y`, pas de primitive shadcn dédiée — consommé par `RecordPaymentDialog` **et** `MembershipEditRow` | Oui |
| Confirmation d'archivage | `alert-dialog.tsx` | Oui — déjà mobilisée par `ArchiveNewsDialog` |
| Lignes de chargement | `skeleton.tsx` | Oui |
| Champs `Input`/`Select`/boutons | `input.tsx`, `label.tsx`, `select.tsx`, `button.tsx` | Oui |
| Badge de statut (réutilisé) | `badge.tsx` (via `MembershipStatusBadge`, déjà construit) | Oui |
| Badge de navigation | `badge.tsx`, nouvel usage minimal (fond plein rouge, pas de variante existante à créer) | Oui |
| Messages d'erreur | `alert.tsx` | Oui |
| Filtres (saison, statut, cotisation) | `select.tsx`, réutilisé tel quel comme filtre à choix unique | Oui |
| Barre de progression de `COTISATION` | `div` avec largeur en pourcentage — pas `progress.tsx` shadcn sauf si son sémantique ARIA s'avère utile au moment de coder | À vérifier, non bloquant |

### Cibles tactiles et champs côte à côte

`h-11` au site d'appel pour tous les `Input`/`SelectTrigger`/`Button` de cette feature (`CLAUDE.md` §6), y compris sur desktop — aucune valeur par défaut `h-8` shadcn laissée telle quelle. Les trois filtres côte à côte de l'écran liste portent chacun `min-w-0` (voir « Écran liste » ci-dessus) : même piège déjà rencontré sur `NewsFormDialog` et sur les trois filtres de `TeamTable`, à ne pas laisser sans cette classe au moment de coder. Le formulaire de `RecordPaymentDialog` **évite délibérément** la question en empilant `MONTANT`/`DATE DU VERSEMENT` verticalement plutôt qu'en les mettant côte à côte — si un futur remaniement les met en ligne, `min-w-0` sur chacun sera obligatoire (piège documenté par `CLAUDE.md` §6 pour tout `<input type="date">`). **La ligne dépliable d'édition, elle, ne l'évite pas** : la maquette (`payment-1`) met effectivement `Valide jusqu'au` et le statut côte à côte dans la colonne « INFORMATIONS DU JOUEUR » — `min-w-0` obligatoire sur chacune des deux cellules de cette grille, et les deux colonnes du panneau (« INFORMATIONS DU JOUEUR » / « HISTORIQUE DES VERSEMENTS ») portent elles aussi `min-w-0` pour la même raison, à vérifier au plancher de largeur autorisé par `RequireDesktopViewport` (même exigence que pour les trois filtres ci-dessus), pas seulement sur la largeur confortable de la maquette.

### Ce qui ne doit pas apparaître — rappel, non redéfini ici

Aucun champ de moyen de paiement en ligne, aucun prestataire, aucun webhook (§1, AC-WM-32). Aucun contrôle de suppression **définitive** — pas même désactivé — nulle part sur cet écran (§2.5) : l'icône d'archivage est le seul contrôle qui retire une ligne de la vue courante. Aucun écran de consultation des archives, aucun bouton de désarchivage direct (§2.5). Aucun nom de personne codé en dur, y compris ceux des maquettes (AC-WM-27). Ni le badge de l'entrée « Utilisateurs », ni les deux blocs « ALERTE », ni l'entrée de navigation « Journal d'audit » ne sont introduits (AC-WE-13 reconduit, PO-WA-09).

### Questions UI — récapitulatif, non bloquantes pour construire

- **PO-WM-02** — rendu proposé pour la sur-perception (barre plafonnée à 100 %, texte non plafonné) et pour le montant dû nul/non paramétré (état textuel neutre « Cotisation non définie », sans couleur ni barre) : des défauts sûrs, pas un arbitrage définitif.
- **PO-WM-05** — contrôle d'archivage dessiné sans référence visuelle (icône `IconArchive` neutre, dialogue de confirmation en trois phrases) ; la phrase d'avertissement conditionnelle sur une adhésion déjà payée est une proposition, à confirmer avec la développeuse/le Bureau avant construction définitive.
- **PO-WM-06** — le rendu du badge (pastille rouge pleine, masquée à zéro) fonctionne à l'identique quel que soit le chiffre retenu ; seule la requête qui l'alimente reste à trancher.
- **PO-WM-07** — repli proposé pour l'absence de saison en cours (« Toutes les saisons » + ligne explicative sous les filtres), non exclusif de l'alternative « dernière saison terminée ».

**Non redécidés ici, comme demandé** : PO-WM-03 (sémantique de « remplacer » lors d'une recréation après archivage), PO-WM-08 (élargissement du RBAC au Trésorier/Dirigeant habilité) et PO-WM-09 (journal d'audit) — tous des points de modèle de données, de RBAC ou d'audit, hors du ressort de cette section. **PO-WM-01 est en revanche résolu depuis le 2026-09-17** (§2.1 : le montant dû est une colonne de l'adhésion, saisie via « Cotisation totale (€) ») — les mentions de ce point ouvert ci-dessus datent de la rédaction initiale de cette section et sont à relire à ce titre lors de sa réconciliation (§7).

### Question de conception bloquante

**Aucune.** Les trois éléments confiés à cette passe (dialogue de paiement, contrôle d'archivage, badge) se laissent tous décrire par composition de patrons déjà construits dans ce backoffice (`NewsFormDialog`, `ArchiveNewsDialog`, `Badge`) — aucun n'appelle un motif visuel réellement nouveau qui justifierait de suspendre cette section en attendant un prototype Claude Design.

**Réconciliation du 2026-09-17, même constat.** La ligne dépliable d'édition (`MembershipEditRow`) est un composant nouveau pour ce dépôt, mais sa mise en page est **entièrement lue depuis l'export `payment-1`**, pas inventée depuis une description écrite : `<tr>` supplémentaire à deux colonnes, champs déjà connus (`Input`, `SelectTrigger`), liste d'historique déjà spécifiée pour `RecordPaymentDialog`. Aucune question de conception bloquante n'en découle non plus.
