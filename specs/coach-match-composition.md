# Spec — Composition d'équipe d'un match (onglet « Composition » du détail de convocation)

> Statut : **amendée le 2026-10-01 après décisions développeuse.** PO-MC-01, PO-MC-04, PO-MC-05, PO-MC-08 et PO-MC-09 sont **tranchés** (§6). PO-MC-02 n'a pas reçu de réponse : il est consigné comme **hypothèse non bloquante à confirmer**, de même que le repli « aucun RDV renseigné » (PO-MC-12). **Aucun point ouvert n'est bloquant.** Les références sont conservées (non renumérotées).
> Demande d'origine (cadrage, reformulée) : un coach doit pouvoir afficher la composition (lineup) du match sur l'écran de détail du match. La composition ne devient visible qu'à partir de l'heure du rendez-vous (RDV). **Tranché le 2026-10-01** : c'est l'heure du RDV qui fait foi (§3).
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0/P1/P2 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles, moindre privilège), `specs/match_details_page.md` (écran hôte : §2, §3 « recomposition », correction n°2 « onglet Compo supprimé faute de support de domaine », §5 « convoqués requis »), `specs/edit-match-details.md` (patron d'action coach scopée équipe, `'match_details:update'`, PO-EM-02), `specs/match-stats.md` (§1 : rattachement d'une donnée de match sans module CDC dédié), `specs/player-vote.md` (§1 : réouverture d'un onglet supprimé de l'écran hôte), `specs/create-convocation.md` (§2 « Destinataires », PO-6b), `specs/coach-attendance-confirmation.md`, `specs/section-and-teams.md` (PO-ST-02, types de section), `specs/web-audit-logs.md`.
> Maquettes : `docs/designs/coach-match-details/composition/[v3] [Coach] Mob - Détail Match- composition - {1..8}.png` (**lues directement**) + `docs/designs/player-match-details/[v3] [Joueur] Mob - Détail Match-selection_2.png` (onglet « Compo » côté joueur, déjà versionné ; son texte d'attente est **remplacé** par décision, §3). Voir §0.
> État du code lu pour cadrer : `domain/entities/{match-details,user,section,team}.ts`, `domain/policies/{rbac-matrix,response-deadline,match-result-timing-rules,audit-actions}.ts`, `presentation/features/convocation/ConvocationDetailPage.tsx`. **Recherche faite dans `supabase/migrations/`, `src/domain/` et `src/data/` : aucune table, entité, dépôt ni politique de composition, de formation ou de numéro de maillot n'existe.**

## 0. Registre des maquettes (`docs/designs/DESIGN_LINKS.md`)

Le §2 du registre **n'a aucune ligne pour `coach-match-composition`**. Huit exports PNG sont en revanche présents localement (`docs/designs/coach-match-details/composition/`, non commités au moment de la rédaction, `git status` les rend en `??`), importés par la développeuse sans lien artifact. C'est le cas de figure `instantané seul` : conformément au §4 du registre, **aucun lien artifact n'est demandé**, ni maintenant ni lors d'une passe ultérieure.

L'agent PO n'écrit que dans `specs/`. La ligne est donc **pré-rédigée ici, à recopier telle quelle** dans le §2 du registre, même procédé que `specs/player-vote.md` §0 :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| coach-match-composition — **vue coach : consultation et édition de la composition d'un match** (`[v3] [Coach] Mob - Détail Match- composition - {1..8}`) | — aucun lien fourni | 2026-10-01 | `docs/designs/coach-match-details/composition/[v3] [Coach] Mob - Détail Match- composition - {1..8}.png` | **instantané seul** |

Note à joindre à la ligne :
- **Les huit exports ne sont pas huit écrans mais un onglet et ses états.** Export 2 : lecture, avec « Modifier la compo ». Exports 5 à 8 : mode édition avec sélecteur de formation (4-3-3 / 4-4-2 / 3-5-2 / 4-2-3-1) et bouton « Terminé ». Export 4 : joueur sélectionné, avec « Changer de position » / « Remplacer ». Export 3 : « Remplacer » déplié, liste « Choisir un remplaçant disponible ». Export 1 : « Changer de position » actif, « Touchez un autre joueur pour échanger les positions ».
- **Aucun export coach ne montre** : l'état « aucune composition encore saisie », une liste de remplaçants désignés (banc) en lecture, ni un sport autre que le football à 11. Aucun état d'attente côté coach n'est nécessaire (hypothèse PO-MC-02 : le coach voit toujours la composition).
- **L'état d'attente côté joueur existe**, dans un autre export déjà versionné : `player-match-details/…selection_2.png`, onglet « Compo ». Son texte (« La compo est publiée par le coach 1h avant le coup d'envoi ») est **remplacé** par la décision PO-MC-01 (§3). Les libellés d'onglet des maquettes (« Compo », « Disposition ») sont remplacés par « Composition » (PO-MC-08).
- Les noms de personnes visibles sur les exports ne doivent apparaître ni dans le code, ni dans les tests, ni dans la documentation (`CLAUDE.md` §9).

## 1. Périmètre

Le **coach de l'équipe** compose l'équipe de départ d'un match : il choisit une **formation** et place des **joueurs convoqués** sur les postes correspondants. La composition est consultable sur l'écran de détail de la convocation, dans un **nouvel onglet « Composition »**, réservé aux matchs des équipes de **football**. Pour les joueurs, elle n'est visible **qu'à partir de l'heure du RDV** (§3).

Ce n'est **pas un nouvel écran** : c'est un onglet supplémentaire de `ConvocationDetailPage` (`specs/match_details_page.md`), à côté d'Infos / Effectif / Votes / Résultat.

### Rattachement CDC — constat, pas résolution (PO-MC-03)

⚠️ **Le CDC ne mentionne nulle part la composition d'équipe.** Aucun module, aucune ligne de matrice ne la couvre. Même situation que `specs/match-stats.md` §1 et `specs/player-vote.md` §1.

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Calendrier et convocations | **P0** | Une donnée attachée à une convocation `type === 'match'`, comme `match_details`. Rattachement **technique**, pas une lecture du CDC |
| Présences et suivi sportif | **P0** | Le coach agit sur « l'effectif de son équipe » (`roles-personas-as-caribbean.md`, ligne Coach/Staff). La composition reste une **troisième donnée distincte** des réponses déclarées et des présences constatées (voir plus bas) |

### ⚠️ Cette feature réintroduit un onglet que l'écran hôte avait supprimé

`specs/match_details_page.md`, « Corrections obligatoires vs maquette », point 2, a supprimé l'onglet « Compo » au motif : « pas de composition/lineup modélisée ». Le constat reste vrai aujourd'hui (aucune table, aucune entité). Ce qui change, c'est une demande produit explicite, avec des maquettes. Cette spec **rouvre la décision**, comme `specs/player-vote.md` l'a fait pour « Votes ». L'amendement documentaire de l'écran hôte est à porter (PO-MC-11).

### Contenu retenu

1. **Onglet « Composition »** (libellé tranché, PO-MC-08). Il est rendu **uniquement** si deux conditions sont réunies :
   - `convocation.type === 'match'` ;
   - la section de l'équipe de la convocation est de type `football` (PO-MC-09).

   Dans tous les autres cas, il est absent, pas désactivé.
2. **Lecture** (export 2) : en-tête avec la formation retenue, terrain avec les joueurs placés sur les postes de la formation. Chaque jeton porte un numéro et un nom (sens du numéro : PO-MC-07).
3. **Entrée en édition** : bouton « Modifier la compo », coach autorisé uniquement, **sans limite de temps** (§2, PO-MC-05).
4. **Mode édition** (exports 1, 3 à 8) :
   - choix de la formation parmi **quatre préréglages** : 4-3-3, 4-4-2, 3-5-2, 4-2-3-1 ;
   - sélection d'un joueur sur le terrain, puis **« Changer de position »** (toucher un second joueur échange leurs postes) ou **« Remplacer »** (choisir un joueur **convoqué** hors terrain, qui prend le poste) ;
   - **« Terminé »** quitte le mode édition et enregistre.
5. **Vue joueur, lecture seule** : avant l'heure du RDV, un état d'attente clair indique l'heure à laquelle la composition sera disponible (§3). Ensuite, la composition s'affiche **automatiquement**, sans action de publication du coach (hypothèse PO-MC-02).

### Vivier sélectionnable — les joueurs convoqués (PO-MC-04, tranché)

Seuls les **joueurs convoqués** au match peuvent être placés. Constat à ne pas perdre : une convocation vise **toujours l'équipe entière** (`specs/create-convocation.md` §2 « Destinataires »). Il n'existe **aucune liste de convoqués par convocation**. « Convoqués » désigne donc aujourd'hui l'**effectif convoqué dérivé**, déjà utilisé par l'onglet Effectif : les membres de l'équipe avec `role = 'player'` (sémantique de `convocation_responders`, `specs/match_details_page.md` PO-MD-09(c)). Le coach n'en fait **jamais** partie.

- La règle doit lire **cette même source dérivée**, pas une seconde définition. Le jour où une liste de convoqués par convocation existera (PO-6b), le vivier suivra sans changement de règle.
- **Ne pas créer de table `convocation_attendees` par anticipation**, ni de snapshot d'effectif.
- La décision ne dit pas si un convoqué ayant répondu « absent » reste sélectionnable : PO-MC-13, non bloquant.

### Une troisième donnée, à ne fusionner avec aucune autre

`CLAUDE.md` §6 garde séparées `ConvocationResponse` (intention déclarée par le joueur) et `AttendanceRecord` (fait constaté par le coach). La composition est un **troisième fait** : le **choix du coach** de qui débute et à quel poste. Elle ne se déduit d'aucune des deux autres et n'écrit dans aucune des deux (AC-MC-12). Comme ces deux tables, c'est un **état courant** : on applique le patron **upsert-on-conflict, dernière valeur gagne**, sans historique qui grossit.

### Ce qui doit exister et n'existe pas

Rien n'existe aujourd'hui. Il faudra au minimum persister, pour une convocation de match :
- la formation retenue ;
- pour chaque poste occupé, le joueur qui l'occupe.

Trois invariants sont **tenus par la base**, pas seulement par l'interface :
- un joueur occupe **au plus un poste** ;
- un poste porte **au plus un joueur** ;
- un joueur placé appartient à l'**effectif convoqué** du match (PO-MC-04).

La forme des tables, leurs noms et le DTO relèvent de l'implémentation. Cette spec n'écrit pas de SQL (`CLAUDE.md` §7).

### Hors périmètre — explicitement

- **Les remplacements en cours de match**, les minutes jouées, les entrées/sorties. Ce sont des données de résultat (`specs/match-stats.md`). Le fait que le coach puisse **modifier la composition après le match** (PO-MC-05) ne la transforme pas en feuille de match.
- **Un banc de remplaçants désigné** affiché en lecture : aucune maquette n'en montre (PO-MC-06).
- **Le placement libre** d'un joueur n'importe où sur le terrain, et toute formation hors des quatre préréglages.
- **Les sections autres que football** (`esport`, `echecs`, `domino`) : tranché, PO-MC-09.
- **Une action « Publier »** ou un état brouillon : la visibilité est automatique (hypothèse PO-MC-02).
- **Toute notification** aux joueurs à l'ouverture de la composition ou après une modification. Communication est **P1**.
- **Toute exclusion automatique** d'un joueur pour raison médicale ou d'aptitude (§4).
- **Les rôles Responsable de section, Dirigeant habilité, Administrateur** en écriture (§2, PO-MC-10).
- **Tout point, badge ou classement ASC Legacy** dérivé du fait d'être titulaire.
- **Export, partage, copie** de la composition.
- **Les onglets « Convocations », « Stats », « Messagerie »** visibles dans la barre d'onglets des maquettes : ils ne relèvent pas de cette feature.

## 2. RBAC

### Lignes de matrice applicables — aucune ne nomme la composition

| Ligne de matrice | Valeur | Pertinence |
|---|---|---|
| **Créer/modifier une convocation** | Joueur ❌ · Coach ✅ (son équipe) · Resp. section ✅ (sa section) · Dirigeant habilité ✅ · Trésorier ❌ · Référent médical ❌ · Bénévole ❌ · Admin ✅ | Ligne la plus proche pour l'**écriture** : la composition est un attribut d'un match convoqué. Elle sert de plafond. Cette passe la restreint davantage (ci-dessous) |
| **Consulter une convocation en mode dégradé** | ✅ pour les 8 rôles | Plafond de **lecture**. Le mode dégradé lui-même n'est pas implémenté (PO-5) |
| **Voir les dossiers des autres membres** | Joueur ❌ · Coach ❌ (son équipe, hors financier) · Resp. section ✅ (sa section) · Dirigeant habilité ✅ · Trésorier ❌ (financier seulement) · Référent médical ❌ (santé seulement, tracé) · Bénévole ❌ · Admin ✅ | La composition affiche **nom + poste** de coéquipiers. C'est la même classe d'exposition que l'effectif convoqué, déjà tranchée pour le joueur (`specs/match_details_page.md` §2 : la visibilité de l'effectif de sa propre équipe n'est pas assimilée à « voir le dossier ») |
| **Saisir une évaluation sportive** | Coach ✅ (son équipe) seul | **Non retenue.** Une composition est un choix tactique, pas une évaluation. Ne pas s'en servir pour justifier quoi que ce soit |

### Traduction par rôle pour cette passe

| Rôle | Écriture (`'match_lineup:write'`) | Lecture |
|---|---|---|
| Joueur/Joueuse | ❌ aucun contrôle rendu | ✅ son équipe, **à partir de l'heure du RDV** (§3) |
| **Coach/Staff** | ✅ **son équipe**, **sans limite de temps**, y compris après le match (PO-MC-05) | ✅ son équipe, **à tout moment**, sans fenêtre (hypothèse PO-MC-02) |
| Responsable de section | Accordé par la matrice, **non construit** (PO-MC-10) | Pas de chemin vers cet écran aujourd'hui (`useActiveRole` ne connaît que joueur/coach, question UI n°1 de `specs/match_details_page.md`) |
| Dirigeant habilité | Accordé par la matrice, **non construit** (PO-MC-10) | Idem |
| Trésorier | ❌ | ❌ |
| Référent médical | ❌ | ❌ |
| Bénévole | ❌ | ❌ |
| Administrateur | Accordé par la matrice, **non construit** (PO-MC-10) | Idem Resp. section |

### Action à ajouter — `'match_lineup:write'`: `['coach']`, scopée équipe

- **Écart restrictif assumé**, pas une lecture du CDC, exactement comme `'match_details:update'` (`specs/edit-match-details.md` §2). Trois motifs : (1) la demande nomme le coach ; (2) les autres rôles n'ont aucun chemin vers cet écran ; (3) moindre privilège.
- **Nomme la ressource écrite** (la composition), pas `'convocation:update'`, qui désigne `public.convocations` et existe déjà avec une autre surface de colonnes.
- **`can.ts`, branche `coach`** : ajouter l'action à `requiresTeamScope`. Sans cela, le bouton « Modifier la compo » serait rendu sur le match d'une autre équipe. La RLS refuserait l'écriture, mais la règle d'affichage (absent, jamais grisé) serait violée.
- **`can.ts`, branche `section-manager`** : pré-câbler l'action dans la condition de portée, dans le même changement. Précédent : `'match_details:update'`, `'role:assign'`.
- **Miroir RLS manuel** (`CLAUDE.md` §7) : politique(s) d'écriture sur la/les nouvelle(s) table(s), commentées du nom `match_lineup:write`, via `private.is_coach_of_team` sur l'équipe de la convocation parente.
  - **Aucun prédicat temporel** sur l'écriture (PO-MC-05). C'est la différence délibérée avec `match_details_update_arrangements`, qui porte `c.date > now()`. Ne pas le recopier « par symétrie ».
  - Le prédicat garde la condition `type = 'match'` et la condition « section football » (PO-MC-09). Une requête forgée sur un entraînement, une réunion ou une équipe non football est refusée par la base.
  - Elles reproduisent l'écart hérité du helper (pas de filtre de saison, `specs/edit-match-details.md` §6) sans le corriger ici.
- Le rendu reste conditionné à `activeRole === 'coach'`. C'est la limite déjà assumée pour un compte joueur et coach de la même équipe (`docs/DEFAULTS-A-CHALLENGER.md`).

### Lecture — RLS, plus une règle temporelle pure

La lecture ne prend **pas** d'entrée de matrice : l'onglet ne change pas de structure selon le rôle, seul son contenu diffère. En revanche, **l'heure d'ouverture côté joueur est une règle métier** que `presentation/` doit évaluer pour choisir entre l'état d'attente et la composition.
- Côté domaine : une **fonction pure dans `domain/policies/`**, avec `now` passé en paramètre (patron `isMatchResultRecordable`, `canPlayerRespond`). Elle prend l'heure du RDV, le coup d'envoi (pour le repli PO-MC-12) et `now`.
- Côté serveur : la règle est **doublée** par la politique `SELECT` de la branche joueur, qui compare `match_details.meeting_point_time` à `now()`. **Seule la base fait foi** (AC-MC-09).
- La branche coach de la politique `SELECT` ne porte **aucun** prédicat temporel (hypothèse PO-MC-02).

## 3. La fenêtre de visibilité — tranchée : l'heure du RDV (PO-MC-01)

### Règle

**La composition devient visible pour les joueurs à l'heure du RDV, `MatchDetails.meetingPointTime`** (décision développeuse, 2026-10-01, option b). Comparaison stricte, la borne se résolvant du côté « pas encore » (même sémantique que `isMatchResultRecordable`).

- **Repli si aucun RDV n'est renseigné** (`meetingPointTime` est nullable) : **hypothèse non confirmée, coup d'envoi − 1h** (PO-MC-12). C'est le texte de la maquette joueur d'origine, et l'instant où les réponses à un match se ferment (`response-deadline.ts`). À confirmer, non bloquant : la règle reste une seule fonction pure, et le repli s'y change en un point.
- **L'heure est relue à chaque évaluation**, jamais figée au moment de la composition. `meetingPointTime` est modifiable par le coach avant le coup d'envoi (`specs/edit-match-details.md`). Conséquence acceptée : un RDV déplacé plus tard après l'ouverture **masque à nouveau** la composition jusqu'à la nouvelle heure. Ce n'est pas un bug.
- **Conséquence connue de la règle retenue, consignée sans la rouvrir** : un RDV fixé avant coup d'envoi − 1h (cas courant) rend la composition visible **alors que les réponses sont encore ouvertes** (`response-deadline.ts`, coup d'envoi − 60 min). Un joueur peut lire qu'il ne débute pas, puis répondre « absent ». La décision l'accepte implicitement. Ce point est signalé, pas re-questionné.

### Message d'attente côté joueur

Avant l'ouverture, l'onglet rend un état d'attente **clair et bienveillant**, qui **donne l'heure** :
- avec RDV : « La composition sera disponible à l'heure du rendez-vous, à {HH:MM}. »
- repli sans RDV (PO-MC-12) : même ton, l'heure étant le coup d'envoi − 1h, sans mentionner un rendez-vous qui n'existe pas.

L'heure affichée est **calculée**, jamais un texte figé. Le texte de la maquette joueur (« publiée par le coach 1h avant le coup d'envoi ») est **abandonné**. La formulation exacte relève de designer-agent, dans ce cadre.

