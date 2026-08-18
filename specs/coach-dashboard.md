# Spec — Tableau de bord Coach

> Statut : PO-1, PO-2, PO-3, PO-4, PO-5, PO-6 et PO-7 tranchés (décision développeuse, 2026-08-18) — prête pour la conception d'interface (designer-agent). Seul PO-6b reste ouvert et ne bloque pas le design (voir §5).
> Sources : `priorisation-fonctionnelle-as-acaribbean.md` (P0/P1 + matrice RBAC), `roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles), `ARCHITECTURE.md` (§7 permissions, §11 journal d'audit, §13.4 BottomNav), maquette `docs/designs/v4_coach_dashboard.png`.
> Aucune spec antérieure n'existe : ce document est le premier de la série.
> Emplacement : confirmé à la racine (`specs/`) — `ARCHITECTURE.md` §13.1 mis à jour en conséquence, `docs/specs/` supprimé.

**Statut de la maquette** : la maquette v4 est lisible et a servi de base à cette spec. Elle n'est cependant **pas une source de vérité fonctionnelle** : elle contient plusieurs blocs sans fondement dans le CDC ou relevant du P1 (voir §1 « Écarts maquette / CDC »). Le CDC et la matrice RBAC priment ; la maquette informe la mise en page.

## 1. Périmètre

Écran d'accueil de l'utilisateur portant le rôle **Coach/Staff**, après authentification. C'est une **surface d'agrégation et de navigation** au-dessus de modules P0 existants, pas un module fonctionnel autonome.

### Modules CDC concernés

| Module CDC | Priorité | Ce que le tableau de bord en expose |
|---|---|---|
| Équipes et sections | P0 | Équipe(s) où l'utilisateur est affecté comme Coach/Staff pour la saison en cours, effectif |
| Calendrier et convocations | P0 | Prochaine échéance mise en avant + liste « À venir » ; état des réponses aux convocations |
| Présences et suivi sportif | P0 | Accès à la saisie de présence. Aucune indisponibilité d'aptitude sur cet écran (décision PO-3, voir §3) |

### Contenu retenu — issu de la maquette et fondé dans le CDC

1. **En-tête** : pastille du rôle actif (« Coach »), salutation avec le prénom de l'utilisateur connecté, initiales/avatar avec pastille de notification. Ligne de contexte : équipe · effectif · repère de journée (formule du repère de journée : PO-7, non nécessaire pour le P0).
   - **Sélecteur d'équipe** (ex. « SF - Groupe A ▾ ») accolé à la pastille de rôle, pour le coach affecté à plusieurs équipes (maquette v4 mise à jour). Décision PO-6 : affiché en v1, **sans fonction de bascule** — la sélection ne change rien à l'écran pour l'instant (une seule équipe rendue, comme aujourd'hui). Le composant est un affichage, pas un CTA ; brancher la bascule d'équipe est un travail ultérieur.
   - **Pastille de rôle, si compte multi-rôles** : cliquable dans la maquette. Décision PO-2 : le clic **ne fait rien en v1** (`onClick` no-op ou absent). Le comportement attendu à terme — changer de rôle actif et recomposer le tableau de bord en conséquence — est documenté mais pas implémenté ; marquer d'un `// TODO(PO-2)` au point d'accroche du clic.
2. **Carte « Prochain match »** : adversaire, compte à rebours, date/heure, lieu, heure de RDV.
3. **Barre de réponses aux convocations** : répartition présents / absents / en attente. **Pas d'action de relance en v1** (décision PO-4, voir plus bas) : la barre est un indicateur, pas un point d'action.
   - Ces compteurs portent sur des **`ConvocationResponse`** (intention déclarée par le joueur), **jamais** des `AttendanceRecord` (présence constatée par le coach). Les deux entités restent distinctes (`CLAUDE.md` §6) : un joueur ayant répondu « présent » n'est pas un joueur présent.
