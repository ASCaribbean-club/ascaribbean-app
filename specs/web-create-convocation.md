# Spec — Backoffice web : convocations et présences (`web-create-convocation`)

> Statut : **troisième rédaction** (product-owner-agent, 2026-10-01). **Aucun point ouvert bloquant.** PO-WC-01 et PO-WC-12 ont été tranchés par la développeuse. La spec est prête pour designer-agent puis l'implémentation (§7). Les points restants (§6) sont tous non bloquants.
> Demande d'origine (développeuse) : « Admin should be able to create and edit convocation (and attendance record). Base on designs in docs/designs/desktop/convocation/. Admin can edit attendance records. This should be added in audit logs. »
> Sources CDC : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0 « Calendrier et convocations », P0 « Présences et suivi sportif », matrice RBAC lignes « Créer/modifier une convocation » et « Saisir une évaluation sportive », exigence transversale §11.3 « Journal d'audit »), `docs/roles-personas-as-caribbean.md` (rôle Administrateur : « actions sensibles journalisées » ; comptes multi-rôles).
> Specs reprises : `specs/create-convocation.md` (§2 modèle et satellites, §5 règles métier, §7 nom réservé `UpdateConvocationUseCase`), `specs/edit-match-details.md` (`'match_details:update'`, `'convocation:update'`, fenêtre avant coup d'envoi, AC-EM-02, PO-EM-01, PO-EM-03, PO-EM-04), `specs/coach-attendance-confirmation.md` (deux entités séparées, PO-AT-01/02/03/05/06/07, AC-AT-01 à AC-AT-13), `specs/web-audit-logs.md` (table `audit_log`, `record_audit_log_entry`, patron d'émetteur des addenda du 2026-09-30), `specs/web-localizations.md` (`training_location_id`, AC-WL-06 — **amendé pour l'admin**, §2), `specs/web-users-role-edit-remove.md` (patron « édition admin + audit »), `specs/web-empty-state.md` (coquille backoffice, `backoffice:access`, PO-WE-01).
> Code et schéma lus : `domain/policies/{rbac-matrix,can,audit-actions,convocation-closure}.ts`, `domain/entities/convocation.ts`, `domain/repositories/{convocation,audit-log}-repository.ts`, `domain/usecases/convocation/{CreateConvocationUseCase,ConfirmAttendanceUseCase,UpdateMatchDetailsUseCase}.ts`, `presentation/features/backoffice/backoffice-nav.ts`, migrations `20260811171754_initial_schema.sql` (RLS `attendance_records_*`), `20260811171817_attendance_trigger.sql`, `20260821091519_convocation_creation_schema.sql`, `20260925150603_edit_match_details_write_policy.sql`, `20260901120018_convocation_responder_visibility_correction.sql`, `20261001071613_web_localizations.sql`.

### Historique de révision

- **Première rédaction (2026-10-01)** : PO-WC-01 entièrement ouvert et bloquant.
- **Deuxième rédaction (2026-10-01)**, sur la réponse de la développeuse :
  - Une ligne cliquable se déplie en panneau de complément d'information.
  - Un crayon permet de modifier un événement **à venir**.
  - Les présences ne sont modifiables que sur un événement **passé**.
  - Les exports 8 et 9 ont été ajoutés. Ils montrent l'écran « Saisir les présences », **pas** le panneau ni le crayon.
- **Troisième rédaction (2026-10-01)**, deux décisions de la développeuse :
  - **PO-WC-01 tranché — « b, c, d ».** Sur un événement à venir et ouvert, l'admin modifie aussi l'**adversaire** (b), le **lieu** (c : lieu texte, lieu d'entraînement, domicile/extérieur, RDV) et le **titre et l'ordre du jour** d'une réunion (d). **L'équipe et le type restent non modifiables** (a, comme proposé). La date, l'heure et la fenêtre « à venir » sont inchangées.
  - **PO-WC-12 tranché — non, différé.** La première version ne livre que **Présent / Absent**. « Excusé / Non excusé » et « Note (facultatif) » (export 8) ne sont **pas construits**. Ils viendront avec une future fonctionnalité de **justification d'absence déposée par l'utilisateur**. AC-AT-08 reste en vigueur.

## 0. Maquettes et registre `DESIGN_LINKS.md`

Registre consulté avant toute demande (§4) : **aucune ligne pour cette feature**. Neuf exports PNG sont présents dans `docs/designs/desktop/convocation/`, **non commités**. Le cas est donc **`instantané seul`**, et **aucun lien artifact n'est demandé**.

L'agent PO n'écrit que dans `specs/`. Voici la ligne pré-rédigée, **à recopier telle quelle** au §2 du registre, puis à committer avec les PNG (PO-WC-11) :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| web-create-convocation — **backoffice desktop : liste des convocations, création, saisie des présences** (`[Admin] Web - convocation {1..9}`) | — aucun lien fourni | 2026-10-01 | `docs/designs/desktop/convocation/[Admin] Web - convocation {1,2,3,4,5,6,7,8,9}.png` | **instantané seul** |

Ce que les exports montrent :

- **1** : liste, filtre « Toutes ». **5** : filtre « Présences non saisies ». **6** : vide. **7** : erreur.
- **2 / 3 / 4** : « Créer une convocation » en Entraînement, Match et Réunion.
- **9** : « Saisir les présences », première saisie, Présent / Absent tous neutres, « Plus tard » et « Enregistrer les présences ».
- **8** : le même écran pour des présences déjà saisies. Les lignes Absent révèlent « Excusé / Non excusé » et « Note (facultatif) », **différés par décision** (PO-WC-12).
- **Sans maquette** : la ligne dépliée, le crayon et le formulaire de modification d'un événement à venir. Ils sont à composer en réutilisant les champs des exports 2 à 4.
- **À ne pas construire** : le sélecteur « Aperçu », la mention « Illustré pour le rôle », l'alerte « utilisateur sans rôle » (exports 8 et 9), et les entrées « Statistiques » / « Lieux », qui sont hors de cette feature.

## 1. Périmètre

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Calendrier et convocations | **P0** | Liste, création et modification des événements **à venir** par l'Administrateur, depuis le backoffice desktop |
| Présences et suivi sportif | **P0** | Saisie et modification des présences constatées (Présent / Absent) par l'Administrateur, **sur les convocations passées uniquement** |
| Exigence transversale §11.3 | **P0** | Journalisation des saisies et modifications de présence faites par l'Administrateur |

### Au périmètre

1. **Une nouvelle destination**, `/admin/convocations` (« Convocations »), derrière la coquille existante, sans nouveau garde.
2. **La liste** (exports 1, 5, 6, 7) : filtres saison, section, équipe, type et période, bouton « Réinitialiser », pastille « Présences non saisies (N) ». Filtrage **côté serveur**.
3. **La création** (exports 2 à 4) des trois types. L'équipe est choisie sur l'écran (Section puis Équipe). Le modèle, les RPC et les règles de `specs/create-convocation.md` sont repris à l'identique.
4. **La ligne dépliable** : un clic déplie en place un panneau de complément d'information (contenu proposé en PO-WC-14).
5. **La modification d'un événement à venir et ouvert**, par un crayon dans le panneau déplié. Les **champs modifiables, tranchés**, dépendent du type :

   | Type | Champs modifiables par l'admin | Table / colonne |
   |---|---|---|
   | Tous | **Date et heure** | `convocations.date` |
   | Entraînement | **Lieu d'entraînement** (lieu non archivé) | `convocations.training_location_id` — **amende AC-WL-06 pour l'admin** |
   | Match | **Adversaire**, parmi les `team_opponents` de l'équipe | `match_details.opponent_id` |
   | Match | **Domicile / Extérieur** | `match_details.is_home` |
   | Match | **Lieu** (texte) | `convocations.location` |
   | Match | **RDV : heure et lieu** (facultatifs) | `match_details.meeting_point_time`, `meeting_point_location` |
   | Réunion | **Titre**, **Lieu** (texte), **Ordre du jour** | `meeting_details.title`, `convocations.location`, `meeting_details.agenda` |
   | Tous | ❌ **Équipe, type** : jamais (identité de l'événement) | `team_id`, `type` hors de tout `grant` |

6. **La saisie et la modification des présences d'une convocation passée** (exports 8 et 9) : **Présent / Absent uniquement**, enregistrement en lot.
7. **La journalisation** de chaque saisie ou modification effective de présence (§4), émise depuis le use case.

### Hors périmètre, explicitement

- **Modifier une convocation passée**, quel que soit le champ. **Saisir des présences sur une convocation à venir.**
- **Modifier l'équipe ou le type** d'une convocation (décision PO-WC-01(a)). La voie reste annuler (PO-WC-09) puis recréer.
- **`ConvocationResponse`** : jamais lue ni écrite à la place du joueur (`CLAUDE.md` §6, AC-AT-01).
- **« Excusé / Non excusé » et « Note »** (export 8) : **différés par décision** (PO-WC-12). `absenceValidity` et `note` restent `null` (AC-AT-08). Ils seront rouverts avec la future fonctionnalité de justification d'absence côté utilisateur, qui devra elle-même passer par le référent RGPD (PO-AT-05/06).
- **Élargir les droits du coach** : le coach ne gagne **aucun** champ modifiable (ni adversaire, ni lieu d'entraînement, ni réunion). AC-EM-02 et AC-WL-06 restent vrais pour lui (§2).
- **L'annulation** (affichée, jamais produite, PO-WC-09), **la suppression**, **la clôture manuelle**, **les notifications** (P1), **tout élément Legacy** (P1), **l'ouverture à d'autres rôles** (PO-WE-01).

## 2. RBAC

### Lignes de matrice applicables, lues littéralement

| Permission (CDC) | Joueur | Coach | Resp. section | Dirigeant | Trésorier | Réf. médical | Bénévole | **Administrateur** |
|---|---|---|---|---|---|---|---|---|
| Créer/modifier une convocation | ❌ | ✅ (son équipe) | ✅ (sa section) | ✅ | ❌ | ❌ | ❌ | **✅** |
| Saisir une évaluation sportive *(ligne la plus proche pour la présence)* | ❌ | ✅ (son équipe) | ❌ | ❌ | ❌ | ❌ | ❌ | **❌** |
| Consulter le journal d'audit | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |

**Création et modification par l'Administrateur : fondées par le CDC (✅).** Cela lève PO-EM-01 **pour l'Administrateur uniquement**.

**Présences par l'Administrateur : décision de la développeuse**, écart assumé par rapport à la ligne la plus proche (❌). Cela tranche PO-AT-01(b). Validation par le Bureau en PO-WC-06.

### Actions RBAC — changements à apporter (tous signalés, `CLAUDE.md` §7)

| Action | Avant | Après | Miroir RLS / privilèges | Nature |
|---|---|---|---|---|
| `'convocation:create'` | `['coach','section-manager','authorized-officer','admin']` | **inchangée** | Les trois politiques d'insertion admettent déjà `private.is_admin()` | Aucun changement |
| `'attendance:validate'` | `['coach']` | **`['coach','admin']`** | Écriture admin déjà présente dans `attendance_records_*_validate`. **À ajouter** : une politique sœur admin (ou un prédicat admin séparé) qui exige `c.date <= now()` et `c.status <> 'cancelled'`. Les branches coach sont inchangées | **Élargissement** |
| `'convocation:update'` | `['coach']` | **`['coach','admin']`** | **Nouvelle politique sœur** `convocations_update_admin` : `using` et `with check` = `private.is_admin()` et `date > now()` et `status = 'open'`. **`grant update` étendu à `training_location_id`** (voir le piège ci-dessous) | **Élargissement + privilège de colonne** |
| `'match_details:update'` | `['coach']` | **`['coach','admin']`** | **Nouvelle politique sœur** `match_details_update_admin`, même prédicat via la convocation parente. **`grant update` étendu à `opponent_id`** (voir le piège ci-dessous) | **Élargissement + privilège de colonne** |
| **`'meeting_details:update'`** | — | **`['admin']`** | **Nouvelle politique** `meeting_details_update_admin` (aucune politique `UPDATE` n'existe aujourd'hui), même prédicat via la convocation parente. `revoke update` puis `grant update (title, agenda)` | **Nouvelle permission** |

L'admin n'a pas de portée : la branche `default` de `can.ts` suffit. `'meeting_details:update'` est ajoutée **dans le même changement** aux branches `coach` (`requiresTeamScope`) et `section-manager` de `can.ts`, bien qu'inertes aujourd'hui. Cela empêche qu'un futur élargissement passe sans contrôle de portée (piège déjà corrigé cinq fois dans ce dépôt).

### ⚠️ Le piège des privilèges de colonne — à traiter dans la même migration

Un `grant update (...)` porte sur **(table, rôle `authenticated`)**, **jamais sur une politique** (constat déjà écrit dans `20260925150603_edit_match_details_write_policy.sql`). Ajouter `training_location_id` et `opponent_id` au `grant` pour l'admin les rendrait donc **aussi** modifiables par le coach, via ses politiques `convocations_update_arrangements` et `match_details_update_arrangements`, qui ne filtrent pas les colonnes. Cela casserait **AC-EM-02** (coach : `opponent_id` refusé par la base) et **AC-WL-06** (lien de lieu verrouillé).

**Exigence** : un garde côté base (par exemple un trigger `BEFORE UPDATE` sur `convocations` et `match_details`) refuse tout changement de `training_location_id` ou d'`opponent_id` quand l'appelant n'est pas `private.is_admin()`. Le mécanisme exact reste un choix d'implémentation ; une RPC admin dédiée, avec un trigger de non-régression, est une alternative acceptable. **Contrainte non négociable** : **un jeton coach qui tente d'écrire l'une de ces deux colonnes est refusé par la base** (AC-WC-21).

### Amendements à porter sur d'autres specs (l'agent PO ne les modifie pas — PO-WC-15)

- **`specs/web-localizations.md` AC-WL-06** : « le lien ne peut pas être changé après création » devient « … sauf par l'**Administrateur**, sur un entraînement **à venir et ouvert**, vers un lieu **non archivé** (`specs/web-create-convocation.md`). Le coach ne le peut toujours pas. » Le trigger `convocations_training_location_not_archived` (actuellement `before insert`) doit aussi couvrir **`update`** de `training_location_id`.
- **`specs/edit-match-details.md` §1** (« `opponentId` hors périmètre, identité du match ») : l'argument reste vrai **pour le coach**. Pour l'admin, la développeuse en a décidé autrement. AC-EM-02 est inchangé.

### Par rôle

| Rôle | Ce que cette feature lui donne |
|---|---|
| **Administrateur** | Lecture club-wide, création, modification des champs du §1 point 5 sur un événement **à venir et ouvert**, saisie et modification Présent / Absent sur un événement **passé** |
| Les sept autres | **Rien** : ni l'entrée de navigation, ni la route, ni les écritures |
| Coach/Staff (mobile) | **Strictement inchangé** : mêmes champs (date, lieu, domicile/extérieur, RDV), même fenêtre. Ni adversaire, ni lieu d'entraînement, ni réunion |

## 3. Règles métier

### Création

Les règles sont reprises sans changement de `specs/create-convocation.md` §5 :

- date passée interdite (trigger + `isPastDate`) ;
- RDV facultatif, mais s'il est renseigné, il doit précéder le coup d'envoi le même jour ;
- lieu d'entraînement non archivé ;
- `createdBy` = l'admin.

L'équipe proposée appartient à la saison en cours par défaut (PO-WC-10).

### Modification d'un événement à venir

- **Fenêtre** : `date > now()` et `status = 'open'`. Elle est évaluée côté serveur dans la RLS et réévaluée par le use case à l'instant de l'écriture (`now` passé en paramètre). Le crayon n'est rendu que dans cette fenêtre.
- **Date et heure** : la nouvelle valeur ne peut pas être passée (use case + `with check date > now()`). Pour un match avec RDV, `isValidMatchSchedule` est évalué contre le **nouveau** coup d'envoi et le **nouveau** RDV.
- **Lieu d'entraînement** : il doit référencer un lieu **non archivé**. Le refus en base passe par le trigger étendu à `update` (§2).
- **Adversaire** : il doit appartenir aux `team_opponents` de l'équipe de la convocation. Le use case le vérifie et le sélecteur ne propose que ceux-là. Une garantie côté base est souhaitable mais non exigée (PO-WC-16).
- **Lieu d'un match et domicile/extérieur** sont tous deux modifiables. L'incohérence relevée par PO-EM-04 (`isHome` modifiable sans `location`) ne se pose pas côté admin.
- **Titre de réunion** non vide. **Ordre du jour** : `string[]` ordonné, liste vide admise (`create-convocation` §2).
- **Équipe et type** : jamais modifiables. Ils sont absents de tout `grant` et le use case ne les accepte pas en entrée.
- **Atomicité** : une modification qui touche `convocations` **et** une satellite (`match_details`, `meeting_details`) est **une seule écriture logique**. Si une table refuse, rien n'est écrit. Patron recommandé : une fonction Postgres par type, **non `SECURITY DEFINER`** (pour que les politiques s'appliquent), comme les RPC de création (`create-convocation` §2).
- **Use case** : `UpdateConvocationUseCase` (nom réservé depuis `create-convocation` §7), en entrée **union discriminée par type**. Chaque variante n'accepte que les champs de son type, par des `Pick<>` étroits, jamais l'entité entière.
- **Effets** : aucune écriture dans `convocation_responses` ni dans `attendance_records` (AC-EM-07). Les joueurs ne sont pas prévenus (PO-EM-03, toujours ouvert). Un refus serveur dû au franchissement de la fenêtre produit un message lisible et resynchronise l'écran (AC-EM-06).

### Présences (convocations passées uniquement)

- **Fenêtre** : `date <= now()`, `open` ou `closed`, jamais `cancelled`. Une correction après clôture est admise.
- **Valeurs** : **Présent / Absent uniquement** (PO-WC-12). Upsert sur `(convocation_id, user_id)`, dernière valeur gagnante. `validated_by` = l'admin, imposé par la RLS.
- **Lot** : « Enregistrer les présences » écrit les lignes modifiées. « Plus tard » n'écrit rien. Un joueur sans choix n'a pas de ligne et n'est **jamais pré-rempli** à partir de sa réponse déclarée (AC-AT-12).
- **Clôture** : uniquement par le trigger existant (`closed_by` = l'admin).

### Statut affiché et « Présences non saisies »

- Une convocation passée aux présences incomplètes reste **`open`** en base. Elle n'est **jamais** affichée « Clôturée » (les exports 1 et 5 se trompent ; libellé à trancher en PO-WC-03).
- Définition proposée de « présences non saisies » : non annulée, date passée, `open`, calculée côté serveur (PO-WC-04).
- La colonne `PRÉSENCES` compte des `AttendanceRecord`, jamais des `ConvocationResponse`.

## 4. Données sensibles et journal d'audit

| Nature | Cette feature | Conséquence |
|---|---|---|
| **Santé** | **Aucune.** Les deux vecteurs de l'export 8 (« Excusé », « Note ») sont **différés** par décision (PO-WC-12) | AC-AT-08 maintenu. `metadata` d'audit sans contenu médical |
| **Financier** | Aucun | — |
| **Nominatif** | Effectif et jugement de présence par joueur | Admin seul, aucun export |
| **Audit** | **Exigé** pour les présences | Voir ci-dessous |

### Journalisation des présences — exigée

Action métier, émise **depuis le use case**, après l'écriture réussie, acteur résolu côté serveur (patron des émetteurs de `web-audit-logs`).

- **Une ligne par joueur dont la valeur change effectivement.** Un lot de N changements produit N lignes, et une valeur inchangée n'en produit aucune.
- **Code proposé : `attendance.updated`.** `CHECK` élargi par `drop`/`add`, miroir manuel dans `audit-actions.ts`.
- `targetId` = le joueur, `targetType = 'user'`, `metadata = { convocationId, previousStatus, newStatus }`. `previousStatus` vaut `null` lors d'une première saisie, d'où une relecture avant l'upsert.
- Aucune ligne pour une écriture de **coach** (PO-AT-02 inchangé). `record_audit_log_entry` est d'ailleurs gardée par `private.is_admin()`.
- Écart connu : un échec de `record()` n'est que loggé (PO-WC-08).

### Modification de convocation — à trancher, non bloquant

Les codes proposés, `convocation.created` et `convocation.updated`, sont cohérents avec l'élargissement du 2026-09-30. L'argument se renforce maintenant que l'admin peut changer l'**adversaire** d'un match déjà diffusé : c'est la donnée que `edit-match-details` qualifiait d'« identité du match ». `metadata` proposée : les champs modifiés avec leurs valeurs avant et après (identifiants pour l'adversaire et le lieu, jamais de nom de personne). Décision en PO-WC-07.

## 5. Critères d'acceptation

Préfixe **`AC-WC-`**. **AC-01** et **AC-02** sont ceux du CDC §17.2.

### Accès et RBAC

| Réf. | Critère |
|---|---|
| **AC-01 / AC-WC-01** | **Par appel direct à l'API** : un jeton non-admin n'obtient, depuis les lectures de cet écran, aucune donnée d'une équipe qui n'est pas la sienne |
| **AC-02 / AC-WC-02** | **Par appel direct à l'API** : un coach de l'équipe A qui modifie une convocation ou une présence de l'équipe B est refusé par la base. Un admin est accepté, dans les fenêtres du §3 |
| AC-WC-03 | « Convocations » et `/admin/convocations` existent uniquement derrière la coquille existante, sans garde nouveau. Pour tout autre rôle, elles sont absentes, jamais grisées |
| AC-WC-04 | `'attendance:validate'`, `'convocation:update'` et `'match_details:update'` valent `['coach','admin']`. `'meeting_details:update'` vaut `['admin']` et figure dans les branches de portée `coach` et `section-manager` de `can.ts`. Chaque entrée nomme sa politique et sa migration. Couvert par `can.test.ts` |
| AC-WC-05 | Les politiques coach existantes (`convocations_update_arrangements`, `match_details_update_arrangements`, branche coach d'`attendance_records_*_validate`) sont **inchangées**. Les écritures admin passent par des politiques **sœurs**, commentées du nom de l'action qu'elles miroitent |

### Liste et ligne dépliable

| Réf. | Critère |
|---|---|
| AC-WC-06 | Filtres et pastille « Présences non saisies » exécutés côté serveur. « Réinitialiser » restaure les défauts |
| AC-WC-07 | Une convocation `open` à date passée n'est **jamais** affichée « Clôturée » (libellé PO-WC-03) |
| AC-WC-08 | La colonne `PRÉSENCES` compte des `AttendanceRecord`, jamais des `ConvocationResponse`. Une convocation à venir rend « — » |
| AC-WC-09 | La pastille, le filtre et l'éventuel badge partagent la **même** définition serveur (PO-WC-04) |
| AC-WC-10 | Quatre états distincts : chargement, vide, erreur avec « Réessayer », rempli. Le sélecteur « Aperçu » n'est pas construit |
| AC-WC-11 | Un clic déplie et replie en place le panneau d'une ligne (`button` / `aria-expanded`, clavier). Le dépliage ne fait aucune écriture |
| AC-WC-12 | Le crayon est rendu **uniquement** pour une convocation à venir et ouverte. Les accès à la saisie des présences le sont **uniquement** pour une convocation passée non annulée. L'élément non applicable est absent, jamais grisé |

### Création

| Réf. | Critère |
|---|---|
| AC-WC-13 | La création passe par `CreateConvocationUseCase` et les trois RPC existantes. Une date passée est refusée par le use case et par le trigger |
| AC-WC-14 | L'équipe est obligatoire et choisie après la section. L'adversaire est filtré sur les `team_opponents` de l'équipe choisie |
| AC-WC-15 | Seuls les champs du type sont persistés. Un match porte un `location` (absent de l'export 3). Le RDV est facultatif ; s'il est renseigné, il est validé. Un entraînement référence un lieu non archivé |
| AC-WC-16 | Après succès, la liste se met à jour sans rechargement, par invalidation d'une clé centralisée |

### Modification d'un événement à venir

| Réf. | Critère |
|---|---|
| AC-WC-17 | L'admin modifie, selon le type, **exactement** les champs du tableau §1 point 5 : date et heure ; lieu d'entraînement ; adversaire, domicile/extérieur, lieu et RDV d'un match ; titre, lieu et ordre du jour d'une réunion. **Aucun autre** n'est rendu modifiable |
| AC-WC-18 | **Par appel direct à l'API** avec un jeton admin : une modification de `team_id` ou de `type` est **refusée par Postgres**. Une modification d'une convocation **passée** ou **non `open`** est refusée par la base. Une nouvelle date passée est refusée |
| AC-WC-19 | Un lieu d'entraînement **archivé** est refusé en modification **par la base** (trigger étendu à `update`). Un adversaire hors des `team_opponents` de l'équipe est refusé par le use case |
| AC-WC-20 | Une modification qui touche `convocations` et une satellite est **atomique** : si une écriture échoue, aucune table n'est modifiée. Couvert par un test (refus simulé de la satellite) |
| AC-WC-21 | **Non-régression coach, par appel direct à l'API avec un jeton coach** : l'écriture d'`opponent_id` (AC-EM-02), de `training_location_id` (AC-WL-06 côté coach) ou de `meeting_details` est **refusée par la base**, malgré l'extension du `grant update` |
| AC-WC-22 | Une modification n'écrit jamais dans `convocation_responses` ni dans `attendance_records` (AC-EM-07). Pour un match avec RDV, celui-ci doit précéder le **nouveau** coup d'envoi le même jour (`InvalidScheduleError`) |
| AC-WC-23 | Un refus serveur dû au franchissement de la fenêtre rend un message lisible et resynchronise l'écran, sans perte silencieuse de la saisie (AC-EM-06) |

### Présences (convocations passées)

| Réf. | Critère |
|---|---|
| AC-WC-24 | Écrire une présence n'écrit jamais dans `convocation_responses` (AC-AT-01). Le cas « déclaré présent, constaté absent » fait l'objet d'un test nommé (AC-AT-02) |
| AC-WC-25 | Une seule ligne par `(convocation_id, user_id)`, dernière valeur gagnante. `validated_by` = l'admin, imposé par la base |
| AC-WC-26 | **Par appel direct à l'API** avec un jeton admin : une présence écrite sur une convocation **à venir** ou `cancelled` est **refusée par la base**. Sur une convocation passée, `open` ou `closed`, elle est acceptée |
| AC-WC-27 | « Enregistrer les présences » écrit uniquement les lignes modifiées. « Plus tard » n'écrit rien. Un joueur sans choix n'a pas de ligne et n'est jamais pré-rempli. Les trois états se distinguent aussi par le texte |
| AC-WC-28 | La clôture passe uniquement par le trigger. Aucun `UPDATE` client sur `convocations.status` |
| AC-WC-29 | **« Excusé / Non excusé » et « Note » ne sont ni rendus ni écrits.** `absenceValidity` et `note` restent `null` (AC-AT-08, décision PO-WC-12) |

### Journal d'audit

| Réf. | Critère |
|---|---|
| AC-WC-30 | Chaque présence dont la valeur change effectivement, sur l'action d'un admin, produit **exactement une** ligne : code `attendance.updated` (ou le nom retenu), acteur résolu côté serveur, `target_id` = le joueur, `target_type = 'user'`, `source = 'usecase'`, `metadata = { convocationId, previousStatus, newStatus }`. Un lot de N changements produit N lignes, et une valeur inchangée n'en produit aucune |
| AC-WC-31 | `record()` est appelé depuis le use case, après l'écriture réussie. Un échec métier n'émet rien. Couvert par un test avec un dépôt factice |
| AC-WC-32 | `CHECK` `audit_log_action_check` et `AUDIT_ACTIONS` élargis du même code, miroir manuel commenté. Libellé français dans `presentation/` |
| AC-WC-33 | `metadata` ne contient ni texte libre ni contenu médical. Une écriture de coach ne produit aucune ligne d'audit |

### Transverse

| Réf. | Critère |
|---|---|
| AC-WC-34 | Aucun import de `data/` depuis `presentation/`. Use cases sans React ni Supabase. `queryKey` centralisées et discriminées par les filtres |
| AC-WC-35 | Contrastes AA, navigation clavier complète, contrôles d'au moins 44 px (`h-11`), `min-w-0` sur les paires de champs, y compris sur desktop |
| AC-WC-36 | Aucun nom de personne en dur. Les noms visibles sur les exports ne sont repris nulle part, fixtures comprises (`CLAUDE.md` §9) |

## 6. Points ouverts

**Aucun n'est bloquant.**

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-WC-01** | ~~Périmètre de modification~~ **Tranché (2026-10-01) : « b, c, d ».** Adversaire, lieu (texte, lieu d'entraînement, domicile/extérieur, RDV), titre et ordre du jour : modifiables par l'admin sur un événement à venir et ouvert. Équipe et type : non. Voir §1 point 5 | — | Résolu |
| **PO-WC-12** | ~~Excusé / Note~~ **Tranché (2026-10-01) : non construits dans cette version**, différés jusqu'à la fonctionnalité de justification d'absence par l'utilisateur. AC-AT-08 maintenu. Cette future fonctionnalité devra passer par le référent RGPD (PO-AT-05/06) | — | Résolu (différé) |
| **PO-WC-05** | ~~Fenêtre de saisie des présences~~ **Tranché : convocations passées uniquement**, clôturées comprises. Reliquat : une limite de durée (fin de saison, J+n) ? | Bureau + développeuse | Non |
| **PO-WC-02** | **Nom du code d'audit** des présences (`attendance.updated` proposé). Motif de correction : aucun par défaut, un texte libre serait un vecteur de santé | Développeuse | Non |
| **PO-WC-03** | **Libellé de statut** pour « passée + présences incomplètes », et « en attente » à remplacer par « non saisis » dans la colonne `PRÉSENCES` | Développeuse + designer-agent | Non |
| **PO-WC-04** | **Définition de « Présences non saisies »**, portée de saison, et badge de navigation « Convocations N » | Développeuse | Non |
| **PO-WC-06** | **Validation par le Bureau** de l'écart CDC sur l'écriture admin des présences (PO-AT-01(c)) | Bureau | Non |
| **PO-WC-07** | **Journaliser la création et la modification de convocation** (`convocation.created` / `convocation.updated`) ? L'argument se renforce avec la modification d'adversaire (§4) | Développeuse | Non |
| **PO-WC-08** | **Durcir la journalisation** (le patron actuel ne fait que logger un échec de `record()`) ou l'accepter tel quel ? | Développeuse | Non |
| **PO-WC-09** | **Annulation** depuis cet écran (affichée, jamais produite) | Développeuse | Non |
| **PO-WC-10** | **Équipes proposées à la création** : saison en cours uniquement (défaut) ? | Développeuse | Non |
| **PO-WC-11** | **Écritures hors `specs/`** : ligne de registre du §0 et commit des neuf PNG | Développeuse | Non |
| **PO-WC-13** | **Enregistrement en lot** : enregistrer avec des joueurs sans choix (proposé : oui) ; échec partiel (RPC atomique ou upserts successifs) ; confirmation sur « Plus tard » après modification ? | Développeuse | Non |
| **PO-WC-14** | **Contenu du panneau déplié**, non illustré. Proposition : les détails du type (adversaire, domicile/extérieur, RDV ; titre et ordre du jour ; adresse du lieu) et le créateur. Aucune donnée nominative de réponse ni de santé | Développeuse + designer-agent | Non |
| **PO-WC-15** | **Amendements à porter** sur `web-localizations.md` (AC-WL-06, trigger étendu à `update`) et `edit-match-details.md` §1 (adversaire modifiable par l'admin), tels que rédigés au §2. L'agent PO ne modifie pas une autre spec | Développeuse | Non pour le code. **Oui pour la cohérence documentaire**, à faire dans la même passe |
| **PO-WC-16** | **Garantie en base de l'appartenance de l'adversaire** aux `team_opponents` de l'équipe (aujourd'hui seulement une FK vers `opponents`, aussi à la création). Faut-il un contrôle en base, ou le use case suffit-il ? | Développeuse | Non |

### Ce qui reste OPEN et ne doit pas être résolu implicitement

- **PO-AT-02** (journaliser les confirmations du coach), **PO-AT-05 / PO-AT-06** (rouverts avec la justification d'absence), **PO-AT-07** (le joueur voit-il sa présence ?), **PO-EM-03** (prévenir les joueurs d'une modification, aggravé ici par le changement d'adversaire, de date ou de lieu) : inchangés.
- **PO-EM-01** pour le Responsable de section et le Dirigeant habilité : non traité. **Les droits du coach ne sont pas élargis.**
- **Convoqués requis** (PO-6b) : ne pas créer de `convocation_attendees`.

## 7. Note pour designer-agent

- **Tout est prêt à concevoir** :
  - la liste (exports 1, 5, 6, 7) ;
  - la création (exports 2 à 4) ;
  - la **ligne dépliable** et son panneau (sans maquette, PO-WC-14) ;
  - le **crayon** et le **formulaire de modification** (sans maquette) : réutiliser les champs des exports 2 à 4 pour le type de la convocation, **sans** sélecteurs Section, Équipe ni Type, et pré-remplis ;
  - l'écran « Saisir les présences » (exports 8 et 9).
- **Corrections obligatoires vs maquettes** :
  1. **Export 3 (Match)**, en création comme en modification : ajouter le champ **Lieu**. Les champs RDV sont facultatifs, donc sans astérisque.
  2. **Export 8** : **supprimer** « Excusé / Non excusé » et « Note (facultatif) ». Ne pas les afficher grisés (décision PO-WC-12).
  3. **Exports 1 et 5** : jamais « Clôturée » pour une convocation `open` à date passée (PO-WC-03).
  4. Ne construire ni le sélecteur « Aperçu », ni « Illustré pour le rôle », ni l'alerte « utilisateur sans rôle ».
- **Équipe et type** : affichés en lecture seule dans le panneau, **jamais** présentés comme modifiables, ni grisés en tant que champs de formulaire.
- **Crayon** seulement sur un événement à venir et ouvert. **Présences** seulement sur un événement passé. L'élément non applicable est absent, jamais grisé.
- Lieu d'entraînement : uniquement les lieux non archivés. Adversaire : uniquement ceux de l'équipe.
- Pas d'en-tête collant sur le tableau. `h-11`, `min-w-0` sur les paires de champs. Aucun nom de personne repris des maquettes.

## UI design

> Rédigé par designer-agent (2026-10-01). **Aucun point bloquant.** Les propositions marquées « proposé » sont tranchables par la développeuse sans changer l'architecture de l'écran.

### Sources utilisées

1. `docs/designs/DESIGN_LINKS.md` §4 : aucune ligne pour `web-create-convocation`, statut `instantané seul` pré-rédigé au §0 de cette spec. **Aucun lien artifact demandé.** La ligne du §0 reste à recopier au §2 du registre par la développeuse (PO-WC-11, l'agent designer n'écrit que dans `specs/`).
2. Les neuf exports `docs/designs/desktop/convocation/[Admin] Web - convocation {1..9}.png`, tous lus. Lecture : **1, 5, 6, 7** = liste (remplie, filtre « Présences non saisies », vide, erreur) ; **2, 3, 4** = création Entraînement / Match / Réunion ; **8, 9** = saisie des présences (déjà saisies / première saisie).
3. Composants backoffice déjà construits, relus pour réutilisation : `backoffice/audit/components/AuditLogTable.tsx` (**patron de ligne dépliable** : colonne chevron, `aria-expanded`, ligne `colSpan` en `bg-muted/30`), `audit/components/AuditLogFilters.tsx` (filtres serveur, paire `type="date"` avec `min-w-0`), `audit/BackofficeAuditPage.tsx` (états chargement / erreur / vide / vide filtré, « Charger plus »), `teams/components/TeamOpponentsPanel.tsx` (mini-états chargement / erreur « Réessayer » / vide dans un panneau déplié), `seasons/components/SeasonStatusBadge.tsx` (badges d'état avec jetons `coach-green` / `coach-amber`), `seasons/components/SeasonFormDialog.tsx` (champs de formulaire, `Alert` destructive d'erreur serveur), `backoffice/backoffice-nav.ts`, `BackofficeEmptyState`.
4. `wireframes-basiques-as-caribbean.md` : **non utilisé**, écran desktop de backoffice sans équivalent dans les 4 écrans mobiles. Les 4 destinations mobiles (Dashboard / Calendrier / Actus / Menu) sont **sans objet** ici, même lecture que `web-users` et `web-audit-logs` : cette feature est une **9ᵉ entrée de la navigation latérale du backoffice**, pas une destination du nav mobile.

**Ce qui est dessiné d'après un export** : la liste et ses quatre états (1, 5, 6, 7), la création des trois types (2, 3, 4), la saisie des présences (8, 9).
**Ce qui n'a aucune maquette et est donc proposé ici** : (a) le **panneau de la ligne dépliée**, (b) le **crayon / formulaire de modification**, (c) les états de chargement du tableau et du panneau, (d) l'écran de saisie des présences pour une convocation non éligible (accès par URL). Ils sont composés **uniquement** à partir de patrons existants (tableau à ligne dépliable de l'audit, champs des exports 2 à 4, barre d'actions de l'export 9), **aucun nouveau patron visuel**, donc aucune demande de prototype Claude Design.

### Où ça vit

**Une 9ᵉ entrée de `BACKOFFICE_NAV_ITEMS`** : id `convocations`, libellé « Convocations », route `/admin/convocations`, icône proposée `IconCalendarEvent` (jeu `@tabler/icons-react`, remplaçable). Position : **juste avant « Actus »**, comme sur les exports (après « Adhésions »). Mêmes gardes que les autres entrées (`RequireDesktopViewport` → `RequireBackofficeSession` → `RequireBackofficeAccess` → `BackofficeDashboardLayout`), **aucun garde nouveau** (AC-WC-03). Rendue sans filtre `can()` supplémentaire, comme les autres.

**Badge numérique de l'entrée (« Convocations 2 » sur les exports)** : **non construit dans cette passe tant que PO-WC-04 n'est pas tranché.** `BackofficeNavItem` n'a volontairement pas de champ `badge` générique ; si la développeuse le veut, il suit le patron des jumeaux dédiés (`MembershipsNavBadge`), alimenté par **la même définition serveur** que la pastille de la liste (AC-WC-09). La pastille « Présences non saisies (N) » de la liste, elle, **est construite**.

**Routes** (toutes sous le groupe `/admin` existant) :

| Route | Écran |
|---|---|
| `/admin/convocations` | Liste |
| `/admin/convocations/new` | Création (export 2, 3, 4) |
| `/admin/convocations/:convocationId/edit` | Modification d'un événement à venir et ouvert (même formulaire, prérempli) |
| `/admin/convocations/:convocationId/attendance` | Saisir les présences (export 8, 9) |

Création, modification et présences sont **des pages avec flèche de retour**, pas des dialogues : c'est ce que montrent les exports 2 à 4, 8 et 9 (contrairement à `NewsFormDialog` / `SeasonFormDialog`, dialogues des autres écrans). La modification reprend la page de création pour rester cohérente avec elle.

### Ce qui change par rôle

Reprend le §2 sans le redéfinir. **Un seul rôle atteint ces écrans : l'Administrateur.** Les sept autres n'ont ni entrée, ni route, ni donnée : rien à dessiner, le refus par URL est déjà couvert par `RequireBackofficeAccess`. Aucune variante de rôle, donc **ni sélecteur « Aperçu », ni mention « Illustré pour le rôle », ni alerte « utilisateur sans rôle »** dans l'écran de la feature (les alertes de la barre latérale existantes appartiennent à la coquille, elles ne sont ni reproduites ni modifiées ici). Le coach mobile est inchangé.

### Écran 1, liste (`/admin/convocations`) — exports 1, 5, 6, 7

Squelette `flex flex-1 flex-col gap-6`, comme `BackofficeAuditPage`.

**En-tête** : `<h2>Convocations</h2>` (`text-xl font-bold`) à gauche, bouton « **+ Créer une convocation** » (`h-11 rounded-full`, vert) à droite. Aucune sous-ligne « Illustré pour le rôle ».

**Filtres, tous côté serveur (AC-WC-06)** : une rangée `flex flex-wrap items-center gap-3`, dans l'ordre des exports :

| Contrôle | Primitive | Défaut | Notes |
|---|---|---|---|
| Saison | `Select` | saison en cours (PO-WC-10) | Options : saisons existantes |
| Section | `Select` | « Toutes sections » | |
| Équipe | `Select` | « Toutes équipes » | Restreinte à la section choisie et à la saison. Changer de section remet « Toutes équipes » |
| Type | `Select` | « Tous types » | Entraînement / Match / Réunion |
| Période | `ToggleGroup` à choix unique, 3 segments | **« Toutes »** (export 1) | « À venir » / « Passées » / « Toutes ». Un segment est toujours actif |
| Réinitialiser | `Button variant="outline"` | | **Rendu uniquement quand au moins un filtre diffère du défaut** (absent de l'export 1, présent sur 5, 6, 7). Restaure les défauts, pastille comprise |

Deuxième rangée : la pastille **« Présences non saisies (N) »**, un `Button`/`ToggleGroupItem` à bascule (`aria-pressed`), en `rounded-full`. **Inactive** : neutre (export 1). **Active** : contour et texte ambre, jeton `coach-amber` (export 5). Active, elle restreint la liste à la définition serveur du §3 (passée, ouverte, non annulée) **en combinaison** avec les autres filtres. **Proposé (PO-WC-04)** : `N` se calcule sur la **saison sélectionnée seule**, indépendamment des autres filtres, pour rester stable quand on bascule la pastille. Si N vaut 0, la pastille reste rendue, à « (0) ».

**Tableau** (primitive `Table`, qui défile horizontalement dans son propre conteneur ; **pas d'en-tête collant**, rappel mémoire projet). Colonnes, de gauche à droite :

| Colonne | Contenu |
|---|---|
| (chevron, `sr-only` « Détails ») | Bouton chevron, voir « Ligne dépliable » |
| `CONVOCATION` | Barre verticale colorée par type (vert Entraînement, rouge Match, orange Réunion) + nom d'équipe en gras + type en texte secondaire dessous. **La couleur ne porte jamais seule l'information** : le type est écrit |
| `DATE & HEURE` | `JJ/MM/AAAA · HH:MM` |
| `LIEU` | `convocations.location` |
| `STATUT` | Badge, voir ci-dessous |
| `PRÉSENCES` | Voir ci-dessous |

Tri : date **décroissante** (ordre des exports). Pagination : bouton « **Charger plus** » (patron de l'audit, ni pager numéroté ni défilement infini), **proposé** car la spec ne fixe pas de volume.

**Colonne `STATUT`, correction du mockup (PO-WC-03, AC-WC-07)** : **jamais « Clôturée » pour une convocation `open` à date passée.** Badges (`Badge` `rounded-full`, texte toujours présent, mêmes jetons que `SeasonStatusBadge`) :

| Cas | Libellé | Style |
|---|---|---|
| À venir, `open` | Ouverte | vert |
| `cancelled` (affichée, jamais produite, PO-WC-09) | Annulée | rouge |
| Passée, `open` | **Passée** (proposé) | neutre `border-white/15 bg-white/10 text-white/70` |
| `closed` (clôture réelle par le trigger) | Clôturée | neutre, identique à « Passée » en couleur, texte différent |

**Colonne `PRÉSENCES` (AC-WC-08)** : compte des `AttendanceRecord`, jamais de `ConvocationResponse`.

| Cas | Rendu |
|---|---|
| À venir ou annulée | « — » |
| Passée, `open` (présences non saisies, définition §3) | Bouton-pastille ambre avec icône d'alerte : « **Présences non saisies** ». C'est un lien vers l'écran de présences |
| `closed` | « 10 présents · 2 absents · 0 **non saisis** » (« en attente » du mockup remplacé, PO-WC-03), et dessous le lien « Voir / modifier » vers l'écran de présences |

Les chiffres ne s'affichent que pour une convocation `closed`. Pour une convocation passée et `open` avec des présences partiellement saisies, la pastille « Présences non saisies » reste rendue (même définition serveur que le filtre, AC-WC-09), sans chiffres.

**États (AC-WC-10)**, quatre rendus distincts. Les filtres restent affichés dans les quatre. Le sélecteur « Aperçu » des exports n'est **pas** construit : l'état vient de la donnée.

| État | Rendu | Copie |
|---|---|---|
| Chargement | `ConvocationTableSkeleton` (5 lignes `Skeleton`, `aria-busy="true"`), même patron que `NewsTableSkeleton` | — |
| Erreur | Carte centrée (export 7) | Titre « Impossible de charger les convocations », texte « Une erreur est survenue. Vérifiez votre connexion et réessayez. », bouton « Réessayer » |
| Vide, aucun filtre actif | `BackofficeEmptyState` | « Aucune convocation pour l'instant » + bouton « Créer une convocation » |
| Vide, filtres actifs | `BackofficeEmptyState` (message **distinct**, patron AC-AU-18) | « Aucune convocation pour ces filtres » + bouton « Réinitialiser les filtres ». Si seule la pastille est active : « Toutes les présences sont saisies » |

L'export 6 fusionne les deux cas vides en un seul texte (« …ou aucune n'a encore été créée ») : ils sont séparés ici pour que l'administrateur sache quoi faire.

### Ligne dépliable et panneau d'information (sans maquette, proposé)

**Interaction (AC-WC-11)** : patron de `AuditLogTable`. Le **bouton chevron** de la première colonne est le contrôle accessible (`aria-expanded`, `aria-label` « Afficher les détails » / « Masquer les détails », `h-11 w-11`, clavier : Entrée / Espace). **Cliquer ailleurs sur la ligne la déplie aussi**, pour le confort à la souris ; les contrôles interactifs de la ligne (pastille et lien de la colonne `PRÉSENCES`) arrêtent la propagation du clic pour ne pas déplier. Plusieurs lignes peuvent être dépliées en même temps, état purement local à l'écran, rien n'est écrit au dépliage.

**Panneau** : une ligne `TableRow` supplémentaire en `colSpan` complet, fond `bg-muted/30`, `p-4`. Contenu en grille d'informations `grid-cols-2 gap-x-6 gap-y-3` (étiquette en `text-xs font-semibold uppercase tracking-wider text-muted-foreground`, valeur dessous ; chaque cellule `min-w-0`). **Tout en lecture seule**, sans aucun contrôle de formulaire. Contenu proposé (PO-WC-14), **aucune donnée nominative de réponse ni de santé** :

| Type | Champs affichés |
|---|---|
| Tous | Équipe, Type (**texte simple**, jamais présentés comme modifiables ni grisés), Créée par (nom du créateur résolu à l'exécution, « — » s'il est introuvable) |
| Entraînement | Lieu d'entraînement (nom, et adresse si le lieu en porte une) |
| Match | Adversaire, Domicile ou Extérieur, Lieu, RDV (« HH:MM · lieu » ; « Non renseigné » si absent, chaque moitié séparément) |
| Réunion | Titre, Lieu, Ordre du jour (liste numérotée ; « Aucun point » s'il est vide) |

**Pied du panneau** (`flex justify-end gap-2`), **les éléments non applicables sont absents, jamais grisés** (AC-WC-12) :

- **« Modifier »** (bouton `outline`, icône `IconPencil` + texte, `h-11`) : rendu **uniquement** si la convocation est à venir et `open`. Navigue vers `/edit`.
- **« Saisir les présences »** (si passée, `open`) ou **« Voir / modifier les présences »** (si `closed`) : rendu **uniquement** pour une convocation passée non annulée. Navigue vers `/attendance`. Même cible que le lien de la colonne `PRÉSENCES`.
- Une convocation annulée n'a aucun des deux.

**États du panneau** : le détail des satellites (match, réunion, lieu) peut se charger à l'ouverture. Dans ce cas : `Skeleton` de deux lignes pendant le chargement ; en erreur, texte « Impossible de charger le détail. » + bouton lien « Réessayer » (copie de `TeamOpponentsPanel`). Si le détail arrive déjà avec la liste, ces états disparaissent : choix d'implémentation, sans effet sur le dessin.

### Écran 2, création (`/admin/convocations/new`) — exports 2, 3, 4

Une seule page, un seul composant de formulaire partagé avec la modification. **Largeur de contenu bornée** (environ celle de l'export : `max-w-2xl`), sous la barre supérieure existante.

**En-tête** : bouton retour rond (`IconArrowLeft`, `aria-label` « Retour aux convocations », `h-11 w-11`) + titre « Créer une convocation ». **L'en-tête est `sticky top-0` avec fond opaque** (`CLAUDE.md` §6, retour joignable pendant le défilement). Aucune ligne « Illustré pour le rôle ».

**Ordre des champs** (de haut en bas) :

1. **Paire `Section *` / `Équipe *`**, côte à côte (`grid grid-cols-2 gap-4`, **chaque cellule `min-w-0`**). `Select`, `h-11`. `Équipe` est **désactivée tant qu'aucune section n'est choisie** (placeholder « Choisir une équipe », rendu atténué comme l'export) : c'est une dépendance entre champs, pas un droit retiré. Options d'équipe : celles de la section, de la saison en cours (PO-WC-10). Changer la section vide l'équipe. Placeholder section « Choisir une section ».
2. **`TYPE`** : trois pastilles en `ToggleGroup` à choix unique (`role` radio, navigation aux flèches), hauteur `h-11`, point coloré + texte : « Entraînement » (vert), « Match » (rouge), « Réunion » (orange). Une est toujours sélectionnée, **« Entraînement » par défaut** (export 2). La sélectionnée est remplie de sa couleur (exports 2, 3, 4).
3. **Champs propres au type** (ci-dessous). Changer de type **conserve** équipe, date et heure et **réinitialise** les champs propres aux types (adversaire, lieu, titre, ordre du jour, RDV).
4. **Pied** : « Annuler » (`outline`, `h-11 rounded-full`, retour à la liste sans écrire) à gauche, « **Créer la convocation** » (`h-11 rounded-full`, plein blanc comme les exports) en largeur restante. Pendant l'envoi : libellé « Création… » et bouton désactivé (état d'envoi, pas un droit).

**Champs par type** (astérisque rouge = obligatoire, comme les exports) :

| Type | Champs, dans l'ordre |
|---|---|
| **Entraînement** (export 2) | Paire `Date *` / `Heure *` ; `Lieu d'entraînement *` (`Select`, **lieux non archivés** uniquement, AC-WC-15) |
| **Match** (export 3, corrigé) | `Adversaire *` (`Select`, **uniquement les adversaires de l'équipe choisie**, AC-WC-14) ; « Lieu de la rencontre » = **Domicile / Extérieur** en `ToggleGroup` à deux segments pleine largeur, « Domicile » par défaut (export 3) ; paire `Date *` / `Heure *` ; **`Lieu *`, champ texte ajouté** (absent de l'export 3, AC-WC-15) ; paire `RDV — heure` / `RDV — lieu`, **toutes deux facultatives, sans astérisque** |
| **Réunion** (export 4) | `Titre *` ; paire `Date *` / `Heure *` ; `Lieu *` ; `Ordre du jour` (facultatif) |

Précisions de champ :

- **`Adversaire`** désactivé tant que l'équipe n'est pas choisie. Si l'équipe n'a aucun adversaire : texte d'aide sous le champ « Aucun adversaire pour cette équipe. Ajoutez-en depuis la page Équipes. » avec lien vers `/admin/teams`.
- **`Lieu d'entraînement`** : s'il n'existe aucun lieu non archivé, texte d'aide « Aucun lieu disponible. Créez-en un dans Lieux. » avec lien vers `/admin/locations`.
- **`Lieu` du match** (texte libre) et **`RDV — lieu`** sont deux champs **distincts** (spec `create-convocation` §2) : étiquettes « Lieu » et « RDV — lieu », placeholder du second « Ex : Vestiaires » (export 3).
- **RDV** : les deux champs sont indépendants (la base les rend tous deux nullables). S'il est renseigné, l'heure doit précéder le coup d'envoi le même jour ; sinon erreur sous le champ « Le rendez-vous doit précéder le coup d'envoi, le même jour. » (`InvalidScheduleError`).
- **`Ordre du jour`** (export 4) : ligne de saisie en pointillé « Ajouter un point… » + bouton carré « + » (`h-11 w-11`, `aria-label` « Ajouter le point »). Entrée dans le champ ajoute aussi le point. Les points ajoutés s'empilent sous la ligne, dans l'ordre d'ajout, chacun avec un bouton « Retirer » (`IconX`, `h-11 w-11`, `aria-label` « Retirer le point N »). Compteur à droite de l'étiquette : « Aucun point » / « N point(s) » (export 4). Un point vide n'est pas ajouté. Liste vide admise.
- **Paire `Date` / `Heure`** : `Input type="date"` et `Input type="time"` natifs, comme `SeasonFormDialog` et `AuditLogFilters`. **Chaque cellule de la grille porte `min-w-0`** et chaque champ `h-11 min-w-0 w-full` : la valeur segmentée d'un champ date natif a une largeur plancher qui déborderait sur son voisin sans cela, y compris sur desktop (`CLAUDE.md` §6, AC-WC-35). Même règle pour Section / Équipe et RDV heure / RDV lieu. L'attribut `min` de la date est la date du jour (aide à la saisie, l'autorité reste le use case et le trigger).

**Validation et erreurs** (affichées sous le champ, texte `text-destructive`, `aria-invalid`, à la soumission puis à la correction) :

| Cas | Copie |
|---|---|
| Champ obligatoire vide | « Ce champ est obligatoire. » |
| Date/heure dans le passé (AC-WC-13) | « La date et l'heure doivent être dans le futur. » |
| RDV après le coup d'envoi | voir ci-dessus |
| Erreur serveur ou réseau | `Alert` destructive en haut du formulaire (patron `SeasonFormDialog`) : « La convocation n'a pas pu être créée. Réessayez. » ; **la saisie n'est jamais perdue** |

**Succès (AC-WC-16)** : retour à `/admin/convocations`, liste invalidée par clé centralisée, la nouvelle ligne apparaît sans rechargement. Aucun toast : le dépôt n'a aucune bibliothèque de toast dans le backoffice, le retour à la liste à jour est le retour d'information (proposé).

### Écran 3, modification (`/admin/convocations/:convocationId/edit`) — sans maquette, proposé

**Même composant de formulaire que la création, prérempli**, déduit des exports 2 à 4 et du tableau du §1 point 5 (AC-WC-17). Le crayon n'est atteignable que depuis le panneau d'une ligne à venir et `open` ; par URL directe sur une convocation non éligible, voir « États d'accès » plus bas.

- **En-tête** : retour (sticky) + titre « Modifier la convocation » ; dessous, **une ligne de texte simple** (même rendu que le sous-titre de l'écran de présences) « *{nom d'équipe}* · *{type}* ». **Pas de `Select` Section / Équipe, pas de `TYPE`, pas de champ grisé** : équipe et type n'existent pas comme champs en modification, ils sont seulement rappelés en texte.
- **Champs rendus par type, et seulement ceux-ci** :

| Type | Champs modifiables |
|---|---|
| Entraînement | `Date *` / `Heure *`, `Lieu d'entraînement *` (lieux **non archivés** ; si le lieu actuel est archivé, il est **affiché en texte d'aide** « Lieu actuel : *{nom}* (archivé) » et l'admin doit en choisir un non archivé pour enregistrer un changement de lieu) |
| Match | `Adversaire *` (parmi les adversaires de l'équipe), Domicile / Extérieur, `Date *` / `Heure *`, `Lieu *`, RDV heure / RDV lieu (facultatifs) |
| Réunion | `Titre *`, `Date *` / `Heure *`, `Lieu *`, `Ordre du jour` |

- **Pied** : « Annuler » + « **Enregistrer les modifications** » (`h-11 rounded-full`). Pendant l'envoi : « Enregistrement… ». Si rien n'a changé, « Enregistrer les modifications » est désactivé (état de formulaire, pas un droit).
- **Validation** : celle de la création. La date ne peut pas être passée ; le RDV est comparé au **nouveau** coup d'envoi (AC-WC-22).
- **Franchissement de la fenêtre pendant l'édition (AC-WC-23)** : si le serveur refuse parce que l'événement est passé ou n'est plus `open`, `Alert` destructive « Cette convocation n'est plus modifiable : elle est passée ou son statut a changé. », **la saisie reste affichée**, et le bouton « Enregistrer les modifications » est retiré (rien à retenter) ; seul « Retour » reste utile. Les données de la liste sont resynchronisées en arrière-plan.
- **Succès** : retour à la liste (invalidation de la liste et du panneau), comme à la création.
- **Chargement** : squelette des champs (`Skeleton h-11`) ; **erreur** : `Alert` destructive + « Réessayer ».

### Écran 4, saisir les présences (`/admin/convocations/:convocationId/attendance`) — exports 8 et 9

**En-tête** (sticky, opaque) : retour rond + titre « Saisir les présences » ; dessous le sous-titre en texte simple « *{équipe}* · *JJ/MM/AAAA* » (exports 8 et 9). Si au moins une présence existe déjà (export 8) : ligne d'aide « Présences déjà saisies. Modifiez-les si besoin. ».

**Liste de l'effectif** : une carte (`rounded-xl border bg-muted/30`, `min-h-11`) par joueur de l'équipe, largeur bornée (`max-w-2xl`). À gauche : `Avatar` aux initiales + nom ; à droite : **deux boutons-pastilles « Présent » / « Absent »** (`h-11`, `ToggleGroup` à choix unique, `role` radio).

Trois états par joueur, **distingués aussi par le texte** (AC-WC-27, jamais par la couleur seule) :

| État | « Présent » | « Absent » | Texte sous le nom |
|---|---|---|---|
| **Non saisi** (export 9, première saisie) | neutre | neutre | « Non saisi » (`text-muted-foreground`) |
| **Présent** | rempli vert | neutre | — |
| **Absent** | neutre | rempli rouge | — |

**Règles** :

- **Jamais de pré-remplissage** depuis `ConvocationResponse` (AC-WC-24, AC-AT-12) : le joueur sans ligne `AttendanceRecord` est « Non saisi ».
- Une valeur déjà choisie se **bascule** (Présent ↔ Absent) mais **ne peut pas redevenir « Non saisi »** : il n'existe pas de suppression de présence. Recliquer sur le segment actif ne fait rien.
- **Aucun** « Excusé / Non excusé » ni « Note (facultatif) », **ni rendus ni grisés** (PO-WC-12, AC-WC-29). Une ligne « Absent » ne révèle rien de plus : sa hauteur ne change pas. L'export 8 est corrigé sur ce point.

**Barre d'actions ancrée** : `sticky bottom-0`, fond opaque (patron des barres de soumission déjà ancrées, `CLAUDE.md` §6), car l'effectif dépasse un écran. Elle contient, à gauche, « **Plus tard** » (`outline`, `h-11 rounded-full`) et, en largeur restante, « **Enregistrer les présences** » (plein blanc, `h-11 rounded-full`), exports 8 et 9.

- **« Enregistrer les présences »** : n'écrit que les **lignes modifiées** par rapport à l'état chargé (AC-WC-27). Désactivé tant qu'aucune ligne n'a changé, le compteur « *N* modification(s) » s'affichant alors dans la barre. Enregistrer avec des joueurs encore « Non saisi » est **admis** (proposé, PO-WC-13) : ils n'ont toujours pas de ligne. Pendant l'envoi : « Enregistrement… », choix désactivés.
- **« Plus tard »** : retour à la liste, **n'écrit rien**. S'il y a des modifications non enregistrées, un `AlertDialog` demande « Abandonner les modifications ? » / « Les choix non enregistrés seront perdus. » / boutons « Continuer la saisie » et « Abandonner » (**proposé**, PO-WC-13 ; sans modification, pas de confirmation).
- **Succès** : retour à la liste, qui se met à jour (statut et colonne `PRÉSENCES`, clés invalidées). Aucune écriture sur `convocation_responses`, la clôture reste portée par le trigger (AC-WC-28). L'audit `attendance.updated` est émis par le use case, rien à afficher.

**États** :

| État | Rendu | Copie |
|---|---|---|
| Chargement | Squelette de 8 cartes (`Skeleton`), `aria-busy="true"` | — |
| Erreur de chargement | `Alert` destructive + « Réessayer » | « Impossible de charger les présences. » |
| Effectif vide | `BackofficeEmptyState` | « Aucun joueur dans l'effectif de cette équipe » |
| Échec d'enregistrement | `Alert` destructive en haut de la liste, **les choix à l'écran sont conservés** | « Les présences n'ont pas pu être enregistrées. Réessayez. » |

### États d'accès par URL directe (propositions)

L'élément non applicable est **absent partout dans l'interface** (AC-WC-12) ; ces cas ne concernent que l'URL tapée à la main :

| Cas | Rendu |
|---|---|
| `/attendance` sur une convocation **à venir** ou **annulée** | Carte centrée (`BackofficeEmptyState`) « Les présences ne peuvent pas être saisies pour cette convocation. » + bouton « Retour aux convocations » |
| `/edit` sur une convocation **passée** ou **non `open`** | « Cette convocation n'est plus modifiable. » + même bouton |
| Identifiant inconnu | « Convocation introuvable. » + même bouton |

### Mockup contre données : corrections appliquées

| Mockup | Correction |
|---|---|
| Exports 1 et 5 : « Clôturée » à côté de « Présences non saisies » | Statut « **Passée** » pour `open` + date passée ; « Clôturée » réservé au `closed` réel (AC-WC-07) |
| Exports 1 et 5 : « 0 en attente » | « **non saisis** » (PO-WC-03) |
| Export 3 : pas de champ Lieu pour un match | **`Lieu *` ajouté**, création comme modification (AC-WC-15) |
| Export 3 : `RDV — heure *` et `RDV — lieu *` obligatoires | **Facultatifs, sans astérisque** |
| Export 8 : « Excusé / Non excusé » et « Note (facultatif) » | **Retirés**, ni grisés ni cachés derrière un état (PO-WC-12) |
| Exports 1 à 9 : « Illustré pour le rôle », sélecteur « Aperçu », alerte « utilisateur sans rôle » | **Non construits** |
| Exports 1 à 9 : entrées « Statistiques » et « Lieux » de la barre latérale | Hors feature (« Lieux » existe déjà ; « Statistiques » n'existe pas dans `BACKOFFICE_NAV_ITEMS`, signalé, non traité) |
| Exports 1 à 9 : noms de personnes (administratrice, joueurs, équipes de démonstration) | **Aucun repris** (AC-WC-36). Les libellés d'exemple restent génériques : « Équipe A », « Joueur 1 » dans les tests et fixtures |

### Primitives shadcn

**Déjà installées, réutilisées** : `button`, `input`, `label`, `select`, `table`, `badge`, `alert`, `alert-dialog` (confirmation « Plus tard »), `skeleton`, `avatar` (initiales des joueurs), `separator`.
**À installer** : `npx shadcn add toggle-group` (tire `toggle`) : pastilles de type, segments de période, Domicile / Extérieur, Présent / Absent, pastille « Présences non saisies ». Alternative déjà disponible : `radio-group` habillé en pastilles, moins direct. Rien d'autre à installer : pas de `calendar` (champs natifs, précédent `SeasonFormDialog`), pas de `collapsible` (le dépliage reprend le patron de `AuditLogTable`), pas de `sonner` (aucun toast, voir plus haut).

Rappel `CLAUDE.md` §6 : la règle est écrite pour le mobile, **cet écran est desktop**, mais le backoffice l'applique déjà « y compris sur desktop » (AC-WC-35). Donc `h-11` sur chaque `Input`, `SelectTrigger`, `Button`, bascule et bouton icône, et `min-w-0` sur chaque cellule d'une paire de champs. À vérifier au plancher de `RequireDesktopViewport`, pas seulement en grande largeur.

### Découpage des composants (`CLAUDE.md` §5, un sous-dossier par écran)

Tout sous `src/presentation/features/backoffice/convocations/`. Chaque Page ne branche que sur des booléens du ViewModel. Aucun import de `data/`. Les `queryKey` sont ajoutées à `presentation/shared/query-keys.ts`, discriminées par les filtres. Aucun use case n'est créé par cette section de design.

| Dossier | Fichiers |
|---|---|
| `convocations/` (liste) | `BackofficeConvocationsPage.tsx`, `useBackofficeConvocationsViewModel.ts` (filtres, pastille, pagination, dépliage, états) ; `components/ConvocationFilters.tsx`, `ConvocationTable.tsx`, `ConvocationTableSkeleton.tsx`, `ConvocationStatusBadge.tsx`, `ConvocationTypeMarker.tsx` (barre colorée + texte du type), `ConvocationAttendanceCell.tsx`, `ConvocationDetailsPanel.tsx` (+ `useConvocationDetailsPanelViewModel.ts` si le détail se charge à l'ouverture) |
| `convocations/form/` | `BackofficeConvocationFormPage.tsx` (création et modification, mode porté par la route), `useConvocationFormViewModel.ts` ; `components/ConvocationFormHeader.tsx` (retour sticky), `TeamPickerFields.tsx` (Section / Équipe, création seule), `ConvocationTypeToggle.tsx` (création seule), `TrainingFields.tsx`, `MatchFields.tsx`, `MeetingFields.tsx`, `AgendaEditor.tsx`, `HomeAwayToggle.tsx`, `ConvocationFormFooter.tsx` |
| `convocations/attendance/` | `BackofficeAttendancePage.tsx`, `useBackofficeAttendanceViewModel.ts` (choix locaux, lignes modifiées, confirmation « Plus tard », envoi) ; `components/AttendanceRow.tsx`, `AttendanceChoiceToggle.tsx`, `AttendanceActionBar.tsx`, `AttendanceRosterSkeleton.tsx`, `DiscardAttendanceDialog.tsx` |
| `backoffice/` (existant, modifié) | `backoffice-nav.ts` (9ᵉ entrée), `router.tsx` (4 routes) |

Les libellés d'audit (`attendance.updated`) vivent dans `backoffice/audit/audit-action-labels.ts` (AC-WC-32), pas ici.

### Points ouverts d'interface

**Aucun n'est bloquant.** Chacun a une proposition ci-dessus, applicable telle quelle.

| Réf. | Question | Proposition retenue ici |
|---|---|---|
| UI-WC-01 | Libellé de statut « passée + `open` » (PO-WC-03) | « Passée » (neutre) ; « Clôturée » réservé au `closed` |
| UI-WC-02 | Portée de N dans « Présences non saisies (N) » et badge de navigation (PO-WC-04) | N sur la saison sélectionnée seule ; badge de navigation non construit dans cette passe |
| UI-WC-03 | Confirmation sur « Plus tard » après modification (PO-WC-13) | `AlertDialog` seulement s'il y a des modifications |
| UI-WC-04 | Enregistrer en laissant des joueurs « Non saisi » (PO-WC-13) | Autorisé |
| UI-WC-05 | Réordonner les points de l'ordre du jour | Pas de réordonnancement, seulement ajout et retrait ; à rouvrir si le besoin apparaît |
| UI-WC-06 | Pagination de la liste (volume inconnu) | « Charger plus » (patron de l'audit) |
| UI-WC-07 | Retour d'information après création, modification, enregistrement | Retour à la liste à jour, sans toast |
| UI-WC-08 | Badge numérique « Convocations 2 » de la barre latérale | Reporté avec PO-WC-04 |