Côté écran, l'état bascule sans rechargement via le tic minute déjà présent dans `useConvocationDetailViewModel`.

### À qui la fenêtre s'applique — hypothèse (PO-MC-02, non répondu)

Retenue en attendant confirmation, **non bloquante** :
- la fenêtre ne concerne **que les joueurs** ;
- le coach voit et modifie la composition **à tout moment**. C'est cohérent avec « aucune limite d'édition » (PO-MC-05) et avec les huit exports coach, qui ne montrent aucun état d'attente ;
- la visibilité est **automatique** à l'heure d'ouverture, **sans action « Publier »**.

Si cette hypothèse était infirmée, l'impact serait limité : un état d'attente côté coach et/ou un état brouillon s'ajouteraient, et la politique `SELECT` coach recevrait un prédicat.

## 4. Données sensibles

### Données de santé — aucune stockée, un vecteur d'inférence à tenir fermé

- La composition ne porte **aucun champ santé, aptitude ou diagnostic**, et **aucun champ texte libre** (motif de non-sélection, note, commentaire). Ce sont les deux vecteurs déjà identifiés ailleurs (`ConvocationResponse.reason`, `AttendanceRecord.note`). Ne pas en ouvrir un troisième (AC-MC-15).
- ⚠️ **Inférence** : rendre la composition aux joueurs révèle qui **ne** débute **pas**. Tant que la composition reste un choix manuel du coach parmi les convoqués, rien ne permet d'en déduire une donnée médicale. **Si le vivier excluait un jour automatiquement les joueurs inaptes**, l'absence d'un joueur deviendrait un signal dérivé d'une donnée de santé, exposé à toute l'équipe. Cette exclusion n'est **pas** construite (§1). Elle relèverait du **référent RGPD**, toujours non désigné (`docs/GOUVERNANCE.md` §7).

