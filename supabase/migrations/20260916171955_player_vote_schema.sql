-- Player vote — specs/player-vote.md §7 ("Ordre de dépendance": actions.ts
-- + rbac-matrix.ts + can.ts's player branch, done in TypeScript already →
-- this migration → domain/ → data/ → use cases → presentation/).
--
-- PO-PV-01 (rattachement ASC Legacy) and PO-PV-02 (catégorie négative
-- rejetée) are both tranchés — see spec §5. Only the POSITIVE category is
-- ever written or read; category_id stays a plain `text` column (no
-- `vote_categories` table) because PO-PV-03 leaves even the positive
-- category's own id/label open, and building a table for exactly one row
-- would anticipate a barème structure §1 explicitly forbids getting ahead
-- of (AC-PV-15).
--
-- Still explicitly OPEN, not resolved by this migration (spec §5):
--   - PO-PV-06 (voting window) — no closure enforcement here. A vote can be
--     cast at any time; AC-PV-12 is not testable until a rule exists.
--   - PO-PV-10a (candidate set) — see get_vote_tally()'s own comment below
--     for the conservative choice made (team roster), and why.
--   - PO-PV-10b (self-voting) — neither permitted nor refused by any
--     constraint here; candidate_id = voter_id is a valid row.
--   - PO-PV-09/PO-PV-12 (lauréate figée, modération) — not built.

-- =========================================================================
-- 1. votes — write-side, "current state" table (CLAUDE.md §6,
-- upsert-on-conflict, not insert-and-grow). Mirrors attendance_records'
-- shape: unique per (convocation, catégorie, votante) — AC-PV-04.
-- =========================================================================

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  convocation_id uuid not null references public.convocations (id) on delete cascade,
  category_id text not null,
  voter_id uuid not null references public.users (id) on delete cascade,
  candidate_id uuid not null references public.users (id) on delete cascade,
  voted_at timestamptz not null default now(),
  unique (convocation_id, category_id, voter_id)
);

alter table public.votes enable row level security;

-- votes: read = own row only (AC-PV-06 — the votante's identity is imposed
-- by the base, never a third party's). Nobody, coach included, reads
-- another voter's row directly — the aggregate below (get_vote_tally) is
-- the ONLY path anyone else's tab consumes (AC-PV-10).
create policy votes_select_own on public.votes
  for select to authenticated
  using (voter_id = (select auth.uid()));

-- votes: mirrors rbac-matrix.ts 'vote:cast' -> ['player'], scoped to the
-- voter's own team (can.ts's 'player' branch, requiresTeamScope). Split
-- into INSERT + UPDATE for the same upsert-on-conflict reason as
-- convocation_responses_insert_respond / _update_respond, which this
-- copies the shape of verbatim. AC-PV-01 — a coach token (not a player of
-- this team) never satisfies is_player_of_team, so it's refused here
-- regardless of whether they also coach this same team.
create policy votes_insert_cast on public.votes
  for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = votes.convocation_id
        and private.is_player_of_team(c.team_id)
    )
  );

create policy votes_update_cast on public.votes
  for update to authenticated
  using (voter_id = (select auth.uid()))
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = votes.convocation_id
        and private.is_player_of_team(c.team_id)
    )
  );

-- No delete policy — same convention as convocation_responses/
-- attendance_records (no revocation/withdrawal use case exists).

-- =========================================================================
-- 2. get_vote_tally — SECURITY DEFINER, single round trip. AC-PV-10's
-- structural guarantee: the return shape has no voter-identity column for
-- ANY caller, coach included — same lesson as get_convocation_responders
-- (docs/convocation_visibility_rls_correction.md §2.1). This function must
-- never be reshaped to add one.
-- =========================================================================

create or replace function public.get_vote_tally(p_convocation_id uuid, p_category_id text)
returns table (candidate_id uuid, candidate_display_name text, vote_count integer, total_eligible_voters integer)
language sql
security definer
-- set search_path = '' (not `= public`), same established convention as
-- every other SECURITY DEFINER function in this project (see
-- 20260821092153_convocation_rpc_search_path_fix.sql).
set search_path = ''
as $$
  select
    v.candidate_id,
    u.full_name as candidate_display_name,
    count(*)::integer as vote_count,
    -- PO-PV-10a, conservative choice: the denominator is the team's current
    -- player roster (public.user_roles, role = 'player'), NOT the convoked
    -- roster or présences constatées — both of those need a source of
    -- truth that doesn't exist yet (PO-6b of specs/coach-dashboard.md is
    -- itself open), and specs/player-vote.md §5 explicitly forbids
    -- building a `convocation_attendees` table to answer this. The team
    -- roster is the only candidate set already available without a new
    -- table, and it's the same join `convocation_responders` already uses
    -- for "who's on this team" — reversible the day PO-PV-10a is decided
    -- differently, not a structural commitment.
    (
      select count(*)::integer
      from public.user_roles ur
      where ur.team_id = c.team_id and ur.role = 'player'
    ) as total_eligible_voters
  from public.convocations c
  join public.votes v
    on v.convocation_id = c.id and v.category_id = p_category_id
  join public.users u on u.id = v.candidate_id
  where c.id = p_convocation_id
    -- Explicit team-scoping check, not redundant with votes' own RLS: this
    -- function runs SECURITY DEFINER, so the table owner's privileges
    -- apply for its duration and votes_select_own (voter_id = auth.uid())
    -- would otherwise let this aggregate leak every voter's row to the
    -- function owner regardless of caller — same reasoning as
    -- get_convocation_responders' own EXISTS predicate.
    and (private.is_team_member(c.team_id) or private.is_admin())
  group by v.candidate_id, u.full_name, c.team_id;
$$;

-- AC-PV-13 — a category with zero votes returns zero rows (the join above
-- simply has nothing to group), never a row per roster candidate at 0.
-- VoteTallyRepositoryImpl/toVoteTally map that empty result to
-- VoteTally.candidates = [] — see those files for how that flows into the
-- "état vide explicite" the tab renders instead of a zero-filled ranking.

revoke all on function public.get_vote_tally(uuid, text) from public;
grant execute on function public.get_vote_tally(uuid, text) to authenticated;
