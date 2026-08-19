# Spec — Season scoping correction (AC-CD-01)

> Consumed by: Claude Code (Developer agent).
> Produced by: mentoring session between the developer and the Mentor agent.
> Status: decisions below are final for this iteration. Points marked "OPEN" are explicitly deferred — do not resolve them implicitly while implementing.
> Scope: `domain/policies`, `domain/repositories` (interface addition only), `data/repositories` (bug fix), `data/errors`, one SQL migration (constraint + RLS). No season-rollover use case is requested in this pass.

## 1. Why this correction exists

`Team` is scoped to a single season (a new `Team` row is created each season rather than mutated in place — deliberate choice, keeps a clean historical record and avoids "which season does this team belong to right now" ambiguity). `seasons` already carries `start_date` and `end_date` (`date` columns, no time component).

Gap identified (AC-CD-01): nothing today resolves "the current season" or filters a coach's visible teams by it. `TeamRepositoryImpl.findByIds` pulls teams straight from `user_roles.team_id` with no season filter at all. A coach's assignment from a prior season still shows up on the dashboard today — nothing currently expires or excludes it. This is not marked `// TODO` anywhere, so it is easy to miss in review.

Two things must exist for this to be fixable at all:
1. A way to unambiguously resolve "the current season" from `now()`.
2. A guarantee that two seasons can never overlap — otherwise "the current season" is not a single, well-defined value, and every consumer of it (dashboard, RLS) inherits that ambiguity silently.

This spec addresses both, plus the concrete scoping fix on the coach dashboard path. It does **not** address who creates next season's `Team` rows or reassigns coaches — see section 6.

## 2. Domain policy — reference function, not authoritative

```typescript
// domain/policies/season-scope.ts

/**
 * Reference rule for "is this season the current one".
 * ⚠️ MIRRORED in SQL — see supabase/migrations/xxxx_season_no_overlap.sql
 * and the `current_season()` function used by RLS policies.
 * The SQL side is authoritative for anything security-relevant (RLS), because
 * `now()` must be evaluated by Postgres, never trusted from a client-supplied date.
 * This function exists for readability, unit testing, and any UI-only use
 * (e.g. showing "upcoming season" state) — it must never gate a security decision.
 */
export function isCurrentSeason(season: Season, now: Date): boolean {
  const start = new Date(season.startDate)
  const end = new Date(season.endDate)
  return now >= start && now <= end // OPEN — see section 3.3 on end_date inclusivity
}
```

- Write a Vitest test for this function as part of this pass, same pattern as `can.test.ts` / `convocation-closure.test.ts`.
- Do not call this function from any RLS-adjacent code path. It is domain-layer documentation and UI convenience only.

## 3. SQL — non-overlap constraint on `seasons`

### 3.1 Why a database constraint, not just application-level validation

Two seasons overlapping is not a UX bug, it is a correctness bug: it makes "the current season" undefined, which every downstream RLS policy and dashboard query silently inherits. This must be impossible to write to the database, not just discouraged in a form. Same reasoning already applied to `user_roles_scope_matches_role` (CHECK constraint, mapped Postgres error `23514`) — the database is the authority, TypeScript mirrors it for readability and tests.

### 3.2 Migration

```sql
-- supabase/migrations/xxxx_season_no_overlap.sql

-- Rule duplicated from domain/policies/season-scope.ts (isCurrentSeason).
-- This constraint is authoritative — it prevents two seasons from ever
-- overlapping at the database level, regardless of write path.

ALTER TABLE seasons
  ADD COLUMN season_range daterange
  GENERATED ALWAYS AS (daterange(start_date, end_date, '[]')) STORED;

ALTER TABLE seasons
  ADD CONSTRAINT seasons_no_overlap
  EXCLUDE USING gist (season_range WITH &&);

-- Resolves "the current season" as a single row, or no row if there is a
-- deliberate gap between two seasons (e.g. summer break before rollover).
CREATE OR REPLACE FUNCTION current_season()
RETURNS seasons
LANGUAGE sql STABLE AS $$
  SELECT * FROM seasons WHERE season_range @> current_date LIMIT 1;
$$;
```

- `'[]'` means both `start_date` and `end_date` are inclusive bounds on the generated range — see 3.3 for why this still needs a decision.
- `EXCLUDE USING gist` is a native Postgres range-exclusion constraint: any `INSERT`/`UPDATE` that would create an overlapping range is rejected by the database itself, not caught after the fact.
- `current_season()` returns zero rows during a gap between two seasons (e.g. summer break, before the next season is created) rather than an error. Every consumer (dashboard use case, RLS policies) must handle "no current season" as a valid state, not an exceptional one.

