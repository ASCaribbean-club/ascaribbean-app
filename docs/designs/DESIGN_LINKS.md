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
| match_details_page | https://claude.ai/code/artifact/e3e3d973-cd15-41ce-a08f-3525a594796b | 2026-08-27 | N/A | actif |

Une ligne par feature ayant une maquette associée. `Statut` prend une des valeurs suivantes :

- `actif` — lien vérifié valide.
- `mort` — lien testé, ne répond plus ; se rabattre sur l'instantané local.
- `absent` — aucune maquette encore produite pour cette feature.

## 3. Quand alimenter ce registre

Au moment où une maquette Claude Design est produite pour une feature (généralement en amont ou en parallèle du spec dans `docs/specs/`) :

1. Ajouter une ligne dans le tableau ci-dessus avec le lien artifact et la date du jour.
2. Une fois le spec de la feature figé (prêt pour le handoff vers l'agent dev), exporter un instantané statique de l'artifact et le committer dans `docs/maquettes/` — ne pas laisser le lien seul porter la référence au-delà de la phase de conception active.
3. Référencer la ligne du registre (ou directement l'instantané) depuis le spec de la feature dans `docs/specs/`, plutôt que de recopier le lien à plusieurs endroits.

## 4. Ce que font l'agent PO et l'agent designer

Avant de demander un lien de maquette à la développeuse pour une feature donnée, les deux agents consultent ce registre :

- Une ligne `actif` existe → l'agent l'utilise directement, sans redemander.
- Une ligne `mort` existe → l'agent utilise l'instantané local, signale que le lien est mort, et propose de le remplacer si une maquette à jour existe.
- Aucune ligne, ou statut `absent` → l'agent demande le lien à la développeuse **une seule fois**, l'ajoute lui-même au registre une fois obtenu (avec la date du jour), et ne redemande plus lors des runs suivants pour la même feature.

Le registre est donc alimenté par les agents autant que par la développeuse — pas seulement consulté passivement.

## 5. Points ouverts

- Format de l'instantané local (PNG suffisant, ou conserver aussi le HTML brut de l'artifact pour la structure) — à trancher au premier cas réel.
- Automatisation de la détection de lien mort (ping périodique) — non prioritaire tant que le registre reste petit ; vérification manuelle par l'agent au moment de l'usage pour l'instant.