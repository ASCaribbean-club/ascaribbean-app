# Spec — Finances : correction et suppression des saisies (`mob-treasurer-finances-edit`)

> Statut : **rédaction initiale 2026-10-07**. Lève **PO-FI-06** de `specs/mob-treasurer-finances.md` pour l'écran `/finances`. **Aucun point ouvert bloquant** pour designer-agent (voir « Transmission »). Deux points sont **à confirmer avant l'implémentation** : PO-FIE-02 (champs corrigeables d'un point) et PO-FIE-03 (texte libre dans l'audit).
> Demande d'origine (développeuse, relayée par l'orchestrateur) : rendre corrigeables les saisies Finances, aujourd'hui définitives.
> Sources : `specs/mob-treasurer-finances.md` (§2 « Extensibilité », §3, §4, AC-FI-03/04/05/17/21/25/28/34, PO-FI-05/06/07/12, section « UI design »), `docs/priorisation-fonctionnelle-as-acaribbean.md` (journal d'audit §11.3 : « modification paiement » parmi les actions sensibles), `docs/designs/DESIGN_LINKS.md` §4, `CLAUDE.md` §6/§7.
> État du code lu : `supabase/migrations/20261007081032_finances.sql`, `src/domain/rules/finance-form-rules.ts`, `src/domain/usecases/finances/*`, `src/domain/policies/rbac-matrix.ts` (entrées Finances), `src/presentation/features/finances/useFinancesViewModel.ts` (contrôles d'écriture = `usePermission(...) && isTreasurerView`).

## Décisions de la développeuse (2026-10-07, non rouvertes ici)

| Réf. | Décision |
|---|---|
| D-1 | **Périmètre** : modifier et supprimer une dépense ; renommer une catégorie, la supprimer **seulement si elle n'est pas utilisée** ; corriger un solde d'ouverture ; corriger et supprimer un point de trésorerie |
| D-2 | **Stockage** : `UPDATE` / `DELETE` **en place**. Pas d'écriture de contre-passation. Chaque correction produit une entrée d'audit **avant/après**, émise **depuis le use case** (`CLAUDE.md` §6) |
| D-3 | **Interface** : pas de mode édition distinct. Un appui sur une ligne ouvre la feuille existante **pré-remplie**, avec « Enregistrer » et « Supprimer ». Rendu seulement pour la vue Trésorier active (`isTreasurerView` **et** `can()`). Dirigeant habilité en lecture seule. Contrôles **absents**, jamais grisés |
| D-4 | **Règles** : réutiliser `domain/rules/finance-form-rules.ts`. Aucun solde stocké. Le **théorique figé** d'un point n'est **jamais réécrit** |
| D-5 | **RBAC** : entrées de matrice strictement nécessaires, Trésorier seul. RLS recopiée à la main, commentée du nom de l'action. Aucune migration appliquée par les agents |

## 0. Registre des maquettes

**Aucune ligne** au §2 de `DESIGN_LINKS.md` pour cette feature, ni d'ailleurs pour `mob-treasurer-finances` (la ligne pré-rédigée au §0 de ce spec n'a pas encore été recopiée, PO-FI-13). **Aucune maquette** de correction n'existe dans `docs/designs/finances/`. La décision D-3 fixe une conception **par composition** des feuilles existantes. Question posée **une seule fois** (PO-FIE-07). Ligne pré-rédigée, à recopier telle quelle faute de maquette :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| mob-treasurer-finances-edit — **correction / suppression des dépenses, catégories, soldes d'ouverture et points** | — aucune maquette produite (conçu par composition des feuilles de `mob-treasurer-finances`, décision développeuse du 2026-10-07, D-3) | 2026-10-07 | N/A | **absent** |

## 1. Périmètre

Extension de la dérogation au CDC déjà tranchée (PO-FI-01, demande du Bureau). Même priorité de fait : **P1**. Seule la **saison en cours** est concernée, puisque l'écran n'en montre pas d'autre.

### Entre au périmètre

1. **Dépense** : modifier montant, libellé, date, catégorie, porteur, mode de paiement ; supprimer.
2. **Catégorie** : renommer ; supprimer si **aucune dépense** (toutes saisons confondues) ne la référence.
3. **Solde d'ouverture** : corriger le montant d'un solde déjà saisi pour la saison en cours.
4. **Point de trésorerie** : corriger les **montants constatés** et le **débrief** (défaut, PO-FIE-02) ; supprimer le point entier.
5. **Accès Trésorier seulement**, dans la vue Trésorier active. Le Dirigeant habilité et l'administrateur restent en lecture seule.

### Hors périmètre — explicitement

- **Contre-passation**, historique des versions affiché à l'écran, annulation (« undo »).
- **Suppression d'un solde d'ouverture** : rien ne ramène un porteur à « Solde d'ouverture non saisi » (PO-FIE-05).
- Correction du **théorique figé** d'un point, de sa **saison**, de son **auteur**. Correction de l'**auteur**, de la **saison** ou de l'**horodatage de saisie** d'une dépense.
- Correction d'une saisie d'une **saison passée** (PO-FIE-06).
- **Couleur** d'une catégorie (toujours issue de la palette fixe, PO-FI-05). **Archivage** d'une catégorie utilisée.
- Correction d'un **versement de cotisation** ou de son porteur (PO-WM-04, inchangé).
- Gestion des porteurs (PO-FI-03, inchangé). Toute variante desktop.

## 2. Règles

### Généralités

- **Aucun solde stocké** (AC-FI-34, inchangé). Soldes, totaux, ventilations et « Ce mois » se recalculent à la lecture. Une correction se répercute d'elle-même.
- **Validations** : les mêmes règles pures que la saisie (`validateMoneyInput`, `isValidExpenseAmountCents`, `validateExpenseLabel`, `validateExpenseDate`, `isValidExpensePaymentMethod`, `validateCategoryLabel`, `isValidNonNegativeCents`, `validateDebrief`). Elles sont appelées **par les nouveaux use cases**, pas recopiées dans un ViewModel ni dans le seul `Record*UseCase`. Une règle manquante (par exemple « la modification change au moins un champ ») est ajoutée dans `domain/rules/`.
- **Modification sans changement** : si aucun champ n'a changé, le use case n'écrit rien et **n'émet aucune entrée d'audit**. L'interface laisse « Enregistrer » inactif tant que rien n'a changé.
- **Auteur** : `recorded_by` / `recorded_at` d'origine sont **conservés**. L'auteur de la correction est l'acteur de l'entrée d'audit. Aucune colonne `updated_by` / `updated_at` n'est ajoutée : l'audit est la trace (PO-FIE-08).
- **Nouveaux use cases** dans `domain/usecases/finances/` (noms indicatifs) : `UpdateExpenseUseCase`, `DeleteExpenseUseCase`, `RenameExpenseCategoryUseCase`, `DeleteExpenseCategoryUseCase`, `UpdateOpeningBalanceUseCase`, `UpdateTreasuryCheckpointUseCase`, `DeleteTreasuryCheckpointUseCase`. Chacun : `can()`, validations pures, lecture de l'état **avant**, écriture, puis audit avant/après.

### Par ressource

- **Dépense** : mêmes contraintes qu'à la saisie (AC-FI-10). Date dans la saison en cours et non future (PO-FI-09). Une dépense ne peut être modifiée ni supprimée **que si elle appartient à la saison en cours**.
- **Catégorie** :
  - le renommage recalcule la **clé normalisée côté serveur**, en miroir de `normalizeCategoryLabel()`, comme `create_expense_category()`. Un doublon est refusé (insensible à la casse et aux accents ; renommer une catégorie en elle-même avec une autre casse est accepté). `color_index` est inchangé ;
  - la suppression n'est possible que si **aucune dépense** ne référence la catégorie. La FK `on delete restrict` reste le dernier rempart : son erreur est traduite en erreur du domaine et en message en français. Comme la lecture actuelle ne porte que sur la saison en cours, l'interface a besoin d'une information « catégorie utilisée » **toutes saisons confondues** (par exemple un booléen dans la lecture agrégée, à confirmer à l'implémentation).
  - Effet signalé : `color_index` étant aujourd'hui `count(*)`, une suppression peut faire réutiliser une couleur. C'est sans conséquence, puisque le texte porte l'information (O-FI-UI-05).