### Données financières — aucune

### Données personnelles de tiers

Nom + poste d'un coéquipier, visibles par les joueurs de l'équipe une fois la fenêtre ouverte. Même classe que l'effectif convoqué (`specs/match_details_page.md` §3). Le nom doit être lu par un mécanisme étroit (deux colonnes, portée d'une convocation), **jamais par un élargissement de `users_select_own`**.

**Avant l'heure d'ouverture, la composition est absente de la forme même de la réponse API pour un jeton joueur**, pas seulement du rendu. C'est la leçon d'AC-MD-08 (AC-MC-09).

### Journal d'audit — non requis, réserve consignée

- Le CDC §11.3 ne liste pas cette action. **Aucune journalisation requise**, et aucune contrainte d'écriture voulue pour l'instant (décision PO-MC-05).
- La table `public.audit_log` existe (`specs/web-audit-logs.md`), mais aucun code d'action ne correspond à la composition. **Aucun ne doit être ajouté par anticipation.**
- ⚠️ **Réserve, pas une question ouverte** : l'édition étant illimitée, une composition **déjà vue par les joueurs**, voire après le match, peut être modifiée **sans trace**. C'est la même nature de problème que PO-EM-02 (`specs/edit-match-details.md`). La décision « pas de contraintes pour l'instant » l'écarte **pour cette passe**, elle ne la résout pas. Si PO-EM-02 était un jour tranché en faveur d'une trace (auteur/horodatage ou journal), la composition serait candidate au même traitement, **depuis le use case** (action métier, `CLAUDE.md` §6), jamais par trigger.

