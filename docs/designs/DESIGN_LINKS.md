# Lien maquettes ↔ specs — AS Caribbean

> Registre des liens vers les maquettes Claude Design utilisées pendant la conception, et de leur instantané local de secours. Consulté par l'agent PO et l'agent designer avant de demander un lien à la développeuse.
> Documents liés : `ARCHITECTURE.md` (§13.1, `docs/specs/` — handoff entre agents), `GOUVERNANCE.md` (principe de non-dépendance à un outil ou une personne).

## 1. Principe

Un artifact publié sur Claude Design (claude.ai) est une page hébergée par Anthropic, pas un fichier versionné du dépôt. Le lien est précieux pendant la conception active d'une feature — il donne accès à la structure HTML de la maquette, plus riche qu'un simple export PNG — mais ce n'est jamais la source de vérité : il peut être dépublié, réorganisé, ou simplement perdu de vue au fil des mois.

Ce document applique à la conception le même principe que `GOUVERNANCE.md` applique aux comptes de service : ne jamais faire dépendre le projet d'un outil ou d'une personne pour retrouver une décision déjà prise.

Deux niveaux de référence, dans cet ordre de préférence :

1. **Lien artifact** (`url`) — tant qu'il est vivant, c'est la version la plus riche et la plus à jour.
2. **Instantané local** (`docs/maquettes/<feature>.png` ou `.html`) — le filet de sécurité versionné dans le dépôt, qui survit si le lien meurt.

## 2. Registre

| Feature / spec | Lien artifact | Récupéré le | Instantané local | Statut |
|---|---|---|---|---|
| match_details_page — **vue joueur** | https://claude.ai/code/artifact/cd36ac10-2c12-4616-8141-5468a779ad9f | 2026-08-27 | N/A | actif |
| match_details_page — **vue coach** | https://claude.ai/code/artifact/97e7d0a5-a538-4f59-a9af-897b235220a1 | 2026-08-27 | N/A | actif |
| profile-page — **variante multi-rôles** (`[v3] [Coach] Mob - Profil (Multi-rôles).dc.html`) | https://claude.ai/design/p/e7fa6de4-7d5b-42a5-93ff-f75669e9adbf?file=%5Bv3%5D+%5BCoach%5D+Mob+-+Profil+%28Multi-r%C3%B4les%29.dc.html | 2026-09-03 | N/A | actif |
| profile-page — **variante rôle unique** (`[v3] [Joueur] Mob - Profil Joueur.dc.html`) | https://claude.ai/design/p/e7fa6de4-7d5b-42a5-93ff-f75669e9adbf?file=%5Bv3%5D+%5BJoueur%5D+Mob+-+Profil+Joueur.dc.html | 2026-09-03 | N/A | actif |
| menu (`[v0] Mob - Menu`) | — aucun lien fourni | 2026-09-04 | `docs/designs/menu/[v0] Mob - Menu.png` | **instantané seul** |
| calendar — **vue coach** (`[v0] [Coach] Mob - Calendrier`) | — aucun lien fourni | 2026-09-04 | `docs/designs/calendar/[v0] [Coach] Mob - Calendrier.png` | **instantané seul** |
| calendar — **vue joueur** (`[v0] [Joueur] Mob - Calendrier_1..4`) | — aucun lien fourni | 2026-09-04 | `docs/designs/calendar/[v0] [Joueur] Mob - Calendrier_{1,2,3,4}.png` | **instantané seul** |
| actus (`[v0] Mob - Actus`) | — aucun lien fourni | 2026-09-04 | `docs/designs/actus/[v0] Mob - Actus.png` | **instantané seul** |
| player-vote — **vue joueuse (bulletin) et vue coach (consultation)** (`[v3] [Coach] Mob - player-vote-{1,2,3}`) | — aucun lien fourni | 2026-09-16 | `docs/designs/player-vote/[v3] [Coach] Mob - player-vote-{1,2,3}.png` | **instantané seul** |
| web-empty-state — **backoffice desktop : connexion + coquille de tableau de bord** (`[Admin] Web - Connexion-1`, `[Admin] Web - Dashboard-{1,2,3}`) | — aucun lien fourni | 2026-09-16 | `docs/designs/desktop/connexion & empty state/[Admin] Web - {Connexion-1,Dashboard-1,Dashboard-2,Dashboard-3}.png` | **instantané seul** |
| web-actus — **backoffice desktop : console de rédaction des actus** (`[Admin] Web - Actus`, `[Admin] Web - Actus-{2,3}`) | — aucun lien fourni | 2026-09-17 | `docs/designs/desktop/actus/[Admin] Web - Actus{,-2,-3}.png` | **instantané seul** |
| web-seasons — **backoffice desktop : gestion des saisons** (`[Admin] Web - Seasons - 1`) | — aucun lien fourni | 2026-09-17 | `docs/designs/desktop/seasons/[Admin] Web - Seasons - 1.png` | **instantané seul** |
| section-and-teams — **backoffice desktop : sections & équipes** (`[Admin] Web - Section and team - {1,2}`) | — aucun lien fourni | 2026-09-17 | `docs/designs/desktop/section-and-teams/[Admin] Web - Section and team - {1,2}.png` | **instantané seul** |

