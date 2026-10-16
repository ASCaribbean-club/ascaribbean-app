# Spec — Notifications mobiles (push + alertes in-app)

> Statut : **rédaction initiale du 2026-10-15** (product-owner-agent), **complétée le même jour** par trois demandes développeuse : notification de **mise à jour de l'application** avec ses nouveautés (T4), **annonce de l'homme du match** à la clôture du vote (T5), et une **règle de ton** pour tous les textes (§1bis). **Amendée le même jour après réponses de la développeuse** : **PO-NT-01 résolu** (aucune maquette ; consentement dans un nouvel écran « Paramètres » atteint depuis le Menu), **PO-NT-17 résolu** (on garde `autoUpdate` ; « Nouveautés » affichées après le rechargement), **PO-NT-03 résolu** (T1 envoyé à l'ouverture du vote **et** 24 h avant sa clôture, deux push au plus) et **PO-NT-22 résolu** (T5 aux joueurs et coachs de l'équipe, et à tous les Dirigeants habilités, toutes équipes). **Nouvelle demande développeuse, même jour** : notifications **activées par défaut**, avec, si le navigateur ne le permet pas, une **alerte unique** dans la fenêtre « Nouveautés » de la version qui livre cette feature (§1 « Activation par défaut »). **Décision développeuse, même jour : la déconnexion ne change pas le réglage des notifications** (« un téléphone = un utilisateur ») ; elle ne supprime plus l'abonnement de l'appareil (§1 « Déconnexion »). **Précision développeuse, même jour** : après une déconnexion puis une connexion, l'appareil est (ré)abonné pour le compte connecté **sans aucun clic** : **resynchronisation silencieuse à chaque lancement connecté et à chaque connexion**, dès que la permission est déjà accordée et sans refus explicite. **Aucun point ne bloque ni la conception ni l'implémentation.** Restent à trancher avant la mise en production : PO-NT-12, PO-NT-14, PO-NT-26, PO-NT-32. Voir §5 et « Transmission ».
> Demande développeuse (verbatim) : « Mob-notifications. Les alertes doivent être visibles in-app mais aussi via des notifications (élire l'homme du match si ça n'a pas été fait, prochaine convocation non répondue 24h avant pour les matchs et réunions, 12h avant pour les entraînements, paiement de cotisation pour les relances, etc). » Compléments (2026-10-15) : (1) notifier quand une mise à jour de l'application est disponible, avec le détail des nouveautés, en réemployant le changelog in-app ; (2) annoncer l'homme du match une fois le vote clos, à tous les joueurs et aux dirigeants ; (3) ton convivial, peu d'emojis, formulation légère ; (4) une tuile « Paramètres » tout en bas du Menu, qui ouvre un écran de paramètres avec une section « Notifications » pour activer ou désactiver les notifications, avec la description de celles qui seront reçues (détail derrière un petit « i » si c'est trop dense) ; (5) notifications activées par défaut ; si la permission du navigateur l'empêche, une alerte dans la fenêtre « Nouveautés » qui renvoie vers Paramètres > Notifications, **uniquement pour la prochaine version** ; (6) la déconnexion ne modifie pas le réglage des notifications : un téléphone = un utilisateur ; (7) après une déconnexion puis une connexion, l'appareil est (ré)abonné pour le compte connecté sans clic supplémentaire, le refus explicite restant prioritaire.
> Sources CDC : `docs/priorisation-fonctionnelle-as-acaribbean.md` (module **Communication, P1** ; matrice RBAC ; exigences transversales), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles, révocation immédiate §3.1).
> Specs reprises **sans réinterprétation** : `specs/menu.md` (AC-MN-01, 02, 09, 12, 15, 17), `specs/coach-alerts.md` (AC-AL-13), `specs/player-vote.md` (PO-PV-06, PO-PV-07, PO-PV-08, PO-PV-09, AC-PV-10), `specs/convocation-player-selection.md` (liste de convoqués, PO-CPS-03, PO-CPS-09), `specs/mobile-treasurer.md` amendement (4) (relances, table `notifications`, §H, AC-TR-43, PO-TR-12, PO-TR-17), `specs/profile-membership-dues.md`, `specs/web-memberships.md`, `specs/calendar.md`, `specs/create-convocation.md` (PO-CV-06), `specs/coach-dashboard.md` (PO-4), `specs/player-dashboard.md`.
> Code lu pour cadrer : `domain/policies/{response-deadline,player-vote-rules}.ts`, `domain/usecases/player-vote/{GetPendingVoteReminderUseCase,GetTeamMvpUseCase}.ts`, `domain/entities/notification.ts`, `presentation/features/player-dashboard/components/PendingVoteAlert.tsx`, `presentation/features/menu/{MenuPage.tsx,useMenuViewModel.ts,components/ChangelogDialog.tsx,changelog/parse-changelog.ts}`, `presentation/app/router.tsx` (routes poussées `profile`, `stats`, `team-stats`, `leaderboard`, `legacy`, `alerts`), `.claude/skills/release-version/SKILL.md`, `vite.config.ts` (`VitePWA`, `registerType: 'autoUpdate'`, `APP_VERSION`), `supabase/migrations/{20261005170000_dues_reminders_schema,20261003165056_delay_convocation_closure,20261012093753_get_team_mvp_rpc,20261013134916_legacy_closure_and_reconciliation}.sql`, `supabase/functions/` (seule `invite-user` existe).

## 0. Maquette — aucune, et c'est acté

**Décision développeuse (2026-10-15), PO-NT-01 résolu : aucune maquette n'existe** pour cette feature, ni lien, ni export. La conception se fait à partir de cette spec, par composition de patrons existants (`MenuNavCard`, `BackHeader`, `ChangelogDialog`, primitives shadcn). **Ne plus demander de lien.**

L'agent PO n'écrit pas hors de `specs/`. **Ligne de registre à recopier verbatim par designer-agent** dans `docs/designs/DESIGN_LINKS.md` §2 :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| mob-notifications — **tuile « Paramètres » du Menu, écran Paramètres (section Notifications) et annonce des nouveautés de version** | — aucune maquette produite | 2026-10-15 | N/A | **absent** |

**Note d'accompagnement suggérée** : *« Ligne ajoutée conformément au §4 — aucune ligne n'existait pour cette feature. La développeuse a confirmé (2026-10-15, PO-NT-01) qu'aucune maquette n'a été produite. Statut `absent`. Ne plus demander de lien : conception par composition à partir de `specs/mob-notifications.md` (`MenuNavCard`, `BackHeader`, `ChangelogDialog`). »*

## 1. Périmètre

### Rattachement CDC et priorité

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| **Communication** — « Annonces et notifications ciblées, préférences par canal » | **P1** | Un **canal push** (Web Push) pour quatre notifications métier (T1, T2, T3, T5), **activé par défaut** quand le navigateur le permet, un écran **Paramètres** pour activer ou désactiver ce canal (la « préférence par canal » du CDC), et l'annonce des **nouveautés** après une mise à jour (T4). Pas d'annonces rédigées par un rôle |
| Calendrier et convocations | P0 | Source du rappel « convocation sans réponse » (lecture seule) |
| Cotisations — « relance » | P1 | Le push **double** la relance déjà construite par le Trésorier. Aucune relance nouvelle |
| ASC Legacy (classements) / vote | P1 | Source de l'annonce de l'homme du match (T5) : résultat **déjà calculé** par `get_team_mvp`, aucun calcul nouveau |

⚠️ T4 (mise à jour) et T5 (homme du match) ne sont **pas** fondés sur une ligne du CDC : ils viennent de la demande développeuse. On les range sous Communication par défaut.

C'est la feature que `specs/coach-alerts.md` §1 renvoie à « une autre feature, sous un autre module (P1) ». Elle **ne modifie pas** l'écran Alertes coach (AC-AL-13 reste vrai pour cet écran : voir « Hors périmètre »).

### Ce qui existe déjà in-app — réemployé, jamais redéfini

| Alerte | Surface in-app existante | Règle source |
|---|---|---|
| Vote homme du match non exprimé | `PendingVoteAlert` (tableau de bord joueur), via `GetPendingVoteReminderUseCase` | `player-vote-rules.ts` : vote ouvert après le coup d'envoi, clôture à coup d'envoi + `VOTING_DEADLINE_START_OFFSET_HOURS` (1 h) + `VOTING_DEADLINE_DAYS` (2 j) |
| Homme du match désigné | Étoile du joueur du match, via `GetTeamMvpUseCase` → `get_team_mvp` | Dernier match **clos** de l'équipe ayant reçu au moins un vote ; candidat(s) le(s) plus voté(s) ; **égalité = tous les ex æquo** |
| Relance de cotisation | `DuesReminderBanner` (tête du Dashboard, tous rôles) | `mobile-treasurer.md` amendement (4) §H, `isDuesAlertVisible` |
| Actions coach (présences, score, buteurs) | Écran Alertes coach | `coach-alerts.md` signaux A, B, C |
| Convocation sans réponse | Carte « Prochaine convocation » + statut « en attente » (tableau de bord joueur, Calendrier) | `canPlayerRespond` (`response-deadline.ts`) |
| Notes de version | `ChangelogDialog` (Menu, double tap sur la version) | `CHANGELOG.md` importé en texte brut au build (`/CHANGELOG.md?raw`), lu par `parseMobileChangelog` (sections `### Mobile` seulement) ; version = `APP_VERSION`, tirée de `package.json` au build ; format fixé par le skill `release-version` |

**Côté in-app, cette feature n'ajoute aucune alerte métier nouvelle.** Elle ajoute le **canal push**, l'**écran Paramètres** (consentement), l'**annonce des nouveautés** après une mise à jour (T4), et une **alerte unique d'activation** dans cette annonce (§ « Activation par défaut »). Un bandeau in-app pour la convocation sans réponse (PO-NT-06) ou pour l'homme du match (PO-NT-24) reste une question ouverte.

### Ce qui est nouveau

1. **Tuile « Paramètres » dans le Menu, et écran Paramètres** (détaillés ci-dessous) : point d'entrée unique pour activer ou désactiver les notifications.
2. **Abonnement push par appareil**, **activé par défaut** quand le navigateur le permet, **rattaché au compte connecté**, **conservé à la déconnexion** et **resynchronisé en silence** à chaque lancement connecté et à chaque connexion : permission système, enregistrement de l'abonnement, désabonnement.
3. **Quatre déclencheurs push métier**, tous calculés **côté serveur** :