### 3.3 OPEN — `end_date` inclusivity at the season boundary

Not decided in this pass: when season A ends `2026-06-30` and season B starts `2026-07-01`, is `2026-06-30` still fully "in" season A only, with no shared day at all? As written above (`'[]'`, both bounds inclusive), that is already guaranteed by the exclusion constraint regardless — two ranges `[2026-01-01, 2026-06-30]` and `[2026-07-01, 2026-12-31]` do not overlap. The open question is narrower and purely about *data entry discipline*: should there ever be a gap day between seasons (a day belonging to neither), and if the Bureau creates next season's `start_date` equal to the previous season's `end_date` by mistake, the exclusion constraint will correctly reject it — which is the safety net, not a design decision to make now. Flag this in code review if it comes up; do not silently decide a default gap/no-gap policy while implementing this spec.

### 3.4 Error mapping

Add to `data/errors/map-supabase-error.ts`: Postgres error code `23P01` (`exclusion_violation`) on the `seasons` table → new domain error `OverlappingSeasonError`, same pattern as the existing `23514` → `InvalidRoleScopeError` mapping.

```typescript
// domain/errors/overlapping-season-error.ts
export class OverlappingSeasonError extends DomainError {
  constructor(message = 'Season dates overlap with an existing season') {
    super(message)
  }
}
```

## 4. Team/coach scoping by current season

### 4.1 Repository addition

```typescript
// domain/repositories/season-repository.ts
export interface SeasonRepository {
  findCurrent(): Promise<Season | null>
}
```

`data/repositories/SeasonRepositoryImpl.ts` implements this by calling the `current_season()` SQL function (section 3.2) — no client-side date logic, `now()` must be evaluated by Postgres.

### 4.2 Fix `TeamRepositoryImpl.findByIds`

Current bug: teams are resolved from `user_roles.team_id` with no season filter, so a coach's prior-season assignment still resolves and displays. Fix at the query level — join or filter `teams` against the current season's `id`, not against a client-supplied date:

```sql
-- illustrative, not final SQL — adapt to existing findByIds shape
SELECT t.* FROM teams t
WHERE t.id = ANY($1)
  AND t.season_id = (SELECT id FROM current_season())
```

If `current_season()` returns no row (gap between seasons), the query returns zero teams — the coach dashboard use case must render an empty state, not an error, for this case.

### 4.3 RLS mirror

The corresponding RLS policy on `teams` (or on whatever view/table the dashboard reads through) must apply the same `season_id = (SELECT id FROM current_season())` filter, commented with a reference back to this spec, per the standing RLS/policy correspondence convention (`ARCHITECTURE.md` §7).

**This is the actual security boundary.** The `TeamRepositoryImpl` fix in 4.2 is necessary for correct application behavior, but a coach hitting the Supabase REST API directly with their own token must be blocked by RLS regardless of what the repository does — same reasoning already established for every other RBAC rule in this project.

## 5. Explicitly out of scope / deferred (do not build)

- **5.1 — Season rollover.** Who creates next season's `Team` rows and reassigns coaches (new `user_roles` rows pointing at the new `team_id`) is a distinct admin use case, not addressed here. Do not build it as part of this pass — flag it as a follow-up spec once the Bureau's actual rollover workflow is confirmed.
- **5.2 — Existing overlapping data.** If any existing `seasons` rows already overlap, the migration in section 3.2 will fail to apply. Check for overlaps before running the migration; do not silently resolve any conflict found — surface it and stop.
- **5.3 — `end_date` boundary policy.** See 3.3. Not resolved in this pass.

## 6. Acceptance for this pass

- `domain/policies/season-scope.ts` created with `isCurrentSeason`, covered by a Vitest test.
- `domain/repositories/season-repository.ts` created (interface only); `SeasonRepositoryImpl.findCurrent()` implemented against `current_season()`.
- `domain/errors/overlapping-season-error.ts` created; mapped in `map-supabase-error.ts` from Postgres `23P01`.
- Migration adds `season_range`, the `seasons_no_overlap` exclusion constraint, and the `current_season()` function.
- `TeamRepositoryImpl.findByIds` filters by current season.
- RLS policy on the relevant table(s) mirrors the same current-season filter, commented with a reference to this spec.
- No season-rollover use case created in this pass.
- No RBAC matrix changes in this pass.