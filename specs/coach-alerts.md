# Spec — Écran « Alertes » (Coach/Staff)

> Statut : **rédaction initiale du 2026-09-30** (product-owner-agent), **amendée le 2026-09-30** après décisions développeuse — **PO-AL-01 résolu** (équipe active seule), **PO-AL-05 résolu** (lectures en bloc), **PO-AL-02 résolu** (pas de nouvelle entrée de matrice), **PO-AL-03 re-résolu** (compteur ajouté, renversant la première résolution « icône seule »), **aucune maquette** (confirmé). **Implémentée** — PO-AL-04 (tri par défaut) et PO-AL-06 (élargissement au-delà du Coach) restent ouverts mais ne bloquent ni la conception ni l'implémentation (défauts déjà posés en §6/§7).
> Sources CDC : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0/P1 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles).
> Specs antérieures reprises **sans réinterprétation** : `specs/calendar.md` (AC-CA-16, note datée du 2026-09-30 ; ligne d'échéance, `ScheduleInfo`), `specs/match_details_page.md` (AC-MD-05, note datée du 2026-09-30 ; `BackHeader` `sticky top-0`), `specs/match-stats.md` (MS-01/MS-05, AC-MS-05/07/13/15, actions `match_result:record` / `match_goals:view`), `specs/coach-attendance-confirmation.md` (`attendance:validate`), `specs/coach-dashboard.md` (PO-2/PO-6, en-tête, AC-CD-14), `specs/coach-team-stats.md` (précédent de route poussée, `team_stats:view`), `specs/player-stats.md` (précédent d'écran de rôle unique atteint par URL directe).
> Code lu pour cadrer : `domain/policies/{rbac-matrix,can,match-outcome-rules,match-result-timing-rules}.ts`, `domain/rules/convocation-rules.ts` (`isPastDate`), `domain/repositories/{convocation,match-details,match-event}-repository.ts`, `domain/usecases/coach-dashboard/ListTeamConvocationsUseCase.ts`, `presentation/shared/components/AttendanceConfirmationAlert.tsx`, `presentation/features/convocation/useConvocationDetailViewModel.ts`, `presentation/features/convocation/components/MatchResultScorerPicker.tsx`, `presentation/features/calendar/useCalendarViewModel.ts`, `presentation/features/coach-dashboard/{useCoachDashboardViewModel.ts,components/CoachHeader.tsx}`, `presentation/app/providers/active-team-provider.tsx`, `presentation/app/router.tsx`.

## 0. Maquette — aucune, et c'est acté

**Décision développeuse (2026-09-30) : il n'existe aucune maquette pour cet écran**, ni lien artifact, ni export PNG. La conception se fait **à partir de cette spec seule**, par composition de patrons existants (§7). Vérifié en amont côté dépôt : aucune ligne dans `docs/designs/DESIGN_LINKS.md` §2, aucun instantané correspondant dans l'arborescence `docs/designs/*.png`.

Le §4 du registre demande que l'agent inscrive la ligne **une fois la réponse obtenue**, pour qu'aucun run ultérieur ne repose la question. La réponse étant « aucune maquette », le statut est **`absent`** au sens du §2 du registre (« aucune maquette encore produite pour cette feature ») — à ne pas confondre avec `instantané seul`, qui suppose un export versionné.

**Ligne de registre à ajouter, prête à committer telle quelle** — l'agent PO n'écrit pas hors de `specs/` (contrainte de son rôle, invariante depuis `specs/menu.md` ; toutes les lignes `menu`, `actus`, `player-vote`, `web-*`, `match-stats`, `player-stats`, `coach-team-stats` ont été inscrites par l'agent designer à partir d'une formulation pré-rédigée ici). **À reprendre verbatim par designer-agent, même procédé :**

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| coach-alerts — **vue coach (écran Alertes)** | — aucune maquette produite | 2026-09-30 | N/A | **absent** |

**Note d'accompagnement suggérée pour le registre** (même forme que les notes existantes) : *« Ligne ajoutée conformément au §4 — aucune ligne n'existait pour cette feature. Cas inédit du registre : la développeuse a confirmé (2026-09-30) qu'**aucune maquette n'a été produite**, ni lien ni export. Statut `absent`, à ne pas confondre avec `instantané seul` (aucun fichier à référencer). Ne plus demander de lien pour cette feature lors d'un run ultérieur : la conception a été faite à partir de `specs/coach-alerts.md` seule, par composition de patrons existants (`ScheduleInfo`, ligne du Calendrier, `BackHeader`, `EmptyState`, `AttendanceConfirmationAlert`). »*

**Conséquence de périmètre, à ne pas contourner** : contrairement à `coach-team-stats`, `player-stats` ou `match-stats`, cette spec est rédigée **sans aucun signal visuel de périmètre**. Tout ce qui est décrit ci-dessous vient de la demande développeuse et des règles déjà construites, jamais d'une maquette — d'où le parti pris constant de **réemployer la ligne du Calendrier** plutôt que d'inventer une mise en page (§7).

## 1. Périmètre

Un **Coach/Staff ouvre un écran « Alertes »**, atteint depuis une **icône d'alerte placée à côté de l'avatar dans l'en-tête du tableau de bord coach** (`CoachHeader`). L'écran liste les convocations **de son équipe active** qui appellent encore une action de sa part, et **laquelle / lesquelles**. Taper une ligne ouvre la route existante `/convocations/:id` (`ConvocationDetailPage`).

C'est une feature **en lecture seule et sans donnée nouvelle** : elle ne crée aucune entité, aucune colonne, aucune action RBAC, et **n'écrit rien**. Elle *compose* trois signaux déjà construits et **les route** vers l'écran qui sait déjà les traiter.

### Portée d'équipe — tranchée

**Décision développeuse (2026-09-30), PO-AL-01 résolu : l'écran est borné à l'ÉQUIPE ACTIVE**, celle que porte `ActiveTeamProvider` (`presentation/app/providers/active-team-provider.tsx`) — exactement la même équipe que le tableau de bord coach, le Calendrier et `team-stats`. En conséquence, et ce sont trois conséquences structurelles, pas des détails de rendu :

- **aucune agrégation inter-équipes** : un coach affecté à deux équipes voit les alertes d'une seule à la fois, celle qui est active ;
- **aucun libellé d'équipe sur une ligne** — la ligne n'a pas à désambiguïser ce que l'en-tête nomme déjà ;
- **aucun sélecteur propre à cet écran** : la bascule d'équipe reste celle de l'en-tête du tableau de bord (`CoachHeader`), jamais dupliquée ici.

**Raison retenue : la cohérence avec tous les autres écrans coach.** Depuis la résolution de PO-6 (2026-09-30), « l'équipe active » est un état partagé de l'application, pas une notion propre à un écran. Un écran d'alertes qui agrégerait deux équipes serait le seul à contredire l'équipe nommée dans l'en-tête juste au-dessus de son point d'entrée.

⚠️ **Contrepartie assumée, à consigner plutôt qu'à masquer** : pour un coach multi-équipes, **le retard de l'équipe non active reste invisible tant qu'il n'a pas basculé**. C'est un écart connu et accepté au titre de la cohérence, pas un oubli — il rejoint la famille de questions déjà ouvertes par PO-CTS-05 (« deux écrans distincts ou un sélecteur »), et se rouvrira avec elle, jamais seul.

### Rattachement CDC et priorité

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Calendrier et convocations | **P0** | Une **vue filtrée** des convocations de l'équipe active (celles qui restent à traiter). Aucune création, aucune modification, aucune annulation |
| Présences et suivi sportif | **P0** | Le **rappel** qu'une présence n'est pas entièrement constatée. Aucune saisie de présence sur cet écran |

