# Architecture applicative — AS Caribbean

> Statut : proposition d'architecture pour le démarrage du développement.
> Portée : application PWA (Vite + React), phase mobile-only.
> Documents liés : `GOUVERNANCE.md`, `RETENTION-PURGE.md`, `priorisation-fonctionnelle-as-caribbean.md` (matrice RBAC).

## 1. Objectif

Trois exigences pilotent cette architecture, toutes issues du CDC :

1. **Réversibilité / non-dépendance au prestataire** (sections 12 et 21) — un repreneur doit pouvoir lire le code métier sans comprendre React ni Supabase.
2. **Un modèle de permissions à 8 rôles cumulables** (section 3) — la règle d'autorisation doit exister à un seul endroit, testable, alignable ligne à ligne avec la matrice RBAC et avec les politiques RLS.
3. **Une évolution possible vers React Native** (section 1, natif différé post-stabilisation) — sans réécrire le métier.

La réponse commune à ces trois points : **séparer ce qui est portable et durable (le métier) de ce qui est jetable (le rendu).**

## 2. Les trois couches

```
src/
  domain/          ← Le métier. TypeScript pur.
  data/            ← Les accès aux données. Implémentations concrètes.
  presentation/    ← React. Écrans, hooks, composants.
```

### Règle de dépendance — la seule règle non négociable

Les flèches d'import pointent **toujours vers l'intérieur** :

```
presentation  ──▶  domain  ◀──  data
```

- `domain` **n'importe rien** : ni React, ni Supabase, ni TanStack Query, ni `window`.
- `data` importe `domain` (pour implémenter ses interfaces) et le SDK Supabase.
- `presentation` importe `domain` (use cases, policies, types) — **jamais `data` directement**, l'injection se fait par le conteneur de dépendances.

Si un import viole ce sens, l'architecture est cassée. Ce n'est pas une question de style : c'est ce qui rend le domaine testable sans navigateur et portable vers React Native.

> Le dossier est nommé `presentation` sans accent — les accents dans les chemins de fichiers posent des problèmes d'encodage sur certaines chaînes d'outils et en CI.

## 3. `domain/` — le métier

Contient **tout ce qui serait encore vrai si l'application était une CLI, un site web ou une app native**.

```
domain/
  entities/            Convocation, Membre, Cotisation, Role…
  policies/            Matrice RBAC, règles de visibilité, règles de rétention
  usecases/            ListPlayerConvocations, RespondToConvocation…
  repositories/        Interfaces (ports) : ConvocationRepository, MembreRepository
  errors/              Erreurs métier typées (ConvocationIntrouvable, AccesRefuse…)
```

### Les use cases

Un use case = une intention métier, une classe (ou fonction) avec une méthode `execute`. Il reçoit ses dépendances par le constructeur, sous forme d'**interfaces** définies dans `domain/repositories/`.

```ts
export class RespondToConvocation {
  constructor(
    private readonly convocations: ConvocationRepository,
    private readonly responses: ConvocationResponseRepository,
  ) {}

  async execute(input: RespondToConvocationInput): Promise<ConvocationResponse> { … }
}
```

Il ne sait pas si les données viennent de Postgres, d'un fichier JSON ou d'un mock. C'est précisément ce qui le rend testable.

### Les policies

La matrice RBAC du CDC vit ici, sous forme de fonctions pures :

```ts
export function can(
  user: User,
  action: Action,
  context?: AuthorizationContext,
): boolean
```

Un seul endroit, testable sans React, lisible par un non-développeur, et directement comparable aux politiques RLS Supabase.

### Les règles dérivées d'une entity (`domain/rules/`)

Les policies répondent à « qui a le droit ? ». Un autre type de règle pure répond à une question différente : « qu'est-ce qui est vrai ? » — une adhésion est-elle expirée, une convocation est-elle passée, une licence est-elle valide. Ce sont des dérivations à partir de l'état d'une entité, pas des règles d'autorisation, et elles ne doivent jamais se mélanger dans `rbac-matrix.ts` ou dans un fichier `policies/` partagé. Les deux dossiers ne sont pas redondants : `domain/policies/` juge une action, `domain/rules/` juge une donnée.

