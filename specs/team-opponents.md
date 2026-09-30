# Spec — Adversaires d'une équipe (`team-opponents`)

> Statut : **deuxième rédaction (2026-09-30), révisée d'après maquette.** Prête pour designer-agent : aucun point ouvert ne bloque la conception (voir §6).
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (modules P0 « Calendrier et convocations » et « Équipes et sections », ligne de matrice « Gérer comptes, rôles, paramétrage », journal d'audit CDC §11.3), `docs/roles-personas-as-caribbean.md` (Administrateur : « Paramétrage, comptes, rôles, saisons… », « Actions sensibles journalisées »), `specs/create-convocation.md` §2 (« Adversaire — référentiel ») et §7, `specs/section-and-teams.md` (§2.5, §3, AC-ST-23, PO-ST-05/10, « Écran Équipes »), `docs/DEFAULTS-A-CHALLENGER.md` (« Autorisation de création d'un `opponents` (PO-CV-02) », « Écriture composite Convocation + satellite — une RPC dédiée par type »), `CLAUDE.md` §3/§4/§6/§7/§9.
> Maquettes : `docs/designs/desktop/opponents/[Admin] Web - opponent.png` et `[Admin] Web - opponent - creation.png` (§0).
> État du code lu : `supabase/migrations/20260821091519_convocation_creation_schema.sql` (tables `opponents`/`team_opponents`, leurs politiques, `match_details.opponent_id`), `20260925150603_edit_match_details_write_policy.sql` (`opponent_id` non modifiable), `domain/repositories/opponent-repository.ts`, `data/repositories/OpponentRepositoryImpl.ts`, `domain/policies/{rbac-matrix,audit-actions}.ts`, `presentation/shared/query-keys.ts` (`teamOpponents(teamId)`), `presentation/features/backoffice/teams/components/{TeamTable,TeamFormDialog}.tsx`.

### Historique de révision

- **2026-09-30, deuxième rédaction.** Une maquette existe désormais (PO-TO-09 résolu). Elle **remplace le point d'entrée** supposé par la première rédaction : les adversaires ne s'ajoutent plus par un champ de `TeamFormDialog`, mais depuis la **ligne d'équipe dépliée** du tableau « Équipes », par un **dialogue dédié** « Ajouter un adversaire ». Conséquences : `TeamFormDialog`, `CreateTeamUseCase` et `UpdateTeamUseCase` ne sont plus touchés ; l'écriture devient une action d'ajout unitaire (retrouver ou créer l'adversaire, puis le relier) au lieu d'un état complet soumis avec l'équipe ; le retrait et la sélection d'un adversaire existant, que la maquette ne montre pas, passent en points ouverts (PO-TO-10, PO-TO-11). La section « UI design » de la passe designer précédente, conçue pour l'ancien point d'entrée, est retirée : elle est à réécrire par designer-agent.

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne n'existe encore au registre pour `team-opponents`**, mais deux exports PNG sont désormais présents dans le dépôt, sans lien artifact : c'est le cas `instantané seul` (§2 du registre), pas `absent`. **PO-TO-09 est résolu** : il n'y a pas de lien à demander.

Ce que montrent les exports, factuellement :

- **`[Admin] Web - opponent.png`** : l'écran « Équipes » avec un chevron sur chaque ligne ; la ligne « Groupe B » est dépliée et porte une sous-section **« ADVERSAIRES »**, le texte d'état vide **« Aucun adversaire relié pour l'instant. »** (lisible en entier ici) et un bouton **« + Adversaire »**.
- **`[Admin] Web - opponent - creation.png`** : le même écran avec, par-dessus, le dialogue **« Ajouter un adversaire »** : champ texte **« NOM DE L'ÉQUIPE »** (placeholder d'exemple), sélecteur **« ÉQUIPE DU CLUB CONCERNÉE »** présélectionné sur l'équipe de la ligne, au format `Groupe B · Senior masculin (2025-2026)`, note en italique « Les adversaires sont des équipes externes au club, reliées à une de vos équipes pour créer des convocations de match. », boutons **Annuler** / **Ajouter**.

Ce que les exports **ne montrent pas** : la liste d'adversaires d'une ligne dépliée quand elle n'est pas vide (PO-TO-12), un retrait (PO-TO-10), un choix parmi les adversaires existants (PO-TO-11), une modification d'adversaire, un champ adversaires dans le dialogue de création ou de modification d'équipe.

**Ligne à ajouter au registre**, par le premier agent ou la développeuse ayant les droits sur `docs/` (l'agent PO n'écrit que dans `specs/`), à recopier telle quelle :

```
| team-opponents — **backoffice desktop : adversaires d'une équipe (ligne dépliée + dialogue d'ajout)** (`[Admin] Web - opponent`, `[Admin] Web - opponent - creation`) | — aucun lien fourni | 2026-09-30 | `docs/designs/desktop/opponents/[Admin] Web - opponent{, - creation}.png` | **instantané seul** |
```

Note à joindre sous le tableau, dans le style des précédentes : les deux exports ne sont pas deux écrans mais un état de la ligne dépliée et le dialogue d'ajout ouvert par-dessus ; le texte d'état vide, tronqué par le dialogue sur l'export `- creation`, est lisible en entier sur l'autre ; le placeholder d'exemple du champ nom est un nom de club, à ne pas reprendre tel quel (AC-TO-18). ⚠️ Les deux PNG apparaissent en `??` dans `git status` : à committer en même temps que la ligne, sinon celle-ci pointerait vers un instantané absent du dépôt.

## 1. Périmètre

### Ce que c'est

Sur l'écran backoffice « Équipes » (`/admin/teams`), chaque ligne d'équipe se **déplie** et montre les adversaires reliés à cette équipe. Depuis cette ligne, l'Administrateur ouvre le dialogue « Ajouter un adversaire », saisit un nom et choisit l'équipe du club concernée. **Un seul geste « Ajouter » retrouve ou crée l'adversaire dans le référentiel global `opponents`, puis le relie à l'équipe** par une ligne `public.team_opponents (team_id, opponent_id)`.