⚠️ **Ce n'est pas le module Communication (P1).** Malgré le mot « alerte », rien ici n'est une notification au sens du CDC : pas de push, pas de courriel, pas de préférence par canal, pas de destinataire autre que le coach qui regarde son propre écran. C'est un **filtre de sa propre liste de convocations**, calculé à la lecture. Le jour où une vraie notification poussée est demandée, c'est une autre feature, sous un autre module (P1) — AC-AL-13.

### Les trois signaux — repris tels quels, jamais redérivés

Chacun existe déjà dans le dépôt. Cette feature **ne redéfinit aucune des trois conditions** : elle les applique à une liste au lieu d'une convocation.

| # | Signal | Condition exacte (déjà construite) | Source |
|---|---|---|---|
| **A** | **Présences à confirmer** | `convocation.status === 'open'` **et** `isPastDate(convocation.date, now)` — tous types confondus (entraînement / match / réunion). Une convocation passée encore `open` signifie que le trigger `attendance_records_close_convocation` n'a jamais basculé son statut, donc qu'au moins une présence n'a pas été constatée | `specs/match_details_page.md` AC-MD-05 et `specs/calendar.md` AC-CA-16 (notes datées du 2026-09-30) ; `attendanceConfirmationMissing` dans `useConvocationDetailViewModel.ts` et `useCalendarViewModel.ts` |
| **B** | **Score de match manquant** | `convocation.type === 'match'`, coup d'envoi passé (`isMatchResultRecordable(convocation.date, now)`, soit `now > date`), et `matchDetails.goalsFor === null` (donc `goalsAgainst === null` aussi — MS-01, les deux sont nuls ensemble ou aucun) | `specs/match-stats.md` MS-01/AC-MS-13/AC-MS-15 ; `domain/policies/match-result-timing-rules.ts` |
| **C** | **Attribution des buteurs incomplète** | Score enregistré (`goalsFor !== null`), `goalsFor > 0`, et `attributedCount < goalsFor` où `attributedCount` est le nombre d'événements `match_events` de type `goal` de ce match | `specs/match-stats.md` MS-05/AC-MS-05 ; `isScorerCountConsistent` (`domain/policies/match-outcome-rules.ts`) ; complément exact de `allGoalsAttributed` dans `MatchResultScorerPicker.tsx` |

**Points de bord, à ne pas régler « au feeling » à l'implémentation :**

1. **Une convocation annulée n'est jamais une alerte.** Pour le signal A, c'est automatique (`status === 'open'` exclut `cancelled`). Pour B et C, l'exclusion doit être **écrite explicitement** — même règle de liste blanche qu'AC-MS-07, qui exclut déjà les convocations annulées de tout agrégat de résultat.
2. **Une convocation `closed` reste éligible aux signaux B et C.** `closed` signifie « présences entièrement constatées », rien de plus : un match dont les présences sont pointées peut parfaitement n'avoir ni score ni buteurs. B et C ne doivent donc **pas** être conditionnés à `status === 'open'` — seulement à « non annulée ». Confondre les deux ferait disparaître silencieusement la moitié des alertes de résultat.
3. **`goalsFor === 0` n'est jamais une alerte C.** Une équipe qui n'a pas marqué n'a structurellement aucun buteur à attribuer — c'est exactement le cas `noGoalsToAttribute` déjà distingué de `allGoalsAttributed` dans `MatchResultScorerPicker.tsx` (2026-09-30). Une ligne « attribution incomplète » sur un 0–3 serait un faux positif permanent que rien ne pourrait résoudre.
4. **Une convocation cumulant plusieurs signaux produit UNE ligne**, portant **N actions manquantes** (typiquement A + B sur un match passé). Jamais deux lignes pour la même convocation — la ligne est indexée par la convocation, pas par le signal.

### Hors périmètre — explicitement

- **Toute écriture.** Aucune confirmation de présence, aucune saisie de score, aucune attribution de buteur **depuis cet écran** : la ligne *route* vers `/convocations/:id`, qui porte déjà ces contrôles. Aucune action rapide en ligne, aucun swipe, aucun « tout marquer comme traité » (AC-AL-02).
- **Toute UI de détail nouvelle** : cet écran ne rend aucun bloc de `ConvocationDetailPage`, ni en résumé, ni en aperçu.
- **Toute portée multi-équipes** : pas d'agrégat inter-équipes, pas de libellé d'équipe par ligne, pas de sélecteur d'équipe propre à cet écran (§1, PO-AL-01 résolu — AC-AL-20).
- **Tout nom de personne.** Une ligne nomme un **événement** (date, type, adversaire), jamais un joueur — ni « les 3 joueurs sans présence confirmée », ni le buteur manquant, ni le répondant en attente (§3, AC-AL-09).
- **Tout état persisté d'alerte** : pas de « lu / non lu », pas d'accusé, pas de mise en sourdine, pas de report, aucune table ni colonne. Les trois signaux sont **dérivés à la lecture**, comme l'issue d'un match l'est déjà (MS-02) — AC-AL-12.
- **Toute notification poussée** (push, courriel, badge système, préférence de canal) — module Communication, **P1**, non demandé (AC-AL-13).
- **Tout autre signal**, même plausible : cartons non saisis, votes non dépouillés, `penalty_missed`, réunions sans ordre du jour, documents manquants, cotisations en retard, relance des indécis (`specs/coach-dashboard.md` PO-4, déjà écartée). **Trois signaux, exactement trois** — en ajouter un quatrième est une demande produit, pas une extension évidente.
- **Toute alerte côté joueur, Responsable de section, Dirigeant, Trésorier, Référent médical, Bénévole ou Administrateur** (§2).
- **Tout filtre par compétition ou par période.** ~~Tout filtre (par type, par compétition, par période).~~ **Partiellement renversé (2026-09-30, décision développeuse) :** un filtre par **type de convocation** est ajouté (voir « Composant nouveau » ci-dessous, `CoachAlertsTypeFilter`) — pur état d'affichage local, aucune nouvelle lecture (les alertes sont déjà toutes chargées, §6 point 2/PO-AL-05, inchangé). Compétition/période restent hors périmètre.
- **Une 5ᵉ entrée de nav basse.** Comme `/profile`, `/stats`, `/team-stats` et `/convocations/:id`, c'est une **route poussée** hors `AppShell`, sans `BottomNav` (AC-AL-14).

### L'icône dans l'en-tête — et ce qu'elle n'est pas

`CoachHeader.tsx` porte aujourd'hui, à droite de la rangée pastille de rôle / pastille d'équipe : un **avatar à initiales** (`absolute top-0 right-0`) qui navigue vers `/profile`. **Il n'y reste aucune pastille de notification décorative** — le point rouge décrit par `specs/coach-dashboard.md` §1 point 1 et sa « UI design » §1 (« avatar / initiales avec pastille de notification (point rouge) ») **a été retiré des en-têtes**, retrait déjà consigné par `specs/calendar.md` (« UI design » §1) et `specs/profile-page.md` (§1 du bloc identité).

Deux conséquences à énoncer plutôt qu'à laisser deviner :

1. **Cette icône d'alerte n'est pas la réapparition de cette pastille.** C'est un **contrôle réel, avec une destination réelle** — un bouton nommé, pas un ornement sur l'avatar. Elle ne doit **pas** être posée *sur* l'avatar, ni le redécorer (AC-AL-15).
2. **`specs/coach-dashboard.md` n'est pas réécrit ici** (règle : ne jamais écraser une spec existante). Son §1 point 1 décrit toujours une pastille de notification « hors périmètre, à traiter par la feature notifications si/quand elle existe » — cette feature **n'est pas** cette feature notifications (§1, hors périmètre). Amendement **proposé, non appliqué** : l'en-tête coach gagne une icône d'alerte cliquable, et la mention de la pastille décorative devient caduque. À valider par la développeuse — **PO-AL-03**.

## 2. RBAC

### Lecture de la matrice — aucune réinterprétation

