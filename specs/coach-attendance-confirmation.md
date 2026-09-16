# Spec — Confirmation de présence par le coach

> Statut : **rédaction initiale** (product-owner-agent, 2026-09-16). 8 points ouverts (PO-AT-01 à PO-AT-08). Aucun ne bloque la transmission à designer-agent ; **PO-AT-01 (rôles autorisés au-delà du coach) et PO-AT-05 (validité de l'absence) bloquent l'implémentation complète** — la passe peut être construite pour le seul Coach/Staff sans les trancher, voir §5.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0 « Présences et suivi sportif » + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles), `specs/match_details_page.md` (écran hôte : §1 point 4, §2, AC-MD-06/10/11/12, PO-MD-04), `specs/create-convocation.md` (§2 non-matérialisation des destinataires, §4 données sensibles), `specs/coach-dashboard.md` (AC-CD-04, PO-6b), `specs/player-dashboard.md` (PO-PD-02, AC-PD-11).
> Maquette : `docs/designs/coach-attendance-confirmation/[v3] [Coach] Mob - Coach attendance confirmation.png`. **Aucune ligne dans `docs/designs/DESIGN_LINKS.md` §2 pour cette feature** — conformément au §4 du registre, le lien artifact est demandé **une seule fois** à la développeuse (voir PO-AT-08) et sera ajouté au registre par l'agent dès qu'il sera fourni ; l'export PNG ci-dessus tient lieu de référence en attendant.
> État du code lu pour cadrer : `domain/entities/convocation.ts` (`AttendanceRecord`, `ConvocationResponse`, `ActualStatus`, `AbsenceValidity`), `domain/repositories/attendance-record-repository.ts`, `domain/policies/{actions,rbac-matrix,can,convocation-closure,response-deadline}.ts`, `domain/rules/convocation-rules.ts`, `domain/usecases/convocation/GetConvocationRosterForCoachUseCase.ts`, `presentation/features/convocation/{useConvocationDetailViewModel.ts,components/EffectifTab.tsx}`, `presentation/shared/query-keys.ts`, `supabase/migrations/20260811171754_initial_schema.sql` (table + RLS `attendance_records`), `20260811171817_attendance_trigger.sql`.

## 1. Périmètre

Le coach **constate** la présence réelle de chaque joueur convoqué, en confirmant ou en contredisant la réponse que le joueur avait déclarée. Cas d'usage donné par la développeuse : un joueur a répondu « présent » et n'est pas venu — le coach le marque « absent ».

L'écran hôte existe déjà : c'est l'onglet **Effectif** de `ConvocationDetailPage` (`specs/match_details_page.md`), **variante coach**. Cette feature n'ajoute pas d'écran, elle ajoute une **action d'écriture** dans un onglet déjà construit, et **lève PO-MD-04** (« les présences constatées sont-elles affichées ici ? ») en tranchant : oui, côté coach, dans cet onglet.

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Présences et suivi sportif | **P0** | Saisie de l'**assiduité constatée** (`AttendanceRecord.actualStatus`) par le coach, joueur par joueur, pour une convocation de son équipe. Ni progression, ni évaluation, ni indisponibilité santé |

### Ce qui est nouveau vs. ce qui est réutilisé

**Déjà en place, à réutiliser sans le recréer :**

- `AttendanceRecord` (entité), `ActualStatus` (`'present' | 'absent'`), `AbsenceValidity` (`'excused' | 'unexcused'`) — `domain/entities/convocation.ts`.
- `AttendanceRecordRepository` (interface : `upsert`, `findByConvocation`) — `domain/repositories/attendance-record-repository.ts`.
- Table `public.attendance_records` avec contrainte `unique (convocation_id, user_id)` — l'upsert-on-conflict exigé par `CLAUDE.md` §6 est déjà tenu par le schéma.
- RLS `attendance_records_select_coach_admin` / `_insert_validate` / `_update_validate` — **coach de l'équipe ou administrateur uniquement**, `validated_by = auth.uid()` imposé à l'écriture.
- Trigger `attendance_records_close_convocation` + `isConvocationComplete` (`domain/policies/convocation-closure.ts`) — la clôture automatique est **déjà** pilotée par l'écriture d'`AttendanceRecord`.
- L'onglet Effectif coach : `GetConvocationRosterForCoachUseCase`, `EffectifTab`, `RosterList`, `RosterRow`, `ResponderStatusBadge`, `queryKeys.convocationRosterForCoach`.

**Réellement nouveau dans cette passe :**

- Une action RBAC explicite (`'attendance:validate'` dans `actions.ts` + `rbac-matrix.ts` + branche `can.ts`) — la migration initiale la réclame elle-même en commentaire : « no rbac-matrix.ts action exists for this yet […] Follow-up: rbac-matrix.ts / actions.ts should eventually gain an explicit 'attendance:validate' action to close the mirroring loop formally ».
- `AttendanceRecordRepositoryImpl` côté `data/` (+ DTO + mapper) — **absent du dépôt** aujourd'hui, l'interface domaine n'a aucune implémentation.
- Un use case de saisie (nom proposé : `ConfirmAttendanceUseCase`) et l'extension du use case de lecture de l'effectif coach pour porter, à côté du statut déclaré, la présence constatée.
- Une clé de query dédiée pour les `AttendanceRecord` d'une convocation.

### La règle centrale — deux entités, jamais fusionnées

`CLAUDE.md` §6 et `specs/match_details_page.md` AC-MD-06 : `ConvocationResponse` (intention déclarée par le joueur) et `AttendanceRecord` (fait constaté par le coach) restent **deux entités distinctes**. Cette feature est exactement le point où la tentation de les fusionner apparaît, puisque l'écran affiche les deux sur la même ligne. Conséquences non négociables :

- Confirmer une présence **n'écrit jamais** dans `convocation_responses`. Le coach ne « corrige » pas la réponse du joueur : il enregistre un fait à côté d'elle.
- La réponse déclarée du joueur reste visible et inchangée après confirmation (c'est ce qui rend l'écart lisible : « a dit présent, constaté absent »).
- L'agrégat existant en tête de l'onglet (`ResponseBar`, via `summarizeRosterStatuses`) **continue de compter des `ConvocationResponse`** (AC-MD-06, AC-CD-04). Un éventuel compteur de présences constatées est un **second** agrégat, jamais une modification de celui-là (PO-AT-04).