Une ligne par feature ayant une maquette associée. `Statut` prend une des valeurs suivantes :

- `actif` — lien vérifié valide.
- `mort` — lien testé, ne répond plus ; se rabattre sur l'instantané local.
- `absent` — aucune maquette encore produite pour cette feature.
- `instantané seul` — une maquette existe et est versionnée dans le dépôt, mais **aucun lien artifact n'a été fourni**. Ce n'est pas une anomalie : c'est le niveau 2 du §1, atteint directement. À ne pas confondre avec `absent`.

**Note sur les deux lignes `match_details_page`** : la développeuse a confirmé (2026-08-27) que l'écran de détail d'une convocation existe en **deux variantes de maquette distinctes**, la vue coach étant « légèrement différente » de la vue joueur. Les deux liens sont fournis et actifs. Règle de lecture propre à la vue joueur, confirmée à cette occasion : le joueur voit **qui** a répondu, mais **jamais si la personne a répondu présent ou absent** — voir `specs/match_details_page.md` §2 et §3.

**Note sur les deux lignes `profile-page`** (ajoutées par l'agent PO le 2026-09-03, conformément au §4 ci-dessous — aucune ligne n'existait pour cette feature) : la développeuse a fourni ces deux liens en séance de cadrage. Les deux maquettes vivent dans le **projet Claude Design `e7fa6de4-7d5b-42a5-93ff-f75669e9adbf`** (« AS Caribbean »), d'où une forme d'URL `claude.ai/design/p/<projet>?file=<fichier>` différente des liens `claude.ai/code/artifact/<id>` de `match_details_page` — même registre, deux formats d'URL qui coexistent. Ce ne sont **pas deux états d'une même mise en page mais deux mises en page distinctes** : la variante multi-rôles est à onglets, la variante rôle unique est à plat — voir `specs/profile-page.md` §1 et §2 pour le critère de bascule entre les deux (cardinalité des rôles distincts, pas des affectations). Statut noté `actif` **sur déclaration de la développeuse** : l'agent PO n'ayant aucun accès web (ni MCP `claude_design`, ni outil `DesignSync`), il n'a pas pu ouvrir ces liens ni vérifier lui-même leur validité — c'est la même réserve que celle déjà consignée dans `specs/match_details_page.md` §6.

**Note sur la ligne `menu`** (ajoutée par l'agent PO le 2026-09-04, conformément au §4 ci-dessous — aucune ligne n'existait pour cette feature) : la développeuse a directement importé un **export PNG dans le dépôt**, sans fournir de lien artifact. C'est le **premier cas du registre où l'instantané local est réellement rempli**, et le premier où l'agent PO a pu **lire la maquette lui-même** — la réserve « maquette non ouvrable » consignée sur les quatre écrans précédents ne s'applique donc pas à `specs/menu.md`. Deux conséquences pour le registre : (a) une valeur de statut `instantané seul` a été ajoutée à la liste ci-dessus, `absent` étant faux (une maquette existe) et `actif`/`mort` étant sans objet (aucun lien à qualifier) ; (b) l'instantané vit dans `docs/designs/menu/`, alors que les §1 et §3 annoncent `docs/maquettes/` — l'emplacement réellement utilisé par le dépôt est `docs/designs/` (cf. `docs/designs/v4_coach_dashboard.png`), écart de rédaction du registre signalé plutôt que corrigé unilatéralement (voir §5).

**Note sur la ligne `actus`** (ajoutée par l'agent designer le 2026-09-04, conformément au §4 ci-dessous — aucune ligne n'existait pour cette feature) : même cas de figure que `menu`, déjà décrit et pré-rédigé par l'agent PO dans l'en-tête de `specs/actus.md` (PO-AT-07) sans que celui-ci puisse écrire hors de `specs/` — la ligne ci-dessus reprend telle quelle la formulation qu'il avait préparée. La développeuse a directement importé l'export PNG `docs/designs/actus/[v0] Mob - Actus.png` dans le dépôt, sans fournir de lien artifact : statut `instantané seul`, aucun lien à demander ni à qualifier.