4. **Liste « À venir »** : échéances suivantes (entraînement, réunion, événement), chacune avec son taux de réponse, plus un lien « Voir tout » vers le Calendrier. Pas d'action de relance par ligne, même règle qu'au point 3.
5. **Bouton d'action flottant `+`** : création d'une convocation, borné aux équipes du coach (permission « Créer/modifier une convocation ✅ son équipe »).
6. **Navigation basse à 4 entrées** : Dashboard · Calendrier · Actus · Menu — cohérente avec `ARCHITECTURE.md` §13.4. Elle appartient à l'`AppShell` partagé, pas à cette feature.
7. **Bloc « Forme récente » (V/N/D) et « Buts marqués / encaissés »** : conservés en v1 (décision PO-1, voir plus bas), mais avec des **valeurs statiques (hardcodées)**, non branchées sur une source de données réelle — aucun module « résultats et compétitions » n'existe encore dans le CDC. Le code marque ce point d'un `// TODO(PO-1)` explicite à l'endroit où les valeurs sont hardcodées, pour un futur remplacement par un vrai calcul quand le module correspondant existera.

### Écarts maquette / CDC

| Bloc de la maquette | Problème | Renvoi | Statut |
|---|---|---|---|
| **« Forme récente » (V/N/D)** et **« Buts marqués / encaissés »** | Aucun module « résultats et compétitions » n'existe dans la priorisation P0/P1. Ce sont des indicateurs agrégés, donc au mieux du **P1 « Statistiques et exports »**, et ils supposent une saisie de résultats de match non spécifiée | PO-1 | **Résolu** (décision développeuse, 2026-08-18) : conservés en v1, valeurs hardcodées, `// TODO(PO-1)` dans le code — voir §1 point 7 |
| **« Loto du club »** dans « À venir » | Relève d'**Événements et bénévoles (P1)**, et le périmètre du coach est « son équipe », pas les événements du club | PO-4 | **Résolu** par déduction de la règle « Périmètre de données » ci-dessus : un événement club n'est pas une échéance de l'équipe du coach, il n'apparaît pas dans « À venir » |
| **Action « Relancer les N indécis »** | Fondée pour ses équipes (« Envoyer une communication ciblée ✅ son équipe ») mais le module **Communication est P1**. Sur une réunion staff ou un événement club, elle sort du périmètre « son équipe » | PO-4 | **Résolu** (décision développeuse, 2026-08-18) : CTA non affiché en v1, voir §1 points 3-4 |
| **Onglet « Actus »** | Annonces internes = module **Communication (P1)**. À ne pas confondre avec une zone d'actualités publique, qui n'existe pas (appli interne, section 3.1) | PO-1 | **Résolu** (décision développeuse, 2026-08-18) : onglet conservé dans la nav basse (fixe, `ARCHITECTURE.md` §13.4), écran de contenu réduit à un stub avec `// TODO(PO-1)`, pas de vraie intégration Communication en v1 |
| **« 18 licenciés »** | Compteur agrégé acceptable ; le **statut de licence individuel** relève d'Adhérents et licences, dont le coach n'est pas titulaire | PO-6b | Ouvert — indépendant de la question du sélecteur d'équipe (PO-6, résolue, voir §1 point 1) |
| **Pastille de rôle « Coach »** | Confirme qu'un indicateur de rôle actif est prévu, mais pas si elle permet de **changer** de rôle | PO-2 | **Résolu** (décision développeuse, 2026-08-18) : cliquable en v1 mais sans effet (no-op), `// TODO(PO-2)` — voir §1 point 1 |

### Hors périmètre — explicitement

- **Tout export CSV/PDF** : le coach n'a pas la permission « Exporter des données ». Aucun bouton d'export, aucune fonction de copie de l'effectif.
- **Toute donnée financière** — statut de cotisation, montant, relance de paiement, même agrégée. Permission « Voir le statut de cotisation » = ❌ pour le coach ; limite de rôle explicite : « Pas de données financières globales ».
- **Tout diagnostic ou détail de santé** : voir §3.
- **ASC Legacy** (P1) : absent de la maquette, absent de cette spec.
- **La création de convocation, la saisie de présence et la saisie d'évaluation elles-mêmes** : le tableau de bord y **renvoie**, il ne les implémente pas. Elles appartiennent aux features Calendrier et Suivi sportif.

### Périmètre de données — la règle centrale

