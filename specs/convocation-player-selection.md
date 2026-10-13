# Spec — Sélection des joueurs convoqués et match Officiel / Amical

> Statut : **rédaction initiale du 2026-10-12** (product-owner-agent), à partir d'une demande de la développeuse. Aucun point ouvert ne bloque la transmission à designer-agent : les points de comportement encore non tranchés sont posés comme **hypothèses à confirmer** (même procédé que PO-MC-02). **Deux points bloquent la migration** (pas la conception) : PO-CPS-01 et PO-CPS-02, voir §6.
> **Cette spec REMPLACE deux décisions antérieures** (voir §1, « Décisions remplacées ») : `specs/create-convocation.md` §2 « Destinataires — pas de matérialisation » (ex-PO-CV-05) et `specs/coach-match-composition.md` PO-MC-04 (vivier = effectif dérivé). Elle tranche aussi la question transversale de la **source de vérité des « convoqués requis »**, jusqu'ici ouverte dans une dizaine de specs (renvoyée tantôt à PO-6b, à PO-MS-07, à PO-PS-10 ou à la §6.1 de `convocation-domain-correction.md`). La liste des documents à amender est en §7.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0, matrice RBAC ligne « Créer/modifier une convocation »), `docs/roles-personas-as-caribbean.md` (Coach/Staff : « effectif de son équipe… convocations »), `specs/create-convocation.md`, `specs/coach-match-composition.md`, `specs/match_details_page.md`, `specs/match-stats.md` (MS-06/MS-07, `competition_type`), `specs/coach-attendance-confirmation.md`, `specs/player-vote.md` (PO-PV-10a), `specs/match-details-missions.md`, `specs/web-create-convocation.md`, `docs/convocation_visibility_rls_correction.md`, `docs/ARCHITECTURE.md`.
> État du code lu pour cadrer : `presentation/features/convocation/{CreateConvocationForm.tsx, components/RecipientsCard.tsx}`, `domain/entities/{convocation,match-details}.ts`, `domain/policies/rbac-matrix.ts`, `domain/usecases/coach-dashboard/ListTeamConvocationsUseCase.ts`, `domain/usecases/convocation/UpdateConvocationUseCase.ts`, et les migrations : vue `convocation_responders` (`20260901120018`), `get_convocation_responders` (`20261007163409`), politiques `convocation_responses_*` (`20260811171754`), triggers/jobs de clôture (`20260811171817`, `20261003165056`), invariant de composition (`20261001075331`), préremplissage des numéros (`20261012125515`), `get_vote_tally` (`20260916171955`, `20261007172233`), `claim_mission` (`20261007163409`), `get_my_response_summary` (`20260928120000`), bloc STOP `competition_type` (`20260924100000`).

## 0. Maquettes (`docs/designs/DESIGN_LINKS.md`)

Le registre (§2) n'a **aucune ligne** ni pour `create-convocation` ni pour cette feature. Les exports locaux existent pourtant : `docs/designs/create-convocation/[v3] [Coach] Mob - Create convocation - match 1.png` est précisément l'état « Toute l'équipe » désactivé + liste de licenciés cochables que `specs/create-convocation.md` §1 avait reporté « à une passe ultérieure ». C'est cette passe. Cas `instantané seul` du §4 du registre : **aucun lien artifact n'est demandé**.

L'agent PO n'écrit que dans `specs/`. Ligne pré-rédigée, à recopier telle quelle dans le §2 du registre :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| create-convocation / convocation-player-selection — **formulaire de création coach (Match, Entraînement, Réunion), dont la liste de sélection des destinataires** (`[v3] [Coach] Mob - Create convocation - {match 1, match 2, training, meeting}`) | — aucun lien fourni | 2026-10-12 | `docs/designs/create-convocation/[v3] [Coach] Mob - Create convocation - {match 1,match 2,training,meeting}.png` | **instantané seul** |

À noter avec la ligne : **aucune maquette** ne couvre la bascule Officiel / Amical, l'icône coupe, le plafond de 14, ni l'ajout d'un convoqué après création. Ces éléments sont à concevoir par composition de patrons existants (designer-agent). Les noms de personnes visibles sur `match 1.png` ne doivent apparaître nulle part (`CLAUDE.md` §9).

## 1. Périmètre

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Calendrier et convocations | **P0** | Choix des joueurs convoqués à la création (match, entraînement, réunion), ajout d'un convoqué après création, type de compétition d'un match (Officiel / Amical) et plafond de 14 convoqués en match officiel |
| Présences et suivi sportif | **P0** | Conséquence : la liste des convoqués devient la population attendue pour les réponses, les présences et la clôture |

⚠️ Le CDC ne parle ni de plafond de convoqués ni de match officiel/amical. Ces deux règles viennent de la **demande de la développeuse**, pas d'une lecture du CDC (même constat que `specs/match-stats.md` MS-06 pour `competition_type`).

### Contenu retenu

1. **Sélection des convoqués à la création, pour les trois types.** Dans `CreateConvocationForm`, la carte DESTINATAIRES (`RecipientsCard`) devient interactive pour **match, entraînement et réunion**. La bascule « Toute l'équipe » est un vrai contrôle. Désactivée, elle déplie la liste des joueurs de l'équipe (cases à cocher) : le coach choisit qui est convoqué. Le compteur « N sélectionnés » reflète la sélection réelle, plus l'effectif.
2. **Une liste de convoqués matérialisée par convocation.** La création écrit, dans la même transaction que la convocation (fonctions `create_*_convocation`), une ligne par joueur convoqué. Nom de table indicatif : `convocation_attendees` (choix d'implémentation). C'est la **source de vérité unique** de « qui est convoqué ». Le patron est **état courant** (une ligne par couple convocation/joueur, unicité tenue par la base), comme `ConvocationResponse` et `AttendanceRecord`, et reste **une donnée distincte** des deux (`CLAUDE.md` §6) : être convoqué est la décision du coach, répondre est l'intention du joueur, la présence est le fait constaté.
3. **Seuls des joueurs de l'équipe** (`user_roles.role = 'player'` sur l'équipe de la convocation) peuvent être convoqués. Le coach n'est jamais convoqué, comme aujourd'hui.
4. **Ajout d'un convoqué après création.** Le coach de l'équipe peut convoquer un joueur de l'équipe non encore convoqué, depuis le détail de la convocation (emplacement : designer-agent ; candidat naturel : onglet Effectif, vue coach).
5. **Match Officiel / Amical.** À la création d'un match, une bascule **Officiel / Amical** est obligatoire. Elle est persistée sur `match_details` (pas sur `convocations`, patron satellite de `specs/create-convocation.md` §2). Un match officiel est signalé par une **icône coupe (trophée)**, à la création et partout où le match est présenté avec son identité (candidats : carte « Prochain match » du tableau de bord coach, lignes du Calendrier, en-tête du détail de convocation ; liste exacte : designer-agent). L'icône est toujours doublée d'un libellé accessible (« Match officiel »), jamais la seule signalisation.
6. **Plafond : 14 convoqués au maximum pour un match officiel.** Aucun plafond pour un match amical, un entraînement ou une réunion. Le plafond est tenu **par la base**, à la création **et** lors d'un ajout ultérieur (§5).

### Ce que deviennent les membres non convoqués

Un joueur de l'équipe **non convoqué** reste un membre de l'équipe à part entière pour cette convocation, sauf sur trois points :

| Capacité | Non convoqué | Base actuelle, inchangée ? |
|---|---|---|
| Voir la convocation et son détail (Infos, Effectif, Votes, Résultat, Missions, Composition une fois ouverte) | ✅ | Oui : lecture bornée à `is_team_member` |
| Voter pour l'homme / la femme du match | ✅ (votant) | Oui : `votes_insert_cast` exige `is_player_of_team`, pas d'être convoqué |
| S'inscrire à une mission | ✅ | Oui : `claim_mission` exige `role = 'player'` sur l'équipe |
| Être placé dans la composition | ❌ | Change : l'invariant lit la liste réelle (§2) |
| Être candidat au vote | ❌ (conséquence de PO-PV-10a : candidats = convoqués) | Change : la liste des candidats suit la liste réelle. À confirmer, PO-CPS-09 |
| Être attendu pour une réponse, compter dans « en attente », dans le seuil de clôture et dans les taux de réponse | ❌ | Change (§2). **Hypothèse** PO-CPS-03 : un non-convoqué ne peut pas répondre |