C'est exactement la liste que le sélecteur « Adversaire » du formulaire de convocation match lit déjà (`OpponentRepository.findByTeamId`, `specs/create-convocation.md` §2 et §8). Aujourd'hui, rien ne l'alimente depuis l'application, donc ce sélecteur est vide pour toute équipe.

### Rattachement CDC

| Élément | Module CDC | Priorité |
|---|---|---|
| Référentiel d'adversaires d'une équipe, condition pour créer une convocation match | **Calendrier et convocations** (convocations de match) | **P0** |
| Paramétrage d'une équipe | **Équipes et sections** | **P0** |
| Rôle porteur | Administrateur, ligne « Gérer comptes, rôles, **paramétrage** » | — |

### Ce qui est au périmètre

1. **Le dépliage d'une ligne d'équipe** dans `TeamTable`, avec la sous-section « ADVERSAIRES » : les adversaires déjà reliés à l'équipe, lus par `findByTeamId`, ou le texte d'état vide de la maquette. La forme de la liste non vide n'est pas illustrée (PO-TO-12). Le besoin, lui, est posé par le texte d'état vide lui-même : « aucun adversaire relié » n'a de sens que si les adversaires reliés s'affichent à cet endroit.
2. **Le dialogue « Ajouter un adversaire »**, ouvert par « + Adversaire », avec ses deux champs (§2.2).
3. **L'écriture « retrouver ou créer, puis relier »** en un seul appel atomique (§2.3, §2.5).

### Hors périmètre, explicitement

- **Retirer un adversaire d'une équipe** : non illustré, ouvert (PO-TO-10). Aucun contrôle de retrait, aucune politique `delete` dans cette passe.
- **Choisir un adversaire existant dans une liste** (recherche, autocomplétion) : non illustré, ouvert (PO-TO-11). La réutilisation passe, dans cette passe, par la règle « retrouver par nom » côté serveur (§2.3).
- **Un écran de gestion du référentiel `opponents` lui-même** : renommer, fusionner deux doublons, supprimer un adversaire global. Aucune politique `update` ni `delete` sur `opponents`, et aucune n'est ajoutée. Un renommage toucherait toutes les équipes et tous les matchs passés qui le référencent (PO-TO-03).
- **Tout champ adversaires dans `TeamFormDialog`** (création comme modification d'équipe). Ce dialogue n'est pas modifié.
- **L'ouverture de la création d'adversaires au coach ou au Dirigeant habilité.** `create-convocation.md` §2 l'a tranché : réservé à l'Administrateur, pas à la volée depuis l'écran de convocation. L'ouverture au Dirigeant habilité reste « envisagée, non spécifiée » et n'est pas rouverte ici.
- **Toute modification du formulaire de convocation.** Le sélecteur « Adversaire » reste une sélection simple sans création (`create-convocation.md` §8), et `findByTeamId` garde sa signature et son comportement.
- **La modification de l'adversaire d'un match existant.** `match_details.opponent_id` n'est pas modifiable (`grant update` restreint, `20260925150603`).
- **La reprise des adversaires d'une saison sur l'autre** (PO-TO-06).
- **Une colonne, un compteur ou un filtre « adversaires » dans le tableau des équipes** : le dépliage n'est pas une colonne, et rien de tel n'est illustré.
- **L'import du calendrier fédéral** (P2, « Intégrations fédérales automatisées »).

## 2. Modèle et règles

### 2.1 Aucune table nouvelle, aucune colonne nouvelle

`opponents (id, name)` et `team_opponents (id, team_id, opponent_id, unique (team_id, opponent_id))` existent déjà. Cette feature leur donne un chemin d'écriture depuis l'application, sans les redéfinir.

### 2.2 Le dialogue « Ajouter un adversaire »

| Champ (maquette) | Nature | Règle |
|---|---|---|
| **NOM DE L'ÉQUIPE** | texte libre | Obligatoire. Rogné (espaces de tête et de fin) ; refusé s'il est vide après rognage, par une `DomainError`, avant tout appel réseau. |
| **ÉQUIPE DU CLUB CONCERNÉE** | sélecteur | Obligatoire. **Présélectionné sur l'équipe de la ligne** depuis laquelle le dialogue est ouvert, mais modifiable. Libellé d'option : `{nom de l'équipe} · {nom de la section} ({libellé de la saison})`, format de la maquette. Ce format distingue deux équipes homonymes de saisons différentes (cas illustré sur la maquette elle-même, deux lignes « Groupe A » ; voir `section-and-teams.md` §2.5). Quelles équipes le sélecteur propose : ouvert (PO-TO-13). |

**Conséquence du sélecteur modifiable, à ne pas manquer** : l'adversaire est relié à l'équipe **choisie dans le sélecteur**, qui peut différer de la ligne d'origine. C'est la liste de l'équipe choisie qui doit être rafraîchie (§2.6).

### 2.3 « Retrouver ou créer, puis relier » : une action, un appel

Un clic sur « Ajouter » produit **un seul appel** qui, dans une même transaction :

1. **retrouve** une ligne `opponents` dont le `name` est **exactement égal** au nom rogné saisi (comparaison stricte : casse, accents et espaces internes compris) ; s'il en existe plusieurs (possible, aucune contrainte d'unicité), le choix est déterministe et documenté dans la fonction ;
2. sinon **crée** une ligne `opponents` avec ce nom rogné ;
3. **relie** l'adversaire à l'équipe choisie : insertion `team_opponents` avec `on conflict do nothing` sur la contrainte unique existante.

Pourquoi « retrouver » et pas seulement « créer » : `opponents` est « plat et global — l'identité d'un club adverse ne change pas d'une saison à l'autre » (`create-convocation.md` §2), alors qu'une équipe « est propre à une saison et n'est jamais réutilisée d'une saison à l'autre » (`section-and-teams.md` §1). Sans retrouver l'existant, chaque saison recréerait les mêmes clubs en double. `create-convocation.md` §2 prévoit d'ailleurs qu'un futur import fédéral procède en « retrouvant ou créant des lignes `opponents` », ce qui est le même geste.

**Pourquoi l'égalité stricte et rien de plus large** : toute normalisation (casse, accents) serait une décision de dédoublonnage, qui reste ouverte (PO-TO-01), et tout regroupement par sport aussi (PO-TO-02). L'égalité stricte est le minimum qui évite le doublon évident sans trancher ces deux points. Conséquence assumée : « AS Exemple » et « as exemple » donnent deux adversaires distincts tant que PO-TO-01 n'est pas tranché.

