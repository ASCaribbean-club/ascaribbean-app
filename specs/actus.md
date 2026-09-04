# Spec — Actus (fil d'actualités du club)

> Statut : première passe de cadrage. Périmètre volontairement réduit à **une migration SQL + la couche domaine**. Un point reste **OPEN et bloquant pour la passe suivante** (qui a le droit de rédiger/publier — PO-AT-01) ; il n'est **pas** bloquant pour cette passe, qui ne construit aucun chemin d'écriture.
> Sources : `docs/priorisation-fonctionnelle-as-acaribbean.md` (modules P0/P1, matrice RBAC), `docs/roles-personas-as-caribbean.md` (8 rôles, comptes multi-rôles), `docs/ARCHITECTURE.md` (§7 permissions, §11 journal d'audit, §13.4 nav basse), `docs/RETENTION_PURGE.md`, `docs/season-scoping-correction.md` (`current_season()`), `specs/coach-dashboard.md` (PO-1, AC-CD-05d), `specs/player-dashboard.md` (§ onglet Actus), `specs/create-convocation.md` (patron table + RLS + miroir SQL/TypeScript).
> Maquette : `docs/designs/actus/[v0] Mob - Actus.png` (instantané local versionné, aucun lien artifact fourni — situation identique à `menu`). Le registre `docs/designs/DESIGN_LINKS.md` §2 ne comporte **pas encore** de ligne pour cette feature : conformément à son §4, la ligne à ajouter est `| actus (`[v0] Mob - Actus`) | — aucun lien fourni | 2026-09-04 | `docs/designs/actus/[v0] Mob - Actus.png` | **instantané seul** |`. L'agent PO n'a pas pu l'écrire lui-même (édition hors `specs/`) — **à reporter dans le registre**, et **aucun lien artifact n'est à demander à la développeuse** (cas `instantané seul` du §4). La maquette n'est **pas** interprétée ici — c'est le travail de designer-agent à l'étape suivante ; elle sert seulement de signal de périmètre (l'écran existe bien, il est en liste).
> État du code lu : `src/presentation/features/actus/ActusPage.tsx` (stub `TODO(PO-1)`), `src/presentation/app/router.tsx` (route `/actus`), `src/presentation/shared/layout/BottomNav.tsx`, `src/domain/policies/{rbac-matrix,actions,convocation-closure,response-deadline}.ts`, `src/domain/rules/convocation-rules.ts`, `supabase/migrations/20260811171754_initial_schema.sql` (patron RLS).

## 1. Périmètre

Fil d'**actualités du club, à l'échelle du club entier et non ciblé** : tout membre authentifié voit la même liste. À ne confondre avec ni l'un ni l'autre de ces deux voisins :

- **Ce n'est pas une zone publique.** `docs/priorisation-fonctionnelle-as-acaribbean.md` (correction du draft, point 1) rappelle qu'il n'existe **aucune vitrine ni actualité publique** : appli interne, comptes par invitation. Ce fil est lu uniquement par des comptes authentifiés.
- **Ce n'est pas le module Communication (P1).** Le CDC décrit sous « Communication » des **annonces et notifications ciblées** avec préférences par canal. Ici : pas de ciblage, pas de destinataire, pas de notification, pas de préférence de canal.

### Rattachement CDC

| Module CDC | Priorité | Ce que cette feature en implémente |
|---|---|---|
| Communication (voisin le plus proche) | **P1** | Rien du ciblage ni des notifications — seulement un fil club-wide non ciblé, qui n'est **pas décrit littéralement** par le CDC (voir PO-AT-02) |

Écart assumé et signalé plutôt que masqué : **le fil non ciblé n'a pas de ligne propre dans le CDC**. Il occupe l'onglet « Actus » de la nav basse, aujourd'hui un stub explicite (`specs/coach-dashboard.md` PO-1 / AC-CD-05d, `specs/player-dashboard.md` §1 point 6). Sa priorité effective n'est donc pas tranchée — voir PO-AT-02, non bloquant pour cette passe.

### Dans cette passe

