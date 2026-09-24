# Spec — Statistiques de match (section football)

> Statut : **rédaction initiale du 2026-09-24**. Distillation d'un brief développeuse déjà résolu (décisions **MS-01 → MS-17**, reprises ici comme **tranchées**, non rediscutées). Les points listés en §5 sont **OPEN et ne doivent pas être résolus implicitement** — ni par cette spec, ni par l'étape suivante.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0/P1 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles), `specs/match_details_page.md` (écran voisin, §1 « Relation avec `match_details_page` »), `specs/coach-attendance-confirmation.md` (précédent `AttendanceRecord` vs `ConvocationResponse`), `src/domain/policies/rbac-matrix.ts` (critère « entrée de matrice vs RLS seule », en-tête du fichier), `supabase/migrations/20260821091519_convocation_creation_schema.sql` (table `match_details` réelle).
> Périmètre de cette spec : **données + domaine + accès**. La passe de présentation n'est pas cadrée ici — voir §0 et PO-MS-11.

## 0. Maquettes — écart à signaler avant toute autre lecture

Le brief développeuse affirme qu'« aucune maquette n'existe pour l'onglet de saisie du résultat ni pour les écrans de statistiques » et que `docs/DESIGN-LINKS.md` n'a pas de ligne pour cette feature. **Les deux affirmations sont à corriger au 2026-09-24 :**

1. **Quatre maquettes existent réellement dans le dépôt**, sous `docs/designs/match/stats/` :
   - `[v3] [Coach] Mob - Match Result - 1.png`
   - `[v3] [Coach] Mob - Match Result - 2.png`
   - `[v3] [Joueur] Mob - Match Results - 1.png`
   - `[v3] [Joueur] Mob - Match Results - 2.png`

   Leur existence est un **signal de périmètre** exploité en §1 (deux variantes de rôle : saisie côté coach, consultation côté joueur) ; leur contenu visuel n'est ni décrit ni évalué ici, c'est le travail de l'agent designer.
   ⚠️ Rappel du précédent `player-vote` (`DESIGN_LINKS.md` §52) : **le préfixe de rôle dans le nom de fichier ne prouve pas la variante rendue** — à vérifier à l'ouverture, pas à déduire du nom.

2. **Le registre s'appelle `docs/designs/DESIGN_LINKS.md`**, pas `docs/DESIGN-LINKS.md`. Il n'a effectivement **aucune ligne** pour cette feature — mais, les instantanés locaux existant déjà, le §4 du registre place ce cas en **`instantané seul`** : l'agent utilise l'instantané versionné et **ne demande aucun lien artifact à la développeuse**. Rien à demander, donc, ni maintenant ni à un run ultérieur.