### Hors périmètre — explicitement

- **L'attribution de points et le classement** (« pour donner des points aux joueurs et faire un board »). C'est la **motivation** de la demande, pas son périmètre : ASC Legacy est **P1** et sa grille est « à valider par le Bureau **avant développement** » (CDC §8, point ouvert des deux documents de cadrage). Aucun point, aucun barème, aucun classement, aucune valeur statique dans cette passe. Cette feature se contente de produire la donnée source.
- **`AbsenceValidity` (excusée / non excusée) et `note`** : non saisis, non affichés, laissés `null` (PO-AT-05, PO-AT-06). La maquette ne montre que deux boutons (✓ / ✗), donc aucun choix excusée/non excusée ni champ de commentaire.
- **La restitution au joueur de sa propre présence constatée** : la RLS la lui refuse explicitement (`attendance_records_select_coach_admin`), PO-PD-02 reste non tranché (AC-PD-11). Rien n'est ouvert au joueur ici — voir PO-AT-07, qui est une vraie question et pas un simple report.
- **Le taux d'assiduité, l'historique de présence, toute statistique** : « Statistiques et exports » est **P1**.
- **La saisie en lot** (« tout le monde présent » en un tap) : non montrée par la maquette, non demandée (PO-AT-03).
- **La saisie en mode dégradé (hors connexion)** : la matrice n'accorde le mode dégradé qu'à la *consultation* d'une convocation, jamais à l'écriture — même règle que `specs/create-convocation.md` §1.
- **La source de vérité des « convoqués requis »** : toujours ouverte (PO-6b de `specs/coach-dashboard.md`). L'effectif vient de `ConvocationRespondersRepository` comme pour l'onglet Effectif coach actuel, et le trigger de clôture dérive `required_count` de `user_roles` (`role = 'player'`). Constat d'état, **à ne pas résoudre implicitement ici** — ne pas créer de table `convocation_attendees`.
- **Les onglets « Programme » et « Messagerie »** visibles sur la maquette : hors périmètre, voir §6.

## 2. RBAC

### Ligne de matrice applicable — et son trou

La matrice RBAC de `docs/priorisation-fonctionnelle-as-acaribbean.md` **ne comporte aucune ligne « Saisir une présence »**. Le module P0 « Présences et suivi sportif » désigne « Coach/Staff, Référent médical (santé), Joueur/Joueuse » comme rôles concernés, et la ligne la plus proche de la matrice est « **Saisir une évaluation sportive** » :

| Rôle | « Saisir une évaluation sportive » | Traduction retenue pour `attendance:validate` |
|---|---|---|
| Joueur/Joueuse | ❌ | ❌ — aucun point d'entrée rendu, même pour sa propre ligne. Le joueur déclare (`convocation:respond`), il ne constate jamais |
| **Coach/Staff** | ✅ (son équipe) | ✅ **son équipe** — seul rôle réellement fondé et seul rôle construit dans cette passe. Déjà tenu en RLS par `private.is_coach_of_team(c.team_id)` |
| Responsable de section | ❌ | **Ouvert, non accordé dans cette passe** (PO-AT-01). La ligne la plus proche lui dit ❌, la RLS actuelle ne le couvre pas, et la personne « Responsable de section » du CDC porte « effectifs » et « rapports » — jamais la saisie sportive. Ne pas l'ajouter sans arbitrage |
| Dirigeant habilité | ❌ | ❌ — aucun accès en écriture |
| Trésorier | ❌ | ❌ |
| Référent médical | ❌ | ❌ sur cette action. Son périmètre est la santé, écran distinct et tracé — une absence pour raison médicale **n'est pas** un `AttendanceRecord` (§3) |
| Bénévole | ❌ | ❌ |
| Administrateur | ❌ (hors « Gérer comptes, rôles, paramétrage » ✅) | **Ouvert, mais statu quo conservé** (PO-AT-01). La RLS actuelle lui accorde déjà `insert`/`update`, sur la base du commentaire de champ `AttendanceRecord.validatedBy` (« userId of the coach or admin ») ; la matrice ne fonde pas cette écriture. Aucun point d'entrée UI admin n'est construit |

**Décision de cadrage** : cette passe implémente **`'attendance:validate': ['coach']`, scopé à l'équipe**, plus la conservation à l'identique de la branche admin déjà présente en RLS. C'est le seul périmètre entièrement fondé par les documents de cadrage. Toute extension (`section-manager`, `authorized-officer`) passe par PO-AT-01, pas par une lecture extensive de la ligne « évaluation sportive ».

### Lecture

La lecture des `AttendanceRecord` reste **RLS-only, sans entrée de matrice** — critère commenté en tête de `rbac-matrix.ts` : la variante d'écran (joueur / coach) est déjà décidée par `useActiveRole()` + `hasActiveRoleForConvocation`, et l'onglet ne change pas de structure selon le contenu retourné. L'entrée de matrice n'existe que pour l'**écriture**, parce que `presentation/` doit décider de rendre ou non les deux boutons avant toute requête.

### Application technique

`can()` est de l'ergonomie, la RLS est la sécurité (`CLAUDE.md` §6). La branche `coach` de `can.ts` teste aujourd'hui `assignment.teamIds.includes(context.teamId)` **uniquement pour `'convocation:create'`** (`action !== 'convocation:create' || …`) : ajouter `'attendance:validate'` à la matrice **sans étendre cette condition** laisserait un coach valider une présence sur l'équipe d'un autre coach côté UI. La RLS le refuserait, mais le bouton serait rendu — écart exactement du même type que celui déjà corrigé pour `section-manager` (`specs/create-convocation.md` §3). La condition doit couvrir les deux actions.

**Règle d'affichage** (moindre privilège) : les boutons de confirmation sont **absents** pour tout rôle non autorisé, jamais grisés ni suivis d'une erreur au clic.

## 3. Données sensibles

### Données de santé — aucune, mais deux vecteurs d'entrée à tenir fermés

