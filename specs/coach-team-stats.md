# Spec — Statistiques de l'équipe (vue Coach/Staff)

> Statut : **rédaction initiale du 2026-09-29** (product-owner-agent). Aucun point ouvert ne bloque la transmission à designer-agent (la maquette est versionnée et exploitable). **Trois points bloquent l'implémentation** — PO-CTS-01, PO-CTS-02 et PO-CTS-04, voir §5.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0/P1 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles), `specs/match-stats.md` (buts/cartons, agrégats d'équipe, précédent RBAC PO-MS-01), `specs/coach-attendance-confirmation.md` (source de la présence constatée, PO-AT-05/06/07), `specs/menu.md` (carte « Statistiques » désactivée, AC-MN-04), `specs/coach-dashboard.md` (nav basse, PO-6b).
> Code et base lus pour cadrer : `src/domain/policies/{actions,rbac-matrix,can}.ts`, `supabase/migrations/20260811171754_initial_schema.sql` (`attendance_records` + RLS), `supabase/migrations/20260924100000_match_statistics_schema.sql` (`match_events` + RLS, **et son bloc STOP**), `supabase/migrations/20260819153918_season_scoping_correction.sql` (`current_season()`), `supabase/migrations/20260917145402_section_team_write_policies.sql` (`teams.season_id not null`).

## 0. Maquette — à lire avant le reste

Une maquette existe déjà dans le dépôt :

- `docs/designs/stats/coach/[Mobile] Coacg - Stats 1.png`

⚠️ **Le nom du fichier contient une coquille (« Coacg » et non « Coach »).** Elle est reprise ici **verbatim** : c'est le chemin réel du dépôt, à ne pas « corriger » dans un renvoi ou un script sans renommer le fichier lui-même.

`docs/designs/DESIGN_LINKS.md` §2 n'a **aucune ligne** pour cette feature. Les instantanés locaux existant déjà, le §4 du registre place ce cas en **`instantané seul`** : l'agent utilise l'instantané versionné et **ne demande aucun lien artifact à la développeuse** — ni maintenant, ni à un run ultérieur. Même traitement que `menu`, `actus`, `player-vote`, `web-*` et `match-stats`.

**Ligne de registre à ajouter** (l'agent PO n'écrit pas hors de `specs/` — à reprendre telle quelle par l'agent designer, même procédé que les lignes précédentes) :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| coach-team-stats — **vue coach (statistiques d'équipe)** (`[Mobile] Coacg - Stats 1`) | — aucun lien fourni | 2026-09-29 | `docs/designs/stats/coach/[Mobile] Coacg - Stats 1.png` | **instantané seul** |

L'existence de cette maquette est exploitée ci-dessous comme **signal de périmètre** (§1). Son contenu visuel n'est ni décrit ni évalué ici — c'est le travail de l'agent designer.

⚠️ Rappel `CLAUDE.md` §9 : la maquette affiche des noms de personnes. Aucun ne doit apparaître dans le code, les tests, les commits ou la documentation.

## 1. Périmètre

Un **Coach/Staff consulte les statistiques agrégées de son équipe** sur une saison : assiduité, buts, cartons — au niveau de l'équipe et **joueur par joueur**, avec des **filtres par type d'information**.

C'est une feature **en lecture seule**. Elle ne saisit rien : la donnée source est produite ailleurs (`specs/coach-attendance-confirmation.md` pour la présence constatée, `specs/match-stats.md` pour les buts et cartons).