Les entités elles-mêmes restent des fichiers plats dans `domain/entities/<entity>.ts` — pas de sous-dossier par entité. Les règles dérivées, quand une entité en a besoin, vivent à part dans `domain/rules/<entity>-rules.ts`, un fichier par entité concernée :

```
domain/entities/
  membership.ts                      Le type Membership
domain/rules/
  membership-rules.ts                isExpired, isActive, hasValidLicence…
```

`<entity>-rules.ts` ne contient que des fonctions pures prenant l'entité en entrée — jamais d'accès réseau, jamais de vérification de rôle. Une entité sans règle dérivée n'a simplement aucun fichier correspondant dans `domain/rules/` : le fichier ne se justifie que lorsqu'il y a effectivement quelque chose à séparer du type.

**Ce que `domain/` ne contient jamais** : un composant, un hook, un appel `fetch`, une clé d'API, une référence au DOM.

## 4. `data/` — les implémentations

```
data/
  repositories/
    ConvocationRepositoryImpl.ts
    MembreRepositoryImpl.ts
  datasources/
    supabaseClient.ts
  mappers/
    convocationMapper.ts
```

**Convention de nommage** : l'interface vit dans `domain/repositories/` sous son nom métier (`ConvocationRepository`), l'implémentation vit dans `data/repositories/` suffixée `Impl` (`ConvocationRepositoryImpl`).

### Les mappers ne sont pas facultatifs

La forme d'une ligne Supabase (`snake_case`, dates en chaîne ISO, jointures aplaties) n'est pas la forme d'une entité métier. Le mapper fait la traduction dans les deux sens.

Sans lui, le schéma de base fuit dans toute l'application : renommer une colonne devient un refactoring de 40 fichiers, et un changement de backend devient impossible — exactement le risque « dépendance au prestataire » que la section 21 demande de couvrir.

## 5. `presentation/` — React

```
presentation/
  app/                 Point d'entrée, routing, providers globaux
  di/                  Conteneur d'injection : câble les Impl aux use cases
  shared/
    components/        Design system : Button, Card, BottomNav…
    hooks/             useAuth, usePermission…
    layout/            Coquille applicative, navigation basse
  features/
    dashboard/
      DashboardPage.tsx
      useDashboardViewModel.ts
    calendrier/
    recherche/
    menu/
```

Le découpage par **feature** (et non par type de fichier) garde ensemble ce qui change ensemble, et suit le découpage fonctionnel du CDC.

## 6. La séparation vue / logique — le cœur du sujet

C'est le point qui décide si le projet reste maintenable. La règle tient en une phrase :

> **Un composant React décrit ce qui s'affiche. Il ne décide jamais de ce qui est vrai.**

### Le pattern : ViewModel + composant passif

Chaque écran se décompose en deux fichiers :

**`useDashboardViewModel.ts`** — toute la logique
- appelle les use cases via TanStack Query
- interroge les policies pour les permissions
- transforme les données brutes en données prêtes à afficher (tri, formatage, dérivations)
- expose les actions (`respond`, `refresh`)

**`DashboardPage.tsx`** — aucune logique
- consomme le ViewModel
- ne contient ni `if` métier, ni calcul de date, ni appel réseau
- ses seuls `if` sont des `if (isLoading)` / `if (error)` / `if (canRespond)` — des branchements d'affichage sur des booléens déjà calculés

```tsx
export function DashboardPage() {
  const vm = useDashboardViewModel()

  if (vm.isLoading) return <LoadingScreen />
  if (vm.error) return <ErrorScreen error={vm.error} />

  return (
    <Screen>
      <PlayerHeader profile={vm.profile} />
      {vm.alerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}
      <PendingConvocationsBlock
        total={vm.pendingConvocationCount}
        next={vm.nextConvocation}
        canRespond={vm.canRespond}
        onRespond={vm.respond}
      />
    </Screen>
  )
}
```

### Convention de nommage du ViewModel