Cette feature **n'ouvre aucun droit**. Elle liste des convocations que le coach **peut déjà lire** et signale des actions qu'il **peut déjà accomplir**, sur l'écran où il les accomplit déjà. Les lectures de matrice qui la fondent sont donc celles **déjà faites et figées** ailleurs :

- signal **A** → `specs/coach-attendance-confirmation.md` §2 (`attendance:validate`, `['coach']`, portée équipe) ;
- signaux **B** et **C** → `specs/match-stats.md` §2 (`match_result:record`, `['coach']`, portée équipe ; le comptage des `goal` derrière C relève de `match_goals:view` / `match_events_select_scoped`, déjà en place).

Lignes CDC applicables, pour mémoire : « **Créer/modifier une convocation** » (Coach/Staff ✅ son équipe) et « **Voir les dossiers des autres membres** » (Coach/Staff ❌, *son équipe, hors financier*). Aucune ligne « alertes » ni « notifications » n'existe dans la matrice — c'est attendu : le module Communication est P1 et cette feature n'en relève pas (§1).

| Rôle | Traduction sur cette feature |
|---|---|
| Joueur / Joueuse | **Aucun accès.** Ni l'icône, ni la route, ni les données. Les trois signaux sont coach-only par construction (`attendanceConfirmationMissing` vaut déjà `false` côté joueur — AC-CA-09/AC-CA-16) |
| **Coach / Staff** | **Seul rôle servi.** Lecture, **son équipe active uniquement** (§1) |
| Responsable de section | **Aucun accès dans cette passe.** Écart assumé et borné, même position que PO-AT-01 / PO-MS-01 / PO-CTS-05 — et ici l'élargissement pose en plus un problème propre (§3, PO-AL-06) |
| Dirigeant habilité | Aucun accès. Même écart assumé, même renvoi |
| Trésorier | Aucun accès — aucune donnée financière ici |
| Référent médical | Aucun accès. Une présence non confirmée **n'est pas** une donnée de santé et ne doit jamais être rapprochée de son périmètre (§3) |
| Bénévole | Aucun accès |
| Administrateur | **Aucune entrée de matrice, aucun point d'entrée construit** — même formulation que `'attendance:validate'` et `'team_stats:view'`. Le statu quo RLS n'est ni retiré ni élargi |

**AC-01 / AC-02 (CDC §17.2) s'appliquent intégralement** : un coach ne voit que les équipes auxquelles il est affecté — et, sur cet écran, une seule d'entre elles à la fois (AC-AL-20).

### Actions — zéro nouvelle, et c'est le point central

| Signal | Action existante consommée | Portée | Déjà dans `requiresTeamScope` de la branche `'coach'` de `can.ts` ? |
|---|---|---|---|
| A — présences à confirmer | `attendance:validate` | son équipe | **oui** |
| B — score manquant | `match_result:record` | son équipe | **oui** |
| C — buteurs incomplets | `match_result:record` (+ lecture des `goal` via `match_goals:view` / RLS) | son équipe | **oui** |

**Cette feature ne modifie ni `domain/policies/actions.ts`, ni `rbac-matrix.ts`, ni `can.ts`** (AC-AL-04). Les deux actions consommées figurent déjà dans la liste `requiresTeamScope` de la branche `'coach'` — le piège « action ajoutée à la matrice sans contrôle de portée », corrigé six fois dans le dépôt, **ne se présente pas ici** précisément parce qu'aucune action n'est ajoutée.

**Portail de l'écran** — composition, pas nouvelle règle ; `teamId` est celui de l'**équipe active** (§1) :

```
activeRole === 'coach'
  && ( can(user, 'attendance:validate', { teamId }) || can(user, 'match_result:record', { teamId }) )
```

Le gate sur `activeRole` est **obligatoire** : un compte multi-rôles coach+joueur avec « Joueur » actif ne doit voir **ni l'icône ni l'écran**, même si `can()` passerait au titre de son autre rôle — exactement le raisonnement déjà appliqué à `canValidateAttendance`, `canRecordMatchResult`, `canCastVote` et `canRespond` dans `useConvocationDetailViewModel.ts`.

⚠️ **Écart assumé vis-à-vis du précédent `team_stats:view`, à confirmer.** `specs/coach-team-stats.md` §2 a créé une entrée de matrice **pour le seul routage de l'écran**, au motif que `presentation/` doit décider de rendre l'écran entier avant toute requête. Le même raisonnement pourrait justifier un `alerts:view` ici. Il n'est **pas** retenu, pour deux raisons : (a) la consigne de cadrage de cette feature interdit explicitement toute entrée RBAC nouvelle ; (b) contrairement à `team_stats:view`, **chacun des signaux rendus a déjà sa propre action coach scopée équipe**, et l'écran ne rend rien d'autre — une troisième entrée serait une seconde source de vérité pour une règle déjà exprimée deux fois, soit exactement le « risque de divergence » que l'en-tête de `rbac-matrix.ts` proscrit. Ce choix est défendable mais **n'est pas tranché par un document** : **PO-AL-02**.

**Règle d'affichage** (moindre privilège) : pour tout rôle non autorisé, **l'icône et l'écran sont absents**, jamais grisés, jamais suivis d'une erreur au clic. Pour une arrivée par **URL directe** avec le mauvais rôle actif, reprendre le précédent `player-stats` (`PlayerStatsWrongRoleState`, commit du 2026-09-30 « show a coach-appropriate message on the wrong role ») : un état explicite, **sans aucune requête de données** (AC-AL-05).

## 3. Données sensibles

### Santé — aucune, et un vecteur à tenir fermé

Ni diagnostic, ni aptitude, ni indisponibilité médicale. Cet écran signale qu'une **présence n'est pas constatée**, jamais le contenu d'une présence. Les trois champs voisins déjà fermés en amont le restent, **non lus, non transportés, non agrégés** : `AttendanceRecord.note` (AC-AT-08), `AttendanceRecord.absence_validity` (PO-AT-05), `ConvocationResponse.reason` (AC-MD-12/AC-CA-13) — AC-AL-10.

⚠️ Une présence non confirmée **n'est pas** une donnée de santé, et ne doit jamais être ouverte au Référent médical à ce titre.

### Financier — aucun

Aucun montant, aucune cotisation, aucune adhésion, aucun statut de paiement. Le Coach/Staff a ❌ sur « Voir le statut de cotisation », et rien ici n'a besoin d'y toucher.

### Données personnelles de tiers — le contraire de `coach-team-stats`

C'est, à ce jour, **l'écran coach le moins nominatif du projet** : une ligne décrit un **événement** (date, type, adversaire, actions manquantes), **jamais une personne**. Strictement moins de donnée nominative que le Calendrier, qui rend déjà un agrégat de réponses par échéance.

Cette propriété est une **contrainte, pas une observation** : ni nom, ni initiale, ni compte de joueurs concernés ne doit apparaître sur une ligne d'alerte (AC-AL-09). Un compteur agrégé strictement événementiel (« 2 / 3 buts attribués », lecture directe d'`attributedCount`/`goalsFor` déjà rendue par `MatchResultScorerPicker`) reste admis — il ne désigne personne.

### Journal d'audit — à signaler, pas à omettre

- Lu littéralement, **le CDC §11.3 n'exige rien ici** : ses actions sensibles sont création/suppression de compte, changement de rôle, consultation de donnée santé, modification de paiement, correction de points Legacy, export nominatif. Consulter sa propre liste de tâches restantes n'y figure pas — et, contrairement à `coach-team-stats` (§3 de cette spec-là), **la frontière avec l'« export nominatif » n'est pas mince ici : elle est franche**, puisqu'aucune donnée nominative n'est rendue. Aucun export, aucun partage, aucune copie n'est construit (AC-AL-11).
- ⚠️ **Un point à consigner quand même** : cet écran est, de fait, une **mesure du retard de travail d'un membre du staff**. Tant qu'il n'est visible que du coach concerné, sur son propre écran, ça reste un outil personnel. Ouvert un jour à un Responsable de section ou à un Dirigeant (PO-AL-06), le même écran devient un **indicateur nominatif de performance sur une personne du staff** — un changement de nature, pas une extension de portée. À poser **avant** tout élargissement, pas après.
- ⚠️ **La table de journal d'audit reste absente de `supabase/migrations/`** : exigence transversale P0 non résolue du projet, distincte de cette feature (constat déjà porté par `specs/create-convocation.md` §4, `specs/match_details_page.md` §3, `specs/match-stats.md` §3 et `specs/coach-team-stats.md` §3).

