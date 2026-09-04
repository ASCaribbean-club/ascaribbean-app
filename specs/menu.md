# Spec — Menu (surface de navigation principale)

> Statut : rédaction initiale du 2026-09-04. **Révisée le même jour, second passage** : le besoin produit a changé en cours de journée — voir l'addendum ci-dessous, qui prime sur le corps de la spec là où il le contredit. Aucune spec antérieure n'existait pour cet écran — il n'était jusqu'ici qu'un stub (`presentation/features/menu/MenuPage.tsx`, `// TODO(PO-1)`). ~~PO-MN-02~~ **devenu sans objet** : l'entrée « Documents » n'est plus retenue en v1 (addendum, point 1). **PO-MN-03 et PO-MN-04 tranchés par la développeuse** (addendum, points 2 et 3) : les sections « Suivi de l'équipe » et « Services externes » sont rendues. **Section « Club & administration » ajoutée** (addendum, point 4). 3 points ouverts restants (PO-MN-01, PO-MN-05, PO-MN-07 — PO-MN-02 et PO-MN-06 devenus sans objet). Voir l'addendum, §5 et §6.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (P0/P1/P2 + matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles), `docs/ARCHITECTURE.md` (§7 permissions, §11 journal d'audit, §13.4 arborescence `presentation/`), `specs/coach-dashboard.md` (nav basse à 4 entrées, précédents PO-1/PO-2), `specs/player-dashboard.md` (§3 documents, PO-PD-02/PO-PD-06/PO-PD-07), `specs/profile-page.md` (§1 lecture seule, §5 PO-PR-05 tranché, §7 addendum).
> Maquette : `docs/designs/menu/[v0] Mob - Menu.png` — **instantané local**, lu directement par l'agent PO (première fois du projet : les quatre écrans précédents n'avaient que des liens Claude Design inaccessibles). Registre `docs/designs/DESIGN_LINKS.md` §2 : aucune ligne n'existait pour cette feature, une ligne a été ajoutée par l'agent PO conformément au §4 du registre. Aucun lien artifact n'a été fourni — l'instantané local est donc la seule référence, ce qui est le niveau 2 prévu par le §1 du registre, pas une anomalie.
> État du code lu pour cadrer (rédaction initiale) : `presentation/features/menu/MenuPage.tsx` (stub), `presentation/app/router.tsx`, `presentation/shared/layout/{AppShell,BottomNav}.tsx`, `presentation/app/providers/active-role-provider.tsx`, `domain/policies/rbac-matrix.ts`, `domain/usecases/auth/SignOutUseCase.ts`, `domain/usecases/player-dashboard/ListUserMissingOrRejectedDocumentsUseCase.ts`, `domain/usecases/profile/ListProfileDocumentsUseCase.ts`, `domain/repositories/` (17 interfaces).

**Statut de la maquette** : elle est lisible et a servi de base au §1. **Mise à jour (addendum 2026-09-04)** : la position initiale de cette spec — « la maquette n'est pas une source de vérité fonctionnelle, seules les entrées fondées dans le CDC sont rendues » — a été **explicitement renversée en cours de journée** pour trois des huit entrées de la maquette : elles sont maintenant rendues malgré l'absence de fondement CDC, dérogation assumée et documentée point par point dans l'addendum. Le CDC et la matrice continuent de primer pour tout le reste (RBAC, données sensibles, journal d'audit).

## Addendum — 2026-09-04 (second passage, décisions produit)

Le besoin a changé en cours de journée par rapport à la rédaction initiale ci-dessous. Quatre décisions, toutes tranchées par la développeuse, dans l'ordre où elles ont été soulevées en revue de code :