**Idempotence** : ajouter un nom déjà relié à la même équipe ne crée ni doublon ni erreur ; l'appel réussit et l'état ne change pas.

### 2.4 Doublons concurrents

La base n'a **aucune contrainte d'unicité** sur `opponents.name` (même constat que PO-ST-10 pour sections et équipes). Deux ajouts simultanés du même nom nouveau peuvent donc créer deux lignes `opponents`. Cette spec ne l'empêche pas : c'est la même question que PO-TO-01, et une contrainte ajoutée plus tard échouerait sur les doublons existants, d'où l'intérêt de la trancher tôt.

### 2.5 Atomicité : un appel, une transaction

L'écriture doit être **atomique** : si la liaison échoue (violation RLS, équipe inexistante, erreur réseau), l'adversaire éventuellement créé à l'étape 2 **ne subsiste pas**. La raison est concrète : avec deux appels séquentiels (créer l'adversaire, puis le relier), un échec du second laisse un adversaire orphelin dans un référentiel global qu'aucun écran ne permet de nettoyer (PO-TO-03). Et le contrat d'échec du dialogue (rester ouvert, saisies conservées, comme AC-ST-23) suppose que « échec » veuille dire « rien n'a été écrit ».

Mécanisme : le patron déjà adopté pour les écritures composites (`DEFAULTS-A-CHALLENGER.md`, « une RPC dédiée par type » ; `create_match_convocation`) : une fonction PL/pgSQL **sans `SECURITY DEFINER`**, pour que les politiques RLS de `opponents` et `team_opponents` s'appliquent réellement à l'intérieur. La signature exacte relève de l'implémentation. La RPC est un détail de `data/` : côté `domain/`, la seule porte d'entrée est le use case d'ajout et la méthode de repository correspondante.

### 2.6 Domaine et lecture

- **Un use case d'ajout** (nom au choix de l'implémentation, patron `PascalCaseUseCase`, dans un dossier de feature créé à cette occasion). Entrée : identifiant de l'équipe choisie et nom saisi. Il vérifie `can(user, 'team:write')`, rogne et valide le nom (§2.2), puis appelle le repository.
- **`OpponentRepository`** gagne **une** méthode d'écriture « ajouter à une équipe » (implémentée par la RPC de §2.5), qui rend l'`Opponent` retrouvé ou créé. `findByTeamId` et `findById` sont **inchangées**. `create(name)` n'est pas utilisé par cette feature et n'est pas modifié.
- **Lecture de la ligne dépliée** : `findByTeamId(teamId)` de l'équipe de la ligne, sous la clé existante `queryKeys.teamOpponents(teamId)` (`presentation/shared/query-keys.ts`). Réutiliser **la même clé** que le formulaire de convocation est ce qui fait qu'une seule invalidation rafraîchit les deux endroits. Le chargement peut n'avoir lieu qu'au dépliage.
- **Après succès**, invalider `queryKeys.teamOpponents(<équipe choisie dans le sélecteur>)`, pas celle de la ligne d'origine si elles diffèrent (§2.2). Aucune autre clé n'a à changer : la liste des équipes n'est pas modifiée.
- Aucune lecture du référentiel global `opponents` n'est nécessaire dans cette passe (pas de sélecteur d'existant, PO-TO-11).

### 2.7 RLS : aucune politique nouvelle

État actuel, vérifié dans `20260821091519` :

| Table | `select` | `insert` | `update` | `delete` |
|---|---|---|---|---|
| `opponents` | `opponents_select_authenticated` (tous) | `opponents_insert_admin` | aucune | aucune |
| `team_opponents` | `team_opponents_select_authenticated` (tous) | `team_opponents_insert_admin` | aucune | aucune |

L'ajout n'a besoin que de `select` sur `opponents` (retrouver), d'`insert` sur `opponents` (créer) et d'`insert` sur `team_opponents` (relier) : **tout existe déjà**. La nouvelle migration ne contient donc que la fonction de §2.5. Elle peut aussi remplacer, par `comment on policy`, le commentaire « Provisional » des deux politiques `insert`, devenu une position confirmée par `create-convocation.md` §2, en y nommant l'action miroitée `'team:write'` (§3). Elle **ne modifie aucune migration existante**.

**Changement par rapport à la première rédaction** : la politique `team_opponents_delete_admin` n'est **plus ajoutée**. Elle n'avait d'objet que pour le retrait, désormais ouvert (PO-TO-10). Elle viendra avec le retrait s'il est retenu, pas avant : une politique sans chemin applicatif qui l'utilise est une surface d'écriture inutile.

## 3. RBAC

### Ligne de matrice applicable

« **Gérer comptes, rôles, paramétrage** » : ✅ Administrateur seul, ❌ pour les sept autres rôles. Le référentiel des adversaires d'une équipe est du paramétrage. `create-convocation.md` §2 a déjà tranché que créer un adversaire est réservé à l'Administrateur.

