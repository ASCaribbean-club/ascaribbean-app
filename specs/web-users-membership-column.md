# Spec — Amendement à `web-users` : **colonne d'adhésion de la saison en cours + redirection pré-filtrée**

> Statut : **amendement du 2026-09-18 à `specs/web-users.md`** (quatrième passe du même jour). **Ce fichier ne remplace pas `specs/web-users.md`** ni `specs/web-users-role-edit-remove.md` : il les amende section par section, et le §0 ci-dessous dit exactement ce qui devient caduc. Tout ce qui n'y est pas nommé reste valable tel quel.
> **Décision directe de la développeuse (2026-09-18, demande postérieure aux trois passes précédentes)** : **`/admin/users` ne crée ni ne renouvelle plus aucune adhésion.** Le point d'entrée « Créer / renouveler l'adhésion » de la colonne `ACTIONS` (§2.4 de `web-users`, `MembershipFormDialog` moins son champ `UTILISATEUR`, gardé par `'membership:write'`) est **retiré**. Il est remplacé par **une colonne** disant si le compte est adhérent **pour la saison en cours** (binaire), et, **quand il ne l'est pas**, par une **redirection vers `/admin/memberships` pré-filtrée sur ce compte**. **C'est une correction, pas un ajout** : elle annule une décision antérieure du même jour, elle ne s'empile pas dessus.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (module P0 « **Adhérents et licences** — Dossiers, statuts, pièces » ; module P0 « Authentification et profils » ; matrice RBAC ligne « **Gérer comptes, rôles, paramétrage** » = ✅ Administrateur, ❌ pour les sept autres), `docs/roles-personas-as-caribbean.md` (§ rôle Administrateur ; comptes multi-rôles), `specs/web-users.md` (§1, §2.2, §2.3, §2.4, §2.9, §2.10, §3, §4, AC-WU-13/14/16/17/19/20/21/22/37, PO-WU-04/06/07), `specs/web-users-role-edit-remove.md` (§0, §2.8, AC-WU-40 à AC-WU-54), `specs/web-memberships.md` (§1, §2.6, AC-WM-19/AC-WM-20/AC-WM-24/AC-WM-25, PO-WM-07), `specs/web-empty-state.md` (PO-WE-01), `CLAUDE.md` §3/§4/§5/§6/§7/§9.
> État du code lu pour cette passe : `domain/policies/user-completeness.ts`, `domain/repositories/user-repository.ts`, `data/mappers/user-mapper.ts` (`toMissingElementFacts`), `presentation/features/backoffice/users/{useBackofficeUsersViewModel.ts,components/UserTable.tsx,components/UserMissingElementIndicator.tsx}`, `presentation/features/backoffice/memberships/{BackofficeMembershipsPage.tsx,useBackofficeMembershipsViewModel.ts,useMembershipFormDialogViewModel.ts,useMembershipEditRowViewModel.ts,useRecordPaymentDialogViewModel.ts,components/MembershipFormDialog.tsx}`, `presentation/app/router.tsx`, `presentation/shared/query-keys.ts`.
> Maquettes : `docs/designs/DESIGN_LINKS.md` §2 porte **déjà** la ligne `web-users` au statut **`instantané seul`** → conformément au §4 du registre, **aucun lien artifact n'est demandé** et **aucune ligne n'est à ajouter** ; l'instantané local fait foi. Les cinq exports `docs/designs/desktop/users/[Admin] Web - Users - {1,2,3,4,5}.png` montrent **cinq colonnes, pas six**, et l'export **3** montre précisément le dialogue que cet amendement **supprime**. **La colonne et son contrôle de redirection sont donc à dessiner sans référence visuelle**, comme l'ont été l'icône d'avertissement de ligne (1ʳᵉ passe) et la pastille cliquable (3ᵉ passe) — §7.

## 0. Ce que cet amendement rend caduc

### Dans `specs/web-users.md`

| Emplacement | Texte actuel | Ce qu'il devient |
|---|---|---|
| **§1, « Entre au périmètre », item 3** | « **Le point d'entrée « Adhésion »**, qui **rebranche le domaine d'adhésion déjà livré** par `web-memberships` sans créer un seul use case de plus (§2.4). » | **Remplacé par** : « **La colonne « adhésion de la saison en cours »** — information binaire lue de la lecture d'annuaire déjà en place, et, pour un compte non adhérent, **un contrôle de redirection vers `/admin/memberships` pré-filtré sur ce compte** (§2 du présent amendement). **Aucune adhésion n'est créée, renouvelée ni modifiée depuis `/admin/users`.** » |
| **§1, « Ce que c'est »**, fin de phrase | « …lui assigner un rôle, **créer ou renouveler son adhésion**. » | « …lui assigner un rôle, **et voir s'il est adhérent pour la saison en cours — sans jamais écrire cette adhésion depuis cet écran**. » |
| **§1, tableau « Rattachement CDC »**, 2ᵉ ligne | « Point d'entrée « Adhésion » (créer / renouveler) — **Adhérents et licences** — P0 » | « **Colonne « adhésion saison en cours » (lecture) et renvoi vers `/admin/memberships`** — **Adhérents et licences** — P0. **Lecture et navigation seulement** : l'écriture reste entièrement sur `/admin/memberships` (`specs/web-memberships.md`) |
| **§1, « Ce que les maquettes montrent »**, ligne `ACTIONS` du tableau | « **Identique sur les six lignes** : un bouton « + Rôle », **un bouton « Adhésion »**, et une icône crayon » | Reste la description **factuelle de la maquette** (elle montre bien trois contrôles) — mais **la maquette n'est plus conforme au périmètre sur ce point** : la colonne `ACTIONS` livrée en porte **deux** (§2.4 du présent amendement). À lire comme un écart **délibéré et postérieur** à la maquette, pas comme une omission. |
| **§1, « Ce que les maquettes montrent »**, dialogue **3** | « **« Créer / renouveler l'adhésion »** (export 3) — quatre champs… » | Reste la description factuelle de l'export 3, mais **ce dialogue n'est plus au périmètre de `/admin/users`** (il reste en production sur `/admin/memberships` sous son autre titre, « Nouvelle adhésion », inchangé). |
| **§2.4** (« Le point d'entrée « Adhésion » — frontière avec `web-memberships`, à ne pas franchir ») | section entière | **Remplacée par le §2 du présent amendement.** Le **principe de frontière reste identique et se trouve renforcé, pas affaibli** — voir §2.2 ci-dessous. |
| **§2.10**, puce « Invalidations croisées » | « …**créer une adhésion** invalide en plus `membershipsAdminList` et `membershipsBadgeCount` » | **Supprimée pour sa partie adhésion** : plus aucune écriture d'adhésion n'existe sur cet écran. **Remplacée par l'invalidation inverse**, §2.5 ci-dessous. |
| **§3**, dernier paragraphe du bloc d'entrées de matrice | « **`'membership:write'` est réutilisée telle quelle** pour le bouton « Adhésion » (§2.4) — aucune action d'adhésion supplémentaire. » | **Remplacé par** : « **`'membership:write'` n'est plus consommée par cet écran.** Elle reste **inchangée** dans la matrice, propriété de `specs/web-memberships.md` et de son seul écran (§3 du présent amendement). » |
| **AC-WU-13**, **AC-WU-14** | critères du dialogue d'adhésion sur `/admin/users` | **Caducs — voir AC-WU-55.** Ni l'un ni l'autre n'a plus d'objet : le dialogue n'existe plus sur cet écran. |
| **AC-WU-19** | « …« Adhésion » sur `can(user, 'membership:write')` » | **Amendé — voir AC-WU-56.** Les trois autres booléens (`user:invite`, `user:write`, `role:assign`) restent inchangés. |
| **AC-WU-21** | « **Créer ou renouveler une adhésion depuis cet écran** invalide aussi `membershipsAdminList`, `membershipsBadgeCount`… » | **Amendé — voir AC-WU-59.** Le sens s'inverse : c'est `/admin/memberships` qui doit désormais invalider `usersAdminDirectory` et `usersBadgeCount`. |
| **AC-WU-10** | « …`'membership:write'` **sont réutilisées inchangées** » | Reste **vrai pour la matrice** (l'action n'est ni modifiée ni supprimée), **faux pour cet écran** (il ne la consomme plus). Précisé par AC-WU-56. |
| **`## UI design`** | — | **Non touchée par cet amendement** : c'est le travail de designer-agent, à la passe suivante. **Ce qui y est désormais périmé est listé au §7**, ligne par ligne, pour que la passe designer sache exactement quoi reprendre. |

### Dans `specs/web-users-role-edit-remove.md`

| Emplacement | Ce qu'il devient |
|---|---|
| **§1, « Ce qui reste hors périmètre »**, dernière puce (« La colonne `ACTIONS`, le dialogue d'invitation, le dialogue de fiche, **le dialogue d'adhésion**… : aucun ne change ») | La mention « le dialogue d'adhésion » devient **sans objet** (ce dialogue n'existe plus sur cet écran) ; la colonne `ACTIONS`, elle, **change** — elle passe de trois à deux contrôles (§2.4). Le reste de la puce est inchangé. |
| **§1, « Ce que c'est »** (« Ni un bouton de ligne supplémentaire dans la colonne `ACTIONS` — **elle en porte déjà trois** ») | « elle en porte **deux** » — le raisonnement (ne pas ajouter un énième bouton de ligne) est **inchangé et même conforté**. |
| Tout le reste — §2, §3, §4, §5 (AC-WU-40 à AC-WU-54), §6 (PO-WU-12, PO-WU-13), §7 | **Inchangé.** Cet amendement ne touche ni aux rôles, ni aux pastilles, ni à aucune politique RLS. |

