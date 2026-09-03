# Spec — Détail d'une convocation (écran « Match Details »)

> Statut : rédaction initiale du 2026-08-27, **amendée le 2026-08-28** après `docs/convocation_visibility_rls_correction.md` (issu d'une séance de mentoring consécutive à un échec d'AC-MD-08 en recette), puis **PO-MD-03 tranché le 2026-08-28** (décision développeuse). **PO-MD-01, PO-MD-02, PO-MD-03 et PO-MD-05 sont résolus** et marqués comme tels en §5 — les références sont conservées (non renumérotées) pour ne pas casser les renvois existants. Restent ouverts : PO-MD-04, PO-MD-06, PO-MD-07, PO-MD-08, plus **PO-MD-09** (nouveau — trois écarts entre le SQL du document de correction et le schéma réel, §5). Le bloc « qui a répondu » n'est plus bloqué au niveau données, ni côté joueur ni côté coach ; son câblage `presentation/` est une passe distincte.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles), `docs/season-scoping-correction.md` (saison en cours), **`docs/convocation_visibility_rls_correction.md`** (visibilité des répondants — autorité sur §2/§3 de la présente spec), `specs/coach-dashboard.md` (AC-CD-04/05/08, PO-6b), `specs/player-dashboard.md` (§3, AC-PD-03/04/06, PO-PD-02/03/05), `specs/create-convocation.md` (§2, §4, §7).
> Maquettes : registre `docs/designs/DESIGN_LINKS.md` §2 — **deux lignes**, toutes deux `actif` : `match_details_page — vue joueur` (`cd36ac10…`) et `match_details_page — vue coach` (`97e7d0a5…`, « légèrement différente »). Conformément au §4 du registre, ces liens sont la référence visuelle et aucun autre n'est à demander. **Réserve** : l'agent PO n'a pas pu ouvrir les artifacts (pas de navigation web) — le périmètre vient du CDC, du modèle de domaine et des règles données en séance. Instantanés locaux `N/A` (PO-MD-08).
> État du code lu pour cadrer : `domain/entities/{convocation,match-details,meeting-details,opponent,user,team}.ts`, `domain/policies/{rbac-matrix,can,actions,response-deadline,convocation-closure}.ts`, `domain/rules/convocation-rules.ts`, `domain/repositories/*`, `domain/usecases/convocation/GetConvocationDetailsUseCase.ts`, `domain/usecases/{coach-dashboard,player-dashboard}/*`, `presentation/app/router.tsx`, `presentation/shared/query-keys.ts`, `supabase/migrations/20260811171754_initial_schema.sql`, `20260819153918_season_scoping_correction.sql`, `20260821091519_convocation_creation_schema.sql`.

## 1. Périmètre

Écran de **détail d'une échéance**, atteint depuis une carte ou une ligne de liste. C'est la **cible de navigation manquante** de `specs/coach-dashboard.md` AC-CD-08 et `specs/player-dashboard.md` AC-PD-14, qui renvoient tous deux vers « le détail de l'échéance » — écran absent de `presentation/app/router.tsx`. Cette feature le construit, en **deux variantes de rôle** correspondant aux deux maquettes.

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Calendrier et convocations | **P0** | Consultation d'une convocation unique : type, date/heure, lieu, statut, et détails propres au type (adversaire, domicile/extérieur, RDV pour un match ; titre et ordre du jour pour une réunion) |
| Présences et suivi sportif | **P0** | Réponses déclarées (`ConvocationResponse`) : sa propre réponse, l'agrégat (coach), et le bloc « qui a répondu » à la granularité permise par le rôle (§2). Ni saisie de présence, ni `AttendanceRecord` |

### Note de nommage — « match » vs « convocation »

Le modèle de domaine ne connaît **pas** d'entité `Match` : un match est une `Convocation` de `type === 'match'` plus une satellite `MatchDetails` (`specs/create-convocation.md` §2). L'écran est un **détail de convocation à trois variantes de type**, dont le match est la plus riche. Les deux tableaux de bord renvoient vers « le détail de l'échéance » pour des lignes de **tous** les types : un écran ne sachant afficher qu'un match laisserait deux liens cassés sur trois. Le nom de fichier de cette spec est conservé ; le composant doit être nommé d'après ce qu'il rend (§6).

### Contenu retenu

1. **En-tête** : flèche retour + type de l'échéance, `sticky top-0` sur fond opaque (`CLAUDE.md` §6), le contenu étant scrollable.
2. **Bloc d'identité**, commun aux 3 types et aux 2 rôles : type, date et heure (`Convocation.date`), lieu (`Convocation.location`), **statut** (`open` / `closed` / `cancelled`).
   - Si `status === 'cancelled'`, la `cancellationReason` est affichable — donnée portant sur un **événement**, à ne pas confondre avec `ConvocationResponse.reason`, motif d'absence **individuel** (§3).
3. **Bloc spécifique au type**, via `GetConvocationDetailsUseCase` :
   - **Match** (`MatchDetails`) : adversaire (via `OpponentRepository.findById`), domicile/extérieur (`isHome`), heure de RDV (`meetingPointTime`), lieu de RDV (`meetingPointLocation`) — les deux derniers distincts du coup d'envoi et du lieu de rencontre.
   - **Réunion** (`MeetingDetails`) : titre et ordre du jour (`agenda: string[]`, l'ordre du tableau **est** l'ordre d'affichage).
   - **Entraînement** : aucun bloc spécifique — `training_details` n'existe pas (`specs/create-convocation.md` §7). Pas d'espace vide compensatoire, pas de placeholder.
4. **Bloc « qui a répondu »** — voir §2 pour la règle de granularité, désormais tenue en base :
   - **Vue joueur** : **l'effectif convoqué en entier**, chaque joueur portant un badge binaire « a répondu » / « en attente ». Jamais *ce que* la personne a répondu.
   - **Vue coach** : maquette « légèrement différente ». **Tranché (PO-MD-03, 2026-08-28)** : l'effectif convoqué en entier, chaque joueur portant son **statut individuel réel** (présent / absent / en attente), pas seulement un booléen. Repose sur `ConvocationResponseRepository.findByConvocation` (accès déjà accordé au coach par `convocation_responses_select_team_scoped`, inchangée) complété par la même logique de complétion d'effectif que `convocation_responders` pour que les non-répondants apparaissent « en attente » plutôt que d'être absents de la liste ; noms via `get_convocation_responder_names` (§2).
5. **Agrégat des réponses** (présents / absents / en attente) via `summarizeResponses` : **vue coach uniquement**, à partir des seules `ConvocationResponse`, jamais des `AttendanceRecord` (`CLAUDE.md` §6, AC-CD-04). Son exclusion de la vue joueur est **structurelle**, pas cosmétique : combiné au bloc « qui a répondu », il reconstitue le statut individuel (§3).
6. **Sa propre réponse et l'action Présent/Absent** — vue joueur uniquement : réutilise `RespondToConvocationUseCase`, `canPlayerRespond` et l'action `'convocation:respond'`. **Aucune nouvelle permission, aucune entrée de matrice** — confirmé par `docs/convocation_visibility_rls_correction.md` §3 (« No RBAC matrix changes »).

### Correction apportée par l'amendement du 2026-08-28

La rédaction initiale décrivait le bloc joueur comme « la liste des coéquipiers **ayant répondu** ». **C'est faux.** `docs/convocation_visibility_rls_correction.md` §2.1 rejette explicitement ce cadrage (« an earlier, incorrect draft of this view that filtered to responders only — rejected because it doesn't match the actual screen ») : l'écran affiche **tout l'effectif convoqué**, chacun avec un badge par joueur. D'où le `LEFT JOIN` de la vue — un joueur n'ayant jamais répondu n'a aucune ligne dans `convocation_responses` (pas de matérialisation à la création, `specs/create-convocation.md` §2), et partirait de la liste au lieu d'y figurer « en attente ».