**Note sur la ligne `player-vote`** (ajoutée par l'agent designer le 2026-09-16, conformément au §4 ci-dessous — aucune ligne n'existait pour cette feature) : même cas de figure que `menu` et `actus`, déjà décrit et pré-rédigé par l'agent PO au §0 de `specs/player-vote.md` sans que celui-ci puisse écrire hors de `specs/` — la ligne ci-dessus reprend telle quelle la formulation qu'il avait préparée. La développeuse a directement importé trois exports PNG dans `docs/designs/player-vote/`, sans fournir de lien artifact : statut `instantané seul`, aucun lien à demander ni à qualifier. Point propre à ce cas, à ne pas manquer en le relisant plus tard : **les trois exports portent le préfixe `[Coach]`, mais seul l'export 1 rend effectivement la vue coach** — les exports 2 et 3 rendent la vue joueuse (bulletin). Le nom de fichier ne doit pas servir à déduire la variante de rôle (voir `specs/player-vote.md` §0 et « UI design »).

**Note sur la ligne `web-empty-state`** (ajoutée par l'agent designer le 2026-09-16, conformément au §4 ci-dessous — aucune ligne n'existait pour cette feature) : même cas de figure que `menu`, `actus` et `player-vote`, déjà décrit et pré-rédigé par l'agent PO au §0 de `specs/web-empty-state.md` sans que celui-ci puisse écrire hors de `specs/` — la ligne ci-dessus reprend telle quelle la formulation qu'il avait préparée. La développeuse a directement importé quatre exports PNG dans `docs/designs/desktop/connexion & empty state/`, sans fournir de lien artifact : statut `instantané seul`, aucun lien à demander ni à qualifier. Deux points propres à ce cas, à ne pas manquer en le relisant plus tard : (a) **premier sous-dossier `docs/designs/desktop/` du dépôt** — toutes les maquettes précédentes sont mobiles ; (b) **les trois exports `Dashboard-{1,2,3}` ne sont pas trois écrans mais trois cadrages du même écran** (page complète, zoom barre supérieure, zoom navigation latérale) — voir `specs/web-empty-state.md` §0 et « UI design ». Le chemin contient une espace et une esperluette (`connexion & empty state`), à protéger dans tout script ou commande qui le manipule.

**Note sur la ligne `web-actus`** (ajoutée par l'agent designer le 2026-09-17, conformément au §4 ci-dessous — aucune ligne n'existait pour cette feature) : même cas de figure que `menu`, `actus`, `player-vote` et `web-empty-state`, déjà décrit et pré-rédigé par l'agent PO au §0 de `specs/web-actus.md` sans que celui-ci puisse écrire hors de `specs/` — la ligne ci-dessus reprend telle quelle la formulation qu'il avait préparée. La développeuse a directement importé trois exports PNG dans `docs/designs/desktop/actus/`, sans fournir de lien artifact : statut `instantané seul`, aucun lien à demander ni à qualifier. Trois points propres à ce cas, à ne pas manquer en le relisant plus tard : (a) **les trois exports ne sont pas trois écrans mais un écran et ses deux boîtes de dialogue** — `Actus-2` = liste + dialogue « Créer une actu », `Actus-3` = liste + dialogue « Modifier l'actu » ; (b) **`[Admin] Web - Actus.png` est un export partiel et en grande partie illisible** (fond transparent, texte clair invisible au rendu) — seuls quelques fragments ressortent, tous cohérents avec `Actus-2`/`Actus-3` ; ce n'est pas un quatrième état à interpréter ; (c) la navigation latérale des maquettes montre 7 entrées là où la coquille construite en compte 5 — signalé, hors périmètre de cette feature (voir `specs/web-actus.md` PO-WA-09).

**Note sur la ligne `web-seasons`** (ajoutée par l'agent designer le 2026-09-17, conformément au §4 ci-dessous — aucune ligne n'existait pour cette feature) : même cas de figure que `menu`, `actus`, `player-vote`, `web-empty-state` et `web-actus`, déjà décrit et pré-rédigé par l'agent PO au §0 de `specs/web-seasons.md` (PO-WS-08) sans que celui-ci puisse écrire hors de `specs/` — la ligne ci-dessus reprend telle quelle la formulation qu'il avait préparée. La développeuse a directement importé un export PNG dans `docs/designs/desktop/seasons/`, sans fournir de lien artifact : statut `instantané seul`, aucun lien à demander ni à qualifier. Deux points propres à ce cas, à ne pas manquer en le relisant plus tard : (a) **l'export est tronqué** par une bande blanche juste sous la première ligne du tableau — seule la ligne `2025-2026` (« En cours », vert) est pleinement lisible, la ligne `2024-2025` suivante ne l'est qu'à moitié, et aucune ligne au-delà n'est visible ; (b) **aucune boîte de dialogue n'est illustrée**, contrairement à `web-actus` — le formulaire de création/modification n'a donc aucune référence visuelle propre à cette feature ; `specs/web-seasons.md` « UI design » reprend le patron déjà construit `NewsFormDialog.tsx` plutôt que d'en inventer un nouveau (voir aussi PO-WS-01, seule question ouverte qui touche la mise en page : les libellés/couleurs des états « Terminée » et « À venir », ni l'un ni l'autre visible dans cet export).