| Rôle | Relier un adversaire à une équipe | Créer un adversaire (retrouver ou créer) | Voir la sous-section « ADVERSAIRES » | Lire `opponents` / `team_opponents` (inchangé) |
|---|---|---|---|---|
| Joueur/Joueuse | ❌ | ❌ | ❌ (pas d'accès à la console) | ✅ (lecture ouverte existante) |
| Coach/Staff | ❌ | ❌ (tranché, `create-convocation.md` §2) | ❌ | ✅ |
| Responsable de section | ❌ dans cette passe (PO-ST-05) | ❌ | ❌ | ✅ |
| Dirigeant habilité | ❌ (ouverture « envisagée », non spécifiée) | ❌ | ❌ | ✅ |
| Trésorier | ❌ | ❌ | ❌ | ✅ |
| Référent médical | ❌ | ❌ | ❌ | ✅ |
| Bénévole | ❌ | ❌ | ❌ | ✅ |
| **Administrateur** | ✅ toutes équipes, toutes saisons | ✅ | ✅ | ✅ |

### Aucune action nouvelle : réutilisation de `'team:write'`

Le critère en tête de `rbac-matrix.ts` : une entrée ne se justifie que si `presentation/` doit décider quelque chose avant la requête. Ici, la décision d'affichage existe (afficher ou non « + Adversaire »), mais son prédicat est **identique** à celui du crayon d'édition de la même ligne : Administrateur seul, sur toute équipe. Le booléen `canWriteTeams` déjà calculé par le ViewModel de l'écran la porte. Créer une action distincte dupliquerait `'team:write'` sans rien distinguer (`CLAUDE.md` §7). La fonction de §2.5 et les deux politiques `insert` portent en commentaire SQL `'team:write'`, et le commentaire de `'team:write'` dans `rbac-matrix.ts` les cite.

**Réserve à ne pas perdre, qui justifie PO-TO-04.** `opponents_insert_admin` écrit un référentiel **global**, pas une donnée de l'équipe. Si PO-ST-05 élargit un jour `'team:write'` au Responsable de section, il faudra décider en même temps si ce rôle peut créer des adversaires globaux. La politique `opponents_insert_admin` reste bornée à `private.is_admin()` et ne suit pas `'team:write'`. Dans ce scénario, un ajout de nom nouveau par un responsable de section échouerait en RLS (un nom existant passerait, s'il peut insérer dans `team_opponents`). Ce n'est pas un trou de sécurité, mais c'est un écart à traiter à ce moment-là.

`can.ts` n'est pas modifié : `'admin'` est global par construction.

### Comptes multi-rôles

Un compte admin + coach qui relie un adversaire à sa propre équipe le voit immédiatement dans son formulaire de convocation (même clé de requête, §2.6). Aucun autre effet.

## 4. Données sensibles

| Nature | Cette feature | Conséquence |
|---|---|---|
| Données de santé | Aucune | — |
| Données financières | Aucune | — |
| Données nominatives | **A priori aucune** : la maquette définit un adversaire comme une « équipe externe au club ». **Mais à vérifier** pour les sections Échecs et Domino, où l'adversaire pourrait être une personne (PO-TO-07) | Si oui : donnée personnelle dans un référentiel sans purge ni visibilité bornée (lecture ouverte à tout compte authentifié) |
| Action du CDC §11.3 | **Aucune** : ni changement de rôle, ni paiement, ni export, ni donnée de santé | Pas d'exigence d'audit issue du CDC |

**Journal d'audit.** Dans la première rédaction, les adversaires passaient par `CreateTeamUseCase`/`UpdateTeamUseCase`, donc sous `team.created`/`team.updated` (élargissement délibéré de la développeuse au-delà du CDC §11.3, addendum de `specs/web-audit-logs.md`). **Ce n'est plus le cas** : l'ajout passe par son propre use case, qui n'émet ni `team.updated` ni aucun autre code. Cette spec **n'ajoute aucun code d'action d'audit** (`CLAUDE.md` §7). Relier un adversaire et créer un adversaire global ne sont donc **pas tracés** dans cette passe. Faut-il le faire ? C'est PO-TO-05, non bloquant.

**Rétention.** Aucune : `opponents` et `team_opponents` sont de l'historique référencé par `match_details`, et `RETENTION_PURGE.md` ne les vise pas.

## 5. Critères d'acceptation

Numérotation `AC-TO-xx`, **renumérotée** dans cette rédaction (les numéros de la première rédaction ne sont pas repris).

**Base de données et RLS**

- **AC-TO-01** — Une nouvelle migration ajoute la fonction d'écriture de §2.5, et au plus des `comment on policy` sur `opponents_insert_admin` et `team_opponents_insert_admin` nommant `'team:write'`. **Aucune politique n'est ajoutée ni modifiée** : pas de `delete` ni d'`update` sur `team_opponents` (PO-TO-10), pas d'`update` ni de `delete` sur `opponents`. Aucune migration existante n'est modifiée.
- **AC-TO-02** — Avec un jeton **non administrateur** (au moins `coach` et `section-manager`), l'appel de la fonction échoue, ainsi que tout `insert` direct sur `opponents` et `team_opponents`.
- **AC-TO-03** — La fonction n'est pas `SECURITY DEFINER` : les politiques RLS de `opponents` et `team_opponents` s'appliquent à l'intérieur.
- **AC-TO-04** — **Atomicité.** Si la liaison échoue après la création d'un adversaire nouveau (équipe inexistante, violation RLS provoquée), **aucune** ligne `opponents` nouvelle ne subsiste. Vérifiable : nombre de lignes `opponents` identique avant et après l'échec.
- **AC-TO-05** — **Retrouver ou créer.** Ajouter un nom dont la forme rognée est exactement égale au `name` d'un adversaire existant relie cet adversaire, sans créer de ligne `opponents`. Vérifiable : ajouter le même nom à deux équipes produit **une** ligne `opponents` et **deux** lignes `team_opponents`. Un nom différent à la casse près crée un nouvel adversaire (§2.3, PO-TO-01).
- **AC-TO-06** — **Idempotence.** Ajouter un nom déjà relié à la même équipe réussit sans créer de doublon dans `team_opponents` ni dans `opponents`.

**Domaine**

- **AC-TO-07** — Aucune action n'est ajoutée à `actions.ts`/`rbac-matrix.ts`. Le use case d'ajout refuse l'écriture si `can(user, 'team:write')` est faux. `can.ts` est inchangé. Le commentaire de `'team:write'` cite la fonction et les deux politiques `insert`.
- **AC-TO-08** — Le use case refuse, par `DomainError` et **sans appel réseau**, un nom vide ou réduit à des espaces, et une équipe non renseignée. Le nom transmis au repository est rogné.
- **AC-TO-09** — `OpponentRepository.findByTeamId` et `findById` sont inchangées en signature et en comportement ; le formulaire de convocation n'est pas modifié. `OpponentRepository` gagne une seule méthode d'écriture (§2.6).
- **AC-TO-10** — Un mapper existe entre le DTO de retour de la fonction et l'entité `Opponent` (`CLAUDE.md` §4). Aucun import de `data/` depuis `presentation/`.
- **AC-TO-11** — `TeamFormDialog`, `useTeamFormDialogViewModel`, `CreateTeamUseCase` et `UpdateTeamUseCase` ne sont **pas modifiés**. L'ajout n'émet ni `team.created`, ni `team.updated`, ni aucun nouveau code d'audit (PO-TO-05).
- **AC-TO-12** — Couverture Vitest du use case : refus sans `'team:write'`, validation d'AC-TO-08, transmission du nom rogné et de l'identifiant de l'équipe **choisie** (pas de la ligne d'origine).