## 1. Périmètre

### Ce que c'est

Deux choses, et **rien d'autre** :

1. **Une colonne de plus** dans le tableau de `/admin/users`, disant **si le compte est adhérent pour la saison en cours** — **binaire** (adhérent / non adhérent), **jamais** le détail de statut d'adhésion (`En attente` / `Active` / `Suspendue`) que `/admin/memberships` rend déjà dans sa propre colonne `STATUT`.
2. **Un contrôle de redirection**, rendu **uniquement sur les lignes non adhérentes**, qui navigue vers **`/admin/memberships` pré-filtré sur ce compte**.

### Ce que ça retire

**Le dialogue « Créer / renouveler l'adhésion » de la colonne `ACTIONS`**, entièrement : son bouton, son ouverture, son pré-liage d'utilisateur, et le garde `'membership:write'` qui le conditionnait. **Aucune écriture d'adhésion ne part plus de `/admin/users`.**

### Rattachement CDC

| Élément | Module CDC | Priorité |
|---|---|---|
| Colonne « adhérent pour la saison en cours » (**lecture**) | **Adhérents et licences** — « Dossiers, statuts, pièces » | **P0** |
| Redirection vers la console d'adhésions | **Adhérents et licences** (navigation interne au backoffice) — **aucun module propre** : le backoffice est une surface de rendu, pas un module (`specs/web-empty-state.md` §1) | — |
| Ligne de matrice applicable | « **Gérer comptes, rôles, paramétrage** » — ✅ Administrateur, ❌ pour les sept autres | — |

**Aucun nouveau module, aucune nouvelle priorité, et surtout : aucune nouvelle capacité.** Cet amendement **réduit** la surface d'écriture de `/admin/users`.

### Hors périmètre — explicitement

- **Toute création, tout renouvellement, toute modification d'adhésion depuis `/admin/users`.** C'est l'objet même de l'amendement.
- **Le détail de statut d'adhésion** (`En attente` / `Active` / `Suspendue`), le numéro de licence, la date de validité, la cotisation, les paiements : **rien de tout cela n'entre dans la nouvelle colonne**, tout cela reste sur `/admin/memberships`.
- **Un filtre sur la nouvelle colonne.** L'écran garde **exactement** sa recherche et ses **deux** filtres (rôle, statut d'activation) — `web-users` §1/AC-WU-15. Aucun troisième filtre n'est ajouté ; rien ne le demande.
- **Toute modification du comportement de `/admin/memberships` en navigation directe.** Sans paramètre d'URL, cet écran se comporte **exactement comme aujourd'hui** (§2.3, AC-WU-58).
- **Le champ de recherche de `/admin/memberships`** — il **n'existe pas** (§2.3). Cet amendement **n'en crée pas un** : il pose la question au §6 (PO-WU-14) plutôt que d'ajouter, sans arbitrage, un contrôle à un écran déjà livré et déjà figé par une maquette qui n'en montre aucun.
- **Le journal d'audit** : toujours PO-WU-07, inchangé (§4).

## 2. Modèle et règles

### 2.1 Le fait existe déjà — **aucun calcul de domaine n'est inventé**

C'est le point central de cet amendement, et il conditionne tout le reste : **la donnée que la nouvelle colonne rend est déjà chargée, déjà calculée, et déjà affichée ailleurs sur la même ligne.**

`AdminUserDirectoryEntry.missingElementFacts` (lecture `findAdminDirectory(currentSeasonId)`, `web-users` §2.2/§2.10) porte déjà les quatre faits de complétude du §2.3, dont :

```
hasMembershipForCurrentSeason: boolean   // critère 2 : memberships × current_season()
```

Trois conséquences, dans l'ordre :

