# Spec — Modification des informations d'un match avant le coup d'envoi

> Statut : **rédaction initiale** (product-owner-agent, 2026-09-24). 7 points ouverts (PO-EM-01 à PO-EM-07). **Aucun ne bloque la transmission à designer-agent.** PO-EM-01 (rôles au-delà du coach) et PO-EM-04 (`isHome` modifiable sans `Convocation.location`) doivent être tranchés avant que le périmètre ne soit élargi, mais la passe coach seule est livrable sans eux.
> Demande d'origine (développeuse, verbatim) : « Coach should be able to edit match infos before it begins. Add an edit icon button before info card in match details page (infos tabs). »
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0 « Calendrier et convocations » + matrice RBAC, ligne « Créer/**modifier** une convocation »), `docs/roles-personas-as-caribbean.md` (8 rôles, moindre privilège), `specs/match_details_page.md` (écran hôte : §1 « Hors périmètre », §2, AC-MD-03, AC-MD-17, AC-MD-19, AC-MD-23), `specs/create-convocation.md` (§2 modèle `MatchDetails` et tables satellites, §5 règles métier, §3 RBAC), `specs/coach-attendance-confirmation.md` (§2 « Décision de cadrage » — patron de l'action coach scopée équipe), `docs/GOUVERNANCE.md` §7 (référent RGPD **toujours non désigné**).
> État du code lu pour cadrer : `domain/entities/match-details.ts`, `domain/repositories/match-details-repository.ts`, `domain/policies/{actions,rbac-matrix,can,response-deadline,match-scheduling-rules}.ts`, `domain/rules/convocation-rules.ts`, `domain/usecases/convocation/{GetConvocationWithDetailsUseCase,CreateConvocationUseCase}.ts`, `data/repositories/MatchDetailsRepositoryImpl.ts`, `presentation/features/convocation/{useConvocationDetailViewModel.ts,components/{InfosTab,MatchDetailsInfos}.tsx}`, `presentation/shared/query-keys.ts`, `supabase/migrations/20260811171754_initial_schema.sql`, `20260821091519_convocation_creation_schema.sql`, `20260821091638_create_match_convocation.sql`, `20260918134942_web_users_role_edit_remove_write_policies.sql`.

## 0. Maquette — registre `DESIGN_LINKS.md`

Conformément au §4 du registre, celui-ci a été consulté **avant** toute demande : `docs/designs/DESIGN_LINKS.md` §2 **ne comporte aucune ligne pour `edit-match-details`** (cas « aucune ligne », pas `absent`, pas `mort`). Aucun export local n'existe non plus — `docs/designs/` ne contient aucun sous-dossier pour cette feature.

Le lien artifact est donc demandé **une seule fois** à la développeuse, et ne sera pas redemandé lors d'une passe ultérieure (PO-EM-07). L'agent PO n'écrivant pas hors de `specs/`, la ligne de registre est **pré-rédigée ici** pour être recopiée telle quelle par qui recevra la réponse — même procédé que `specs/player-vote.md` §0, `specs/web-users.md` PO-WU-10 et les précédents cités dans les notes du registre :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| edit-match-details — **vue coach : modification des infos match avant coup d'envoi** | *(à compléter)* | *(date du jour)* | *(à compléter)* | *(`actif` ou `instantané seul`)* |

**Signal de périmètre tiré des maquettes existantes** : `docs/designs/player-match-details/[v3] [Joueur] Mob - Détail Match-selection_1.png` est l'export de l'onglet **Infos** de l'écran hôte — exactement la carte devant laquelle la développeuse demande le bouton d'édition. Elle **ne montre aucun contrôle de modification**, ce qui est cohérent : c'est un export de la **vue joueur**, et `specs/match_details_page.md` AC-MD-17 interdisait alors tout bouton d'édition pour tous les rôles. Le contrôle demandé ici est donc **net-new, sans référence visuelle** dans le dépôt. Aucune maquette coach locale n'existe pour l'écran hôte non plus (PO-MD-08 de `specs/match_details_page.md`, toujours ouvert).

## 1. Périmètre

Le **coach de l'équipe** corrige les informations logistiques d'un match **tant que le coup d'envoi n'est pas passé** : lieu de la rencontre (domicile/extérieur), heure de RDV, lieu de RDV. Cas d'usage implicite de la demande : le RDV change après que la convocation a été envoyée, et le coach n'a aujourd'hui **aucun moyen de le corriger** — la seule issue est de supprimer/recréer la convocation, ce qui détruirait les `ConvocationResponse` déjà recueillies (`on delete cascade`, migration initiale).

Ce n'est **pas un nouvel écran** : c'est une action d'écriture ajoutée à l'onglet **Infos** de `ConvocationDetailPage` (`specs/match_details_page.md`), **variante coach**, sur le bloc rendu par `MatchDetailsInfos.tsx` à l'intérieur de la carte d'`InfosTab.tsx`.

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Calendrier et convocations | **P0** | Le volet « **modifier** » de la ligne de matrice « Créer/modifier une convocation », restreint aux trois champs logistiques de `MatchDetails` et à la fenêtre pré-coup d'envoi. Ni création, ni annulation, ni clôture |

### Champs modifiables — décision de cadrage explicite

`MatchDetails` porte aujourd'hui quatre champs (`domain/entities/match-details.ts`). **Trois sont modifiables par cette feature, un ne l'est pas** :

| Champ | Modifiable ici ? | Motif |
|---|---|---|
| `isHome` | ✅ | Information logistique, rendue aujourd'hui en lecture seule par `MatchDetailsInfos` (AC-MD-03). Voir toutefois PO-EM-04 |
| `meetingPointTime` | ✅ | Idem. Soumise à `isValidMatchSchedule` (§3) |
| `meetingPointLocation` | ✅ | Idem |
| `opponentId` | ❌ **hors périmètre, décision assumée** | C'est l'**identité du match**, pas sa logistique. Changer d'adversaire sur une convocation déjà diffusée ne « corrige » pas un match, ça en fabrique un autre sous le même identifiant, avec les réponses des joueurs attachées à un événement qu'ils n'ont pas vu. La voie correcte reste annuler/recréer. Aucun document du CDC ne demande cette modification ; ne pas l'ajouter « par symétrie » |

**`goalsFor` / `goalsAgainst` sont hors périmètre et n'existent pas sur cette branche.** La demande de cadrage les mentionne comme ajoutés par la feature **match-stats, non fusionnée, sur une autre branche** — vérifié : ni `domain/entities/match-details.ts`, ni `specs/match-stats.md`, ni `docs/designs/match/` ne sont présents ici (branche issue de `develop`). Le score est la **préoccupation d'une autre feature**, avec sa propre fenêtre temporelle (*après* le coup d'envoi, exactement l'inverse de celle-ci) et sa propre action RBAC. Conséquence à tenir au moment de la fusion : voir §7, « Note de fusion avec match-stats » — le chemin d'écriture ouvert ici ne doit **jamais** s'élargir au score par simple ajout de colonnes à l'entité.

### Ce qui n'est pas modifiable, et reste explicitement hors périmètre

- **`Convocation` elle-même** : `date` (coup d'envoi), `location` (lieu de la rencontre), `type`, `teamId`, `createdBy`. Il n'existe **aucune politique RLS `UPDATE` sur `public.convocations`** (constat déjà porté par `specs/match_details_page.md` §1) et cette passe n'en crée pas. `UpdateConvocationUseCase` reste ce qu'il est depuis `specs/create-convocation.md` §7 : **un nom réservé, pas une implémentation**.
- **`MeetingDetails`** (titre, ordre du jour) et l'entraînement : la demande vise le match. Aucune modification de `meeting_details` ; `training_details` n'existe toujours pas.
- **L'annulation, la clôture, la suppression** d'une convocation : inchangées, pilotées par trigger ou absentes.
- **La modification après le coup d'envoi** : refusée, y compris pour corriger une faute de frappe (§3).
- **Toute notification aux joueurs déjà convoqués**, relance ou message : module Communication **P1** (PO-EM-03).
- **La réinitialisation des réponses déjà recueillies** : modifier le RDV **n'invalide, ne supprime et ne remet à zéro aucune `ConvocationResponse`** (AC-EM-07). C'est une décision, pas un oubli — voir PO-EM-03 pour la question qu'elle laisse ouverte.
- **Tout journal d'audit** : voir §4, la table n'existe pas (exigence transversale P0 distincte).
- **La modification en mode dégradé (hors connexion)** : la matrice n'accorde le mode dégradé qu'à la *consultation* d'une convocation, jamais à l'écriture — même règle que `specs/create-convocation.md` §1 et `specs/coach-attendance-confirmation.md` §1.

### Ce que cette feature amende dans `specs/match_details_page.md` — à porter explicitement

Cette spec **contredit frontalement** deux passages de l'écran hôte, qui doivent être amendés et non laissés en contradiction silencieuse (l'agent PO ne modifiant pas une spec existante) :

1. **§1 « Hors périmètre »** : « La modification, l'annulation et la clôture. […] **Aucun bouton d'édition.** » → à restreindre à : aucune modification **de la `Convocation` elle-même** (toujours vrai, aucune RLS `UPDATE` sur `convocations`), l'annulation et la clôture restant hors périmètre.
2. **AC-MD-17** : « Aucun bouton ni menu de modification, d'annulation, de clôture, de relance ou d'export n'est rendu, **pour aucun rôle** » → à remplacer par la formulation d'**AC-EM-01** ci-dessous, qui conserve intégralement l'interdiction pour annulation / clôture / relance / export et pour tous les rôles autres que le coach de l'équipe avant coup d'envoi.

Aucun autre critère de l'écran hôte n'est touché. En particulier **AC-MD-19** (aucune donnée de résultat, même statique) reste vrai sans réserve : cette feature n'affiche ni n'écrit aucun score.

### Ce qui est déjà en place vs. ce qui est réellement nouveau

**Déjà en place, à réutiliser sans le recréer :**

- `MatchDetails` (entité) et `MatchDetailsRepository` (interface, `upsert` + `findByConvocationId`).
- `MatchDetailsRepositoryImpl` + DTO + mapper (`data/`), déjà câblés.
- `isValidMatchSchedule` (`domain/policies/match-scheduling-rules.ts`) et son test — la règle RDV < coup d'envoi le même jour (`specs/create-convocation.md` §5).
- `isPastDate` (`domain/rules/convocation-rules.ts`) — le **concept de temporalité coup d'envoi déjà existant** dans ce dépôt (§3).
- `InfosTab` / `MatchDetailsInfos` — la carte à laquelle le contrôle s'ajoute.
- Le patron de tic minute de `useConvocationDetailViewModel` (`const [now, setNow] = useState(...)` + `setInterval(…, 60_000)`), déjà utilisé pour `canPlayerRespond` — réemployé tel quel pour la fenêtre de modification.
- `CreateConvocationForm` accepte déjà des `initialValues` en prop, « pour rester réutilisable visuellement par un futur écran de modification » (`specs/create-convocation.md` §1). Ce futur écran, c'est celui-ci — **mais seulement pour trois champs sur six** : la réutilisation est une possibilité de mise en page, pas une obligation ; c'est à designer-agent de trancher, pas à cette spec.

**Réellement nouveau :**

- Une action RBAC (`'match_details:update'`) + son entrée de matrice + sa branche de portée dans `can.ts` (§2).
- Une **méthode d'écriture étroite** sur `MatchDetailsRepository`, restreinte aux trois colonnes (§5) — pas une réutilisation d'`upsert`.
- `UpdateMatchDetailsUseCase` (§5).
- **Une politique RLS `UPDATE` sur `public.match_details` — il n'en existe aucune aujourd'hui** (§6). Sans elle, la feature est structurellement impossible, y compris via l'`upsert` existant.

## 2. RBAC

### Ligne de matrice applicable — lue littéralement

**« Créer/modifier une convocation »** de `docs/priorisation-fonctionnelle-as-acaribbean.md`. Contrairement au cas de `specs/coach-attendance-confirmation.md` §2, **cette ligne existe et couvre explicitement le verbe « modifier »** — il ne s'agit donc pas ici d'interpréter une ligne voisine, mais de décider **jusqu'où** l'appliquer.

| Rôle | Valeur matrice | Traduction retenue pour `match_details:update` |
|---|---|---|
| Joueur/Joueuse | ❌ | ❌ — aucun point d'entrée rendu. Un joueur consulte le RDV, ne le fixe jamais |
| **Coach/Staff** | ✅ (son équipe) | ✅ **son équipe**, **avant le coup d'envoi** — seul rôle construit dans cette passe. C'est exactement le périmètre de la demande |
| Responsable de section | ✅ (sa section) | **Accordé par la matrice, non construit dans cette passe** (PO-EM-01). Il possède déjà `'convocation:create'` scopé section (`specs/create-convocation.md` §3) — mais **aucun point d'entrée UI**, l'écran Calendrier qui devait le porter étant toujours un stub (`specs/create-convocation.md` §7). Construire le droit sans le chemin ne ferait qu'élargir la surface RLS sans usage |
| Dirigeant habilité | ✅ | **Accordé par la matrice, non construit** — même statu quo que pour `'convocation:create'`, où il détient la permission « non scopée dans `can.ts` ni en RLS » et sans point d'entrée (PO-EM-01) |
| Trésorier | ❌ | ❌ |
| Référent médical | ❌ (santé seulement, tracé) | ❌ — périmètre santé, écran distinct et tracé |
| Bénévole | ❌ | ❌ |
| Administrateur | ✅ | **Accordé par la matrice, non construit** (PO-EM-01). Noter l'écart avec `'attendance:validate'`, où la RLS accordait déjà l'admin en statu quo hérité : **ici il n'y a rien à conserver**, aucune politique `UPDATE` n'existe sur `match_details`. Ne pas l'ajouter « parce que l'admin a tout » |

### Décision de cadrage — `['coach']`, et pourquoi c'est un écart assumé

Cette passe implémente **`'match_details:update': ['coach']`, scopé à l'équipe**, et rien d'autre.

Il faut être précis sur la nature de cette restriction, parce qu'elle ne se justifie **pas** de la même façon que celle de `specs/coach-attendance-confirmation.md` §2 : là-bas la matrice disait ❌ aux autres rôles, ici elle leur dit ✅. **C'est donc un écart délibéré dans le sens restrictif par rapport au CDC**, pas une lecture du CDC — et il doit être énoncé comme tel plutôt que présenté comme une contrainte documentaire.

Trois motifs, aucun n'étant « la matrice l'interdit » :

1. **La demande nomme le coach**, et lui seul.
2. **Les trois autres rôles n'ont aucun chemin pour y arriver.** `ConvocationDetailPage` choisit sa variante via `useActiveRole()` + `hasActiveRoleForConvocation` — qui ne connaissent que `player` et `coach`. `specs/match_details_page.md` « Questions ouvertes UI » n°1 laisse déjà ouvert le rendu de cet écran pour Responsable de section / Dirigeant habilité / Administrateur. Accorder l'écriture avant de trancher ce rendu construirait un droit inatteignable.
3. **Moindre privilège** (CDC §3) : un droit qu'on élargit plus tard coûte une ligne ; un droit accordé trop tôt et exercé par erreur sur la convocation d'une autre équipe coûte une correction de données.

PO-EM-01 porte l'élargissement. Il est **bloquant pour l'élargissement, non bloquant pour cette passe.**

### Lecture

La lecture de `MatchDetails` reste **RLS-only, sans entrée de matrice** — critère commenté en tête de `rbac-matrix.ts` : `match_details_select_team_scoped` existe déjà et l'onglet Infos ne change pas de structure selon le rôle, seul le contrôle d'édition apparaît ou non. L'entrée de matrice n'existe que pour l'**écriture**, parce que `presentation/` doit décider de rendre ou non le bouton **avant toute requête**.

### Action à ajouter — `'match_details:update'`

Une seule, à ajouter à `domain/policies/actions.ts` puis à `rbac-matrix.ts` :

- **Nomme la ressource réellement écrite** (`public.match_details`), convention explicitement posée et répétée dans `actions.ts` pour `'role:assign-coach'`, `'user:write'`, `'role:assign'`, `'payment:record'`.
- **Délibérément pas `'convocation:update'`** : ce nom désignerait `public.convocations`, table sur laquelle cette passe n'ouvre **aucune** écriture et pour laquelle aucune politique `UPDATE` n'existe. Le prochain contributeur lirait « je peux modifier la convocation » et y plierait l'annulation ou le déplacement de date — exactement le glissement que la séparation `'section:write'` / `'team:write'` et `'membership:write'` / `'payment:record'` a été construite pour empêcher.
- **Délibérément pas un élargissement de `'convocation:create'`** : les deux actions ont des populations candidates qui coïncident aujourd'hui mais des fenêtres temporelles opposées (créer = date future obligatoire ; modifier = avant coup d'envoi d'une convocation existante) et surtout des **surfaces de colonnes différentes** — `'convocation:create'` écrit six champs de match, celui-ci trois. Fusionner les deux rendrait la restriction de colonnes inexprimable.

### Branche de portée dans `can.ts` — à étendre, pas seulement la matrice

C'est **la quatrième occurrence exacte du même écart**, déjà corrigé pour `'convocation:create'` (`section-manager`), `'attendance:validate'` (`coach`) et `'vote:cast'` (`player`). Ce qui doit changer, précisément :

- **Branche `case 'coach'`** : `requiresTeamScope` vaut aujourd'hui `action === 'convocation:create' || action === 'attendance:validate'`. Ajouter `|| action === 'match_details:update'`. **Sans cet ajout, l'entrée de matrice seule laisserait un coach voir le bouton d'édition sur le match d'une autre équipe** — la RLS le refuserait, mais le bouton serait rendu, ce que la règle d'affichage (absence, jamais grisé) interdit.
- **Branche `case 'section-manager'`** : ajouter `'match_details:update'` à la liste de la condition, dans **le même changement** que l'entrée de matrice, bien que celle-ci soit `['coach']` aujourd'hui — précédent déjà appliqué deux fois pour `'role:assign'` et `'role:remove'` (« written now so a future widening doesn't silently ship without it »). La justification est **plus forte ici que là-bas** : la matrice CDC nomme explicitement le Responsable de section sur la ligne « Créer/modifier une convocation », donc PO-EM-01 a une réelle chance d'aboutir, contrairement à un élargissement purement hypothétique. L'appelant résout le `sectionId` de l'équipe cible **avant** d'appeler `can()`, comme pour `'convocation:create'`.
- **Aucune autre branche** n'est touchée : `player` ne doit pas voir l'action apparaître dans sa liste, et le `default` reste inchangé.

### Règle d'affichage

Moindre privilège (CDC §3 ; `ARCHITECTURE.md` §7) : le contrôle d'édition est **absent** pour tout rôle non autorisé et hors fenêtre temporelle — jamais grisé, jamais suivi d'une erreur au clic. Même traitement que les boutons de `specs/coach-attendance-confirmation.md` (AC-AT-06) et que l'action Présent/Absent (AC-MD-13).

Comme pour `canValidateAttendance` et `canRespond` dans `useConvocationDetailViewModel`, le rendu est en outre conditionné à `activeRole === 'coach'` : un compte cumulant joueur et coach sur la même équipe, ouvrant l'écran avec l'onglet « Joueur » actif, **ne voit pas** le contrôle. Limite assumée déjà documentée (`docs/DEFAULTS-A-CHALLENGER.md`), pas une nouveauté de cette passe.

## 3. La fenêtre « avant que le match commence »

### Définition retenue — `Convocation.date` non dépassée

« Avant qu'il commence » = **le coup d'envoi n'est pas passé**, soit `!isPastDate(convocation.date, now)` — la fonction **déjà existante** de `domain/rules/convocation-rules.ts`, déjà utilisée par `CreateConvocationUseCase` (garde de date passée), `useCreateConvocationViewModel` et `useCalendarViewModel`. **Aucun nouveau concept de temporalité n'est créé.**

Deux confusions à écarter explicitement :

- **Ce n'est pas `canPlayerRespond`.** Cette policy retranche 10 ou 60 minutes selon le type (`RESPONSE_DEADLINE_MINUTES`) — c'est la **fenêtre de réponse du joueur**, dont le but est de donner au coach un effectif stable avant de composer. La réutiliser ici produirait exactement le comportement inverse de celui demandé : un coach ne pourrait plus corriger le lieu de RDV dans l'heure précédant le match, précisément le moment où ce genre de correction arrive.
- **Ce n'est pas `isUpcoming`.** Celle-ci exige en plus `status === 'open'`. Le statut est traité séparément — voir ci-dessous.

### Convocation `closed` ou `cancelled`

La modification est **refusée** si `convocation.status !== 'open'`. Motif : `closed` est posé par le trigger de clôture des présences, `cancelled` signale un événement qui n'aura pas lieu — dans les deux cas, corriger un lieu de RDV n'a plus d'objet. En pratique la clôture automatique survient après le début de l'événement, donc la condition de date couvre presque toujours déjà le cas ; la condition de statut est là pour `cancelled` et pour ne pas dépendre d'une coïncidence.

### Ouvrir le formulaire avant le coup d'envoi, soumettre après — tranché

Cas réel : le coach ouvre le formulaire à 14h58 pour un coup d'envoi à 15h00, et soumet à 15h01.

**La soumission est refusée.** La fenêtre s'évalue **à l'instant de l'écriture**, jamais à l'instant de l'ouverture du formulaire. Trois niveaux, dans cet ordre de fiabilité croissante :

1. **Rendu** — le contrôle disparaît quand la fenêtre se ferme en cours de session, sans rechargement, via le tic minute déjà présent dans `useConvocationDetailViewModel` (`setInterval(…, 60_000)`). `RESPONSE_DEADLINE_MINUTES` est déjà à la minute près, donc la granularité convient telle quelle. **Confort, pas sécurité** — l'horloge est celle du client.
2. **Use case** — `UpdateMatchDetailsUseCase.execute` réévalue `isPastDate(convocation.date, new Date())` **au moment de l'appel** et lève une erreur de domaine si la fenêtre est fermée, exactement comme `CreateConvocationUseCase` lève sur une date passée. **Toujours pas la sécurité** : le `now` reste celui du client.
3. **RLS** — **la seule vraie barrière** (`CLAUDE.md` §6). Le prédicat de la politique `UPDATE` compare `convocations.date` à `now()` **côté serveur** (§6). Une requête forgée hors application, ou lancée par un client à l'horloge décalée, est refusée par la base.

**Conséquence de rendu à couvrir** : un refus serveur alors que l'écran croyait la fenêtre ouverte est un **état normal**, pas un bug — il doit produire un message lisible (« Le coup d'envoi est passé, ces informations ne sont plus modifiables ») et un rafraîchissement de l'écran, jamais un écran d'erreur technique ni une perte silencieuse de la saisie.

### Règle métier conservée — RDV avant coup d'envoi

`meetingPointTime` étant modifiable, la règle de `specs/create-convocation.md` §5 continue de s'appliquer **à la modification comme à la création** : `isValidMatchSchedule(rdvTime, kickoff)` — RDV strictement antérieur au coup d'envoi, **le même jour**. Appliquée dans le use case (autorité applicative), pas seulement dans le formulaire. La fonction et son test existent déjà, **rien à écrire de neuf** ; seul un appel s'ajoute, et `InvalidScheduleError` est réutilisée telle quelle.

Noter la composition des deux règles : `isValidMatchSchedule` compare le RDV **au coup d'envoi**, `isPastDate` compare le coup d'envoi **à maintenant**. Un RDV peut donc être déplacé dans le passé récent (le rassemblement a commencé, le match pas encore) — c'est légitime et ne doit pas être « corrigé » par une troisième garde non demandée.

## 4. Données sensibles

### Données de santé — aucune

Aucune donnée de santé, d'aptitude ou de diagnostic n'est lue ni écrite. Les trois champs modifiables sont un booléen, un horodatage et un lieu. **Aucun champ de texte libre nouveau** n'est introduit — contrairement à `ConvocationResponse.reason` et `AttendanceRecord.note`, les deux vecteurs déjà identifiés et tenus fermés (`specs/match_details_page.md` §3, `specs/coach-attendance-confirmation.md` §3). `meetingPointLocation` est du texte libre, mais il existe déjà, décrit un lieu, et n'est attaché à aucune personne.

### Données financières — aucune

Aucun statut de cotisation, montant ou relance. Module Cotisations **P1**.

### Données personnelles de tiers — aucune nouvelle

L'onglet Infos n'affiche aucun nom. Cette feature **n'élargit aucune lecture nominative** : elle ajoute une écriture sur une table qui ne porte que `convocation_id`, `opponent_id` et trois champs logistiques.

### Journal d'audit — à trancher, pas à omettre

- **Lu littéralement, le CDC §11.3 ne liste pas cette action.** Les actions sensibles énumérées sont : création/suppression de compte, changement de rôle, consultation de donnée santé, modification de paiement, correction de points Legacy, export nominatif. Modifier les informations d'un match n'y figure pas. **Aucune journalisation n'est donc formellement requise.**
- ⚠️ **Mais la nature de l'action mérite l'arbitrage, pas le silence** (PO-EM-02). C'est la première fois dans ce projet qu'une donnée **déjà diffusée et déjà utilisée par des tiers pour décider** est modifiée après coup : des joueurs ont répondu « présent » sur la foi d'un RDV à 13h00 aux vestiaires. En changer la valeur écrase l'ancienne **sans trace** — `match_details` ne porte ni horodatage de modification, ni auteur, ni historique, contrairement à `convocations` (`created_by`, `closed_by`, `cancelled_by`) et à `attendance_records` (`validated_by`, `validated_at`). Un joueur qui se présente au mauvais endroit n'a, en l'état, aucun moyen de démontrer que l'information avait changé.
- ⚠️ **Si la journalisation est retenue**, elle sera **appelée depuis le use case dans `domain/`**, jamais depuis un composant : c'est une **action métier** (intention, correction), pas un accès en lecture — `CLAUDE.md` §6. Une trace par trigger Postgres serait le mauvais mécanisme ici.
- ⚠️ **La table de journal d'audit reste absente de `supabase/migrations/`** : exigence transversale P0 non résolue, distincte de cette feature — constat déjà porté par `specs/create-convocation.md` §4, `specs/match_details_page.md` §3 et `specs/coach-attendance-confirmation.md` §3. C'est la **quatrième** feature consécutive à buter dessus.
- **Option intermédiaire à poser en même temps que PO-EM-02, sans la décider ici** : ajouter `updated_by` / `updated_at` à `match_details`, symétriques de `created_by` sur `convocations` — donnée métier ordinaire, pas un journal d'audit (`specs/create-convocation.md` §4 pose déjà ce critère de distinction). Ça porte la responsabilité dans la ligne, sans porter l'**historique** ni le **motif**. **Non construit dans cette passe**, pour ne pas préempter l'arbitrage.

### Export — aucun

Aucun export, aucune fonction de copie, depuis cet onglet, pour aucun rôle.

### Rétention — hors périmètre

Vit côté Supabase (`CLAUDE.md` §6, `docs/RETENTION_PURGE.md`). `domain/` ne connaît pas l'expiration.

## 5. Use case et dépôt — un chemin d'écriture étroit, jamais `upsert`

### Pourquoi ne pas réutiliser `MatchDetailsRepository.upsert`

`upsert(details: MatchDetails)` prend l'entité **entière**, `opponentId` compris. L'utiliser depuis un formulaire de modification à trois champs voudrait dire relire la ligne, en recopier `opponentId`, et le réécrire à l'identique — donc **ouvrir un chemin par lequel `opponentId` est écrit**, avec pour seule protection le fait que l'appelant actuel y remette la même valeur. Le jour où `goalsFor`/`goalsAgainst` arrivent sur cette même entité (match-stats, §1), ce chemin les écraserait à `null` ou les réécrirait, **sans qu'aucune ligne de code ne change**. C'est exactement le raisonnement de `specs/create-convocation.md` §2 sur les tables satellites : rendre l'interdit **structurel** plutôt que défendu à l'écriture.

`upsert` reste inchangée et conserve son unique appelant : la création.

### Méthode de dépôt — nom retenu et forme

Ajouter à `domain/repositories/match-details-repository.ts`, à côté d'`upsert` et `findByConvocationId` :

```
updateArrangements(convocationId: string, arrangements: MatchArrangements): Promise<MatchDetails>
```

avec, dans `domain/entities/match-details.ts` :

```
export type MatchArrangements = Pick<MatchDetails, 'isHome' | 'meetingPointTime' | 'meetingPointLocation'>
```

- **Le `Pick<>` est la partie non négociable**, le nom l'est moins. Il fait de la restriction de colonnes une **erreur de compilation** — passer `opponentId` (ou un futur `goalsFor`) à cette méthode ne compile pas. Et il reste **dérivé** de `MatchDetails` : ajouter un champ à l'entité n'élargit pas automatiquement l'écriture, alors qu'une interface recopiée à la main finirait par diverger.
- **`updateArrangements`** nomme ce que les trois champs ont en commun — les dispositions pratiques du match — par opposition à son identité (`opponentId`) et à son issue (le score). Écartés : `updateEditableFields` (ne dit pas *ce qui* est modifiable et ment dès que l'ensemble change), `update` tout court (invite à y verser tout le reste), `updateMeetingPoint` (faux : `isHome` n'est pas un point de RDV).
- Retourne la ligne relue, comme `upsert`, pour que le ViewModel dispose de la valeur réellement persistée plutôt que de son optimiste local.

Côté `data/`, `MatchDetailsRepositoryImpl.updateArrangements` émet un `.update({ … }).eq('convocation_id', …)` limité aux trois colonnes — **jamais un `.upsert()`** : un `upsert` sur une ligne absente créerait une ligne `match_details` incomplète pour une convocation qui n'est peut-être pas un match. Une convocation sans ligne satellite est un `null`, donc une erreur de domaine, jamais une création silencieuse (AC-EM-11).

### Use case

`domain/usecases/convocation/UpdateMatchDetailsUseCase.ts` — `UpdateMatchDetailsUseCase` (PascalCase + `UseCase`, dossier par feature, `CLAUDE.md` §4). Dossier `convocation/` existant, pas un nouveau.

Responsabilités, dans cet ordre :

1. Relire la `Convocation` (`ConvocationRepository.findById`) — nécessaire pour `date`, `status`, `teamId`. `null` → erreur « introuvable », sans distinguer inexistant et hors périmètre (AC-MD-01).
2. Vérifier `convocation.type === 'match'`.
3. Vérifier la fenêtre : `!isPastDate(convocation.date, now)` **et** `convocation.status === 'open'` (§3).
4. Vérifier `isValidMatchSchedule(new Date(arrangements.meetingPointTime), new Date(convocation.date))` → `InvalidScheduleError` (réutilisée).
5. Appeler `updateArrangements`.

`now` est **passé en paramètre** d'`execute`, jamais lu via `new Date()` à l'intérieur — même convention que `RespondToConvocationUseCase` et `ConfirmAttendanceUseCase`, et condition pour que le use case reste testable en Node sans horloge factice (`CLAUDE.md` §3).

**L'autorisation n'est pas rejouée dans le use case** : `can()` est consommé par `presentation/` via `usePermission` pour décider du rendu, et la RLS est l'autorité — même répartition que pour `ConfirmAttendanceUseCase`. Ne pas y ajouter un troisième contrôle qui donnerait l'illusion d'une sécurité applicative.

### Clé de query

`presentation/shared/query-keys.ts`, forme `[ressource, ...discriminants]`. **Aucune clé nouvelle n'est nécessaire** : les données modifiées sont servies par `queryKeys.convocationDetail(convocationId)`, qu'il suffit d'invalider après succès — `GetConvocationWithDetailsUseCase` porte déjà `matchDetails` dans sa réponse. Ne pas créer une clé `matchDetails(...)` séparée : la forme retournée ne diffère pas (précédent posé — « deux clés distinctes **quand la forme retournée diffère** »).

## 6. Miroir RLS — obligatoire, et actuellement inexistant

`CLAUDE.md` §6 : « Policies are pure functions […] mirrored (never generated) in SQL RLS policies. RLS is the actual security ». `CLAUDE.md` §7 : le miroir se fait **à la main**, des deux côtés commentés du nom de l'action. Cette spec décrit donc ce que la politique doit permettre, **sans en écrire le SQL**.

**Constat de départ, à ne pas manquer** : `public.match_details` porte aujourd'hui exactement deux politiques — `match_details_select_team_scoped` et `match_details_insert_create` (migration `20260821091519`). **Il n'existe aucune politique `UPDATE`.** Conséquence directe : toute tentative de modification d'une ligne existante est refusée par la base aujourd'hui, y compris par l'`upsert` du dépôt (son chemin `ON CONFLICT` est un `UPDATE`). La feature est impossible sans cette migration ; inversement, **ne pas « débloquer » le sujet en élargissant `match_details_insert_create`** — une politique `INSERT` ne gouverne pas un `UPDATE`, et l'élargir n'apporterait rien qu'une confusion.

Ce que la nouvelle politique (`match_details_update_arrangements`, `for update to authenticated`) doit permettre :

- **Qui** : le coach de l'équipe de la convocation parente, via `private.is_coach_of_team(c.team_id)` — le helper existe, ne pas en créer un second. La jointure de retour sur `public.convocations` est nécessaire, `match_details` ne portant pas de `team_id` propre (même forme que `match_details_select_team_scoped`).
- **Quand** : la date de la convocation parente n'est pas passée **selon l'horloge du serveur**, et son statut est `open`. Contrairement à une contrainte `CHECK` — qui exige une expression immuable et interdit donc `now()`, raison pour laquelle la règle « date passée interdite » de `specs/create-convocation.md` §5 a été portée par un **trigger** — une politique RLS peut évaluer `now()` sans difficulté. **Pas de trigger ici** : la garde temporelle appartient à la politique.
- **`using` ET `with check`**, portant le **même** prédicat : `using` détermine quelles lignes sont modifiables, `with check` valide l'image d'après — sans le second, rien n'empêcherait de faire sortir la ligne de sa propre portée.
- **Quelles colonnes** : restriction au niveau des privilèges Postgres, `grant update` limité à `is_home`, `meeting_point_time`, `meeting_point_location` pour `authenticated`. **C'est ce qui rend `opponent_id` — et tout futur `goals_for`/`goals_against` — structurellement inaccessible par ce chemin**, y compris à une requête forgée hors application. Précédent exact et déjà appliqué deux fois dans ce dépôt : `grant update (full_name)` pour `users_update_admin` et `grant update (team_id, section_id)` pour `user_roles_update_assign_role`. Une politique RLS seule **ne peut pas** exprimer une restriction de colonnes (le commentaire de `'role:assign-coach'` dans `rbac-matrix.ts` le dit déjà explicitement) : les deux mécanismes sont nécessaires, pas redondants.
- **Commentaire SQL** portant le nom `match_details:update`, pour que la correspondance avec `rbac-matrix.ts` se vérifie à l'œil (`ARCHITECTURE.md` §7).

**Écart hérité, signalé et non résolu ici** : `private.is_coach_of_team` **ne filtre pas par saison** — un coach affecté à une équipe d'une saison antérieure passe le test. Écart déjà identifié pour `convocations_insert_create` (`specs/create-convocation.md` §3) et non corrigé depuis. Cette passe le **reproduit** plutôt que de le corriger unilatéralement : corriger le helper affecterait toutes ses politiques appelantes, ce qui est un changement à part entière. À traiter avec l'écart d'origine, pas ici.

## 7. Critères d'acceptation

**AC-01** et **AC-02** sont ceux de la section 17.2 du CDC. Les critères propres à cette feature sont préfixés `AC-EM-`, même convention que `AC-CD-`, `AC-PD-`, `AC-CV-`, `AC-MD-`, `AC-AT-` ; à renuméroter en recette.

| Réf. | Critère |
|---|---|
| **AC-01** | Aucune donnée d'un membre extérieur à l'équipe de la convocation n'est accessible, ni à l'écran ni dans la réponse API |
| **AC-02** | Un coach de l'équipe A qui tente de modifier les informations d'un match de l'équipe B est refusé **par la base**, pas seulement par l'interface. Vérifié par appel direct à l'API, hors application |
| **AC-EM-01** | **Remplace AC-MD-17** (§1). Aucun bouton ni menu d'**annulation**, de **clôture**, de **relance** ou d'**export** n'est rendu, pour aucun rôle. Le seul contrôle de modification rendu est celui de cette feature : **onglet Infos, convocation de type `match`, rôle actif `coach` autorisé sur l'équipe, coup d'envoi non passé, statut `open`** — absent dans tous les autres cas, jamais grisé |
| AC-EM-02 | Seuls `is_home`, `meeting_point_time` et `meeting_point_location` sont modifiables. **`opponent_id` est inchangé après toute modification**, et une requête directe à l'API tentant de l'écrire par ce chemin est **refusée par la base** (restriction de colonnes, §6) — pas seulement ignorée par l'interface |
| AC-EM-03 | Aucune colonne de `public.convocations` n'est modifiée : `date`, `location`, `type`, `team_id`, `status` sont **inchangés, octet pour octet**, après une modification des infos match. Aucun `UPDATE` sur `convocations` n'est émis par le client |
| AC-EM-04 | Une modification soumise **après** le coup d'envoi est refusée **par la base**, même si le formulaire avait été ouvert avant. Vérifié par appel direct à l'API avec une convocation dont la date est passée (§3) |
| AC-EM-05 | Le contrôle d'édition **disparaît de lui-même** quand le coup d'envoi est franchi pendant que l'écran est ouvert, sans rechargement — absence, pas désactivation (AC-MD-13, même patron) |
| AC-EM-06 | Un refus serveur alors que l'écran croyait la fenêtre ouverte rend un message lisible et rafraîchit les données affichées ; ni écran d'erreur technique, ni chargement infini, ni perte silencieuse de la saisie |
| AC-EM-07 | Modifier les informations d'un match **n'écrit jamais** dans `convocation_responses` ni dans `attendance_records` : les réponses déclarées et les présences constatées sont **inchangées, octet pour octet**, et l'agrégat de l'onglet Effectif est identique avant et après (régression d'AC-MD-06 / AC-AT-05) |
| AC-EM-08 | Une modification est **idempotente et sans duplication** : la ligne `match_details` reste **unique** pour `convocation_id` (clé primaire), dernière valeur gagne. Soumettre deux fois les mêmes valeurs produit le même état final |
| AC-EM-09 | Une heure de RDV postérieure ou égale au coup d'envoi, ou située un autre jour, est **refusée par le use case** avec un message lisible — même règle et même fonction qu'à la création (`isValidMatchSchedule`, `specs/create-convocation.md` §5) |
| AC-EM-10 | Une modification sur une convocation `closed` ou `cancelled` est refusée, contrôle absent à l'écran et écriture refusée côté base |
| AC-EM-11 | Une convocation d'un type autre que `match`, ou un `match` sans ligne `match_details`, ne rend aucun contrôle d'édition et ne produit **aucune création silencieuse** de ligne satellite |
| AC-EM-12 | Le contrôle est **absent** (pas grisé) pour un jeton joueur, pour un compte coach dont l'onglet de rôle actif est « Joueur », et pour tout rôle hors `match_details:update` (§2) |
| AC-EM-13 | Aucune donnée de résultat (score, buteur, temps de jeu, feuille de match) n'est rendue ni écrite, **même statique** — AC-MD-19 reste vrai sans réserve |
| AC-EM-14 | Après succès, l'onglet Infos affiche les nouvelles valeurs sans rechargement manuel (invalidation de `queryKeys.convocationDetail`), et les trois lignes restent **distinctes** : domicile/extérieur, heure de RDV, lieu de RDV (AC-MD-03 conservé) |
| AC-EM-15 | Les contrôles interactifs introduits (bouton d'édition, champs, bouton de soumission) ont une cible tactile d'au moins ~44px (`h-11`), vérifiée sur un viewport mobile réel (`CLAUDE.md` §6, AC-MD-23) ; toute paire de champs côte à côte porte `min-w-0` |
| AC-EM-16 | Contrastes AA et navigation clavier opérationnelle (CDC §12) ; toute information portée par la couleur (état domicile/extérieur, état d'erreur) est doublée d'un libellé textuel (AC-MD-22) |
| AC-EM-17 | L'en-tête à flèche retour reste visible pendant le défilement du formulaire de modification (`sticky top-0`, fond opaque — `CLAUDE.md` §6, AC-MD-20) |

## 8. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-EM-01** | **Quels rôles au-delà du Coach/Staff peuvent modifier les informations d'un match ?** Situation inverse de PO-AT-01 : la matrice CDC **accorde ✅** le verbe « modifier » au Responsable de section (sa section), au Dirigeant habilité et à l'Administrateur — c'est cette passe qui restreint à `['coach']`, en **écart assumé** et non en lecture du CDC (§2). Trois sous-questions : (a) élargit-on dès maintenant, en sachant qu'aucun des trois n'a de chemin vers cet écran (`useActiveRole` ne connaît que joueur/coach, question ouverte UI n°1 de `specs/match_details_page.md`) ? (b) l'élargissement doit-il porter la même fenêtre pré-coup d'envoi, ou un Dirigeant habilité peut-il corriger après coup ? (c) faut-il une ligne de matrice CDC distinguant « créer » de « modifier », que le CDC fusionne aujourd'hui sur une seule ligne ? | Bureau (matrice CDC) + développeuse | **Oui pour l'élargissement**, non pour cette passe : `['coach']` scopé équipe livre entièrement la demande |
| **PO-EM-02** | **La modification d'informations déjà diffusées est-elle une action à journaliser ?** Non listée au CDC §11.3, mais c'est la première donnée du projet **déjà vue et déjà utilisée par des tiers pour décider** qui soit modifiable après coup, et `match_details` ne porte **ni auteur, ni horodatage, ni historique** (§4) — l'ancienne valeur disparaît sans trace. Sous-question à trancher **dans le même arbitrage** : ajoute-t-on `updated_by`/`updated_at`, données métier ordinaires symétriques de `created_by` (donc pas un journal d'audit, `specs/create-convocation.md` §4), en attendant la vraie table ? | Bureau + référent RGPD | Non — aucune table de journal d'audit n'existe de toute façon (exigence P0 distincte, quatrième feature consécutive à buter dessus) |
| **PO-EM-03** | **Un joueur ayant déjà répondu est-il informé que le RDV a changé ?** En l'état : **non**, rien. Communication est **P1**, et cette passe ne réinitialise pas non plus les réponses (AC-EM-07). Conséquence assumée à énoncer plutôt qu'à laisser implicite : **un joueur peut se présenter à l'ancien lieu de RDV sans qu'aucun signal ne lui soit parvenu**, alors que sa réponse « présent » a été donnée sur la foi de l'ancienne valeur. Trois options non tranchées : ne rien faire (statu quo), marquer visuellement la convocation comme « modifiée » côté joueur (coût faible, pas de module Communication requis), notifier réellement (attend P1) | Bureau + développeuse | Non pour cette passe — mais c'est le point le plus susceptible de produire un incident réel en usage |
| **PO-EM-04** | **`isHome` modifiable alors que `Convocation.location` ne l'est pas — est-ce cohérent ?** `specs/create-convocation.md` §2 décrit `isHome` comme « Lieu de la rencontre (Domicile / Extérieur) » et `Convocation.location` comme le lieu de la rencontre lui-même : les deux décrivent **où se joue le match**, et cette passe n'en rend qu'un modifiable, faute de toute politique RLS `UPDATE` sur `convocations` (§1). Un coach basculant « Domicile » en « Extérieur » laisserait donc un `location` devenu faux. Options : (a) retirer aussi `isHome` du périmètre modifiable, (b) l'assumer et le documenter à l'écran, (c) ouvrir une écriture sur `convocations.location` — ce qui est un sujet à part entière (`UpdateConvocationUseCase`, nom réservé depuis `specs/create-convocation.md` §7) | Développeuse | **Oui pour `isHome`** si l'option (a) est retenue ; non pour les deux autres champs, dont la modification est valable quelle que soit l'issue |
| **PO-EM-05** | **Le nom `updateArrangements` / `MatchArrangements` convient-il ?** La forme `Pick<MatchDetails, …>` n'est pas négociable (§5) ; le nom l'est. Il s'agit de nommer ce qui distingue les trois champs logistiques de l'identité (`opponentId`) et de l'issue (score, autre feature) | Développeuse | Non — question de nommage, tranchable en implémentation |
| **PO-EM-06** | **Amendement de `specs/match_details_page.md`.** §1 « Hors périmètre » (« Aucun bouton d'édition ») et AC-MD-17 sont contredits par cette feature et doivent être amendés selon §1 ci-dessus. L'agent PO ne modifie pas une spec existante ; l'amendement est donc **à porter par la développeuse** au moment de l'implémentation, sous peine de laisser deux specs en contradiction ouverte sur le même écran | Développeuse | Non pour le code, **oui pour la cohérence documentaire** — à faire dans la même passe, pas « plus tard » |
| **PO-EM-07** | **Aucune ligne dans `docs/designs/DESIGN_LINKS.md` §2 pour cette feature, et aucun export local.** Le lien artifact est demandé **une seule fois** (§4 du registre) et la ligne pré-rédigée en §0 est à recopier dès réception. Le contrôle demandé étant net-new et sans référence visuelle (§0), une maquette serait utile mais n'est pas indispensable : designer-agent peut le concevoir par réemploi des patrons existants (§9) | Développeuse | Non |

### Ce qui reste explicitement OPEN et ne doit pas être résolu implicitement

- **`UpdateConvocationUseCase`** reste un **nom réservé**, comme depuis `specs/create-convocation.md` §7. Cette feature modifie `match_details`, **jamais `convocations`** — ne pas « en profiter » pour ouvrir une politique `UPDATE` sur `convocations`, même minimale, même pour un seul champ.
- **`training_details`** n'existe toujours pas ; ne pas l'ébaucher au prétexte qu'un écran de modification existe maintenant.
- **La source de vérité des « convoqués requis »** (PO-6b de `specs/coach-dashboard.md`) est sans effet ici et reste ouverte — **ne pas créer de table `convocation_attendees`, ne pas construire de snapshot.**
- **Le filtrage par saison de `private.is_coach_of_team`** (§6) : écart hérité, reproduit tel quel, à corriger avec son écart d'origine et non dans cette passe.

## 9. Note pour designer-agent

- **Maquette** : **aucune**, ni lien de registre ni export local (§0, PO-EM-07). Le contrôle est net-new. Ce n'est pas bloquant : tout ce dont il a besoin existe déjà en code.
- **Ce n'est pas un nouvel écran.** C'est l'onglet **Infos** déjà construit (`InfosTab.tsx`, `MatchDetailsInfos.tsx`, `InfoRow.tsx`) auquel s'ajoute un point d'entrée d'édition, **variante coach uniquement**. Ne pas reconcevoir l'en-tête, le hero, la barre d'onglets ni la silhouette des lignes label/valeur — ils existent.
- **Emplacement demandé par la développeuse, verbatim** : « Add an edit icon button **before** info card in match details page (infos tabs) ». À respecter ; la forme exacte (icône seule, en-tête de carte, alignement) relève de designer-agent.
- **Trois champs, jamais quatre** (AC-EM-02) : domicile/extérieur, heure de RDV, lieu de RDV. **L'adversaire n'apparaît sous aucune forme modifiable** — ni champ grisé, ni select désactivé : il reste une ligne de lecture, exactement comme aujourd'hui. Un champ grisé lirait « bientôt disponible », ce qui serait faux.
- **Formulaire ou édition en place — non tranché ici, c'est votre décision.** Deux patrons déjà présents dans le dépôt : le formulaire plein écran poussé par-dessus (`CreateConvocationForm`, qui accepte déjà des `initialValues`, §1) ou l'édition dans la carte. Contrainte dans les deux cas : la bascule Domicile/Extérieur et la paire heure/lieu de RDV existent déjà visuellement dans `docs/designs/create-convocation/[v3] [Coach] Mob - Create convocation - match 2.png` — **réutiliser ce vocabulaire plutôt que d'en inventer un second** pour les mêmes champs.
- **États à couvrir** : contrôle absent (mauvais rôle, mauvais onglet de rôle actif, convocation non-`match`, `closed`/`cancelled`, coup d'envoi passé) — **absence, jamais grisé** (AC-EM-01, AC-EM-12) ; écriture en cours ; échec d'écriture ; **fenêtre franchie pendant la saisie** (AC-EM-05/06), l'état le plus spécifique à cette feature — le contrôle ou le formulaire doit céder la place proprement, avec un message lisible, sans écran d'erreur technique.
- **Cibles tactiles** : un bouton icône seul est précisément le cas où le `size-8` par défaut de shadcn passe inaperçu — minimum `size-11` (44px), précédent déjà posé par `BackHeader` et par les boutons ✓/✗ d'`AttendanceConfirmRow` (AC-EM-15). Toute paire de champs côte à côte (heure/lieu de RDV, date/heure) porte `min-w-0` (`CLAUDE.md` §6).
- **Aucun score, aucun buteur, aucune feuille de match** (AC-EM-13) — même correction que celle déjà appliquée à l'écran hôte.
- **Aucune notification, aucun libellé du type « prévenir les joueurs »** : Communication est P1 et PO-EM-03 n'est pas tranché. Ne pas concevoir un bouton pour une action qui n'existe pas.
- Rappel `CLAUDE.md` §9 : aucun nom de personne dans le code, les tests ou la documentation.

## 10. Note pour mentor-agent

- **Ordre de dépendance** : `actions.ts` + `rbac-matrix.ts` + `can.ts` (branches `coach` **et** `section-manager`, §2) → migration RLS `UPDATE` + `grant update (…)` (§6) → `MatchArrangements` + `updateArrangements` sur l'interface de dépôt → `MatchDetailsRepositoryImpl` → `UpdateMatchDetailsUseCase` → `presentation/`.
- **`can.ts` : ne pas ajouter l'action à la matrice sans étendre la branche `coach`.** Quatrième occurrence du même écart (§2). Une action ajoutée à `rbacMatrix` pour `coach` sans être nommée dans `requiresTeamScope` passe **sans aucun contrôle d'équipe**.
- **La migration est la partie critique, pas le TypeScript.** Il n'existe **aucune** politique `UPDATE` sur `match_details` aujourd'hui (§6) — sans elle rien ne fonctionne, et avec une version trop large tout est ouvert. Les deux mécanismes (prédicat de politique **et** `grant update` limité aux trois colonnes) sont nécessaires : une politique RLS ne peut pas restreindre des colonnes. Précédents à relire avant d'écrire : `20260918122440_web_users_write_policies.sql` (`grant update (full_name)`) et `20260918134942_web_users_role_edit_remove_write_policies.sql` (`grant update (team_id, section_id)`).
- **Le `now()` de la garde temporelle vit dans la politique RLS, pas dans un trigger.** La règle « date passée interdite » de la création a dû passer par un trigger parce qu'un `CHECK` exige une expression immuable (`specs/create-convocation.md` §5) — cette contrainte ne s'applique pas aux politiques RLS. Ne pas recopier le patron du trigger par analogie.
- **Ne jamais réutiliser `upsert` pour ce chemin** (§5), et ne pas « simplifier » `updateArrangements` en lui faisant prendre un `MatchDetails` complet : le `Pick<>` **est** la garantie de non-écriture d'`opponentId`, et la seule qui survivra à l'arrivée de nouvelles colonnes sur l'entité.
- **Note de fusion avec match-stats.** Cette feature et match-stats écrivent **la même table** sur des fenêtres temporelles opposées (avant vs. après le coup d'envoi) et des colonnes disjointes. À la fusion, vérifier trois points, aucun n'étant automatique : (a) `goals_for`/`goals_against` **ne figurent pas** dans le `grant update` de `match_details_update_arrangements` ; (b) `MatchArrangements` reste un `Pick<>` de trois champs et ne suit pas l'élargissement de `MatchDetails` ; (c) les deux politiques `UPDATE` sont des **sœurs permissives distinctes** (elles se composent par `OR`), jamais une politique unique élargie en place — précédent explicite : `user_roles_insert_assign_coach` et `user_roles_insert_assign_role`. Si la fusion produit une action de type `match_result:record`, elle est **distincte** de `match_details:update`, pour la même raison que `'membership:write'` et `'payment:record'` restent séparées.
- **Tests, par ordre de priorité** (`CLAUDE.md` §8) : `can.test.ts` étendu à la nouvelle action (y compris le cas « coach d'une autre équipe » et le cas `section-manager` pré-câblé) → `UpdateMatchDetailsUseCase.test.ts` (fenêtre ouverte / fermée, `closed`, `cancelled`, type non-`match`, satellite absente, RDV invalide) → mapper. Le cas d'AC-EM-04 (« ouvert avant, soumis après ») doit être un test nommé, avec deux `now` distincts, pas un effet de bord.
- **Tests RLS contre la base, jamais contre le rendu** — leçon d'AC-MD-08. AC-01/AC-02, AC-EM-02, AC-EM-03 et AC-EM-04 se vérifient par appel direct à l'API. ⚠️ **PO-MD-10 reste ouvert** : le dépôt n'a toujours pas d'infrastructure pour obtenir une session Supabase authentifiée depuis un test Vitest, donc ces critères risquent de rester des `it.todo`. À signaler plutôt qu'à contourner.
- **Invalidation de cache** : `queryKeys.convocationDetail(convocationId)` uniquement — aucune clé nouvelle (§5). Ne pas invalider les clés d'effectif/réponses : cette écriture ne les touche pas (AC-EM-07), et les invalider suggérerait le contraire.
- **Ne pas implémenter dans cette passe** : modification d'`opponentId`, de `Convocation` (date, lieu, type), de `MeetingDetails` ; toute politique `UPDATE` sur `convocations` ; `updated_by`/`updated_at` sur `match_details` (PO-EM-02) ; table de journal d'audit ; notification ou marqueur « modifié » côté joueur (PO-EM-03) ; ajout de `section-manager`, `authorized-officer` ou `admin` à l'entrée de matrice (PO-EM-01) ; correction du filtrage saison de `private.is_coach_of_team` (§6).

## UI design

### 0. Ce qui a été consulté avant de dessiner

Registre `docs/designs/DESIGN_LINKS.md` §2 — **aucune ligne** pour `edit-match-details` (confirmé au §0 de ce spec par l'agent PO, PO-EM-07 : ni lien, ni export local). Conformément au §4 du registre, aucune maquette n'est donc redemandée à la développeuse ; ce qui suit est conçu par réemploi de deux références déjà dans le dépôt, toutes deux nommées explicitement ci-dessous à chaque fois qu'elles sont reprises :

- `docs/designs/player-match-details/[v3] [Joueur] Mob - Détail Match-selection_1.png` — export de la carte bordée de l'onglet Infos (silhouette label/valeur), pour la disposition **en lecture** que cette feature ne touche pas.
- `docs/designs/create-convocation/[v3] [Coach] Mob - Create convocation - match 2.png`, et le code qui l'implémente (`CreateConvocationForm.tsx` + `SegmentedToggle.tsx` + `DateTimeInput.tsx` + `FormField.tsx` + `field-style.ts`), pour le vocabulaire **d'édition** des trois mêmes champs (bascule Domicile/Extérieur, paire Heure/Lieu de RDV).

Aucun des deux n'est redessiné ; le contrôle net-new (bouton d'édition + bascule lecture/édition en place) est une composition des deux, pas un troisième patron visuel.

### 1. Emplacement dans la nav

Toujours l'onglet **Infos** de `ConvocationDetailPage` (un des 4 écrans fixes : Calendrier → Convocation → onglet Infos). Aucune nouvelle destination de nav, aucun nouvel écran, exactement comme le pose le §1 du spec (« Ce n'est pas un nouvel écran »).

Précisément :

- Un petit bandeau d'action est ajouté **au-dessus** de la carte bordée d'`InfosTab.tsx` (celle rendue par `MatchDetailsInfos.tsx`), respectant littéralement la demande de la développeuse (§9 : « edit icon button **before** info card ») — un élément séparé qui précède la carte dans l'ordre visuel, pas une icône glissée dans la première ligne de la carte elle-même. Contenu : uniquement le bouton d'édition, aligné à droite (`justify-end`), aucun libellé de section — la carte garde son en-tête visuel actuel (rien, la première ligne est directement « Coup d'envoi »).
- Le contenu interne de la carte (les `InfoRow` que rend `MatchDetailsInfos`) bascule entre deux rendus mutuellement exclusifs — jamais superposés, jamais l'un grisé au-dessus de l'autre :
  - **lecture** : les trois `InfoRow` actuelles, telles quelles, non touchées ;
  - **édition** : le formulaire à trois champs (§3), remplaçant ces trois lignes à l'intérieur de la même carte.
- Les deux lignes d'identité au-dessus (« Coup d'envoi », « Lieu ») ne bougent pas et restent en lecture seule dans les deux cas — seules les trois lignes `MatchDetailsInfos` peuvent devenir un formulaire.

### 2. Ce qui change selon le rôle — renvoi au RBAC du spec, pas de redéfinition

Le bandeau + bouton d'édition n'existe (est monté) que si **toutes** les conditions du §2/§3 du spec sont vraies simultanément, recalculées à chaque tic minute (`now`, patron déjà présent dans `useConvocationDetailViewModel`, §3 du spec) :

1. `activeRole === 'coach'` (onglet de rôle actif du compte, pas seulement une des affectations de l'utilisateur — même garde que `canValidateAttendance`/`canRespond`) ;
2. `roleMatchesConvocationTeam` (déjà calculé par le ViewModel) — l'équipe active du coach est celle de la convocation ;
3. `convocation.type === 'match'` et `convocation.status === 'open'` ;
4. `!isPastDate(convocation.date, now)` — le coup d'envoi n'est pas passé ;
5. `usePermission('match_details:update', { teamId: convocation.teamId })` retourne vrai.

C'est la **même composition** que `canValidateAttendance`/`canRespond` dans le ViewModel — un nouveau champ dérivé, nommé ici `canEditMatchDetails` pour rester cohérent avec ces deux précédents, calculé une fois dans `useConvocationDetailViewModel` et simplement lu par `InfosTab`/`MatchDetailsInfos`. Aucune des cinq conditions n'est redéfinie ici : elles viennent du §2/§3 du spec, cette section ne fait que dire **où** le booléen résultant est branché dans l'arbre de composants.

Rendu : **absent**, jamais grisé, dans tous les autres cas (joueur, coach d'une autre équipe, onglet de rôle « Joueur » actif sur un compte multi-rôle, convocation non-`match`, `closed`/`cancelled`, coup d'envoi passé) — AC-EM-01/AC-EM-12. Le bandeau lui-même disparaît (pas seulement le bouton) quand `canEditMatchDetails` est faux, pour ne laisser aucune zone vide au-dessus de la carte.

### 3. Nouveau composant — bascule lecture/édition de `MatchDetailsInfos`

Pas un nouvel écran, pas un nouveau patron visuel (voir §5 ci-dessous pour la justification du choix « en place » plutôt que route poussée ou `Dialog`) — une extension de `MatchDetailsInfos.tsx`, qui prend en plus un état d'édition et les callbacks associés (le calcul reste dans le ViewModel, ce composant ne fait que rendre l'un des deux états — `ARCHITECTURE.md` §6).

**Bouton d'édition** (bandeau au-dessus de la carte, §1) :
- Icône seule (crayon — `IconPencil`, cohérent avec le jeu d'icônes Tabler déjà utilisé sur cet écran : `IconChevronLeft`, `IconCheck`/`IconX`, `IconTrophy`), `aria-label="Modifier les informations du match"` — jamais de texte visible à côté, donc le libellé accessible est obligatoire (même règle que les boutons ✓/✗ d'`AttendanceConfirmRow`).
- `size="icon"` de shadcn part de `size-8` (32px) — **surchargé à `size-11` (44px)**, précédent déjà posé par `BackHeader` et `AttendanceConfirmRow` (AC-EM-15).
- Tap → bascule locale `isEditingMatchDetails: true`. Aucune navigation, aucun changement d'URL/onglet.

**Formulaire en place** (remplace les 3 `InfoRow` à l'intérieur de la même carte, une fois `isEditingMatchDetails === true`) :
- **Domicile / Extérieur** : `SegmentedToggle` réemployé **tel quel** — même composant, mêmes props (`trueLabel="Domicile"`, `falseLabel="Extérieur"`, `trueColor="coach-green"`, `falseColor="coach-red"`) que `CreateConvocationForm`. Pas de variante « lecture seule stylée différemment » : le même contrôle que la création, avec la valeur actuelle pré-sélectionnée.
- **Heure de RDV** et **Lieu de RDV**, **côte à côte**, dans la même grille que `CreateConvocationForm` (`FIELD_ROW_CLASSNAME` = `grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3`) :
  - Heure de RDV → `DateTimeInput type="time"`, dans un `FormField` ;
  - Lieu de RDV → `Input` + `FIELD_CLASSNAME`, dans un `FormField`.
  - **Rappel explicite CLAUDE.md §6** : cette paire côte à côte doit porter `min-w-0` sur chaque item de grille — déjà acquis gratuitement en réemployant `FormField` tel quel (son propre `min-w-0`, voir `FormField.tsx`), donc rien à ajouter, mais à vérifier si un futur refactor change ce wrapper. `DateTimeInput` gère lui-même le débordement du contrôle natif (voir son commentaire), donc aucun `min-w-0` supplémentaire n'est nécessaire à l'intérieur.
- **Champs non présents et non grisés** : `opponentId` (adversaire) — aucune ligne de formulaire, la ligne « Coup d'envoi »/« Lieu » d'identité au-dessus de la carte reste une ligne de lecture, inchangée (AC-EM-02, §9 du spec — « ni champ grisé, ni select désactivé »).
- **Cibles tactiles** : tous les champs (`SegmentedToggle`, `DateTimeInput`, `Input`) héritent déjà de `h-11`/`py-3` ≥ 44px via `FIELD_CLASSNAME`/`SegmentedOption` — même classe que `CreateConvocationForm`, rien à réinventer.

**Barre Annuler / Enregistrer** : sous les champs, à l'intérieur de la carte (pas de barre ancrée en bas d'écran façon `CreateConvocationForm` — il n'y a pas de plein écran ici, voir §5) :
- Deux boutons côte à côte, chacun `h-11` minimum (AC-EM-15) : « Annuler » (`variant="outline"`, réinitialise les champs à `matchDetails` et repasse `isEditingMatchDetails: false`, sans confirmation — cohérent avec le faible enjeu d'un champ logistique et avec le patron déjà accepté pour « Changer mon vote », qui rouvre aussi un formulaire sans confirmation) et « Enregistrer » (`variant` primaire, pill blanche comme le bouton de soumission de `CreateConvocationForm`, désactivé tant qu'aucun champ n'a changé ou pendant l'écriture — voir §4).

### 4. États

| État | Déclencheur | Rendu |
|---|---|---|
| **Absent** | `canEditMatchDetails === false` | Ni bandeau ni bouton ; carte en lecture seule (comportement actuel, inchangé) |
| **Lecture (idle)** | `canEditMatchDetails === true`, `isEditingMatchDetails === false` | Bandeau avec le bouton crayon ; carte affiche les 3 `InfoRow` actuelles |
| **Édition** | Tap sur le crayon | Bandeau vide (le crayon disparaît — pas de doublon avec Annuler/Enregistrer) ; carte affiche le formulaire à 3 champs pré-rempli des valeurs actuelles |
| **Enregistrement (pending)** | Tap sur « Enregistrer » | Bouton « Enregistrer » désactivé, libellé « Enregistrement… » (même patron textuel que l'absence de composant toast générique déjà notée sur cet écran) ; « Annuler » reste actif pour permettre d'abandonner une écriture encore en vol côté UI (elle continue en arrière-plan, mais l'utilisateur peut revenir en lecture) |
| **Échec d'écriture** | `onError` de la mutation | `Alert variant="destructive"` **à l'intérieur de la carte**, sous les champs et au-dessus de la barre Annuler/Enregistrer — même composant et même variant que le bloc `respondError` déjà rendu par `ConvocationDetailPage.tsx` (`Alert`/`AlertDescription`, `mapDomainErrorToUiError`), pas un nouveau patron d'erreur. Le formulaire reste ouvert, les valeurs saisies restent affichées (jamais réinitialisées par un échec) |
| **Succès** | `onSuccess` de la mutation | `isEditingMatchDetails` repasse à `false`, la carte réaffiche les 3 `InfoRow` avec les nouvelles valeurs — **aucun rechargement manuel** (AC-EM-14). Clé à invalider : `queryKeys.convocationDetail(convocationId)` uniquement (§5/§10 du spec — déjà tranché là-bas, repris ici pour mémoire côté UI seulement) |

### 5. Fenêtre franchie pendant la saisie (AC-EM-05/06) — le cas le plus spécifique à cette feature

Deux moments distincts à distinguer, le second n'étant pas couvert par un simple « le bouton disparaît » :

- **Avant l'ouverture du formulaire** : couvert par le §2 ci-dessus — `canEditMatchDetails` repasse à `false` au tic minute suivant, le bandeau (bouton compris) disparaît de lui-même. Rien de spécifique à ajouter.
- **Le formulaire est déjà ouvert quand la fenêtre se ferme** (le cas réel du §3 du spec — ouvert à 14h58, coup d'envoi 15h00) : ne **pas** faire disparaître le formulaire sous l'utilisateur ni le fermer de force — ce serait une perte silencieuse de saisie, explicitement interdite. À la place : dès que le tic minute fait passer `canEditMatchDetails` à `false` **alors que `isEditingMatchDetails` est encore `true`**, le formulaire reste affiché tel quel (champs et valeurs saisies intacts), mais :
  - un message non bloquant apparaît dans la même zone que le bloc d'erreur (§4) : « Le coup d'envoi est passé, ces informations ne sont plus modifiables. » (texte repris de la conséquence énoncée au §3 du spec) ;
  - le bouton « Enregistrer » se désactive (toute tentative d'écriture serait de toute façon refusée par la base) ;
  - « Annuler » reste actif et devient la seule sortie, désormais libellée « Fermer » plutôt que « Annuler » (il n'y a plus rien à annuler, juste à quitter une vue devenue obsolète) — au tap, la carte repasse en lecture seule et le bandeau reste absent (cohérent avec le §2, la fenêtre est fermée).
- **Course serveur réelle** (soumis pile au moment où la fenêtre se ferme côté serveur, alors que l'écran la croyait encore ouverte) — AC-EM-06 : le rendu est celui de la ligne « Échec d'écriture » du tableau §4, avec un message lisible spécifique plutôt qu'une erreur technique générique (« Le coup d'envoi est passé, ces informations ne sont plus modifiables. », le même texte que ci-dessus), **et** une invalidation de `queryKeys.convocationDetail(convocationId)` déclenchée dans le même `onError` pour que l'écran se resynchronise (le prochain rendu recalcule `canEditMatchDetails` à `false` et fait disparaître le bandeau, sans que l'utilisateur ait à recharger). Les valeurs saisies restent visibles jusqu'à ce que l'utilisateur ferme lui-même le formulaire — jamais effacées automatiquement.

### 6. Pourquoi « en place », pas une route poussée ni un `Dialog`

Le spec (§9) laisse le choix ouvert entre deux patrons déjà présents dans le dépôt (« le formulaire plein écran poussé par-dessus » ou « l'édition dans la carte ») et ne mentionne pas de troisième option. `src/presentation/shared/components/ui/dialog.tsx` existe bien dans le dépôt, mais son seul usage réel est le backoffice **desktop** (ex. `NewsFormDialog`, formulaires de saisons/sections) — aucun écran **mobile** de ce dépôt n'édite un enregistrement via `Dialog`/`Sheet` ; ce n'est pas un patron mobile établi ici, l'introduire serait le troisième patron que le spec demande justement d'éviter.

Entre les deux options réellement disponibles, **édition en place** est retenue, pour trois raisons :

1. **« Ce n'est pas un nouvel écran »** est la phrase d'ouverture du §1 du spec. Une route poussée (même avec `initialValues`, déjà prévu pour ça sur `CreateConvocationForm`) réintroduit une navigation, une URL, et donc une notion d'écran là où le spec insiste sur le contraire.
2. **Trois champs, pas six.** `CreateConvocationForm` gère un formulaire multi-type (match/entraînement/réunion) avec sélection d'adversaire, date, lieu — une route dédiée s'y justifie. Ici, trois champs déjà visibles en lecture juste au-dessus : les faire disparaître pour pousser un écran plein, puis revenir, est plus de mouvement que le contenu ne le demande.
3. **AC-EM-05/06 est plus simple à rendre correctement en place.** Si la fenêtre se ferme pendant une route poussée, il faudrait décider quoi faire de la navigation elle-même (retour forcé ? blocage du bouton retour ?) en plus de l'état du formulaire. En place, "fermer" un formulaire devenu obsolète est juste une bascule d'état locale vers la carte en lecture — pas une navigation à orchestrer.

Conséquence pour AC-EM-17 (« l'en-tête à flèche retour reste visible pendant le défilement ») : elle est déjà satisfaite **sans rien construire de neuf** — le `BackHeader` de `ConvocationDetailPage` fait déjà partie du groupe `sticky top-0` qui coiffe tout l'écran (voir le commentaire dans `ConvocationDetailPage.tsx`), formulaire ouvert ou non. Rien à ajouter côté sticky pour cette feature.

### 7. Contrastes et clavier (AC-EM-16)

Aucun nouveau vecteur de couleur-seule : le bouton crayon porte son `aria-label`, la bascule Domicile/Extérieur double déjà sa couleur d'un libellé texte (`SegmentedToggle`, patron déjà validé pour la création), et le message de fenêtre fermée (§5) est un texte, jamais une couleur seule. Navigation clavier : les trois champs et les deux boutons Annuler/Enregistrer suivent l'ordre de tabulation naturel du DOM (aucun `tabIndex` custom requis, aucun élément positionné qui casserait cet ordre).

### 8. Questions ouvertes

- **Icône exacte du bouton d'édition** — `IconPencil` (Tabler) supposé par cohérence avec le reste de l'écran ; à confirmer par la développeuse en implémentation (non bloquant, pur détail visuel — même statut que PO-EM-05 côté nommage).
- **PO-EM-01** (rôles au-delà du coach) reste explicitement **non tranché** : le §2 ci-dessus ne branche `canEditMatchDetails` que pour `activeRole === 'coach'`, par construction — aucune UI n'est dessinée pour Responsable de section/Dirigeant habilité/Administrateur, conformément au spec.
- **PO-EM-03** (notification/marqueur « modifié » côté joueur) reste explicitement **non tranché** : aucun badge, aucune mention « RDV modifié » n'est ajouté à la vue joueur de cet onglet par cette section. Si tranché plus tard, c'est un ajout à la vue **joueur** de `MatchDetailsInfos`/`InfosTab`, hors de ce qui est dessiné ici.
- **PO-EM-04** (`isHome` modifiable sans que `Convocation.location` le soit) reste explicitement **non tranché** : le formulaire dessiné ici modifie `isHome` sans toucher `location`, exactement comme le périmètre du spec le prévoit ; aucune UI de cohérence (avertissement, lien vers `location`) n'est ajoutée en attendant l'arbitrage.