Toute donnée affichée est bornée aux **équipes auxquelles l'utilisateur est affecté comme Coach/Staff pour la saison en cours** (AC-02, section 17.2 du CDC). Jamais « toutes les équipes de la section », jamais « tout le club ».

## 2. RBAC

### Rôle titulaire de l'écran

**Coach/Staff.** Permissions lues directement dans la matrice, et leur traduction sur cet écran :

| Permission (matrice RBAC) | Valeur pour Coach/Staff | Conséquence sur le tableau de bord |
|---|---|---|
| Voir son propre profil/dossier | ✅ | En-tête : identité, initiales, rôle actif |
| Voir les dossiers des autres membres | ❌ (son équipe, hors financier) | Effectif et réponses des joueurs de ses équipes lisibles ; aucun champ financier rendu, même vide |
| Créer/modifier une convocation | ✅ (son équipe) | Bouton `+` présent, borné à ses équipes |
| Consulter une convocation en mode dégradé | ✅ | Sans objet en v1 : pas de mode dégradé implémenté sur cet écran (décision PO-5) |
| Saisir une évaluation sportive | ✅ (son équipe) | Point d'entrée possible vers la saisie d'évaluation |
| Consulter une donnée de santé (hors diagnostic) | ❌ | Aucun indicateur de santé ou d'aptitude sur cet écran (décision PO-3, voir §3) |
| Voir le statut de cotisation | ❌ | Aucun bloc, aucune carte, aucune mention |
| Gérer échéanciers et relances | ❌ | — |
| Gérer postes/missions bénévoles | ❌ | — |
| Envoyer une communication ciblée | ✅ (son équipe) | Non exploitée en v1 : le CTA « Relancer les N indécis » qui s'en servait est retiré de l'écran (décision PO-4). Permission inchangée pour un usage futur ou une autre feature |
| Exporter des données | ❌ | Aucun export |
| Gérer comptes, rôles, paramétrage | ❌ | — |
| Consulter le journal d'audit | ❌ | — |

**Règle d'affichage** (moindre privilège, section 3 du CDC ; `ARCHITECTURE.md` §7) : une action non autorisée donne lieu à une **carte absente**, pas à une carte grisée ni à une erreur au clic.

### Autres rôles face à cet écran

Les comptes multi-rôles sont la norme (section 3 du CDC : « un utilisateur peut cumuler plusieurs rôles »). Cet écran n'est donc pas « l'écran d'un utilisateur » mais **« la vue Coach d'un utilisateur »** — ce que la pastille de rôle de la maquette rend explicite.

| Rôle | Interaction avec cet écran |
|---|---|
| Joueur/Joueuse | Aucun accès à cette vue. Un compte cumulant Joueur + Coach a droit aux deux vues ; la bascule entre elles passe par la pastille de rôle de l'en-tête, **non fonctionnelle en v1** (décision PO-2, voir §1 point 1) — en attendant, l'accès à la vue Coach se fait par un autre chemin (ex. navigation directe), à préciser lors du câblage de la bascule |
| Responsable de section | Périmètre « sa section », plus large et non identique. Cette spec **ne définit pas** son tableau de bord ; en cumul avec Coach, il accède à la vue Coach pour les seules équipes où il est affecté comme coach |
| Dirigeant habilité | Périmètre distinct, hors de cette spec |
| Trésorier | Aucun accès (données sportives limitées) |
| Référent médical | Aucun accès. Son périmètre santé est un écran distinct et tracé |
| Bénévole | Aucun accès (« pas d'accès aux dossiers adhérents ») |
| Administrateur | ✅ sur les permissions sous-jacentes. L'accès à cette vue passe par l'administration, jamais par une auto-affectation à une équipe |

### Application technique

Conformément à `ARCHITECTURE.md` §7 : chaque restriction ci-dessus existe **en RLS Postgres** (autorité) et en miroir dans `domain/policies/rbac-matrix.ts` (ergonomie). Une carte masquée côté React ne prouve rien : AC-01/AC-02 se testent avec un jeton coach contre la base, pas contre l'interface.

## 3. Données sensibles

### Données de santé — aucune, décision fermée

**Résolu (PO-3, décision développeuse, 2026-08-18) : ce tableau de bord n'affiche aucun indicateur de santé ou d'aptitude, et ce n'est pas un besoin.** La maquette v4 n'en montre aucun — les compteurs « absents » portent sur des réponses de convocation, pas sur des indisponibilités médicales — et il n'y a pas lieu d'en anticiper un. La spec ne conserve donc plus d'hypothèse conditionnelle sur un drapeau d'aptitude : si un besoin de ce type apparaît un jour, il relève d'une nouvelle spec (et d'un nouvel arbitrage RGPD), pas d'une extension de cet écran.