1. **La colonne est un rendu, pas un calcul.** Elle lit `row.missingElementFacts.hasMembershipForCurrentSeason` — **le même booléen** que `UserMissingElementIndicator` consomme déjà pour le critère 2 (« Aucune adhésion pour la saison en cours »). **Aucune seconde lecture, aucun second prédicat, aucune nouvelle méthode de repository, aucune nouvelle `queryKey`** (AC-WU-55). Deux calculs séparés divergeraient au premier cas limite — même exigence qu'AC-WU-17, ici satisfaite gratuitement.
2. **`UserRepository` ne change pas d'un caractère.** `findAdminDirectory()` et `findMissingElementFacts()` gardent leur signature et leur comportement, `MissingElementFacts` ne gagne aucun champ, `AdminUserDirectoryEntry` non plus.
3. **La redondance avec l'infobulle de l'icône d'avertissement est assumée, exactement comme celle du critère 4 avec la colonne `STATUT`.** Une ligne non adhérente affichera « non adhérente » dans la nouvelle colonne **et** « Aucune adhésion pour la saison en cours » dans l'infobulle de l'icône. **L'infobulle n'est pas amputée de ce critère** (pas plus que le critère 4 n'a été retiré au titre de sa redondance avec `STATUT`, §2.3 de `web-users`) : l'icône dit « ce dossier est incomplet, voici pourquoi », la colonne dit « voici l'état de l'adhésion, et voici où agir ». Deux fonctions, une seule source de vérité (AC-WU-57).

**Sémantique exacte, à ne pas arrondir : « adhérent » ici signifie « une ligne d'adhésion non archivée existe pour la saison en cours », pas « son adhésion est active ».** Une adhésion `En attente` ou `Suspendue` fait donc lire « adhérent » dans cette colonne. C'est la reprise **littérale** du critère 2 tel que la développeuse a demandé de le réutiliser, et c'est ce qui garantit qu'aucun second calcul n'apparaît — mais **le libellé de la colonne ne doit surtout pas laisser croire à une adhésion valide ou à jour** (§7, PO-WU-15).

### 2.2 La frontière avec `web-memberships` — **renforcée par ce changement, pas affaiblie**

Le §2.4 de `web-users` posait : « **cet écran ne crée aucune ressource, aucun use case, aucune politique RLS d'adhésion** ; il **rebranche** ce qui est déjà livré ». Cette position tenait, mais au prix d'une exception : un **formulaire d'écriture d'adhésion** vivait sur un écran dont ce n'est pas le domaine, et il fallait trois puces de mise en garde (AC-WM-35 applicable à l'identique, PO-WM-02 non tranché, invalidations croisées) pour que l'exception reste sûre.

**La nouvelle forme supprime l'exception au lieu de la border** :