- **Solde d'ouverture** : montant ≥ 0, au plus 2 décimales. L'unicité `(porteur, saison)` est inchangée : la correction est un `UPDATE` de la ligne existante, jamais une seconde insertion. Seul `amount_cents` est modifiable.
- **Point de trésorerie** :
  - le **théorique figé** (`theoretical_cents`) n'est **jamais** modifié, ni recalculé. Corriger une dépense ou un solde d'ouverture antérieur à un point **ne change pas** ce point (AC-FI-17) ;
  - corrigeables (défaut, **à confirmer**, PO-FIE-02) : le `counted_cents` de chaque ligne (≥ 0) et le débrief. L'écart affiché est recalculé (constaté corrigé − théorique figé). La date du point n'est **pas** corrigeable par défaut ;
  - la correction et la suppression sont **atomiques** (le point et toutes ses lignes, tout ou rien), via des fonctions `security definer` étroites, sur le modèle de `record_treasury_checkpoint()`. La FK lignes → point étant en `on delete restrict`, la suppression efface les lignes puis le point dans la même transaction, sans passer à `cascade` ;
  - la ligne « Compté {date} : {montant} » d'un porteur suit le dernier point **restant** après une suppression.
- **Débrief et pré-remplissage** : `get_finances_snapshot()` ne renvoie volontairement pas le débrief. La feuille de correction en a besoin. Défaut : le Trésorier le lit à l'ouverture de la feuille, par une lecture dédiée (`select` sur `treasury_checkpoints` déjà permis par `finances:read`). Signalé : la politique `select` actuelle laisse déjà le Dirigeant lire le débrief par l'API (PO-FIE-04).

## 3. RBAC

### Matrice CDC

Aucune ligne de la matrice CDC ne couvre ce module (fondement : demande du Bureau, PO-FI-01). La ligne la plus proche reste « Gérer échéanciers et relances » : Trésorier ✅, Dirigeant ❌, Administrateur ✅ (paramétrage). Elle sert de modèle à « écriture Trésorier seul ». Le CDC (§11.3) range la **« modification paiement »** parmi les actions sensibles à tracer, ce qui fonde l'audit de toute correction financière.

### Rôles

| Rôle | Accès |
|---|---|
| **Trésorier** (vue Trésorier active) | Corrige et supprime selon §1 |
| **Dirigeant habilité** | Lecture seule, inchangée. Lignes **non interactives**, aucun contrôle de correction rendu. Refus par la base |
| **Administrateur** | Lecture seule, inchangée (« seul le Trésorier saisit », PO-FI-02). Refus par la base |
| Autres rôles | Aucun accès (inchangé) |

**Compte multi-rôle** : les contrôles de correction suivent **exactement le même verrou** que les contrôles de saisie existants (`usePermission(action) && isTreasurerView`). Un Trésorier + Dirigeant en vue Dirigeant voit donc l'écran sans contrôle. La RLS lit les **rôles portés** : c'est elle qui fait la sécurité, le verrou de vue active n'est que de l'ergonomie.

### Entrées de matrice ajoutées — toutes `['treasurer']`

Critère du dépôt : une entrée n'existe que si `presentation/` doit décider **avant** la requête. Ici, chaque entrée décide si un contrôle est **rendu**, et chacune correspond à **une** politique ou fonction SQL portant son nom en commentaire.

