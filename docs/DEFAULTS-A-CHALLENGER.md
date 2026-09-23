# Valeurs par défaut à challenger — AS Caribbean

> Objectif : tracer les décisions techniques prises rapidement (valeur par défaut d'une lib, config recopiée d'une doc officielle, choix "raisonnable" non challengé) pour ne pas les oublier une fois le code écrit et fonctionnel. Une valeur par défaut qui marche en dev n'est pas une valeur validée pour la production.
>
> Règle d'ajout : toute config touchée sans analyse explicite du contexte AS Caribbean (offline, budget, volume réel) mérite une ligne ici, même si elle semble anodine sur le moment.
>
> Statut : document vivant, alimenté au fil du développement. Une ligne sort de ce tableau quand elle a été explicitement tranchée (valeur confirmée ou changée) — pas simplement quand on s'y est habitué.

## Format d'une entrée

- **Où** : fichier / module concerné
- **Valeur actuelle** : ce qui est en place aujourd'hui
- **Pourquoi cette valeur, provisoirement** : la raison qui a justifié de ne pas s'arrêter dessus tout de suite
- **Ce qu'il faudrait challenger** : la vraie question à trancher, et sur quelle base (mesure, contexte métier, contrainte CDC)
- **Priorité de revisite** : avant mise en prod / après premiers retours réels / basse

---

## TanStack Query — `QueryProvider`

**Où** : `presentation/app/providers/query-provider.tsx`

**Valeur actuelle** :
```ts
defaultOptions: {
  queries: {
    retry: 1,
    staleTime: 30_000,
  },
}
```

**Pourquoi cette valeur, provisoirement** : valeurs raisonnables pour démarrer, sans étude fine du comportement réseau réel de l'appli (stade, gymnase, connexions mobiles variables des membres).

**Ce qu'il faudrait challenger** :
- `staleTime` global de 30s a-t-il un sens pour *toutes* les queries ? Une convocation dont le statut vient de changer (fermeture automatique via trigger SQL) et un profil membre qui change une fois par mois n'ont pas la même fraîcheur raisonnable. À surcharger par query plutôt que laisser une seule valeur globale ?
- `retry: 1` est-il le bon comportement en mode dégradé offline (exigence CDC section 12) ? Ou faut-il détecter l'absence de réseau en amont (ex. `navigator.onLine` ou équivalent) et servir directement le cache local sans tenter de retry ?
- `gcTime` n'est pas configuré (valeur par défaut de la lib : 5 min) — jamais évalué si c'est adapté au mode dégradé offline où on veut peut-être garder les convocations consultées plus longtemps en mémoire.

**Priorité de revisite** : avant le développement du module Calendrier (mode dégradé offline explicitement dans son périmètre, cf. `ARCHITECTURE.md` section 14 et `wireframes-basiques-as-caribbean.md`).

---

## Identifiants d'entities — tous typés `string` brut, sans distinction nominale

**Où** : `domain/entities/*.ts` (tous les champs `xxxId`, ex. `Team.sectionId`, `Team.seasonId`, `Membership.seasonId`)

**Valeur actuelle** :
```ts
export interface Team {
  id: string
  name: string
  sectionId: string
  seasonId: string
}
```

**Pourquoi cette valeur, provisoirement** : les UUID Postgres se sérialisent en `string` en JSON, et TypeScript n'a pas de type UUID natif — `string` est le plus petit dénominateur commun qui ne fait fuiter aucune dépendance à Postgres dans `domain/` (cohérent avec `ARCHITECTURE.md` §3). C'est aussi le pattern déjà en place partout ailleurs dans le domaine (`userId`, `convocationId`, etc.), donc suivre l'existant plutôt que d'introduire une exception locale.

**Ce qu'il faudrait challenger** :
- TypeScript fait du typage **structurel**, pas nominal (contrairement à Dart) : rien n'empêche de passer `team.seasonId` là où `sectionId` est attendu, tant que les deux sont des `string`. Le risque devient concret dès qu'une entity porte plusieurs `xxxId` adjacents du même type primitif — c'est déjà le cas sur `Team` (`sectionId` + `seasonId` côte à côte) et ce le sera davantage sur des entities à venir avec plus de références (ex. `Convocation` : `teamId`, potentiellement `sectionId`, `createdBy`…).
- La correction possible est le **branded type** (type "marqué", le plus proche du typage nominal de Dart) :
  ```ts
  type SectionId = string & { readonly __brand: 'SectionId' }
  type SeasonId = string & { readonly __brand: 'SeasonId' }
  ```
  Ça transforme une inversion de paramètres en erreur de compilation plutôt qu'en bug silencieux. Coût : chaque `string` brut venu de Supabase doit être explicitement casté au bon type marqué dans le mapper — de la friction réelle, pas gratuite.