Aucune donnée de santé, d'aptitude ni de diagnostic n'est saisie ni affichée (AC-MD-18, AC-PD-08). Deux champs d'`AttendanceRecord` sont toutefois des vecteurs, et c'est la raison principale de les garder hors périmètre :

1. **`note` (texte libre du coach)** — même nature de risque que `ConvocationResponse.reason` : un champ libre finit par recueillir « blessure au genou ». **Non saisi, non affiché, laissé `null`** tant que le **référent RGPD** n'a pas tranché (PO-AT-06), par cohérence avec AC-MD-12 / AC-PD-08, qui ferment déjà `reason` pour la même raison.
2. **`absenceValidity = 'excused'`** — une absence « excusée » est, en pratique, très souvent excusée pour raison médicale. Le champ ne contient pas de diagnostic, mais il en est un proxy lisible par tout coach de l'équipe. **Non saisi dans cette passe** (PO-AT-05).

Corollaire à ne pas perdre de vue : l'indisponibilité santé du module P0 « Présences et suivi sportif » relève du **Référent médical** et d'un écran distinct et tracé (matrice : « Consulter une donnée de santé ✅ Référent médical, tracé »). Elle ne doit **jamais** être modélisée comme un `AttendanceRecord`.

### Données financières — aucune

Aucun statut de cotisation, montant ni relance. Module Cotisations **P1**.

### Données personnelles de tiers

L'écran affiche des noms et des postes de joueurs convoqués — exactement ce que l'onglet Effectif coach affiche déjà via `get_convocation_responders` (`specs/match_details_page.md` §3). Cette feature **n'élargit aucune lecture nominative** : elle ajoute une écriture sur des lignes dont l'identité est déjà lisible par le coach. Rien de nouveau à minimiser.

En revanche, la donnée produite est d'une nature nouvelle dans le projet : un **jugement nominatif porté par un tiers sur un membre**, contredisant possiblement la déclaration de ce membre. La responsabilité est portée dans la ligne elle-même (`validatedBy`, `validatedAt`, `not null` tous les deux — même raisonnement que `createdBy`, `specs/create-convocation.md` §4). C'est ce qui rend PO-AT-07 (le joueur peut-il voir ce qui est constaté à son sujet ?) une vraie question et non un détail d'affichage.

### Journal d'audit — à trancher, pas à omettre

- **Le CDC §11.3 ne liste pas la saisie de présence** parmi les actions sensibles (création/suppression de compte, changement de rôle, consultation de donnée santé, modification de paiement, **correction de points Legacy**, export nominatif). Lu littéralement : aucune journalisation requise.
- ⚠️ **Mais** : le CDC §11.3 vise explicitement la « correction points Legacy », et la motivation déclarée de cette feature est précisément d'alimenter les points Legacy. Le jour où un `AttendanceRecord` alimentera un barème, **le corriger après coup équivaudra fonctionnellement à corriger des points** — donc à une action à tracer. À poser au Bureau et au référent RGPD **avant** que le module Legacy ne soit construit, pas après (PO-AT-02).
- ⚠️ Si la journalisation est retenue, elle sera **appelée depuis le use case** dans `domain/`, jamais depuis un composant : c'est une **action métier** (intention/motif d'une correction), pas un accès en lecture — `CLAUDE.md` §6.
- ⚠️ **La table de journal d'audit reste absente de `supabase/migrations/`** : exigence transversale P0 non résolue, distincte de cette feature (constat déjà porté par `specs/create-convocation.md` §4 et `specs/match_details_page.md` §3).

### Export — aucun

Aucun export, aucune fonction de copie, pour aucun rôle, depuis cet onglet.

## 4. Critères d'acceptation

**AC-01** et **AC-02** sont ceux de la section 17.2 du CDC. Les critères propres à cette feature sont préfixés `AC-AT-`, même convention que `AC-CD-`, `AC-PD-`, `AC-CV-`, `AC-MD-` ; à renuméroter en recette.

