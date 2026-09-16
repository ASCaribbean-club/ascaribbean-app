# Spec — Votes des joueuses (onglet « Votes » du détail d'une convocation)

> Statut : **implémentation autorisée** (décision développeuse, 2026-09-16). **PO-PV-01, PO-PV-02 et PO-PV-03 sont tranchés** — voir §5 pour le détail : PO-PV-01 est validé (rattachement ASC Legacy, brique de collecte, implémentation possible dès maintenant, sans attendre la grille de points) ; PO-PV-02 est rejeté (la catégorie négative n'est pas construite, décision définitive et non un simple report) ; PO-PV-03 est tranché (une seule catégorie, `vote_categories.id = 'man_of_the_match'`, libellé « Joueuse du match », table dédiée créée par `supabase/migrations/20260916172217_vote_categories.sql`). 11 points ouverts restants (PO-PV-04 à PO-PV-14), aucun ne bloque l'implémentation de la catégorie positive.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (modules P0/P1/P2 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles), `specs/match_details_page.md` (écran hôte — §1 « Contenu retenu », §2, §3 « recomposition », correction #2 « onglet Votes supprimé »), `specs/coach-attendance-confirmation.md` (précédent le plus proche : jugement nominatif, PO-AT-02 audit/Legacy), `specs/player-dashboard.md` (AC-PD-12 : aucun indicateur Legacy, même statique), `docs/ARCHITECTURE.md` §11 (où placer le journal d'audit), `docs/GOUVERNANCE.md` §7 (référent RGPD non désigné), `docs/RETENTION_PURGE.md` §2, `docs/DEFAULTS-A-CHALLENGER.md` (« Variante de l'écran détail convocation pilotée par l'onglet de rôle actif »).
> Maquettes : `docs/designs/player-vote/[v3] [Coach] Mob - player-vote-{1,2,3}.png`, **lues directement**. Voir §0 pour le statut de registre.
> État du code lu pour cadrer : `domain/entities/convocation.ts`, `domain/entities/user.ts` (via `RoleAssignment`), `domain/policies/{actions,rbac-matrix,can}.ts`, `domain/rules/active-role-scope.ts`, `presentation/app/providers/active-role-provider.tsx`, `presentation/features/convocation/{ConvocationDetailPage.tsx,components/RoleMismatchState.tsx}`.

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

**Aucune ligne n'existe dans le §2 du registre pour la feature `player-vote`.** Trois exports PNG sont en revanche présents dans le dépôt (`docs/designs/player-vote/`), importés directement par la développeuse sans lien artifact — exactement le cas de figure déjà rencontré pour `menu` et `actus`, pour lequel le registre a une valeur de statut dédiée : **`instantané seul`**. Conformément au §4 du registre, ce statut signifie « utiliser l'instantané local versionné et **ne pas demander de lien artifact** ». **Aucun lien n'est donc demandé ici**, et aucune redemande n'aura lieu lors d'une passe ultérieure.

Le §4 demande aussi à l'agent d'ajouter lui-même la ligne manquante. L'agent PO **ne peut écrire que dans `specs/`** — même limite que celle déjà constatée pour `actus` (PO-AT-07 de `specs/actus.md`, ligne finalement inscrite par l'agent designer). La ligne est donc **pré-rédigée ci-dessous, à recopier telle quelle** dans le tableau du §2 du registre par le premier agent ou la développeuse ayant les droits d'écriture sur `docs/` :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| player-vote — **vue joueuse (bulletin) et vue coach (consultation)** (`[v3] [Coach] Mob - player-vote-{1,2,3}`) | — aucun lien fourni | 2026-09-16 | `docs/designs/player-vote/[v3] [Coach] Mob - player-vote-{1,2,3}.png` | **instantané seul** |

> Note à joindre à la ligne : les trois exports portent tous le préfixe `[Coach]`, mais **deux d'entre eux (2 et 3) rendent en réalité la vue joueuse** (bulletin de vote, bandeau « Votes anonymes », bouton « Valider mon vote », « Changer mon vote »). Seul l'export 1 rend la consultation coach (résultats en valeurs absolues, aucun contrôle de saisie). Le préfixe du nom de fichier est donc trompeur et ne doit pas servir à déduire la variante de rôle — voir PO-PV-13. Les maquettes divergent par ailleurs entre elles sur la barre d'onglets et sur le libellé de la première catégorie (§1, PO-PV-03 et PO-PV-13).

## 1. Périmètre

Les joueuses d'une équipe **votent entre elles**, après une échéance, dans un petit nombre de **catégories de reconnaissance** (une positive, une négative). Les résultats sont agrégés et restitués à l'équipe. Le coach **consulte** ces résultats sans jamais pouvoir voter ni corriger quoi que ce soit.

Ce n'est **pas un nouvel écran** : c'est un **onglet supplémentaire « Votes »** sur `ConvocationDetailPage` (`specs/match_details_page.md`), à côté d'« Infos » et « Effectif ».

### ⚠️ Cette feature réintroduit un onglet que l'écran hôte avait explicitement supprimé

`specs/match_details_page.md`, « Corrections obligatoires vs maquette », point 2, a supprimé les onglets « Compo », **« Votes »** et « Messagerie » avec ce motif : *« Aucun support de domaine : pas de composition/lineup modélisée, **aucune entité de vote nulle part dans le schéma**, Communication est P1. »* La correction est reprise telle quelle dans le code (`ConvocationDetailPage.tsx`, commentaire de `TabsList`) et re-appliquée par `specs/coach-attendance-confirmation.md` §6.

Le constat technique reste vrai aujourd'hui : **aucune entité, aucune table, aucune politique RLS de vote n'existe**. Ce qui change, c'est qu'une demande produit explicite arrive, avec des maquettes. Cette spec ne « corrige » donc pas l'écran hôte : elle **rouvre une décision prise pour absence de support** — décision reprise ci-dessous (PO-PV-01, tranché).

### Rattachement CDC — tranché (PO-PV-01, décision développeuse, 2026-09-16)

**Aucun module du CDC ne couvre le vote entre pairs tel quel.** Le tableau ci-dessous, conservé pour mémoire, documente le raisonnement qui a mené à la décision :

| Module candidat | Priorité | Pourquoi ça ne colle pas |
|---|---|---|
| Présences et suivi sportif (« évaluations ») | P0 | L'évaluation du CDC est **saisie par le coach sur ses joueuses** (matrice : « Saisir une évaluation sportive » ✅ Coach/Staff son équipe, ❌ **tous les autres, Joueur/Joueuse compris**). Le vote entre pairs en est l'**inverse exact** : c'est la joueuse qui juge, le coach qui regarde. Réutiliser cette ligne reviendrait à retourner sa sémantique |
| ASC Legacy (points, badges, avantages, classements) | **P1 — retenu** | Le rattachement retenu — un « homme/joueuse du match » est ce qui alimente, plus tard, des points. Le CDC §8 impose que la grille (barèmes, seuils, badges) elle-même soit **« validée par le Bureau avant développement »** — c'est pourquoi cette feature reste une **brique de collecte de données**, jamais un barème (voir décision ci-dessous) |
| Communication | P1 | Annonces et notifications ciblées. Un vote n'est pas une annonce |
| Statistiques et exports | P1 | Restitution de données existantes, pas production d'une donnée nouvelle |
| Médias et journalisme | **P2** | Le seul module dont un « homme du match » relève naturellement dans la vie d'un club — et il est **différé en V2** |

**Décision (PO-PV-01, tranché)** : cette feature est rattachée à **ASC Legacy (P1)**, en tant que **brique de collecte de données en amont de la grille de points elle-même** — elle produit la donnée source (« qui a été désignée homme/joueuse du match ») que le futur module Legacy pourra consommer, une fois sa grille validée par le Bureau. **L'implémentation peut démarrer dès maintenant, sans attendre cette grille.** Conséquence non négociable, qui reste inchangée : **aucun barème, point, badge ou classement Legacy n'est construit dans cette passe** — voir « Hors périmètre » ci-dessous et AC-PV-15, qui restent pleinement en vigueur. Si le Bureau ajoute un jour une ligne de matrice dédiée au CDC pour ce cas d'usage, cette spec devra être mise à jour en conséquence — ce n'est pas fait ici.

### Contenu retenu (d'après les maquettes)

1. **Onglet « Votes »** sur `ConvocationDetailPage`, à côté d'Infos et Effectif.
2. **Une seule catégorie, positive** — libellée « HOMME DU MATCH » sur la maquette 1, « JOUEUSE DU MATCH » sur les maquettes 2 et 3 (incohérence réelle, libellé définitif encore ouvert, PO-PV-03). La maquette montre aussi une catégorie **négative** (« CARTON ROUGE SYMBOLIQUE », sous-titrée « comportement le moins fair-play du match ») — **rejetée par décision produit (PO-PV-02, tranché le 2026-09-16) : elle n'est pas implémentée**, pas seulement différée. Voir §5 pour la décision et §3 pour le raisonnement qui l'a motivée.
3. **Bulletin (rôle actif = joueuse)** : par catégorie, une liste de candidates en **choix unique** (contrôles de type radio), puis un bouton de validation (« Valider mon vote »), désactivé tant qu'aucune candidate n'est sélectionnée (« Choisis une joueuse pour voter »).
4. **Résultats** : après enregistrement de son vote, la joueuse voit les résultats **de cette catégorie seulement** (« Résultats masqués » reste affiché sur la catégorie non encore votée), en **pourcentages**, plus un dénombrement (« 11 votes sur 14 joueuses ») et la mention « aucun nom associé ». Le coach voit des **valeurs absolues** (maquette 1).
5. **Changement de vote** : un lien « Changer mon vote » existe tant que les votes ne sont pas clos — le vote est donc **modifiable**, dernière valeur gagne.
6. **Fenêtre de vote** : « Clôture des votes 48h après le match » (maquettes 2 et 3), « Votes fermés 48h après le match » (maquette 1). Valeur affichée par la maquette, **sans fondement dans aucun document de cadrage** (PO-PV-06).
7. **Anonymat annoncé** : bandeau « Votes **anonymes**. Personne ne voit qui a voté quoi — ni les joueuses, ni le coach. Seuls les pourcentages sont publiés, une fois ton vote enregistré. » Cette promesse est **plus forte que ce que le modèle peut techniquement garantir** — voir §3, c'est le point RGPD central de la feature.

### Hors périmètre — explicitement

- **Tout point, palier, badge ou classement ASC Legacy** dérivé de ces votes. Même raisonnement et même interdiction que `specs/coach-attendance-confirmation.md` §1 et `specs/player-dashboard.md` AC-PD-12 : la grille est « à valider par le Bureau avant développement » (CDC §8). Cette feature produit une donnée source, **jamais un barème** — aucune valeur, même statique (AC-PV-15). Ceci reste vrai malgré la décision PO-PV-01 : le rattachement à ASC Legacy autorise l'implémentation du **mécanisme de vote**, pas celle de la grille de points elle-même.
- **La catégorie négative « carton rouge symbolique »** : rejetée par décision produit (PO-PV-02, tranché le 2026-09-16), pas simplement différée. Ne pas la (ré)introduire sans une nouvelle décision produit explicite — voir §3 et §5.
- **La désignation d'un lauréat** (persistance d'un « vainqueur » de catégorie, gestion des ex æquo, palmarès de saison) : PO-PV-09, non construit.
- **Les onglets « Compo » / « Disposition » / « Stats » / « Convocations » / « Messagerie »** visibles sur les maquettes : hors périmètre, correction #2 de `specs/match_details_page.md` maintenue (§6). Aucune table, aucune entité derrière ; Communication est P1.
- **Toute donnée de résultat sportif** (score, buteuses, temps de jeu) : AC-MD-19, aucun module « résultats et compétitions » en P0/P1. Le bandeau « AS Caribbean vs Caribbean Girlz » du hero est déjà construit à partir de `MatchDetails` + `Opponent` — rien de nouveau n'est ajouté.
- **Le vote sur un `training` ou un `meeting`** : non construit tant que PO-PV-08 n'est pas tranché ; les trois maquettes ne montrent qu'un match.
- **Toute forme de vote d'un rôle non-joueur** (coach, bureau, public) : exclue par la demande elle-même.
- **Le commentaire libre associé à un vote** : aucun champ texte sur les maquettes, et aucun ne doit être ajouté — même vecteur de donnée sensible que `ConvocationResponse.reason` et `AttendanceRecord.note`, tous deux fermés faute de référent RGPD désigné (AC-PV-14).
- **La notification d'ouverture/clôture des votes** : Communication est P1.
- **Le mode dégradé offline** : la matrice n'accorde le mode dégradé qu'à la *consultation* d'une convocation, jamais à l'écriture — même règle que `specs/create-convocation.md` §1 et `specs/coach-attendance-confirmation.md` §1.