### Rétention — hors périmètre

Côté Supabase (`docs/RETENTION_PURGE.md`). `domain/` ne connaît pas l'expiration.

## 5. Critères d'acceptation

**AC-01** et **AC-02** sont ceux de la section 17.2 du CDC. Les critères propres à cette feature sont préfixés `AC-MC-`, même convention que `AC-MD-`, `AC-EM-`, `AC-PV-`. À renuméroter en recette.

| Réf. | Critère |
|---|---|
| **AC-01** | Aucune composition d'une équipe n'est accessible à un membre extérieur à cette équipe, ni à l'écran, ni dans la réponse API |
| **AC-02** | Un coach de l'équipe A qui tente de lire ou d'écrire la composition d'un match de l'équipe B est refusé **par la base**. Vérifié par appel direct à l'API, hors application |
| AC-MC-01 | L'onglet « Composition » est rendu **uniquement** pour une convocation `type === 'match'` d'une équipe dont la section est de type `football`. Il est absent, pas désactivé, pour un entraînement, une réunion, ou un match d'une section `esport` / `echecs` / `domino`. Une écriture forgée sur l'un de ces cas est refusée par la base |
| AC-MC-02 | En lecture, l'onglet affiche la formation retenue et chaque joueur placé à son poste, avec son nom. Les mêmes joueurs aux mêmes postes sont rendus après rechargement |
| AC-MC-03 | Le contrôle « Modifier la compo » est rendu **seulement** si le rôle actif est `coach` et `can(user, 'match_lineup:write', { teamId })` est vrai pour l'équipe de la convocation. Il est rendu **quel que soit le moment**, avant comme après le RDV et le coup d'envoi (PO-MC-05). Dans tous les autres cas, il est **absent**, jamais grisé |
| AC-MC-04 | En édition, la formation se choisit parmi exactement **4-3-3, 4-4-2, 3-5-2, 4-2-3-1**. Changer de formation **ne retire aucun joueur** de la composition |
| AC-MC-05 | « Changer de position » puis le toucher d'un second joueur du terrain **échange** les postes des deux joueurs. Aucun joueur n'apparaît deux fois, aucun poste ne se vide |
| AC-MC-06 | « Remplacer » propose **uniquement des joueurs convoqués** au match (effectif convoqué dérivé, §1) et hors terrain. Ni le coach, ni un membre d'une autre équipe, ni un non-joueur n'y figure. Le joueur choisi prend le poste, le joueur remplacé quitte le terrain |
| AC-MC-07 | Un joueur occupe **au plus un poste**, un poste porte **au plus un joueur**, et tout joueur placé appartient à l'effectif convoqué. Ces trois règles sont garanties **par la base**, pas seulement par l'interface. Une requête directe tentant un doublon ou un joueur non convoqué est refusée |
| AC-MC-08 | « Terminé » persiste la composition. Une seconde sauvegarde **remplace** l'état précédent (dernière valeur gagne) sans créer de lignes supplémentaires pour la même convocation |
| **AC-MC-09** | **Avant l'heure du RDV** (ou, sans RDV, avant le repli de PO-MC-12), **pour un jeton joueur, la réponse API ne contient aucune donnée de composition** (ni formation, ni joueur, ni poste). C'est vérifié **par appel direct à l'API**, jamais contre le rendu, sur le modèle d'AC-MD-08. La borne est évaluée avec l'horloge **du serveur**, sur la valeur **courante** de `meeting_point_time` |
| AC-MC-10 | Avant l'ouverture, un joueur voit un état d'attente qui indique **l'heure** d'ouverture : « disponible à l'heure du rendez-vous, à {HH:MM} » quand un RDV existe, ou une formulation sans rendez-vous dans le cas de repli. Une fois l'heure franchie, la composition s'affiche **sans rechargement manuel** (tic minute) et **sans action du coach** |
| AC-MC-11 | Côté joueur, la composition est **en lecture seule** : aucun contrôle d'édition, de sélection de joueur ou de choix de formation n'est rendu |
| AC-MC-12 | Écrire une composition **n'écrit jamais** dans `convocation_responses` ni dans `attendance_records`. Les réponses, les présences et l'agrégat de l'onglet Effectif sont inchangés avant et après |
| AC-MC-13 | Une écriture par un jeton joueur, par un coach d'une autre équipe, ou par tout rôle hors `'match_lineup:write'` est refusée **par la base** |
| AC-MC-14 | Un match sans composition enregistrée rend un **état vide explicite**, pour le coach (avec l'entrée vers l'édition) comme pour le joueur une fois la fenêtre ouverte. Jamais un terrain vide silencieux, une erreur ou un chargement infini |
| AC-MC-15 | Aucune donnée de santé, d'aptitude, de diagnostic, aucune donnée financière, et **aucun champ texte libre** (motif, note) n'est stocké, rendu ou renvoyé par l'API pour la composition |
| AC-MC-16 | Aucune donnée de résultat (remplacement en cours de match, minutes jouées, score) n'est saisie ni rendue dans cet onglet |
| AC-MC-17 | L'en-tête à flèche retour reste visible pendant le défilement (`sticky top-0`, fond opaque, AC-MD-20) |
| AC-MC-18 | Les contrôles interactifs ont une cible tactile d'au moins ~44px (`h-11`), vérifiée sur un viewport mobile réel : pastilles de formation, jetons joueurs sur le terrain, boutons « Modifier la compo », « Terminé », « Changer de position », « Remplacer », fermeture du panneau, lignes de remplaçant. Les boutons côte à côte portent `min-w-0` (`CLAUDE.md` §6) |
| AC-MC-19 | Contrastes AA et navigation clavier. Échange et remplacement sont réalisables **sans glisser-déposer**. Le joueur sélectionné et la formation active ne sont **jamais signalés par la seule couleur** (libellé textuel, ou `aria-pressed`/`aria-selected`) |
| AC-MC-20 | Aucun nom de personne figurant sur les maquettes n'apparaît dans le code, les tests ou la documentation (`CLAUDE.md` §9) |
| AC-MC-21 | Affichage complet de l'onglet en moins de 3 secondes sur mobile en réseau normal (CDC §12) |
| AC-MC-22 | Un coach de l'équipe peut enregistrer une composition **après le coup d'envoi** et **sur une convocation `closed`**. La base l'accepte (aucun prédicat temporel sur l'écriture, PO-MC-05) |
| AC-MC-23 | Un coach de l'équipe voit la composition **avant** l'heure du RDV (aucune fenêtre côté coach, hypothèse PO-MC-02), vérifié par appel direct à l'API avec un jeton coach |