1. Une migration SQL : table `public.club_news`, RLS activée, **politique `select` uniquement**.
2. La couche domaine : entité `ClubNews`, prédicat pur `isNewsVisible` + son test Vitest, interface `NewsRepository`.

### Pas dans cette passe (« not in this pass » — à ne pas construire, à ne pas considérer comme un oubli)

- **Aucune politique `insert` / `update` / `delete`** : volontairement différée tant que PO-AT-01 (qui rédige/publie) n'est pas tranché. Conséquence acceptée et explicite : dans cette passe **aucun rôle, administrateur compris, ne peut écrire une actualité via le client** ; l'alimentation des données de test passe par l'éditeur SQL Supabase.
- **Aucune lecture des brouillons / archivés / expirés**, y compris pour un administrateur ou un auteur : ce serait une exception à la politique de lecture, et l'exception appartient à la passe de rédaction (PO-AT-01).
- **Aucune implémentation `data/`** (pas de `NewsRepositoryImpl`, pas de DTO, pas de mapper).
- **Aucun `presentation/`** : `ActusPage.tsx` reste le stub `TODO(PO-1)` tel quel, la nav basse à 4 entrées est inchangée (`ARCHITECTURE.md` §13.4).
- **Aucun use case**, aucune entrée dans `domain/policies/actions.ts` ni `rbac-matrix.ts` (voir §3).
- **Aucune notification / envoi** (push, courriel) — module Communication, P1.
- **Aucun commentaire, réaction, épinglage, pièce jointe** : le seul lien vers un contenu externe est la colonne `link`.

## 2. Modèle de données

### Décisions déjà tranchées (séance de mentoring — ne pas rouvrir)

- **La date affichée à l'utilisateur est `published_at`**, renseignée au moment où le statut bascule à `published`. `created_at` reste **purement technique/audit** et n'est jamais affiché.
- **Aucun champ `event_date`.** Une actualité n'a pas de date d'événement propre ; ce qui a une date d'événement est une convocation, pas une actu.
- **Aucune colonne `season_id`.** Si un écran devait un jour filtrer « saison en cours », le filtrage se calcule **à la lecture** contre `seasons.season_range` via `current_season()` (`docs/season-scoping-correction.md` §3.2), jamais stocké sur la ligne.

### Entité

```typescript
// domain/entities/club-news.ts
export type ClubNewsStatus = 'draft' | 'published' | 'archived'

export interface ClubNews {
  id: string
  title: string
  details: string
  link: string | null          // ex. article externe, album photo — nullable
  status: ClubNewsStatus
  publishedAt: string | null   // ISO — la date VISIBLE (null tant que non publiée)
  createdAt: string            // ISO — technique/audit, jamais affichée
  createdBy: string            // référence users(id)
  expiresAt: string | null     // ISO — null = pas d'expiration
}
```

### Table

```sql
-- supabase/migrations/<timestamp>_club_news.sql
create table public.club_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  details text not null,
  link text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.users (id),
  expires_at timestamptz,
  -- Conséquence directe de « published_at est renseignée au passage à published » :
  -- une ligne publiée sans date visible serait un état non affichable.
  constraint club_news_published_has_date check (status <> 'published' or published_at is not null)
);

alter table public.club_news enable row level security;

-- Miroir de domain/policies/news-visibility.ts (isNewsVisible). Autorité côté SQL :
-- now() doit être évalué par Postgres, jamais fourni par le client.
-- Lecture club-wide : tout membre authentifié, aucun scope équipe/section.
-- Pas de politique insert/update/delete dans cette passe — spec §1, PO-AT-01.
create policy club_news_select_visible on public.club_news
  for select to authenticated
  using (status = 'published' and (expires_at is null or expires_at > now()));
```

Le `check` sur `status` reprend le patron déjà utilisé dans le dépôt plutôt qu'un type énuméré Postgres — cohérence avec le schéma existant, pas une décision nouvelle. `created_by` est une **donnée métier ordinaire**, symétrique de `Convocation.createdBy` (`specs/create-convocation.md` §4) — pas une entrée de journal d'audit.

