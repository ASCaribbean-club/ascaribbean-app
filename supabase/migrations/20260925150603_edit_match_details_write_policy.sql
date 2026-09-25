-- Coach edits a match's logistics (lieu domicile/extérieur, heure et lieu de
-- RDV) before kickoff — specs/edit-match-details.md §2/§5/§6. Mirrors
-- domain/policies/rbac-matrix.ts's 'match_details:update': ['coach'], scoped
-- to the coach of the convocation's OWN team (can.ts's 'coach' branch,
-- `requiresTeamScope`) — CLAUDE.md §7: manual mirror, never generated either
-- direction.
--
-- Starting point (§6): public.match_details carries exactly two policies as
-- of 20260821091519_convocation_creation_schema.sql
-- (match_details_select_team_scoped, match_details_insert_create) — NO
-- UPDATE policy exists. Without this migration every modification, INCLUDING
-- MatchDetailsRepositoryImpl.upsert's own ON CONFLICT DO UPDATE path, is
-- refused by Postgres today. This migration does not touch
-- match_details_insert_create — an INSERT policy does not govern an UPDATE,
-- widening it would only add confusion (§6).
--
-- Deliberately NOT built here (§8, mentor-agent note — "Ne pas implémenter
-- dans cette passe"): updated_by/updated_at on match_details (PO-EM-02,
-- undecided), section-manager/authorized-officer/admin granted in
-- rbac-matrix.ts (PO-EM-01, undecided — see that entry's own can.ts
-- pre-wiring, inert until the matrix entry widens), a fix to
-- private.is_coach_of_team's own missing season filter (§6, "écart hérité,
-- signalé et non résolu ici" — reproduced as-is, same known gap already
-- carried by convocations_insert_create).
--
-- UPDATE ON PUBLIC.CONVOCATIONS — developer decision (2026-09-25), added in
-- the SAME migration file after the section above shipped: the coach may
-- now also correct a MATCH convocation's own `date` (kickoff) and
-- `location` (venue), not just MatchDetails' logistics, before kickoff.
-- This WIDENS the original spec's explicit exclusion ("Il n'existe aucune
-- politique RLS UPDATE sur public.convocations et cette passe n'en crée
-- pas" — specs/edit-match-details.md §1) — a deliberate, later change, not
-- an oversight in that original text. UpdateConvocationUseCase itself stays
-- unbuilt/reserved (this write goes through UpdateMatchDetailsUseCase,
-- domain/usecases/convocation/UpdateMatchDetailsUseCase.ts, extended to
-- also call ConvocationRepository.updateArrangements) — only THIS narrow
-- date/location path opens, not a general convocation-editing capability.

-- =========================================================================
-- Column-level restriction FIRST (§6, same order/precedent as
-- 20260918122440_web_users_write_policies.sql's `grant update (full_name)`
-- and 20260918134942_web_users_role_edit_remove_write_policies.sql's
-- `grant update (team_id, section_id)`): public.match_details already
-- received an unrestricted UPDATE grant to `authenticated` from Supabase's
-- own default privileges when the table was created
-- (20260821091519_convocation_creation_schema.sql never listed it in an
-- explicit `grant`, same as every table created after the initial schema) —
-- that blanket grant is why upsert's ON CONFLICT path was only ever stopped
-- by the ABSENCE of a matching RLS policy, not by any column restriction.
-- Revoking first, then re-granting only the 3 writable columns, is what
-- makes opponent_id (and any future goals_for/goals_against, match-stats —
-- §1 "Note de fusion") STRUCTURALLY unwritable through this table, even to a
-- forged request bearing a valid coach session (AC-EM-02) — a restriction no
-- RLS policy alone can express (rbac-matrix.ts's own comment on
-- 'role:assign-coach' says so explicitly).
-- =========================================================================

revoke update on public.match_details from authenticated;
grant update (is_home, meeting_point_time, meeting_point_location) on public.match_details to authenticated;

-- =========================================================================
-- match_details_update_arrangements — mirrors 'match_details:update' (§2).
-- Who: the coach of the PARENT convocation's team, via
-- private.is_coach_of_team(c.team_id) (existing helper, reused — no second
-- one created), joined back through match_details.convocation_id exactly
-- like match_details_select_team_scoped already does (this table carries no
-- team_id of its own).
-- When: the parent convocation's kickoff hasn't passed AND its status is
-- still 'open' — evaluated with `now()`, server-side (§3's "la seule vraie
-- barrière"/§6's "l'horloge du serveur"). Unlike the "date passée interdite"
-- rule on convocation CREATION (specs/create-convocation.md §5), which had
-- to go through a TRIGGER because a CHECK constraint requires an IMMUTABLE
-- expression and forbids now() — that constraint does NOT apply to RLS
-- policies, so the temporal guard lives directly in this policy's predicate,
-- no trigger involved (§6/§10, "ne pas recopier le patron du trigger par
-- analogie").
-- `using` AND `with check`, both carrying the SAME predicate: `using` gates
-- which existing row may be touched at all, `with check` gates the row
-- image AFTER the write — without the second, nothing would stop the write
-- from producing a result outside this same scope (§6).
-- =========================================================================

create policy match_details_update_arrangements on public.match_details
  for update to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = match_details.convocation_id
        and private.is_coach_of_team(c.team_id)
        and c.date > now()
        and c.status = 'open'
    )
  )
  with check (
    exists (
      select 1 from public.convocations c
      where c.id = match_details.convocation_id
        and private.is_coach_of_team(c.team_id)
        and c.date > now()
        and c.status = 'open'
    )
  );