## 4. Critères d'acceptation

`AC-01`/`AC-02` sont ceux du CDC §17.2. Les critères propres à cette feature sont préfixés **`AC-AL-`**, même convention que `AC-CA-`/`AC-MD-`/`AC-MS-`/`AC-AT-`/`AC-CTS-`.

| Réf. | Critère |
|---|---|
| **AC-01** | Aucune donnée d'un membre extérieur à l'équipe du coach n'est accessible, ni à l'écran ni dans la réponse API |
| **AC-02** | Un coach de l'équipe A n'obtient **aucune ligne** portant une convocation de l'équipe B. Vérifié **par appel direct à l'API**, hors application, avec un jeton coach **et** un jeton joueur |
| AC-AL-01 | Les trois signaux appliquent **exactement** les conditions du §1, sans en redéfinir aucune : A = `status === 'open'` **et** date passée ; B = `type === 'match'` **et** coup d'envoi passé **et** `goalsFor === null` ; C = `goalsFor !== null` **et** `goalsFor > 0` **et** `attributedCount < goalsFor`. Un test de règle pure couvre les trois, sans mock |
| AC-AL-02 | L'écran est **en lecture seule** : aucune requête d'écriture n'est émise depuis cette route, et aucun contrôle d'action rapide (confirmer, saisir, attribuer, masquer, reporter) n'est rendu — **absence, pas désactivation** |
| AC-AL-03 | Taper une ligne ouvre `/convocations/:id` pour cette convocation. L'écran ne duplique **aucun** contenu du détail (effectif, ordre du jour, motif d'annulation, buteurs, score autre que le compteur d'attribution) |
| AC-AL-04 | Cette feature ne modifie **ni `domain/policies/actions.ts`, ni `rbac-matrix.ts`, ni `can.ts`** : aucune action, aucun rôle, aucune ligne de portée ajoutés. Vérifiable par diff |
| AC-AL-05 | Pour un jeton joueur — ou un compte multi-rôles avec « Joueur » actif — **l'icône d'en-tête et l'écran sont absents** (pas grisés, pas en erreur) ; une arrivée par URL directe rend un état de rôle explicite **sans émettre aucune requête de données** (précédent `player-stats`) |
| AC-AL-06 | Une convocation **annulée** n'apparaît jamais, pour aucun des trois signaux — exclusion **écrite explicitement** pour B et C (liste blanche, même règle qu'AC-MS-07), pas seulement héritée du `status === 'open'` du signal A |
| AC-AL-07 | Une convocation **`closed`** apparaît toujours si son score ou son attribution de buteurs manque : B et C ne sont **pas** conditionnés à `status === 'open'` |
| AC-AL-08 | Un match perdu ou nul **0–N** ne produit **jamais** d'alerte C (`goalsFor === 0` ⇒ aucun buteur à attribuer, cas `noGoalsToAttribute`). Une convocation cumulant plusieurs signaux produit **une seule ligne**, portant plusieurs actions manquantes |
| AC-AL-09 | **Aucune donnée nominative** n'apparaît sur une ligne : ni nom, ni initiales, ni avatar, ni compte de joueurs concernés. Seuls des attributs d'événement (date, type, adversaire) et des compteurs strictement événementiels (« 2 / 3 buts attribués ») sont rendus |
| AC-AL-10 | `AttendanceRecord.note`, `AttendanceRecord.absence_validity` et `ConvocationResponse.reason` ne sont **ni lus, ni transportés, ni affichés** |
| AC-AL-11 | Aucun export, aucun partage, aucune fonction de copie n'est rendu, pour aucun rôle |
| AC-AL-12 | Aucun état d'alerte n'est persisté : pas de « lu / non lu », pas de mise en sourdine, pas de table ni de colonne nouvelle. Les signaux sont **recalculés à chaque lecture** (même règle de dérivation que MS-02) |
| AC-AL-13 | Aucune notification poussée (push, courriel, badge système, préférence de canal) n'est déclenchée ni configurée — module Communication, P1 |
| AC-AL-14 | L'écran est une **route poussée** hors `AppShell`, sans `BottomNav` — même groupe que `/profile`, `/stats`, `/team-stats`, `/convocations/:id`. `BottomNav` n'est pas modifié ; aucune 5ᵉ destination n'est ajoutée |
| AC-AL-15 | L'icône d'alerte est un **contrôle nommé et distinct** dans `CoachHeader`, avec sa propre cible tactile ≥ ~44px (`h-11`) et son propre `aria-label` — **jamais** une pastille posée sur l'avatar, et l'avatar conserve sa seule destination `/profile` |
| AC-AL-16 | **Aucune alerte n'est rendue** tant que l'état est indéterminé : un chargement, une erreur ou une absence d'équipe ne produit ni liste vide silencieuse, ni faux « tout est à jour ». L'état « aucune alerte » (cas nominal fréquent) a un rendu explicite et **distinct** de l'état d'erreur et de l'état « aucune équipe » |
| AC-AL-17 | Toute information portée par la couleur (type d'action manquante, liseré de type de convocation) est **doublée d'un libellé textuel** ; contrastes AA, navigation clavier (CDC §12) |
| AC-AL-18 | L'en-tête à flèche retour reste visible pendant le défilement (`sticky top-0`, fond opaque — `CLAUDE.md` §6, AC-MD-20/AC-CTS-15). Chaque ligne a une cible tactile ≥ ~44px, vérifiée sur un **viewport mobile réel** |
| AC-AL-19 | Affichage complet en moins de 3 secondes (CDC §12), sur une saison complète de convocations — la forme de lecture qui le permet est fixée par PO-AL-05 (résolu) et AC-AL-21 |
| AC-AL-20 | L'écran est borné à l'**équipe active** (`ActiveTeamProvider`) : pour un coach multi-équipes, aucune ligne d'une autre de ses équipes n'apparaît, **aucun libellé d'équipe** n'est rendu sur une ligne, et **aucun sélecteur d'équipe** propre à cet écran n'est construit. Basculer d'équipe dans l'en-tête du tableau de bord change le contenu de cet écran |
| AC-AL-21 | Les trois signaux sont reconstitués en **un nombre d'allers-retours borné et indépendant du nombre de convocations** (lectures en bloc — PO-AL-05 résolu, §6 point 2). Aucune requête par convocation : un test de performance ou une inspection réseau sur une saison complète le vérifie |

## 5. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-AL-01** | **Mono-équipe ou multi-équipes ?** La demande initiale disait « the coach's team(s) », au pluriel, là où `ActiveTeamProvider` scope le tableau de bord, le Calendrier et `team-stats` à une seule équipe active | Développeuse | **Résolu (2026-09-30)** : **équipe active seule**, même équipe et même bascule que les autres écrans coach. Ni agrégat inter-équipes, ni libellé d'équipe par ligne, ni sélecteur propre. **Motif : cohérence** — « l'équipe active » est un état partagé de l'application depuis la résolution de PO-6, et cet écran serait le seul à contredire l'équipe nommée dans l'en-tête qui porte son point d'entrée. Contrepartie assumée : le retard de l'équipe non active reste invisible jusqu'à bascule (§1, rejoint PO-CTS-05). Voir §1 « Portée d'équipe », AC-AL-20 |
| **PO-AL-02** | **Faut-il une entrée de matrice pour le routage de l'écran ?** `team_stats:view` a été créée pour exactement ce besoin (`specs/coach-team-stats.md` §2), alors que cette spec s'en passe en composant deux actions existantes (§2). Les deux positions se défendent au regard du critère de l'en-tête de `rbac-matrix.ts` ; le cadrage de cette feature interdit toute entrée nouvelle, donc la position « composition » est retenue **par contrainte, pas par arbitrage** | Développeuse | **Résolu (2026-09-30)** : **pas de nouvelle entrée**. Confirmé — composition de `attendance:validate` / `match_result:record`, conformément à `CLAUDE.md` §7 (« ne pas ajouter d'entrée de matrice au-delà de ce que la spec courante demande »). Le gate s'écrit `activeRole === 'coach' && (can('attendance:validate', ...) || can('match_result:record', ...))` |
| **PO-AL-03** | **L'icône porte-t-elle un compteur (ou une pastille) ?** Non demandé explicitement, et ce n'est pas gratuit : afficher « 3 » impose de **calculer les trois signaux sur le tableau de bord**, donc d'y charger toutes les convocations passées de l'équipe, leurs `match_details` et leurs `match_events` — pour un écran qui ne les utilise pas autrement. Position retenue pour cette passe : **icône seule, sans compteur**, toujours rendue pour un coach. Question jumelle : `specs/coach-dashboard.md` §1 point 1 décrit encore une « pastille de notification » sur l'avatar, retirée depuis des en-têtes — l'amendement qui acte l'icône et périme cette mention est **proposé, non appliqué** (§1) | Développeuse | **Re-résolu (2026-09-30), à la demande explicite de la développeuse : compteur ajouté.** Renverse la résolution précédente ci-dessus (« icône seule, sans compteur ») — le coût flagué reste réel mais est jugé acceptable : `useCoachDashboardViewModel` appelle `ListCoachAlertsUseCase` (même use case, même `queryKeys.coachAlerts(teamId)` que l'écran Alertes lui-même — cache TanStack Query **partagé**, pas une seconde lecture indépendante à charge du dashboard). Le compteur est **volontairement hors du `isLoading`/`error` global du dashboard** (AC-CD-10, < 3 s) — la pastille apparaît une fois la requête résolue, sans jamais bloquer l'affichage du reste de l'écran. `0` signifie « pas de pastille », jamais une pastille affichant « 0 » |
| **PO-AL-04** | **Quelle fenêtre temporelle, et dans quel ordre ?** `ConvocationRepository.listForTeam(teamId)` n'est borné par aucune date, mais l'est **de fait par la saison** (`teams.season_id` est `not null` et une nouvelle ligne `Team` existe par saison — `docs/season-scoping-correction.md`). Reste une vraie question produit : un entraînement d'il y a six mois jamais pointé mérite-t-il encore une alerte, ou une limite de fraîcheur est-elle souhaitable ? Et l'ordre : **plus ancien d'abord** (le plus en retard en tête) ou **plus récent d'abord** (cohérent avec la lecture du Calendrier) ? Aucun document ne tranche | Développeuse | Non — un défaut « toute la saison de l'équipe active » est cohérent avec le reste de l'app, mais il n'est **pas** documenté |
| **PO-AL-05** | **Coût de lecture** — quelle forme de lecture pour reconstituer les trois signaux ? | Développeuse | **Résolu (2026-09-30)** : **lectures en bloc**, via `MatchDetailsRepository.findByConvocations` et `MatchEventRepository.findByConvocations` (déjà construites, même frontière RLS que leurs équivalents unitaires). **Ne pas réemployer `ListTeamConvocationsUseCase`**, qui émet deux requêtes **par convocation** pour des compteurs de réponses dont cet écran n'a aucun besoin — sur une saison complète, AC-AL-19 (< 3 s) n'y résisterait pas. Voir §6 point 2 et AC-AL-21 |
| **PO-AL-06** | **Élargissement au-delà du Coach/Staff.** Responsable de section et Dirigeant habilité ont ✅ sur « Voir les dossiers des autres membres ». Mais ici l'élargissement n'est pas un simple élargissement de portée : il transforme un outil personnel en **indicateur nominatif de retard sur un membre du staff** (§3). À ne pas traiter comme les PO-MS-01 / PO-CTS-05 dont il a l'apparence | Bureau + développeuse (+ référent RGPD, **toujours non désigné**) | Non pour cette passe. **À poser avant tout élargissement** |
| **PO-AL-07** | **Aucune maquette n'existe** pour cet écran | Développeuse | **Résolu (2026-09-30)** : aucune maquette produite, conception à partir de cette spec seule. Ligne de registre `absent` pré-rédigée en §0, à committer par designer-agent. **Ne plus demander de lien** |