### Règle de visibilité — un seul prédicat pur

Les deux conditions comptent, et elles sont encodées **ensemble**, jamais séparément dans deux appelants :

```typescript
// domain/policies/news-visibility.ts
/**
 * Une actualité est visible ssi elle est publiée ET non expirée.
 * ⚠️ MIROIR SQL — voir la politique club_news_select_visible.
 * Le SQL est l'autorité (sécurité) ; cette fonction sert la lisibilité,
 * les tests, et un éventuel usage UI. Elle ne garde jamais un accès à elle seule.
 */
export function isNewsVisible(news: ClubNews, now: Date): boolean {
  return (
    news.status === 'published' &&
    (news.expiresAt === null || new Date(news.expiresAt) > now)
  )
}
```

Même patron que `canPlayerRespond` (`domain/policies/response-deadline.ts`) et `isConvocationComplete` (`domain/policies/convocation-closure.ts`) : prédicat pur, `now: Date` passé en paramètre (jamais `Date.now()` à l'intérieur, sinon intestable), et miroir SQL commenté des deux côtés (`CLAUDE.md` §7).

**Emplacement — `policies/` et non `rules/`** : le dépôt réserve `domain/rules/` à « qu'est-ce qui est vrai » et `domain/policies/` à « qui a le droit » (en-tête de `convocation-rules.ts`). `isNewsVisible` est à la frontière (il dérive d'un état), mais il est **mirroré par une politique RLS**, exactement comme `convocation-closure.ts` et `season-scope.ts` qui vivent dans `policies/` pour cette raison. On suit ce précédent. Comparaison **stricte** (`>`) : une actu dont `expires_at` vaut exactement l'instant courant n'est plus visible — même sémantique des deux côtés.

### Dépôt — interface seulement

```typescript
// domain/repositories/news-repository.ts
export interface NewsRepository {
  listVisible(): Promise<ClubNews[]>
}
```

Une seule méthode. Pas de paramètre `now` : le filtre temporel est appliqué par RLS côté Postgres, pas par une date fournie par le client. Pas de `findById` tant qu'aucun écran de détail n'est spécifié (`ARCHITECTURE.md` §12 point 9 — ne pas créer par anticipation). Nom `NewsRepository` pour une entité `ClubNews` : léger décalage assumé, `NewsRepository` étant le nom retenu en séance.

## 3. RBAC

### Lecture — les 8 rôles, à l'identique

| Rôle | Lecture du fil |
|---|---|
| Joueur/Joueuse, Coach/Staff, Responsable de section, Dirigeant habilité, Trésorier, Référent médical, Bénévole, Administrateur | **Lecture** des actualités publiées et non expirées. Aucun scope équipe/section/saison, aucune variation par rôle |

Aucune ligne de la matrice RBAC ne couvre cette lecture : c'est une donnée de référence club-wide, du même ordre que `sections` / `seasons` en RLS (`initial_schema.sql`, politiques `*_select_authenticated`). Conformément au commentaire d'en-tête de `rbac-matrix.ts`, une lecture que `presentation/` n'a pas à arbitrer (aucun affichage/masquage conditionnel, aucun layout branché sur le rôle) est **RLS-only** : **aucune entrée n'est ajoutée à `actions.ts` ni à `rbac-matrix.ts` dans cette passe**, et aucune ne doit l'être « par symétrie ».

L'écran étant identique pour tous les rôles, un compte multi-rôles ne change rien ici : pas de dépendance au rôle actif (`domain/rules/active-role-scope.ts`).

### Rédaction / publication — **OPEN (PO-AT-01), non tranché**

Qui peut créer une actualité et faire évoluer son statut (`draft` → `published` → `archived`) **n'est pas confirmé**. Ce qui est su, et rien de plus :