**Note sur la ligne `section-and-teams`** (ajoutée par l'agent designer le 2026-09-17, conformément au §4 ci-dessous — aucune ligne n'existait pour cette feature) : même cas de figure que `menu`, `actus`, `player-vote`, `web-empty-state`, `web-actus` et `web-seasons`, déjà décrit et pré-rédigé par l'agent PO au §0 de `specs/section-and-teams.md` (PO-ST-09) sans que celui-ci puisse écrire hors de `specs/` — la ligne ci-dessus reprend telle quelle la formulation qu'il avait préparée. La développeuse a directement importé deux exports PNG dans `docs/designs/desktop/section-and-teams/`, sans fournir de lien artifact : statut `instantané seul`, aucun lien à demander ni à qualifier. Point propre à ce cas, à ne pas manquer en le relisant plus tard : **les deux exports ne sont pas deux écrans mais un seul écran et ses deux boîtes de dialogue** (même cas que `web-actus`) — l'export 1 montre la liste des deux panneaux + le dialogue « Créer une équipe », l'export 2 la même liste + le dialogue « Créer une section » ; les deux dialogues occultant des zones différentes du fond, leur lecture croisée restitue presque intégralement les deux tableaux, sauf le `TYPE` de deux sections et le `NOM` de trois équipes — voir `specs/section-and-teams.md` §1 et « UI design ».

### Historique des remplacements

Quand un lien est remplacé pour une feature déjà inscrite, l'ancien est noté ici plutôt que supprimé sans trace — un export ou une capture ancienne peut encore y renvoyer.

| Feature / spec | Ancien lien | Remplacé le | Motif |
|---|---|---|---|
| match_details_page — vue joueur | https://claude.ai/code/artifact/e3e3d973-cd15-41ce-a08f-3525a594796b | 2026-08-27 | Remplacé par la développeuse en séance de cadrage — nouvelle version de la maquette |

## 3. Quand alimenter ce registre

Au moment où une maquette Claude Design est produite pour une feature (généralement en amont ou en parallèle du spec dans `docs/specs/`) :

1. Ajouter une ligne dans le tableau ci-dessus avec le lien artifact et la date du jour.
2. Une fois le spec de la feature figé (prêt pour le handoff vers l'agent dev), exporter un instantané statique de l'artifact et le committer dans `docs/maquettes/` — ne pas laisser le lien seul porter la référence au-delà de la phase de conception active.
3. Référencer la ligne du registre (ou directement l'instantané) depuis le spec de la feature dans `docs/specs/`, plutôt que de recopier le lien à plusieurs endroits.

## 4. Ce que font l'agent PO et l'agent designer

Avant de demander un lien de maquette à la développeuse pour une feature donnée, les deux agents consultent ce registre :

- Une ligne `actif` existe → l'agent l'utilise directement, sans redemander.
- Une ligne `mort` existe → l'agent utilise l'instantané local, signale que le lien est mort, et propose de le remplacer si une maquette à jour existe.
- Une ligne `instantané seul` existe → l'agent utilise l'instantané local versionné et **ne demande pas de lien artifact** : la référence existe déjà dans le dépôt.
- Aucune ligne, ou statut `absent` → l'agent demande le lien à la développeuse **une seule fois**, l'ajoute lui-même au registre une fois obtenu (avec la date du jour), et ne redemande plus lors des runs suivants pour la même feature.

Le registre est donc alimenté par les agents autant que par la développeuse — pas seulement consulté passivement.

## 5. Points ouverts

- Format de l'instantané local (PNG suffisant, ou conserver aussi le HTML brut de l'artifact pour la structure) — à trancher au premier cas réel. **Premier cas réel survenu le 2026-09-04** (ligne `menu`) : un PNG seul, qui s'est avéré suffisant pour rédiger `specs/menu.md` entièrement. Point à clore ou à confirmer par la développeuse.
- **Emplacement de l'instantané** : les §1 et §3 annoncent `docs/maquettes/`, mais le dépôt utilise en pratique `docs/designs/` (`v4_coach_dashboard.png`, `designs/player-dashboard/`, `designs/menu/`). Aligner la rédaction du registre sur l'usage réel — non fait ici pour ne pas modifier une convention du registre sans arbitrage de la développeuse.
- Automatisation de la détection de lien mort (ping périodique) — non prioritaire tant que le registre reste petit ; vérification manuelle par l'agent au moment de l'usage pour l'instant.
- Une feature dont la maquette existe en plusieurs variantes de rôle occupe plusieurs lignes (cas `match_details_page`, désormais aussi `profile-page`). Le cas s'étant répété, une colonne `Variante` devient défendable plutôt que de continuer à suffixer le nom de la feature — à trancher à la troisième occurrence.