## 6. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| ~~PO-MC-01~~ | ~~Quel instant ouvre la visibilité ?~~ **TRANCHÉ (2026-10-01, développeuse)** : option (b), **l'heure du RDV** (`meetingPointTime`), avec un message d'attente clair donnant l'heure (§3). Le repli sans RDV n'a pas été tranché → PO-MC-12 | — | — |
| **PO-MC-02** | **HYPOTHÈSE À CONFIRMER (non répondu).** Retenu en attendant : la fenêtre ne s'applique **qu'aux joueurs** ; le coach voit et modifie toujours ; la visibilité est **automatique** à l'heure du RDV, sans action « Publier » (§3). Si l'hypothèse est infirmée : ajout d'un état d'attente coach et/ou d'un état brouillon, et d'un prédicat sur la politique `SELECT` coach | Développeuse | **Non** — l'hypothèse est cohérente avec PO-MC-05 et avec les maquettes coach |
| **PO-MC-03** | **Rattachement CDC.** Aucun module ni ligne de matrice ne couvre la composition. Le rattachement à « Calendrier et convocations » / « Présences et suivi sportif » (P0) est technique (§1), même constat que PO-MS-08. Le Bureau confirme-t-il le P0, ou faut-il une ligne de matrice CDC dédiée ? | Bureau | Non |
| ~~PO-MC-04~~ | ~~Qui peut être placé ?~~ **TRANCHÉ (2026-10-01, développeuse)** : **uniquement les joueurs convoqués**. Lecture opérationnelle : l'effectif convoqué dérivé (§1), faute de liste par convocation (PO-6b reste ouvert). Sous-question restante → PO-MC-13 | — | — |
| ~~PO-MC-05~~ | ~~Jusqu'à quand le coach peut-il modifier ?~~ **TRANCHÉ (2026-10-01, développeuse)** : **sans limite de temps**, y compris après le match, aucune contrainte pour l'instant. Aucun prédicat temporel sur l'écriture (§2, AC-MC-22). Conséquence d'audit consignée en §4 comme réserve, pas comme question ouverte | — | — |
| **PO-MC-06** | **Des remplaçants désignés (banc) font-ils partie de la composition ?** Les maquettes montrent 11 titulaires et un vivier de « remplaçants disponibles » dans le flux « Remplacer », mais aucun banc en lecture. V1 = titulaires seulement, sauf décision contraire | Développeuse | Non |
| **PO-MC-07** | **Que représente le numéro des jetons (1 à 11) ?** Un numéro de maillot (aucun champ n'existe, ni sur `User` ni sur l'appartenance à une équipe) ou l'indice du poste dans la formation ? Un numéro de maillot serait une donnée nouvelle, hors de cette feature | Développeuse | Non. Traité comme indice de poste en attendant |
| ~~PO-MC-08~~ | ~~Libellé et place de l'onglet.~~ **TRANCHÉ (2026-10-01, développeuse)** : libellé **« Composition »**. Sa position dans la barre d'onglets relève de designer-agent | — | — |
| ~~PO-MC-09~~ | ~~Sport et format.~~ **TRANCHÉ (2026-10-01, développeuse)** : **football uniquement** (AC-MC-01). Résidu non bloquant : `Team` ne porte aucun format, et une équipe de football ne jouant pas à 11 (à 7/8, futsal) recevrait les mêmes formations à 11. À signaler si le cas existe au club | Développeuse + Bureau (résidu) | Non |
| **PO-MC-10** | **Élargissement de l'écriture** au Responsable de section, au Dirigeant habilité et à l'Administrateur, que la ligne « Créer/modifier une convocation » autorise. Même situation que PO-EM-01 : aucun chemin vers cet écran pour ces rôles aujourd'hui | Bureau + développeuse | Non pour cette passe |
| **PO-MC-11** | **Cohérence documentaire.** (a) `specs/match_details_page.md` correction n°2 (« Compo » supprimé faute de support de domaine) est rouverte par cette feature, à amender comme l'a été « Votes ». (b) La ligne de registre pré-rédigée en §0 est à recopier dans `docs/designs/DESIGN_LINKS.md`, et les 8 PNG à committer en même temps. (c) Une composition incomplète (moins de 11 joueurs) peut-elle être enregistrée ? | Développeuse | Non |
| **PO-MC-12** | **HYPOTHÈSE À CONFIRMER (non répondu) — repli si aucun RDV n'est renseigné.** Retenu en attendant : **coup d'envoi − 1h**, instant de clôture des réponses à un match et texte de la maquette joueur d'origine (§3). Isolé dans la fonction pure de visibilité et dans le prédicat RLS joueur | Développeuse | **Non** |
| **PO-MC-13** | **Un convoqué ayant répondu « absent » reste-t-il sélectionnable ?** Que devient un joueur déjà placé qui répond ensuite « absent » : retiré, signalé, laissé tel quel ? La décision PO-MC-04 vise les convoqués sans filtrer sur la réponse. En attendant, **aucun filtrage** sur `ConvocationResponse` (la composition ne se dérive pas des réponses, §1) | Développeuse | Non |

### Ce qui reste explicitement OPEN et ne doit pas être résolu implicitement

- PO-MC-02 et PO-MC-12 sont des **hypothèses**, pas des décisions. Elles sont implémentables telles quelles, mais à confirmer.
- La source de vérité des « convoqués requis » (PO-6b) : la composition s'appuie sur l'effectif dérivé, **elle ne la tranche pas**. Pas de table `convocation_attendees`.
- La traçabilité des modifications (§4, réserve liée à PO-EM-02) : écartée pour cette passe, non résolue.
- Aucune entrée de matrice ni action au-delà de `'match_lineup:write'`.

## 7. Note pour designer-agent