- Hypothèse de travail évoquée en séance, **non validée** : un sous-ensemble de Trésorier / Dirigeant habilité / Administrateur.
- La ligne de matrice la plus proche, « **Envoyer une communication ciblée** », donne ✅ à Coach/Staff (son équipe), Responsable de section (sa section), Dirigeant habilité, Administrateur — et ❌ au Trésorier. Elle **n'est pas transposable telle quelle** : elle décrit un envoi *ciblé* et *scopé*, alors qu'ici il n'y a ni cible ni scope, et l'hypothèse de séance inclut justement un rôle que cette ligne exclut. Ce désaccord est signalé, pas arbitré.
- La question subsidiaire « **Secrétaire** est-il un manque réel du modèle à 8 rôles ? » est elle-même non résolue (le CDC fixe 8 rôles ; `docs/roles-personas-as-caribbean.md` point ouvert n°1 rouvre déjà la granularité du Bureau).

Conséquence concrète et voulue pour cette passe : **aucune permission `news:create` (ou équivalent) n'est définie**, aucune politique d'écriture n'est écrite, aucun rôle n'obtient de droit d'écriture par défaut (principe du moindre privilège, CDC §3).

## 4. Données sensibles

- **Données de santé : aucune.** **Données financières : aucune.** Le fil ne porte ni montant, ni statut de cotisation, ni information médicale.
- **Journal d'audit — lecture : non requis.** Consulter une actualité publiée ne figure dans aucune des actions sensibles listées au CDC §11.3 (compte, rôle, donnée santé, paiement, points Legacy, export nominatif). Aucun trigger d'accès pour cette table.
- **Journal d'audit — publication : OPEN (PO-AT-03).** Publier une actu est une action de diffusion club-wide potentiellement irréversible dans les faits. Elle n'est pas non plus dans la liste du CDC §11.3, donc rien n'impose de la tracer aujourd'hui — mais la question se pose au moment de la passe de rédaction, pas maintenant. Signalée plutôt que passée sous silence, sans être tranchée ici. (Si elle est tracée un jour, ce sera **depuis le use case**, action métier, jamais depuis un composant — `ARCHITECTURE.md` §11.)
- **Données personnelles dans le contenu rédigé : OPEN (PO-AT-04), à confirmer par le référent RGPD.** `title`, `details` et `link` sont du texte libre : rien n'empêche structurellement d'y écrire un nom de licencié, ou d'y lier un album photo. La règle « pas de nom de personne » de `CLAUDE.md` §9 vise le code et la documentation, pas le contenu éditorial saisi par le club — la question du droit à l'image et du consentement pour un lien photo relève du référent RGPD, pas de cette spec.
- **Rétention — `expires_at` n'est pas une purge.** Une actu expirée devient invisible mais **la ligne reste en base**. Savoir si les actus expirées/archivées doivent être purgées au bout d'un délai relève de `docs/RETENTION_PURGE.md` et d'un job planifié Supabase — `domain/` n'en connaît rien (`CLAUDE.md` §6). Non traité dans cette passe (PO-AT-05).
- **Export : aucun** depuis cette feature.

## 5. Critères d'acceptation

Convention de numérotation : préfixe à deux lettres par feature, comme AC-CD (coach-dashboard), AC-PD (player-dashboard), AC-PR (profile), AC-MD (match details), AC-MN (menu). Actus → **AC-AT**.