## 2. RBAC

### Il n'existe aucune ligne de matrice applicable — et la plus proche dit l'inverse

La matrice de `docs/priorisation-fonctionnelle-as-acaribbean.md` **ne comporte aucune ligne « voter » ni « reconnaissance entre pairs »**. Contrairement au cas d'usage de `specs/coach-attendance-confirmation.md` §2 — qui pouvait raisonnablement traduire la ligne voisine « Saisir une évaluation sportive » — **cette ligne ne peut pas être réutilisée ici** : elle donne ✅ au Coach/Staff et ❌ au Joueur/Joueuse, soit exactement la répartition inverse de celle demandée. S'en servir comme fondement produirait un contresens, pas une extrapolation.

Cette spec propose donc une **ligne de matrice nouvelle**, à faire valider par le Bureau en même temps que PO-PV-01 :

| Rôle | Ligne proposée « Voter dans une catégorie de reconnaissance » | Ligne proposée « Consulter les résultats de vote » |
|---|---|---|
| **Joueur/Joueuse** | ✅ **son équipe uniquement**, et seulement sur une convocation de son équipe — même portée que `'convocation:respond'` | ✅ son équipe, selon la règle de dévoilement du §1 point 4 |
| **Coach/Staff** | ❌ — **consultation seule**, exigence explicite de la demande. Aucun contrôle de saisie rendu, aucune correction, aucune suppression d'un vote | ✅ **son équipe** (« Voir les dossiers des autres membres » : ❌ *son équipe, hors financier* — l'accès à l'équipe dont il a la charge est le périmètre déjà retenu par `specs/match_details_page.md` §2) |
| Responsable de section | ❌ | **Ouvert, non accordé dans cette passe** (PO-PV-04). La ligne « Voir les dossiers des autres membres » lui donne ✅ (sa section), mais un résultat de vote n'est pas un dossier d'adhérent |
| Dirigeant habilité | ❌ | **Ouvert, non accordé dans cette passe** (PO-PV-04), même motif |
| Trésorier | ❌ | ❌ — périmètre financier |
| Référent médical | ❌ | ❌ — périmètre santé, écran distinct et tracé |
| Bénévole | ❌ | ❌ — « Pas d'accès aux dossiers adhérents » |
| Administrateur | ❌ — un administrateur n'est pas une joueuse ; aucun point d'entrée UI de saisie n'est construit | ✅ par l'administration, jamais par auto-affectation à une équipe (même règle que `specs/match_details_page.md` §2) |

**Action métier nouvelle proposée** : `'vote:cast'` dans `actions.ts` + `rbacMatrix['vote:cast'] = ['player']`, **bornée à l'équipe**. C'est la seule entrée de matrice à créer : `presentation/` doit décider de rendre ou non le bulletin **avant** toute requête.

**La lecture des résultats reste RLS-only, sans entrée de matrice** — critère commenté en tête de `rbac-matrix.ts` : l'onglet ne change pas de *structure* selon le rôle du lecteur, seul le contenu retourné diffère (pourcentages vs valeurs absolues, résultats masqués ou non). La bascule bulletin/consultation, elle, est déjà décidée par le rôle actif (ci-dessous), pas par une requête.

### ⚠️ Piège `can.ts` — la branche `player` ne nomme qu'une seule action

`can.ts`, branche `'player'` :

```ts
case 'player':
  return action !== 'convocation:respond' || assignment.teamId === context.teamId
```

Cette forme ne nomme **qu'une action**. Ajouter `'vote:cast': ['player']` à la matrice **sans étendre cette condition** ferait passer la nouvelle action par ce `case` **sans aucun contrôle d'équipe** : une joueuse pourrait voir le bulletin rendu sur le match d'une autre équipe. La RLS le refuserait, mais le contrôle serait affiché.

C'est **exactement la même classe d'écart** que celle déjà corrigée deux fois dans ce dépôt : sur la branche `section-manager` (`specs/create-convocation.md` §3), puis sur la branche `coach` (`specs/coach-attendance-confirmation.md` §2/§7, où la condition est devenue `const requiresTeamScope = action === 'convocation:create' || action === 'attendance:validate'`). La branche `player` est la **troisième occurrence du même motif** et doit être traitée de la même façon, pas réinventée.

### La règle « rôle actif » — mécanisme existant, à ne surtout pas dédoubler

Demande de la développeuse : *« If a player is coach and player, the current role should be player to be able to vote. »*

**Ce n'est pas une permission**, c'est un **contexte de rôle actif** : le compte cumule bien les deux rôles et conserve `can(user, 'vote:cast', { teamId })` à `true` en permanence. Ce qui varie, c'est la **variante d'écran rendue**.

Le mécanisme existe déjà et sert **déjà cet écran précis** — ne pas en créer un second :