-- =========================================================================
-- Column-level restriction FIRST (same order/precedent as match_details
-- above): public.convocations already carries an UNRESTRICTED UPDATE grant
-- to `authenticated` from the initial schema's own blanket grant
-- (`grant select, insert, update, delete on ... public.convocations ... to
-- authenticated;`, 20260811171754_initial_schema.sql) — unlike
-- match_details, this one predates this feature entirely. Revoking first,
-- then re-granting only `date`/`location`, is what makes every OTHER column
-- (`status`, `type`, `team_id`, `closed_at`/`closed_by`,
-- `cancelled_at`/`cancelled_by`/`cancellation_reason`, `created_by`)
-- STRUCTURALLY unwritable through this path, even to a forged request
-- bearing a valid coach session — no RLS policy alone can express that
-- (rbac-matrix.ts's own comment on 'role:assign-coach' says so explicitly).
-- =========================================================================

revoke update on public.convocations from authenticated;
grant update (date, location) on public.convocations to authenticated;

-- =========================================================================
-- convocations_update_arrangements — mirrors 'convocation:update' (developer
-- decision, 2026-09-25). Who/when: the SAME predicate as
-- match_details_update_arrangements above, applied directly (this table
-- carries its own team_id, no join needed) — the coach of the convocation's
-- own team, kickoff not yet passed, status still 'open', evaluated
-- server-side via now() (no trigger — same reasoning as above, RLS
-- policies aren't bound by the IMMUTABLE-expression restriction a CHECK
-- constraint would need). `using`/`with check` carry the same predicate,
-- same "gates the starting row / gates the resulting row" split as above.
-- =========================================================================

create policy convocations_update_arrangements on public.convocations
  for update to authenticated
  using (
    private.is_coach_of_team(team_id)
    and date > now()
    and status = 'open'
  )
  with check (
    private.is_coach_of_team(team_id)
    and date > now()
    and status = 'open'
  );

-- =========================================================================
-- Merge fix with match-stats (feature/match-stats, merged into develop
-- 2026-09-25, AFTER this file was originally written but BEFORE it was ever
-- applied) — specs/edit-match-details.md §7 "Note de fusion avec
-- match-stats" anticipated point (a) as "goals_for/goals_against must not
-- appear in match_details_update_arrangements's grant". That phrasing
-- assumes a policy can carry its own column grant; it can't — `grant
-- update (...)` is scoped to (table, role), shared by EVERY UPDATE policy
-- on that table, never to one policy alone. This section is what point (a)
-- actually requires once that's accounted for:
--
-- 1. Column grant. 20260924100000_match_statistics_schema.sql added
--    goals_for/goals_against and match_details_update_record_score, but
--    never granted those two columns explicitly — RecordMatchScoreUseCase
--    has only ever worked because of the ORIGINAL unrestricted blanket
--    grant this file's own `revoke update on public.match_details from
--    authenticated` (above) removes. Left alone, applying this migration
--    would silently break match-stats' score recording (permission denied
--    on goals_for/goals_against) the moment it runs. Granting them here
--    — additively, GRANT never revokes — is match-stats' own column
--    restriction, done on its behalf since its migration never did it: the
--    end state is the same explicit, minimal, table-wide grant list either
--    file arriving second would have had to produce.
--
-- 2. Timing condition on match_details_update_record_score.
--    specs/match-stats.md MS-12/AC-MS-13 requires score recording only
--    AFTER kickoff — but that migration's own comment calls this a
--    deliberate "accepted risk", left OUT of RLS, reasoning that a
--    database-side check is impossible because a CHECK constraint requires
--    an IMMUTABLE expression and forbids now(). That reasoning conflates a
--    CHECK constraint with an RLS policy: `using`/`with check` are NOT
--    bound by the IMMUTABLE restriction — match_details_update_arrangements
--    and convocations_update_arrangements above both call now() directly.
--    So the "accepted risk" was avoidable, not fundamental — fixed here.
--
--    This is not optional once (1) grants goals_for/goals_against: Postgres
--    composes multiple PERMISSIVE UPDATE policies on the same table by OR
--    (using) and OR (with check) — a row/column combination is written if
--    ANY policy's predicate passes. With match_details_update_record_score
--    carrying no timing condition at all, granting is_home/
--    meeting_point_time/meeting_point_location for match_details_update_
--    arrangements's "before kickoff" window would ALSO make those columns
--    writable through the untimed score policy at ANY time — a coach could
--    edit match logistics after kickoff simply by going through the
--    record-score RLS path instead, silently defeating this entire
--    feature's own restriction (§2/§3, "la seule vraie barrière"). Adding
--    `c.date < now()` here makes the two windows mutually exclusive with
--    match_details_update_arrangements's `c.date > now()` — the same
--    instant can satisfy at most one of the two policies, closing the
--    bypass structurally rather than by convention.
--
--    DROP + CREATE, not a second migration touching a file that's already
--    applied to the remote project: this file (20260924120000) had not
--    been applied anywhere when this section was added, so amending it
--    in place carries no drift risk (see feedback_migration_timestamp_sync
--    in the developer's own workflow notes) — the fix ships as part of the
--    same migration that introduces the conflict, not as a follow-up patch
--    trailing behind a known-broken intermediate state.
-- =========================================================================

grant update (goals_for, goals_against) on public.match_details to authenticated;

drop policy match_details_update_record_score on public.match_details;

create policy match_details_update_record_score on public.match_details
  for update to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = match_details.convocation_id
        and private.is_coach_of_team(c.team_id)
        and c.date < now()
    )
  )
  with check (
    exists (
      select 1 from public.convocations c
      where c.id = match_details.convocation_id
        and private.is_coach_of_team(c.team_id)
        and c.date < now()
    )
  );