| Réf. | Critère |
|---|---|
| AC-AT-01 | Une migration crée `public.club_news` avec exactement les colonnes de §2 (`id`, `title`, `details`, `link`, `status`, `published_at`, `created_at`, `created_by`, `expires_at`), RLS activée sur la table |
| AC-AT-02 | La table ne comporte **ni colonne `season_id` ni colonne `event_date`** ; `created_at` n'est exposée par aucun libellé destiné à l'utilisateur |
| AC-AT-03 | Une ligne de statut `published` sans `published_at` est **rejetée par la base** (contrainte `club_news_published_has_date`) |
| AC-AT-04 | Avec un jeton d'un membre authentifié quelconque, un `select` sur `club_news` renvoie les lignes `published` dont `expires_at` est `null` ou strictement futur — et **aucune** ligne `draft`, `archived`, ou `published` avec `expires_at` passé. Testé contre la base avec un jeton, hors application |
| AC-AT-05 | Le résultat d'AC-AT-04 est **identique quel que soit le rôle** du jeton (les 8 rôles, y compris administrateur) : aucune ligne supplémentaire n'est visible pour qui que ce soit |
| AC-AT-06 | Aucune politique `insert`, `update` ou `delete` n'existe sur `club_news` : toute tentative d'écriture depuis le client échoue, **administrateur compris** — comportement voulu, pas un bug (§1, PO-AT-01) |
| AC-AT-07 | `domain/entities/club-news.ts` définit `ClubNews` et `ClubNewsStatus` conformément à §2 |
| AC-AT-08 | `domain/policies/news-visibility.ts` expose `isNewsVisible(news, now)`, pure : aucun import React, Supabase, TanStack Query ni `window`, aucun appel à `Date.now()` interne |
| AC-AT-09 | Un test Vitest couvre : `draft` → faux ; `archived` → faux ; `published` + `expiresAt` null → vrai ; `published` + `expiresAt` futur → vrai ; `published` + `expiresAt` passé → faux ; `published` + `expiresAt` exactement égal à `now` → **faux** |
| AC-AT-10 | La politique RLS et `isNewsVisible` portent chacune un commentaire renvoyant à l'autre (miroir manuel, `CLAUDE.md` §7) |
| AC-AT-11 | `domain/repositories/news-repository.ts` définit `NewsRepository` avec la seule méthode `listVisible()` — **interface uniquement**, aucune implémentation |
| AC-AT-12 | Aucun fichier créé ou modifié sous `src/data/` ou `src/presentation/` : `ActusPage.tsx` reste le stub `TODO(PO-1)`, la nav basse reste à 4 entrées |
| AC-AT-13 | Aucun use case créé ; `domain/policies/actions.ts` et `domain/policies/rbac-matrix.ts` sont inchangés (§3) |

## 6. Points ouverts

| Réf. | Question | Pour qui | Bloquant ? |
|---|---|---|---|
| **PO-AT-01** | **Qui peut créer une actualité et changer son statut (`draft`/`published`/`archived`) ?** Hypothèse non validée : sous-ensemble de Trésorier / Dirigeant habilité / Administrateur. La ligne de matrice « Envoyer une communication ciblée » n'est pas transposable (§3). Sous-question : « Secrétaire » est-il un manque réel du modèle à 8 rôles ? | Développeuse + Bureau | **Non pour cette passe** (aucun chemin d'écriture construit). **Oui pour la passe suivante** — sans réponse, ni politique d'écriture ni écran de rédaction ne peut être spécifié |
| PO-AT-02 | Rattachement et priorité CDC du fil non ciblé : voisin de Communication (P1) sans en être, et sans ligne propre au CDC (§1) | Bureau | Non |
| PO-AT-03 | Faut-il journaliser la publication d'une actualité ? Absente de la liste CDC §11.3 (§4) | Référent RGPD / Bureau, à la passe de rédaction | Non |
| PO-AT-04 | Contenu éditorial libre : noms de licenciés, droit à l'image sur un `link` d'album photo (§4) | Référent RGPD | Non |
| PO-AT-05 | Purge des actualités expirées/archivées — `expires_at` masque, ne supprime pas (§4, `RETENTION_PURGE.md`) | Développeuse | Non |
| PO-AT-06 | Ordre d'affichage du fil et validation du format de `link` : non tranchés, décisions de la passe de lecture (`data/` + `presentation/`), sans effet sur le schéma ni sur le prédicat | Développeuse | Non |
| PO-AT-07 | Ligne `actus` à ajouter au registre `docs/designs/DESIGN_LINKS.md` §2 (statut `instantané seul`) — voir en-tête ; aucun lien artifact à demander | Développeuse | Non |

## 7. Note pour designer-agent