| Avant (§2.4 de `web-users`) | Après (cet amendement) |
|---|---|
| `/admin/users` **ouvre un formulaire d'écriture** d'adhésion | `/admin/users` **lit un booléen** et **navigue** |
| `CreateMembershipUseCase`/`UpdateMembershipUseCase` appelés depuis cet écran | **aucun use case d'adhésion appelé depuis cet écran** |
| `'membership:write'` consommée par cet écran | **plus consommée du tout ici** (§3) |
| AC-WM-35 (règle d'activation) applicable **depuis deux écrans** | applicable **depuis un seul**, celui qui la porte |
| PO-WM-02 (adhésion sans montant dû ⇒ `active` ?) heurté **depuis deux écrans** | heurté depuis `/admin/memberships` **seul**, là où il a toujours eu sa place |
| PO-WU-06 (« créer/renouveler seulement, ou modifier aussi ? ») | **sans objet — clos par cet amendement** (§6) |

**La règle à écrire, et à ne plus contourner : `/admin/users` gère des comptes et des rôles ; `/admin/memberships` gère des adhésions. Un écran qui a besoin de l'autre y renvoie, il ne réimplante pas son formulaire.** C'est la même discipline que `/admin/teams` applique déjà (il assigne un coach, il n'édite pas un compte).

### 2.3 La redirection pré-filtrée — **et une correction factuelle à ne pas passer sous silence**

**La demande suppose que `/admin/memberships` porte déjà un champ de recherche à initialiser. Ce n'est pas le cas.** Vérification faite sur le code livré (`BackofficeMembershipsPage.tsx`, `useBackofficeMembershipsViewModel.ts`) et sur `specs/web-memberships.md` (§1, AC-WM-19) : cet écran porte **trois `Select` de filtre** — saison, statut, cotisation — et **aucun champ de recherche texte**, ni dans le code, ni dans la spec, ni dans les quatre exports de maquette. Le seul champ de recherche du backoffice est celui, **inerte et hors périmètre**, de la barre supérieure (AC-WE-15).

Il n'y a donc **rien à « initialiser »** : le mécanisme de réception est **à créer**. Deux formes possibles, une seule retenue ici.

#### a. Forme retenue — **un paramètre d'URL portant l'identifiant du compte, branché sur la chaîne de filtres existante**

- **`/admin/memberships?user=<userId>`** — l'identifiant, jamais le nom. `/admin/users` **détient déjà** l'identifiant de la ligne (`AdminUserDirectoryEntry.id`) ; un filtre par nom serait **ambigu** (deux homonymes, un nom partiel) et ferait de surcroît transiter un **nom de personne dans une URL**, ce qu'aucune autre route de ce dépôt ne fait (`CLAUDE.md` §9 vise le code et la documentation, mais l'esprit vaut ici aussi).
- **Lecture du paramètre dans le ViewModel**, via le `useSearchParams` de React Router (**déjà la dépendance de routage du projet**, `CLAUDE.md` §2 — aucune librairie à ajouter), au même endroit que les trois filtres actuels.
- **Application dans la chaîne de filtres déjà écrite**, une ligne de plus, du même ordre que les trois existantes : `if (userFilter && row.membership.userId !== userFilter) return false`. **Aucune nouvelle lecture, aucune nouvelle `queryKey`, aucun changement de repository, aucune modification de `MembershipRepository.findAllForAdmin()`** — la liste est déjà chargée en entier et filtrée côté client pour les trois autres critères.
- **`isFilterActive` en tient compte**, pour que l'état « aucun résultat » affiche bien « Aucune adhésion ne correspond à ces filtres » et non le message de démarrage de club (AC-WM-25 reconduit, AC-WU-58).
- **Aucun paramètre ⇒ comportement strictement identique à aujourd'hui** : filtre de saison sur la saison en cours (AC-WM-20), filtres statut/cotisation sur « tous », `isFilterActive` faux. **C'est la condition non négociable de cet amendement** (AC-WU-58) — un écran déjà livré ne change pas de comportement en navigation directe.

#### b. **Le filtre appliqué doit être visible et effaçable** — et c'est là que designer-agent intervient

Un filtre actif **qu'aucun contrôle de l'écran ne montre** est un piège : l'administrateur voit une liste de quatre lignes ramenée à une seule, sans savoir pourquoi ni comment revenir en arrière. **La spec exige donc que l'état filtré soit énoncé à l'écran et annulable en un geste** ; **la forme exacte est le travail de designer-agent** (§7). Ce qui est imposé, et seulement cela :

- l'écran **dit** qu'il est restreint à un compte, en nommant ce compte **lu à l'exécution** depuis la ligne d'adhésion ou l'annuaire, **jamais un nom codé en dur** (`CLAUDE.md` §9, AC-WU-26 reconduit) ;
- un **contrôle d'annulation** rend la liste complète, **et retire le paramètre de l'URL** (pas seulement de l'état local — sans quoi un rechargement de page ré-appliquerait le filtre effacé) ;
- l'annulation ramène l'écran à son état par défaut (**saison en cours**), pas à un état « toutes saisons » inventé au passage.

#### c. **Le cas qui va arriver à chaque fois, et qu'il faut traiter** : l'atterrissage vide

Le contrôle de redirection n'est rendu **que** sur une ligne **non adhérente pour la saison en cours**. Or `/admin/memberships` se positionne par défaut **sur la saison en cours** (AC-WM-20). **L'atterrissage nominal est donc une liste vide** : saison en cours × ce compte = zéro ligne, par construction.

Ce n'est **pas** un défaut à corriger en trichant sur le filtre de saison — c'est l'information exacte (« ce compte n'a effectivement rien pour cette saison »). Mais l'écran doit l'**énoncer utilement** plutôt que d'afficher un « aucun résultat » générique qui donnerait l'impression d'un bug :

- **l'état vide filtré existe déjà** (`BackofficeEmptyState`, « Aucune adhésion ne correspond à ces filtres », AC-WM-25) — c'est lui qui est rendu, **pas** l'état de démarrage de club ;
- **il doit rendre l'action suivante atteignable** : le bouton « Nouvelle adhésion » de l'en-tête est **déjà** présent et déjà rendu indépendamment de la liste (`BackofficeMembershipsPage.tsx`) — **rien à ajouter pour ça**. Le seul point à trancher est s'il doit **pré-sélectionner** le compte ciblé → **PO-WU-16** (§6), non bloquant : sans arbitrage, l'administrateur choisit le compte dans la liste déroulante `UTILISATEUR`, exactement comme aujourd'hui.

#### d. Le cas « aucune saison en cours » — **pas de redirection, pas de faux signal**

`toMissingElementFacts()` force `hasMembershipForCurrentSeason` à `false` quand aucune saison n'est en cours (`currentSeasonId === null`). **Rendu tel quel, cela ferait lire « non adhérent » sur la totalité des comptes du club pendant la césure estivale, chacun offrant une redirection vers un écran où il n'y a aucune saison à laquelle rattacher quoi que ce soit.**

**Décision : quand aucune saison n'est en cours, la colonne rend un état neutre, non actionnable** — ni « adhérent », ni « non adhérent », **et aucun contrôle de redirection** (AC-WU-57). Ce n'est pas une exception inventée : c'est l'application au rendu du **repli déjà écrit** au §2.3 de `web-users` (« les critères 2 et 3 sont **inévaluables** »). La valeur `currentSeasonId === null` est **déjà disponible dans le ViewModel** (`currentSeasonQuery`), aucune lecture supplémentaire n'est nécessaire.

**Effet de bord constaté, à signaler sans le corriger ici** : le **même repli n'est pas appliqué à l'icône d'avertissement ni au badge**, qui comptent aujourd'hui *tous* les comptes comme incomplets quand aucune saison n'est en cours — l'implémentation livrée et le texte du §2.3 de `web-users` ne disent pas la même chose sur ce point. **Hors périmètre de cet amendement** (ni l'icône ni le badge n'y sont touchés), mais consigné → **PO-WU-17**.

### 2.4 La colonne `ACTIONS` passe de trois contrôles à deux

| Contrôle | Avant | Après |
|---|---|---|
| **« + Rôle »** | présent, `canAssignRole` | **inchangé** |
| **« Adhésion »** | présent, `canWriteMembership` | **retiré** — l'information migre dans sa propre colonne, l'action migre sur `/admin/memberships` |
| **Icône crayon** | présent, `canWriteUser` | **inchangé** |

**L'information d'adhésion n'est pas une action de ligne : c'est un état.** Elle n'avait sa place dans `ACTIONS` que tant que le point d'entrée était un formulaire. Deux conséquences de forme, à ne pas rater :

- le conteneur de la colonne garde son `min-w-0` et ses cibles `h-11` (`CLAUDE.md` §6), avec **un élément de moins** ;
- **aucun quatrième contrôle n'est ajouté ailleurs** : le contrôle de redirection vit **dans la nouvelle colonne**, sur la cellule elle-même, **jamais** dans `ACTIONS` (AC-WU-56). C'est la même règle que celle déjà posée pour le retrait de rôle (AC-WU-41 : « jamais par un quatrième bouton dans la colonne `ACTIONS` »).

### 2.5 Invalidations — **le sens s'inverse**

Aujourd'hui, c'est `/admin/users` qui rafraîchit les données d'adhésion après une écriture faite chez lui (`closeMembershipDialog()` invalide `usersAdminDirectory()` et `usersBadgeCount()`). **Ce chemin disparaît avec le dialogue.** Sans contrepartie, un administrateur qui suit la redirection, crée l'adhésion sur `/admin/memberships`, puis revient sur `/admin/users` par la navigation latérale, **verrait une colonne et un badge périmés**.

**Les écritures d'adhésion de `/admin/memberships` doivent donc désormais invalider aussi les deux clés de `/admin/users`** (AC-WU-59) :

| Écriture | Invalide déjà | Doit invalider **en plus** |
|---|---|---|
| **Créer une adhésion** (`useMembershipFormDialogViewModel`) | `membershipsAdminList`, `membershipsBadgeCount` | **`usersAdminDirectory()`**, **`usersBadgeCount()`** — critères 2 **et** 3 |
| **Modifier une adhésion** (`useMembershipEditRowViewModel`) | `membershipsAdminList`, `membershipsBadgeCount` | **`usersAdminDirectory()`**, **`usersBadgeCount()`** — le numéro de licence y est éditable, donc le critère 3 bascule |
| **Archiver une adhésion** (`useBackofficeMembershipsViewModel`) | `membershipsAdminList`, `membershipsBadgeCount` | **`usersAdminDirectory()`**, **`usersBadgeCount()`** — archiver la seule adhésion de la saison en cours fait basculer le critère 2 |
| **Enregistrer un paiement** (`useRecordPaymentDialogViewModel`) | `membershipPayments(id)`, `membershipPaymentsAdminList`, `membershipsBadgeCount` | **rien** — aucun des quatre critères de complétude ne dépend d'un paiement (§2.3 de `web-users`). **Ne pas l'ajouter « par symétrie »** |

Toutes via les clés **centralisées** de `presentation/shared/query-keys.ts`, **jamais inline** (AC-WU-21 reconduit dans son principe). **Aucune nouvelle clé n'est créée** : `usersAdminDirectory()` et `usersBadgeCount()` existent déjà.

**À dire franchement, parce que c'est un couplage qu'on ajoute** : trois ViewModels de `/admin/memberships` vont désormais nommer deux clés qui appartiennent à un autre écran. C'est **exactement** ce que faisait déjà l'inverse (le ViewModel de `/admin/users` nommait `membershipsAdminList`/`membershipsBadgeCount`), et c'est ce que `web-users-role-edit-remove.md` §2.8 fait déjà avec `coachAssignmentsAdminList` pour `/admin/teams`. Le patron du dépôt est **des clés centralisées qu'un écran invalide quand son écriture affecte un autre écran** — pas un bus d'évènements, pas une invalidation globale.

### 2.6 Ce qui devient du code mort — **à retirer, pas à laisser dormir**

Le pré-liage d'utilisateur de `MembershipFormDialog` (`presetUserId`, et le paramètre jumeau de `useMembershipFormDialogViewModel`) **n'a été ajouté que pour `/admin/users`** — ses propres commentaires le disent (« specs/web-users.md §2.4/AC-WU-14… Undefined on /admin/memberships »). Il porte aussi le **titre conditionnel** « Créer / renouveler l'adhésion » vs. « Nouvelle adhésion ».

Une fois le point d'entrée retiré, **`/admin/memberships` est le seul appelant et ne passe jamais ce paramètre**. Deux issues, et **l'arbitrage appartient à PO-WU-16** (§6) :

- **si PO-WU-16 est tranché « non »** (la redirection ne pré-sélectionne pas le compte dans « Nouvelle adhésion ») → **`presetUserId`, son titre conditionnel et le rendu conditionnel du champ `UTILISATEUR` sont retirés** : du code mort conservé « au cas où » finit par être recâblé au hasard par un contributeur ultérieur ;
- **si PO-WU-16 est tranché « oui »** → **le paramètre est conservé et réemployé tel quel**, alimenté cette fois par le paramètre d'URL au lieu d'une ligne de tableau — **aucune réécriture**, le champ `UTILISATEUR` disparaissant du dialogue exactement comme il le fait aujourd'hui.

**Dans les deux cas, `MembershipRepository`, les use cases d'adhésion et les politiques RLS d'adhésion ne changent pas d'un caractère** (AC-WU-60).

## 3. RBAC

La ligne de matrice CDC applicable est **inchangée**, et reste la plus nette du référentiel :

| Ligne de la matrice RBAC (CDC) | Joueur | Coach | Resp. section | Dirigeant habilité | Trésorier | Réf. médical | Bénévole | **Administrateur** |
|---|---|---|---|---|---|---|---|---|
| **Gérer comptes, rôles, paramétrage** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |

### Aucune entrée de matrice n'est ajoutée, **et une dépendance est retirée**

- **Aucune nouvelle action, aucune nouvelle entrée, aucune nouvelle politique RLS.** Cet amendement **ne crée aucune capacité**.
- **La lecture de la nouvelle colonne** vient de la lecture d'annuaire **déjà en place** (`findAdminDirectory`), servie par les branches `or private.is_admin()` **existantes** de `users_select_own`/`user_roles_select_own` et par la lecture administrative d'adhésion déjà ouverte — **RLS seule, sans entrée de matrice**, exactement comme le §3 de `web-users` l'a déjà justifié pour l'annuaire et pour le comptage du badge (AC-WU-01 reconduit). Le critère de `rbac-matrix.ts` (« une action mérite une ligne seulement si `presentation/` doit décider quelque chose avant ou indépendamment du résultat de la requête ») n'est pas satisfait ici : il n'y a rien à décider, la donnée est déjà dans la réponse.
- **La redirection n'est pas une capacité.** Naviguer vers un écran **déjà autorisé par ailleurs** (`/admin/memberships` est gardé par `'backoffice:access'`, comme `/admin/users`) n'ajoute rien : le même acteur, sur la même session, peut déjà atteindre cet écran par la navigation latérale. **Aucune action `can()` ne garde un lien interne dans ce dépôt**, et cet amendement n'inaugure pas l'inverse.
- **`'membership:write'` n'est plus consommée par `/admin/users`.** Vérification faite sur le code livré : sur cet écran, `canWriteMembership` **n'a qu'un seul consommateur**, le bouton « Adhésion » de `UserTable` — il ne gardait **aucune lecture** (la colonne d'adhésion n'existait pas) et **aucun autre contrôle**. Le retrait du bouton **retire donc la dépendance en entier** : le booléen `canWriteMembership` disparaît du ViewModel de cet écran, et la prop correspondante de `UserTable` avec lui (AC-WU-56).
- **L'action elle-même n'est ni supprimée, ni modifiée, ni renommée** : `'membership:write': ['admin']` reste dans la matrice, avec son commentaire et ses deux politiques (`memberships_insert_admin`, `memberships_update_admin`), **propriété de `specs/web-memberships.md`** et consommée par `/admin/memberships` seul. Retirer l'entrée serait une régression sur l'autre écran (AC-WU-60).

### Tableau par rôle

| Rôle | Atteint `/admin/users` | Lit la colonne d'adhésion | Suit la redirection | Crée/renouvelle une adhésion **depuis `/admin/users`** | Crée/renouvelle une adhésion **sur `/admin/memberships`** |
|---|---|---|---|---|---|
| Joueur/Joueuse | ❌ | ❌ | ❌ | ❌ | ❌ |
| Coach/Staff | ❌ | ❌ | ❌ | ❌ | ❌ |
| Responsable de section | ❌ (PO-WE-01) | ❌ | ❌ | ❌ | ❌ |
| Dirigeant habilité | ❌ (PO-WE-01) | ❌ | ❌ | ❌ | ❌ *dans cette passe* — **✅ au CDC** (PO-WM-08, inchangé) |
| Trésorier | ❌ (PO-WE-01) | ❌ | ❌ | ❌ | ❌ |
| Référent médical | ❌ | ❌ | ❌ | ❌ | ❌ |
| Bénévole | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Administrateur** | ✅ | ✅ (RLS seule) | ✅ (écran déjà autorisé) | **❌ — plus aucun chemin** | ✅ `'membership:write'` |

**Note de prudence pour le jour où PO-WE-01 sera tranché** : si `/admin/*` s'ouvrait un jour écran par écran à d'autres rôles, un acteur pourrait atteindre `/admin/users` sans atteindre `/admin/memberships` — le contrôle de redirection deviendrait alors un cul-de-sac. **Rien n'est construit aujourd'hui pour ce cas** (les deux écrans partagent le même garde, `'backoffice:access'`) et **aucun garde spéculatif n'est ajouté** (`CLAUDE.md` §7) ; c'est une conséquence à reprendre **dans** l'arbitrage de PO-WE-01, pas avant.

### Comptes multi-rôles

Sans effet propre. L'accès dépend de la **présence** du rôle `admin`, pas du rôle actif (PO-WE-06, inchangé). Corollaire déjà posé et toujours vrai : **un administrateur voit sa propre ligne**, donc sa propre colonne d'adhésion, et peut suivre sa propre redirection — rien n'exige de le masquer, rien n'exige de le permettre autrement (même position que celle déjà retenue pour le dialogue de fiche et pour le retrait de rôle).

## 4. Données sensibles

| Nature | Cet amendement | Conséquence |
|---|---|---|
| **Données de santé** | Aucune | Aucun trigger d'audit d'accès, aucun filtre de colonne |
| **Données financières** | **En recul.** L'écran **n'écrit plus** de ligne d'adhésion (module P1 « Cotisations » par ricochet, §4 de `web-users`). Il **ne rend toujours aucun montant, aucun paiement, aucune date de validité, aucun numéro de licence** — seulement l'**existence** d'une adhésion pour la saison en cours | `RETENTION_PURGE.md`, ligne « Données financières » : exigences de `web-memberships` §4 **reconduites, non étendues**, et **une surface d'écriture de moins** |
| **Données nominatives** | **Aucune surface nouvelle.** Le fait rendu par la colonne est **déjà affiché** sur la même ligne, dans l'`aria-label` et l'infobulle de l'icône d'avertissement (« Aucune adhésion pour la saison en cours ») — cet amendement le **promeut en colonne**, il ne l'expose pas pour la première fois | **Aucun chemin d'export ajouté** (AC-WU-27 reconduit). **Aucun nom de personne** dans une URL : le paramètre porte un **identifiant**, jamais un nom (§2.3a) |
| **Journal d'audit** | **Exigence inchangée, exposition en baisse** | Voir ci-dessous |

**PO-WU-07 n'est ni aggravé ni résolu — pour la première fois de la journée, il recule d'un cran.** Le CDC §11.3 nomme « création/suppression compte » et « changement de rôle » ; la création d'adhésion n'y figure pas nommément (c'est « modification paiement » que `web-memberships` avait atteint). Mais le fait demeure : **une action journalisable de moins part de cet écran**, puisque plus aucune écriture d'adhésion n'y a lieu. Les chemins réellement exposés de `/admin/users` restent l'**invitation**, la **modification de fiche**, l'**assignation**, la **modification de portée** et le **retrait** de rôle — inchangés, toujours non tracés, toujours **PO-WU-07**, toujours **bloquant avant mise en production**.

**La lecture n'est pas journalisée**, et ce n'est pas un oubli : le CDC ne trace la **consultation** que pour la donnée de santé (§4 de `web-users`). Afficher une colonne binaire d'adhésion n'est pas un « export nominatif » au sens du §11.3.

**Noms de personnes** : aucun dans un libellé, une URL, une copie ou une fixture de test — le nom du compte filtré sur `/admin/memberships` est **lu à l'exécution**, jamais codé en dur (AC-WU-26 reconduit, `CLAUDE.md` §9).

## 5. Critères d'acceptation

Numérotation **continuée** depuis `specs/web-users-role-edit-remove.md` (dernier existant : **AC-WU-54**).

**Retrait du point d'entrée d'adhésion**

- **AC-WU-55** — *(rend caducs AC-WU-13 et AC-WU-14)* **Aucun chemin de `/admin/users` ne crée, ne renouvelle ni ne modifie une adhésion** : le bouton « Adhésion » de la colonne `ACTIONS`, l'ouverture de `MembershipFormDialog` depuis cet écran et l'état de dialogue associé dans le ViewModel **n'existent plus** — **pas même désactivés, pas même derrière un booléen toujours faux**. `CreateMembershipUseCase` et `UpdateMembershipUseCase` **ne sont appelés depuis aucun fichier de `presentation/features/backoffice/users/`**. Vérifiable par recherche.
- **AC-WU-56** — *(amende AC-WU-19)* La colonne `ACTIONS` porte **exactement deux** contrôles : « + Rôle » (`canAssignRole`, `'role:assign'`) et l'icône crayon (`canWriteUser`, `'user:write'`). Le booléen `canWriteMembership` et la prop `UserTable` correspondante **sont retirés de cet écran** ; **aucun autre élément de `/admin/users` ne consomme `'membership:write'`**. Les trois autres booléens restent **séparés**, jamais fusionnés (AC-WU-19 reconduit pour eux), et un contrôle non autorisé **disparaît**, il n'apparaît pas grisé. **Aucun contrôle de redirection n'est placé dans `ACTIONS`** : il vit dans la nouvelle colonne (AC-WU-57).

**Nouvelle colonne**

- **AC-WU-57** — Le tableau rend **une sixième colonne**, dont la valeur est lue **exclusivement** de `row.missingElementFacts.hasMembershipForCurrentSeason` — **le même booléen que celui du critère 2 d'AC-WU-37** : **aucune nouvelle méthode de repository, aucun nouveau prédicat de domaine, aucun champ ajouté à `MissingElementFacts` ni à `AdminUserDirectoryEntry`, aucune nouvelle `queryKey`**. Trois états rendus, et trois seulement :
  1. **adhérent pour la saison en cours** → état informatif, **aucun contrôle de redirection** ;
  2. **non adhérent** → contrôle de redirection (AC-WU-58) ;
  3. **aucune saison en cours** (`currentSeasonId === null`) → **état neutre non actionnable**, ni « adhérent » ni « non adhérent », **sans contrôle de redirection** (§2.3d).
  La colonne **ne rend jamais** le statut d'adhésion (`En attente`/`Active`/`Suspendue`), ni licence, ni montant, ni date. **L'infobulle de `UserMissingElementIndicator` n'est pas amputée** de son critère 2 au titre de la redondance (§2.1 point 3) — même discipline que le critère 4 vis-à-vis de la colonne `STATUT`. Ni le statut, ni cette colonne ne sont **jamais portés par la couleur seule** (AC-WU-28 reconduit).

**Redirection et écran d'arrivée**

- **AC-WU-58** — Le contrôle d'une ligne **non adhérente** navigue vers **`/admin/memberships` pré-filtré sur ce compte**, par un **paramètre d'URL portant l'identifiant du compte** (jamais son nom, §2.3a). Sur `/admin/memberships` : le paramètre **restreint la liste déjà chargée** via la chaîne de filtres existante (aucune nouvelle lecture, aucune nouvelle `queryKey`, `MembershipRepository` inchangé), **compte comme filtre actif** (l'état vide rend « Aucune adhésion ne correspond à ces filtres », AC-WM-25, jamais l'état de démarrage de club), **est énoncé à l'écran** en nommant le compte **lu à l'exécution**, et **est annulable en un geste** — l'annulation **retire le paramètre de l'URL** et ramène l'écran à son état par défaut (**saison en cours**, AC-WM-20). **Sans paramètre, `/admin/memberships` se comporte exactement comme aujourd'hui** : mêmes trois filtres, même défaut de saison, `isFilterActive` faux — **vérifié en régression**.
- **AC-WU-59** — *(amende AC-WU-21)* Les écritures d'adhésion de `/admin/memberships` invalident **en plus** de leurs clés actuelles : **création** → `usersAdminDirectory()` **et** `usersBadgeCount()` ; **modification** (ligne dépliée, où le numéro de licence est éditable) → les deux mêmes ; **archivage** → les deux mêmes. **L'enregistrement d'un paiement n'invalide ni l'une ni l'autre** — aucun des quatre critères de complétude ne dépend d'un paiement (§2.5) ; ne pas l'ajouter par symétrie. Toutes via les clés **centralisées** de `presentation/shared/query-keys.ts`, **jamais inline**. Vérifié de bout en bout : créer l'adhésion depuis `/admin/memberships` puis revenir sur `/admin/users` **fait basculer la colonne et le badge sans rechargement manuel**. Les invalidations d'AC-WU-21 relatives à l'invitation, au renommage et aux rôles restent **inchangées**, ainsi que celles d'AC-WU-49.

**Non-régression**

- **AC-WU-60** — `'membership:write'` reste **inchangée** dans `rbac-matrix.ts` (même valeur, même commentaire), `memberships_insert_admin`/`memberships_update_admin` restent **inchangées**, `MembershipRepository`, `CreateMembershipUseCase`, `UpdateMembershipUseCase`, `ArchiveMembershipUseCase`, `RecordPaymentUseCase` et `MembershipEditRow` **ne changent pas d'un caractère**. `/admin/memberships` continue de créer, modifier, archiver et encaisser **à l'identique** (AC-WM-19 à AC-WM-36 reconduits). Sur `/admin/users`, `InviteUserDialog`, `UserEditDialog`, `AssignRoleDialog`, `EditRoleAssignmentDialog`, `RemoveRoleAssignmentDialog`, `UserRolesCell`, `UserStatusBadge`, `UserMissingElementIndicator`, la recherche et les **deux** filtres fonctionnent **à l'identique** (AC-WU-31/AC-WU-46 reconduits). **Aucune migration SQL n'est produite par cet amendement** — aucune politique, aucune colonne, aucune contrainte. `presetUserId` (`MembershipFormDialog`/`useMembershipFormDialogViewModel`) est **soit retiré, soit réemployé par la redirection** selon l'arbitrage de PO-WU-16 — **jamais laissé en place sans appelant** (§2.6). Aucun écran mobile ne change (AC-WU-29 reconduit) ; aucun chemin d'export n'est ajouté (AC-WU-27 reconduit) ; aucun nom de personne n'est codé en dur, y compris dans le libellé du filtre appliqué (AC-WU-26 reconduit).

## 6. Points ouverts

Les points **PO-WU-05, PO-WU-07 à PO-WU-13** de `specs/web-users.md` et de `specs/web-users-role-edit-remove.md` restent ouverts tels quels — **PO-WU-07 recule d'un cran** (§4) sans changer de destinataire ni de caractère bloquant.

**Clos par cet amendement :**

- **PO-WU-06** (« le bouton « Adhésion » crée-t-il seulement, ou modifie-t-il aussi ? ») — **sans objet** : il n'y a plus de bouton « Adhésion » sur cet écran. La création, le renouvellement **et** la modification vivent tous sur `/admin/memberships`, comme ils y vivaient déjà. **Ne pas le rouvrir sous une autre forme.**

**Ajoutés :**

| Réf. | Question | Pour qui | Bloquant ? |
|---|---|---|---|
| **PO-WU-14** | **`/admin/memberships` n'a pas de champ de recherche — faut-il lui en donner un ?** La demande supposait une recherche existante à initialiser ; il n'y en a aucune (trois `Select` de filtre, aucune maquette n'en montre, `web-memberships` n'en spécifie aucune — §2.3). Cet amendement passe donc par un **paramètre d'URL branché sur la chaîne de filtres**, qui suffit **exactement** au besoin exprimé et ne touche à rien d'autre. Reste la question de fond : une console d'adhésions club-wide doit-elle porter une recherche nom/licence de plein droit, comme `/admin/users` en porte une ? Si oui, c'est **une évolution de `web-memberships`**, avec sa propre maquette et ses propres AC — **pas un effet de bord de cette redirection**, et le paramètre d'URL devrait alors alimenter cette recherche plutôt qu'un filtre dédié | **Développeuse / designer-agent** | Non pour construire — **oui pour figer `/admin/memberships`** |
| **PO-WU-15** | **Libellé de la nouvelle colonne, et le contresens qu'il ne doit pas induire.** « Adhérent » ici signifie « une ligne d'adhésion non archivée existe pour la saison en cours » — **pas** « son adhésion est active » : une adhésion `En attente` ou `Suspendue` fait lire « adhérent » (§2.1). Un libellé comme « À jour » ou « Membre actif » serait **faux**. Quel intitulé d'en-tête et quels libellés de valeurs (le détail visuel appartient à designer-agent, la **sémantique** appartient à la développeuse) ? Et l'en-tête doit-il nommer la saison, pour que « la saison en cours » ne soit pas une hypothèse implicite ? | **Développeuse / designer-agent** | Non pour construire — **oui pour figer la colonne** |
| **PO-WU-16** | **La redirection doit-elle pré-sélectionner le compte dans « Nouvelle adhésion » ?** L'atterrissage nominal est une **liste vide** (saison en cours × compte non adhérent, §2.3c) et l'intention est manifestement « créer son adhésion ». Le mécanisme existe **déjà** : `presetUserId` sur `MembershipFormDialog`, ajouté pour le point d'entrée que cet amendement supprime, et qui serait sinon du **code mort** (§2.6). Trois formes possibles : (a) rien — l'administrateur clique « Nouvelle adhésion » et choisit le compte dans la liste, comportement actuel ; (b) pré-sélection du compte à l'ouverture du dialogue ; (c) ouverture automatique du dialogue à l'arrivée sur l'écran filtré (à évaluer avec prudence : une navigation qui ouvre d'elle-même un formulaire d'écriture n'a aucun précédent dans ce backoffice) | **Développeuse / designer-agent** | Non pour construire (a) suffit à livrer — **oui pour décider du sort de `presetUserId`** |
| **PO-WU-17** | **Le repli « aucune saison en cours » n'est pas appliqué de la même façon partout.** §2.3 de `web-users` dit que les critères 2 et 3 sont alors « inévaluables » et que le comptage « se réduit aux critères 1 et 4 » ; l'implémentation livrée force `hasMembershipForCurrentSeason` à `false`, ce qui **fait au contraire déclencher** le critère 2 pour **tous** les comptes — icône d'avertissement sur chaque ligne et badge de navigation au maximum pendant toute la césure estivale. Cet amendement **traite le cas pour sa seule colonne** (état neutre non actionnable, §2.3d) et **ne touche ni à l'icône ni au badge**, hors de son périmètre. Le repli tel que rédigé au §2.3 était déjà noté « à confirmer d'un mot par la développeuse » (note résiduelle de PO-WU-04) : **cette confirmation est désormais nécessaire**, et l'implémentation à aligner sur ce qu'elle dira. Relié à **PO-WM-07** (même famille : que fait le backoffice pendant la césure ?) | **Développeuse** | Non pour cet amendement — **oui avant la première césure estivale en production** |

## 7. Note pour designer-agent

> **Rien de ce changement n'est illustré, et une maquette illustre même l'inverse.** La ligne `web-users` de `docs/designs/DESIGN_LINKS.md` §2 est au statut **`instantané seul`** → conformément au §4 du registre, **aucun lien artifact n'est à demander**, et **aucune ligne n'est à ajouter**. Les cinq exports `docs/designs/desktop/users/[Admin] Web - Users - {1,2,3,4,5}.png` montrent **cinq colonnes** (l'export 4, le seul pleinement lisible), **trois contrôles dans `ACTIONS`**, et — export **3** — **le dialogue que cet amendement supprime**. C'est le **troisième** élément de cette feature à dessiner sans référence visuelle, après l'icône d'avertissement de ligne et la pastille cliquable.
> **La section `## UI design` de `specs/web-users.md` n'est pas touchée par le présent amendement** : c'est la passe designer qui l'étend, en respectant §0 ci-dessus.

### Ce qui est **périmé** dans `## UI design` de `specs/web-users.md`, précisément

À reprendre dans la passe designer, rien d'autre :

| Emplacement dans `## UI design` | Ce qui est périmé |
|---|---|
| Sous-section « **Ce qui change par rôle** », tableau | La ligne « **Bouton « Adhésion » sur une ligne — `canWriteMembership` — `'membership:write'` — Construit** » : **à supprimer**. Le décompte de la phrase suivante passe de **cinq** booléens d'écriture à **quatre** (`canInviteUser`, `canWriteUser`, `canAssignRole`, `canRemoveRole`) |
| Sous-section « **Écran liste (`/admin/users`)** », point 3 | « **Tableau à cinq colonnes**, ordre exact du mockup : `NOM`, `EMAIL`, `STATUT`, `RÔLES`, `ACTIONS` » : **six colonnes**, la nouvelle s'insérant entre `RÔLES` et `ACTIONS` (position proposée — l'ordre exact appartient à la passe designer, à une réserve près : elle ne doit pas s'intercaler entre `NOM` et `STATUT`, où elle se confondrait visuellement avec la pastille d'activation). La sous-puce « `ACTIONS` — … les trois contrôles illustrés » est périmée avec elle |
| Sous-section « **Colonne `ACTIONS` — les trois contrôles du mockup, tous construits** » | **Titre et tableau entiers périmés** : deux contrôles, pas trois. La ligne « « Adhésion » — **Construit** — Ouvre `MembershipFormDialog` adapté… » disparaît. Le paragraphe suivant (« Ordre gauche à droite… ») reste valable pour les deux contrôles restants |
| Sous-section « **Dialogue « Créer / renouveler l'adhésion » (déclenché par « Adhésion ») — seul dialogue sans réserve** » | **Section entière périmée** pour `/admin/users`. Ce dialogue reste en production **sur `/admin/memberships`** sous son autre titre (« Nouvelle adhésion »), décrit par `specs/web-memberships.md` — **ne pas la recycler, la retirer** |
| Sous-section « **Réutiliser les patrons déjà construits** » (dans §7, « Note pour designer-agent ») | La mention « `MembershipFormDialog` (le bouton « Adhésion », champ `UTILISATEUR` retiré) » : périmée |
| Sous-section « **Questions ouvertes UI** » | L'entrée **PO-WU-06** (« le dialogue d'adhésion reste-t-il « créer/renouveler » seul… ») : **close, sans objet** (§6). À remplacer par **PO-WU-15** (libellé de la colonne) et **PO-WU-16** (pré-sélection du compte) |
| Sous-section « **Trois contrôles côte à côte dans `ACTIONS`** » (dans §7) | « **Trois** contrôles côte à côte » → **deux**. Le `min-w-0` et les cibles `h-11` restent exigés à l'identique |

