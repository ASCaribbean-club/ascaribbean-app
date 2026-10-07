# Spec — Finances : dépenses avancées par un membre, et archivage des porteurs (`finances-member-advances`)

> Statut : **rédaction initiale 2026-10-07, amendée deux fois le même jour** avec les décisions de la développeuse (voir « Décisions »). Deux parties : **A**, les dépenses avancées par un membre, leur **état de remboursement**, et la feuille de dépense en **assistant à quatre étapes** (écran mobile `/finances`) ; **B**, l'archivage des porteurs (page backoffice « Porteurs »), qui **lève PO-FC-02**.
> **Aucun point ouvert bloquant.** Deux propositions restent **à confirmer** par la développeuse, sans bloquer ni le design ni la migration, puisqu'un défaut est retenu : l'interprétation de PO-FA-04 (mode de paiement d'une avance), et le nom de l'action et du code d'audit de PO-FA-21. PO-FA-18 reste **ouvert** (aucun mouvement de porteur au remboursement), à rouvrir avant la mise en production.
> La section « UI design » sera rédigée par designer-agent. Ce spec ne fixe que le périmètre, les règles, le RBAC et les critères.
> Sources : `specs/mob-treasurer-finances.md` (§2, §3, §4, AC-FI-06 et AC-FI-08 à 34, PO-FI-03/11/12, UI design §4), `specs/mob-treasurer-finances-edit.md` (§2, §3, §4, AC-FIE-02 à 07/10/14/16, UI design §2/§3), `specs/web-finance-carriers.md` (§1, §2.3, §2.5, §3, §4, AC-FC-02/04/10/14, PO-FC-02/03, UI design), `docs/priorisation-fonctionnelle-as-acaribbean.md` (matrice RBAC, journal d'audit §11.3 : « modification paiement »), `docs/roles-personas-as-caribbean.md`, `docs/designs/DESIGN_LINKS.md` §4, `docs/designs/finances/advanced_by_member/` (5 exports), `CLAUDE.md` §6/§7/§9.
> État lu (tout est appliqué) : migrations `20261007081032_finances.sql`, `20261007132824_finances_edit.sql`, `20261007142228_finance_carriers_admin.sql` ; `src/domain/rules/{finance-rules,finance-form-rules}.ts`, `src/domain/entities/finance.ts`, `src/domain/usecases/finances/{RecordExpenseUseCase,UpdateExpenseUseCase}.ts`, `src/domain/usecases/finance-carriers/UpdateFinanceCarrierUseCase.ts`, `src/domain/policies/rbac-matrix.ts`, `src/presentation/features/finances/{finances-view.ts,useExpenseSheetViewModel.ts}`.

## Décisions de la développeuse (2026-10-07, non rouvertes)

### Premier lot

| Réf. | Décision |
|---|---|
| D-A1 | Une dépense avancée par un membre **n'est pas un porteur**. Dans la feuille de dépense (saisie **et** correction), le payeur est soit un **porteur réel**, soit **un membre**, choisi dans un sélecteur **obligatoire** |
| D-A2 | Stockage sur la dépense : `advanced_by_user_id`, avec `carrier_id` à `null`. **Exactement l'un des deux** est renseigné (contrainte CHECK). Le privilège de colonne `update` et la RLS sont ajustés |
| D-A3 | Une telle dépense **ne touche** ni le solde d'un porteur, ni « Par porteur », ni le théorique des points. Elle **compte** dans les totaux et les catégories de dépenses. Elle crée une dette envers le membre, affichée « à rembourser » par membre. La lecture passe par `get_finances_snapshot()`, et la règle nominative est conservée (AC-FI-06, PO-FI-03) |
| D-A5 | La `metadata` d'audit d'une dépense porte le **seul identifiant du membre**, jamais son nom |
| D-B1 | L'**Administrateur** archive et restaure un porteur. Un porteur archivé disparaît des choix de payeur. Les **nouveaux** points l'ignorent : `record_treasury_checkpoint()` exige une ligne par porteur **non archivé** |
| D-B2 | Historique, points passés, soldes et soldes d'ouverture restent **intacts et visibles**. Le porteur archivé reste dans le tableau admin, marqué, avec une action de restauration, et continue de s'afficher dans les saisies passées |
| D-B3 | Archivage refusé tant que le **solde courant** du porteur n'est pas nul. Toujours **aucune suppression** |
| D-B4 | Entrées de matrice **admin seulement**. Codes d'audit `finance_carrier.archived` / `finance_carrier.restored`. Colonne `archived_at`. RLS et privilèges recopiés à la main |

### Second lot

| Réf. | Décision |
|---|---|
| D-A4bis | **L'état de remboursement est stocké** sur la dépense avancée. À l'étape Paiement, si « Avancé par un membre ? » vaut **Oui**, on affiche le champ membre et les puces **« À rembourser » / « Remboursé »**, et les puces de porteur sont masquées. L'état est modifiable par la correction et figure dans la `metadata` d'audit (aucun texte libre). « À rembourser » ne compte que les avances **non remboursées** |
| D-A4ter | Le **bouton « Remboursé » avec détail** reste **hors périmètre**. Ce bouton créera une ligne de remboursement dédiée, qui débitera un porteur réel. Cette future ligne doit pouvoir **justifier ou supplanter** l'état stocké sans changer le sens de la colonne |
| D-A6 | Le champ membre est un **sélecteur de comptes avec recherche** : la saisie filtre la liste, et un compte doit être choisi. Jamais de texte libre |
| D-A7 | La feuille de dépense devient un **assistant à quatre étapes**, en **saisie comme en correction** : **Montant** (montant, libellé, date) → **Catégorie** → **Paiement** → **Récap**, avec « Retour » / « Suivant ». « Supprimer » reste disponible en correction. C'est un changement de présentation, **sans nouvelle règle** |
| PO-FA-01/02/03 | **TRANCHÉS** : la dette couvre **toutes les saisons**. Le sélecteur liste **tous les comptes**. Cette liste n'est envoyée **qu'à un appelant portant le rôle `treasurer`**, par `get_finances_snapshot()` |
| PO-FA-07/08 | **TRANCHÉS** : l'archivage est refusé **sans saison en cours**, ou si le **solde d'ouverture de la saison en cours n'est pas saisi** (en plus du cas du solde non nul) |

### Troisième lot

| Réf. | Décision | Effet |
|---|---|---|
| PO-FA-04 | **TRANCHÉ, interprétation à confirmer.** Le mode de paiement n'est **pas demandé** tant que l'avance est « À rembourser ». Réponse littérale : *« needed only when mark as reimbursed »*. **Interprétation retenue** : pour une avance, `payment_method` est le **mode utilisé pour rembourser le membre**. Il est **absent** quand l'avance est à rembourser et **obligatoire** quand elle est remboursée. Pour une dépense de porteur, il reste obligatoire et garde son sens | §2.1, AC-FA-01/05 |
| PO-FA-19 | **TRANCHÉ, option (a)** : une **fonction étroite `security definer`, Trésorier seul**, qui pose ou efface **uniquement** `reimbursed_on` (et `payment_method` quand elle marque l'avance remboursée), sur une avance de **n'importe quelle saison**. On y accède depuis le bloc « À rembourser ». Elle demande une entrée de matrice et un code d'audit (proposés, PO-FA-21) | §2.7, §3, AC-FA-31 à 36 |
| PO-FA-20 | **TRANCHÉ** : le Trésorier **saisit la date de remboursement**. Le champ apparaît quand « Remboursé » est choisi, avec la date du jour par défaut. Bornes : comme `spent_on`, **pas dans le futur**, et **pas avant la date de l'avance** | §2.1, AC-FA-05/31 |
| PO-FA-18 | **Reste OUVERT** (non résolu) | §6 |

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne au registre** pour cette feature. Cinq exports locaux couvrent la **saisie** de la partie A : `docs/designs/finances/advanced_by_member/[v1] [Trésorier] Mob - add expense {1..5}.png`. Aucune maquette ne couvre la correction, le bloc « À rembourser » et son action, ni la partie B. Le lien artifact a déjà été demandé une fois (PO-FA-12) et n'est pas redemandé. L'agent PO n'écrit que dans `specs/` : voici la ligne pré-rédigée, à recopier faute de lien.

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| finances-member-advances — **feuille « Nouvelle dépense » en assistant à 4 étapes (Montant, Catégorie, Paiement avec « Avancé par un membre ? », Récap)** | — aucun lien fourni (PO-FA-12) | 2026-10-07 | `docs/designs/finances/advanced_by_member/[v1] [Trésorier] Mob - add expense {1,2,3,4,5}.png` | **instantané seul** |

> Notes à joindre à la ligne :
> - (a) 1 = Montant ; 2 = Catégorie ; 3 = Paiement, « Non » (porteur + mode de paiement) ; 4 = Paiement, « Oui » (champ membre + « À rembourser » / « Remboursé ») ; 5 = Récap.
> - (b) **Écarts décidés, à ne pas reproduire** :
>   - le champ membre est dessiné en texte libre, alors que la décision D-A6 impose un sélecteur avec recherche ;
>   - l'export 4 ne montre que l'état « À rembourser ». Avec « Remboursé », il faut **ajouter** un champ de date et les puces de mode de paiement (PO-FA-04, PO-FA-20).
> - (c) La partie B, le bloc « À rembourser » et son action n'ont aucune maquette : statut `absent` pour ces écrans.
> - (d) Les libellés de porteurs visibles sur les exports sont des illustrations.

## 1. Périmètre

Extension de la dérogation au CDC déjà tranchée pour tout le module Finances (PO-FI-01, demande du Bureau). Même priorité de fait : **P1**. La partie B relève en plus de la ligne de matrice « Gérer comptes, rôles, paramétrage » (Administrateur seul), comme `web-finance-carriers`. Le CDC (§11.3) range la « modification paiement » parmi les actions sensibles à tracer, ce qui fonde l'audit du changement d'état de remboursement.

### Partie A — Dépenses avancées par un membre (mobile `/finances`)

**Au périmètre**
1. **Assistant à quatre étapes** (D-A7), en saisie **et** en correction d'une dépense :
   - **Montant** : montant, libellé, date ;
   - **Catégorie** : avec la création de catégorie existante et, en correction, le renommage et la suppression existants ;
   - **Paiement** ;
   - **Récap** : c'est là qu'on enregistre.
   - En correction, l'assistant est pré-rempli et « Supprimer » reste disponible.
   - Aucune règle nouvelle.
2. **Étape Paiement** :
   - « Avancé par un membre ? » **Non** : porteur **actif** (non archivé, partie B) et mode de paiement, comme aujourd'hui ;
   - **Oui** : **sélecteur de compte avec recherche**, obligatoire (D-A6), puis l'état **« À rembourser »** (choix par défaut, aucun autre champ) ou **« Remboursé »**. « Remboursé » fait apparaître une **date de remboursement** (aujourd'hui par défaut) et le **mode de paiement du remboursement**, tous deux obligatoires. Les puces de porteur sont masquées.
3. Stockage : nouvelles colonnes `advanced_by_user_id` et `reimbursed_on`. `carrier_id` et `payment_method` deviennent nullables, sous les contraintes du §2.1.
4. **Correction** de l'état de remboursement par l'assistant (dépense de la saison en cours, `'expense:update'`).
5. **Marquer une avance remboursée, ou annuler ce marquage, depuis le bloc « À rembourser »**, pour une avance de **n'importe quelle saison**, par une écriture étroite dédiée (§2.7).
6. Affichage d'une dépense avancée dans la liste : « Avancé par {nom affichable} » remplace le porteur, et son état de remboursement est indiqué en texte (libellés : designer-agent).
7. **Bloc « À rembourser »** : le total des avances **non remboursées**, par membre et en total général, **toutes saisons confondues**. Lecture pour tous les rôles qui lisent Finances ; l'action est réservée au Trésorier.
8. Audit des avances et des changements d'état de remboursement (§4).

**Hors périmètre, explicitement**
- La **ligne de remboursement** dans une table dédiée, le **débit d'un porteur** au remboursement, les remboursements partiels. Voir §2.4 pour les contraintes d'extensibilité.
- Toute **écriture sur un porteur** quand une avance passe à « Remboursé » : PO-FA-18, **ouvert**.
- Une **vue membre** de ce que le club lui doit (PO-FA-10).
- Les avances sur un versement de cotisation ou sur un solde d'ouverture, les payeurs multiples, les justificatifs, les notes de frais, les plafonds.
- Tout changement de `/dues` et des formulaires de versement, hors filtre des porteurs archivés (partie B).
- L'assistant ne concerne **que la feuille de dépense**. Les feuilles « Point de trésorerie » et « Solde d'ouverture » sont inchangées.

### Partie B — Archivage des porteurs (backoffice « Porteurs »)

**Au périmètre**
1. Colonne `finance_carriers.archived_at` (nullable ; `null` = actif).
2. **Archiver** un porteur actif. L'archivage est refusé dans trois cas : aucune saison en cours, **solde d'ouverture de la saison en cours non saisi**, ou **solde courant non nul** (§2.5).
3. **Restaurer** un porteur archivé.
4. Tableau admin : les porteurs archivés restent listés, **marqués en texte**, avec l'action de restauration. Les porteurs actifs portent l'action d'archivage.
5. Effets en aval : un porteur archivé disparaît des choix de payeur, du champ « Porteur » des formulaires de versement (`get_finance_carriers()`), de la saisie du solde d'ouverture et des **nouveaux** points. Il reste affiché dans les saisies passées.
6. Une entrée de matrice admin, deux codes d'audit, RLS et fonctions recopiées à la main.

**Hors périmètre, explicitement**
- **Suppression** d'un porteur : toujours jamais (AC-FC-02/04 inchangés).
- Archivage automatique. Archivage par le Trésorier ou le Dirigeant habilité.
- Transfert de solde entre porteurs. Modification du **type** d'un porteur (PO-FC-01).

## 2. Modèle et règles

Le modèle est **indicatif**, à confirmer à l'implémentation. Une nouvelle migration seulement : **aucune migration existante n'est modifiée**. Elle est écrite puis **proposée à l'application**, jamais appliquée en silence.

### 2.1 Partie A — table `public.expenses`

| Élément | Existant | Changement |
|---|---|---|
| `carrier_id` | `uuid not null`, FK `on delete restrict` | **`drop not null`**. FK inchangée |
| `advanced_by_user_id` | — | **Nouvelle colonne** `uuid null references public.users (id) on delete restrict`, indexée |
| `reimbursed_on` | — | **Nouvelle colonne** `date null`. `null` = **à rembourser** ; renseignée = **remboursée** à cette date, **saisie par le Trésorier** (PO-FA-20) |
| `payment_method` | `not null`, cinq valeurs | **`drop not null`**. Les valeurs autorisées restent les cinq mêmes (`expenses_payment_method_check` inchangée quand la valeur est présente) |
| Contrainte payeur | — | `expenses_payer_check check (num_nonnulls(carrier_id, advanced_by_user_id) = 1)` |
| Contrainte remboursement | — | `reimbursed_on is null or (advanced_by_user_id is not null and reimbursed_on >= spent_on)` : l'état n'existe que pour une avance, et jamais avant la date de l'avance |
| Contrainte mode de paiement (PO-FA-04) | — | Une dépense de porteur a toujours un mode. Pour une avance, `payment_method` est renseigné **si et seulement si** `reimbursed_on` l'est. Forme indicative : `(advanced_by_user_id is null and payment_method is not null) or (advanced_by_user_id is not null and (reimbursed_on is null) = (payment_method is null))` |

- **Dates** : « pas dans le futur » ne peut pas être une contrainte CHECK, car elle dépend de l'horloge. La règle est portée par les politiques et la fonction d'écriture : `reimbursed_on <= current_date`, avec le même commentaire sur l'UTC que `expenses_insert_treasurer`. La borne basse (`>= spent_on`) est une CHECK. Corriger `spent_on` après la date de remboursement est donc refusé.
- **Rattrapage** : les dépenses existantes ont toutes un `carrier_id` et un `payment_method`. Les contraintes sont satisfaites sans rattrapage.
- **Aucun montant dû stocké**, aucun cumul (AC-FI-34). `reimbursed_on` est un **état** de la dépense ; le reste dû se calcule à la lecture.
- **Privilège de colonne `update`** : `grant update (advanced_by_user_id, reimbursed_on)` s'ajoute au grant existant. `payment_method` y figure déjà. `recorded_by`, `recorded_at` et `season_id` restent non modifiables (AC-FIE-04).
- **RLS** (`'expense:record'`, `'expense:update'`, `'expense:delete'`) : `expenses_insert_treasurer`, `expenses_update_treasurer` et `expenses_delete_treasurer` sont **recréées**. Elles gardent leurs conditions actuelles, **saison en cours comprise**, et gagnent `reimbursed_on <= current_date` (insertion et modification) ainsi que la règle « porteur archivé » (§2.6). La FK garantit le membre, sans autre condition sur le compte (PO-FA-16).
- **Changement de sens signalé** : pour une avance, `payment_method` décrit le **remboursement**, pas l'achat. La ligne de liste « {catégorie} · {date} · {mode} » n'affiche donc pas de mode pour une avance à rembourser. Le libellé exact est laissé à designer-agent.
- **Lecture du nom** : le Trésorier et le Dirigeant ne lisent `users` que pour leur propre ligne (AC-FI-06). Les écritures (`returning`) ne joignent **jamais** `users`.

### 2.2 Partie A — lecture `get_finances_snapshot()` (`'finances:read'`)

Nouvelle version de la fonction, recopiée à l'identique pour le reste, comme dans `20261007132824_finances_edit.sql` :

- **`expenses[]`** (saison en cours) : chaque élément gagne `advanced_by_user_id` et `reimbursed_on`. `carrier_id` et `payment_method` peuvent valoir `null`.
- **`outstanding_advances[]`** (nouvelle clé) : **toutes les avances non remboursées, toutes saisons confondues** (PO-FA-01). Chaque élément porte `id`, `advanced_by_user_id`, `amount_cents`, `label`, `spent_on` et le libellé de sa saison. C'est ce qui alimente le bloc « À rembourser » et son action, y compris pour les saisons passées (§2.7). Le libellé est le même texte libre que celui déjà lu par le Dirigeant pour la saison en cours (PO-FI-12).
- **`advance_members[]`** (nouvelle clé) : `user_id` et `display_name` (nom affichable seul) de **chaque membre ayant au moins une avance**, toutes saisons. C'est la source de tout nom affiché pour une avance, qu'elle soit remboursée ou non.
- **`advance_candidates[]`** (nouvelle clé) : **tous les comptes**, `user_id` et `display_name`, triés par nom. Elle n'est **renseignée que si l'appelant porte le rôle `treasurer`** ; sinon c'est un tableau vide (PO-FA-02/03). La recherche se fait côté client.
- **`carriers[]`** : chaque porteur gagne son état d'archivage. Tous les porteurs restent renvoyés.
- **Sans saison en cours** : `outstanding_advances` et `advance_members` sont renvoyées quand même ; `advance_candidates` reste vide (PO-FI-09).
- Le débrief n'est toujours **pas** renvoyé.

### 2.3 Partie A — domaine (règles pures, Vitest)

- **Entité `Expense`** : le payeur devient « porteur **ou** membre ». Forme recommandée : une union discriminée `payer: { kind: 'carrier', carrierId, paymentMethod } | { kind: 'member', userId, reimbursement: null | { reimbursedOn, paymentMethod } }`. Elle rend impossibles en TypeScript les états interdits par les contraintes du §2.1. Le mapper convertit depuis les colonnes. C'est un choix d'implémentation, non bloquant.
- **`FinancesSnapshot`** gagne `outstandingAdvances`, `advanceMembers` et `advanceCandidates`. `CarrierFigures` gagne l'état d'archivage.
- **`theoreticalBalanceCents`** : formule inchangée. Une avance, remboursée ou non, n'entre dans **aucun** solde (PO-FA-18). Un test le vérifie.
- **Totaux de dépenses** (`sumExpensesCents`, `expenseTotalsByCategory`, `monthExpensesCents`, `filterExpensesByCategory`, `categoriesWithExpenses`) : inchangés. Les avances y comptent, remboursées ou non.
- **Nouvelle règle `amountsOwedToMembers`** (nom indicatif) : elle somme `outstandingAdvances` par membre, ne renvoie que les membres à reste dû > 0, triés par montant décroissant puis par nom, avec le total général. C'est le **seul point de calcul** de « à rembourser ».
- **Validations** dans `finance-form-rules.ts`, réutilisées par les use cases avant tout appel réseau :
  - **payeur** : exactement un, soit un porteur actif connu, soit un compte de la liste ;
  - **remboursement** :
    - réservé aux avances, et effacé quand le payeur passe à un porteur ;
    - à « Remboursé », la date est requise, pas dans le futur (date du jour du club fournie par l'appelant) et pas avant `spentOn` ;
  - **mode de paiement** : requis pour une dépense de porteur et pour une avance remboursée ; absent pour une avance à rembourser.
  - Les bornes de date réutilisent la forme de `validateExpenseDate`.
- **`ExpenseEditableFields` / `hasExpenseChanged`** intègrent le membre, la date de remboursement et le mode de paiement, désormais nullable.
- **Recherche du sélecteur** : insensible à la casse et aux accents, avec la normalisation existante. C'est de la présentation.
- **Assistant** : le ViewModel **dérive** la validité de chaque étape des règles pures existantes. Aucune règle de domaine nouvelle.
- **Use cases** :
  - `RecordExpenseUseCase` et `UpdateExpenseUseCase` acceptent le payeur et l'état de remboursement, avec des droits inchangés ;
  - un **nouveau** use case, `SetExpenseReimbursementUseCase` (nom indicatif), sert à l'écriture du §2.7.

### 2.4 Partie A — extensibilité vers la ligne de remboursement (D-A4ter) : **rien n'est construit**

La future fonctionnalité est un bouton « Remboursé » avec un détail, qui crée une **ligne de remboursement** dans une **nouvelle table** et **débite un porteur réel**. Contraintes à respecter dès maintenant :

1. **Sens stable de `reimbursed_on`** : « l'avance est remboursée, à cette date ». Celui de `payment_method` sur une avance est « mode du remboursement ».
   - La future ligne **justifie** cet état : elle dit d'où est sorti l'argent.
   - Elle pourra **renseigner** ces deux colonnes à partir de ses propres valeurs, ou être rattachée à une avance déjà marquée.
   - Une avance marquée sans ligne se lit « remboursée, sans mouvement de porteur enregistré » (PO-FA-18).
   - **Aucune migration de sens** des données existantes.
2. **Pas de colonne d'origine** (« déclaré » / « justifié ») maintenant : l'existence d'une ligne suffira à le dire, par jointure.
3. **Rattachement possible** : la dépense (UUID) et le membre (`users.id`) sont les clés qu'une future ligne pourra référencer. Aucune contrainte ni aucun trigger ne l'empêche.
4. **Un seul point de calcul** (`amountsOwedToMembers`, `outstanding_advances`). Un remboursement partiel futur pourra porter un reste par avance **sans changer le contrat** « reste dû = avances non soldées ».
5. **Solde des porteurs** : la ligne future débitera un porteur. Il faudra l'ajouter **dans le même changement** à `theoreticalBalanceCents` et à ses miroirs SQL : le théorique figé de `record_treasury_checkpoint()` et le solde courant de l'archivage (§2.5). Elle ne devra **pas** compter une seconde fois dans « Sorties saison ».
6. **Droit et audit** : la fonction du §2.7 et son action (PO-FA-21) pourront être réutilisées ou remplacées par la future ligne. Aucun droit lié à la ligne n'est ajouté par anticipation.

### 2.5 Partie B — conditions d'archivage et « solde courant »

**Définition du solde courant** : le **solde théorique de la saison en cours**, au sens exact de `theoreticalBalanceCents()` (`domain/rules/finance-rules.ts`) et du calcul figé de `record_treasury_checkpoint()` :

> solde d'ouverture de la saison en cours + versements de cotisation de la saison attribués au porteur − dépenses de la saison **payées par ce porteur** (`carrier_id` = porteur ; les avances de membres n'y figurent pas).

**L'archivage est refusé** dans trois cas :
1. **aucune saison en cours** ;
2. **solde d'ouverture de la saison en cours non saisi** pour ce porteur : le « 0 si absent » de la règle ne suffit pas ;
3. **solde courant non nul**.

Précisions :
- Le solde courant n'est pas le dernier montant compté : un point est un constat.
- Le calcul se fait **côté serveur**, dans la transaction de l'archivage, ligne du porteur verrouillée. Le client ne fournit jamais le solde.
- Le calcul SQL est le **miroir manuel** de la règle pure. Il est recommandé de le factoriser dans une fonction privée, par exemple `private.carrier_theoretical_balance_cents(carrier, season)`, partagée avec `record_treasury_checkpoint()`.
- **Conséquence signalée** : un porteur sans argent doit d'abord recevoir un solde d'ouverture, même 0, saisi par le Trésorier, avant que l'admin puisse l'archiver.
- Règle pure `carrierArchiveBlocker(...)` (nom indicatif) : elle renvoie `no-season`, `opening-missing`, `non-zero-balance` ou `null`. La base reste l'autorité.

### 2.6 Partie B — table `public.finance_carriers` et effets

| Élément | Changement |
|---|---|
| `archived_at` | **Nouvelle colonne** `timestamptz null`, **non accordée** en `update` direct. Le grant `update (label, detail, manager_user_id)` est inchangé |
| Archivage | Fonction `security definer` `archive_finance_carrier(p_id)`, commentée `'finance_carrier:archive'` : <br>• `private.is_admin()` sinon `42501` ; <br>• porteur introuvable ou déjà archivé : erreur dédiée ; <br>• l'un des trois cas du §2.5 : erreur dédiée qui **nomme la cause** ; <br>• sinon, `archived_at = now()` |
| Restauration | Fonction `security definer` `restore_finance_carrier(p_id)`, commentée `'finance_carrier:archive'` (PO-FA-06) : <br>• `private.is_admin()` ; <br>• porteur introuvable ou non archivé : erreur dédiée ; <br>• sinon, `archived_at = null` |
| `finance_carriers_select`, `finance_carriers_update_admin`, unicité `label_key` | Inchangées. Un porteur archivé reste renommable et réserve son libellé (PO-FA-11) |
| Suppression | Toujours **aucune** politique ni privilège `delete` |

**Invariant : un porteur archivé a toujours un solde courant nul.** La base refuse donc toute écriture qui le modifierait :

| Écriture | Règle ajoutée (commentée du nom de son action) |
|---|---|
| Insertion d'une dépense (`'expense:record'`) | `carrier_id` null **ou** porteur non archivé |
| Modification d'une dépense (`'expense:update'`) | `using` : l'ancien porteur est null ou non archivé ; `with check` : le nouveau porteur est null ou non archivé (PO-FA-13) |
| Suppression d'une dépense (`'expense:delete'`) | `using` : porteur null ou non archivé |
| Solde d'ouverture, saisie et correction | Porteur non archivé |
| Versement de cotisation (`membership_payments_insert_admin` / `_treasurer`, `'payment:record'`) | `carrier_id` null **ou** porteur non archivé |
| Nouveau point (`'treasury_checkpoint:record'`) | **Exactement une ligne par porteur non archivé**, chaque `carrier_id` reçu appartenant à cet ensemble |
| Correction ou suppression d'un point passé | Inchangées (O-FIE-UI-05) |

**Lectures** :
- `get_finance_carriers()` ne renvoie que les porteurs **actifs**.
- `get_finances_snapshot()` renvoie tous les porteurs, avec leur état.
- Dans « Par porteur », un porteur archivé n'apparaît que s'il a eu une activité dans la saison en cours. Il est alors marqué « Archivé » en texte, sans aucun contrôle ; sinon il est omis (PO-FA-14).
- Disponible et ventilation : formule inchangée. Un porteur archivé y contribue pour 0.

**Fraîcheur** : après un archivage ou une restauration, sont invalidées la racine de clé du backoffice, `queryKeys.financesRoot()` et la clé de `get_finance_carriers()`.

### 2.7 Partie A — marquer une avance remboursée depuis « À rembourser » (PO-FA-19, option (a))

- **Fonction** `security definer` étroite, nom indicatif `set_expense_reimbursement(p_expense_id uuid, p_reimbursed_on date, p_payment_method text)`, commentée du nom de son action (PO-FA-21) :
  - garde `private.has_role('treasurer')`, sinon `42501` ;
  - dépense introuvable, ou **dépense de porteur** (pas une avance) : erreur dédiée (`P0002` ou équivalent) ;
  - **toutes saisons** : aucune condition sur `season_id`. C'est la différence avec `expenses_update_treasurer` ;
  - **marquer** (`p_reimbursed_on` non null) : la date ne doit être ni dans le futur (`<= current_date`) ni antérieure à `spent_on`, et `p_payment_method` doit être l'une des cinq valeurs. Les deux colonnes sont alors posées ;
  - **annuler** (`p_reimbursed_on` null) : `reimbursed_on` et `payment_method` sont remis à `null`, et `p_payment_method` est ignoré ;
  - elle ne touche **aucune autre colonne** (montant, libellé, dates, catégorie, membre, auteur, saison).
- **Pas de privilège de table élargi** : la fonction est le seul chemin pour les saisons passées. Pour la saison en cours, l'assistant de correction (`'expense:update'`) reste disponible ; les deux chemins appliquent les mêmes règles pures (PO-FA-22).
- **Use case** `SetExpenseReimbursementUseCase` (nom indicatif) : `can()`, puis validations pures **avant tout appel réseau**, lecture de l'état **avant**, écriture, et enfin audit. **Sans changement, rien n'est écrit et aucun audit n'est émis.**
- **Accès** : depuis le bloc « À rembourser » (`outstanding_advances`), pour le Trésorier en vue Trésorier seulement. Le Dirigeant et l'admin voient le bloc **sans action**. L'**annulation** d'un remboursement n'est atteignable que pour une avance de la saison en cours, par l'assistant de correction : une avance remboursée d'une saison passée n'est plus listée (PO-FA-22).
- **Porteurs** : aucun effet sur un solde de porteur (PO-FA-18).

## 3. RBAC

### Matrice CDC

Aucune ligne de la matrice CDC ne couvre les dépenses ni la trésorerie (fondement : demande du Bureau, PO-FI-01). Lignes de rattachement :

| Permission (matrice CDC) | Trésorier | Dirigeant habilité | Administrateur | Usage ici |
|---|---|---|---|---|
| Gérer échéanciers et relances | ✅ | ❌ | ✅ (paramétrage) | Modèle de l'écriture « Trésorier seul », appliqué aussi au marquage de remboursement |
| Gérer comptes, rôles, paramétrage | ❌ | ❌ | ✅ | Partie B : l'archivage d'un porteur est du paramétrage |
| Voir les dossiers des autres membres | ❌ (financier seulement) | ✅ | ✅ | Partie A : le Trésorier reçoit l'annuaire des noms et le nom des créanciers, pour un usage financier. Sous réserve de PO-FA-05 |
| Voir le statut de cotisation | ✅ | ✅ | ✅ | Modèle de `'finances:read'` (inchangée) |
| Les cinq autres rôles | — | — | — | Aucun accès |

### Partie A — rôles

| Rôle | Accès |
|---|---|
| **Trésorier** (vue Trésorier active) | Saisit une avance et son état sous **`'expense:record'`**, les corrige sous **`'expense:update'`** (saison en cours), toutes deux inchangées. Marque une avance remboursée, ou annule ce marquage, depuis « À rembourser » sous la **nouvelle** action (ci-dessous), pour toute saison. Reçoit `advance_candidates` |
| **Dirigeant habilité** | Lecture seule : lignes « Avancé par {nom} » avec leur état, bloc « À rembourser » **sans action**. Ne reçoit pas `advance_candidates` |
| **Administrateur** | Lecture seule, comme le Dirigeant (PO-FI-08) |
| Autres rôles | Aucun accès |

### Entrées de matrice ajoutées

| Action (nom indicatif) | Rôles | Pourquoi une entrée `can()` | Miroir SQL (recopié à la main, commenté du nom de l'action) |
|---|---|---|---|
| `'expense_reimbursement:update'` | `['treasurer']` | `presentation/` décide **avant toute requête** s'il rend l'action de marquage dans « À rembourser ». Une politique ou fonction distincte appelle une action distincte (PO-FIE-01) | Garde `private.has_role('treasurer')` de `set_expense_reimbursement()` |
| `'finance_carrier:archive'` | `['admin']` | `presentation/` décide s'il rend « Archiver » / « Restaurer » | Garde `private.is_admin()` de `archive_finance_carrier()` **et** de `restore_finance_carrier()` |

- **Nommage proposé et signalé (PO-FA-21)** : `'expense_reimbursement:update'` nomme la ressource écrite (l'état de remboursement d'une dépense), selon la convention `<ressource>:<verbe>`. Il ne préempte pas le nom de la future ligne de remboursement, qui pourrait être par exemple `'member_reimbursement:record'`. Alternatives : `'expense:reimburse'`, ou ne pas créer d'action et passer par `'expense:update'` (mais celle-ci se limite à la saison en cours en SQL, ce qui donnerait une même action avec deux portées différentes : déconseillé).
- **Une seule action pour archiver et restaurer** (PO-FA-06), proposée et signalée.
- Rôles club-wide : **`can.ts` n'est pas modifié**. **Inchangées** : `'finances:read'`, `'expense:record'`, `'expense:update'`, `'expense:delete'`, `'finance_carrier:create'`, `'finance_carrier:update'`, `'backoffice:access'`, et toutes les autres. Les politiques SQL des trois actions de dépense sont recréées (§2.1, §2.6).
- Contrôles non autorisés **absents, jamais grisés**. Le verrou de vue `usePermission(action) && isTreasurerView` s'applique aussi à l'action de « À rembourser ».
- Compte Administrateur + Trésorier : il archive au backoffice et saisit sur mobile ; les deux surfaces restent séparées.

## 4. Données sensibles

| Nature | Concerné | Conséquence |
|---|---|---|
| **Financière** | **Oui** : avances, dette du club envers un membre, date et mode de remboursement, archivage des porteurs | Rétention : PO-FI-11 (non tranché). Une avance marquée remboursée ne débite aucun porteur, donc le théorique est faussé : PO-FA-18 |
| **Nominative** | **Oui, nouvelle exposition** : un **membre nommé** associé à un **montant que le club lui doit**, lu par le Trésorier, le Dirigeant habilité et l'administrateur. Le Trésorier reçoit aussi l'**annuaire de tous les comptes** (noms seuls). Les libellés des avances non remboursées des **saisons passées** deviennent visibles | Nom affichable seul, aucune coordonnée, uniquement via `get_finances_snapshot()`. Jamais d'élargissement de `users_select_*` (AC-FI-06). Annuaire réservé au rôle `treasurer`. Information du membre, base légale, durée : **PO-FA-05** |
| **Purge d'un compte** | **Oui** | La FK `advanced_by_user_id` en `on delete restrict` bloque la suppression d'un compte qui a avancé de l'argent (PO-FA-05) |
| **Texte libre** | Libellé de dépense, inchangé | PO-FI-12 |
| **Santé** | Non | — |
| **Audit** | **Oui** | Voir ci-dessous |

### Audit

**Codes existants, `metadata` étendue :**
- `expense.recorded` (aujourd'hui `amountCents`, `categoryId`) : ajouter **`advancedByUserId`**, **`reimbursedOn`** et **`paymentMethod`** (chacun valeur ou `null`). L'ajout de `carrierId` est proposé, sans être exigé.
- `expense.updated` et `expense.deleted` : les champs structurés de `before` / `after` gagnent **`advancedByUserId`** et **`reimbursedOn`**. `carrierId` et `paymentMethod` peuvent valoir `null`.

**Nouveau code proposé (PO-FA-21) : `expense.reimbursement_updated`**, émis par `SetExpenseReimbursementUseCase` :
- cible : `target_type` = `expense`, `target_id` = l'avance ;
- `metadata` : `before` / `after` de `reimbursedOn` et `paymentMethod`, avec `advancedByUserId`, `amountCents` et `seasonId` rappelés ;
- **jamais** de nom ni de libellé ;
- **justification** :
  - c'est une écriture distincte (une autre action, d'autres portées), avec un code par action, comme `expense:update` / `expense.updated` ;
  - cette « modification paiement » se repère directement dans le journal (CDC §11.3) ;
  - l'alternative est de réutiliser `expense.updated` avec la même `metadata` et un marqueur `source: 'reimbursement'`. Elle est recevable.
- **Miroir** : ajouté à `AUDIT_ACTIONS` (avec la mention « wired: … »), à `audit_log_action_check` et à `audit-action-labels.ts`. **`record_audit_log_entry` est élargie** pour admettre le Trésorier sur ce code (inutile si l'alternative est retenue).

**Partie B : deux nouveaux codes**, `finance_carrier.archived` et `finance_carrier.restored` :
- émis par les use cases d'archivage et de restauration ;
- `metadata` : `label` et `kind` ; jamais le détail ni le nom du responsable ;
- ajoutés aux trois mêmes endroits. `record_audit_log_entry` n'est pas modifiée pour eux (l'admin peut déjà tout écrire).

Dans tous les cas : un refus ou une absence de changement ne produit aucune entrée. **Faille héritée** : un échec d'audit n'est qu'un `console.error` (PO-TR-19, PO-FIE-09).

## 5. Critères d'acceptation

Préfixe **`AC-FA-`**. Aucune numérotation CDC (AC-xx) n'existe pour ce domaine. AC-02 (CDC §17.2) s'applique à AC-FA-01 à 04, AC-FA-15 à 17 et AC-FA-32.

### Partie A — Dépenses avancées par un membre

**Base et droits**

| Réf. | Critère |
|---|---|
| AC-FA-01 | **Contre la base**, sont refusés, à l'insertion comme à la modification : <br>• une dépense avec `carrier_id` **et** `advanced_by_user_id`, ou sans aucun des deux ; <br>• une dépense de porteur avec `reimbursed_on`, ou sans `payment_method` ; <br>• une avance à rembourser **avec** `payment_method` ; <br>• une avance remboursée **sans** `payment_method` ; <br>• un `reimbursed_on` antérieur à `spent_on` ou postérieur à `current_date`. <br>Les dépenses existantes restent valides sans rattrapage |
| AC-FA-02 | **Contre la base**, avec un jeton Trésorier : `advanced_by_user_id` et `reimbursed_on` sont modifiables par `update` sur une dépense de la saison en cours ; `recorded_by`, `recorded_at` et `season_id` ne le sont toujours pas. Avec un jeton Dirigeant habilité, administrateur sans `treasurer` ou de tout autre rôle, toute insertion ou modification est refusée |
| AC-FA-03 | Les trois politiques de dépense recréées portent en commentaire le nom de leur action. Les seules entrées de matrice ajoutées sont celles de AC-FA-13 et AC-FA-32 |
| AC-FA-04 | Le Trésorier et le Dirigeant ne lisent toujours `users` que pour leur propre ligne, et un nom de membre ne leur parvient que par `get_finances_snapshot()`. Vérifié contre la base : `advance_candidates` est vide pour un jeton Dirigeant ou administrateur sans `treasurer`, et contient tous les comptes pour un jeton `treasurer` |

**Saisie et correction (étape Paiement)**

| Réf. | Critère |
|---|---|
| AC-FA-05 | À l'étape Paiement, « Avancé par un membre ? » vaut **Non** par défaut, avec les porteurs **actifs** et le mode de paiement, tous deux obligatoires. Sur **Oui** : <br>• les puces de porteur ne sont pas rendues ; <br>• un **sélecteur de compte avec recherche** est obligatoire (la saisie filtre, sans tenir compte de la casse ni des accents ; seul un compte de la liste est retenu, jamais du texte libre) ; <br>• l'état « À rembourser » (par défaut) ou « Remboursé » est proposé ; <br>• « À rembourser » ne demande **ni mode de paiement ni date** ; <br>• « Remboursé » rend obligatoires une **date de remboursement** (par défaut aujourd'hui, ni future ni antérieure à la date de la dépense) et le **mode de paiement**. <br>« Suivant » reste inactif tant que l'étape est invalide. Les validations sont des règles pures appelées par les use cases avant tout appel réseau |
| AC-FA-06 | En correction (saison en cours), sont permis et comptent comme un changement : <br>• passer de porteur à membre, ou de membre à porteur ; <br>• changer de membre ; <br>• passer de « À rembourser » à « Remboursé », ou l'inverse ; <br>• changer la date ou le mode du remboursement. <br>Passer à un porteur efface l'état de remboursement. Repasser à « À rembourser » efface la date et le mode. Une correction sans changement n'écrit rien et n'émet aucun audit (AC-FIE-05) |
| AC-FA-07 | Après l'enregistrement d'une avance, sans rechargement manuel : <br>• elle apparaît dans la liste avec « Avancé par {nom} » et son état ; <br>• « Dépenses saison », « Ce mois », la ventilation et « Sorties saison » l'incluent ; <br>• « À rembourser » est à jour. <br>**Aucun** solde de porteur ne change, ni le disponible, ni la ventilation Banque / Espèces, même quand l'avance est enregistrée ou passée à « Remboursé » (PO-FA-18) |

**Lecture**

| Réf. | Critère |
|---|---|
| AC-FA-08 | Le solde théorique d'un porteur, le disponible, la ventilation et le **théorique figé** d'un nouveau point ignorent les avances, remboursées ou non. Testé par Vitest et contre la base (`record_treasury_checkpoint()`) |
| AC-FA-09 | « À rembourser » liste chaque membre dont le reste dû est > 0 (avances **non remboursées**, **toutes saisons**), avec son nom affichable et son montant en texte, du plus grand au plus petit, plus le total général. Le bloc est **absent** si rien n'est dû. Il est identique pour le Trésorier, le Dirigeant et l'administrateur, et affiché même sans saison en cours. Une **seule** règle pure calcule le reste dû |
| AC-FA-10 | Le filtre par catégorie (AC-FI-08) traite une avance comme toute autre dépense. Il n'existe aucun filtre par payeur ni par état de remboursement |

**Audit**

| Réf. | Critère |
|---|---|
| AC-FA-11 | **Vérifié contre la base** : <br>• la `metadata` d'`expense.recorded` contient `advancedByUserId`, `reimbursedOn` et `paymentMethod` ; <br>• `before` / `after` d'`expense.updated`, et `before` d'`expense.deleted`, contiennent `advancedByUserId` et `reimbursedOn`. <br>**Jamais** de nom de membre ni de libellé |

**Extensibilité**

| Réf. | Critère |
|---|---|
| AC-FA-12 | Aucune table de remboursements, aucune écriture sur un porteur au remboursement, aucun reste dû stocké. Aucun trigger ni aucune contrainte n'empêche une future table de référencer une dépense ou un membre, ni de renseigner `reimbursed_on` et `payment_method` d'une avance |

**Marquer une avance remboursée depuis « À rembourser » (§2.7)**

| Réf. | Critère |
|---|---|
| AC-FA-31 | `set_expense_reimbursement()` marque une avance de **n'importe quelle saison** comme remboursée (date et mode requis, date ni future ni antérieure à la dépense), ou annule ce marquage (date et mode remis à `null`). **Vérifié contre la base** : <br>• aucune autre colonne n'est modifiée ; <br>• une dépense de porteur est refusée ; <br>• une dépense introuvable est refusée ; <br>• une date ou un mode invalide est refusé |
| AC-FA-32 | `'expense_reimbursement:update'` (nom selon PO-FA-21) vaut exactement `['treasurer']`, et la fonction porte ce nom en commentaire. **Contre la base**, un jeton Dirigeant habilité, administrateur sans `treasurer` ou de tout autre rôle obtient `42501`. Test `can()` : `treasurer` → vrai ; `authorized-officer`, `admin`, `coach` → faux |
| AC-FA-33 | Le bloc « À rembourser » permet au Trésorier en vue Trésorier (booléen du ViewModel issu de `can()` et de `isTreasurerView`) de marquer remboursée une avance listée : choix de l'avance, date (aujourd'hui par défaut), mode. L'avance peut être d'une saison passée. Pour le Dirigeant, l'administrateur et le Trésorier en vue Dirigeant, l'action est **absente**, jamais grisée |
| AC-FA-34 | Après un marquage, sans rechargement manuel : l'avance quitte « À rembourser », les totaux par membre et le total général sont à jour. Si l'avance est de la saison en cours, sa ligne affiche l'état « Remboursé ». Aucun solde de porteur ne change |
| AC-FA-35 | `SetExpenseReimbursementUseCase` : <br>• refuse sans droit ; <br>• valide **avant tout appel réseau** ; <br>• lit l'état avant ; <br>• sans changement, n'écrit rien et n'émet aucun audit ; <br>• émet sinon **une** entrée (`expense.reimbursement_updated`, ou `expense.updated` avec `source: 'reimbursement'` selon PO-FA-21), **vérifiée contre la base**, avec `before` / `after` de `reimbursedOn` et `paymentMethod`, sans nom ni libellé. Le code, son libellé et `audit_log_action_check` sont modifiés dans le même changement, et `record_audit_log_entry` admet le Trésorier pour ce code |
| AC-FA-36 | Une erreur serveur laisse l'action ouverte, avec ses valeurs et un message en français. Un double tap n'écrit pas deux fois |

### Partie B — Archivage des porteurs

**Base et droits**

| Réf. | Critère |
|---|---|
| AC-FA-13 | `'finance_carrier:archive'` est ajoutée à `domain/policies/actions.ts` et vaut exactement `['admin']` (avec `'finance_carrier:restore'` à `['admin']` si PO-FA-06 le retient). `can.ts` est inchangé. Test `can()` : `admin` → vrai ; `treasurer`, `authorized-officer`, `coach` → faux |
| AC-FA-14 | La migration ajoute `archived_at`, `archive_finance_carrier()` et `restore_finance_carrier()` (`security definer`, garde `private.is_admin()`, chacune commentée du nom de son action). `archived_at` n'est pas dans le grant `update`. Toujours **aucune** politique ni aucun privilège `delete`. `finance_carriers_select` est inchangée |
| AC-FA-15 | **Contre la base**, avec un jeton non admin, les deux fonctions lèvent `42501`. Un `update` direct de `archived_at` est refusé, même pour un administrateur |
| AC-FA-16 | **Contre la base**, l'archivage est refusé, sans rien écrire, dans trois cas : <br>• aucune saison en cours ; <br>• solde d'ouverture de la saison en cours **non saisi** ; <br>• solde courant (§2.5) non nul. <br>Cas de solde testés : solde d'ouverture seul ; versement attribué seul ; dépense seule ; combinaison qui s'annule avec un solde d'ouverture saisi (**acceptée**) ; avance d'un membre (sans effet). L'erreur indique la cause. Archiver un porteur déjà archivé, ou restaurer un porteur actif, est refusé |
| AC-FA-17 | **Contre la base**, pour un porteur archivé, sont refusés : <br>• une nouvelle dépense sur lui ; <br>• la modification d'une dépense vers lui ou depuis lui ; <br>• la suppression d'une de ses dépenses ; <br>• la saisie ou la correction de son solde d'ouverture ; <br>• un versement qui lui est attribué |

**Points de trésorerie**

| Réf. | Critère |
|---|---|
| AC-FA-18 | `record_treasury_checkpoint()` exige **exactement une ligne par porteur non archivé**, et refuse une ligne pour un porteur archivé ou inconnu, même si le nombre de lignes coïncide. La feuille de point ne présente que les porteurs actifs. Les points passés sont inchangés et restent corrigeables (AC-FIE-11/12) |

**Affichage**

| Réf. | Critère |
|---|---|
| AC-FA-19 | Backoffice « Porteurs » : les porteurs archivés restent listés avec la mention **« Archivé »** en texte. Une ligne active porte « Archiver », une ligne archivée « Restaurer ». Ces contrôles ne sont rendus que si le booléen du ViewModel issu de `can()` est vrai : **absents, jamais grisés**. Aucun contrôle de suppression |
| AC-FA-20 | « Archiver » demande une confirmation explicite. Un refus affiche en français la cause (pas de saison en cours, solde d'ouverture non saisi, solde non nul), jamais un texte Postgres brut. Après un succès, le tableau est à jour sans rechargement ; `/finances` et les formulaires de versement le sont à leur lecture suivante |
| AC-FA-21 | Mobile : un porteur archivé n'apparaît pas à l'étape Paiement, ni dans le champ « Porteur » des versements, ni dans la feuille de point. Il **continue d'apparaître** dans les dépenses, l'historique des points et les lignes « Compté … » passés. Dans « Par porteur », il suit PO-FA-14 |
| AC-FA-22 | Un porteur restauré réapparaît partout, et le point suivant exige de nouveau une ligne pour lui. Son historique est intact |

**Audit**

| Réf. | Critère |
|---|---|
| AC-FA-23 | Chaque archivage ou restauration réussi produit **une** entrée, **vérifiée contre la base** : `finance_carrier.archived` / `finance_carrier.restored`, émise par le use case, ciblant le porteur, avec `label` et `kind` seulement. Un refus ne produit aucune entrée. `AUDIT_ACTIONS`, `audit_log_action_check` et `audit-action-labels.ts` sont modifiés dans le même changement |

### Assistant de saisie à quatre étapes (présentation, D-A7)

| Réf. | Critère |
|---|---|
| AC-FA-27 | La saisie **et** la correction d'une dépense passent par le même assistant : **Montant** (montant, libellé, date) → **Catégorie** → **Paiement** → **Récap**. L'étape courante est indiquée **en texte**. « Suivant » n'est actif que si l'étape est valide selon les règles pures existantes. « Retour » revient en arrière **sans perdre de valeur**. « Annuler » ferme sans écrire |
| AC-FA-28 | Le **Récap** reprend le montant, le libellé, la date, la catégorie et le payeur : porteur et mode, ou membre et état, avec la date et le mode s'il est remboursé. Il porte le bouton d'enregistrement. En correction, ce bouton reste inactif tant que rien n'a changé (AC-FIE-05). Une erreur serveur laisse l'assistant ouvert sur le Récap, valeurs conservées, avec un message en français. Un double tap n'écrit pas deux fois |
| AC-FA-29 | En correction, « Supprimer » et sa confirmation restent disponibles (AC-FIE-07), à la place fixée par designer-agent, et seulement si `canDeleteExpense` |
| AC-FA-30 | La barre « Retour » / « Suivant » (ou bouton d'enregistrement) est ancrée `sticky bottom-0`, sur fond opaque. Cibles ≥ `h-11`, en particulier : indicateurs d'étape s'ils sont interactifs, puces Non / Oui, « À rembourser » / « Remboursé », sélecteur et ses résultats, champ de date. `min-w-0` sur chaque élément des paires côte à côte (« Retour » / action principale, Libellé / Date). Vérifié sur un viewport réel de 360 px |

### Transverse

| Réf. | Critère |
|---|---|
| AC-FA-24 | Tests Vitest, en priorité : <br>• `can()` pour les deux nouvelles actions ; <br>• règles pures : payeur exactement un ; état de remboursement réservé aux avances, effacé au passage à un porteur ; date de remboursement bornée ; mode requis selon le payeur et l'état ; `hasExpenseChanged` étendu ; `theoreticalBalanceCents` ignorant les avances ; reste dû par membre ; filtre des porteurs actifs ; `carrierArchiveBlocker` ; <br>• use cases : refus sans droit, aucune écriture si invalide, audit sans nom ni libellé, aucun audit sans changement ; <br>• mappers : dépense de porteur, avance à rembourser, avance remboursée |
| AC-FA-25 | Aucun import de `data/` depuis `presentation/`. Mapper obligatoire entre DTO et entité. Clés de requête dans `query-keys.ts`. **Aucun nom de personne ni de banque** dans le code, les tests ou les fixtures (`CLAUDE.md` §9) |
| AC-FA-26 | Non-régression : lecture Finances (AC-FI), correction des points, des soldes d'ouverture et des catégories (AC-FIE), création et modification des porteurs (AC-FC), `/dues`, `/admin/memberships`. La migration est **proposée à l'application**, jamais appliquée en silence |

### Critères existants amendés (amendements datés à reporter dans les specs concernées, non faits ici)

**`specs/mob-treasurer-finances.md`**

| Réf. | Amendement |
|---|---|
| **AC-FI-04** | Ajouter `'expense_reimbursement:update'` (`['treasurer']`) aux entrées Finances |
| **AC-FI-06** | Étendu : les noms des membres ayant avancé une dépense, et l'annuaire du sélecteur (rôle `treasurer` seulement), ne sont obtenus que par `get_finances_snapshot()` |
| **AC-FI-08** | **Inchangé**, précisé : une avance est filtrée par catégorie comme les autres |
| **AC-FI-09** | Pour une avance, le porteur est remplacé par « Avancé par {nom} » avec l'état de remboursement, et le mode de paiement n'est affiché que si l'avance est remboursée. Le libellé d'un porteur archivé reste affiché |
| **AC-FI-10** | La validation se fait **par étape** de l'assistant, et l'enregistrement au Récap (AC-FA-27/28). Le **payeur** est obligatoire : un porteur actif ou un compte. Le **mode de paiement** est obligatoire pour une dépense de porteur ou une avance remboursée, et absent pour une avance à rembourser (AC-FA-05). Les cinq valeurs sont inchangées |
| **AC-FI-11** | « solde du porteur concerné » devient « solde du porteur concerné **ou**, pour une avance, bloc « À rembourser » » |
| **AC-FI-12** | Valable dans l'assistant (AC-FA-28) |
| **AC-FI-13** | La création de catégorie se fait à l'étape **Catégorie** ; comportement inchangé |
| **AC-FI-14** | Formule inchangée ; les avances n'y entrent pas ; un porteur archivé y contribue pour 0 |
| **AC-FI-15** | « Sorties saison » inclut les avances, remboursées ou non |
| **AC-FI-16** | Les soldes de « Par porteur » ignorent les avances ; un porteur archivé suit PO-FA-14 |
| **AC-FI-18 / AC-FI-19** | « porteur actif » = **non archivé** ; une ligne par porteur non archivé |
| **AC-FI-21** | `metadata` d'`expense.recorded` étendue (AC-FA-11). Nouveau code `expense.reimbursement_updated` (AC-FA-35, selon PO-FA-21) |
| **AC-FI-23** | La barre ancrée de la feuille de dépense porte « Retour » / « Suivant », puis « Retour » / enregistrement (AC-FA-30) |
| **AC-FI-25** | Nouveau booléen (nom indicatif) `canUpdateReimbursement` pour l'action de « À rembourser » |
| **AC-FI-29** | « Solde d'ouverture non saisi » et « Saisir » : porteurs **actifs** seulement |
| **AC-FI-31** | Le champ « Porteur » des versements ne propose que les porteurs **actifs** |
| **AC-FI-34** | `carrier_id` et `payment_method` deviennent nullables sous les contraintes du §2.1 ; `advanced_by_user_id` est en `on delete restrict` ; `reimbursed_on` est un état, pas un solde. « Aucun solde stocké » est inchangé |
| **UI design §4** | La feuille à défilement unique est **remplacée** par l'assistant, à réécrire par designer-agent |

**`specs/mob-treasurer-finances-edit.md`**

| Réf. | Amendement |
|---|---|
| **AC-FIE-01** | En plus des sept actions, `'expense_reimbursement:update'` (`['treasurer']`) |
| **AC-FIE-04** | Ajouter : <br>• une dépense d'un porteur archivé n'est ni modifiable ni supprimable, et le solde d'ouverture d'un porteur archivé n'est pas corrigeable (AC-FA-17) ; <br>• **exception** à « saison en cours seulement » : l'état de remboursement d'une avance (`reimbursed_on`, `payment_method`) est modifiable pour toute saison, par la seule fonction de AC-FA-31 |
| **AC-FIE-05** | La feuille de correction est l'**assistant** pré-rempli, avec le même choix de payeur et le même état de remboursement (AC-FA-06/27/28) |
| **AC-FIE-06** | « ancien et nouveau porteur » devient « ancien et nouveau payeur » : soldes des porteurs concernés et/ou « À rembourser » |
| **AC-FIE-07** | Principe inchangé, appliqué à l'assistant (AC-FA-28/29) |
| **AC-FIE-10** | Limité aux porteurs actifs |
| **AC-FIE-14** | `before` / `after` d'une dépense gagnent `advancedByUserId` et `reimbursedOn` (AC-FA-11) |
| **AC-FIE-16** | Cibles, paires côte à côte et barre ancrée selon AC-FA-30 ; booléen `canUpdateReimbursement` ajouté |
| **UI design §2/§3** | À reprendre par designer-agent pour l'assistant |

**`specs/web-finance-carriers.md`**

| Réf. | Amendement |
|---|---|
| **PO-FC-02** | **Levé** par la partie B |
| **§1 « Au périmètre » (1)** | « tous, aucun n'étant archivable » devient « tous, archivés compris, marqués » |
| **AC-FC-02** | Ajouter `archived_at` (non accordée en `update`) et les deux fonctions. Toujours aucun `delete` |
| **AC-FC-10** | « Aucun contrôle de suppression **ni d'archivage** » devient « Aucun contrôle de suppression. Archivage et restauration selon AC-FA-19/20 » |
| **AC-FC-14** | La ligne du point suivant n'est exigée que si le porteur est actif (AC-FA-18) |
| **UI design** | « Aucune colonne Statut » et « Jamais de suppression ni d'archivage » sont à amender par designer-agent |

## 6. Points ouverts

| Réf. | Question | Défaut retenu (implémenter autour) | Pour qui | Bloquant ? |
|---|---|---|---|---|
| PO-FA-01/02/03 | Portée de la dette, population et canal du sélecteur | **TRANCHÉS** (second lot) | — | — |
| PO-FA-04 | Mode de paiement d'une avance | **TRANCHÉ, interprétation à confirmer** : le mode du **remboursement**, absent quand l'avance est à rembourser, obligatoire quand elle est remboursée (§2.1). Si la développeuse voulait plutôt dire « le mode d'achat, demandé seulement au remboursement », la contrainte est la même ; seuls le sens de la colonne et le libellé affiché changent | Développeuse | Non |
| PO-FA-05 | **RGPD** : membre nommé comme créancier du club ; annuaire de tous les comptes remis au Trésorier ; libellés des avances passées visibles ; purge d'un compte bloquée par la FK | Nom affichable seul ; aucune information automatique ; FK `restrict` | Référent RGPD | Non ; **avant la mise en production** |
| PO-FA-06 | Une action pour archiver et restaurer, ou deux ? | Une seule | Développeuse | Non |
| PO-FA-07/08 | Conditions d'archivage | **TRANCHÉS** (second lot, §2.5) | — | — |
| PO-FA-09 | **Ligne de remboursement (future)** : granularité, remboursements partiels, « Sorties saison », droit et audit | Rien n'est construit (§2.4) | Développeuse / Trésorier | Non (feature future) |
| PO-FA-10 | Le membre voit-il ce que le club lui doit ? | Non | Développeuse / Bureau | Non |
| PO-FA-11 | Porteur archivé renommable et réservant son libellé ? | Oui aux deux | Développeuse | Non |
| PO-FA-12 | **Lien artifact** des maquettes (déjà demandé une fois) | Ligne `instantané seul` du §0 | Développeuse | Non |
| PO-FA-13 | Dépense d'un porteur archivé entièrement verrouillée ? | Oui ; la ligne n'ouvre pas l'assistant de correction dans ce cas | Développeuse / Trésorier | Non |
| PO-FA-14 | Porteur archivé dans « Par porteur » ? | S'il a une activité dans la saison en cours, marqué « Archivé », sans contrôle ; sinon omis | Développeuse / designer-agent | Non |
| PO-FA-15 | Bouton `+` conditionné à « au moins un porteur » ? | Lu comme « au moins un porteur **actif** » ; idem pour « Faire un point » | Développeuse | Non |
| PO-FA-16 | Le Trésorier peut-il se désigner comme membre ayant avancé, puis se marquer remboursé ? | Oui ; l'audit trace l'auteur et le membre | Trésorier / Bureau | Non |
| PO-FA-17 | Mention de réconciliation (« dont {montant} avancés par des membres ») ? | Non | Développeuse / designer-agent | Non |
| PO-FA-18 | **Une avance marquée « Remboursé » n'enregistre aucun mouvement de porteur**, alors que l'argent est réellement sorti d'un porteur au remboursement. Le théorique de ce porteur est **surévalué** du montant, et le prochain point montrera un écart inexpliqué. Le mode de paiement enregistré ne dit pas de quel porteur | **OUVERT, non résolu** (décision de la développeuse). À traiter avec la ligne de remboursement (§2.4) ou par une autre voie | Développeuse / Trésorier | Non pour construire ; **à rouvrir avant la mise en production** |
| PO-FA-19 | Avances des saisons passées | **TRANCHÉ, option (a)** (§2.7) | — | — |
| PO-FA-20 | Date de remboursement | **TRANCHÉ** : saisie, aujourd'hui par défaut, ni future ni antérieure à la dépense | — | — |
| PO-FA-21 | **Nom de l'action et code d'audit** du marquage | `'expense_reimbursement:update'` (`['treasurer']`) et code `expense.reimbursement_updated`. Alternatives : `'expense:reimburse'` ; réutiliser `expense.updated` avec `source: 'reimbursement'` (sans élargir `record_audit_log_entry`) | Développeuse | Non ; à confirmer avant d'écrire la migration |
| PO-FA-22 | **Deux chemins vers le même état** : l'assistant de correction (saison en cours) et l'action de « À rembourser » (toutes saisons). Annuler le remboursement d'une avance d'une **saison passée** n'est atteignable par aucun des deux (elle n'est plus listée) | Les deux chemins sont conservés, avec les mêmes règles pures et le même audit selon PO-FA-21. Pas d'annulation pour les saisons passées dans cette passe | Développeuse | Non |

**Points reconduits, non rouverts** : PO-FI-08, PO-FI-11, PO-FI-12, PO-FIE-03, PO-FC-01, PO-FC-03, PO-TR-19 / PO-FIE-09, O-FI-UI-07.

## Transmission

**Prêt pour transmission à designer-agent : OUI. Aucun point ouvert bloquant.** PO-FA-04 et PO-FA-21 sont à confirmer, mais ont un défaut retenu qui ne change ni la mise en page ni le schéma. PO-FA-18 est à rouvrir avant la mise en production.

À concevoir :
- **Assistant à quatre étapes**, en saisie et en correction (`docs/designs/finances/advanced_by_member/`, `instantané seul`). Trois écarts par rapport à la maquette :
  - **sélecteur de compte avec recherche** à la place du texte libre ;
  - sur « Remboursé », **champ de date** (aujourd'hui par défaut) et **puces de mode de paiement** ;
  - en correction : pré-remplissage, inactivité tant que rien ne change, place de « Supprimer » et de sa confirmation.
- Mention « Avancé par {nom} » et état de remboursement sur les lignes de dépense, sans mode pour une avance à rembourser.
- **Bloc « À rembourser »** avec l'action de marquage du Trésorier (choix de l'avance, y compris d'une saison passée ; date ; mode). Lecture seule pour les autres rôles.
- Porteur archivé dans « Par porteur » (PO-FA-14) ; dépense verrouillée d'un porteur archivé (PO-FA-13).
- **Backoffice « Porteurs »** : mention « Archivé », « Archiver » / « Restaurer », confirmation, un message de refus pour chacune des trois causes. Amender la section « UI design » de `web-finance-carriers`.
- Réécrire « UI design » §4 de `mob-treasurer-finances` et §2/§3 de `mob-treasurer-finances-edit` pour l'assistant.

## UI design

> Rédigé par designer-agent le 2026-10-07 (refonte, remplace la première version). **Aucun point bloquant.** Les droits ne sont pas redéfinis : tout renvoie au §3. Booléens du ViewModel (noms indicatifs) : `canRecordExpense`, `canUpdateExpense`, `canDeleteExpense` (existants), **`canUpdateReimbursement`** (`'expense_reimbursement:update'`), **`canArchive`** (`'finance_carrier:archive'`), chacun valant `usePermission(action) && isTreasurerView` côté mobile. Contrôles non autorisés **absents, jamais grisés** (les boutons « Suivant » / « Enregistrer » inactifs pour cause de formulaire invalide sont des états de validité, pas des contrôles de droit, comme aujourd'hui).
>
> **Références visuelles.** Registre `DESIGN_LINKS.md` §4 : pas de ligne, ligne `instantané seul` pré-rédigée au §0 du spec (à recopier par la développeuse ; je n'écris que dans `specs/`). Maquettes lues : `docs/designs/finances/advanced_by_member/[v1] [Trésorier] Mob - add expense {1..5}.png` (1 = Montant, 2 = Catégorie, 3 = Paiement « Non », 4 = Paiement « Oui », 5 = Récap). Autres références : `docs/designs/finances/[v1] [Trésorier] Mob - Finances-2.png` (onglet Trésorerie), `Finances-7.png` (liste des dépenses), `docs/designs/desktop/membership/` et `desktop/seasons/` (gabarit des tableaux backoffice). **Ce qui n'a aucune maquette** (correction, bloc « À rembourser » et son action, partie B) est conçu par composition de patrons existants ; aucun patron visuel inédit, donc **pas de demande de prototype**. Code à ouvrir : `features/finances/components/{ExpenseSheet,FinanceSheet,ChoiceChips,AmountField,CategoryEditRow,ExpenseLine,CarrierRow,TreasuryTab}.tsx`, `features/backoffice/finance-carriers/` et `features/backoffice/localizations/components/{TrainingLocationTable,ArchiveTrainingLocationDialog,TrainingLocationArchivedBadge}.tsx`.

### Écarts avec la maquette (la spec prime, dit explicitement)

| Maquette | Décision |
|---|---|
| Export 4 : champ membre en **texte libre** (« Nom du membre ») | **Remplacé** par un sélecteur de compte avec recherche, choix obligatoire dans la liste (D-A6, AC-FA-05) |
| Export 4 : « À rembourser » / « Remboursé » seuls, sans autre champ | « Remboursé » **ajoute** une date de remboursement (aujourd'hui par défaut) et les puces de mode de paiement (PO-FA-04, PO-FA-20) |
| Exports 4 : puces d'état sans légende | Une légende est ajoutée (accessibilité, `fieldset`/`legend` comme `ChoiceChips`) |
| Export 1 : poignée de tirage en haut de la feuille | **Reprise, décorative** : pas de geste de tirage, la fermeture reste « Annuler » ; l'appui hors zone reste bloqué si le formulaire est modifié (déroge à O-FI-UI-07 « pas de poignée », la maquette prime sur ce point) |
| Boutons principaux **rouges** (`bg-coach-red`), « Retour » contour clair | **Repris** pour l'assistant et pour la feuille « Marquer remboursée ». Les feuilles « Point de trésorerie » et « Solde d'ouverture » gardent leur bouton vert (UI-FA-01) |
| Export 5 : filet sous la dernière ligne du Récap | Non reproduit (pas de filet après la dernière ligne) |
| Export 1 : Libellé plus large que Date | Repris (voir A1) ; le défaut actuel `grid-cols-2` à parts égales n'est pas conservé |
| Maquette sans état de correction, sans suppression, sans bloc « À rembourser » | Conçus ci-dessous |

### Partie A, mobile : où ça vit

Écran `/finances` (sous-écran de **Dashboard**, barre basse inchangée à 4 entrées). **Aucune route ni onglet nouveaux.** Quatre points d'impact : l'assistant de dépense (remplace la feuille à défilement unique, en saisie et en correction), la ligne de dépense de l'onglet Dépenses, le bloc « À rembourser » (onglet Trésorerie, et sous le message d'état sans saison), la feuille « Marquer remboursée ».

### A1. Assistant de dépense : cadre commun (saisie et correction)

Même `FinanceSheet` (feuille basse `max-h-[90dvh]`, corps défilant, barre `sticky bottom-0` opaque), enrichi, plus un composant d'étapes. Aucune logique dans le composant : le ViewModel dérive la validité de chaque étape des règles pures existantes et expose `step`, `canGoNext`, `canSubmit`, etc.

- **Poignée** décorative centrée en haut (voir « Écarts »). **Titre** « Nouvelle dépense » / « Modifier la dépense » à gauche, **« Annuler »** en haut à droite (`h-11`, comme aujourd'hui). La ligne de description « Saison … » est conservée (lecture d'écran et repère).
- **En-tête d'étapes « en onglets » de texte** (maquette) : « Montant · Catégorie · Paiement · Récap », sous le titre, répartis sur la largeur (`flex`, chaque étiquette `flex-1 min-w-0`, centrage à gauche comme la maquette). État courant en **gras blanc** (`aria-current="step"`), étapes déjà atteintes en blanc atténué, étapes à venir plus atténuées : l'état n'est **pas** porté par la couleur seule (graisse + `aria-current` + texte sr-only « Étape 3 sur 4 »).
  - **Interactivité** (AC-FA-30) : chaque étiquette est un `button` **`h-11`**. Elle est active pour revenir à une étape **déjà atteinte** et, en correction, pour atteindre toute étape ; on ne peut **pas** sauter en avant au-delà de la première étape invalide. Les étapes non atteignables sont rendues comme texte inerte (pas de focus), sans aspect de bouton.
- **Barre ancrée** (`sticky bottom-0`, fond opaque, filet haut) : deux boutons `h-12` côte à côte, `gap-3`, **`min-w-0` sur chacun** : « **Retour** » (contour clair, largeur de son contenu, `shrink-0`) et l'action principale `flex-1` (**rouge** `bg-coach-red` quand active ; **gris sombre** `bg-white/10` texte atténué quand inactive, comme la maquette). **Étape 1 : pas de « Retour »**, « Suivant » pleine largeur (maquette 1). Étapes 1 à 3 : « Suivant ». Étape 4 : **« Enregistrer la dépense »** (saisie) / **« Enregistrer les modifications »** (correction). « Retour » ne perd aucune valeur (AC-FA-27).
- **Pendant l'envoi** : « Enregistrement… », les deux boutons et l'en-tête d'étapes désactivés (pas de double écriture, AC-FA-28). **Erreur serveur** : l'assistant reste ouvert **sur le Récap**, valeurs conservées, message français dans un `Alert` destructif **au-dessus de la barre** (patron existant).
- **Fermeture** : « Annuler » ferme sans écrire. Si le formulaire a été modifié, l'appui hors zone ne ferme pas (inchangé).
- **Défilement** : le corps défile, l'en-tête d'étapes reste **visible** (il est dans la partie fixe sous le titre, pas dans le corps défilant). Avec le clavier ouvert, le champ actif reste visible (le corps est `overflow-y-auto`).

### A2. Les quatre étapes

**Étape 1, Montant** (maquette 1). Montant (`AmountField` taille large : gros chiffre, « € » à droite, filet dessous), puis **Libellé / Date côte à côte** : grille `grid-cols-5 gap-3`, Libellé `col-span-3`, Date `col-span-2`, **`min-w-0` sur chaque élément**, champs `h-11 rounded-xl`, étiquettes en majuscules espacées comme aujourd'hui. À **360 px réels** la colonne Date n'a qu'environ 120 px : vérifier que la date native reste lisible ; sinon repli en pile (Libellé puis Date pleine largeur), jamais de chevauchement. Message d'erreur de date sous la paire (`-mt-3 text-xs text-red-300`, inchangé). **Valide** quand montant > 0, libellé non vide, date dans les bornes de la saison (règles existantes). La date par défaut est aujourd'hui.

**Étape 2, Catégorie** (maquette 2). `ChoiceChips` « Catégorie » (puces avec pastille de couleur) et puce pointillée **« + Nouvelle »**, avec la ligne de création inchangée. **En correction**, le crayon sur la puce sélectionnée et la ligne de renommage / suppression de catégorie (`canRenameCategory`, `canDeleteCategory`) vivent ici, comme aujourd'hui. **Valide** dès qu'une catégorie est choisie. Rien n'est présélectionné à la saisie.

**Étape 3, Paiement** (maquettes 3 et 4). Légende **« Avancé par un membre ? »** et deux puces **Non / Oui**, `h-11`, **Non présélectionné** (AC-FA-05).
- La question entière est **absente** si la liste de comptes est vide et que la dépense n'est pas déjà une avance (pas d'option « Oui » qui ne mènerait nulle part, jamais grisée). L'étape se réduit alors au cas « Non ».
- **Non** (maquette 3), deux groupes de puces, tous deux obligatoires : « Porteur · d'où sort l'argent » (porteurs **actifs** seulement) puis « Mode de paiement » (CB, Virement, Espèces, Chèque, Prélèvement). Aucune présélection du porteur ; le mode garde le comportement actuel.
- **Oui** (maquette 4, complétée) : les puces de porteur **et** le groupe « Mode de paiement » des porteurs **disparaissent**. À la place, dans l'ordre :
  1. **Membre** : sélecteur avec recherche (A3), obligatoire.
  2. **Remboursement** : légende « Remboursement », puces **« À rembourser »** (présélectionnée) et **« Remboursé »**, `h-11`.
  3. Seulement si **« Remboursé »** : (a) champ **« Date du remboursement »** pleine largeur (`Input type="date"` `h-11 min-w-0`, **aujourd'hui par défaut**, `min` = date de la dépense, `max` = aujourd'hui, message sous le champ si hors bornes) ; (b) groupe de puces **« Mode de paiement · du remboursement »** (les cinq valeurs, aucune présélection, obligatoire). Date et mode sont **empilés**, pas côte à côte.
  - Avec « À rembourser » : **aucun** mode, **aucune** date (PO-FA-04).
  - Texte d'aide discret sous « À rembourser » (`text-xs text-white/60`) : « Aucun solde de porteur n'est modifié. »
- **Bascules** : revenir de Oui à Non ne perd pas le choix du membre ni l'état saisi (conservés en mémoire pour la durée de la feuille, jamais envoyés avec un porteur) ; passer de « Remboursé » à « À rembourser » **efface** la date et le mode à l'enregistrement (AC-FA-06) mais les garde en mémoire dans la feuille jusqu'à la fermeture.
- **Valide** : Non : porteur et mode choisis ; Oui : membre choisi, et si « Remboursé » date valide et mode choisi.

**Étape 4, Récap** (maquette 5). Carte arrondie `border-white/10 bg-white/5`, lignes « libellé atténué à gauche, valeur en gras à droite », filets entre lignes (pas après la dernière), valeurs longues à la ligne (`min-w-0`, retour à la ligne autorisé, jamais de troncature qui masquerait un montant ou un nom). Lignes :

| Ligne | Valeur |
|---|---|
| Montant | « 58 € » |
| Libellé | texte saisi |
| Date | date longue (« mardi 6 octobre ») |
| Catégorie | libellé |
| **Dépense de porteur** : « Payé depuis » | « {porteur} · {mode} » (comme la maquette) |
| **Avance à rembourser** : « Avancé par » puis « Remboursement » | « {nom du membre} » puis « À rembourser » |
| **Avance remboursée** : « Avancé par », « Remboursé le », « Mode de remboursement » | « {nom} », date longue, « {mode} » |

Barre : « Retour » + « Enregistrer la dépense ». Aucun contrôle d'édition dans la carte (on revient par « Retour » ou par l'en-tête d'étapes).

### A3. Sélecteur de compte avec recherche (nouveau composant, composition)

- **Pourquoi pas un `Select` simple** : D-A6 impose que la saisie filtre la liste (tous les comptes), et la liste est longue. **Pourquoi pas une fenêtre flottante** : une popover sur une feuille basse, avec le clavier ouvert, est fragile sur mobile (focus Radix imbriqué, liste masquée par le clavier). Composition retenue : **liste en ligne, dans le corps de l'étape**, sans portail.
- **Composition** : un champ `Input` de recherche (`h-11 w-full min-w-0 rounded-xl border-white/15 bg-white/5`, placeholder **« Rechercher un membre »**, rôle `combobox`, `aria-controls` vers la liste) **suivi d'une liste de résultats** (rôle `listbox`) en dessous : chaque résultat est un `button`/`option` **`min-h-11`** pleine largeur, texte = **nom affichable seul**, jamais de coordonnée ni de rôle. Hauteur de la liste plafonnée (environ quatre lignes et demie, défilement interne, `overscroll-contain`) pour que la moitié de ligne suggère le défilement. Primitive suggérée : `npx shadcn add command` (cmdk), `CommandInput` + `CommandList` rendus **en ligne**, avec une fonction de filtre fournie qui normalise casse et accents (la normalisation existante) ; à défaut, une liste maison équivalente. **Nouvelle dépendance (`cmdk`) à signaler à l'implémentation.**
- **États** : 
  - *Vide, rien tapé* : la liste complète triée par nom (ordre fourni par la lecture, non retrié).
  - *En saisie* : liste filtrée. Aucun résultat : « Aucun compte ne correspond. » (`role="status"`, texte atténué), rien n'est sélectionnable.
  - *Choisi* : le champ affiche le **nom choisi** (sélection confirmée par une coche à droite et `aria-selected` dans la liste) et la liste se **replie** ; un bouton **« Effacer »** (icône `IconX`, **`h-11 w-11`**, `aria-label` « Changer de membre ») le vide et rouvre la liste.
  - *Retaper dans le champ après un choix* : **annule** la sélection (aucun texte libre n'est jamais retenu) ; l'étape redevient invalide tant qu'un résultat n'est pas touché.
- **Obligatoire** : « Suivant » reste inactif tant qu'aucun compte n'est choisi. Le texte tapé sans choix n'est jamais envoyé.
- **Homonymes** : deux comptes de même nom affichable ne sont pas distinguables (rien d'autre n'est affiché par minimisation) ; voir UI-FA-04.
- **Correction** : le champ s'ouvre avec le membre enregistré choisi ; son nom vient de la lecture des membres d'avances (même si le compte n'était plus dans la liste de candidats, il est ajouté pour l'affichage).

### A4. Correction (« Modifier la dépense »)

- **Même assistant**, pré-rempli, titre « Modifier la dépense ». Il **s'ouvre sur le Récap** (toutes les étapes sont valides) ; l'en-tête d'étapes est entièrement navigable pour sauter à l'étape à corriger, puis revenir au Récap (UI-FA-03). « Enregistrer les modifications » reste **inactif tant que rien n'a changé** (AC-FIE-05) ; il s'active sur tout changement permis par AC-FA-06 (porteur ↔ membre, autre membre, À rembourser ↔ Remboursé, date ou mode du remboursement).
- **« Supprimer la dépense » : sur le Récap uniquement**, en **fin de corps défilant** sous la carte de récap, sous un filet, bouton pleine largeur `h-11`, contour destructeur (patron existant de `FinanceSheetDeletion`), rendu seulement si `canDeleteExpense`. Raison : la suppression porte sur la dépense entière, pas sur une étape ; le Récap est l'endroit où l'on voit tout ce qu'on supprime, et la barre reste réservée à Retour / Enregistrer (pas d'appui accidentel à côté de l'action principale). Absent des trois premières étapes.
- **Confirmation en place** : au tap, la barre ancrée (Retour + Enregistrer) est **remplacée** par le panneau existant : phrase « Supprimer cette dépense ({montant}, {libellé}) ? Cette action est définitive. » puis « Supprimer définitivement » (destructeur) au-dessus d'« Annuler » (`h-11`, empilés). Le corps passe en `inert` pendant la confirmation. Aucune mention du membre dans la phrase. Succès : la feuille se ferme, listes et blocs se mettent à jour.
- **Dépense d'un porteur archivé** : verrouillée (PO-FA-13), l'assistant **ne s'ouvre pas** (voir A5).
- **Avance d'une saison passée** : n'apparaît pas dans la liste de la saison en cours, donc pas de correction ; seule l'action « Marquer remboursée » (A6) la touche.

### A5. Ligne de dépense (onglet Dépenses)

`ExpenseLine` existant, **variante de contenu** (aucune nouvelle colonne). Interactif seulement pour `canUpdateExpense` (bouton `min-h-11` + chevron `shrink-0`), statique sinon.

- **Dépense de porteur** : inchangée.
- **Avance** : 
  - ligne 1 gauche : libellé (inchangé) ; ligne 2 gauche : « {catégorie} · {date} » (**sans mode de paiement** pour une avance à rembourser ; pour une avance remboursée, « · {mode} » est le mode du remboursement) ;
  - **ligne 3 gauche** (`text-[13px]`, état en texte) : **« À rembourser »** en ambre (`text-amber-300`, comme les mentions « à faire ») ou **« Remboursé le {date courte} »** en texte atténué ;
  - colonne droite : montant (`shrink-0 whitespace-nowrap`) puis **« Avancé par {nom affichable} »** (`line-clamp-2`, aligné à droite, largeur max un peu plus large que celle des porteurs) à la place du porteur. L'état est porté par **le texte**, la couleur ambre n'est qu'un renfort.
- Libellé d'accessibilité de la ligne interactive : « Modifier la dépense {libellé} » (inchangé). À 360 px, la troisième ligne est à gauche (`min-w-0 truncate`), le montant reste intact.
- **Dépense d'un porteur archivé** : rendue comme la ligne en lecture seule (statique, sans chevron, sans réserve de place), même pour le Trésorier en vue Trésorier ; libellé du porteur conservé ; aucune explication ajoutée (UI-FA-07).
- Filtre par catégorie, « Voir plus », compteurs : inchangés. Aucun filtre par payeur ni par état (AC-FA-10).

### A6. Bloc « À rembourser » et marquage (onglet Trésorerie)

**Emplacement** : onglet **Trésorerie**, entre la paire « Entrées saison / Sorties saison » (et sa mention d'entrées sans porteur) et « Par porteur » : c'est une dette envers des membres, pas un solde de caisse. **Sans saison en cours** (AC-FA-09 : « affiché même sans saison ») : l'écran n'a ni onglets ni Trésorerie ; le bloc est rendu **sous le message « Aucune saison en cours… »**, dans la même colonne, avec la même action (UI-FA-06). Il n'est jamais rendu quand rien n'est dû.

**Contenu** (toutes saisons, avances non remboursées) :
- **En-tête** : titre `h2` **« À rembourser »** (`text-lg font-extrabold`, `min-w-0`) à gauche, **total général** à droite (`shrink-0 whitespace-nowrap`, gras), avec `aria-label` « Total à rembourser : {montant} ».
- **Une ligne par membre** : nom affichable (`min-w-0 truncate text-[15px] font-bold`) à gauche, **reste dû** (`shrink-0 whitespace-nowrap`, gras) à droite, filets `border-b border-white/10`, `py-3`. Ordre fourni par la règle du domaine (montant décroissant puis nom). Montants en **texte neutre** (pas de rouge ni de vert).
- **Vide** : le bloc entier est absent (titre compris), **ni « 0 € » ni message** (AC-FA-09).

**Lecture seule** (Dirigeant, administrateur, Trésorier en vue Dirigeant) : lignes **statiques** (nom, montant), **sans chevron, sans détail des avances, sans action**. Identiques pour tous ces rôles (UI-FA-05).

**Trésorier (`canUpdateReimbursement`)** : la ligne de membre devient un **bouton dépliant** (`min-h-11`, `aria-expanded`, chevron qui pivote, nom + montant). Repliée par défaut (dépliée d'office s'il n'y a qu'un seul membre). Dépliée, elle montre **les avances non remboursées de ce membre**, plus récentes d'abord, chacune sur un petit bloc :
- ligne : **libellé** (`min-w-0 truncate`) à gauche, **montant** (`shrink-0`) à droite ;
- sous-ligne atténuée : « {date courte} · {saison} » (la saison est **toujours** nommée, ex. « Saison 2025-2026 », pour qu'une avance d'une saison passée soit reconnaissable) ;
- bouton **« Marquer remboursée »** pleine largeur, `h-11`, contour clair (même forme que « Saisir le solde d'ouverture » de `CarrierRow`). Pas d'icône, pas de bouton imbriqué dans le bouton du membre (le bouton du membre est l'en-tête, les avances sont des frères en dessous).
- Il n'y a **pas** d'action « Annuler le remboursement » ici (PO-FA-22 : pas listé, pas atteignable).

**Feuille « Marquer remboursée »** (nouvelle feuille, **même `FinanceSheet`**, **une seule étape**, pas d'assistant) :
- Titre **« Marquer remboursée »**, description en texte : « {nom du membre} · {libellé} · {montant} · {date courte} » (nomme l'objet pour vérifier le bon choix ; le libellé est le texte libre déjà lu par le Trésorier).
- Champs, empilés : **« Date du remboursement »** (`Input type="date"` `h-11`, aujourd'hui par défaut, `min` = date de l'avance, `max` = aujourd'hui, message sous le champ si hors bornes) puis **« Mode de paiement · du remboursement »** (cinq puces `h-11`, **aucune présélection**, obligatoire).
- Barre ancrée : « **Marquer comme remboursée** » (rouge, `h-12`), inactive tant que le mode n'est pas choisi ou la date invalide ; « Annuler » en haut à droite (`h-11`). Pendant l'envoi : « Enregistrement… », tout désactivé (pas de double écriture, AC-FA-36).
- **Erreur serveur** : la feuille reste ouverte, valeurs conservées, message français au-dessus de la barre. Cas dédié « Cette dépense n'existe plus ou n'est plus une avance à rembourser. » : la feuille se ferme à l'acquittement et le bloc est rechargé.
- **Succès** : la feuille se ferme ; l'avance **quitte** le bloc, les totaux par membre et le total sont recalculés (le membre disparaît s'il n'a plus rien à recevoir, le bloc s'efface s'il est vide). Si l'avance est de la saison en cours, sa ligne de dépense passe à « Remboursé le … ». **Aucun solde de porteur ne bouge** (PO-FA-18) ; aucune mention de ce point dans l'interface (signalé à la développeuse au §6).

### A7. Delta partie B visible sur mobile (PO-FA-13/14, AC-FA-21)

- **Étape Paiement et feuille « Point de trésorerie »** : porteurs **actifs** seulement.
- **« Par porteur »** : un porteur archivé n'y figure que s'il a une activité dans la saison en cours. `CarrierRow` avec, **à la place** de « Solde d'ouverture non saisi », une pilule texte neutre **« Archivé »** (`border-white/15 bg-white/10 text-white/70`, comme le badge web), solde affiché comme les autres, **aucun bouton « Saisir »**, ligne **non interactive** même pour le Trésorier (pas de chevron).
- **Bouton `+`** et « Faire un point de trésorerie » : au moins un porteur **actif** (PO-FA-15) ; absents sinon.

### Partie B, web : page « Porteurs » (`/admin/finance-carriers`)

Même page `BackofficeFinanceCarriersPage`, aucune entrée de navigation ajoutée. Composition d'après le précédent d'archivage des lieux (`TrainingLocationTable`, `ArchiveTrainingLocationDialog`, `TrainingLocationArchivedBadge`).

**B1. Tableau**
- **Mention « Archivé »** : pilule texte neutre **« ARCHIVÉ »** (`rounded-full border-white/15 bg-white/10 text-white/70 text-xs font-extrabold uppercase`, classes de `TrainingLocationArchivedBadge`) **à côté du libellé** dans la cellule Libellé (`flex items-center gap-2`). **Pas de colonne « Statut »**. Libellé et détail de la ligne en `opacity-70` en complément, **jamais seuls**. Badge Type et colonne Responsable inchangés.
- **Ordre** : actifs d'abord, archivés ensuite, chacun dans l'ordre existant (type puis libellé). Le tri vient **de la lecture** (la page ne retrie pas) : UI-FA-09.
- **Actions** (colonne `sr-only` « Actions », boutons fantômes icône `h-11 w-11 rounded-full` alignés à droite, **rendus seulement si leur booléen est vrai**) :
  - ligne **active** : crayon (`canUpdate`, inchangé) + **« Archiver »** (`IconArchive`, `aria-label` « Archiver le porteur « {libellé} » », `canArchive`) ;
  - ligne **archivée** : crayon (renommage permis, PO-FA-11) + **« Restaurer »** (`IconArchiveOff`, `aria-label` « Restaurer le porteur « {libellé} » », `canArchive`) ;
  - jamais « Archiver » sur une archivée ni « Restaurer » sur une active. **Aucune suppression nulle part.**

**B2. Confirmation d'archivage** (`ArchiveFinanceCarrierDialog`, calqué sur `ArchiveTrainingLocationDialog`) : `AlertDialog`, **non rouge**. Titre **« Archiver ce porteur ? »**. Description : « « {libellé} » ne sera plus proposé comme payeur d'une dépense, ni dans les versements, ni dans les prochains points de trésorerie. Son historique, ses soldes et ses points passés restent visibles. Le porteur n'est pas supprimé et pourra être restauré. » (**l'ancien avertissement sur le solde d'ouverture est retiré** : la base le refuse désormais, PO-FA-08 tranché). Pied : « Annuler » (outline, `h-11 rounded-full`) et « **Archiver** » (`h-11 rounded-full bg-white font-bold text-black`, « Archivage… » pendant l'envoi, les deux désactivés, `preventDefault` pour rester ouvert jusqu'au succès).

**B3. Refus** : même fenêtre, qui **reste ouverte**, avec un `Alert` destructif `role="alert"` entre la description et le pied ; rien n'est écrit ; jamais de texte Postgres brut. **Une cause, un message** (AC-FA-20) :
- **Aucune saison en cours** : « Aucune saison n'est en cours : un porteur ne peut pas être archivé tant qu'une saison n'est pas ouverte. »
- **Solde d'ouverture non saisi** : « Ce porteur ne peut pas être archivé : son solde d'ouverture de la saison en cours n'est pas saisi. Demandez au Trésorier de le saisir (même à 0 €), puis réessayez. »
- **Solde non nul** : « Ce porteur ne peut pas être archivé : son solde de la saison en cours n'est pas nul. Ramenez-le à zéro (dépense, versement ou correction du solde d'ouverture, visibles dans l'écran Finances), puis réessayez. » Pas de montant (UI-FA-08).
- **Introuvable ou déjà archivé** : « Ce porteur n'existe plus ou est déjà archivé. » (liste rechargée à la fermeture) ; **droits** : « Vous n'avez pas les droits pour archiver les porteurs. » ; réseau : message générique existant.
- « Archiver » reste disponible pour une nouvelle tentative.

**B4. Restauration** : **sans confirmation** (réversible, non destructeur ; UI-FA-10). Pendant l'envoi, le bouton de **cette ligne** est désactivé. Succès : la ligne retourne parmi les actifs, badge retiré. Échec : `Alert` destructif au-dessus du tableau (« Impossible de restaurer le porteur. Réessayez. », ou « Ce porteur n'existe plus ou n'est pas archivé. »).

**B5. Autres états** : chargement, erreur de lecture, liste vide, « Nouveau porteur » inchangés ; un tableau uniquement d'archivés est un tableau normal. Sous-titre : conserver l'actuel, avec en option la ligne atténuée « Un porteur archivé n'est plus proposé pour les nouvelles saisies. »

**B6. Par rôle** (renvoi au §3) : l'**Administrateur** voit la page complète ; « Archiver » / « Restaurer » si `canArchive`, calculé par le ViewModel séparément de `canCreate` / `canUpdate` et de l'accès à la route. Trésorier, Dirigeant et autres : pas d'accès au backoffice, rien ne change sur mobile pour la gestion des porteurs. Compte Administrateur + Trésorier : archive au backoffice, saisit sur mobile ; deux surfaces séparées. Si PO-FA-06 retient deux actions, « Restaurer » suit son propre booléen, rendu inchangé.

### Par rôle, récapitulatif mobile (renvoi au §3, rien de redéfini)

| Rôle | Rendu |
|---|---|
| **Trésorier** (vue Trésorier) | Assistant de saisie et de correction, avec choix de membre ; lignes d'avance interactives ; bloc « À rembourser » dépliable avec « Marquer remboursée » ; reçoit la liste des comptes |
| **Dirigeant habilité**, **Administrateur**, **Trésorier en vue Dirigeant** | Lecture seule : lignes d'avance statiques (« Avancé par {nom}», état en texte), bloc « À rembourser » statique et identique. **Absents** : `+`, assistant, chevrons, sélecteur, détail des avances, « Marquer remboursée ». Aucune liste de comptes reçue, aucun message « lecture seule » |
| Autres rôles | Pas d'accès à l'écran (inchangé) |

### Composants nouveaux ou modifiés

| Composant | Rôle | Justification |
|---|---|---|
| `FinanceSheet` (étendu) + en-tête d'étapes et barre Retour / action | Cadre de l'assistant : poignée, étapes, barre à deux boutons | Extension du cadre existant ; l'en-tête d'étapes est du texte-bouton, pas un composant visuel inédit (maquette 1 à 5) |
| `ExpenseSheet` en 4 étapes (ViewModel : étape courante, validité par étape) | Saisie et correction | Remplace la feuille à défilement unique (D-A7) ; réutilise `AmountField`, `ChoiceChips`, `CategoryEditRow`, la confirmation de suppression en place |
| **Sélecteur de compte avec recherche** (liste en ligne) | Choix du membre | **Seul patron sans équivalent dans le dépôt** (recherche + liste choisie). Justifié par D-A6 ; composé d'un `Input` et d'une liste ; pas de maquette, mais comportement précisé en A3 (voir UI-FA-11) |
| Variante « avance » d'`ExpenseLine` | Troisième ligne d'état et « Avancé par » | Contenu, pas de structure nouvelle |
| Section « À rembourser » du `TreasuryTab` (et sous le message sans saison) | Total, lignes membre dépliantes pour le Trésorier | Variation de « Par porteur » et d'`ExpenseLine` |
| Feuille « Marquer remboursée » | Date + mode | Même `FinanceSheet`, un champ date et des puces : composition |
| Variante archivée de `CarrierRow` ; `FinanceCarrierArchivedBadge` ; `ArchiveFinanceCarrierDialog` | Partie B | Copies de patrons d'archivage existants |

### Récapitulatif tactile (CLAUDE.md §6, AC-FA-30), à vérifier à 360 px réels

- **Cibles ≥ `h-11`** : indicateurs d'étape, puces Non / Oui, À rembourser / Remboursé, puces de mode et de porteur, champ de recherche du membre, chaque résultat (`min-h-11`), bouton « Effacer » (`h-11 w-11`), champs de date, « Retour » et bouton principal (`h-12`), « Supprimer la dépense », « Supprimer définitivement », « Annuler », ligne de membre dépliante, « Marquer remboursée », boutons d'archivage du tableau (`h-11 w-11`).
- **Paires côte à côte, `min-w-0` sur chaque élément** : Libellé / Date (`col-span-3` / `col-span-2`, repli en pile si la date n'est pas lisible) ; Retour / action principale (« Retour » `shrink-0`, action `flex-1 min-w-0`) ; en-tête « À rembourser » (titre `min-w-0`, total `shrink-0`) ; ligne membre / montant ; libellé / montant d'une avance dépliée ; colonne gauche / droite d'une dépense avancée (« Avancé par » en `line-clamp-2`, montant `shrink-0`). Date et mode de remboursement, membre et état : **empilés**, sans paire.
- Barre ancrée `sticky bottom-0` opaque ; en-tête de retour de l'écran collant (inchangé).

### Amendements à reporter dans les specs voisines (non faits ici)

- `specs/mob-treasurer-finances.md` UI design §4 : la feuille à défilement unique est **remplacée** par l'assistant (A1 à A4) ; §3.4 : variante avance (A5) ; §5 : bloc « À rembourser » (A6) et ligne archivée (A7) ; bouton principal rouge pour l'assistant.
- `specs/mob-treasurer-finances-edit.md` UI design §2/§3 : la correction d'une dépense est l'assistant pré-rempli (A4), « Supprimer » sur le Récap ; la ligne d'une dépense de porteur archivé n'est pas interactive.
- `specs/web-finance-carriers.md` UI design : remplacer « Aucune colonne Statut », « Aucun bouton d'archivage » et « Jamais de suppression ni d'archivage » par B1 à B6.

### Questions UI ouvertes (aucune bloquante)

| Réf. | Question | Défaut retenu |
|---|---|---|
| UI-FA-01 | Le bouton principal de l'assistant est rouge (maquette), alors que les autres feuilles Finances sont vertes. Harmoniser ? | Rouge pour l'assistant et « Marquer remboursée » ; autres feuilles inchangées |
| UI-FA-02 | La poignée de la maquette déroge à O-FI-UI-07 (pas de poignée) | Reprise, décorative, sans geste de tirage |
| UI-FA-03 | En correction, l'assistant s'ouvre sur le Récap (étapes toutes navigables) plutôt que sur l'étape 1 | Récap |
| UI-FA-04 | Homonymes dans le sélecteur : rien ne les distingue (nom affichable seul, minimisation) | Aucun complément affiché ; à revoir si le cas se présente |
| UI-FA-05 | Les lecteurs en lecture seule voient-ils le détail des avances (libellés) dans « À rembourser » ? | Non : lignes par membre seulement |
| UI-FA-06 | Sans saison en cours, le bloc « À rembourser » (et son action) est rendu sous le message d'état, ce qui sort du gabarit actuel (message seul) | Rendu sous le message, action comprise |
| UI-FA-07 | Dépense d'un porteur archivé : mention texte expliquant pourquoi la ligne ne s'ouvre pas ? | Aucune mention |
| UI-FA-08 | Refus d'archivage pour solde non nul : afficher le montant ? (la base devrait le renvoyer) | Non |
| UI-FA-09 | Archivés regroupés après les actifs : la lecture admin doit trier ainsi | Oui, tri porté par la lecture |
| UI-FA-10 | Restauration sans confirmation | Sans confirmation |
| UI-FA-11 | Le sélecteur de compte est un patron sans maquette (liste en ligne avec recherche). Souhaitez-vous un prototype Claude Design avant de l'implémenter ? | Conçu par composition (A3) ; à valider ou à prototyper |