### Données financières — non, et à garder ainsi

Aucune. Exclusion active, pas omission : voir §1 et AC-CD-03.

### Export nominatif — non

Permission absente pour le coach. Aucun export depuis cet écran.

### Actions métier journalisées

Le tableau de bord est **entièrement en lecture seule en v1** : l'action de relance (« Relancer les N indécis ») qui aurait déclenché un envoi de communication ciblée est retirée de l'écran (décision PO-4, voir §1). Aucune action métier à journaliser depuis cette feature pour l'instant. Si le CTA est réintroduit plus tard (Communication devenant P0, ou décision Bureau), la question de la journalisation de l'envoi se reposera alors, depuis le use case du module Communication, jamais depuis le composant.

## 4. Critères d'acceptation

**AC-01** et **AC-02** sont ceux de la section 17.2 du CDC et s'appliquent tels quels. Les critères propres à cet écran sont préfixés `AC-CD-` faute d'accès au numérotage complet de la section 17.2 (CDC disponible ici en PDF non extractible) ; à renuméroter dans la série officielle lors de la recette.

| Réf. | Critère |
|---|---|
| **AC-01** | Depuis un compte cumulant Coach et Joueur, aucune donnée d'un membre extérieur à ses équipes n'est accessible, ni à l'écran ni dans la réponse API |
| **AC-02** | Un coach affecté à l'équipe A et non à l'équipe B ne voit sur son tableau de bord aucune échéance, aucun effectif et aucune convocation de l'équipe B. Vérifié par appel direct à l'API avec un jeton coach, hors application |
| AC-CD-01 | Seules les équipes de la **saison en cours** où l'utilisateur est affecté comme Coach/Staff apparaissent ; une affectation de saison antérieure n'y figure pas |
| AC-CD-02 | Un compte Coach sans affectation d'équipe, ou sans échéance à venir, obtient un état vide explicite — jamais une erreur ni un chargement infini |
| AC-CD-03 | Aucune donnée financière (statut de cotisation, montant, relance de paiement) n'apparaît à l'écran ni dans les réponses API qui l'alimentent, pour un jeton coach |
| AC-CD-04 | Les compteurs présents / absents / en attente sont calculés à partir des **réponses aux convocations** et non des présences constatées ; une présence saisie a posteriori ne modifie pas ces compteurs |
| AC-CD-05 | Le total présents + absents + en attente est égal au nombre de convoqués de l'échéance |
| AC-CD-05b | Aucune action de relance n'est rendue à l'écran en v1 (ni sur la barre de réponses, ni par ligne de la liste « À venir ») — décision PO-4 |
| AC-CD-05c | Les blocs « Forme récente » et « Buts marqués / encaissés » affichent des valeurs statiques identiques pour tout utilisateur Coach, quelle que soit son équipe ; le code source porte un commentaire `// TODO(PO-1)` à l'endroit où ces valeurs sont définies |
| AC-CD-05d | L'onglet « Actus » de la navigation basse est présent et cliquable (nav fixe, `ARCHITECTURE.md` §13.4) ; l'écran qu'il ouvre est un stub explicite (pas une page blanche, pas une erreur), portant un commentaire `// TODO(PO-1)` |
| AC-CD-06 | Le bouton `+` ne propose que les équipes où l'utilisateur est affecté comme Coach/Staff ; une tentative de création sur une autre équipe est refusée **par la base**, pas seulement par l'interface |
| AC-CD-07 | Aucune carte ni bouton correspondant à une action non autorisée (export, cotisations, gestion de comptes) n'est rendu — absence, pas désactivation |
| AC-CD-08 | Chaque bloc renvoie vers l'écran du module correspondant (« Voir tout » → Calendrier, échéance → détail) ; le tableau de bord ne duplique aucune saisie |
| AC-CD-09 | Aucune information d'aptitude, de santé ou de diagnostic n'apparaît à l'écran ni dans les réponses API qui l'alimentent, pour un jeton coach — décision PO-3 (§3) |
| AC-CD-10 | Affichage complet en moins de 3 secondes sur mobile en réseau normal (section 12 du CDC) |
| AC-CD-11 | Contrastes conformes AA — à vérifier spécifiquement sur le thème sombre de la maquette, notamment les textes gris sur fond noir et le vert/rouge de la barre de réponses — et navigation clavier opérationnelle (section 12) |
| AC-CD-12 | L'information portée par la couleur (vert/rouge/gris de la barre, pastilles V/N/D si retenues) est doublée d'un libellé textuel — la couleur seule n'est pas un vecteur d'information accessible |
| AC-CD-13 | Le clic sur la pastille de rôle en en-tête ne produit aucun effet visible en v1 (pas de navigation, pas de changement d'état) ; `// TODO(PO-2)` au point d'accroche. Un compte multi-rôles conserve l'accès à ses autres vues par un autre chemin que cette pastille |
| AC-CD-14 | Le sélecteur d'équipe en en-tête (ex. « SF - Groupe A ▾ ») est rendu pour un coach multi-équipes et affiche l'équipe courante ; son clic ne produit aucun effet visible en v1 — décision PO-6 |

## 5. Points ouverts

| Réf. | Question | À trancher par | Statut |
|---|---|---|---|
| **PO-1** | La priorisation classe « tableaux de bord par rôle » en **P1**. Confirmer la lecture retenue ici — écran d'agrégation/navigation P0, indicateurs agrégés P1 — et statuer sur les blocs « Forme récente », « Buts » et l'onglet « Actus » de la maquette, qui supposent respectivement un suivi de résultats de match non spécifié dans la priorisation et le module Communication (P1). Sont-ils du périmètre v1 ou à retirer de la maquette ? | Bureau + développeuse | **Résolu** (développeuse, 2026-08-18) : conservés en v1 avec données hardcodées et `// TODO(PO-1)` dans le code — voir §1 point 7, §1 « Écarts maquette / CDC », AC-CD-05c/05d. Le calcul réel reste à faire quand un module Résultats/Communication existera |
| **PO-2** | Comment un compte multi-rôles atteint-il ses différentes vues : tableau de bord unique composé par rôles, ou bascule via la pastille de rôle visible dans la maquette ? Décision structurante, elle conditionne tous les tableaux de bord, pas seulement celui-ci | Bureau + développeuse | **Résolu pour v1** (développeuse, 2026-08-18) : bascule via la pastille de rôle retenue comme cible, mais **non implémentée en v1** — le clic ne fait rien (`// TODO(PO-2)`), voir §1 point 1, AC-CD-13. La question structurante (comment la bascule recompose le dashboard) reste entière pour le jour où elle sera câblée — elle n'est reportée qu'en implémentation, pas tranchée sur le fond |
| **PO-3** | L'affichage d'un drapeau d'aptitude (apte/inapte, sans diagnostic) constitue-t-il une « consultation de donnée de santé » au sens de la section 11.3, donc à journaliser à chaque affichage ? Et à quelle condition l'aptitude est-elle « accordée » à un coach (par joueur, par équipe, sur décision du référent médical) ? Rejoint la décision n°5 du CDC (section 22 : données santé réellement nécessaires) | Référent RGPD | **Résolu** (développeuse, 2026-08-18) : pas de drapeau d'aptitude sur cet écran, le besoin n'existe pas — voir §3, AC-CD-09. La question de journalisation ne se pose donc plus ici |
| **PO-4** | Périmètre de la relance : le coach peut relancer « son équipe », mais la maquette propose la relance sur une réunion staff et fait figurer un événement club (« Loto »). Un coach peut-il relancer au-delà de son équipe ? L'envoi de communication est-il une action à journaliser ? Et la relance est-elle disponible en v1 alors que Communication est P1 ? | Bureau | **Résolu** (développeuse, 2026-08-18) : CTA non affiché en v1 — voir §1 points 3-4, AC-CD-05b. Question de périmètre au-delà de « son équipe » redevient pertinente si/quand le CTA est réintroduit |
| **PO-5** | Le « mode dégradé offline » est exigé pour Calendrier et convocations, et la matrice donne la consultation en mode dégradé à tous les rôles. S'étend-il au tableau de bord (échéances et compteurs lisibles hors connexion) ou seulement à l'écran Calendrier ? La stratégie de cache est elle-même un point ouvert d'`ARCHITECTURE.md` §14 | Développeuse, lors du module Calendrier | **Résolu pour v1** (développeuse, 2026-08-18) : pas de mode dégradé implémenté sur cet écran — voir §2. La stratégie de cache pour Calendrier reste un point ouvert d'`ARCHITECTURE.md` §14, indépendant de ce dashboard |
| **PO-6** | Un coach affecté à plusieurs équipes : vue agrégée ou sélecteur d'équipe ? La maquette suppose une équipe unique (« Seniors · 18 licenciés »). | Bureau / designer-agent | **Résolu** (développeuse, 2026-08-18) : sélecteur d'équipe ajouté à la maquette v4, affiché en v1 sans fonction de bascule — voir §1 point 1, AC-CD-14 |
| **PO-6b** | Le compteur « licenciés » implique-t-il l'accès du coach au statut de licence individuel, ou seulement à un agrégat ? | Bureau | Ouvert |
| **PO-7** | Comment calculer le « repère de journée » (J{repère}) affiché en en-tête ? | Développeuse | **Résolu** (développeuse, 2026-08-18) : formule définie — le repère de journée du prochain match est le **numéro du match + 1**. Le numéro de match se déduit du rang du match dans la liste ordonnée des convocations de l'équipe (§1 « Périmètre de données ») : à partir de cette liste, on obtient directement le numéro du prochain match, donc son repère de journée. **Non nécessaire pour le P0** : la formule est documentée pour une implémentation future, mais en v1 la valeur peut rester statique/hardcodée, même traitement que les blocs « Forme récente »/« Buts » (PO-1) — `// TODO(PO-7)` à l'endroit du calcul si non branché |

## UI design

**Sources utilisées, par ordre de priorité effectif** : `docs/designs/v4_coach_dashboard.png` (seule maquette du projet existante à ce jour — sert de référence visuelle principale) et le présent spec (§1 Périmètre, §2 RBAC, §5 Points ouverts). Aucun fichier `wireframes-basiques-as-caribbean.md` n'existe dans ce dépôt à ce jour ; aucune autre maquette liée (dashboard d'un autre rôle, écran Calendrier, écran Actus) n'existe encore sous `docs/designs/`. Ce document ne peut donc pas s'appuyer sur un pattern de nav basse ou de carte déjà posé ailleurs — il **établit** ce pattern pour ce premier écran du projet, à réutiliser tel quel par les prochaines maquettes/spécifications (dashboards des autres rôles notamment).