### Hors périmètre — explicitement

- **Le statut de réponse individuel d'un coéquipier, côté joueur** : le joueur voit *qui* a répondu, jamais *quoi* (§2).
- **Le câblage `presentation/` du bloc « qui a répondu »** : `docs/convocation_visibility_rls_correction.md` §6 est explicite — « No `presentation/` work in this pass ». La passe de correction livre la vue, la fonction, l'interface de dépôt et son implémentation ; l'écran les consomme dans une passe suivante.
- **Les `AttendanceRecord`** : ni affichage, ni saisie (PO-MD-04). La saisie appartient à Suivi sportif ; l'affichage côté joueur rouvrirait PO-PD-02.
- **La modification, l'annulation et la clôture.** `UpdateConvocationUseCase` reste un nom réservé ; la clôture est pilotée par trigger ; **aucune politique RLS `UPDATE` sur `convocations`**. Aucun bouton d'édition.
- **Le motif d'absence** (`ConvocationResponse.reason`) : ni saisi, ni affiché, pour personne — PO-PD-03 non tranché.
- **Toute donnée de résultat** (score, buteurs, temps de jeu, feuille de match) : aucun module « résultats et compétitions » en P0/P1.
- **Toute communication** (relance, contact d'un joueur) : Communication est **P1** (PO-4).
- **Le mode dégradé offline** : accordé par la matrice, jamais implémenté (PO-5, `ARCHITECTURE.md` §14).
- **L'écran Calendrier lui-même** : cet écran en est une destination.

### Périmètre de données

L'écran affiche **une seule convocation**, bornée à son équipe (`Convocation.teamId`) et à la **saison en cours** via l'équipe (`teams_select_team_scoped` filtre déjà `season_id = (select id from public.current_season())`).

Un identifiant hors périmètre ne produit ni erreur technique, ni fuite d'existence : `findById` renvoie `null` sous RLS, et l'écran rend un « introuvable » **indiscernable** entre « n'existe pas » et « hors périmètre ».

## 2. RBAC

### Lignes de matrice applicables

**« Consulter une convocation en mode dégradé »** — seule ligne portant sur la *consultation* :

| Rôle | Valeur matrice | Traduction sur cette feature |
|---|---|---|
| Les 8 rôles | ✅ | Droit universel dans la matrice. En RLS, `convocations_select_team_scoped` le bornait à `is_team_member or is_admin` — **corrigé** pour admettre aussi `section-manager` et `authorized-officer` dans leur portée (ex-PO-MD-05) |

**« Voir les dossiers des autres membres »** — gouverne le bloc « qui a répondu » :

| Rôle | Valeur matrice | Traduction sur cette feature |
|---|---|---|
| Joueur/Joueuse | ❌ | Aucun **statut** de réponse d'un coéquipier. Voit l'**identité** de l'effectif convoqué + un badge binaire. Compatibilité de cette identité avec le ❌ : tranchée en séance de mentoring, la visibilité de l'effectif de sa propre équipe n'étant pas assimilée à « voir le dossier » |
| Coach/Staff | ❌ (son équipe, hors financier) | Autorisé pour son équipe. Lecture des noms désormais possible via `get_convocation_responder_names` (ex-PO-MD-02) |
| Responsable de section | ✅ (sa section) | Lecture de la convocation débloquée par la correction de `convocations_select_team_scoped` (ex-PO-MD-05) |
| Dirigeant habilité | ✅ | Idem |
| Trésorier | ❌ (financier seulement) | Aucun accès à cet écran |
| Référent médical | ❌ (santé seulement, tracé) | Aucun accès. Périmètre santé = écran distinct et tracé |
| Bénévole | ❌ | Aucun accès à cet écran |
| Administrateur | ✅ | Accès par l'administration (`private.is_admin()`), jamais par auto-affectation à une équipe |

### La règle « qui a répondu, mais pas quoi » — désormais tenue en base

Règle : **le joueur voit qui a répondu, jamais si la personne a répondu présent ou absent.**

Elle ne pouvait pas être tenue par le rendu React — `convocation_responses_select_team_scoped` livre `status` **et** `reason` à tout `is_team_member`, donc un jeton joueur interrogeant l'API obtenait le statut de chaque coéquipier quoi qu'affiche l'écran. C'est exactement l'échec constaté en recette sur AC-MD-08.

**Résolution** (`docs/convocation_visibility_rls_correction.md` §2.1/§2.2), en trois pièces :

1. **Vue `convocation_responders`** — la table de base garde sa politique inchangée (coach/admin, ligne complète). La vue expose `convocation_id`, `user_id` et **`has_responded` (booléen)** — jamais les valeurs `status`/`reason`. Une politique `SELECT` Postgres ne pouvant pas exposer certaines colonnes d'une **même ligne** à un rôle et d'autres à un autre, la vue est le seul mécanisme correct ; `security_invoker = true` fait porter la RLS des tables sous-jacentes.
2. **Fonction `get_convocation_responder_names`** — `SECURITY DEFINER`, contourne délibérément `users_select_own` mais ne renvoie que deux colonnes (identifiant + nom d'affichage) et seulement pour des utilisateurs déjà visibles via `convocation_responders`. **`users_select_own` reste inchangée** : élargir la politique de `users` à `is_team_member` donnerait accès à des colonnes arbitraires d'un tiers pour un besoin qui est seulement « afficher un nom ».
3. **`convocations_select_team_scoped` élargie** pour refléter `convocations_insert_create` (bug de cohérence, pas extension de droit) — en **réutilisant le prédicat de portée déjà présent** dans la politique d'insertion, pas en le redérivant, pour que les deux restent comparables à l'œil (`ARCHITECTURE.md` §7).

Le booléen est ce qui rend la règle tenable **tout en affichant l'effectif entier** : il répond à « a-t-il répondu ? », jamais à « qu'a-t-il dit ? ».

### Action métier de l'écran

Une seule, déjà existante : **`'convocation:respond'`**, `['player']` dans `rbac-matrix.ts`, bornée dans `can.ts` par `assignment.teamId === context.teamId`. **Aucune action ajoutée à `actions.ts`, aucune entrée à `rbac-matrix.ts`, aucune branche à `can.ts`** — confirmé par le document de correction §3.

La lecture reste **RLS-only**, sans entrée de matrice (critère commenté en tête de `rbac-matrix.ts`). Seule décision prise avant requête : rendre ou non l'action Présent/Absent, via `can(...)` et `canPlayerRespond`.

### Variantes de rendu par rôle

| Bloc | Vue joueur | Vue coach |
|---|---|---|
| Identité de l'échéance | ✅ | ✅ |
| Bloc spécifique au type (match / réunion) | ✅ | ✅ |
| Sa propre réponse + action Présent/Absent | ✅ (avant échéance) | ❌ (un coach ne répond pas) |
| Bloc « qui a répondu » — effectif + badge binaire | ✅ | — |
| Statut individuel par joueur | ❌ (règle centrale) | ✅ (PO-MD-03, effectif entier + statut réel) |
| Agrégat présents / absents / en attente | ❌ (recompose le statut individuel, §3) | ✅ |
| Présences constatées (`AttendanceRecord`) | ❌ | ❌ en v1 (PO-MD-04) |

**Règle d'affichage** (moindre privilège, CDC §3 ; `ARCHITECTURE.md` §7) : un bloc non autorisé est **absent**, jamais grisé ni suivi d'une erreur au clic.

## 3. Données sensibles

### Données de santé — aucune, vecteur d'entrée tenu fermé

Aucune donnée de santé, d'aptitude ou de diagnostic (AC-CD-09, AC-PD-08).

Le vecteur reste **`ConvocationResponse.reason`**, texte libre pouvant recueillir un motif médical. La vue `convocation_responders` **ne l'expose pas** — c'est le même mécanisme qui protège `status` et `reason`, ce qui referme le vecteur côté joueur au niveau base et non plus au niveau rendu. Il reste lisible par coach/admin via la table de base : le champ **n'est affiché nulle part** sur cet écran, pour personne, tant que PO-PD-03 n'est pas tranché par le **référent RGPD** — toujours **non désigné** (`docs/GOUVERNANCE.md` §7).

### Données financières — aucune

Aucun statut de cotisation, montant ou relance. Module Cotisations **P1**.

### Données personnelles de tiers

Deux niveaux, à ne pas confondre :

- **Identité d'un membre convoqué** (vue joueur) : donnée personnelle de tiers, exposée via une fonction délibérément étroite (deux colonnes, une condition de jointure) plutôt qu'un élargissement de `users_select_own`. Le choix du mécanisme *est* la mesure de minimisation.
- **Statut de réponse d'un tiers** : refusé côté joueur au niveau base, admis côté coach par la matrice.

**Contrainte de recomposition — structurelle.** Le bloc « qui a répondu » et l'agrégat présents/absents/en attente sont **incompatibles sur un même écran joueur** : un badge « a répondu » visible plus un agrégat « 1 présent » redérive le statut individuel. Le document de correction §2.1 le restate précisément parce que la vue rend cette exclusion porteuse et non plus décorative. Ce n'est pas une préférence de mise en page (AC-MD-10).

### Journal d'audit — aucune action à tracer par cette feature

Consulter une convocation ne figure **pas** dans les actions sensibles du CDC §11.3. Répondre à une convocation non plus (`specs/player-dashboard.md` §3 : responsabilité portée par `user_id` + `responded_at`). **Aucune journalisation requise.**

Réserves maintenues :

- ⚠️ La lecture nominative d'un effectif étant désormais possible (fonction `SECURITY DEFINER`), la frontière avec « export nominatif » (§11.3) mérite d'être posée au référent RGPD — la fonction reste étroite (deux colonnes, périmètre d'une convocation), mais c'est le premier chemin du projet par lequel un membre lit le nom d'un tiers.
- ⚠️ Si PO-PD-03 validait le motif d'absence, sa consultation deviendrait une action à tracer par **trigger Postgres** (`ARCHITECTURE.md` §11).
- ⚠️ L'absence de table de journal d'audit dans `supabase/migrations/` reste une **exigence transversale P0 non résolue**, distincte de cette feature.

### Export — aucun

Aucun export, aucune fonction de copie, pour aucun rôle.

## 4. Critères d'acceptation

**AC-01** et **AC-02** sont ceux de la section 17.2 du CDC. Les critères propres à l'écran sont préfixés `AC-MD-`, même convention que `AC-CD-`, `AC-PD-`, `AC-CV-` ; à renuméroter en recette.

| Réf. | Critère |
|---|---|
| **AC-01** | Aucune donnée d'un membre extérieur à l'équipe de la convocation n'est accessible, ni à l'écran ni dans la réponse API |
| **AC-02** | Un membre de l'équipe A demandant une convocation de l'équipe B obtient « introuvable », et l'API ne renvoie aucun champ de cette convocation. Vérifié par appel direct à l'API, jeton joueur **et** jeton coach, hors application |
| AC-MD-01 | Un identifiant inexistant et un identifiant hors périmètre produisent **le même** état « introuvable » (pas de fuite d'existence), sans erreur technique ni chargement infini |
| AC-MD-02 | Les trois types sont rendus sans erreur. Un `training` rend le bloc d'identité seul, sans espace vide compensatoire et **sans lever d'exception** : `GetConvocationDetailsUseCase.execute` lève aujourd'hui pour `type === 'training'` (§7) |
| AC-MD-03 | Pour un match, les quatre champs de `MatchDetails` sont rendus distinctement : adversaire, domicile/extérieur, **heure de RDV ≠ coup d'envoi**, **lieu de RDV ≠ lieu de la rencontre** |
| AC-MD-04 | Pour une réunion, les points de l'ordre du jour sont rendus dans l'ordre du tableau `agenda` ; un `agenda` vide rend un état vide explicite, jamais une erreur |
| AC-MD-05 | `closed` et `cancelled` sont rendus par une pastille de statut toujours doublée d'un libellé textuel, jamais par la seule couleur ou une icône. `open` — état par défaut d'une convocation active — n'affiche aucune pastille : rien à signaler tant que la convocation suit son cours normal, la pastille n'existant que pour porter une exception à l'attention |
| AC-MD-06 | Les compteurs présents / absents / en attente proviennent des seules **`ConvocationResponse`** ; une présence constatée saisie a posteriori ne les modifie pas (identique à AC-CD-04) |
| AC-MD-07 | Pour la vue joueur, le statut affiché pour soi-même est **sa propre `ConvocationResponse`**, jamais un `AttendanceRecord` (identique à AC-PD-03) |
| **AC-MD-08** | **Pour un jeton joueur, `status` et `reason` d'un tiers sont absents de la *forme même* de la réponse API** qui alimente l'écran — pas seulement absents du rendu. Vérifié par appel direct à l'API, hors application. *Historique : ce critère a échoué en recette parce qu'il était évalué contre le rendu ; il est désormais satisfait par la vue `convocation_responders`. Ne jamais le réévaluer contre un composant (`docs/convocation_visibility_rls_correction.md` §5.5).* |
| AC-MD-09 | Le bloc « qui a répondu » liste **tout l'effectif convoqué**, y compris les joueurs sans aucune ligne `convocation_responses`, affichés « en attente » — jamais les seuls répondants (§1, correction du 2026-08-28) |
| AC-MD-10 | L'agrégat présents / absents / en attente n'est rendu **que** pour la vue coach ; absent de l'écran **et** des réponses API pour un jeton joueur — y compris quand le bloc « qui a répondu » est affiché, les deux ne coexistant jamais côté joueur (§3, recomposition) |
| AC-MD-11 | Aucun `AttendanceRecord` n'est rendu ni requêté depuis cet écran, pour aucun rôle, tant que PO-MD-04 n'est pas tranché |
| AC-MD-12 | `ConvocationResponse.reason` n'est **ni affiché, ni saisissable** sur cet écran, pour aucun rôle (§3, PO-PD-03) |
| AC-MD-13 | Passé l'échéance propre au type, ou si la convocation n'est plus `open` (`canPlayerRespond` couvre les deux), l'action Présent/Absent n'est plus rendue — **absence, pas désactivation** (identique à AC-PD-06) |
| AC-MD-14 | Répondre depuis cet écran ne crée pas de seconde ligne : **une seule ligne** par `(convocation_id, user_id)`, dernière valeur gagne (identique à AC-PD-04) |
| AC-MD-15 | Une réponse sur une convocation d'une autre équipe, ou au nom d'un autre utilisateur, est refusée **par la base**, pas seulement par l'interface |
| AC-MD-16 | Un `section-manager` ou `authorized-officer` qui crée une convocation dans sa portée peut **la relire immédiatement**. Test de régression de l'ex-PO-MD-05, qui doit échouer contre la politique d'avant correctif pour prouver qu'il teste la bonne chose (`docs/convocation_visibility_rls_correction.md` §5.4) |
| AC-MD-17 | Aucun bouton ni menu de modification, d'annulation, de clôture, de relance ou d'export n'est rendu, pour aucun rôle — absence, pas désactivation |
| AC-MD-18 | Aucune donnée financière et aucune information de santé, d'aptitude ou de diagnostic n'apparaît à l'écran ni dans les réponses API, jeton joueur comme jeton coach |
| AC-MD-19 | Aucune donnée de résultat (score, buteur, temps de jeu, feuille de match) n'est rendue, **même statique** |
| AC-MD-20 | L'en-tête à flèche retour reste visible pendant le défilement (`sticky top-0`, fond opaque) — `CLAUDE.md` §6 |
| AC-MD-21 | Affichage complet en moins de 3 secondes sur mobile en réseau normal (CDC §12) |
| AC-MD-22 | Contrastes AA et navigation clavier opérationnelle (CDC §12) ; toute information portée par la couleur (statut, badge a répondu / en attente, domicile/extérieur, type d'échéance) est doublée d'un libellé textuel |
| AC-MD-23 | Les contrôles interactifs (boutons Présent/Absent, flèche retour) ont une cible tactile d'au moins ~44px (`h-11`), vérifiée sur un viewport mobile réel — `CLAUDE.md` §6 |

## 5. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| ~~PO-MD-01~~ | ~~Comment tenir « le joueur voit qui a répondu, pas ce qu'il a répondu » ?~~ **RÉSOLU** (2026-08-28) par la vue `convocation_responders` exposant un booléen `has_responded`, la table de base gardant sa politique — `docs/convocation_visibility_rls_correction.md` §2.1 | — | — |
| ~~PO-MD-02~~ | ~~Comment lire le nom d'un coéquipier malgré `users_select_own` ?~~ **RÉSOLU** (2026-08-28) par la fonction `SECURITY DEFINER` `get_convocation_responder_names`, deux colonnes, portée via `convocation_responders` ; `users_select_own` inchangée — §2.2 | — | — |
| ~~PO-MD-03~~ | ~~Que montre exactement la vue coach ?~~ **RÉSOLU** (2026-08-28, décision développeuse) : effectif convoqué en entier, statut individuel réel par joueur (présent / absent / en attente), pas un simple booléen ni un agrégat seul — voir §1 point 4 | — | — |
| **PO-MD-04** | **Les présences constatées (`AttendanceRecord`) sont-elles affichées ici une fois l'échéance passée ?** La RLS les ouvre au coach et les ferme au joueur (« left closed/undecided », PO-PD-02). Le coach les voit-il ici, ou seulement dans l'écran de saisie de Suivi sportif ? Et les afficher aux côtés des réponses déclarées risque de les faire lire comme une seule donnée, alors que `CLAUDE.md` §6 impose de les garder distinctes | Bureau + développeuse | Non — non rendu en v1 (AC-MD-11) |
| ~~PO-MD-05~~ | ~~Écart RLS : `section-manager` / `authorized-officer` créent une convocation qu'ils ne peuvent pas relire.~~ **RÉSOLU** (2026-08-28) — `convocations_select_team_scoped` élargie en réutilisant le prédicat de portée de `convocations_insert_create` (§2.3). Test de régression : AC-MD-16 | — | — |
| **PO-MD-06** | **Quel est le point d'entrée réel ?** Les deux tableaux de bord renvoient vers « le détail de l'échéance » (AC-CD-08, AC-PD-14), mais Calendrier — cible du lien « Voir tout » — est un stub. Câbler la navigation depuis les tableaux de bord dès cette passe, ou attendre Calendrier ? | Développeuse | Non |
| **PO-MD-07** | **Que montre l'écran pour une convocation passée ou clôturée ?** `isUpcoming` filtre les tableaux de bord sur `status === 'open' && date > now` : rien n'y mène aujourd'hui, mais l'écran est atteignable par URL directe et le sera via Calendrier. L'agrégat garde-t-il un sens une fois l'échéance passée, ou cède-t-il la place aux présences constatées (PO-MD-04) ? | Bureau | Non — identité et bloc par type se rendent identiquement quel que soit le statut |
| **PO-MD-08** | **Instantanés locaux `N/A`** pour les deux lignes du registre. `DESIGN_LINKS.md` §3 demande un export statique committé une fois la spec figée — d'autant que le lien joueur a **déjà été remplacé une fois** | Développeuse | Non |
| **PO-MD-09** | **Trois écarts entre le SQL de `docs/convocation_visibility_rls_correction.md` et le schéma réel**, relevés en relisant les migrations — à corriger avant implémentation, sous peine de migration qui ne compile pas : **(a)** la table `team_members` **n'existe pas** ; l'appartenance à une équipe vit dans `public.user_roles` (`user_id`, `team_id`, `role`), cf. `private.is_team_member`. **(b)** `public.users` n'a **pas** de colonne `display_name` — la colonne est `full_name` (migration initiale, l. 38). **(c)** conséquence de (a) : `private.is_team_member` couvre `role in ('player','coach')`, donc joindre l'« effectif » sans filtrer ferait figurer **le coach parmi les joueurs convoqués en attente de réponse** ; l'effectif convoqué doit être filtré sur `role = 'player'` (sémantique de `is_player_of_team`) | Développeuse | **Oui pour l'implémentation** de la vue et de la fonction ; sans effet sur la conception de l'écran |
| **PO-MD-10** | **Les cinq tests d'intégration RLS du §5 de `docs/convocation_visibility_rls_correction.md` restent `it.todo`** dans `ConvocationRespondersRepositoryImpl.rls.test.ts` — AC-MD-08, le critère qui a précisément échoué en recette, n'est donc **pas encore vérifié contre la base**. Bloqué sur une question d'infra de test non résolue dans ce repo : comment obtenir, depuis un test Vitest `node`, une session Supabase authentifiée réelle (joueur / coach / responsable de section / dirigeant habilité) plutôt que la clé anon du bundle client — pas de `supabase/config.toml`, pas de fixtures de comptes de test jetables. Revue de code du 2026-09-02 : ajouté ici pour que cette lacune reste traçable au niveau spec, pas seulement dans un TODO en commentaire de fichier (relu à la prochaine session de mentoring plutôt qu'oublié) | Développeuse (question d'infra) | **Oui** — AC-MD-08 n'est pas prouvé tant que ces cinq tests ne sont pas écrits |

### Ce qui reste explicitement OPEN et ne doit pas être résolu implicitement

`docs/convocation_visibility_rls_correction.md` §3 le pose, cette spec le relaie : **la source de vérité des « convoqués requis » reste ouverte** (PO-6b de `specs/coach-dashboard.md`, §2 « Destinataires » de `specs/create-convocation.md`). La vue dérive l'effectif de l'appartenance d'équipe parce que c'est la **seule source concrète aujourd'hui** — constat d'état, pas résolution. La jointure de la vue est le point unique à modifier le jour où une liste de convoqués par convocation existera (exclusion automatique des blessés, ajustement manuel). **Ne pas créer de table `convocation_attendees` par anticipation.**

Limite héritée, à ne pas « corriger » sans déclencheur réel : un joueur n'ayant jamais répondu puis quittant l'équipe peut disparaître silencieusement de la liste d'une convocation *passée*. Palliatif accepté : recréer l'événement. **Ne pas construire de snapshot d'effectif.**

## 6. Note pour designer-agent

- **Maquettes** : les **deux** lignes `match_details_page` de `docs/designs/DESIGN_LINKS.md` §2 — vue joueur (`cd36ac10…`) et vue coach (`97e7d0a5…`), toutes deux `actif`. **Les utiliser directement, ne pas en redemander** (§4 du registre). Instantanés à produire (PO-MD-08).
- **Réserve** : l'agent PO n'a pas pu ouvrir les artifacts. Il est **probable** que les maquettes contiennent des blocs sans fondement — c'est arrivé pour les trois écrans précédents (ASC Legacy et « Mes stats » côté joueur, « Forme récente » et « Loto du club » côté coach, pastille « Autre » côté convocation). **Le CDC et la matrice RBAC priment, la maquette informe la mise en page.**
- **Le bloc « qui a répondu » n'est plus suspendu, pour aucun des deux rôles** — c'est le changement principal de cet amendement (PO-MD-01/02 pour le joueur, PO-MD-03 pour le coach). Il se conçoit et se fige, avec des contraintes distinctes par rôle :
  - **Vue joueur** : **tout l'effectif convoqué est listé**, pas seulement les répondants (AC-MD-09). Chaque ligne porte un badge **binaire** : « a répondu » / « en attente ». Aucun troisième état, aucune nuance présent/absent. **Le badge ne doit jamais suggérer un statut** — éviter le couple vert/rouge déjà employé pour présent/absent ailleurs dans le projet, un badge vert lirait « présent ». Traitement neutre (rempli / contour, ou une teinte non sémantique), doublé d'un libellé textuel (AC-MD-22).
  - **Vue coach** (PO-MD-03) : **tout l'effectif convoqué est listé**, chaque ligne portant le **statut individuel réel** — présent / absent / en attente — avec le vocabulaire couleur déjà établi ailleurs dans le projet pour ces trois états (cette fois légitime, puisque le coach a le droit de voir le statut). Un non-répondant apparaît « en attente », jamais absent de la liste.
- **Ne jamais faire coexister, côté joueur, le bloc « qui a répondu » et l'agrégat présents/absents/en attente** : la combinaison recompose le statut individuel que la règle interdit (§3, AC-MD-10). Contrainte structurelle, pas esthétique.
- **Blocs à écarter s'ils apparaissent** : score / buteurs / temps de jeu / feuille de match (AC-MD-19) ; motif d'absence (AC-MD-12) ; pointage de présences (AC-MD-11) ; boutons modifier / annuler / relancer / exporter / partager (AC-MD-17).
- **Patterns à réutiliser** : en-tête à flèche retour de `presentation/features/convocation/components/BackHeader.tsx` (`sticky top-0`, AC-MD-20) ; carte d'échéance, liseré coloré par type et barre tri-segments de `docs/designs/v4_coach_dashboard.png` ; paire de boutons Présent/Absent de `docs/designs/player-dashboard/v2_joueur_dashboard*.png`, avec `min-w-0` et `h-11` (AC-MD-23).
- **Trois types × deux rôles : ne pas concevoir six écrans.** Le bloc d'identité est commun ; seuls le bloc par type et les blocs conditionnés par le rôle varient (§2).
- **États à couvrir** : introuvable / hors périmètre (AC-MD-01), entraînement sans bloc de détails (AC-MD-02), ordre du jour vide (AC-MD-04), convocation `closed` / `cancelled` (AC-MD-05, PO-MD-07), échéance dépassée — action absente, pas grisée (AC-MD-13), **effectif dont personne n'a encore répondu** (toutes les lignes « en attente », pas un état vide, pour les deux vues), agrégat 0/0/0 côté coach.
- **Nommage du composant** : l'écran rend une convocation de n'importe quel type (§1). Le nommer d'après ce qu'il rend (`ConvocationDetailPage` ou équivalent), dans `presentation/features/convocation/`.
- Rappel `CLAUDE.md` §9 : aucun nom de personne figurant dans les maquettes ne doit apparaître dans le code, les tests ou la documentation.

## 7. Note pour mentor-agent

- **Ordre des passes.** `docs/convocation_visibility_rls_correction.md` §6 livre migrations + `domain/repositories/convocation-responders-repository.ts` + `data/` + tests d'intégration, **sans aucun travail `presentation/`**. Le câblage de l'écran (use case + ViewModel consommant `ConvocationRespondersRepository`) est la passe suivante. Ne pas les fusionner.
- **PO-MD-09 avant tout.** Les trois écarts de schéma (`team_members` inexistante, `display_name` vs `full_name`, filtrage `role = 'player'`) doivent être corrigés dans le SQL avant application, sinon la migration ne compile pas — et l'écart (c) produirait un bug silencieux (le coach listé comme convoqué en attente).
- **`GetConvocationDetailsUseCase.execute` lève pour `type === 'training'`** (branche volontaire). `ListUpcomingConvocationsForPlayerUseCase` la contourne déjà par un `if (type === 'training') return null` assorti d'un TODO. Cet écran rendant les trois types (AC-MD-02), **ne pas ajouter un troisième contournement en silence** : soit une garde explicite chez l'appelant, soit une branche `training → null` dans le use case.
- **Aucune entrée de `rbac-matrix.ts` / `actions.ts` / `can.ts` à ajouter** (§2), confirmé par le document de correction §3.
- **Tests contre la base, jamais contre le rendu.** C'est la leçon directe de l'échec d'AC-MD-08 : un test de composant vérifiant qu'un champ est masqué ne prouve rien. Les cinq tests d'intégration du §5 du document de correction font foi.
- **Clés de query à centraliser** dans `presentation/shared/query-keys.ts`, forme `[ressource, ...discriminants]`, discriminant = identifiant de convocation. Précédent posé côté joueur : **deux clés distinctes** quand la forme retournée diffère — ce sera le cas entre vue coach (agrégat) et vue joueur (booléens), y compris pour un compte cumulant les deux rôles.
- **Route plein écran poussée par-dessus les onglets**, hors `AppShell` (donc sans nav basse), même patron que `convocations/new`.
- **Ne pas implémenter dans cette passe** : câblage `presentation/` du bloc « qui a répondu », affichage ou saisie de présences, modification/annulation/clôture, table de journal d'audit, `training_details`, table `convocation_attendees`.

## UI design

### Sources utilisées, par ordre de priorité effectif

1. **`docs/designs/player-match-details/[v3] [Joueur] Mob - Détail Match-selection_{1..5}.png`** — export local fourni par la développeuse en cours de conception, correspondant à la ligne `match_details_page — vue joueur` (`cd36ac10…`) de `docs/designs/DESIGN_LINKS.md` §2. **Référence visuelle principale** pour cette passe : cinq écrans, un par onglet (Infos, Compo, Effectif, Votes, Messagerie). Aucun outil de navigation web n'était disponible pour ouvrir le lien artifact lui-même ; cet export local en tient lieu et est, de fait, plus riche que ce que l'agent PO avait pu évaluer (§6 : « probable que les maquettes contiennent des blocs sans fondement »), ce qui s'est confirmé de multiples façons — voir « Corrections obligatoires vs maquette » ci-dessous. **Aucune maquette locale équivalente n'existe pour la vue coach** (ligne `97e7d0a5…`, toujours sans instantané local, PO-MD-08) : la vue coach est conçue ici par extension symétrique de la vue joueur, signalée comme telle et à confirmer si un export coach est produit plus tard.
2. Le CDC/RBAC de la présente spec (§1, §2, §4) — autoritaire, priorité affirmée par §6 même en cas de conflit avec la maquette. C'est cette priorité qui motive la plupart des corrections listées ci-dessous : la maquette contient plusieurs blocs sans aucun champ de domaine correspondant.
3. Le code déjà construit pour les deux tableaux de bord, réutilisé directement plutôt que redessiné : `presentation/features/player-dashboard/components/{ResponseActions,NextConvocationCard}.tsx`, `presentation/features/coach-dashboard/components/{ResponseBar,NextTrainingOrMatchCard}.tsx`, `presentation/features/convocation/components/{BackHeader,SegmentedToggle}.tsx`, `presentation/shared/formatters/{convocation-type-accent,convocation-labels,match-schedule}.ts`.

### Emplacement dans la nav

Cet écran n'est **pas** un contenu d'onglet parmi les 4 fixes. Comme `convocations/new` (§7, note pour mentor-agent), c'est une **route plein écran poussée par-dessus l'onglet d'origine**, hors `AppShell`, sans barre de nav basse — cohérent avec la maquette, qui ne montre jamais la barre à 4 entrées. `presentation/app/router.tsx` ne déclare aujourd'hui que `convocations/new` à ce niveau ; cette feature ajoute un second enfant du même groupe (ex. `convocations/:id`), pas une 5ᵉ destination de nav.

- **Points d'entrée déjà présents dans le code, non câblés** : `NextConvocationCard.onOpen` côté joueur, `NextTrainingOrMatchCard.onOpen` côté coach, et les deux listes « À venir » (`onOpen(convocationId)`) — ces callbacks existent déjà en props mais ne naviguent nulle part aujourd'hui, faute d'écran cible (§1 : « la cible de navigation manquante »). PO-MD-06 (câbler dès cette passe ou attendre Calendrier) reste ouvert et non bloquant.
- **Rattachement conceptuel** : Calendrier, une fois construit, poussera la même route.
- Flèche retour : ramène à l'écran d'origine — `BackHeader` ignore déjà d'où vient l'appelant, aucune logique nouvelle nécessaire.

**Résolu (2026-09-01, décision développeuse, session de mentorat)** — l'écran restait poussé en dehors d'`ActiveRoleProvider` (même emplacement que `convocations/new`), donc `useActiveRole()` n'y était pas disponible alors que l'écran doit savoir quel onglet de rôle (Joueur / Coach) est actif pour choisir sa variante.

- `presentation/app/router.tsx` fait maintenant remonter `ActiveRoleProvider` d'un cran : il enveloppe tout le groupe authentifié + charte acceptée (le sous-groupe `AppShell`, `convocations/new` et `convocations/:id`), pas seulement la branche `AppShell`. `AppShell` garde sa portée actuelle (seuls les 4 onglets rendent la barre de nav basse) — changement d'emplacement uniquement, aucun changement de comportement d'`ActiveRoleProvider` lui-même.
- **La variante (joueur / coach) rendue par cet écran suit strictement l'onglet de rôle actif du tableau de bord** (`useActiveRole()`), pas un recalcul à partir de `user.roles` comparé à `convocation.teamId`, ni un état de routage transmis par le callback `onOpen` de la carte d'origine. Choix délibéré pour une source de vérité unique et prévisible plutôt qu'un traitement automatique du cas « joueur-coach sur la même équipe ».
- Garde ajoutée : `domain/rules/active-role-scope.ts` (`hasActiveRoleForConvocation`) — déplacé de `domain/policies/` le 2026-09-02 (revue de code) : son propre commentaire dément être une vérification d'autorisation, donc `domain/rules/` (« ce qui est vrai ») est la bonne place, pas `domain/policies/` (« qui a le droit »), CLAUDE.md §5 — pas une vérification d'autorisation (`can()` reste inchangé pour `convocation:respond`), seulement une question de rendu : l'onglet de rôle actif s'applique-t-il à l'équipe de *cette* convocation ? Si non, `RoleMismatchState` s'affiche à la place d'une variante.
- **Limite acceptée, à ne pas « corriger » silencieusement sans discussion produit** : un compte qui est à la fois joueur et coach de la même équipe, et qui ouvre cet écran avec « Joueur » actif, voit la vue joueur même pour un match qu'il coache aussi — il doit basculer son onglet de rôle actif pour voir les actions coach. C'est un choix UX assumé, pas un oubli (voir `docs/DEFAULTS-A-CHALLENGER.md`).

### Ce qui change par rôle

Reprend §2 du présent spec (tableau « Variantes de rendu par rôle »), rien de redéfini ici. Deux variantes nommées par la RBAC : **vue joueur** et **vue coach**.

**Question ouverte non résolue par §2** (voir « Questions ouvertes UI ») : la ligne « Voir les dossiers des autres membres » accorde aussi ✅ à Responsable de section (sa section), Dirigeant habilité et Administrateur, mais le tableau « Variantes de rendu par rôle » ne nomme que joueur/coach.

### Structure de l'écran, commune aux 3 types × 2 rôles

Reprend l'architecture de la maquette : un en-tête, une zone d'identité (« hero »), puis **deux onglets seulement** — Infos et Effectif — les trois autres (Compo, Votes, Messagerie) étant retirés (voir corrections ci-dessous). Cette structure à onglets est **nouvelle dans l'app** (aucun autre écran des 4 destinations fixes n'utilise d'onglets internes) ; sa justification explicite est qu'elle vient d'une maquette réellement livrée pour cet écran précis, pas d'une invention à partir d'une description écrite — et qu'elle sépare proprement ce qui est déjà décrit comme deux groupes de blocs distincts en §1 (identité + bloc par type, d'un côté ; réponses/effectif, de l'autre).

**1. En-tête** — réutilise `BackHeader.tsx` **tel quel** (`sticky top-0`, fond opaque, AC-MD-20). `title` = `formatConvocationType(convocation.type)` (« Match » / « Entraînement » / « Réunion », fonction déjà existante) — confirmé par la maquette, qui affiche seulement « Match », jamais le nom de l'adversaire en titre.

- **Note cible tactile** : `BackHeader` rend aujourd'hui le bouton retour en `size-9.5` (~38px), sous le seuil ~44px (`h-11`) qu'AC-MD-23 demande explicitement pour cet écran. À corriger au niveau du composant partagé (bénéficierait aussi à `convocations/new`) — signalé en « Questions ouvertes UI ».

**2. Zone d'identité (« hero »)**, sous l'en-tête, hors zone sticky (seul `BackHeader` doit rester visible au défilement, AC-MD-20 ne l'exige pas au-delà) :
- **Match** : reprend la maquette telle quelle — avatar rond à teinte fendue (couleurs du club) pour l'équipe, « VS », avatar à initiales pour l'adversaire (`opponent.name`, entité `Opponent` — pas de logo, seulement `id`/`name`, donc initiales calculées comme partout ailleurs dans l'app). Aucune nouvelle donnée requise : uniquement `opponent.name`.
- **Entraînement / Réunion** : pas de face-à-face (pas d'adversaire) — reprend le patron déjà établi par `NextConvocationCard.tsx` (icône `TYPE_ICON` + titre, où le titre suit déjà la même logique conditionnelle : `meetingDetails.title` pour une réunion, `formatConvocationType` pour un entraînement).
- **Pastille de statut**, en haut à droite du hero (même emplacement que « CONVOQUÉE » dans la maquette, **contenu corrigé** — voir ci-dessous) : « Clôturée » / « Annulée » seulement — **révisé le 2026-09-02 (décision développeuse)** : `open` n'affiche aucune pastille, l'état actif étant le défaut silencieux de l'écran ; la pastille ne sert qu'à signaler une exception (clôture, annulation). Réutilise le primitive `Badge`, étend le vocabulaire couleur déjà établi (vert positif / rouge négatif / neutre) plutôt que d'inventer une palette. Quand elle est rendue, toujours doublée du libellé texte (AC-MD-05, AC-MD-22).
- Si `cancelled` : ligne secondaire discrète sous le hero, « Motif : {cancellationReason} », seulement si non vide — donnée d'**événement** (§1 point 2), jamais confondue avec `ConvocationResponse.reason` (absent de l'écran pour tout le monde, AC-MD-12).

**3. Onglet « Infos »** — identité générique + bloc spécifique au type, en lignes **label à gauche / valeur à droite**, reprenant le style de la maquette (pas de paires de champs côte à côte sur cet écran, donc pas de risque de recouvrement `min-w-0` au sens de `CLAUDE.md` §6 — chaque ligne occupe la largeur complète ; une valeur longue s'enroule sur deux lignes plutôt que de chevaucher un voisin) :
- Ligne « Coup d'envoi » (ou « Date »/« Heure » pour entraînement/réunion) : `Convocation.date`.
- Ligne « Lieu » : `Convocation.location` (lieu de la rencontre — pour un match, distinct du lieu de RDV, AC-MD-03).
- **Match uniquement**, quatre lignes distinctes (AC-MD-03), aucune fusionnée :
  - « Domicile / Extérieur » : `MatchDetails.isHome`, rendue en ligne texte (« Domicile » ou « Extérieur »), pas en bouton — l'information est un fait affiché, jamais une action, donc pas de forme de bouton qui suggérerait une interactivité absente.
  - « RDV — heure » : `MatchDetails.meetingPointTime`.
  - « RDV — lieu » : `MatchDetails.meetingPointLocation`.
- **Réunion uniquement** : Titre (`MeetingDetails.title`) puis « Ordre du jour » — liste numérotée en lecture seule (pastille numérotée + texte, même forme que `MeetingAgendaField` mais sans icône de suppression ni champ d'ajout), ordre = celui du tableau `agenda`. Agenda vide (AC-MD-04) : ligne de substitution explicite « Aucun point à l'ordre du jour ».
- **Entraînement** : rien au-delà de Coup d'envoi / Lieu (AC-MD-02) — pas d'espace compensatoire.

**4. Onglet « Effectif »** — nouveau composant, décrit ci-dessous. Contenu conditionné par le rôle (§2) :
- **Vue joueur** : « Ma réponse » (intégrée à la première ligne de la liste, propre à l'utilisateur) + « Qui a répondu » (reste de l'effectif, badge binaire). **Jamais** l'agrégat présents/absents/en attente sur cette vue (AC-MD-10).
- **Vue coach** : agrégat (réutilise `ResponseBar.tsx` tel quel, en tête de l'onglet) + « Qui a répondu » (effectif entier, statut tri-état réel, PO-MD-03).

### Nouveau composant — liste « Effectif »

Reprend directement l'onglet « Effectif » de la maquette (`…selection_3.png`), avec deux corrections de fond (badge et sous-libellé, détaillées plus bas) :

- **Forme de ligne** : avatar (cercle à initiales, même style que les avatars « CP »/« MB » déjà utilisés ailleurs dans l'app) + nom + indicateur de fin de ligne. En-tête de section : « Qui a répondu » à gauche, compteur d'effectif à droite (même position/style que les en-têtes déjà établis ailleurs, ex. « DESTINATAIRES · N sélectionnés »).
- **Première ligne = l'utilisateur courant, côté joueur uniquement** (« <nom du joueur> (moi) » dans la maquette) : si `canRespond` est vrai, la ligne porte l'invite « Tu n'as pas encore répondu » (ou l'inverse si déjà répondu) et les deux boutons Présent/Absent — même logique et mêmes props que `ResponseActions.tsx` (`canRespond`, `myResponse`, `onRespondPresent`, `onRespondAbsent`), mais **intégrée dans la ligne de liste** plutôt que dans une carte séparée comme sur le tableau de bord : un positionnement différent du même composant, pas une réécriture de sa logique. Si `canRespond` est faux, la ligne se comporte exactement comme `ResponseActions` en dehors de la fenêtre de réponse (ligne de statut ou rien du tout, AC-MD-13).
- **Lignes suivantes = le reste de l'effectif convoqué** (AC-MD-09) : toujours l'effectif complet, y compris les non-répondants, jamais filtré aux seuls répondants.
- **Variante joueur — badge binaire** (AC-MD-09, §6) : « A répondu » / « En attente ». **Couleurs neutres, jamais vert/rouge** (voir correction ci-dessous) — toujours doublées du libellé texte (AC-MD-22).
- **Variante coach — statut tri-état réel** (PO-MD-03) : « Présent » / « Absent » / « En attente », avec le vocabulaire couleur **déjà établi** par `ResponseBar` (vert/rouge/blanc atténué) — légitime ici puisque le coach a le droit de voir le statut, et cohérent visuellement avec l'agrégat juste au-dessus dans le même onglet.
- **Effectif entièrement « en attente »** (personne n'a encore répondu, §6, état à couvrir) : rendu normal, chaque ligne « en attente » — pas un état vide spécial, puisque la liste elle-même reste peuplée.
- **Tri** : non spécifié par le CDC ni visible clairement sur la maquette (l'ordre exact des joueuses n'y est pas justifié par une règle) — proposition alphabétique par nom, à confirmer (voir « Questions ouvertes UI »).

### Corrections obligatoires vs maquette

Constats de cette passe, pas des choix de designer-agent à refaire — chacun est un bloc ou un champ que la maquette montre sans support dans le modèle de domaine actuel, ou qui contredit une règle explicite du §6 :

1. **Pastille « CONVOQUÉE »** (haut droite du hero) → remplacée par la pastille de **statut réel** (Ouverte/Clôturée/Annulée, AC-MD-05). « Convoquée » ne correspond à aucun champ du domaine — `ConvocationStatus` est `'open' | 'closed' | 'cancelled'`, et il n'existe aucune notion de « convoqué visible à l'écran » par joueur (§5, « la source de vérité des convoqués requis reste ouverte », à ne pas résoudre implicitement ici).
2. **Onglets « Compo », « Votes », « Messagerie »** → supprimés entièrement, pas grisés ni masqués conditionnellement. Aucun support de domaine : pas de composition/lineup modélisée, aucune entité de vote nulle part dans le schéma, Communication est **P1** (§1, Hors périmètre). Seuls « Infos » et « Effectif » restent.
3. **Lignes « ADRESSE » et bloc « TRANSPORT »** (onglet Infos) → supprimés : aucun champ de domaine correspondant (`MatchDetails` ne porte que `meetingPointLocation`/`meetingPointTime`, `Convocation` ne porte que `location`).
4. **Carte « carte — plan d'accès » et bouton « Itinéraire »** → supprimés : aucune intégration cartographique dans le périmètre, aucun champ de domaine à afficher.
5. **Bloc « MOTS DU COACH »** (texte libre) → supprimé : aucun champ de domaine ne porte de commentaire pré-échéance du coach — à ne pas confondre avec `cancellationReason`, qui existe mais ne s'affiche que si `status === 'cancelled'`.
6. **Bloc « À PRÉVOIR »** (checklist maillot/protège-tibias/gourde/licence) → supprimé : aucun champ de domaine.
7. **Ligne « LIEU RDV » fusionnant vestiaire et nom du stade** → scindée en deux lignes distinctes pour respecter AC-MD-03 : « Lieu » (`Convocation.location`, ex. « Stade municipal ») et « RDV — lieu » (`MatchDetails.meetingPointLocation`, ex. « Vestiaires »).
8. **Domicile/Extérieur, absent de la maquette** → ajouté : requis par AC-MD-03 (les 4 champs de `MatchDetails` doivent être rendus, dont `isHome`) et par AC-MD-22 (l'information ne peut jamais être portée par la seule couleur ou par l'ordre d'affichage des deux équipes).
9. **Badge « a répondu » en vert** (onglet Effectif) → recoloré. Interdit explicitement par §6 : « éviter le couple vert/rouge déjà employé pour présent/absent... un badge vert lirait présent ». Initialement recoloré en teinte neutre ; **révisé le 2026-09-01 (décision développeuse)** en ambre (`coach-amber`, déjà utilisé pour l'accent du type « réunion ») — distinct du gris « en attente » sans reprendre le vert/rouge présent/absent, donc toujours conforme à la règle du §6. Le badge « en attente » (gris neutre dans la maquette) reste inchangé.
10. **Sous-libellé de poste** (« Gardienne », « Milieu », « Attaquante », « Défenseure » sous chaque nom, onglet Effectif) → supprimé initialement : `User` (`domain/entities/user.ts`) ne portait aucun champ de poste/position. **Réintroduit le 2026-09-01 (décision développeuse)** : `User.position: PlayerPosition | null` ajouté au domaine, colonne `public.users.position` correspondante (`20260901125851_user_player_position.sql`), `get_convocation_responders()` élargie pour l'exposer (donnée non sensible, même classe de visibilité que `display_name`) — le sous-libellé est désormais affiché dans `RosterRow`/`SelfRosterRow`, omis quand `position` est `null`.

### États à couvrir (§6)

| État | Traitement |
|---|---|
| Introuvable / hors périmètre (AC-MD-01) | Écran centré sous `BackHeader` (titre générique, le type étant inconnu) : icône + texte « Convocation introuvable », rien d'autre — pas de distinction visuelle entre inexistant et hors périmètre |
| Entraînement sans bloc de type (AC-MD-02) | Onglet Infos : Coup d'envoi + Lieu seulement, aucun espace compensatoire |
| Ordre du jour vide (AC-MD-04) | Ligne de substitution explicite dans l'onglet Infos, jamais une liste vide silencieuse |
| Clôturée / annulée (AC-MD-05, PO-MD-07) | Pastille de statut + motif le cas échéant ; Infos inchangé (PO-MD-07, déjà tranché) ; Effectif continue de se rendre normalement — le bouton Présent/Absent s'efface naturellement via `canRespond` |
| Échéance dépassée (AC-MD-13) | Déjà géré par la logique de `ResponseActions` réutilisée dans la première ligne de l'Effectif : action absente, jamais grisée |
| Personne n'a encore répondu | Effectif entièrement « en attente », rendu normal des deux côtés — pas un état vide |
| Agrégat coach 0/0/0 | `ResponseBar` réduit aujourd'hui chaque segment à une largeur 0 quand `total === 0`, ce qui fait disparaître la barre entière plutôt que de rendre un état neutre visible — à corriger (segment neutre plein sur toute la largeur si `total === 0`), sinon cet état n'a pas de rendu graphique correct |

### Composants réutilisés vs nouveaux

- **Réutilisés tels quels (code, pas seulement maquette)** : `BackHeader.tsx`, `ResponseActions.tsx` (logique, repositionnée en ligne de liste), `ResponseBar.tsx` (avec la correction 0/0/0 ci-dessus), `Badge`/`Card` (shadcn), `CONVOCATION_TYPE_ACCENT`, `formatConvocationType`, `TYPE_ICON`/logique de titre conditionnel de `NextConvocationCard.tsx`.
- **Nouveau, justifié par une maquette réellement livrée** : la structure à deux onglets (Infos/Effectif) — nouveau pattern dans l'app, justifié explicitement ci-dessus plutôt qu'adopté par confort.
- **Nouveau, mais pas un nouveau pattern visuel** : la liste « Effectif » (silhouette de ligne directement issue de la maquette, badge issu du primitive `Badge`, palette tri-état empruntée à `ResponseBar`).
- **Réellement nouveau** : la palette neutre du badge binaire vue joueur — justifiée par une contrainte explicite (§6), pas choisie par confort, et **différente de la maquette** (correction 9 ci-dessus).

### Questions ouvertes UI

Aucune n'est bloquante pour la transmission à mentor-agent.

1. **Rendu pour Responsable de section / Dirigeant habilité / Administrateur.** La RBAC §2 leur accorde ✅ sur « voir les dossiers des autres membres », mais le tableau « Variantes de rendu par rôle » ne nomme que joueur/coach. Proposition : les traiter comme la **vue coach** (Effectif tri-état + agrégat), scopés à leur périmètre (section, ou portée admin) via la même ligne de consultation universelle du §2 — à confirmer par la développeuse ; non bloquant si le mapping rôle → variante reste un paramètre du ViewModel plutôt que codé en dur dans le composant.
2. **Vue coach sans maquette locale.** Seule la vue joueur a été livrée en export PNG cette fois (`docs/designs/player-match-details/`) ; la vue coach ci-dessus est une extension par symétrie (même onglet Effectif, palette tri-état + `ResponseBar` en tête) plutôt qu'une maquette dédiée relue. À confirmer si/quand un export coach équivalent est produit (PO-MD-08).
3. **Cible tactile de `BackHeader`.** `size-9.5` (~38px) mesuré dans le code actuel, sous le seuil ~44px qu'AC-MD-23 demande explicitement pour cet écran. À trancher : bump du composant partagé vers `size-11` (impacte aussi `convocations/new`) ou tolérance assumée pour ce composant précis.
4. ~~**Correction `ResponseBar` pour l'état 0/0/0**~~ — **résolu le 2026-09-02 (décision développeuse)** : la barre segmentée est masquée quand `total === 0` (au lieu d'une barre neutre pleine largeur) ; la légende (0 présents / 0 absents / 0 en attente) reste affichée. Appliqué au composant partagé, donc valable pour coach-dashboard et l'onglet Effectif.
5. **Ordre de tri de l'Effectif.** Non spécifié par le CDC ni justifié par la maquette — proposition alphabétique par nom, à confirmer en implémentation.

**Prêt pour transmission à mentor-agent : oui**, sous réserve des 5 points ci-dessus (aucun bloquant).