**Écran**

- **AC-TO-13** — Chaque ligne de `TeamTable` se déplie et se replie. Dépliée, elle montre une sous-section « ADVERSAIRES » qui liste les adversaires reliés à l'équipe (`findByTeamId`), ou, s'il n'y en a aucun, le texte « Aucun adversaire relié pour l'instant. ». Le chargement et l'erreur de chargement ont chacun un état intelligible, l'erreur en français.
- **AC-TO-14** — Le bouton « + Adversaire » n'est rendu que si `canWriteTeams`. Il ouvre le dialogue « Ajouter un adversaire » : champ « NOM DE L'ÉQUIPE », sélecteur « ÉQUIPE DU CLUB CONCERNÉE » **présélectionné sur l'équipe de la ligne**, options au format `{équipe} · {section} ({saison})`, note explicative, boutons « Annuler » et « Ajouter ».
- **AC-TO-15** — Après un ajout réussi, le dialogue se ferme ; la sous-section de l'équipe **choisie** et le sélecteur « Adversaire » du formulaire de convocation de cette équipe montrent l'adversaire **sans rechargement manuel** (invalidation de `queryKeys.teamOpponents(<équipe choisie>)`).
- **AC-TO-16** — Un échec laisse le dialogue ouvert, avec le nom et l'équipe saisis conservés et un message d'erreur lisible en français. « Annuler » ferme le dialogue sans aucune écriture.
- **AC-TO-17** — Aucun contrôle ne permet de retirer un adversaire d'une équipe (PO-TO-10), ni de renommer ou supprimer un adversaire global, à aucun endroit, même désactivé.
- **AC-TO-18** — Contrôles tactiles à `h-11` au site d'appel (bouton de dépliage compris) ; dépliage et dialogue entièrement utilisables au clavier. **Aucun nom de club ou de personne codé en dur**, y compris en placeholder ou en fixture de test (`CLAUDE.md` §9) : le placeholder d'exemple de la maquette, qui est un nom de club, n'est **pas** repris tel quel.

## 6. Points ouverts

| Réf. | Question | Pour qui | Bloquant ? |
|---|---|---|---|
| **PO-TO-01** | **Doublons et normalisation des noms.** La règle retenue pour « retrouver » est l'égalité stricte du nom rogné (§2.3). Faut-il l'élargir (casse, accents, espaces internes : « AS Exemple » / « as exemple ») et poser une **contrainte d'unicité en base** (index sur une forme normalisée) ? À trancher **avant** qu'un volume réel s'accumule : un doublon déjà référencé par `match_details` ne peut plus être fusionné sans correction (PO-TO-03), et une contrainte ajoutée plus tard échouera sur les doublons existants | Développeuse / Bureau | Non pour la conception. **Oui avant d'écrire la migration**, si une normalisation ou une contrainte est retenue (la règle de « retrouver » vit dans la fonction) |
| **PO-TO-02** | **Le référentiel est global, toutes sections confondues.** Un même nom de club peut exister dans deux sports. Désigne-t-il **un** adversaire ou **deux** ? La règle « retrouver par nom » de §2.3 suppose provisoirement « un nom = un adversaire » : si la réponse est « deux », elle devra être bornée (par exemple par section), et les liaisons déjà faites entre sports seraient à corriger. La réponse conditionne PO-TO-01 | Bureau / développeuse | Non |
| **PO-TO-03** | **Gestion du référentiel global** : renommer un adversaire (faute de frappe), fusionner deux doublons (réaffecter `match_details.opponent_id`), nettoyer les orphelins. Aucun chemin n'existe, et cette spec n'en ouvre pas. Aujourd'hui, une faute de frappe dans un nom n'est corrigeable qu'en base | Développeuse / Bureau | Non |
| **PO-TO-04** | **Si `'team:write'` est élargi au Responsable de section (PO-ST-05)**, ce rôle peut-il créer des adversaires **globaux**, ou seulement relier des adversaires existants ? Dans le second cas, une action distincte (du type `'opponent:create'`) deviendrait nécessaire (§3) | Bureau | Non |
| **PO-TO-05** | **Audit.** L'ajout ne passe plus par `team.updated` et n'est donc tracé nulle part (§4). Faut-il un code d'action pour « adversaire relié à une équipe » et/ou « adversaire global créé » ? Aucune de ces actions ne figure au CDC §11.3 : ce serait le même élargissement délibéré que celui tranché pour les équipes, pas une exigence | Développeuse | Non |
| **PO-TO-06** | **Bascule de saison.** Les équipes étant recréées à chaque saison, leurs adversaires doivent être reliés à nouveau à la main (la règle « retrouver par nom » évite au moins les doublons). Faut-il un geste « reprendre les adversaires de l'équipe homologue de la saison précédente » ? Il se rattache à PO-WS-05/PO-ST-05 (rollover), pas à cette feature | Bureau / développeuse | Non pour cette tranche. À traiter avant la première bascule réelle |
| **PO-TO-07** | **Adversaire = personne ?** En Échecs ou en Domino, l'adversaire d'une rencontre peut-il être un individu plutôt qu'une équipe ? La maquette parle d'« équipes externes au club », sans trancher ces sections. Si oui, `opponents.name` devient une donnée personnelle, lisible par tout compte authentifié et jamais purgée : question pour le référent RGPD | Référent RGPD / Bureau | Non pour construire. **Oui avant de saisir des noms de personnes en production** |
| **PO-TO-08** | **Entrée `DEFAULTS-A-CHALLENGER.md` « Autorisation de création d'un `opponents` (PO-CV-02) ».** Sa condition de revisite est atteinte. La valeur admin seul est confirmée par `create-convocation.md` §2 et par cette spec. Le parcours du coach face à un adversaire inconnu devient « demander à un administrateur, qui l'ajoute depuis la ligne de l'équipe dans l'écran Équipes ». L'entrée peut être close ou réécrite, par quelqu'un qui a les droits sur `docs/` | Développeuse | Non |
| **PO-TO-09** | ~~**Maquette** : existe-t-il une maquette ?~~ **Résolu (2026-09-30)** : deux exports existent, statut `instantané seul`. Ligne de registre à poser : voir §0 | — | Résolu |
| **PO-TO-10** | **Retrait d'un adversaire d'une équipe.** La maquette ne montre aucun retrait. Sans lui, un adversaire relié par erreur (faute de frappe, mauvaise équipe choisie dans le sélecteur) ne se corrige qu'en base. Faut-il le prévoir, et où (dans la liste de la ligne dépliée) ? Rappel utile pour décider : retirer une liaison est sans effet structurel sur les matchs existants, car `match_details.opponent_id` référence `opponents(id)` et non `team_opponents`. **En attendant** : aucun contrôle de retrait, aucune politique `delete` (§2.7, AC-TO-17) | Développeuse (et maquette) | Non pour construire l'ajout. **Recommandé avant l'usage réel**, le sélecteur d'équipe modifiable rendant l'erreur de liaison facile |
| **PO-TO-11** | **Choisir un adversaire existant.** La maquette ne montre qu'un champ texte libre, sans liste ni autocomplétion. Faut-il proposer les adversaires existants pendant la saisie ? **En attendant** : saisie libre, et réutilisation par la règle « retrouver par nom » de §2.3, sans lecture du référentiel global côté écran | Développeuse (et maquette) | Non |
| **PO-TO-12** | **Affichage des adversaires reliés dans la ligne dépliée.** Seul l'état vide est illustré. La forme de la liste non vide (liste simple, ordre, pastilles) n'est pas donnée. **En attendant** : la liste des noms lus par `findByTeamId`, forme laissée à designer-agent ; aucun compteur sur la ligne repliée, aucune colonne (§1) | Designer-agent | Non : c'est une décision de conception, pas de périmètre |
| **PO-TO-13** | **Options du sélecteur « ÉQUIPE DU CLUB CONCERNÉE ».** Toutes les équipes, y compris celles des saisons terminées ? Seulement celles de la saison en cours ou à venir ? Celles qui correspondent aux filtres actifs de l'écran ? **En attendant** : toutes les équipes déjà chargées par l'écran « Équipes », sans filtrage supplémentaire, présélection sur l'équipe de la ligne | Développeuse / Bureau | Non |

