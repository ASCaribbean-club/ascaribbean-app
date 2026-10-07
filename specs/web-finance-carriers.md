# Spec — Backoffice web : porteurs de fonds (`web-finance-carriers`)

> Statut : **rédaction initiale 2026-10-07.** Lève **PO-FI-03** de `specs/mob-treasurer-finances.md` (« qui crée et modifie les porteurs ? »). **Aucun point ouvert bloquant pour designer-agent.** Les défauts proposés par la développeuse sont repris et signalés **à confirmer** (§6). Un seul point est à trancher **avant d'écrire la migration** : PO-FC-03 (contenu de la `metadata` d'audit).
> Demande d'origine (développeuse, relayée par l'orchestrateur) : dans le backoffice web, un écran où l'**Administrateur** **ajoute** et **renomme** les porteurs (table `finance_carriers` : `label`, `kind` `bank | cash`, `detail`, `manager_user_id`), **sans aucune possibilité de suppression**. Motif : dépenses, soldes d'ouverture, versements de cotisation et lignes de point de trésorerie référencent les porteurs. Aujourd'hui la table est **vide**, si bien que l'écran Finances du Trésorier n'affiche **aucun contrôle d'écriture** (`canWrite = hasSeason && hasCarriers`). Cette feature le débloque.
> Sources : `specs/mob-treasurer-finances.md` (§1, §2 « Porteur », §3, §4, AC-FI-03/06/14/16/18/19/31, PO-FI-03/08/12), `specs/mob-treasurer-finances-edit.md` (§3 « Aucune politique update / delete n'est accordée sur `finance_carriers` », PO-FIE-03, O-FIE-UI-05), `specs/web-localizations.md` (patron backoffice : référentiel admin, tableau + dialogue à deux modes, pas de suppression), `docs/priorisation-fonctionnelle-as-acaribbean.md` (matrice : « Gérer comptes, rôles, paramétrage » ; journal d'audit §11.3), `docs/roles-personas-as-caribbean.md` (Administrateur : « Paramétrage, comptes, rôles, saisons, sécurité et audit » ; Trésorier : « Cotisations, échéanciers, relances, exports financiers »), `docs/designs/DESIGN_LINKS.md` §4, `CLAUDE.md` §3/§4/§6/§7/§9.
> État du code lu : `supabase/migrations/20261007081032_finances.sql` (table `finance_carriers`, politique `finance_carriers_select`, `get_finance_carriers()`, `get_finances_snapshot()`, `record_treasury_checkpoint()` qui exige **une ligne par porteur existant**), `supabase/migrations/20261007120000_finances_edit.sql` (version courante de `get_finances_snapshot()`, `record_audit_log_entry` : l'admin peut déjà écrire **tout** code), `src/domain/policies/{rbac-matrix,audit-actions}.ts`, `src/presentation/features/finances/useFinancesViewModel.ts` (`hasCarriers`), `src/presentation/features/finances/components/TreasuryTab.tsx` (« Aucun porteur n'est configuré. »), `src/presentation/features/backoffice/backoffice-nav.ts`, politique `users_select_own` (l'admin lit tous les comptes).

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne au registre** pour cette feature, et **aucun export** dans `docs/designs/desktop/` qui la concerne. Selon le §4 du registre (« aucune ligne »), la question du lien est posée **une seule fois** à la développeuse (PO-FC-10). L'agent PO n'écrivant que dans `specs/`, la ligne est pré-rédigée ci-dessous. Elle est à recopier telle quelle s'il n'existe aucune maquette :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| web-finance-carriers — **backoffice desktop : porteurs de fonds (liste + dialogue d'ajout / de modification)** | — aucune maquette produite (conçu par composition du patron `web-localizations`, à confirmer, PO-FC-10) | 2026-10-07 | N/A | **absent** |

## 1. Périmètre

### Rattachement

| Élément | Module CDC | Fondement |
|---|---|---|
| Porteurs de fonds (référentiel) | Aucun | Dérogation au CDC déjà tranchée pour tout le module Finances : **demande du Bureau** (PO-FI-01). Même priorité de fait : **P1** |
| Gestion du référentiel par l'Administrateur | Ligne de matrice « **Gérer comptes, rôles, paramétrage** » (Administrateur ✅ seul) ; rôle Administrateur « **Paramétrage** » | CDC |
| Surface backoffice | Surface de rendu, pas un module (`specs/web-empty-state.md` §1) | — |

**Décision levée** : PO-FI-03 prévoyait par défaut des porteurs « créés par migration de données initiale, hors de cette passe ». La demande de la développeuse **remplace ce défaut** : les porteurs sont créés et modifiés par l'Administrateur depuis le backoffice. Le commentaire d'en-tête de `20261007081032_finances.sql` (« créés par une migration de données distincte ») devient caduc ; il n'est pas réécrit (migration appliquée), la nouvelle migration le signale.

### Au périmètre

1. **Lister** les porteurs dans le backoffice (tous, aucun n'étant archivable dans cette passe).
2. **Ajouter** un porteur : libellé, type (`bank` | `cash`), détail facultatif, responsable facultatif (un compte).
3. **Modifier** un porteur : libellé, détail, responsable. **Le type n'est pas modifiable** après création (défaut, PO-FC-01).
4. Entrée de navigation backoffice dédiée (PO-FC-07 : « onglet » lu comme destination de la navigation latérale).
5. Deux entrées de matrice, deux codes d'audit, politiques RLS en miroir manuel.

### Hors périmètre, explicitement

- **Suppression** d'un porteur : jamais. Aucune politique `delete`, aucun privilège `delete`, aucun contrôle, même désactivé. Les FK existantes en `on delete restrict` restent le dernier rempart.
- **Archivage / désactivation** d'un porteur (compte clôturé, caisse supprimée) : **besoin futur signalé** (PO-FC-02), non construit.
- **Changement de type** `bank` ↔ `cash` (PO-FC-01).
- **IBAN, numéro de compte**, coordonnées bancaires : jamais (parent §2).
- **Solde d'ouverture** : reste saisi par le Trésorier sur mobile (`'opening_balance:record'`), jamais à la création du porteur.
- **Gestion des porteurs par le Trésorier** ou le Dirigeant habilité (matrice : « Gérer… paramétrage » ❌ pour eux).
- Toute modification de l'écran mobile `/finances` (voir §2.5 : il bénéficie des porteurs sans changement de code). Ordre manuel des porteurs, recherche, filtre, pagination.

## 2. Modèle et règles

### 2.1 Table `public.finance_carriers` (existante) — changements

| Colonne | Existant | Changement proposé |
|---|---|---|
| `label` | `text not null`, non vide après `btrim` | Longueur maximale (valeur au développement, miroir domaine/SQL, PO-FC-05). **Unicité insensible à la casse et aux accents** (défaut, PO-FC-04) |
| `label_key` | — | **Nouvelle colonne** `text not null`, unique, calculée **côté serveur** en miroir de la normalisation utilisée par `normalizeCategoryLabel()` (`domain/rules/finance-form-rules.ts`), comme `expense_categories.label_key`. Jamais reçue du client |
| `kind` | `text not null`, `check in ('bank','cash')` | Inchangé. **Non modifiable** après insertion (privilège de colonne, §2.3) |
| `detail` | `text` nullable | Rogné, vide → `null`. Longueur maximale (PO-FC-05). Ne doit contenir ni IBAN ni numéro de compte : consigne d'interface seulement, non vérifiable par la base |
| `manager_user_id` | `uuid references users(id)` nullable | Inchangé. Facultatif, pour les deux types (défaut, PO-FC-06) |
| `created_at` | existant | Inchangé |

- La contrainte d'unicité est ajoutée sur une table **vide** aujourd'hui (déclaration de la développeuse). La migration doit néanmoins **échouer explicitement** si des doublons existaient au moment de l'application, jamais les fusionner en silence.
- Pas de colonne `updated_at` / `updated_by` / `created_by` : l'audit est la trace (même position que PO-FIE-08).
- Pas de colonne `is_archived` dans cette passe (PO-FC-02). Ne rien construire qui l'empêche plus tard.

### 2.2 Domaine

- Entité `FinanceCarrier` (existe déjà sous une forme pour la lecture Finances : la réutiliser ou l'étendre, sans dupliquer de type). Champs utiles à l'admin : `id`, `label`, `kind`, `detail`, `managerUserId`, nom affichable du responsable.
- Règles pures dans `domain/rules/` (Vitest, sans React ni Supabase) : rognage et validation du libellé (non vide, longueur max), du détail (vide → `null`, longueur max), du type (`bank | cash`) ; détection « modification sans changement ». Réutiliser `normalizeCategoryLabel()` (ou une fonction de normalisation commune) pour la clé d'unicité côté UX, la base restant l'autorité.
- Use cases (`domain/usecases/` — dossier de la feature, noms indicatifs) : `ListFinanceCarriersForAdminUseCase`, `CreateFinanceCarrierUseCase`, `UpdateFinanceCarrierUseCase`. Chacun : `can()`, validations pures **avant tout appel réseau**, écriture, puis audit (§4). `UpdateFinanceCarrierUseCase` lit l'état **avant** pour l'audit et **n'accepte pas** de `kind`.
- Repository : interface dans `domain/repositories/` (étendre `finance-repository.ts` ou un repository dédié, à l'implémentation) : `listForAdmin()`, `create(input)`, `update(id, input)`. **Aucune méthode de suppression.** Row + mapper + `*RepositoryImpl` (`CLAUDE.md` §4).
- Erreurs : doublon de libellé (`23505` sur `label_key`) traduit en erreur de domaine dédiée puis en message français ; aucun texte Postgres brut n'atteint un composant.

### 2.3 Écriture SQL et RLS (miroir manuel, `CLAUDE.md` §7)

| Opération | Mécanisme (défaut) | Qui | Commentaire SQL |
|---|---|---|---|
| `select` | `finance_carriers_select` **inchangée** (Trésorier, Dirigeant habilité, admin) | — | `'finances:read'` |
| `insert` | Politique `finance_carriers_insert_admin`, `with check (private.is_admin())` ; `grant insert (label, kind, detail, manager_user_id)` | Administrateur | `'finance_carrier:create'` |
| `update` | Politique `finance_carriers_update_admin`, `using` et `with check (private.is_admin())` ; **`grant update (label, detail, manager_user_id)` seulement** : `kind`, `id`, `created_at`, `label_key` ne sont pas modifiables directement | Administrateur | `'finance_carrier:update'` |
| `delete` | **Aucune** politique, **aucun** privilège | — | — |

- `label_key` est calculé par un trigger `BEFORE INSERT OR UPDATE` (ou par une fonction `security definer` étroite sur le modèle de `create_expense_category()` / `rename_expense_category()`, au choix de l'implémentation). Ce trigger **normalise**, il n'interdit rien : aucune règle ni trigger ne rend `update`/`delete` structurellement impossible (même principe que AC-FI-34).
- Libellé et détail sont rognés côté serveur (le `check` existant sur `label` reste).
- `manager_user_id` : la FK garantit un compte existant. Aucune autre contrainte sur le compte choisi (PO-FC-06).
- Nouvelle migration seulement : **aucune migration existante modifiée**. Elle est écrite puis **proposée à l'application**, jamais appliquée en silence.

### 2.4 Lecture côté backoffice

- L'admin lit `finance_carriers` sous la politique existante (`private.is_admin()` en fait partie). Le nom affichable du responsable est lisible par l'admin via `users_select_own` (branche `is_admin()`). **RLS seule, aucune entrée de matrice pour la lecture** (critère de `rbac-matrix.ts`).
- Le sélecteur de responsable a besoin de la **liste des comptes** : réutiliser une lecture admin existante des utilisateurs (patron des dialogues de `features/backoffice/users/`), sans nouvelle RPC si possible. Affichage : nom affichable seul, aucune coordonnée (minimisation).
- Ordre de la liste : comme `get_finances_snapshot()`, par type puis libellé (défaut).

### 2.5 Interaction avec l'écran Finances (mobile) et la saison

- **Les porteurs sont globaux, sans saison** : aucune colonne `season_id`, aucune dépendance à `current_season()`. L'admin peut ajouter ou modifier un porteur **qu'il existe ou non une saison en cours**.
- **Déblocage** : dès qu'au moins un porteur existe **et** qu'une saison est en cours, `canWrite` devient vrai sur `/finances` pour le Trésorier en vue Trésorier. Aucun changement de code mobile n'est requis pour cela. Sans saison en cours, le repli existant (PO-FI-09) s'applique toujours.
- **Les droits Finances ne changent pas** : `'finances:read'`, `'expense:record'`, `'opening_balance:record'`, `'treasury_checkpoint:record'` et les sept entrées de correction sont **inchangées**. Le Trésorier ne gagne aucun droit sur les porteurs ; l'admin ne gagne aucun droit d'écriture Finances.
- **Porteur ajouté en cours de saison** :
  - il apparaît dans « Par porteur » avec « Solde d'ouverture non saisi » (AC-FI-29), et le Trésorier peut saisir son solde d'ouverture pour la saison en cours ;
  - il apparaît dans les puces « Porteur » de la feuille de dépense et dans le champ « Porteur » des formulaires de versement (`get_finance_carriers()`, AC-FI-31) ;
  - **le prochain point de trésorerie doit le compter** : `record_treasury_checkpoint()` exige une ligne par porteur existant. Les points passés ne sont pas modifiés (lignes figées), et leur correction ne porte que sur les porteurs qu'ils comptaient (O-FIE-UI-05).
- **Modifier un porteur réécrit son affichage partout**, passé compris (dépenses, historique, lignes « Compté … »), puisque le libellé est lu par jointure. C'est l'effet voulu d'un renommage, mais « renommer » un porteur pour en faire un autre (autre compte, autre caisse) déplacerait rétroactivement son historique : à éviter, l'archivage manquant (PO-FC-02) pousse à ce contournement. **C'est la raison pour laquelle le type n'est pas modifiable** : passer `bank` → `cash` réécrirait la ventilation Banque / Espèces de toute la saison (calculée à la lecture).
- **Fraîcheur** : sur un même appareil, une création ou une modification invalide la racine de clé du backoffice **et** `queryKeys.financesRoot()` ainsi que la clé de `get_finance_carriers()` (compte admin + Trésorier). Entre appareils : visible à la lecture suivante, aucune invalidation inter-appareils.
- **Message mobile « Aucun porteur n'est configuré. »** : inchangé dans cette passe. Le compléter d'une indication (« un administrateur doit en ajouter ») est proposé, non exigé (PO-FC-09).

## 3. RBAC

### Ligne de matrice applicable

« **Gérer comptes, rôles, paramétrage** » : ❌ Joueur, Coach, Responsable de section, Dirigeant habilité, **Trésorier**, Référent médical, Bénévole ; ✅ **Administrateur**. Un référentiel club-wide des porteurs est du paramétrage. La ligne voisine « Gérer échéanciers et relances » (Trésorier ✅, Administrateur ✅ « paramétrage ») confirme que le **paramétrage** financier relève de l'Administrateur.

| Rôle | Page backoffice « Porteurs » | Ajouter / modifier un porteur | Voir les porteurs sur `/finances` |
|---|---|---|---|
| **Administrateur** | ✅ | ✅ (club-wide) | ✅ lecture (inchangé, PO-FI-08) |
| Trésorier | ❌ (pas de `'backoffice:access'`) | ❌ | ✅ lecture ; saisies Finances inchangées |
| Dirigeant habilité | ❌ (PO-WE-01) | ❌ | ✅ lecture seule (inchangé) |
| Joueur, Coach, Responsable de section, Référent médical, Bénévole | ❌ | ❌ | ❌ |

### Entrées de matrice ajoutées (rôle `'admin'`, nom vérifié dans `rbac-matrix.ts`)

| Action | Rôles | Pourquoi une entrée `can()` | Miroir SQL |
|---|---|---|---|
| `'finance_carrier:create'` | `['admin']` | `presentation/` décide **avant toute requête** s'il rend « + Nouveau porteur » | `finance_carriers_insert_admin`, commentée `'finance_carrier:create'` |
| `'finance_carrier:update'` | `['admin']` | `presentation/` décide s'il rend le crayon de modification par ligne | `finance_carriers_update_admin` + `grant update (label, detail, manager_user_id)`, commentés `'finance_carrier:update'` |

- **Club-wide par construction** (l'affectation `admin` ne porte aucune portée) : **`can.ts` n'est pas modifié**.
- **Deux actions plutôt qu'une `'finance_carrier:write'`** : défaut de la développeuse, cohérent avec la convention Finances (une action par politique, PO-FIE-01) et avec `news:create` / `news:update`. Le patron `'training_location:write'` (une seule action) serait aussi recevable : fusion possible sans autre impact (PO-FC-08, non bloquant).
- **Aucune action `:delete`**, aucune action d'archivage.
- **Inchangées** : `'backoffice:access'`, `'finances:read'`, toutes les entrées Finances, toutes les autres entrées.
- Contrôles non autorisés **absents, jamais grisés**. Le booléen est calculé par le ViewModel **séparément** de l'accès à la route.

### Comptes multi-rôles

Administrateur + Trésorier : gère les porteurs au backoffice, saisit sur mobile en vue Trésorier. Les deux surfaces restent séparées (la vue mobile ne gagne aucun contrôle de gestion des porteurs).

## 4. Données sensibles

| Nature | Concerné | Conséquence |
|---|---|---|
| **Financière** | **Oui, indirectement** : référentiel des comptes et caisses du club ; aucun montant | Pas de solde ni d'IBAN stocké. Rétention : suit PO-FI-11 (porteurs référencés par des données comptables, jamais purgeables tant qu'ils sont référencés) |
| **Nominative** | **Oui** : le **responsable** est un compte (`users`) | Son nom affichable est exposé au Trésorier et au Dirigeant habilité **uniquement** via `get_finances_snapshot()` (AC-FI-06 inchangé) ; jamais d'élargissement de `users_select_*`. Le sélecteur admin n'affiche que le nom. Information du membre désigné : PO-FC-06 |
| **Texte libre** | `label`, `detail` | Risque de nom de tiers ou de numéro de compte dans `detail` (PO-FI-12, PO-FC-05) |
| **Santé** | Non | — |
| **Audit** | **Oui, deux nouveaux codes** | Ci-dessous |

**Codes d'audit** : `finance_carrier.created`, `finance_carrier.updated`.
- Hors liste CDC §11.3, mais dans la ligne de l'élargissement délibéré aux données structurelles d'administration (saisons, sections, équipes : addendum « neuf émetteurs » de `web-audit-logs.md`) et de l'audit Finances (AC-FI-21, AC-FIE-14).
- **Émission depuis le use case**, après l'écriture, jamais depuis un composant ni depuis SQL. `target_type` / `target_id` = le porteur.
- **Miroir** : ajoutés à `AUDIT_ACTIONS` (mention « wired: … ») **et** à `audit_log_action_check` dans le même changement, avec leur libellé dans `presentation/features/backoffice/audit/audit-action-labels.ts`. `record_audit_log_entry` admet déjà l'admin pour tout code : **aucun élargissement** de cette fonction.
- **`metadata`** — champs structurés, défaut à confirmer (PO-FC-03) :
  - création : `label`, `kind`, `managerUserId` (ou `null`), `hasDetail` (booléen) ;
  - modification : `before` / `after` pour `label` et `managerUserId` ; `detailChanged` (booléen) **à la place** du texte du détail ; `kind` rappelé (inchangé).
  - Le **libellé** est traité comme le libellé d'une catégorie (donnée de référentiel, admise par défaut, PO-FIE-03). Le **détail** est traité comme un texte libre (exclu, comme le libellé de dépense et le débrief, PO-FI-12). Jamais le **nom** du responsable : son identifiant seulement.
- **Modification sans changement** : aucune écriture, **aucune** entrée d'audit ; « Enregistrer » inactif tant que rien n'a changé.
- **Faille héritée** : un échec d'audit n'est qu'un `console.error` (PO-TR-19). Reconduite, non résolue.

## 5. Critères d'acceptation

Préfixe **`AC-FC-`**. Aucune numérotation CDC (AC-xx) n'existe pour ce domaine. AC-02 (CDC §17.2, aucun accès hors du périmètre du rôle) s'applique à AC-FC-01 à 05.

**Droits et base de données**

| Réf. | Critère |
|---|---|
| AC-FC-01 | `'finance_carrier:create'` et `'finance_carrier:update'` sont ajoutées à `domain/policies/actions.ts` et valent exactement `['admin']` dans `rbac-matrix.ts`, avec un commentaire renvoyant à cette spec et aux politiques qu'elles miroitent. Aucune autre entrée n'est ajoutée ni modifiée ; `can.ts` est inchangé. Test `can()` : `admin` → vrai ; `treasurer`, `authorized-officer`, `coach` → faux |
| AC-FC-02 | Une nouvelle migration ajoute `finance_carriers_insert_admin` et `finance_carriers_update_admin` (appuyées sur `private.is_admin()`, chacune commentée du nom de son action), `grant insert (label, kind, detail, manager_user_id)` et `grant update (label, detail, manager_user_id)`. **Aucune politique ni aucun privilège `delete`.** `finance_carriers_select` est inchangée. Aucune migration existante n'est modifiée |
| AC-FC-03 | **Contre la base**, avec un jeton Trésorier, Dirigeant habilité ou de tout autre rôle non admin : tout `insert` et tout `update` sur `finance_carriers` est refusé (erreur ou aucune ligne affectée) |
| AC-FC-04 | **Contre la base**, même avec un jeton administrateur : un `update` de `kind` est refusé ; un `delete` est refusé ; un `delete` direct en base (rôle propriétaire) sur un porteur référencé échoue par les FK `on delete restrict` existantes |
| AC-FC-05 | **Contre la base** : un `insert` ou `update` dont le libellé est vide après rognage, dépasse la longueur maximale, ou dont la forme normalisée (casse et accents ignorés) est égale à celle d'**un autre** porteur, est refusé. Renommer un porteur en lui-même avec une autre casse est accepté. `label_key` est calculé côté serveur, jamais fourni par le client |

**Domaine**

| Réf. | Critère |
|---|---|
| AC-FC-06 | `CreateFinanceCarrierUseCase` et `UpdateFinanceCarrierUseCase` refusent l'écriture si `can(user, action)` est faux, et refusent par `DomainError`, **sans appel réseau**, un libellé vide ou trop long, un détail trop long, un type hors `bank | cash`. `UpdateFinanceCarrierUseCase` n'accepte pas de type. Une modification sans changement n'écrit rien et n'émet aucune entrée d'audit. Couvert par Vitest (refus sans droit compris) |
| AC-FC-07 | Le repository n'expose **aucune méthode de suppression**. Row, mapper et `*RepositoryImpl` aux emplacements de `CLAUDE.md` §4/§5 ; aucun import de `data/` depuis `presentation/`. Le refus « doublon » remonte en message français, jamais en texte Postgres brut |

**Écran backoffice**

| Réf. | Critère |
|---|---|
| AC-FC-08 | Une entrée de navigation backoffice dédiée (libellé et position : PO-FC-07) est ajoutée à `BACKOFFICE_NAV_ITEMS`, protégée par les mêmes gardes que les autres (`RequireDesktopViewport` → `RequireBackofficeSession` → `RequireBackofficeAccess`), sans badge numérique |
| AC-FC-09 | La page liste tous les porteurs avec, au minimum, libellé, type (« Banque » / « Espèces », **en texte**, jamais par la couleur seule), détail et nom du responsable (ou une absence explicite, sans emplacement trompeur). États chargement, erreur (français) et **liste vide** (état vide explicite, cas normal au démarrage) distincts |
| AC-FC-10 | « + Nouveau porteur » ouvre un dialogue d'ajout (libellé, type, détail facultatif, responsable facultatif). Le crayon ouvre un dialogue de modification **pré-rempli** qui enregistre sur la **même** ligne ; le type y est affiché **en lecture seule**. Ces contrôles ne sont rendus que si `can(user, 'finance_carrier:create')` / `can(user, 'finance_carrier:update')` — booléens calculés par le ViewModel. **Aucun contrôle de suppression ni d'archivage**, nulle part, même désactivé |
| AC-FC-11 | Le choix du responsable propose les comptes existants par leur **nom affichable seul** (aucune coordonnée), et permet de **retirer** un responsable (retour à « aucun »). La valeur enregistrée est un identifiant de compte |
| AC-FC-12 | Après un ajout ou une modification réussi, la liste reflète le changement sans rechargement manuel (racine de clé de `query-keys.ts`), et les clés Finances (`financesRoot()`, lecture de `get_finance_carriers()`) sont invalidées. Un échec (doublon, réseau, refus) laisse le dialogue ouvert, saisies conservées, avec un message en français. « Annuler » ferme sans écriture. « Enregistrer » est inactif tant que le formulaire est invalide ou, en modification, inchangé |

**Effet sur Finances (mobile)**

| Réf. | Critère |
|---|---|
| AC-FC-13 | Avec une saison en cours et au moins un porteur créé depuis le backoffice, un Trésorier en vue Trésorier voit sur `/finances` les contrôles d'écriture (bouton `+`, « Faire un point de trésorerie », saisie du solde d'ouverture) **sans aucun changement de code mobile**. Le Dirigeant habilité et l'admin restent en lecture seule (AC-FI-03 inchangé). Sans saison en cours, le repli PO-FI-09 s'applique, porteurs ou non |
| AC-FC-14 | Un porteur ajouté en cours de saison apparaît dans « Par porteur » avec « Solde d'ouverture non saisi », dans les puces de la feuille de dépense et dans le champ « Porteur » des formulaires de versement. Le point de trésorerie suivant comporte une ligne pour lui ; les points existants (écart, lignes) sont inchangés |
| AC-FC-15 | Renommer un porteur ou changer son détail / responsable met à jour son affichage sur `/finances` à la lecture suivante, sans écrire aucune ligne de dépense, de solde, de versement ni de point. La ventilation Banque / Espèces n'est jamais modifiée par une modification de porteur (type figé) |
| AC-FC-16 | Le Trésorier et le Dirigeant habilité ne lisent toujours `users` que pour leur propre ligne : le nom du responsable ne leur parvient que par `get_finances_snapshot()` (AC-FI-06 inchangé) |

**Audit**

| Réf. | Critère |
|---|---|
| AC-FC-17 | Chaque ajout et chaque modification effective produit **une** entrée d'audit, **vérifiée contre la base** : `finance_carrier.created` / `finance_carrier.updated`, émise par le use case, ciblant le porteur. Sa `metadata` suit le §4 (selon l'issue de PO-FC-03) : jamais le texte du détail, jamais le nom du responsable. `AUDIT_ACTIONS`, `audit_log_action_check` et `audit-action-labels.ts` sont modifiés dans le même changement ; `record_audit_log_entry` n'est pas modifiée |

**Transverse**

| Réf. | Critère |
|---|---|
| AC-FC-18 | Contrôles interactifs à `h-11` minimum au site d'appel, dialogues utilisables au clavier, `min-w-0` sur toute paire de champs côte à côte, contrastes AA. Pas d'en-tête de tableau collant (convention backoffice). **Aucun nom de personne ni de banque** dans le code, les placeholders, les tests ou les fixtures (`CLAUDE.md` §9) |
| AC-FC-19 | Non-régression : `/finances` (toutes AC-FI et AC-FIE), formulaires de versement, `/admin/memberships`, `/admin/audit` et les autres entrées du backoffice sont inchangés. La migration est **proposée à l'application**, jamais appliquée en silence |

## 6. Points ouverts

| Réf. | Question | Défaut retenu (implémenter autour) | Pour qui | Bloquant ? |
|---|---|---|---|---|
| PO-FC-01 | **Type modifiable ?** | **Non** : fixé à la création (privilège de colonne). Une erreur de type se corrige… impossible sans archivage (PO-FC-02) ni suppression : à saisir avec soin, le dialogue d'ajout doit le dire | Développeuse | Non — **à confirmer** |
| PO-FC-02 | **Archivage / désactivation** d'un porteur (compte clôturé, caisse fermée, porteur créé par erreur) | Non construit dans cette passe. **Besoin futur signalé** : sans lui, un porteur inutile reste dans « Par porteur », dans les puces et **doit être compté à chaque point** (`record_treasury_checkpoint()` exige tous les porteurs). Ne rien construire qui l'empêche (pas de trigger interdisant `update`) | Développeuse / Trésorier | Non ; **à rouvrir avant la mise en production** |
| PO-FC-03 | **`metadata` d'audit** : libellé avant/après admis (référentiel) ? Détail réduit à `detailChanged` ? Identifiant du responsable admis ? | Libellé oui, détail en booléen seulement, identifiant de compte oui, nom jamais (§4) | Référent RGPD / Développeuse | **Non pour designer-agent ; à confirmer avant d'écrire les use cases** |
| PO-FC-04 | **Doublon de libellé** : refus insensible à la casse et aux accents, **tous types confondus** (une banque et une caisse ne peuvent pas porter le même nom) ? | Oui, unicité globale sur `label_key` | Développeuse | Non — **à confirmer** |
| PO-FC-05 | **Longueurs maximales** de `label` et `detail` ; consigne « pas d'IBAN ni de numéro de compte » dans `detail` | Valeurs fixées au développement, miroir domaine/SQL ; consigne en texte d'aide du champ | Développeuse / Référent RGPD | Non |
| PO-FC-06 | **Responsable** : réservé aux caisses (le parent dit « responsable facultatif pour une caisse ») ou permis pour les deux types ? Restreint à certains comptes (actifs, porteurs d'un rôle du Bureau) ? Le membre désigné doit-il être **informé** que son nom est visible du Trésorier et du Dirigeant ? | Permis pour les deux types, facultatif, tout compte existant ; aucune information automatique | Développeuse / Référent RGPD | Non |
| PO-FC-07 | **« Onglet »** : la demande parle d'un onglet ; la convention du backoffice est « une entrée de navigation = une ressource = une page ». Libellé et position ? | Entrée de navigation latérale **« Porteurs »** (ou « Finances » si d'autres écrans Finances admin suivent), placée après « Adhésions » ; à proposer par designer-agent sans réordonner les autres entrées | Développeuse / designer-agent | Non |
| PO-FC-08 | Deux actions (`:create`, `:update`) ou une seule `'finance_carrier:write'` (patron `'training_location:write'`) ? | Deux actions (défaut de la développeuse, convention Finances) | Développeuse | Non |
| PO-FC-09 | Compléter le message mobile « Aucun porteur n'est configuré. » d'une indication pour le Trésorier (« Un administrateur doit en ajouter. ») ? | Non exigé ; si oui, une seule chaîne dans `TreasuryTab`, sans autre changement | Développeuse | Non |
| PO-FC-10 | **Maquette** (`DESIGN_LINKS.md` §4, aucune ligne) : existe-t-il une maquette ou un lien artifact ? Question posée **une seule fois** | Sinon : ligne `absent` du §0 à recopier ; conception par composition du patron `web-localizations` (tableau + dialogue à deux modes) | Développeuse | Non |
| PO-FC-11 | **Mise en production** : qui saisit les porteurs réels, et quand ? Le Trésorier ne peut rien saisir avant | Saisie par l'admin depuis le backoffice, avec le Trésorier, avant d'annoncer `/finances` | Développeuse / Trésorier | Non pour construire ; **oui avant mise en production** |

**Points reconduits, non rouverts** : PO-FI-08 (lecture admin), PO-FI-11 (rétention), PO-FI-12 (texte libre), PO-FIE-03 (texte libre dans l'audit), PO-TR-19 (audit hors transaction), PO-WE-01 (accès backoffice limité à l'admin).

**Specs voisines à amender par conséquence** (amendement daté dans leurs fichiers, non fait ici) :
- `specs/mob-treasurer-finances.md` : **PO-FI-03 levé** par cette spec (création et modification par l'Administrateur au backoffice ; responsable = référence à un compte ; pas d'archivage) ; la ligne « Création, modification, archivage d'un porteur » du hors-périmètre renvoie ici.
- `specs/mob-treasurer-finances-edit.md` §1 « Gestion des porteurs (PO-FI-03, inchangé) » et §3 « Aucune politique update / delete n'est accordée sur `finance_carriers` » : se lisent désormais « aucune pour le Trésorier ; `update` pour l'admin, jamais `delete` (`web-finance-carriers`) ».

## Transmission

**Prêt pour transmission à designer-agent : OUI.** Aucun point ne bloque la conception. Les défauts PO-FC-01 (type figé), PO-FC-02 (pas d'archivage), PO-FC-04 (unicité globale) et PO-FC-08 (deux actions) sont à confirmer par la développeuse, mais n'imposent aucune mise en page différente. **PO-FC-03** (`metadata` d'audit) doit être confirmé **avant l'implémentation des use cases**, pas avant le design.

À concevoir par composition (patron `web-localizations` / `SeasonFormDialog`) :
- entrée de navigation et page liste (PO-FC-07), état vide de démarrage ;
- dialogue unique à deux modes ajout / modification, avec le **type en lecture seule** en modification et une consigne sur son caractère définitif à l'ajout ;
- sélecteur de responsable (nom affichable seul, retrait possible) ;
- **aucun** contrôle de suppression ni d'archivage, même désactivé.

## UI design

> Rédigé par designer-agent le 2026-10-07. **Aucun point bloquant.** Aucune maquette (registre `DESIGN_LINKS.md` §4 : ligne `absent`, PO-FC-10 déjà posée une fois, pas reposée ; `docs/designs/` ne contient que `v4_coach_dashboard.png`, mobile, sans rapport). Conception **par composition** de patrons backoffice déjà en code, aucun composant visuel inédit : la règle « demander un prototype » ne s'applique donc pas. Références de code à ouvrir : `features/backoffice/localizations/` (page, `TrainingLocationTable`, `TrainingLocationFormDialog`, `TrainingLocationTableSkeleton`), `news/components/NewsStatusBadge.tsx` (badge), `teams/components/AssignCoachDialog.tsx` et `memberships/components/RecordPaymentDialog.tsx` (Select + valeur sentinelle `none`), `components/BackofficeEmptyState.tsx`.

### Où ça vit

- **Destination** : nouvelle entrée de la navigation latérale du backoffice (`BACKOFFICE_NAV_ITEMS`), **« Porteurs »**, id `finance-carriers`, chemin `/admin/finance-carriers`, **insérée juste après « Adhésions »** (PO-FC-07). Aucune autre entrée n'est réordonnée. Pas de badge numérique (AC-FC-08). Icône proposée `IconBuildingBank` (remplaçable). `emptyStateTitle` : « Aucun porteur à afficher pour l'instant ».
- **Hors des 4 onglets mobiles** : cette feature est uniquement backoffice desktop ; la navigation mobile (Dashboard, Calendrier, Actus, Menu) n'est pas touchée et `/finances` ne change pas.
- Page `BackofficeFinanceCarriersPage` : même gabarit que `BackofficeLocalizationsPage` (titre `h2` + sous-titre à gauche, bouton d'ajout à droite, puis corps). Titre « Porteurs de fonds », sous-titre « Comptes bancaires et caisses sur lesquels sont enregistrées les dépenses et les cotisations. ».

### Liste (tableau)

Composition : `Table` shadcn comme `TrainingLocationTable`. **Pas d'en-tête collant** (convention backoffice : ne pas ajouter de `sticky` aux tableaux d'administration).

| Colonne | Contenu |
|---|---|
| Libellé | Texte en semi-gras, retour à la ligne autorisé |
| Type | Badge texte **« Banque »** / **« Espèces »** (jamais la couleur seule, AC-FC-09). Même forme que `NewsStatusBadge` (pilule, majuscules, petite taille) en teinte **neutre distincte par type** (ex. Banque : bordure/fond `muted`; Espèces : `coach-green/15`), sans reprendre les teintes rouge/vert de statut qui signifieraient « bon / mauvais ». Nouveau fichier `FinanceCarrierKindBadge`, simple variation de badge existante |
| Détail | Texte atténué ; **« — »** si vide |
| Responsable | Nom affichable seul ; **« Aucun »** en texte atténué si absent (absence explicite, AC-FC-09). Aucune coordonnée |
| Actions (en-tête `sr-only` sur un `<span>` interne) | Crayon seul (voir permissions) |

- Ordre : type puis libellé (§2.4), fourni par la lecture ; la page ne retrie pas.
- Contrôles par ligne : bouton fantôme icône `h-11 w-11 rounded-full`, `aria-label` « Modifier le porteur « {libellé} » ».
- **Aucun bouton de suppression, d'archivage, de désactivation, ni emplacement réservé ou grisé.** Aucune colonne « Statut » (PO-FC-02 : pas d'archivage dans cette passe). Pas de recherche, de filtre ni de pagination (hors périmètre).

### États de la page

Rendu mutuellement exclusif, branches sur des booléens calculés par le ViewModel (`isLoading`, `error`, `rows.length`, `canCreate`, `canUpdate`) :

| État | Rendu |
|---|---|
| Chargement | `FinanceCarrierTableSkeleton`, même forme que `TrainingLocationTableSkeleton` (mêmes colonnes) |
| Erreur de lecture | `Alert` destructif `role="alert"` avec le message français du ViewModel, à la place du tableau ; le bouton d'ajout reste visible s'il est permis |
| **Liste vide** (cas normal au démarrage) | `BackofficeEmptyState` avec l'icône et le titre de l'entrée de navigation, **plus une description** utile : « Ajoutez les comptes bancaires et les caisses du club pour que le Trésorier puisse saisir les dépenses et les soldes. » Le bouton « Nouveau porteur » **reste affiché** dans l'en-tête (seul moyen d'en créer un). Pas de second bouton dans l'état vide |
| Liste | Tableau |

### Bouton d'ajout

« **Nouveau porteur** » (le spec d'écran dit « + Nouveau porteur »), même bouton que « Nouveau lieu » : pilule verte `bg-coach-green`, icône `IconPlus`, `h-11`, en haut à droite. Ouvre le dialogue en mode ajout. Le titre du dialogue est « **Ajouter un porteur** ».

### Dialogue ajout / modification

Un seul composant `FinanceCarrierFormDialog`, deux modes, remonté par `key` (id du porteur ou `'create'`), rend `null` tant que fermé : **mêmes mécaniques que `TrainingLocationFormDialog`** (Radix `Dialog` : piège de focus, Échap pour fermer, accessibilité clavier). `DialogContent` `sm:max-w-[480px]`. Titres : « Ajouter un porteur » / « Modifier le porteur ». Boutons de pied : « Annuler » (outline, `h-11 rounded-full`) et « Ajouter » / « Enregistrer » (vert plein, `h-11 rounded-full`, libellés d'attente « Ajout… » / « Enregistrement… »).

Champs, **empilés pleine largeur** (aucune paire côte à côte, donc aucun `min-w-0` requis ici ; si l'implémentation en introduit une, `min-w-0` sur chaque élément de grille, CLAUDE.md §6). Étiquettes en `text-xs font-semibold tracking-wider uppercase` comme les autres dialogues. Tous les champs `h-11 rounded-xl`.

1. **Libellé** (obligatoire) : `Input`, placeholder neutre « Ex. Compte courant du club » (aucun nom de banque ni de personne, AC-FC-18). Longueur max appliquée (PO-FC-05).
2. **Type** (obligatoire) :
   - **Ajout** : deux choix exclusifs, **« Banque » / « Espèces »**, en puces à bascule (patron des puces/bascules du backoffice, par ex. `ConvocationTypeToggle`, ou à défaut un `Select`), chacune d'une hauteur `h-11`. **Aucune valeur présélectionnée** (le choix est définitif ; ne pas le pré-remplir évite une erreur par défaut) : « Ajouter » reste inactif tant qu'il n'est pas choisi. Texte d'aide sous le champ : « Le type ne pourra plus être modifié après la création. » (PO-FC-01).
   - **Modification** : **lecture seule**, rendu comme le champ verrouillé « Rôle » de `AssignCoachDialog` (contrôle désactivé affichant la valeur), pas comme un choix. Texte d'aide : « Le type est définitif. » Jamais éditable, jamais envoyé au use case.
3. **Détail** (facultatif) : `Input`, texte d'aide permanent sous le champ : « Ne saisissez ni IBAN ni numéro de compte. » (PO-FC-05). Vide → enregistré comme absent.
4. **Responsable** (facultatif) : `Select` shadcn, `SelectTrigger` `h-11 rounded-xl`, première option **« Aucun responsable »** (valeur sentinelle `none`, patron de `RecordPaymentDialog`) qui **permet de retirer** un responsable (AC-FC-11) ; puis les comptes existants par **nom affichable seul**, jamais d'e-mail ni de téléphone. Valeur initiale : « Aucun responsable » en ajout ; le responsable courant en modification. Si la liste de comptes est vide ou en échec de chargement : le champ reste utilisable sur « Aucun responsable » avec la ligne « Liste des comptes indisponible. » sous le champ, sans bloquer l'enregistrement. Texte d'aide : « Son nom sera visible du Trésorier et du Dirigeant habilité. » (lié à PO-FC-06, information du membre non automatisée).

**Comportement** :
- « Enregistrer » / « Ajouter » inactif tant que le formulaire est invalide (libellé vide après rognage, type non choisi en ajout, valeurs hors limites) **ou, en modification, inchangé** (AC-FC-12). Pendant l'envoi : tous les champs et boutons désactivés.
- Succès : le dialogue se ferme, la liste est à jour (invalidations en §2.5 / AC-FC-12).
- Échec (refus du domaine, base, réseau) : un `Alert` destructif `role="alert"` s'affiche **en haut du formulaire, au-dessus des champs**, le dialogue **reste ouvert** et **les saisies sont conservées**.
- « Annuler », Échap et clic extérieur : fermeture sans écriture.

### Message d'erreur de doublon

Erreur de domaine dédiée (le `23505` sur `label_key` n'atteint jamais l'UI brut), affichée dans l'`Alert` du dialogue :

> « Un porteur portant ce nom existe déjà. Choisissez un autre libellé. »

Précision d'usage : la comparaison ignorant casse et accents et couvrant **les deux types** (PO-FC-04), ce message vaut aussi pour « compte » vs « Compte » ou une banque et une caisse de même nom. Optionnel mais recommandé : marquer en plus le champ Libellé (`aria-invalid`, bordure destructive) et y renvoyer le focus. Renommer un porteur en changeant seulement sa casse n'est **pas** un doublon (AC-FC-05). Autres messages français prévus dans le même `Alert` : libellé vide / trop long, détail trop long, refus de droit (« Vous n'avez pas les droits pour modifier les porteurs. »), erreur réseau générique.

### Ce qui change par rôle

Réutilise le RBAC du §3 sans le redéfinir.

| Rôle | Rendu |
|---|---|
| **Administrateur** (`'backoffice:access'`) | Entrée « Porteurs » dans la barre latérale, page complète. « Nouveau porteur » si `can(user, 'finance_carrier:create')`, crayon par ligne si `can(user, 'finance_carrier:update')`, booléens `canCreate` / `canUpdate` calculés par le ViewModel, **séparément** de l'accès à la route |
| Trésorier, Dirigeant habilité, tout autre rôle | **Pas d'accès au backoffice** (`'backoffice:access'`, PO-WE-01) : l'entrée de navigation et la page n'existent pas pour eux, la garde de route existante (`RequireBackofficeAccess`) s'applique inchangée. Aucun contrôle grisé, aucun lien. Sur mobile, rien ne change (le Trésorier voit toujours les porteurs en lecture sur `/finances`) |
| Compte multi-rôles Administrateur + Trésorier | Gère les porteurs au backoffice ; la vue mobile Trésorier ne gagne aucun contrôle de gestion |

- Si, à terme, la page est atteinte sans `canCreate`/`canUpdate` (cas défensif), les contrôles correspondants sont **absents** (pas désactivés) ; la liste reste lisible, colonne d'actions vide comme dans `TrainingLocationTable`.
- **Jamais de suppression ni d'archivage, pour aucun rôle** (AC-FC-10).

### Nouveaux composants (tous des variations de patrons existants)

| Composant | Rôle | Justification |
|---|---|---|
| `BackofficeFinanceCarriersPage` + `useBackofficeFinanceCarriersViewModel` | Page, états, booléens `canCreate` / `canUpdate` | Calqué sur la page Lieux |
| `FinanceCarrierTable`, `FinanceCarrierTableSkeleton` | Tableau et squelette | Calqués sur `TrainingLocation*` |
| `FinanceCarrierKindBadge` | Badge texte Banque / Espèces | Variation de `NewsStatusBadge` ; teinte neutre, pas de sémantique de statut |
| `FinanceCarrierFormDialog` + `useFinanceCarrierFormDialogViewModel` | Dialogue ajout / modification | Calqué sur `TrainingLocationFormDialog` ; seuls ajouts : champ Type (verrouillé en modification) et `Select` Responsable |

Aucun nouveau patron visuel : pas de demande de prototype Claude Design.

### Questions UI ouvertes (non bloquantes)

| Réf. | Question | Défaut retenu |
|---|---|---|
| UI-FC-01 | Libellé / icône de l'entrée de navigation : « Porteurs » seul, ou « Finances » si d'autres écrans Finances admin suivent ? (suite de PO-FC-07) | « Porteurs », `IconBuildingBank` |
| UI-FC-02 | Type à l'ajout : puces à bascule ou `Select` ? | Puces à bascule sans présélection (choix irréversible, deux options visibles d'un coup d'oeil) |
| UI-FC-03 | Liste des comptes du sélecteur Responsable : tous les comptes, ou seulement les actifs (PO-FC-06 : défaut « tout compte existant ») ? Avec beaucoup de comptes, un `Select` simple devient long ; une recherche (combobox) serait un composant nouveau | `Select` simple trié par nom, tous les comptes ; à revoir si le club dépasse quelques dizaines de comptes |
| UI-FC-04 | Faut-il afficher, dans le dialogue de modification, l'avertissement que renommer réécrit l'historique affiché (§2.5) ? | Oui, une ligne d'aide sous le Libellé en modification : « Le nouveau nom s'appliquera aussi aux dépenses et points passés. » |