- Ne pas introduire cette technique préventivement sur une ou deux entities isolées : le bénéfice n'apparaît que si la confusion devient plausible en pratique (beaucoup d'ids voisins, du même type, dans le même use case).

**Priorité de revisite** : basse pour l'instant — à réévaluer dès qu'une entity accumule 3+ champs `xxxId` adjacents (ex. `Convocation` une fois enrichie), ou si un bug d'inversion d'id est effectivement rencontré en pratique. Ne pas trancher avant l'un de ces deux déclencheurs.

---

## Autorisation de création d'un `opponents` (PO-CV-02)

**Où** : RLS sur la table `opponents` (migration `supabase/migrations/`), et `domain/repositories/opponent-repository.ts` (`create`)

**Valeur actuelle** : écriture restreinte à `administrateur` uniquement, en RLS. Aucune entrée correspondante dans `rbac-matrix.ts` — ce n'est pas traité comme une permission actée, juste un défaut prudent.

**Pourquoi cette valeur, provisoirement** : `opponents`/`team_opponents` devaient exister pour que `match_details.opponent_id` ait une cible valide, mais qui a le droit de créer un adversaire (un coach ad-hoc au moment de créer un match, vs. admin uniquement en amont) n'a jamais été tranché lors de la conception de la feature convocation — ce n'était pas son objet.

**Ce qu'il faudrait challenger** :
- Si l'écriture reste admin-only en pratique, un coach qui affronte un adversaire inconnu du référentiel se retrouve bloqué au moment de créer sa convocation match — quel est le parcours prévu (demander à un admin en amont, saisie libre temporaire, etc.) ?
- Si l'ouverture au coach est retenue, faut-il un contrôle a posteriori (dédoublonnage de noms d'adversaires saisis à la volée) plutôt qu'une contrainte a priori ?

**Priorité de revisite** : au moment où l'écran de préparation de saison / gestion des adversaires sera spécifié — ne pas trancher avant.

---

## Liste des lieux d'entraînement (PO-CV-03)

**Où** : `TRAINING_LOCATIONS` en dur dans le code applicatif (utilisé pour peupler un select/autocomplete du formulaire de convocation). `Convocation.location` reste un `string` libre, sans contrainte domaine ni base.

**Valeur actuelle** : tableau constant (`as const`) codé en dur, aucune table dédiée.

**Pourquoi cette valeur, provisoirement** : le nombre de lieux d'entraînement d'un club de cette taille est faible et change rarement — créer une table pour ça serait une couche pour un besoin non démontré (principe anti-anticipation, `ARCHITECTURE.md` §13.6).

