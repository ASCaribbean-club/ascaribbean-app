# Spec — Convocation responder visibility: RLS correction

> Consumed by: Claude Code (Developer agent).
> Produced by: mentoring session following a recette finding on the match convocation detail screen for players (AC-MD-08 failure).
> Status: decisions below are final for this iteration. One point deferred as OPEN — do not resolve it implicitly.
> Scope: `supabase/migrations/` (new view + function + one policy fix), `domain/repositories/` (one new interface), `data/` (one new repository + mapper). No `presentation/` implementation is requested in this pass unless explicitly noted.
> Relationship to other specs: this is not a domain-model correction — `convocation-domain-correction.md` and its PO-CV addendum are untouched. This file exists because recette on the player-facing match detail screen surfaced RLS gaps that the domain model alone doesn't cover. Section 6.1 of `convocation-domain-correction.md` ("required attendees source of truth") remains OPEN and is explicitly *not* resolved here — see section 3 below.

## 1. Why this correction exists

Recette on the player match-detail screen (AC-MD-08) found that the front-end rule "a player sees who responded, not what they answered" was enforced only in React, not in the database. `convocation_responses_select_team_scoped` lets any `is_team_member` read full rows of `convocation_responses`, including `status` and `reason`. Per `ARCHITECTURE.md` §7, a rule that only the renderer respects is not a restriction, it's decoration — a player's token hitting the Supabase REST API directly already returns every teammate's status, regardless of what the screen shows.

Two related gaps surfaced during the same review:

- `users_select_own` restricts `public.users` to the caller's own row (or admin), so **no one** — player or coach — can currently resolve a teammate's display name. This blocks the "qui a répondu" list entirely, independent of the status/reason leak.
- `convocations_insert_create` admits `section-manager` and `authorized-officer`, but `convocations_select_team_scoped` was never widened to match — those two roles can create a convocation they cannot read back. This is a pre-existing asymmetry, not something this feature introduced, but this feature is the first to hit it.

## 2. Corrected/added surface

### 2.1 `convocation_responders` — view, not a policy change on the base table

A Postgres `SELECT` policy cannot expose some columns of a row to one role and other columns of the *same row* to another role. The base table `convocation_responses` keeps its existing policy (coach/admin, full row, including `status`/`reason`, unchanged). A **new view** carries a narrower policy for the player-facing case:

```sql
-- Exposes, per convocation, every convocated player's response status as a
-- boolean only. Never exposes the actual status/reason values — that's the
-- whole point of this view existing instead of widening the base table policy.
CREATE VIEW convocation_responders AS
SELECT
  c.id AS convocation_id,
  tm.user_id,
  (cr.id IS NOT NULL AND cr.status != 'pending') AS has_responded
FROM convocations c
JOIN team_members tm ON tm.team_id = c.team_id
LEFT JOIN convocation_responses cr
  ON cr.convocation_id = c.id AND cr.user_id = tm.user_id;

-- RLS: same team-scoping as convocations itself — if you can see the
-- convocation, you can see who from the convocated roster has responded.
ALTER VIEW convocation_responders SET (security_invoker = true);
-- Underlying tables' RLS (convocations, team_members, convocation_responses)
-- already applies via security_invoker; no separate GRANT/policy needed
-- beyond confirming is_team_member / is_admin already covers convocations.
```

Note on `LEFT JOIN`: a convocated player has no row in `convocation_responses` until they actually respond (`convocation-domain-correction.md` §5 / PO-CV-05 — no materialization at creation time). The view must start from the roster (`team_members`), not from `convocation_responses`, or non-responders would be silently absent from the list instead of showing an "en attente" badge.

**Why this doesn't leak the individual status despite showing the full list**: `has_responded` is a two-value boolean per player. It answers "did they respond," never "what did they say." This is what keeps the rule intact even though every convocated player appears in the list (unlike an earlier, incorrect draft of this view that filtered to responders only — rejected because it doesn't match the actual screen, which shows the full roster with a per-player badge).

**Reinforcing constraint, not new**: the coach-only present/absent aggregate (`X présents`, from PO-PD-05 elsewhere) must never be rendered on the same screen as this responder list for a player. One visible "a répondu" badge plus a visible aggregate count re-derives the individual status the rule forbids. This was already the plan; restated here because this view is what makes the aggregate's exclusion load-bearing rather than cosmetic.

### 2.2 Responder name resolution — narrow function, not a wider `users` policy

`users_select_own` stays as-is. Widening it to `is_team_member` would let any teammate read arbitrary columns of another `users` row for a need that's actually just "display name in a shared context." Instead:

```sql
-- SECURITY DEFINER: bypasses users_select_own deliberately, but returns only
-- id + display_name, and only for user_ids already visible via
-- convocation_responders for a convocation the caller can see.
CREATE OR REPLACE FUNCTION get_convocation_responder_names(p_convocation_id uuid)
RETURNS TABLE (user_id uuid, display_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.display_name
  FROM users u
  JOIN convocation_responders cr ON cr.user_id = u.id
  WHERE cr.convocation_id = p_convocation_id;
$$;
```

The function itself enforces the boundary (join against `convocation_responders`, which is already team-scoped) rather than relying on the caller to have already checked. `users_select_own` is untouched — this function is the only path by which a teammate's name becomes visible, and it's deliberately narrow (two columns, one join condition) rather than a general-purpose relaxation.