### Ce qu'il y a à dessiner — **comportement imposé, forme libre**

- **La cellule d'un compte adhérent** : un rendu **informatif et inerte**, qui n'invite à aucun clic (ce n'est pas un contrôle). Ne pas lui inventer d'action « voir l'adhésion » — **rien ne la demande** (`CLAUDE.md` §7).
- **La cellule d'un compte non adhérent** : elle porte le **contrôle de redirection**. **Forme laissée à votre arbitrage** — pastille cliquable, petit lien, bouton discret, ou autre — sous quatre contraintes :
  1. **c'est un contrôle réel** : un `button`/`Link`, jamais un `div` porteur d'`onClick` ; atteignable au **clavier** (`Tab`, `focus-visible`) ; **cible tactile conforme** `CLAUDE.md` §6, **y compris sur desktop** (même compromis déjà arbitré et documenté pour la pastille de rôle : faire grandir l'élément visible plutôt qu'ajouter une zone de clic invisible plus large que lui) ;
  2. **un nom accessible qui dit ce que le clic fait** — « voir/créer l'adhésion de *(compte)* », pas « Non » ni une simple icône ;
  3. **jamais la couleur seule** (AC-WU-28) : l'état est un mot avant d'être une teinte ;
  4. **cohérence de registre** : le manque d'adhésion est un **dossier à compléter**, pas une erreur bloquante — l'ambre déjà retenu pour l'icône d'avertissement (`text-coach-amber`) est le registre juste, le rouge (`coach-red`) restant réservé aux vrais échecs et aux actions destructrices.
- **La cellule « aucune saison en cours »** : un **état neutre, muet et non actionnable** (§2.3d) — ni « adhérent », ni « non adhérent », **aucun contrôle**. Ne pas le rendre par un tiret nu et silencieux : un libellé accessible doit dire *pourquoi* (aucune saison en cours), sans quoi c'est une cellule vide inexplicable.
- **Sur `/admin/memberships`, l'indication de filtre appliqué** : un bandeau, une puce effaçable, ou toute forme de votre choix, qui **nomme le compte** (lu à l'exécution, jamais codé en dur) et porte une **annulation en un geste**, laquelle **retire le paramètre de l'URL** et ramène l'écran à son défaut (saison en cours). **C'est le premier élément de ce backoffice dont l'état vient de l'URL** — à traiter comme un état de l'écran, pas comme une décoration d'arrivée.
- **L'atterrissage vide est le cas nominal, pas un bug** (§2.3c) : l'état `BackofficeEmptyState` « Aucune adhésion ne correspond à ces filtres » (AC-WM-25) est ce qui s'affichera **presque toujours** au bout de cette redirection. Le bouton « Nouvelle adhésion » de l'en-tête est **déjà là** et n'est pas conditionné à la liste — **rien à ajouter** ; ne pas dupliquer d'appel à l'action dans l'état vide sans arbitrage (PO-WU-16).
- **PO-WU-15 est une question pour vous et la développeuse** : l'intitulé de la colonne ne doit pas laisser croire à une adhésion *valide* (`En attente` et `Suspendue` comptent comme « adhérent » ici). À trancher avec elle, pas à supposer.

### À ne pas introduire

- **Aucun troisième filtre** sur `/admin/users` — la recherche et les deux filtres existants sont inchangés.
- **Aucun contrôle d'écriture d'adhésion** sur `/admin/users`, **pas même désactivé** : ce chemin n'existe plus dans aucune couche (RBAC, use case, ViewModel), et un bouton grisé le ferait deviner à tort — même règle que pour la désactivation de compte (PO-WU-05, AC-WU-41).
- **Aucun quatrième bouton dans `ACTIONS`** (règle déjà posée par AC-WU-41, reconduite).
- **Aucun statut d'adhésion détaillé** dans la colonne : `En attente`/`Active`/`Suspendue` appartiennent à `MembershipStatusBadge` et à `/admin/memberships`. Réutiliser ce composant ici **serait le contresens exact** que cet amendement écarte.
