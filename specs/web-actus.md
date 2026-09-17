# Spec — Backoffice web : console de rédaction des actus (`web-actus`)

> Statut : **première tranche d'écriture sur `club_news`**. Cette spec tranche **PO-AT-01 pour la seule surface backoffice/administrateur** (`specs/actus.md` §3) et ferme l'entrée « Permissions d'écriture sur `club_news` — non définies » de `docs/DEFAULTS-A-CHALLENGER.md` **dans ce périmètre uniquement**. Elle répond aussi à PO-WE-10 (`specs/web-empty-state.md`) : oui, l'entrée « Actus » du backoffice est bien une console de rédaction.
> **`specs/actus.md` n'est pas modifiée par cette passe** — c'est la spec de lecture mobile, elle reste telle quelle. Une conséquence de cette spec entre toutefois en contradiction littérale avec son AC-AT-05 : voir §2.3 et PO-WA-01, à arbitrer par la développeuse.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (matrice RBAC, exigences transversales §11.3), `docs/roles-personas-as-caribbean.md` (8 rôles, « actions sensibles journalisées » pour l'Administrateur, moindre privilège), `specs/actus.md` (entité `ClubNews`, table `club_news`, `isNewsVisible`, `NewsRepository`, PO-AT-01 à PO-AT-06), `specs/web-empty-state.md` (coquille backoffice, `backoffice:access`, AC-WE-09/12/13/14/18, PO-WE-01/10/11), `docs/DEFAULTS-A-CHALLENGER.md`, `CLAUDE.md` §3/§5/§6/§7/§9.
> État du code lu : `supabase/migrations/20260904205258_club_news.sql`, `supabase/migrations/20260811171754_initial_schema.sql` (helpers `private.is_admin()` / `private.has_role()`), `src/domain/policies/{actions,rbac-matrix}.ts`, `src/presentation/features/backoffice/news/BackofficeNewsPage.tsx` (stub citant PO-AT-01), `src/presentation/features/backoffice/backoffice-nav.ts`.
> Maquettes : `docs/designs/desktop/actus/[Admin] Web - Actus{,-2,-3}.png`, **lues directement**. Voir §0.

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne n'existe au §2 du registre pour la feature `web-actus`.** Trois exports PNG sont présents dans le dépôt (`docs/designs/desktop/actus/`), importés directement par la développeuse sans lien artifact — même cas de figure que `menu`, `actus`, `player-vote` et `web-empty-state`, pour lequel le registre a une valeur de statut dédiée : **`instantané seul`**. Conformément au §4 du registre, ce statut signifie « utiliser l'instantané local versionné et **ne pas demander de lien artifact** ». **Aucun lien n'est donc demandé ici, ni maintenant ni lors d'une passe ultérieure.**

Le §4 demande à l'agent d'ajouter lui-même la ligne manquante. L'agent PO **ne peut écrire que dans `specs/`** — même limite que pour `actus` (PO-AT-07), `player-vote` (§0) et `web-empty-state` (§0). Ligne **pré-rédigée, à recopier telle quelle** dans le tableau du §2 du registre par le premier agent ou la développeuse ayant les droits d'écriture sur `docs/` (PO-WA-11) :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| web-actus — **backoffice desktop : console de rédaction des actus** (`[Admin] Web - Actus`, `[Admin] Web - Actus-{2,3}`) | — aucun lien fourni | 2026-09-17 | `docs/designs/desktop/actus/[Admin] Web - Actus{,-2,-3}.png` | **instantané seul** |

> Trois notes à joindre à la ligne. (a) **Les trois exports ne sont pas trois écrans mais un écran et ses deux boîtes de dialogue** : `Actus-2` = liste + dialogue « Créer une actu », `Actus-3` = liste + dialogue « Modifier l'actu ». (b) **`[Admin] Web - Actus.png` est un export partiel et en grande partie illisible** : fond transparent, texte clair invisible au rendu ; seuls quelques fragments ressortent (« + Nouvelle actu », « Voir le lien », « Active », « Expirée »), tous cohérents avec `Actus-2`/`Actus-3`. Ce n'est pas un quatrième état à interpréter — se référer à `Actus-2`/`Actus-3`. (c) La navigation latérale des maquettes montre **7 entrées** là où la coquille construite en compte 5 — voir PO-WA-09, **hors périmètre de cette spec**.

## 1. Périmètre

### Ce que c'est

Le **chemin d'écriture** sur `club_news`, rendu dans le backoffice web desktop (`/admin/news`, `presentation/features/backoffice/news/`) : une **liste administrative de toutes les actus** et deux boîtes de dialogue, **création** et **modification**. C'est exactement la demande formulée par la développeuse (« User should be able to add club_news in this tabs and to edit it ») et exactement ce que `specs/web-empty-state.md` §1 avait mis hors périmètre faute de PO-AT-01.

Cette tranche remplace le stub `BackofficeNewsPage.tsx`, dont le commentaire cite PO-AT-01 comme motif de non-construction. **C'est aussi la première feature du backoffice qui lit et écrit de la donnée métier réelle** : l'avertissement de `specs/web-empty-state.md` §2 s'applique en plein — le garde `backoffice:access` ne protège rien, cette feature apporte ses propres politiques RLS (§2.3).

### Rattachement CDC

| Élément | Module CDC | Priorité |
|---|---|---|
| Console de rédaction des actus | Aucun module ne décrit littéralement un fil d'actus club-wide non ciblé (`specs/actus.md` §1, PO-AT-02 **toujours ouvert**). Voisin le plus proche : **Communication** | **Non tranchée** — reprend l'indétermination de PO-AT-02, cette spec ne la lève pas |
| Surface backoffice | Non — le backoffice est une **surface de rendu**, pas un module (`specs/web-empty-state.md` §1) | — |

Écart assumé et repris de `specs/actus.md` §1 : **ajouter un chemin d'écriture ne crée pas de rattachement CDC là où il n'y en a pas**. Cette spec ne fait donc remonter aucune priorité et ne prétend pas que la feature est P0 ou P1.

### Contenu retenu — d'après les maquettes, factuellement

**Liste** (`Actus-2`/`Actus-3`, arrière-plan) : un titre de page « Actus », un bouton primaire **« + Nouvelle actu »** en haut à droite, et un tableau à **six colonnes** — `TITRE`, `CONTENU`, `DATE`, `EXPIRATION`, `LIEN`, `STATUT` — plus une **action d'édition par ligne** (icône crayon en bout de ligne). La colonne `LIEN` rend un lien « Voir le lien » quand un lien existe, un tiret `—` sinon ; la colonne `EXPIRATION` rend un tiret `—` quand elle est vide. La colonne `STATUT` ne rend que deux valeurs : **« Active » (vert)** et **« Expirée » (rouge)**.

**Dialogue « Créer une actu »** (`Actus-2`) : cinq champs — `TITRE` (texte, placeholder « Ex. Reprise des entraînements »), `CONTENU` (texte, placeholder « Ex. Tous les groupes reprennent le 2 septembre »), `DATE` (date), `DATE D'EXPIRATION (OPTIONNEL)` (date), `LIEN (OPTIONNEL)` (texte, placeholder « https://... ») — et deux boutons, **« Annuler »** et **« Créer »**.

**Dialogue « Modifier l'actu »** (`Actus-3`) : **les mêmes cinq champs**, pré-remplis depuis la ligne sélectionnée, et deux boutons, **« Annuler »** et **« Enregistrer »**.

Ce que les maquettes **ne montrent pas**, et qui compte autant : aucun sélecteur de statut (`brouillon`/`publié`/`archivé`), aucun bouton « Publier », aucune action de suppression ni d'archivage, **aucune colonne ni champ d'auteur**, aucun ciblage par section/équipe/saison, aucune pièce jointe.

### Correspondance champs ↔ colonnes existantes

La table `club_news` n'est **pas redéfinie** ici ; elle existe (`supabase/migrations/20260904205258_club_news.sql`, décrite par `specs/actus.md` §2). Lecture des maquettes contre le schéma en place :

| Libellé maquette | Colonne | Note |
|---|---|---|
| `TITRE` | `title` | obligatoire |
| `CONTENU` | `details` | obligatoire. La maquette utilise un champ d'une ligne ; `details` est un `text` libre |
| `DATE` | `published_at` | **jamais `created_at`** (`specs/actus.md` §2, AC-AT-02). Confirmé par la maquette : `Actus-3` pré-remplit `05/09/2025` pour la ligne dont la colonne `DATE` affiche `2025-09-05` |
| `DATE D'EXPIRATION (OPTIONNEL)` | `expires_at` | nullable |
| `LIEN (OPTIONNEL)` | `link` | nullable |
| `STATUT` (« Active » / « Expirée ») | **aucune colonne** — valeur **dérivée** | Projection de `isNewsVisible(news, now)`, déjà écrit en domaine. Voir §2.2 |
| — | `created_by` | renseignée automatiquement à la création, jamais saisie ni affichée (aucune colonne auteur dans la maquette) |
| — | `status` | **aucun contrôle dans la maquette** — voir §2.2 et PO-WA-02 |

### Hors périmètre — explicitement

- **`specs/actus.md` et le fil mobile.** Ni l'écran mobile, ni `listVisible()`, ni la politique `club_news_select_visible`, ni `isNewsVisible` ne changent de comportement pour un compte non-administrateur.
- **La suppression et l'archivage.** Aucune action de ce type dans les maquettes ⇒ **aucune politique `delete`**, aucun bouton, aucun passage à `archived`. Ce n'est pas un oubli à combler en implémentation (PO-WA-06).
- **Un workflow brouillon → publication.** Les maquettes ne proposent aucun contrôle de statut (PO-WA-02).
- **La programmation différée.** Saisir une `DATE` future **ne diffère pas la visibilité** : la RLS de lecture ne filtre que `status` et `expires_at` (PO-WA-05).
- **Les autres destinations du backoffice** et les deux entrées de navigation supplémentaires visibles sur les maquettes (« Vue d'ensemble », « Journal d'audit ») — PO-WA-09.
- **Les éléments déjà exclus par `specs/web-empty-state.md`** et reconduits tels quels : champ de recherche de la barre supérieure (AC-WE-15), badges numériques de la navigation et bloc « ALERTE » (AC-WE-13, PO-WE-11), pastille de notifications. Les maquettes les montrent ; ils restent hors périmètre.
- **Les points ouverts non liés de `specs/web-empty-state.md`** : PO-WE-01 (élargissement des rôles), PO-WE-04 (MFA), PO-WE-06 (bascule multi-rôles), PO-WE-11. Aucun n'est tranché ici.
- **Toute notification** (push, courriel) déclenchée par la publication d'une actu — module Communication, P1, non demandé.
- **Tout rendu mobile de cette console** : desktop-only, garde de largeur de `specs/web-empty-state.md` AC-WE-18/PO-WE-09 inchangé.

## 2. Modèle et politiques

### 2.1 Aucune colonne nouvelle dans cette passe

Les cinq champs des maquettes se logent intégralement dans les colonnes existantes. **Aucun `ALTER TABLE` n'est nécessaire** — et notamment **aucune colonne `updated_at` / `updated_by` n'est ajoutée**, parce que les maquettes n'en montrent pas et que rien dans les documents de cadrage ne l'exige. Conséquence à assumer explicitement plutôt qu'à découvrir plus tard : **une modification d'actu ne laisse aujourd'hui aucune trace, ni en base ni ailleurs** (§3, PO-WA-04).

`created_by` reste une **donnée métier ordinaire**, pas une entrée de journal d'audit (`specs/actus.md` §2), et n'est **pas affichée** — aucune colonne auteur dans les maquettes.

### 2.2 La colonne `STATUT` est dérivée, pas stockée

Les maquettes affichent « Active » / « Expirée », alors que `club_news.status` vaut `draft | published | archived`. Ce ne sont pas les mêmes valeurs, et **ce n'est pas une incohérence de maquette** : les deux lignes illustrées se lisent directement comme une dérivation d'expiration — ligne 1, `EXPIRATION` = `—`, statut « Active » ; ligne 2, `EXPIRATION` = `2025-09-10` (passée), statut « Expirée ».

**Position retenue** : la colonne `STATUT` rend `isNewsVisible(news, now)` — le prédicat pur **déjà écrit** (`domain/policies/news-visibility.ts`) — projeté en « Active » / « Expirée ». Aucune colonne calculée en base, aucun nouveau prédicat.

**Conséquence sur `status`** : le dialogue de création n'ayant **aucun sélecteur de statut** et le bouton étant « Créer » (pas « Publier »), une actu créée depuis cette console est **publiée d'emblée** — `status = 'published'`, `published_at` renseignée depuis le champ `DATE`, ce qui satisfait la contrainte `club_news_published_has_date` existante. Les valeurs `draft` et `archived` restent dans le `check` de la table mais **ne sont produites par aucun chemin applicatif** de cette passe. Que ce soit un état définitif ou l'attente d'un workflow de publication est **ouvert (PO-WA-02)** ; comment étiqueter une ligne `draft`/`archived` arrivée par l'éditeur SQL est ouvert aussi (PO-WA-03).

### 2.3 Politiques RLS — trois ajouts, une contradiction à arbitrer

`club_news` porte aujourd'hui **une seule** politique, `club_news_select_visible` (select, `authenticated`, `published` + non expirée). Trois politiques sont à ajouter dans une **nouvelle migration**, sans toucher à l'existante :

1. **Lecture administrateur élargie.** La liste des maquettes affiche une ligne **« Expirée »** — donc une ligne que `club_news_select_visible` ne renvoie pas. Une politique `select` supplémentaire, `using (private.is_admin())`, est indispensable : les politiques permissives Postgres se combinent en `OR`, la lecture des autres rôles est donc strictement inchangée.
2. **Insertion administrateur**, `with check (private.is_admin() and created_by = (select auth.uid()))` — le `created_by` n'est pas fourni librement par le client.
3. **Mise à jour administrateur**, `using (private.is_admin()) with check (private.is_admin())`. Les maquettes montrent le crayon **sur toutes les lignes**, sans colonne auteur : un administrateur modifie **n'importe quelle actu**, y compris celle rédigée par un autre administrateur. Pas de restriction « sa propre ligne ».

`private.is_admin()` existe déjà (`20260811171754_initial_schema.sql`) — rien à créer côté helper. **Aucune politique `delete`** (§1).

> **Contradiction littérale avec `specs/actus.md` AC-AT-05**, à signaler et non à contourner. AC-AT-05 énonce : « le résultat d'AC-AT-04 est **identique quel que soit le rôle** du jeton (les 8 rôles, y compris administrateur) : aucune ligne supplémentaire n'est visible pour qui que ce soit ». La politique (1) le rend faux pour un jeton administrateur. L'intention d'origine — le fil mobile ne varie pas selon le rôle — reste vraie, mais la **formulation** porte sur la table, pas sur le fil. `specs/actus.md` n'étant pas modifiable par cette passe (décision de cadrage, en-tête), l'amendement de AC-AT-05 est **à porter par la développeuse** → **PO-WA-01**. Tant qu'il n'est pas porté, deux specs se contredisent sur un critère testable : à ne pas laisser passer silencieusement en recette.

### 2.4 Domaine

Extension de l'existant, pas de doublon :

- `NewsRepository` (`domain/repositories/news-repository.ts`) gagne **`listAll()`** (liste administrative, toutes lignes) et les deux méthodes d'écriture (**`create`**, **`update`**). `listVisible()` est **conservée telle quelle** — c'est le fil mobile. Une seule interface par ressource, conformément au découpage du dépôt ; pas de `BackofficeNewsRepository` séparé.
- Deux use cases, `CreateClubNewsUseCase` et `UpdateClubNewsUseCase` (`domain/usecases/`), fonctions async pures — aucun import React / Supabase / TanStack Query (`CLAUDE.md` §3/§6).
- Validation métier **dans le domaine**, pas dans le composant : `title` et `details` non vides, `publishedAt` requise (corollaire direct de `club_news_published_has_date`), `link` et `expiresAt` optionnels. Les règles non tranchées (ordre `expiresAt` > `publishedAt`, format de `link`, longueurs maximales) ne sont **pas inventées ici** → PO-WA-07.
- `isNewsVisible` est **réutilisée**, pas dupliquée, pour la colonne `STATUT`.
- Clés de requête centralisées dans `presentation/shared/query-keys.ts` (`CLAUDE.md` §4) — jamais inline.

## 3. RBAC

### Ce que tranche cette spec — et ce qu'elle ne tranche pas

**PO-AT-01 est tranché pour la seule surface backoffice : l'écriture sur `club_news` est réservée à l'Administrateur.** Fondements, tous vérifiables :

- La maquette est celle de l'« **Espace admin** », dont l'accès est déjà borné à `admin` (`'backoffice:access': ['admin']`, `rbac-matrix.ts`), et dont l'écran de connexion porte la mention « Accès réservé aux comptes administrateurs invités » (`specs/web-empty-state.md` §1).
- **Les maquettes ne portent aucun signal d'un ensemble de rédacteurs plus large** : pas de colonne `AUTEUR` dans le tableau, pas de champ auteur dans les dialogues, pas de mention de rôle autre que la pastille « Administrateur » de la barre supérieure (qui décrit l'utilisateur connecté, pas l'auteur d'une ligne). C'est la vérification explicitement demandée au cadrage : elle ne révèle rien qui justifierait d'élargir.
- Moindre privilège (`docs/roles-personas-as-caribbean.md`, « Règle de sécurité ») : n'ouvrir à personne d'autre tant que le Bureau n'a pas tranché.

**Ce qui reste ouvert** : l'hypothèse de séance de `specs/actus.md` §3 (sous-ensemble de Trésorier / Dirigeant habilité / Administrateur) et la sous-question « Secrétaire » ne sont **pas** résolues — elles le sont seulement *dans la mesure où* elles concerneraient une autre surface ou un autre rôle → **PO-WA-08**. La ligne de matrice « Envoyer une communication ciblée » reste **non transposable** pour les raisons déjà exposées dans `specs/actus.md` §3 (envoi ciblé et scopé ≠ fil club-wide) : elle n'est pas mobilisée ici pour justifier quoi que ce soit.

### Tableau par rôle

| Rôle | Lecture du fil (mobile, inchangé) | Lecture de la liste administrative `/admin/news` | Création / modification |
|---|---|---|---|
| Joueur/Joueuse | ✅ publiées non expirées | ❌ | ❌ |
| Coach/Staff | ✅ publiées non expirées | ❌ | ❌ |
| Responsable de section | ✅ publiées non expirées | ❌ (PO-WE-01, PO-WA-08) | ❌ (PO-WA-08) |
| Dirigeant habilité | ✅ publiées non expirées | ❌ (PO-WE-01, PO-WA-08) | ❌ (PO-WA-08) |
| Trésorier | ✅ publiées non expirées | ❌ | ❌ (PO-WA-08) |
| Référent médical | ✅ publiées non expirées | ❌ | ❌ |
| Bénévole | ✅ publiées non expirées | ❌ | ❌ |
| **Administrateur** | ✅ publiées non expirées | ✅ **toutes les lignes**, quel que soit le statut ou l'expiration | ✅ **toute ligne**, y compris celle d'un autre administrateur |

Aucune portée section/équipe/saison sur aucune de ces cases : `club_news` est club-wide (`specs/actus.md` §3) et `admin` ne porte pas de champ de portée dans `RoleAssignment` (`rbac-matrix.ts`).

### Entrée de matrice proposée — `'news:write': ['admin']`

Une action nouvelle est proposée, **couvrant création et modification ensemble** (aucune maquette, aucun document ne distingue un rôle qui pourrait faire l'une sans l'autre) :

```
'news:write': ['admin']
```

Justification au regard du critère commenté en tête de `rbac-matrix.ts` (« une entrée n'a sa place ici que si `presentation/` doit décider quelque chose avant ou indépendamment du résultat de la requête ») : `presentation/` doit décider de rendre ou non « + Nouvelle actu » et l'icône crayon. Objection honnête : **aujourd'hui cette décision est constante**, puisque la population du backoffice (`backoffice:access`) et celle des rédacteurs coïncident exactement — une entrée de matrice serait donc redondante, et le critère pencherait pour « RLS-only ».

**Position retenue quand même : créer l'action.** Motif : les deux populations coïncident *par accident de calendrier*, pas par construction. PO-WE-01 est explicitement ouvert sur l'élargissement de `backoffice:access` à Dirigeant habilité et/ou Responsable de section ; sans action distincte, cet élargissement **donnerait silencieusement le droit d'écrire des actus** à des rôles dont personne n'a validé qu'ils l'ont — c'est-à-dire résoudrait PO-AT-01 par effet de bord, exactement ce que `specs/actus.md` refuse. L'action distincte rend les deux décisions indépendantes. Le nom (`news:write` plutôt que `news:create` + `news:update`, ou `news:manage`) est une proposition ; le découpage en deux actions distinctes est à rouvrir seulement si un rôle obtient un jour l'un sans l'autre (PO-WA-08).

Miroir manuel obligatoire des deux côtés (`CLAUDE.md` §7) : les trois politiques RLS de §2.3 portent en commentaire le nom de l'action, et l'entrée de matrice renvoie aux politiques.

### Comptes multi-rôles

Sans effet ici. Un compte `admin` + `coach` voit le fil mobile comme tout le monde et la console comme administrateur ; aucun rôle actif (`active-role-scope.ts`) n'intervient, la console ne dépendant que de la présence du rôle `admin`. PO-WE-06 (bascule entre surfaces) reste ouvert et n'est **pas** traité ici.

## 4. Données sensibles

| Nature | Cette feature | Conséquence |
|---|---|---|
| **Données de santé** | Aucune | Aucun trigger d'audit d'accès, aucun filtre de colonne |
| **Données financières** | Aucune | — |
| **Données nominatives structurées** | Aucune — `created_by` n'est ni affichée ni saisie ; seule l'identité de l'utilisateur connecté apparaît dans la barre supérieure, déjà cadré par `specs/web-empty-state.md` §3 | Pas d'« export nominatif » au sens du CDC §11.3 |
| **Contenu éditorial libre** | **Oui, et c'est le point nouveau** | Voir ci-dessous |

**Journal d'audit — question désormais réelle, pas théorique (PO-WA-04).** `specs/actus.md` PO-AT-03 posait la question de journaliser la publication d'une actu et la renvoyait explicitement « à la passe de rédaction ». **Cette passe est celle-là.** Les éléments, sans arbitrage de ma part :

- Le CDC §11.3 énumère les actions à tracer (création/suppression de compte, changement de rôle, consultation de donnée santé, modification de paiement, correction de points Legacy, export nominatif) — **publier ou modifier une actu n'y figure pas**. Lecture littérale : rien à tracer.
- `docs/roles-personas-as-caribbean.md` borne en revanche le rôle Administrateur par « **actions sensibles journalisées** », et cette console est une surface purement administrateur. Les maquettes ajoutent d'ailleurs une entrée de navigation « **Journal d'audit** » (hors périmètre, PO-WA-09) — signal que le sujet est vivant côté club.
- **Aucune trace n'existe aujourd'hui pour une modification** : pas d'`updated_at`, pas d'`updated_by` (§2.1). Un titre ou un contenu réécrit après diffusion club-wide est indétectable. C'est le cas le plus gênant, plus encore que la création (tracée *de facto* par `created_by` + `created_at`).
- Si une trace est décidée : **depuis le use case**, action métier avec intention, **jamais depuis un composant** (`CLAUDE.md` §6, `ARCHITECTURE.md` §11), et avec une durée de rétention à fixer (`RETENTION_PURGE.md`).

**RGPD — PO-AT-04 devient concret (PO-WA-10).** Tant qu'aucun chemin d'écriture n'existait, « du texte libre peut contenir le nom d'un licencié ou un lien vers un album photo » était une remarque de principe. **À partir de cette passe, un administrateur saisit réellement ce texte depuis l'application** : nom de licencié dans `title`/`details`, lien vers un album photo dans `link`, droit à l'image, consentement. Arbitrage du **référent RGPD**, non désigné à ce jour (`docs/GOUVERNANCE.md` §7, CDC §22 décision n°5). Cette spec ne propose **aucun garde-fou technique** (pas de filtre, pas de validation de contenu) : ce serait inventer une exigence.

**Rétention.** `expires_at` masque, ne supprime pas (`specs/actus.md` §4) — inchangé. Cette console n'offrant pas de suppression (§1), le volume de `club_news` ne décroît jamais par l'application. PO-AT-05 (purge des actus expirées/archivées, job planifié Supabase, jamais dans `domain/`) reste ouvert côté `specs/actus.md`, et devient un peu plus pressant.

**Nom de personne dans les maquettes.** Les trois exports affichent un nom et un prénom de personne dans la barre supérieure. `CLAUDE.md` §9 l'interdit partout, y compris en exemple ou en fixture — même règle qu'AC-WE-14, reprise ici en AC-WA-21. Cette spec ne le reproduit pas.

## 5. Critères d'acceptation

Numérotation **`AC-WA-xx`**, préfixe à deux lettres par feature comme AC-AT (actus), AC-WE (web-empty-state), AC-CD, AC-PD, AC-PV.

**Base de données et RLS**

- **AC-WA-01** — Une nouvelle migration ajoute sur `public.club_news` exactement trois politiques : un `select` administrateur, un `insert` administrateur, un `update` administrateur, toutes appuyées sur `private.is_admin()`. **Aucune politique `delete` n'est créée.**
- **AC-WA-02** — La politique `club_news_select_visible` existante n'est ni modifiée, ni supprimée, ni remplacée. Avec un jeton **non administrateur** (les 7 autres rôles), `select` sur `club_news` renvoie **exactement** le résultat d'AC-AT-04 : publiées et non expirées, rien de plus.
- **AC-WA-03** — Avec un jeton **administrateur**, `select` sur `club_news` renvoie **toutes** les lignes, y compris `draft`, `archived` et publiées expirées. Testé contre la base avec un jeton, hors application. *(Amende de fait AC-AT-05 — voir §2.3 et PO-WA-01.)*
- **AC-WA-04** — Avec un jeton **non administrateur**, tout `insert` et tout `update` sur `club_news` échoue. Testé pour au moins un rôle disposant d'un ✅ sur la ligne « Envoyer une communication ciblée » (ex. coach), afin de vérifier qu'aucun élargissement par analogie n'a eu lieu.
- **AC-WA-05** — L'`insert` force `created_by` à l'utilisateur authentifié : une tentative d'insertion avec un `created_by` tiers est rejetée.
- **AC-WA-06** — **Aucune colonne n'est ajoutée à `club_news`** dans cette passe (ni `updated_at`, ni `updated_by`, ni `author`, ni `season_id`, ni `event_date`), et la contrainte `club_news_published_has_date` est inchangée et toujours vérifiée.
- **AC-WA-07** — Les trois politiques portent chacune un commentaire SQL nommant l'action `'news:write'` qu'elles miroitent, et l'entrée de matrice renvoie aux politiques (miroir manuel, `CLAUDE.md` §7).

**Domaine**

- **AC-WA-08** — `'news:write'` est ajoutée à `domain/policies/actions.ts` et vaut `['admin']` dans `rbac-matrix.ts`. **Aucune autre action, aucun autre rôle n'est ajouté** (`CLAUDE.md` §7) — en particulier `backoffice:access` reste `['admin']` et n'est pas élargie.
- **AC-WA-09** — `NewsRepository` conserve `listVisible()` **inchangée** et gagne `listAll()`, `create(...)`, `update(...)`. Aucun second repository de news n'est créé.
- **AC-WA-10** — `CreateClubNewsUseCase` et `UpdateClubNewsUseCase` existent dans `domain/usecases/`, sans aucun import React, Supabase, TanStack Query ni `window`, et sans `useQuery`/`useMutation` à l'intérieur.
- **AC-WA-11** — La création refuse, **depuis le domaine** (`DomainError`, pas une validation de composant), un `title` vide, un `details` vide ou une `publishedAt` absente. `link` et `expiresAt` absents sont des cas **valides**.
- **AC-WA-12** — La création produit une ligne `status = 'published'` avec `published_at` issue du champ `DATE` du formulaire. Aucun chemin applicatif ne produit `draft` ni `archived` (PO-WA-02).
- **AC-WA-13** — La colonne `STATUT` de la liste est calculée via `isNewsVisible` **réutilisée telle quelle** ; aucun second prédicat de visibilité, aucune colonne calculée en base, aucune duplication de la règle.

**Écran `/admin/news`**

- **AC-WA-14** — `/admin/news` ne rend plus `BackofficeEmptyState` inconditionnellement : il rend un tableau à six colonnes `TITRE`, `CONTENU`, `DATE`, `EXPIRATION`, `LIEN`, `STATUT`, plus une action d'édition par ligne.
- **AC-WA-15** — La colonne `DATE` rend `published_at`, **jamais `created_at`** (mirroir d'AC-AT-02). Une `EXPIRATION` nulle et un `LIEN` nul rendent chacun un marqueur d'absence explicite (`—`), jamais une cellule vide ambiguë ni un bouton désactivé.
- **AC-WA-16** — « + Nouvelle actu » ouvre un dialogue de création comportant **exactement cinq champs** : titre, contenu, date, date d'expiration (optionnelle), lien (optionnel). **Aucun sélecteur de statut, aucun champ auteur, aucun ciblage section/équipe/saison, aucune pièce jointe.**
- **AC-WA-17** — L'action d'édition d'une ligne ouvre un dialogue **pré-rempli** avec les valeurs de cette ligne, aux mêmes cinq champs, et enregistre la modification sur la **même** ligne (pas de création d'un doublon).
- **AC-WA-18** — **Aucun contrôle de suppression ni d'archivage** n'est rendu, à aucun endroit de l'écran (ni ligne, ni dialogue, ni menu contextuel) — comportement voulu, pas un oubli (§1, PO-WA-06).
- **AC-WA-19** — Après une création ou une modification réussie, la liste reflète le changement **sans rechargement manuel de la page** (invalidation via une clé centralisée dans `presentation/shared/query-keys.ts`, jamais une `queryKey` inline).
- **AC-WA-20** — Les trois états sont couverts et distincts : chargement (jamais un flash de liste vide), erreur (message lisible en français issu d'une `DomainError` traduite, jamais un message brut Supabase ni un échec silencieux), liste vide (état vide explicite — **cas normal, jamais une erreur**). Un échec de création/modification laisse le dialogue ouvert avec les saisies conservées, il ne les efface pas.
- **AC-WA-21** — Aucun nom de personne n'est codé en dur, y compris celui des maquettes, y compris en placeholder ou en fixture de test (`CLAUDE.md` §9).
- **AC-WA-22** — Aucun compteur, badge numérique ou bloc « ALERTE » de la maquette n'est rendu (reconduction d'AC-WE-13, PO-WE-11) ; la navigation latérale **reste à 5 entrées** — « Vue d'ensemble » et « Journal d'audit » ne sont pas ajoutés (PO-WA-09).

**Transverse et non-régression**

- **AC-WA-23** — L'écran mobile `/actus` et le fil `listVisible()` sont **inchangés** en rendu, en route et en comportement. Vérifiable en régression.
- **AC-WA-24** — Un compte authentifié **sans** le rôle `admin` n'atteint pas `/admin/news` (garde `backoffice:access`, AC-WE-09) ; et même s'il l'atteignait, AC-WA-04 garantit qu'il n'écrit rien — le front n'est pas la sécurité (`CLAUDE.md` §6).
- **AC-WA-25** — CDC §12 : les deux dialogues sont **entièrement utilisables au clavier** (tabulation, soumission, fermeture par `Échap`, focus piégé dans le dialogue et restitué à la fermeture), et les contrastes du fond sombre sont **vérifiés** au niveau AA, pas supposés.
- **AC-WA-26** — Aucun appel Supabase depuis `presentation/`, aucun import de `data/` depuis `presentation/` : câblage par le conteneur DI (`CLAUDE.md` §3). Le ViewModel calcule, la Page ne fait que brancher des booléens.
- **AC-WA-27** — Aucune donnée de santé ni financière n'est lue ou écrite par cette feature.

## 6. Points ouverts

| Réf. | Question | Pour qui | Bloquant ? |
|---|---|---|---|
| **PO-WA-01** | **`specs/actus.md` AC-AT-05 devient faux** pour un jeton administrateur du fait de la politique de lecture élargie (§2.3). La spec de lecture n'est pas modifiable par cette passe : qui porte l'amendement, et sous quelle formulation (« identique pour les 8 rôles » → « identique pour les 7 rôles non administrateurs, sur le chemin de lecture mobile ») ? | Développeuse | **Non** pour construire, **oui** pour la recette — deux specs se contredisent sur un critère testable tant que ce n'est pas fait |
| **PO-WA-02** | `draft` et `archived` restent dans le `check` de la table mais ne sont produits par aucun chemin applicatif (§2.2). Valeurs mortes à retirer un jour, ou workflow de publication (brouillon → relecture → publication) attendu dans une passe ultérieure ? | Bureau / développeuse | Non |
| **PO-WA-03** | Quelle étiquette pour une ligne `draft` ou `archived` dans la colonne `STATUT` ? Les maquettes ne montrent que « Active » et « Expirée », et de telles lignes existent en base (données de test insérées par l'éditeur SQL, `specs/actus.md` §1). **Rouvert et retranché le 2026-09-17** (voir l'amendement en UI design, section `NewsStatusBadge`) : `draft` a désormais son propre libellé « Brouillon », `archived` reste « Expirée ». | Développeuse / designer | Non |
| **PO-WA-04** | **Faut-il journaliser la création et la modification d'une actu ?** Absentes du CDC §11.3, mais le rôle Administrateur est borné par « actions sensibles journalisées ». Sous-question indissociable : faut-il ajouter `updated_at` / `updated_by`, sans quoi **une modification ne laisse aucune trace** (§2.1, §4) ? Si oui : depuis le use case, jamais depuis un composant, et quelle rétention ? Reprend et active PO-AT-03 | Référent RGPD / Bureau | Non pour construire — **à trancher avant mise en production** |
| **PO-WA-05** | Une `DATE` future **ne diffère pas la publication** : la RLS de lecture ne filtre que `status` et `expires_at`, donc une actu datée du mois prochain est visible immédiatement sur le fil mobile avec une date future. Comportement voulu, ou faut-il une visibilité programmée (`published_at > now()` masquée) ? | Bureau / développeuse | Non — mais c'est un piège d'usage réel, pas une subtilité théorique |
| **PO-WA-06** | **Aucune suppression** dans les maquettes. Décision durable (une actu ne se supprime jamais, on la laisse expirer) ou report ? Que fait-on d'une actu publiée par erreur — l'éditer, l'expirer à la date du jour, ou autre ? Lié à PO-AT-05 (purge) | Bureau / développeuse | Non |
| **PO-WA-07** | Règles de validation non tranchées : `expires_at` doit-elle être strictement postérieure à `published_at` (et que faire d'une saisie inverse) ? Faut-il valider le format de `link` (PO-AT-06, non tranché) ? Y a-t-il une longueur maximale sur `title` / `details` ? Rien n'est inventé par cette spec | Développeuse | Non |
| **PO-WA-08** | **PO-AT-01 n'est tranché que pour la surface backoffice.** Le Bureau confirme-t-il l'administrateur comme **seul** rédacteur, ou Dirigeant habilité / Responsable de section / Trésorier doivent-ils écrire (et alors : depuis quelle surface, avec quelle portée) ? Sous-question toujours pendante : « Secrétaire » est-il un manque réel du modèle à 8 rôles ? Couplé à PO-WE-01 — et c'est précisément pour éviter qu'un élargissement de `backoffice:access` ne réponde à cette question par effet de bord que `'news:write'` est une action distincte (§3) | Bureau | Non |
| **PO-WA-09** | Les maquettes montrent **7 entrées** de navigation latérale (« Vue d'ensemble », Utilisateurs, « Sections & équipes », Saisons, Adhésions, Actus, « Journal d'audit ») contre 5 construites (`backoffice-nav.ts`), avec en prime une casse différente sur « Sections & équipes ». **Hors périmètre de cette spec** — signalé pour ne pas le découvrir en implémentation et ne pas l'ajouter en catimini. À noter : « Journal d'audit » recoupe une ligne de matrice réelle et administrateur-exclusive | Développeuse / Bureau | Non |
| **PO-WA-10** | Contenu éditorial libre, **désormais saisi depuis l'application** : noms de licenciés dans `title`/`details`, lien vers un album photo dans `link`, droit à l'image, consentement. Reprend PO-AT-04, qui cesse d'être théorique. Référent RGPD non désigné (`GOUVERNANCE.md` §7) | Référent RGPD | Non — **à trancher avant mise en production** |
| **PO-WA-11** | Ligne `web-actus` à recopier dans `docs/designs/DESIGN_LINKS.md` §2 (statut `instantané seul`) — pré-rédigée au §0 ; aucun lien artifact à demander | Développeuse / premier agent ayant les droits sur `docs/` | Non |
| **PO-WA-12** | Ordre d'affichage et pagination de la liste administrative : non illustrés (2 lignes dans les maquettes). Antéchronologique par `published_at` est l'hypothèse la plus simple, non confirmée — même indétermination que PO-AT-06 côté fil mobile | Développeuse | Non |

## 7. Note pour designer-agent

- Maquettes de référence : `docs/designs/desktop/actus/[Admin] Web - Actus-2.png` (liste + dialogue de création) et `-3.png` (liste + dialogue de modification). `[Admin] Web - Actus.png` est un export partiel largement illisible (§0) — ne pas l'interpréter comme un état distinct. La mise en page, la hiérarchie visuelle et le choix des primitives shadcn relèvent de designer-agent ; cette spec ne les tranche pas.
- Contraintes issues de cette passe, à ne pas contredire : la colonne `DATE` affiche **`published_at`** et jamais `created_at` ; le `STATUT` est **dérivé**, à deux valeurs (« Active » / « Expirée »), pas un champ modifiable ; **aucun sélecteur de statut, aucun champ auteur, aucun contrôle de suppression ou d'archivage** ne doit apparaître, pas même désactivé ; `EXPIRATION` et `LIEN` nuls sont des **cas normaux**, à rendre par un marqueur d'absence explicite.
- La console est **desktop-only** : la garde de largeur de `specs/web-empty-state.md` (AC-WE-18, PO-WE-09) s'applique inchangée. Les surcharges de cible tactile (`h-11`) restent pertinentes pour les champs des dialogues, même sur poste desktop, pour les mêmes raisons qu'au §« Cibles tactiles » de cette spec-là.
- Le dialogue comporte **deux champs de date** ; s'ils sont posés côte à côte, `min-w-0` sur chaque élément de grille est obligatoire (`CLAUDE.md` §6, piège documenté des `<input type="date">`).
- Aucun nom de personne des maquettes ne doit être repris (AC-WA-21), et aucun compteur, badge numérique ou bloc « ALERTE » ne doit être introduit (AC-WA-22).
- **Prêt pour transmission à designer-agent : oui.** Aucun des douze points ouverts ne porte sur la mise en page : PO-WA-01/02/04/05/06/08/10 sont des décisions produit, sécurité ou RGPD ; PO-WA-07/12 des décisions d'implémentation ; PO-WA-09/11 de la documentation ; PO-WA-03 est le seul à effleurer l'UI (une étiquette pour un cas que l'application ne produit pas) et se contourne trivialement par un libellé de repli.

## UI design

### Sources utilisées, par ordre de priorité effectif

1. **`docs/designs/DESIGN_LINKS.md` §2** — aucune ligne n'existait pour `web-actus`. Ligne pré-rédigée par l'agent PO au §0 recopiée telle quelle par le présent agent, avec la note explicative attendue (même mécanique que pour `menu`, `actus`, `player-vote`, `web-empty-state`) : statut **`instantané seul`**, aucun lien artifact demandé, ni maintenant ni à une passe ultérieure.
2. **`docs/designs/desktop/actus/[Admin] Web - Actus-2.png`** (liste + dialogue « Créer une actu ») et **`-3.png`** (liste + dialogue « Modifier l'actu »), lus directement. Conforme au §0 : ce sont un écran et ses deux boîtes de dialogue, pas trois écrans. `[Admin] Web - Actus.png` (illisible, fond transparent) n'a pas été relu en détail ici — le §0 documente déjà que ses seuls fragments lisibles (« + Nouvelle actu », « Voir le lien », « Active », « Expirée ») sont cohérents avec `Actus-2`/`Actus-3`, il n'ajoute aucune information.
3. **`docs/designs/desktop/connexion & empty state/[Admin] Web - Dashboard-{1,2,3}.png`** et la section « UI design » de `specs/web-empty-state.md`, pour la coquille déjà construite (barre supérieure, en-tête générique, navigation latérale) dans laquelle cette feature s'insère — pas redessinée ici, seulement réutilisée.
4. `wireframes-basiques-as-caribbean.md` — non consulté comme référence de mise en page, même raison que `web-empty-state.md` : premier écran desktop à table de données du dépôt, sans équivalent visuel direct côté mobile (carte compacte, « N total, plus récent développé », filtres à puces). Le seul patron mobile repris est conceptuel : une carte de nav disparaît plutôt que d'apparaître désactivée (§ RBAC ci-dessous), et l'esprit du couple « composant se sépare proprement des cas chargement/erreur/vide » déjà appliqué à `NewsCard` côté mobile (`specs/actus.md`).
5. Code déjà construit, réutilisé sans le redessiner : `presentation/features/backoffice/{dashboard/BackofficeDashboardLayout.tsx, components/{BackofficeTopBar,BackofficeSidebar,BackofficePageHeader,BackofficeEmptyState}.tsx, news/BackofficeNewsPage.tsx}` (le stub que cette passe remplace), `backoffice-nav.ts` (entrée `news`), `presentation/features/convocation/components/StatusBadge.tsx` (patron de badge à deux valeurs dérivées, réutilisé pour le statut Actif/Expirée), `presentation/shared/formatters/date-input.ts` (`toDateInputValue`), `presentation/features/backoffice/login/BackofficeLoginPage.tsx` (patron `Alert` d'erreur de formulaire).
6. `specs/web-actus.md` §5 (critères d'acceptation) et §7 (note pour designer-agent) — autoritaires sur ce qui doit apparaître ou non ; appliqués ci-dessous, pas rediscutés.

### Où ça vit

Cinquième et dernière entrée déjà prévue de la navigation latérale du backoffice (`docs/designs/DESIGN_LINKS.md`/`specs/web-empty-state.md` — 5 entrées : Utilisateurs, Sections & Équipes, Saisons, Adhésions, **Actus**). Aucune nouvelle destination : cette feature construit le contenu de `/admin/news`, sous-route déjà routée dans `router.tsx` et déjà présente dans `backoffice-nav.ts`. Elle **remplace** le rendu de `BackofficeNewsPage.tsx`, qui affiche aujourd'hui inconditionnellement `BackofficeEmptyState` avec le commentaire « PO-AT-01 » comme motif de non-construction (commentaire à retirer avec le reste du stub).

**Ce qui ne change pas, réutilisé tel quel** : `BackofficeDashboardLayout` continue d'envelopper la page (barre supérieure sticky, navigation latérale à 5 entrées, en-tête générique « Bonjour, {prénom} » + boutons « Nouvelle section »/« Inviter un utilisateur », tous deux **inertes**, cf. `specs/web-empty-state.md`). Cette passe ne touche à aucun de ces trois composants. Une conséquence à noter, sans qu'elle contredise rien : les maquettes `Actus-2`/`Actus-3` sont cadrées sur le seul corps de page et ne montrent donc pas cet en-tête générique au-dessus du titre « Actus » — ce n'est pas une divergence, c'est un cadrage de capture différent de celui des maquettes `Dashboard-*`. Le titre « Actus » + bouton « + Nouvelle actu » vus dans les maquettes sont un **nouveau bloc**, propre à cette page, rendu par `BackofficeNewsPage` **à l'intérieur** de l'`<Outlet/>`, sous l'en-tête générique existant — pas un remplacement de celui-ci.

### Ce qui change par rôle

Reprend le §3 (RBAC) de cette spec, rien de redéfini ici :

| Rôle | Atteint `/admin/news` | Voit « + Nouvelle actu » et l'icône crayon par ligne |
|---|---|---|
| **Administrateur** (`can(user, 'backoffice:access')`) | ✅ (seul rôle qui franchit déjà la porte du backoffice) | ✅ si `can(user, 'news:write')` — aujourd'hui toujours vrai pour un administrateur |
| Les 7 autres rôles | ❌ — bloqués en amont par `RequireBackofficeAccess` (`backoffice:access`, AC-WA-24) | Sans objet, l'écran n'est jamais atteint |

**Point de conception à ne pas sauter, même si les deux populations coïncident aujourd'hui** : le §3 de cette spec crée `'news:write'` comme action **distincte** de `'backoffice:access'`, précisément pour que l'élargissement futur de `backoffice:access` (PO-WE-01) ne donne pas silencieusement le droit d'écrire des actus. Ce choix n'a de sens que si la page le respecte dès cette passe — le ViewModel doit calculer `canWrite = can(user, 'news:write')` séparément de l'accès à la route, et la Page conditionne sur ce booléen, jamais sur le seul fait d'être arrivé sur l'écran. Concrètement, aujourd'hui, ça ne change rien à l'écran rendu (un administrateur a toujours les deux) ; le jour où `backoffice:access` s'élargit sans élargir `news:write`, un compte non-administrateur verra la liste (lecture ouverte par la RLS élargie de §2.3 **si** un jour `listAll()` est exposée à un rôle non-admin — hors périmètre actuel, §3 tableau) sans bouton « + Nouvelle actu » ni icône crayon, à la manière dont une carte de menu disparaît plutôt que d'apparaître désactivée — même principe appliqué ici à deux contrôles d'un même écran plutôt qu'à une carte entière.

### Écran — liste (`/admin/news`)

Reprend l'arrière-plan de `Actus-2.png`/`Actus-3.png` (les deux montrent la même liste, non masquée par leur dialogue respectif dans sa partie visible).

**Bloc de titre**, au-dessus du tableau, dans l'`<Outlet/>` :
- `h2` « Actus » (même gabarit typographique que le `h1` « Bonjour, {prénom} » de l'en-tête générique, mais niveau de titre inférieur puisqu'il est imbriqué sous lui).
- Bouton primaire « + Nouvelle actu » aligné à droite, `h-11`, `rounded-full`, fond `bg-coach-green` — même traitement visuel que le bouton « Inviter un utilisateur » déjà construit, mais **actif** cette fois (pas de variante `disabled` : c'est la première action d'écriture réelle du backoffice). Ouvre le dialogue de création (§ ci-dessous). **Rendu uniquement si `canWrite`** (voir tableau ci-dessus) — jamais grisé : conformément à la contrainte « une carte disparaît, elle n'apparaît pas désactivée », étendue ici à ce bouton.

**Tableau**, six colonnes dans l'ordre de la maquette : `TITRE`, `CONTENU`, `DATE`, `EXPIRATION`, `LIEN`, `STATUT`, plus une colonne d'action (icône crayon) sans en-tête textuel dédié (ou un en-tête visuellement masqué, `sr-only`, pour l'accessibilité).

- **Primitive** : `table.tsx` shadcn n'est **pas encore vendue** dans `presentation/shared/components/ui/` (seuls `card`, `input`, `button`, `badge`, `avatar`, `alert`, `alert-dialog`, `checkbox`, `label`, `select`, `separator`, `tabs`, `radio-group` le sont à ce jour) — à ajouter via `npx shadcn add table` plutôt qu'un `<table>` Tailwind fait main (`CLAUDE.md` §2).
- **En-tête de colonnes collant** : `sticky top-16` (16 = la hauteur `h-16` de `BackofficeTopBar`, déjà `sticky top-0`) avec un fond opaque (`bg-background`), même logique que `CLAUDE.md` §6 pour un `BackHeader` — dès que la liste dépasse une page d'écran, les libellés de colonnes doivent rester visibles au-dessus des lignes qui défilent, pas seulement la barre supérieure générale. `z-index` inférieur à celui de `BackofficeTopBar` pour que les deux se superposent dans le bon ordre au lieu de se chevaucher visuellement pendant le défilement.
- **`TITRE`** : texte en gras (`font-semibold`), comme la maquette.
- **`CONTENU`** : texte tronqué sur une ligne (`truncate`/`line-clamp-1`) avec le texte complet disponible au survol (`title=` natif) ou dans le dialogue d'édition — le contenu peut être long (`details` est un `text` libre, §2.3 de cette spec), la colonne ne doit pas faire exploser la largeur de ligne.
- **`DATE`** : rend `published_at`, formaté `AAAA-MM-JJ` — réutiliser `toDateInputValue` (`presentation/shared/formatters/date-input.ts`) plutôt qu'écrire un second formatage de date, le format produit correspond exactement à celui de la maquette (`2025-09-05`). **Jamais `created_at`** (AC-WA-15).
- **`EXPIRATION`** : même formatage si `expires_at` est renseignée, sinon `—` (marqueur d'absence explicite, texte `text-muted-foreground`, jamais une cellule vide).
- **`LIEN`** : si `link` est renseigné, un lien texte « Voir le lien » (`<a href={link} target="_blank" rel="noopener noreferrer">`, couleur `coach-green`, soulignement au survol) — premier lien externe réellement cliquable du backoffice, à distinguer visuellement d'un bouton. Sinon `—`.
- **`STATUT`** : voir composant dédié ci-dessous.
- **Colonne d'action** : icône crayon (`IconPencil`, cohérent avec les autres icônes `@tabler/icons-react` déjà utilisées dans `backoffice-nav.ts`), bouton `variant="ghost"` `size="icon"`, **cible tactile `h-11 w-11`** même si l'icône visuelle est petite (override au site d'appel, `CLAUDE.md` §6) — pas le `size-8` par défaut d'un bouton icône shadcn. `aria-label="Modifier « {titre de la ligne} »"` pour ne pas dépendre de l'icône seule. Ouvre le dialogue de modification pré-rempli (§ ci-dessous). **Rendu uniquement si `canWrite`**, même raisonnement que le bouton « + Nouvelle actu ».
  > **Amendement du 2026-09-17.** Masqué en plus sur une ligne `archived`, même condition que l'icône corbeille juste à côté (`news.status !== 'archived'`) — une actu archivée est un état terminal, pas un brouillon à retoucher. Ceci remplace une décision plus ancienne du même jour qui gardait le crayon actif sur une ligne archivée comme unique chemin de désarchivage ; ce chemin n'existe donc plus (aucune régression : §1 n'a jamais prévu de fonction de désarchivage).

### Nouveau composant — `NewsStatusBadge`

Justifié : aucune primitive existante ne rend un badge à deux valeurs dérivées d'un prédicat pur, mais un patron très proche existe déjà — `presentation/features/convocation/components/StatusBadge.tsx` (badge coloré, toujours doublé d'un texte, jamais de la couleur seule, réutilisant les tokens `coach-green`/`coach-red` déjà en place). `NewsStatusBadge` **reproduit ce patron**, pas une nouvelle convention visuelle :

- Entrée : `visible: boolean` — le résultat déjà calculé de `isNewsVisible(news, now)` (§2.2 de cette spec), jamais un second calcul dans le composant.
- `visible === true` → `Badge` vert, texte « Active » (mêmes classes que `STATUS_CLASSNAME.open` de `StatusBadge.tsx` : `border-coach-green/35 bg-coach-green/15 text-coach-green-text`).
- `visible === false` → `Badge` rouge, texte « Expirée » (mêmes classes que `STATUS_CLASSNAME.cancelled` : `border-coach-red/35 bg-coach-red/15 text-coach-red-text`).
- **Aucune troisième valeur.** Ce point ferme trivialement PO-WA-03 : `isNewsVisible` est un booléen, pas une lecture de `status` — une ligne `draft` ou `archived` insérée par l'éditeur SQL (aucun chemin applicatif n'en produit, §2.2) tombe mécaniquement dans la branche `false` et s'affiche « Expirée », au même titre qu'une ligne réellement expirée par la date. Ce n'est pas rigoureusement vrai au sens littéral du mot (une actu en brouillon n'est pas « expirée »), mais c'est exactement le comportement que §2.2 de cette spec a déjà retenu (« la colonne STATUT rend `isNewsVisible`… projeté en Active/Expirée », deux valeurs, pas plus) — le composant ne fait qu'appliquer cette règle, il ne l'invente pas. Signalé ici pour que ce ne soit pas (re)découvert comme un bug en recette.

> **Amendement du 2026-09-17, rouvre PO-WA-03.** La prémisse ci-dessus — « aucun chemin applicatif ne produit `draft` » — a cessé d'être vraie le jour même : une décision développeuse ultérieure (§2.4, `CreateClubNewsUseCase`) a ajouté un vrai sélecteur de statut dans `NewsFormDialog`, faisant de `draft` un état de travail courant, pas un accident d'éditeur SQL. Conserver « Expirée » pour ce cas serait trompeur pour l'utilisatrice de la console. `NewsStatusBadge` prend donc désormais aussi `status: ClubNewsStatus` en entrée et rend une troisième valeur, **« Brouillon » (gris, ni vert ni rouge — ce n'est ni un état à corriger ni un état sain)**, quand `status === 'draft'`, avant même de regarder `visible`. `archived` continue de tomber dans la branche « Expirée » : aucune décision ultérieure n'a créé de chemin applicatif pour ce cas-là, la prémisse d'origine tient toujours pour lui.

### Nouveau composant — dialogue de création/modification (`NewsFormDialog`)

Justifié : aucun dialogue de formulaire n'existe encore dans le backoffice (`alert-dialog.tsx`, déjà vendu, est un patron de confirmation destructrice — sans objet ici, AC-WA-18 interdit toute action de suppression). La primitive `dialog.tsx` shadcn **n'est pas non plus encore vendue** — à ajouter via `npx shadcn add dialog` plutôt qu'une modale faite main : le Dialog Radix piège le focus et ferme sur `Échap` nativement, ce qui couvre une bonne part d'AC-WA-25 sans code à écrire pour ça.

**Un seul composant, paramétré par un mode**, pas deux dialogues dupliqués — les deux maquettes (`Actus-2`, `Actus-3`) montrent exactement les mêmes cinq champs dans le même ordre, seuls le titre, les valeurs initiales et le libellé du bouton de validation diffèrent :

| Paramètre | Mode création | Mode modification |
|---|---|---|
| Titre du dialogue | « Créer une actu » | « Modifier l'actu » |
| Valeurs initiales | Champs vides | Pré-remplies depuis la ligne sélectionnée (`title`, `details`, `published_at` → `toDateInputValue`, `expires_at` → idem ou vide, `link` ou vide) |
| Bouton de validation | « Créer » | « Enregistrer » |
| Use case appelé à la soumission | `CreateClubNewsUseCase` | `UpdateClubNewsUseCase` (même ligne, jamais un doublon — AC-WA-17) |

**Champs, dans l'ordre exact de la maquette, un par ligne (pas de paire côte à côte)** :

1. **`TITRE`** — `Label` + `Input` `h-11`, placeholder « Ex. Reprise des entraînements », `required`.
2. **`CONTENU`** — `Label` + champ texte, placeholder « Ex. Tous les groupes reprennent le 2 septembre », `required`. Voir « Question UI » ci-dessous pour le choix `Input` vs `Textarea`.
3. **`DATE`** — `Label` + `Input type="date"` `h-11`, `required`, alimenté/lu via `toDateInputValue`.
4. **`DATE D'EXPIRATION (OPTIONNEL)`** — `Label` + `Input type="date"` `h-11`, pas de `required`.
5. **`LIEN (OPTIONNEL)`** — `Label` + `Input type="url"` `h-11`, placeholder « https://... », pas de `required`.

**Pas de disposition côte à côte à spécifier ici** : les deux champs date de la maquette sont chacun sur leur propre ligne pleine largeur, jamais dans une même rangée `grid-cols-2` — le piège documenté par `CLAUDE.md` §6 (`min-w-0` sur chaque élément de grille) ne s'applique donc pas tel quel à cette maquette. Il reste pertinent **si un développeur choisit plus tard de densifier le dialogue** en mettant `DATE` et `DATE D'EXPIRATION` côte à côte pour gagner de la hauteur : dans ce cas, `min-w-0` sur chacun des deux éléments de grille est obligatoire, pour la raison déjà documentée (un `<input type="date">` a un plancher de largeur intrinsèque lié à sa valeur segmentée). Signalé par anticipation plutôt que découvert après coup, mais la maquette elle-même ne demande pas cette disposition.

**Pied de dialogue** : deux boutons alignés à droite, `Annuler` (`variant="outline"`, `h-11`, `rounded-full` — même traitement que « Nouvelle section »), `Créer`/`Enregistrer` (`h-11`, `rounded-full`, `bg-coach-green` — même traitement que « Se connecter »/« + Nouvelle actu »). `Annuler` ferme le dialogue sans appeler de use case ; le bouton de validation est `type="submit"` d'un `<form>` englobant, pour bénéficier de la soumission native (`Entrée` depuis n'importe quel champ, AC-WA-25).

### États du dialogue

| État | Rendu |
|---|---|
| Soumission en cours | Les cinq champs et les deux boutons passent `disabled` ; le bouton de validation affiche un libellé de progression (« Création… » / « Enregistrement… »), même mécanique que `BackofficeLoginPage` pour « Connexion… » |
| Échec de validation domaine ou d'écriture (AC-WA-11, AC-WA-20) | Le dialogue **reste ouvert**, les saisies sont **conservées** (pas de reset du formulaire) ; un message d'erreur générique en français apparaît en haut du formulaire, via `Alert`/`AlertDescription` (`variant="destructive"`) — même composant et même emplacement que `BackofficeLoginPage`, message issu d'une `DomainError` traduite, jamais un message brut Supabase |
| Succès | Le dialogue se ferme ; la liste reflète le changement sans rechargement manuel (invalidation de la `queryKey` centralisée `presentation/shared/query-keys.ts`, AC-WA-19) |

### États de l'écran liste

| État | Rendu |
|---|---|
| Chargement initial (`listAll()` en cours) | Lignes de squelette (3 à 5), pas un tableau vide ni un spinner plein écran — jamais un flash de liste vide (AC-WA-20). Primitive `skeleton.tsx` shadcn **non vendue à ce jour** — à ajouter via `npx shadcn add skeleton` plutôt que des `div` animées faites main |
| Erreur de chargement | `Alert` `variant="destructive"` au-dessus (ou à la place) du tableau, message français traduit d'une `DomainError`, jamais un message brut Supabase ni un échec silencieux |
| Liste vide (0 ligne, cas normal) | Réutilise `BackofficeEmptyState` **telle quelle** — le composant accepte déjà `icon`/`title`/`description`, et le libellé déjà défini dans `backoffice-nav.ts` pour l'entrée `news` (« Aucune actualité à afficher pour l'instant ») convient tel quel à ce cas réel, sans qu'il faille écrire un second texte : ce libellé n'était pas spécifique au stub « fonctionnalité pas encore construite », il décrivait déjà une liste vide au sens propre. **Ne pas confondre avec l'état « chargement »** ci-dessus : `BackofficeEmptyState` ne doit apparaître qu'une fois `listAll()` résolu avec zéro ligne, jamais pendant que la requête est en vol |

### Composants shadcn mobilisés — déjà vendus vs. à ajouter

| Élément visuel | Primitive | Déjà vendue ? |
|---|---|---|
| Tableau de la liste | `table.tsx` | **Non — à ajouter** (`npx shadcn add table`) |
| Dialogues Créer/Modifier | `dialog.tsx` | **Non — à ajouter** (`npx shadcn add dialog`) |
| Lignes de chargement | `skeleton.tsx` | **Non — à ajouter** (`npx shadcn add skeleton`) |
| Champ Contenu, si `Textarea` retenu (voir question ci-dessous) | `textarea.tsx` | **Non — à ajouter** (`npx shadcn add textarea`), sinon `input.tsx` déjà vendu suffit |
| Champs Titre/Date/Expiration/Lien, boutons | `input.tsx`, `label.tsx`, `button.tsx` | Oui |
| Badge de statut | `badge.tsx` | Oui |
| Message d'erreur (liste et dialogue) | `alert.tsx` | Oui |

### Questions UI — non bloquantes

Ne rouvrent aucun des douze points ouverts du §6 de cette spec, les complètent :

- **`CONTENU` : `Input` ou `Textarea` ?** La maquette rend un champ d'une ligne, mais §2.3/§1 de cette spec notent explicitement que `details` est un `text` libre sans limite de longueur tranchée (PO-WA-07). Un `Input` reproduirait la maquette au pixel près mais masquerait un contenu long à la saisie (pas de retour à la ligne visible) ; un `Textarea` (2–3 lignes visibles, redimensionnable) serait plus honnête vis-à-vis du type de donnée réel, au prix d'un écart mineur avec la maquette. **Position proposée, non tranchée ici** : `Textarea` sur 3 lignes — à confirmer par la développeuse en construisant l'écran, cela ne change aucun AC-WA.
- **Décalage du bloc « Bonjour, {prénom} » au-dessus du titre « Actus »** : les maquettes `Actus-2`/`Actus-3` ne le montrent pas dans leur cadrage, contrairement à `Dashboard-1`. Ce document part du principe que c'est un effet de cadrage de capture (§ « Où ça vit » ci-dessus), pas une demande de le masquer sur cette page précise — à confirmer visuellement une fois les deux blocs assemblés, aucun AC-WA ne l'interdit ni ne l'exige explicitement.
- **Décalage `sticky top-16` de l'en-tête de tableau** : suppose que `BackofficeTopBar` garde sa hauteur `h-16` actuelle et qu'aucun conteneur de défilement intermédiaire (`overflow-y-auto`) n'est introduit entre la barre supérieure et le corps de page. Si un tel conteneur est introduit pour d'autres raisons (ex. garder la navigation latérale visible pendant le défilement d'une longue liste — non traité par cette spec ni par `web-empty-state.md`), ce décalage serait à recalculer — signalé pour ne pas être découvert en intégration.