### Emplacement dans la nav

Écran **Dashboard**, premier des 4 onglets fixes (Dashboard · Calendrier · Actus · Menu), état par défaut à l'ouverture pour un compte dont le rôle actif est Coach/Staff. Aucun nouvel onglet, aucune nav adaptative par rôle — conforme à la contrainte de nav fixe. La nav basse elle-même appartient à l'`AppShell` partagé (`presentation/app/AppShell.tsx` / `BottomNav.tsx` par `docs/ARCHITECTURE.md` §13.4), pas à cette feature ; rien à concevoir ici pour la nav en tant que composant, seulement son état actif (« Dashboard » surligné en vert, cf. maquette).

L'onglet **Actus** reste présent et cliquable (nav fixe) mais ouvre un écran stub (PO-1) : un état simple — titre « Actus », un message centré du type « Bientôt disponible » ou équivalent, pas de liste, pas de squelette de chargement infini. Pas de conception plus poussée nécessaire pour ce stub tant que Communication (P1) n'est pas spécifié.

### Structure de l'écran, de haut en bas

1. **En-tête**
   - Pastille de rôle (« Coach », icône bicolore verte/rouge dans la maquette) — cliquable visuellement (curseur pointeur, léger état pressed) mais **no-op** en v1 (PO-2). Pas de changement d'apparence au clic au-delà d'un éventuel retour tactile standard (ripple/opacity) déjà fourni par le composant Button/Pill du design system, s'il existe — sinon, aucun retour visuel n'est requis puisqu'il n'y a pas d'action.
   - **Sélecteur d'équipe** (« SF - Groupe A ▾ »), pastille accolée à droite de celle du rôle, uniquement rendue pour un coach affecté à plusieurs équipes actives (sinon absente, pas grisée — même règle que pour les cartes). No-op au clic en v1 (PO-6), même traitement que la pastille de rôle : pas de menu déroulant fonctionnel, le chevron reste décoratif.
   - Avatar / initiales avec pastille de notification (point rouge), aligné à droite — comportement de la pastille de notification hors périmètre de cette feature (pas défini ici, à traiter par la feature notifications si/quand elle existe).
   - Salutation « Bonjour, {prénom} » sur deux lignes si besoin, taille de titre.
   - Ligne de contexte : « {Équipe} · {N} licenciés · J{repère} » — le repère de journée (ex. « J6 ») et le compteur de licenciés viennent de données réelles bornées à l'équipe (§1 « Périmètre de données »). Formule du repère de journée : voir PO-7 (§5) — **non nécessaire pour le P0**, une valeur statique/hardcodée reste acceptable en v1, même traitement que les blocs « Forme récente »/« Buts » (point 7 ci-dessus).