## 7. Note pour designer-agent

- **La section « UI design » de la passe précédente a été retirée** : elle concevait un champ dans `TeamFormDialog`, point d'entrée abandonné. Elle est à réécrire d'après la maquette (§0).
- Points d'ancrage : `presentation/features/backoffice/teams/components/TeamTable.tsx` (dépliage des lignes, sous-section « ADVERSAIRES ») et un **nouveau dialogue** « Ajouter un adversaire » dans `features/backoffice/teams/components/`. Pas de nouvelle route, pas de changement de `TeamFormDialog`.
- À concevoir sans référence visuelle : la liste non vide de la ligne dépliée (PO-TO-12), les états de chargement et d'erreur de cette liste, et le retour à l'utilisateur quand l'ajout ne change rien (nom déjà relié, AC-TO-06 : succès, pas d'erreur).
- Ne pas trancher en dessinant : retrait (PO-TO-10), choix d'un existant ou autocomplétion (PO-TO-11), filtrage des équipes du sélecteur (PO-TO-13), normalisation des noms (PO-TO-01, PO-TO-02). La mise en page peut leur laisser de la place.
- Placeholder du champ nom : ne pas reprendre le nom de club de la maquette (AC-TO-18).
- Aucun contrôle de retrait, de renommage ou de suppression, même désactivé (AC-TO-17).

## UI design

> Rédigée par designer-agent (2026-09-30) d'après les deux maquettes du §0, lues directement. Légende : **[M]** = montré par la maquette ; **[A]** = ajouté par cette section, sans référence visuelle (à valider) ; **[R]** = réutilisation d'un motif déjà dans le code.

### Emplacement

