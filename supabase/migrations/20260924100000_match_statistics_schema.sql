-- specs/match-stats.md — score, individual match events (goals/cards), and
-- the RLS that governs them (MS-01..MS-17). Two pieces described in the
-- spec's "Forme technique attendue" are DELIBERATELY NOT in this migration
-- — see the STOP block right below, before anything else.
--
-- =========================================================================
-- STOP — competition_type is NOT added in this migration (PO-MS blocker,
-- not resolved here, not guessed at)
-- =========================================================================
-- specs/match-stats.md §6 point 2 / MS-06 / AC-MS-06 require
-- `match_details.competition_type` to be `not null`, WITH NO DEFAULT — "a
-- match created without a competition type is refused, never silently
-- ranked as league by default". That is impossible to add to a non-empty
-- table without a backfill decision, and the spec is explicit: "if rows
-- exist: stop and ask, never guess a backfill value" (a friendly match
-- silently defaulted to 'league' would corrupt team_match_record and
-- team_scorer_ranking exactly the way AC-MS-07 exists to prevent).
--
-- Checked against the actual remote project (REST count, 2026-09-24):
-- `match_details` already carries **7 rows**. This is a genuine stop, not a
-- guess — competition_type is NOT added by this migration.
--
-- Cascading consequence, also NOT built here: `team_match_record` and
-- `team_scorer_ranking` (MS-07/AC-MS-07/AC-MS-19) both need to whitelist
-- `competition_type = 'league'` — they cannot be written correctly without
-- that column, so they are left out of this migration entirely rather than
-- built without the filter the spec requires. Follow-up migration once the
-- backfill value for these 7 existing rows is decided by the developer.
--
-- Everything else below (goals_for/goals_against, match_events and its RLS,
-- the match_details UPDATE policy) has NO dependency on competition_type
-- and is built in full.

-- =========================================================================
-- 1. match_details.goals_for / goals_against — MS-01/AC-MS-01
-- Primary fact, never derived from match_events. Nullable (a match not yet
-- played, or one of the 7 existing rows, simply has no score recorded yet —
-- AC-MS-07's "match sans score" state), but never one without the other.
-- =========================================================================

alter table public.match_details
  add column goals_for smallint,
  add column goals_against smallint;

alter table public.match_details
  add constraint match_details_goals_both_or_none_check
  check (
    (goals_for is null and goals_against is null)
    or (goals_for is not null and goals_against is not null)
  );

alter table public.match_details
  add constraint match_details_goals_non_negative_check
  check (
    (goals_for is null or goals_for >= 0)
    and (goals_against is null or goals_against >= 0)
  );

-- match_details: UPDATE policy — MS-10/AC-MS-11 (`match_result:record`).
-- Confirmed absent before this migration (specs/match-stats.md §6 point 3);
-- reuses private.is_coach_of_team(), the same team-scoped predicate every
-- other match_details/convocations policy already uses — not rederived.
create policy match_details_update_record_score on public.match_details
  for update to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = match_details.convocation_id
        and private.is_coach_of_team(c.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.convocations c
      where c.id = match_details.convocation_id
        and private.is_coach_of_team(c.team_id)
    )
  );

-- =========================================================================
-- 2. match_events — MS-03/MS-04, one row per individual event
-- FK to match_details(convocation_id), NOT convocations(id) — AC-MS-18,
-- deliberate: makes it structurally impossible to attach an event to a
-- training/meeting convocation, which has no match_details row at all.
-- =========================================================================

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  convocation_id uuid not null references public.match_details (convocation_id) on delete cascade,
  user_id uuid not null references public.users (id), -- the scorer/carded player
  event_type text not null check (event_type in ('goal', 'penalty_missed', 'yellow_card', 'red_card')),
  -- MS-16 — a converted penalty is ONE 'goal' event with is_penalty = true,
  -- never a second row. Only meaningful on a goal (AC-MS-16); named so its
  -- violation is recognizable in map-supabase-error.ts.
  is_penalty boolean not null default false,
  -- Minute is not modeled per the spec's own §7 correction proposal
  -- (specs/match-stats.md, "Minute de but... proposition par défaut :
  -- omettre la minute" — UI-MS-D stays open, but the spec's own default
  -- reading is to omit it, and no column is listed under "Forme technique
  -- attendue" §6 either). Left out entirely rather than added speculatively.
  created_by uuid not null references public.users (id), -- the coach/staff who recorded it
  created_at timestamptz not null default now()
);

alter table public.match_events
  add constraint match_events_penalty_requires_goal_check
  check (is_penalty = false or event_type = 'goal');

create index match_events_convocation_id_idx on public.match_events (convocation_id);
create index match_events_user_id_event_type_idx on public.match_events (user_id, event_type);

alter table public.match_events enable row level security;

-- match_events SELECT — MS-09/AC-MS-09/AC-MS-10 (`match_goals:view` +
-- `match_staff_events:view`). Written as a WHITELIST on 'goal' for the
-- team-member branch, not a blacklist on the staff-only types: a 5th event
-- type added later to the check constraint above is staff-only by
-- construction, with NO change needed here (AC-MS-10). private.is_team_member
-- already covers both 'player' and 'coach' roles, so the first branch alone
-- gives every teammate (including the coach) visibility of 'goal' rows;
-- the second branch is what additionally gives the coach/staff every OTHER
-- event type.
create policy match_events_select_scoped on public.match_events
  for select to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = match_events.convocation_id
        and (
          (match_events.event_type = 'goal' and private.is_team_member(c.team_id))
          or private.is_coach_of_team(c.team_id)
        )
    )
  );

-- match_events INSERT — MS-10/AC-MS-11 (`match_result:record`). `with check
-- (created_by = auth.uid())` per the spec's own "Forme technique attendue"
-- — the recording coach/staff member, never a third party's id.
create policy match_events_insert_record on public.match_events
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = match_events.convocation_id
        and private.is_coach_of_team(c.team_id)
    )
  );

-- match_events DELETE — MS-11/AC-MS-12 (`match_result:record`). No UPDATE
-- policy at all, anywhere in this migration — an event is deleted then
-- recreated, never modified (MS-11); a client UPDATE attempt is refused by
-- Postgres for lack of any permissive policy.
create policy match_events_delete_record on public.match_events
  for delete to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = match_events.convocation_id
        and private.is_coach_of_team(c.team_id)
    )
  );
