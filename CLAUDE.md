# CLAUDE.md — AS Caribbean

Operating rules for Claude Code on this repository. This file is authoritative for how code gets written here — read it before touching any file. Reference docs (French, for club/Bureau readers): `docs/ARCHITECTURE.md`, `docs/GOUVERNANCE.md`, `docs/RETENTION-PURGE.md`.

## 1. What this project is

Internal sports-club management PWA, invitation-only (no public area). 8 cumulative roles (Joueur/Joueuse, Coach/Staff, Responsable de section, Dirigeant habilité, Trésorier, Référent médical, Bénévole, Administrateur) — multi-role accounts are the norm, not the exception. Free/low-budget infra. Mobile-only presentation for now, React Native evolution possible later — never write code that assumes otherwise.

## 2. Stack — do not suggest alternatives

Vite + React + React Router + vite-plugin-pwa + TanStack Query + Context API + Supabase (Postgres + RLS) + Netlify. This is decided. Do not propose Next.js, Redux, Zustand, Prisma, or other state/backend libraries "as an improvement."

## 3. Architecture — the one non-negotiable rule

Three layers, dependency arrows always point inward:

```
presentation ──▶ domain ◀── data
```

- `domain/`: pure TypeScript. No React, no Supabase, no TanStack Query, no `window`. Testable with plain objects in Node.
- `data/`: implements `domain/repositories/` interfaces, talks to Supabase, maps DB rows to entities.
- `presentation/`: React. Imports `domain/` only — **never `data/` directly**. Wiring happens through the DI container (`presentation/di/container.ts`).

If you're about to write an import that violates this, stop and flag it instead of writing it.

## 4. Naming conventions

| Thing | Convention |
|---|---|
| Use case | `PascalCaseUseCase`, in `domain/usecases/` (e.g. `RespondToConvocationUseCase`) |
| Repository interface | `domain/repositories/xxx-repository.ts`, e.g. `ConvocationRepository` |
| Repository implementation | `data/repositories/XxxRepositoryImpl.ts` |
| Mapper | `data/mappers/`, always present between DTO and entity — never skip it, even for a "simple" table |
| ViewModel hook | `use<Feature>ViewModel.ts` — the `use` prefix is mandatory, not cosmetic (React's `rules-of-hooks` identifies hooks by name) |
| Screen component | `<Feature>Page.tsx` — zero business logic, only `if (isLoading)` / `if (error)` / `if (canX)` branches on booleans the ViewModel already computed |
| Query keys | Centralized in `presentation/shared/query-keys.ts`, shape `[resource, ...discriminants]` — never inline a queryKey in a component or hook |

## 5. Where things go — quick reference

```
src/
  domain/
    entities/       business types
    policies/        rbac-matrix.ts, can.ts, and other pure business rules
    usecases/        one folder per feature, created when that feature is built — never pre-created
    repositories/    interfaces only
    errors/
  data/
    datasources/     supabase-client.ts
    dto/             raw snake_case table shapes
    mappers/
    repositories/    *Impl.ts
    errors/          map-supabase-error.ts
  presentation/
    app/             main.tsx, App.tsx, router.tsx, providers/
    di/              container.ts
    shared/          components/, layout/, hooks/, query-keys.ts, formatters/
    features/        one folder per screen: Page + ViewModel + local components
```

Don't create `presentation/mobile/` or `presentation/desktop/` — single-render phase, no folder for a symmetry that doesn't exist yet. Don't create a `utils/` or global `types/` folder — everything belongs to an identifiable layer.

## 6. Patterns to follow without being asked

- **ViewModel does the work, component only renders.** `queryFn` calls a use case; the use case is a plain async function with no React/Supabase import. Never put `useQuery` inside a use case.
- **Policies are pure functions.** `can(user, action, context): boolean` in `domain/policies/`, one source of truth, mirrored (never generated) in SQL RLS policies. RLS is the actual security; the front-end policy is UX only (hide a menu card) — never treat a front-end check as sufficient.
- **Audit logging is never called from a component.**
  - Data *access* (health data view, nominative export) → Postgres trigger, so it's traced even on direct DB access.
  - Business *actions* (role change, Legacy points correction, account deactivation) → logged from the use case in `domain/`, because intent/motive doesn't exist at the SQL level.
- **`AttendanceRecord` and `ConvocationResponse` stay separate entities** — player-declared intent vs. coach-confirmed fact. Don't merge them even if they look similar.
- **Upsert-on-conflict, not insert-and-grow**, for any "current state" table (`ConvocationResponse`, `AttendanceRecord`) — these are last-value-wins, not append-only logs.
- Retention/purge policy lives in Supabase (scheduled job), never in `domain/` — `domain/` doesn't know about expiry.

## 7. What NOT to do

- Don't generate SQL from TypeScript, or vice versa — mirror manually, both sides commented with the action/rule name they correspond to.
- Don't add a `data/` or `presentation/` implementation when a spec explicitly says "domain layer only, stop there."
- Don't resolve a point explicitly marked OPEN in a spec — implement around it, flag it, move on.
- Don't add RBAC matrix entries, new permissions, or new use cases beyond what the current spec asks for, even if it seems like the obvious next step.
- Don't put a `service_role` Supabase key anywhere reachable by `VITE_`-prefixed env vars — only the `anon` key belongs in the client bundle.
- Don't hand back finished code silently rewriting the developer's approach — she is learning React coming from Flutter; when a choice has a non-obvious reason (e.g. why `useQuery` can't live in `domain/`), say why, briefly, don't just fix it.

## 8. Testing

Priority order: `domain/policies` (RBAC, business rules) first — highest rule density, cheapest to test, no mocks needed. Then `domain/usecases`, then `data/mappers`. `presentation/` components: low priority, skip unless the ViewModel logic itself is under test.

## 9. Commits and language

- **Never mention Claude, Claude Code, or AI assistance in commit messages.** Commit messages read as if written by the developer.
- This file, `SKILL.md` files, and anything under `.claude/` (commands, agents) are written in **English**.
- Project documentation for the club/Bureau (`docs/ARCHITECTURE.md`, `docs/GOUVERNANCE.md`, `docs/RETENTION-PURGE.md`, CDC-related docs) stays in **French** — don't translate it.
- No personal names anywhere in code, comments, commits, or docs — roles only (`coach`, `trésorier`, `président`), never a real name, even in an example or a test fixture.