- **Maquettes** : les 8 exports coach (§0), plus `player-match-details/…selection_2.png` pour la silhouette de l'état d'attente joueur. Ne pas demander de lien artifact.
- **Décisions à intégrer** :
  - libellé d'onglet « Composition » ;
  - onglet réservé aux matchs des sections football ;
  - message d'attente joueur clair et bienveillant, avec **l'heure calculée** du RDV (variante sans RDV : PO-MC-12) ;
  - « Modifier la compo » toujours présent pour le coach autorisé, y compris après le match ;
  - « Remplacer » liste les **seuls convoqués**.
- **Pas d'état d'attente côté coach, pas d'état brouillon / « Publier »** (hypothèse PO-MC-02).
- **Patterns à réutiliser** : `BackHeader`, barre d'onglets de `ConvocationDetailPage`, `EmptyState`, `Badge`, bandeau d'information de l'onglet Résultat, pastilles de sélection de `create-convocation`.
- **États à couvrir** :
  - lecture ;
  - édition (formation, sélection, échange, remplacement) ;
  - aucune composition (coach, joueur) ;
  - attente joueur avant le RDV (avec / sans RDV) ;
  - aucun convoqué disponible dans « Remplacer » ;
  - échec de sauvegarde (message lisible, saisie non perdue).

**Prêt pour designer-agent : oui.** Aucun point bloquant. PO-MC-02 et PO-MC-12 sont des hypothèses non bloquantes à confirmer.

## UI design

> Mobile uniquement. Références lues : les 8 exports `docs/designs/coach-match-details/composition/[v3] [Coach] Mob - Détail Match- composition - {1..8}.png` (abrégés **C1..C8** ci-dessous), `docs/designs/player-match-details/[v3] [Joueur] Mob - Détail Match-selection_2.png` (**J2**), `ConvocationDetailPage.tsx`, `EmptyState.tsx`, `TypeSelector.tsx`, le bandeau d'information de l'onglet Résultat. Registre de maquettes : voir §0 (ligne à recopier, instantané seul).
> **Statut : complet. Aucun point bloquant.** Le point « Emplacement vide / première composition » a été **tranché par la développeuse** (voir §7). Cet état n'a **aucune maquette** : il est construit à partir de patterns existants (jeton, panneau d'action, liste de remplaçants).

### 1. Où ça vit