| Pièce existante | Rôle |
|---|---|
| `ActiveRoleProvider` / `useActiveRole()` (`presentation/app/providers/active-role-provider.tsx`) | Porte `activeRole: 'coach' \| 'player'`, avec `toggleActiveRole()`. **Par défaut `player`** pour un compte double (`getDashboardRoles` est ordonné player-first) — donc le cas demandé est déjà le comportement par défaut |
| `hasActiveRoleForConvocation(user, activeRole, convocation)` (`domain/rules/active-role-scope.ts`) | Règle **pure**, explicitement « what's true », jamais « who's allowed » — vérifie que le rôle actif s'applique bien à l'équipe de cette convocation |
| `RoleMismatchState` (`presentation/features/convocation/components/RoleMismatchState.tsx`) | État rendu quand le rôle actif ne concerne pas la convocation |
| `docs/DEFAULTS-A-CHALLENGER.md`, « Variante de l'écran détail convocation pilotée par l'onglet de rôle actif » | Consigne déjà arbitrée : la variante est **entièrement pilotée par l'onglet de rôle actif**, pas recalculée depuis `user.roles` ; « ne fait délibérément pas apparaître les deux variantes pour un compte joueur-coach de la même équipe sans bascule explicite d'onglet » |

**Règle retenue pour l'onglet Votes**, strictement dérivée de ce qui précède :

| Rôle actif | `hasActiveRoleForConvocation` | Onglet Votes rendu |
|---|---|---|
| `player` | `true` | **Bulletin** — choix unique par catégorie + validation, puis résultats de la catégorie votée |
| `coach` | `true` | **Consultation seule** — résultats, **aucun contrôle de saisie rendu** (absence, pas désactivation) |
| l'un ou l'autre | `false` | `RoleMismatchState`, inchangé — l'onglet Votes ne fait pas exception |

Un compte cumulant joueuse **et** coach de la **même** équipe voit donc, selon l'onglet de rôle actif, l'une **ou** l'autre variante — jamais les deux composées. C'est le comportement déjà en vigueur sur cet écran, assumé et tracé dans `DEFAULTS-A-CHALLENGER.md`, avec sa question de revisite (« après premiers retours réels »).

**Conséquence à énoncer plutôt qu'à laisser implicite** : le rôle actif étant un état d'interface, il **ne peut pas** porter la sécurité. La RLS, elle, ne connaît que le compte et ses rôles — un compte joueuse-coach **peut** techniquement écrire son vote via l'API pendant que son onglet est sur « coach ». C'est correct et voulu : elle en a le droit **en tant que joueuse**. La règle « rôle actif = joueuse » est une règle d'**ergonomie** (ne pas mélanger deux casquettes à l'écran), pas une règle d'autorisation, et ne doit pas être mirroitée en RLS (PO-PV-05).

**Règle d'affichage** (moindre privilège) : pour tout rôle sans `'vote:cast'`, les contrôles de saisie sont **absents**, jamais grisés ni suivis d'une erreur au clic.

## 3. Données sensibles

### Données de santé — aucune ; données financières — aucune

Aucune donnée de santé, d'aptitude ni de diagnostic (AC-MD-18, AC-PD-08). Aucun statut de cotisation ni montant — module Cotisations P1. **Aucun champ de texte libre n'est créé** : c'est délibéré, `ConvocationResponse.reason` (PO-PD-03) et `AttendanceRecord.note` (PO-AT-06) sont tous deux fermés faute de référent RGPD désigné, et un champ « commentaire de vote » rouvrirait le même vecteur (AC-PV-14).

### Catégorie négative — rejetée (PO-PV-02, tranché) ; section conservée pour mémoire

`specs/coach-attendance-confirmation.md` §3 a introduit le « jugement nominatif porté par un tiers sur un membre », en notant que la responsabilité en était portée dans la ligne elle-même (`validatedBy`, `validatedAt`). Une catégorie négative aurait été allée **un cran plus loin**, sur deux axes :

1. **Le jugement aurait été collectif** et publié à toute l'équipe sous forme de classement.
2. **La catégorie était explicitement négative** — « carton rouge symbolique / comportement le moins fair-play ». C'est, en pratique, un mécanisme par lequel un groupe **désigne nominativement un de ses membres comme le moins bien comporté**, et publie ce résultat.