### Décisions remplacées

- **`specs/create-convocation.md` §2 « Destinataires — pas de matérialisation » (ex-PO-CV-05)** : remplacé. Des lignes de convoqués **sont** créées à la création. La formule « convoqués = effectif courant de l'équipe » devient « convoqués = lignes de la liste de convoqués ». La limite acceptée (un non-répondant qui quitte l'équipe disparaît des compteurs passés) **disparaît** : la liste est un instantané (voir PO-CPS-07 pour le départ d'un joueur).
- **`specs/coach-match-composition.md` PO-MC-04** : la décision « seuls les convoqués » est **conservée**. Ce qui change, c'est sa lecture opérationnelle : le vivier n'est plus l'effectif dérivé mais la **liste réelle**. La consigne « ne pas créer de table `convocation_attendees` » est levée.
- **« Source de vérité des convoqués requis »** (§6.1 de `convocation-domain-correction.md`, `docs/convocation_visibility_rls_correction.md` §3, PO-MS-07, PO-PS-10, PO-AT, PO-CTS) : **tranchée**, c'est la liste de convoqués. ⚠️ `specs/coach-dashboard.md` **PO-6b** porte en réalité sur autre chose (le compteur « licenciés » donne-t-il au coach l'accès au statut de licence individuel ?). Cette partie-là **reste ouverte** et n'est pas tranchée ici.

### Hors périmètre — explicitement

- **Retirer un convoqué après création** (dé-convoquer). Non demandé, et le retrait toucherait réponse, composition, présence et votes déjà enregistrés. PO-CPS-06.
- **Sélection des convoqués dans le backoffice web** (`specs/web-create-convocation.md`) : le formulaire web n'a pas de liste de sélection dans cette passe. PO-CPS-08 pour le comportement attendu.
- **Exclusion ou décochage automatique** d'un joueur indisponible (malade, blessé, suspendu, `specs/player-unavailability`) : non construit, et **aucune information d'indisponibilité** n'est rendue dans la liste de sélection dans cette passe (§4).
- **Notification** au joueur convoqué ou ajouté : Communication est **P1**. Le libellé du bouton reste « Créer la convocation » (`specs/create-convocation.md` §6), sans « Envoyer à N joueurs ».
- **Modifier le type de compétition après création** : PO-CPS-05.
- **Plafond pour un autre type ou une autre section** : PO-CPS-04.
- **Sélection des non-joueurs** (coach, staff, bénévoles) comme destinataires d'une réunion : la liste ne contient que des joueurs, comme aujourd'hui.
- **Les agrégats championnat** (`team_match_record`, `team_scorer_ranking`) et les filtres « Championnat / Amicaux » des écrans de statistiques : la colonne les débloque, mais leur construction relève de leurs propres specs (§7).

## 2. Règles de données

Cette spec n'écrit pas de SQL (`CLAUDE.md` §7). Ce qui suit fixe les règles que la base doit tenir.

### Liste des convoqués

- Une ligne = (convocation, joueur). **Unique** par couple. Suppression en cascade avec la convocation.
- **À l'insertion**, la base vérifie que le joueur a `role = 'player'` sur l'équipe de la convocation. Un coach, un membre d'une autre équipe ou un non-joueur est refusé.
- **Au moins un convoqué** à la création : hypothèse, PO-CPS-10. Contrôlée par le use case et par la fonction de création.
- Écriture **dans la transaction de création** : les trois fonctions `create_*_convocation` reçoivent la liste. Elles restent **`not SECURITY DEFINER`** (`specs/create-convocation.md` §2) : la politique d'insertion de la liste doit donc admettre les rôles déjà admis par `convocations_insert_create` (coach de l'équipe, responsable de la section, dirigeant habilité, administrateur), **pour une convocation qu'ils viennent de créer**.
- **Ajout ultérieur** : coach de l'équipe uniquement (`'convocation_attendee:add'`, §3), fenêtre temporelle : PO-CPS-06.

### Plafond de 14 (match officiel)