- **Nav** : aucun changement. L'écran de détail de convocation est déjà poussé hors `AppShell` (pas de `BottomNav`), il hérite de la nav existante. La feature ajoute **un onglet** dans la barre `TabsList` de `ConvocationDetailPage`, rien d'autre.
- **Libellé** : « Composition » (PO-MC-08). Les libellés « Compo » (J2) et « Disposition » (C1..C8) sont remplacés. L'en-tête de section devient « COMPOSITION — 4-3-3 ».
- **Condition de rendu** : `type === 'match'` ET section de l'équipe `football` (AC-MC-01). Sinon **absent**, jamais grisé. Le ViewModel doit donc exposer le type de section (aujourd'hui seul `sectionName` est exposé) ; l'écran ne fait que lire un booléen.
- **Place dans la barre** : **2e position**, juste après « Infos » (même ordre que J2 : Infos, Compo, Effectif), soit Infos / Composition / Effectif / Votes / Résultat. Décision de design, non bloquante (voir Q-UI-3).
- **Largeur de la barre** : à 5 entrées, la barre ne tient plus à 360 px avec le `gap-5` actuel (estimation ~395 px). Réponse : réduire l'écart (`gap-4`) **et** rendre la barre défilable horizontalement (`overflow-x-auto`, scrollbar masquée), l'onglet actif amené dans la vue. Les cibles restent `h-11`. C1..C8 montrent une barre défilable (6 entrées, un ascenseur gris est un artefact d'export à ne pas reproduire).
- **Contenu de l'onglet** : un `TabsContent value="composition"` avec les mêmes marges latérales que Résultat (`px-5.5`, `pt-4`, `pb-8`).

### 2. Ce qui change par rôle (RBAC §2, rien redéfini)

| Rôle actif | Vue | Contrôles |
|---|---|---|
| Coach, équipe de la convocation, `can(user, 'match_lineup:write', { teamId })` | Lecture à tout moment (aucun état d'attente, PO-MC-02), puis édition | « Modifier la compo » rendu à tout moment, y compris après le match (AC-MC-03, AC-MC-22) |
| Coach sans la permission | Impossible via le chemin actuel ; si ça arrivait, lecture seule | Bouton **absent** |
| Joueur / Joueuse | Attente avant l'heure du RDV, puis lecture seule | Aucun contrôle, aucun jeton interactif (AC-MC-11) |
| Autres rôles | Pas de chemin vers cet écran (§2) | — |

### 3. Composants

**Réutilisés tels quels** : `BackHeader` + bloc sticky existant (AC-MC-17, rien à changer) ; `Tabs/TabsList/TabsTrigger/TabsContent` ; `EmptyState` (icône + message centré) ; `Alert`/`AlertDescription` (variante destructive) ; `Button` ; `Skeleton` ; `InitialsAvatar` ; le bandeau d'info `rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[12.5px] text-white/60` de l'onglet Résultat.

**Nouveaux (4), tous des variations de patterns existants sauf le terrain** :

1. **`LineupPitch` (terrain)** — **source C2 (lecture), C1/C4 (sélection), C5..C8 (formations)**. Carte verte sombre à coins arrondis (`rounded-3xl`), avec un rectangle de surface intérieur, la ligne médiane et le rond central en traits clairs translucides. Proportion fixe (≈ 4/5, utilitaire `aspect-4/5`) pour que les jetons restent positionnés en pourcentage de la carte à toute largeur de téléphone. Les 11 postes sont placés par pourcentages selon la formation active (4-3-3, 4-4-2, 3-5-2, 4-2-3-1) : les coordonnées sont de la présentation, la définition des quatre préréglages est du domaine. Justification d'un composant nouveau : aucun terrain n'existe dans l'app ; le visuel vient intégralement des maquettes, rien n'est inventé.
2. **`PlayerToken` (jeton)** — pastille blanche ronde avec numéro (indice de poste, PO-MC-07) et nom en dessous, d'après C2. États : repos ; **sélectionné** (anneau vert épais, C1/C4) ; **inerte** (vue joueur, ni bouton ni focus). Le nom est tronqué avec ellipse (largeur max ~72 px) pour éviter les chevauchements en 3-5-2 (C6, jetons aux bords) et 4-4-2 (C7, nom sur la ligne médiane). **Cible tactile** : la pastille visible fait ~30 px dans les maquettes, **trop petite**. Le bouton (jeton + nom) doit offrir une zone d'au moins 44 × 44 px (`min-h-11 min-w-11`), la pastille visible restant plus petite à l'intérieur. En édition, `aria-pressed` + libellé accessible « {nom}, poste {n} » ; l'état sélectionné ne repose pas que sur la couleur (AC-MC-19) : le panneau d'action (ci-dessous) répète le nom et le numéro en texte.
3. **`FormationChips`** — **source C5..C8**, mêmes pastilles arrondies que `TypeSelector`/`TypePill` (sélection unique, actif en fond vert plein + texte blanc), 4 entrées. Sous un petit titre « FORMATION » (même style que le titre « TYPE » de `TypeSelector`). Maquettes : pastilles de ~28 px de haut, à porter à **`h-11`**. Quatre pastilles tiennent sur une ligne (~235 px) mais la rangée est `flex-wrap` par sécurité, chaque pastille `min-w-0`. Pastille active signalée par `aria-pressed` (ou `role="radio"`) en plus de la couleur. Changer de formation ne retire personne (AC-MC-04) : les joueurs gardent leur ordre et sont reprojetés sur les 11 postes (règle de reprojection à fixer à l'implémentation, c'est ce que montrent C5..C8 : mêmes 11 joueurs, postes redistribués).
4. **`PlayerActionPanel`** — **source C1, C3, C4**. Carte sombre arrondie placée **sous le terrain**, dans le flux (pas de bottom sheet : C1/C3/C4 la montrent en dessous). Apparaît uniquement quand un jeton est sélectionné. Contient : jeton + nom + bouton de fermeture « × » (`h-11 w-11`, `aria-label="Fermer"`) ; deux boutons côte à côte **« Changer de position »** et **« Remplacer »** (C4) ; selon l'action, le contenu change (voir §4). Les deux boutons côte à côte : `grid grid-cols-2 gap-2`, **chaque enfant `min-w-0`**, `h-11`, texte autorisé à passer sur 2 lignes plutôt que de déborder (« Changer de position » est le plus long libellé et ne doit pas pousser « Remplacer » hors de sa colonne à 360 px, CLAUDE.md §6). Au toucher d'un jeton, le panneau est amené dans la vue (`scrollIntoView`), car le bloc sticky du haut laisse peu de hauteur et le panneau est sous le terrain.

### 4. États et transitions

**Lecture, coach (C2)** — en-tête : « COMPOSITION — {formation} » à gauche, bouton « Modifier la compo » à droite (pastille sombre bordée, `h-11`, `min-w-0`, le titre se tronque avant le bouton). Dessous : le terrain. Jetons inertes (pas de sélection hors édition).

**Édition, repos (C5..C8)** — l'en-tête porte « Terminé » (vert plein, `h-11`) à la place de « Modifier la compo » ; dessous : `FormationChips`, bandeau d'aide « Touchez un joueur sur le terrain pour changer sa position ou le remplacer. », terrain, jetons interactifs.

**Joueur sélectionné (C4)** — anneau vert sur le jeton, `PlayerActionPanel` avec les deux boutons, formation modifiable. Retoucher le même jeton ou « × » désélectionne.

**Changer de position (C1)** — « Changer de position » devient actif (état visible non couleur seule + `aria-pressed`), le bandeau du haut passe à « Touchez un autre joueur pour échanger les positions. », le panneau répète ce texte en vert. Toucher un autre jeton **échange** les deux postes, désélectionne et ferme le panneau (AC-MC-05). Aucune manipulation par glisser-déposer (AC-MC-19).

**Remplacer (C3)** — « Remplacer » se déplie (`aria-expanded`) sous les deux boutons : libellé « Choisir un remplaçant disponible » puis une liste de lignes (avatar initiales + nom complet, `h-11` minimum, ligne entière cliquable, carte sombre bordée comme `PlayerPickerRow`). La liste = **convoqués hors terrain, joueurs uniquement** (AC-MC-06). Toucher une ligne remplace sur-le-champ (modification locale), ferme le panneau, le joueur remplacé revient dans le vivier. Si la liste est longue, elle défile dans le panneau (`max-h` + `overflow-y-auto`) plutôt que de rallonger toute la page. **Aucun convoqué disponible** : message dans le panneau « Aucun autre joueur convoqué n'est disponible. » (texte, pas de liste vide).

**Persistance** — les modifications sont gardées dans le ViewModel (pas dans l'état du composant, car Radix démonte l'onglet inactif) et **enregistrées au toucher de « Terminé »** (AC-MC-08). Pendant l'enregistrement, « Terminé » passe en « Enregistrement… » et est désactivé (désactivation d'une action en cours, pas une permission refusée : la règle « absent plutôt que grisé » vise les droits). **Échec** : `Alert` destructive sous l'en-tête (« Enregistrement impossible. Réessayez. »), le mode édition reste ouvert, **la saisie n'est pas perdue**, « Terminé » redevient actif. Sortie par la flèche retour avec modifications non enregistrées : `AlertDialog` « Abandonner les modifications ? » (Rester / Abandonner), `AlertDialog` déjà installé. Voir Q-UI-2.

**Chargement** — `Skeleton` en forme de terrain (même proportion que `LineupPitch`) sous un en-tête squelette ; jamais un terrain vide, jamais « Chargement… » nu (AC-MC-14, AC-MC-21).

**Erreur de lecture** — `Alert` destructive « Impossible de charger la composition. » + bouton « Réessayer » (`h-11`). Aucun terrain affiché.

**Aucune composition enregistrée (AC-MC-14)**
- Coach : `EmptyState` avec une icône de terrain/équipe et le message « Aucune composition pour ce match. », suivi du bouton « Composer l'équipe » (`h-11`, même style que « Modifier la compo ») qui entre en édition **sur la formation par défaut avec 11 postes vides** (voir §7).
- Joueur (fenêtre ouverte) : `EmptyState` « Le coach n'a pas encore composé l'équipe. », sans bouton.

**Attente côté joueur (AC-MC-10)** — silhouette de J2 (texte centré gris sur fond sombre, sous la barre d'onglets) mais **sans le spinner** : un spinner suggère un chargement en cours et un joueur pourrait attendre le résultat d'une requête. On réutilise le patron `EmptyState` + `IconHourglass` déjà utilisé par « Résultat pas encore disponible. ». Textes (heure **calculée**, jamais figée) :
- avec RDV : « La composition sera disponible à l'heure du rendez-vous, à {HH:MM}. »
- sans RDV (repli PO-MC-12, hypothèse) : « La composition sera disponible à {HH:MM}, une heure avant le coup d'envoi. » (ne parle pas de rendez-vous).
Bascule automatique vers la lecture au franchissement de l'heure (tic minute déjà présent), sans rechargement.

**Lecture, joueur** — même `LineupPitch` que C2, **sans** bouton d'en-tête, **sans** jetons interactifs, **sans** formation modifiable ni panneau d'action. En-tête « COMPOSITION — {formation} » seul. Aucun jeton n'est mis en évidence pour le joueur connecté (aucun support dans les maquettes).

### 5. Tableau de correspondance élément → maquette

| Élément | Maquette |
|---|---|
| Titre d'en-tête « COMPOSITION — {formation} », bouton « Modifier la compo » | C2 |
| Terrain, jetons, noms, numéros | C2 (base), C1/C4 (sélection), C5/C6/C7/C8 (positions par formation) |
| Pastilles de formation, « Terminé », titre « FORMATION » | C5 (4-2-3-1), C6 (3-5-2), C7 (4-4-2), C8 (4-3-3) |
| Bandeau d'aide du mode édition | C4..C8 (repos), C1 (échange) |
| Anneau de sélection + panneau d'action avec deux boutons | C4 |
| « Changer de position » actif + message d'échange | C1 |
| « Remplacer » déplié + liste des remplaçants disponibles | C3 |
| Attente joueur (silhouette) | J2, texte et icône remplacés |
| Lecture joueur | C2 sans contrôles |
| États vide, chargement, erreur, échec d'enregistrement, aucun remplaçant | **Aucune maquette** ; construits à partir de `EmptyState`, `Skeleton`, `Alert` existants (variations de patterns, pas de nouveau visuel) |
| Emplacement vide, première composition, effectif < 11 | **Aucune maquette** : jeton de C2 en variante « vide », panneau de C4/C3, liste de C3 (voir §7) |

### 6. Primitives shadcn

Déjà installées, à utiliser : `tabs`, `button`, `alert`, `skeleton`, `alert-dialog`, `avatar` (via `InitialsAvatar`), `card` (panneau d'action, lignes de remplaçants). Pour `FormationChips` : réutiliser le patron de pastille `TypePill` (existant) plutôt que d'installer un `toggle-group` ; si on préfère une vraie sémantique radio gratuite, `radio-group` est déjà installé. Rien à installer. Toutes les cibles tactiles sont surchargées à `h-11` à l'endroit d'usage (CLAUDE.md §6), y compris les pastilles de formation, « Modifier la compo », « Terminé », les deux boutons du panneau, « × », les lignes de remplaçants et les zones des jetons.

### 7. Emplacement vide et première composition — RÉSOLU (décision développeuse)

**Décision** : « Composer l'équipe » ouvre l'édition sur une **formation par défaut avec des postes vides** ; toucher un poste vide ouvre **le même sélecteur que « Remplacer »** (convoqués hors terrain uniquement). **Aucune maquette n'existe pour cet état** : il est composé de patterns existants, sans visuel nouveau hors la variante « vide » du jeton, ci-dessous. Si la développeuse veut un rendu de référence, un prototype Claude Design reste possible, mais rien ne le requiert.

- **Formation par défaut** : **4-3-3**, la première pastille de C5..C8 (choix de design, modifiable ensuite comme n'importe quelle formation). Aucun auto-remplissage : le coach place chaque joueur.
- **Jeton vide** (variante de `PlayerToken`, C2) : cercle à contour pointillé, fond transparent, icône « + » à la place du numéro, étiquette « Libre » à la place du nom. L'état « vide » n'est pas porté par la couleur seule (icône + texte, AC-MC-19). Libellé accessible « Poste {n} libre ». Zone tactile 44 × 44 px minimum, comme les autres jetons.
- **Toucher un poste vide** : il est sélectionné (même anneau vert), et le `PlayerActionPanel` s'ouvre en **mode « poste vide »** : titre « Poste {n} libre » + « × », **sans** les boutons « Changer de position » / « Remplacer » (rien à échanger ni à remplacer), directement la liste du libellé « Choisir un joueur disponible » (même composant de liste que C3 : avatar initiales + nom complet, lignes `h-11`, défilement interne). Toucher une ligne place le joueur sur ce poste, ferme le panneau.
- **Vivier** : identique à « Remplacer » : joueurs convoqués (effectif convoqué dérivé), hors terrain, jamais le coach (AC-MC-06). Aucun filtrage sur la réponse « absent » (PO-MC-13).
- **Joueur placé, poste vide disponible** : en « Changer de position », toucher un **poste vide** déplace le joueur sélectionné sur ce poste (son ancien poste devient vide). Extension naturelle de l'échange C1, non montrée par les maquettes (voir Q-UI-7).
- **Effectif convoqué de moins de 11 joueurs** : des postes restent vides, sans erreur ni blocage. Quand la liste est épuisée, toucher un poste vide affiche dans le panneau « Aucun autre joueur convoqué n'est disponible. » (même message que « Remplacer »).
- **Bandeau d'information** (patron du bandeau de l'onglet Résultat), affiché en édition et en lecture coach tant qu'il reste des postes vides : « Composition incomplète : {n} poste(s) à pourvoir. » Sinon, aide habituelle de C4..C8. Texte, pas seulement pastilles pointillées.
- **Changer de formation** avec des postes vides : les joueurs placés sont reprojetés comme en C5..C8 (AC-MC-04), les postes vides suivent ; personne n'est retiré.
- **« Terminé »** : enregistre la composition même incomplète (PO-MC-11c non tranché : comportement permissif retenu faute de décision contraire, voir Q-UI-8). Si **aucun** joueur n'est placé, « Terminé » quitte l'édition **sans enregistrer** et l'état « aucune composition » reste affiché (rien d'utile à persister).
- **Lecture après enregistrement incomplet** : coach, jetons vides non interactifs (pointillés + « Libre »). Joueur : les postes non pourvus sont dessinés en pointillés **sans** texte « Libre » ni « + » (ils ne portent aucune action ; pas de bandeau « incomplète » côté joueur).
- **Mobile** : même tailles tactiles que les autres jetons ; aucun nouvel élément côte à côte.

Primitives shadcn : aucune de plus (`button`, `card`, `avatar`, `skeleton` déjà listés).

### Questions UI non bloquantes

- **Q-UI-1 — Nom sur les jetons** : les maquettes affichent un nom court (nom de famille). `User` expose un nom d'affichage complet. Proposition : nom d'affichage tronqué avec ellipse sur le jeton, nom complet dans le panneau et la liste de remplaçants. À confirmer.
- **Q-UI-2 — Annuler** : les maquettes n'ont que « Terminé », sans « Annuler ». Proposition : pas de bouton, mais la garde `AlertDialog` à la sortie avec modifications non enregistrées. À confirmer.
- **Q-UI-3 — Position de l'onglet** : 2e (comme J2) ou à la fin (avant Résultat) ? Retenu : 2e.
- **Q-UI-4 — Date de l'attente** : le message demandé ne donne que l'heure. Si le joueur ouvre l'écran des jours avant le match, « à 14:30 » reste lisible car la date est dans l'en-tête et l'onglet Infos. Message conservé tel quel, sans date.
- **Q-UI-5 — Spinner de J2** : remplacé par un sablier (voir §4). À confirmer.
- **Q-UI-6 — Panneau d'action sous le terrain** : sur petit écran, « Terminé » (en haut) et le panneau (en bas) ne sont pas visibles en même temps ; retenu : `scrollIntoView` sur sélection, pas de second bloc sticky.
- **Q-UI-7 — Déplacer vers un poste vide** : en « Changer de position », toucher un poste vide déplace le joueur (extension de l'échange, non montrée en maquette). À confirmer.
- **Q-UI-8 — Composition incomplète** : « Terminé » enregistre une composition incomplète (PO-MC-11c toujours ouvert) ; zéro joueur placé = pas d'enregistrement. À confirmer.
- **Rappel PO-MC-06/07/09/13** : aucun banc affiché, numéro = indice de poste, football à 11 seulement, aucun filtrage sur la réponse « absent » dans « Remplacer ». Aucun nom de personne des maquettes ne doit être repris (AC-MC-20).