| Réf. | Critère |
|---|---|
| **AC-01** | Aucune donnée d'un membre extérieur à l'équipe de la convocation n'est accessible, ni à l'écran ni dans la réponse API |
| **AC-02** | Un coach de l'équipe A qui tente de confirmer une présence sur une convocation de l'équipe B est refusé **par la base**, pas seulement par l'interface. Vérifié par appel direct à l'API, hors application |
| AC-AT-01 | Confirmer une présence **n'écrit jamais** dans `convocation_responses` : après confirmation, la `ConvocationResponse` du joueur (statut **et** `reason`) est inchangée, octet pour octet |
| AC-AT-02 | Un joueur ayant déclaré « présent » et marqué « absent » par le coach produit **deux valeurs distinctes coexistantes** : `ConvocationResponse.status = 'present'` et `AttendanceRecord.actualStatus = 'absent'`. C'est le cas d'usage fondateur de la feature — il doit être testable tel quel |
| AC-AT-03 | Confirmer deux fois le même joueur ne crée pas deux lignes : **une seule ligne** par `(convocation_id, user_id)` dans `attendance_records`, dernière valeur gagne (upsert-on-conflict, `CLAUDE.md` §6). Vaut aussi pour un changement d'avis présent → absent → présent |
| AC-AT-04 | `validated_by` est **toujours** l'utilisateur authentifié ayant écrit la ligne, imposé par la base ; une écriture avec un `validated_by` d'un tiers est refusée par la RLS |
| AC-AT-05 | L'agrégat en tête de l'onglet Effectif (`ResponseBar`) reste calculé **exclusivement** sur les `ConvocationResponse` : confirmer une présence ne modifie **aucun** de ses trois compteurs (régression d'AC-MD-06 / AC-CD-04) |
| AC-AT-06 | Les boutons de confirmation sont **absents** (pas grisés) pour un jeton joueur, y compris sur sa propre ligne, et pour tout rôle hors `attendance:validate` |
| AC-AT-07 | Aucun `AttendanceRecord` n'est rendu **ni requêté** pour un jeton joueur — ni statut constaté d'un tiers, ni le sien (AC-PD-11, PO-PD-02 / PO-AT-07 non tranchés). Vérifié par appel direct à l'API |
| AC-AT-08 | `AttendanceRecord.note` et `AttendanceRecord.absenceValidity` ne sont **ni affichés, ni saisissables**, pour aucun rôle ; toute ligne créée par cet écran les laisse `null` (§3) |
| AC-AT-09 | Aucun point, palier, badge ni classement ASC Legacy n'est rendu, **même avec une valeur statique** (CDC §8 : grille à valider avant développement) |
| AC-AT-10 | Confirmer le dernier joueur requis fait passer la convocation en `closed` **par le trigger existant**, et non par une écriture applicative sur `convocations` : `status`, `closed_at` et `closed_by` sont positionnés côté base (`attendance_records_close_convocation`). Aucun `UPDATE` sur `convocations` n'est émis par le client |
| AC-AT-11 | Une convocation passée en `closed` par cette clôture automatique continue de rendre l'onglet Effectif normalement ; l'action de réponse joueur disparaît d'elle-même via `canPlayerRespond` (qui exige `status === 'open'`) — **absence, pas désactivation** (AC-MD-13) |
| AC-AT-12 | Un joueur convoqué sans aucune ligne `attendance_records` est rendu **dans la liste**, à l'état « non confirmé », jamais absent de la liste ni pré-rempli à partir de sa réponse déclarée (même règle que AC-MD-09) |
| AC-AT-13 | L'état « non confirmé » (aucun `AttendanceRecord`) et l'état « confirmé absent » sont **visuellement et textuellement distincts** — jamais le même rendu, jamais la seule couleur pour les distinguer (AC-MD-22) |
| AC-AT-14 | Les deux contrôles de confirmation ont une cible tactile d'au moins ~44px (`h-11`), vérifiée sur un viewport mobile réel (`CLAUDE.md` §6, AC-MD-23) |
| AC-AT-15 | Toute information portée par la couleur (statut déclaré, statut constaté, écart entre les deux) est doublée d'un libellé textuel ; contrastes AA et navigation clavier opérationnelle (CDC §12) |
| AC-AT-16 | L'en-tête à flèche retour reste visible pendant le défilement d'une liste d'effectif longue (`sticky top-0`, fond opaque — `CLAUDE.md` §6, AC-MD-20) |

## 5. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-AT-01** | **Quels rôles au-delà du Coach/Staff peuvent confirmer une présence ?** La matrice n'a **aucune ligne « saisir une présence »** ; la ligne la plus proche (« Saisir une évaluation sportive ») donne ❌ à *tous* les autres rôles, **y compris Administrateur**, alors que la RLS en place accorde déjà `insert`/`update` à l'admin sur la base d'un commentaire de champ. Trois sous-questions : (a) le Responsable de section, que la développeuse pressent comme titulaire, doit-il l'obtenir alors que la matrice lui dit ❌ ? (b) l'écriture admin déjà en RLS est-elle confirmée ou à restreindre ? (c) faut-il ajouter une ligne dédiée à la matrice du CDC plutôt que d'interpréter celle de l'évaluation sportive ? | Bureau (matrice CDC) + développeuse | **Oui pour l'extension**, non pour la passe coach : `['coach']` scopé équipe est entièrement fondé et suffit à livrer la maquette |
| **PO-AT-02** | **La confirmation, et surtout sa correction après coup, sont-elles des actions à journaliser ?** Non listées telles quelles au CDC §11.3, mais « correction points Legacy » y figure, et cette donnée est destinée à alimenter les points. `validatedBy`/`validatedAt` portent déjà la responsabilité dans la ligne ; ce qu'ils ne portent pas, c'est l'**historique** (une correction écrase la valeur précédente sans trace) ni le **motif**. À trancher avant que le module Legacy ne soit construit | Bureau + référent RGPD | Non — aucune table de journal d'audit n'existe de toute façon (exigence P0 distincte) |
| **PO-AT-03** | **Jusqu'à quand, et à partir de quand, une présence est-elle confirmable ?** Le commentaire d'entité dit « submitted at or after the event », mais rien ne l'impose : ni contrainte de schéma, ni règle dans `domain/rules/`. Un coach peut donc aujourd'hui confirmer des présences sur un entraînement de la semaine prochaine, et y déclencher sa clôture automatique. Faut-il une fenêtre (ex. à partir de l'heure de début, jusqu'à J+n), et une correction reste-t-elle possible après clôture — la RLS `_update_validate` ne teste pas `status` ? Question jumelle : la saisie en lot (« tous présents ») est-elle souhaitée ? | Bureau + développeuse | Non — mais c'est le point le plus susceptible de produire un comportement surprenant en recette |
| **PO-AT-04** | **Quels compteurs affiche l'en-tête de l'onglet ?** La maquette montre `✓4 ✗1 ?1` en haut de la liste, sans indiquer s'ils portent sur les réponses déclarées ou sur les présences constatées. Contrainte dure quelle que soit la réponse : les deux agrégats ne se confondent jamais (AC-AT-05) ; s'il y en a deux, ils sont étiquetés distinctement | Développeuse + designer-agent | Non |
| **PO-AT-05** | **L'absence excusée / non excusée est-elle saisie ?** `AbsenceValidity` existe dans l'entité et en base mais n'apparaît pas sur la maquette (deux boutons seulement). C'est très probablement la distinction dont le futur barème Legacy aura besoin (une absence excusée ne devrait pas coûter comme une absence sèche) — donc un champ qu'il vaut mieux trancher **avec** la grille qu'après. Contrainte RGPD associée : « excusée » est un proxy de motif médical (§3) | Bureau (avec la grille Legacy) + référent RGPD | **Oui pour le champ lui-même** ; non pour la passe, qui le laisse `null` |
| **PO-AT-06** | **`AttendanceRecord.note` (texte libre du coach) est-il saisissable ?** Même vecteur de donnée de santé que `ConvocationResponse.reason`, lui-même suspendu à PO-PD-03, non tranché, et le **référent RGPD n'est toujours pas désigné** (`docs/GOUVERNANCE.md`). Laissé `null` (AC-AT-08) | Référent RGPD | Non |
| **PO-AT-07** | **Le joueur peut-il voir sa propre présence constatée ?** La RLS la lui refuse et PO-PD-02 est « left closed/undecided ». Conséquence assumée aujourd'hui, à énoncer plutôt qu'à laisser implicite : **un coach peut marquer un joueur absent sans que ce joueur puisse le voir ni le contester**, alors que cette donnée le concerne nominativement et alimentera ses points. C'est autant une question RGPD (accès de la personne à ses propres données) qu'un choix produit | Bureau + référent RGPD | Non pour cette passe (statu quo : rien n'est ouvert au joueur, AC-AT-07) |
| **PO-AT-08** | **Aucune ligne de registre dans `docs/designs/DESIGN_LINKS.md` §2 pour cette feature** ; seul l'export PNG local existe. Le lien artifact est demandé une seule fois (§4 du registre) et sera inscrit par l'agent dès réception. Question annexe : la maquette ne couvre que l'**entraînement** — la demande vise « training or match », et l'entité/le trigger ne distinguent aucun type. La réunion (`meeting`) est-elle aussi concernée, sachant que le trigger de clôture s'y appliquerait à l'identique ? | Développeuse | Non |

### Ce qui reste explicitement OPEN et ne doit pas être résolu implicitement

- **La source de vérité des « convoqués requis »** (PO-6b de `specs/coach-dashboard.md`) : l'effectif vient de l'appartenance d'équipe, faute d'alternative. Le trigger de clôture en dépend directement (`required_count` = `user_roles` où `role = 'player'`), donc un changement d'effectif entre la convocation et la confirmation peut faire varier le seuil de clôture. Constat d'état, pas résolution — **ne pas créer de table `convocation_attendees`, ne pas construire de snapshot d'effectif.**
- **La grille ASC Legacy** : ne pas anticiper un barème, un champ de pondération ou une colonne « points » sur `attendance_records`.

## 6. Note pour designer-agent

- **Maquette** : `docs/designs/coach-attendance-confirmation/[v3] [Coach] Mob - Coach attendance confirmation.png`. Pas de ligne de registre (PO-AT-08) ; cet export tient lieu de référence.
- **Ce n'est pas un nouvel écran.** C'est la **variante coach de l'onglet Effectif déjà construit** (`EffectifTab`, `RosterList`, `RosterRow`, `ResponderStatusBadge`) à laquelle s'ajoute une action par ligne. Ne pas reconcevoir l'en-tête, le hero, la barre d'onglets ni la silhouette de ligne — ils existent en code.
- **Corrections obligatoires vs maquette** (constats de cadrage, pas des choix à refaire) :
  1. **Onglets « Programme » et « Messagerie »** → supprimés entièrement, pas grisés. `training_details` est un nom réservé sans table ni forme définie (`specs/create-convocation.md` §7) ; Communication est **P1**. Même correction que celle déjà appliquée à « Compo » / « Votes » / « Messagerie » sur l'écran hôte.
  2. **Libellé de l'onglet** : l'écran construit a deux onglets, **Infos** et **Effectif** ; la maquette dit « Présences ». La demande de la développeuse dit « in effectif tab ». Ne pas créer un troisième onglet — trancher entre garder « Effectif » (cohérence avec le code) ou le renommer, et l'appliquer aux deux variantes de rôle.
  3. **Compteurs `✓4 ✗1 ?1`** de l'en-tête de liste : source non établie (PO-AT-04). Contrainte dure : ils ne peuvent pas remplacer ni absorber l'agrégat `ResponseBar` des réponses déclarées (AC-AT-05).
  4. **Aucun choix « excusée / non excusée », aucun champ de commentaire** (AC-AT-08, PO-AT-05/06) — la maquette est déjà conforme, à ne pas « compléter ».
- **Trois états par ligne, pas deux** (AC-AT-12, AC-AT-13) : non confirmé / confirmé présent / confirmé absent. Chaque ligne porte **en plus** le statut déclaré du joueur, déjà rendu par `ResponderStatusBadge` — c'est la coexistence des deux qui fait la valeur de l'écran. **L'écart entre déclaré et constaté doit être lisible**, et par autre chose que la couleur seule (AC-AT-15).
- **Ne jamais pré-remplir le constat à partir du déclaré** (AC-AT-12) : une ligne non confirmée n'affiche pas un « présent » présumé. Un pré-remplissage effacerait exactement l'information que le coach vient vérifier.
- **Cibles tactiles** : les deux contrôles (✓ / ✗) sont petits et côte à côte sur la maquette — minimum ~44px (`h-11`), à vérifier sur un viewport mobile réel (AC-AT-14). Si deux contrôles voisins dans un conteneur `flex`/`grid`, penser `min-w-0` (`CLAUDE.md` §6).
- **Un état de confirmation en cours / échouée est à couvrir** : une écriture par ligne, plusieurs lignes confirmables d'affilée. Pas de blocage de toute la liste pour une ligne en vol.
- **États à couvrir** : effectif entièrement non confirmé (état normal, pas un état vide) ; convocation `closed` par la clôture automatique déclenchée depuis cet écran (AC-AT-11) ; jeton joueur (aucun bouton, aucun statut constaté — AC-AT-06/07).
- Rappel `CLAUDE.md` §9 : les prénoms et noms figurant sur la maquette ne doivent apparaître **nulle part** dans le code, les tests ou la documentation.

## 7. Note pour mentor-agent

- **Ordre de dépendance** : `actions.ts` + `rbac-matrix.ts` + `can.ts` (avec la condition de portée équipe étendue à la nouvelle action, §2) → `AttendanceRecordRepositoryImpl` + DTO + mapper (absents du dépôt) → use case de saisie → extension du use case de lecture de l'effectif coach → `presentation/`.
- **`can.ts` : ne pas ajouter l'action à la matrice sans étendre la branche `coach`.** Sa condition actuelle est `action !== 'convocation:create' || assignment.teamIds.includes(context.teamId)` — une nouvelle action non nommée y passe **sans contrôle d'équipe**. Même classe d'écart que celui corrigé pour `section-manager`.
- **Clé de query dédiée** dans `presentation/shared/query-keys.ts`, forme `[ressource, ...discriminants]`. Si la lecture des présences constatées est fusionnée dans la forme retournée par `GetConvocationRosterForCoachUseCase`, `convocationRosterForCoach` suffit et doit être invalidée après chaque confirmation ; si c'est une requête distincte, c'est une clé distincte (précédent posé : « deux clés distinctes quand la forme retournée diffère »).
- **La clôture est déjà automatique — ne pas la réimplémenter.** Le trigger `attendance_records_close_convocation` s'exécute à chaque `insert`/`update` sur `attendance_records`. Aucun `UPDATE` client sur `convocations` (AC-AT-10) ; aucune politique RLS `UPDATE` n'existe d'ailleurs sur cette table. Conséquence à intégrer dans l'invalidation de cache : confirmer une présence peut changer le `status` de la convocation, donc `queryKeys.convocationDetail` est à invalider aussi, pas seulement l'effectif.
- **Tests par ordre de priorité** (`CLAUDE.md` §8) : `can.test.ts` étendu à la nouvelle action (portée équipe incluse) → use case de saisie → mapper. Le cas d'AC-AT-02 (« déclaré présent, constaté absent ») doit être un test nommé, pas un effet de bord d'un autre test.
- **Tests RLS contre la base, jamais contre le rendu** — leçon d'AC-MD-08. AC-01/AC-02 et AC-AT-04/AC-AT-07 se vérifient par appel direct à l'API avec un jeton coach et un jeton joueur. ⚠️ **PO-MD-10 reste ouvert** : le dépôt n'a toujours pas d'infrastructure pour obtenir une session Supabase authentifiée depuis un test Vitest, donc ces critères risquent de rester des `it.todo` comme les cinq de `ConvocationRespondersRepositoryImpl.rls.test.ts`. À signaler plutôt qu'à contourner.
- **Ne pas implémenter dans cette passe** : saisie de `absenceValidity` ou `note`, lecture joueur des `AttendanceRecord`, table de journal d'audit, saisie en lot, tout barème ou classement Legacy, ajout de `section-manager` / `authorized-officer` à la nouvelle action (PO-AT-01).

## UI design

### Sources utilisées, par ordre de priorité effectif

1. **`docs/designs/DESIGN_LINKS.md` §2** — **aucune ligne** pour cette feature. Conformément au §4 du registre, le lien artifact aurait dû être demandé une seule fois à la développeuse ; c'est déjà fait, à travers PO-AT-08 (§5 du présent spec), qui documente précisément cette absence et enregistre la question comme posée et non bloquante. Aucune redemande ici. L'export PNG local (point 2 ci-dessous) tient lieu de référence, comme prévu par le §1 du registre. Si un lien artifact vivant est un jour fourni, il revient à qui reçoit la réponse de l'ajouter au registre (§4) — pas de ligne ajoutée dans cette passe faute d'URL à inscrire.
2. **`docs/designs/coach-attendance-confirmation/[v3] [Coach] Mob - Coach attendance confirmation.png`** — lue directement. Un seul écran : en-tête, hero « Entraînement — Seniors », quatre onglets (Infos, **Présences**, Programme, Messagerie), compteur `✓4 ✗1 ?1`, puis une liste de joueuses où chaque ligne porte un badge de statut déclaré (Présent/Absent/En attente) suivi d'un libellé « CONFIRMER LA PRÉSENCE » et de deux petits boutons ronds ✓/✗.
3. **§6 du présent spec** (« Note pour designer-agent ») — autoritaire sur les corrections à appliquer avant toute conception ; reproduites et appliquées ci-dessous, pas rediscutées.
4. **Code déjà construit, réutilisé sans le redessiner** : `presentation/features/convocation/{ConvocationDetailPage.tsx,components/{BackHeader,ConvocationHero,EffectifTab,RosterList,RosterRow,ResponderStatusBadge,SelfRosterRow}.tsx}`, `presentation/shared/components/{ResponseActions.tsx,ResponseBar.tsx}`, `presentation/shared/components/ui/{button,badge,separator}.tsx`.
5. **`specs/match_details_page.md`, section « UI design »** — écran hôte, même conventions (icônes `@tabler/icons-react`, palette `coach-green`/`coach-red`/blanc atténué, `sticky top-0` du `BackHeader`, `Tabs` shadcn overridées sur le thème sombre).

### Emplacement dans la nav

Ce n'est **pas** un nouvel écran, et ce n'est **pas** non plus un cinquième onglet ou une nouvelle destination : c'est la **variante coach de l'onglet « Effectif »** déjà construit sur `ConvocationDetailPage` (`presentation/features/convocation/ConvocationDetailPage.tsx`), lui-même une route plein écran poussée par-dessus l'onglet Calendrier/Dashboard d'origine (hors `AppShell`, sans barre de nav basse — patron déjà posé par `specs/match_details_page.md` §"Emplacement dans la nav" pour ce même écran hôte, non redécidé ici). Aucun des 4 écrans de nav fixes n'est modifié directement ; cette feature ajoute une action d'écriture à l'intérieur d'un onglet d'une route qui, elle, est déjà atteignable depuis Calendrier/Dashboard.

**Décision de nommage d'onglet** (corrections obligatoires du §6, point 2 — « ne pas créer un troisième onglet ») : l'onglet reste **« Effectif »**, pas « Présences ». Motif : le libellé « Présences » de la maquette n'a pas de statut privilégié sur celui déjà choisi et codé pour l'onglet hôte (`specs/match_details_page.md`), et changer le libellé casserait la cohérence entre les deux variantes de rôle du même écran (le joueur voit aussi un onglet « Effectif », jamais « Présences ») pour un gain nul — le contenu de l'onglet, pas son nom, porte la nouveauté de cette feature.

**Onglets « Programme » et « Messagerie »** : supprimés entièrement, pas grisés — même correction que celle déjà appliquée sur l'écran hôte pour « Compo »/« Votes »/« Messagerie » (`specs/match_details_page.md` §"Corrections obligatoires vs maquette", point 2). Aucune table `training_details`, aucune entité de messagerie dans le schéma ; Communication est P1. Seuls **Infos** et **Effectif** subsistent, sur les deux variantes de rôle, sans changement à `TabsList`.

### Ce qui change par rôle

Reprend le §2 du présent spec (RBAC), rien de redéfini ici :

| Rôle | Ce qu'il voit sur l'onglet Effectif |
|---|---|
| **Coach/Staff, son équipe** | Inchangé (badge de statut déclaré + `ResponseBar`) **plus** le nouveau contrôle de confirmation par ligne décrit ci-dessous — seul rôle pour lequel cette feature ajoute quelque chose de visible |
| Joueur/Joueuse | **Rien ne change**, y compris sur sa propre ligne (`SelfRosterRow`) : aucun `AttendanceRecord` n'est requêté ni rendu pour un jeton joueur (AC-AT-06, AC-AT-07). Un joueur ne voit jamais qu'un coach l'a marqué absent — conséquence assumée de PO-AT-07, non tranché, pas une omission de cette passe |
| Administrateur | La RLS continue d'autoriser l'écriture (statu quo, §2), mais **aucun point d'entrée UI n'est construit** pour ce rôle dans cette passe — pas de bouton, pas d'écran admin équivalent. Une extension future passerait par une décision explicite, pas par un héritage silencieux de la RLS |
| Responsable de section, Dirigeant habilité, Trésorier, Référent médical, Bénévole | Aucun accès — les boutons de confirmation sont **absents**, jamais grisés (AC-AT-06) |

### Composants réutilisés tels quels

- `BackHeader` (`sticky top-0`, `size-11`), `ConvocationHero`, la structure `Tabs`/`TabsList`/`TabsTrigger` Infos-Effectif, `EffectifTab` (branche `variant: 'coach'` : `ResponseBar` en tête, calculée exclusivement sur `ConvocationResponse`, **inchangée** — AC-AT-05).
- `RosterList` (branche coach) et `RosterRow` : **la ligne d'identité (avatar, nom, poste, badge de statut déclaré tri-état via `ResponderStatusBadge`) ne change pas du tout.** C'est délibéré : le déclaré reste exactement où le coach le lit déjà aujourd'hui, pour que la coexistence déclaré/constaté (§1 du spec, « la règle centrale ») se lise comme deux informations sur la même ligne plutôt que comme une refonte.
- `Separator`, motif de bouton `Button` `size="icon"` overridé en `size-11` (déjà établi par `BackHeader`), icônes `@tabler/icons-react` (`IconCheck`/`IconX`, symétriques d'`IconChevronLeft` déjà utilisé).

### Nouveau composant — contrôle de confirmation par ligne

Pas un nouveau pattern visuel : **reprend directement la silhouette à deux lignes déjà construite par `SelfRosterRow`** (ligne d'identité, séparateur, puis ligne d'action avec un libellé à gauche et des contrôles à droite) — seulement appliquée par le coach à la ligne d'un *autre* joueur plutôt qu'à sa propre ligne. Concrètement, pour la branche coach de `RosterList` seulement, chaque `RosterRow` gagne une seconde partie (nommée ici `AttendanceConfirmRow`, extension de `RosterRow` plutôt que nouveau composant autonome) :

1. **Ligne d'identité** — inchangée (voir ci-dessus).
2. **`Separator`** — réutilisé tel quel (`SelfRosterRow`).
3. **Ligne de confirmation**, nouvelle :
   - À gauche, un **libellé textuel d'état** (`flex-1`, mêmes classes typographiques que le `responsePrompt` de `SelfRosterRow`) : « Non confirmée » (aucun `AttendanceRecord`, gris atténué) / « Présence confirmée » (vert) / « Absence confirmée » (rouge). Ce libellé est ce qui rend AC-AT-13 et AC-AT-15 tenables sans dépendre de la seule couleur des boutons : les trois états s'énoncent en toutes lettres, pas seulement par le remplissage d'un bouton.
   - À droite (`ml-auto shrink-0`, `flex gap-2`), **deux boutons icône ronds** — `Button size="icon"` overridé en `size-11` (44px, pas le `size-8` par défaut de shadcn — AC-AT-14, `CLAUDE.md` §6), `IconCheck` (« Confirmer présent ») et `IconX` (« Confirmer absent ») de `@tabler/icons-react`, chacun avec un `aria-label` explicite puisqu'aucun des deux ne porte de texte visible.
   - **Choix délibéré de garder des boutons icône ronds** (plutôt que de réutiliser les pastilles texte « Présent »/« Absent » de `ResponseActions`) : la maquette les distingue déjà visuellement des badges déclarés, et cette distinction sert la règle centrale du spec (§1 : « deux entités, jamais fusionnées ») — le contrôle qui écrit un `AttendanceRecord` ne doit jamais ressembler au contrôle qui écrit une `ConvocationResponse`, pour qu'un coach ne confonde jamais les deux actions au premier coup d'œil.
   - **`min-w-0` / `shrink-0`** (`CLAUDE.md` §6) : le libellé de gauche est le champ qui doit pouvoir se compresser (`min-w-0`, texte tronqué si besoin sur un très petit écran) ; le groupe de deux boutons est au contraire `shrink-0` — ce sont des cibles tactiles de taille fixe, elles ne doivent jamais rétrécir sous 44px pour laisser de la place au texte. C'est l'inverse du cas Date/Heure classique (deux champs qui doivent tous les deux rétrécir) : ici un seul des deux éléments de la ligne a le droit de céder de la place.

**États des deux boutons** (jamais de pré-remplissage à partir du déclaré — AC-AT-12) :

| État | Bouton ✓ | Bouton ✗ |
|---|---|---|
| Non confirmé (aucune ligne `attendance_records`) | contour neutre, non rempli | contour neutre, non rempli |
| Confirmé présent | rempli `coach-green` | contour neutre |
| Confirmé absent | contour neutre | rempli `coach-red` |

Un tap sur le bouton déjà sélectionné est un no-op visuel mais déclenche quand même l'upsert (AC-AT-03 : dernière valeur gagne, idempotent). Il n'existe **aucun troisième bouton, aucun champ de commentaire, aucun choix excusée/non excusée** (AC-AT-08, PO-AT-05/06) — la maquette est déjà conforme sur ce point, non modifiée.

### État d'écriture en cours / échouée, par ligne

Le spec (§6) demande explicitement de couvrir « une écriture par ligne, plusieurs lignes confirmables d'affilée, pas de blocage de toute la liste pour une ligne en vol » :

- **En vol** : les deux boutons de la ligne concernée passent en état désactivé/atténué le temps de l'upsert ; les autres lignes restent pleinement interactives. Il ne s'agit pas d'un état « permission refusée » (donc pas la règle « jamais grisé » des cartes de menu/boutons RBAC) mais d'un état de chargement transitoire, la même sémantique que n'importe quel bouton de soumission ailleurs dans l'app.
- **Échec** : le libellé de gauche est remplacé, pour cette ligne seulement, par un court message d'erreur en rouge (« Échec, réessayer ») ; les boutons se réactivent immédiatement. Pas d'`Alert` plein écran ni de blocage de la liste — un message global unique (comme `vm.respondError` aujourd'hui pour les réponses déclarées) attribuerait mal l'échec si plusieurs lignes sont confirmées à la suite. **Ce micro-pattern (texte d'erreur inline par ligne plutôt qu'`Alert` global) est net-new** — une variante mineure de la convention d'erreur déjà en place, pas un nouveau composant de type toast/snackbar ; signalé en question ouverte ci-dessous pour confirmation avant implémentation, plutôt que supposé silencieusement.

### Trois états par ligne, jamais deux (AC-AT-12, AC-AT-13)

| État constaté | Déclenché par | Rendu |
|---|---|---|
| Non confirmé | Aucun `AttendanceRecord` (cas par défaut, y compris pour tout l'effectif si le coach n'a encore rien saisi) | Libellé « Non confirmée » + deux boutons neutres |
| Confirmé présent | `actualStatus = 'present'` | Libellé « Présence confirmée » + bouton ✓ rempli vert |
| Confirmé absent | `actualStatus = 'absent'` | Libellé « Absence confirmée » + bouton ✗ rempli rouge |

Un effectif entièrement non confirmé (aucune saisie encore faite par le coach) est un **état normal**, pas un état vide spécial — chaque ligne rend simplement « Non confirmée », exactement comme l'onglet Effectif rend déjà normalement un effectif où personne n'a répondu (`en attente` partout).

### Compteur `✓4 ✗1 ?1` de la maquette (PO-AT-04, ouvert)

La maquette place ce compteur en tête de liste, sans préciser s'il porte sur le déclaré ou le constaté. Le spec (§1, AC-AT-05) impose que cet agrégat, s'il est construit, **ne remplace ni n'absorbe** `ResponseBar` (qui reste exclusivement l'agrégat des `ConvocationResponse`, en tête de l'onglet). Proposition, non tranchée : un **second** bloc, sous `ResponseBar`, visuellement distinct (étiqueté explicitement « Présences constatées » ou équivalent) et affichant les trois mêmes valeurs à partir des `AttendanceRecord` de la convocation. Cette proposition n'est pas construite dans le rendu décrit ci-dessus (elle n'y figure pas) tant que PO-AT-04 n'est pas tranché avec la développeuse — voir « Questions ouvertes UI ».

### Convocation clôturée automatiquement (AC-AT-10, AC-AT-11, PO-AT-03)

Confirmer le dernier joueur requis clôture la convocation via le trigger existant, pas via un appel client. Côté écran : l'onglet Effectif continue de se rendre **normalement** après clôture (AC-AT-11) — aucun état spécial « clôturé » n'est ajouté à la liste elle-même (la pastille de statut « Clôturée » du hero, déjà construite pour l'écran hôte, suffit à signaler l'événement). **Les deux boutons de confirmation restent rendus et actifs même après clôture** : rien dans la RLS actuelle (`_update_validate`) ne teste `status`, donc rien côté UI ne les désactive non plus — comportement hérité tel quel de la conception du spec, pas une décision de cette section, et explicitement lié à PO-AT-03 (fenêtre de confirmation), non tranché.

### États à couvrir — récapitulatif

| État | Traitement |
|---|---|
| Effectif entièrement non confirmé | Rendu normal, chaque ligne « Non confirmée » — pas un état vide (§ ci-dessus) |
| Écriture en cours sur une ligne | Ses deux boutons se désactivent/atténuent ; le reste de la liste reste actif |
| Échec d'écriture sur une ligne | Libellé de gauche remplacé par un message d'erreur inline, boutons réactivés, aucune autre ligne affectée |
| Convocation `closed` par le trigger déclenché depuis cet écran | Liste rendue normalement, contrôles toujours actifs (PO-AT-03) |
| Jeton joueur | Aucun bouton, aucun libellé de statut constaté — absence complète, pas un état dégradé de la vue coach |
| Jeton hors `attendance:validate` (autre que joueur) | Même traitement qu'un jeton joueur sur ce point précis : les contrôles sont absents |

### Questions ouvertes UI

Aucune n'est bloquante pour la transmission à mentor-agent ; toutes héritent de points déjà ouverts au niveau spec (§5) plutôt que d'en créer de nouveaux, sauf la troisième.

1. **Emplacement et existence du compteur constaté** (PO-AT-04) — proposition ci-dessus (second bloc sous `ResponseBar`, étiqueté distinctement), à confirmer avec la développeuse avant implémentation ; peut aussi être omis en v1 si le compteur de la maquette n'a finalement pas de support jugé nécessaire.
2. **Correction après clôture automatique** (PO-AT-03) — cette section garde les boutons actifs après clôture parce que rien ne les en empêche aujourd'hui, mais ce n'est pas un choix produit assumé : à trancher avec le Bureau/développeuse avant que ce comportement ne devienne une habitude implicite.
3. **Micro-pattern d'erreur inline par ligne** — net-new, pas un simple réemploi d'un composant existant (contrairement au reste de cette section). À valider explicitement avant implémentation plutôt que supposé correct par défaut.
4. **Registre `DESIGN_LINKS.md`** — aucune ligne ajoutée dans cette passe, faute d'URL artifact à y inscrire (voir « Sources utilisées », point 1). Si un lien vivant est fourni ultérieurement, l'ajouter au tableau du §2 à ce moment-là, pas avant.

**Prêt pour transmission à mentor-agent : oui**, sous réserve des 4 points ci-dessus (aucun bloquant).