Le préfixe `use` n'est pas cosmétique : React identifie les hooks **par leur nom**. Un `dashboardViewModel()` qui appellerait `useQuery` en interne ne serait pas reconnu comme un hook, et la règle ESLint `rules-of-hooks` ne pourrait plus vérifier qu'il n'est appelé ni conditionnellement, ni dans une boucle.

La forme est donc **`use<Feature>ViewModel`** — `useDashboardViewModel`, `useCalendarViewModel` — sans exception.

### Le test de la séparation réussie

Si le passage à React Native imposait de réécrire le ViewModel, la séparation a échoué. Seul le fichier `.tsx` doit être jetable.

### Où vit TanStack Query — la nuance importante

**Dans `presentation/`, jamais dans `domain/`.**

TanStack Query gère le *server state* : cache, déduplication, invalidation, retry. Ce sont des préoccupations de couche de présentation, pas des règles métier. Le use case est une fonction asynchrone pure ; le hook l'appelle depuis son `queryFn`.

```ts
const query = useQuery({
  queryKey: ['convocations', user.id],
  queryFn: () => listPlayerConvocations.execute({ userId: user.id }),
})
```

Mettre `useQuery` dans un use case rendrait le domaine dépendant d'une bibliothèque React et impossible à tester en Node — et impossible à réutiliser en React Native sans la traîner avec.

**Convention de `queryKey`** : `[ressource, ...discriminants]`, à figer dès le premier écran dans un fichier partagé. Des clés incohérentes rendent l'invalidation imprévisible, et le bug qui en résulte (« la donnée ne se rafraîchit pas ») est pénible à diagnostiquer plus tard.

### Les erreurs de mutation — de DomainError à UiError

Une `useMutation` qui échoue sans `onError` échoue **silencieusement** : la requête réseau part, rejette, et rien à l'écran ne le montre. C'est le même problème qu'un composant qui calculerait lui-même une règle métier — sauf qu'ici, ce qui manque n'est pas une règle mais une traduction.

`domain/errors/` répond à la question « que s'est-il passé, en termes métier » — `NotFoundError`, `ForbiddenError`, `InvalidScheduleError`, etc. Une `DomainError` ne sait rien d'un écran : elle ne porte ni message destiné à un utilisateur, ni indication sur la façon de l'afficher. Ce n'est pas un oubli, c'est la même règle qu'ailleurs dans ce document — le domaine ne connaît pas la présentation.

Il faut donc un point qui fait le pas suivant, symétrique à `data/errors/map-supabase-error.ts` (qui traduit déjà une erreur Postgres en `DomainError`, section 4) : ce fichier-ci traduit une `DomainError` en ce qu'un écran affiche. Il vit dans `presentation/shared/errors/`, pas dans une feature, parce que n'importe quelle `useMutation` du projet peut échouer de la même façon silencieuse — le mapper et son type sont un outil transverse, pas un outil player-dashboard.

```ts
// presentation/shared/errors/ui-error.ts
export type UiErrorVariant = 'toast' | 'inline' | 'blocking'

export interface UiError {
  message: string       // copie fr-FR, prête à afficher
  variant: UiErrorVariant
  retryable: boolean
}

// presentation/shared/errors/map-domain-error-to-ui-error.ts
export function mapDomainErrorToUiError(error: unknown): UiError {
  if (error instanceof ForbiddenError) { /* ... */ }
  if (error instanceof NotFoundError) { /* ... */ }
  // ... une branche par sous-classe concrète de DomainError
  if (error instanceof DomainError) { /* repli générique */ }
  return { /* repli réseau/inconnu */ }
}
```

Le ViewModel branche ça dans `onError` de la mutation :

```ts
const [respondError, setRespondError] = useState<UiError | null>(null)

const respondMutation = useMutation({
  mutationFn: (input) => respondToConvocation.execute(input),
  onMutate: () => setRespondError(null),
  onError: (error) => setRespondError(mapDomainErrorToUiError(error)),
  onSuccess: () => setRespondError(null),
})
```