| Action (nom indicatif) | Contrôle rendu | Miroir SQL (manuel, commenté du nom de l'action) |
|---|---|---|
| `'expense:update'` | Ligne de dépense interactive, feuille pré-remplie, « Enregistrer » | Politique `expenses_update_treasurer` : `using` et `with check` = `private.has_role('treasurer')` et saison = `current_season()`, plus les bornes de date de `expenses_insert_treasurer`. **Privilège de colonne** limité à `amount_cents, label, spent_on, category_id, carrier_id, payment_method` |
| `'expense:delete'` | « Supprimer » dans la feuille de dépense | Politique `expenses_delete_treasurer` : `private.has_role('treasurer')` et saison = `current_season()` ; `grant delete` |
| `'expense_category:update'` | Renommer une catégorie | Fonction `security definer` `rename_expense_category(id, label)` (recalcul de `label_key`, comme `create_expense_category()`) |
| `'expense_category:delete'` | Supprimer une catégorie non utilisée | Politique `expense_categories_delete_treasurer` (ou fonction étroite), FK `restrict` en dernier rempart |
| `'opening_balance:update'` | Corriger un solde d'ouverture saisi | Politique `opening_balances_update_treasurer` : Trésorier, saison = `current_season()` ; privilège de colonne `amount_cents` seul |
| `'treasury_checkpoint:update'` | Ligne d'historique interactive, feuille de point pré-remplie | Fonction `security definer` `update_treasury_checkpoint(id, debrief, lines)` : ne touche **que** `counted_cents` et `debrief`, jamais `theoretical_cents` |
| `'treasury_checkpoint:delete'` | « Supprimer » dans la feuille de point | Fonction `security definer` `delete_treasury_checkpoint(id)`, atomique |

Signalé :
- **Sept entrées**, une par politique ou fonction. On pourrait les réduire (une action `:correct` par ressource couvrant modification et suppression, ou le renommage de catégorie sous `'expense:update'`). Défaut : distinctes, voir PO-FIE-01 (non bloquant, même logique que PO-FI-16).
- Asymétrie assumée : la **création** d'une catégorie reste sous `'expense:record'` (PO-FI-05). Ses renommage et suppression ont leurs propres entrées.
- **Inchangées** : `'finances:read'`, `'expense:record'`, `'opening_balance:record'`, `'treasury_checkpoint:record'`, et toutes les autres. Aucune branche de portée dans `can.ts` (rôles club-wide).
- Aucune politique `update` / `delete` n'est accordée sur `finance_carriers`. Aucun privilège direct `insert` / `update` / `delete` n'est accordé sur `treasury_checkpoints` ni sur `treasury_checkpoint_lines` (fonctions seulement).

## 4. Données sensibles

| Nature | Concerné | Conséquence |
|---|---|---|
| **Financière** | **Oui** | Une correction en place efface l'état antérieur de la table : **l'audit devient la seule trace** de la valeur d'origine. Rétention : PO-FI-11 (inchangé), qui couvre aussi ces nouvelles entrées d'audit (PO-AU-03) |
| **Nominative / texte libre** | Oui : libellé de dépense, débrief, libellé de catégorie | Voir la `metadata` ci-dessous et PO-FIE-03 |
| **Santé** | Non | — |
| **Audit** | **Oui, sept nouveaux codes** | Voir ci-dessous |

**Codes d'audit** : `expense.updated`, `expense.deleted`, `expense_category.updated`, `expense_category.deleted`, `opening_balance.updated`, `treasury_checkpoint.updated`, `treasury_checkpoint.deleted`.
- **Émission** depuis le **use case**, après l'écriture, jamais depuis un composant ni une fonction SQL. `target_type` / `target_id` = la ligne visée.
- **Miroir** : ajoutés à `AUDIT_ACTIONS` **et** à `audit_log_action_check` dans le même changement. `record_audit_log_entry` admet le Trésorier pour ces sept codes, en plus de ses codes actuels.
- **`metadata` = `before` / `after`**, limitée aux **champs structurés** (défaut, PO-FIE-03) :
  - dépense : `amountCents`, `spentOn`, `categoryId`, `carrierId`, `paymentMethod`. Le libellé n'y figure **jamais** : à sa place, un booléen `labelChanged`. Pour une suppression, `before` seul ;
  - solde d'ouverture : `carrierId`, `seasonId`, `amountCents` avant et après ;
  - point : par porteur, `countedCents` avant et après, l'écart total avant et après, et `debriefChanged`. **Jamais** le texte du débrief. Pour une suppression : la date, les lignes (constaté et théorique figé) et l'écart total ;
  - catégorie : libellé avant et après (renommage), libellé (suppression). Ce libellé est une donnée du référentiel, pas un texte libre nominatif, mais c'est à confirmer (PO-FIE-03).
- **Faille héritée, aggravée** : un échec d'audit n'est qu'un `console.error` (PO-TR-19). Pour une **suppression**, la donnée disparaît alors **sans aucune trace**. Signalé, non résolu ici (PO-FIE-09).

## 5. Critères d'acceptation

Préfixe **`AC-FIE-`**. AC-02 (CDC §17.2) s'applique à AC-FIE-01 à 04.

**Droits**

| Réf. | Critère |
|---|---|
| AC-FIE-01 | Les sept actions du §3 valent exactement `['treasurer']`. Aucune autre entrée de matrice n'est ajoutée ni modifiée. Chaque politique ou fonction SQL porte en commentaire le nom de son action |
| AC-FIE-02 | Vue Trésorier active (`isTreasurerView` et `can()`) : un appui sur une ligne de dépense, sur une ligne d'historique de point, sur un solde d'ouverture saisi ou sur une catégorie ouvre la feuille pré-remplie correspondante. Dans toute autre vue (Dirigeant, administrateur, Trésorier + Dirigeant en vue Dirigeant), ces lignes ne sont **pas interactives** et aucun contrôle « Enregistrer » ou « Supprimer » n'est rendu : **absent**, jamais grisé |
| AC-FIE-03 | **Contre la base**, avec un jeton Dirigeant habilité, administrateur sans `treasurer`, ou de tout autre rôle : tout `update` / `delete` de dépense, de catégorie, de solde d'ouverture, et tout appel aux fonctions de correction ou de suppression d'un point, est refusé (aucune ligne affectée, ou `42501`) |
| AC-FIE-04 | Contre la base, même avec un jeton Trésorier : `recorded_by`, `recorded_at` et `season_id` d'une dépense ou d'un solde d'ouverture ne sont pas modifiables ; `theoretical_cents` d'une ligne de point n'est jamais modifiable ; une saisie d'une saison autre que la saison en cours n'est ni modifiable ni supprimable ; un solde d'ouverture n'est pas supprimable |

**Dépense**

| Réf. | Critère |
|---|---|
| AC-FIE-05 | La feuille de correction est la feuille « Nouvelle dépense », pré-remplie avec les valeurs actuelles, avec les mêmes validations (AC-FI-10), appelées par `UpdateExpenseUseCase` via `finance-form-rules.ts`. « Enregistrer » est inactif tant que le formulaire est invalide **ou** inchangé |
| AC-FIE-06 | Après modification ou suppression, sans rechargement manuel : la liste, son compteur, la carte « Dépenses saison », « Ce mois », la ventilation, « Sorties saison », le disponible et le solde des porteurs concernés (ancien et nouveau porteur) sont à jour. **L'écart figé des points existants est inchangé** (AC-FI-17) |
| AC-FIE-07 | « Supprimer » demande une **confirmation explicite** avant d'agir (défaut, à concevoir par designer-agent). Une erreur serveur laisse la feuille ouverte avec ses valeurs et un message en français. Un double tap n'écrit pas deux fois (AC-FI-12 par analogie) |

**Catégorie**

| Réf. | Critère |
|---|---|
| AC-FIE-08 | Renommer : un libellé vide, trop long ou en doublon d'une **autre** catégorie (insensible à la casse et aux accents) est refusé, par la règle pure et par la base. Le nouveau libellé apparaît partout (puces, légende, lignes) sans rechargement ; la couleur ne change pas |
| AC-FIE-09 | Supprimer : le contrôle n'est rendu que pour une catégorie **qu'aucune dépense ne référence, toutes saisons confondues**. Si la base refuse quand même (FK `restrict`), un message en français explique que la catégorie est utilisée, et rien n'est supprimé |

**Solde d'ouverture**

| Réf. | Critère |
|---|---|
| AC-FIE-10 | Un solde d'ouverture saisi peut être corrigé (≥ 0, au plus 2 décimales) par un `UPDATE` de sa ligne. Aucune seconde ligne `(porteur, saison)` n'est jamais créée. Après correction, le solde théorique du porteur, le disponible et la ventilation Banque / Espèces sont à jour ; les points existants sont inchangés. L'avertissement « Ce montant ne pourra pas être modifié ensuite » (UI design §6 du spec parent) est **retiré** |

**Point de trésorerie**

| Réf. | Critère |
|---|---|
| AC-FIE-11 | La feuille de correction est la feuille « Point de trésorerie », pré-remplie avec les montants constatés et le débrief du point. Chaque porteur affiche le **théorique figé du point**, pas le théorique actuel ; l'écart est recalculé à la saisie (constaté − théorique figé, règle pure) |
| AC-FIE-12 | La correction écrit atomiquement les `counted_cents` et le débrief ; `theoretical_cents`, la date, la saison et l'auteur sont inchangés (vérifié contre la base). L'historique affiche le nouvel écart. Les lignes « Compté … » sont à jour |
| AC-FIE-13 | La suppression retire atomiquement le point et toutes ses lignes. L'historique et les lignes « Compté … » se recalculent sur les points restants : un porteur qui n'est plus compté par aucun point n'affiche plus de ligne de constat (AC-FI-16) |

**Audit**

| Réf. | Critère |
|---|---|
| AC-FIE-14 | Chaque modification ou suppression réussie produit **une** entrée d'audit, **vérifiée contre la base**, avec le code du §4, émise par le use case et ciblant la ligne visée. Sa `metadata` contient `before` (et `after` pour une modification) selon le §4, **sans** libellé de dépense ni débrief. Une modification sans changement ne produit **aucune** entrée. `AUDIT_ACTIONS` et `audit_log_action_check` sont modifiés dans le même changement ; `record_audit_log_entry` n'admet le Trésorier que pour ses codes autorisés |

**Transverse**

| Réf. | Critère |
|---|---|
| AC-FIE-15 | Tests Vitest, en priorité : `can()` pour les sept actions (Trésorier oui, Dirigeant, administrateur et autres rôles non) ; règles pures (modification sans changement, doublon de renommage hors catégorie elle-même) ; use cases (refus sans droit, aucune écriture si invalide, audit avant/après sans texte libre, aucun audit si rien n'a changé) |
| AC-FIE-16 | Aucun import de `data/` depuis `presentation/`. Les ViewModels exposent des booléens (noms indicatifs : `canUpdateExpense`, `canDeleteExpense`, `canRenameCategory`, `canDeleteCategory`, `canUpdateOpeningBalance`, `canUpdateCheckpoint`, `canDeleteCheckpoint`). Clés de requête dans `query-keys.ts`. Cibles ≥ `h-11`, `min-w-0` sur les paires côte à côte, barre d'action ancrée (AC-FI-23), vérifiés sur un viewport mobile réel |
| AC-FIE-17 | Non-régression : saisie (AC-FI-10 à 13, 18 à 20, 28 à 30), lecture Dirigeant (AC-FI-03), `/dues` et formulaires de versement inchangés |
| AC-FIE-18 | La migration (politiques, privilèges de colonne, fonctions, élargissement de l'audit) est écrite puis **proposée à l'application**, jamais appliquée en silence |

### Critères existants amendés (`specs/mob-treasurer-finances.md`, amendement daté à y reporter)

| Réf. | Amendement |
|---|---|
| **AC-FI-03** | Ajouter : aucune ligne n'est interactive et aucun contrôle de correction ou de suppression n'est rendu pour le Dirigeant ou l'administrateur. Contre la base, leurs `update` / `delete` sont refusés (AC-FIE-03) |
| **AC-FI-04** | « Aucune autre entrée de matrice » devient : en plus des quatre entrées d'origine, les sept entrées de AC-FIE-01, toutes `['treasurer']` |
| **AC-FI-05** | **Remplacé** : seul le Trésorier peut `update` / `delete`, dans les limites de AC-FIE-03/04. Aucun autre rôle ne le peut. `recorded_by` vaut toujours l'appelant **à l'insertion** et n'est jamais modifiable |
| **AC-FI-17** | « Saisir une dépense ou un versement » devient « saisir, **modifier ou supprimer** une dépense, un versement ou un solde d'ouverture ». Seule la **correction du point lui-même** (AC-FIE-12) ou sa suppression change son écart affiché |
| **AC-FI-21** | Étendu aux sept codes du §4 ; la règle « ni libellé libre ni débrief dans `metadata` » est conservée |
| **AC-FI-25** | Booléens complétés par ceux de AC-FIE-16 |
| **AC-FI-28** | « Contrôle absent une fois le solde saisi » devient : le contrôle de **saisie** disparaît une fois le solde saisi ; il est remplacé, pour le Trésorier, par l'accès à la **correction** (AC-FIE-10). L'unicité `(porteur, saison)` est inchangée |
| **AC-FI-34** | Réalisé : la correction s'ajoute par des politiques, des fonctions et des entrées de matrice, sans migration destructive. « Aucun solde stocké » est inchangé |
| **PO-FI-06** | **Levé** pour Finances par ce spec. PO-WM-04 (correction d'un versement) reste ouvert |
| **UI design** | §3.4 (« Non interactive »), §5.6 (historique « statique »), §6 (avertissement), §8 (tableau des contrôles absents) : à amender par designer-agent selon AC-FIE-02/10 |

## 6. Points ouverts

| Réf. | Question | Défaut retenu (implémenter autour) | Pour qui | Bloquant ? |
|---|---|---|---|---|
| PO-FIE-01 | Sept entrées distinctes, ou regroupement (`:correct` par ressource ; renommage de catégorie sous `'expense:update'`) ? | Distinctes : une action par politique ou fonction | Développeuse | Non |
| PO-FIE-02 | **Champs corrigeables d'un point** : constatés et débrief seulement ? La **date** du point aussi ? (Le théorique figé ne dépend pas de la date : il a été calculé au moment de l'enregistrement.) | Constatés et débrief ; date non corrigeable | Développeuse / Trésorier | **Non pour designer-agent ; à confirmer avant d'écrire `update_treasury_checkpoint()`** |
| PO-FIE-03 | **Texte libre dans l'audit** : faut-il garder le libellé d'une dépense **supprimée** ou modifiée, et le débrief, pour pouvoir reconstituer la saisie ? Cela contredit la règle actuelle (AC-FI-21, PO-FI-12). Le libellé de catégorie avant/après est-il acceptable ? | Champs structurés seulement, `labelChanged` / `debriefChanged`. Libellé de catégorie inclus | Référent RGPD / Trésorier | **Non pour designer-agent ; à confirmer avant l'implémentation des use cases** |
| PO-FIE-04 | Débrief lisible par le Dirigeant via l'API (politique `select` actuelle), alors que la lecture agrégée l'omet volontairement | Inchangé ; lecture dédiée du débrief pour la seule feuille de correction | Développeuse / Référent RGPD | Non |
| PO-FIE-05 | Supprimer un solde d'ouverture (retour à « non saisi ») ? | Non : correction du montant seulement | Trésorier | Non |
| PO-FIE-06 | Corriger une saisie d'une **saison passée** (après clôture) ? | Non : saison en cours seulement | Trésorier / Bureau | Non |
| PO-FIE-07 | **Maquette** de la correction (`DESIGN_LINKS.md` §4, aucune ligne) — question posée **une seule fois** | Ligne `absent` du §0 à recopier ; conception par composition (D-3) | Développeuse | Non |
| PO-FIE-08 | Ajouter `updated_at` / `updated_by` aux tables pour afficher « modifié le … » ? | Non : l'audit est la trace, et rien n'est affiché | Développeuse | Non |
| PO-FIE-09 | Audit hors transaction (PO-TR-19) : une suppression peut ne laisser **aucune** trace si l'écriture d'audit échoue | Hérité, non résolu ; à traiter avec PO-TR-19 | Développeuse | Non ; **à rouvrir avant la mise en production** |
| PO-FIE-10 | Création de catégorie non tracée (PO-FI-07), alors que renommage et suppression le sont | Inchangé (pas de `expense_category.created`) | Développeuse | Non |
| PO-FIE-11 | Point d'entrée du renommage / de la suppression de catégorie (pas de liste de catégories à l'écran aujourd'hui) | À proposer par designer-agent, dans la feuille de dépense ; pas de mode édition (D-3) | Designer-agent | Non |

**Points reconduits, non rouverts** : PO-FI-11 (rétention), PO-FI-12 (texte libre), PO-WM-04, PO-TR-19, PO-AU-03.

## Transmission

**Prêt pour transmission à designer-agent : OUI.** Aucun point ne bloque la conception. PO-FIE-02 et PO-FIE-03 doivent être confirmés **avant l'implémentation** (fonction SQL de correction d'un point, `metadata` d'audit), pas avant le design.

À concevoir par composition, sans nouvelle maquette :
- lignes de dépense et d'historique de point **interactives en vue Trésorier seulement** ;
- « Supprimer » et sa confirmation dans les feuilles de dépense et de point ;
- l'accès à la correction d'un solde d'ouverture déjà saisi (O-FI-UI-04 : le montant n'est pas affiché aujourd'hui) ;
- le renommage et la suppression d'une catégorie (PO-FIE-11) ;
- la mise à jour des §3.4, §5.6, §6 et §8 de la section « UI design » du spec parent.

## UI design

> Rédigé le 2026-10-07 par designer-agent. **Aucun point bloquant.** Les droits ne sont pas redéfinis ici : tout renvoie au §3 (sept actions `['treasurer']`) et aux booléens de AC-FIE-16 (`canUpdateExpense`, `canDeleteExpense`, `canRenameCategory`, `canDeleteCategory`, `canUpdateOpeningBalance`, `canUpdateCheckpoint`, `canDeleteCheckpoint`). Chacun vaut `usePermission(action) && isTreasurerView`, comme les contrôles de saisie.

### 0. Références visuelles

- **Registre** : aucune ligne `DESIGN_LINKS.md` pour cette feature (voir §0 du spec, PO-FIE-07). **Aucune maquette de correction.** Conception **par composition**, décision D-3 : aucun prototype Claude Design à demander.
- **Maquettes réutilisées telles quelles** (`docs/designs/finances/`) : feuille « Nouvelle dépense » (`[v1] [Trésorier] Mob - Finances-6.png`, `Finances-5.png` pour la ligne de création de catégorie), feuille « Point de trésorerie » (`Finances-1.png`), onglet Dépenses (`Finances-7.png`, `Finances-4.png`), onglet Trésorerie (`Finances-2.png`, `Finances-3.png`).
- **Composants existants** : les trois feuilles basses du spec parent (§4, §6, §7), leur barre `sticky bottom-0` opaque, `Select`, puces à choix unique, `TreasurerStateMessage`. Aucun nouveau composant visuel, un seul **nouveau motif d'interaction** (la confirmation de suppression en place, §2), justifié ci-dessous.

### 1. Où ça vit

- Écran `/finances` (sous-écran de la destination **Dashboard**, barre basse inchangée à 4 entrées). **Aucune route, aucune feuille nouvelle** : les trois feuilles existantes gagnent un **mode correction** (pré-remplie, titre et barre adaptés), choisi par la présence d'un identifiant à corriger. Ce n'est pas un « mode édition » de l'écran (D-3) : rien ne bascule, on appuie sur une ligne.
- **Rôles** : tout ce qui suit n'est rendu que si le booléen correspondant est vrai (Trésorier en vue Trésorier). Pour le Dirigeant, l'administrateur et un Trésorier + Dirigeant en vue Dirigeant : lignes **identiques au spec parent**, non interactives, sans chevron, sans libellé d'accessibilité « Modifier », **absents et jamais grisés** (AC-FIE-02). Aucun message « lecture seule » ajouté.

### 2. Motifs communs aux trois feuilles de correction

- **Ouverture** : appui sur la ligne (zone entière du `button`, `min-h-11`). Pas d'animation de bascule d'onglet ni de changement de filtre. Libellé d'accessibilité du type « Modifier la dépense {libellé} ».
- **Pré-remplissage** : valeurs actuelles. Le formulaire garde un **état de référence** ; « Enregistrer » est **inactif tant que le formulaire est invalide ou identique à la référence** (AC-FIE-05). Texte du bouton : « Enregistrer les modifications » (« Enregistrer la correction » pour le solde d'ouverture, « Enregistrer les corrections » pour le point). États : « Enregistrement… » et bouton désactivé (pas de double écriture).
- **Barre ancrée** : `sticky bottom-0`, fond opaque, bouton principal `h-11` pleine largeur. **« Annuler »** reste en haut à droite du titre, `h-11`. Comme à la saisie : pas de fermeture par appui hors zone si le formulaire a changé.
- **« Supprimer » (dépense, point)** : bouton **pleine largeur `h-11`, contour destructeur, en fin de corps défilant** (sous un filet, avec un espace avant la barre ancrée), **pas dans la barre**. Justification : à côté de « Enregistrer » il se tape par accident sur mobile ; en fin de corps il reste atteignable sans toucher à l'action principale. Il est rendu seulement si `canDeleteExpense` / `canDeleteCheckpoint`.
- **Confirmation de suppression (AC-FIE-07)** — **nouveau motif, justifié** : pas de seconde boîte de dialogue empilée sur la feuille basse (focus Radix imbriqué, deux fonds assombris, fragile sur mobile). Au tap sur « Supprimer », **la barre ancrée est remplacée sur place** par un panneau de confirmation : une phrase (« Supprimer cette dépense ? Cette action est définitive. »), puis deux boutons `h-11` **empilés** pleine largeur : « Supprimer définitivement » (destructeur) au-dessus de « Annuler » (secondaire, ramène à la barre d'enregistrement, le formulaire est conservé). Le corps défilant reste visible mais sans interaction pendant la confirmation. Pendant l'envoi : « Suppression… », les deux boutons désactivés (pas de double écriture). La phrase nomme l'objet en texte (montant et libellé de la dépense, date du point) pour que l'appui sur la bonne ligne soit vérifiable.
- **Erreur serveur** : feuille ouverte, valeurs conservées, message en français **au-dessus** de la barre ou du panneau de confirmation (AC-FIE-07). Cas dédiés : élément déjà supprimé ou hors saison (« Cette saisie n'existe plus ou ne peut plus être modifiée. », la feuille se ferme à l'acquittement et la liste est rechargée).
- **Succès** : la feuille se ferme, la liste, les cartes et compteurs se mettent à jour d'eux-mêmes (aucun solde stocké, AC-FIE-06). Le filtre actif de l'onglet Dépenses est conservé ; **si la catégorie filtrée n'a plus aucune dépense** (dépense supprimée ou recatégorisée), la puce disparaît et le filtre **retombe sur « Toutes »** (sinon liste vide, contraire à §10 du spec parent).

### 3. Dépense (onglet Dépenses)

- **Ligne de dépense** : pour `canUpdateExpense`, devient un bouton (hauteur ≥ 44 px, retour visuel à l'appui), avec un **chevron** discret après la colonne de montant (`shrink-0`, largeur fixe). La colonne gauche reste `min-w-0` avec `truncate` ; le chevron prend sa place sur la droite, il ne doit pas écraser le montant (le montant et le porteur restent `shrink-0`). À 360 px, vérifier que le libellé reste lisible ; sinon réduire d'abord la marge, jamais le montant.
- **Feuille** : la feuille « Nouvelle dépense » (§4 du spec parent), titre **« Modifier la dépense »**, champs dans le même ordre, pré-remplis. Mêmes bornes de date (saison en cours, pas de futur). La paire **Libellé / Date reste côte à côte avec `min-w-0` sur chacun** et rétrécit à sa colonne (repli en pile à 360 px si la date native n'est pas lisible, comme à la saisie). Tous les champs et puces `h-11`.
- **Barre** : « Enregistrer les modifications ». En fin de corps : « Supprimer la dépense » + confirmation (§2).
- **Catégorie, porteur, mode** : puces à choix unique, valeur actuelle sélectionnée. Changer le porteur est permis (AC-FIE-06 : ancien et nouveau porteur recalculés).

### 4. Catégorie : point d'entrée (PO-FIE-11, proposition)

**Écart avec la formulation de la demande** : un appui sur une puce de catégorie **continue de la sélectionner** (dans la feuille) ou de **filtrer** (dans la rangée de l'onglet). Faire ouvrir une feuille à ce geste casserait le choix unique. Le renommage et la suppression sont donc accessibles **depuis la feuille de dépense seulement** (saisie et correction), par composition de la ligne de création de catégorie (`Finances-5`).

- **Déclencheur** : sur la **puce de catégorie sélectionnée**, un bouton-icône crayon distinct (cible `h-11 w-11`, `aria-label` « Modifier la catégorie {libellé} »), placé juste après la puce. Rendu seulement si `canRenameCategory` ; une seule puce à la fois en porte un (celle qui est sélectionnée). Cela évite d'alourdir la rangée et garde le geste « choisir » intact. Pas de liste de catégories dédiée, pas de nouvel écran.
- **Ligne de correction** (remplace sur place la ligne de puces, comme la création) : champ « Nom de la catégorie » pré-rempli (`flex-1`, `min-w-0`, `h-11`) + « Enregistrer » et « Annuler » (`h-11`, `shrink-0`) ; **repli en pile** sous le champ si la ligne ne tient pas à 360 px (jamais de débordement horizontal). Libellé vide, trop long ou doublon d'une **autre** catégorie : message en français sous le champ, ligne conservée (AC-FIE-08). Succès : la ligne se referme, la puce garde sa couleur et son rang, le nouveau libellé apparaît partout. **Les autres valeurs du formulaire de dépense (montant, libellé, date…) sont conservées intactes.**
- **Suppression** : si `canDeleteCategory` **et** que la catégorie n'est référencée par **aucune dépense, toutes saisons confondues** (information de lecture à fournir au ViewModel, voir PO-FIE-11), un bouton « Supprimer la catégorie » (`h-11`, destructeur, texte) apparaît **dans la ligne de correction**, sous le champ. Appui : confirmation **sur place** dans la ligne (phrase + « Supprimer définitivement » / « Annuler » empilés `h-11`, même motif qu'en §2). Si la catégorie est utilisée, le bouton **n'est pas rendu** (pas grisé) ; on n'ajoute pas d'explication, sauf si la base refuse quand même : message « Cette catégorie est utilisée par des dépenses et ne peut pas être supprimée. » (AC-FIE-09).
- Après suppression, la sélection de la feuille est vidée si c'était cette catégorie (jamais le cas pour la catégorie de la dépense corrigée, qui est utilisée par définition) ; le formulaire redevient invalide tant qu'une catégorie n'est pas choisie.

### 5. Solde d'ouverture (onglet Trésorerie)

- **Donnée à afficher (changement de O-FI-UI-04, voir §8)** : pour un porteur dont le solde est saisi, la ligne gagne une **troisième ligne de texte « Ouverture {montant} »** (texte secondaire, `truncate`), qui remplace la mention « Solde d'ouverture non saisi » (les deux sont exclusives). Elle est affichée **à tous les rôles** (parité de lecture, AC-FI-03) : voir question d'interface ci-dessous. Le ViewModel a de toute façon besoin du montant pour pré-remplir la feuille.
- **Ligne du porteur** : pour `canUpdateOpeningBalance` et un solde saisi, la **ligne entière devient un bouton** (≥ 44 px) avec chevron en bout de la colonne droite. Le bouton « Saisir » (porteur sans solde) est **inchangé** et reste le seul contrôle de cette ligne dans ce cas. Les deux états ne coexistent jamais : jamais de bouton imbriqué dans un bouton.
- **Feuille** : « Solde d'ouverture » du §6 du spec parent, titre **« Corriger le solde d'ouverture »**, rappel « {porteur} · Saison {libellé} », un seul champ montant pré-rempli (même grand champ `h-14`, « € », ≥ 0, 2 décimales), barre « Enregistrer la correction » inactive tant qu'invalide ou inchangée.
- **Pas d'avertissement « ne pourra pas être modifié ensuite »** (retiré, AC-FIE-10) et **pas de « Supprimer »** (PO-FIE-05 : rien ne ramène un porteur à « non saisi »). Le texte de la feuille de **saisie initiale** perd lui aussi l'avertissement ; aucune mention de remplacement n'est ajoutée.

### 6. Point de trésorerie (onglet Trésorerie, historique)

- **Ligne d'historique** : pour `canUpdateCheckpoint`, devient un bouton ≥ 44 px : date longue à gauche (`min-w-0`, `truncate`), « Écart {±montant} » puis chevron à droite (`shrink-0`). Lecture seule : ligne statique, sans chevron (inchangé). O-FI-UI-02 est inchangé (pas de détail dépliable ni de débrief affiché dans la liste).
- **Feuille** : « Point de trésorerie » du §7 du spec parent, titre **« Corriger le point du {date longue} »** (date en lecture seule, non corrigeable par défaut, PO-FIE-02). Différences par rapport à la saisie :
  - un bloc par **porteur compté dans ce point** (pas ceux ajoutés depuis), **pré-remplis avec le constaté enregistré** (écart avec O-FI-UI-01, qui ne vaut que pour une saisie neuve : ici on corrige un comptage déjà fait) ;
  - ligne d'intitulé : nom (`min-w-0`, `truncate`) et **« Théorique figé {montant} »** (`shrink-0`, `whitespace-nowrap`) : c'est le théorique du point, jamais l'actuel (AC-FIE-11) ;
  - ligne de saisie : champ montant `flex-1 min-w-0 h-11` **côte à côte** avec l'indicateur d'écart `shrink-0` ; l'écart se recalcule (constaté − théorique figé), « Juste » si nul ;
  - **aucune** mention « Solde d'ouverture non saisi » ;
  - « Total constaté » recalculé comme à la saisie ;
  - une courte phrase en tête : « Le théorique de ce point est figé ; seuls les montants constatés et le débrief se corrigent. »
- **Débrief** : lu à l'ouverture de la feuille (lecture dédiée, PO-FIE-04). **Pendant la lecture** : zone « Débrief » en squelette, les montants sont déjà éditables, mais **« Enregistrer » reste inactif** (sinon un débrief non chargé serait écrasé). **Échec de lecture** : message dans la zone + bouton « Réessayer » (`h-11`) ; l'enregistrement reste inactif tant que le débrief n'est pas lu. Débrief vide : zone vide, pas d'état d'erreur.
- **Barre** : « Enregistrer les corrections ». En fin de corps : « Supprimer le point » + confirmation (§2), phrase : « Supprimer le point du {date} ? Les montants constatés de tous les porteurs seront supprimés. Cette action est définitive. »
- **Après suppression** : historique et lignes « Compté … » suivent le dernier point **restant** ; un porteur plus compté n'affiche plus la ligne de constat ; si c'était le seul point, « Aucun point de trésorerie cette saison. » (§10 du spec parent).

### 7. États chargement, vide, erreur (delta §10 du spec parent)

Aucune nouvelle ligne au tableau, hormis le débrief du point (§6) et l'erreur « n'existe plus » (§2). **Sans saison en cours** : aucune ligne n'est interactive (même règle que les contrôles de saisie).

### 8. Delta pour le « UI design » du spec parent (`specs/mob-treasurer-finances.md`, à reporter, sans l'éditer ici)

- **§3.4 (lignes de dépense)** : remplacer « **Non interactive** (pas de détail, pas de modification : PO-FI-06). Pas de chevron. » par : « **Interactive pour le Trésorier en vue Trésorier** (`canUpdateExpense`) : la ligne est un bouton ≥ 44 px avec chevron, qui ouvre la feuille « Modifier la dépense » (voir UI design de `mob-treasurer-finances-edit`). **Non interactive, sans chevron** pour le Dirigeant, l'administrateur et le Trésorier en vue Dirigeant. » Pas de détail pour les lecteurs. Compléter la phrase du bouton flottant : la réserve de bas de page reste inchangée.
- **§3.2 (puces de filtre)** : ajouter que la puce active **retombe sur « Toutes »** si sa catégorie n'a plus de dépense après une correction (§2).
- **§4 (feuille « Nouvelle dépense »)** : ajouter une note « réutilisée en mode correction (§3 de `-edit`) » ; ajouter, sur la **puce de catégorie sélectionnée**, le bouton crayon `canRenameCategory` et la ligne de correction / suppression de catégorie (§4 de `-edit`). La ligne de création de catégorie est inchangée.
- **§5.4 (« Par porteur »)** : ajouter la ligne « Ouverture {montant} » (si saisi) et la ligne entière interactive pour `canUpdateOpeningBalance`.
- **§5.6 (historique des points)** : remplacer « **Lignes statiques dans cette passe** » par : « Lignes **interactives pour le Trésorier en vue Trésorier** (`canUpdateCheckpoint`, bouton ≥ 44 px, chevron) ouvrant la feuille de correction ; **statiques** dans toute autre vue. Toujours aucun détail par porteur ni débrief dans la liste (O-FI-UI-02 inchangé). »
- **§6 (solde d'ouverture)** : (1) **supprimer** l'avertissement « Ce montant ne pourra pas être modifié ensuite. » et la phrase qui le justifie (« la correction est hors périmètre… AC-FI-28 rend le contrôle absent après saisie » ; « C'est la seule protection contre l'erreur de frappe ; pas de seconde confirmation ») ; (2) « **Après saisie** » : la mention et le bouton « Saisir » disparaissent, **remplacés** pour tout le monde par la ligne « Ouverture {montant} », et pour le Trésorier par une ligne entière interactive ouvrant « Corriger le solde d'ouverture » ; (3) retirer « Aucune ligne “Ouverture {montant}” n'est ajoutée à la ligne du porteur » ; (4) ajouter la feuille de correction (§5 de `-edit`), sans « Supprimer ».
- **§7 (feuille « Point de trésorerie »)** : ajouter une note « réutilisée en mode correction (§6 de `-edit`) : pré-remplie, théorique figé, débrief lu à l'ouverture, bouton « Supprimer le point » ».
- **§8 (variante lecture seule)** : ajouter au tableau des contrôles **non rendus** : « Chevron et interactivité des lignes de dépense » (`canUpdateExpense`), « Crayon de modification de catégorie » (`canRenameCategory`), « Suppression de catégorie » (`canDeleteCategory`), « Ligne de solde d'ouverture interactive » (`canUpdateOpeningBalance`), « Ligne d'historique interactive » (`canUpdateCheckpoint`), « Supprimer la dépense » (`canDeleteExpense`), « Supprimer le point » (`canDeleteCheckpoint`). Conséquence d'agencement : en lecture seule, les lignes n'ont ni chevron ni réserve pour lui (les colonnes de droite retrouvent leur pleine largeur). La phrase « la mention “Solde d'ouverture non saisi” reste affichée » et « aucun message lecture seule » sont conservées.
- **§11 (récapitulatif tactile)** : ajouter les paires côte à côte de ce design (montant + chevron d'une dépense, date + « Écart » + chevron d'un point, champ montant / écart du point corrigé, champ / boutons de correction de catégorie avec repli en pile, Libellé / Date de la feuille en mode correction) avec `min-w-0` sur chacune ; cibles ≥ `h-11` pour les lignes interactives, le crayon (`h-11 w-11`), « Supprimer … », « Supprimer définitivement », « Annuler », « Réessayer ». Vérifier à **360 px réel**.
- **§12** : O-FI-UI-04 est **tranché** (le solde saisi s'affiche) ; O-FI-UI-02 inchangé.

### 9. Points ouverts d'interface

**Aucun bloquant.**

| Réf. | Question | Défaut retenu dans ce design |
|---|---|---|
| O-FIE-UI-01 | **Point d'entrée de la catégorie** : la demande parle d'un appui sur « une puce de catégorie » ; il casserait la sélection (feuille) et le filtre (liste) | Crayon sur la **puce sélectionnée** dans la feuille de dépense, ligne de correction sur place (§4). Acceptable ? Sinon, alternative : une feuille « Catégories » ouverte par un lien dans la feuille de dépense (plus lourde) |
| O-FIE-UI-02 | **Montant « Ouverture {montant} »** visible aussi du Dirigeant et de l'administrateur ? (parité de lecture) | Oui. Si le montant ne doit pas leur être montré, ne l'afficher que pour le Trésorier et laisser les autres sans ligne (la mention « non saisi » étant inchangée pour eux) |
| O-FIE-UI-03 | Confirmation de suppression en place (remplacement de la barre ancrée) plutôt qu'une boîte de dialogue séparée | Remplacement en place (§2) |
| O-FIE-UI-04 | « Supprimer » en fin de corps défilant, pas dans la barre ancrée | Fin de corps (§2) : moins d'appuis accidentels, mais moins visible sur une feuille longue (le point à plusieurs porteurs) |
| O-FIE-UI-05 | Le porteur d'un point **ajouté depuis** n'est pas compté dans la correction (pas de ligne) | Absent de la feuille de correction ; on ne peut pas ajouter un porteur à un point existant |