- La maquette de référence est `docs/designs/actus/[v0] Mob - Actus.png` (voir en-tête). Elle **n'est pas interprétée dans cette spec** : mise en page, hiérarchie visuelle et états sont à la charge de designer-agent.
- Contraintes issues de cette passe, à ne pas contredire : la date affichée est **`published_at`** et jamais `created_at` (§2) ; le fil est **identique pour les 8 rôles**, aucune variation par rôle, aucun état « brouillon » visible (§3) ; **aucun point d'entrée de rédaction** (bouton `+`, FAB, menu d'action) ne doit être conçu tant que PO-AT-01 n'est pas tranché ; `link` est **nullable** — l'état « actu sans lien » est un cas normal, pas une erreur.
- L'onglet « Actus » reste l'une des 4 entrées fixes de la nav basse (`ARCHITECTURE.md` §13.4) : ce n'est pas une route poussée, il n'y a pas de flèche retour.
- Un état vide explicite est nécessaire (aucune actu publiée non expirée) — c'est un état valide, jamais une erreur, même logique que « aucune saison en cours » ailleurs dans le projet.

**Prêt pour transmission à designer-agent : oui.** PO-AT-01 ne bloque pas cette passe — il bloque la passe de rédaction/publication.

## UI design

> Périmètre de cette section : elle décrit l'écran **tel qu'il devra être construit à une passe future**, pas quelque chose à scaffolder maintenant. Cette passe reste « migration + domaine seulement » (§1, AC-AT-12) : aucun fichier n'est créé sous `data/` ni `presentation/` en conséquence de cette section, `ActusPage.tsx` reste le stub `TODO(PO-1)` inchangé. Ce texte sert de référence à la passe de lecture (`data/` + `presentation/`) qui suivra, une fois PO-AT-06 (ordre du fil, format de `link`) éclairci en implémentation.

### Source de la maquette

`docs/designs/DESIGN_LINKS.md` §2 ne comportait pas encore de ligne pour `actus` au moment de cette passe (constaté par po-agent, en-tête du présent spec, PO-AT-07). Situation identique au cas `menu` : la développeuse a déposé un export PNG directement dans le dépôt (`docs/designs/actus/[v0] Mob - Actus.png`), sans lien artifact. Conformément à `DESIGN_LINKS.md` §4 (cas « aucune ligne »), la ligne est ajoutée par le présent passage plutôt que redemandée :

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| actus (`[v0] Mob - Actus`) | — aucun lien fourni | 2026-09-04 | `docs/designs/actus/[v0] Mob - Actus.png` | **instantané seul** |

La maquette montre un fil vertical simple, fond sombre : titre « Actus du club » surmonté d'un bandeau décoratif dégradé rouge/vert/blanc (couleurs du club), puis une liste d'entrées séparées par un simple filet horizontal (pas de carte à bordure/`rounded-3xl` comme dans `docs/designs/menu/[v0] Mob - Menu.png` — ici, un fil de texte plus proche d'un flux d'actualité que d'une grille de cartes). Chaque entrée : date en petit texte vert majuscule, titre en gras blanc, description en gris, et — sur une seule des trois entrées illustrées — un bouton contour vert « En savoir plus → ». Vocabulaire couleur (vert accent, fond noir) cohérent avec `docs/designs/v4_coach_dashboard.png` et `docs/designs/menu/[v0] Mob - Menu.png` : rien à réinventer sur ce plan.

### Emplacement dans la nav

L'écran occupe l'onglet **Actus**, 3ᵉ des 4 entrées fixes de la nav basse (`BottomNav.tsx`, route `/actus`, à l'intérieur d'`AppShell` — `ARCHITECTURE.md` §13.4). C'est une destination de nav primaire, pas une route poussée : pas de flèche retour, donc pas de `sticky` nécessaire sur le titre pour préserver un contrôle de retour (même raisonnement que `specs/menu.md` § « Emplacement dans la nav »). Cette passe remplace, pour une itération future, le stub actuel décrit dans `specs/coach-dashboard.md` (§ « Écarts maquette / CDC », note sur l'onglet Actus) — rien à faire ici tant que cette passe de lecture n'est pas construite.

### Ce qui change par rôle

Rien. §3 du présent spec est explicite : les 8 rôles voient un fil **identique**, sans scope équipe/section/saison, sans variation de mise en page ni de données. Un compte multi-rôles ne change rien non plus (§3, dernier paragraphe). Conséquences directes pour l'écran :