- Compte **uniquement les lignes de la liste de convoqués**, donc uniquement des joueurs (le coach n'y figure jamais). Le staff n'est pas compté.
- Tenu **par la base**, pas seulement par l'interface ni par le use case : toute écriture qui ferait dépasser 14 convoqués à un match officiel est refusée. Cela couvre la création, l'ajout ultérieur, **deux ajouts concurrents** (verrouillage de la convocation parente ou équivalent), et tout passage d'Amical à Officiel d'un match qui compte déjà plus de 14 convoqués, si ce changement devient possible (PO-CPS-05).
- Miroir lisible dans `domain/` (constante et fonction pure, par exemple « le nombre de convoqués respecte le plafond »), utilisée par le ViewModel pour le retour immédiat et par le use case. Les deux côtés se nomment en commentaire.
- Les lignes **reprises** par la migration (§2, « Reprise ») ne sont pas re-contrôlées rétroactivement. Mais aucun ajout n'est accepté sur un match officiel qui compte déjà 14 convoqués ou plus.

### Type de compétition

- **Une seule colonne**, `match_details.competition_type`, celle que prévoit déjà `specs/match-stats.md` MS-06 et que la migration `20260924100000` a volontairement laissée de côté (bloc STOP). **Ne pas créer** de booléen `is_official` à côté : deux colonnes pour le même fait divergeraient.
- **`not null`, sans défaut en base** (MS-06 inchangé). Les valeurs exactes (`'league'` ou `'official'`) : PO-CPS-01.
- Lecture : mêmes politiques que `match_details` (équipe, dirigeant habilité, administrateur). Donnée ordinaire.

### Ce que lit désormais la liste de convoqués (surfaces existantes à rebrancher)

Chacune de ces surfaces dérive aujourd'hui « les convoqués » de `user_roles` (`role = 'player'`). Elles doivent lire **la liste** :

| Surface | Fichier / objet | Effet attendu |
|---|---|---|
| Vue `convocation_responders` et `get_convocation_responders` | `20260901120018`, `20261007163409` | La jointure sur `user_roles` devient une jointure sur la liste. C'est le point unique déjà prévu pour ce changement (`docs/convocation_visibility_rls_correction.md` §3). Garder le `LEFT JOIN` vers les réponses (non-répondants « en attente ») |
| Compteurs du tableau de bord coach et onglet Effectif | `ListTeamConvocationsUseCase`, `GetConvocationRosterForCoachUseCase` | Suivent automatiquement la vue. Présents / absents / en attente ne portent que sur les convoqués |
| Clôture automatique | `private.close_convocation_if_complete`, `private.close_elapsed_convocations`, miroir `domain/policies/convocation-closure.ts` (`requiredUserIds`) | `required_count` = nombre de convoqués |
| Invariant de composition | trigger `match_lineup_slots_player_must_be_convoked` (`20261001075331`) | Le joueur placé doit figurer dans la liste |
| Préremplissage des numéros de maillot | RPC de `20261012125515` (« une ligne par joueur de l'équipe ») | Une ligne par convoqué |
| Candidats au vote | via `get_convocation_responders` (PO-PV-10a) | Candidats = convoqués. Le dénominateur des votants (`get_vote_tally`, tous les joueurs de l'équipe + autres votants) **ne change pas**, puisque les non-convoqués votent |
| Réponse d'un joueur | `convocation_responses_insert_respond` / `_update_respond` | Hypothèse PO-CPS-03 : ajouter « et convoqué » au prédicat |
| Taux de réponse personnel | `get_my_response_summary` | Dénominateur = convocations où le joueur est convoqué |
| Missions | `claim_mission` | **Inchangé** (tout joueur de l'équipe) |
| Votants | `votes_insert_cast` / `_update_cast` | **Inchangé** (tout joueur de l'équipe) |

### Reprise des convocations existantes

- **Liste de convoqués** : chaque convocation existante reçoit comme convoqués **tous les joueurs actuels de son équipe** (demande de la développeuse), **plus** tout utilisateur qui a déjà une ligne de réponse, de présence ou de composition sur cette convocation et qui n'est plus joueur de l'équipe. Ce second terme est une recommandation de la PO : sans lui, une réponse ou une présence historique deviendrait celle d'un « non-convoqué », et l'invariant de composition serait violé sur des lignes existantes. À confirmer, PO-CPS-02(b).
- Conséquence connue de cette reprise, acceptée : un joueur arrivé dans l'équipe **après** une convocation passée sera compté comme convoqué à celle-ci (les données ne permettent pas mieux).
- **Type de compétition** des matchs existants : **ne pas deviner**. PO-CPS-02(a).

## 3. RBAC

### Ligne de matrice applicable

« **Créer/modifier une convocation** » (`priorisation-fonctionnelle-as-acaribbean.md`) : Joueur ❌ · Coach ✅ (son équipe) · Resp. section ✅ (sa section) · Dirigeant habilité ✅ · Trésorier ❌ · Référent médical ❌ · Bénévole ❌ · Admin ✅.

« **Consulter une convocation en mode dégradé** » : ✅ pour les 8 rôles (plafond de lecture).

| Rôle | Choisir les convoqués et le type de compétition à la création | Ajouter un convoqué après création | Lire la liste des convoqués |
|---|---|---|---|
| Joueur/Joueuse | ❌ | ❌ | ✅ son équipe (identité + badge « a répondu », jamais le statut : AC-MD-08 inchangé) |
| Coach/Staff | ✅ son équipe (`convocation:create`) | ✅ son équipe (`'convocation_attendee:add'`) | ✅ son équipe, avec statuts |
| Responsable de section | ✅ sa section, par la même fonction de création, mais **aucun point d'entrée UI** (statu quo `specs/create-convocation.md` §7) | Accordé par la matrice, **non construit** | Statu quo |
| Dirigeant habilité | ✅ par la permission existante, aucun point d'entrée mobile (statu quo) | Accordé par la matrice, **non construit** | ✅ comme aujourd'hui (lecture club, `20261007163409`) |
| Trésorier, Référent médical, Bénévole | ❌ | ❌ | ❌ |
| Administrateur | ✅ via le backoffice web, **sans liste de sélection** dans cette passe (PO-CPS-08) | Accordé par la matrice, **non construit** | ✅ |

### Action à ajouter — `'convocation_attendee:add'`: `['coach']`, scopée équipe

- **Écart restrictif assumé**, même raisonnement que `'match_lineup:write'` et `'match_details:update'` : la demande nomme le coach, les autres rôles n'ont pas de chemin vers l'écran de détail, moindre privilège. L'élargissement aux trois autres rôles autorisés par la matrice est PO-CPS-11, non bloquant.
- Nomme la ressource écrite (la liste), pas `'convocation:update'`, qui désigne déjà d'autres colonnes de `public.convocations`.
- `can.ts` : ajouter à `requiresTeamScope` (branche coach) et pré-câbler la branche `section-manager` dans le même changement, comme pour `'match_lineup:write'`.
- Miroir RLS manuel, commenté du nom de l'action, via `private.is_coach_of_team` sur l'équipe de la convocation parente, avec le prédicat temporel de PO-CPS-06.
- **Aucune autre action n'est ajoutée.** Le choix à la création reste couvert par `convocation:create`. Rendu conditionné à `activeRole === 'coach'` (limite connue, `docs/DEFAULTS-A-CHALLENGER.md`).

## 4. Données sensibles

- **Données de santé : aucune stockée.** La liste ne porte **aucun champ de motif** de non-convocation ni de commentaire. ⚠️ **Vecteur d'inférence**, même nature que `specs/coach-match-composition.md` §4 : les coéquipiers voient qui n'est **pas** convoqué. Tant que la sélection est un choix manuel du coach sans motif, rien n'en déduit une donnée médicale. **Si la liste de sélection affichait un jour l'indisponibilité** (malade / blessé) ou **décochait automatiquement** un joueur indisponible, l'absence d'un joueur dans la liste deviendrait un signal dérivé d'une donnée de santé, exposé à toute l'équipe. Ce n'est pas construit. Ce serait une décision du **référent RGPD**, toujours non désigné (`docs/GOUVERNANCE.md` §7). PO-CPS-12.
- **Données financières : aucune.**
- **Données personnelles de tiers** : la liste de sélection rend au coach les noms des joueurs de **son** équipe, ce que le coach voit déjà (effectif). Côté joueur, les noms des convoqués restent lus par le mécanisme étroit existant (`get_convocation_responders`, deux colonnes), **jamais par un élargissement de `users_select_own`**. `specs/create-convocation.md` §4 (« aucune liste nominative rendue ») est remplacé sur ce point.
- **Journal d'audit** : convoquer, ajouter un convoqué ou choisir Officiel / Amical **ne figure pas** dans la liste des actions sensibles du CDC §11.3. Aucune journalisation requise, aucun code d'action à ajouter à `audit-actions.ts`. Réserve, même nature que PO-EM-02 : si le **retrait** d'un convoqué est un jour construit (PO-CPS-06), la question se reposera, depuis le use case, jamais par trigger.
- **Rétention** : côté Supabase, hors périmètre. La liste suit la convocation (cascade).

## 5. Critères d'acceptation

**AC-01** et **AC-02** sont ceux du CDC §17.2. Préfixe propre : **`AC-CPS-`**, à renuméroter en recette.

| Réf. | Critère |
|---|---|
| **AC-01** | La liste des convoqués d'une convocation n'est accessible à aucun membre extérieur à l'équipe (hors dirigeant habilité et administrateur, comme aujourd'hui), ni à l'écran, ni dans la réponse API |
| **AC-02** | Un coach de l'équipe A qui tente de convoquer ou d'ajouter un joueur à une convocation de l'équipe B est refusé **par la base**, vérifié par appel direct à l'API |
| AC-CPS-01 | Pour **chacun** des trois types (match, entraînement, réunion), la carte DESTINATAIRES est interactive. « Toute l'équipe » active convoque tous les joueurs de l'équipe. Désactivée, elle affiche la liste des joueurs de l'équipe, cochables un par un |
| AC-CPS-02 | Le compteur « N sélectionnés » affiche le nombre de joueurs effectivement cochés, mis à jour à chaque coche. Le bouton reste « Créer la convocation », sans nombre |
| AC-CPS-03 | Après création, la liste persistée contient **exactement** les joueurs sélectionnés : ni plus, ni moins, sans doublon. La convocation et sa liste sont créées dans **une seule transaction** : si l'une échoue, rien n'est écrit |
| AC-CPS-04 | Une écriture qui convoque un utilisateur sans rôle `player` sur l'équipe de la convocation (coach, autre équipe, non-joueur) est refusée **par la base** |
| AC-CPS-05 | La création d'un **match** exige un choix **Officiel / Amical**. Un match sans type de compétition est refusé par la base (`not null`, sans défaut, MS-06) |
| AC-CPS-06 | Un match **officiel** ne peut pas compter plus de **14** convoqués : la base refuse la création avec 15 convoqués ou plus, et refuse l'ajout d'un 15ᵉ. Deux ajouts concurrents sur un match à 13 convoqués n'en laissent passer qu'un. Vérifié par appel direct à l'API |
| AC-CPS-07 | Un match **amical**, un entraînement et une réunion acceptent un nombre de convoqués **non plafonné** (testé au-delà de 14) |
| AC-CPS-08 | Dans le formulaire, sur un match officiel, le dépassement de 14 est signalé **avant** la soumission (message lisible, pas seulement la couleur), et la soumission est impossible tant qu'il persiste. Le message côté interface vient de la même règle de domaine que le use case |
| AC-CPS-09 | Un match officiel affiche une **icône coupe** doublée d'un libellé accessible (« Match officiel ») sur les écrans retenus par designer-agent. Un amical ne l'affiche pas. Aucune information n'est portée par la seule couleur |
| AC-CPS-10 | Le coach de l'équipe peut **ajouter** un joueur non convoqué de l'équipe après création. Le joueur apparaît ensuite dans l'Effectif (« en attente »), dans le vivier de la composition et parmi les candidats au vote. Le contrôle est **absent** (jamais grisé) pour tout autre rôle actif |
| AC-CPS-11 | Une tentative d'ajout par un jeton joueur, par un coach d'une autre équipe ou par tout rôle hors `'convocation_attendee:add'` est refusée **par la base** |
| AC-CPS-12 | Un joueur **non convoqué** de l'équipe peut ouvrir le détail de la convocation, voter (dans la fenêtre de vote existante) et s'inscrire à une mission ouverte. Vérifié par appel direct à l'API |
| AC-CPS-13 | Un joueur non convoqué **ne peut pas être placé** dans la composition : il n'est pas proposé dans « Remplacer », et une écriture directe le plaçant est refusée par la base (AC-MC-07 relu sur la liste réelle) |
| AC-CPS-14 | Les compteurs présents / absents / en attente (tableau de bord coach, onglet Effectif) ne portent **que** sur les convoqués. Un non-convoqué n'apparaît jamais « en attente » |
| AC-CPS-15 | La clôture automatique compte les présences constatées **des convoqués seulement** (`required_count` = nombre de convoqués), côté trigger, côté job planifié et dans `convocation-closure.ts` |
| AC-CPS-16 | *(hypothèse PO-CPS-03)* Un joueur non convoqué ne voit pas les boutons Présent / Absent, voit un état clair « non convoqué(e) » et une réponse forgée est refusée par la base. La convocation ne figure pas dans ses réponses attendues et n'entre pas dans le dénominateur de son taux de réponse |
| AC-CPS-17 | Après la migration, chaque convocation existante a une liste de convoqués conforme à §2 « Reprise ». Les compteurs, la composition et les votes de ces convocations sont **identiques** avant et après la migration |
| AC-CPS-18 | La liste des convoqués et la sélection ne stockent, ne rendent ni ne renvoient **aucune** donnée de santé, d'indisponibilité, ni aucun champ texte libre (motif, note) |
| AC-CPS-19 | Ajouter un convoqué **n'écrit jamais** dans `convocation_responses`, `attendance_records` ni dans la composition |
| AC-CPS-20 | Cibles tactiles d'au moins ~44px (`h-11`) sur un viewport mobile réel : bascule « Toute l'équipe », chaque ligne de joueur (toute la ligne est la cible), « Tout désélectionner », bascule Officiel / Amical, contrôle d'ajout. Champs côte à côte en `min-w-0`. L'en-tête à flèche retour reste `sticky top-0` sur un formulaire désormais long (`CLAUDE.md` §6) |
| AC-CPS-21 | Accessibilité : chaque case porte le nom du joueur comme libellé, l'état coché n'est pas signalé par la seule couleur, la bascule Officiel / Amical expose son état (`aria-pressed` / `aria-checked`) |
| AC-CPS-22 | Aucun nom de personne figurant sur les maquettes n'apparaît dans le code, les tests ou la documentation (`CLAUDE.md` §9) |

## 6. Points ouverts

> **Décisions développeuse du 2026-10-12.** **PO-CPS-01 tranché** : deux valeurs exactement, `'official' | 'friendly'` (colonne `match_details.competition_type`, pas de booléen `is_official`) ; MS-06/MS-07 amendés (`specs/match-stats.md`) pour compter **tous les matchs officiels**. **PO-CPS-02 tranché** : tous les matchs existants sont repris en `'official'` ; le plafond de 14 n'est **pas** appliqué rétroactivement (la reprise ne doit pas échouer) ; la liste reprise = joueurs actuels de l'équipe + toute personne ayant déjà une réponse, une présence ou une place de composition. Les deux lignes ci-dessous restent pour mémoire. Hypothèses suivies telles quelles : PO-CPS-03, 05, 06, 10. Non construit : PO-CPS-07 (départ d'un joueur), PO-CPS-11, 12, 13.

| Réf. | Question | Recommandation PO | À trancher par | Bloquant ? |
|---|---|---|---|---|
| **PO-CPS-01** | **« Officiel » = `'league'` ?** MS-06 prévoit `'friendly' \| 'league'` et MS-07 compte « le championnat seulement ». Or l'icône demandée est une **coupe** : un match de coupe est officiel sans être de championnat. Avec deux valeurs, soit la coupe entre dans les agrégats championnat, soit il faut une troisième valeur | Deux valeurs **`'official' \| 'friendly'`**, MS-06/MS-07 amendés pour compter « les matchs officiels » (championnat et coupe confondus). Troisième valeur seulement si le Bureau veut des agrégats championnat seul | Développeuse + Bureau | **Oui pour la migration**, non pour la conception |
| **PO-CPS-02** | **Reprise.** (a) Quel type de compétition pour les matchs existants (7 lignes au 2026-09-24, sans doute plus) ? MS-06 et le bloc STOP interdisent de deviner. (b) Confirmer la liste reprise (§2 : joueurs actuels + anciens ayant déjà une ligne) | (a) Liste des matchs existants revue **un par un** avec le coach. La migration s'arrête si une ligne n'a pas de décision. Pas de valeur par défaut globale. (b) Comme en §2 | Développeuse (+ coach pour a) | **Oui pour la migration** |
| **PO-CPS-03** | **HYPOTHÈSE À CONFIRMER.** Un non-convoqué peut-il répondre Présent / Absent ? | **Non** : la réponse est réservée aux convoqués (RLS + use case), le non-convoqué voit un état « non convoqué(e) ». Sinon, sa réponse n'entrerait dans aucun compteur | Développeuse | Non (hypothèse retenue pour le design) |
| **PO-CPS-04** | Le plafond de 14 vaut-il pour les matchs officiels de **toutes** les sections, ou du football seulement ? | Seule la section football existe (MS-15) : une seule constante appliquée à tout match officiel, à revoir quand une autre section aura des matchs | Développeuse | Non |
| **PO-CPS-05** | Le type Officiel / Amical est-il **modifiable** après création ? Par qui ? | Non dans cette passe (aucun chemin d'édition). Si un jour oui : la base refuse le passage à Officiel au-delà de 14 convoqués (déjà exigé en §2) | Développeuse | Non |
| **PO-CPS-06** | **Fenêtre d'ajout** d'un convoqué, et **retrait** d'un convoqué | Ajout permis tant que la convocation est `open` et **avant le coup d'envoi** (au-delà, la convocation n'est plus préparée, c'est un fait passé). Un joueur ajouté après l'échéance de réponse ne peut plus répondre : accepté, la présence constatée prime. Retrait : hors périmètre, à spécifier séparément (effets sur réponse, composition, présence, votes) | Développeuse | Non |
| **PO-CPS-07** | Un convoqué qui **quitte l'équipe** (rôle retiré) : sa ligne reste-t-elle ? | La garder pour les convocations passées (trace fidèle). Pour les convocations à venir et ouvertes, la retirer au moment du retrait de rôle, sinon il resterait « en attente » sans pouvoir répondre | Développeuse | Non |
| **PO-CPS-08** | **Backoffice web** (`specs/web-create-convocation.md`) : sans liste de sélection, que convoque une création admin ? Et un match officiel d'une équipe de plus de 14 joueurs ? | Toute l'équipe par défaut. Match officiel au-delà de 14 : refus lisible, **jamais de troncature silencieuse**. Liste de sélection web : spec de suivi | Développeuse | Non pour le mobile |
| **PO-CPS-09** | Les candidats au vote deviennent les seuls convoqués (conséquence de PO-PV-10a). Un non-convoqué vote sans pouvoir être élu. Confirmé ? | Oui, cohérent avec « non convoqué = n'a pas joué » | Développeuse | Non |
| **PO-CPS-10** | **HYPOTHÈSE À CONFIRMER.** Valeur par défaut de la sélection et minimum. | « Toute l'équipe » **activée par défaut** pour les trois types (statu quo, sous-titre de la maquette). En la désactivant, tous les joueurs sont **pré-cochés** (`match 1.png`, « Tout désélectionner »). Au moins **un** convoqué pour créer. Sur un match **officiel** d'une équipe de plus de 14 joueurs, « Toute l'équipe » ne peut pas rester active : le formulaire bascule sur la liste et signale le dépassement (AC-CPS-08). La bascule Officiel / Amical n'a **pas de valeur présélectionnée** (MS-06 : pas de défaut) | Développeuse | Non (hypothèse retenue pour le design) |
| **PO-CPS-11** | Élargir `'convocation_attendee:add'` au Responsable de section, au Dirigeant habilité, à l'Administrateur (autorisés par la matrice) | Pas avant qu'un chemin vers l'écran existe pour eux (même position que PO-MC-10) | Bureau + développeuse | Non |
| **PO-CPS-12** | Afficher l'**indisponibilité** (malade, blessé, suspendu) dans la liste de sélection, ou décocher automatiquement | Non dans cette passe. Décision du référent RGPD (inférence santé visible de l'équipe, §4) | Référent RGPD + Bureau | Non |
| **PO-CPS-13** | **Présence d'un non-convoqué** : le coach peut-il constater la présence d'un joueur non convoqué venu quand même ? | Non dans cette passe : la feuille de présence = les convoqués. Le coach ajoute d'abord le joueur (avant le coup d'envoi, PO-CPS-06). Réexaminer si le cas se présente | Développeuse | Non |

### Ce qui reste OPEN et ne doit pas être résolu implicitement

- PO-CPS-01 et PO-CPS-02(a) : **aucune valeur de type de compétition ne doit être devinée**. Si la décision manque au moment d'écrire la migration, s'arrêter et demander.
- PO-CPS-03 et PO-CPS-10 sont des **hypothèses**, implémentables telles quelles, à confirmer.
- `specs/coach-dashboard.md` PO-6b (statut de licence individuel vu par le coach) reste ouvert : cette spec ne tranche que la partie « convoqués requis » qui lui avait été rattachée.

## 7. Documents à amender (cohérence)

L'agent PO n'écrit que cette spec. Les amendements ci-dessous sont à porter dans le même changement que l'implémentation, ou juste après :

| Document | Passage | Amendement |
|---|---|---|
| `specs/create-convocation.md` | §1 « Ce que cette feature ne couvre pas » (sélection joueur par joueur) ; §2 tableau, ligne « Destinataires » ; §2 « Destinataires — pas de matérialisation » ; §4 (« aucune liste nominative ») ; §7 ligne « Source de vérité des convoqués requis » ; §8 et « UI design » point 4 (bascule non interactive) | Renvoyer vers cette spec : liste matérialisée, bascule interactive, compteur = sélection, champ Officiel / Amical pour un match |
| `specs/coach-match-composition.md` | §1 « Vivier sélectionnable » (PO-MC-04), AC-MC-06, AC-MC-07, §6 PO-MC-04 et « explicitement OPEN », note designer « Remplacer » | Le vivier est la liste réelle. Lever « ne pas créer de `convocation_attendees` ». PO-MC-13 reste ouvert |
| `specs/match_details_page.md` | §1 (effectif convoqué), AC-MD-09, PO-MD-09(c), §5 « source de vérité », correction n°1 (pastille « CONVOQUÉE » : la notion existe désormais), onglet Effectif | Effectif = liste réelle. Ajouter l'entrée coach « ajouter un convoqué ». État joueur non convoqué. Icône coupe dans l'en-tête si retenue |
| `specs/coach-dashboard.md` | PO-6b, AC-CD-04/05, carte « Prochain match » | Préciser que la partie « convoqués requis » est tranchée ici, PO-6b (licences) reste ouvert. Compteurs = convoqués. Icône coupe |
| `docs/convocation_visibility_rls_correction.md` | §2.1 (définition de la vue sur l'effectif), §3 (6.1 « stays OPEN ») | La vue lit la liste. §6.1 résolue par cette spec. Règle « badge binaire, jamais le statut » inchangée |
| `specs/coach-attendance-confirmation.md` | lignes sur PO-6b et `required_count` | Seuil de clôture = convoqués (trigger, job, `convocation-closure.ts`). PO-CPS-13 |
| `specs/player-vote.md` | PO-PV-10(a), §« ne pas créer `convocation_attendees` » | Candidats = liste réelle, votants inchangés (PO-CPS-09) |
| `specs/match-details-missions.md` | éligibilité à l'inscription | Préciser : inchangée, tout joueur de l'équipe, convoqué ou non |
| `specs/match-stats.md` | MS-06, MS-07, AC-MS-06/07, PO-MS-07, §6 point 2 | Valeurs et sémantique de `competition_type` (PO-CPS-01), reprise (PO-CPS-02). PO-MS-07 tranché |
| `specs/coach-team-stats.md` | PO-CTS-01, PO-CTS-02, AC-CTS-12, PO-CTS-04 | Débloqués par la colonne une fois PO-CPS-01/02 tranchés. Dénominateurs de présence = convoqués |
| `specs/player-stats.md` | PO-PS-05, AC-PS-08, PO-PS-10 | Filtre de compétition débloquable. Dénominateur du taux de réponse = convocations où le joueur est convoqué |
| `specs/mobile-leaderboard.md` | PO-LB-03 | Choix « toutes compétitions / officiels seuls » à reposer une fois la colonne disponible |
| `specs/player-dashboard.md` | réponses attendues, alertes « à répondre » | Une convocation où le joueur n'est pas convoqué n'est pas « à répondre » (PO-CPS-03) |
| `specs/calendar.md`, `specs/edit-match-details.md`, `specs/web-create-convocation.md` | consignes « ne pas créer de table `convocation_attendees` » | Lever la consigne. `web-create-convocation` : PO-CPS-08. `edit-match-details` : PO-CPS-05 |
| `docs/designs/DESIGN_LINKS.md` | §2 | Ligne pré-rédigée en §0 |
| `src/presentation/features/convocation/components/RecipientsCard.tsx` | commentaire d'en-tête | Commentaire obsolète (« purely informational in this pass ») à mettre à jour avec le composant |

Sans changement : `specs/coach-alerts.md` (lit un statut, jamais un effectif), `specs/mobile-dirigeant-habilite.md` (le dirigeant participe sans être convoqué, inchangé).

## 8. Note pour designer-agent

- **Maquette** : `docs/designs/create-convocation/[v3] [Coach] Mob - Create convocation - match 1.png` (état liste dépliée), avec les corrections déjà posées par `specs/create-convocation.md` §8 (pas de pastille « Autre », libellé « Créer la convocation »). Ne pas demander de lien.
- **À concevoir sans maquette** : la bascule Officiel / Amical (sans valeur présélectionnée, PO-CPS-10) et sa place dans les champs Match ; l'icône coupe et la liste des écrans où elle apparaît ; le signalement du plafond de 14 (compteur « N / 14 » ou équivalent, message de dépassement) ; l'ajout d'un convoqué après création (point d'entrée côté coach, liste des joueurs non convoqués, état « tous déjà convoqués ») ; l'état « non convoqué(e) » côté joueur sur le détail (hypothèse PO-CPS-03).
- **Patrons à réutiliser** : `RecipientsCard` / `StaticSwitch` (à rendre interactif), `TypeSelector` ou le segmented control Domicile / Extérieur pour Officiel / Amical, `RosterRow` de l'onglet Effectif, `EmptyState`, `BackHeader` sticky, barre de soumission `sticky bottom-0`.
- **États à couvrir** : « Toute l'équipe » activée ; liste dépliée, tous cochés ; aucun coché (soumission impossible) ; match officiel à 14 ; match officiel au-delà de 14 ; équipe sans joueur ; échec d'ajout (plafond atteint, refus base) avec message lisible.
- **Rien d'interactif ni d'informatif sur l'indisponibilité** dans la liste de sélection (PO-CPS-12).

**Prêt pour designer-agent : oui.** Aucun point ouvert ne bloque la conception : PO-CPS-03 et PO-CPS-10 sont des hypothèses retenues. **L'implémentation de la migration, elle, est bloquée par PO-CPS-01 et PO-CPS-02** (valeurs et reprise du type de compétition) : ne pas les deviner.

## UI design

> Rédigé par designer-agent le 2026-10-12. Registre `docs/designs/DESIGN_LINKS.md` : pas de ligne pour cette feature (cas « instantané seul » du §0, aucun lien à demander). Aucun nouveau patron visuel hors composition de l'existant : **aucune demande de prototype Claude Design nécessaire**. Les points restants sont des questions de design non bloquantes (fin de section). Les hypothèses PO-CPS-03 et PO-CPS-10 sont suivies telles quelles ; aucun point OPEN n'est résolu ici.

### Références ouvertes

- **Principale** : `docs/designs/create-convocation/[v3] [Coach] Mob - Create convocation - match 1.png` : section DESTINATAIRES (titre + « N sélectionnés » en vert), carte « Toute l'équipe » avec bascule, sous-ligne « N licenciés » + lien vert « Tout désélectionner », lignes pleine largeur (avatar à initiales, nom, case cochée verte à droite). Reprise à l'identique, avec deux écarts volontaires : (1) bouton « Créer la convocation », pas « Envoyer à 12 joueurs » (§1 Hors périmètre) ; (2) libellé « N joueurs » au lieu de « N licenciés » (évite d'insinuer un statut de licence, PO-6b reste ouvert). Pas de pastille « Autre » (`create-convocation.md` §8). Aucun nom de la maquette n'est repris (AC-CPS-22).
- Même famille : `match 2.png`, `training.png`, `meeting.png` (même carte DESTINATAIRES sous les champs propres au type), `docs/designs/coach-match-details/composition/` (vivier « Remplacer »), `docs/designs/coach-attendance-confirmation/` (lignes Effectif coach), `docs/designs/player-match-details/` (Effectif joueur).
- Code réutilisé : `RecipientsCard`, `StaticSwitch` (remplacé, voir ci-dessous), `SegmentedToggle` (shared), `PlayerPickerRow` (patron de ligne pleine largeur `min-h-11`), `CandidateList`, `RosterRow`, `ConvocationHero`, `BackHeader` (sticky), barre de soumission `sticky bottom-0`.

### Emplacement dans la nav

Aucun nouvel écran, aucun nouvel élément de nav (4 entrées inchangées).

| Besoin | Destination existante | Emplacement exact |
|---|---|---|
| Création : bascule Officiel / Amical + sélection des convoqués | **Calendrier** (le formulaire `CreateConvocationForm` est déjà la route de création, sans barre de nav, ouverte depuis le Dashboard coach et le Calendrier) | Champ « Compétition » dans les champs Match ; carte DESTINATAIRES en bas du formulaire, pour les 3 types |
| Ajout d'un convoqué après création | **Calendrier** > détail de convocation (`ConvocationDetailPage`) | Onglet **Effectif**, vue coach, en bas de `RosterList` |
| Icône coupe (match officiel) | Dashboard, Calendrier | Voir « Icône coupe » |
| Vues non convoqué | **Calendrier** > détail de convocation | Effectif, Votes, Missions, Composition |

### Par rôle (RBAC du §3 réutilisé, rien redéfini)

- **Coach (équipe active)** : voit tout ce qui suit. Rendu conditionné à `activeRole === 'coach'` pour le contrôle d'ajout (limite connue du §3).
- **Joueur / Joueuse** : ne voit ni sélection, ni bascule Officiel/Amical, ni contrôle d'ajout (absents, jamais grisés). Voit l'icône coupe, la liste des convoqués en lecture (badge binaire « a répondu », AC-MD-08 inchangé) et l'état « non convoqué(e) » si c'est son cas.
- **Responsable de section, Dirigeant habilité, Administrateur** : aucun point d'entrée UI ajouté. Le Dirigeant habilité qui crée via le `SectionTeamPicker` existant obtient le même formulaire (sélection incluse, puisque le formulaire est partagé) ; le contrôle d'ajout après création reste absent pour lui (§3 : accordé, non construit). L'icône coupe est visible de tous les rôles qui voient le match.
- **Trésorier, Référent médical, Bénévole** : rien ne change.

### 1. Création : champ Compétition (match uniquement)

- **Position** : entre « Adversaire » et « Lieu de la rencontre » (c'est une caractéristique de la rencontre, avant son lieu). Libellé de champ « Compétition ».
- **Composant** : `SegmentedToggle` existant (même rendu que Domicile / Extérieur, un autre contrôle de la même famille juste en dessous, donc aucun patron neuf). Deux options pleine largeur, `h-11` minimum (la variante `default` fait déjà ~44px par son padding ; garder `size="sm"` à `h-11` si l'écran le préfère), options `flex-1`, jamais côte à côte avec un autre champ : pas de souci de `min-w-0` ici.
- **Option Officiel** : icône coupe (Tabler `IconTrophy`, `aria-hidden`) + texte « Officiel ». **Option Amical** : texte seul. L'icône ne remplace jamais le libellé.
- **Écart à faire sur le composant** : `SegmentedToggle` prend un `boolean`, or le choix **n'a pas de valeur présélectionnée** (PO-CPS-10, MS-06). Étendre `value` à `boolean | null` (`null` = aucune option sélectionnée, les deux en style non sélectionné, `aria-checked="false"` des deux). Variation d'un composant existant, pas un nouveau patron. Mapping : `true` = Officiel, `false` = Amical, converti en valeur de domaine par le ViewModel (la valeur exacte, `'official'` ou autre, relève de PO-CPS-01 et n'apparaît pas ici). Couleurs : Officiel `coach-amber` (couleur « or » de la coupe), Amical `coach-green`.
- **États** : aucun choix (état initial) = soumission impossible, message du fieldError existant « Choisissez Officiel ou Amical » ; Officiel ; Amical. Pas d'état « désactivé ». Le choix déclenche immédiatement le recalcul du plafond dans DESTINATAIRES (§3 ci-dessous).
- **Accessibilité** : `role="radiogroup"` + `aria-label="Compétition"`, `aria-checked` par option (AC-CPS-21).

### 2. Icône coupe : où apparaît un match officiel

Un seul composant d'affichage : **`OfficialMatchBadge`** (nouveau, minuscule) = `IconTrophy` en `coach-amber` + libellé « Match officiel » en `sr-only` (AC-CPS-09 : jamais la seule signalisation). Deux tailles : icône seule `size-4` (lignes denses, avec `sr-only`) et pastille avec texte visible « Officiel » (en-tête). Un match amical ne rend rien (pas de pastille « Amical »). L'état n'est jamais porté par la seule couleur : c'est la forme (coupe) + le texte lecteur d'écran.

| Écran | Slot | Variante |
|---|---|---|
| **Détail de convocation, en-tête** (`ConvocationHero`, match) | Ligne du haut du hero : l'espace vide à gauche (`<span />` actuel, en face de la pastille de statut) devient la pastille « Officiel » + coupe. Aucun décalage de la mise en page : le slot existe déjà | Pastille avec texte |
| **Carte « Prochain match » du Dashboard coach** (`UpcomingList` / carte prochaine convocation) | À droite de la ligne adversaire, avant le chevron / l'heure | Icône seule |
| **Carte « Prochaine convocation » du Dashboard joueur** (`NextConvocationCard`) | Même place, ligne adversaire | Icône seule |
| **Lignes du Calendrier** (semaine et mois, liste de jour) | À droite du titre de l'événement ; en vue mois, pas d'icône dans la cellule (trop dense), uniquement dans la liste du jour sélectionné | Icône seule |
| Création | Dans l'option « Officiel » du champ Compétition (voir §1) | Icône dans le bouton |

Hors liste volontairement : Actus, Menu, Profil, écrans de stats (les filtres de compétition relèvent de leurs specs, §1 Hors périmètre). L'emplacement exact dans chacune des quatre cartes est à valider à l'implémentation en ouvrant `docs/designs/v4_coach_dashboard.png` et `docs/designs/calendar/` ; si une carte n'a pas la place, la retirer de ce tableau plutôt que de la déformer (non bloquant).

### 3. Création : carte DESTINATAIRES (3 types)

`RecipientsCard` devient interactive et reçoit l'effectif réel (liste des joueurs de l'équipe) au lieu du `count` passé par l'état de routeur. Même position qu'aujourd'hui : en bas du formulaire, après les champs propres au type, pour match, entraînement et réunion (`hasRecipientsCard` vrai pour les trois).

**Structure (de haut en bas)**

1. En-tête : titre « DESTINATAIRES » à gauche, compteur à droite (voir « Compteur et plafond »).
2. Carte « Toute l'équipe » (sous-titre existant « Par défaut pour entraînements et matchs ») avec **bascule interactive**. **Toute la carte est la cible tactile** (hauteur naturelle ~72px, très au-dessus de 44px), pas seulement le petit interrupteur : le conteneur porte `role="switch"` + `aria-checked` + `aria-label="Toute l'équipe"`.
3. Si la bascule est désactivée : sous-ligne « N joueurs » à gauche + lien « Tout désélectionner » à droite (cible `h-11`, texte vert comme la maquette), puis la liste.

**Composants**

- **Bascule** : installer le primitif shadcn `Switch` (`npx shadcn add switch`, pas encore vendu dans `presentation/shared/components/ui/`) et **supprimer `StaticSwitch`** (devenu sans objet : son commentaire interdit justement tout gestionnaire de tap). Interrupteur visuel en vert `coach-green` quand actif (il redevient un vrai contrôle, plus de gris « inerte »). Le commentaire d'en-tête de `RecipientsCard` est à mettre à jour (§7).
- **Ligne joueur** : nouveau `PlayerSelectRow`, dérivé de `PlayerPickerRow` (même gabarit : `min-h-11`, `rounded-2xl`, bordure, `InitialsAvatar`, nom `min-w-0 flex-1 truncate`) mais en **multi-sélection** : `role="checkbox"` + `aria-checked`, case visuelle à droite (carré arrondi vert avec coche quand coché, carré bordé vide quand décoché, comme `match 1.png`). **Toute la ligne est la cible** (AC-CPS-20). Le nom du joueur est le libellé accessible (AC-CPS-21). L'état coché est signalé par la coche, pas par la seule couleur ; la ligne cochée garde le style `border-coach-green bg-coach-green/12` de `PlayerPickerRow` sélectionné. Pas de sous-libellé de poste (la maquette n'en a pas), et **aucune** information d'indisponibilité (PO-CPS-12).
- Une case `Checkbox` shadcn existe, mais n'est pas utilisée telle quelle : sa case fait 16px, la ligne entière doit être le contrôle. Si l'implémentation préfère l'utiliser à l'intérieur de la ligne, elle doit rester `aria-hidden`/présentationnelle pour ne pas doubler le rôle.
- Liste : `ul` dans le flux normal de la page (pas de liste à défilement interne : la page défile, comme sur `match 1.png`), espacement `gap-2.5`. L'en-tête sticky et la barre de soumission sticky restent atteignables sur une équipe de 20+ joueurs.

**Comportements (PO-CPS-10)**

- État initial, pour les trois types : bascule **activée**, aucun détail de liste, compteur = effectif de l'équipe.
- Bascule **activée -> désactivée** : la liste se déplie, **tous les joueurs pré-cochés**.
- Bascule **désactivée -> activée** : la sélection est remise à « toute l'équipe » et la liste se replie (sélection manuelle perdue, sans confirmation : coût de reprise faible).
- « Tout désélectionner » vide la sélection ; quand la sélection est vide, le lien devient « Tout sélectionner ». Sur un match officiel d'une équipe de plus de 14 joueurs, « Tout sélectionner » est **absent** (jamais grisé, il ne pourrait que provoquer un dépassement).
- Décocher manuellement tous les joueurs ne rebascule pas sur « Toute l'équipe ».
- Changement d'équipe (`SectionTeamPicker`, dirigeant) : la sélection est réinitialisée sur « Toute l'équipe » pour la nouvelle équipe.
- Changement de type de convocation : la sélection est conservée (même équipe). Le plafond n'existe que pour un match officiel, donc passer de match officiel à entraînement lève la contrainte sans toucher à la sélection.

**Compteur et plafond de 14 (match officiel)**

Le compteur de l'en-tête (`aria-live="polite"`, texte et pas seulement la couleur) :

| Contexte | Texte | Style |
|---|---|---|
| Entraînement, réunion, match amical, match sans compétition encore choisie | « N sélectionnés » | vert (`coach-green-text`), comme aujourd'hui |
| Match officiel, N < 14 | « N / 14 sélectionnés » | vert |
| Match officiel, N = 14 | « 14 / 14 · maximum atteint » | ambre (`coach-amber`) |
| Match officiel, N > 14 | « N / 14 · 14 maximum » | rouge (`coach-red-text`) |
| N = 0 | « Aucun sélectionné » | rouge |

- **Limite atteinte (14)** : les cases non cochées **restent actives**. Aucun blocage du tap : un blocage doublerait le message d'erreur et empêcherait de passer d'un joueur à un autre sans décocher d'abord. La contrainte est portée par le message et par la soumission impossible, ce qui est exactement ce que demande AC-CPS-08 (« dépassement signalé avant la soumission »).
- **Dépassement (> 14)** : sous la carte et la liste, une alerte inline (`Alert` shadcn variante destructive, `role="alert"`) : « Un match officiel est limité à 14 convoqués. Décochez N joueur(s) pour continuer. » (N = excédent, accord singulier/pluriel). Le même message apparaît dans la zone `fieldError` de la barre de soumission sticky tant qu'il persiste ; le bouton « Créer la convocation » est désactivé. La règle vient de la fonction de domaine du §2 (même constante que la base), jamais d'un nombre en dur dans le composant.
- **Sélection vide (< 1)** : message « Sélectionnez au moins un joueur », bouton désactivé. Pas de coche automatique.
- **Équipe de plus de 14 joueurs et match officiel** (PO-CPS-10) : dès que « Officiel » est choisi, « Toute l'équipe » **ne peut pas rester active**. La bascule passe sur « désactivée », la liste se déplie avec tous les joueurs pré-cochés, le compteur affiche le dépassement en rouge et l'alerte ci-dessus s'affiche : la vue liste est **forcée**. La bascule reste alors dans l'état désactivé et un tap dessus ne l'active pas : un texte d'aide la remplace comme sous-titre : « Indisponible : l'équipe compte N joueurs, un match officiel est limité à 14. » (le texte de la carte change, la carte reste un contrôle visible : c'est un état de donnée, pas une permission, donc le principe « jamais grisé » des cartes de menu ne s'applique pas ; point de design 1 plus bas). Si le coach repasse sur « Amical », la contrainte disparaît : la bascule redevient activable, la sélection courante est conservée.
- Choisir « Officiel » **après** avoir déjà décoché : la sélection est conservée, seul le compteur et la règle changent. Aucune troncature silencieuse jamais (cohérent avec PO-CPS-08).
- Match officiel avant le choix de la compétition : aucun plafond affiché (le champ est vide, la soumission est de toute façon impossible).

**Champs côte à côte et tactile** : cette carte n'ajoute aucune paire de champs côte à côte (les paires Date/Heure et RDV existantes gardent `min-w-0` par `FIELD_ROW_CLASSNAME`, inchangées). Cibles : carte bascule (~72px), chaque ligne (`min-h-11`, ~56px en pratique), « Tout désélectionner » / « Tout sélectionner » (`h-11`, `px-2`), bouton « Réessayer » (`h-11`). À vérifier sur un viewport mobile réel (AC-CPS-20). `BackHeader` reste `sticky top-0`, opaque, ce qui est déjà le cas ; le formulaire est désormais long (comportement à vérifier à 20+ lignes).

**États de chargement / erreur / vide (liste des joueurs de l'équipe)**

- **Chargement** : en-tête avec compteur remplacé par un `Skeleton` court ; carte « Toute l'équipe » visible mais sa bascule inactive ; 3 `Skeleton` de ligne (`h-14 rounded-2xl`) ; bouton « Créer la convocation » désactivé (le plafond ne peut pas être évalué sans l'effectif).
- **Erreur de chargement** : carte à la place de la liste : « Impossible de charger les joueurs de l'équipe. » en `role="alert"` rouge + bouton « Réessayer » `h-11`, même rendu que l'erreur des lieux d'entraînement du formulaire (`CreateConvocationForm`). Soumission désactivée.
- **Équipe sans joueur** : `EmptyState` (composant existant) « Aucun joueur dans cette équipe. » à la place de la carte et de la liste ; soumission désactivée, message de fieldError « Cette équipe n'a aucun joueur à convoquer ».
- **Échec de la création** (refus base : plafond dépassé en concurrence, joueur non valide, erreur réseau) : message lisible dans la zone `fieldError` sticky (« Impossible de créer la convocation : <raison lisible> »), sélection conservée, rien n'est perdu ; le bouton redevient actif. Un refus de plafond renvoie le même message que l'alerte inline.

### 4. Ajout d'un convoqué après création (coach)

**Point d'entrée** : onglet **Effectif** du détail de convocation, vue coach, sous la liste `RosterList` : bouton secondaire pleine largeur « Convoquer un joueur » (`Button` shadcn outline, icône `IconUserPlus`, `h-11`, `border-white/20`). Choix du placement : c'est le candidat naturel du §1 et la liste des convoqués y est déjà ; pas d'entrée dans `ConvocationActionsMenu` (menu d'annulation/édition, une action de plus l'éloignerait de la liste concernée). Le bouton est **absent** (jamais grisé) pour tout autre rôle actif, pour un coach d'une autre équipe, pour une convocation non `open`, et après le coup d'envoi (PO-CPS-06, hypothèse retenue) ; la décision vient d'un booléen `canAddAttendee` calculé par le ViewModel via `can(..., 'convocation_attendee:add', ...)` + règle temporelle, la page ne fait que `if (canAddAttendee)`. Pas de bouton sur un match déjà joué ou une convocation annulée.

**Panneau** : un `Dialog` shadcn (bottom sheet mobile, comme le panneau « Remplacer » de la composition, `PlayerActionPanel`), titre « Convoquer un joueur ». Contenu : liste des **joueurs de l'équipe non encore convoqués**, lignes `min-h-11` pleine largeur identiques à `CandidateList` (avatar, nom, un tap = action), dans une zone `max-h-64 overflow-y-auto` si longue. Choix de l'ajout **un joueur par tap** (pas de multi-sélection ni de bouton de validation) : l'action est unitaire, annulable par fermeture avant le tap, et reste compatible avec l'ajout unique que prévoit le §1 (« un joueur »). Après un ajout réussi, le panneau se ferme et la ligne apparaît dans l'Effectif avec le badge « en attente » (AC-CPS-10). Pour ajouter un second joueur, le coach rouvre le panneau : acceptable car l'ajout est exceptionnel. Variante à valider : panneau qui reste ouvert (point de design 3).

**Compteur sur match officiel** : l'en-tête du panneau affiche « N / 14 convoqués » pour un match officiel (le nombre de convoqués actuel, pas du reste). Aucun compteur pour les autres types.

**États**

| État | Rendu |
|---|---|
| Chargement de la liste des non-convoqués | 3 `Skeleton` de ligne |
| Erreur de chargement | « Impossible de charger les joueurs. » `role="alert"` + « Réessayer » `h-11` |
| **Tous déjà convoqués** | `EmptyState` « Tous les joueurs de l'équipe sont déjà convoqués. », pas de liste. Le bouton « Convoquer un joueur » reste visible (le panneau explique) plutôt que d'être masqué selon un calcul de liste |
| **Plafond atteint** (match officiel déjà à 14 ou plus) | Le panneau s'ouvre, la liste n'est pas affichée : « Match officiel : 14 convoqués au maximum. Impossible d'en ajouter un autre. » (pas de lignes inactives à décoder). Le bouton d'entrée reste visible pour la même raison que ci-dessus |
| Écriture en cours (une ligne) | La ligne tapée affiche un indicateur de chargement et les autres lignes sont inertes jusqu'au retour (une seule écriture à la fois) |
| **Échec d'ajout** (refus base : plafond atteint en concurrence, convocation clôturée, hors fenêtre, réseau) | Panneau reste ouvert, message `role="alert"` sous la liste, lisible et distinct par cause : « Le plafond de 14 convoqués vient d'être atteint. », « Cette convocation n'accepte plus d'ajout. », « Impossible d'ajouter ce joueur. Réessayez. ». Liste rechargée pour refléter l'état réel |

Un joueur ajouté n'a **aucune** réponse, présence ni place de composition créées (AC-CPS-19) : il apparaît « en attente » côté Effectif, dans le vivier de composition et parmi les candidats au vote, rien de plus. Un joueur ajouté après l'échéance de réponse voit simplement l'état « fermé » de la réponse (PO-CPS-06, accepté).

### 5. Vues d'un joueur non convoqué (PO-CPS-03, PO-CPS-09)

Un non-convoqué est un membre de l'équipe pour la lecture ; les écrans existent à l'identique sauf les points suivants.

- **Effectif (vue joueur)** : `SelfRosterRow` (ligne « moi » avec boutons Présent / Absent) n'est **pas rendue** pour un non-convoqué. À sa place, une ligne d'information (même gabarit que `RosterRow`, sans boutons) : avatar + nom + libellé « Non convoqué(e) » en texte `text-white/60` (jamais un badge de réponse, jamais d'invite à répondre). La liste « Qui a répondu » en dessous ne montre que les convoqués (badge binaire inchangé). Le compteur « N convoqués » = nombre de convoqués (déjà le libellé existant du variant joueur) ; comme la ligne « moi » n'est plus comptée, il ne faut plus faire `others.length + 1` pour ce joueur : valeur à la charge du ViewModel (`RosterList` ne calcule que depuis des props, point à signaler au développeur, voir l'actuel `props.others.length + 1`).
- **Réponse** : pas de boutons Présent / Absent (absents, pas grisés). État clair « Non convoqué(e) pour cette convocation » (hypothèse PO-CPS-03, AC-CPS-16). Sur le Dashboard joueur (`NextConvocationCard`) : pas d'invite « à répondre », pas de boutons de réponse ; la carte reste cliquable vers le détail. À confirmer à la reprise de `specs/player-dashboard.md` (§7).
- **Votes** : le non-convoqué peut **voter** (fenêtre existante) mais n'est **pas dans la liste des candidats** (`VoteCandidateRow`). Un texte d'aide discret sous l'en-tête de la catégorie, uniquement pour lui, **évite qu'il se cherche** dans la liste : « Seuls les joueurs convoqués peuvent être élus. » Pour tous les votants, un non-convoqué est simplement absent de la liste des candidats (aucune mention d'un autre non-convoqué, §4 : pas de signal inféré).
- **Missions** : inchangé (inscription possible). Aucun bandeau particulier.
- **Composition (vivier « Remplacer », `CandidateList`)** : les non-convoqués n'apparaissent pas ; la phrase vide existante « Aucun autre joueur convoqué n'est disponible. » reste correcte et est conservée. Un coach qui cherche un joueur absent trouve le chemin par l'onglet Effectif (« Convoquer un joueur »). Optionnel, non bloquant : ajouter dans le panneau « Remplacer » vide un lien « Convoquer un joueur » (point de design 4).
- **Onglet Résultat** et reste du détail : inchangés, lecture seule.

### Points de design (non bloquants, à trancher à la revue)

1. **Bascule « Toute l'équipe » bloquée (équipe > 14 + Officiel)** : état « visible mais non activable avec explication » retenu plutôt que « bascule masquée » : la carte garde sa place et explique pourquoi. Si la développeuse préfère masquer la carte entière dans ce cas (liste seule), c'est une variation de deux lignes.
2. **Couleurs de l'option Amical** (vert `coach-green`, comme Domicile) : le vert est déjà « sélectionné/positif » dans l'app ; alternative neutre (`bg-white/20`) si le vert suggère à tort un « bon » choix.
3. **Panneau d'ajout qui se ferme après chaque ajout** (retenu) vs qui reste ouvert pour enchaîner : à ajuster si la saisie d'un lot de retardataires est fréquente.
4. **Lien « Convoquer un joueur » dans le panneau « Remplacer » vide** : raccourci utile, non demandé ; ne pas l'implémenter sans accord (évite d'élargir la portée de l'écran de composition).
5. **Visibilité du compteur sur une longue liste** : le compteur d'en-tête sort de l'écran quand on défile (équipe de 20+). Les messages bloquants sont répétés dans le `fieldError` sticky pour cette raison. Si cela ne suffit pas à la recette, le compteur peut être répété dans la barre sticky (« 14 / 14 »).
6. **Nom de l'icône coupe** : `IconTrophy` (bibliothèque Tabler déjà utilisée dans le projet) ; à confirmer en implémentation.
7. **Nouveaux composants à créer** : `OfficialMatchBadge`, `PlayerSelectRow`, panneau d'ajout (Dialog + lignes `CandidateList`) ; **à installer** : shadcn `Switch` ; **à étendre** : `SegmentedToggle` (`value: boolean | null`) ; **à supprimer** : `StaticSwitch`. Aucun autre primitif n'est nécessaire (`Alert`, `Skeleton`, `Dialog`, `Button` déjà vendus).