2. **Carte « Prochain match »**
   - Bandeau supérieur : libellé « PROCHAIN MATCH » + badge compte à rebours (« J-3 ») aligné à droite.
   - Nom de l'adversaire en gros, ligne date/heure · lieu · heure de RDV en dessous.
   - **Barre de réponses aux convocations** : trois segments empilés horizontalement (vert = présents, rouge = absents, gris = en attente), largeur proportionnelle aux comptes ; en dessous, trois libellés textuels avec leur valeur numérique (« 12 présents », « 2 absents », « 4 en attente ») — texte obligatoire, la couleur seule ne porte jamais l'information (AC-CD-12).
   - **Aucun CTA de relance** sous la barre (PO-4/AC-CD-05b) : la carte se termine sur la barre + ses trois libellés. Pas de bouton blanc pleine largeur comme dans la maquette — cette zone est simplement retirée, la carte se referme après la ligne de comptage, sans espace vide compensatoire artificiel (padding bas standard de la carte).
   - Tape sur la carte (hors zone barre) : renvoie vers le détail de l'échéance dans Calendrier (AC-CD-08) — cohérent avec la règle « le dashboard renvoie, il n'implémente pas ».

3. **Blocs « Forme récente » et « Buts »** (côte à côte, deux cartes de largeur égale)
   - « Forme récente » : titre + rangée de 5 pastilles rondes (V/N/D), couleur + lettre visible dans la pastille (le texte porte déjà l'info, pas seulement la couleur — satisfait AC-CD-12 nativement).
   - « Buts » : titre + deux lignes « marqués » (vert) / « encaissés » (rouge), valeur numérique en gros à gauche du libellé.
   - Valeurs statiques identiques pour tout coach (AC-CD-05c) — rien à concevoir en termes d'état vide ou de chargement pour ces deux blocs puisqu'ils ne dépendent d'aucune donnée dynamique en v1.

4. **Liste « À venir »**
   - En-tête de section : « À venir » à gauche, lien « Voir tout » à droite (renvoie vers Calendrier, AC-CD-08).
   - Chaque ligne : liseré vertical coloré à gauche (vert = entraînement, orange = réunion, ...) pour distinguer visuellement le type d'échéance, titre de l'échéance, sous-ligne date/heure · lieu, taux de réponse en haut à droite (« 15/18 »).
   - **Aucun bouton « Relancer les N indécis » par ligne** (PO-4/AC-CD-05b) : la ligne se limite à titre + sous-ligne + compteur, pas de zone d'action.
   - « Loto du club » (événement club, hors périmètre équipe) : **absent de la liste** — conforme à la règle « Périmètre de données » (§1), la liste ne contient que des échéances des équipes du coach.
   - Tape sur une ligne : renvoie vers le détail de l'échéance dans Calendrier (même règle qu'au point 2).
   - État vide (AC-CD-02) : si aucune échéance à venir, la section affiche un message explicite (« Aucune échéance à venir » ou équivalent) à la place de la liste, jamais une liste vide silencieuse ni un chargement qui ne se termine pas.