### Ce qui reste explicitement OPEN et ne doit pas être résolu implicitement

- **La définition des trois signaux** : ce sont des règles **déjà tranchées ailleurs** (§1). Les « améliorer » au passage (tolérance de quelques jours, exclusion des réunions, seuil de fraîcheur) est une modification de `specs/calendar.md` / `specs/match-stats.md`, pas une décision de cette feature.
- **La source de vérité des « convoqués requis »** (PO-6b / PO-MS-07 / PO-AT) : cet écran n'en a **pas besoin** — il lit un `status` de convocation, jamais un effectif attendu. Constat, pas résolution.
- **Un quatrième signal** (cartons, votes, documents) : hors périmètre tant que personne ne l'a demandé.

### Écart spec / code à signaler, non corrigé ici

`specs/coach-dashboard.md` **AC-CD-14** décrit toujours le sélecteur d'équipe de l'en-tête comme un **no-op de v1** (« son clic ne produit aucun effet visible », décision PO-6). Le code l'a dépassé : `ActiveTeamProvider` + `CoachHeader` en font un **vrai sélecteur** depuis le 2026-09-30. PO-AL-01 s'appuie sur le comportement **réel** du code, pas sur AC-CD-14. Cette spec ne réécrit pas `specs/coach-dashboard.md` (règle : ne jamais écraser une spec existante) — l'écart est **signalé pour mise à jour ultérieure**, à la main de la développeuse.

## 6. Notes d'implémentation pour l'étape de build

**Ce ne sont pas des décisions produit** — ce sont des contraintes de construction.