- Aucune carte de menu à masquer par permission (contrainte générale du projet) — sans objet ici, il n'y a pas de carte de menu sur cet écran.
- Aucun état « brouillon » ou « archivé » visible pour quelque rôle que ce soit, administrateur compris (§1, §3) — la question ne se pose même pas côté UI, RLS ne renvoie jamais ces lignes.
- **Aucun point d'entrée de rédaction** (bouton `+`, FAB, menu d'action, lien « Modifier ») : PO-AT-01 n'étant pas tranché, rien de ce type n'est conçu ici, pas même à l'état masqué — cohérent avec « pas de carte désactivée » du projet, et avec la note §7 du spec.

### Structure de l'écran, de haut en bas

1. **Titre « Actus du club »** — texte seul, même poids que les titres des trois autres onglets, avec le bandeau décoratif dégradé (rouge/vert/blanc) de la maquette juste en dessous : un élément purement graphique, pas interactif, propre à cet écran (aucun autre onglet n'a ce bandeau — écart mineur assumé, pas un nouveau pattern fonctionnel).
2. **Liste verticale de `NewsCard`**, une par actualité visible (`NewsRepository.listVisible()`), séparées par un filet horizontal fin — pas de conteneur de carte à bordure, la maquette ne l'illustre pas.
3. **Nav basse à 4 entrées**, onglet Actus actif — appartient à `AppShell`, rien à concevoir ici.

Pas de scroll infini ni de pagination illustrés par la maquette (3 entrées suffisent au cadrage visuel) — comportement au-delà d'une première page non tranché, voir « Questions ouvertes UI ».

### Nouveau composant — `NewsCard`

Variation d'un patron déjà connu du projet (ligne de contenu + action optionnelle à droite/en dessous, dans l'esprit de la liste « À venir » du tableau de bord coach) plutôt qu'une forme inédite — pas de prototype Claude Design supplémentaire nécessaire, la maquette PNG suffit à la cadrer :