5. **Bouton d'action flottant `+`**
   - Position : bas droit, au-dessus de la nav, superposé au contenu scrollable (comme dans la maquette).
   - Ouvre la création de convocation, équipes proposées bornées à celles du coach (AC-CD-06) — l'écran de création lui-même appartient à la feature Calendrier, pas à celle-ci (§1 « Hors périmètre »).
   - Visible uniquement si la permission « Créer/modifier une convocation ✅ son équipe » est vraie pour l'utilisateur (elle l'est systématiquement pour Coach/Staff selon la matrice RBAC) — absent, jamais grisé, si un futur rôle cumulé ne l'avait pas.

6. **Nav basse à 4 entrées** — cf. « Emplacement dans la nav » ci-dessus, rien de spécifique à concevoir.

### Composants réutilisés vs nouveaux

- **Réutilisés directement de `docs/designs/v4_coach_dashboard.png`** : carte « Prochain match » (structure bandeau + titre + méta + barre de progression tri-segments), cartes jumelles « Forme récente »/« Buts », ligne de liste avec liseré coloré + compteur à droite, bouton flottant `+`, en-tête avec pastilles + avatar. Ce sont les seuls patterns visuels disponibles pour ce projet à ce stade ; toute future feature de type « carte d'échéance » ou « barre de réponse » doit s'aligner sur ceux-ci plutôt qu'en inventer de nouveaux.
- **Nouveau, mais pas un nouveau pattern visuel** : le sélecteur d'équipe est une variation directe de la pastille de rôle déjà présente dans la maquette (même forme, même traitement no-op) — pas une justification de pattern inédit, juste une deuxième pastille du même type accolée à la première.
- **Aucun composant réellement inédit** n'est nécessaire pour cette version : tout ce qui apparaît dans la maquette est soit conservé tel quel, soit retiré (bouton de relance), jamais remplacé par une forme nouvelle.