1. **Les trois conditions vivent dans `domain/`, en règles pures, et sont réemployées — pas recopiées.** `isPastDate` (`domain/rules/convocation-rules.ts`), `isMatchResultRecordable` (`domain/policies/match-result-timing-rules.ts`) et l'invariant d'`isScorerCountConsistent` (`domain/policies/match-outcome-rules.ts`) existent déjà. Une quatrième copie inline dans un ViewModel ferait diverger l'écran d'alertes du Calendrier et du détail au premier ajustement (`CLAUDE.md` §7 sur le mirroring manuel s'applique au même titre entre deux écrans TypeScript qu'entre TS et SQL).
2. **Lectures en bloc — approche décidée (PO-AL-05 résolu), pas une option.** Trois lectures bornées, **indépendantes du nombre de convocations** (AC-AL-21) : `ConvocationRepository.listForTeam(teamId)` pour l'équipe active, puis `MatchDetailsRepository.findByConvocations(ids)` et `MatchEventRepository.findByConvocations(ids)` — les deux existent déjà (construites pour `coach-dashboard`/`coach-team-stats`), avec la **même frontière RLS** que leurs équivalents unitaires, donc **aucune politique nouvelle** n'est attendue de cette feature. ⚠️ **Ne pas réemployer `ListTeamConvocationsUseCase`** : il donne pourtant convocations + `matchDetails` + adversaire d'un seul appel, mais émet **deux requêtes par convocation** pour des compteurs de réponses dont cet écran n'a aucun usage — c'est précisément le piège que cette note existe pour éviter. Un use case dédié, qui ne lit que ce que les trois signaux exigent. *(L'adversaire d'un match, lui, reste nécessaire à la ligne : le lire par la même logique bulk, jamais par un appel par convocation.)*
3. **`useQuery` ne descend jamais dans `domain/`** : le ViewModel appelle le use case, le use case est une fonction async pure (`CLAUDE.md` §6).
4. **Clés de query** centralisées dans `presentation/shared/query-keys.ts`, forme `[ressource, ...discriminants]`, discriminant minimal = l'**équipe active** (une bascule d'équipe doit invalider/recharger proprement, AC-AL-20). Jamais de `queryKey` en ligne (`CLAUDE.md` §4).
5. **Route** : à ajouter dans le **groupe plein écran hors `AppShell`** de `router.tsx`, à côté de `profile` / `stats` / `team-stats` / `convocations/:id`, à l'intérieur de `ActiveRoleProvider` + `ActiveTeamProvider` (le ViewModel lit `useActiveRole()` pour AC-AL-05, et `useActiveTeamContext()` pour l'équipe active — même résolution que `useCoachDashboardViewModel`/`useCalendarViewModel` : l'id sélectionné, à défaut la première équipe par ordre de tableau).
6. **Tests, par ordre de priorité** (`CLAUDE.md` §8) : règles pures des trois signaux (cas limites d'AC-AL-06/07/08 — annulée, `closed`, `goalsFor === 0`, `attributedCount === goalsFor`) → mappers. AC-01/AC-02 se vérifient **par appel direct à l'API**, jamais contre un composant (leçon d'AC-MD-08). ⚠️ **PO-MD-10 reste ouvert** : pas d'infrastructure de session Supabase authentifiée en test Vitest — ces critères risquent de rester des `it.todo`, à signaler plutôt qu'à contourner.
7. **Aucune migration attendue.** Si l'implémentation en produit une, c'est le signe qu'une décision hors périmètre a été prise — s'arrêter et signaler.

## 7. Note pour designer-agent

- **Aucun point ouvert ne bloque cette conception.** PO-AL-01 (portée) et PO-AL-05 (lectures) sont tranchés ; PO-AL-02 (entrée de matrice) et PO-AL-03 (compteur sur l'icône) touchent l'implémentation, pas la mise en page — sauf pour le compteur, dont la position retenue est **« pas de compteur dans cette passe »**.
- **Maquette : aucune, et c'est acté** (§0). Cas inédit du registre. La ligne `absent` est pré-rédigée en §0 avec sa note d'accompagnement, **à committer telle quelle dans `docs/designs/DESIGN_LINKS.md`** — l'agent PO n'écrit pas hors de `specs/`, même procédé que pour toutes les lignes précédentes. **Ne plus demander de lien pour cette feature.**
- **Réemployer, ne pas inventer.** Cet écran est structurellement la **liste du Calendrier, filtrée** : reprendre `presentation/shared/components/ScheduleInfo.tsx` (date/heure · lieu · chip RDV), le liseré coloré par type (`shared/formatters/convocation-type-accent.ts`), `presentation/shared/components/EmptyState.tsx`, et l'en-tête à flèche retour `sticky top-0` (`features/convocation/components/BackHeader.tsx`). **Aucun composant visuel inédit n'est nécessaire** au-delà du marqueur d'« action manquante ».
- **Le marqueur d'action manquante** est le seul élément réellement neuf. `AttendanceConfirmationAlert` (`presentation/shared/components/`) existe déjà pour le signal A — icône + libellé « Présences à confirmer », ambre, jamais la couleur seule. Les signaux B et C n'ont pas d'équivalent : à concevoir **dans le même registre** (une ligne peut en porter deux ou trois — AC-AL-08).
- **Une seule équipe, jamais deux.** L'écran rend les alertes de l'**équipe active** : pas de libellé d'équipe sur une ligne, pas de sélecteur, pas de regroupement par équipe, pas de titre de section par équipe (AC-AL-20). L'équipe est nommée par l'en-tête du tableau de bord d'où l'on vient, pas par cet écran.
- **Ce qui ne doit jamais apparaître sur une ligne** : nom, initiales, avatar, compte de joueurs concernés (AC-AL-09) ; libellé d'équipe (AC-AL-20) ; bouton d'action rapide (AC-AL-02) ; état lu/non lu, sourdine, report (AC-AL-12) ; export/partage (AC-AL-11) ; agrégat de réponses présents/absents/en attente (c'est le Calendrier, pas cet écran).
- **L'icône d'en-tête** : contrôle nommé, distinct de l'avatar, `aria-label` propre, cible ≥ `h-11` — **jamais** une pastille posée sur l'avatar (AC-AL-15, §1). **Compteur re-résolu le 2026-09-30** (PO-AL-03) : petite pastille numérique en haut à droite de l'icône, absente quand le compte vaut 0, `aria-label` incluant le chiffre (jamais couleur seule). L'avatar garde sa seule destination `/profile`.
- **États à couvrir**, tous distincts les uns des autres (AC-AL-16) : **aucune alerte** (cas nominal fréquent, à traiter comme un succès, pas comme un vide) ; aucune équipe ; chargement ; erreur ; mauvais rôle par URL directe (précédent `PlayerStatsWrongRoleState`) ; liste longue (défilement, AC-AL-18/19) ; ligne cumulant deux ou trois actions manquantes.
- **Nav** : route poussée, en-tête à flèche retour `sticky top-0` à fond opaque, **pas de `BottomNav`** (AC-AL-14/AC-AL-18).
- Rappel `CLAUDE.md` §9 : aucun nom de personne dans le code, les tests, les commits ou la documentation — ici c'est plus qu'un rappel, c'est une règle de contenu de l'écran lui-même (AC-AL-09).

## UI design

### Sources utilisées, par ordre effectif

1. `docs/designs/DESIGN_LINKS.md` §4 — aucune ligne n'existait pour `coach-alerts`. La ligne pré-rédigée en §0 de cette spec (statut **absent**, note d'accompagnement incluse) a été commitée **verbatim** dans cette passe, à la suite de la ligne `coach-team-stats` — aucune reformulation.
2. `docs/designs/*.png` — aucun instantané ne correspond à cet écran, et aucun écran voisin (dashboard coach, Calendrier) n'a de variante « liste filtrée d'actions manquantes » à en tirer visuellement. Les maquettes `docs/designs/calendar/` et `docs/designs/stats/coach/` ont été regardées pour leur vocabulaire de composants (rail coloré, `ScheduleInfo`), pas pour une mise en page à copier — elles ne rendent aucun écran de ce type.
3. `wireframes-basiques-as-caribbean.md` — absent du dépôt (déjà constaté par `specs/calendar.md` UI design ; seuls `docs/ARCHITECTURE.md` et `docs/DEFAULTS-A-CHALLENGER.md` le citent). Sans objet ici de toute façon : cet écran n'est pas l'un des 4 onglets fixes qu'il documenterait.
4. `specs/coach-alerts.md` §1/§2/§7 (cette spec) — seule source normative en l'absence de maquette, comme annoncé par son propre §0.
5. Code déjà lu pour cadrer (voir en-tête de cette spec et §7) : `CoachHeader.tsx`, `CalendarConvocationRow.tsx`, `ScheduleInfo.tsx`, `EmptyState.tsx`, `AttendanceConfirmationAlert.tsx`, `BackHeader.tsx` (`shared/layout/`), `MatchResultScorerPicker.tsx` (vocabulaire du compteur « X / N buts attribués »), `match-outcome-labels.ts` (`MATCH_OUTCOME_BADGE_CLASSNAME`), `convocation-type-accent.ts`, `PlayerStatsWrongRoleState.tsx`, `TeamStatsPage.tsx` (patron `Chargement…` / `Une erreur est survenue.` au niveau page), `router.tsx`.

### Emplacement — écran et entrée

**Aucun des 4 onglets de nav basse n'est modifié ou étendu.** Cet écran est une **route poussée** (`/alerts`, nom d'illustration), au même niveau que `/profile`, `/stats`, `/team-stats` et `/convocations/:id` dans `router.tsx` — à l'intérieur du groupe `ActiveRoleProvider` + `ActiveTeamProvider`, en dehors d'`AppShell` (AC-AL-14). Pas de `BottomNav`.

**Point d'entrée : une icône dans `CoachHeader`, à côté de l'avatar — jamais dessus.** Aujourd'hui, l'avatar est le seul élément positionné en `absolute top-0 right-0` de la rangée pilule-de-rôle/pilule-d'équipe (`CoachHeader.tsx` lignes 104-116). Pour ajouter l'icône **sans la poser sur l'avatar** (AC-AL-15) :

- le positionnement `absolute top-0 right-0` migre de l'avatar lui-même vers un **nouveau conteneur flex** (`flex items-center gap-2`) qui englobe les deux contrôles ;
- ce conteneur porte deux enfants, dans l'ordre visuel : le **bouton d'alerte** (gauche) puis l'**avatar** (droite, inchangé — même taille `size-9.5`, même bordure `border-coach-red`, même destination `/profile`) ;
- l'ancrage visuel global (coin supérieur droit de l'en-tête) ne bouge pas, seule la largeur occupée augmente d'une pastille.

Le bouton d'alerte lui-même : cercle `size-11` (cible ≥44px, AC-AL-15), fond translucide `bg-white/8` (même traitement que le bouton retour de `BackHeader`), icône `IconAlertTriangle` — réemploi du même glyphe déjà établi par `AttendanceConfirmationAlert` pour « une action reste à faire », cohérent puisque c'est exactement ce que cette icône annonce au niveau de l'écran entier. `aria-label` dynamique (« Alertes » seul, ou « Alertes, N à traiter »). **Compteur re-résolu (2026-09-30, PO-AL-03)** : pastille `coach-red` en haut à droite de l'icône (mêmes tokens que les cercles de bordure `Avatar`/statuts négatifs déjà établis dans l'app), absente quand le compte vaut 0 — jamais une pastille affichant « 0 ». Alimenté par `useCoachDashboardViewModel`, qui appelle le même `ListCoachAlertsUseCase` que l'écran Alertes sous la même `queryKey` (`coachAlerts`) : le cache est partagé, pas une seconde lecture. Un `onClick` qui navigue vers l'écran, rien de plus.

Toujours rendue pour un coach dont `activeRole === 'coach'` (le gate d'écran §2 ne conditionne pas l'icône elle-même à la présence d'alertes — elle mène à un écran qui sait rendre son propre état « rien à signaler »). Absente pour tout autre rôle actif, y compris un compte multi-rôles avec « Joueur » actif (§2, AC-AL-05) — `CoachHeader` n'étant de toute façon rendu que côté coach, ce cas ne se présente pas par ce point d'entrée ; il ne se présente que par URL directe (voir « États à couvrir » plus bas).

### Ce qui change par rôle (voir §2 « RBAC » — repris ici, pas redéfini)

Une seule variante existe : **Coach/Staff, `activeRole === 'coach'`**, équipe active. Tous les autres rôles — y compris Responsable de section et Dirigeant habilité, qui ont pourtant un droit de consultation acquis ailleurs dans la matrice — n'ont **aucune variante conçue ici** : ni icône, ni écran, mêmes raisons déjà données en §2 (gate sur le rôle actif, pas sur `can()` seul). Pas de bascule d'affichage par rôle à l'intérieur de l'écran lui-même : contrairement au Calendrier ou au tableau de bord, il n'y a qu'un seul lecteur possible.

### Structure de l'écran, de haut en bas

1. **En-tête** : `BackHeader` (`shared/layout/`) réemployé tel quel, `title="Alertes"`, flèche retour, `sticky top-0`, fond opaque (AC-AL-18). Pas de sous-titre d'équipe ici — l'équipe active est déjà nommée par l'en-tête du tableau de bord d'où l'on vient, et cet écran ne doit porter aucun libellé d'équipe propre (§1, AC-AL-20).

2. **Développeuse, 2026-09-30 — filtre par type de convocation, sous l'en-tête, au-dessus de la liste.** Trois pastilles multi-sélection (`CoachAlertsTypeFilter`, composant nouveau, voir plus bas), réemployant `TypePill`/`CONVOCATION_TYPE_ACCENT`/`formatConvocationType` — mêmes couleurs que le rail de chaque ligne, jamais une nouvelle palette. Aucune sélection = aucun filtre = toutes les alertes affichées (état par défaut). Purement un état d'UI local (`useCoachAlertsViewModel`) : aucune nouvelle lecture, les alertes sont déjà toutes chargées en bloc (PO-AL-05, inchangé). N'apparaît que lorsqu'un backlog existe réellement — absent des états vide/chargement/erreur/mauvais rôle.

3. **Liste des convocations nécessitant une action**, une ligne par convocation (jamais deux lignes pour la même — §1 point 4, AC-AL-08), triée du plus ancien retard au plus récent par défaut (PO-AL-04 reste ouvert sur ce point précis mais ne bloque pas la conception — un ordre par défaut cohérent avec le reste de l'app est appliqué, à confirmer plus tard).

   Chaque ligne (composant nouveau, voir plus bas) reprend **la forme déjà posée par `CalendarConvocationRow`**, réduite à ce que cet écran a le droit de montrer :
   - rail coloré par type (`CONVOCATION_TYPE_ACCENT[type].rail`, réemployé tel quel) ;
   - libellé de type en gras (`formatConvocationType`) + suffixe adversaire pour un match (` | {opponent.name}`, même construction que `CalendarConvocationRow` — jamais de suffixe vide pour un entraînement, AC-AL-01 croisé avec AC-CA-02) ;
   - `ScheduleInfo` (date/heure · lieu · chip RDV), réemployé tel quel ;
   - **une ou deux pastilles d'action manquante** (jamais trois : A peut coexister avec B *ou* C, jamais avec les deux à la fois — B exige `goalsFor === null`, C exige `goalsFor !== null`, structurellement exclusifs entre eux) ;
   - **rien d'autre** : pas de `StatusBadge` (les convocations `cancelled` sont exclues à la source, §1 point 1 ; `open`/`closed` ne portent aucune pastille, cohérent avec `AC-CA-16`), pas de `ResponseBar`/`ResponseActions` (pas de rôle joueur ici, et un agrégat de réponses n'est pas une « action manquante »), pas de badge de résultat de match (`MATCH_OUTCOME_BADGE_CLASSNAME`/score chiffré — explicitement listé hors périmètre par AC-AL-03, seul le compteur de buteurs attribués est autorisé).

   Toute la ligne est la cible tactile de navigation vers `/convocations/:id` (AC-AL-03) — contrairement à `CalendarConvocationRow`, aucun contrôle imbriqué ne doit intercepter le tap (pas de `ResponseActions`, pas de `ResponseBar` à cliquer séparément) : pas besoin du `stopPropagation` que porte la ligne du Calendrier sur son bloc de réponse, cet écran n'en a pas.

4. **États vides et non nominaux** (AC-AL-16 — chacun distinct des autres) :
   - **Chargement** : texte simple `Chargement…`, même patron que `TeamStatsPage.tsx` — pas de squelette de ligne à inventer pour cette passe.
   - **Erreur** : texte simple `Une erreur est survenue.`, `role="alert"`, même patron que `TeamStatsPage.tsx`.
   - **Aucune équipe active** : `EmptyState` (icône + message centré), message du type « Aucune équipe active pour le moment. » — distinct du cas suivant.
   - **Aucune alerte** (cas nominal fréquent, à traiter comme un succès, AC-AL-16) : `EmptyState`, mais avec une **icône et un message positifs**, pas l'icône de recherche-vide générique — voir composant nouveau ci-dessous. Ne jamais réutiliser la même icône que l'état « aucune équipe » : les deux doivent se distinguer au premier regard, texte y compris. Lit le **total non filtré** — ne dépend jamais du filtre de type (2026-09-30) : les pastilles de filtre ne sont d'ailleurs même pas rendues dans cet état.
   - **Développeuse, 2026-09-30 — aucune alerte pour le type sélectionné** (un backlog existe, le filtre le masque entièrement) : `EmptyState` avec `IconFilterOff`, message « Aucune alerte pour ce type de convocation. » — registre distinct du cas positif ci-dessus, qui ne doit jamais laisser croire à tort que tout est traité.
   - **Mauvais rôle par URL directe** (compte multi-rôles avec « Joueur » actif atteignant `/alerts` directement) : composant nouveau au même registre que `PlayerStatsWrongRoleState`, voir ci-dessous. **Aucune requête de données** n'est émise dans ce cas (AC-AL-05) — même garde que `PlayerStatsPage.tsx` (`vm.isLoading`/`vm.error` court-circuités avant ce branchement).
   - **Liste longue** : défilement simple sous l'en-tête `sticky`, aucune pagination ni virtualisation demandée par la spec (AC-AL-19 est une exigence de performance de lecture bloc, pas de rendu — §6 point 2).

### Composant nouveau

**1. Pastilles de signal B et C — siblings de `AttendanceConfirmationAlert`, pas une nouvelle palette.** `AttendanceConfirmationAlert` (signal A) est réemployé **tel quel**, sans modification, pour « Présences à confirmer ». Les signaux B et C n'ont pas d'équivalent existant ; ils sont conçus dans le **même registre visuel exact** — mêmes tokens ambre (`border-coach-amber/35 bg-coach-amber/15 text-coach-amber`), même icône `IconAlertTriangle`, même forme de pastille (`Badge` arrondi, texte extra-gras, petites majuscules), toujours doublés d'un libellé textuel (AC-AL-17) :
   - **Signal B — « Score manquant »** : label fixe, aucune donnée variable.
   - **Signal C — « X / N buts attribués »** : reprend **littéralement** le compteur déjà affiché par `MatchResultScorerPicker` (`{attributedCount} / {goalsFor} buts attribués`) plutôt que d'inventer une formulation nouvelle — c'est exactement le type de « compteur agrégé strictement événementiel » qu'AC-AL-09 autorise (il ne désigne personne).

   Suggestion d'implémentation pour l'étape de build (pas une décision imposée ici, seulement un évitement de copier-coller) : extraire un primitif partagé (icône + libellé, tokens ambre) dont `AttendanceConfirmationAlert` deviendrait un point d'appel avec `label="Présences à confirmer"`, et dont les deux nouvelles pastilles seraient des siblings avec leur propre libellé. Trois composants indépendants au marquage identique satisferaient le même contrat visuel, au prix de la duplication — au choix de qui construit.

**2. Ligne d'alerte** (nom proposé `CoachAlertRow`) — composition de patrons existants (`CONVOCATION_TYPE_ACCENT`, `formatConvocationType`, `ScheduleInfo`, les pastilles ci-dessus), pas un patron visuel inédit : c'est délibérément la ligne du Calendrier, retirée de tout ce que cet écran n'a pas le droit de montrer (§1, note du designer : « réemployer la ligne du Calendrier plutôt qu'inventer une mise en page »).

**3. État « aucune alerte »** (nom proposé, contenu de l'`EmptyState` existant plutôt qu'un nouveau composant conteneur) — `EmptyState` accepte déjà n'importe quelle icône `@tabler/icons-react` en prop ; l'icône proposée est `IconCircleCheck` (coche pleine), avec un message du type « Tout est à jour, aucune action à faire pour le moment. » — registre positif, délibérément différent du registre « rien trouvé » (`IconSearchOff`) qu'`EmptyState` sert ailleurs, pour ne jamais laisser un cas de succès se lire comme un cas d'échec.

**4. État « mauvais rôle »** (nom proposé `AlertsWrongRoleState`) — même forme exacte que `PlayerStatsWrongRoleState.tsx` (icône + titre + message centrés, mêmes classes), contenu propre à cet écran : message du type « Cet écran est réservé aux coachs. », sans nommer d'équipe (contrairement à `PlayerStatsWrongRoleState`, qui nomme l'équipe du coach — ici il n'y a pas d'équivalent symétrique côté joueur à nommer).

**5. Filtre par type** (`CoachAlertsTypeFilter`, développeuse, 2026-09-30) — composition de patrons existants, pas un composant visuel inédit : réemploie `TypePill` (déjà le primitif de pastille à bascule de `TypeSelector`, create-convocation) et `CONVOCATION_TYPE_ACCENT`/`formatConvocationType` pour les couleurs/libellés. Seule différence avec `TypeSelector` : **multi-sélection** (plusieurs pastilles actives à la fois, `aria-pressed` par pastille) plutôt qu'un groupe à choix unique — aucune sélection valant « aucun filtre ». État local à `useCoachAlertsViewModel` (`selectedTypes`/`onToggleType`), jamais une nouvelle lecture réseau. Chaque pastille porte son propre compte entre parenthèses (« Match (3) »), même convention « masqué à 0 » que le titre d'écran (`(N)`) — jamais « Match (0) ». Le compte est calculé sur le backlog **non filtré** (`countByType`) : la pastille « Match » garde son chiffre stable même quand une autre pastille est activée/désactivée, elle ne retombe jamais à 0 par effet de bord d'un autre filtre.

### Contraintes tactiles mobiles (`CLAUDE.md` §6, AC-AL-18)

- **Bouton d'alerte dans `CoachHeader`** : `size-11` réel (pas le `size-9.5` de l'avatar existant, qui reste inchangé lui) — à vérifier sur viewport mobile réel, le nouveau conteneur flex ne doit pas réduire l'un ou l'autre bouton en dessous de sa cible.
- **Ligne d'alerte** : cible tactile pleine largeur, `min-h-11` a minima — même contrainte que `CalendarConvocationRow`, pas de côte-à-côte à `min-w-0` ici puisque la ligne n'a **aucun** champ mis côte à côte (pas de paire Date/Heure séparée du reste : `ScheduleInfo` empile déjà ses éléments verticalement).
- **Pastilles B/C** : si les deux sont présentes sur une même ligne, elles s'enchaînent en `flex flex-wrap gap-1.5` plutôt que de se chevaucher ou de déborder — aucune contrainte de largeur fixe côte à côte à spécifier puisqu'elles s'enroulent naturellement sur une largeur d'écran mobile.
- Le reste des composants réemployés (`ScheduleInfo`, `BackHeader`, `EmptyState`) est déjà conforme — rien à revérifier au-delà de leur intégration dans ce nouvel écran.