**Ligne de registre à ajouter** (l'agent PO n'écrit pas hors de `specs/` — reprise telle quelle par l'agent designer, même procédé que `menu`, `actus`, `player-vote`, `web-*`) :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| match-stats — **vue coach (saisie du résultat) et vue joueur (consultation)** (`[v3] [Coach] Mob - Match Result - {1,2}`, `[v3] [Joueur] Mob - Match Results - {1,2}`) | — aucun lien fourni | 2026-09-24 | `docs/designs/match/stats/[v3] [Coach] Mob - Match Result - {1,2}.png`, `docs/designs/match/stats/[v3] [Joueur] Mob - Match Results - {1,2}.png` | **instantané seul** |

## 1. Périmètre

Ce que la feature couvre : **le résultat d'un match et ce qui s'y rattache** — score, type de compétition, événements individuels (buts et cartons), plus deux lectures agrégées au niveau de l'équipe : la **forme générale** (bilan en championnat) et le **classement des buteurs** de l'équipe.

### Rattachement CDC et priorité

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Calendrier et convocations | **P0** | Extension du satellite `match_details` d'une convocation `type === 'match'` : score, type de compétition. Aucune modification de la convocation elle-même |
| Statistiques et exports — « tableaux de bord par rôle » | **P1** | Forme générale de l'équipe et classement des buteurs, en lecture, via deux vues agrégées. **Aucun export** (CSV/PDF) dans cette passe |

⚠️ **Le CDC ne définit aucun module « résultats et compétitions ».** La saisie du score et des événements n'a donc pas de ligne de module qui lui corresponde directement ; elle est rattachée ici au satellite match du P0 par construction technique, pas par lecture du CDC. C'est un **constat, pas une résolution** — voir PO-MS-08.

### Décisions déjà tranchées (brief développeuse, MS-01 → MS-17)

Reprises ici comme acquises. Elles ne sont **pas** des questions ouvertes.

| Réf. | Décision |
|---|---|
| MS-01 | Le score est un **fait primaire** stocké sur `match_details` (`goals_for`, `goals_against`) — **jamais dérivé** des événements de but |
| MS-02 | L'issue du match (victoire / nul / défaite) est **dérivée à la lecture**, jamais stockée |
| MS-03 | Les événements individuels vivent dans une table de journal séparée `match_events`, **une ligne par événement** |
| MS-04 | Types d'événements suivis : `goal`, `penalty_missed`, `yellow_card`, `red_card`. **Ni faute, ni passe décisive** |
| MS-05 | Un but dont le buteur est inconnu n'est **simplement pas enregistré**. Les buts club enregistrés sont toujours **≤ `goals_for`**, jamais davantage |
| MS-06 | `competition_type` sur `match_details` vaut `'friendly' \| 'league'`. **Pas de défaut**, pas de valeur interne/entraînement |
| MS-07 | Forme générale et classement des buteurs comptent **le championnat seulement**, via un filtre en **liste blanche** (`= 'league'`), en excluant les convocations annulées et les matchs sans score enregistré |
| MS-08 | Les buts en amical **restent visibles** à l'équipe pour un futur onglet de statistiques. Le filtre championnat est une **règle de comptage** (vues), pas une règle de visibilité (RLS) |
| MS-09 | Visibilité : les événements `goal` (**buts sur penalty inclus**) sont visibles de **tous les membres de l'équipe** ; **tout autre type** n'est visible que du **Coach/Staff de l'équipe**, via une **liste blanche sur `goal`** — de sorte qu'un futur type d'événement soit staff-only par défaut |
| MS-10 | Saisie du score et des événements : **Coach/Staff de l'équipe de la convocation uniquement**, pour l'instant |
| MS-11 | Le Coach/Staff peut **supprimer** un événement. Un événement n'est **jamais modifié** — supprimé puis recréé |
| MS-12 | Score et événements ne sont enregistrables qu'**après le coup d'envoi**, contrôle porté par les **use cases**, pas par la base — même raisonnement de risque accepté que la fenêtre de réponse (`convocation-domain-correction.md` §3.1, voir PO-MS-12 sur ce renvoi) |
| MS-13 | L'éligibilité d'un buteur est une **règle molle** (l'`AttendanceRecord` confirmé par le coach prime sur la `ConvocationResponse` du joueur), utilisée **uniquement** pour construire le sélecteur de l'écran de saisie — **jamais** imposée par un use case ni par la base |
| MS-14 | Le score doit être enregistré **avant** qu'un événement de but puisse être ajouté |
| MS-15 | Seule la section football existe ; les noms sont **volontairement footballistiques** |
| MS-16 | Penalty transformé = événement `goal` avec `is_penalty = true` ; penalty manqué = événement `penalty_missed`. Alternatives rejetées : (a) drapeau penalty sur le but seul — perd les penalties manqués ; (b) événement `penalty` distinct avec drapeau `converted` — oblige chaque agrégat de buts à compter deux formes et autorise la double saisie |
| MS-17 | Un `penalty_missed` **n'affecte pas le score** et **n'est pas contrôlé** contre `goals_for` ; il suit la même règle de timing (coup d'envoi) et le même filtre d'éligibilité molle que tout autre événement |

### Hors périmètre — explicitement

- **Passes décisives, fautes, temps de jeu, feuille de match, séances de tirs au but, penalties adverses, compteur de penalties stocké** — aucun n'est modélisé (MS-04, MS-16/17 et contraintes §6).
- **Modification d'un événement** : aucune politique `UPDATE` sur `match_events` (MS-11).
- **Couplage ASC Legacy** : un but n'attribue **aucun point** Legacy. Module ASC Legacy = P1 distinct, barème « à valider par le Bureau avant développement » (CDC §8).
- **Abstraction multi-sport** (esport, échecs, domino) : aucune (MS-15, PO-MS-05).
- **Onglet de statistiques sur les amicaux** : pas construit cette passe ; le modèle de données le permettra (MS-08, PO-MS-06).
- **Export** (CSV/PDF) des statistiques, pour tout rôle.
- **Élargissement de la saisie au-delà du Coach/Staff** (PO-MS-01) et de la visibilité des cartons (PO-MS-02).

### Relation avec `specs/match_details_page.md` — recouvrement réel, à traiter

`specs/match_details_page.md` décrit l'écran de **détail d'une convocation** (trois types, deux variantes de rôle). Les deux specs **touchent le même satellite `match_details`** mais ne couvrent pas la même chose :

| | `match_details_page` | `match-stats` (cette spec) |
|---|---|---|
| Objet | Consultation **avant** l'échéance : identité, RDV, effectif, réponses déclarées | Résultat **après** le coup d'envoi : score, événements, agrégats d'équipe |
| Écriture | Aucune, sauf `convocation:respond` (joueur) | `match_result:record` (coach) |
| Table | `convocations` + `match_details` (lecture des 4 champs existants) | `match_details` (3 colonnes **ajoutées**) + `match_events` (**nouvelle**) |

**Contradiction à trancher, pas à absorber en silence** : `specs/match_details_page.md` place explicitement hors périmètre « toute donnée de résultat (score, buteurs, temps de jeu, feuille de match) », au motif qu'« aucun module résultats et compétitions » n'existe en P0/P1, et son **AC-MD-19** exige qu'aucune donnée de résultat ne soit rendue sur cet écran, **même statique**. Cette feature construit précisément ces données. Deux specs disent donc aujourd'hui l'inverse l'une de l'autre.

Cette spec **ne modifie pas** `specs/match_details_page.md` (règle : ne jamais écraser une spec existante). Amendement **proposé**, à valider par la développeuse — voir PO-MS-09 : soit AC-MD-19 est restreint aux onglets « Infos » et « Effectif » de cet écran et un troisième onglet « Résultat » relève de la présente spec, soit les écrans de résultat vivent sur une route distincte et AC-MD-19 reste intact. Tant que ce n'est pas tranché, **aucun rendu de résultat ne doit être ajouté à `ConvocationDetailPage`**.

**Résolu (2026-09-24, décision développeuse)** : première option retenue — « Résultat » devient un **troisième onglet réel de `ConvocationDetailPage`**, à côté d'Infos/Effectif (et Votes pour un match), gated `convocation.type === 'match'` exactement comme l'onglet Votes. `AC-MD-19` de `specs/match_details_page.md` reste **tel qu'écrit** (règle : ne jamais réécrire une spec existante) mais s'entend désormais **restreint aux onglets Infos et Effectif de cet écran** — même divergence assumée, non réabsorbée dans le fichier d'origine, que l'ajout de l'onglet Votes par `specs/player-vote.md` (cf. le commentaire de `ConvocationDetailPage.tsx` sur ce même onglet). AC-MS-24 ci-dessous est modifié en conséquence.

## 2. RBAC

### Actions au périmètre — exactement trois, rien de plus

| Action | Rôles | Portée | Miroir SQL |
|---|---|---|---|
| `match_result:record` | **Coach/Staff** | Son équipe (celle de la convocation) | `match_details` UPDATE, `match_events` INSERT + DELETE |
| `match_goals:view` | **Joueur/Joueuse**, **Coach/Staff** | Son équipe | `match_events` SELECT, **branche `goal`** |
| `match_staff_events:view` | **Coach/Staff** | Son équipe | `match_events` SELECT, **branche staff** (tout événement **non-`goal`**) |

**Ne pas accorder ces actions à Responsable de section, Dirigeant habilité ni Administrateur dans cette passe** — décision explicite du brief, y compris là où la matrice CDC serait plus généreuse (voir ci-dessous). Élargissement = PO-MS-01 / PO-MS-02, sur demande explicite de mise à jour RBAC.

### Lecture de la matrice CDC, rôle par rôle

Lignes applicables de `docs/priorisation-fonctionnelle-as-acaribbean.md` : **« Saisir une évaluation sportive »** (la seule ligne d'écriture sportive) et **« Voir les dossiers des autres membres »** (la lecture d'une donnée nominative de tiers — un but est attribué à une personne nommée).

| Rôle | Valeur matrice (évaluation sportive / dossiers) | Traduction sur cette feature |
|---|---|---|
| Joueur / Joueuse | ❌ / ❌ | **Aucune saisie.** Lecture des événements `goal` de son équipe (`match_goals:view`) et des deux agrégats d'équipe. **Aucun carton, aucun penalty manqué** (MS-09) |
| Coach / Staff | ✅ (son équipe) / ❌ (son équipe, hors financier) | **Seul rôle en écriture** (`match_result:record`, MS-10). Lecture de **tous** les types d'événements de son équipe (`match_goals:view` + `match_staff_events:view`) |
| Responsable de section | ❌ / ✅ (sa section) | **Aucune action accordée cette passe**, bien que la ligne « dossiers » lui donne ✅ sur sa section. Écart assumé et borné par PO-MS-01 — pas un oubli |
| Dirigeant habilité | ❌ / ✅ | **Aucune action accordée cette passe.** Même écart assumé, même renvoi PO-MS-01 |
| Trésorier | ❌ / ❌ (financier seulement) | Aucun accès |
| Référent médical | ❌ / ❌ (santé seulement, tracé) | Aucun accès. Un carton n'est pas une donnée santé (§3) |
| Bénévole | ❌ / ❌ | Aucun accès |
| Administrateur | ❌ / ✅ | **Aucune entrée de matrice accordée cette passe.** Le statu quo RLS de `match_details` (`… or private.is_admin()` en lecture) n'est pas retiré, mais aucun point d'entrée n'est construit — même formulation que `'attendance:validate'` dans `rbac-matrix.ts`. PO-MS-01 |

**AC-01 / AC-02 (CDC §17.2) s'appliquent intégralement** : un joueur ne voit rien hors de son propre périmètre, un coach seulement les équipes auxquelles il est affecté. C'est la borne de portée de chacune des trois actions.

### Note structurelle sur la forme des deux actions `:view` — non bloquante

L'en-tête de `src/domain/policies/rbac-matrix.ts` pose le critère du dépôt : une entrée de matrice ne se justifie **que si `presentation/` doit décider quelque chose avant ou indépendamment du résultat de la requête** ; sinon, RLS seule suffit et dupliquer la règle est « un risque de divergence, pas une sécurité supplémentaire ». La lecture des réponses de convocation est explicitement citée comme exemple **RLS-only**.

`match_result:record` satisfait clairement le critère (rendre ou non l'écran/onglet de saisie). Pour `match_goals:view` et `match_staff_events:view`, cela dépend de la réponse à une question de rendu : **l'écran doit-il masquer structurellement un bloc « cartons » avant la requête** (⇒ entrée de matrice justifiée), ou se contente-t-il d'afficher ce que le dépôt lui renvoie sous RLS (⇒ RLS seule) ? La **liste blanche sur `goal` en RLS reste la sécurité réelle dans les deux cas** (MS-09). Point à trancher à l'étape de conception/build, consigné en PO-MS-10 — sans effet sur le modèle de données ni sur les politiques.

## 3. Données sensibles

### Données de santé — aucune, et une frontière à ne pas franchir

Ni diagnostic, ni aptitude, ni indisponibilité médicale n'entre dans cette feature.

⚠️ **Deux vecteurs à tenir fermés** :
- **Le motif d'absence** (`ConvocationResponse.reason`, texte libre pouvant contenir un motif médical) est consommé indirectement par la règle molle d'éligibilité du buteur (MS-13). Le sélecteur de l'écran de saisie doit s'appuyer sur le **statut** (`AttendanceRecord` puis `ConvocationResponse`), **jamais** afficher ni transporter `reason` — cohérent avec AC-MD-12 de `specs/match_details_page.md`, où ce champ reste non affiché pour tout le monde tant que PO-PD-03 n'est pas tranché par le référent RGPD (toujours **non désigné**, `docs/GOUVERNANCE.md`).
- **Un carton n'est pas une donnée de santé**, et ne doit jamais être traité comme telle ni rapproché du périmètre du Référent médical. Sa restriction au Coach/Staff (MS-09) est une règle de **discrétion disciplinaire**, pas une règle RGPD santé.

### Données financières — aucune

Aucun montant, aucune cotisation, aucune amende disciplinaire chiffrée. Si une amende venait un jour s'attacher à un carton rouge, elle relèverait du module **Cotisations (P1)** et du Trésorier — **hors de cette feature**, à ne pas anticiper dans le schéma.

### Données personnelles de tiers — c'est ici que se situe le vrai sujet

Un événement `match_events` est **nominatif par construction** : il attribue un fait à une personne identifiée. Deux niveaux, à ne pas confondre :

- **Un but attribué à un coéquipier** : visible de toute l'équipe (MS-09). Cohérent avec la lecture déjà admise en §2 de `specs/match_details_page.md` (l'identité de l'effectif de sa propre équipe n'est pas « voir le dossier »).
- **Un carton ou un penalty manqué attribué à un coéquipier** : **donnée nominative défavorable**. C'est précisément ce que la restriction staff-only protège. La liste blanche sur `goal` (plutôt qu'une liste noire des cartons) est la bonne forme : tout type d'événement futur est staff-only par défaut, donc une extension du modèle ne peut pas élargir une visibilité par inadvertance.
- **Le classement des buteurs** est un **agrégat nominatif publié à l'équipe** — premier de ce genre dans le projet. Il reste borné à l'équipe et à la saison en cours par les politiques sous-jacentes (`security_invoker`), et n'est **pas** un export au sens du CDC §11.3.

### Journal d'audit

**Aucune journalisation requise par cette feature.** Enregistrer un score ou un but ne figure pas dans les actions sensibles du CDC §11.3 (création/suppression de compte, changement de rôle, consultation de donnée santé, modification de paiement, correction de points Legacy, export nominatif).

Réserves explicites, conformes à la règle « en cas de doute, signaler plutôt qu'omettre » :

- ⚠️ **La suppression d'un événement (MS-11) est une écriture destructive et nominative**, sans trace puisque la table n'est pas append-only et qu'aucun `UPDATE` n'existe. Le CDC ne l'exige pas ; elle est **signalée comme candidate** à la journalisation métier (depuis le use case `DeleteMatchEventUseCase`, jamais depuis un composant — `CLAUDE.md` §6) le jour où la table de journal existera. PO-MS-13.
- ⚠️ Si un jour un but **attribuait des points ASC Legacy**, la correction de ces points deviendrait une action tracée (CDC §11.3). Raison de plus pour tenir le **non-couplage Legacy** de cette passe (§1, hors périmètre).
- ⚠️ **L'absence de table de journal d'audit dans `supabase/migrations/`** reste une exigence transversale P0 non résolue du projet, distincte de cette feature (déjà consignée dans `specs/match_details_page.md` §3).

## 4. Critères d'acceptation

`AC-01`/`AC-02` sont ceux du CDC §17.2. Les critères propres à cette feature sont préfixés **`AC-MS-`**, même convention que `AC-MD-`/`AC-CD-`/`AC-PD-`, et alignés sur la numérotation `MS-xx` des décisions.

| Réf. | Critère |
|---|---|
| **AC-01** | Aucune donnée d'un membre extérieur à l'équipe du match n'est accessible, ni à l'écran ni dans la réponse API |
| **AC-02** | Un membre de l'équipe A demandant le résultat ou les événements d'un match de l'équipe B n'obtient aucun champ. Vérifié **par appel direct à l'API**, jeton joueur **et** jeton coach, hors application |
| AC-MS-01 | `goals_for`/`goals_against` sont lus tels qu'enregistrés sur `match_details`. Supprimer tous les événements de but d'un match **ne change pas** son score (MS-01) |
| AC-MS-02 | Victoire / nul / défaite est **calculée à la lecture** ; aucune colonne ni champ persisté ne porte l'issue (MS-02) |
| AC-MS-03 | Chaque événement occupe **une ligne** de `match_events`. Les seuls types acceptés sont `goal`, `penalty_missed`, `yellow_card`, `red_card` ; toute autre valeur est refusée **par la base** (MS-03/04) |
| AC-MS-04 | Un but dont le buteur est inconnu **ne crée aucune ligne** et laisse le score inchangé. Aucun buteur « inconnu », « équipe » ou fictif n'est proposé par le sélecteur (MS-05) |
| AC-MS-05 | Le nombre d'événements `goal` d'un match est toujours **≤ `goals_for`**. Un ajout qui dépasserait ce plafond est refusé par `AddMatchEventUseCase` (`InconsistentMatchScoreError`) ; une **révision du score à la baisse** sous le nombre de buts déjà enregistrés est refusée par `RecordMatchScoreUseCase` avec la **même erreur** (MS-05) |
| AC-MS-06 | `competition_type` ne prend que `'friendly'` ou `'league'`, **sans valeur par défaut** : un match créé sans type de compétition est refusé, jamais rangé en championnat par défaut (MS-06) |
| AC-MS-07 | `team_match_record` et `team_scorer_ranking` comptent **uniquement** les matchs `competition_type = 'league'` (liste blanche, jamais `<> 'friendly'`), **en excluant** les convocations annulées et les matchs sans score enregistré. Un amical, un match annulé et un match sans score sont invisibles des deux agrégats (MS-07) |
| AC-MS-08 | Les buts d'un **amical** restent lisibles par un jeton joueur de l'équipe via `match_events` : le filtre championnat n'apparaît **dans aucune politique RLS**, seulement dans les deux vues (MS-08) |
| AC-MS-09 | Pour un **jeton joueur** de l'équipe, les événements `yellow_card`, `red_card` et `penalty_missed` sont **absents de la réponse API**, pas seulement du rendu — vérifié hors application. Les `goal`, **y compris `is_penalty = true`**, sont présents (MS-09). *Même leçon qu'AC-MD-08 : ne jamais évaluer ce critère contre un composant* |
| AC-MS-10 | La branche staff de la politique `SELECT` est écrite en **liste blanche sur `goal`** : un cinquième type d'événement ajouté à la contrainte de la table est **staff-only sans modifier la politique** (MS-09). Testable en ajoutant un type factice en environnement de test |
| AC-MS-11 | Enregistrer un score ou un événement sur un match d'une autre équipe, ou en tant que Joueur/Joueuse, Responsable de section, Dirigeant habilité ou Trésorier, est refusé **par la base**, pas seulement par l'interface (MS-10, AC-02) |
| AC-MS-12 | Un événement peut être **supprimé** par le Coach/Staff de l'équipe. **Aucune politique `UPDATE` n'existe sur `match_events`** : une tentative de modification est refusée par la base (MS-11) |
| AC-MS-13 | Avant le coup d'envoi, `RecordMatchScoreUseCase` et `AddMatchEventUseCase` lèvent `MatchNotStartedError`. Ce contrôle est **dans le use case**, pas dans la base — l'absence de garde SQL est un **risque accepté et documenté**, pas un oubli (MS-12) |
| AC-MS-14 | Le sélecteur de buteur de l'écran de saisie propose en priorité les joueurs dont l'`AttendanceRecord` confirmé par le coach vaut présent, puis, à défaut d'`AttendanceRecord`, la `ConvocationResponse`. **Aucun use case ni aucune contrainte de base ne refuse** un événement portant sur un joueur hors de cette liste (MS-13) |
| AC-MS-15 | Ajouter un événement `goal` sur un match dont le score n'est pas enregistré est refusé par `AddMatchEventUseCase` (`MatchScoreMissingError`) (MS-14) |
| AC-MS-16 | Un penalty transformé est **un seul** événement `goal` avec `is_penalty = true` — jamais un `goal` **plus** un second événement. Un penalty manqué est un événement `penalty_missed` (MS-16) |
| AC-MS-17 | Un `penalty_missed` **ne modifie pas** `goals_for` et **n'entre pas** dans le contrôle de cohérence d'AC-MS-05. Il reste soumis à AC-MS-13 (timing) et AC-MS-14 (sélecteur) (MS-17) |
| AC-MS-18 | `match_events` référence **`match_details(convocation_id)`**, pas `convocations(id)` — choix délibéré : un événement ne peut pas exister sur une convocation qui n'est pas un match |
| AC-MS-19 | `team_match_record` et `team_scorer_ranking` sont créées en **`security_invoker = true`** : un jeton hors de l'équipe interrogeant directement la vue obtient un résultat vide, jamais les lignes d'une autre équipe (AC-02) |
| AC-MS-20 | Enregistrer un but **n'attribue aucun point ASC Legacy** et n'écrit dans aucune table Legacy (§1, hors périmètre) |
| AC-MS-21 | Aucune notion de sport, de discipline ou de type de section n'apparaît dans le schéma, les entités ou les use cases : les noms sont footballistiques et assumés comme tels (MS-15) |
| AC-MS-22 | *(Passe présentation, si elle est cadrée — PO-MS-11)* L'issue victoire / nul / défaite et le type de compétition ne sont **jamais portés par la seule couleur** : toujours doublés d'un libellé textuel (CDC §12, contrastes AA) |
| AC-MS-23 | *(Passe présentation, si elle est cadrée — PO-MS-11)* Les contrôles de saisie du résultat (champs de score, sélecteur de buteur, boutons d'ajout/suppression) ont une cible tactile ≥ ~44px (`h-11`), vérifiée sur un **viewport mobile réel** ; les champs côte à côte (score domicile / extérieur) portent `min-w-0` — `CLAUDE.md` §6 |
| AC-MS-24 | *(PO-MS-09 résolu 2026-09-24)* Le rendu de résultat vit dans un **troisième onglet « Résultat » de `ConvocationDetailPage`**, gated `type === 'match'`. `AC-MD-19` de `specs/match_details_page.md` s'entend restreint aux onglets Infos/Effectif de cet écran — non réécrit dans ce fichier |

## 5. Points ouverts

Les sept premiers sont **repris du brief développeuse et restent OPEN** : ni cette spec, ni l'agent designer, ni l'étape de build ne doivent les résoudre. Les suivants sont propres à cette rédaction.

| Réf. | Question | À trancher par | Déclencheur / bloquant ? |
|---|---|---|---|
| **PO-MS-01** | **Droits de saisie au-delà du Coach/Staff** — Responsable de section et Administrateur sont attendus plus tard | Développeuse / Bureau | Déclencheur : **demande explicite de mise à jour RBAC**. Non bloquant |
| **PO-MS-02** | **Visibilité des cartons au-delà du Coach/Staff de l'équipe** — mêmes rôles que PO-MS-01 | Développeuse / Bureau | Déclencheur : **demande explicite de mise à jour RBAC**. Non bloquant |
| **PO-MS-03** | **Modification après clôture de la convocation** — aucune restriction fondée sur la clôture dans cette passe | Développeuse | Déclencheur : **spécification de `ReopenConvocation`** (`convocation-domain-correction.md` §6.3). Non bloquant |
| **PO-MS-04** | **Limitation acceptée de MS-13** : un coach peut confirmer un joueur absent **après** lui avoir attribué un but ; rien n'empêche l'incohérence | Développeuse | À revoir **uniquement** si un problème réel est remonté. Non bloquant |
| **PO-MS-05** | **Autres sections** (esport, échecs, domino) | Bureau | Déclencheur : **implémentation d'une deuxième section avec des matchs**. Non bloquant |
| **PO-MS-06** | **Buts en amical dans un onglet de statistiques** — non construit cette passe ; le modèle de données le permet plus tard (MS-08) | Développeuse | Non bloquant |
| **PO-MS-07** | **§6.1 — source de vérité des « convoqués requis »** : inchangée, **non résolue** par cette feature (déjà OPEN dans `docs/convocation_visibility_rls_correction.md` §3 et `specs/match_details_page.md` §5) | Bureau + développeuse | Non bloquant ici. **Ne pas créer de table `convocation_attendees` par anticipation** |
| **PO-MS-08** | **Rattachement CDC et priorité de la saisie de résultat.** Le CDC ne définit **aucun module « résultats et compétitions »** ; §1 rattache la saisie au satellite match du P0 par construction technique, pas par lecture du CDC. Les agrégats relèvent clairement de « Statistiques et exports » (**P1**). Une feature P1 construite avant la fin du P0 est un arbitrage de séquencement, pas une lecture du CDC | Bureau | **Non bloquant** pour la conception ; à consigner pour ne pas devenir un précédent implicite |
| **PO-MS-09** | ~~**Contradiction avec `specs/match_details_page.md`**~~ — **résolu (2026-09-24, décision développeuse)** : troisième onglet « Résultat » réel de `ConvocationDetailPage`, `AC-MD-19` s'entend restreint aux onglets Infos/Effectif (non réécrit dans le fichier d'origine). Voir §1 et AC-MS-24 | Développeuse | Résolu |
| **PO-MS-10** | **Entrée de matrice vs RLS seule pour `match_goals:view` et `match_staff_events:view`** — voir la note de §2. Dépend d'une décision de rendu (bloc masqué avant la requête ou non), pas du modèle de données | Développeuse | Non bloquant. La liste blanche RLS reste la sécurité réelle dans les deux cas |
| **PO-MS-11** | **La passe présentation est-elle au périmètre ?** Le brief supposait qu'aucune maquette n'existait ; **quatre existent** (§0). Le périmètre de cette spec reste **données + domaine + accès**, mais la question « la présentation entre-t-elle dans cette passe ou dans la suivante » n'est pas tranchée ici — c'est un arbitrage développeuse, comme la séparation migrations/`presentation` déjà pratiquée pour `convocation_visibility_rls_correction` §6 | Développeuse | Non bloquant pour l'agent designer (les maquettes sont là et exploitables) |
| **PO-MS-12** | **`convocation-domain-correction.md` est introuvable dans le dépôt.** Le brief y renvoie (§3.1 pour le risque accepté de MS-12, §6.1 pour PO-MS-07, §6.3 pour PO-MS-03) et `docs/convocation_visibility_rls_correction.md` le cite comme un document existant, mais aucun fichier de ce nom n'est versionné. Le raisonnement de MS-12 est **repris en toutes lettres en §1**, donc rien n'est perdu — mais les renvois §x.y ne sont pas vérifiables | Développeuse | Non bloquant. À verser au dépôt ou à re-pointer vers le document réel |
| **PO-MS-13** | **La suppression d'un événement (MS-11) doit-elle être journalisée ?** Écriture destructive et nominative, sans trace. Non exigée par le CDC §11.3 — à confirmer par le **référent RGPD** (toujours **non désigné**, `docs/GOUVERNANCE.md`), en même temps que la table de journal d'audit manquante | Référent RGPD + Bureau | Non bloquant pour cette passe |

## 6. Notes d'implémentation pour l'étape de build

**Ce ne sont pas des décisions produit** — ce sont des vérifications à faire dans le code avant d'écrire la migration. Trois des quatre ont déjà une réponse partielle, relevée en rédigeant cette spec ; elles restent à confirmer.

1. **Nom de la colonne d'heure du coup d'envoi.** `supabase/migrations/20260821091519_convocation_creation_schema.sql` montre que `match_details` porte `meeting_point_time` (**heure de RDV**) mais **aucune heure de coup d'envoi** : le coup d'envoi est `convocations.date` (cf. `specs/match_details_page.md` AC-MD-03, « heure de RDV ≠ coup d'envoi »). La règle de timing MS-12 doit donc s'appuyer sur `convocations.date`, **jamais** sur `meeting_point_time` — à reconfirmer contre l'entité `domain/entities/match-details.ts`.
2. **Existe-t-il déjà des lignes dans `match_details` ?** Détermine comment `competition_type` peut être ajoutée : MS-06 exige `not null` **sans défaut**, ce qui est impossible sur une table non vide sans reprise. **Si des lignes existent : s'arrêter et demander**, ne jamais deviner une valeur de reprise (un amical rangé en championnat par défaut fausserait silencieusement les deux agrégats, AC-MS-07).
3. **Politiques et fonctions RLS existantes à réutiliser, jamais à redériver.** Déjà présentes : `private.is_team_member`, `private.is_coach_of_team`, `private.is_section_manager_of_team`, `private.has_role`, `private.is_admin`, et sur la table elle-même `match_details_select_team_scoped` (lecture `is_team_member or is_admin`) et `match_details_insert_create`. **Il n'existe aujourd'hui aucune politique `UPDATE` sur `match_details`** — MS-10 en exige une. Réutiliser le prédicat de portée existant, ne pas en réécrire un comparable (`ARCHITECTURE.md` §7 : les politiques doivent rester comparables à l'œil).
4. **Un coach peut-il lire `convocation_responses.status` aujourd'hui ?** Nécessaire au repli du sélecteur de buteur (MS-13). `specs/match_details_page.md` §1 indique que `convocation_responses_select_team_scoped` l'accorde déjà au coach — **à vérifier dans la migration**, pas sur la foi de la spec voisine.

### Forme technique attendue — à porter telle quelle dans la conception

- **Base** : colonnes `match_details.goals_for` / `goals_against` / `competition_type` ; table `match_events` (**FK vers `match_details(convocation_id)`, pas `convocations(id)`** — délibéré, AC-MS-18) ; RLS conforme à MS-09/MS-10/MS-11 ; deux vues de lecture `team_match_record` et `team_scorer_ranking` (`security_invoker`, liste blanche championnat).
- **Domaine** : `CompetitionType`, entité `MatchEvent`, entités `TeamMatchRecord` / `ScorerRankingEntry` ; politiques `match-outcome-rules.ts`, `match-event-rules.ts`, `match-result-timing-rules.ts`, `match-scorer-rules.ts` ; interfaces de dépôt ; use cases `RecordMatchScoreUseCase`, `AddMatchEventUseCase`, `DeleteMatchEventUseCase`, `GetTeamMatchRecordUseCase`, `GetTeamScorerRankingUseCase` ; erreurs `MatchNotStartedError`, `InconsistentMatchScoreError`, `MatchScoreMissingError`.
- **Contraintes à ne pas franchir** : aucun type d'événement passe décisive ou faute ; aucune séance de tirs au but ; aucun penalty adverse ; aucun compteur de penalties stocké ; **aucune politique `UPDATE` sur `match_events`** ; aucune imposition de l'éligibilité du buteur hors du sélecteur ; **aucun couplage ASC Legacy** ; aucune abstraction multi-sport.
- Rappels `CLAUDE.md` : mirroring SQL ↔ TypeScript **manuel** et commenté du nom de la règle de part et d'autre (§7) ; journalisation métier depuis le use case, jamais depuis un composant (§6) ; `AttendanceRecord` et `ConvocationResponse` restent **deux entités distinctes**, MS-13 les lit sans les fusionner (§6).

## 7. Note pour designer-agent

- **Maquettes** : les quatre PNG de `docs/designs/match/stats/` (§0). Statut de registre **`instantané seul`** — **ne rien demander à la développeuse**, la référence est déjà dans le dépôt. Ajouter la ligne de registre pré-rédigée en §0.
- ⚠️ **Ne pas déduire la variante de rôle du nom de fichier** (précédent `player-vote`, `DESIGN_LINKS.md` §52).
- **Le CDC et la matrice RBAC priment, la maquette informe la mise en page.** Précédent constant du projet : les maquettes livrées ont systématiquement contenu des blocs sans fondement dans le modèle de domaine (voir `specs/match_details_page.md` « Corrections obligatoires vs maquette », dix corrections). Blocs à écarter s'ils apparaissent : **passe décisive, faute, temps de jeu, possession, note de match, feuille de match, tirs au but, points Legacy gagnés sur un but, statistiques toutes compétitions confondues** (le comptage est championnat seulement, AC-MS-07).
- **Deux variantes de rôle, pas deux écrans indépendants** : côté coach la **saisie** (score + événements + suppression), côté joueur la **consultation** — et côté joueur, **aucun carton, aucun penalty manqué, nulle part** (AC-MS-09). C'est une contrainte structurelle, pas un choix de mise en page : un bloc non autorisé est **absent**, jamais grisé.
- **Le score se saisit avant les buteurs** (AC-MS-15) et **seulement après le coup d'envoi** (AC-MS-13) : l'écran a besoin d'un état « match pas encore joué » et d'un état « score enregistré, aucun buteur saisi ».
- **États à couvrir** : match à venir (saisie indisponible), score enregistré sans événement, score 0-0, buts enregistrés en nombre inférieur à `goals_for` (cas normal, MS-05 — pas un état d'erreur), forme générale vide (aucun match de championnat joué), classement des buteurs vide, match amical (exclu des agrégats mais ses buts restent visibles, AC-MS-08).
- **Deux champs de score côte à côte** : `min-w-0` obligatoire sur chaque élément de grille, cibles ≥ `h-11` (AC-MS-23, `CLAUDE.md` §6).
- **Issue et type de compétition toujours doublés d'un libellé textuel** (AC-MS-22).
- ⚠️ **Ne pas loger ces blocs dans `ConvocationDetailPage` tant que PO-MS-09 n'est pas tranché** (AC-MS-24) — la spec voisine interdit aujourd'hui toute donnée de résultat sur cet écran.
- Rappel `CLAUDE.md` §9 : aucun nom de personne figurant dans les maquettes ne doit apparaître dans le code, les tests ou la documentation.

## UI design

> Rédigé à partir des quatre PNG de `docs/designs/match/stats/` (registre `docs/designs/DESIGN_LINKS.md`, ligne `match-stats`, statut **instantané seul** — ligne ajoutée par cet agent, aucun lien à demander). Les quatre exports ont été ouverts individuellement, sans déduire la variante de rôle du nom de fichier (précédent `player-vote`).

### 1. Emplacement dans la navigation à 4 entrées

Aucun nouvel onglet de navigation. La feature vit entièrement sous **Calendrier**, comme `match_details_page` : on y accède en ouvrant une convocation de type match, sur l'écran « Match » déjà cadré par `specs/match_details_page.md`.

Les deux exports `[Joueur]` montrent un **onglet « Résultat »** ajouté à la même barre d'onglets horizontale que les autres onglets de cet écran (`Infos · Compo · Effectif · Votes · Messagerie · Résultat`, « Résultat » actif et souligné). Les deux exports `[Coach]` montrent la même barre avec des libellés plus longs (`Infos · Convocations · Disposition · Stats · Votes · Me…`) : l'onglet « Résultat » lui-même n'est pas visible dans le cadre (poussé hors champ par le scroll horizontal), mais le contenu SCORE/BUTEURS/CARTONS affiché sous la barre est bien celui de cet onglet.

⚠️ **Ce que ça implique pour PO-MS-09, sans le trancher** : visuellement, la maquette traite « Résultat » comme un onglet parmi les autres de l'écran de détail de convocation — ce qui va dans le sens de l'option « AC-MD-19 restreint aux onglets Infos/Effectif, un 3ᵉ onglet Résultat en dehors ». Mais rien n'oblige à ce que cet onglet soit **techniquement** rendu par le même composant `ConvocationDetailPage` : recommandation de conception — router « Résultat » vers un composant distinct (`MatchResultPage` ou équivalent), visuellement raccordé à la même barre d'onglets, mais qui ne fait pas partie de `ConvocationDetailPage`. Ça satisfait la maquette (même barre, même bascule) sans toucher à AC-MD-19 tel qu'écrit aujourd'hui, quelle que soit l'issue de PO-MS-09. **La décision définitive (rester un onglet du même composant vs. route distincte) reste PO-MS-09**, bloquant pour cette passe présentation (AC-MS-24) — pas résolu ici.

Les deux vues agrégées d'équipe (forme générale, classement des buteurs, §1 de la spec) **n'apparaissent dans aucun des quatre exports**. Aucun mockup n'existe pour elles — voir §7 « Questions UI ouvertes ».

### 2. Ce qui change par rôle — renvoi au RBAC de la spec, pas de redéfinition

| Bloc de l'écran | Action RBAC | Joueur/Joueuse | Coach/Staff |
|---|---|---|---|
| Score (lecture + issue calculée) | `match_goals:view` | visible, lecture seule | visible, lecture + écriture |
| Score (saisie/mise à jour) | `match_result:record` | absent | visible (formulaire) |
| Buteurs (liste des `goal`, penalty inclus) | `match_goals:view` | visible, lecture seule | visible, lecture + ajout/suppression |
| Cartons / penalty manqué | `match_staff_events:view` | **absent** (jamais grisé — AC-MS-09) | visible, lecture + ajout/suppression |

Un joueur ne voit donc jamais le bloc CARTONS ni un compteur de penalty manqué, dans aucun état : le bloc est absent de l'arbre rendu, pas désactivé. C'est cohérent avec ce que montrent les deux exports `[Joueur]`, qui n'affichent que SCORE + BUTEURS, jamais de bloc cartons.

### 3. Écran coach — saisie du résultat (`[Coach] Mob - Match Result - {1,2}`)

Onglet « Résultat » de l'écran Match, en-tête déjà existant (badges d'équipe, `VS`, en-tête sticky avec flèche retour — même pattern `BackHeader` `sticky top-0` que le reste de l'écran de convocation, non re-décrit ici).

**Bandeau d'état, sous la barre d'onglets** :
- avant le coup d'envoi : notice texte, copie fournie verbatim — « Le score ne peut être saisi qu'après le coup d'envoi. » (AC-MS-13/MS-12)
- après le coup d'envoi, score pas encore enregistré : badge vert « Coup d'envoi donné ✓ »

⚠️ **Contrôle à ne pas construire** : le bouton « Simuler le coup d'envoi » (écran 1) est un artefact de démonstration du prototype, servant à prévisualiser l'état « avant coup d'envoi ». Il n'a pas de contrepartie en production — l'état se déduit de `convocations.date` comparée à l'heure courante (MS-12, note d'implémentation §6.1 de la spec), jamais d'un bouton.

**Carte SCORE** :
- deux champs numériques côte à côte, libellés « [Nom équipe domicile] » / « [Nom équipe extérieur] » au-dessus de chaque champ, séparateur « – » au centre
- **contrainte mobile explicite** : ligne à deux champs côte à côte → chaque champ doit porter `min-w-0` sur son conteneur de grille/flex, faute de quoi un clavier numérique natif peut faire déborder l'un des deux champs sur un viewport étroit (`CLAUDE.md` §6) ; chaque `Input` en `h-11` minimum, pas le `h-8` par défaut de shadcn
- champs et bouton **désactivés** (grisés, tel que montré à l'écran 1) tant que le coup d'envoi n'est pas passé ; **actifs** (bordure blanche, bouton vert plein, écran 2) une fois le coup d'envoi passé
- bouton pleine largeur « Mettre à jour le score », `h-11` minimum, déclenche `RecordMatchScoreUseCase` — seul déclencheur d'écriture du score, pas d'auto-save au blur

**Carte BUTEURS** :
- en-tête avec compteur « X / N buts attribués », N = `goals_for` courant — lecture directe de la contrainte AC-MS-05, pas un simple libellé décoratif : quand X atteint N, la liste/le bouton « Ajouter » doivent être désactivés (aucun état à X = N n'est visible dans les deux exports fournis, tous deux à 0/2 — comportement à ce plafond non illustré, voir §7)
- texte d'aide, copie verbatim fournie : « Un buteur doit être noté présent pour apparaître dans la liste. »
- chip case à cocher « Penalty » (porte `is_penalty = true` sur l'événement à créer)
- liste de lignes sélectionnables (avatar initiales + nom), une seule sélection à la fois — source = règle molle MS-13 (`AttendanceRecord` confirmé présent, sinon `ConvocationResponse`), **jamais** le champ `reason`
- pied de carte : « Annuler » (réinitialise la sélection) / « Ajouter » (`h-11` chacun), « Ajouter » désactivé tant qu'aucun joueur n'est sélectionné, que le score n'est pas enregistré (AC-MS-15) ou que le plafond est atteint
- **la carte reste visible avant l'enregistrement du score** (écran 1), mais son bouton « Ajouter » est grisé — traduit AC-MS-15 par désactivation plutôt que par disparition du bloc, cohérent avec « bloc absent seulement quand c'est une question de rôle, pas de timing »

**Carte CARTONS** (coach/staff uniquement, `match_staff_events:view`) :
- segmented control deux options, une seule sélection : « Jaune » (actif = fond doré) / « Rouge »
- même liste de joueurs, même pied de carte « Annuler »/« Ajouter »
- aucune notion de penalty manqué visible dans cette carte ni ailleurs à l'écran — voir §7

### 4. Écran joueur — consultation du résultat (`[Joueur] Mob - Match Results - {1,2}`)

Même en-tête que l'écran de détail de convocation (badges d'équipe, chip de statut de convocation type « CONVOQUÉE » — hérité de l'écran parent, hors périmètre de cette feature). Onglet « Résultat » actif dans la même barre.

Sous la barre d'onglets : chip texte affichant le `competition_type` du match (« Championnat » dans les deux exports — le libellé attendu pour un amical serait « Amical », non illustré ici mais direct par symétrie). Toujours un libellé textuel, jamais la couleur seule (AC-MS-22).

⚠️ **Contrôle à ne pas construire** : le bouton « Basculer (démo) » à côté de ce chip est un artefact de prototype qui permute entre l'état « pas de résultat » et l'état « résultat disponible » pour la démonstration. En production, cet état se déduit uniquement de la présence d'un score enregistré sur `match_details`, jamais d'un bouton.

**État A — score pas encore enregistré** (écran 1) : icône centrale (pictogramme d'attente) + texte « Résultat pas encore disponible. ». Pas de contenu supplémentaire — état à couvrir explicitement dans l'implémentation (rappel §7 note designer de la spec, « match à venir »).

**État B — résultat disponible** (écran 2) :
- carte issue : pill textuelle « Victoire » / « Nul » / « Défaite » (calculée à la lecture, AC-MS-02, jamais stockée) + score en gros caractères avec les deux noms d'équipe
- liste « BUTEURS » en dessous : ligne avatar initiales + nom + sous-texte. Le sous-texte montré dans la maquette combine une minute (« 23' », « 61' ») et, si pertinent, « Penalty » (« 61' · Penalty »)
- **aucun carton, aucun penalty manqué, nulle part sur cet écran** (AC-MS-09) — absence structurelle, jamais un bloc grisé

### 5. Nouveaux composants (résumé, pas de code)

Tous à `h-11` minimum sur chaque contrôle interactif :

- **`MatchResultScoreCard`** — deux `Input` numériques + séparateur + bouton, états désactivé/activé selon coup d'envoi + score déjà enregistré
- **`MatchResultScorerPicker`** — compteur de plafond, texte d'aide, chip « Penalty », liste sélectionnable de joueurs éligibles (source MS-13), pied Annuler/Ajouter
- **`MatchResultCardPicker`** — variante staff-only du précédent : segmented Jaune/Rouge au lieu du chip Penalty, pas de compteur de plafond (aucun plafond de cartons)
- **`MatchOutcomeCard`** (lecture, joueur + coach) — pill textuelle d'issue + score
- **`MatchGoalsList`** (lecture, joueur + coach) — ligne avatar + nom + sous-texte, alimentée par `match_goals:view`

Aucun de ces composants ne réutilise un pattern déjà répertorié dans `wireframes-basiques-as-caribbean.md` tel quel (fichier introuvable dans ce dépôt au moment de la rédaction) — ils suivent la même grammaire visuelle que les cartes compactes déjà en place sur les tableaux de bord (`docs/designs/v4_coach_dashboard.png` : carte « FORME RÉCENTE », carte « BUTS » — voir §7 pour leur réemploi possible sur les vues agrégées).

### 6. Rappels mobiles (`CLAUDE.md` §6)

- Score domicile/extérieur côte à côte → chaque champ `min-w-0` sur son conteneur de grille, `h-11` minimum sur chaque `Input`, à vérifier sur un viewport mobile réel et pas seulement une fenêtre desktop réduite.
- Chips « Penalty », « Jaune »/« Rouge », lignes de joueur sélectionnables, boutons « Annuler »/« Ajouter »/« Mettre à jour le score » → tous `h-11` minimum, pas le `h-8` par défaut de shadcn.
- En-tête avec flèche de retour → `sticky top-0`, fond opaque — déjà le pattern de l'écran parent, à conserver identique sur le composant « Résultat » quelle que soit l'issue de PO-MS-09.

### 7. Corrections proposées vs maquette

Même précédent que `specs/match_details_page.md` (« Corrections obligatoires vs maquette ») : une maquette peut contenir un bloc sans fondement dans le modèle de domaine.

- **Minute de but (« 23' », « 61' »)** : aucun champ correspondant dans `MatchEvent` tel que décrit en §6 de cette spec (pas de colonne temps/minute listée). Proposition par défaut : **omettre la minute**, trier la liste des buteurs par ordre de création (`created_at`), garder uniquement le tag « Penalty » quand `is_penalty = true`. Pas tranché unilatéralement ici parce que c'est une question de modèle de données, pas de mise en page seule — voir §8.
- Aucun autre bloc sans fondement identifié dans les quatre exports (pas de passe décisive, faute, temps de jeu, possession, note de match, feuille de match, tirs au but, points Legacy, ni de comptage toutes compétitions confondues — la liste d'écueils de §7 de la spec est propre sur ces quatre écrans).

### 8. Questions UI ouvertes

| Réf. | Question |
|---|---|
| **UI-MS-A** | ~~*Renvoi à PO-MS-09.*~~ **Résolu (2026-09-24)** — voir §1 : troisième onglet réel du même composant `ConvocationDetailPage`, pas une route distincte |
| **UI-MS-B** | Aucun point d'entrée visible dans les quatre exports pour créer un événement `penalty_missed`. La carte BUTEURS ne propose que but (+ chip Penalty pour `is_penalty`), la carte CARTONS que Jaune/Rouge. Faut-il un troisième contrôle (ex. un état supplémentaire sur le chip Penalty, ou une carte dédiée), et où ? Pas inventé ici — variation possible d'un pattern existant (chip), mais son emplacement précis n'est pas dans la maquette |
| **UI-MS-C** | Aucune affordance de suppression d'un événement déjà enregistré n'apparaît dans les quatre exports (MS-11/AC-MS-12 exigent pourtant une suppression). Les deux exports coach sont peut-être coupés en bas de capture plutôt que réellement dépourvus de cette fonction — à confirmer avant de supposer qu'elle manque à la maquette |
| **UI-MS-D** | Minute de but affichée sans champ domaine correspondant (§7) — ajouter un champ minute à `match_events`, ou confirmer la correction (l'omettre) ? |
| **UI-MS-E** | **Aucune maquette pour les deux vues agrégées d'équipe** (forme générale, classement des buteurs — §1 de la spec, AC-MS-07/08/19). Les blocs compacts « FORME RÉCENTE » et « BUTS » du tableau de bord coach (`docs/designs/v4_coach_dashboard.png`) et le pattern de ligne avatar+nom déjà utilisé dans BUTEURS/CARTONS couvrent une bonne partie du besoin par réemploi, sans qu'il s'agisse d'un pattern réellement nouveau — mais leur emplacement (carte de tableau de bord avec « Voir tout », ou nouvelle carte du grid Menu ?) n'est illustré nulle part. Avant d'aller plus loin : souhaitez-vous un prototype Claude Design dédié pour ces deux vues, ou ce point reste-t-il différé (cohérent avec PO-MS-11 — la présentation n'est pas confirmée au périmètre de cette passe) ? |
| **UI-MS-F** | Icône rouge en haut à droite de l'en-tête, visible sur les deux exports coach, absente côté joueur (remplacée par le chip de statut de convocation). Élément d'en-tête probablement hérité et sans rapport avec cette feature — signalé pour mémoire, pas d'action proposée |