`respondError` reste un champ **distinct** de l'`error` déjà exposé par le ViewModel pour les `useQuery` de chargement. Les deux répondent à des questions différentes : l'un bloque l'écran entier (donnée de base indisponible), l'autre est transitoire et rattaché à une seule action (un bouton a échoué, le reste de l'écran reste utilisable). Les fusionner forcerait le composant à deviner lequel des deux il regarde — contraire à la règle de la section 6 (« le composant ne décide jamais de ce qui est vrai »).

## 7. Les permissions — deux applications de la même matrice

### Pourquoi deux endroits

La matrice RBAC du CDC est appliquée à deux niveaux qui répondent à **deux questions différentes** :

| | Question posée | Rôle | Contournable ? |
|---|---|---|---|
| **RLS Postgres** | « Cette ligne peut-elle sortir de la base ? » | **Autorité — la sécurité réelle** | Non |
| **Policies `domain/`** | « Faut-il afficher cet élément d'interface ? » | **Ergonomie** | Oui, trivialement |

Ce ne sont pas deux copies redondantes d'une même règle : ce sont deux usages distincts du même modèle de rôles.

**Sans RLS, il n'y a aucune sécurité.** Supabase expose une API REST directement au navigateur. Un utilisateur authentifié peut appeler l'API avec son propre jeton, hors de l'application, et récupérer tout ce que la base accepte de lui renvoyer. Le fait que l'interface React masque la carte « Cotisations » n'empêche strictement rien. Les critères AC-01 et AC-02 (section 17.2 du CDC) ne sont satisfaits que si la base elle-même refuse.

**Sans policy front, il n'y a pas de faille — seulement une mauvaise expérience.** Un joueur verrait le bouton `+` du Calendrier, cliquerait, et recevrait une erreur d'autorisation. Le CDC exige l'inverse (section 3, moindre privilège ; wireframes : carte absente plutôt que grisée), donc la policy front est nécessaire — mais elle est un confort, jamais une protection.

### Le vrai risque : la divergence

Le coût n'est pas d'écrire la règle deux fois, c'est qu'elle évolue d'un côté seulement. Une règle ajoutée en RLS sans répercussion front produit une interface qui propose des actions impossibles ; l'inverse produit une fuite silencieuse. Trois mesures :

1. **Une source de référence lisible unique** — `domain/policies/rbac-matrix.ts` énumère explicitement les actions et les rôles autorisés. C'est le document exécutable qui fait autorité *en lecture*. Chaque politique RLS porte en commentaire SQL le nom de l'action correspondante, pour que la correspondance soit vérifiable à l'œil.
2. **Des tests d'intégration contre la base**, pas contre l'interface — ouvrir une session avec un jeton de joueur, tenter de lire le dossier d'un autre membre, vérifier que le retour est vide. Un test qui vérifie qu'une carte est masquée ne prouve rien sur la sécurité.
3. **Ne pas générer le SQL depuis le TypeScript.** C'est tentant pour éliminer la divergence, mais ça introduit une dépendance d'outillage maison qu'un repreneur devra comprendre avant de pouvoir modifier une permission — exactement le risque que la section 21 demande de réduire.

### Dans le code

Les permissions ne se propagent pas en cascade de props (`editable={true}` traversant trois niveaux devient ingérable et réintroduit la règle métier dans la vue). Le ViewModel interroge la policy une fois et expose un booléen par action :

```ts
const canCreateConvocation = can(user, 'convocation:create', { teamId })
```

## 8. Tests

| Couche | Outil | Environnement | Effort attendu |
|---|---|---|---|
| `domain/` (use cases, policies) | Vitest | `node` | **L'essentiel de l'effort** |
| `data/` (mappers) | Vitest | `node` | Tests de traduction sur des payloads réels |
| `presentation/` (ViewModels) | Vitest + Testing Library | `jsdom` | Ciblé sur les écrans critiques |
| `presentation/` (composants) | — | — | Faible valeur, coût de maintenance élevé |

Le domaine étant sans dépendance, ses tests s'écrivent avec de simples objets en mémoire — pas de mock de Supabase, pas de `jsdom`, exécution en quelques centaines de millisecondes.

**Priorité de couverture** : les policies RBAC d'abord. C'est la surface la plus dense en règles, la plus critique, et la moins chère à tester.

## 9. Conventions Vite

- **Alias de chemins** (`@domain`, `@data`, `@presentation`) déclarés **à la fois** dans `vite.config.ts` et dans `tsconfig.json` — TypeScript et le bundler résolvent les chemins séparément ; n'en configurer qu'un provoque une erreur au build ou à l'édition.
- **Variables d'environnement** : seul le préfixe `VITE_` est exposé au navigateur. La clé `anon` Supabase y a sa place ; une clé `service_role` **jamais** — elle contourne le RLS et se retrouverait dans le bundle public.
- **Vérification automatisée des frontières** : un outil comme `dependency-cruiser` ou `eslint-plugin-boundaries` en CI, pour interdire les imports interdits entre couches. Sans contrainte outillée, la règle de dépendance se dégrade en quelques semaines — c'est mécanique, pas une question de discipline.

## 10. Cap mobile-only et évolution

La phase actuelle ne produit qu'un rendu mobile. Aucun dossier `mobile/` n'est créé pour l'instant : un dossier à occupant unique est une structure vide qui suggère une symétrie inexistante.

Quand le desktop arrivera, la bascule se fera **au seul niveau du rendu** :

```
features/dashboard/
  useDashboardViewModel.ts     ← inchangé
  DashboardPage.tsx            ← choisit le layout
  DashboardMobileLayout.tsx
  DashboardDesktopLayout.tsx
```

À décider écran par écran : le Calendrier justifie probablement deux layouts distincts, une page de paramètres se contente sans doute d'être responsive. Dupliquer un layout est un coût de maintenance permanent — il doit se mériter.

**Sur React Native** : un dossier `mobile/` en Vite ne prépare pas React Native. RN ne partage aucun composant avec le web (pas de `div`, pas de CSS, bundler différent, projet distinct). Ce qui est réellement portable, c'est `domain/` — et `data/` moyennant le remplacement du client. Le jour où le besoin est réel, ces dossiers deviennent un package partagé dans un monorepo. Monter le monorepo maintenant serait un coût immédiat pour un bénéfice hypothétique, incompatible avec le budget du projet.

## 11. Journal d'audit — où le placer

Le journal d'audit (section 11.3 du CDC) se répartit selon la nature de l'événement tracé :

| Type d'événement | Où | Pourquoi |
|---|---|---|
| **Accès à une donnée** — consultation d'une donnée de santé, export nominatif | **Trigger Postgres** | Un accès direct à la base (éditeur SQL Supabase, script d'administration) doit être tracé lui aussi. Un enregistrement fait dans le code applicatif ne trace que ce qui passe par l'application. |
| **Action métier** — changement de rôle, correction de points Legacy, désactivation de compte | **Use case, dans `domain/`** | L'intention et son motif n'existent pas au niveau SQL : la base voit un `UPDATE`, pas « le Bureau a corrigé les points pour telle raison ». |