### Nav

Route poussée, en-tête `BackHeader` `sticky top-0` à fond opaque, **pas de `BottomNav`** — même groupe que `/profile`, `/stats`, `/team-stats`, `/convocations/:id` (AC-AL-14/AC-AL-18). Aucune 5ᵉ destination de nav basse.

### Questions ouvertes UI

**Aucune ne bloque cette conception**, conformément au §7 de cette spec (« Aucun point ouvert ne bloque cette conception »). Deux points non bloquants, à noter pour ne pas les redécouvrir plus tard :

1. **Ordre de tri par défaut** (PO-AL-04, déjà ouvert côté produit) : cette conception part du principe « plus ancien retard en tête », cohérent avec le fait que cet écran existe pour rattraper du retard — mais ce n'est **pas tranché par un document**, exactement comme le signale PO-AL-04. Aucun contrôle de tri n'est conçu ici (pas demandé), donc l'ordre choisi à l'implémentation n'a pas d'impact de mise en page.
2. **Segmentation par type d'action** (« Présences » vs « Résultats », via un filtre ou un onglet interne) : toujours non demandée, toujours absente — à ne pas confondre avec le filtre par **type de convocation** ajouté le 2026-09-30 (§1, point renversé), qui filtre les lignes affichées, pas les familles de signaux A/B/C.