Écran backoffice « Équipes » (`/admin/teams`), desktop (les maquettes sont `desktop/`, pas de variante mobile : le backoffice n'est pas concerné par la règle « 4 entrées de navigation du mobile »). Aucune nouvelle route, aucun nouvel élément de navigation latérale. Le tableau `TeamTable` reçoit le dépliage ; un nouveau dialogue vit à côté de `TeamFormDialog` et ne le modifie pas (AC-TO-11).

Références à ouvrir : `docs/designs/desktop/opponents/[Admin] Web - opponent.png` (ligne dépliée) et `docs/designs/desktop/opponents/[Admin] Web - opponent - creation.png` (dialogue). Convention de tableau : `TeamTable.tsx` ; convention de dialogue : `TeamFormDialog.tsx`. Précédent de ligne dépliable : `AuditLogTable.tsx` (`Fragment` par ligne, seconde `TableRow` avec `TableCell colSpan`, `aria-expanded` sur le bouton et sur la ligne, bouton `h-11 w-11 rounded-full`) **[R]**.

### Par rôle

Voir §3, non redéfini. Administrateur seul accède à la console. Conséquence d'affichage : le chevron et la sous-section sont visibles par tout compte qui voit l'écran ; **« + Adversaire » n'est rendu que si `canWriteTeams`** (même booléen que le crayon), jamais grisé (AC-TO-14). Si `canWriteTeams` est faux, la sous-section reste en lecture seule et l'état vide garde son texte sans bouton **[A]** : cas théorique aujourd'hui (Administrateur seul), à ne pas dessiner davantage.

### Aucun composant shadcn à installer

Déjà vendorisés et suffisants : `table`, `button`, `dialog`, `input`, `label`, `select`, `alert`, `skeleton`. **`Command` et `Popover` ne sont pas nécessaires** (pas d'autocomplétion, PO-TO-11). **Ni `Collapsible` ni `Accordion`** : un état local « lignes dépliées » suffit et reprend `AuditLogTable` ; ajouter un primitif pour un simple booléen ne se justifie pas.

### Ligne d'équipe dépliable

- **Chevron [M]** : à gauche du nom, dans la cellule NOM, replié = flèche vers la droite, déplié = flèche vers le bas (comme `IconChevronRight`/`IconChevronDown` de `AuditLogTable`). Rendu sur **chaque** ligne **[M]**.
- **Touch target [A, exigé par AC-TO-18]** : `<Button variant="ghost" size="icon">` à `h-11 w-11 rounded-full` au site d'appel ; le glyphe reste petit (`size-4`) comme sur la maquette, c'est la zone cliquable qui fait 44 px. Cela grossit la hauteur de ligne par rapport à la maquette (déjà le cas des boutons `h-11` « + Coach » et crayon) : pas de compensation négative de marge.
- **Clavier / a11y** : élément `button` natif (Tab, Entrée, Espace sans code spécifique) ; `aria-expanded` = état courant ; `aria-controls` pointant l'id de la sous-section ; `aria-label` dynamique contenant le nom de l'équipe, par exemple « Afficher les adversaires de l'équipe « Groupe B » » / « Masquer… » : deux lignes homonymes (« Groupe A » ×2 sur la maquette) restent distinguables seulement si le libellé est unique, donc ajouter la saison au libellé **[A]**. Icône `aria-hidden`. Le focus reste sur le chevron après bascule (pas de déplacement). Pas de dépliage au clic sur toute la ligne : les cellules contiennent déjà des boutons, un clic ligne entière serait ambigu **[A]**.
- **Plusieurs lignes dépliables à la fois** : oui (ensemble d'ids, comme `AuditLogTable`), contrairement à `MembershipTable` qui n'en garde qu'une. Justification : ouvrir Groupe B ne doit pas refermer Groupe A le temps de comparer **[A]**. État purement local à la vue, perdu au changement de filtre : acceptable.
- **Chargement paresseux [spec §2.6]** : la requête `findByTeamId` sous `queryKeys.teamOpponents(teamId)` n'est activée qu'au premier dépliage ; replier puis déplier réutilise le cache, sans nouveau squelette.

### Sous-section « ADVERSAIRES » (seconde ligne, `colSpan` = toutes les colonnes)

Disposition **[M]** : sous la ligne, alignée avec le nom de l'équipe (pas avec le chevron), sur le fond du tableau sans panneau distinct ; en-tête « ADVERSAIRES » en petites capitales grises espacées (`text-xs font-semibold tracking-wider text-muted-foreground uppercase`, même style que les `Label` de `TeamFormDialog`), puis contenu, puis bouton « + Adversaire » **en dessous** du contenu, aligné à gauche. Le bouton est une pilule outline `variant="outline"`, `h-11 rounded-full`, même style que « + Coach » **[M]**. Pas de `bg-muted/30` (contrairement à `AuditLogTable`) car la maquette n'en montre pas.

États du contenu (entre l'en-tête et le bouton) :

1. **Vide [M]** : texte « Aucun adversaire relié pour l'instant. » en `text-sm text-muted-foreground`.
2. **Non vide (PO-TO-12, non illustré) [A]** : liste des noms, **une ligne par adversaire, en liste simple verticale** (`<ul>`, texte `text-sm` couleur de premier plan), triée par nom en ordre alphabétique insensible à la casse côté présentation **[A]** (la spec ne dicte aucun ordre ; un ordre stable évite qu'un adversaire ajouté saute de place). Raisons de ne pas faire de pastilles : les noms de clubs sont longs et de longueur très variable, une liste verticale ne déborde jamais et laisse à PO-TO-10 la place d'un futur contrôle de retrait à droite de chaque ligne. **Aucun marqueur de retrait, aucune icône d'action, même désactivée** (AC-TO-17). Le bouton « + Adversaire » reste sous la liste, toujours présent (on peut en relier plusieurs). Pas de compteur dans l'en-tête ni sur la ligne repliée (§1, hors périmètre).
3. **Chargement [A]** : 2 lignes `Skeleton` (hauteur ~16 px, largeurs différentes) à la place du texte/de la liste ; l'en-tête et le bouton restent rendus. Le bouton n'est **pas** désactivé pendant le chargement : le dialogue ne dépend pas de cette liste.
4. **Erreur de chargement [A]** : à la place du contenu, une ligne `text-sm text-destructive`, par exemple « Impossible de charger les adversaires. » suivie d'un bouton texte « Réessayer » (`variant="link"` ou `ghost`, `h-11`) qui relance la requête. `role="alert"` n'est pas nécessaire (affichage déclenché par l'utilisateur au dépliage). Le bouton « + Adversaire » reste disponible : un échec de lecture n'empêche pas d'écrire, et RLS tranche. Message en français, sans détail technique.
5. **Adversaire déjà relié, ajout sans effet (AC-TO-06)** : voir le comportement de succès ci-dessous, traité comme un succès.

### Dialogue « Ajouter un adversaire »

Modelé sur `TeamFormDialog` **[R]** : `Dialog` + `DialogContent` (`sm:max-w-[480px]`, la maquette a ~420 px, acceptable), `DialogHeader`/`DialogTitle`, `<form className="flex flex-col gap-4">`, `DialogFooter`. Composant remonté par `key` (id de l'équipe de la ligne d'origine) plutôt que réinitialisé par effet, comme `TeamFormDialog`. Titre **[M]** : « Ajouter un adversaire ».

| Élément | Source | Spécification |
|---|---|---|
| Alerte d'erreur | [R] | `Alert variant="destructive" role="alert"` en tête du formulaire, comme `TeamFormDialog` ; affichée uniquement en cas d'échec (AC-TO-16) |
| **NOM DE L'ÉQUIPE** | [M] | `Label` (même style capitales que l'existant) + `Input` `h-11 rounded-xl`, `required`, focus automatique à l'ouverture **[A]** (le seul champ à saisir ; l'équipe est déjà présélectionnée). Placeholder : texte d'exemple **générique**, pas le nom de club de la maquette (AC-TO-18), par exemple « Ex. AS Exemple » ; le libellé reste le texte de la maquette, même si « équipe » prête à confusion avec l'équipe du club : **ne pas le reformuler sans retour de la développeuse** |
| **ÉQUIPE DU CLUB CONCERNÉE** | [M] | `Select` shadcn, `SelectTrigger` `h-11 rounded-xl`, **présélectionné sur l'équipe de la ligne** ; options au format `{équipe} · {section} ({saison})`. Options : les équipes déjà chargées par l'écran, sans filtrage supplémentaire (PO-TO-13, en attente). La maquette rend un `<select>` natif ; on utilise le `Select` shadcn par cohérence avec `TeamFormDialog` **[A]**, à signaler si la développeuse préfère le natif |
| Note explicative | [M] | `text-xs text-muted-foreground italic`, texte exact de la maquette : « Les adversaires sont des équipes externes au club, reliées à une de vos équipes pour créer des convocations de match. » Comme la note de `TeamFormDialog`, c'est une règle métier, pas une décoration : ne pas la retirer |
| **Annuler** | [M] | `Button variant="outline"` `h-11 rounded-full`, ferme sans écriture, désactivé pendant l'envoi |
| **Ajouter** | [M] | Bouton principal vert, `h-11 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green disabled:opacity-60`, mêmes classes que l'action principale de `TeamFormDialog` |

**Mise en page.** Champs empilés (pas de paire côte à côte) : la règle `min-w-0` de CLAUDE.md §6 ne s'applique donc pas ici ; si une évolution met deux champs en vis-à-vis, elle s'appliquera. Le libellé d'option est long (« Groupe B · Senior masculin (2025-2026) ») : le déclencheur du `Select` le tronque par défaut dans shadcn, vérifier qu'il tient à la largeur du dialogue sans casser la ligne ; il ne doit pas déborder.

**Validation.**
- « Ajouter » désactivé tant que le nom rogné est vide ou qu'aucune équipe n'est sélectionnée **[A, cohérent avec `canSubmit` de `TeamFormDialog`]** ; aucun message d'erreur affiché tant que l'utilisateur n'a pas tenté de soumettre : le bouton désactivé suffit, comme pour les autres dialogues. La `DomainError` d'AC-TO-08 reste le filet si le bouton est contourné : son message s'affiche dans l'`Alert`.
- Pas de message « adversaire déjà existant » : retrouver par nom est silencieux par construction (§2.3).
- Aucun indice de normalisation de casse (PO-TO-01) : ne rien promettre à l'écran.

**Envoi en cours.** Champs et « Annuler » désactivés, « Ajouter » désactivé et son libellé devient « Ajout… » (motif « Création… » / « Enregistrement… » de `TeamFormDialog`). Pas de spinner nouveau. La fermeture par Échap ou clic extérieur suit le comportement `Dialog` existant ; ne pas le redéfinir **[A]** (mais ne pas fermer pendant l'envoi est souhaitable : à aligner sur ce que fait `TeamFormDialog`).

**Échec (AC-TO-16).** Le dialogue reste ouvert, nom et équipe conservés, `Alert` destructive avec un message français lisible (mapping depuis `DomainError`/erreur mappée, pas de texte Postgres brut). Les champs redeviennent modifiables, « Ajouter » ré-actif.

**Succès (AC-TO-15, AC-TO-06).**
1. Le dialogue se ferme.
2. La requête `teamOpponents(<équipe choisie>)` est invalidée. Si l'équipe choisie est celle de la ligne ouverte, la liste se met à jour en place. **Si elle diffère de la ligne d'origine [A]**, la ligne d'origine n'est pas modifiée ; la ligne de l'équipe choisie, **si elle est dépliée**, montre le nouvel adversaire, sinon il apparaîtra au prochain dépliage (cache invalidé, donc rechargé). On **ne déplie pas automatiquement** la ligne choisie et on ne fait pas défiler la page vers elle : décision d'affichage non trivialement justifiée, à confirmer (voir Questions).
3. **Aucun toast ni message de succès** : aucun motif de ce type n'est montré par les maquettes ni imposé par la spec ; le nouvel élément dans la liste est le retour. **Ajout sans effet** (nom déjà relié, AC-TO-06) : même comportement (fermeture, rien ne change), donc pas de message distinct. Si la développeuse veut un retour dans ce cas, c'est un ajout hors maquette.
4. Le focus revient sur le bouton « + Adversaire » qui a ouvert le dialogue (comportement natif de Radix `Dialog`, à ne pas casser par un remontage de ce bouton).

### Ce qui n'est pas dessiné

Retrait (PO-TO-10), choix d'un adversaire existant / autocomplétion (PO-TO-11), options filtrées du sélecteur (PO-TO-13), normalisation des noms (PO-TO-01, PO-TO-02). La liste verticale laisse la place d'un contrôle par ligne plus tard ; aucun espace réservé ni bouton désactivé n'est rendu aujourd'hui.

### Nouveau motif ?

**Non.** Ligne dépliable : `AuditLogTable`. Dialogue : `TeamFormDialog`. Boutons pilule : « + Coach ». Aucun visuel nouveau hors du contenu de la sous-section, qui est un simple texte ou une liste. Aucun prototype Claude Design n'est demandé.

### Questions UI

Aucune bloquante.

1. **Ligne choisie ≠ ligne d'origine (non bloquant).** Faut-il déplier et faire défiler vers la ligne de l'équipe choisie après succès, ou laisser l'utilisateur la retrouver ? Par défaut : ne rien faire.
2. **Sélecteur natif ou `Select` shadcn (non bloquant).** La maquette montre une apparence de `<select>` natif ; par défaut, `Select` shadcn comme le reste des dialogues du backoffice.
3. **Libellé du champ « NOM DE L'ÉQUIPE » (non bloquant).** Il désigne l'équipe adverse mais côtoie « ÉQUIPE DU CLUB CONCERNÉE » : repris tel que sur la maquette ; à confirmer si elle veut « NOM DE L'ADVERSAIRE ».
4. **Libellé du chevron avec la saison (non bloquant).** Nécessaire pour distinguer les deux « Groupe A » ; c'est un ajout de texte d'accessibilité uniquement, invisible à l'écran.
5. **Écart de hauteur de ligne (non bloquant).** Un chevron `h-11` rend les lignes plus hautes que sur la maquette si la ligne n'a pas déjà des boutons `h-11` ; ce n'est pas le cas ici (« + Coach » est déjà `h-11`), donc pas de changement visible de hauteur attendu.