L'exigence « accès nominatif très restreint et **tracé** » (section 6.3) porte sur la consultation de données de santé : c'est le cas où le trigger est indispensable, puisque la trace doit survivre à un contournement de l'application.

Dans les deux cas, la journalisation n'est **jamais** un appel depuis un composant : un composant n'a pas connaissance de l'intention métier, et une action tracée depuis la vue disparaît dès qu'un autre écran déclenche la même opération.

## 12. Points d'attention — récapitulatif

1. **La règle de dépendance n'est respectée que si elle est outillée.** Sans vérification en CI, elle se dégrade.
2. **Le front n'est jamais la sécurité.** Toute règle RBAC existe aussi en RLS.
3. **TanStack Query reste dans la présentation.** Sinon le domaine devient non portable et non testable en Node.
4. **Les mappers ne sont pas de la cérémonie.** Sans eux, le schéma Supabase fuit partout et la réversibilité est perdue.
5. **Un composant ne calcule rien.** Toute dérivation remonte au ViewModel.
6. **Les `queryKey` se conventionnent dès le premier écran.** Corriger après coup est douloureux.
7. **Le journal d'audit ne se journalise jamais depuis un composant** — trigger Postgres pour les accès, use case pour les actions métier (voir section 11).
8. **La politique de rétention n'est pas du code applicatif.** Elle est implémentée côté Supabase (job planifié) et documentée dans `RETENTION-PURGE.md` ; `domain/` ne la connaît pas.
9. **Ne pas créer de couche vide par anticipation.** Chaque dossier doit avoir une raison d'exister aujourd'hui.
10. **Une erreur de mutation n'est jamais gérée brute dans un composant.** Le ViewModel la traduit d'abord via `mapDomainErrorToUiError` (section 6) avant de l'exposer.