Ce raisonnement (aucun document du projet ne fondait cette catégorie ; arbitrage du **Bureau** sur la conformité à l'esprit du club, du **référent RGPD** sur le traitement à visée d'appréciation défavorable, et question ouverte de l'**âge des membres concernés**) a mené à la **décision de ne pas construire cette catégorie** (PO-PV-02, tranché le 2026-09-16, décision **définitive**, pas un simple report). **Seule la catégorie positive existe** (AC-PV-16). Cette section est conservée pour expliquer *pourquoi*, pas comme un point encore ouvert.

### ⚠️ L'anonymat annoncé par la maquette est un **pseudonymat**, pas un anonymat

La maquette affiche : *« Votes anonymes. Personne ne voit qui a voté quoi — ni les joueuses, ni le coach. »*

Or trois exigences de cette même spec imposent de **stocker l'identité de la votante** :

- **un vote par catégorie et par votante** (AC-PV-04) suppose une contrainte d'unicité sur `(convocation, catégorie, votante)` ;
- **« Changer mon vote »** (AC-PV-05) suppose de retrouver la ligne de cette votante ;
- **la RLS** ne peut borner une écriture à `auth.uid()` que si la colonne existe.

Le vote est donc **pseudonyme** : personne ne le voit dans l'application, mais la base le sait, et un accès administrateur ou un accès direct à la base **peut** le reconstituer. C'est la même nature d'écart que celui qui a fait échouer AC-MD-08 en recette (`specs/match_details_page.md` §2) : une promesse tenue par le rendu, pas par le modèle.

Deux conséquences **non négociables** :

1. **La formulation de l'interface ne doit pas promettre plus que le modèle ne garantit.** Le mot « anonyme » employé sans nuance est une affirmation adressée aux membres sur le traitement de leurs données ; la maquette est à corriger sur ce point (AC-PV-11, §6).
2. **La protection doit être tenue en base, pas au rendu** — même mécanisme que la vue `convocation_responders` : ce qui alimente l'affichage des résultats doit être un **agrégat** (décomptes par candidate) qui **n'expose jamais la colonne d'identité de la votante**, pour aucun rôle, y compris coach. Une politique `SELECT` qui livrerait les lignes individuelles en comptant sur le composant pour ne pas les afficher serait une régression directe de la leçon d'AC-MD-08 (AC-PV-10).

### ⚠️ Risque de recomposition — à traiter comme un vrai risque, pas comme un détail

`specs/match_details_page.md` §3 pose une contrainte **structurelle** : deux informations licites séparément peuvent redériver ensemble une information interdite. Le même risque existe ici, sous trois formes au moins :

- un **effectif très réduit** (une catégorie à 3 candidates, 4 votantes) rend le secret du vote arithmétiquement fragile ;
- l'affichage des **résultats en temps réel** avec un décompte de votants (« 11 votes sur 14 ») permet, en observant l'évolution entre deux consultations, d'attribuer un vote à la dernière votante ;
- le **dévoilement conditionné à son propre vote** (maquette) implique que voter en premier expose son propre choix comme unique.

Ces trois points plaident pour ne **publier les résultats qu'après clôture**, mais ce serait une décision produit que cette spec ne prend pas : les maquettes affichent explicitement l'inverse. **PO-PV-07**, à trancher avec la développeuse et le référent RGPD.

### Journal d'audit — à trancher, pas à omettre

- **Le CDC §11.3 ne liste pas le vote** parmi les actions sensibles (création/suppression de compte, changement de rôle, consultation de donnée santé, modification de paiement, **correction de points Legacy**, export nominatif). Lu littéralement : aucune journalisation requise pour l'acte de voter.
- ⚠️ **Mais** la même réserve que PO-AT-02 s'applique, en plus forte : le rattachement le plus plausible de cette feature **est** ASC Legacy (§1), et §11.3 vise explicitement la « correction points Legacy ». Le jour où un résultat de vote alimente des points, **le corriger ou l'annuler après coup équivaudra à corriger des points**. À poser au Bureau et au référent RGPD **avant** que le module Legacy ne soit construit.
- ⚠️ Une action de **modération** (annuler un vote, retirer une candidate, fermer une catégorie) — si elle est un jour jugée nécessaire — serait, elle, une action sensible à journaliser **depuis le use case** dans `domain/`, jamais depuis un composant (`CLAUDE.md` §6, `ARCHITECTURE.md` §11). Aucune n'est construite dans cette passe (PO-PV-12).
- ⚠️ **La table de journal d'audit reste absente de `supabase/migrations/`** : exigence transversale P0 non résolue, distincte de cette feature (constat déjà porté par `specs/create-convocation.md` §4, `specs/match_details_page.md` §3 et `specs/coach-attendance-confirmation.md` §3).

### Rétention — catégorie absente de `RETENTION_PURGE.md`

`docs/RETENTION_PURGE.md` §2 ne prévoit **aucune catégorie** pour une donnée de ce type. Un vote pseudonyme n'a pas de durée de conservation définie, et ne se range naturellement ni dans « documents administratifs », ni dans « données financières ». À ajouter au document par le référent RGPD (PO-PV-11) — non résolu ici, `domain/` ne connaît de toute façon pas la purge (`CLAUDE.md` §6).

### Export — aucun

Aucun export, aucune fonction de copie ou de partage, pour aucun rôle, depuis cet onglet (AC-PV-17).

## 4. Critères d'acceptation

**AC-01** et **AC-02** sont ceux de la section 17.2 du CDC. Les critères propres à cette feature sont préfixés `AC-PV-`, même convention que `AC-CD-`, `AC-PD-`, `AC-CV-`, `AC-MD-`, `AC-AT-` ; à renuméroter en recette.

| Réf. | Critère |
|---|---|
| **AC-01** | Aucune donnée d'un membre extérieur à l'équipe de la convocation n'est accessible, ni à l'écran ni dans la réponse API |
| **AC-02** | Une joueuse de l'équipe A qui tente de voter sur une convocation de l'équipe B est refusée **par la base**, pas seulement par l'interface. Vérifié par appel direct à l'API, hors application |
| AC-PV-01 | Un jeton **coach** ne peut **ni créer, ni modifier, ni supprimer** un vote, sur aucune convocation, y compris celles de sa propre équipe — refus **par la base**. Vérifié par appel direct à l'API, hors application |
| AC-PV-02 | Aucun contrôle de saisie (liste à choix unique, bouton de validation, lien « changer mon vote ») n'est **rendu** pour un rôle actif `coach` — **absence, pas désactivation** |
| AC-PV-03 | Pour un compte cumulant joueuse **et** coach de la même équipe : rôle actif `player` → bulletin rendu ; rôle actif `coach` → consultation seule. La bascule se fait **uniquement** par l'onglet de rôle actif existant (`useActiveRole()`), **sans nouveau sélecteur propre à cet onglet** et sans rechargement de la page |
| AC-PV-04 | Une votante ne peut avoir **qu'une seule ligne** par `(convocation, catégorie)` : voter deux fois ne crée pas deux lignes, dernière valeur gagne (upsert-on-conflict, `CLAUDE.md` §6). Contrainte tenue **par la base**, pas par l'interface |
| AC-PV-05 | Modifier son vote avant clôture remplace la valeur précédente et **met à jour les agrégats en conséquence** ; le total de votants ne s'incrémente pas |
| AC-PV-06 | L'identité de la votante est **imposée par la base** à l'utilisateur authentifié ; une écriture au nom d'une tierce personne est refusée par la RLS |
| AC-PV-07 | Voter dans une catégorie **n'a aucun effet** sur les autres catégories : l'état « non voté / résultats masqués » de la seconde catégorie est préservé (comportement explicite des maquettes 2 et 3) |
| AC-PV-08 | Les candidates proposées appartiennent **exclusivement** à l'effectif de l'équipe de cette convocation (PO-PV-10 pour la définition exacte de l'effectif retenu) ; aucune personne extérieure n'apparaît, ni à l'écran ni dans la réponse API |
| AC-PV-09 | Le comportement sur **son propre nom** est cohérent et identique dans les deux catégories, conformément à l'arbitrage de PO-PV-10 — pas un cas laissé au hasard de l'implémentation |
| **AC-PV-10** | **Pour tout jeton, y compris coach et responsable de section, l'identité de la votante est absente de la *forme même* de la réponse API** qui alimente l'onglet — pas seulement absente du rendu. L'écran ne consomme qu'un **agrégat**. Vérifié par appel direct à l'API, hors application. *Critère directement dérivé de l'échec d'AC-MD-08 : ne jamais l'évaluer contre un composant* |
| AC-PV-11 | Aucun texte d'interface n'affirme un **anonymat** que le modèle ne garantit pas (§3) ; la formulation retenue décrit ce qui est réellement vrai (non visible dans l'application) et est **validée par le référent RGPD** avant mise en production |
| AC-PV-12 | Passé la fenêtre de vote, les contrôles de saisie ne sont **plus rendus** — **absence, pas désactivation** (même règle qu'AC-MD-13 / AC-PD-06) — et une écriture tardive est refusée **par la base**, pas seulement par l'interface |
| AC-PV-13 | Une convocation sans aucun vote rend un **état vide explicite** par catégorie, jamais une erreur, jamais une liste de zéros présentée comme un classement |
| AC-PV-14 | Aucun champ de texte libre n'est saisissable ni affiché sur cet onglet, pour aucun rôle (§3) |
| AC-PV-15 | Aucun point, palier, badge ni classement ASC Legacy n'est rendu, **même avec une valeur statique** (CDC §8, AC-PD-12, AC-AT-09) |
| AC-PV-16 | La catégorie négative (« carton rouge symbolique ») n'est **ni rendue ni requêtée** : **rejetée par décision produit** (PO-PV-02, tranché le 2026-09-16), pas seulement en attente. L'onglet ne connaît qu'une seule catégorie, la positive |
| AC-PV-17 | Aucun bouton d'export, de copie, de partage ni de capture de résultats n'est rendu, pour aucun rôle — absence, pas désactivation |
| AC-PV-18 | Aucune donnée de résultat sportif (score, buteuse, temps de jeu) n'est rendue depuis cet onglet, **même statique** (AC-MD-19) |
| AC-PV-19 | Les contrôles interactifs (lignes de candidate sélectionnables, bouton de validation) ont une cible tactile d'au moins ~44px (`h-11`), vérifiée sur un **viewport mobile réel** (`CLAUDE.md` §6, AC-MD-23) |
| AC-PV-20 | Toute information portée par la couleur (candidate sélectionnée, barre de progression) est doublée d'un libellé textuel ; contrastes AA et navigation clavier opérationnelle (CDC §12, AC-MD-22) |
| AC-PV-21 | L'en-tête à flèche retour reste visible pendant le défilement d'un onglet long à deux catégories (`sticky top-0`, fond opaque — `CLAUDE.md` §6, AC-MD-20) |
| AC-PV-22 | Affichage complet en moins de 3 secondes sur mobile en réseau normal (CDC §12, AC-MD-21) |

## 5. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-PV-01** | ~~À quel module du CDC cette feature se rattache-t-elle, et à quelle priorité ?~~ **TRANCHÉ (2026-09-16, décision développeuse)** : rattachement à **ASC Legacy (P1)**, en tant que brique de collecte de données en amont de sa grille de points — implémentation autorisée dès maintenant, sans attendre que cette grille soit validée par le Bureau (CDC §8). Voir §1 pour le détail du raisonnement conservé. | **Développeuse** (tranché) | **Non — résolu.** L'implémentation peut démarrer |
| **PO-PV-02** | ~~La catégorie négative (« carton rouge symbolique ») est-elle retenue, et à quelles conditions ?~~ **TRANCHÉ (2026-09-16, décision développeuse)** : **rejetée**, décision définitive et non un simple report — voir §3 pour le raisonnement conservé. Seule la catégorie positive est implémentée | **Développeuse** (tranché) | **Non — résolu.** Ne pas (ré)implémenter cette catégorie sans nouvelle décision produit explicite (AC-PV-16) |
| **PO-PV-03** | ~~Libellé et nombre définitifs des catégories.~~ **TRANCHÉ (2026-09-16, décision développeuse)** : une seule catégorie, id `vote_categories.id = 'man_of_the_match'`, libellé « Joueuse du match » (retenait déjà la même forme au §"UI design" pour les raisons qui y sont détaillées). `votes.category_id` référence désormais cette table par clé étrangère au lieu d'un texte libre sans contrainte — voir `supabase/migrations/20260916172217_vote_categories.sql` | **Développeuse** (tranché) | **Non — résolu.** `POSITIVE_VOTE_CATEGORY_ID` dans `useConvocationDetailViewModel.ts` est câblé sur cette valeur |
| **PO-PV-04** | **Le Responsable de section et le Dirigeant habilité consultent-ils les résultats ?** La ligne « Voir les dossiers des autres membres » leur donne ✅ (sa section / tout), mais un résultat de vote n'est pas un dossier d'adhérent. Non accordé dans cette passe (§2) ; précédent identique à PO-AT-01 | Bureau (matrice CDC) | Non — la passe joueuse/coach est autonome |
| **PO-PV-05** | **La règle « rôle actif = joueuse » doit-elle avoir une contrepartie en base ?** Cette spec dit **non** (§2) : c'est de l'ergonomie, la RLS ne connaît pas l'onglet actif, et un compte joueuse-coach a légitimement le droit de voter en tant que joueuse. À confirmer explicitement pour que la divergence apparente UI/RLS ne soit pas lue plus tard comme un bug | Développeuse | Non — mais à confirmer avant implémentation pour éviter un mirroring SQL erroné |
| **PO-PV-06** | **Quelle est la fenêtre de vote exacte ?** Les maquettes affichent « 48h après le match », valeur **sans aucun fondement** dans les documents de cadrage. Sous-questions : (a) d'où court le délai (coup d'envoi ? fin estimée ?) ; (b) 48h est-il paramétrable par le coach ou constant ; (c) quelle articulation avec `ConvocationStatus = 'closed'`, piloté par un **trigger** sur les `AttendanceRecord` (`specs/coach-attendance-confirmation.md` AC-AT-10) — deux notions de « clôture » coexisteraient sur le même écran ; (d) l'ouverture des votes est-elle immédiate ou subordonnée à un événement ? Question jumelle de PO-AT-03, même nature | Bureau + développeuse | Non pour la conception (la maquette donne un état ouvert et un état clos). **Oui pour l'implémentation** : sans règle, AC-PV-12 n'est pas testable |
| **PO-PV-07** | **Les résultats sont-ils publiés en temps réel ou après clôture ?** Les maquettes disent temps réel, conditionné à son propre vote. Le §3 documente trois chemins de recomposition que ce choix ouvre (petit effectif, observation du compteur entre deux consultations, première votante). Sous-question : faut-il un **seuil minimal de votants** avant tout affichage ? | Développeuse + référent RGPD | Non pour la conception. **À trancher avant mise en production** |
| **PO-PV-08** | **Le vote concerne-t-il uniquement les matchs ?** Les trois maquettes ne montrent qu'un match, et les libellés disent « du match ». `ConvocationType` vaut `'training' \| 'match' \| 'meeting'` et rien ne distingue les types en base. Un « entraînement du match » n'a pas de sens ; une réunion encore moins | Développeuse | Non — restreindre au type `match` en v1 est le choix conservateur et réversible |
| **PO-PV-09** | **Que se passe-t-il à la clôture ?** Le résultat est-il **figé** (lauréate persistée, palmarès de saison) ou reste-t-il un simple agrégat recalculé ? Et en cas d'**ex æquo** ? PO-PV-01 tranché confirme que ces votes alimenteront un jour Legacy, mais **la grille elle-même reste, elle, à valider par le Bureau** (CDC §8) — c'est cette grille, pas seulement le rattachement, qui dira si une valeur figée est nécessaire. **Ne rien anticiper** tant que la grille Legacy n'existe pas | Bureau | Non — aucun lauréat n'est persisté dans cette passe (§1, hors périmètre) |
| **PO-PV-10** | **Qui est candidate, et peut-on voter pour soi-même ?** (a) et (b) **TRANCHÉES (2026-09-16, décision développeuse)** : (a) l'ensemble des candidates est la **liste des convoquées** (`ConvocationRespondersRepository`, déjà chargée pour l'onglet Effectif — pas un nouveau chemin de lecture, pas de table `convocation_attendees`) ; (b) **l'auto-vote n'est pas permis** — la propre ligne de la votante est retirée de la liste (même filtre d'identité que `others` sur l'onglet Effectif) et refusée en base (`votes_no_self_vote`, `supabase/migrations/20260916180308_votes_no_self_vote.sql`) et dans `CastVoteUseCase` (`ForbiddenError`). Reste ouvert : **(c)** les maquettes montrent des listes de longueurs différentes selon la catégorie (4 noms vs 3) alors que le dénombrement annonce 14 joueuses — troncature de rendu ou deux ensembles distincts, non résolu | **Développeuse** (a, b tranchés) ; (c) Développeuse + Bureau | **Non pour (a)/(b) — résolus.** (c) reste sans effet bloquant, l'affichage suit simplement la taille réelle de la liste retournée |
| **PO-PV-11** | **Durée de conservation des votes.** `docs/RETENTION_PURGE.md` §2 n'a **aucune catégorie** pour cette donnée (§3). Un vote pseudonyme à appréciation défavorable ne se range dans aucune des catégories existantes | Référent RGPD | Non pour la passe. **À trancher avant mise en production** |
| **PO-PV-12** | **Existe-t-il une modération ?** Annuler un vote manifestement abusif, retirer une candidate, fermer une catégorie par anticipation. Si oui, ce serait une **action sensible journalisée depuis le use case** (`ARCHITECTURE.md` §11) — et il n'existe **aucune table de journal d'audit** dans `supabase/migrations/`. Aucune modération construite dans cette passe | Bureau + référent RGPD | Non |
| **PO-PV-13** | **Deux incohérences internes aux maquettes**, à confirmer avant conception : (a) les **trois** exports portent le préfixe `[Coach]` alors que deux rendent la vue **joueuse** — le nom de fichier ne doit pas servir à déduire la variante de rôle (§0) ; (b) la **barre d'onglets diffère** d'un export à l'autre : « Infos / Convocations / Disposition / Stats / Votes / Me… » (export 1) vs « Infos / Compo / Effectif / Votes / Messagerie » (exports 2 et 3). Contrainte dure quelle que soit la réponse : correction #2 de `specs/match_details_page.md` maintenue, seuls **Infos**, **Effectif** et le nouvel onglet **Votes** subsistent (§6) | Développeuse + designer-agent | Non |
| **PO-PV-14** | **Trois onglets tiennent-ils sur un viewport mobile ?** `TabsList` porte aujourd'hui deux onglets ; l'export 1 montre une barre d'onglets **qui déborde et défile horizontalement** — un onglet partiellement coupé (« Me… ») est précisément ce que l'app mobile-only doit éviter. Choix de mise en page à faire par designer-agent, signalé ici parce qu'il découle directement de l'ajout d'un onglet | designer-agent | Non |

### Ce qui reste explicitement OPEN et ne doit pas être résolu implicitement

- **PO-PV-01 et PO-PV-02 sont désormais tranchés** (2026-09-16, décision développeuse) — voir le tableau ci-dessus. Ils ne figurent plus parmi les points bloquants.
- **La grille ASC Legacy** reste, elle, un point distinct et non résolu : ne pas anticiper un barème, une pondération ni une colonne « points » associée à un vote — même consigne que `specs/coach-attendance-confirmation.md` §5. PO-PV-01 autorise le **mécanisme de vote**, pas la grille elle-même.
- **La source de vérité des « convoquées requises »** (PO-6b de `specs/coach-dashboard.md`) : si l'ensemble des candidates en dépend (PO-PV-10a), c'est un **constat d'état**, pas une résolution. **Ne pas créer de table `convocation_attendees`, ne pas construire de snapshot d'effectif.**
- **La table de journal d'audit** : exigence transversale P0 non résolue, distincte de cette feature — ne pas la créer « en passant » à cette occasion.

## 6. Note pour designer-agent

- **Maquettes** : `docs/designs/player-vote/[v3] [Coach] Mob - player-vote-{1,2,3}.png`. Statut de registre **`instantané seul`** — **ne pas demander de lien artifact** (§0, §4 du registre). La ligne de registre est **pré-rédigée en §0**, à recopier dans `docs/designs/DESIGN_LINKS.md` §2 (l'agent PO ne peut pas écrire hors de `specs/`).
- **Ne pas se fier au préfixe `[Coach]` des noms de fichier** : les exports **2 et 3 rendent la vue joueuse** (bulletin), seul l'export **1** rend la consultation coach (PO-PV-13a).
- **Ce n'est pas un nouvel écran** : c'est un **troisième onglet** sur `ConvocationDetailPage`. Ne pas reconcevoir `BackHeader`, `ConvocationHero` ni la structure `Tabs` — ils existent en code. Le seul impact hors onglet est la **tenue de trois onglets sur un viewport mobile** (PO-PV-14) : l'export 1 montre une barre qui déborde et coupe un libellé, ce qui n'est pas acceptable tel quel.
- **Corrections obligatoires vs maquettes** (constats de cadrage, pas des choix à refaire) :
  1. **Onglets « Compo » / « Convocations » / « Disposition » / « Stats » / « Messagerie »** → supprimés entièrement, pas grisés. Correction #2 de `specs/match_details_page.md`, déjà appliquée en code et re-appliquée par `specs/coach-attendance-confirmation.md` §6. **Seuls Infos, Effectif et Votes subsistent.**
  2. **Bandeau « Votes anonymes »** → la formulation est à **reprendre**, pas à reproduire : le modèle garantit « non visible dans l'application », pas l'anonymat (§3, AC-PV-11). Ne pas rédiger la formulation définitive ici — elle passe par le référent RGPD.
  3. **Catégorie « carton rouge symbolique »** → **ne pas la concevoir comme acquise** (AC-PV-16, PO-PV-02). Concevoir l'onglet de façon à ce qu'il **fonctionne avec une seule catégorie** ; la seconde est une répétition du même motif, pas une mise en page distincte.
  4. **Aucun champ de commentaire, aucun export, aucune donnée de score** ne doit apparaître (AC-PV-14, AC-PV-17, AC-PV-18) — les maquettes sont déjà conformes, à ne pas « compléter ».
- **Deux variantes de rôle, pilotées par l'onglet de rôle actif existant** (§2) : `player` → bulletin ; `coach` → consultation seule, **contrôles absents, pas grisés**. **Ne pas dessiner de sélecteur de rôle propre à cet onglet** — `useActiveRole()` existe déjà et la bascule se fait au niveau tableau de bord (AC-PV-03).
- **États à couvrir, par catégorie** (les deux catégories sont indépendantes — AC-PV-07) : aucun vote émis (résultats masqués + bouton de validation inactif) ; vote enregistré (résultats + « changer mon vote ») ; vote en cours d'enregistrement ; échec d'enregistrement ; votes clos — **contrôles absents, pas grisés** (AC-PV-12) ; **aucun vote de personne** sur une catégorie (état vide explicite, jamais un classement de zéros — AC-PV-13) ; `RoleMismatchState` (inchangé, l'onglet Votes ne fait pas exception).
- **Liste de candidates générique** : ne pas prévoir d'état spécial pour la ligne de l'utilisatrice elle-même tant que PO-PV-10b n'est pas tranché. Prévoir en revanche une liste **potentiellement longue** (14 joueuses annoncées, 3 à 4 affichées sur les maquettes) — la mise en page doit tenir sans que le bouton de validation devienne inatteignable.
- **Coach vs joueuse : deux unités de restitution différentes** sur les maquettes — valeurs absolues côté coach (« 6 »), pourcentages côté joueuse (« 43 % »). Écart à **confirmer comme intentionnel** avec la développeuse plutôt qu'à reproduire mécaniquement ; contrainte dure dans les deux cas : l'écran ne consomme qu'un **agrégat**, jamais des lignes individuelles (AC-PV-10).
- **Cibles tactiles** : les lignes de candidate sont elles-mêmes des contrôles de sélection — ~44px minimum (`h-11`), vérifié sur un viewport mobile réel (AC-PV-19). Les pastilles rondes de sélection des maquettes sont petites : c'est **toute la ligne** qui doit être la cible, pas la seule pastille.
- **Couleur jamais seule porteuse de sens** (AC-PV-20) : sélection, barres de progression, et surtout la distinction catégorie positive (vert) / négative (rouge) — un rouge de « carton rouge » voisine dangereusement le rouge « absent » déjà employé ailleurs sur ce même écran.
- Rappel `CLAUDE.md` §9 : les prénoms et noms figurant sur les maquettes ne doivent apparaître **nulle part** dans le code, les tests ou la documentation.

## 7. Note pour mentor-agent

**PO-PV-01 est tranché (2026-09-16, décision développeuse)** : rattachement à ASC Legacy comme brique de collecte, implémentation autorisée dès maintenant. Ce qui suit peut donc être construit — reste toutefois exclu tout ce que la liste « Ne pas implémenter dans cette passe » énumère plus bas, notamment la grille de points Legacy elle-même (toujours « à valider par le Bureau avant développement », CDC §8) et la catégorie négative (PO-PV-02, rejetée).

- **Ordre de dépendance** : `actions.ts` (`'vote:cast'`) + `rbac-matrix.ts` + **branche `player` de `can.ts` étendue à la portée d'équipe** → migration (table + contrainte d'unicité + **agrégat sans colonne d'identité** + RLS) → `domain/entities/` + `domain/repositories/` → `data/` (DTO + mapper + Impl) → use cases → `presentation/`.
- **`can.ts` : ne pas ajouter l'action à la matrice sans étendre la branche `player`.** Sa condition actuelle est `action !== 'convocation:respond' || assignment.teamId === context.teamId` — une action nouvelle non nommée y passe **sans contrôle d'équipe**. **Troisième occurrence** du même motif dans ce dépôt (après `section-manager` puis `coach`) : appliquer la forme déjà retenue pour la branche `coach`, ne pas en réinventer une.
- **`AC-PV-10` est le critère structurant du modèle de données** : la protection du secret du vote se tient **en base** (agrégat qui n'expose pas la colonne d'identité), jamais au rendu. C'est la leçon directe de l'échec d'AC-MD-08 en recette — un test de composant vérifiant qu'un champ est masqué ne prouve rien. Mécanisme de référence déjà en place dans le dépôt : la vue `convocation_responders` (`docs/convocation_visibility_rls_correction.md` §2.1).
- **Upsert-on-conflict, pas insert-and-grow** (`CLAUDE.md` §6) : un vote est un état courant (« pour qui je vote »), pas un journal. Contrainte d'unicité sur `(convocation, catégorie, votante)`, AC-PV-04/AC-PV-05.
- **Deux notions de clôture coexistent sur cet écran** : `ConvocationStatus = 'closed'` (piloté par le **trigger** sur `attendance_records`) et la fermeture des votes (PO-PV-06). Ne pas les confondre ni les coupler sans arbitrage explicite.
- **Tests par ordre de priorité** (`CLAUDE.md` §8) : `can.test.ts` étendu à `'vote:cast'` **portée d'équipe incluse** → use case de vote → mapper. Le cas d'AC-PV-03 (compte joueuse-coach, bascule de rôle actif) doit être un test nommé.
- **Tests RLS contre la base, jamais contre le rendu** : AC-01/AC-02 et AC-PV-01/06/10 se vérifient par appel direct à l'API avec un jeton joueuse et un jeton coach. ⚠️ **PO-MD-10 reste ouvert** — le dépôt n'a toujours pas d'infrastructure pour obtenir une session Supabase authentifiée depuis un test Vitest, donc ces critères risquent de rester des `it.todo`. À signaler plutôt qu'à contourner.
- **Ne pas implémenter dans cette passe** : catégorie négative (AC-PV-16), lauréate persistée / ex æquo / palmarès (PO-PV-09), tout barème ou classement Legacy (AC-PV-15), modération (PO-PV-12), vote sur `training`/`meeting` (PO-PV-08), table de journal d'audit, table `convocation_attendees`, champ de commentaire (AC-PV-14), notification d'ouverture ou de clôture.

## UI design

### Sources utilisées, par ordre de priorité effectif

1. **`docs/designs/DESIGN_LINKS.md` §2** — aucune ligne pour `player-vote`. Statut de registre **`instantané seul`** (§0 du présent spec) : les trois PNG locaux tiennent lieu de référence, aucun lien artifact à demander. La ligne pré-rédigée en §0 est recopiée dans le registre par le présent agent (voir « Registre » ci-dessous) — même mécanique déjà appliquée pour `menu` et `actus`.
2. **`docs/designs/player-vote/[v3] [Coach] Mob - player-vote-{1,2,3}.png`**, lues directement. Contrairement à ce que suggère le préfixe `[Coach]` commun aux trois noms de fichier : l'export **1** rend la **consultation coach** (valeurs absolues, aucun contrôle de saisie, barre d'onglets à 6 entrées qui déborde et coupe un libellé) ; les exports **2** et **3** rendent la **même vue joueuse** (bulletin) à deux instants — 2 = avant vote (« Choisis une joueuse pour voter », bouton désactivé), 3 = après vote (pourcentages, « Vote enregistré », « Changer mon vote »). Confirmé §0.
3. **Maquettes déjà lues pour les écrans voisins**, pour la continuité visuelle plutôt que pour réinventer un langage : `docs/designs/player-match-details/[v3] [Joueur] Mob - Détail Match-selection_{1,3}.png` (hero + barre d'onglets actuelle à 5 entrées de l'écran hôte, onglet Effectif joueur) et `docs/designs/coach-attendance-confirmation/[v3] [Coach] Mob - Coach attendance confirmation.png` (badge tri-état Présent/Absent/En attente, `coach-green`/`coach-red`/gris — c'est ce badge qui motive la mise en garde couleur ci-dessous, pas une supposition).
4. **§6 du présent spec** (« Note pour designer-agent ») — autoritaire sur les corrections à appliquer, reproduites et appliquées ci-dessous, pas rediscutées.
5. **Code déjà construit, réutilisé sans le redessiner** : `presentation/features/convocation/{ConvocationDetailPage.tsx,components/{BackHeader,ConvocationHero,ResponderStatusBadge}.tsx}`, `presentation/shared/components/ui/{tabs,card,badge,button,avatar,separator}.tsx`, `presentation/styles/global.css` (tokens `--color-coach-green*`, `--color-coach-red*`, `--color-coach-amber`).
6. **`specs/coach-attendance-confirmation.md`, section « UI design »** — précédent le plus proche (jugement nominatif rendu sur une ligne d'effectif), mêmes conventions d'icônes (`@tabler/icons-react`), mêmes tailles de cible tactile (`size-11`), même vocabulaire d'état (« en vol » / « échec » par ligne).

### Emplacement dans la nav

Pas un nouvel écran : le **troisième onglet** de `ConvocationDetailPage` (`presentation/features/convocation/ConvocationDetailPage.tsx`), route plein écran déjà atteignable depuis Calendrier/Dashboard, hors barre de nav basse — patron déjà posé par `specs/match_details_page.md` et repris par `specs/coach-attendance-confirmation.md`, non redécidé ici. Les 4 écrans de nav fixes (Dashboard, Calendrier, Actus, Menu) ne changent pas ; cette feature ne leur ajoute rien, elle enrichit un onglet d'une route qui existe déjà. `BackHeader` et `ConvocationHero` ne sont pas retouchés.

### Barre d'onglets à trois entrées — résolution de PO-PV-14

L'export 1 montre 6 onglets (Infos / Convocations / Disposition / Stats / Votes / « Me… ») dans une barre qui déborde et défile horizontalement, avec un libellé coupé — c'est précisément le symptôme que l'app mobile-only doit éviter (`CLAUDE.md` §6). Ce n'est pas un compromis à transposer : le nombre d'onglets réels, une fois les corrections obligatoires du §6 appliquées, tombe à **trois** (Infos, Effectif, Votes), pas six.

**Décision** : `TabsList` garde la disposition déjà en code pour Infos/Effectif — `w-full`, `TabsTrigger` en largeur égale (`flex-1`, pas de défilement horizontal) — simplement étendue à un troisième segment. Trois libellés courts (« Infos », « Effectif », « Votes », 5 à 8 caractères) en largeur égale sur un viewport de 360 à 430 px tiennent sans troncature ni défilement ; c'est l'ajout d'onglets superflus (Compo, Disposition, Stats, Messagerie), pas le nombre d'onglets restants, qui causait le débordement de la maquette. Chaque `TabsTrigger` conserve une hauteur de cible tactile ≥ 44 px (`h-11` ou padding équivalent, pas le défaut compact de shadcn) — même règle que le reste de l'écran.

### Ce qui change par rôle

Reprend le §2 (RBAC) et la table du §2 « Règle retenue pour l'onglet Votes », rien de redéfini ici :

| Rôle actif | Rendu de l'onglet Votes |
|---|---|
| `player`, équipe correspondante | **Bulletin** : par catégorie, liste de candidates à choix unique + bouton de validation, puis résultats de la catégorie une fois votée (pourcentages) |
| `coach`, équipe correspondante | **Consultation seule** : résultats en valeurs absolues par catégorie, **aucun contrôle de saisie rendu** — pas de liste sélectionnable, pas de bouton, pas de lien « changer mon vote » |
| l'un ou l'autre, équipe non correspondante | `RoleMismatchState` (inchangé, composant existant), l'onglet Votes ne fait pas exception |
| Tout rôle sans `'vote:cast'` ni accès de consultation accordé (§2 : responsable de section, dirigeant habilité tant que PO-PV-04 n'est pas tranché, trésorier, référent médical, bénévole) | Onglet **absent de `TabsList`** — pas un onglet grisé, pas un onglet vide avec message d'erreur. Même règle que les cartes de menu (contrainte de rôle du présent agent) |
| Administrateur | Aucun point d'entrée UI construit dans cette passe, même motif que `specs/coach-attendance-confirmation.md` — pas d'écran admin équivalent tant qu'aucune décision explicite ne le demande |

Aucun nouveau sélecteur de rôle propre à cet onglet : la bascule bulletin/consultation suit `useActiveRole()` au niveau tableau de bord, déjà câblé sur cet écran (AC-PV-03).

### Composants réutilisés tels quels

- `BackHeader` (`sticky top-0`, fond opaque, `size-11`), `ConvocationHero`, structure `Tabs`/`TabsList`/`TabsTrigger` (étendue à trois entrées ci-dessus).
- `Card` shadcn comme conteneur de catégorie — même patron « carte compacte » que le reste de l'app (Effectif, convocations), pas un nouveau type de conteneur.
- `Avatar` shadcn pour l'initiale de chaque candidate en tête de ligne (même silhouette que `RosterRow` sur l'onglet Effectif).
- `Badge` pour les petits libellés d'état (« Vote enregistré », « Résultats masqués », « Votes clos ») — même composant que `ResponderStatusBadge`, pas un nouveau système de pastilles.
- `Button` avec la même surcharge de hauteur déjà établie ailleurs sur cet écran (`h-11`, pas le `h-8`/`size-8` par défaut de shadcn).
- Icônes `@tabler/icons-react`, cohérent avec `specs/coach-attendance-confirmation.md`.

### Nouveau composant à installer — sélection à choix unique

Aucun composant `radio-group` n'est encore vendu dans `presentation/shared/components/ui/` (seuls `checkbox`, `select`, etc. le sont). À ajouter via `npx shadcn add radio-group` (`CLAUDE.md` §2 — primitive shadcn, pas une réécriture main). Ce n'est pas un nouveau *pattern* visuel : c'est la brique manquante pour reproduire fidèlement le choix unique déjà montré sur les maquettes 2/3.

### Nouveau composant — `VoteCategoryCard` / `VoteCandidateRow`

Pas un écran, un composant répété une fois par catégorie active (une seule aujourd'hui — voir plus bas) à l'intérieur de l'onglet Votes.

**`VoteCategoryCard`** — une `Card` par catégorie, dans l'ordre où les maquettes les présentent :

1. **En-tête de catégorie** : icône + libellé en petites capitales (repris du style « HOMME DU MATCH » de la maquette, en petites capitales atténuées, pas en emoji) + un sous-titre optionnel court (« Un seul choix, définitif après clôture » côté joueuse). À droite, un `Badge` d'état contextuel (« Résultats masqués », « Vote enregistré », ou rien une fois clos — texte porté par le §"États" ci-dessous).
2. **Corps** : soit la liste de candidates (bulletin), soit la liste de résultats (agrégat), soit l'état vide — jamais les deux à la fois pour une même catégorie (voir table d'états).
3. **Pied de carte, joueuse seulement** : bouton « Valider mon vote » (désactivé tant qu'aucune candidate n'est cochée) ou lien « Changer mon vote », selon l'état.

**`VoteCandidateRow`** — une ligne par candidate, **cible tactile pleine largeur** (`h-11` minimum, mesuré sur viewport mobile réel — AC-PV-19) :

- Toute la ligne est le contrôle, pas la seule pastille ronde de la maquette : côté bulletin, la ligne entière est enveloppée dans un `<label>` associé au `RadioGroupItem` (clic n'importe où sur la ligne = sélection), avec la pastille radio visible en fin de ligne comme simple indicateur, pas comme seule zone cliquable.
- Contenu, de gauche à droite : `Avatar` (initiale), nom de la candidate (`min-w-0`, tronqué si besoin), puis en fin de ligne le contenu qui varie par état (pastille radio, ou barre de progression + valeur, ou rien en état clos sans résultat).
- **Sélection doublée par le texte, pas seulement la couleur** : la ligne sélectionnée porte un remplissage de fond distinct **et** une pastille radio remplie **et**, une fois les résultats visibles, un libellé « Ton choix » à côté du pourcentage — trois signaux, dont deux non colorés (AC-PV-20).

### Bandeau de confidentialité — reformulation, pas reproduction

La maquette affiche : *« Votes anonymes. Personne ne voit qui a voté quoi — ni les joueuses, ni le coach. Seuls les pourcentages sont publiés, une fois ton vote enregistré. »* Le §3 du présent spec établit que ce n'est pas un anonymat mais un **pseudonymat** (l'identité de la votante existe en base, pour la contrainte d'unicité et « changer mon vote » — AC-PV-06). Le présent agent ne rédige pas la formulation finale (elle passe par le référent RGPD, AC-PV-11) mais ajuste la conception pour qu'elle **cesse de surpromettre** :

- Le mot « anonyme(s) » **disparaît du gros titre du bandeau**. Le titre porté en gras devient une formulation du type « Vote non visible dans l'appli » (exemple de calibrage, pas un texte final).
- Le corps du texte est recentré sur ce qui est réellement vrai côté rendu : « personne ne voit ton choix à l'écran, ni les joueuses, ni le coach » (vrai), sans reprendre la promesse implicite d'absence totale de traçabilité en base.
- Même position dans la mise en page (bandeau unique en tête de l'onglet Votes, au-dessus des deux catégories — pas un bandeau par catégorie, la promesse s'applique uniformément).
- Icône reprise du même esprit que la maquette (pochette/porte-documents) mais un pictogramme signifiant « non affiché » (ex. œil barré) plutôt qu'un pictogramme de type bouclier/cadenas qui évoquerait une garantie de sécurité plus forte que ce qui est tenu.
- **Ce texte reste un espace réservé** : la version définitive est un livrable du référent RGPD (AC-PV-11), pas de cette passe de design.

### Catégorie positive seule en v1 — la négative n'est pas dessinée comme acquise

Conformément à AC-PV-16 et PO-PV-02, l'onglet est conçu pour fonctionner avec **une seule** `VoteCategoryCard` (la catégorie positive). La catégorie négative, si elle est un jour validée par le Bureau et le référent RGPD, est une **répétition du même composant** (`VoteCategoryCard` une deuxième fois), pas une mise en page distincte — aucun layout spécifique n'est prévu pour elle au-delà de ce que `VoteCategoryCard` couvre déjà. Rien dans cette section ne suppose son retour.

### Libellé de catégorie — PO-PV-03, tranché depuis (voir §5)

Les maquettes se contredisent (« HOMME DU MATCH » export 1, « JOUEUSE DU MATCH » exports 2 et 3). Cette section retenait **« JOUEUSE DU MATCH »** comme libellé de travail, pour deux raisons observables sur les maquettes elles-mêmes plutôt que par préférence : (a) c'est la forme utilisée sur les deux exports qui rendent effectivement la vue joueuse, l'export 1 étant la vue coach ; (b) tout le reste du texte de l'écran est déjà au féminin (« Choisis une joueuse pour voter », « 11 votes sur 14 joueuses », « CONVOQUÉE »), cohérent avec un effectif féminin (adversaire « Caribbean Girlz »). **PO-PV-03 est désormais tranché (§5, 2026-09-16)** sur cette même base : `vote_categories.label = 'Joueuse du match'`.

### Couleur de catégorie — écart déliberé vs la maquette

La maquette utilise un carré rouge plein pour « CARTON ROUGE SYMBOLIQUE ». Le badge tri-état déjà en code pour l'onglet Effectif (`ResponderStatusBadge`, branche coach) utilise `coach-red` pour « Absent » — **sur ce même écran**, à un onglet de distance. Reprendre du rouge pour la catégorie négative créerait une collision sémantique directe : un coach basculant d'Effectif à Votes lirait deux rouges différents (« absente au match » vs « pire comportement ») sans que cette distinction soit portée par autre chose que la teinte.

**Décision** : la catégorie négative (si elle revient un jour) utilise `coach-amber` — déjà présent dans `presentation/styles/global.css` et déjà utilisé sur cet écran pour un signal « affirmatif, ni vert ni rouge » (badge « A répondu » de l'onglet Effectif, branche binaire de `ResponderStatusBadge`) — plutôt que `coach-red`, pour l'icône d'en-tête, la barre de progression et la couleur d'accent. Le libellé textuel « CARTON ROUGE SYMBOLIQUE » reste inchangé (le mot « rouge » fait partie du nom du dispositif, pas de sa restitution visuelle) — c'est un choix de rendu, pas de contenu. La catégorie positive garde `coach-green`, déjà la couleur « affirmatif » établie ailleurs sur cet écran (`ResponseBar`, `present`). Ce choix de couleur est **à confirmer avec la développeuse** avant implémentation de la catégorie négative — non bloquant puisque cette catégorie n'est pas construite dans cette passe (AC-PV-16).

### États à couvrir, par catégorie (indépendants — AC-PV-07)

| État | Rôle | Rendu |
|---|---|---|
| Aucun vote émis par la votante | player | Liste de candidates à choix unique (pastille vide), bouton « Valider mon vote » désactivé + texte d'aide « Choisis une joueuse pour voter » ; aucun résultat, `Badge` « Résultats masqués » dans l'en-tête |
| Vote en cours d'enregistrement | player | Bouton « Valider mon vote » en état chargement (spinner + libellé inchangé ou « Enregistrement… »), liste désactivée le temps de la requête — même sémantique que le bouton de soumission déjà utilisé ailleurs sur l'app, pas un nouveau pattern |
| Échec d'enregistrement | player | Message d'erreur inline court sous la liste (« Le vote n'a pas pu être enregistré, réessaie »), sélection conservée, bouton réactivé — même micro-pattern que `specs/coach-attendance-confirmation.md` § « État d'écriture en cours / échouée » |
| Vote enregistré | player | Résultats en pourcentages + barre par candidate, `Badge` « Vote enregistré », dénombrement (« 11 votes sur 14 joueuses · aucun nom associé »), lien « Changer mon vote ». La ligne précédemment choisie porte le triple signal décrit plus haut |
| « Changer mon vote » activé | player | La carte repasse en mode sélection (liste à choix unique), la candidate précédemment votée pré-cochée, résultats masqués le temps de l'édition, bouton « Valider mon vote » réapparaît — pas de nouvelle page, bascule locale à la carte |
| Votes clos | player et coach | **Aucun contrôle de saisie rendu** — pas de pastille radio, pas de bouton, pas de lien « Changer mon vote » (absence, pas désactivation — AC-PV-12). Résultats affichés tels quels si des votes existent |
| Consultation | coach | Résultats en valeurs absolues + barre par candidate, aucun `Badge` d'état de vote personnel (le coach n'a pas de vote), aucun contrôle |
| Catégorie sans aucun vote (« 0 votes sur N ») | player et coach | **État vide explicite** : bloc centré (icône + texte, ex. « Aucun vote enregistré pour cette catégorie »), jamais la liste de candidates avec des barres à 0 % / 0 présentée comme un classement (AC-PV-13) |
| Rôle actif ne correspondant pas à la convocation | player et coach | `RoleMismatchState` (composant existant), inchangé |

### Longueur de liste et cible tactile

Jusqu'à ~14 candidates par catégorie (maquettes en montrent 3-4, dénombrement en annonce 14 — PO-PV-10c non tranché sur l'écart). Pas de sous-défilement interne à la carte : la liste s'étend en flux normal et c'est la page entière qui défile (sous le `BackHeader` `sticky top-0`), pas une zone scrollable imbriquée. Le bouton « Valider mon vote » est **inline, juste après la liste** de sa catégorie — pas en barre collée au bas d'écran — pour éviter que deux barres collantes (une par catégorie, si la seconde catégorie revient) ne se superposent ou masquent l'une des deux. Reachability garantie par le simple défilement de page, pas par un mécanisme supplémentaire.

Chaque `VoteCandidateRow` : hauteur ≥ 44 px, vérifiée sur un viewport mobile réel, pas seulement une fenêtre desktop redimensionnée (AC-PV-19, `CLAUDE.md` §6). Aucune ligne n'a de traitement spécial pour la candidate = utilisatrice elle-même (PO-PV-10b non tranché) — liste strictement générique, dans l'ordre déjà retenu par l'API (aucun tri ni mise en avant côté design).

### Coach = valeurs absolues, joueuse = pourcentages — confirmé comme intentionnel, pas reproduit mécaniquement

Les maquettes divergent sur l'unité (export 1 : « 6 », « 4 », « 2 », « 0 » ; exports 2/3 : « 43 % », « 29 % », « 21 % », « 7 % »). Cette section retient l'écart tel quel — un coach suit un effectif dont il connaît la taille et lit un décompte plus directement utile, une joueuse compare des proportions sans connaître nécessairement le total avant le dénombrement affiché — mais le signale explicitement pour confirmation avec la développeuse plutôt que de le reproduire sans le nommer. Contrainte dure identique dans les deux cas, non négociable : l'écran ne consomme jamais qu'un **agrégat** (décompte ou pourcentage par candidate) — aucune ligne de vote individuelle, aucune affordance « voir qui a voté pour X » n'est dessinée nulle part dans cette section (AC-PV-10).

### Ce que cette section ne dessine pas

Aucun champ de commentaire, aucun bouton d'export/partage/capture, aucune donnée de score, aucun indicateur ASC Legacy (points, badge, classement), même statique — les maquettes en sont déjà dépourvues et rien n'est ajouté (AC-PV-14, AC-PV-15, AC-PV-17, AC-PV-18).

### Registre `DESIGN_LINKS.md`

La ligne pré-rédigée par l'agent PO en §0 du présent spec a été recopiée telle quelle dans `docs/designs/DESIGN_LINKS.md` §2, avec sa note explicative, à la suite de la ligne `actus` — même mécanique déjà appliquée à cette occasion (l'agent PO ne peut écrire que dans `specs/`).

### Questions ouvertes UI

Aucune n'est bloquante pour la transmission à mentor-agent au niveau conception ; les blocages réels (PO-PV-01, PO-PV-02) sont des blocages d'implémentation déjà signalés au §5 et au §7, pas des blocages de design.

1. ~~Libellé définitif de la catégorie positive (PO-PV-03)~~ — **tranché** (§5, 2026-09-16) : « Joueuse du match ».
2. **Couleur `coach-amber` pour la catégorie négative** — proposée ci-dessus pour éviter la collision avec `coach-red` (« Absent », onglet Effectif du même écran), à confirmer avec la développeuse ; sans objet tant que la catégorie négative n'est pas construite (AC-PV-16).
3. **Formulation finale du bandeau de confidentialité** (AC-PV-11) — le texte proposé ici est un calibrage, pas un livrable ; validation par le référent RGPD requise avant mise en production.
4. **Écart de longueur de liste (3-4 candidates affichées vs 14 annoncées)** — hérité de PO-PV-10c, non résolu par le design : la mise en page décrite ci-dessus tient dans les deux cas (pas de sous-défilement, bouton inline), donc pas bloquant pour le design, mais la donnée réelle (effectif, convoquées ou présentes constatées) reste à trancher par ailleurs.

**Prêt pour transmission à mentor-agent : oui**, sous réserve des 4 points ci-dessus (aucun bloquant) et des deux points explicitement hors passe de design (PO-PV-01, PO-PV-02, rappelés au §7).