1. **Entrée « Documents » retirée.** Plus de carte « Documents » dans le Menu, plus de route `/documents` (celle-ci n'est pas ajoutée à `router.tsx`). `PO-MN-02` et `PO-MN-06` deviennent **sans objet** — ils ne portaient que sur cette entrée. Conséquence structurante : **le Menu ne lit plus aucune donnée** (§ « Périmètre de données » ci-dessous, mis à jour). `ListUserMissingOrRejectedDocumentsUseCase` n'est pas supprimé — il reste utilisé par `player-dashboard` — seul l'appel depuis le Menu disparaît.
2. **« Suivi de l'équipe » (Statistiques/Classement) conservée, rendue désactivée.** `PO-MN-04` tranché : l'absence de tout module CDC derrière ces deux cartes ne change pas (aucun fait nouveau sur PO-PD-02/PO-PD-07), mais les deux cartes restent **visibles, grisées, non cliquables** plutôt qu'absentes. Ceci **déroge explicitement** à la règle 1 du §1 (« absence, jamais rendue puis inerte ») pour ces deux cartes **spécifiquement** — dérogation assumée, pas une réouverture générale de la règle pour le reste de l'écran. `AC-MN-04` est réécrit en conséquence (§4).
3. **« Services externes » conservée, rendue.** `PO-MN-03` tranché : la section est rendue avec les deux adresses connues (espace fédéral, secrétariat). « Règlement du club » est rendue **désactivée** (même traitement qu'un `DisabledMenuCard`, pas un `<a>` sans `href`) tant qu'aucun stockage de document club-wide n'est spécifié — pas de lien mort, `AC-MN-02` reste respecté au sens strict. La sous-question du stockage (PO-MN-03(b)) reste ouverte pour une itération future, mais ne bloque plus le rendu du reste de la section.
4. **Section « Club & administration » ajoutée.** Hors CDC : site du club, Instagram, don HelloAsso (lien sortant vers la page de collecte du club, aucun flux de paiement in-app). Décision produit assumée, aucun module ne la fonde — même statut que « Services externes ». Contenu **différent** de la maquette v0, qui ne proposait sous cet entête que « Déplacements » (celui-ci reste retiré, aucun fondement CDC, §6 correction 3). Mêmes garanties `AC-MN-10` que « Services externes » : lien visuellement marqué sortant, `rel="noopener noreferrer"`, aucune donnée personnelle en paramètre d'URL.

Ces quatre décisions **priment** sur le corps de la spec ci-dessous là où elles le contredisent. Le reste — RBAC (§2), déconnexion, ligne de version, contraintes mobiles, données sensibles hors vecteur Documents (§3) — n'est pas affecté et continue de s'appliquer tel quel.

## 1. Périmètre

Le **Menu** est la quatrième et dernière entrée de la nav basse fixe (Dashboard · Calendrier · Actus · Menu, `specs/coach-dashboard.md` §1 point 6, `ARCHITECTURE.md` §13.4). C'est une **surface d'aiguillage** : elle ne porte aucune action métier propre, elle donne accès à des écrans qui vivent ailleurs. Depuis l'addendum, sa seule action réelle **exécutable** est la **déconnexion** — les sections « Suivi de l'équipe », « Club & administration » et « Services externes » sont des liens statiques ou des cartes inertes, aucune n'implique de logique métier propre à cet écran.

Deux conséquences directes, posées d'emblée parce qu'elles cadrent tout le reste :

1. **Un menu ne peut pointer que vers ce qui existe.** Une entrée dont l'écran cible n'existe pas est **absente**, jamais rendue puis inerte, jamais suivie d'un « Bientôt disponible » au clic. C'est la règle du moindre privilège déjà appliquée partout ailleurs (`specs/player-dashboard.md` §2), transposée à la navigation : ne pas promettre une porte qui ne s'ouvre pas. **Deux dérogations assumées** à cette règle (addendum points 2 et 3) : une carte explicitement rendue **désactivée** (opacité réduite, non cliquable, `aria-disabled`, sans `href` ni `onClick`) ne prétend pas être navigable — elle n'est pas couverte par l'interdit, qui vise la carte qui *a l'air* active et ne mène nulle part.
2. **Un menu est la surface la plus exposée au hors-périmètre.** C'est structurellement l'écran où l'on est tenté de mettre « tout le reste ». C'est exactement ce que fait la maquette v0 — et, depuis l'addendum, ce que fait aussi cette spec pour trois de ses sections, en connaissance de cause plutôt que par dérive.

### Modules CDC concernés

| Module CDC | Priorité | Ce que le Menu en expose |
|---|---|---|
| Authentification et profils | **P0** | La **déconnexion** (CDC §3.1, gestion de session) et le point d'accroche vers le dossier de l'utilisateur |
| ~~Documents et consentements~~ | ~~P0~~ | **Retiré (addendum point 1).** Aucune entrée de navigation vers ses pièces depuis le Menu — ce module reste accessible depuis `ProfilePage` (bloc « Mes documents »), pas depuis ici |

Aucun autre module CDC n'est exposé en v1 au sens strict. « Suivi de l'équipe », « Club & administration » et « Services externes » sont rendus **sans fondement CDC** (addendum, points 2 à 4) — voir « Écarts » ci-dessous pour le détail entrée par entrée.

### Contenu retenu — v1

1. **Titre d'écran « Menu »**, en tête, sans flèche retour : le Menu est une destination de nav primaire, pas une route poussée (même statut que Dashboard/Calendrier/Actus, à l'intérieur d'`AppShell`).
2. **Section « Suivi de l'équipe »** — deux cartes, « Statistiques » et « Classement », rendues **désactivées** (addendum point 2). Aucun module CDC derrière, dérogation assumée à la règle d'absence.
3. **Section « Club & administration »** — site du club, Instagram, don HelloAsso, trois liens sortants fonctionnels (addendum point 4). Hors CDC.
4. **Section « Services externes »** — espace fédéral et support (liens fonctionnels), « Règlement du club » (carte désactivée, adresse de stockage non spécifiée) (addendum point 3).
5. **Bouton « Se déconnecter »** — `SignOutUseCase` existe et est déjà câblé sur l'avatar des deux tableaux de bord (`CoachHeader`/`PlayerHeader`) ainsi que sur `ProfilePage`. Le reprendre ici n'ajoute **aucune permission, aucun use case, aucune journalisation** (§3). Confirmation explicite avant exécution, patron `AlertDialog` déjà en place.
6. **Ligne de version** en pied d'écran, non interactive. Utile au support ; à lire depuis les **métadonnées de build**, jamais écrite en dur — la valeur « 2.4.1 » de la maquette est un texte de maquette, pas une version réelle de ce dépôt (AC-MN-09).

~~C'est tout pour la v1. L'écran est volontairement maigre...~~ **Ne s'applique plus** depuis l'addendum : l'écran porte maintenant trois sections en plus du bouton de déconnexion et de la ligne de version. Ce n'est plus un écran « maigre par construction » mais un écran où plusieurs entrées sont assumées **sans** être fondées dans le CDC — la distinction à garder en tête pour toute revue future n'est plus « rendu vs non-rendu » mais « fondé CDC vs assumé produit ».

### Écarts maquette / CDC

Même grille de lecture que `specs/coach-dashboard.md` §1 et `specs/player-dashboard.md` §1 : un bloc présent dans une maquette n'est pas pour autant fondé — **mais depuis l'addendum, "non fondé" n'implique plus "non rendu"** pour les entrées listées ci-dessous comme "Rendue".

| Entrée de la maquette | Problème | Renvoi | Statut v1 |
|---|---|---|---|
| **« Statistiques » — « Présence, buts, forme »** | Trois données, trois problèmes distincts : « Présence » suppose l'accès du joueur à ses `AttendanceRecord`, que la RLS lui **refuse** aujourd'hui ; « buts » et « forme » relèvent d'un module « résultats et compétitions » qui **n'existe dans aucune des listes P0/P1/P2** ; et « Statistiques et exports » est de toute façon **P1** | PO-MN-04 (= PO-PD-02 + PO-PD-07) | **Rendue, désactivée** (addendum point 2) — aucun fondement nouveau, dérogation assumée à la règle d'absence |
| **« Classement » — « 4e · 11 pts · J6 »** | Même module de résultats inexistant. Un classement suppose en plus des résultats de **matchs d'un championnat**, donc une source fédérale ou une saisie de résultats — ni l'une ni l'autre n'est spécifiée (« Intégrations fédérales automatisées » est **P2**) | PO-MN-04 | **Rendue, désactivée** (addendum point 2) — sous-titre neutre, jamais la valeur fabriquée « 4e · 11 pts · J6 » de la maquette |
| **« Déplacements » — « Covoiturage et convois »** | **Aucun fondement CDC** : absent des modules P0, des modules P1 **et** de la liste P2. Ce n'est pas une fonctionnalité différée, c'est une fonctionnalité jamais évoquée. Elle soulève par ailleurs des questions RGPD lourdes et propres (partage de coordonnées entre membres, mise en relation impliquant des mineurs) — §3 | PO-MN-05 | **Non rendue** — seule entrée de la maquette encore strictement absente, retrait confirmé et non rouvert par l'addendum |
| **« Espace fédéral » — « Feuille de match et licences »** | Un **lien sortant** vers un portail fédéral n'est pas une « intégration fédérale automatisée » (P2) : c'est un hyperlien, technique­ment trivial et légitime | PO-MN-03 | **Rendue** (addendum point 3) — adresse fournie |
| **« Règlement du club » — « PDF · mis à jour en août »** | Fondé sur le principe (module Documents et consentements P0, « chartes, statuts »), mais **rien ne porte un document club-wide** : `public.documents` est **nominatif** (une ligne par utilisateur), et aucun stockage de document de club n'est spécifié. La date « mis à jour en août » suppose en plus un versionnage de document qui n'existe pas | PO-MN-03 | **Rendue, désactivée** (addendum point 3) — pas de lien mort ; carte visible sans destination tant que le stockage n'est pas tranché |
| **« Support » — « Contacter le secrétariat »** | Un `mailto:` n'est pas le module **Communication (P1)** — c'était le cas le plus facile à débloquer des trois, il ne manquait qu'une adresse | PO-MN-03 | **Rendue** (addendum point 3) — adresse fournie |
| ~~Sous-titre « 3 à renouveler » sous « Documents »~~ | Sans objet — l'entrée « Documents » elle-même est retirée (addendum point 1) | ~~PO-MN-06~~ | Sans objet |
| **« AS Caribbean · version 2.4.1 »** | Valeur de maquette. Aucune version 2.4.1 de ce dépôt n'existe | — | Ligne conservée, **valeur issue du build** (AC-MN-09) |
| **Entêtes de section** (« SUIVI DE L'ÉQUIPE », « CLUB & ADMINISTRATION », « SERVICES EXTERNES ») | Les trois sections portent au moins une entrée visible depuis l'addendum | — | Les trois entêtes **sont rendus** (AC-MN-11 continue de s'appliquer : un entête sans aucune entrée visible ne le serait pas, cas qui ne se présente plus ici) |

Note : le contenu retenu sous « Club & administration » (site du club, Instagram, don HelloAsso) **ne vient pas de la maquette v0**, qui ne proposait sous cet entête que « Déplacements » (retiré ci-dessus). C'est un ajout produit du 2026-09-04, sans équivalent dans l'instantané `docs/designs/menu/[v0] Mob - Menu.png` (addendum point 4).

### Hors périmètre — explicitement

- **Tout écran cible**. Le Menu **renvoie**, il n'implémente rien : ni écran de statistiques, ni portail externe.
- **Le module Documents et consentements** : ne s'expose plus du tout depuis le Menu (addendum point 1) — reste accessible depuis `ProfilePage` (bloc « Mes documents ») uniquement.
- **Les points, badges et avantages ASC Legacy** : module **P1**, grille « à valider par le Bureau **avant** développement » (CDC §8). Pas d'entrée de menu, **même inerte** — même traitement qu'AC-PD-12 et AC-PR-12, pas celui toléré côté coach (PO-1), et pas une des dérogations couvertes par l'addendum.
- **Les cotisations** (module **P1**) : aucune entrée « Cotisations », « Paiements » ou « Échéancier », y compris pour un compte trésorier (§3). Le don HelloAsso de « Club & administration » (addendum point 4) est un lien sortant vers une page de collecte publique du club, pas un flux de paiement in-app ni une entrée « Cotisations » — distinction posée explicitement pour qu'elle ne soit pas relue comme une réouverture de cette exclusion.
- **Les entrées d'administration** (comptes, rôles, paramétrage, journal d'audit) : réservées à l'administrateur par la matrice, mais **aucun écran d'administration n'existe** dans `router.tsx`. Règle 1 du §1 : pas d'entrée sans destination — les deux dérogations de l'addendum (cartes désactivées, liens sortants statiques) ne s'appliquent pas ici, il n'y a même pas de carte à désactiver. La question de fond — le Menu est-il *le* point d'entrée canonique des modules par rôle ? — est **PO-MN-01**.
- **Les préférences de notification / de canal** : module **Communication, P1**.
- **La bascule de rôle** : elle vit sur la pastille de rôle des en-têtes de tableau de bord (`ActiveRoleProvider`), pas ici. Le Menu n'introduit **aucun** second mécanisme de sélection de rôle — ce serait rouvrir PO-PR-02 par la porte de derrière.
- **« Mon profil » comme entrée de menu** : tranché **en sens inverse** par la développeuse le 2026-09-04 (PO-PR-05, commentaire dans `router.tsx` : le profil s'atteint depuis l'avatar, « never a 5th BottomNav destination », et « Menu stays the unrelated stub it already was »). Cette décision ne dépend pas du devenir de PO-MN-02 (devenu sans objet, addendum point 1) — elle reste valable indépendamment, quel que soit le contenu du Menu.
- **Toute donnée de santé, d'aptitude ou de certificat médical** : §3.
- **Tout export** : aucune fonction d'export, de copie ou de partage depuis cet écran.

### Périmètre de données — la règle centrale

**Depuis l'addendum (point 1), le Menu ne lit plus aucune donnée applicative.** Les trois sections rendues sont des liens statiques (URLs fixes en dur dans `external-links.ts`) ou des cartes désactivées sans requête associée ; la seule action dynamique de l'écran est la déconnexion (`SignOutUseCase`, qui ne lit rien avant d'exécuter). Aucune donnée nominative, aucun agrégat d'équipe, aucune donnée de section, aucune donnée de club n'est lue.

Corollaire, renforcé par rapport à la rédaction initiale : **aucune requête ne dépend de l'équipe, de la section, de la saison en cours, ni même de l'utilisateur.** Un compte sans équipe, sans saison en cours ou sans aucune affectation de rôle rend un Menu strictement identique à tout autre compte (AC-MN-17).

## 2. RBAC

### Rôles concernés — les huit

Le Menu est rendu pour **tout compte authentifié ayant accepté la charte**, quel que soit son ou ses rôles. Il n'est pas « l'écran d'un rôle ». Depuis l'addendum, le Menu ne dépend même plus d'une permission de lecture de profil — c'est un écran de contenu statique identique pour les 8 rôles, plus la déconnexion :

| Permission (matrice RBAC) | Valeur | Conséquence sur le Menu |
|---|---|---|
| *(hors matrice)* Gestion de sa session | — | La déconnexion n'est pas une permission : c'est la fin d'une session, disponible à tout compte connecté (CDC §3.1) |

Les treize autres lignes de la matrice sont **sans objet en v1**, non pas parce que les rôles ne les possèdent pas, mais parce qu'**aucune entrée de menu correspondante n'est rendue** : pas d'entrée cotisations (trésorier), pas d'entrée adhérents/licences (dirigeant habilité), pas d'entrée missions bénévoles (responsable de section, bénévole), pas d'entrée santé (référent médical), pas d'entrée comptes/rôles/audit (administrateur). Aucun écran cible n'existe pour ces modules (§1, règle 1) — et aucun d'eux n'entre dans les dérogations de l'addendum, qui ne couvrent que « Suivi de l'équipe », « Club & administration » et « Services externes ».

| Rôle | Interaction avec cet écran en v1 |
|---|---|
| Joueur / Joueuse | Écran identique aux 7 autres rôles : trois sections statiques + déconnexion |
| Coach / Staff | Idem |
| Responsable de section | Idem |
| Dirigeant habilité | Idem |
| Trésorier | Idem. **Aucune entrée financière n'apparaît pour autant** (§3) |
| Référent médical | Idem. **Aucune entrée santé n'apparaît pour autant** (§3) |
| Bénévole | Idem. Avec le profil, c'est l'une des rares surfaces que ce rôle atteint aujourd'hui |
| Administrateur | Idem, **et rien de plus** — pas d'entrée d'administration ni de journal d'audit tant qu'aucun écran correspondant n'existe |

### Aucune entrée de matrice, aucune action nouvelle

**Aucun ajout à `domain/policies/rbac-matrix.ts`, `actions.ts` ou `can.ts` par cette feature.** La seule chose que le Menu rend en v1 qui dépend d'un état applicatif — la déconnexion — est **hors matrice**. Le reste (Suivi de l'équipe, Club & administration, Services externes) est du contenu statique identique pour tout compte, qui ne pose donc aucune question RBAC.

**Mais** — et c'est la remarque structurante de cette section — le Menu reste **précisément le type d'écran pour lequel le critère d'en-tête de `rbac-matrix.ts` bascule** : « une entrée n'a sa place dans cette matrice que si `presentation/` doit décider quelque chose (afficher/masquer…) **avant ou indépendamment du résultat de la requête** ». Le jour où une entrée « Cotisations » (trésorier), « Adhérents » (dirigeant habilité) ou « Administration » (administrateur) apparaît, **elle justifiera une entrée de matrice**, contrairement à tout ce que le projet a construit jusqu'ici. C'est l'objet de PO-MN-01 — signalé ici pour que ce ne soit pas découvert au moment de coder, mais **rien n'est ajouté par cette passe** (`CLAUDE.md` §7).

### Règle d'affichage

**Absence, pas désactivation, sauf dérogation documentée** (moindre privilège, CDC §3 ; `ARCHITECTURE.md` §7). Une entrée non autorisée — ou sans destination — n'est pas rendue du tout, **sauf les deux cas couverts par l'addendum** (Suivi de l'équipe, Règlement du club) où une carte visible, grisée, non cliquable, `aria-disabled`, est un choix produit assumé plutôt qu'une entrée qui promet une action puis échoue au clic.

### Application technique

Rien de nouveau : la déconnexion passe par `AuthRepository`. **Aucune migration n'est requise par cette feature.** L'ancien branchement sur `documents_select_own` (rédaction initiale) n'existe plus (addendum point 1).

## 3. Données sensibles

### Données de santé — aucune rendue, aucun vecteur résiduel

Aucune donnée de santé, d'aptitude ou de diagnostic n'est rendue, pour aucun rôle, **y compris pour le référent médical**.

~~Le vecteur réel était le sous-titre de l'entrée « Documents »~~ — **sans objet depuis le retrait de cette entrée (addendum point 1).** Aucune surface de cet écran ne rend de donnée nominative ou de nature de pièce ; les trois sections restantes sont des liens/cartes statiques, sans texte dérivé d'une donnée utilisateur.

### Données financières — aucune

Aucune entrée cotisations, montant, échéancier ou relance, **y compris pour un compte trésorier** (§1, §2). Module Cotisations **P1**, aucune table. Exclusion **active**, pas omission (AC-MN-06). Le don HelloAsso de « Club & administration » (addendum point 4) est un lien sortant vers une page de collecte publique, sans donnée financière du compte connecté ni flux de paiement in-app — ne rouvre pas cette exclusion (§1, « Hors périmètre »).

### Données personnelles de tiers — aucune

Aucun nom, aucune donnée d'un autre membre n'est lue ni rendue.

⚠️ **Réserve à consigner sur « Déplacements » (PO-MN-05)** : si le Bureau confirme un besoin de covoiturage, ce n'est pas seulement un module à prioriser, c'est un module qui met en circulation des **coordonnées personnelles entre membres** (téléphone, adresse, point de rendez-vous) et organise la **mise en relation de mineurs avec des adultes**. Ça relève de la décision du **référent RGPD** (CDC §22) et probablement d'une AIPD (CDC §13, « AIPD à envisager ») — pas d'un ajout de carte de menu. Signalé plutôt qu'omis. Non affecté par l'addendum : « Déplacements » reste absente.

⚠️ **Réserve sur les liens sortants (PO-MN-03, et désormais aussi le point 4 de l'addendum)** : une URL vers un portail fédéral, un outil de support, le site du club, Instagram ou HelloAsso ne doit **jamais** transporter de donnée personnelle en paramètre (identifiant utilisateur, numéro de licence, courriel préremplis). Un lien externe est une sortie du périmètre RGPD maîtrisé par le club — condition à poser avant de câbler quoi que ce soit (AC-MN-10). Vérifié pour les cinq liens actuellement câblés dans `external-links.ts` : aucun ne porte de paramètre.

### Journal d'audit — aucune action à tracer par cette feature

Aucune des actions sensibles du CDC §11.3 (création/suppression de compte, changement de rôle, consultation de donnée santé, modification de paiement, correction de points Legacy, export nominatif) n'est déclenchable depuis cet écran. **La déconnexion n'y figure pas** et n'est pas à journaliser au titre du §11.3.

⚠️ Rappel, non traité ici : **aucune table de journal d'audit n'existe dans `supabase/migrations/`**. Exigence transversale **P0 non résolue**, déjà signalée par `specs/create-convocation.md` §7, `specs/player-dashboard.md` §3, `specs/match_details_page.md` §3 et `specs/profile-page.md` §3 — rappelée ici pour que le compteur ne redescende pas.

## 4. Critères d'acceptation

**AC-01** et **AC-02** sont ceux du CDC §17.2 et s'appliquent tels quels. Les critères propres à cet écran sont préfixés `AC-MN-`, même convention que `AC-CD-` (coach), `AC-PD-` (joueur), `AC-CV-` (convocation), `AC-MD-` (détail), `AC-PR-` (profil) ; à renuméroter dans la série officielle en recette (CDC disponible ici en PDF non extractible).

| Réf. | Critère |
|---|---|
| **AC-01** | Depuis cet écran, un utilisateur n'accède qu'à **ses propres** données — en pratique aucune donnée n'est lue du tout depuis l'addendum (§1, « Périmètre de données ») |
| **AC-02** | Aucune entrée du Menu ne donne accès à un périmètre plus large que celui du rôle : un jeton coach, responsable de section ou trésorier n'obtient pas d'entrée supplémentaire en v1 |
| AC-MN-01 | Le Menu se rend pour **chacun des 8 rôles**, à l'identique ; aucune entrée non autorisée n'est rendue |
| AC-MN-02 | **Aucune entrée dont l'écran cible n'existe pas n'est rendue comme si elle menait quelque part** : pas de « Bientôt disponible » au clic, pas de lien mort qui se présente comme actif. Une carte explicitement rendue **désactivée** (opacité réduite, non cliquable, `aria-disabled`, sans `href`/`onClick`) n'est pas couverte par cette règle — elle ne prétend pas être navigable (addendum, points 2 et 3) |
| ~~AC-MN-03~~ | **Sans objet** — l'entrée « Documents » et son compteur sont retirés (addendum point 1) |
| AC-MN-04 | **Aucun indicateur sportif ou de résultat actif** (statistiques de présence, buts, forme, classement, points, journée de championnat) n'est rendu — les cartes « Statistiques » et « Classement » sont visibles mais **désactivées** (opacité réduite, non cliquables), par dérogation assumée à la règle d'absence (addendum point 2). Aucune valeur chiffrée fabriquée n'est affichée (pas de faux classement, pas de fausses statistiques) |
| AC-MN-05 | **Aucune entrée ni indicateur ASC Legacy** (points, palier, badge, avantage), même statique — grille « à valider par le Bureau avant développement » (CDC §8). Non couvert par les dérogations de l'addendum |
| AC-MN-06 | **Aucune donnée ni entrée financière** (cotisation, montant, échéancier, relance) n'apparaît à l'écran ni dans les réponses API, **y compris pour un jeton trésorier** ; le lien de don HelloAsso (addendum point 4) n'est pas une exception — c'est un lien sortant sans donnée du compte connecté |
| AC-MN-07 | **Aucune information de santé, d'aptitude ou de nature de pièce potentiellement médicale** n'apparaît — sans objet en pratique depuis le retrait de l'entrée « Documents » (addendum point 1), critère conservé par précaution pour toute entrée nominative future |
| AC-MN-08 | La déconnexion demande une **confirmation explicite**, puis termine la session et renvoie vers `/login` ; aucune journalisation d'audit n'est requise pour cette action (§3) |
| AC-MN-09 | La ligne de version affiche une valeur issue des **métadonnées de build**, jamais une chaîne écrite en dur ; elle n'est pas interactive |
| AC-MN-10 | Un lien externe (« Services externes » et « Club & administration », addendum points 3 et 4) est **visuellement identifié comme sortant**, s'ouvre sans exposer le contexte de l'application (`rel="noopener noreferrer"`), et **ne transporte aucune donnée personnelle en paramètre d'URL** (§3) |
| AC-MN-11 | Un **entête de section sans aucune entrée visible n'est pas rendu** — pas de section vide, pas d'espace réservé compensatoire. Ne se déclenche plus en pratique depuis l'addendum (les trois sections portent toujours au moins une entrée), le principe reste applicable si une section venait à se vider |
| AC-MN-12 | Le Menu reste la **4ᵉ entrée de la nav basse fixe** ; cette feature n'ajoute **aucune** cinquième destination et ne modifie pas `BottomNav` |
| AC-MN-13 | Affichage complet en moins de 3 secondes sur mobile en réseau normal (CDC §12) — trivialement vrai depuis l'addendum, l'écran ne dépend plus d'aucune requête réseau |
| AC-MN-14 | Contrastes conformes AA et navigation clavier opérationnelle (CDC §12) |
| AC-MN-15 | Tous les contrôles interactifs (cartes de lien, bouton de déconnexion) ont une cible tactile d'au moins ~44px (`h-11`/`min-h-16`), vérifiée sur un viewport mobile réel — `CLAUDE.md` §6. Les cartes en grille à deux colonnes (« Suivi de l'équipe ») portent `min-w-0` |
| AC-MN-16 | Aucun export, aucune fonction de copie ou de partage n'est proposée depuis cet écran |
| AC-MN-17 | Le Menu se rend intégralement pour un compte **sans équipe, sans saison en cours ou sans aucune affectation de rôle** — jamais une erreur, un écran blanc ni un chargement infini ; trivialement vrai depuis l'addendum (§1, périmètre de données) |

## 5. Points ouverts

| Réf. | Question | À trancher par | Bloquant ? |
|---|---|---|---|
| **PO-MN-01** | **Le Menu est-il le point d'entrée canonique des modules par rôle ?** (administration, cotisations, adhérents/licences, missions bénévoles, suivi santé). Si oui, c'est le **premier écran du projet dont l'affichage dépend d'une décision d'autorisation prise avant toute requête** — donc le premier à justifier de vraies entrées dans `rbac-matrix.ts` (§2). Si non, chaque module apportera sa propre accroche et le Menu restera un écran de service. La réponse conditionne l'architecture des permissions front, pas seulement une mise en page | Bureau + développeuse | **Non pour la v1** (aucune de ces entrées n'a d'écran cible), mais à trancher **avant** le premier module par rôle |
| ~~PO-MN-02~~ | ~~Où pointe l'entrée « Documents » ?~~ | — | **Sans objet — entrée retirée (addendum point 1, 2026-09-04)** |
| **PO-MN-03** | **Les trois services externes existent-ils, et à quelles adresses ?** (a) URL de l'espace fédéral ; (b) où vit le « Règlement du club » — `public.documents` est **nominatif**, aucun stockage club-wide n'existe, et la maquette suppose en plus un versionnage (« mis à jour en août ») ; (c) adresse de contact du secrétariat | **Bureau** (+ développeuse pour le stockage du règlement) | **Tranché le 2026-09-04 par la développeuse (addendum point 3)** : (a) et (c) fournies, section rendue ; (b) reste ouverte mais ne bloque plus le rendu — « Règlement du club » est rendue désactivée en attendant |
| **PO-MN-04** | **« Statistiques » et « Classement » : sur quoi les brancher ?** Reformulation, à l'échelle du Menu, de deux points déjà ouverts : PO-PD-02 (le joueur peut-il consulter ses propres `AttendanceRecord` ? la RLS le refuse) et PO-PD-07 (aucun module « résultats et compétitions » n'existe dans la priorisation P0/P1/P2) | Bureau (+ développeuse pour la RLS) | **Tranché le 2026-09-04 par la développeuse (addendum point 2)** : cartes rendues désactivées plutôt qu'absentes ; la question de fond (brancher sur quoi) reste ouverte pour une itération future |
| **PO-MN-05** | **« Déplacements » (covoiturage et convois) — le club en a-t-il réellement besoin ?** Aucun fondement CDC, à aucune priorité. **Retrait confirmé par la développeuse le 2026-09-04** : la carte reste absente de la v1, pas même inerte — la seule des six entrées non fondées à ne pas bénéficier d'une dérogation de l'addendum. Le fond de la question (besoin réel du club, arbitrage RGPD si oui) reste ouvert pour une itération future | Bureau, puis **référent RGPD** — toujours à désigner (`docs/GOUVERNANCE.md` §7) | Non — entrée absente en v1 |
| ~~PO-MN-06~~ | ~~Que compte exactement le compteur « Documents » ?~~ | — | **Sans objet — entrée retirée (addendum point 1, 2026-09-04)** |
| **PO-MN-07** | **Rappel de dette, non introduite ici** : les rôles hors joueur/coach n'atteignent **aucun tableau de bord** (`active-role-provider.tsx` ne connaît que `'coach' \| 'player'`). Pour un trésorier, un bénévole ou un référent médical, le Menu et le profil sont donc de fait les seules surfaces utiles de l'application — ce qui rend PO-MN-01 d'autant plus structurant. Même question de fond que PO-PR-02 et que la question ouverte n°1 de `specs/match_details_page.md` | Bureau + développeuse | Non pour cet écran — signalé pour que la dette reste visible |

## 6. Note pour designer-agent

- **Maquette** : `docs/designs/menu/[v0] Mob - Menu.png`, lue et exploitable. Ligne ajoutée au registre `docs/designs/DESIGN_LINKS.md` §2 par l'agent PO. **Aucun lien artifact n'existe pour cette feature — ne pas en redemander** (§4 du registre) ; l'instantané local fait référence.
- **Corrections à appliquer à la maquette** (état après addendum du 2026-09-04, remplace la liste de la rédaction initiale) :
  1. Retirer la carte **« Documents »** de la maquette v0 — plus d'écran cible, plus de route `/documents` (addendum point 1).
  2. **Conserver** la section « SUIVI DE L'ÉQUIPE » (« Statistiques », « Classement »), cartes rendues **désactivées** plutôt que retirées (addendum point 2, AC-MN-04).
  3. Retirer la carte **« Déplacements »** (PO-MN-05, aucun fondement CDC — seule entrée encore strictement retirée).
  4. **Conserver** la section « SERVICES EXTERNES » : « Espace fédéral » et « Support » rendues fonctionnelles, « Règlement du club » rendue **désactivée** (addendum point 3).
  5. **Ajouter** la section « CLUB & ADMINISTRATION » avec site du club, Instagram, don HelloAsso (addendum point 4) — contenu différent de la maquette v0, qui n'y proposait que « Déplacements » (retiré au point 3).
  6. Conserver **« Se déconnecter »** et la **ligne de version**, cette dernière branchée sur le build (AC-MN-09).
- **Conséquence à assumer** : l'écran contient désormais **trois sections, un bouton et une ligne de texte** — plus l'écran « volontairement maigre » de la rédaction initiale. Deux des trois sections (Suivi de l'équipe, Services externes en partie) sont rendues sans être fondées dans le CDC ; c'est un choix produit assumé et documenté (addendum), pas une dérive à corriger en conception.
- ~~Écran cible /documents~~ : **sans objet**, l'entrée « Documents » n'existe plus (addendum point 1).
- **Patrons à réutiliser plutôt qu'à réinventer** : la **carte désactivée en grille 2 colonnes** (`DisabledMenuCard`) et la **ligne de lien sortant pleine largeur** (`ExternalLinkRow`) sont déjà implémentées dans `presentation/features/menu/components/` — les décrire plutôt que les reconcevoir pour toute itération future de cet écran. Le bouton de déconnexion et son `AlertDialog` de confirmation existent déjà (`ProfilePage.tsx`).
- **Contraintes mobiles** (`CLAUDE.md` §6) : cartes « Suivi de l'équipe » en `grid-cols-2` → `min-w-0` sur chaque item (déjà posé sur `DisabledMenuCard`) ; toutes les cibles ≥ `h-11`/`min-h-16` (AC-MN-15). Le titre « Menu » n'a pas besoin d'être `sticky` — il n'y a pas de flèche retour à préserver.
- **États à couvrir** : aucun état de chargement propre à cet écran depuis l'addendum (aucune requête, AC-MN-13/17) — l'écran se rend identiquement dans tous les cas.
- Rappel `CLAUDE.md` §9 : aucun nom de personne réelle dans le code, les tests ou la documentation.

**Statut : implémenté.** Les quatre décisions de l'addendum sont câblées dans `MenuPage.tsx` / `external-links.ts` / `components/{DisabledMenuCard,ExternalLinkRow}.tsx`. Seul PO-MN-01 (Menu comme point d'entrée canonique par rôle) et PO-MN-07 (dette des rôles sans dashboard) restent des questions de fond à trancher pour une itération future — aucun des deux ne bloque l'état actuel de cet écran.

## UI design

### Source de la maquette

`docs/designs/DESIGN_LINKS.md` §2 : la ligne `menu` est au statut **`instantané seul`** (pas `actif`, pas `absent`) — un lien artifact n'a jamais été fourni, seul l'export `docs/designs/menu/[v0] Mob - Menu.png` existe, déjà versionné. Conformément au §4 du registre, cet instantané est utilisé directement, **sans redemander de lien** à la développeuse. Fond sombre, cartes à coins très arrondis (`rounded-3xl`), bordure `white/10`, icône en tête de carte, pastille rouge pleine pour un compteur, bouton de déconnexion en contour, ligne de version centrée en petit texte gris — c'est le vocabulaire déjà en place ailleurs dans le projet (`docs/designs/v4_coach_dashboard.png`), rien à réinventer.

Le contenu ci-dessous reflète l'état **après addendum** (2026-09-04) : sur les huit entrées de la maquette, une (« Documents ») est retirée, une (« Déplacements ») reste retirée, une (« Club & administration ») est remplacée par un contenu différent, et les autres sont rendues telles quelles ou désactivées — voir la table « Écarts » du §1 pour le détail entrée par entrée.

### Emplacement dans la nav

Le Menu est la **4ᵉ entrée de la nav basse fixe** (`BottomNav.tsx`, route `/menu`, à l'intérieur d'`AppShell` — voir `router.tsx`). Titre d'écran « Menu » en tête, **sans flèche retour** : c'est une destination de nav primaire au même titre que Dashboard/Calendrier/Actus, pas une route poussée (§1 point 1). Pas de `sticky` sur le titre : avec trois sections, l'écran peut scroller sur un petit viewport, mais le titre n'a pas de flèche retour à préserver (contrairement au patron `BackHeader`) — pas de `sticky` nécessaire pour cet écran.

Aucune route `/documents` n'est ajoutée à `router.tsx` (addendum point 1) — le point n'est plus applicable.

### Ce qui change par rôle

Rien, au niveau de la mise en page. Depuis l'addendum, l'écran ne dépend même plus d'une lecture de profil : un compte joueur, coach, trésorier, référent médical ou administrateur voit exactement le même Menu, sans aucune variation de données (§2).

### Structure de l'écran, de haut en bas

1. **Titre « Menu »** — texte seul, même style que les titres d'écran des trois autres onglets (poids `font-extrabold`, pas de sous-titre, pas de salutation nominative : ce n'est pas un tableau de bord).
2. **Section « Suivi de l'équipe »** — entête de section (`MenuSectionTitle`), grille `grid-cols-2 gap-3` de deux `DisabledMenuCard` (« Statistiques », « Classement »).
3. **Section « Club & administration »** — entête de section, liste verticale de trois `ExternalLinkRow` (site du club, Instagram, don HelloAsso).
4. **Section « Services externes »** — entête de section, liste verticale de trois lignes : deux `ExternalLinkRow` fonctionnelles (espace fédéral, support) et une carte désactivée (« Règlement du club »).
5. **Bouton « Se déconnecter »** — pleine largeur, avec confirmation `AlertDialog`.
6. **Ligne de version** — texte seul, centré, non interactif, en pied d'écran.

### Composant — carte désactivée (`DisabledMenuCard`)

Utilisée pour « Statistiques », « Classement » (grille 2 colonnes) et « Règlement du club » (rendue seule, en liste verticale avec les `ExternalLinkRow` de la même section — pas de grille pour cette occurrence isolée) :

- `<div>` non interactif, pas un `<button disabled>` : il n'y a pas de gestionnaire de clic à désactiver, la carte n'a jamais été et ne devient pas un contrôle.
- `aria-disabled="true"` documente l'intention pour les technologies d'assistance sans simuler un contrôle de formulaire natif.
- Icône dans un cercle décoratif, titre en gras, sous-titre neutre (jamais une valeur fabriquée — pas de « 4e · 11 pts · J6 » pour « Classement »).
- Opacité réduite (`opacity-40`) pour signaler visuellement l'état désactivé, en plus de l'absence de toute affordance cliquable (pas d'icône de lien sortant, pas de chevron).

### Composant — ligne de lien sortant (`ExternalLinkRow`)

Utilisée pour les liens fonctionnels de « Club & administration » et « Services externes » :

- Élément racine `<a>` pleine largeur, `target="_blank"`, `rel="noopener noreferrer"` (AC-MN-10).
- Icône à gauche dans un cercle décoratif, titre + sous-titre au centre, icône de lien sortant (`IconExternalLink`) à droite pour signaler visuellement que le lien quitte l'application (AC-MN-10).
- Cible tactile `min-h-16`, largement au-dessus des 44px minimum (AC-MN-15).

### Bouton « Se déconnecter »

Reprise à l'identique du bloc `AlertDialog`/`AlertDialogTrigger`/`AlertDialogContent` (`shared/components/ui/alert-dialog.tsx`) déjà câblé sur `ProfilePage.tsx` (bouton `variant="destructive"`, `h-11 w-full`, copie de confirmation « Se déconnecter ? » / « Vous devrez vous reconnecter pour accéder à l'application. »). Aucune permission, aucun use case, aucune journalisation nouvelle (§2/§3) : `vm.onLogout` appelle le `SignOutUseCase` déjà existant.

### Ligne de version

Texte seul, centré, `text-white/40` ou équivalent déjà utilisé pour du texte secondaire ailleurs — pas interactif, pas de conteneur cliquable. Valeur = métadonnées de build (`APP_VERSION`, `vite.config.ts` + `src/vite-env.d.ts`), jamais une chaîne écrite en dur (AC-MN-09).

### États à couvrir

| État | Traitement |
|---|---|
| Toute donnée de compte (rôle, équipe, saison) | Écran strictement identique — aucune requête de cet écran n'en dépend (§1, AC-MN-17) |
| Rôle quelconque parmi les 8 | Écran strictement identique (voir « Ce qui change par rôle » ci-dessus) |
| Carte désactivée (Statistiques, Classement, Règlement du club) | Toujours rendue, jamais interactive, jamais de valeur fabriquée dans le sous-titre |
| Lien sortant fonctionnel | Toujours rendu, `href` non vide, icône de sortie visible |

### Composants réutilisés vs nouveaux

- **Réutilisés tels quels** : `AlertDialog`/`AlertDialogTrigger`/`AlertDialogContent`/`Button variant="destructive"` (bloc de déconnexion, repris de `ProfilePage.tsx`), `BottomNav` (nav basse, rien à concevoir), icônes `@tabler/icons-react` déjà importées dans le projet, `MenuSectionTitle`.
- **Nouveaux, propres à cet écran** : `DisabledMenuCard` (carte grisée non interactive) et `ExternalLinkRow` (ligne de lien sortant) — les deux seuls composants introduits par cette feature, tous deux réutilisés plusieurs fois sur l'écran plutôt que dupliqués par section.

### Contraintes mobiles (CLAUDE.md §6)

- Grille « Suivi de l'équipe » (`grid-cols-2`) : `min-w-0` posé sur chaque `DisabledMenuCard` (AC-MN-15) — seule paire de cartes côte à côte de cet écran.
- `ExternalLinkRow`/`DisabledMenuCard` isolées (liste verticale) : cible tactile `min-h-16`, largement > 44px.
- Bouton Se déconnecter : `h-11` explicite, repris du bloc existant.
- Vérifié sur un viewport mobile réel, pas une fenêtre desktop redimensionnée.

### Questions ouvertes UI

Toutes résolues par l'implémentation actuelle — aucune ne reste ouverte pour cet écran :

1. **Grille 2 colonnes vs carte pleine largeur** : tranché en faveur de la grille 2 colonnes pour « Suivi de l'équipe » (deux cartes réelles, contrairement à la carte « Documents » solitaire envisagée en rédaction initiale) ; `ExternalLinkRow`/`DisabledMenuCard` isolées en liste verticale sinon.
2. **Entête « CLUB & ADMINISTRATION »** : conservé, la section porte trois entrées (addendum point 4).
3. **Icônes** : `@tabler/icons-react` partout, jamais l'emoji de la maquette v0 — cohérent avec le reste du dépôt.
4. **Style du bouton de déconnexion** : `variant="destructive"` repris à l'identique de `ProfilePage.tsx`, pas le contour neutre de la maquette v0 — cohérence entre les deux seuls endroits de l'app où cette action existe.
</content>