### Ce qui change par rôle

Cet écran n'est rendu que pour un utilisateur dont un des rôles actifs est Coach/Staff (§2 « Rôle titulaire de l'écran ») ; les autres rôles n'y accèdent pas (§2 « Autres rôles face à cet écran », tableau). Il n'y a donc pas de variation de contenu *au sein* de l'écran par rôle affiché simultanément — pas de « vue combinée » Coach+Trésorier par exemple. La seule variation actuelle :

- **Sélecteur d'équipe** : rendu seulement si le coach a plusieurs affectations d'équipe actives ; absent (pas grisé) sinon — cf. §2 RBAC, aucune permission distincte, c'est une question de cardinalité de données, pas d'autorisation.
- **Bouton `+`** : présent car la permission de création de convocation est acquise pour Coach/Staff dans la matrice RBAC ; si un futur rôle accédant à cet écran ne l'avait pas, la carte disparaît (jamais grisée), conformément à la règle générale du §2.
- Aucun autre bloc de cet écran n'est conditionné par une permission variable au sein du rôle Coach/Staff : les blocs financiers, export, santé sont **catégoriquement absents**, pas des variantes cachées/affichées selon un sous-cas.

### Questions ouvertes UI

Aucune. Tous les points bloquants pour ce screen (PO-1 à PO-6) sont tranchés côté spec, et aucun composant visuel nouveau n'est requis — la maquette existante couvre l'intégralité de la mise en page une fois les blocs de relance retirés. PO-6b (portée du compteur « licenciés ») reste ouvert mais n'affecte pas la conception : le compteur reste un agrégat textuel simple quelle que soit l'issue.

**Prêt pour transmission à mentor-agent : oui.**
