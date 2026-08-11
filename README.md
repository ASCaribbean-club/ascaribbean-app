# AS Caribbean — Club App

Internal application for **AS Caribbean**, a multisport club in Nantes (Seniors, Caribbean Girlz, E-sport, Chess & Dominoes, and event/media activities).

> Centralize the sporting, administrative and financial life of the club in one simple, secure, mobile-first tool — for players, coaches, board members and volunteers alike.

The app doesn't replace human coordination — it's the shared reference point that cuts down on missed information and keeps the club's tracking reliable: a single members database, a shared calendar with call-ups and attendance, sporting follow-up, document/payment tracking, and the ASC Legacy engagement-rewards module.

## Roles

Access is role-based, and a person can hold several roles at once (e.g. a player who is also a coach). Every screen and every piece of data is scoped to what the role actually needs — least privilege by default, enforced both in the UI and at the database level (Row-Level Security).

| Role | What they can do |
|---|---|
| **Player / Player (f.)** | Own profile, calendar, call-ups, attendance, documents, Legacy points |
| **Coach / Staff** | Their team's roster, attendance, evaluations, call-ups, observations |
| **Section manager** | Runs their section: events, roster, documents, reports |
| **Authorized officer** | Members, licenses, payments, documents, communication, exports |
| **Treasurer** | Membership fees, payment schedules, reminders, financial exports |
| **Medical referent** | Health information strictly needed for follow-up — narrow, audited access |
| **Volunteer** | Missions, planning, instructions and confirmations |
| **Administrator** | Configuration, accounts, roles, seasons, security, audit log |

See `docs/CDC_AS_Caribbean.pdf` (section 3) for the full permissions matrix.

## Screenshots

<!-- TODO: add screenshots once the first screens are built -->

| Home | Calendar | Member profile |
|---|---|---|
| _coming soon_ | _coming soon_ | _coming soon_ |

## Tech overview

- **React 19 + Vite**, packaged as an installable PWA (mobile-first, offline-friendly for critical screens)
- **Supabase** (Postgres, Auth, Storage) as the backend, with Row-Level Security as the real authorization boundary
- **TanStack Query** for server-state (cache, retry, invalidation)
- **Clean Architecture** split into `domain/` (framework-free business logic), `data/` (Supabase implementations), `presentation/` (React)
- **Vitest** for domain, data and view-model tests

The codebase is organized so the business logic (roles, rules, use cases) stays portable and testable independently of React or Supabase — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full rationale and target folder structure.

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm run build       # typecheck + production build
npm run test         # run the test suite (Vitest)
npm run lint          # lint the codebase
npm run boundaries      # verify architecture layer boundaries
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — application architecture (layers, permissions model, testing strategy, target folder structure)
- [`docs/GOUVERNANCE.md`](docs/GOUVERNANCE.md) — project governance
- [`docs/RETENTION_PURGE.md`](docs/RETENTION_PURGE.md) — data retention & purge policy
- [`docs/CDC_AS_Caribbean.pdf`](docs/CDC_AS_Caribbean.pdf) — full functional & technical specification (French)

## Status

Internal club application, private use only — not intended for public distribution.
