# ADR 0001 — Observabilité : PostHog Cloud EU

- **Statut** : accepté
- **Date** : 2026-10-14
- **Contexte** : suivre les erreurs inattendues et l'usage réel de l'application (écrans, fonctionnalités inutilisées), avec un budget nul et des données de membres à protéger (RGPD).

## Décision

PostHog Cloud **EU**, un seul outil pour deux besoins distincts qui ne sont jamais mélangés : le suivi d'erreurs (« ce qui casse ») et la mesure d'usage (« comment l'app est utilisée »). Les erreurs métier attendues (`DomainError`) ne sont pas des bugs.

### Alternatives écartées

| Option | Raison |
|---|---|
| **Sentry** (plan gratuit) | Limité à un seul utilisateur : incompatible avec `GOUVERNANCE.md` (le président doit être titulaire et le développeur doit aussi avoir accès). |
| **GlitchTip** | Reste la **sortie documentée** pour le suivi d'erreurs (accepte les SDK compatibles Sentry), mais n'apporte pas la mesure d'usage et ajouterait un second compte au registre. |
| Deux outils (erreurs + analytics) | Deux comptes à gouverner, deux consentements à documenter. |

PostHog : un seul compte au registre de gouvernance, hébergement en UE, quota gratuit très supérieur au volume attendu du club.

### Confidentialité (non négociable)

Replay, autocapture, pages vues automatiques, heatmaps, logs console, géolocalisation par IP : désactivés, dans le code **et** dans les réglages du projet. Liste de blanche d'événements typée ; identification par UUID interne + rôles uniquement ; messages d'erreur supprimés avant envoi. Détail et justification de chaque réglage : `OBSERVABILITE.md` §4.

### Réversibilité

Tout passe par l'interface `Observability` ; `posthog-js` n'est importé que par `posthog-adapter.ts` (règle `dependency-cruiser` `posthog-only-in-adapter`, testée par une violation volontaire). Changer d'outil = réécrire un fichier. Le catalogue d'événements est la liste blanche RGPD.

### Placement

Hors de `domain/` : l'observabilité n'est pas du métier, aucun use case ne trace d'événement. Tout vit dans `presentation/shared/observability/`, câblé par `presentation/di/containers/observability-container.ts`.

### Environnements

Actif en production uniquement. Le plan gratuit n'autorise qu'un projet PostHog (création d'un projet « dev » refusée) : plutôt que de polluer l'unique projet, rien n'est envoyé en dev.

### Filtrage des outils MCP

Aucun filtrage configuré : le serveur MCP PostHog n'expose qu'un outil `exec` (plus des compétences), pas de liste d'outils à restreindre.

## Conséquences

- Le président doit créer/posséder le compte (fait : organisation « AS Caribbean », développeur membre).
- La commande de build Netlify devient `npm run build:release` (envoi puis suppression des source maps).
- La mesure d'usage reste coupée tant que `enableAnalytics()` n'est pas appelée (consentement OPEN, `DEFAULTS-A-CHALLENGER.md`).
