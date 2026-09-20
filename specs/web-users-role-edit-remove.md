# Spec — Amendement à `web-users` : **modifier et retirer une affectation de rôle**

> Statut : **amendement du 2026-09-18 à `specs/web-users.md`** (troisième passe du même jour). **Ce fichier ne remplace pas `specs/web-users.md`** : il l'amende section par section, et le §0 ci-dessous dit exactement quelles lignes de cette spec deviennent caduques. Tout ce qui n'y est pas nommé reste valable tel quel.
> **Décision directe de la développeuse (2026-09-18, seconde demande du jour)** : l'administrateur peut **modifier la portée** d'une affectation de rôle existante et **retirer** une affectation, les deux **déclenchés par un clic sur la pastille de rôle** de la colonne `RÔLES`. **Ce n'est pas un point ouvert** : c'est tranché, au même titre que PO-WU-01 à PO-WU-04, et consigné comme tel.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (module P0 « Authentification et profils — Comptes, **rôles**, permissions, invitation, MFA admin » ; matrice RBAC ligne « **Gérer comptes, rôles, paramétrage** » = ✅ Administrateur, ❌ pour les sept autres ; exigences transversales §11.3, « **changement de rôle** » nommé littéralement), `docs/roles-personas-as-caribbean.md` (§ rôle Administrateur : « Paramétrage, **comptes, rôles**, saisons, sécurité et audit » ; « Un utilisateur peut cumuler plusieurs rôles » ; §3.1 « révocation immédiate en cas de départ »), `specs/web-users.md` (§1, §2.2, §2.6, §2.9, §2.10, §3, §4, AC-WU-05/06/07/11/17/19/21/24/31/35/36, PO-WU-05/07/08/09), `specs/section-and-teams.md` (AC-ST-33/AC-ST-45/AC-ST-46, PO-ST-13), `specs/web-memberships.md` (`'membership:write'` couvrant création, modification **et** archivage — précédent de nommage), `CLAUDE.md` §3/§4/§6/§7/§9.
> État du code lu pour cette passe : `supabase/migrations/{20260811171754_initial_schema,20260917145409_role_assign_coach_write_policy,20260918090000_web_users_write_policies}.sql`, `domain/policies/{actions,rbac-matrix,can}.ts`, `domain/entities/user.ts`, `domain/repositories/{role-assignment-repository,user-repository}.ts`, `domain/usecases/users/AssignRoleUseCase.ts`, `data/repositories/RoleAssignmentRepositoryImpl.ts`, `presentation/features/backoffice/users/components/UserRolesCell.tsx`, `presentation/features/backoffice/memberships/components/ArchiveMembershipDialog.tsx`.
> Maquettes : `docs/designs/DESIGN_LINKS.md` §2 porte **déjà** la ligne `web-users` au statut **`instantané seul`** (ajoutée depuis la rédaction de PO-WU-10) → conformément au §4 du registre, **aucun lien artifact n'est demandé**, l'instantané local fait foi. Les cinq exports `docs/designs/desktop/users/[Admin] Web - Users - {1,2,3,4,5}.png` **ne montrent aucun dialogue de modification ni de retrait d'affectation**, et aucune pastille cliquable : **ce parcours est à dessiner sans référence visuelle**, comme l'ont été l'icône d'avertissement de ligne et le badge de navigation (§7).

## 0. Ce que cet amendement rend caduc dans `specs/web-users.md`