| # | Déclencheur | Destinataire | Condition, évaluée **au moment de l'envoi** | Moment |
|---|---|---|---|---|
| **T1** | Vote homme du match non exprimé | Joueur·euse de l'équipe du match (votants = tous les joueurs de l'équipe, PO-CPS-09 — pas seulement les convoqués) | `type = 'match'`, non annulé, fenêtre de vote ouverte (`isVotingOpen` et non `isVotingClosed`), aucun vote de ce compte dans la catégorie `man_of_the_match` | **Deux moments (PO-NT-03 résolu)** : (1) à l'**ouverture du vote** ; (2) **24 h avant la clôture** (clôture = coup d'envoi + 1 h + 2 j, donc coup d'envoi + 1 h + 1 j). **Deux push au plus** par personne et par vote. L'instant exact d'« ouverture » : PO-NT-28 |
| **T2** | Convocation sans réponse | Convoqué·e (ligne `convocation_attendees`), sans ligne `convocation_responses` | `status = 'open'`, non annulée, `canPlayerRespond` encore vrai, aucune réponse | **Match et réunion : coup d'envoi − 24 h. Entraînement : début − 12 h** (demande développeuse) |
| **T3** | Relance de cotisation | Titulaire de l'adhésion (`memberships.user_id`), quel que soit son rôle | Résultat `'sent'` de `send_dues_reminders()` (règles de `mobile-treasurer` §B inchangées, dont le délai de 7 jours) | À l'envoi par le Trésorier |
| **T5** | Annonce de l'homme du match | **Joueurs et coachs de l'équipe du match + tous les Dirigeants habilités, toutes équipes** (PO-NT-22 résolu) | `type = 'match'`, non annulé, vote clos (`isVotingClosed`), **au moins un vote** dans la catégorie. Lauréat(s) = règle de `get_team_mvp` | À la clôture du vote (coup d'envoi + 1 h + 2 j), au prochain passage du job |

4. **Un journal d'envoi** (idempotence). Clé = (compte, convocation, déclencheur, **étape**) :
   - **T1** : deux étapes, « ouverture » et « avant clôture ». Au plus **un** push par étape, donc **deux au plus** par (compte, match).
   - **T2** et **T5** : une seule étape, donc au plus **un** push par (compte, convocation).
   - **T3** suit la règle de 7 jours déjà en place.
5. **T4 — Nouveautés après mise à jour** (détaillé ci-dessous).
6. **Activation par défaut, resynchronisation silencieuse, et alerte unique de repli dans les Nouveautés** (détaillées ci-dessous).

### Activation par défaut — et alerte unique si le navigateur ne le permet pas

**Demande développeuse (2026-10-15)** : les notifications sont **activées par défaut**. Si la permission du navigateur l'empêche, une **alerte** dans la fenêtre « Nouveautés » (`WhatsNewDialog`) renvoie vers **Paramètres > Notifications**, **uniquement pour la prochaine version** : la version qui livre cette feature.

**Ce que le navigateur permet réellement — contrainte à poser avant toute promesse.** « Activé par défaut » ne peut **pas** vouloir dire « l'appareil affiche des push sans que la personne ait jamais accepté » : l'autorisation d'afficher des notifications est accordée par le **système**, jamais par l'application.

| Situation de l'appareil | Ce qui est possible sans geste de l'utilisateur |
|---|---|
| Permission déjà **accordée** (`granted`) pour l'origine | **S'abonner en silence** : aucune fenêtre système. Activation par défaut **réelle** |
| Permission **jamais demandée** (`default`) | **iPhone/iPad (PWA installée), Safari, Firefox** : la demande de permission **exige un geste** (un tap). Sans geste, elle échoue ou est ignorée. **Chrome (Android)** : la demande sans geste est techniquement possible, mais Chrome peut l'afficher en mode « discret » ou la bloquer d'office, et pénalise les sites qui demandent sans geste |
| Permission **refusée** (`denied`) | Rien : seul l'utilisateur peut la rétablir dans les réglages de l'appareil |
| **Non pris en charge** (iPhone hors application installée, navigateur sans Web Push) | Rien |

⚠️ **Conséquence à dire clairement** : au moment où la feature est livrée, presque aucun appareil n'aura déjà la permission `granted` pour l'application. **En pratique, l'alerte de repli sera le chemin principal**, et l'activation silencieuse le cas rare. L'interrupteur des Paramètres reste la seule façon d'obtenir la permission. Une fois la permission obtenue, en revanche, la resynchronisation silencieuse garde l'appareil abonné sans plus jamais demander de clic.

**Mécanisme (défaut, chaque point non tranché est OPEN avec défaut, aucun ne bloque) — deux règles distinctes :**

**Règle A — Resynchronisation silencieuse, à chaque fois (idempotente).** À **chaque lancement connecté** (session connectée, charte acceptée) **et à chaque connexion** :

- si la permission système vaut `granted`, que le Web Push est pris en charge, et qu'**aucun refus explicite** n'est mémorisé pour **ce** compte sur **cet** appareil ;
- alors l'application **s'assure** que l'abonnement de l'appareil **existe** et **appartient au compte connecté** : elle le crée s'il manque (par exemple supprimé côté serveur après une expiration), ou le **réattribue** au compte connecté s'il est rattaché à un autre compte (upsert sur l'`endpoint`) ;
- **sans aucune fenêtre, aucun message, aucun clic**. Si tout est déjà en ordre, rien ne change. Un échec est silencieux et retenté au lancement suivant.

Cette règle n'a **aucune limite de nombre** : elle tourne à chaque lancement connecté et à chaque connexion. Elle ne **demande jamais** la permission (PO-NT-29).

**Règle B — Décision unique de premier lancement et alerte de repli (une seule fois).** Au **premier lancement connecté** après la mise à jour qui livre la feature :

- si la règle A a abouti (abonnement actif) → **rien d'autre** ;
- sinon (permission `default`, `denied`, ou non pris en charge), et sans refus explicite → l'**alerte de repli** est affichée dans la fenêtre « Nouveautés » de la **version de lancement** ;
- cette décision et cette alerte n'ont lieu **qu'une fois** par appareil (marqueur « version vue », AC-NT-19). C'est **la seule** chose limitée à une fois.

**L'alerte de repli** : `WhatsNewDialog` affiche, **dans** la fenêtre et au-dessus des notes de version, une **alerte** avec un bouton qui **ferme la fenêtre et ouvre Paramètres > Notifications** (`/settings`). L'alerte **ne demande pas** la permission elle-même : elle renvoie vers l'interrupteur, comme demandé. C'est là que le tap déclenche la demande système. Elle n'apparaît **que** dans la fenêtre qui présente la **version de lancement** (constante unique, nom indicatif `NOTIFICATIONS_LAUNCH_VERSION`), **ne réapparaît jamais** (ni aux versions suivantes, ni au rechargement, ni en bandeau permanent), et s'affiche une fois avec le lot si la personne a sauté cette version (PO-NT-19, PO-NT-31). **Pas d'alerte** si l'abonnement est déjà actif ou si l'utilisateur a désactivé explicitement.

**Texte exact de l'alerte** (ton du §1bis, un seul emoji, tutoiement, PO-NT-25 résolu). Deux variantes selon la situation, choisies par le ViewModel :

| Situation | Titre | Texte | Bouton |
|---|---|---|---|
| Permission jamais demandée, ou refusée | Active tes notifications 🔔 | Pour ne rien rater de tes convocations et du vote de l'homme du match, active les notifications dans les paramètres. | Ouvrir les paramètres |
| iPhone hors application installée, ou navigateur sans notifications | Active tes notifications 🔔 | Sur cet appareil, une petite étape est nécessaire. On t'explique tout dans les paramètres. | Voir comment faire |

**Ce que ça change aux règles existantes (réconciliation) :**

- **AC-NT-13** (« la permission n'est demandée qu'au tap de l'interrupteur ») **reste vrai** : l'application ne **demande** jamais la permission sans geste ; la règle A ne fait que **s'abonner** quand la permission est **déjà** accordée. L'alerte ne demande rien, elle renvoie vers l'interrupteur.
- **Les 4 états de l'interrupteur** (AC-NT-14) sont **inchangés**. L'interrupteur montre toujours l'**état réel** (permission + abonnement), jamais la préférence par défaut.
- **Refus explicite — toujours prioritaire** : il est **mémorisé** et **jamais annulé automatiquement**. La règle A ne s'applique pas tant qu'il existe, ni à la version suivante, ni après reconnexion (PO-NT-30). Seul un nouveau tap sur l'interrupteur le lève.
- **Déconnexion** : elle ne touche **ni** à la préférence, **ni** au refus explicite, **ni** à l'abonnement (§ « Déconnexion » ci-dessous). La reconnexion déclenche la règle A comme tout lancement connecté.
- **RGPD / consentement** (PO-NT-12, PO-NT-26) : l'autorisation système **reste** le consentement de l'appareil. « Activé par défaut » et la resynchronisation s'appuient dessus et n'en créent aucun nouveau. Validation par le référent RGPD : **PO-NT-32**, avant mise en production.

### Déconnexion — le réglage ne change pas

**Décision développeuse (2026-10-15)** : se déconnecter **ne modifie pas** le réglage des notifications. Principe retenu : **un téléphone = un utilisateur**. Elle **remplace** la règle précédente « la déconnexion supprime l'abonnement de l'appareil » (ancien AC-NT-07), désormais **caduque**.

- **À la déconnexion** : l'abonnement de l'appareil **reste** enregistré et **rattaché au compte**. Aucune suppression côté serveur, aucun désabonnement du navigateur, aucun changement de la préférence ni du refus explicite mémorisé.
- **Conséquence assumée** : les push **continuent d'arriver** sur l'appareil tant que la personne est déconnectée. Un tap sur un push ouvre l'application sur l'écran de connexion (PO-NT-33 pour le retour vers la cible après connexion).
- **Pour arrêter les push** sur un appareil : désactiver l'interrupteur dans Paramètres (session connectée), ou couper les notifications dans les réglages de l'appareil. La **désactivation du compte** les arrête aussi côté serveur (AC-NT-08, inchangé).
- **Même compte qui se reconnecte** : la règle A s'applique. Si l'abonnement est toujours là et lui appartient, rien ne change ; s'il manque (expiré, supprimé), il est **recréé sans clic**.
- **Autre compte qui se connecte sur le même appareil** : la règle A s'applique **pour ce compte**. Permission `granted` et pas de refus explicite de ce compte → l'abonnement de cet `endpoint` lui est **réattribué sans clic** (upsert sur l'`endpoint`). Dès lors, l'ancien compte ne reçoit plus rien sur cet appareil, et le nouveau ne reçoit jamais les push de l'ancien.
- **Autre compte qui se connecte avec un refus explicite mémorisé sur cet appareil** : il n'est pas abonné. Mais l'`endpoint` resterait alors rattaché à l'**ancien** compte, qui continuerait de recevoir ses push sur le téléphone du nouveau. Défaut : à la connexion, l'appareil est **libéré** de l'ancien compte (abonnement supprimé côté serveur, sans abonner le nouveau). **PO-NT-34**, non bloquant.

### T1 — Rappel de vote : deux envois au plus

**Décision développeuse (2026-10-15), PO-NT-03 résolu** : un push à l'ouverture du vote, puis un second 24 h avant sa clôture, **seulement à ceux qui n'ont pas encore voté**, dédoublonnés par le journal d'envoi.

- **Condition réévaluée à chaque étape** : un joueur qui vote après le premier push ne reçoit **pas** le second. Un joueur qui a déjà voté avant l'ouverture… ne le peut pas (le vote n'est pas ouvert) ; un joueur qui vote dans la minute qui suit l'ouverture, avant le passage du job, ne reçoit rien.
- **Match annulé** entre les deux étapes : aucun second push.
- **Joueur ajouté à l'équipe** pendant la fenêtre : il reçoit les étapes encore à venir, jamais une étape déjà passée en rattrapage.
- ⚠️ **Instant d'« ouverture » — à préciser, sans bloquer** : `isVotingOpen` ouvre le vote **dès le coup d'envoi**, donc pendant le match. Un push à cet instant tomberait pendant que les joueurs jouent. `player-vote-rules.ts` décrit par ailleurs coup d'envoi + `VOTING_DEADLINE_START_OFFSET_HOURS` (1 h) comme « la fin du match, à peu près ». **PO-NT-28**, défaut : premier push à coup d'envoi + 1 h. La règle d'ouverture du vote elle-même (`isVotingOpen`) **n'est pas modifiée**.
- **Fenêtre** : avec une clôture à coup d'envoi + 1 h + 2 j, les deux étapes sont espacées d'environ 1 jour. Les deux constantes restent dans `domain/policies/`, miroir SQL manuel.

### Tuile « Paramètres » et écran Paramètres

**Décision développeuse (2026-10-15), PO-NT-01 résolu.** Elle **remplace** le défaut proposé précédemment (« contrôle Notifications dans le Profil »), qui est **caduc**.

**Tuile dans le Menu**

- Une tuile **« Paramètres »**, **tout en bas** du Menu : après la dernière section (« Services externes »), au-dessus du bouton de déconnexion et de la ligne de version, qui restent en pied d'écran. Même patron que les autres entrées (`MenuNavCard` : icône, titre, sous-titre court).
- Rendue pour **les 8 rôles, à l'identique**, sans condition de permission (AC-MN-01, AC-MN-17 : le Menu ne dépend d'aucune donnée de l'utilisateur).
- Elle mène à un **écran qui existe** : AC-MN-02 respecté.
- Sous une section propre (ex. entête « Application ») ou sans entête : choix de conception, laissé à designer-agent (AC-MN-11 : pas d'entête sans entrée).

**Écran Paramètres**

- **Route poussée nouvelle** (`/settings`, nom indicatif), hors `AppShell`, **sans `BottomNav`**, au même niveau que `/profile`, `/stats`, `/team-stats`, `/leaderboard`, `/legacy` et `/alerts` dans `router.tsx`. `BottomNav` n'est pas modifié (AC-MN-12).
- En-tête `BackHeader` « Paramètres », `sticky top-0`, fond opaque (`CLAUDE.md` §6).
- **Une seule section dans cette passe : « Notifications ».** Aucun autre réglage (thème, langue, compte…) n'est ajouté : l'écran naît avec une seule section, sans réglages factices.
- C'est aussi la **cible** de l'alerte unique des Nouveautés (§ « Activation par défaut »).

**Section « Notifications »**

- **Un interrupteur** pour activer ou désactiver les notifications **sur cet appareil** (un abonnement push est propre à un appareil : le texte doit le dire).
  - Activer : demande la permission système si elle n'est pas déjà accordée (geste explicite : AC-NT-13), enregistre l'abonnement pour le compte connecté, et **efface le refus explicite** mémorisé.
  - Désactiver : supprime l'abonnement de cet appareil côté serveur, et **mémorise ce refus explicite** pour que la resynchronisation silencieuse ne le contourne jamais.
- **Les quatre états** d'AC-NT-14 sont rendus ici : activé ; désactivé ; refusé par le système (indication de passer par les réglages de l'appareil) ; non pris en charge (navigateur, ou iPhone sans application installée, PO-NT-02).
- **Description des notifications reçues** : une phrase courte sous l'interrupteur, et la **liste détaillée** derrière un petit **« i »** si elle est trop dense (choix de densité laissé à designer-agent). La liste couvre les push réels :
  - rappel de vote pour l'homme du match, à l'ouverture du vote puis la veille de sa clôture si l'on n'a pas voté (T1) ;
  - convocation sans réponse, 24 h avant un match ou une réunion, 12 h avant un entraînement (T2) ;
  - rappel de cotisation, quand le trésorier en envoie un (T3) ;
  - annonce de l'homme du match (T5).
  Les **nouveautés de version** (T4) sont **in-app**, pas des push (PO-NT-21) : elles ne figurent pas dans cette liste, ou y figurent avec la mention « dans l'application », au choix de la conception.
- **Information sur la déconnexion** : le détail du « i » dit que **les notifications continuent d'arriver après une déconnexion**, et qu'on les arrête ici (texte par défaut de PO-NT-32 : « Elles continuent d'arriver même si tu te déconnectes. Pour les arrêter, désactive-les ici. »).
- **Description identique pour tous, ou adaptée aux rôles du compte** (un coach seul ne reçoit ni T1 ni T2) ? **OPEN — PO-NT-27** (défaut : liste identique pour tous, avec la mention « selon tes rôles »).
- **Le « i »** ouvre un contenu lisible au doigt (feuille ou popover), **pas une infobulle au survol**, qui n'existe pas sur mobile. Cible ≥ `h-11`, `aria-label` explicite.
- **Un seul interrupteur global** : aucun réglage par type dans cette passe (PO-NT-05 inchangé).

**Amendement à porter dans `specs/menu.md`** (proposé, **non appliqué** — on n'écrase pas une spec existante) : le Menu gagne une entrée interne « Paramètres » vers `/settings`, rendue pour tous les rôles. AC-MN-01, 02, 11, 12, 15 et 17 restent vrais tels quels. La règle « le Menu ne lit aucune donnée » (§1 de `menu.md`) reste vraie : la tuile est statique, c'est l'écran Paramètres qui lit l'état de l'abonnement. AC-MN-08 (déconnexion) est inchangé : la déconnexion ne touche pas aux notifications.

### T5 — Annonce de l'homme du match

**Règle de lauréat — réemployée, jamais redéfinie.** `get_team_mvp` (`20261012093753_get_team_mvp_rpc.sql`) fixe déjà : clôture = coup d'envoi + 1 h + 2 j (miroir manuel de `getVotingDeadline`), candidat(s) au plus grand nombre de votes, **égalité = tous les ex æquo**, aucun lauréat si aucun vote. T5 applique cette règle **au match qui vient de clore**, pas « au dernier match clos » de l'équipe : un match plus ancien clos en retard ne doit pas être annoncé à la place. La logique de sélection doit donc être factorisée (même règle, deux usages), jamais recopiée.

**Destinataires — décision développeuse (2026-10-15), PO-NT-22 résolu** :

- **tous les joueurs** de l'équipe du match (rôle `player` sur l'équipe, convoqués ou non) ;
- **tous les coachs** de l'équipe du match (rôle `coach` sur l'équipe) ;
- **tous les Dirigeants habilités** du club, **pour toutes les équipes** (un push par match clos de chaque équipe).

**Ne reçoivent pas T5** à ce seul titre : Responsable de section, Trésorier, Référent médical, Bénévole, Administrateur. Ils le reçoivent s'ils portent aussi l'un des trois titres ci-dessus. Tous les destinataires retenus sont **dans** la frontière de lecture actuelle de `get_team_mvp` (membre de l'équipe, Dirigeant habilité) : **aucun élargissement** de cette frontière.

⚠️ **Écart avec `specs/player-vote.md` à consigner** : PO-PV-09 dit qu'aucun lauréat n'est persisté et qu'aucune règle d'ex æquo n'existe. Le code a depuis tranché les ex æquo (`get_team_mvp` : tous les ex æquo). T5 s'appuie sur ce **comportement réel du code**, sans persister de lauréat. Mise à jour de PO-PV-09 dans `player-vote.md` : **proposée, non appliquée**.

**Points de bord :**

- **Aucun vote** → aucun lauréat → **aucun push T5**.
- **Égalité** : la règle de lauréat est fixée (tous les ex æquo). La **formulation** d'une égalité est **OPEN — PO-NT-23**. Défaut : tous les noms, avec une formulation d'égalité.
- **Libellé de la catégorie** : il vient de `vote_categories` (valeur en base, `domain/entities/vote.ts`), jamais écrit en dur.
- **Aucun décompte de voix** dans le push (ni « 7 votes », ni écart) : seul le nom du ou des lauréats. Même minimisation qu'AC-PV-10.
- **Publication des résultats** (PO-PV-07, toujours ouvert) : T5 n'intervient **qu'après clôture**, donc il ne tranche pas et n'aggrave pas PO-PV-07.
- **Compte cumulant plusieurs titres** (joueur et coach de l'équipe, Dirigeant habilité) : **un seul** push.
- **Volume** : un Dirigeant habilité reçoit une annonce par match clos de **chaque** équipe du club. C'est voulu ; l'effet sur les quotas gratuits est suivi par PO-NT-15.
- **Lauréat lui-même** : même texte que les autres, ou texte dédié ? **OPEN — PO-NT-23.**

### T4 — Nouveautés après mise à jour

**Ce qui est demandé** : quand une nouvelle version de la PWA est déployée, l'utilisateur en est informé, avec **le détail des nouveautés de cette version**.

**Source des nouveautés — réemployée, jamais redéfinie** : la section `## [x.y.z]` de `CHANGELOG.md`, lue par `parseMobileChangelog` (sections `### Mobile` uniquement, groupes par rôle). Le format reste celui du skill `release-version`. Aucun second fichier de notes, aucun texte saisi ailleurs.

**Décision développeuse (2026-10-15), PO-NT-17 résolu : on garde `registerType: 'autoUpdate'`.** Le nouveau service worker s'active seul et la page se recharge, comme aujourd'hui. **Après ce rechargement**, le nouveau bundle compare `APP_VERSION` à la dernière version vue sur l'appareil et affiche les nouveautés. Conséquences :

- **Pas de passage en mode `prompt`**, pas d'état « mise à jour disponible », pas de bouton « Mettre à jour », pas de report possible. Le cycle de mise à jour de l'application ne change pas.
- **Pas de fichier de notes séparé** : les notes sont celles du bundle qui vient d'être chargé, déjà intégrées à son build (PO-NT-18 résolu par voie de conséquence).
- ⚠️ **Risque déjà présent, signalé et non introduit** : le rechargement automatique peut faire perdre une saisie en cours. Cette feature ne le corrige pas et ne l'aggrave pas.

**Règles posées :**

- **Une seule fois par version et par appareil** : une fois les nouveautés fermées, elles ne réapparaissent pas pour cette version. Le marqueur est **local à l'appareil** (dernière version vue), jamais en base. Sur un appareil neuf : **OPEN — PO-NT-19** (défaut : rien au premier lancement, on enregistre la version sans l'afficher).
- **Versions sautées** (1.0.0 → 1.2.0) : **OPEN — PO-NT-19** (défaut : toutes les versions plus récentes que la dernière vue, de la plus récente à la plus ancienne).
- **Version sans section `### Mobile`** (changement uniquement backoffice) : `parseMobileChangelog` l'écarte déjà. **Aucune annonce.**
- **Groupes par rôle** : **OPEN — PO-NT-20** (défaut : tous les groupes, comme `ChangelogDialog`).
- **In-app seulement** : pas de push T4 par défaut (PO-NT-21).
- **Version de lancement de la feature** : sa section `CHANGELOG.md` doit contenir une entrée `### Mobile`, sinon aucune fenêtre ne s'ouvre et l'alerte d'activation ne pourrait pas s'afficher (AC-NT-41). Sa fenêtre porte en plus l'**alerte unique d'activation** si l'activation par défaut n'a pas abouti (§ « Activation par défaut », règle B).

### Points de bord T1–T3, à ne pas régler « au feeling »

- **Conditions réévaluées à l'envoi**, jamais figées à la planification : une convocation annulée, une réponse donnée ou un vote exprimé entre-temps annule le push.
- **T2 et l'échéance de réponse** : les seuils (24 h / 12 h) tombent avant l'échéance (match 60 min, entraînement 10 min, réunion 60 min **encore OPEN** dans `response-deadline.ts`). Le push n'est jamais envoyé si `canPlayerRespond` est faux.
- **Convocation créée, ou convoqué ajouté, après le seuil** : **OPEN — PO-NT-04.**
- **Date de convocation modifiée après un premier push T2** : **OPEN — PO-NT-04.**
- **Joueur non convoqué** : jamais de T2 (PO-CPS-03). Il reste destinataire de T1 et de T5, car il vote.
- **Compte multi-rôles** : le push vise le **compte**, pas le rôle actif. Le tap ouvre la cible (`/convocations/:id`, ou le Dashboard pour T3). Bascule automatique du rôle actif ? **OPEN — PO-NT-07.**
- **Push non garanti** : un push peut être retardé, perdu ou bloqué par l'OS. **L'in-app reste la source de vérité.**

### Hors périmètre — explicitement

- **Push des alertes coach** (signaux A, B, C de `coach-alerts.md`) : AC-AL-13 inchangé.
- **Notification à la création d'une convocation ou à l'ajout d'un convoqué** (`create-convocation.md` PO-CV-06, `convocation-player-selection.md` §1).
- **Relance automatique ou planifiée des cotisations**, échéancier. T3 ne part **que** d'une relance manuelle du Trésorier.
- **Relance manuelle des indécis par le coach** (`coach-dashboard.md` PO-4, toujours écartée).
- **Plus de deux rappels de vote** par personne et par match (PO-NT-03).
- **Modification de la règle d'ouverture du vote** (`isVotingOpen`) : PO-NT-28 ne porte que sur l'instant du push.
- **Demande de permission système sans geste** de l'utilisateur, sur tout navigateur (PO-NT-29, défaut). La resynchronisation silencieuse **s'abonne**, elle ne **demande** jamais.
- **Bandeau permanent, rappel répété ou relance** d'activation des notifications : l'alerte de repli est **unique**, liée à la version de lancement, dans la seule fenêtre « Nouveautés ». Aucune autre surface (Dashboard, Menu, Profil) n'incite à activer.
- **Suppression ou suspension de l'abonnement à la déconnexion** (décision du 2026-10-15), et toute confirmation « Garder les notifications ? » au moment de se déconnecter.
- **Persistance d'un lauréat**, palmarès de saison, points Legacy liés au titre (PO-PV-09, AC-PV-15).
- **Annonce d'une catégorie de vote autre que `man_of_the_match`**, et toute annonce pour un entraînement ou une réunion (PO-PV-08).
- **Autres réglages dans l'écran Paramètres** (thème, langue, compte, confidentialité) : l'écran ne porte que la section Notifications.
- **Interrupteur de notifications dans le Profil** : écarté par la décision du 2026-10-15.
- **Mode `prompt`** du service worker, bouton « Mettre à jour », report d'une mise à jour, fichier de notes séparé (PO-NT-17 résolu).
- **E-mail, SMS**, communication ciblée rédigée par un rôle, annonces.
- **Boîte de réception / écran « Notifications »**, historique, badge de Menu, badge d'icône PWA (`setAppBadge`) — PO-TR-12 reconduit, voir PO-NT-08.
- **Préférences par type de notification** (PO-NT-05) et **heures de silence** (PO-NT-09).
- **Backoffice web** : aucun push, aucune annonce de version côté desktop (les sections `### Web` du changelog restent masquées).
- **Modification du format de `CHANGELOG.md`** ou du skill `release-version`.
- **Mise à jour forcée**.
- **Candidats « etc. »**, non décidés (PO-NT-10) : convocation annulée ou déplacée ; composition publiée ; mission bénévole ; actu publiée ; pièce manquante.

## 1bis. Ton et rédaction des notifications

**Règle de la développeuse** : textes **conviviaux**, **légers**, avec **peu d'emojis**, en français. Cette section donne un cadre et un exemple par type. Elle **ne fixe pas** le texte final (PO-NT-11). Elle s'applique aussi aux textes de l'écran Paramètres (description des notifications) et à l'alerte d'activation.

**Principes**

- **Court** : un titre de quelques mots, une phrase de corps. L'essentiel doit tenir sur un écran verrouillé, où le texte est souvent tronqué.
- **Convivial, jamais culpabilisant** : on invite (« Un petit clic suffit »), on n'accuse pas (pas de « Tu n'as toujours pas répondu »). Pas de majuscules criées, pas de points d'exclamation en série. Le second rappel de vote reste aussi léger que le premier.
- **Peu d'emojis** : **un au maximum** par notification, facultatif. Un emoji ne porte jamais seul le sens (les lecteurs d'écran le lisent à voix haute, certains appareils l'affichent mal).
- **Registre sobre pour l'argent** : **aucun emoji** et aucune plaisanterie dans T3. Même registre que le bandeau de `mobile-treasurer` §H.
- **Concret** : le type d'événement et le moment (« ce soir », « demain à 15 h ») plutôt qu'une date brute, quand le fuseau le permet (PO-NT-16).
- **Contenu borné par le §3** : pas de montant, pas de motif d'absence, pas de donnée de santé. Seul T5 nomme une personne : le ou les lauréats.
- **Tutoiement** : **RÉSOLU — PO-NT-25** (décision de la développeuse). Tous les textes de la fonctionnalité tutoient.
- **Libellé de catégorie de vote** : lu en base, jamais écrit en dur (T1, T5).

**Exemples indicatifs** (placeholders entre accolades, aucun nom réel)

| Type | Titre | Corps |
|---|---|---|
| T1 — ouverture du vote | 🏆 À toi de voter | Qui a été l'{homme du match} contre {adversaire} ? Le vote est ouvert. |
| T1 — 24 h avant la clôture | Dernier jour pour voter | Il reste 24 h pour élire l'{homme du match} contre {adversaire}. Un petit clic suffit. |
| T2 — match ou réunion | {Match} demain à {heure} | Tu seras de la partie ? Réponds à ta convocation, un petit clic suffit. |
| T2 — entraînement | Entraînement ce soir à {heure} | Présent ou absent ? Dis-le à ton coach en un clic. |
| T3 — cotisation | Rappel de cotisation | Un petit point sur ta cotisation t'attend dans l'application. |
| T4 — nouveautés (in-app) | Du nouveau dans l'appli ✨ | Voici ce qui change avec la version {x.y.z}. |
| T5 — homme du match | 🏆 {Homme du match} contre {adversaire} | Bravo à {Prénom Nom} ! |
| T5 — égalité | 🏆 Égalité au vote contre {adversaire} | Bravo à {Prénom Nom} et {Prénom Nom}, élus ex æquo ! |
| Paramètres — description | Notifications | Reçois sur cet appareil tes rappels de convocation, de vote et de cotisation, et l'annonce de l'homme du match. |
| Paramètres — déconnexion (dans le « i ») | — | Elles continuent d'arriver même si tu te déconnectes. Pour les arrêter, désactive-les ici. |
| Alerte d'activation (in-app, unique) | Active tes notifications 🔔 | Voir le texte exact et ses deux variantes au §1 « Activation par défaut » |

⚠️ La fenêtre « Nouveautés » de la version de lancement porterait **deux** emojis (✨ dans son titre, 🔔 dans l'alerte). La règle « un au maximum » vaut **par texte** ; la conception a choisi de retirer le ✨ quand l'alerte est présente (voir « UI design »).

## 2. RBAC

### Lecture de la matrice

La matrice CDC n'a **aucune ligne** « recevoir une notification », « s'abonner au push » ou « accéder aux paramètres ». Les lignes voisines :

| Ligne CDC | Joueur | Coach | Resp. section | Dirigeant | Trésorier | Réf. médical | Bénévole | Admin | Pertinence ici |
|---|---|---|---|---|---|---|---|---|---|
| Envoyer une communication ciblée | ❌ | ✅ (son équipe) | ✅ (sa section) | ✅ | ❌ | ❌ | ❌ | ✅ | **Non consommée.** T1, T2, T4 et T5 sont émis par le **système**, pas par un rôle. Aucun rôle n'envoie de push à la main dans cette feature |
| Gérer échéanciers et relances | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ (paramétrage) | Fonde déjà `'dues:remind': ['treasurer']`. **Inchangée** : T3 est un effet de cette action, pas une nouvelle action |
| Voir les dossiers des autres membres | ❌ | ❌ (son équipe, hors financier) | ✅ (sa section) | ✅ | ❌ (financier seulement) | ❌ (santé seulement, tracé) | ❌ | ✅ | Fonde le droit du Dirigeant habilité à recevoir le **nom** d'un lauréat de n'importe quelle équipe (T5), et du coach à le recevoir pour **son** équipe |
| Voir son propre profil/dossier | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Fonde la gestion de **ses propres** abonnements push depuis l'écran Paramètres, et l'abonnement par défaut et la resynchronisation de **son propre** appareil |
| Gérer comptes, rôles, paramétrage | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | **Sans rapport** : le « paramétrage » du CDC est celui du club (administration). L'écran « Paramètres » de cette feature ne règle que **ses propres** notifications. Il n'ouvre **aucun** paramétrage du club, et n'est donc pas réservé à l'administrateur |

**Frontière de lecture déjà en place pour T5** : `get_team_mvp` et `get_vote_tally` sont lisibles par un **membre de l'équipe**, un **Dirigeant habilité** (`authorized-officer`) ou un **administrateur**. Les destinataires retenus par PO-NT-22 (joueurs et coachs de l'équipe, Dirigeants habilités) en sont un sous-ensemble : **aucun élargissement**.

### Par rôle

| Rôle | Traduction |
|---|---|
| Tous les rôles | Voient la tuile « Paramètres » et l'écran Paramètres, à l'identique. Y gèrent l'abonnement **de leur appareil**, activé par défaut quand le navigateur le permet, **conservé à la déconnexion** et **resynchronisé sans clic** à chaque lancement connecté. Voient **T4**, et l'alerte unique d'activation si elle s'applique |
| Joueur / Joueuse | Reçoit **T1** (joueur de l'équipe du match, deux push au plus par vote, seulement s'il n'a pas voté), **T2** (convoqué) et **T5** (joueur de l'équipe du match, convoqué ou non). Reçoit **T3** s'il est titulaire d'une adhésion relancée |
| Coach / Staff | Ne reçoit ni T1 ni T2 **au titre de coach** (il ne vote pas, il n'est jamais convoqué). **Reçoit T5 pour chaque équipe dont il est coach** (PO-NT-22). Reçoit T3 si relancé. Les reçoit tous si son compte porte aussi un rôle joueur |
| Dirigeant habilité | **Reçoit T5 pour toutes les équipes du club** (PO-NT-22). T3 si relancé |
| Responsable de section | **Ne reçoit pas T5** à ce titre (PO-NT-22), sauf s'il est aussi joueur ou coach de l'équipe, ou Dirigeant habilité. T3 si relancé |
| Trésorier | Déclenche T3 par la relance existante (`dues:remind`, inchangée). Ne voit **jamais** si un push a été remis, ni si le membre est abonné. Reçoit T3 s'il est lui-même relancé (PO-TR-10 étendu). Pas de T5 à ce titre |
| Référent médical, Bénévole, Administrateur | **T3** s'ils sont titulaires d'une adhésion relancée. **Pas de T5** à ce titre (PO-NT-22) |

**Rôle « porté » et non « actif »** : les destinataires des push se lisent sur les rôles **portés** par le compte (`user_roles`), jamais sur le rôle actif de l'interface. **Ni la session ni la déconnexion** n'interviennent dans le calcul des destinataires : un compte déconnecté reste destinataire de ses push sur l'appareil abonné, tant qu'un autre compte ne l'a pas repris.

### Actions et politiques

- **Aucune nouvelle entrée dans `rbac-matrix.ts`, `actions.ts` ni `can.ts`** (AC-NT-01). La tuile « Paramètres » n'a besoin d'aucun `can()` : elle est rendue pour tout compte, comme le reste du Menu. L'écran Paramètres, l'activation par défaut et la resynchronisation lisent et écrivent **ses propres** abonnements. Les destinataires de T1/T2/T3/T5 sont calculés **côté serveur**.
- **Abonnements** : RLS `select/delete` limitée à `user_id = auth.uid()`. Aucune lecture des abonnements d'autrui, **administrateur compris**.
- ⚠️ **Réattribution et libération d'un `endpoint`** : la resynchronisation (règle A) doit pouvoir **reprendre** une ligne qui appartient à **un autre** compte, et le cas PO-NT-34 doit pouvoir la **libérer**. Une politique RLS « propre ligne » ne le permet pas, et l'ouvrir permettrait à n'importe qui de modifier l'abonnement d'autrui. Ces deux écritures passent donc par des **fonctions `security definer`** (noms indicatifs `register_push_subscription`, `release_push_endpoint`) qui : prennent l'appelant depuis `auth.uid()` (jamais en paramètre) ; n'agissent que sur l'`endpoint` **que l'appareil présente** (il le détient, donc il est sur cet appareil) ; **ne renvoient rien** sur le compte précédent (aucune fuite d'identité). Aucune entrée de matrice : ce sont des écritures sur l'appareil de l'appelant, comme `notifications_update_own_read`.
- **Journal d'envoi** : aucune politique pour `authenticated`. Écrit et lu seulement par la fonction d'envoi (`security definer` ou rôle de service côté Edge Function).
- **Clé privée VAPID** : secret de l'Edge Function uniquement. **Jamais** dans une variable `VITE_` (`CLAUDE.md` §7). Seule la clé publique VAPID peut être dans le bundle client.
- AC-01 / AC-02 (CDC §17.2) s'appliquent au **contenu** des push : un push ne porte jamais de donnée d'un membre que son destinataire ne pourrait pas déjà lire in-app.

## 3. Données sensibles

### Santé — aucune

Aucun push ne porte une indisponibilité, un motif d'absence (`ConvocationResponse.reason`, `unavailabilities.kind`) ni une aptitude. T2 ne mentionne jamais pourquoi un joueur n'a pas répondu.

### Financier — oui, pour T3

- T3 **signale une relance de cotisation** : c'est une donnée financière du membre lui-même.
- ⚠️ **Écran verrouillé** : un push s'affiche sur l'écran verrouillé, visible par un tiers. Le texte de T3 **ne porte ni montant, ni saison détaillée, ni nom d'expéditeur** (AC-NT-09). Le montant reste lu in-app (`DuesReminderBanner`, AC-TR-39). Texte exact : PO-NT-11.
- **Amendement à porter dans `specs/mobile-treasurer.md`** (proposé, **non appliqué**) : le non-objectif « push (Web Push, service worker) » de l'amendement (4) §A et **AC-TR-43** deviennent « aucun e-mail, SMS, badge d'icône, Realtime ni polling ; un push T3 est envoyé selon `specs/mob-notifications.md` ». La confirmation du Trésorier (« Chacun verra un rappel de cotisation dans l'application ») doit mentionner le push : texte à revoir (PO-NT-11).

### Données personnelles de tiers — oui, pour T5

- T5 est **la seule notification qui nomme une personne** : le ou les lauréats. Ce nom est déjà lisible in-app par les mêmes destinataires (étoile du joueur du match, `get_team_mvp`).
- ⚠️ **Écran verrouillé et diffusion** : le nom apparaît sur l'écran verrouillé de chaque destinataire, y compris de **tous les Dirigeants habilités** (PO-NT-22). Avec l'**activation par défaut** et le **maintien à la déconnexion**, ce nom atteint plus d'écrans verrouillés, y compris de téléphones dont le titulaire s'est déconnecté. Refus d'être nommé, cas des joueurs mineurs : **OPEN — PO-NT-26**, avec le référent RGPD (rejoint PO-PV-07).
- **Jamais** : le nombre de voix, l'écart, l'identité d'un votant, une candidature non élue (AC-PV-10).

### T4, alerte d'activation et écran Paramètres — aucune donnée sensible

Les notes de version sont publiques au sein de l'application et ne portent aucun nom (règle du skill `release-version`). Les marqueurs « dernière version vue » et « refus explicite » sont stockés **sur l'appareil** et ne sont pas envoyés au serveur. L'écran Paramètres n'affiche que l'état de l'abonnement **de l'appareil courant** : ni la liste des autres appareils du compte, ni leur `endpoint`.

### Consentement — activation par défaut, resynchronisation et déconnexion

- L'**autorisation système** reste le consentement de l'appareil : l'application ne l'obtient **jamais** sans geste. La resynchronisation silencieuse ne fait que **s'abonner** quand elle est **déjà** accordée.
- Un refus explicite dans Paramètres est **mémorisé** et **respecté** sans exception, y compris par la resynchronisation.
- ⚠️ **Push reçus en étant déconnecté** (décision « un téléphone = un utilisateur ») : après une déconnexion, l'appareil continue d'afficher sur l'écran verrouillé des rappels de convocation et de vote, un **signal de relance de cotisation** (T3, sans montant) et le **nom** du lauréat (T5). Si le téléphone change de mains sans désactivation ni connexion d'un autre compte, ces push atteignent **un tiers**. Mesures par défaut : (a) information dans le « i » (« Elles continuent d'arriver même si tu te déconnectes. Pour les arrêter, désactive-les ici. ») ; (b) la désactivation du compte coupe tout envoi (AC-NT-08) ; (c) la **connexion d'un autre compte** reprend l'appareil sans clic (règle A), ou le libère s'il a un refus explicite (PO-NT-34). **À valider par le référent RGPD — PO-NT-32**, avant mise en production, non bloquant.
- ⚠️ « Activé par défaut » et resynchronisation silencieuse sur une permission déjà accordée, pour des rappels de service et l'annonce nominative T5 : **à valider par le référent RGPD** (base légale, information préalable des membres, suffisance du texte du « i ») — **PO-NT-32**. Rejoint PO-NT-12 et PO-NT-26.

### Données personnelles et sous-traitants

- **Abonnement push** (`endpoint`, clés `p256dh` / `auth`) : identifiant d'appareil, donc **donnée personnelle**, rattachée au compte connecté. Minimisation : ni modèle d'appareil, ni localisation.
- ⚠️ **Les push transitent par les services des éditeurs** (Google, Apple, Mozilla). La charge est chiffrée de bout en bout (norme Web Push), mais ces services voient l'existence et l'heure des envois. **À valider par le référent RGPD, toujours non désigné** — PO-NT-12. L'écran Paramètres est l'endroit naturel pour l'information des membres (texte du « i »).
- **Contenu minimal** : aucun nom de personne hors lauréat(s) de T5. Un nom d'adversaire (club) et une date sont admis pour T1, T2 et T5.
- **Déconnexion** : l'abonnement est **conservé** (§1 « Déconnexion »). **Appareil repris par un autre compte** : l'`endpoint` lui est réattribué sans clic (règle A) ; le compte précédent ne reçoit plus rien sur cet appareil, et le nouveau ne reçoit jamais les push du précédent (AC-NT-07).
- **Compte désactivé** (révocation immédiate, CDC §3.1) : plus aucun push, dès la désactivation (AC-NT-08).
- **Analytics / observabilité** : le contenu d'un push et l'`endpoint` ne sont jamais envoyés à l'outil d'analytics ni aux journaux d'erreur.

### Journal d'audit

- **CDC §11.3** : aucune des actions de cette feature n'y figure.
- **T3** : la relance est **déjà tracée** (`dues.reminder_sent`). Le push n'ajoute **aucun** code d'audit.
- **Activation par défaut, resynchronisation, activation / désactivation depuis Paramètres, réattribution ou libération d'un `endpoint`, affichage des nouveautés et de l'alerte** : non tracés (donnée du compte ou de l'appareil, même position que la lecture des notifications, `mobile-treasurer` §E).
- Le **journal d'envoi** sert à l'idempotence, **pas** à l'audit (PO-NT-13).

### Rétention (Supabase, jamais `domain/`)

| Donnée | Proposition | Statut |
|---|---|---|
| Abonnements push | Supprimés à la désactivation dans Paramètres, à la désactivation du compte, à la libération d'un appareil (PO-NT-34), et dès que le service push répond « abonnement expiré » (HTTP 404/410) — recréés ensuite par la resynchronisation si la permission est toujours accordée. Réattribués (pas dupliqués) quand un autre compte se connecte avec le même `endpoint`. **Conservés à la déconnexion.** Purge des abonnements inutilisés depuis N mois | Durée : PO-NT-14 |
| Journal d'envoi | Purgeable après la fin de la fenêtre utile (convocation passée, vote clos et annoncé) + marge courte | Durée : PO-NT-14 |

Purge par job planifié Supabase, **aucune logique d'expiration dans `domain/`** (`CLAUDE.md` §6). `docs/RETENTION_PURGE.md` devra recevoir ces deux catégories : à faire par la développeuse. T4 et l'alerte d'activation ne stockent rien en base.

## 4. Critères d'acceptation

`AC-01`/`AC-02` sont ceux du CDC §17.2. Critères propres préfixés **`AC-NT-`**.

**Droits et sécurité**

| Réf. | Critère |
|---|---|
| AC-01 / AC-02 | Aucun push ne porte une donnée d'un membre que son destinataire ne peut pas déjà lire in-app. Vérifié sur la charge envoyée, pas seulement sur l'affichage |
| AC-NT-01 | Aucune modification de `rbac-matrix.ts`, `actions.ts` ni `can.ts`. Vérifiable par diff |
| AC-NT-02 | Contre la base : un compte ne lit et ne supprime que **ses propres** abonnements, administrateur compris. L'enregistrement et la libération passent par les fonctions dédiées, qui n'agissent **que** pour `auth.uid()` et sur l'`endpoint` fourni, et ne révèlent jamais le compte qui détenait l'`endpoint` auparavant. Aucun rôle authentifié ne lit ni n'écrit le journal d'envoi |
| AC-NT-03 | La clé privée VAPID n'apparaît dans aucune variable `VITE_` ni dans le bundle client (inspection du build) |

**Déclencheurs T1–T3**

| Réf. | Critère |
|---|---|
| AC-NT-04 | **T2** : un convoqué sans réponse, sur une convocation `open` non annulée, reçoit **un** push entre le seuil (24 h avant un match ou une réunion, 12 h avant un entraînement) et le seuil + tolérance du job (PO-NT-15). Aucun push si une réponse existe, si la convocation est annulée, si `canPlayerRespond` est faux, ou si le compte n'est pas convoqué. Les seuils sont une **constante unique du domaine**, testée par Vitest, avec **miroir SQL manuel** commenté des deux côtés |
| AC-NT-05 | **T1** : un joueur de l'équipe qui n'a pas voté reçoit un push **à l'ouverture du vote** (instant de PO-NT-28) et un second **24 h avant la clôture**, chacun dans la tolérance du job (PO-NT-15). **Deux push au plus** par (compte, match). Un joueur qui vote entre les deux ne reçoit pas le second. Aucun push si le match est annulé, si le vote est déjà exprimé, ou hors de la fenêtre (`isVotingOpen` et non `isVotingClosed`, réemployés et mirrorés). Les deux instants sont des constantes du domaine, testées par Vitest, avec miroir SQL manuel |
| AC-NT-06 | **T3** : chaque relance de résultat `'sent'` produit un push vers tous les appareils abonnés du titulaire. Une relance écartée n'en produit aucun. Un échec d'envoi push **n'annule pas** la relance ni l'alerte in-app |
| AC-NT-07 | **Déconnexion sans effet, reconnexion sans clic** : se déconnecter ne supprime pas l'abonnement de l'appareil, ne modifie ni la préférence ni le refus explicite mémorisé, et les push continuent d'arriver. À la reconnexion du **même** compte, l'interrupteur montre le même état qu'avant, et un abonnement manquant est recréé sans clic (AC-NT-37). À la connexion d'un **autre** compte sur le même appareil, permission `granted` et sans refus explicite de ce compte, l'abonnement de cet `endpoint` lui est **réattribué sans clic** : vérifié contre la base, une seule ligne pour cet `endpoint`, rattachée au nouveau compte, et aucun push destiné à l'ancien compte n'arrive plus sur cet appareil |
| AC-NT-08 | Un compte désactivé ne reçoit plus aucun push dès la désactivation, qu'il soit connecté ou non sur l'appareil |
| AC-NT-09 | Aucun push ne contient : montant, motif d'absence, donnée de santé, nombre de voix, identité d'un votant. **Aucun nom de personne**, à la seule exception du ou des lauréats dans T5 |
| AC-NT-10 | **Idempotence**, par le journal d'envoi, même si le job s'exécute plusieurs fois ou en parallèle : au plus **un push par étape** de T1 (« ouverture », « avant clôture »), soit **deux au plus** par (compte, match) ; au plus **un** push T2 par (compte, convocation) ; au plus **un** push T5 par (compte, match). Vérifié contre la base |
| AC-NT-11 | Un abonnement que le service push déclare expiré (404/410) est supprimé et n'est plus sollicité ; la resynchronisation suivante le recrée si la permission est toujours accordée |
| AC-NT-12 | Taper un push ouvre l'application sur la cible : `/convocations/:id` pour T1 (onglet vote si possible), T2 et T5, Dashboard pour T3. Application fermée ou ouverte. **Session déconnectée** : l'écran de connexion s'ouvre, puis selon PO-NT-33 |

**T5 — homme du match**

| Réf. | Critère |
|---|---|
| AC-NT-25 | À la clôture du vote d'un match non annulé ayant reçu au moins un vote, reçoivent **un** push T5, dans la tolérance du job (PO-NT-15) : **tous les joueurs** de l'équipe du match, **tous les coachs** de l'équipe du match, et **tous les Dirigeants habilités** du club, quelle que soit l'équipe. Aucun autre compte au seul titre de Responsable de section, Trésorier, Référent médical, Bénévole ou Administrateur. Aucun push si le match est annulé ou n'a reçu aucun vote |
| AC-NT-26 | Le ou les lauréats annoncés sont **exactement** ceux que donne la règle de `get_team_mvp` appliquée **à ce match** : plus grand nombre de voix, **tous les ex æquo**. Une seule implémentation sert l'étoile in-app et T5. Cas de test : un lauréat, égalité à deux, aucun vote, match annulé, match plus ancien clos plus tard |
| AC-NT-27 | Les destinataires sont lus sur les rôles **portés**. Un compte qui cumule plusieurs titres (joueur, coach de l'équipe, Dirigeant habilité) reçoit **un seul** push. Aucun destinataire hors de la frontière de lecture de `get_team_mvp` |
| AC-NT-28 | Le libellé de catégorie vient de `vote_categories`. Le push ne porte ni nombre de voix, ni écart, ni candidat non élu |

**Ton et rédaction**

| Réf. | Critère |
|---|---|
| AC-NT-29 | Chaque texte de notification, de l'écran Paramètres et de l'alerte d'activation respecte le §1bis : court, **au plus un emoji par texte**, sens compréhensible sans l'emoji. **Aucun emoji dans T3** |
| AC-NT-30 | Aucun texte ne culpabilise ni ne presse (« toujours pas », « dernier avertissement », majuscules criées), y compris le second rappel de vote et l'alerte d'activation. Relecture par la développeuse ou le Bureau avant mise en production (PO-NT-11) |
| AC-NT-31 | Tous les textes sont centralisés à un seul endroit par type et par étape (pas de chaîne dupliquée entre le serveur d'envoi et l'application), sans aucun nom réel en dur |

**Menu et écran Paramètres**

| Réf. | Critère |
|---|---|
| AC-NT-32 | Le Menu affiche une tuile **« Paramètres »** en dernière position des tuiles, au-dessus du bouton de déconnexion et de la ligne de version, **pour les 8 rôles à l'identique**, y compris un compte sans équipe ni affectation (AC-MN-01, AC-MN-17). La tuile ne lance aucune requête. Cible ≥ ~44 px (AC-MN-15). `BottomNav` inchangé (AC-MN-12) |
| AC-NT-33 | La tuile ouvre une **route poussée** (`/settings`, nom indicatif) hors `AppShell`, sans `BottomNav`, avec `BackHeader` `sticky top-0` à fond opaque. L'écran ne porte que la section **« Notifications »** |
| AC-NT-34 | La section Notifications porte un **interrupteur** qui active ou désactive les notifications **de cet appareil**, et le dit explicitement. Activer demande la permission système (si elle n'est pas déjà accordée), enregistre l'abonnement pour le compte connecté et efface le refus explicite ; désactiver supprime l'abonnement de cet appareil côté serveur et mémorise le refus explicite. L'état affiché reflète l'**état réel** (permission système + abonnement), jamais la préférence par défaut, y compris après rechargement |
| AC-NT-35 | La section décrit les notifications reçues (T1, T2, T3, T5), en une phrase courte, avec le détail derrière un **« i »** si la conception le juge trop dense. Le « i » s'ouvre au toucher (feuille ou popover, jamais une infobulle au survol), cible ≥ `h-11`, `aria-label` explicite. T4 n'y est pas présenté comme un push. Le détail indique que **les notifications continuent d'arriver après une déconnexion** et comment les arrêter |
| AC-NT-36 | Échec d'enregistrement ou de suppression de l'abonnement : message d'erreur explicite, interrupteur revenu à l'état réel, nouvel essai possible. Jamais un état « activé » affiché alors qu'aucun abonnement n'existe |

**Consentement, activation par défaut et in-app**

| Réf. | Critère |
|---|---|
| AC-NT-13 | L'application **ne demande jamais** la permission système sans geste de l'utilisateur : la seule demande part du **tap sur l'interrupteur** de l'écran Paramètres. Ni le chargement de l'application, ni la resynchronisation silencieuse, ni l'alerte d'activation ne la demandent (l'alerte renvoie vers l'interrupteur) |
| AC-NT-14 | L'écran Paramètres montre un état distinct pour : activé ; désactivé ; refusé par le système (avec indication de passer par les réglages de l'appareil) ; non pris en charge (navigateur ou iPhone hors application installée — PO-NT-02). Aucun état n'est porté par la couleur seule ; contrôle ≥ `h-11`. **Inchangé** par l'activation par défaut, la resynchronisation et la déconnexion |
| AC-NT-15 | Un membre sans abonnement push garde **exactement** les alertes in-app existantes (`PendingVoteAlert`, étoile du joueur du match, `DuesReminderBanner`, carte de convocation, écran Alertes coach). Non-régression : AC-TR-38 à 42 et AC-AL-* inchangés |
| AC-NT-16 | Les règles T1/T2/T5 vivent dans `domain/` en fonctions pures réemployées (`response-deadline.ts`, `player-vote-rules.ts`), testées par Vitest, et mirrorées à la main en SQL. Aucune logique de purge dans `domain/` |
| AC-NT-37 | **Resynchronisation silencieuse (règle A)** : à **chaque** lancement connecté (session connectée, charte acceptée) **et à chaque connexion**, si la permission système vaut `granted`, que le Web Push est pris en charge et qu'aucun refus explicite n'est mémorisé pour ce compte sur cet appareil, l'abonnement de l'appareil **existe et appartient au compte connecté** à l'issue du lancement : créé s'il manque, réattribué s'il appartient à un autre compte, inchangé sinon. **Aucune fenêtre, aucun message, aucun clic.** Aucune limite de nombre ; appeler la resynchronisation deux fois de suite ne crée pas de doublon. Cas vérifiés : premier lancement après la version de lancement ; déconnexion puis reconnexion du même compte ; connexion d'un autre compte ; abonnement supprimé côté serveur (expiration) puis relancement |
| AC-NT-38 | **Refus explicite prioritaire** : après une désactivation dans Paramètres, la resynchronisation ne réabonne **jamais** ce compte sur cet appareil, ni au lancement suivant, ni à une version suivante, ni après déconnexion et reconnexion. Seul un nouveau tap sur l'interrupteur le lève |
| AC-NT-39 | **Alerte de repli (règle B)** : si, au premier lancement connecté après la version de lancement, la resynchronisation n'a pas pu abonner l'appareil (permission `default`, `denied`, ou non pris en charge) et qu'aucun refus explicite n'est mémorisé, la fenêtre « Nouveautés » qui présente la **version de lancement** porte une alerte, au-dessus des notes, avec le texte du §1 (variante choisie selon la situation) et un bouton qui **ferme la fenêtre** (version marquée vue) et **ouvre `/settings`**. Aucune alerte si un abonnement est actif |
| AC-NT-40 | **Une seule fois** : l'alerte n'apparaît dans **aucune** autre fenêtre « Nouveautés » (versions suivantes), **aucune** autre surface (Dashboard, Menu, Profil, bandeau), et ne réapparaît pas après fermeture, rechargement ou relancement. Elle est liée à une constante unique de version de lancement. Cette limite « une fois » ne s'applique **qu'à** l'alerte, jamais à la resynchronisation (AC-NT-37) |
| AC-NT-41 | La section `CHANGELOG.md` de la version de lancement contient une entrée `### Mobile` (sinon aucune fenêtre ne s'ouvre, AC-NT-20). Vérifié à la préparation de la version (skill `release-version`) |
| AC-NT-42 | **Libération de l'appareil** (défaut de PO-NT-34) : à la connexion d'un compte qui a un refus explicite mémorisé sur cet appareil, si l'`endpoint` de l'appareil est rattaché à un **autre** compte, cette ligne est supprimée côté serveur ; le compte connecté n'est pas abonné. Vérifié contre la base |

**T4 — nouveautés après mise à jour**

| Réf. | Critère |
|---|---|
| AC-NT-17 | `registerType` reste `'autoUpdate'`. Après le rechargement automatique sur une nouvelle version dont `CHANGELOG.md` contient une section `### Mobile`, l'utilisateur voit la mention de la version (`x.y.z`) et ses nouveautés, rendues par le **nouveau** bundle |
| AC-NT-18 | Les nouveautés affichées sont **exactement** celles que `parseMobileChangelog` extrait du `CHANGELOG.md` intégré au bundle (mêmes items, mêmes groupes par rôle sous réserve de PO-NT-20). Aucune autre source, aucun fichier de notes séparé. Les sections `### Web` n'apparaissent jamais |
| AC-NT-19 | Une même version n'est annoncée **qu'une fois par appareil** : après fermeture, elle ne réapparaît ni au rechargement, ni au prochain lancement. Le marqueur est local à l'appareil ; aucune écriture en base |
| AC-NT-20 | Une version sans section `### Mobile` ne produit **aucune** annonce. Les versions sautées et le premier lancement suivent la règle de PO-NT-19 |
| AC-NT-21 | Aucun état « mise à jour disponible », aucun bouton « Mettre à jour », aucun report : le cycle de mise à jour est inchangé (PO-NT-17 résolu) |
| AC-NT-22 | L'annonce est accessible : titre lisible, fermeture par un contrôle nommé ≥ `h-11`, navigation clavier, contraste AA. Elle ne bloque pas l'accès à l'application. L'alerte d'activation, si présente, est lue par les lecteurs d'écran avec la fenêtre (pas d'`aria-live` intrusif) et son bouton fait ≥ `h-11` |
| AC-NT-23 | Le dialogue du Menu (`ChangelogDialog`, double tap sur la version, AC-MN-09) continue de fonctionner à l'identique, **sans** l'alerte d'activation |
| AC-NT-24 | Push T4 : selon PO-NT-21. Défaut : **aucun push T4** ; l'annonce est in-app seulement |

## 5. Points ouverts

| Réf. | Question | Défaut proposé | Pour qui | Bloquant ? |
|---|---|---|---|---|
| PO-NT-01 | **Existe-t-il une maquette ? Où placer le consentement ?** | — | Développeuse | **Résolu (2026-10-15)** : **aucune maquette** (statut `absent`, ligne pré-rédigée au §0). Consentement dans un **écran Paramètres**, atteint par une **tuile « Paramètres » tout en bas du Menu**, section « Notifications » avec interrupteur et description (détail derrière un « i » si trop dense). Le défaut précédent « interrupteur dans le Profil » est **caduc**. Ne plus demander de lien |
| PO-NT-02 | **iOS** : le Web Push n'existe que pour une PWA **installée sur l'écran d'accueil** (iOS/iPadOS 16.4+), jamais dans un onglet Safari. Faut-il guider l'installation ? Quelle part des membres est sur iPhone ? | Message « installez l'application pour recevoir les notifications » dans l'état « non pris en charge » de l'écran Paramètres ; variante « Voir comment faire » de l'alerte d'activation | Développeuse | Non |
| PO-NT-03 | **Moment du push T1** | — | Développeuse | **Résolu (2026-10-15)** : un push **à l'ouverture du vote** et un second **24 h avant la clôture**, **deux au plus** par personne et par vote, **seulement à ceux qui n'ont pas encore voté**, dédoublonnés par le journal d'envoi. Voir §1 « T1 », AC-NT-05, AC-NT-10. Reste un point de précision non bloquant : PO-NT-28 |
| PO-NT-04 | **T2, cas tardifs** : convocation créée ou convoqué ajouté après le seuil ; date modifiée après un premier push | Créée/ajouté après le seuil : envoi au prochain passage du job si `canPlayerRespond` est vrai. Date modifiée : pas de second push | Développeuse | Non |
| PO-NT-05 | **Préférences par type** (T1/T2/T3/T5) en plus de l'interrupteur global ? Peut-on refuser T3 (rejoint PO-TR-17) ? | Interrupteur global par appareil seulement | Développeuse + référent RGPD | Non |
| PO-NT-06 | **In-app pour T2** : bandeau dédié « convocation sans réponse » ? | Non : la carte « Prochaine convocation » suffit | Développeuse | Non |
| PO-NT-07 | **Compte multi-rôles** : un tap sur T1/T2 bascule-t-il le rôle actif sur « Joueur » ? | Non | Développeuse | Non |
| PO-NT-08 | **Historique** : un écran « Notifications » pour retrouver un push effacé (rejoint PO-TR-12) ? | Non | Développeuse | Non |
| PO-NT-09 | **Heures de silence** ? T1 (ouverture) et T5 dépendent de l'heure du match : un match à 21 h donne un premier rappel de vote vers 22 h, et une annonce T5 vers 22 h deux jours plus tard | Pas d'heures de silence | Développeuse | Non |
| PO-NT-10 | **Candidats « etc. »** (§1 hors périmètre) | Aucun dans cette passe | Développeuse / Bureau | Non |
| PO-NT-11 | **Textes définitifs** (push, écran Paramètres, alerte d'activation, confirmation de relance du Trésorier). Cadre au §1bis, exemples indicatifs | Exemples du §1bis comme première version ; un seul emoji par écran dans la fenêtre de lancement (choix de conception) | Bureau / développeuse | Non |
| PO-NT-12 | **RGPD** : services push des éditeurs comme destinataires techniques ; information des membres (texte du « i ») ; consentement | À inscrire au registre de traitement | **Référent RGPD (non désigné)** | Non pour concevoir ni construire. **Avant mise en production** |
| PO-NT-13 | Le journal d'envoi doit-il aussi aller au journal d'audit ? | Non (hors CDC §11.3) | Bureau | Non |
| PO-NT-14 | Durées de rétention des abonnements et du journal d'envoi | Abonnement inutilisé : 6 mois ; journal : 30 jours après la fin de fenêtre | Référent RGPD / développeuse | Non, **avant production** |
| PO-NT-15 | **Infra gratuite** : `pg_cron` (déjà utilisé, toutes les 15 min) → Edge Function d'envoi (`pg_net`). Tolérance d'envoi ; quotas gratuits Edge Functions (T1 en deux étapes, T5 à tous les Dirigeants habilités, l'activation par défaut et le maintien à la déconnexion augmentent les envois) ; un projet Supabase gratuit inactif est mis en pause, ce qui stoppe `pg_cron`. La resynchronisation ajoute **un appel léger** par lancement connecté | `pg_cron` toutes les 15 min → Edge Function ; tolérance 15 min ; resynchronisation par un seul appel de fonction, sans écriture si rien ne change | Développeuse | Non |
| PO-NT-16 | **Fuseau horaire** du texte (« demain 15 h ») calculé côté serveur | Fuseau du club, constante unique ; ou texte sans heure | Développeuse | Non |
| PO-NT-17 | **T4 : annoncer avant ou après la mise à jour ?** | — | Développeuse | **Résolu (2026-10-15)** : on **garde `autoUpdate`** ; les nouveautés s'affichent **après** le rechargement, dans le nouveau bundle. Pas de mode `prompt`, pas de fichier de notes séparé |
| PO-NT-18 | **T4 : source des notes de la nouvelle version** | — | — | **Résolu par conséquence de PO-NT-17** : le `CHANGELOG.md` intégré au nouveau bundle |
| PO-NT-19 | **T4 : versions sautées et premier lancement** | Toutes les versions non vues ; rien au premier lancement | Développeuse | Non |
| PO-NT-20 | **T4 : filtrer les groupes par rôle** ? | Tout montrer | Développeuse | Non |
| PO-NT-21 | **T4 : push en plus de l'in-app ?** | In-app seulement | Développeuse | Non |
| PO-NT-22 | **T5 : qui sont « les dirigeants » ?** | — | Développeuse | **Résolu (2026-10-15)** : **joueurs et coachs de l'équipe du match + tous les Dirigeants habilités, toutes équipes**. Responsable de section, Trésorier, Référent médical, Bénévole et Administrateur exclus à ce seul titre. Aucun élargissement de la frontière de lecture de `get_team_mvp`. Voir §1 « T5 », §2, AC-NT-25, AC-NT-27 |
| PO-NT-23 | **T5 : formulation de l'égalité et du lauréat** | Tous les noms ; même texte pour tous | Développeuse | Non |
| PO-NT-24 | **T5 in-app** : bandeau « homme du match » en plus de l'étoile ? | Non | Développeuse | Non |
| PO-NT-25 | **Vouvoiement ou tutoiement** ? **RÉSOLU : tutoiement** (décision de la développeuse) | Tutoiement | Développeuse | Non |
| PO-NT-26 | **T5 et vie privée** : nom du lauréat sur l'écran verrouillé de tous les destinataires (Dirigeants habilités compris, et davantage d'écrans avec l'activation par défaut et le maintien à la déconnexion) ; refus d'être nommé ; joueurs mineurs | Nom affiché ; pas de refus individuel dans cette passe | **Référent RGPD (non désigné)** + Bureau | Non pour concevoir ni construire. **Avant mise en production** |
| PO-NT-27 | **Description des notifications dans Paramètres** : identique pour tous, ou adaptée aux rôles du compte (un coach seul ne reçoit ni T1 ni T2) ? | Identique pour tous, avec la mention « selon tes rôles » | Développeuse | Non |
| PO-NT-28 | **T1 : instant exact de l'« ouverture du vote »** pour le premier push. `isVotingOpen` ouvre le vote **au coup d'envoi** (pendant le match) ; `player-vote-rules.ts` situe la fin du match vers coup d'envoi + 1 h (`VOTING_DEADLINE_START_OFFSET_HOURS`) | Premier push à **coup d'envoi + 1 h** ; la règle d'ouverture du vote reste inchangée | Développeuse | Non (une constante, modifiable en un point) |
| PO-NT-29 | **Demander la permission sans geste là où le navigateur le tolère** (Chrome Android) ? Augmenterait le taux d'activation, mais Chrome peut afficher une invite « discrète » ou bloquer d'office, pénaliser l'origine, et l'invite surgirait sans contexte. À ne pas confondre avec la **resynchronisation silencieuse** (règle A), qui **s'abonne** sans rien demander quand la permission est **déjà** accordée, et tourne à chaque lancement connecté | **Non**, sur aucun navigateur : la permission n'est demandée qu'au tap de l'interrupteur (AC-NT-13). Une fois accordée, la resynchronisation garde l'appareil abonné sans clic (AC-NT-37) | Développeuse | Non |
| PO-NT-30 | **Portée du refus explicite** : mémorisé par appareil seulement, par compte sur l'appareil, ou côté serveur pour tous les appareils du compte ? | Par **compte sur l'appareil** (stockage local indexé par compte), conservé à la déconnexion, **prioritaire sur la resynchronisation** ; levé seulement par un nouveau tap sur l'interrupteur ; aucun effet sur les autres appareils, dont l'abonnement est propre | Développeuse | Non |
| PO-NT-31 | **Alerte de repli et parcours atypiques** : (a) personne qui saute la version de lancement : l'alerte s'affiche-t-elle avec le lot de versions non vues ? (b) premier lancement sur un appareil neuf après la version de lancement (PO-NT-19 n'affiche rien) : aucune alerte, ou alerte quand même ? (c) personne déjà déconnectée au moment de la mise à jour : l'alerte attend-elle la première session ? | (a) Oui, une fois avec le lot ; (b) aucune alerte, l'activation passe par Paramètres ; (c) oui, la fenêtre n'apparaît qu'en session connectée après la charte | Développeuse | Non |
| PO-NT-32 | **RGPD de l'activation par défaut, de la resynchronisation et du maintien à la déconnexion** : (a) abonnement silencieux, à chaque lancement connecté, sur une permission déjà accordée ; (b) information préalable des membres ; (c) annonce nominative T5 sur davantage d'écrans ; (d) **push reçus en étant déconnecté** : rappels de convocation et de vote, signal de relance de cotisation (sans montant) et nom du lauréat sur l'écran verrouillé d'un téléphone dont le titulaire s'est déconnecté, voire d'un téléphone passé à un tiers | Admis pour des rappels de service, sous réserve : d'une information claire dans le « i » (« Elles continuent d'arriver même si tu te déconnectes. Pour les arrêter, désactive-les ici. ») ; d'un refus simple dans Paramètres, prioritaire sur tout ; de l'arrêt de tout envoi à la désactivation du compte ; de la reprise ou de la libération de l'appareil à la connexion d'un autre compte. Pas de confirmation à la déconnexion | **Référent RGPD (non désigné)** | Non pour concevoir ni construire. **Avant mise en production** |
| PO-NT-33 | **Tap sur un push en étant déconnecté** : après connexion, rouvrir la cible du push (`/convocations/:id`, Dashboard) ou l'écran d'accueil par défaut ? | Rouvrir la cible après connexion si le compte connecté est bien le destinataire et y a accès ; sinon écran d'accueil par défaut | Développeuse | Non |
| PO-NT-34 | **Compte avec refus explicite qui se connecte sur un appareil encore rattaché à un autre compte** : laisser l'appareil à l'ancien compte (qui continuerait de recevoir ses push sur ce téléphone) ou le libérer ? | **Libérer** : supprimer la ligne de cet `endpoint` côté serveur, sans abonner le compte connecté (AC-NT-42) | Développeuse | Non |

**Rappels d'OPEN hérités, à ne pas résoudre ici** : échéance de réponse d'une réunion (`response-deadline.ts`, 60 min, TODO OPEN) ; PO-CPS-03 ; PO-PV-07 ; PO-PV-08 ; PO-PV-09 (écart avec le code signalé au §1, T5) ; PO-TR-17.

## 6. Notes d'implémentation (contraintes, pas décisions produit)

1. **Service worker** : on garde `registerType: 'autoUpdate'` (PO-NT-17). Gérer `push` et `notificationclick` demande quand même du code propre au service worker (stratégie `injectManifest`, ou `importScripts` avec la stratégie générée). À choisir au build sans changer le comportement de mise à jour. Le service worker affiche les push **indépendamment de la session** : il ne lit pas l'état de connexion.
2. **Règles pures** dans `domain/policies/` : une constante de seuils par type (`match` 24 h, `meeting` 24 h, `training` 12 h) et un prédicat d'éligibilité T2 qui **réemploie** `canPlayerRespond` ; T1 et T5 réemploient `isVotingOpen`/`isVotingClosed`/`getVotingDeadline`. T1 ajoute deux instants d'envoi (ouverture, PO-NT-28 ; clôture − 24 h). Miroir SQL manuel, commenté (`CLAUDE.md` §7).
3. **T5** : extraire de `get_team_mvp` le calcul « lauréat(s) d'un match donné » pour qu'il serve l'étoile in-app et T5. Ce refactor ne doit pas changer le résultat de `get_team_mvp` (test de non-régression). Destinataires = rôles `player` et `coach` de l'équipe + rôle `authorized-officer`, dédoublonnés par compte.
4. **T4** : la comparaison de versions est une fonction pure testable. `parseMobileChangelog` vit aujourd'hui dans `presentation/features/menu/changelog/` : le réemployer depuis un emplacement partagé plutôt que le recopier. Le stockage local de la dernière version vue n'est ni dans `domain/` ni en base.
5. **Activation par défaut — deux décisions pures, testables, sans appel navigateur** (elles peuvent vivre dans `domain/policies/` puisqu'elles ne reçoivent que des valeurs) :
   - **règle A**, nom indicatif `shouldSyncPushSubscription({ permission, supported, explicitOptOut })` → vrai si `granted`, pris en charge et sans refus explicite. Appelée à **chaque** lancement connecté et à chaque connexion. Pas de marqueur « tentative faite » : la règle est idempotente ;
   - **règle B**, nom indicatif `shouldShowActivationAlert({ subscribed, explicitOptOut, isLaunchVersionInWhatsNew })` → vrai si non abonné, sans refus explicite, et si la fenêtre « Nouveautés » présente la version de lancement. Sa limite « une fois » vient du marqueur « version vue » (AC-NT-19).
   - La **lecture** de `Notification.permission`, de `PushManager` et du stockage local reste dans `presentation/` (ViewModel) ou `data/`, jamais dans `domain/`. Constante `NOTIFICATIONS_LAUNCH_VERSION` unique. Marqueur local « refus explicite », indexé par compte (PO-NT-30), **non effacé à la déconnexion**, effacé par l'activation via l'interrupteur.
6. **Déconnexion et connexion** : `SignOutUseCase` et le flux de déconnexion **ne touchent pas** à l'abonnement push, ni côté serveur ni côté navigateur (`PushSubscription.unsubscribe()` n'est pas appelé). Si une implémentation antérieure supprimait l'abonnement à la déconnexion, ce comportement est à retirer. Le flux de **connexion** (et le démarrage d'une session déjà connectée) déclenche la règle A ; en cas de refus explicite, il déclenche la libération de PO-NT-34.
7. **Enregistrement et libération d'un abonnement** : fonctions `security definer`, `set search_path = ''`, appelant lu depuis `auth.uid()`.
   - `register_push_subscription(endpoint, p256dh, auth)` : upsert sur l'`endpoint` (contrainte d'unicité sur `endpoint`) ; insère, ou réattribue la ligne existante à l'appelant ; **sans écriture** si la ligne appartient déjà à l'appelant avec les mêmes clés (la règle A peut l'appeler à chaque lancement sans coût d'écriture).
   - `release_push_endpoint(endpoint)` : supprime la ligne de cet `endpoint` si elle appartient à un **autre** compte (PO-NT-34).
   - Aucune ne renvoie d'information sur le détenteur précédent. Miroir du nom de règle commenté côté TypeScript.
8. **Écran Paramètres** : dossier `presentation/features/settings/` (Page + ViewModel), route ajoutée au groupe plein écran de `router.tsx`. Le ViewModel calcule les booléens d'état (pris en charge, permission, abonné) ; la page ne fait que les rendre. L'abonnement passe par un use case et un repository, partagés avec la resynchronisation.
9. **Table `notifications` existante** : son `kind` vaut uniquement `'dues_reminder'`. Ne pas l'étendre sans décision : les alertes in-app T1/T2/T5 sont **dérivées à la lecture**, T4 et l'alerte d'activation sont locales à l'appareil. Le journal d'envoi est une table distincte, à clé unique **(compte, déclencheur, convocation, étape)** — l'étape ne prend deux valeurs que pour T1.
10. **T3** : l'envoi push se branche **après** un résultat `'sent'` de `send_dues_reminders()`, sans changer ses règles ni son atomicité.
11. **Lecture serveur en bloc** : le job lit les convocations dans la fenêtre, les convoqués, les réponses, les votes et les destinataires (dont tous les Dirigeants habilités) en quelques requêtes, jamais une requête par convocation ou par destinataire.
12. **Textes** : un seul catalogue par type et par étape (AC-NT-31), avec des placeholders. Le libellé de catégorie de vote est lu en base.
13. **Tests** (`CLAUDE.md` §8) : prédicats T1 (deux étapes, vote entre les deux, match annulé, hors fenêtre), T2, T5 (égalité, aucun vote, destinataires cumulant plusieurs titres), règles A et B (`granted`, `default`, `denied`, non pris en charge, refus explicite, abonnement déjà actif, version de lancement absente du lot), comparaison de versions T4, puis use cases d'abonnement, puis mappers. AC-NT-02/07/10/25/27/37/42 se vérifient contre la base (PO-MD-10 : risque d'`it.todo`, à signaler).
14. **Migrations** : tables d'abonnements et de journal, fonctions d'enregistrement et de libération, job `pg_cron`, refactor de `get_team_mvp`. Toute migration est **proposée**, jamais appliquée en silence.

## Transmission

**Prêt pour designer-agent.** PO-NT-01 et PO-NT-17 sont résolus. Périmètre visuel à concevoir, sans maquette, par composition :

- la **tuile « Paramètres »** en bas du Menu (`MenuNavCard`, AC-NT-32) ;
- l'**écran Paramètres** : `BackHeader`, section « Notifications », interrupteur, ses 4 états (AC-NT-14), description courte et détail derrière un « i » (AC-NT-34 à 36) ;
- l'**annonce des nouveautés** après mise à jour (AC-NT-17 à 22), sur le modèle de `ChangelogDialog` ;
- l'**alerte unique d'activation** dans `WhatsNewDialog` (AC-NT-39, 40), au-dessus des notes, deux variantes de texte (§1 « Activation par défaut »), un bouton ≥ `h-11` qui ferme la fenêtre et ouvre `/settings` ;
- les textes, encadrés par le §1bis.

La section « UI design » ci-dessous intègre déjà l'alerte d'activation. La resynchronisation silencieuse n'a **aucune surface visuelle**. **Seul ajout attendu** (non bloquant, l'agent PO n'a pas modifié cette section) : une ligne dans le dialogue du « i » (`NotificationsInfoDialog`) disant que les notifications **continuent d'arriver après une déconnexion** et qu'on les arrête depuis cet écran (AC-NT-35, texte par défaut de PO-NT-32).

Designer-agent recopie la ligne de registre `absent` du §0 dans `DESIGN_LINKS.md`.

**Prêt pour l'implémentation.** PO-NT-03 et PO-NT-22 sont résolus ; l'activation par défaut, la resynchronisation et la déconnexion ont un mécanisme par défaut complet (PO-NT-29 à 34, non bloquants). **Aucun point ne bloque.**

⚠️ **Document hors `specs/` à mettre à jour, non modifié par l'agent PO** (son rôle ne lui permet pas d'écrire hors de `specs/`) : **`docs/NOTIFICATIONS.md` §4** doit refléter que : la déconnexion **ne supprime plus** l'abonnement ; l'abonnement reste **rattaché au compte connecté** ; à **chaque** lancement connecté et à chaque connexion, si la permission est `granted` et sans refus explicite, l'abonnement est **resynchronisé sans clic** (créé ou réattribué par upsert sur l'`endpoint`) ; le **refus explicite** reste prioritaire ; la limite « une fois » ne vaut que pour l'alerte de repli ; un compte avec refus explicite **libère** l'appareil d'un autre compte (AC-NT-07, 37, 38, 40, 42 ; §6 points 5 à 7). À faire par la développeuse ou l'agent d'implémentation.

**À trancher avant la mise en production** : **PO-NT-12**, **PO-NT-26** et **PO-NT-32** (RGPD), **PO-NT-14** (rétention).

## UI design

### Sources utilisées, par ordre effectif

1. `docs/designs/DESIGN_LINKS.md` §4 : aucune ligne n'existait. La ligne pré-rédigée du §0 (statut **absent**, note d'accompagnement incluse) a été ajoutée **verbatim** au registre dans cette passe. Aucun lien n'est redemandé (PO-NT-01).
2. `docs/designs/*.png` : aucune maquette de cette feature. Maquette voisine réemployée pour le vocabulaire visuel : `docs/designs/menu/[v0] Mob - Menu.png` (cartes `rounded-3xl`, bordure `white/10`, fond `white/5`, icône dans un cercle, ligne horizontale de la section « Services externes »).
3. `wireframes-basiques-as-caribbean.md` : absent du dépôt (déjà constaté par `specs/coach-alerts.md`). Sans objet : aucun des 4 onglets n'est modifié.
4. Cette spec (§1, §1bis, §2, §4) et le code lu : `MenuPage.tsx`, `MenuNavCard.tsx`, `ExternalLinkRow.tsx`, `ChangelogDialog.tsx`, `parse-changelog.ts`, `shared/layout/BackHeader.tsx`, `ui/{switch,dialog,alert,popover}.tsx`. Aucun composant shadcn à installer : `Switch`, `Dialog`, `Alert`, `Button` sont déjà vendorés. (`Sheet` ne l'est pas : on n'en ajoute pas pour ce besoin.)

**Aucun patron visuel nouveau** : la tuile est une variante de ligne du Menu, l'écran est une carte contenant une ligne à interrupteur, le « i » ouvre un `Dialog` déjà utilisé ailleurs, l'annonce de version est un second `ChangelogDialog`. Pas de prototype Claude Design demandé. Si la développeuse en veut un pour l'écran Paramètres, c'est son choix, ce n'est pas un blocage.

### Emplacement dans la nav

- **Onglet Menu** (4ᵉ entrée de la nav basse, inchangée, AC-MN-12) : une section de plus **tout en bas**, après « Services externes » et avant le bouton « Se déconnecter » et la ligne de version.
- **Écran Paramètres** : **route poussée** `/settings` (nom indicatif), hors `AppShell`, sans `BottomNav`, au même niveau que `/profile`, `/alerts`, `/legacy` (AC-NT-33). Il vit donc dans le périmètre du Menu, qui en est la seule porte d'entrée.
- **Annonce des nouveautés** : pas un écran, un dialogue qui s'ouvre **par-dessus n'importe quelle route** après le rechargement automatique. Aucune place dans la nav.

### Ce qui change par rôle (§2, repris, non redéfini)

**Rien.** Tuile, écran et annonce de version sont identiques pour les 8 rôles, sans `can()` (AC-NT-01, AC-NT-32). La tuile ne fait aucune requête. Seul le **contenu textuel** de la liste du « i » pourrait varier selon les rôles : défaut de PO-NT-27 appliqué, liste identique pour tous avec la mention « selon tes rôles ».

### 1. Tuile « Paramètres » dans le Menu

**Section** : un entête `MenuSectionTitle` **« Application »**, puis une seule ligne. Choix de conception (le §1 le laisse libre) : sans entête, la ligne se lirait comme la suite des « Services externes » juste au-dessus, alors qu'elle ouvre l'application elle-même, pas un service tiers. AC-MN-11 respecté (l'entête porte une entrée).

**Forme : variante « ligne » de `MenuNavCard`.** Dans la grille `grid-cols-2`, une carte verticale isolée resterait à demi-largeur et aurait l'air orpheline. On reprend donc la **disposition horizontale d'`ExternalLinkRow`** (visible dans la maquette du Menu, section « Services externes ») : cercle d'icône `size-11` à gauche, titre + sous-titre au centre, **chevron** à droite, `min-h-16 w-full`, `rounded-3xl border border-white/10 bg-white/5 px-4.5 py-4`.

- Icône : `IconSettings` (`@tabler/icons-react`, comme le reste du Menu).
- Titre : **« Paramètres »**. Sous-titre : **« Notifications »** (neutre, jamais un état, AC-MN-04 : la tuile ne lit rien).
- Chevron `IconChevronRight` dans le petit cercle `size-8 border-white/15` d'`ExternalLinkRow`, **à la place** de l'icône de lien sortant : il dit « on reste dans l'application », par opposition aux lignes externes.
- Élément racine `<Link to="/settings">`. Cible ≥ 44 px par `min-h-16` (AC-NT-32).
- **Justification de la variante** : c'est la même forme qu'`ExternalLinkRow`, avec une destination interne. Elle peut être réalisée comme une prop `layout="row"` de `MenuNavCard`, ou comme un composant frère partageant le style. Au choix du développeur, tant que les cartes en grille ne changent pas.

### 2. Écran Paramètres (`/settings`)

**De haut en bas :**

1. **`BackHeader`** (`shared/layout/`) réemployé tel quel : `title="Paramètres"`, flèche retour, `sticky top-0`, fond opaque, cible `size-11` (AC-NT-33). `onBack` revient au Menu.
2. **Section « Notifications »** : un entête `MenuSectionTitle` « Notifications », puis **une seule carte** (`rounded-3xl border border-white/10 bg-white/5`) qui contient, dans l'ordre :
   - **La ligne d'interrupteur** (voir ci-dessous).
   - **La zone de statut** (texte d'état, et `Alert` pour les cas bloqués ou en erreur).
   - **La description** courte et le bouton « i ».

   L'écran ne porte rien d'autre, pas de section vide ni de réglage factice (§1). Sous la carte, de l'air : l'écran reste court et ne scrolle pas sur un téléphone usuel.

**La ligne d'interrupteur.**
- Toute la ligne est un `<label>` associé au `Switch` : **la ligne entière est la cible tactile**, `min-h-16`, pas le seul curseur (le `Switch` shadcn mesure 32 × 18 px par défaut, très en dessous de 44 px, et son extension de zone invisible ne suffit pas). On **ne modifie pas** les entrailles de `ui/switch.tsx` (`CLAUDE.md` §2).
- À gauche : libellé **« Notifications sur cet appareil »** (gras, `text-[15px]`). Dessous, une ligne d'état en `text-white/60` (voir les états). À droite : le `Switch`. `min-w-0` sur le bloc de texte, le libellé peut passer sur deux lignes sans pousser l'interrupteur (pas de paire de champs côte à côte au sens `grid-cols-2` ici, mais le même risque de débordement : le texte se réduit, l'interrupteur garde sa taille avec `shrink-0`).
- `aria-label` implicite par le `<label>` ; l'état « activé / désactivé » est porté par `role="switch"` + `aria-checked` (Radix), pas par la couleur seule (AC-NT-14).

**Les quatre états (AC-NT-14).** Chacun a **un texte d'état**, jamais la couleur ou la position seule.

| État | Interrupteur | Ligne d'état sous le libellé | Zone sous la ligne |
|---|---|---|---|
| **Désactivé** (permission non encore demandée, ou abonnement supprimé) | Off, actif | « Désactivées sur cet appareil. » | Aucune |
| **Activé** (permission accordée **et** abonnement enregistré) | On, actif | « Activées sur cet appareil. » | Aucune |
| **Refusé par le système** (permission `denied`) | Off, **inactif** (`disabled`) | « Bloquées par ton appareil. » | `Alert` (neutre) avec icône : « Les notifications sont bloquées pour cette application. Pour les activer, ouvre les réglages de ton appareil ou de ton navigateur et autorise les notifications pour AS Caribbean. » |
| **Non pris en charge** | Off, **inactif** (`disabled`) | « Indisponibles ici. » | `Alert` (neutre) avec icône, deux textes selon le cas (voir ci-dessous) |

- **Refusé** : un `Switch` inactif reste visible. Ce n'est **pas** une violation de la règle « une carte de Menu disparaît, jamais grisée » (`CLAUDE.md` / contraintes du produit) : cette règle vise les cartes dont la **permission métier** n'est pas accordée. Ici, c'est un état du **navigateur**, que l'utilisateur peut lever lui-même, et l'`Alert` lui dit comment. L'interrupteur reste un contrôle visible, sinon l'écran n'aurait plus de raison d'être.
- **Non pris en charge**, deux textes (le ViewModel distingue les deux, la page ne fait que rendre) :
  - iPhone/iPad hors application installée (PO-NT-02, défaut) : « Sur iPhone, ajoute d'abord l'application à l'écran d'accueil (bouton Partager, puis « Sur l'écran d'accueil »), puis ouvre-la depuis son icône. »
  - Autre navigateur sans Web Push : « Ce navigateur ne permet pas les notifications. Tu retrouves tout dans l'application. »
- **Relecture automatique** : l'état est relu à chaque retour au premier plan de l'application (`visibilitychange`). Un utilisateur qui vient d'autoriser les notifications dans les réglages de l'appareil retrouve l'écran à jour, sans bouton « Actualiser ».
- **Chargement initial** : pendant la lecture de l'état réel, la ligne d'interrupteur affiche un `Skeleton` à sa hauteur (pas de saut de mise en page) : **jamais un faux « désactivé »** qui bascule ensuite (AC-NT-34, état réel).
- **Action en cours** (demande de permission, enregistrement ou suppression de l'abonnement) : `Switch` `disabled`, ligne d'état « En cours… ». Pas de double tap possible.
- **Demande de permission ignorée** (le système se ferme sans choix, permission `default`) : l'interrupteur revient sur Off, **sans message d'erreur** (ce n'est pas une panne). Un nouveau tap redemande.
- **Échec** (AC-NT-36) : l'interrupteur revient à l'état réel, et un `Alert` `variant="destructive"` s'affiche sous la ligne : « Impossible de modifier les notifications pour le moment. Réessayez dans un instant. » Le nouvel essai est un nouveau tap, sans bouton dédié. L'`Alert` disparaît au tap suivant. Jamais un « Activées » affiché sans abonnement.
- **Geste explicite uniquement** (AC-NT-13) : la permission système n'est demandée que par le tap sur cet interrupteur. L'écran lui-même, en s'ouvrant, ne la demande jamais.

**Description et « i ».**
- Sous la ligne d'état, **une phrase** en `text-[13px] text-white/60` : « Reçois sur cet appareil tes rappels de convocation, de vote et de cotisation, et l'annonce de l'homme du match. » (texte du §1bis, à valider par PO-NT-11). Elle dit aussi que le réglage est **propre à l'appareil** (AC-NT-34) : « Ce réglage ne concerne que cet appareil. »
- À la fin de cette phrase (ou sur sa ligne, à droite), un **bouton « i »** : `Button variant="ghost" size="icon"`, **`size-11`** (≥ 44 px), `rounded-full bg-white/8`, icône `IconInfoCircle`, `aria-label="Voir le détail des notifications reçues"`. Un **tap** ouvre le détail, pas de survol (AC-NT-35).
- **Pourquoi un `Dialog` et non un `Popover`** : le contenu fait quatre entrées plus une note, trop pour un popover ancré sur un écran étroit (il déborderait ou se collerait au bord). Le `Dialog` est déjà employé (`ChangelogDialog`, `AlertDialog`), **aucune dépendance de plus**.
- **Contenu du dialogue** (nouveau composant, `NotificationsInfoDialog`) :
  - Titre : **« Ce que tu peux recevoir »**. Description : « Selon tes rôles, tu recevras certaines de ces notifications. »
  - Liste de quatre entrées, chacune un titre court en gras + une phrase (mêmes puces sobres que `ChangelogDialog`, sans emoji) :
    - **Vote de l'homme du match** : « Un petit rappel à l'ouverture du vote, puis un dernier la veille de sa clôture, si tu n'as pas encore voté. » (T1, deux rappels au plus, PO-NT-03)
    - **Convocation sans réponse** : « Un rappel 24 h avant un match ou une réunion, 12 h avant un entraînement, si tu n'as pas encore répondu. » (T2)
    - **Cotisation** : « Un rappel quand le trésorier en envoie un. » (T3, **registre sobre**, aucun emoji)
    - **Homme du match** : « L'annonce du ou des lauréats, une fois le vote clos. » (T5)
  - Une note finale en `text-white/60` : « Les nouveautés de l'application s'affichent dans l'application, sans notification. » (T4 **pas présenté comme un push**, AC-NT-35).
  - Une ligne sur la déconnexion, en `text-white/60`, sans emoji : « Elles continuent d'arriver même si tu te déconnectes. Pour les arrêter, désactive-les ici. » (AC-NT-07, texte par défaut de PO-NT-32, à valider par le référent RGPD).
  - Un texte d'information RGPD : « Les notifications passent par le service de notification de ton appareil ou de ton navigateur. » **Texte provisoire** : sa formulation relève de PO-NT-12 (référent RGPD non désigné), à valider avant la mise en production.
  - Pied : bouton **« Fermer »** pleine largeur `h-11` (en plus de la croix du `DialogContent` et du tap hors du dialogue).
  - `max-h-[80svh]` avec zone défilante interne, comme `ChangelogDialog`, pour un petit viewport.
- **Pas d'emoji** sur l'écran Paramètres ni dans son dialogue (AC-NT-29 autorise « au plus un », rien ici n'en a besoin).

### 3. Annonce des nouveautés après mise à jour (T4)

**Modèle : `ChangelogDialog`, second dialogue, même rendu des notes.** Composant nouveau `WhatsNewDialog`.

- **Déclenchement** : après le rechargement automatique (`autoUpdate`, PO-NT-17), au premier rendu du nouveau bundle, si la dernière version vue sur l'appareil est plus ancienne que `APP_VERSION` **et** que `parseMobileChangelog` donne au moins une version non vue. Ouverture **automatique**, sans geste. Aucun bouton « Mettre à jour », aucun état « mise à jour disponible » (AC-NT-21).
- **Où il est monté** : à un niveau qui couvre à la fois `AppShell` **et** les routes poussées (`/settings`, `/profile`, `/convocations/:id`…), **mais seulement pour une session connectée et après la charte** : sur l'écran de connexion il consommerait le marqueur « vu » avant que l'utilisateur ait pu le lire. À préciser à l'implémentation.
- **Contenu** :
  - Titre : **« Du nouveau dans l'appli ✨ »** (un seul emoji, facultatif, le sens se comprend sans lui, §1bis). Description : « Voici ce qui change avec la version {x.y.z}. » (placeholder).
  - Corps : **exactement le rendu de `ChangelogDialog`** : pour chaque version, `h3` « Version x.y.z · date », puis chaque groupe par rôle (`**Rôle**` en `text-xs font-medium text-muted-foreground`, puis puces `list-disc`). Tous les groupes (PO-NT-20, défaut). Aucune section `### Web` (déjà écartée par le parseur).
  - Plusieurs versions manquées (PO-NT-19, défaut) : **de la plus récente à la plus ancienne**, empilées dans la même zone défilante (`max-h-[80svh]`).
  - Pied : un seul bouton **« C'est noté »** (`Button`, pleine largeur, `h-11`). Pas de second bouton **dans le pied** ; le bouton de l'alerte d'activation (ci-dessous) est dans le corps, pas dans le pied.
- **Alerte unique d'activation** (AC-NT-39, 40, 41 ; PO-NT-29 à 31), seulement dans la fenêtre de la **version de lancement** :
  - **Placement** : tout en haut de la zone défilante, **au-dessus** des notes, avec un `Alert` shadcn (variante neutre, icône `IconBell`). Elle défile avec les notes (pas collée), pour ne pas manger la hauteur d'un petit écran. Pas de croix propre : on la quitte en fermant la fenêtre.
  - **Titre et texte** (vouvoiement, ton léger, §1bis ; le `AlertTitle` porte l'unique emoji) :

    | Variante | `AlertTitle` | `AlertDescription` | Bouton |
    |---|---|---|---|
    | Permission jamais demandée ou refusée | Active tes notifications 🔔 | Pour ne rien rater de tes convocations et du vote de l'homme du match, active les notifications dans les paramètres. | **Ouvrir les paramètres** |
    | iPhone hors application installée, ou navigateur sans notifications | Active tes notifications 🔔 | Sur cet appareil, une petite étape est nécessaire. On t'explique tout dans les paramètres. | **Voir comment faire** |

  - **Bouton** : `Button` `variant="outline"`, pleine largeur, **`h-11`**, sous le texte dans l'`Alert`. Un tap **ferme** la fenêtre (version marquée vue, comme « C'est noté ») **puis ouvre `/settings`**. Il **ne demande pas** la permission : c'est le tap sur l'interrupteur, dans Paramètres, qui la demande (AC-NT-13). Dans la variante iPhone/non pris en charge, `/settings` affiche déjà l'`Alert` d'explication de l'état « Non pris en charge » (« ajoute d'abord l'application à l'écran d'accueil… »).
  - **Choix de la variante** : par le ViewModel (la page ne fait que rendre). Aucune alerte si un abonnement est actif ou si un refus explicite est mémorisé.
  - **Un seul emoji dans la fenêtre** : quand l'alerte est présente, le titre de la fenêtre perd son « ✨ » (« Du nouveau dans l'appli ») ; le 🔔 de l'alerte est le seul emoji.
  - **Une seule fois** : jamais dans une autre version, ni ailleurs (Dashboard, Menu, Profil), ni après fermeture ou rechargement (AC-NT-40). Son `Alert` n'est pas rendu hors de la version de lancement. Les deux boutons (alerte et « C'est noté ») ont la même conséquence de fermeture ; seul le premier navigue.
  - **Mobile** : le bloc `Alert` est en colonne (texte puis bouton), aucune paire côte à côte, donc rien à réduire ; texte avec retour à la ligne, `min-w-0` sur le bloc de texte.
  - **Prérequis de contenu** : la section `CHANGELOG.md` de la version de lancement doit contenir une entrée `### Mobile`, sinon la fenêtre, donc l'alerte, ne s'ouvre pas (AC-NT-41).
- **Fermeture** : par le bouton, la croix, la touche Échap, ou le tap hors du dialogue. **Quelle que soit la voie, la fermeture enregistre la version comme vue** (marqueur local, AC-NT-19). Ce n'est **pas** un `AlertDialog` : il ne retient personne, l'accès à l'application n'est jamais bloqué (AC-NT-22).
- **Accessibilité** (AC-NT-22) : titre en `DialogTitle` (le focus entre dans le dialogue, Radix), contrôles de fermeture ≥ `h-11`, contraste AA des textes secondaires (`text-muted-foreground` sur le fond du dialogue, pas `white/40`).
- **Rien à afficher** : aucun dialogue, jamais un dialogue vide (version sans `### Mobile`, premier lancement par défaut PO-NT-19, ou version déjà vue).
- **Réemploi du rendu des notes** : extraire de `ChangelogDialog` un petit composant partagé (par exemple `ReleaseNotesList`, qui reçoit la liste des versions) utilisé par les deux dialogues, pour ne pas dupliquer le balisage. **Cette extraction ne doit rien changer à `ChangelogDialog`** (AC-NT-23 : double tap sur la version, titre « Changements par version », mêmes versions). Si elle paraît risquée, dupliquer ~20 lignes de balisage reste acceptable à court terme, mais l'extraction est la voie recommandée.
- **Risque déjà présent, non introduit** : le rechargement automatique peut faire perdre une saisie en cours ; le dialogue s'ouvre alors par-dessus l'écran rechargé. Rien n'est corrigé ici (§1).

### États à couvrir

| Surface | État | Traitement |
|---|---|---|
| Tuile « Paramètres » | Tout compte, tout rôle | Toujours rendue, identique, aucune requête (AC-NT-32) |
| Écran Paramètres | Lecture de l'état en cours | `Skeleton` à la hauteur de la ligne d'interrupteur, jamais un faux état |
| Écran Paramètres | Désactivé / Activé / Refusé / Non pris en charge | Voir le tableau des quatre états (AC-NT-14) |
| Écran Paramètres | Action en cours | `Switch` inactif, « En cours… » |
| Écran Paramètres | Échec d'activation ou de désactivation | `Alert` destructive, interrupteur revenu à l'état réel, nouvel essai par un tap (AC-NT-36) |
| Écran Paramètres | Permission ignorée | Retour sur Off, aucun message |
| Écran Paramètres | Retour au premier plan | État relu automatiquement |
| « i » | Ouvert / fermé | `Dialog`, fermable par bouton, croix, Échap, tap extérieur |
| Nouveautés | Version non vue avec `### Mobile` | Ouverture automatique après rechargement, fermeture = marquée vue |
| Nouveautés | Rien de neuf, premier lancement, déjà vu | Aucun dialogue |
| Nouveautés (version de lancement) | Activation par défaut non aboutie, permission `default`/`denied` | `Alert` en tête, variante « Ouvrir les paramètres » ; bouton `h-11` ferme et ouvre `/settings` (AC-NT-39) |
| Nouveautés (version de lancement) | iPhone hors app installée, ou navigateur sans notifications | `Alert` en tête, variante « Voir comment faire », même bouton |
| Nouveautés (version de lancement) | Abonnement actif, ou refus explicite mémorisé | Aucune alerte, notes seules |
| Nouveautés (autre version) | Toute autre version, ou relancement après fermeture | Jamais d'alerte (AC-NT-40) |

### Composants réutilisés vs nouveaux

- **Réutilisés tels quels** : `BackHeader` (`shared/layout/`), `MenuSectionTitle`, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter`, `Switch`, `Alert`, `Button`, `Skeleton`, icônes `@tabler/icons-react`.
- **Variante d'un composant existant** : la ligne « Paramètres » du Menu (forme d'`ExternalLinkRow`, destination interne, chevron).
- **Nouveaux, propres à la feature** : `NotificationsInfoDialog` (le « i »), `WhatsNewDialog` (annonce de version), la carte de la section Notifications de l'écran Paramètres (composition de primitives, pas un patron nouveau). Optionnel : `ReleaseNotesList`, extrait de `ChangelogDialog`.
- **Aucun nouveau patron visuel**, donc pas de justification supplémentaire à fournir et pas de prototype à produire.

### Contraintes mobiles (`CLAUDE.md` §6)

- **Interrupteur** : cible tactile = **toute la ligne** (`min-h-16`, ≥ 44 px), jamais le seul `Switch` de 32 × 18 px. Pas de patch des entrailles de `ui/switch.tsx`.
- **Bouton « i »** : `size-11`. **Boutons « Fermer » et « C'est noté »** : `h-11` explicite, pleine largeur. **Flèche de `BackHeader`** : déjà `size-11`. **Tuile du Menu** : `min-h-16`.
- **Aucune paire de champs côte à côte** dans cette feature : pas de `grid-cols-2`, donc pas de `min-w-0` de colonne à poser. Seule rangée « texte + contrôle » (libellé de l'interrupteur, titre de la tuile) : bloc de texte `min-w-0 flex-1` qui se réduit (`truncate` sur la tuile, retour à la ligne sur le libellé de l'interrupteur), contrôle `shrink-0`. À vérifier sur un viewport mobile réel étroit, pas seulement sur une fenêtre de bureau redimensionnée.
- **`BackHeader` `sticky top-0`**, fond opaque (`bg-coach-bg` déjà dans le composant) : respecté par réemploi.
- **Zone sûre** : l'écran Paramètres reprend les marges de la page Menu (`pb-[max(1.375rem,env(safe-area-inset-bottom))]`) pour ne pas coller à la barre d'accueil iOS.
- **Dialogues** : `max-h-[80svh]` et zone défilante interne (patron de `ChangelogDialog`) pour tenir sur un petit écran.

### Questions ouvertes UI

**Aucune ne bloque la conception ni l'implémentation visuelle.** PO-NT-03 et PO-NT-22 sont **résolus** (2026-10-15) et n'ont aucun effet sur ces écrans.

1. **Tuile en ligne ou en carte verticale** : la ligne pleine largeur est proposée (une carte isolée en grille resterait à demi-largeur). Si la développeuse préfère une carte verticale à demi-largeur, c'est un changement de style sans effet sur le reste.
2. **Description identique pour tous ou adaptée aux rôles** : PO-NT-27 (défaut appliqué : liste identique, mention « selon tes rôles »).
3. **Libellé « homme du match » dans les textes de Paramètres** : le §1bis veut que le libellé de catégorie vienne de `vote_categories` dans les **push** (AC-NT-28). Les textes statiques de l'écran Paramètres l'écrivent en clair. Acceptable (texte d'aide, pas un push) ou à lire en base aussi ? Défaut : texte statique. À confirmer avec PO-NT-11.
4. **Texte d'information RGPD du « i »** : provisoire, dépend de PO-NT-12 (avant mise en production, pas avant le build).
5. **Textes exacts** (écran, états, dialogues) : première version rédigée ici selon le §1bis, à relire par la développeuse ou le Bureau (PO-NT-11, AC-NT-30). Tutoiement (PO-NT-25 résolu).
6. **Point de montage de `WhatsNewDialog`** : un niveau sous la session authentifiée, qui couvre `AppShell` et les routes poussées. Choix d'implémentation à valider avec le développeur, avec la contrainte « pas sur l'écran de connexion ni avant la charte ».