## 13. Arborescence cible — amorçage du projet

Cette section décrit l'état attendu du dépôt **au démarrage**, avant tout développement fonctionnel. Elle est volontairement exhaustive pour que la mise en place ne laisse aucune place à l'interprétation.

Périmètre : squelette + configuration uniquement. Le premier module fonctionnel (Authentification) est développé ensuite, module par module.

### 13.1 Racine du dépôt

```
.
├── .github/
│   └── workflows/
│       └── ci.yml                    Lint, typecheck, tests, vérification des frontières
├── docs/
│   ├── ARCHITECTURE.md               Ce document
│   ├── GOUVERNANCE.md
│   └── RETENTION-PURGE.md
├── public/
│   ├── icons/                        Icônes PWA (192, 512, maskable)
│   └── robots.txt                    Application interne : indexation refusée
├── specs/                            Specs par feature (handoff entre agents)
├── src/
├── supabase/
│   ├── migrations/                   Schéma, politiques RLS, triggers d'audit
│   └── functions/                    Jobs planifiés (purge, archivage) — cf. RETENTION-PURGE.md
├── .dependency-cruiser.cjs           Frontières entre couches
├── .env.example                      Variables attendues, sans aucune valeur réelle
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json                     Alias de chemins (miroir de vite.config.ts)
├── vite.config.ts                    Plugin PWA + alias
└── vitest.config.ts                  Deux projets : node (domain/data) et jsdom (presentation)
```

`docs/` regroupe les documents de gouvernance et d'architecture. La politique de rétention y reste documentée bien que son implémentation vive dans `supabase/`.

### 13.2 `src/domain/`

```
src/domain/
├── entities/
│   ├── user.ts                       User, Role, RoleAssignment
│   ├── membership.ts                 Membership — type, statut, saison
│   ├── team.ts                       Équipe, section, saison
│   ├── convocation.ts                Convocation, ConvocationResponse
│   ├── document.ts                   Document, statut de pièce
│   └── index.ts                      Ré-exports
├── policies/
│   ├── actions.ts                    Union typée de toutes les actions ('convocation:create'…)
│   ├── rbac-matrix.ts                Matrice rôle × action — source de référence lisible
│   ├── can.ts                        can(user, action, context): boolean
│   └── can.test.ts                   Couverture prioritaire
├── rules/
│   └── membership-rules.ts           isExpired, isActive… — un fichier par entité qui en a
│                                      besoin (Convocation, Team… viendront s'y ajouter)
├── repositories/                     Interfaces uniquement — aucune implémentation
│   ├── user-repository.ts
│   ├── convocation-repository.ts
│   └── document-repository.ts
├── usecases/
│   └── (vide à l'amorçage — un dossier par module fonctionnel)
└── errors/
    ├── domain-error.ts               Classe de base
    ├── not-found-error.ts
    └── forbidden-error.ts
```

`entities/` et `repositories/` sont créés avec les seuls types nécessaires au premier module ; ils s'étoffent module par module plutôt que d'être modélisés intégralement en amont.

### 13.3 `src/data/`

```
src/data/
├── datasources/
│   └── supabase-client.ts            Instanciation unique du client
├── dto/
│   └── (types bruts des tables, en snake_case — un fichier par table)
├── mappers/
│   └── (un mapper par entité : DTO ⇄ entité, dans les deux sens)
├── repositories/
│   └── (implémentations suffixées Impl, une par interface de domain/repositories/)
└── errors/
    └── map-supabase-error.ts         Traduit une erreur Postgres en erreur de domaine
```