### 2.3 `convocations_select_team_scoped` — align with `convocations_insert_create`

Bug fix, not a permission expansion. `section-manager` and `authorized-officer` already have the right to create a convocation in their scope (`convocations_insert_create`); they must be able to read back what they created.

```sql
-- Before: convocations_select_team_scoped admits is_team_member OR is_admin.
-- After: widen to match the same role set already trusted by
-- convocations_insert_create (section-manager, authorized-officer),
-- scoped the same way insert already scopes them (their section/team).
-- Exact scoping predicate mirrors whatever convocations_insert_create
-- already uses for these two roles — do not introduce a new scoping
-- mechanism, reuse the existing one so the two policies stay comparable
-- at a glance (ARCHITECTURE.md §7, "correspondance vérifiable à l'œil").
```

Write the actual `CREATE POLICY` migration by copying the scoping predicate already present in `convocations_insert_create` for `section-manager` / `authorized-officer` — do not re-derive it independently, to avoid the two policies drifting apart again.

## 3. Explicitly out of scope / deferred (do not build)

- **Section 6.1 of `convocation-domain-correction.md` ("required attendees source of truth") stays OPEN.** `convocation_responders` derives the convocated roster from `team_members` (today's only concrete source) — this is a statement of current fact, not a resolution of 6.1. The view's `JOIN team_members` is the single point that changes if/when 6.1 resolves toward an explicit per-convocation attendee list (e.g. automatic exclusion of injured/on-leave players, or manual roster adjustment per convocation) — both mentioned as anticipated but not yet specified. Do not build either mechanism now; do not add a `convocation_attendees` table speculatively.
- **Inherited limitation, not a new gap to fix**: same as PO-CV-05, a player who never responded and later leaves the team can silently disappear from a *past* convocation's responder list if `team_members` is queried after the roster changes. Same accepted workaround (recreate the event if it's ever a real problem) — do not build roster snapshots to cover this.
- **RBAC matrix** (`rbac-matrix.ts`) is not touched by this pass — section 2.3 corrects an RLS/policy inconsistency, it does not grant a new permission that isn't already reflected in the matrix.

## 4. Repository interface (domain layer)

```typescript
// domain/repositories/convocation-responders-repository.ts
export interface ConvocationResponderStatus {
  userId: string
  hasResponded: boolean
  displayName: string
}

export interface ConvocationRespondersRepository {
  listForConvocation(convocationId: string): Promise<ConvocationResponderStatus[]>
}
```

`data/repositories/ConvocationRespondersRepositoryImpl.ts` calls `convocation_responders` and `get_convocation_responder_names` (two queries, joined client-side, or a single RPC wrapping both — implementer's call, not specified here) and maps to `ConvocationResponderStatus[]`. Standard mapper conventions apply (`ARCHITECTURE.md` §4/§13.3) — no raw `snake_case` or Postgres shape crosses into `domain/`.

## 5. Tests — integration against the database, not against the render

Per `ARCHITECTURE.md` §7 point 2 ("des tests d'intégration contre la base, pas contre l'interface"), and directly because AC-MD-08 failed exactly because the original acceptance criterion checked rendering instead of the API response:

1. Open a session with a player token (team member). Query `convocation_responders` for a convocation on their team. Assert the response contains `has_responded` booleans only — assert `status` and `reason` are **absent from the returned shape entirely**, not merely unused.
2. Same session, call `get_convocation_responder_names`. Assert it returns only `id`/`display_name` for teammates on that convocation, nothing for a user outside the team.
3. Open a session with a player token for a *different* team. Query `convocation_responders` for a convocation not on their team. Assert empty result.
4. Open a session with a `section-manager` (or `authorized-officer`) token. Create a convocation within their scope. Immediately read it back via `convocations_select_team_scoped`. Assert non-empty — this is the regression test for PO-MD-05, and it must fail against the pre-fix policy to prove it's testing the real thing.
5. Do **not** write a test that asserts a UI component hides a field. A passing render test here would prove nothing about the actual gap (this is the direct lesson from the original AC-MD-08 failure).

## 6. Acceptance for this pass

- `convocation_responders` view created, `security_invoker` confirmed, returns booleans only.
- `get_convocation_responder_names` function created, `SECURITY DEFINER`, returns only `id`/`display_name`, scoped via `convocation_responders`.
- `convocations_select_team_scoped` widened to match `convocations_insert_create`'s scoping for `section-manager` and `authorized-officer`, using the same scoping predicate (not re-derived).
- `domain/repositories/convocation-responders-repository.ts` created (interface only in domain; implementation in `data/`).
- `data/repositories/ConvocationRespondersRepositoryImpl.ts` and its mapper created.
- The five integration tests in section 5 written and passing against the corrected policies (test 4 confirmed to fail against the pre-fix policy before the fix is applied, then re-run passing after).
- AC-MD-08 re-evaluated against the actual API response, not the render, and now passes.
- No RBAC matrix changes. No resolution of `convocation-domain-correction.md` §6.1 — restated as OPEN with the same trigger condition described in section 3 above.
- No `presentation/` work in this pass — the player match-detail screen wiring (consuming `ConvocationRespondersRepository` via a use case + ViewModel) is a follow-up, not included here unless explicitly requested next.