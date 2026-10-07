# Spec — Vue mobile Trésorier : Finances (dépenses et trésorerie) (`mob-treasurer-finances`)

> Statut : **rédaction initiale 2026-10-06, mise à jour le même jour avec les réponses de la développeuse** (voir « Décisions du 2026-10-06 »). **Aucun point ouvert bloquant** : prêt pour designer-agent (voir « Transmission »).
> Demande d'origine (développeuse) : un compte portant le rôle Trésorier obtient une carte de Menu **« Finances »** sur mobile, ouvrant les écrans des maquettes `docs/designs/finances/` (7 exports). Un **Dirigeant habilité** doit aussi voir cette page, **en lecture seule** (aucune édition possible).
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (modules P0/P1/P2, matrice RBAC, exigences transversales §11.3), `docs/roles-personas-as-caribbean.md` (rôle Trésorier : « Cotisations, échéanciers, relances, exports financiers »), `docs/RETENTION_PURGE.md` (données financières), `docs/designs/DESIGN_LINKS.md` §4, `specs/mobile-treasurer.md` (patron le plus proche : `dues:read`, carte de Menu `/dues`, lecture seule du Dirigeant, moyen de paiement, audit Trésorier, formulaire d'enregistrement de versement), `specs/web-memberships.md` (PO-WM-04, paiements append-only, `RecordPaymentDialog`), `specs/menu.md` (AC-MN-06, amendé de fait par `mobile-treasurer`), `specs/mobile-dirigeant-habilite.md` (AC-DH-25), `CLAUDE.md`.
> État du code lu : `src/domain/policies/{rbac-matrix,can,audit-actions}.ts`, `src/presentation/features/menu/{MenuPage.tsx,useMenuViewModel.ts}` (carte « Cotisations » gardée par `dues:read`), `src/presentation/app/router.tsx`. **Aucune table, entité, règle ni use case de dépense, de porteur, de solde d'ouverture ou de point de trésorerie n'existe** dans `src/` ni dans `supabase/migrations/`.

## Décisions du 2026-10-06 (réponses de la développeuse, relayées par l'orchestrateur)

| Réf. | Décision | Effet sur ce spec |
|---|---|---|
| PO-FI-01 | **TRANCHÉ.** Le module a été **demandé par le Bureau** : c'est une dérogation assumée au CDC, qui sert de fondement à la feature. **À consigner dans un compte rendu de Bureau avant la mise en production** (non bloquant) | §1 « Fondement » réécrit |
| PO-FI-02 | **PARTIELLEMENT TRANCHÉ.** Seul le **Trésorier** saisit les **soldes d'ouverture** et les **dépenses**. La saisie de dépense correspond aux maquettes 5/6. **La saisie du solde d'ouverture n'est pas maquettée** : c'est à designer-agent de la proposer. L'origine des « Entrées saison » reste non maquettée → **défaut retenu : versements de cotisation, avec un porteur par versement** (non bloquant, PO-FI-02 reformulé) | §1, §2, §3, AC-FI-28 à 33 |
| PO-FI-04 | **TRANCHÉ.** Les dépenses ont leur **propre référentiel à cinq valeurs** : CB, Virement, Espèces, Chèque, Prélèvement. Le référentiel des versements de cotisation n'est pas modifié | §2 |
| PO-FI-06 | **TRANCHÉ (cadrage).** Modification et suppression d'une dépense sont **hors périmètre maintenant**, mais doivent rester **autorisables plus tard** : aucun choix de modèle, de RLS ou d'audit ne doit l'empêcher | §2 « Extensibilité », AC-FI-34 |
| PO-FI-07 | **TRANCHÉ.** Codes d'audit `expense.recorded` et `treasury_checkpoint.recorded` approuvés, plus un code pour le solde d'ouverture, puisque l'action est ajoutée : `opening_balance.recorded` | §4, AC-FI-21 |
| Autres | Les autres points ouverts restent **non bloquants**, avec leur défaut | §6 |

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne n'existe au §2 du registre pour cette feature.** Sept exports PNG sont présents dans `docs/designs/finances/` (en `??` dans `git status`, donc pas encore committés). Selon le §4 du registre (« aucune ligne »), la question du lien est posée **une seule fois** à la développeuse (PO-FI-13). L'agent PO n'écrivant que dans `specs/`, la ligne est pré-rédigée ici. Elle est à recopier telle quelle si aucun lien n'existe :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| mob-treasurer-finances — **vue Trésorier : Finances, onglets Dépenses et Trésorerie, saisie de dépense, point de trésorerie** (`[v1] [Trésorier] Mob - Finances-{1..7}`) | — aucun lien fourni (à confirmer, PO-FI-13) | 2026-10-06 | `docs/designs/finances/[v1] [Trésorier] Mob - Finances-{1,2,3,4,5,6,7}.png` | **instantané seul** |

> Notes à joindre à la ligne :
> - (a) **Sept exports : deux onglets d'un même écran et deux feuilles.** 2 et 3 sont **identiques** (onglet Trésorerie). 7 = onglet Dépenses, filtre « Toutes ». 4 = onglet Dépenses, filtre « Déplacements ». 6 = feuille « Nouvelle dépense ». 5 = même feuille, avec la saisie d'une **nouvelle catégorie** ouverte. 1 = feuille « Point de trésorerie ».
> - (b) **Aucun export ne montre la saisie d'un solde d'ouverture ni d'une entrée**, malgré l'indication initiale que l'export 5 la montrait. L'export 5 est la feuille de dépense (voir « Décisions », PO-FI-02).
> - (c) Les maquettes contiennent des **noms de personnes** (responsables de caisse) et un **nom de banque**. Ce sont des illustrations, à ne reprendre ni dans le code, ni dans les tests, ni dans les fixtures (`CLAUDE.md` §9).
> - (d) Aucun export ne montre la **vue Dirigeant habilité**. La lecture seule vient de la demande, pas d'une maquette.

## 1. Périmètre

### Fondement — dérogation au CDC demandée par le Bureau (PO-FI-01, tranché)

Dépenses, porteurs, soldes d'ouverture et points de trésorerie **ne figurent dans aucun module du CDC**. Le rôle Trésorier y est décrit par « Cotisations, échéanciers, relances, exports financiers », et le module P1 « Cotisations » par « Tarification, échéancier, relance, export ». **Fondement retenu : demande du Bureau**, confirmée par la développeuse le 2026-10-06. Il s'agit d'une extension assumée du CDC, au même titre que les sections « Suivi de l'équipe » du Menu (`menu.md`). Priorité de fait : **P1**, comme le module Cotisations auquel elle s'adosse, le CDC ne fixant pas de priorité pour ce module.

| Élément | Module CDC | Fondement |
|---|---|---|
| Dépenses, porteurs, soldes d'ouverture, points de trésorerie | Aucun | **Demande du Bureau** (dérogation assumée) |
| « Entrées saison » = versements de cotisation (défaut PO-FI-02) | **Cotisations** (P1) | CDC |
| Carte « Finances » du Menu | — | Même dérogation que la carte « Cotisations » (`mobile-treasurer`) |

> **À faire avant la mise en production (non bloquant)** : consigner cette décision dans un **compte rendu de Bureau**, car l'application devient de fait un outil de tenue de trésorerie, avec des obligations de conservation (PO-FI-11).

### Ce que les maquettes montrent

**Écran unique « Finances »** : sous-écran avec flèche de retour, nav basse avec « Dashboard » actif, titre « Finances », sous-titre « Saison {libellé} », bascule à deux onglets **Dépenses / Trésorerie**.

**Onglet Dépenses** (exports 7 et 4) :
- carte **« DÉPENSES SAISON »** : total de la saison, « Ce mois : {montant} », barre segmentée par catégorie, légende par catégorie (pastille, libellé, montant) ;
- rangée de puces de filtre **par catégorie** (« Toutes » + une par catégorie, défilement horizontal) ;
- liste **« Dernières dépenses »** avec compteur (« 8 dépenses », « 1 dépense »). Chaque ligne affiche : libellé, « {catégorie} · {date courte} · {mode de paiement} », montant négatif, porteur ;
- dans l'export 4, le filtre « Déplacements » **restreint la liste et son compteur, pas la carte** (total 1 252 € inchangé) ;
- bouton flottant **`+`**.

**Feuille « Nouvelle dépense »** (exports 6 et 5) :
- montant (grand champ, « € ») ;
- **LIBELLÉ** ;
- **DATE** (défaut : aujourd'hui) ;
- **CATÉGORIE** : puces à choix unique, plus une puce « + Nouvelle » qui ouvre un champ « Nom de la catégorie » avec « Ajouter » / « Annuler » ;
- **PORTEUR · D'OÙ SORT L'ARGENT** : une puce par porteur ;
- **MODE DE PAIEMENT** : CB, Virement, Espèces, Chèque, Prélèvement ;
- bouton « Enregistrer la dépense » (inactif tant que le formulaire est incomplet) et « Annuler ».

**Onglet Trésorerie** (exports 2 et 3) :
- carte **« DISPONIBLE (THÉORIQUE) »** : total, « Banque {montant} · Espèces {montant} » ;
- deux tuiles **« Entrées saison »** / **« Sorties saison »** ;
- bloc **« Par porteur »**. Pour chaque porteur : type (banque / espèces), libellé, détail (établissement · type de compte, ou « Espèces · {responsable} »), solde théorique, et « Compté {date} : {montant} » (dernier montant constaté) ;
- bouton **« Faire un point de trésorerie »** ;
- bloc **« Historique des points »** : une ligne par point, avec la date longue et « Écart {±montant} ».

**Feuille « Point de trésorerie »** (export 1) :
- consigne : « Indique le montant réellement constaté pour chaque porteur. L'écart est calculé par rapport au solde théorique. » ;
- un champ par porteur, avec « Théorique {montant} » et un indicateur d'écart (« Juste » quand constaté = théorique) ;
- « Total constaté » ;
- champ libre **DÉBRIEF** ;
- bouton « Enregistrer le point » et « Annuler ».

**Non maquetté, à proposer par designer-agent** : la **saisie du solde d'ouverture** d'un porteur pour la saison (Trésorier seulement, voir §2 et AC-FI-28 à 30), et le champ **« Porteur »** ajouté aux formulaires existants d'enregistrement d'un versement de cotisation (AC-FI-31 à 33).

Lecture arithmétique des maquettes, utile pour les règles :
- Disponible = somme des soldes théoriques des porteurs (4 234 + 537 + 52 = 4 823).
- « Ce mois » = dépenses du mois calendaire en cours (38 + 95 = 133, au 6 octobre).
- Disponible ≠ Entrées − Sorties (1 405 − 1 252 = 153). L'écart s'explique par les **soldes d'ouverture**.
- Le « Compté 15 sept. » d'un porteur **n'a pas remis** son solde théorique à ce montant (4 790 compté, 4 234 théorique aujourd'hui). Un point est donc un **constat**, pas un ajustement.

### Entre au périmètre

1. **Carte « Finances » du Menu**, route dédiée, sous-écran de la destination Dashboard (même modèle que `/dues`).
2. **Onglet Dépenses en lecture** : carte de synthèse de la saison, ventilation par catégorie, « Ce mois », filtre par catégorie (liste seulement), liste des dépenses de la saison.
3. **Onglet Trésorerie en lecture** : disponible théorique, ventilation Banque / Espèces, entrées et sorties de la saison, bloc « Par porteur » avec le dernier constat, historique des points avec leur écart.
4. **Saisie d'une dépense** (Trésorier seulement).
5. **Création d'une catégorie** depuis la feuille de dépense (Trésorier seulement, PO-FI-05).
6. **Saisie du solde d'ouverture** d'un porteur pour la saison en cours (Trésorier seulement ; écran à proposer).
7. **Enregistrement d'un point de trésorerie** (Trésorier seulement).
8. **Porteur d'un versement de cotisation** : champ facultatif ajouté aux formulaires existants d'enregistrement d'un versement (défaut PO-FI-02).
9. **Lecture seule du Dirigeant habilité** : mêmes écrans, aucun contrôle d'écriture.

### Hors périmètre — explicitement

- **Modification et suppression** d'une dépense, d'une catégorie, d'un solde d'ouverture ou d'un point. Elles sont exclues **maintenant**, mais le modèle doit permettre de les ajouter plus tard (PO-FI-06, §2 « Extensibilité »).
- **Journal d'entrées générique** (buvette, subventions, dons…) : aucune maquette. Défaut PO-FI-02 : les entrées sont les versements de cotisation seulement.
- **Création, modification, archivage d'un porteur** (PO-FI-03).
- **Justificatifs** (photo de ticket, facture), pièces jointes.
- **Budget** prévisionnel, comparaison entre saisons, sélecteur de saison.
- **Exports** (matrice : Trésorier ✅ « financier ») : aucun bouton d'export n'est montré.
- **Encaissement / paiement en ligne** (P2), synchronisation bancaire, IBAN ou numéro de compte.
- **Variante desktop / backoffice** de ces écrans. Seul le dialogue admin d'enregistrement de versement gagne le champ « Porteur » (point 8).
- **Toute donnée de cotisation nominative** sur ces écrans : elle reste sur `/dues`. L'onglet Trésorerie ne montre que des agrégats.
- **Accès de tout autre rôle** (Responsable de section, Coach, Joueur, Référent médical, Bénévole).

## 2. Données et règles

Proposé et signalé. Modèle **indicatif**, à confirmer à l'implémentation.

### Généralités

- **Montants** : entiers de **centimes** en base, jamais de flottant, formatés par `presentation/shared/formatters/currency.ts`. Une dépense a un montant **strictement positif** ; le signe « − » relève de l'**affichage**.
- **Saison** : la saison en cours désignée par Postgres (`current_season()`), jamais l'horloge du navigateur. Dépenses, soldes d'ouverture et points portent leur saison. Sans saison en cours : repli explicite (PO-FI-09).

### Entités

- **Dépense** : saison, montant, libellé, date de dépense, catégorie, porteur, mode de paiement, auteur (`auth.uid()`, jamais un paramètre), horodatage de saisie.
- **Catégorie** : référentiel **club-wide** persisté. Les six catégories des maquettes servent de valeurs initiales. Libellé unique, insensible à la casse et aux accents. Couleur issue d'une **palette fixe**, jamais saisie (PO-FI-05).
- **Mode de paiement d'une dépense (PO-FI-04, tranché)** : référentiel **propre aux dépenses**, cinq valeurs dans l'ordre des maquettes. Codes indicatifs : `card | transfer | cash | cheque | direct_debit`, libellés CB, Virement, Espèces, Chèque, Prélèvement.
  - Constante du domaine distincte (nom indicatif `EXPENSE_PAYMENT_METHODS`) et contrainte CHECK recopiée à la main, commentées des deux côtés (`CLAUDE.md` §7).
  - **`PAYMENT_METHODS` des versements de cotisation n'est pas modifié** : il reste sans chèque. Son mapper qui ramène `'cheque'` à `null` est inchangé.
  - Aucune contrainte de cohérence porteur/mode dans cette passe (par exemple « Espèces » depuis le compte bancaire est accepté). Signalé, voir PO-FI-04b.
- **Porteur** : libellé, type `bank | cash`, détail facultatif (établissement · type de compte), **responsable** facultatif pour une caisse. Pas d'IBAN ni de numéro de compte. Création et modèle du responsable : PO-FI-03.
- **Solde d'ouverture** : un montant (centimes, ≥ 0) **par (porteur, saison)**, avec auteur et horodatage. Contrainte d'unicité `(porteur, saison)`.
  - Saisi par le **Trésorier seulement**, pour la saison en cours.
  - **Une seule saisie** par porteur et par saison dans cette passe. La correction d'une erreur de saisie relève de PO-FI-06, comme pour les dépenses.
  - Un porteur sans solde d'ouverture pour la saison est traité comme **solde d'ouverture = 0**, et l'écran le **signale** (« Solde d'ouverture non saisi »). On n'affiche jamais un théorique trompeur sans avertissement.
  - Aucun report automatique depuis la saison précédente dans cette passe (PO-FI-15).
- **Porteur d'un versement de cotisation (défaut PO-FI-02)** : nouvelle colonne **nullable** sur les versements de cotisation (les versements existants n'en ont pas).
  - Champ **facultatif** « Porteur » ajouté aux deux formulaires existants d'enregistrement d'un versement : formulaire Trésorier mobile (`mobile-treasurer`, amendement (3)) et `RecordPaymentDialog` admin. Valeur par défaut « Non précisé », sur le modèle du moyen de paiement.
  - `RecordPaymentUseCase` valide la référence au porteur et la persiste.
  - **Aucune nouvelle action** : la saisie reste sous `'payment:record'`.
- **Point de trésorerie** : saison, date, débrief facultatif, auteur, et **une ligne par porteur** avec le montant **constaté** et le montant **théorique figé au moment du point** (snapshot). Sans ce snapshot, l'écart d'un point passé changerait à chaque dépense saisie après lui, et l'historique deviendrait faux.

### Règles pures du domaine (Vitest, `domain/`, sans React ni Supabase)

- `theoreticalBalance(porteur)` = solde d'ouverture (0 si absent) + versements de cotisation de la saison attribués au porteur − dépenses de la saison du porteur.
- `seasonIncome` = **tous** les versements de cotisation de la saison, attribués ou non.
- `unattributedIncome` = versements de la saison **sans porteur**. Ils comptent dans « Entrées saison » mais dans **aucun** solde théorique. L'onglet Trésorerie l'indique en texte neutre (« {montant} d'entrées sans porteur ») dès qu'il est > 0. Sinon, Disponible et Entrées ne se réconcilieraient pas, sans explication.
- `available` = somme des soldes théoriques. Ventilation Banque / Espèces selon le type de porteur.
- `variance` = constaté − théorique, par porteur et au total. Libellé « Juste » si et seulement si l'écart est nul.
- Totaux par catégorie, total de la saison, total du **mois calendaire en cours** (fuseau du club, PO-FI-09).
- Aucun recalcul parallèle dans un ViewModel ou un composant. Le reste dû d'une cotisation n'intervient pas ici.

### Autres règles

- **Un point n'ajuste aucun solde** : il ne crée ni dépense ni entrée de régularisation, et ne remet pas le théorique à la valeur constatée (lecture des exports 2/3). Une écriture de régularisation serait une nouvelle demande (PO-FI-10).
- **Domaine** : nouveaux use cases dans un dossier `domain/usecases/` dédié, créé par cette feature. Mapper obligatoire entre DTO et entité. Clés de requête centralisées, **distinctes** des clés `dues`. Mais l'enregistrement d'un versement invalide aussi les clés Finances, puisqu'il modifie « Entrées saison » et les soldes théoriques.

### Extensibilité vers la modification et la suppression (PO-FI-06, cadrage tranché)

La modification et la suppression ne sont **pas construites**, mais **rien ne doit les empêcher plus tard**. Contraintes de conception :

1. **Aucun solde stocké ni cumul courant** (pas de colonne « solde après opération », pas de chaînage d'une ligne à la précédente). Soldes, totaux et ventilations sont **calculés à la lecture**. Une modification ou suppression future se répercutera donc d'elle-même, sans réécriture en cascade.
2. **Immutabilité par absence de droit, pas par construction.** On n'accorde aujourd'hui **aucune** politique RLS `update`/`delete` ni aucun privilège de colonne correspondant. En revanche, **aucun trigger** qui interdit structurellement `update`/`delete`, aucune règle Postgres `DO INSTEAD NOTHING`, aucun hachage ou signature de ligne. Ouvrir ces droits plus tard = ajouter une politique RLS et une entrée de matrice, sans migration destructive.
3. **Identifiants stables** (UUID) sur chaque dépense, solde d'ouverture et point. Une correction future pourra cibler la ligne et la tracer dans l'audit.
4. **Références** : les clés étrangères depuis une dépense vers sa catégorie et son porteur sont en `on delete restrict`. Une suppression future de catégorie ou de porteur passera par un archivage, jamais par une cascade qui ferait disparaître des dépenses.
5. **Snapshot des points** : le théorique figé d'un point reste un fait historique. Une correction future d'une dépense antérieure **ne réécrit pas** les points passés. C'est la nature du constat, pas un obstacle à l'édition.
6. **Audit** : les codes de cette passe sont nommés `<ressource>.<verbe>` (`expense.recorded`…). Des codes jumeaux `expense.updated` / `expense.deleted` pourront être ajoutés plus tard **sans renommer** les codes existants. Ils ne sont **pas** ajoutés maintenant (« ne pas ajouter par anticipation », `audit-actions.ts`). La `metadata` d'une entrée cible la ligne par son identifiant (`target_type`, `target_id`).
7. **Domaine** : pas de type `ReadonlyExpense` qui rendrait l'édition impossible côté TypeScript. Les validations de montant, date, catégorie et porteur vivent dans des **règles pures réutilisables** par un futur `UpdateExpenseUseCase`, pas dans le seul `RecordExpenseUseCase`.

## 3. RBAC

### Lignes de la matrice CDC

**Aucune ligne de la matrice CDC ne couvre les dépenses ou la trésorerie** : le fondement est la demande du Bureau (§1). Lignes les plus proches, pour cohérence :

| Permission (matrice CDC) | Trésorier | Dirigeant habilité | Administrateur | Pertinence |
|---|---|---|---|---|
| Voir le statut de cotisation | ✅ | ✅ | ✅ | Seule ligne financière en lecture. Sert de modèle à la lecture des finances (même trio de rôles que `dues:read`) |
| Gérer échéanciers et relances | ✅ | ❌ | ✅ (paramétrage) | Seule ligne financière en écriture. Sert de modèle à l'écriture « Trésorier seul » |
| Exporter des données | ✅ (financier) | ✅ | ✅ (tout, tracé) | Non exploitée |
| Voir les dossiers des autres membres | ❌ (financier seulement) | ✅ | ✅ | Pertinent pour le **responsable de caisse** nominatif (PO-FI-03) |

Les cinq autres rôles (Joueur, Coach, Responsable de section, Référent médical, Bénévole) n'ont **aucun** droit financier : ni carte, ni écran, ni lecture.

### Rôles et accès retenus

| Rôle | Accès | Fondement |
|---|---|---|
| **Trésorier** | Lecture des deux onglets ; saisie de dépense ; création de catégorie ; **saisie des soldes d'ouverture** ; enregistrement d'un point ; porteur d'un versement (via `'payment:record'`, déjà accordé) | Demande du Bureau ; décision développeuse (« seul le Trésorier saisit les soldes d'ouverture et les dépenses ») |
| **Dirigeant habilité** | **Lecture seule** des deux onglets. **Aucun** contrôle d'écriture rendu : pas de `+`, pas de « Faire un point de trésorerie », pas de « + Nouvelle », pas de saisie de solde d'ouverture | Demande développeuse explicite ; même position que `dues:read` |
| **Administrateur** | Lecture seule par défaut. Aucune écriture propre à Finances (la décision « seul le Trésorier saisit » l'exclut). Le champ « Porteur » de son dialogue de versement relève de `'payment:record'`, qu'il détient déjà | Cohérence avec `dues:read` / `dues:remind` ; lecture à confirmer (PO-FI-08) |
| Autres rôles | Aucun accès | Matrice CDC (aucun ✅ financier) |

Tous ces rôles sont **club-wide** (aucun `team_id` ni `section_id`) : **aucune branche de portée à ajouter dans `can.ts`** (branche `default`). Les droits se lisent sur les **rôles portés**, pas sur le rôle actif seul (même règle que `dues:read`).

### Entrées de matrice nécessaires — **à signaler**, aucune n'existe aujourd'hui

Critère appliqué (`rbac-matrix.ts`, en-tête) : une entrée n'existe que si `presentation/` doit décider **avant** ou **indépendamment** du résultat d'une requête.

| Action (nom indicatif) | Rôles | Pourquoi une entrée `can()` | Miroir SQL (manuel, commenté du nom de l'action) |
|---|---|---|---|
| `'finances:read'` | `['treasurer', 'authorized-officer', 'admin']` (admin : PO-FI-08) | Le **Menu** affiche ou masque la carte « Finances » **avant toute requête**, et la route refuse un rôle sans ce droit (même patron que `canViewDues`) | Politiques `select` sur dépenses, catégories, porteurs, soldes d'ouverture, points (ou fonction de lecture agrégée), conditionnées à `private.has_role('treasurer') or private.has_role('authorized-officer') or private.is_admin()` |
| `'expense:record'` | `['treasurer']` | Le bouton flottant `+` doit être **absent** (pas grisé) pour le Dirigeant et l'admin | Politique `insert` sur les dépenses (`with check` : `private.has_role('treasurer') and recorded_by = auth.uid()`). Couvre aussi l'**insertion d'une catégorie** depuis la feuille (PO-FI-05) |
| `'opening_balance:record'` | `['treasurer']` | Le contrôle de saisie du solde d'ouverture (écran à proposer) doit être **absent** sans ce droit | Politique `insert` sur les soldes d'ouverture (`with check` : `private.has_role('treasurer') and recorded_by = auth.uid()` et saison = `current_season()`) |
| `'treasury_checkpoint:record'` | `['treasurer']` | Le bouton « Faire un point de trésorerie » doit être **absent** sans ce droit | Fonction `security definer` étroite (recommandé : le point et ses lignes sont écrits **atomiquement**, et le théorique figé est calculé côté serveur, jamais reçu du client). Elle vérifie `private.has_role('treasurer')` et lève `42501` sinon |

**Choix signalé : `'opening_balance:record'` est une action distincte, plutôt que de réutiliser `'expense:record'`.** Le rôle est le même aujourd'hui, mais :
- (1) la convention du dépôt nomme l'action d'après la **ressource écrite** (`'payment:record'`, `'dues:remind'`), et un solde d'ouverture n'est pas une dépense ;
- (2) chaque politique RLS doit porter le nom de son action, et ce sont deux tables distinctes ;
- (3) les deux droits peuvent diverger plus tard, par exemple si le paramétrage des soldes d'ouverture est confié à l'admin (« ✅ (paramétrage) » de la ligne CDC voisine).

Si la développeuse préfère une seule entrée, il suffit de remplacer `'opening_balance:record'` par `'expense:record'` dans les politiques et les ViewModels. **C'est la seule entrée qui pourrait être fusionnée.**

Autres règles :
- **Aucune politique `update` ni `delete`** sur ces tables, pour aucun rôle, dans cette passe. Ce n'est pas une interdiction structurelle (§2 « Extensibilité »).
- **Lecture : pas d'entrée `can()` par onglet ni par bloc.** Une fois l'écran atteint, `presentation/` rend ce que la lecture renvoie (RLS seule, conformément au critère). Le Dirigeant voit la **même structure** que le Trésorier, sans les contrôles d'écriture, qui dépendent des trois entrées d'écriture ci-dessus.
- **Responsable de caisse nominatif** : exposer uniquement le **nom affichable**, via la fonction de lecture ou une colonne dénormalisée. Ne jamais élargir `users_select_*` au Trésorier ou au Dirigeant (même raisonnement que `get_treasurer_dues()`).
- **Porteur d'un versement** : écrit sous `'payment:record'` existant (`['admin', 'treasurer']`) ; les politiques d'insertion `membership_payments_insert_admin` / `_treasurer` couvrent la nouvelle colonne. **Aucune nouvelle action.**
- **Aucune autre entrée** n'est ajoutée ni modifiée : `'dues:read'`, `'dues:remind'`, `'payment:record'`, `'membership:write'`, `'backoffice:access'` sont inchangées.

### Comptes multi-rôles

- Trésorier + Dirigeant : un seul écran « Finances », **avec** les contrôles d'écriture (droits lus sur les rôles portés).
- Dirigeant seul : lecture seule. Son tableau de bord Dirigeant reste **sans donnée financière** (AC-DH-25 inchangé) ; il n'accède aux finances que par la carte du Menu, comme pour `/dues`.
- Un contrôle non autorisé est **absent, jamais grisé**.

## 4. Données sensibles

| Nature | Cette feature | Conséquence |
|---|---|---|
| **Financière** | **Oui, c'est l'objet** : dépenses, soldes d'ouverture, soldes théoriques, constats de caisse, écarts, porteur d'un versement de cotisation | `RETENTION_PURGE.md` ne couvre aujourd'hui que les « Données financières (cotisations) ». Dépenses, soldes et points relèvent vraisemblablement de la même **conservation comptable légale**, avec archivage froid avant purge, **à faire confirmer** (PO-FI-11). Aucune logique d'expiration dans `domain/` |
| **Nominative** | **Oui, indirectement** : responsable de caisse (nom d'un membre) ; **texte libre** (libellé de dépense, débrief) pouvant contenir un nom de tiers. L'onglet Trésorerie n'expose **aucun** versement nominatif, seulement des agrégats | Minimisation : nom affichable seulement, aucune coordonnée. Texte libre : PO-FI-12 |
| **Santé** | Aucune | — |
| **Journal d'audit (PO-FI-07, approuvé)** | **Trois nouveaux codes** : `expense.recorded`, `opening_balance.recorded`, `treasury_checkpoint.recorded` | Voir ci-dessous |
| **Export** | Aucun | — |

Détail des trois codes d'audit :
- **Émission** : depuis le **use case** (action métier), jamais depuis un composant ni la fonction SQL.
- **Mise à jour en miroir** : ajoutés à `AUDIT_ACTIONS` **et** à `audit_log_action_check` dans le même changement, avec la mention « wired: … ». `record_audit_log_entry` est élargie au Trésorier **pour ces trois seuls codes**, en plus de `membership.payment_recorded` et `dues.reminder_sent`.
- **Cible** : `target_type` / `target_id` = la ligne créée.
- **`metadata` minimale** : montant et catégorie pour une dépense ; porteur et montant pour un solde d'ouverture ; écart total pour un point. **Jamais** de libellé libre ni de débrief.
- **Non tracés** : la création de catégorie (défaut) et l'ajout d'un porteur sur un versement (déjà couvert par `membership.payment_recorded`, dont la `metadata` peut mentionner le porteur sans nouveau code).
- **Faille héritée** : un échec d'audit n'est qu'un `console.error` (même réserve que PO-TR-19).
- **Lecture** : non tracée (aucune donnée de santé, aucun export).

Sécurité du compte : le Trésorier et le Dirigeant consultent la trésorerie du club sur téléphone ; la MFA n'est exigée que pour les administrateurs (« recommandée aux dirigeants », §3.1 du CDC). Signalé, hors périmètre.

## 5. Critères d'acceptation

Préfixe **`AC-FI-`**. Aucune numérotation CDC (AC-xx) n'existe pour ce domaine. AC-02 (CDC §17.2, aucun accès hors du périmètre du rôle) s'applique à AC-FI-01 à 06.

**Accès et droits**

| Réf. | Critère |
|---|---|
| AC-FI-01 | La carte « Finances » du Menu est rendue si et seulement si `can(user, 'finances:read')`. Sans ce droit, elle est **absente**, jamais grisée. Un compte Joueur, Coach, Responsable de section, Référent médical ou Bénévole ne la voit pas |
| AC-FI-02 | Un compte sans `finances:read` qui force l'URL de l'écran n'obtient aucune donnée : l'écran refuse. **Contre la base**, les lectures avec un jeton de ces rôles ne renvoient aucune ligne, ou lèvent `42501` pour une fonction |
| AC-FI-03 | Avec un jeton **Dirigeant habilité** (sans `treasurer`) : les deux onglets affichent les mêmes données qu'avec un jeton Trésorier. Le bouton `+`, « Faire un point de trésorerie », « + Nouvelle » et la saisie du solde d'ouverture sont **absents**. Contre la base, toute insertion de dépense, de catégorie, de solde d'ouverture ou de point est refusée. Même chose pour un administrateur sans `treasurer` |
| AC-FI-04 | `'expense:record'`, `'opening_balance:record'` et `'treasury_checkpoint:record'` valent exactement `['treasurer']`. `'finances:read'` vaut exactement la liste retenue par PO-FI-08. Aucune autre entrée de matrice n'est ajoutée ni modifiée, et aucune branche de portée n'est ajoutée à `can.ts`. Chaque politique ou fonction SQL porte en commentaire le nom de son action |
| AC-FI-05 | Contre la base, dans cette passe, aucun rôle authentifié (Trésorier et admin compris) ne peut `update` ni `delete` une dépense, une catégorie, un solde d'ouverture, un point ou une ligne de point. `recorded_by` vaut toujours l'appelant, sans paramètre d'auteur |
| AC-FI-06 | Le Dirigeant habilité et le Trésorier ne lisent toujours `users` que pour leur propre ligne : le nom d'un responsable de caisse n'est obtenu que par la lecture dédiée |

**Onglet Dépenses**

| Réf. | Critère |
|---|---|
| AC-FI-07 | La carte de synthèse affiche le total des dépenses de la **saison en cours**, le total du **mois calendaire en cours**, et une ventilation par catégorie dont la somme est égale au total. Chaque catégorie est identifiée par son **libellé et son montant en texte**, jamais par la couleur seule |
| AC-FI-08 | Le filtre par catégorie (« Toutes » + une puce par catégorie ayant au moins une dépense dans la saison) restreint la **liste et son compteur** (« {n} dépense(s) », singulier/pluriel), **pas** la carte de synthèse. « Toutes » par défaut, choix non persisté |
| AC-FI-09 | Chaque ligne affiche libellé, catégorie, date courte, mode de paiement, montant précédé de « − », porteur. Tri du plus récent au plus ancien (date de dépense, puis saisie). Liste vide : état vide explicite, distinct d'une erreur |

**Saisie d'une dépense** (maquettes 5/6)

| Réf. | Critère |
|---|---|
| AC-FI-10 | « Enregistrer la dépense » reste inactif tant que tous les champs ne sont pas valides : montant (> 0, au plus 2 décimales), libellé (non vide après `trim`), date (non future, défaut aujourd'hui), catégorie, porteur, mode de paiement. Le mode de paiement est l'une des **cinq** valeurs CB, Virement, Espèces, Chèque, Prélèvement, issues d'un référentiel propre aux dépenses. Les validations vivent dans des règles pures du domaine, pas dans le composant |
| AC-FI-11 | Après enregistrement, sans rechargement manuel (invalidation par clés centralisées de `query-keys.ts`) : la dépense apparaît en tête de liste, et sont à jour la carte de synthèse, « Ce mois », la ventilation, les « Sorties saison », le disponible théorique et le solde du porteur concerné |
| AC-FI-12 | Une erreur serveur (réseau, refus) laisse la feuille ouverte avec les valeurs saisies et un message en français. Un double tap n'enregistre pas deux fois |
| AC-FI-13 | Création de catégorie : un libellé vide ou déjà existant (insensible à la casse et aux accents) est refusé avec un message. Une catégorie créée est **sélectionnée** dans la feuille en cours et disponible pour toutes les saisies suivantes. « Annuler » referme le champ sans rien créer |

**Onglet Trésorerie**

| Réf. | Critère |
|---|---|
| AC-FI-14 | Le disponible théorique est égal à la somme des soldes théoriques des porteurs. « Banque » et « Espèces » en sont la ventilation par type de porteur, et leur somme est égale au total |
| AC-FI-15 | « Entrées saison » = somme de **tous** les versements de cotisation de la saison en cours (attribués ou non à un porteur). « Sorties saison » est égal au total de la carte « Dépenses saison » |
| AC-FI-16 | Chaque porteur affiche son solde théorique (règle pure du domaine). S'il a déjà été compté, il affiche aussi « Compté {date courte} : {montant constaté} » du **dernier** point ; sinon, aucune ligne de constat (pas de « 0 € » trompeur) |
| AC-FI-17 | L'historique des points liste les points de la saison, du plus récent au plus ancien, avec la date longue et l'écart total **figé au moment du point**. Saisir une dépense ou un versement après un point ne modifie pas l'écart affiché de ce point |

**Point de trésorerie**

| Réf. | Critère |
|---|---|
| AC-FI-18 | La feuille présente **un champ par porteur actif** avec son solde théorique. Pour chaque porteur, l'écart (constaté − théorique) est affiché en texte signé, ou « Juste » s'il est nul. « Total constaté » est la somme des champs. L'écart est une règle pure du domaine, testée par Vitest (écart nul, positif, négatif, centimes) |
| AC-FI-19 | L'enregistrement crée **un** point et **une** ligne par porteur, de façon atomique (tout ou rien). Chaque point porte le théorique **calculé côté serveur** et figé, le constaté, le débrief facultatif et l'auteur. Il ne crée ni dépense ni entrée et ne modifie aucun solde |
| AC-FI-20 | Après enregistrement, l'historique et les lignes « Compté … » des porteurs sont à jour sans rechargement manuel |

**Audit (PO-FI-07, approuvé)**

| Réf. | Critère |
|---|---|
| AC-FI-21 | Une entrée apparaît dans le journal d'audit, **vérifiée contre la base**, pour chaque dépense, solde d'ouverture et point enregistrés par un Trésorier : respectivement `expense.recorded`, `opening_balance.recorded`, `treasury_checkpoint.recorded`. Elle est émise par le use case et cible la ligne créée. Sa `metadata` ne contient ni libellé libre ni débrief. `AUDIT_ACTIONS` et `audit_log_action_check` sont modifiés dans le même changement, et `record_audit_log_entry` n'admet le Trésorier que pour ses codes autorisés |

**Transverse**

| Réf. | Critère |
|---|---|
| AC-FI-22 | Sans saison en cours : repli explicite (PO-FI-09), jamais une liste vide muette, une erreur ou un chargement infini. Chargement et erreur (« Réessayer ») traités sur chaque onglet |
| AC-FI-23 | En-tête de retour `sticky top-0` à fond opaque. Bouton d'enregistrement des feuilles toujours visible (barre ancrée). Cibles ≥ `h-11` (puces, onglets, champs, boutons compris). `min-w-0` sur toute paire côte à côte (Libellé/Date, montant/indicateur d'écart, nom/montant d'un porteur). Vérifié sur un viewport mobile réel |
| AC-FI-24 | Montants en entiers de centimes en base. Montants, signes et statuts (« Juste », écart, « Solde d'ouverture non saisi », « entrées sans porteur ») toujours portés par du texte. Contrastes AA sur fond sombre |
| AC-FI-25 | Aucun import de `data/` depuis `presentation/`. Les ViewModels exposent les booléens (`canViewFinances`, `canRecordExpense`, `canRecordOpeningBalance`, `canRecordCheckpoint`). Clés de requête dans `query-keys.ts`. Aucun nom de personne ni de banque des maquettes dans le code, les tests ou les fixtures |
| AC-FI-26 | Non-régression : `/dues`, tableau de bord Trésorier, tableau de bord Dirigeant (AC-DH-25), Menu des autres rôles et `/admin/memberships` sont inchangés, hors champ « Porteur » ajouté aux formulaires de versement (AC-FI-31) |
| AC-FI-27 | Chaque onglet s'affiche en moins de 3 s sur mobile pour une saison de plusieurs centaines de dépenses et de versements (lectures agrégées, pas une requête par porteur ou par catégorie) |

**Solde d'ouverture** (écran non maquetté, à proposer par designer-agent)

| Réf. | Critère |
|---|---|
| AC-FI-28 | Un Trésorier peut saisir, pour chaque porteur, **un** solde d'ouverture (≥ 0, au plus 2 décimales) pour la **saison en cours**. Une seconde saisie pour le même (porteur, saison) est refusée par la base (unicité) et par l'interface (contrôle absent une fois le solde saisi) |
| AC-FI-29 | Tant qu'un porteur n'a pas de solde d'ouverture pour la saison, son solde théorique est calculé avec 0, et la mention « Solde d'ouverture non saisi » est affichée en texte sur sa ligne (et dans la feuille de point). Le contrôle de saisie n'est rendu que si `canRecordOpeningBalance` |
| AC-FI-30 | Après saisie, le solde théorique du porteur, le disponible et la ventilation Banque / Espèces sont à jour sans rechargement manuel ; l'entrée d'audit `opening_balance.recorded` est créée (AC-FI-21) |

**Porteur d'un versement de cotisation (défaut PO-FI-02)**

| Réf. | Critère |
|---|---|
| AC-FI-31 | Les deux formulaires d'enregistrement d'un versement (Trésorier mobile, `RecordPaymentDialog` admin) proposent un champ **« Porteur »** facultatif (« Non précisé » par défaut), en plus des champs existants, sans autre changement. `RecordPaymentUseCase` valide la référence et la persiste. Aucune nouvelle entrée de matrice : `'payment:record'` inchangé |
| AC-FI-32 | Un versement attribué à un porteur augmente son solde théorique. Un versement sans porteur (y compris tous les versements antérieurs à cette feature) compte dans « Entrées saison » mais dans aucun solde. Dans ce cas l'onglet Trésorerie affiche « {montant} d'entrées sans porteur » ; la mention est absente quand le montant est nul |
| AC-FI-33 | Enregistrer un versement invalide aussi les clés Finances : « Entrées saison » et le solde du porteur concerné se mettent à jour sans rechargement manuel |

**Extensibilité (PO-FI-06)**

| Réf. | Critère |
|---|---|
| AC-FI-34 | Aucun solde ni cumul n'est stocké (tout est calculé à la lecture). Aucun trigger, aucune règle Postgres ni aucune contrainte n'interdit structurellement `update`/`delete` sur les tables de cette feature : l'immutabilité de cette passe ne repose que sur l'absence de politique RLS et de privilège. Les clés étrangères des dépenses vers catégorie et porteur sont en `on delete restrict`. Les validations sont des règles pures réutilisables par un futur use case de modification |

## 6. Points ouverts

| Réf. | Question | Défaut proposé | Pour qui | Bloquant ? |
|---|---|---|---|---|
| PO-FI-01 | Fondement CDC | **TRANCHÉ (2026-10-06)** : demande du Bureau, dérogation assumée. **Reste à consigner dans un compte rendu de Bureau avant la mise en production** | Bureau | Non (avant production) |
| PO-FI-02 | **Origine des « Entrées saison »** : aucune maquette ne la montre. Versements de cotisation seulement, journal d'entrées générique (buvette, subventions, dons), ou les deux ? Faut-il un porteur **obligatoire** sur les nouveaux versements ? | **Défaut retenu** : versements de cotisation seulement, porteur **facultatif** par versement (§2, AC-FI-31 à 33). Un journal d'entrées générique serait une nouvelle demande. *Soldes d'ouverture et dépenses : tranché, Trésorier seulement* | Développeuse / Trésorier | Non |
| PO-FI-03 | **Porteurs** : qui les crée et les modifie (admin au backoffice ? Trésorier ? migration initiale ?) ; le **responsable de caisse** est-il un compte (`users`, donnée nominative exposée au Dirigeant) ou un simple texte ? Archivage ? | Porteurs créés par migration de données initiale, hors de cette passe ; responsable = référence à un compte, nom affichable seulement ; pas d'archivage dans cette passe | Développeuse / Trésorier | Non pour concevoir ; à confirmer avant d'écrire la migration |
| PO-FI-04 | Référentiel des modes de paiement des dépenses | **TRANCHÉ** : référentiel propre aux dépenses, cinq valeurs (CB, Virement, Espèces, Chèque, Prélèvement) | — | — |
| PO-FI-04b | Cohérence porteur/mode (Espèces seulement depuis une caisse, Chèque/Prélèvement seulement depuis la banque) ? | Aucune contrainte dans cette passe | Trésorier | Non |
| PO-FI-05 | **Création de catégorie** : réservée au Trésorier ? Club-wide ou par saison ? Renommage, archivage, couleur ? | Trésorier seul (sous `'expense:record'`), club-wide, couleur depuis une palette fixe, ni renommage ni archivage dans cette passe | Développeuse | Non |
| PO-FI-06 | Modification / suppression d'une dépense (et d'un solde d'ouverture, d'un point) | **TRANCHÉ (cadrage)** : hors périmètre maintenant, à rendre autorisable plus tard (§2 « Extensibilité », AC-FI-34). Restent à décider le jour venu : qui peut corriger, édition en place ou contre-passation, codes d'audit jumeaux. Même famille que PO-WM-04 | Développeuse / Trésorier | Non ; **à rouvrir avant la mise en production** (une erreur de saisie de dépense ou de solde d'ouverture serait sinon indélébile) |
| PO-FI-07 | Audit | **TRANCHÉ** : `expense.recorded`, `treasury_checkpoint.recorded`, plus `opening_balance.recorded`. La création de catégorie n'est pas tracée (défaut) | — | — |
| PO-FI-08 | **Administrateur** : lit-il les finances ? | Lecture oui (comme `dues:read`). Écriture non : « seul le Trésorier saisit » | Développeuse / Bureau | Non |
| PO-FI-09 | **Saison et calendrier** : sans saison en cours, que montrer ? Une dépense datée hors des bornes de la saison en cours est-elle acceptée ? « Ce mois » : mois calendaire dans quel fuseau ? | Message explicite sans saison ; date de dépense comprise dans la saison en cours et non future ; fuseau du club (Antilles), pas celui de l'appareil | Développeuse / Trésorier | Non |
| PO-FI-10 | **Effet d'un point** : simple constat (lecture des maquettes), ou écriture de régularisation de l'écart ? Débrief obligatoire si l'écart n'est pas nul ? Champs pré-remplis avec le théorique (l'export 1 semble le montrer) ? | Constat seul ; débrief facultatif ; pré-remplissage à trancher par designer-agent (risque de valider sans compter) | Développeuse / Trésorier | Non |
| PO-FI-11 | **Rétention** : `RETENTION_PURGE.md` ne vise que les cotisations. Durée comptable des dépenses, soldes d'ouverture, points et débriefs ; archivage froid | Même catégorie « Données financières », durée à confirmer par le Trésorier / l'expert-comptable ; `expires_at` nullable | Référent RGPD / Trésorier / expert-comptable | Non ; **à trancher avant mise en production** |
| PO-FI-12 | **Texte libre** (libellé, débrief) : risque de noms de tiers ou de motifs sensibles, lus par le Dirigeant | Longueur maximale (valeur au développement), pas de consigne | Référent RGPD | Non |
| PO-FI-13 | **Lien de maquette** (`DESIGN_LINKS.md` §4, aucune ligne) : existe-t-il un lien artifact pour ces sept exports ? Question posée **une seule fois** | Sinon : ligne `instantané seul` du §0 à recopier ; committer `docs/designs/finances/` | Développeuse | Non |
| PO-FI-14 | **Point d'entrée** : uniquement la carte « Finances » du Menu, ou aussi un lien depuis le tableau de bord Trésorier ? Libellé et sous-titre de la carte | Menu seulement ; libellé « Finances », sous-titre à proposer par designer-agent | Développeuse | Non |
| PO-FI-15 | **Report des soldes d'ouverture** d'une saison à la suivante (solde théorique de clôture repris automatiquement ?) | Non : saisie manuelle à chaque saison | Trésorier | Non |
| PO-FI-16 | `'opening_balance:record'` distinct ou fusionné avec `'expense:record'` (§3) | Distinct (ressource différente, droits susceptibles de diverger) | Développeuse | Non |

**Points reconduits, non rouverts** : PO-WM-04 (correction d'un paiement), PO-TR-16 (rétention financière), PO-TR-19 (audit hors transaction), PO-AU-03 (rétention du journal).

**Specs voisines à amender par conséquence** (par un amendement daté dans leurs fichiers, non fait ici) :
- `specs/mobile-treasurer.md` (formulaire Trésorier d'enregistrement de versement) et `specs/web-memberships.md` (`RecordPaymentDialog`) : ajout du champ facultatif « Porteur » (AC-FI-31).
- `specs/menu.md` : la carte « Finances » s'ajoute à l'exception déjà ouverte par la carte « Cotisations » à AC-MN-06.

## Transmission

**Prêt pour transmission à designer-agent : OUI.** Aucun point ouvert bloquant : PO-FI-01 est tranché (demande du Bureau), PO-FI-02 a un défaut retenu, PO-FI-04/06/07 sont tranchés.

- **À concevoir d'après les maquettes** : carte du Menu, onglets Dépenses et Trésorerie, feuille « Nouvelle dépense » (avec création de catégorie), feuille « Point de trésorerie ». Maquettes `docs/designs/finances/`, statut `instantané seul` sauf réponse contraire à PO-FI-13.
- **À proposer sans maquette** :
  - la **saisie du solde d'ouverture** (Trésorier seulement, une fois par porteur et par saison, mention « Solde d'ouverture non saisi », AC-FI-28 à 30) ;
  - la mention « {montant} d'entrées sans porteur » ;
  - le champ **« Porteur »** dans les deux formulaires d'enregistrement de versement existants (AC-FI-31).

  Tout est à construire par composition de patrons existants.
- **Vue Dirigeant habilité** : même écran, sans aucun contrôle d'écriture (absents, jamais grisés).
- **À ne pas concevoir** : modification ou suppression (PO-FI-06), journal d'entrées générique, gestion des porteurs, export, justificatifs, sélecteur de saison.
- **Avant l'écriture de la migration** : confirmer le défaut de PO-FI-03 (modèle des porteurs et du responsable).
- **Avant la mise en production** : compte rendu de Bureau (PO-FI-01), correction des saisies (PO-FI-06), rétention (PO-FI-11).
- **Implémentation** : la migration (tables, RLS commentées du nom des actions, fonction d'enregistrement du point, colonne porteur sur les versements, élargissement d'`audit_log_action_check` et de `record_audit_log_entry`) est à écrire puis à **proposer à l'application**, jamais appliquée en silence.

## UI design

> Rédigé le 2026-10-06 par designer-agent. **Aucun point bloquant.** Les droits ne sont pas redéfinis ici : tout renvoie au §3 (`'finances:read'`, `'expense:record'`, `'opening_balance:record'`, `'treasury_checkpoint:record'`) et aux booléens de ViewModel de AC-FI-25 (`canViewFinances`, `canRecordExpense`, `canRecordOpeningBalance`, `canRecordCheckpoint`).

### 0. Références visuelles et registre

- **Registre `DESIGN_LINKS.md`** : aucune ligne pour cette feature à ce jour. Le lien est demandé une seule fois à la développeuse (PO-FI-13, voir le §0 du spec) ; **la ligne `instantané seul` pré-rédigée au §0 du spec reste à recopier dans `DESIGN_LINKS.md` §2 faute de lien**. Les maquettes lues sont donc les instantanés locaux `docs/designs/finances/[v1] [Trésorier] Mob - Finances-{1..7}.png`.
- **Maquettes reprises telles quelles** : onglet Dépenses (`Finances-7`, `Finances-4`), feuille « Nouvelle dépense » (`Finances-6`, `Finances-5`), onglet Trésorerie (`Finances-2`, `Finances-3`), feuille « Point de trésorerie » (`Finances-1`).
- **Maquette Menu réutilisée** : `docs/designs/menu/[v0] Mob - Menu.png` (grille 2 colonnes de cartes de la section « Suivi de l'équipe »).
- **Composants existants à réutiliser** (pas de nouveau patron) : `MenuNavCard`, `TreasurerStateMessage` (états chargement / vide / erreur du Trésorier), `DuesFilters` (rangée de puces), la feuille basse de `RecordDuePaymentDialog` (`DialogContent` ancré en bas, `max-h-[90dvh]`, zone défilante, barre de validation ancrée), le `Select` du « Moyen de paiement » de ce même formulaire, et `BackHeader` (`features/convocation/components/BackHeader.tsx`) pour l'en-tête.
- **Aucun composant visuel nouveau hors maquette** : le solde d'ouverture et la mention « sans porteur » sont des **compositions** de patrons existants (voir §5 et §6), conformément à la demande du spec. Pas de prototype Claude Design à demander.

### 1. Où ça vit dans la navigation

- **Barre basse inchangée** (Dashboard, Calendrier, Actus, Menu), pour tous les rôles.
- **Point d'entrée unique : une carte « Finances » dans le Menu**, section « Suivi de l'équipe », juste après « Cotisations », dans la grille 2 colonnes existante (PO-FI-14, défaut : pas de lien depuis le tableau de bord Trésorier).
  - Titre « Finances », sous-titre **« Dépenses et trésorerie »** (neutre, jamais un montant : AC-MN-04), icône de portefeuille de la bibliothèque d'icônes déjà utilisée (`IconCoins` étant pris par « Cotisations »).
  - Rendue si et seulement si `canViewFinances` ; sinon **absente**, jamais grisée (AC-FI-01). Pas de pastille.
  - Un Trésorier voit alors quatre cartes dans la section (Statistiques, Classement, Cotisations, Finances) : la grille 2×2 absorbe ce cas sans changement.
- **Route dédiée `/finances`**, sous-écran de la destination **Dashboard** : l'onglet « Dashboard » reste actif dans la barre basse, comme dans toutes les maquettes `Finances-*` et comme `/dues`. Retour par la flèche de l'en-tête vers le Menu.
- **Un seul écran, deux onglets, trois feuilles basses.** Aucune route supplémentaire : les feuilles (Nouvelle dépense, Point de trésorerie, Solde d'ouverture) sont des feuilles ancrées en bas, ouvertes depuis l'écran.

### 2. Coque de l'écran

- **En-tête** : flèche de retour + titre « Finances » (`BackHeader`), **`sticky top-0` à fond opaque** (AC-FI-23). Sous-titre « Saison {libellé} » en flux normal, sous l'en-tête.
- **Bascule d'onglets « Dépenses / Trésorerie »** : contrôle segmenté à deux segments (même famille que la bascule semaine/mois du calendrier, `wireframes-basiques-as-caribbean.md`), segments `h-11`, pleine largeur. « Dépenses » par défaut, choix non persisté. Le contenu de l'onglet inactif n'est pas monté (une lecture agrégée par onglet, AC-FI-27).
- **Rôles** : la coque, les deux onglets et leur contenu sont **identiques** pour Trésorier, Dirigeant habilité et administrateur. Seuls les contrôles d'écriture diffèrent (§7).

### 3. Onglet Dépenses (`Finances-7`, `Finances-4`)

De haut en bas :

1. **Carte « DÉPENSES SAISON »** : libellé en capitales et couleur d'alerte, total de la saison en grand, « Ce mois : {montant} » en haut à droite (libellé et montant sur une même ligne, **`min-w-0`** sur la colonne du libellé pour que le mois ne chevauche pas l'intitulé). Dessous, **barre segmentée** proportionnelle par catégorie, puis **légende en deux colonnes** (pastille, libellé tronqué avec `truncate`, montant à droite).
   - Chaque pastille est doublée du **libellé et du montant en texte** : la couleur n'est jamais seule porteuse (AC-FI-07, AC-FI-24). La barre est décorative (`aria-hidden`), la légende porte l'information.
   - Libellé tronqué dans la légende (comme « Licences & arbi… » dans l'export) : la **ligne de dépense et la puce de filtre** portent le libellé complet.
   - La carte **ne réagit pas au filtre** (AC-FI-08).
2. **Rangée de puces de filtre** : « Toutes » + une puce par catégorie ayant au moins une dépense. Défilement horizontal, puces `h-11`, patron de `DuesFilters`. Sélection à choix unique, fond plein sur la puce active.
3. **En-tête de liste** : « Dernières dépenses » à gauche, compteur « {n} dépense(s) » à droite (réagit au filtre, singulier/pluriel).
4. **Lignes de dépense** (compactes, séparées par un filet, **sans carte** pour rester dans le patron liste dense des maquettes) :
   - Barre verticale de la couleur de catégorie à gauche (décorative, la catégorie est dite en texte).
   - Colonne gauche (`min-w-0`) : libellé (une ligne, `truncate`), puis « {catégorie} · {date courte} · {mode de paiement} » (une ligne, `truncate`).
   - Colonne droite (`shrink-0`, alignée à droite) : montant précédé de « − » en couleur d'alerte, puis le porteur en texte secondaire.
   - **Non interactive** (pas de détail, pas de modification : PO-FI-06). Pas de chevron.
5. **Bouton flottant `+`** : voir §4. Il recouvre la zone du montant des dernières lignes dans l'export `Finances-7` ; la liste reçoit donc un **bas de page réservé** (hauteur du bouton + marge) pour que la dernière ligne reste lisible.

**Longues listes (AC-FI-27, proposition)** : affichage des **20 plus récentes** puis un bouton pleine largeur « Afficher plus » (`h-11`, +20 par appui). Le compteur reste le total filtré. Alternative si la développeuse préfère tout afficher : voir O-FI-UI-03.

### 4. Feuille « Nouvelle dépense » (`Finances-6`, `Finances-5`) — Trésorier seulement

- **Déclencheur** : bouton flottant `+` (cercle d'au moins 56 px, couleur d'alerte du design, fixé au-dessus de la barre basse, à droite), **uniquement sur l'onglet Dépenses** et **uniquement si `canRecordExpense`**. Libellé accessible « Nouvelle dépense ».
- **Contenant** : feuille ancrée en bas (patron de `RecordDuePaymentDialog`), corps défilant, **barre « Enregistrer la dépense » ancrée `sticky bottom-0` à fond opaque** (AC-FI-23). « Annuler » en haut à droite du titre, cible `h-11`. La feuille ne se ferme pas par un appui hors zone si des valeurs sont saisies (évite la perte de saisie sur un geste accidentel).
- **Champs, dans l'ordre des maquettes** :
  1. **Montant** : grand champ numérique (clavier décimal), « € » à droite, souligné ; `h-14` minimum. Placeholder « 0 ». Au plus 2 décimales (AC-FI-10).
  2. **Libellé** et **Date côte à côte** (grille 2 colonnes, **chaque item en `min-w-0`**, colonne Date légèrement plus étroite comme dans l'export, mais **les deux champs rétrécissent à leur colonne** : le sélecteur de date natif a une largeur minimale intrinsèque qui, sans `min-w-0`, chevauche le libellé sur téléphone étroit). Champs `h-11`. Date par défaut : aujourd'hui, `max` = aujourd'hui, `min` = début de la saison (PO-FI-09). **À vérifier sur un viewport de 360 px réel** ; si la date native ne reste pas lisible à cette largeur, repasser les deux champs en pile (une colonne) plutôt que de la réduire.
  3. **Catégorie** : puces à choix unique qui passent à la ligne (pas de défilement horizontal dans une feuille), `h-11`. La puce choisie prend la **couleur de la catégorie** ; l'état choisi est aussi porté par `aria-pressed` / un fond plein. Dernière puce **« + Nouvelle »** (visible si `canRecordExpense`, ce qui est toujours vrai dans cette feuille).
  4. **Porteur · d'où sort l'argent** : puces à choix unique, passe à la ligne, `h-11`, une par porteur.
  5. **Mode de paiement** : cinq puces CB, Virement, Espèces, Chèque, Prélèvement, `h-11`, passe à la ligne.
- **Création de catégorie (`Finances-5`)** : l'appui sur « + Nouvelle » **remplace la ligne de puces « + Nouvelle » par une ligne** composée du champ « Nom de la catégorie » (`min-w-0`, `flex-1`, `h-11`) et de deux boutons « Ajouter » et « Annuler » (`h-11`, `shrink-0`). Si cette ligne ne tient pas à 360 px, les boutons passent **sous** le champ (jamais de débordement horizontal). « Ajouter » : libellé vide ou doublon (casse et accents ignorés) → message en français sous le champ, ligne conservée (AC-FI-13) ; succès → la ligne se referme et la nouvelle catégorie est **ajoutée aux puces et sélectionnée**. « Annuler » referme sans rien créer. La couleur est attribuée automatiquement (palette fixe, jamais choisie).
- **Bouton « Enregistrer la dépense »** : inactif (fond atténué, texte lisible AA) tant que le formulaire est invalide (AC-FI-10) ; `h-11` minimum (la maquette le montre plus haut, à conserver). Au tap : libellé « Enregistrement… », bouton désactivé (pas de double enregistrement, AC-FI-12).
- **Erreur serveur** : feuille ouverte, valeurs conservées, message en français au-dessus de la barre ancrée.
- **Succès** : la feuille se ferme, la liste, la carte et les compteurs se mettent à jour (AC-FI-11). Le filtre actif est conservé ; si la nouvelle dépense n'appartient pas à la catégorie filtrée, elle n'apparaît pas dans la liste mais la carte est à jour.

### 5. Onglet Trésorerie (`Finances-2`, `Finances-3`, identiques)

De haut en bas :

1. **Carte « DISPONIBLE (THÉORIQUE) »** : total en grand ; dessous « Banque {montant} · Espèces {montant} » (une ligne, passe à la ligne si besoin, `min-w-0`). Un total négatif est affiché avec « − » **et** en couleur d'alerte (texte d'abord).
2. **Deux tuiles « Entrées saison » / « Sorties saison »** : grille 2 colonnes, **`min-w-0` sur chaque tuile**, montants en vert / couleur d'alerte **et** libellés explicites.
3. **Ligne neutre « {montant} d'entrées sans porteur »** : sous les deux tuiles, pleine largeur, texte secondaire de petite taille, **sans couleur d'alerte ni pastille** (information, pas anomalie). Rendue **seulement si le montant est > 0** (AC-FI-32). Pas d'interaction : elle n'ouvre aucun détail nominatif.
4. **Bloc « Par porteur »** : une ligne par porteur, sans carte, séparées par un filet.
   - À gauche : pastille d'icône (« BQ » pour une banque, « € » pour une caisse, comme dans l'export), puis un bloc `min-w-0` : nom du porteur (une ligne, `truncate`), puis détail (« établissement · type de compte » ou « Espèces · {responsable} », `truncate`). Le nom du responsable est le **nom affichable seulement** (AC-FI-06).
   - À droite (`shrink-0`, aligné à droite) : solde théorique en gras, puis « Compté {date courte} : {montant} » (dernier point, absent si jamais compté, AC-FI-16).
   - **Solde d'ouverture non saisi** : voir §6.
5. **Bouton « Faire un point de trésorerie »** : pleine largeur, `h-11` minimum (l'export le montre plus haut, à conserver), couleur d'action principale. **Présent seulement si `canRecordCheckpoint`.** Absent (pas de vide laissé) sinon.
6. **Bloc « Historique des points »** : une ligne par point, du plus récent au plus ancien : date longue à gauche (`min-w-0`, `truncate`), « Écart {±montant} » à droite (`shrink-0`). « Juste » si l'écart est nul. Le signe est **toujours écrit** (« + » ou « − ») ; la couleur (ambre dans l'export) n'est qu'un renfort. **Lignes statiques dans cette passe** (aucun détail par porteur, pas de débrief affiché) : voir O-FI-UI-02.

### 6. Saisie du solde d'ouverture (NON maquettée, proposée) — Trésorier seulement

**Principe** : pas d'écran ni de route de plus. Le solde d'ouverture est saisi **depuis la ligne du porteur** dans « Par porteur », parce que c'est là que l'anomalie est visible, et par composition de deux patrons existants (la ligne de porteur + la feuille basse d'un champ unique de `RecordDuePaymentDialog`).

- **État « Solde d'ouverture non saisi »** (pour un porteur sans solde d'ouverture pour la saison, AC-FI-29) :
  - Dans le bloc `min-w-0` de gauche, une **troisième ligne de texte** « Solde d'ouverture non saisi » (couleur d'attention, jamais seule : le texte est la mention).
  - Si `canRecordOpeningBalance` : un bouton **« Saisir »** (`h-11`, style secondaire, `shrink-0`) rendu **sous la ligne** (pleine largeur de la ligne, pas à droite) pour ne pas écraser le nom ni le solde sur écran étroit.
  - Si `!canRecordOpeningBalance` (Dirigeant, admin) : la mention seule, **aucun bouton**.
  - Le solde théorique affiché sur la ligne est calculé avec 0 (AC-FI-29) ; la mention suffit à prévenir.
- **Feuille « Solde d'ouverture »** (feuille basse, même contenant et même barre ancrée que « Nouvelle dépense », mais plus courte) :
  - Titre « Solde d'ouverture », « Annuler » en haut à droite (`h-11`).
  - Rappel en texte : « {nom du porteur} · Saison {libellé} ».
  - **Un seul champ** : montant (même grand champ numérique que la dépense, « € », ≥ 0, 2 décimales).
  - **Avertissement visible** sous le champ : « Ce montant ne pourra pas être modifié ensuite. » (la correction est hors périmètre, PO-FI-06 ; AC-FI-28 rend le contrôle absent après saisie). C'est la seule protection contre l'erreur de frappe ; pas de seconde confirmation.
  - Bouton ancré « Enregistrer le solde d'ouverture », inactif tant que le montant est vide ou invalide. États d'envoi et d'erreur identiques à la dépense (AC-FI-12 appliqué par analogie : feuille ouverte, valeur conservée, pas de double envoi).
- **Après saisie** : la feuille se ferme ; la mention « Solde d'ouverture non saisi » et le bouton **disparaissent** de la ligne ; solde théorique, disponible et ventilation Banque / Espèces sont à jour (AC-FI-30). Aucune ligne « Ouverture {montant} » n'est ajoutée à la ligne du porteur dans cette passe (voir O-FI-UI-04).
- **Dans la feuille « Point de trésorerie »** : la mention « Solde d'ouverture non saisi » est répétée en texte sous le nom du porteur concerné (AC-FI-29), **sans bouton** (le point n'est pas le lieu de la saisie).

### 7. Feuille « Point de trésorerie » (`Finances-1`) — Trésorier seulement

- **Contenant** : feuille basse, corps défilant, **barre ancrée « Enregistrer le point »** (`sticky bottom-0`, fond opaque, `h-11` minimum), « Annuler » en haut à droite (`h-11`).
- **Consigne** en tête : texte de l'export conservé.
- **Un bloc par porteur actif** :
  - Ligne d'intitulé : nom du porteur à gauche (`min-w-0`, `truncate`), « Théorique {montant} » à droite (**`whitespace-nowrap` et `shrink-0`**). Dans l'export, « Théorique 537 € » est coupé sur deux lignes ; ce défaut n'est **pas** à reproduire.
  - Ligne de saisie : champ montant (`flex-1`, **`min-w-0`**, `h-11`, « € » à droite, clavier décimal) **côte à côte** avec l'indicateur d'écart (`shrink-0`, largeur du texte). Le champ rétrécit, l'indicateur ne se coupe jamais.
  - **Indicateur d'écart** : « Juste » (vert) si constaté = théorique ; sinon écart signé en texte (« +12 € » / « −8 € », ambre) ; « — » tant que le champ est vide.
  - Mention « Solde d'ouverture non saisi » éventuelle sous le nom (§6).
- **« Total constaté »** : somme des champs, en grand, ligne séparée par des filets. Tant qu'un champ est vide, le total est celui des champs remplis et reste lisible (pas de « NaN »).
- **DÉBRIEF** : zone de texte multiligne, hauteur minimale de trois lignes, facultative, longueur maximale annoncée sous le champ (valeur au développement, PO-FI-12).
- **Pré-remplissage (écart avec l'export, voir O-FI-UI-01)** : l'export montre les champs **pré-remplis avec le théorique** (donc tout « Juste » à l'ouverture). Pour éviter de valider un point **sans avoir compté**, la proposition est de **laisser les champs vides**, avec le **théorique en placeholder** ; « Enregistrer le point » reste inactif tant qu'**un champ par porteur** n'est pas rempli (un « 0 » saisi est valide). C'est un défaut proposé, modifiable sans refonte.
- **États** : envoi (« Enregistrement… », bouton désactivé), erreur (feuille ouverte, valeurs et débrief conservés, message en français), succès (fermeture, historique et lignes « Compté … » à jour, AC-FI-20). Atomicité côté serveur (AC-FI-19).

### 8. Variante lecture seule (Dirigeant habilité, administrateur)

Même structure, mêmes données (AC-FI-03). **Ne sont pas rendus du tout** (jamais grisés, jamais masqués par CSS) :

| Contrôle absent | Piloté par |
|---|---|
| Bouton flottant `+` (et sa réserve de bas de page) | `canRecordExpense` |
| Puce « + Nouvelle », et donc toute la feuille « Nouvelle dépense » | `canRecordExpense` |
| Bouton « Saisir » le solde d'ouverture et sa feuille | `canRecordOpeningBalance` |
| Bouton « Faire un point de trésorerie » et sa feuille | `canRecordCheckpoint` |

Conséquences d'agencement : la liste de dépenses n'a pas de bas de page réservé ; l'onglet Trésorerie se termine par « Historique des points » sans trou à la place du bouton ; la mention « Solde d'ouverture non saisi » reste affichée **en information**. **Aucun message du type « lecture seule »** n'est ajouté : l'absence de contrôles suffit, comme sur `/dues`. Compte Trésorier + Dirigeant : écran complet avec contrôles (droits lus sur les rôles portés, §3).

### 9. Champ « Porteur » sur les deux formulaires de versement (NON maquetté, AC-FI-31)

- **Composant** : `Select` shadcn, **le même que « Moyen de paiement »** dans le même formulaire, placé **juste après lui**. Libellé « Porteur » (facultatif, sans astérisque). Valeur par défaut **« Non précisé »** (première entrée, valeur nulle), puis un item par porteur actif (nom seul, éventuellement suivi du type en texte secondaire).
- **Formulaire Trésorier mobile** (`RecordDuePaymentDialog`) : `SelectTrigger` **`h-11`**, items `min-h-11`, pleine largeur (pas de côte à côte avec un autre champ), comme le moyen de paiement actuel. Aucun autre changement du formulaire.
- **`RecordPaymentDialog` admin (desktop)** : même `Select` et même position, hauteur par défaut du backoffice (présentation desktop, hors règle des 44 px).
- **Aucun porteur configuré** (liste vide) ou **liste non lisible** : le champ n'est **pas rendu** (pas de `Select` vide) et le versement se comporte comme « Non précisé ».
- **Aucune mention du porteur** n'est ajoutée à `/dues` ni aux cartes de cotisation (AC-FI-26).

### 10. États chargement, vide, erreur

Le patron est celui de `TreasurerStateMessage` (même mise en forme que `/dues`).

| Situation | Rendu |
|---|---|
| **Chargement d'un onglet** | Squelettes à la forme du contenu (carte de synthèse, 4 lignes), **la coque (en-tête, sous-titre, onglets) reste affichée** ; l'autre onglet n'est pas bloqué. Aucun spinner plein écran |
| **Erreur de lecture d'un onglet** | Message en français dans la zone de l'onglet + bouton **« Réessayer »** (`h-11`) ; la coque reste affichée (AC-FI-22) |
| **Sans saison en cours** (PO-FI-09) | À la place des deux onglets, un message explicite « Aucune saison en cours. Les finances s'affichent dès qu'une saison est ouverte. » ; coque conservée, **aucun contrôle d'écriture** même pour le Trésorier |
| **Dépenses : saison sans dépense** | Carte à « 0 € », sans barre ni légende ; pas de rangée de filtres ; texte « Aucune dépense enregistrée cette saison. » ; pour le Trésorier seulement, ajout de « Touche + pour en ajouter. » (le `+` est affiché) |
| **Dépenses : filtre** | Les puces ne listent que des catégories ayant des dépenses, la liste filtrée n'est donc jamais vide |
| **Trésorerie : aucun porteur** | Disponible à « 0 € », texte « Aucun porteur n'est configuré. » à la place de « Par porteur » ; **pas** de bouton « Faire un point » (rien à compter), même pour le Trésorier (PO-FI-03) |
| **Trésorerie : aucun point** | Sous « Historique des points » : « Aucun point de trésorerie cette saison. » |
| **Erreur d'enregistrement dans une feuille** | Voir §4, §6, §7 : feuille ouverte, valeurs conservées, message en français |

Aucun état d'erreur n'est affiché comme un état vide, et inversement (AC-FI-09).

### 11. Mobile : cibles tactiles et champs côte à côte (récapitulatif pour mentor-agent)

- Cibles d'au moins **`h-11`** pour : segments d'onglets, puces de filtre, puces de catégorie / porteur / mode, champs, `SelectTrigger` et items, boutons « Ajouter », « Annuler », « Saisir », « Réessayer », « Afficher plus », « Faire un point », « Enregistrer … ». Le bouton flottant fait au moins 56 px.
- Paires côte à côte, **chaque item en `min-w-0`** et **rétrécissant à sa colonne** (jamais supposé tenir) : Libellé / Date (§4), champ montant / indicateur d'écart (§7), nom / solde d'un porteur (§5), libellé / montant d'une dépense (§3), date / écart d'un point (§5), tuiles Entrées / Sorties (§5), « Ce mois » / intitulé de la carte (§3), champ / boutons de la création de catégorie (§4, avec repli en pile).
- Éléments à largeur propre (`shrink-0`) : montants, « Théorique {montant} », indicateur d'écart, boutons ; ce sont les textes libres (libellés, noms) qui rétrécissent et se tronquent.
- En-tête `sticky top-0` opaque ; barres de validation des feuilles `sticky bottom-0` opaques.
- À vérifier sur un **viewport mobile réel (360 px)**, pas seulement sur une fenêtre desktop réduite.

### 12. Points ouverts d'interface

**Aucun bloquant.**

| Réf. | Question | Défaut retenu dans ce design |
|---|---|---|
| O-FI-UI-01 | Point de trésorerie : champs pré-remplis avec le théorique (export `Finances-1`) ou vides ? (PO-FI-10 le déléguait au design) | **Vides**, théorique en placeholder, enregistrement inactif tant qu'un champ par porteur n'est pas rempli (évite de valider sans compter). Écart assumé avec la maquette |
| O-FI-UI-02 | Historique des points : lignes statiques (date + écart) ou dépliables avec le détail par porteur (constaté, théorique figé, écart) et le débrief, selon le patron « N au total, le plus récent déplié » des convocations ? L'export est coupé au premier point et ne tranche pas. Le débrief est du texte libre lu par le Dirigeant (PO-FI-12) | **Lignes statiques** (périmètre de AC-FI-17). Le dépliage est un ajout simple si souhaité |
| O-FI-UI-03 | Longues listes de dépenses : « Afficher plus » par 20, ou tout afficher ? | « Afficher plus » par 20 (AC-FI-27) |
| O-FI-UI-04 | Afficher le solde d'ouverture saisi sur la ligne du porteur (« Ouverture {montant} ») pour que le Trésorier et le Dirigeant puissent réconcilier le disponible ? | Non dans cette passe (la ligne est déjà dense) ; à reconsidérer si les soldes semblent inexplicables |
| O-FI-UI-05 | Palette de couleurs de catégories : que se passe-t-il quand les catégories dépassent le nombre de couleurs ? (le texte porte déjà l'information) | Les couleurs se **répètent** cycliquement ; aucune ambiguïté car libellés et montants sont écrits |
| O-FI-UI-06 | **Dépendance au PO-FI-08** : le `Select` « Porteur » du `RecordPaymentDialog` admin lit la liste des porteurs, donc a besoin de la lecture financière. Si l'administrateur perdait `finances:read`, ce champ ne pourrait plus se remplir | Admin en lecture (défaut PO-FI-08) ; sinon prévoir une lecture dédiée de la seule liste des porteurs pour `payment:record` |
| O-FI-UI-07 | Feuilles : poignée de glissement visible dans les maquettes, que le `DialogContent` ancré en bas de `RecordDuePaymentDialog` n'a pas | Pas de poignée ni de fermeture par glissement (cohérence avec l'existant) ; fermeture par « Annuler » |