**Ce qu'il faudrait challenger** :
- Si la liste commence à changer avec une fréquence réelle (nouveau gymnase, lieu temporaire pour une saison), la modification en dur nécessite un déploiement à chaque fois — est-ce acceptable au rythme réel du club ?
- Une table dédiée permettrait aussi de scoper les lieux par section/équipe si un besoin de ce type apparaît (aujourd'hui la liste est globale, non scopée).

**Priorité de revisite** : si la liste commence à changer avec une fréquence réelle en pratique. Pas avant.

---

## Écriture composite Convocation + satellite — une RPC dédiée par type

**Où** : `data/repositories/ConvocationRepositoryImpl.ts`, `supabase/migrations/` (`create_match_convocation`, `create_meeting_convocation`, `create_training_convocation`)

**Valeur actuelle** : une fonction RPC PL/pgSQL distincte par type de convocation, chacune codant en dur ses propres colonnes et sa propre table satellite (`match_details` pour l'une, `meeting_details` pour l'autre, aucune pour `training`).

**Pourquoi cette valeur, provisoirement** : c'était la solution la plus directe pour garantir l'atomicité (une fonction PL/pgSQL s'exécute dans une transaction implicite unique) sans introduire de mécanisme générique non demandé par le besoin actuel — cohérent avec le principe anti-anticipation (`ARCHITECTURE.md` §13.6). Trois types aujourd'hui, trois fonctions, pas de couche d'abstraction par-dessus.

**Ce qu'il faudrait challenger** :
- Si un futur type de convocation (ou un futur satellite pour `training`) s'ajoute, ce pattern impose une nouvelle fonction RPC quasi identique aux précédentes (même structure : `INSERT` parent, `INSERT` satellite, `RETURNING`) — dupliquée manuellement plutôt que généralisée. Une fonction RPC générique acceptant un payload `jsonb` pour la partie satellite réduirait la duplication, mais introduirait une perte de typage côté SQL et un couplage plus lâche entre le nom des colonnes et la fonction — à évaluer seulement si la duplication devient réellement pénible en pratique, pas par anticipation.

**Priorité de revisite** : basse — à réévaluer si un quatrième type de convocation (ou un satellite `training_details`) est ajouté et que la duplication de RPC devient visible/pénible, ou si un test d'intégration révèle un comportement RLS inattendu à l'intérieur d'une de ces fonctions.

---

## Zoom désactivé globalement — `<meta name="viewport">`

**Où** : `index.html`

**Valeur actuelle** :
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
```

**Pourquoi cette valeur, provisoirement** : `user-scalable=no` + `maximum-scale=1` donnent un rendu "app-like" cohérent avec la nav du bas fixe (pas de pinch-to-zoom qui décale la mise en page par-dessus des contrôles fixes) — un choix de confort d'usage général, pas une analyse zone par zone du contenu réellement affiché.

**Ce qu'il faudrait challenger** :
- CDC §12 (contraste AA, navigation clavier) suppose l'accessibilité pour les utilisateurs malvoyants — désactiver le zoom globalement retire un moyen de compensation (pinch-to-zoom) sur lequel certains membres peuvent s'appuyer pour lire le contenu, y compris hors des zones à contrôles fixes.
- Si un écran ou une zone de contenu a un besoin identifié de zoom (ex. consultation d'un document/certificat en image), le zoom devrait être réactivé scopé à cette seule zone (override `<meta>` dédié ou solution au niveau composant), pas globalement.

**Priorité de revisite** : avant mise en prod — l'accessibilité CDC §12 n'est pas optionnelle ; ne pas laisser ce défaut se figer sans un examen explicite des zones qui ont réellement besoin de zoom.

---

## Mapping `DomainError` → `UiError` non exhaustif

**Où** : `presentation/shared/errors/map-domain-error-to-ui-error.ts`

**Valeur actuelle** : chaîne d'`instanceof` avec un repli générique (`DomainError` non mappée, puis erreur réseau/inconnue), pas vérifiée par le compilateur.

**Pourquoi cette valeur, provisoirement** : les sous-classes de `DomainError` forment une hiérarchie de classes, pas une union discriminée avec un champ `code` — il n'existe donc pas de vérification `never` à la compilation comme celle qui existe pour `ConvocationType` ailleurs dans le code. Une branche oubliée ne casse pas le build, elle tombe silencieusement dans le repli générique.

**Ce qu'il faudrait challenger** :
- Une fois que le nombre de branches grandit, le risque qu'une nouvelle sous-classe de `DomainError` soit ajoutée sans branche dédiée dans ce mapper devient réel — faut-il faire porter un discriminant `code` aux erreurs de domaine pour retrouver une vérification à la compilation ?

**Priorité de revisite** : basse — à revisiter une fois que le mapper accumule assez de branches pour que ce risque devienne concret, ou si un cas manqué arrive réellement en production.

---

## Pas de composant toast/snackbar générique

**Où** : `presentation/shared/components/`

**Valeur actuelle** : les erreurs de mutation s'affichent comme un message inline local à l'action qui a échoué (ex. `PlayerDashboardPage`, `respondError`), pas via un composant de feedback partagé.

**Pourquoi cette valeur, provisoirement** : construire un composant de feedback partagé maintenant reviendrait à trancher des questions UX (empilement de plusieurs erreurs, durée d'affichage, façon de le fermer) sans avoir de second écran consommateur pour les éclairer.

**Ce qu'il faudrait challenger** :
- Construire le vrai composant dès qu'un deuxième écran a besoin du même type de feedback, ou dès que produit/design précise le comportement attendu d'un toast.

**Priorité de revisite** : après les premiers retours réels.

---

## Variante de l'écran détail convocation pilotée par l'onglet de rôle actif

**Où** : `domain/rules/active-role-scope.ts`, rendu de l'écran détail convocation (`presentation/features/convocation/ConvocationDetailPage.tsx` / `useConvocationDetailViewModel.ts`).

**Valeur actuelle** : la variante (joueur / coach) de la convocation est entièrement pilotée par l'onglet de rôle actif du tableau de bord (`useActiveRole()`), pas recalculée à partir de `user.roles` comparé à `convocation.teamId`.

**Pourquoi cette valeur, provisoirement** : choisi pour sa simplicité face à un modèle de composition par permission ; ne fait délibérément pas apparaître les deux variantes pour un compte joueur-coach de la même équipe sans bascule explicite d'onglet.

**Ce qu'il faudrait challenger** :
- Est-ce que ça devient une friction réelle une fois que des comptes joueur-coach existent vraiment au club et utilisent cet écran — si des demandes de support ou de la confusion observée apparaissent, reconsidérer une composition des deux variantes (booléens par capacité) plutôt qu'un simple aiguillage par rôle actif.

**Priorité de revisite** : après premiers retours réels — pas avant, pas de façon spéculative.

---

## Filtrage par saison des actus — via `current_season()`, pas `season_id`

**Où** : toute future requête « actus de la saison en cours » (`domain/repositories/news-repository.ts`, `NewsRepository.listVisible`, et son implémentation future).

**Valeur actuelle** : aucune colonne `season_id` sur `public.club_news` — rien n'est stocké, le filtrage se calculerait à la lecture contre `seasons.season_range` via `current_season()` (`docs/season-scoping-correction.md` §3.2), le jour où un écran en aurait besoin.

**Pourquoi cette valeur, provisoirement** : aucun écran spécifié à ce jour n'a besoin d'un fil d'actus scopé à la saison en cours (`specs/actus.md` §2) — construire la requête maintenant serait de l'anticipation sans besoin démontré.

**Ce qu'il faudrait challenger** :
- Construire la requête (jointure/filtre contre `current_season()`) une fois qu'un écran de ce type est effectivement spécifié — pas avant.

**Priorité de revisite** : basse.

---

## Permissions d'écriture sur `club_news` — non définies

**Où** : `domain/policies/rbac-matrix.ts` / politique RLS `insert`/`update` sur `public.club_news`.

**Valeur actuelle** : aucune politique d'écriture n'existe sur `club_news` — refus par défaut (RLS activée, seule une politique `select` existe). Aucun rôle, administrateur compris, ne peut créer ou faire évoluer le statut d'une actualité via le client.

**Pourquoi cette valeur, provisoirement** : l'ensemble exact des rôles autorisés à rédiger/publier n'est pas confirmé (`specs/actus.md` PO-AT-01) — hypothèse de séance non validée : sous-ensemble de Trésorier / Dirigeant habilité / Administrateur.

**Ce qu'il faudrait challenger** :
- Trancher qui, parmi Trésorier / Dirigeant habilité / Administrateur, peut rédiger/publier une actualité — et si « Secrétaire » est un manque réel du modèle à 8 rôles (`docs/roles-personas-as-caribbean.md`, point ouvert n°1).

**Priorité de revisite** : avant mise en prod — bloque entièrement la feature (aucun chemin d'écriture, aucun écran de rédaction possible) tant que ce n'est pas résolu.

---

## Canal de remise manuel (WhatsApp/SMS/en personne)

**Où** : `InviteUserDialog`/`useInviteUserDialogViewModel` (Copier/Partager) — remplace l'envoi d'email automatique (CDC §3.1, amendement du 2026-09-18).

**Valeur actuelle** : l'admin copie ou partage lui-même le message contenant le lien, via un canal hors du contrôle de l'application (WhatsApp, SMS, en personne). La réinitialisation de mot de passe (CDC §3.1) continue, elle, de passer par email — ce canal-là reste inchangé et non résolu par cette tranche (Brevo/SMTP toujours pas configuré, `docs/GOUVERNANCE.md` §3).

**Ce qu'il faudrait challenger** :
- La confidentialité du canal manuel n'est ni vérifiable ni garantie par l'application (un lien collé dans le mauvais fil de discussion, un téléphone partagé…) — le seul garde-fou actuel est l'avertissement textuel de la boîte de dialogue ("jamais dans une conversation de groupe").
- À revisiter une fois l'envoi transactionnel (Brevo) configuré : faut-il alors réintroduire une option d'envoi automatique par email EN PLUS du lien manuel, plutôt que de forcer systématiquement la remise manuelle ?

**Priorité de revisite** : après premiers retours réels.

---

## Balises Open Graph statiques — une seule prévisualisation pour toute l'app

**Où** : `index.html` (`<meta property="og:*">`).

**Valeur actuelle** : titre/description/image fixes, identiques pour n'importe quelle URL de l'application partagée dans un aperçu de lien — pas seulement `/activation`.

**Pourquoi cette valeur, provisoirement** : `/activation` est aujourd'hui le seul lien effectivement partagé hors de l'application (WhatsApp/SMS) — une prévisualisation par route n'a pas de second cas d'usage pour la justifier.

**Ce qu'il faudrait challenger** :
- Si un futur lien profond (autre qu'`/activation`) est un jour partagé de la même façon, cette prévisualisation générique redeviendra trompeuse (même image/titre quel que soit le contenu réel derrière le lien) — prévoir alors des balises par route.
- `og:image` pointe actuellement vers un domaine placeholder (`REPLACE-WITH-PRODUCTION-DOMAIN.example`) — doit être corrigé vers le domaine de production réel avant toute mise en service (un `og:image` doit être une URL absolue pour qu'un robot de prévisualisation externe puisse la résoudre).

**Priorité de revisite** : basse — sauf le domaine placeholder, à corriger avant mise en prod.

---

## (Prochaine entrée à ajouter ici)