`map-supabase-error.ts` est le point qui empêche un code d'erreur Postgres de remonter jusqu'à un composant : une violation de RLS devient un `ForbiddenError`, une ligne absente un `NotFoundError`.

### 13.4 `src/presentation/`

```
src/presentation/
├── app/
│   ├── main.tsx                      Point d'entrée Vite
│   ├── App.tsx                       Composition des providers
│   ├── router.tsx                    Routes + garde d'authentification
│   └── providers/
│       ├── query-provider.tsx        QueryClient + configuration par défaut
│       ├── auth-provider.tsx         Session courante et rôles
│       └── dependencies-provider.tsx Expose le conteneur DI aux hooks
├── di/
│   └── container.ts                  Câble les Impl aux use cases, instancié une fois
├── shared/
│   ├── components/                   Design system : Button, Card, Badge, EmptyState…
│   ├── layout/
│   │   ├── AppShell.tsx              Coquille commune aux écrans authentifiés
│   │   └── BottomNav.tsx             Nav fixe à 4 entrées
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   └── use-permission.ts         Enveloppe de can() côté React
│   ├── errors/
│   │   ├── ui-error.ts               Type UiError (message, variant, retryable)
│   │   └── map-domain-error-to-ui-error.ts  DomainError → UiError, voir section 6
│   ├── query-keys.ts                 Fabriques de queryKey — à figer dès le premier écran
│   └── formatters/                   Dates, montants — locale fr-FR
├── features/
│   └── (un dossier par module : page, ViewModel, composants locaux)
└── styles/
    └── (tokens de design et styles globaux)
```

`query-keys.ts` existe dès l'amorçage même vide : c'est le fichier qu'on regrette de ne pas avoir créé au moment où trois hooks ont divergé.

### 13.5 Structure type d'une feature

Modèle à reproduire pour chaque module fonctionnel :

```
src/presentation/features/<feature>/
├── <Feature>Page.tsx                 Composant d'écran, sans logique
├── use<Feature>ViewModel.ts          Toute la logique de l'écran
├── use<Feature>ViewModel.test.ts
└── components/                       Composants propres à cette feature uniquement
```

Un composant utilisé par deux features remonte dans `shared/components/` — jamais importé d'une feature à l'autre.

### 13.6 Ce qui n'est volontairement pas créé

- `presentation/mobile/` et `presentation/desktop/` — inutiles tant qu'un seul rendu existe (section 10).
- Un dossier `utils/` ou `helpers/` fourre-tout — chaque fonction utilitaire appartient à une couche identifiable.
- Un `types/` global — les types vivent auprès de ce qu'ils décrivent.
- Une bibliothèque de gestion d'état globale — `Context` et TanStack Query suffisent au périmètre actuel.
- Des dossiers `usecases/` pré-remplis par anticipation.

### 13.7 Critères de recette de l'amorçage

Le squelette est considéré posé quand :

1. `npm run dev` sert une page, et `npm run build` produit un bundle sans erreur.
2. Les alias de chemins résolvent **à la fois** dans l'éditeur (TypeScript) et au build (Vite).
3. `npm run test` exécute les deux projets Vitest, dont au moins un test de `can()`.
4. La vérification des frontières échoue volontairement sur un import interdit ajouté pour l'essai (`domain/` important `data/`), puis passe une fois l'import retiré. **Sans cette vérification négative, rien ne prouve que la règle est réellement appliquée.**
5. La CI exécute lint, typecheck, tests et vérification des frontières sur chaque pull request.
6. `.env.example` liste les variables attendues et aucune valeur réelle n'est versionnée.

## 14. Points ouverts

- Modalité d'injection de dépendances : conteneur simple instancié à l'amorçage, ou Context React dédié — à trancher au premier écran.
- Stratégie de cache hors ligne (`persistQueryClient` + IndexedDB) pour le mode dégradé exigé en section 12 du CDC — à spécifier lors du module Calendrier.
- Granularité des politiques RLS : une politique par table ou par couple table/action — à arbitrer lors de la conception du schéma, avec pour contrainte la lisibilité de la correspondance avec `rbac-matrix.ts`.