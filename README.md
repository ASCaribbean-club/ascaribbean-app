# AS Caribbean — Application du Club

Application interne pour **AS Caribbean**, club multisports à Nantes (Seniors, Caribbean Girlz, E-sport, Échecs & Dominos, et activités événementielles/médias).

> Centraliser la vie sportive, administrative et financière du club dans un outil simple, sécurisé et mobile-first — pour les joueurs, entraîneurs, membres du bureau et bénévoles.

L'application ne remplace pas la coordination humaine — elle est le point de référence partagé qui réduit les pertes d'information et fiabilise le suivi du club : une base de membres unique, un calendrier partagé avec convocations et présences, un suivi sportif, un suivi des documents/paiements, et le module de récompenses d'engagement ASC Legacy.

## Rôles

L'accès est basé sur des rôles, et une personne peut cumuler plusieurs rôles à la fois (par exemple un joueur qui est aussi entraîneur). Chaque écran et chaque donnée est limité à ce dont le rôle a réellement besoin — moindre privilège par défaut, appliqué à la fois dans l'interface et au niveau de la base de données (Row-Level Security).

| Rôle | Ce qu'il peut faire |
|---|---|
| **Joueur / Joueuse** | Profil personnel, calendrier, convocations, présences, documents, points Legacy |
| **Entraîneur / Staff** | Effectif de son équipe, présences, évaluations, convocations, observations |
| **Responsable de section** | Gère sa section : événements, effectif, documents, rapports |
| **Dirigeant habilité** | Membres, licences, paiements, documents, communication, exports |
| **Trésorier** | Cotisations, échéanciers de paiement, relances, exports financiers |
| **Référent médical** | Informations de santé strictement nécessaires au suivi — accès restreint et audité |
| **Bénévole** | Missions, planning, instructions et confirmations |
| **Administrateur** | Configuration, comptes, rôles, saisons, sécurité, journal d'audit |

Voir `docs/CDC_AS_Caribbean.pdf` (section 3) pour la matrice complète des permissions.

## Captures d'écran

<!-- TODO: ajouter les captures d'écran une fois les premiers écrans construits -->

| Accueil | Calendrier | Profil membre |
|---|---|---|
| _à venir_ | _à venir_ | _à venir_ |

## Aperçu technique

- **React 19 + Vite**, packagé en PWA installable (mobile-first, utilisable hors ligne pour les écrans critiques)
- **Supabase** (Postgres, Auth, Storage) comme backend, avec Row-Level Security comme véritable frontière d'autorisation
- **TanStack Query** pour l'état serveur (cache, retry, invalidation)
- **Clean Architecture** répartie en `domain/` (logique métier indépendante des frameworks), `data/` (implémentations Supabase), `presentation/` (React)
- **Vitest** pour les tests de domaine, de données et de view-models

Le code est organisé pour que la logique métier (rôles, règles, cas d'usage) reste portable et testable indépendamment de React ou de Supabase — voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) pour l'argumentaire complet et la structure de dossiers cible.

## Démarrage

```bash
npm install
npm run dev        # démarrer le serveur de développement
npm run build       # typecheck + build de production
npm run test         # lancer la suite de tests (Vitest)
npm run lint          # linter le code
npm run boundaries      # vérifier les frontières entre couches d'architecture
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture applicative (couches, modèle de permissions, stratégie de tests, structure de dossiers cible)
- [`docs/GOUVERNANCE.md`](docs/GOUVERNANCE.md) — gouvernance du projet
- [`docs/RETENTION_PURGE.md`](docs/RETENTION_PURGE.md) — politique de rétention et de purge des données
- [`docs/CDC_AS_Caribbean.pdf`](docs/CDC_AS_Caribbean.pdf) — cahier des charges fonctionnel et technique complet

## Statut

Application interne du club, usage privé uniquement — non destinée à une distribution publique.