- **Date** — petit texte vert, majuscules, espacement de lettres (`tracking-wider`, cf. préférence déjà consignée pour les utilitaires Tailwind prédéfinis) : jour + mois en toutes lettres, formaté à partir de `publishedAt` **uniquement**, jamais `createdAt` (§2, AC-AT-02). Format exact (avec/sans année, locale) laissé à `presentation/shared/formatters/` — détail d'implémentation, sans impact sur cette section.
- **Titre** — gras, blanc, une à deux lignes, `title` tel quel (pas de troncature à concevoir : la maquette ne montre aucun titre coupé).
- **Description** — `details` en texte gris, rendu en entier (pas de « lire la suite » inline dans la carte elle-même — le seul mécanisme d'approfondissement est le lien externe optionnel ci-dessous, pas un texte tronqué à dérouler).
- **Bouton « En savoir plus → »** (contour vert, `h-11` minimum pour la cible tactile) — **rendu uniquement si `link` est non nul et non vide**. C'est l'état normal d'une actu sans lien (§7 du spec, `link` nullable) : pas un espace vide ni un bouton désactivé/grisé à la place, le bouton est simplement absent, exactement comme les entrées « Réunion extraordinaire » et « Reprise des entraînements » de la maquette. `target="_blank" rel="noopener noreferrer"` en réouverture, même convention que `ExternalLinkRow` (`specs/menu.md`, AC-MN-10) — pas un nouveau comportement de lien sortant à inventer.

### États à couvrir

| État | Traitement |
|---|---|
| Chargement (premier rendu, requête `listVisible()` en cours) | État de chargement simple à la place de la liste — jamais un flash de liste vide interprétable comme « aucune actu » ; pattern à définir en implémentation, aucune maquette dédiée à ce jour |
| Erreur réseau/requête | Message explicite (« Impossible de charger les actualités » ou équivalent) à la place de la liste, jamais une erreur silencieuse ni un état vide trompeur — même logique que `if (error)` dans le patron ViewModel/Page (`CLAUDE.md` §6) |
| Liste vide (aucune actu publiée non expirée) | État vide explicite (« Aucune actu pour le moment » ou équivalent) à la place de la liste — **cas normal, jamais une erreur** (§7 du spec ; même logique que « Aucune échéance à venir » du tableau de bord coach ou « aucune saison en cours » ailleurs dans le projet) |
| `link` nul sur une entrée | Carte sans bouton « En savoir plus », description seule en dernier élément avant le filet séparateur — cas normal, pas une carte incomplète |
| `link` renseigné | Carte avec bouton, ouverture externe (`target="_blank"`) |

### Composants réutilisés vs nouveaux

- **Réutilisés** : `BottomNav` (rien à concevoir), convention d'ouverture de lien externe déjà posée par `ExternalLinkRow` (`specs/menu.md`), vocabulaire visuel (accent vert, fond sombre) de `docs/designs/v4_coach_dashboard.png` / `docs/designs/menu/[v0] Mob - Menu.png`, formatters existants pour l'affichage de date.
- **Nouveau, mais pas un nouveau pattern visuel** : `NewsCard` — variation directe d'un patron ligne-de-contenu-avec-action-optionnelle déjà présent dans le projet (liste « À venir »), pas une forme inédite. Le bandeau décoratif sous le titre est le seul élément purement graphique propre à cet écran ; il n'introduit aucune interactivité ni logique d'état à concevoir.
- **Pattern « N total, plus récent déplié »** (convocations) délibérément **non repris ici** : ce patron existe pour dérouler un contenu supplémentaire (compteurs de réponse) au tap sur l'entrée la plus récente ; une actu n'a pas d'équivalent (son seul contenu additionnel est un lien externe, pas une expansion inline) — chaque `NewsCard` s'affiche donc déjà en détail complet, cohérent avec ce que montre la maquette pour ses trois entrées.

### Contraintes mobiles (CLAUDE.md §6)

- Bouton « En savoir plus → » : cible tactile réelle, `h-11` minimum explicite — jamais le défaut `h-8` de shadcn.
- Aucun champ de formulaire, aucune paire de champs côte à côte sur cet écran (pas de `grid-cols-2`) : la contrainte `min-w-0` ne s'applique à rien ici, signalé explicitement pour ne pas la chercher à tort.
- Filet séparateur et bandeau décoratif : éléments non interactifs, aucune cible tactile à prévoir pour eux.
- À vérifier sur un viewport mobile réel une fois construit, pas une fenêtre desktop redimensionnée.

### Questions ouvertes UI

Aucune n'est bloquante pour une transmission à mentor-agent au moment où cette passe de lecture sera prise en charge — mais aucune n'est tranchée non plus, à l'inverse de `create-convocation.md` où les maquettes couvraient déjà le sujet :

1. **Ordre d'affichage du fil** (PO-AT-06, déjà signalé côté spec) : la maquette suggère un ordre antéchronologique par `publishedAt` (l'actu la plus récente en tête), mais rien ne le confirme comme règle — à trancher en implémentation, sans impact sur cette section.
2. **Pagination / scroll infini au-delà de la première page** : non illustré par la maquette (3 entrées), non traité par le spec — à trancher en implémentation (`data/` + `presentation/`), possiblement lié à PO-AT-06.
3. **Format exact de la date affichée** (avec/sans année, abréviation du mois) : détail de `formatters/`, sans impact sur la structure ci-dessus.
4. **Validation du format de `link`** (PO-AT-06) : si le lien est manifestement invalide (ex. chaîne non-URL), faut-il quand même rendre le bouton ? Non tranché — hypothèse par défaut la plus simple : rendre le bouton dès que `link` est non vide, laisser le navigateur échouer à l'ouverture le cas échéant, jusqu'à signal contraire.

**Prêt pour transmission à mentor-agent : non, pas encore** — cette passe reste migration + domaine (AC-AT-12), et PO-AT-01 doit être tranché avant qu'une quelconque passe de rédaction ne soit spécifiée. Cette section est prête, elle, à servir de référence à la **passe de lecture** (`data/` + `presentation/`) le jour où celle-ci est planifiée.