| Emplacement | Texte actuel | Ce qu'il devient |
|---|---|---|
| **§1, « Hors périmètre — explicitement »**, 2ᵉ puce | « **Le retrait d'un rôle** : aucune politique `delete` sur `user_roles`, aucun contrôle illustré (même position qu'`AC-ST-46`). **La généralisation de l'assignation ne l'ouvre pas** […] » | **Supprimée.** Remplacée par : « **Le retrait d'une affectation de rôle et la modification de sa portée entrent au périmètre** (amendement du 2026-09-18, `specs/web-users-role-edit-remove.md`), **pour les sept rôles assignables uniquement** : **aucune affectation `role = 'admin'` ne peut être modifiée ni retirée depuis cet écran** (§2.4 de l'amendement). L'écran `/admin/teams` et `AC-ST-46` restent, eux, inchangés : le retrait n'y est pas ouvert. » |
| **§1, « Entre au périmètre »** | liste de 7 éléments | **8ᵉ élément ajouté** : « **Modifier la portée ou retirer une affectation de rôle existante**, par clic sur la pastille de la colonne `RÔLES` — `admin` exclu (amendement du 2026-09-18). » |
| **§2.9**, ligne `public.user_roles` de la table | « […] **aucun `UPDATE`, aucun `DELETE`** (pas de retrait ni de réassignation de rôle) » | « […] **`UPDATE` administrateur ajouté** (`user_roles_update_assign_role`), borné aux colonnes `team_id`/`section_id` par `grant`, `using`/`with check` excluant `role = 'admin'` ; **`DELETE` administrateur ajouté** (`user_roles_delete_remove_role`), `using` excluant `role = 'admin'` (§2.6 de l'amendement) » |
| **§2.9**, phrase de clôture | « **Deux politiques ajoutées, pas une de plus.** » | « **Quatre politiques au total sur ces deux tables** : les deux du 2026-09-18 matin (`users_update_admin`, `user_roles_insert_assign_role`) plus les deux de cet amendement (`user_roles_update_assign_role`, `user_roles_delete_remove_role`). » |
| **§3**, bloc des entrées de matrice | trois entrées (`'user:invite'`, `'user:write'`, `'role:assign'`) | **quatre entrées** : `'role:remove': ['admin']` ajoutée, et le commentaire de `'role:assign'` étendu (elle miroite désormais **deux** politiques : `..._insert_assign_role` **et** `..._update_assign_role`) — §3 de l'amendement |
| **AC-WU-07** | « **Aucune politique `DELETE`** n'est ajoutée sur `public.users` ni sur `public.user_roles`, et **aucune politique `UPDATE` sur `public.user_roles`** […] » | **Amendé — voir AC-WU-40.** La partie `public.users` reste vraie et inchangée (aucun `DELETE`, aucun `INSERT`) ; la partie `public.user_roles` est remplacée |
| **AC-WU-24** | « Aucun contrôle de **désactivation, révocation ou suppression** de compte, ni de **retrait ou de réassignation de rôle**, n'apparaît nulle part — **pas même désactivé** » | **Amendé — voir AC-WU-41.** La partie « désactivation, révocation ou suppression de **compte** » reste vraie et inchangée (PO-WU-05) ; la partie « retrait ou réassignation de rôle » est remplacée |
| **§7, note pour designer-agent**, avant-dernière puce | « **Aucun contrôle de suppression, de désactivation ou de retrait de rôle** ne doit apparaître, **pas même désactivé** (AC-WU-24). » | Remplacée par le §7 du présent amendement |
| **`## UI design`** | — | **Non touchée par cet amendement** : c'est le travail de designer-agent, à la passe suivante (§7) |

Tout le reste de `specs/web-users.md` — §2.1 à §2.8, §2.10, §4, AC-WU-01 à AC-WU-39 hors les deux ci-dessus, PO-WU-01 à PO-WU-11 — **reste en vigueur sans modification**.

## 1. Périmètre

### Ce que c'est

Deux opérations d'administration sur une **affectation de rôle déjà existante** (`public.user_roles`), depuis la console `/admin/users` :

1. **Modifier la portée** d'une affectation : déplacer un coach d'une équipe à une autre, un joueur d'une équipe à une autre, un responsable de section d'une section à une autre. **Le rôle lui-même n'est jamais modifié par cette opération** — seuls `team_id` / `section_id` changent.
2. **Retirer** une affectation : supprimer la ou les lignes `user_roles` qui la portent, c'est-à-dire désassigner ce rôle de ce compte.

**Déclencheur unique, choix explicite de la développeuse : le clic sur la pastille de rôle** de la colonne `RÔLES` (`UserRolesCell`). **Ni un bouton de ligne supplémentaire dans la colonne `ACTIONS`** (elle en porte **deux**, depuis l'amendement du 2026-09-18 `specs/web-users-membership-column.md` — le raisonnement, ne pas ajouter un énième bouton de ligne, est inchangé et même conforté), **ni une page dédiée, ni un menu contextuel de ligne.**

### Rattachement CDC

| Élément | Module CDC | Priorité |
|---|---|---|
| Modifier / retirer une affectation de rôle | **Authentification et profils** — « Comptes, **rôles**, permissions, invitation, MFA admin » | **P0** |
| Ligne de matrice applicable | « **Gérer comptes, rôles, paramétrage** » — ✅ Administrateur, ❌ pour les sept autres rôles | — |
| Exigence transversale déclenchée | §11.3 — « **changement de rôle** » (journal d'audit, non négociable) | — |

Aucun nouveau module, aucune nouvelle priorité : c'est la **seconde moitié** d'un chemin déjà ouvert le matin même (§2.6 de `web-users`, assignation). Le CDC dit « gérer […] rôles », pas « assigner des rôles » — **retirer et corriger font partie de « gérer »**, et `roles-personas-as-caribbean.md` §3.1 (« révocation immédiate en cas de départ ») pousse dans le même sens sans pour autant nommer ce parcours précisément.

### Ce qui entre au périmètre

1. Le **dialogue ouvert par le clic sur une pastille**, pré-rempli du rôle (**en lecture seule**) et de sa portée actuelle (**modifiable**), avec la même règle de champs conditionnels que le dialogue d'assignation (`specs/web-users.md` §2.6c).
2. Une **action destructrice « retirer »** dans ce même dialogue, **avec étape de confirmation**.
3. **Une action RBAC supplémentaire** (`'role:remove'`), **l'extension d'une action existante** (`'role:assign'`, qui couvre désormais `INSERT` **et** `UPDATE`), **deux politiques RLS** (`UPDATE` et `DELETE` sur `public.user_roles`), **deux use cases** et **deux méthodes de repository**.

### Ce qui reste hors périmètre

- **Le changement de rôle lui-même** (transformer une affectation `player` en affectation `coach`) : le dialogue ne l'offre pas, le `grant` de colonne du §2.6 le rend **structurellement impossible**, et le parcours existe déjà sous une autre forme (retirer + assigner). **Ce n'est pas une omission : c'est une décision**, prise parce qu'un « changement de rôle » en une écriture masquerait, dans un futur journal d'audit, deux évènements distincts que le CDC §11.3 nomme séparément.
- **Toute opération sur une affectation `role = 'admin'`** (§2.4).
- **La désactivation, la révocation et la suppression d'un compte** : inchangé, toujours PO-WU-05. **Retirer un rôle n'est pas révoquer un compte** — le compte reste actif, il perd une affectation.
- **Le retrait d'un coach depuis `/admin/teams`** : `AC-ST-46`/PO-ST-13 restent tels quels, `AssignCoachDialog` et `'role:assign-coach'` **ne changent pas d'un caractère** (AC-WU-31 reconduit, AC-WU-46).
- **Le journal d'audit lui-même** : toujours PO-WU-07, **aggravé** (§4).
- **La colonne `ACTIONS`, le dialogue d'invitation, le dialogue de fiche, l'icône d'avertissement, le badge** : aucun ne change (à l'exception des invalidations de cache, §2.8). *(Mention du « dialogue d'adhésion » retirée — sans objet depuis l'amendement du 2026-09-18, `specs/web-users-membership-column.md`.)*

## 2. Modèle et règles

### 2.1 Ce qu'une pastille désigne — **une affectation, pas toujours une ligne**

Point à poser avant tout le reste, parce qu'il détermine ce que le clic cible réellement. `UserRolesCell` rend **une pastille par `RoleAssignment`**, et le mapper agrège déjà plusieurs lignes `user_roles` en une seule affectation pour `coach` (`specs/web-users.md` §2.2, `domain/entities/user.ts`) :

| Pastille | Lignes `user_roles` derrière | Portée éditable |
|---|---|---|
| `Joueur · {équipe}` | **une** (`team_id`) | une équipe |
| `Coach · {équipes}` | **une par équipe** (`team_id`) | une **ou plusieurs** équipes |
| `Responsable de section · {section}` | **une** (`section_id`) | une section |
| `Dirigeant habilité`, `Trésorier`, `Référent médical`, `Bénévole` | **une** (`team_id` et `section_id` nuls) | **aucune** |
| `Administrateur` | une | **non cliquable** (§2.4) |

**Identification de la cible : le couple (rôle, portée actuelle), jamais le rôle seul.** Deux affectations de même rôle sont possibles en base (`user_roles_section_scoped_idx` autorise deux lignes `section-manager` sur deux sections distinctes ; `user_roles_team_scoped_idx` deux lignes `player` sur deux équipes) — donc **deux pastilles de même rôle peuvent coexister sur une ligne**, et un ciblage par rôle seul serait ambigu. C'est aussi ce qui garantit que le retrait d'une pastille ne touche **que** les lignes qu'elle affiche.

**Aucun champ `id` n'est ajouté à `RoleAssignment`.** L'entité est consommée par tout le mobile (profil, dashboard, `can.ts`) ; lui ajouter un identifiant technique pour le seul besoin de cet écran ferait porter un détail de persistance par un type métier pur. Les **trois index uniques partiels** de la migration initiale (`(user_id, role, team_id)`, `(user_id, role, section_id)`, `(user_id, role)`) rendent la **clé naturelle** suffisante et non ambiguë. Si l'implémentation démontre le contraire sur un cas réel, c'est un point à rouvrir explicitement, pas à contourner par un `id` ajouté en silence.

### 2.2 Modifier la portée — sémantique par rôle

Le dialogue reprend **exactement** les règles de champs conditionnels du dialogue d'assignation (`specs/web-users.md` §2.6c, AC-WU-35), appliquées à une affectation existante :

| Rôle de la pastille | Champ rendu, pré-rempli | Écriture produite |
|---|---|---|
| `player` | **une équipe** (obligatoire) | **`UPDATE` d'une ligne** : `team_id` remplacé |
| `section-manager` | **une section** (obligatoire) | **`UPDATE` d'une ligne** : `section_id` remplacé |
| `coach` | **une ou plusieurs équipes** (au moins une), cases pré-cochées sur les équipes actuelles | **réconciliation d'ensemble** : `INSERT` des équipes cochées absentes, **`DELETE` des lignes décochées** |
| `authorized-officer`, `treasurer`, `medical-referent`, `volunteer` | **aucun champ** | **aucune écriture possible** — seul le retrait a du sens sur ces pastilles |

Quatre règles qui vont avec :

1. **Le rôle est rendu en lecture seule**, jamais un sélecteur pré-positionné : la seule chose que ce dialogue modifie est la portée. Un sélecteur modifiable laisserait croire à un changement de rôle en place, que le §1 exclut et que le `grant` de colonne du §2.6 refuse.
2. **Une soumission sans la portée requise est refusée dans le domaine, avant tout appel réseau**, message français traduit — **exactement la même règle qu'AC-WU-35**, et **la même fonction de validation**, pas une seconde copie (`AssignRoleUseCase.validateScope` est déjà écrite : à extraire en helper pur partagé, jamais à dupliquer).
3. **Une soumission identique à l'état actuel est un no-op silencieux** : le dialogue se ferme, aucune écriture n'est envoyée, aucune erreur n'est affichée.
4. **Une portée déjà occupée par une autre affectation du même compte et du même rôle** (déplacer un joueur vers une équipe où il est déjà joueur) heurte l'index unique partiel : Postgres renvoie `23505`. Contrairement à l'assignation, où `23505` est **absorbé** comme un doublon inoffensif (`RoleAssignmentRepositoryImpl`, AC-ST-36), la modification de portée doit **remonter un message français traduit d'une `DomainError`** (« ce compte porte déjà ce rôle sur cette équipe/section ») — absorber en silence laisserait l'administrateur croire que le déplacement a eu lieu. Le cas de l'`INSERT` de réconciliation `coach`, lui, reste absorbé comme aujourd'hui.

### 2.3 Retirer une affectation — sémantique

- **Le retrait supprime toutes les lignes que la pastille affiche**, et elles seules : une ligne pour six des sept rôles, **toutes les lignes d'équipe** pour un `coach` multi-équipes. Retirer une seule équipe d'un coach se fait par la **modification de portée** (décocher), pas par le retrait — deux gestes distincts, deux intentions distinctes.
- **Une étape de confirmation explicite est obligatoire** avant l'appel (§7). Le précédent du dépôt est `ArchiveMembershipDialog`/`ArchiveMembershipUseCase` (`AlertDialog` shadcn, action confirmée, dialogue laissé ouvert pendant la mutation) — **le patron d'interaction est repris, pas sa formulation** : archiver une adhésion la conserve avec son historique, **supprimer une ligne `user_roles` ne conserve rien** (la table ne porte ni `deleted_at`, ni `created_at`, ni `created_by`). La copie doit donc dire « **retirée définitivement** », jamais « archivée ».
- **Retirer la dernière affectation d'un compte est autorisé** et produit un compte sans rôle — état déjà modélisé et déjà signalé : c'est le **critère 1** du prédicat d'élément manquant (AC-WU-37), la mention « Aucun rôle » de la cellule (AC-WU-18) et une unité de plus au badge de navigation. **Aucun garde-fou supplémentaire n'est ajouté** : un compte sans rôle est un état prévu de l'application, pas une anomalie à empêcher. La confirmation peut le **dire** (§7), elle ne le bloque pas.
- **Aucune restriction sur son propre compte**, hors `admin` (§2.4) : un administrateur qui porte aussi `trésorier` peut se retirer `trésorier`. La même position que celle déjà retenue pour le dialogue de fiche (note résiduelle de PO-WU-02 : rien n'exige de masquer l'action sur sa propre ligne).

### 2.4 **`admin` est exclu des deux opérations — décision, pas omission**

**Aucune affectation `role = 'admin'` ne peut être modifiée ni retirée depuis cet écran.** C'est la **même ligne** que celle déjà posée au §2.6a de `web-users` pour l'assignation, tirée dans sa conséquence logique :

- l'assignation exclut `admin` parce qu'une session administrateur compromise pourrait sinon **se fabriquer des pairs** ; le retrait doit l'exclure parce qu'une session administrateur — compromise, ou simplement maladroite — pourrait **laisser le club sans aucun administrateur en un clic**, sans qu'aucun chemin de l'application ne permette d'en recréer un (aucune politique `INSERT` n'autorise `role = 'admin'`, AC-WU-05 ; aucun chemin de l'Edge Function n'en crée) ;
- **cet écran n'a jamais eu vocation à gérer l'appartenance au rôle `admin` lui-même** : ni le sélecteur d'assignation ne l'offre, ni la matrice ne le mentionne autrement que comme le rôle **qui gère**, jamais comme le rôle **géré**.

Exclusion à **trois niveaux**, exactement le tableau du §2.6a, **le niveau RLS étant le seul qui compte réellement** (`CLAUDE.md` §6) :

| Niveau | Forme | Rôle |
|---|---|---|
| Pastille | la pastille `Administrateur` **n'est pas cliquable**, n'ouvre aucun dialogue, ne porte **aucune affordance** de clic (§7) | confort — contournable |
| Use case du domaine | `AssignableRoleAssignment` (qui **exclut structurellement** `admin`, `domain/entities/user.ts`) est le type d'entrée des deux use cases | défense en profondeur — contournable par un `as` |
| **`using` des politiques RLS** | **liste blanche littérale des sept rôles non-`admin`** dans le `using` de l'`UPDATE` **et** du `DELETE` | **la barrière réelle — AC-WU-42** |

### 2.5 Actions RBAC — **une action étendue, une action nouvelle**

#### a. Modification de portée → **`'role:assign'`, étendue, pas renommée**

L'action existante `'role:assign'` **couvre désormais l'`INSERT` et l'`UPDATE`** de `public.user_roles`. **Aucune nouvelle action n'est créée pour la modification de portée.** Le précédent est explicite et déjà appliqué deux fois dans ce dépôt :

- **`'membership:write'` gouverne `memberships_insert_admin` **et** `memberships_update_admin`** — une action, deux politiques (`specs/web-memberships.md` §3, « Ce n'est pas de la symétrie décorative ») ;
- **`'season:write'`** couvre également création et modification, avec le motif écrit dans son propre commentaire : « *no document distinguishes a role that could do one without the other* ». C'est **exactement** le cas ici : aucune ligne du CDC, aucune persona, ne décrit un rôle qui pourrait assigner un rôle sans pouvoir en corriger la portée. Créer `'role:edit-scope'` inventerait une distinction que rien ne porte.

Le **commentaire de l'action** dans `actions.ts` et son **entrée de matrice** sont mis à jour dans le même changement : `'role:assign'` miroite désormais **deux** politiques (`user_roles_insert_assign_role`, `user_roles_update_assign_role`), et le miroir manuel des deux côtés reste obligatoire (`CLAUDE.md` §7).

#### b. Retrait → **une action nouvelle, `'role:remove'`**

Valeur : **`'role:remove': ['admin']`**.

Pourquoi une action distincte, alors que la modification de portée n'en a pas eu :

- **L'opération est d'une autre nature.** `'role:assign'` écrit ou corrige ; `'role:remove'` **supprime une ligne sans rien conserver** — `public.user_roles` ne porte ni `archived_at`, ni horodatage, ni auteur (PO-WU-08). C'est le **premier et seul `DELETE` ouvert à un client dans tout le dépôt** : toutes les autres « suppressions » du backoffice sont des archivages (`club_news.archived_at`, `memberships.archived_at`).
- **Contre-précédent assumé, et il faut le nommer** : `'membership:write'` couvre bien création, modification **et archivage** dans une seule action. La différence est exactement celle du point précédent — l'archivage est un `UPDATE` d'une colonne, réversible, qui conserve l'historique de paiements attaché ; ce retrait-ci est un `DELETE` définitif. Ce n'est pas une préférence de découpage, c'est ce qui distingue les deux cas.
- **Les deux droits pourraient s'élargir séparément.** Si PO-WE-01 ouvrait un jour `/admin/*` au Responsable de section, « peut assigner un rôle dans sa section » et « peut retirer un rôle dans sa section » sont deux arbitrages distincts pour le Bureau. Une action unique les accorderait **dans le même changement**, exactement l'effet de bord que `'section:write'`/`'team:write'` et `'membership:write'`/`'payment:record'` ont été séparées pour éviter.
- **Le nom désigne la ressource réellement écrite** (`public.user_roles`), comme `'role:assign'` et `'role:assign-coach'` — jamais `'user:write'` (qui désigne `public.users`, §2.7 de `web-users`).

#### c. `can.ts` — **une branche de portée pour `'role:remove'`, dans le même changement**

`'role:remove'` est une action **portée**, comme `'role:assign'` : elle vise une équipe ou une section. Sa branche `section-manager` est écrite **dans le même changement que son entrée de matrice**, pour la raison déjà écrite dans `can.ts` à propos de `'role:assign'` — tant que la matrice vaut `['admin']` la branche `default` répondrait de toute façon, **la branche est écrite maintenant précisément pour ça** (AC-WU-47, jumeau d'AC-WU-36). Le contexte est résolu depuis **l'affectation ciblée** (sa portée actuelle), comme `scopeContextFor()` le fait déjà dans `AssignRoleUseCase`.

#### d. Le cas `coach` touche **les deux actions**

La réconciliation d'ensemble d'une portée `coach` (§2.2) peut **supprimer** des lignes (équipes décochées). Règle retenue, à écrire telle quelle dans le use case : **`'role:assign'` est exigée dans tous les cas ; `'role:remove'` est exigée en plus si et seulement si la soumission supprime au moins une ligne.** Aucune différence de comportement aujourd'hui (les deux valent `['admin']`), mais la règle empêche qu'un futur élargissement de la seule action d'assignation ouvre un chemin de suppression par la porte de derrière (AC-WU-45).

### 2.6 Politiques RLS — **deux ajoutées, commentées du nom de l'action qu'elles miroitent**

Les deux sont à ajouter dans une **nouvelle migration**, sans toucher aux trois politiques existantes sur `user_roles` (`user_roles_select_own`, `user_roles_insert_assign_coach`, `user_roles_insert_assign_role`).

**(1) `UPDATE` — miroite `'role:assign'`**

- **Restriction de colonnes d'abord, comme pour `public.users`.** `20260918090000_web_users_write_policies.sql` a établi le patron et son piège : `revoke update on public.users from authenticated;` **puis** `grant update (full_name) on public.users to authenticated;` — sans le `revoke`, le `grant` de colonne **ajoute** au privilège déjà illimité au lieu de le restreindre. Même geste ici : **`revoke update on public.user_roles from authenticated;` puis `grant update (team_id, section_id) on public.user_roles to authenticated;`**. Conséquence directe et recherchée : **`role` et `user_id` deviennent structurellement non modifiables** — une requête forgée qui tenterait de transformer une affectation en `admin`, ou de la déplacer vers un autre compte, échoue **sur un contrôle de privilège de colonne, avant même l'évaluation de la RLS**. C'est la garantie que le §1 (« le rôle n'est jamais modifié par cette opération ») attendait. Le `revoke` ne casse rien : **aucun chemin d'`UPDATE` sur `user_roles` n'existe aujourd'hui** (AC-WU-07 d'origine).
- Politique `user_roles_update_assign_role`, `for update to authenticated`, avec **`using`** = `private.is_admin()` **et** la liste blanche des sept rôles, et **`with check`** = la même expression. Les deux clauses portent la liste blanche : le `using` empêche de **partir** d'une ligne `admin`, le `with check` d'**arriver** sur une (redondant grâce au `grant` de colonne — **gardé quand même**, un `grant` révoqué par erreur dans une migration future ne doit pas rouvrir silencieusement l'élévation de privilège).
- **Liste blanche littérale** (`role in ('player', 'coach', 'section-manager', 'authorized-officer', 'treasurer', 'medical-referent', 'volunteer')`) plutôt que `role <> 'admin'` — **même raisonnement qu'au §2.6b de `web-users`** : un neuvième rôle ajouté un jour au `check` de la table ne doit pas devenir modifiable par défaut.
- **La forme de portée n'est pas redite** : `user_roles_scope_check` s'applique à tout `UPDATE` comme à tout `INSERT` — une portée `section_id` posée sur une ligne `player` est refusée par la contrainte de table, quelle que soit la politique qui a autorisé l'écriture.

**(2) `DELETE` — miroite `'role:remove'`**

- Politique `user_roles_delete_remove_role`, `for delete to authenticated`, **`using`** = `private.is_admin()` **et** la même liste blanche des sept rôles. Un `DELETE` n'a pas de `with check`.
- **Aucun `grant` à ajouter** : le privilège `delete` sur `public.user_roles` est accordé à `authenticated` depuis la migration initiale (`grant select, insert, update, delete on … public.user_roles … to authenticated`), la RLS étant la seule barrière — jusqu'ici absolue, faute de toute politique `DELETE`.
- **Test de recette obligatoire, avec un jeton administrateur** : la suppression d'une ligne `role = 'admin'` échoue par **refus RLS**, pas par un message d'interface (AC-WU-42, jumeau d'AC-WU-05).

Chaque politique porte **en commentaire SQL le nom de l'action qu'elle miroite**, et chaque entrée de matrice renvoie à sa politique et à son fichier de migration — **miroir manuel des deux côtés, jamais généré** (`CLAUDE.md` §7).

### 2.7 Domaine

- **`RoleAssignmentRepository`** (et **pas** `UserRepository` : la ressource écrite est `public.user_roles`, c'est la raison d'être documentée de cette interface séparée) gagne **deux méthodes**, l'une pour la modification de portée, l'autre pour le retrait. Contrat imposé, signatures exactes laissées au développeur : chacune reçoit **le compte cible et l'affectation visée avec sa portée actuelle** (clé naturelle, §2.1) — la première reçoit en plus la **portée souhaitée** ; toutes deux sont typées sur `AssignableRoleAssignment`, jamais `RoleAssignment` (exclusion structurelle d'`admin`, §2.4). La réconciliation d'ensemble du cas `coach` (`INSERT` des ajouts, `DELETE` des retraits, séquentiels, `23505` absorbé sur les seuls `INSERT`) vit **dans l'implémentation `data/`**, à côté du patron déjà écrit dans `RoleAssignmentRepositoryImpl` — pas dans le use case, qui n'a pas à connaître la découpe en lignes.
- **Deux use cases** dans `domain/usecases/users/`, nommage `PascalCaseUseCase` (`CLAUDE.md` §4) : un pour la modification de portée, un pour le retrait. Forme reprise d'`AssignRoleUseCase`, **dans le même ordre** : résolution de l'acteur → `can()` (avec le contexte de portée, §2.5c/d) → validations du domaine → appel du repository. **Aucun import React, Supabase, TanStack Query ni `window`**, aucun `useQuery`/`useMutation` (`CLAUDE.md` §3/§6).
- **La validation de forme de portée n'est pas dupliquée** : `AssignRoleUseCase.validateScope` devient un **helper pur partagé** (ou une fonction de `domain/policies/`), consommé par les trois use cases. Trois copies de la même règle divergeraient au premier cas limite — même exigence qu'AC-WU-17 pour le prédicat d'élément manquant.
- **Erreurs** : réutiliser `InvalidRoleAssignmentInputError` pour la portée manquante ou invalide ; le conflit `23505` de la modification de portée (§2.2, règle 4) remonte en `DomainError` **traduite en français**, jamais une charge utile Supabase brute.
- **Journal d'audit** : les deux use cases sont des « **changement de rôle** » au sens du CDC §11.3, donc **des candidats directs à la journalisation depuis le domaine** (`CLAUDE.md` §6 : l'intention se journalise depuis le use case, jamais depuis un composant). **Aucune infrastructure n'existe** → même position que `AssignRoleUseCase` et `InviteUserUseCase` : un commentaire nommant PO-WU-07 à l'endroit exact où l'appel devra venir, et rien de plus (§4).

### 2.8 Clés de requête et invalidations

- **Aucune nouvelle `queryKey` de lecture** : les deux opérations sont des écritures sur des données déjà lues par la lecture d'annuaire.
- **Invalidations après succès**, via les clés **centralisées** de `presentation/shared/query-keys.ts`, jamais inline (AC-WU-21 étendu, AC-WU-48) :
  - la **lecture d'annuaire** de `/admin/users` — la cellule `RÔLES` change ;
  - **`usersBadgeCount()`** — retirer la dernière affectation d'un compte bascule le **critère 1** du prédicat d'élément manquant (AC-WU-37) ;
  - **`coachAssignmentsAdminList`** dès que l'affectation touchée est un `coach` — `/admin/teams` affiche ces mêmes affectations (`CoachListCell`) et ne doit jamais diverger de ce qui a été écrit depuis `/admin/users`.
- Une écriture **refusée** ne doit invalider aucune clé, et laisse le dialogue ouvert avec les saisies conservées (AC-WU-22 reconduit).

## 3. RBAC

La ligne de matrice CDC applicable est **inchangée** et reste la plus nette du référentiel :

| Ligne de la matrice RBAC (CDC) | Joueur | Coach | Resp. section | Dirigeant habilité | Trésorier | Réf. médical | Bénévole | **Administrateur** |
|---|---|---|---|---|---|---|---|---|
| **Gérer comptes, rôles, paramétrage** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |

**Aucun élargissement n'est tiré d'une ligne voisine** : « Voir les dossiers des autres membres » (✅ Dirigeant habilité, ✅ Responsable de section dans sa section) est une **lecture de dossier**, pas la gestion des rôles — même mise en garde qu'au §3 de `web-users`, et elle vaut d'autant plus pour une opération destructrice.

### Entrées de matrice — **une ajoutée, une commentaire mis à jour**

```
'role:assign': ['admin'],   // §2.6 de web-users + §2.5a de l'amendement — miroite DÉSORMAIS
                            // DEUX politiques : user_roles_insert_assign_role ET
                            // user_roles_update_assign_role (portée : team_id/section_id
                            // seuls, `grant update (team_id, section_id)`)
'role:remove': ['admin'],   // §2.5b de l'amendement — miroite user_roles_delete_remove_role
                            // (using : private.is_admin() ET liste blanche des sept rôles)
```

`'role:assign-coach'`, `'user:invite'`, `'user:write'` et `'membership:write'` restent **inchangées** (AC-WU-46).

### Tableau par rôle

| Rôle | Atteint `/admin/users` | Clique une pastille | Modifie la portée d'une affectation | Retire une affectation | Touche une affectation `admin` |
|---|---|---|---|---|---|
| Joueur/Joueuse | ❌ | ❌ | ❌ | ❌ | ❌ |
| Coach/Staff | ❌ | ❌ | ❌ | ❌ | ❌ |
| Responsable de section | ❌ (PO-WE-01) | ❌ | ❌ | ❌ | ❌ |
| Dirigeant habilité | ❌ (PO-WE-01) | ❌ | ❌ | ❌ | ❌ |
| Trésorier | ❌ (PO-WE-01) | ❌ | ❌ | ❌ | ❌ |
| Référent médical | ❌ | ❌ | ❌ | ❌ | ❌ |
| Bénévole | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Administrateur** | ✅ | ✅ (sept rôles) | ✅ `'role:assign'` | ✅ `'role:remove'` | **❌ — jamais, y compris la sienne (§2.4)** |

**Comptes multi-rôles** : l'écran rend déjà le cumul (plusieurs pastilles par ligne). Cet amendement en tire la conséquence naturelle — **chaque pastille est éditable et retirable indépendamment des autres**, sans jamais affecter les affectations voisines du même compte (AC-WU-43). Et le corollaire déjà posé au §3 de `web-users` (« un administrateur voit sa propre ligne ») se double ici de sa contrepartie destructrice, d'où le §2.4.

## 4. Données sensibles

| Nature | Cet amendement | Conséquence |
|---|---|---|
| **Données de santé** | Aucune | Aucun trigger d'audit d'accès, aucun filtre de colonne |
| **Données financières** | Aucune — ces deux opérations n'écrivent que `public.user_roles` | Rien à ajouter |
| **Données nominatives** | **Indirectes** — aucune donnée nominative n'est créée, lue ni exportée en plus de ce que l'annuaire rend déjà (`specs/web-users.md` §4) | **Aucun chemin d'export ajouté** (AC-WU-27 reconduit) |
| **Journal d'audit** | **Exigé — et c'est la forme la plus exposée du « changement de rôle » du CDC §11.3** | Voir ci-dessous |

**PO-WU-07 est aggravé une seconde fois dans la même journée, et il faut le dire sans l'adoucir.** Le CDC §11.3 nomme « **changement de rôle** » parmi les actions à tracer, et `RETENTION_PURGE.md` range cette catégorie en rétention longue (3 ans proposés, archivage froid sans purge). Trois faits s'additionnent ici :

1. **Le retrait est irréversible et ne laisse aucune trace.** `public.user_roles` ne porte **ni horodatage, ni auteur, ni colonne d'archivage** — une ligne supprimée ne laisse **rien** derrière elle. Contrairement à l'assignation (dont la ligne créée est au moins observable), une suppression non journalisée est **définitivement invisible**.
2. **La modification de portée efface son propre passé.** Après un `UPDATE`, plus rien n'indique quelle équipe ou quelle section l'affectation portait avant. Un coach déplacé d'un groupe à un autre est, pour l'application, un coach qui a toujours été là.
3. **PO-WU-08 cesse d'être un confort.** L'absence de `created_by`/`updated_by`/`updated_at` sur `user_roles` était déjà relevée ; avec un chemin de suppression ouvert, elle devient le **seul** obstacle à une question aussi simple que « qui a retiré ce rôle, et quand ? », à laquelle **aucune donnée du dépôt ne permettrait de répondre**.

**Position retenue, identique à celle des chemins ouverts le matin même** : la spec **pose l'exigence, ne construit pas le journal** (hors périmètre, PO-WU-07). Les deux use cases portent un commentaire nommant PO-WU-07 à l'emplacement exact du futur appel de journalisation (§2.7). **Mais l'arbitrage du Bureau / du référent RGPD gagne un cran d'urgence** : ouvrir en production une suppression définitive et non tracée d'une donnée d'habilitation est plus lourd qu'ouvrir une création tracée nulle part, puisque le second cas laisse au moins la ligne créée.

**Noms de personnes** : aucun n'apparaît dans un libellé, une copie de confirmation ni une fixture de test — le nom du compte visé est **lu à l'exécution** depuis la ligne, jamais codé en dur (AC-WU-26 reconduit, `CLAUDE.md` §9).

## 5. Critères d'acceptation

Numérotation **continuée** depuis `specs/web-users.md` (dernier existant : AC-WU-39).

**Amendements à deux critères existants**

- **AC-WU-40** — *(amende AC-WU-07)* `public.users` reste **sans politique `INSERT` ni `DELETE`** (inchangé). Sur `public.user_roles`, **exactement deux** politiques d'écriture sont ajoutées par cet amendement — `user_roles_update_assign_role` (`UPDATE`) et `user_roles_delete_remove_role` (`DELETE`) — et **aucune autre** : ni politique élargie, ni politique existante modifiée. La désactivation d'un **compte** reste hors périmètre (PO-WU-05) : **aucune politique `DELETE` sur `public.users`**, dans aucun cas.
- **AC-WU-41** — *(amende AC-WU-24)* Aucun contrôle de **désactivation, révocation ou suppression de compte** n'apparaît nulle part, **pas même désactivé** (inchangé, PO-WU-05). En revanche, **la modification de portée et le retrait d'une affectation de rôle sont rendus**, et **uniquement** par le clic sur une pastille des sept rôles assignables (§2.4, §7) — **jamais** par un quatrième bouton dans la colonne `ACTIONS`, jamais par une page dédiée.

**Base de données et RLS**

- **AC-WU-42** — **La ligne non négociable, seconde moitié.** **Aucun chemin ne permet de modifier ni de supprimer une ligne `user_roles` portant `role = 'admin'`** : le `using` de la politique `UPDATE` **et** celui de la politique `DELETE` portent `private.is_admin()` **et** la **liste blanche littérale** des sept rôles non-`admin` (jamais `role <> 'admin'`, §2.6). **Testé explicitement avec un jeton administrateur**, l'échec attendu étant un **refus RLS**, pas un message d'interface.
- **AC-WU-43** — `revoke update on public.user_roles from authenticated` **précède** `grant update (team_id, section_id) on public.user_roles to authenticated` dans la migration (sans le `revoke`, le `grant` de colonne élargit au lieu de restreindre — piège déjà documenté dans `20260918090000_web_users_write_policies.sql`). Conséquence **testée** : une requête forgée avec une session administrateur qui tente d'écrire `role` **ou** `user_id` sur `public.user_roles` est **refusée par Postgres** (privilège de colonne), pas seulement absente de l'interface. Une modification de portée ne touche **que** la ou les lignes de l'affectation ciblée — jamais les autres affectations du même compte.
- **AC-WU-44** — `user_roles_select_own`, `user_roles_insert_assign_coach` et `user_roles_insert_assign_role` sont **inchangées**, ainsi que `users_update_admin` et toutes les politiques d'adhésion. Chacune des deux nouvelles politiques porte **en commentaire SQL le nom de l'action qu'elle miroite** (`'role:assign'`, `'role:remove'`), et les entrées de matrice renvoient à la politique et au fichier de migration — **miroir manuel des deux côtés, jamais généré** (`CLAUDE.md` §7).

**Domaine**

- **AC-WU-45** — **Une seule entrée de matrice est ajoutée** : `'role:remove': ['admin']`. `'role:assign'` **n'est pas renommée ni dupliquée** — son commentaire est étendu pour nommer les **deux** politiques qu'elle miroite désormais (§2.5a). Le use case de modification de portée exige `'role:assign'` ; le use case de retrait exige `'role:remove'` ; la réconciliation d'une portée `coach` qui **décoche** au moins une équipe exige **les deux** (§2.5d). Couvert par Vitest, priorité de test n°1.
- **AC-WU-46** — **Non-régression stricte** : `AssignCoachDialog`, `useAssignCoachDialogViewModel`, `AssignCoachToTeamsUseCase`, `'role:assign-coach'`, `user_roles_insert_assign_coach` et l'écran `/admin/teams` fonctionnent **à l'identique** ; `AssignRoleUseCase`, `AssignRoleDialog` et le dialogue « + Rôle » de la colonne `ACTIONS` **ne changent pas de comportement** (AC-WU-31 reconduit et étendu).
- **AC-WU-47** — `can.ts` gagne la **branche de portée de `'role:remove'` dans le même changement** que son entrée de matrice (contexte résolu depuis la portée **actuelle** de l'affectation ciblée) — jamais l'entrée seule, qui laisserait un futur élargissement (PO-WE-01) retirer un rôle hors de sa propre portée sans aucun garde-fou front. Jumeau exact d'AC-WU-36, couvert par Vitest.
- **AC-WU-48** — Les deux use cases vivent dans `domain/usecases/users/`, **sans import React, Supabase, TanStack Query ni `window`**, et sont typés sur `AssignableRoleAssignment` (exclusion structurelle d'`admin`). La **validation de forme de portée est partagée** avec `AssignRoleUseCase` — **une seule implémentation**, jamais une seconde copie (§2.7). Les deux méthodes ajoutées le sont à **`RoleAssignmentRepository`**, jamais à `UserRepository` ni à un troisième repository de rôles.
- **AC-WU-49** — Un succès invalide la **lecture d'annuaire** et **`usersBadgeCount()`** ; si l'affectation touchée est un `coach`, **`coachAssignmentsAdminList`** en plus — toutes via les clés **centralisées** de `presentation/shared/query-keys.ts`, **jamais inline**. Un échec n'invalide rien et laisse le dialogue ouvert avec les saisies conservées.

**Écran `/admin/users`**

- **AC-WU-50** — **Une pastille de l'un des sept rôles assignables est un contrôle interactif réel** : un `button` (jamais un `div` porteur d'`onClick`), atteignable au **clavier** (`Tab`, `focus-visible`), portant un **nom accessible** qui dit ce que le clic fait (ex. « Modifier ou retirer l'affectation *(rôle et portée)* »), et une cible tactile conforme (`CLAUDE.md` §6, y compris sur desktop). **La pastille `Administrateur` n'est pas un contrôle** : elle reste le rendu statique actuel, **sans affordance de clic**, sans focus, sans infobulle promettant une action — **jamais un bouton désactivé** (§2.4, §7).
- **AC-WU-51** — Le dialogue rend **le rôle en lecture seule** et **la portée actuelle pré-remplie**, selon les mêmes règles conditionnelles qu'AC-WU-35 : une équipe pour `player`, la sélection à cocher **pré-cochée** pour `coach`, une section pour `section-manager`, **aucun champ de portée** pour les quatre rôles club-wide (où seul le retrait est offert). Une soumission sans la portée requise est **refusée dans le domaine avant tout appel réseau**, message français traduit ; une soumission **identique à l'état actuel** est un **no-op silencieux** (aucune écriture, aucune erreur) ; un déplacement vers une portée **déjà occupée par le même compte et le même rôle** remonte un message français explicite, **jamais absorbé en silence** (§2.2).
- **AC-WU-52** — Le retrait passe par une **étape de confirmation explicite** (patron d'interaction d'`ArchiveMembershipDialog`), dont la copie dit **« retirée définitivement »** et **jamais « archivée »** : aucune ligne n'est conservée (§2.3, §4). Le retrait supprime **toutes les lignes que la pastille affiche et elles seules** — toutes les équipes pour un `coach` multi-équipes, jamais les autres affectations du compte. **Retirer la dernière affectation est autorisé** : le compte rend alors « Aucun rôle » (AC-WU-18) et compte pour un dans le badge (critère 1 d'AC-WU-37) — **jamais une erreur, jamais un blocage**.
- **AC-WU-53** — Les contrôles restent gouvernés par des booléens **séparés** calculés par le ViewModel (`canAssignRole` sur `'role:assign'`, un nouveau booléen sur `'role:remove'`) — **jamais fusionnés** en un `canManageRoles`. Un contrôle non autorisé **disparaît**, il n'apparaît pas grisé (AC-WU-19 reconduit) : si `'role:remove'` n'est pas accordée, le dialogue s'ouvre **sans** son action destructrice, et la modification de portée d'un `coach` **ne peut pas décocher** d'équipe (§2.5d).
- **AC-WU-54** — Aucun écran mobile ne change (AC-WU-29 reconduit) ; aucune donnée sensible nouvelle n'est affichée ; aucun chemin d'export n'est ajouté (AC-WU-27 reconduit) ; aucun nom de personne n'est codé en dur, y compris dans la copie de confirmation, qui lit le nom depuis la ligne (AC-WU-26 reconduit).

## 6. Points ouverts

Les points **PO-WU-05 à PO-WU-11** de `specs/web-users.md` restent ouverts tels quels — **PO-WU-07 et PO-WU-08 sont aggravés** par cet amendement (§4), sans changer de formulation ni de destinataire. Deux points s'ajoutent :

| Réf. | Question | Pour qui | Bloquant ? |
|---|---|---|---|
| **PO-WU-12** | **Par quel chemin le club ajoute-t-il ou retire-t-il un administrateur ?** Cet amendement ferme explicitement la porte côté application (§2.4), comme l'assignation l'avait déjà fait : **aucun chemin de l'interface ne crée, ne modifie ni ne supprime une affectation `admin`**, et la RLS le garantit. En pratique, l'appartenance au rôle `admin` ne se gère donc **que par accès direct à la base** (console Supabase / SQL). Deux questions pour le Bureau : (a) est-ce acceptable durablement, ou faut-il un jour un parcours dédié — nécessairement à double contrôle (« au moins un administrateur restant », confirmation renforcée, journalisation) ? (b) combien d'administrateurs le club maintient-il, sachant qu'**un seul** signifie qu'une perte d'accès de ce compte n'est réparable que par la console ? Relié à PO-WU-05 (révocation) et à PO-WE-04 (MFA administrateur) | **Bureau / développeuse** | Non pour construire — **oui avant mise en production** |
| **PO-WU-13** | **Deux pastilles de même rôle sur une même ligne.** La base l'autorise (index uniques partiels sur `(user_id, role, section_id)` et `(user_id, role, team_id)`) : un compte peut être responsable de **deux** sections, ou joueur de **deux** équipes — ce dernier cas contredisant par ailleurs l'hypothèse « un joueur, une équipe » écrite dans `domain/entities/user.ts`. La colonne `RÔLES` n'a **jamais été dessinée** pour ce cas (aucune maquette ne le montre) et cet amendement le rend **actionnable** : chaque pastille doit être ciblable indépendamment (§2.1, AC-WU-50). Faut-il (a) rendre deux pastilles distinctes, (b) fusionner les portées d'un même rôle comme on le fait déjà pour `coach`, ou (c) empêcher en amont qu'un compte porte deux fois le même rôle scindé ? Sous-question de **PO-WU-09**, qu'il ne remplace pas | **Développeuse / designer-agent** | Non pour construire (le ciblage par clé naturelle fonctionne dans les trois cas) — **oui pour figer la colonne `RÔLES`** |

## 7. Note pour designer-agent

> **Rien de ce parcours n'est illustré.** Les cinq exports `docs/designs/desktop/users/[Admin] Web - Users - {1,2,3,4,5}.png` ne montrent **ni pastille cliquable, ni dialogue de modification d'affectation, ni confirmation de retrait** — la ligne du registre `docs/designs/DESIGN_LINKS.md` §2 est au statut **`instantané seul`**, donc **aucun lien artifact n'est à demander** (§4 du registre). C'est le **second** élément de cette feature à dessiner sans référence visuelle, après l'icône d'avertissement de ligne.
> **La section `## UI design` de `specs/web-users.md` n'est pas touchée par le présent amendement** : c'est la passe designer qui l'étend, en respectant §0 ci-dessus (la puce « aucun contrôle de retrait de rôle ne doit apparaître » y est caduque).

- **La pastille devient un contrôle.** Elle doit **se voir comme cliquable** (survol, focus visible, curseur) sans cesser d'être la pastille dense que l'export 4 montre — c'est le premier élément *à l'intérieur* d'une cellule de tableau à devenir interactif dans ce backoffice. `button`, pas `div` cliquable ; nom accessible explicite ; cible tactile conforme `CLAUDE.md` §6, **y compris sur desktop** (AC-WU-50).
- **La pastille `Administrateur` reste inerte** : même rendu qu'aujourd'hui, **sans aucune affordance** — pas de survol, pas de focus, **pas un bouton désactivé** et pas d'infobulle « non modifiable ». Elle ne doit pas ressembler à un contrôle cassé ; elle doit ressembler à ce qu'elle est : une étiquette. Si une explication s'avère nécessaire à l'usage, elle relève d'une passe ultérieure, pas d'un état grisé ajouté par défaut.
- **Le dialogue** : rôle **en lecture seule** (même traitement que le champ `EMAIL` du dialogue « Modifier l'utilisateur » — non éditable **et le disant**, pas un champ inerte muet), portée **pré-remplie** et modifiable selon le rôle, **rien** pour les quatre rôles club-wide. Réutiliser, sans redessiner, la liste à cocher d'`AssignCoachDialog` pour `coach` et les `Select` de portée d'`AssignRoleDialog` — un même besoin, un même patron visuel. La hauteur du dialogue varie selon le rôle, exactement comme pour `AssignRoleDialog` : pas de hauteur fixe.
- **L'action destructrice** : précédent d'interaction = `ArchiveMembershipDialog` (`AlertDialog`, dialogue maintenu ouvert pendant la mutation, fermeture depuis le `onSuccess` du ViewModel). **Mais la formulation et le traitement visuel se rapprochent d'`ArchiveNewsDialog`** : ici, rien n'est conservé — la copie dit « retirer définitivement », jamais « archiver », et le traitement destructif est **justifié** (contrairement au cas de l'adhésion, où il avait été délibérément évité). Deux niveaux à ne pas confondre : le dialogue de modification **contient** l'entrée vers le retrait ; la **confirmation** est une seconde étape, jamais un retrait au premier clic.
- **Ce que la confirmation doit dire, factuellement** : quel rôle et quelle portée disparaissent (lus depuis la ligne, **jamais un nom codé en dur**) ; que pour un `coach` multi-équipes **toutes** les équipes de cette affectation sont retirées ; et, le cas échéant, que le compte se retrouvera **sans aucun rôle** — information, **pas un blocage** (§2.3).
- **À ne pas introduire** : aucun quatrième bouton dans la colonne `ACTIONS`, aucun menu contextuel de ligne, aucun contrôle de désactivation/suppression de **compte** (PO-WU-05, AC-WU-41), aucun changement de rôle en place (§1).
- **PO-WU-13 est une question pour vous** : le rendu de deux pastilles de même rôle (deux sections, deux équipes) n'est illustré nulle part et devient actionnable — à trancher avec la développeuse plutôt qu'à supposer.