### Rattachement CDC et priorité

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Statistiques et exports — « **tableaux de bord par rôle** » | **P1** | Le tableau de bord statistique du rôle Coach/Staff, borné à son équipe. **Aucun export** CSV/PDF (§2 — la matrice refuse l'export au coach) |
| Présences et suivi sportif | **P0** | Lecture agrégée de l'`AttendanceRecord` déjà saisi. **Aucune saisie**, aucune évaluation, aucune progression, aucune indisponibilité santé |

### Trois familles d'information — le « filtre par type » demandé

La demande développeuse (« des filtres par type d'information, comme présence, buts ou cartons ») correspond à trois familles, chacune adossée à une source existante et à une règle d'accès **déjà établie** :

| Famille | Source de donnée | Règle d'accès existante |
|---|---|---|
| **Présence** | `attendance_records.actual_status` (fait constaté par le coach) | `attendance_records_select_coach_admin` — coach de l'équipe ou admin, **jamais le joueur** |
| **Buts** | `match_events` `event_type = 'goal'` (`is_penalty` inclus) | `match_goals:view` + `match_events_select_scoped`, branche `goal` |
| **Cartons** | `match_events` `event_type in ('yellow_card','red_card')` | `match_staff_events:view` + `match_events_select_scoped`, branche staff |

**Ces trois familles n'ont pas la même sensibilité** (§3) : c'est pour ça qu'elles restent trois blocs distincts adossés à trois règles distinctes, et non un « objet statistique » unique.

### Filtres au périmètre

1. **Type d'information** — Présence / Buts / Cartons, sur la liste par joueur (demande explicite de la développeuse, visible en maquette).
2. **Type de compétition** — Tout / Championnat / Amicaux. ⚠️ **Dépend de `competition_type`, qui n'existe pas en base** : PO-CTS-01, bloquant.
3. **Saison** — sélecteur de saison. ⚠️ **Dépend d'un accès aux saisons passées qui n'est pas acquis** : PO-CTS-03.

### Hors périmètre — explicitement

- **Toute écriture.** Cet écran ne saisit ni présence, ni score, ni événement. Il ne remplace ni ne duplique l'onglet Effectif (`specs/coach-attendance-confirmation.md`) ni l'onglet Résultat (`specs/match-stats.md`).
- **Tout export** (CSV, PDF, copie, partage) — la matrice donne ❌ au Coach/Staff sur « Exporter des données » (§2). Exclusion **active**, pas omission.
- **ASC Legacy** : aucun point, palier, badge, avantage ni classement Legacy, **même avec une valeur statique**. Module P1, grille « à valider par le Bureau **avant** développement » (CDC §8). Un classement de buteurs **n'est pas** un classement Legacy et ne doit pas en tenir lieu.
- **La variante joueur** de cet écran (statistiques personnelles). Voir PO-CTS-09 : la feature « player-stats » que le brief décrit comme déjà implémentée est **introuvable dans l'arbre de travail**.
- **Les évaluations sportives, la progression, les observations** — module P0 distinct, jamais agrégé ici.
- **Toute donnée de santé, d'aptitude ou d'indisponibilité médicale** (§3).
- **Le motif d'absence** (`ConvocationResponse.reason`), la **validité d'absence** (`AttendanceRecord.absence_validity`) et la **note du coach** (`AttendanceRecord.note`) — tous trois hors périmètre et non lus (§3, AC-CTS-10).
- **Les statistiques multi-équipes ou de section** : un coach affecté à deux équipes consulte **une équipe à la fois**, jamais un agrégat fusionné (PO-CTS-05).
- **`penalty_missed`** : ni compté, ni affiché dans cette passe (aucun bloc correspondant en maquette, et UI-MS-B de `specs/match-stats.md` reste ouvert sur sa saisie même).

### Relation avec `specs/menu.md` — contradiction à trancher, pas à absorber

`specs/menu.md` §1 rend une section « Suivi de l'équipe » avec deux cartes **désactivées**, « Statistiques » et « Classement », et son **AC-MN-04** exige explicitement qu'« aucun indicateur sportif ou de résultat actif » ne soit rendu et que ces cartes restent « visibles mais **désactivées** ».

Cette feature est précisément la **destination** de la carte « Statistiques ». Les deux specs se contrediront dès qu'elle sera construite — même configuration que PO-MS-09 entre `match-stats` et `match_details_page`.

Cette spec **ne modifie pas** `specs/menu.md` (règle : ne jamais écraser une spec existante). Amendement **proposé, non appliqué** : activer la seule carte « Statistiques » une fois cet écran routé, « Classement » restant désactivée (aucun module derrière — Legacy est P1). À valider par la développeuse — **PO-CTS-06**. Tant que ce n'est pas tranché, ne pas activer la carte.

## 2. RBAC

### Lecture de la matrice CDC, rôle par rôle

Lignes applicables de `docs/priorisation-fonctionnelle-as-acaribbean.md` : « **Voir les dossiers des autres membres** » (un taux de présence et un compteur de cartons sont des données nominatives de tiers) et « **Exporter des données** » (pour fermer explicitement la question de l'export).

| Rôle | Valeur matrice (dossiers / export) | Traduction sur cette feature |
|---|---|---|
| Joueur / Joueuse | ❌ / ❌ | **Aucun accès à cet écran.** Il agrège des présences (que la RLS lui refuse déjà) et des cartons (staff-only, AC-MS-09). Voir PO-CTS-09 pour sa propre vue |
| **Coach / Staff** | ❌ (son équipe, hors financier) / ❌ | **Seul rôle servi par cette passe.** Lecture, **son équipe uniquement**. Aucun export |
| Responsable de section | ✅ (sa section) / ✅ (sa section, champs autorisés) | **Aucun accès accordé dans cette passe**, bien que la matrice lui donne ✅ sur sa section — et c'est le rôle dont l'élargissement est le mieux fondé des trois. Écart **assumé et borné par PO-CTS-05**, pas un oubli. Même position que PO-MS-01 et PO-AT-01 |
| Dirigeant habilité | ✅ / ✅ | **Aucun accès accordé dans cette passe.** Même écart assumé, même renvoi PO-CTS-05 |
| Trésorier | ❌ (financier seulement) / ✅ (financier) | Aucun accès — aucune donnée financière ici |
| Référent médical | ❌ (santé seulement, tracé) | Aucun accès. Un taux d'assiduité **n'est pas** une donnée de santé, et ne doit jamais être rapproché de son périmètre (§3) |
| Bénévole | ❌ / ❌ | Aucun accès |
| Administrateur | ✅ / ✅ (tout, tracé) | **Aucune entrée de matrice accordée cette passe.** Le statu quo RLS (`attendance_records_select_coach_admin` accorde déjà la lecture à l'admin) n'est pas retiré, mais **aucun point d'entrée n'est construit** — même formulation que `'attendance:validate'` et `match-stats` §2. PO-CTS-05 |

**AC-01 / AC-02 (CDC §17.2) s'appliquent intégralement** : un coach ne voit que les équipes auxquelles il est affecté. C'est la borne de portée de l'écran entier.

### Action proposée — une seule, nouvelle

| Action | Rôles | Portée | Miroir SQL |
|---|---|---|---|
| `team_stats:view` | **Coach/Staff** | Son équipe | Aucune politique nouvelle — s'appuie sur `attendance_records_select_coach_admin` et `match_events_select_scoped` **déjà en place** |

**Pourquoi une entrée de matrice et pas du RLS seul.** Le critère du dépôt (en-tête de `rbac-matrix.ts`) : une entrée ne se justifie que si `presentation/` doit décider quelque chose **avant ou indépendamment** du résultat de la requête. Ici le routage doit décider de rendre **l'écran entier** avant toute requête — même forme que `'backoffice:access'`, pas comme une lecture d'onglet dont seul le contenu varie. **La RLS reste la sécurité réelle** ; `can()` n'est que de l'ergonomie (`CLAUDE.md` §6).

**Actions réutilisées, jamais redupliquées** : les blocs Buts et Cartons consomment `match_goals:view` et `match_staff_events:view`, **qui existent déjà** (`actions.ts`, `rbac-matrix.ts`, branche `coach` de `can.ts`). Ne pas créer de `team_goals:view` / `team_cards:view` : ce serait une seconde source de vérité pour la même règle, exactement le « risque de divergence » que l'en-tête de `rbac-matrix.ts` proscrit.

**Aucune politique RLS nouvelle n'est attendue de cette feature**, sauf si l'implémentation passe par des vues/RPC agrégés — auxquels cas ils sont en `security_invoker = true`, comme `team_match_record`/`team_scorer_ranking` l'exigeaient (AC-MS-19).

### Application technique — le piège déjà corrigé cinq fois

`team_stats:view` est **scopée à l'équipe**. La branche `'coach'` de `can.ts` liste nommément les actions soumises au contrôle de portée (`requiresTeamScope = action === 'convocation:create' || … || action === 'convocation:update'`) : **une action ajoutée à `rbac-matrix.ts` sans être ajoutée à cette liste traverse le `switch` sans aucun contrôle d'équipe**. C'est le même écart déjà corrigé pour `'convocation:create'`, `'attendance:validate'`, `'vote:cast'`, les trois actions de `match-stats` et `'match_details:update'`. **Les deux fichiers se modifient dans le même changement**, jamais l'un sans l'autre (AC-CTS-03).

**Règle d'affichage** (moindre privilège) : pour tout rôle non autorisé, l'écran et son point d'entrée sont **absents**, jamais grisés ni suivis d'une erreur au clic.

## 3. Données sensibles

### Données de santé — aucune, et trois vecteurs à tenir fermés

Ni diagnostic, ni aptitude, ni indisponibilité médicale n'entre dans cette feature. Mais cet écran **agrège** une donnée dont trois champs voisins sont des vecteurs connus, déjà fermés par la spec amont :

1. **`AttendanceRecord.note`** (texte libre du coach) — laissé `null` et jamais affiché (`specs/coach-attendance-confirmation.md` AC-AT-08, PO-AT-06 non tranché, **référent RGPD toujours non désigné**). Ne doit être ni lu, ni transporté, ni agrégé ici.
2. **`AttendanceRecord.absence_validity`** (`'excused'`) — proxy lisible d'un motif médical. Non saisi en amont, **et non lu ici** : en particulier, **aucune ventilation « absences excusées / non excusées »** ne doit apparaître dans le taux d'assiduité, même si la colonne se remplit un jour (PO-AT-05).
3. **`ConvocationResponse.reason`** — jamais lu (AC-MD-12).

⚠️ **Un taux d'assiduité n'est pas une donnée de santé** — mais un taux d'assiduité **bas et durable** est un signal indirect. Ça ne le fait pas entrer dans le périmètre du Référent médical, et il ne doit **jamais** lui être ouvert à ce titre. Constat consigné, pas une règle nouvelle.

### Données financières — aucune

Aucun montant, aucune cotisation, aucune relance, aucune amende disciplinaire chiffrée. La mention « 18 licenciés » de la maquette est un **effectif**, pas un statut de cotisation : la matrice donne ❌ au Coach/Staff sur « Voir le statut de cotisation », et cet écran ne doit **pas** dériver son dénominateur d'une donnée d'adhésion payée (PO-CTS-04, AC-CTS-11).

### Données personnelles de tiers — c'est le vrai sujet de cette feature

C'est, à ce jour, **l'écran le plus dense en données nominatives de tiers du projet**. Trois natures, à ne pas confondre :

- **Le taux de présence par joueur** — agrégat nominatif d'un **jugement porté par un tiers** (`specs/coach-attendance-confirmation.md` §3). Il reste borné au coach de l'équipe, comme la donnée source.
- **Les buts par joueur et le classement des buteurs** — déjà admis comme visibles de toute l'équipe (MS-09). Les publier au coach n'élargit rien.
- **Les cartons par joueur et les totaux disciplinaires** — **donnée nominative défavorable**, staff-only par construction (MS-09, liste blanche sur `goal`). Cet écran **ne doit jamais** en ouvrir la lecture au-delà du Coach/Staff de l'équipe, ni par une vue agrégée, ni par un total d'équipe qui redeviendrait nominatif au clic.

⚠️ **Conséquence à énoncer, pas à laisser implicite** : cet écran montre au coach un **taux d'assiduité nominatif que le joueur concerné ne peut pas voir** (`attendance_records_select_coach_admin`, PO-AT-07 non tranché). PO-AT-07 posait déjà la question pour une ligne isolée ; cette feature la **transforme en profil chiffré et classable**. C'est une escalade réelle de l'enjeu RGPD (accès de la personne à ses propres données), pas une conséquence neutre — **PO-CTS-08**.

### Journal d'audit — à signaler, pas à omettre

- Lu littéralement, **le CDC §11.3 n'exige rien ici** : ses actions sensibles sont création/suppression de compte, changement de rôle, consultation de donnée santé, modification de paiement, correction de points Legacy, **export nominatif**. Consulter un tableau de bord n'y figure pas.
- ⚠️ **Mais la frontière avec « export nominatif » est mince.** Cet écran produit une liste nominative complète, chiffrée et classée de l'effectif. Il n'y a **aucun export** dans cette passe (§1, AC-CTS-09) — c'est précisément ce qui le maintient hors du §11.3. Le jour où un export est ajouté, **il devient une action tracée**, et la trace est un **trigger Postgres** (accès en lecture), jamais un appel depuis un composant (`CLAUDE.md` §6). PO-CTS-08.
- ⚠️ **La table de journal d'audit reste absente de `supabase/migrations/`** : exigence transversale P0 non résolue du projet, distincte de cette feature (constat déjà porté par `specs/create-convocation.md` §4, `specs/match_details_page.md` §3 et `specs/match-stats.md` §3).

## 4. Critères d'acceptation

`AC-01`/`AC-02` sont ceux du CDC §17.2. Les critères propres à cette feature sont préfixés **`AC-CTS-`**, même convention que `AC-MS-`/`AC-AT-`/`AC-MD-`/`AC-CD-`.

| Réf. | Critère |
|---|---|
| **AC-01** | Aucune donnée d'un membre extérieur à l'équipe consultée n'est accessible, ni à l'écran ni dans la réponse API |
| **AC-02** | Un coach de l'équipe A demandant les statistiques de l'équipe B n'obtient **aucun champ**. Vérifié **par appel direct à l'API**, hors application, avec un jeton coach **et** un jeton joueur |
| AC-CTS-01 | L'écran est **en lecture seule** : aucun contrôle n'écrit dans `attendance_records`, `match_events` ni `match_details`. Aucune requête d'écriture n'est émise depuis cette route |
| AC-CTS-02 | Pour un jeton **joueur**, l'écran et son point d'entrée sont **absents** (pas grisés, pas en erreur) ; aucune donnée de présence ni de carton n'est requêtée (AC-AT-07, AC-MS-09) |
| AC-CTS-03 | `team_stats:view` est ajoutée à `actions.ts`, `rbac-matrix.ts` **et** à la liste `requiresTeamScope` de la branche `'coach'` de `can.ts` **dans le même changement**. Un test vérifie qu'un coach de l'équipe A obtient `false` pour `can(user, 'team_stats:view', { teamId: B })` |
| AC-CTS-04 | Le bloc **Cartons** (total d'équipe **et** détail par joueur) est **absent de la réponse API** pour tout jeton hors Coach/Staff de l'équipe, pas seulement du rendu — vérifié hors application. Une vue ou un RPC agrégé est en `security_invoker = true` (précédent AC-MS-19) |
| AC-CTS-05 | Le filtre « type d'information » (Présence / Buts / Cartons) **ne change jamais la portée des données**, seulement leur présentation : basculer sur « Buts » ne donne accès à rien de plus que ce que la RLS accordait déjà |
| AC-CTS-06 | Le taux de présence est calculé **exclusivement** à partir d'`AttendanceRecord` (fait constaté), **jamais** à partir de `ConvocationResponse` (intention déclarée). Les deux entités ne sont pas fusionnées (`CLAUDE.md` §6, AC-AT-01) |
| AC-CTS-07 | Un joueur sans aucun `AttendanceRecord` sur la période apparaît **dans la liste**, dans un état explicite, jamais absent de la liste ni compté comme présent par défaut (même règle qu'AC-AT-12). Le traitement exact de ce cas dans le dénominateur est **PO-CTS-04** |
| AC-CTS-08 | Aucun point, palier, badge, avantage ni classement ASC Legacy n'est rendu, **même avec une valeur statique** (CDC §8). Le classement des buteurs n'est **pas** présenté comme un classement de points |
| AC-CTS-09 | **Aucun export, aucun partage, aucune fonction de copie** n'est rendu, pour aucun rôle (matrice : Coach/Staff ❌ « Exporter des données »). Exclusion active |
| AC-CTS-10 | `AttendanceRecord.note`, `AttendanceRecord.absence_validity` et `ConvocationResponse.reason` ne sont **ni lus, ni transportés, ni agrégés, ni affichés**. Aucune ventilation « excusée / non excusée » n'apparaît dans le taux d'assiduité (§3) |
| AC-CTS-11 | Le dénominateur de l'effectif n'est dérivé d'**aucune donnée d'adhésion ou de cotisation** : le Coach/Staff a ❌ sur « Voir le statut de cotisation ». Un compte d'effectif est autorisé, un statut de paiement ne l'est pas (§3) |
| AC-CTS-12 | Les filtres de compétition comptent en **liste blanche** (`= 'league'`, `= 'friendly'`), jamais en liste noire, et excluent les convocations annulées et les matchs sans score enregistré — même règle qu'AC-MS-07. ⚠️ **Non implémentable tant que PO-CTS-01 n'est pas tranché** |
| AC-CTS-13 | Toute information portée par la couleur (barre de progression d'assiduité, pastille de carton jaune/rouge) est **doublée d'un libellé textuel** ; contrastes AA, navigation clavier (CDC §12) |
| AC-CTS-14 | Chaque contrôle interactif (chips de filtre, segmented Présence/Buts/Cartons, sélecteur de saison) a une cible tactile ≥ ~44px (`h-11`), vérifiée sur un **viewport mobile réel** (`CLAUDE.md` §6) |
| AC-CTS-15 | L'en-tête à flèche retour reste visible pendant le défilement de la liste d'effectif (`sticky top-0`, fond opaque — `CLAUDE.md` §6, AC-MD-20) |
| AC-CTS-16 | Les états vides sont couverts et **distincts les uns des autres** : aucune séance constatée, aucun match joué, aucun but, aucun carton, effectif vide, **aucune saison courante** (`current_season()` peut ne retourner aucune ligne — état valide, pas une erreur) |
| AC-CTS-17 | Aucune valeur chiffrée fabriquée n'est affichée si la donnée source n'existe pas (pas de faux taux, pas de faux classement) — même règle qu'AC-MN-04 |

## 5. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-CTS-01** | **`match_details.competition_type` n'existe pas en base.** Le filtre Tout / Championnat / Amicaux en dépend entièrement. La migration `20260924100000_match_statistics_schema.sql` s'ouvre sur un bloc **STOP** explicite : la colonne est `not null` **sans défaut** (MS-06/AC-MS-06) et **7 lignes `match_details` existent déjà** — la valeur de reprise doit être décidée par la développeuse, jamais devinée (« un amical rangé en championnat par défaut fausserait silencieusement les agrégats ») | Développeuse (+ Bureau si reprise métier) | **OUI — bloque le filtre compétition et le classement des buteurs.** Le reste de l'écran (présence, cartons) est constructible sans |
| **PO-CTS-02** | **Les vues `team_match_record` et `team_scorer_ranking` n'ont jamais été construites** — conséquence en cascade de PO-CTS-01, explicitement consignée dans le même bloc STOP. Le bloc « Meilleurs buteurs » de la maquette **n'a donc aucune source de données aujourd'hui**. À construire dans la migration de suivi de `match-stats`, pas à redériver ici sous un autre nom | Développeuse | **OUI pour le bloc « Meilleurs buteurs »** |
| **PO-CTS-03** | **Le sélecteur de saison est-il réellement au périmètre ?** `teams.season_id` est `not null` et **une nouvelle ligne `Team` est créée chaque saison** (`docs/season-scoping-correction.md` §1) ; la RLS de lecture d'équipe exige la **saison courante** (AC-CD-01). Un coach ne peut donc vraisemblablement **pas** lire l'équipe d'une saison passée aujourd'hui, et son `user_roles` pointe une ligne d'équipe d'une seule saison. Trois sous-questions : (a) l'historique multi-saison est-il voulu en v1 ? (b) si oui, faut-il élargir la RLS d'équipe, ce qui est une décision de sécurité, pas d'affichage ? (c) sinon, le sélecteur affiche-t-il la saison courante seule, en lecture inerte ? | Développeuse | **Oui pour le sélecteur** ; non pour l'écran, qui est cohérent sur la seule saison courante |
| **PO-CTS-04** | **Quel est le dénominateur de l'assiduité ?** Quatre sous-questions, aucune tranchée par le CDC : (a) **quelles convocations comptent** — entraînements seuls, ou aussi matchs et réunions ? (b) **quel effectif de référence** — la source de vérité des « convoqués requis » est **toujours ouverte** (PO-6b de `coach-dashboard`, PO-MS-07, `specs/coach-attendance-confirmation.md` §5) ; (c) **un joueur sans `AttendanceRecord`** compte-t-il comme absent ou est-il exclu du calcul (AC-CTS-07) ? (d) une convocation **annulée ou non clôturée** entre-t-elle dans le calcul ? Sans réponse, le chiffre de tête de l'écran n'est pas définissable | Bureau + développeuse | **OUI pour le bloc Présence.** ⚠️ **Ne pas créer de table `convocation_attendees` ni de snapshot d'effectif par anticipation** — interdiction déjà posée par trois specs |
| **PO-CTS-05** | **Élargissement au-delà du Coach/Staff.** Responsable de section et Dirigeant habilité ont ✅ sur « Voir les dossiers des autres membres » (et sur l'export, champs autorisés) — leur cas est **mieux fondé ici que dans `match-stats`**, où l'écart n'était justifié que par l'absence de point d'entrée. Question jumelle : un coach affecté à **deux équipes** voit-il deux écrans distincts ou un sélecteur d'équipe ? | Bureau + développeuse | Non pour cette passe (`['coach']` scopé équipe est entièrement fondé). Déclencheur : demande explicite de mise à jour RBAC |
| **PO-CTS-06** | **Contradiction avec `specs/menu.md` AC-MN-04**, qui exige aujourd'hui que la carte « Statistiques » reste **désactivée** et qu'aucun indicateur sportif actif ne soit rendu. Cette feature en est la destination. Amendement **proposé, non appliqué** (§1) : activer « Statistiques » seule, « Classement » restant désactivée (Legacy P1). Même procédé que PO-MS-09 | Développeuse | Non pour la conception. **Oui pour le câblage du point d'entrée** — ne pas activer la carte avant arbitrage |
| **PO-CTS-07** | **La barre de navigation basse de la maquette montre « Recherche » là où la nav construite affiche « Actus »** (`specs/coach-dashboard.md`, nav à 4 entrées Dashboard / Calendrier / Actus / Menu). Aucun écran de recherche n'existe dans `router.tsx`. Écart signalé, **non résolu** : ne pas construire d'entrée « Recherche », ne pas retirer « Actus » sur la foi d'une maquette | Développeuse + designer-agent | Non |
| **PO-CTS-08** | **La consultation d'un profil d'assiduité nominatif doit-elle être journalisée, et le joueur doit-il y avoir accès ?** Deux faces du même point. (a) Le CDC §11.3 ne vise pas la consultation d'un tableau de bord, mais cet écran est à un pas de l'« export nominatif » (§3) ; (b) PO-AT-07 (« un coach peut marquer un joueur absent sans que ce joueur le voie ») devient ici un **profil chiffré et classable** invisible de la personne concernée. Aucune table de journal d'audit n'existe de toute façon | Référent RGPD (**toujours non désigné**, `docs/GOUVERNANCE.md`) + Bureau | Non pour cette passe. **À poser avant tout ajout d'export** |
| **PO-CTS-09** | **La feature « player-stats » décrite comme déjà implémentée est introuvable dans l'arbre de travail.** Vérifié le 2026-09-29 : aucun `specs/player-stats.md`, aucune migration portant un RPC « player-stats summary » ou « own-cards », aucun dossier `presentation/features/player-stats/`, aucune occurrence de `player_stats`/`playerStats` dans `src/` ni `supabase/` — alors que trois commits récents de `feature/player-stats` les annoncent. Cette spec a donc été rédigée **sans** son précédent direct, en s'alignant sur `match-stats` et `coach-attendance-confirmation` à la place. Conséquence : la **cohérence de nommage et de forme de retour** entre la vue joueur et la vue coach n'a pas pu être vérifiée (noms d'entités, de use cases, de clés de query, forme des agrégats) | Développeuse | Non pour la conception. **Oui pour l'implémentation** : à vérifier avant d'écrire un use case qui doublonnerait un existant sous un autre nom |
| **PO-CTS-10** | **Périmètre temporel par défaut** : saison entière, ou fenêtre glissante (30 derniers jours, 10 dernières séances) ? La maquette n'affiche qu'une saison, mais « X / 18 en moyenne par séance » suppose une période définie. Lié à PO-CTS-04 (a) | Développeuse | Non — un défaut « saison courante entière » est cohérent avec le reste de l'app, mais il n'est **pas** tranché par un document |

### Ce qui reste explicitement OPEN et ne doit pas être résolu implicitement

- **La grille ASC Legacy** : ne pas anticiper un barème, une pondération ni une colonne « points ». Un classement de buteurs ou d'assiduité **n'est pas** un classement Legacy (AC-CTS-08).
- **La source de vérité des « convoqués requis »** (PO-6b / PO-MS-07 / PO-AT) : constat d'état, pas résolution.
- **La valeur de reprise de `competition_type`** pour les 7 lignes existantes (PO-CTS-01) : **s'arrêter et demander**, jamais deviner.

## 6. Notes d'implémentation pour l'étape de build

**Ce ne sont pas des décisions produit** — ce sont des vérifications et des contraintes de construction.

1. **Ordre de dépendance** : PO-CTS-01 (reprise `competition_type`) → migration de suivi `match-stats` (colonne + `team_match_record` + `team_scorer_ranking`) → agrégats de présence → `actions.ts` + `rbac-matrix.ts` + `can.ts` (dans le même changement, AC-CTS-03) → repositories/use cases → `presentation/`. Les blocs **Présence** et **Cartons** ne dépendent d'aucun des deux premiers points et peuvent être construits d'abord.
2. **Politiques et fonctions RLS existantes à réutiliser, jamais à redériver** : `private.is_coach_of_team`, `private.is_team_member`, `attendance_records_select_coach_admin`, `match_events_select_scoped`, `public.current_season()`. Toute vue ou RPC agrégé est en **`security_invoker = true`** (AC-MS-19, AC-CTS-04) — sinon l'agrégat contourne la RLS des tables sous-jacentes.
3. **`current_season()` peut ne retourner aucune ligne** (coupure inter-saisons volontaire) : « pas de saison courante » est un **état valide**, jamais une erreur (AC-CTS-16) — contrainte déjà posée par la migration de correction du scoping des saisons.
4. **Ne pas recalculer les buts à partir du score** ni l'inverse : `goals_for` est un fait primaire, les événements `goal` sont ≤ `goals_for` (MS-01/MS-05). Un total de buts par joueur se compte **sur `match_events`**, un bilan d'équipe se lit **sur `match_details`**.
5. **Clés de query** centralisées dans `presentation/shared/query-keys.ts`, forme `[ressource, ...discriminants]` — les discriminants incluent au minimum l'équipe et la saison, plus le filtre compétition s'il change la forme retournée. Jamais de `queryKey` en ligne (`CLAUDE.md` §4).
6. **`useQuery` ne descend jamais dans `domain/`** : le ViewModel appelle le use case, le use case est une fonction async pure (`CLAUDE.md` §6).
7. **Tests, par ordre de priorité** (`CLAUDE.md` §8) : `can.test.ts` étendu à `team_stats:view` **portée équipe incluse** → règles d'agrégation pures dans `domain/policies/` (taux d'assiduité, comptages) → mappers. AC-01/AC-02/AC-CTS-04 se vérifient **par appel direct à l'API**, jamais contre un composant (leçon d'AC-MD-08). ⚠️ **PO-MD-10 reste ouvert** : le dépôt n'a toujours pas d'infrastructure de session Supabase authentifiée en test Vitest — ces critères risquent de rester des `it.todo`, à signaler plutôt qu'à contourner.
8. **Mirroring SQL ↔ TypeScript manuel et commenté** de part et d'autre avec le nom de la règle (`CLAUDE.md` §7) — jamais de génération d'un côté à partir de l'autre.

## 7. Note pour designer-agent

- **Maquette** : `docs/designs/stats/coach/[Mobile] Coacg - Stats 1.png` (coquille du nom de fichier volontairement conservée, §0). Statut de registre **`instantané seul`** — **ne rien demander à la développeuse**, la référence est déjà dans le dépôt. Ajouter la ligne de registre pré-rédigée en §0.
- **Une seule variante de rôle** : Coach/Staff. Il n'y a **pas** de variante joueur de cet écran dans cette passe (§1, PO-CTS-09).
- **Le CDC et la matrice RBAC priment, la maquette informe la mise en page.** Précédent constant du projet : les maquettes livrées contiennent régulièrement des blocs sans fondement dans le modèle de domaine (dix corrections sur `match_details_page`). Blocs à écarter s'ils apparaissent : **points/badges/classement ASC Legacy, note de match, temps de jeu, passe décisive, possession, statut de cotisation, bouton d'export/partage** (AC-CTS-08/09/11).
- **Trois blocs, trois règles d'accès différentes** (§1) — ce n'est pas de la symétrie décorative : le bloc **Cartons** est staff-only par construction et doit être traité comme tel dans l'arbre rendu, jamais comme un onglet symétrique des deux autres.
- **Points sans source de données aujourd'hui, à concevoir en connaissance de cause** : le filtre **Championnat / Amicaux** (PO-CTS-01) et le bloc **Meilleurs buteurs** (PO-CTS-02) n'ont **aucune donnée derrière eux** dans la base actuelle. Les dessiner est utile ; les considérer comme livrables dans la première passe ne l'est pas.
- **Sélecteur de saison** : voir PO-CTS-03 — l'accès aux saisons passées n'est pas acquis. Prévoir le cas « saison courante seule » et le cas « aucune saison courante » (AC-CTS-16).
- ⚠️ **Nav basse** : la maquette montre « Recherche » là où la nav construite affiche « Actus » (PO-CTS-07). **Ne pas dessiner d'entrée « Recherche »**, ne pas retirer « Actus ».
- ⚠️ **Point d'entrée** : `specs/menu.md` AC-MN-04 exige aujourd'hui que la carte « Statistiques » reste **désactivée** (PO-CTS-06). Concevoir l'écran, oui ; l'y raccorder, pas avant arbitrage.
- **États à couvrir** : aucune séance constatée, aucun match joué, aucun but, aucun carton (état **normal** en début de saison, pas une erreur), effectif vide, aucune saison courante, joueur sans aucun `AttendanceRecord` (AC-CTS-07).
- **Jamais la couleur seule** (AC-CTS-13) : les barres d'assiduité et les pastilles jaune/rouge sont doublées d'un libellé textuel.
- **Cibles tactiles ≥ `h-11`** sur chips de filtre, segmented et sélecteur de saison ; `min-w-0` sur chaque élément de toute rangée à deux colonnes (AC-CTS-14, `CLAUDE.md` §6). En-tête retour **`sticky top-0`** avec fond opaque (AC-CTS-15).
- Rappel `CLAUDE.md` §9 : **aucun nom de personne** figurant dans la maquette ne doit apparaître dans le code, les tests, les commits ou la documentation.

## UI design

> Rédigé à partir de `docs/designs/stats/coach/[Mobile] Coacg - Stats 1.png` (registre `docs/designs/DESIGN_LINKS.md`, ligne `coach-team-stats`, statut **instantané seul** — ligne ajoutée par cet agent en reprenant telle quelle la formulation pré-rédigée au §0 de cette spec, aucun lien à demander). Un seul export, un seul rôle (Coach/Staff) — pas de variante à confronter. Patterns réemployés depuis `src/presentation/shared/layout/BackHeader.tsx`, `src/presentation/features/calendar/components/RangeModeToggle.tsx`, `src/presentation/features/convocation/components/{TypeSelector,VoteResultBar,RosterList,AttendanceConfirmRow}.tsx` et `src/presentation/features/coach-dashboard/components/FormAndGoalsRow.tsx` (cartes compactes du dashboard) — voir §5 pour le détail du réemploi.

### 1. Emplacement dans la navigation à 4 entrées

Aucun nouvel onglet de navigation. L'écran vit sous **Menu**, comme destination de la carte « Statistiques » de la section « Suivi de l'équipe » (`specs/menu.md` §1) — route poussée (`sticky` back header, pas un onglet supplémentaire des 4 entrées basses).

⚠️ **Ce point d'entrée n'est pas câblé dans cette passe.** `specs/menu.md` AC-MN-04 exige aujourd'hui que la carte « Statistiques » reste **désactivée** (rendue par `DisabledMenuCard`, `layout="grid"`, dans le grid 2 colonnes « Suivi de l'équipe »). L'amendement qui l'activerait est **proposé, non appliqué** (PO-CTS-06). Cette section conçoit l'écran de destination ; elle ne modifie pas `specs/menu.md` et ne bascule pas la carte en actif. Une fois PO-CTS-06 tranché côté développeuse, activer la carte se limite à remplacer `DisabledMenuCard` par la carte fonctionnelle existante du grid (même composant que les autres entrées actives de « Suivi de l'équipe »), poussant vers la route de cet écran.

⚠️ **Nav basse de la maquette** : elle montre « Recherche » en 3ᵉ position, là où la nav construite affiche « Actus » (PO-CTS-07, déjà signalé §5/§7 de la spec). **Ne pas** construire d'entrée « Recherche » ni retirer « Actus » sur la foi de cet écran — c'est un chrome hérité de l'export, pas une variation propre à cette feature.

### 2. Ce qui change par rôle — renvoi au RBAC de la spec, pas de redéfinition

Une seule variante existe dans cette passe : **Coach/Staff**, son équipe uniquement (§2 de la spec, `team_stats:view`). Pour tout autre rôle, l'écran entier et son point d'entrée sont **absents** (jamais grisés, jamais une version en lecture partielle) — AC-CTS-02.

| Bloc de l'écran | Action RBAC | Coach/Staff (seul rôle servi) |
|---|---|---|
| Écran entier (routage) | `team_stats:view` | visible, son équipe uniquement |
| Bloc Présence (agrégat + par joueur) | découle de `attendance_records_select_coach_admin` | visible |
| Bloc Buts (agrégat + par joueur) | `match_goals:view` (réutilisée, §2) | visible |
| Bloc Cartons (agrégat + par joueur) | `match_staff_events:view` (réutilisée, §2) | visible |

Il n'y a **pas** de sous-état « coach lecture partielle » à l'intérieur de cet écran : les trois blocs partagent le même seul rôle admis. La distinction staff-only du bloc Cartons (§1/§3 de la spec) se joue **entre écrans** (un joueur n'a jamais ce point d'entrée), pas par un état interne à celui-ci.

### 3. Structure de l'écran, de haut en bas

**En-tête** (`BackHeader`, `sticky top-0`, fond opaque, AC-CTS-15) — flèche retour + titre « Statistiques de l'équipe ».

**Ligne d'identification d'équipe** — nom de section/catégorie + effectif (« Seniors · 18 licenciés »). ⚠️ Le nombre affiché est un **compte d'effectif** (taille du roster de l'équipe courante), jamais dérivé d'un statut de cotisation (AC-CTS-11, §3 de la spec) — la source est le même comptage d'équipe déjà utilisé ailleurs dans l'app, pas une nouvelle requête sur les paiements.

**Sélecteur de saison** — dropdown/select plein-largeur, `h-11` minimum. PO-CTS-03 n'est pas tranché : dans cette passe, il **n'affiche que la saison courante** et n'ouvre aucune liste déroulante d'autres saisons — rendu comme un select à une seule option plutôt qu'un contrôle multi-saison inerte, pour ne pas suggérer une fonctionnalité qui n'existe pas encore. Si `current_season()` ne retourne aucune ligne, l'écran bascule sur l'état vide dédié (§3.5, AC-CTS-16), jamais sur un select vide silencieux.

**Filtre type de compétition** — trois chips « Tout / Championnat / Amicaux », exactement la forme de `TypeSelector` (chip à puce colorée, `role="group"`, `h-11`). **Conçu ici, non construit dans cette passe** (voir §4.2) — PO-CTS-01/AC-CTS-12 bloquants tant que `competition_type` n'existe pas en base.

**Carte « Présence de l'équipe »** (agrégat) — voir §4.3 pour son contenu exact et sa dégradation.

**Section « Effectif »** — titre de section + segmented control « Présence / Buts / Cartons » (voir §4.1 pour la spec d'interaction complète), puis la liste des joueurs.

**Bloc « Meilleurs buteurs »** — mini-classement (rang, nom, total). **Conçu ici, non construit dans cette passe** (PO-CTS-02, aucune vue `team_scorer_ranking`). Visuellement statique : contrairement au segmented control de la section Effectif, ce bloc **ne réagit pas** au filtre Présence/Buts/Cartons dans la maquette (il reste affiché sous « Effectif » quel que soit le filtre actif) — traité comme une sous-section indépendante, pas comme un état du filtre.

**Bloc « Cartons »** (agrégat d'équipe, staff-only par construction) — deux compteurs côte à côte (jaunes/rouges), même carte compacte que `FormAndGoalsRow` (`Card` 2 colonnes, libellé en petites majuscules, chiffre en gros). Comme le bloc « Meilleurs buteurs », **il est statique** : toujours affiché sous le classement, pas conditionné par le filtre Présence/Buts/Cartons du dessus. Il **peut** être construit dans cette passe : ses deux compteurs se comptent directement sur `match_events` (`match_staff_events:view`, déjà réutilisée, §2 de la spec) — aucune dépendance à PO-CTS-01/02.

### 4. Filtres — spécification d'interaction

#### 4.1 Filtre « type d'information » (Présence / Buts / Cartons) — au périmètre, à construire

- **Contrôle** : segmented control 3 états, une seule sélection active, construit sur `Tabs`/`TabsList`/`TabsTrigger` (même primitive shadcn que `RangeModeToggle`, pas un groupe de 3 boutons indépendants) — donne gratuitement le comportement clavier/`aria-selected` qu'AC-CTS-13/CDC §12 demandent. `h-11` sur `TabsList`, `min-w-0` sur chaque `TabsTrigger` (trois segments côte à côte, même raison que le pair Sem/Mois du calendrier — CLAUDE.md §6).
- **États** : `présence` (défaut à l'ouverture), `buts`, `cartons`. Un seul actif à la fois, fond plein + texte blanc sur le segment actif (mockup : pilule noire pleine sur « Présence »), les deux autres en contour neutre.
- **Portée de l'effet — ce qu'il change et ce qu'il ne change pas** (AC-CTS-05) :
  - Il **ne change jamais** quelles données sont chargées : les trois familles (présence, buts, cartons) sont déjà toutes lues pour un Coach/Staff autorisé sur son équipe (§2 de la spec) — pas de requête différente selon le filtre.
  - Il change **uniquement** laquelle des trois métriques est mise en avant (« headline ») sur chaque ligne joueur de la section Effectif : chaque ligne garde en permanence ses trois valeurs (taux de présence + barre, total de buts, résumé cartons), le filtre ne fait que permuter laquelle des trois occupe la position principale (gros chiffre + barre le cas échéant) et lesquelles passent en ligne secondaire compacte — jamais une valeur qui disparaît de la ligne.
  - Le bloc « Présence de l'équipe » (agrégat, §4.3), le bloc « Meilleurs buteurs » (déjà statique, §3) et le bloc « Cartons » (agrégat, déjà statique, §3) **ne réagissent pas** à ce filtre : ils restent affichés dans le même état quel que soit le segment actif. Seule la section « Effectif » (liste par joueur) change de présentation.
- **Rendu par état, ligne joueur** (avatar `InitialsAvatar` + nom, identiques dans les trois états — seule la partie droite change) :
  - **Présence** (défaut, celui illustré par la maquette) : gros pourcentage + fraction séances (« 15/18 ») à droite, barre de progression pleine largeur en dessous colorée selon le taux (jamais la couleur seule — AC-CTS-13 — la fraction texte accompagne toujours la barre). Ligne secondaire compacte : « ⚽ N but(s) » + résumé cartons texte (« 1 jaune », « 3 jaunes · 1 rouge », « Aucun carton »).
  - **Buts** : le total de buts du joueur devient le gros chiffre à droite (pas de barre — il n'y a pas de dénominateur pour un total de buts, contrairement à la présence). Ligne secondaire compacte : pourcentage + fraction de présence, résumé cartons.
  - **Cartons** : le résumé cartons devient l'élément mis en avant (deux pastilles jaune/rouge + libellé texte, jamais la pastille seule — AC-CTS-13), avec le total en gras. Ligne secondaire compacte : pourcentage de présence, total de buts.
  - Dans les trois états, le **tri de la liste ne change pas** : ordre alphabétique ou ordre du roster, **jamais** un classement qui se présenterait comme un palier ou un score Legacy (AC-CTS-08) — trier par valeur du filtre actif est une option d'ergonomie possible mais n'est pas imposée par la maquette (qui montre l'ordre « Présence » décroissant) ; à confirmer par la développeuse plutôt que deviné ici (voir §6, question mineure).
- **Buts (ligne joueur) ≠ « Meilleurs buteurs » (classement)** — distinction à ne pas perdre en implémentant : le mode « Buts » du segmented control affiche un total brut par joueur, déjà lisible via `match_goals:view` (aucune dépendance à PO-CTS-01/02) et **constructible dans cette passe**. Le bloc « Meilleurs buteurs » plus bas est un classement agrégé distinct, qui dépend de `team_scorer_ranking` (PO-CTS-02) et reste différé. Les deux ne doivent pas être fusionnés sous un seul use case.

#### 4.2 Filtre « type de compétition » (Tout / Championnat / Amicaux) — conçu, différé

- **Contrôle prévu** : chips à puce colorée, 3 états mutuellement exclusifs, même composant que `TypeSelector` (`role="group"`, `h-11`, `flex-wrap`).
- **Effet prévu, une fois construit** : filtre la **portée temporelle des agrégats** (présence sur les séances de ce type, buts/cartons sur les matchs de ce type) — jamais la visibilité d'un bloc entier. Liste blanche stricte (`= 'league'` / `= 'friendly'`), jamais liste noire (AC-CTS-12, même règle qu'AC-MS-07).
- **Recommandation de construction pour cette passe** : ne rendre **que** le chip « Tout », actif et unique — ne pas construire de chips « Championnat »/« Amicaux » cliquables sans effet réel tant que PO-CTS-01 n'est pas tranché. Un contrôle qui ne filtre rien au clic est une régression d'ergonomie plus qu'un service rendu, et personne n'a demandé un filtre inerte. Documenté ici en détail pour que l'ajout, une fois la colonne `competition_type` reprise, consiste à ajouter deux chips à un composant déjà en place plutôt qu'à le reconcevoir.

#### 4.3 Bloc « Présence de l'équipe » — dégradation explicite du dénominateur (PO-CTS-04)

Le mockup montre un gros pourcentage (« 84 % »), une moyenne par séance (« 15,2 / 18 en moyenne par séance ») et une barre de progression. **PO-CTS-04 n'étant pas tranché** (quelles convocations comptent, quel effectif de référence, traitement d'un joueur sans `AttendanceRecord`, convocations annulées), cette carte est conçue pour ne présumer d'aucune de ces réponses :

- Le chiffre de tête et la moyenne restent affichés **seulement si** un dénominateur est effectivement calculable pour la période/saison affichée. Si aucune séance constatée n'existe sur la période, la carte bascule sur l'état vide dédié (§3, « aucune séance constatée ») plutôt que d'afficher un `0 %` fabriqué (AC-CTS-17).
- Le libellé sous le pourcentage doit rester **descriptif de ce qui est effectivement compté**, pas d'une promesse générique : par exemple « sur les séances constatées de la saison » plutôt qu'un sous-texte qui laisserait entendre un périmètre (entraînements + matchs + réunions, effectif de référence) que PO-CTS-04 n'a pas encore fixé. Le tour de phrase précis reste à écrire par la développeuse une fois PO-CTS-04 répondu ; cette section ne fige pas ce libellé.
- Le calcul ne mélange jamais `AttendanceRecord` et `ConvocationResponse` (AC-CTS-06) — la barre et le pourcentage sont un fait constaté par le coach, jamais une intention déclarée par les joueurs.
- Même règle à la ligne joueur (§4.1, mode Présence) : un joueur sans aucun `AttendanceRecord` sur la période apparaît **dans la liste**, avec un état explicite (ex. « Aucune donnée » à la place du pourcentage, barre vide plutôt que barre à 0 %) — jamais absent de la liste, jamais compté comme présent par défaut (AC-CTS-07).

### 5. Nouveaux composants (résumé, pas de code)

Tous les contrôles interactifs à `h-11` minimum :

- **`TeamStatsFilterSegment`** — segmented control 3 états (Présence/Buts/Cartons), bâti sur `Tabs`/`TabsList`/`TabsTrigger` comme `RangeModeToggle`. Ne porte aucune logique de filtrage de données, seulement l'état d'affichage (§4.1).
- **`TeamAttendanceSummaryCard`** — carte pleine largeur : gros pourcentage + libellé descriptif + barre de progression pleine largeur. Dégradation explicite si le dénominateur n'est pas calculable (§4.3) — pas un simple réemploi de `VoteResultBar` tel quel (celle-ci est pensée pour une barre fine dans une ligne de liste, pas pour une barre de tête de carte), mais même logique de remplissage 0-100 bornée et même règle « jamais la couleur seule ».
- **`TeamRosterStatRow`** — ligne joueur de la section Effectif : `InitialsAvatar` + nom (identique à `RosterRow`/`AttendanceConfirmRow`), puis une zone « headline » et une ligne secondaire compacte dont le contenu dépend du filtre actif (§4.1). Barre de progression réutilisée de `VoteResultBar` (même fine barre `h-1.5`, remplissage borné 0-100, couleur jamais seule) pour le sous-cas « headline = Présence ».
- **`TeamScorerRankingCard`** *(conçu, non construit — PO-CTS-02)* — mini-liste rang/nom/total, même silhouette de ligne que `TeamRosterStatRow` sans avatar. À ne pas construire avant que `team_scorer_ranking` existe.
- **`TeamCardsSummaryRow`** *(constructible, §3)* — réemploi direct de la carte 2 colonnes de `FormAndGoalsRow` (`Card` compacte, libellé petites majuscules, chiffre en gros), une colonne « jaunes », une colonne « rouges ».
- **Filtre compétition** *(conçu, non construit — PO-CTS-01)* : réemploi direct de `TypeSelector` sans nouveau composant à créer — seul le jeu de données (`league`/`friendly`) change une fois construit.

Aucun de ces composants n'introduit un pattern visuel qui ne soit pas déjà une variation d'un composant existant du dépôt (barre de progression, chip, segmented control, carte compacte, ligne avatar+nom) — pas de prototype Claude Design supplémentaire nécessaire pour cette passe.

### 6. Rappels mobiles (`CLAUDE.md` §6)

- Segmented control Présence/Buts/Cartons et chips de compétition → `h-11` sur le conteneur, `min-w-0` sur chaque segment/chip (rangées à 2-3 éléments côte à côte, même raison que `RangeModeToggle`/`TypeSelector`).
- Sélecteur de saison → `h-11` minimum sur le `SelectTrigger`, pas le `h-8` par défaut de shadcn.
- Barre de progression (carte agrégat et ligne joueur) → toujours doublée d'un libellé texte (pourcentage, fraction), jamais seule (AC-CTS-13).
- En-tête retour → `sticky top-0`, fond opaque, identique à `BackHeader` existant (AC-CTS-15) — à vérifier que la liste Effectif, potentiellement longue sur un grand effectif, ne l'entraîne pas hors écran au défilement.
- Toutes les vérifications ci-dessus sur un **viewport mobile réel**, pas une fenêtre desktop redimensionnée (CLAUDE.md §6).

### 7. Corrections proposées vs maquette

Même précédent que `specs/match_details_page.md`/`specs/match-stats.md` (« corrections vs maquette ») : aucun bloc de la maquette ne porte de point/palier/badge Legacy, de note de match, de temps de jeu, de statut de cotisation ni de bouton d'export — la liste d'écueils habituelle (AC-CTS-08/09/11) est propre sur cet export. Une seule correction à noter :

- **« 18 licenciés »** (ligne d'identification d'équipe) : lu ici comme un **effectif** (taille du roster), jamais comme un statut de cotisation (§3 de la spec, AC-CTS-11) — pas une correction de contenu, mais une clarification de source à ne pas rater à l'implémentation : ce chiffre ne doit **pas** interroger la table d'adhésions/cotisations.

### 8. Questions UI ouvertes

| Réf. | Question |
|---|---|
| **UI-CTS-A** | Le tri de la liste Effectif change-t-il selon le filtre actif (ex. trier par buts décroissants quand « Buts » est actif), ou reste-t-il fixe (alphabétique ou ordre du roster) quel que soit le filtre ? La maquette n'illustre que l'état « Présence », trié décroissant — insuffisant pour déduire la règle générale. Attention si la réponse est « oui » : trier par valeur ne doit jamais se présenter comme un classement Legacy (AC-CTS-08) ; « Meilleurs buteurs » reste de toute façon un bloc à part, indépendant de ce tri (§4.1) |
| **UI-CTS-B** | Seuils de couleur de la barre de présence (vert/olive/rouge dans la maquette, cinq couleurs pour six lignes) : aucun seuil numérique n'est documenté nulle part dans le CDC ni la spec. Proposition à valider avant implémentation plutôt que des seuils devinés ici : réemployer une échelle à trois paliers déjà utilisée ailleurs si elle existe, sinon la faire trancher par la développeuse en même temps que PO-CTS-04 (le seuil dépend directement de ce que « bonne présence » signifie une fois le dénominateur fixé) |
| **UI-CTS-C** | Le libellé exact du sous-texte de la carte « Présence de l'équipe » (§4.3) n'est pas figé ici volontairement, en attente de PO-CTS-04 — à écrire au moment où le dénominateur est tranché, pas avant |
| **UI-CTS-D** | Une fois PO-CTS-06 tranché et la carte « Statistiques » du Menu activée : la carte pousse-t-elle directement vers cet écran, ou vers un sélecteur d'équipe pour un coach affecté à deux équipes (PO-CTS-05) ? Cette section suppose une équipe unique par coach affiché, cohérent avec le périmètre actuel, mais la question reste liée à PO-CTS-05, pas résolue ici |
