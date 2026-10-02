-- Missions of a convocation — specs/match-details-missions.md §0.2/§2/§5.
-- Tables convocation_missions + mission_assignments, their RLS, the claim_mission
-- and get_convocation_missions RPCs, and the copy of active mission templates
-- into the three create_*_convocation functions. No existing migration is
-- modified: the three functions are recreated with `create or replace`.
--
-- Mirrors domain/policies/rbac-matrix.ts (CLAUDE.md §7 — manual mirror, never
-- generated either direction):
--   'mission:self-assign': ['player']  (own row only, team-scoped)
--   'mission:manage':      ['coach', 'section-manager', 'authorized-officer', 'admin']
--                          = same scope as 'convocation:create'
--
-- Developer decisions (authoritative):
--   PO-MM-01 — the three create_* functions STAY `security invoker`; they read
--     the active templates through ONE small security definer helper
--     (private.active_mission_templates). mission_templates stays admin-only.
--   PO-MM-02 — NO direct insert policy on mission_assignments. Every
--     registration goes through claim_mission (count + insert in one
--     transaction, row-locked), so capacity (AC-MM-05) holds on EVERY path.
--
-- ⚠️ ACCEPTED RISK — the 30-minute self-service deadline (R3) is NOT enforced
-- here: use cases only (domain/policies/mission-deadline.ts). Not an oversight.
-- Open questions deliberately not resolved here: PO-MM-03 (manager on a
-- closed/cancelled convocation: allowed), PO-MM-06 (eligible = players of the
-- team), PO-MM-09 (no label check), PO-MM-12 (a duplicate registration raises
-- the primary key violation), PO-MM-13 (no `on delete` on user references),
-- PO-MM-16 (no created_at column, no stored order).

-- =========================================================================
-- 1. Tables
-- =========================================================================

create table public.convocation_missions (
  id uuid primary key default gen_random_uuid(),
  convocation_id uuid not null references public.convocations (id) on delete cascade,
  -- null = ad hoc mission. A template is never deleted today; set null keeps
  -- the mission if it ever is (AC-MM-04).
  template_id uuid references public.mission_templates (id) on delete set null,
  -- Copied from the template, never read back from it (snapshot, §2.1).
  label text not null,
  -- Mirrors isValidMissionCapacity / MIN_MISSION_CAPACITY / MAX_MISSION_CAPACITY
  -- (domain/policies/mission-rules.ts).
  capacity integer not null check (capacity between 1 and 3)
);

create index convocation_missions_convocation_id_idx on public.convocation_missions (convocation_id);

create table public.mission_assignments (
  mission_id uuid not null references public.convocation_missions (id) on delete cascade,
  user_id uuid not null references public.users (id),
  -- = user_id for a self-registration.
  assigned_by uuid not null references public.users (id),
  assigned_at timestamptz not null default now(),
  -- "Current state" table (CLAUDE.md §6): no duplicate, a withdrawal is a delete.
  primary key (mission_id, user_id)
);

alter table public.convocation_missions enable row level security;
alter table public.mission_assignments enable row level security;

-- No client write other than the policies below: no update on either table
-- (a mission is never edited, an assignment is never rewritten) and no insert
-- on mission_assignments (claim_mission only, PO-MM-02).
revoke update on public.convocation_missions from authenticated;
revoke insert, update on public.mission_assignments from authenticated;

-- =========================================================================
-- 2. Scope helpers (same predicates as the convocation policies they mirror)
-- =========================================================================

-- Read scope = convocations_select_team_scoped.
create or replace function private.can_read_convocation_missions(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_team_member(p_team_id)
    or private.is_section_manager_of_team(p_team_id)
    or private.has_role('authorized-officer')
    or private.is_admin();
$$;

-- 'mission:manage' scope = convocations_insert_create.
create or replace function private.can_manage_convocation_missions(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_coach_of_team(p_team_id)
    or private.is_section_manager_of_team(p_team_id)
    or private.has_role('authorized-officer')
    or private.is_admin();
$$;

revoke all on function private.can_read_convocation_missions(uuid) from public;
grant execute on function private.can_read_convocation_missions(uuid) to authenticated;
revoke all on function private.can_manage_convocation_missions(uuid) from public;
grant execute on function private.can_manage_convocation_missions(uuid) to authenticated;

-- =========================================================================
-- 3. RLS
-- =========================================================================

-- Read — same predicate as convocations_select_team_scoped, via the parent
-- convocation (AC-MM-08: treasurer / medical referent / volunteer read nothing).
create policy convocation_missions_select_scoped on public.convocation_missions
  for select to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = convocation_missions.convocation_id
        and private.can_read_convocation_missions(c.team_id)
    )
  );

-- 'mission:manage' (insert: ad hoc mission). The creation-time copy runs
-- through the create_*_convocation functions (invoker), under this policy too.
create policy convocation_missions_insert_manage on public.convocation_missions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.convocations c
      where c.id = convocation_missions.convocation_id
        and private.can_manage_convocation_missions(c.team_id)
    )
  );

-- 'mission:manage' (delete a mission; assignments cascade, AC-MM-09).
create policy convocation_missions_delete_manage on public.convocation_missions
  for delete to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = convocation_missions.convocation_id
        and private.can_manage_convocation_missions(c.team_id)
    )
  );

create policy mission_assignments_select_scoped on public.mission_assignments
  for select to authenticated
  using (
    exists (
      select 1
      from public.convocation_missions m
      join public.convocations c on c.id = m.convocation_id
      where m.id = mission_assignments.mission_id
        and private.can_read_convocation_missions(c.team_id)
    )
  );

-- 'mission:self-assign' (delete own row): own row only, player of the team,
-- convocation 'open' (R5b — hypothesis, PO-MM-03). No time guard (accepted
-- risk, see header). NO insert policy — see claim_mission.
create policy mission_assignments_delete_self on public.mission_assignments
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.convocation_missions m
      join public.convocations c on c.id = m.convocation_id
      where m.id = mission_assignments.mission_id
        and c.status = 'open'
        and private.is_player_of_team(c.team_id)
    )
  );

-- 'mission:manage' (delete someone else's — or any — assignment).
create policy mission_assignments_delete_manage on public.mission_assignments
  for delete to authenticated
  using (
    exists (
      select 1
      from public.convocation_missions m
      join public.convocations c on c.id = m.convocation_id
      where m.id = mission_assignments.mission_id
        and private.can_manage_convocation_missions(c.team_id)
    )
  );

-- =========================================================================
-- 4. claim_mission — the ONLY insert path of mission_assignments (PO-MM-02)
-- =========================================================================

-- Security definer: there is no insert policy to rely on, so the function
-- re-checks authorization itself, mirroring can():
--   - target = caller        -> 'mission:self-assign': player of the team and
--                               convocation 'open' (R5b); a holder of
--                               'mission:manage' is not restricted to 'open'.
--   - target <> caller       -> 'mission:manage' required.
--   - in both cases the target must be eligible: a player of the team
--     (isEligibleMissionAssignee, PO-MM-06 assumption).
-- Then, in ONE transaction: lock the mission row, count, refuse beyond
-- capacity with the 'mission_full' token (-> MissionFullError, R2), insert.
create or replace function public.claim_mission(p_mission_id uuid, p_user_id uuid)
returns public.mission_assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_capacity integer;
  v_team_id uuid;
  v_status text;
  v_is_manager boolean;
  v_count integer;
  v_row public.mission_assignments;
begin
  if v_caller is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Row lock on the mission: two concurrent claims on the last slot serialize
  -- here, the second one sees the first one's row (AC-MM-05).
  select m.capacity, c.team_id, c.status
    into v_capacity, v_team_id, v_status
  from public.convocation_missions m
  join public.convocations c on c.id = m.convocation_id
  where m.id = p_mission_id
  for update of m;

  if not found then
    raise exception 'mission_not_found' using errcode = 'P0002';
  end if;

  v_is_manager := private.can_manage_convocation_missions(v_team_id);

  if p_user_id = v_caller then
    -- 'mission:self-assign'
    if not v_is_manager and not (private.is_player_of_team(v_team_id) and v_status = 'open') then
      raise exception 'mission_self_assign_refused' using errcode = '42501';
    end if;
  elsif not v_is_manager then
    -- 'mission:manage'
    raise exception 'mission_manage_refused' using errcode = '42501';
  end if;

  -- Eligibility of the target (isEligibleMissionAssignee): player of the team.
  if not exists (
    select 1 from public.user_roles
    where user_id = p_user_id and team_id = v_team_id and role = 'player'
  ) then
    raise exception 'mission_target_not_eligible' using errcode = '42501';
  end if;

  select count(*) into v_count from public.mission_assignments where mission_id = p_mission_id;
  if v_count >= v_capacity then
    raise exception 'mission_full: mission % holds % of % places', p_mission_id, v_count, v_capacity
      using errcode = '42501';
  end if;

  insert into public.mission_assignments (mission_id, user_id, assigned_by)
  values (p_mission_id, p_user_id, v_caller)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.claim_mission(uuid, uuid) from public;
grant execute on function public.claim_mission(uuid, uuid) to authenticated;

-- =========================================================================
-- 5. get_convocation_missions — missions + assignees with names, one call
-- =========================================================================

-- Security definer so a player can read teammates' names without widening
-- users_select_own (same reasoning as get_match_lineup /
-- get_convocation_responders). The explicit scope check below is the
-- authorization boundary (same predicate as the select policies). Order: label
-- then id, assignment order within a mission (PO-MM-16 not decided).
create or replace function public.get_convocation_missions(p_convocation_id uuid)
returns table (
  mission_id uuid,
  convocation_id uuid,
  template_id uuid,
  label text,
  capacity integer,
  user_id uuid,
  display_name text,
  assigned_by uuid,
  assigned_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    m.convocation_id,
    m.template_id,
    m.label,
    m.capacity,
    a.user_id,
    u.full_name,
    a.assigned_by,
    a.assigned_at
  from public.convocation_missions m
  join public.convocations c on c.id = m.convocation_id
  left join public.mission_assignments a on a.mission_id = m.id
  left join public.users u on u.id = a.user_id
  where m.convocation_id = p_convocation_id
    and private.can_read_convocation_missions(c.team_id)
  order by m.label, m.id, a.assigned_at;
$$;

revoke all on function public.get_convocation_missions(uuid) from public;
grant execute on function public.get_convocation_missions(uuid) to authenticated;

-- =========================================================================
-- 6. Active templates helper + the three create_* functions (PO-MM-01)
-- =========================================================================

-- The ONLY thing that reads mission_templates on behalf of a non-admin, and
-- it only returns the active templates of one type (AC-MM-10: a coach still
-- has no select on mission_templates, AC-MT-04 unchanged). Not exposed by
-- PostgREST (private schema).
create or replace function private.active_mission_templates(p_type text)
returns table (id uuid, label text, default_capacity integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.label, t.default_capacity
  from public.mission_templates t
  where t.is_active and t.convocation_type = p_type;
$$;

revoke all on function private.active_mission_templates(text) from public;
grant execute on function private.active_mission_templates(text) to authenticated;

-- The three functions below stay `security invoker` (create-convocation.md §2:
-- convocations_insert_create and the satellites' policies still apply). They
-- now also copy the active templates of their type into convocation_missions
-- (R1: snapshot of label + capacity, no assignment), in the same body, hence
-- the same transaction: all or nothing (AC-MM-03). The copy runs under
-- convocation_missions_insert_manage, satisfied by whoever may create the
-- convocation.

create or replace function public.create_training_convocation(
  p_team_id uuid,
  p_created_by uuid,
  p_date timestamptz,
  p_training_location_id uuid
) returns public.convocations
language plpgsql
set search_path = ''
as $$
declare
  v_convocation public.convocations;
begin
  insert into public.convocations (team_id, created_by, type, date, training_location_id)
  values (p_team_id, p_created_by, 'training', p_date, p_training_location_id)
  returning * into v_convocation;

  insert into public.convocation_missions (convocation_id, template_id, label, capacity)
  select v_convocation.id, t.id, t.label, t.default_capacity
  from private.active_mission_templates('training') t;

  return v_convocation;
end;
$$;

create or replace function public.create_match_convocation(
  p_team_id uuid,
  p_created_by uuid,
  p_date timestamptz,
  p_location text,
  p_opponent_id uuid,
  p_is_home boolean,
  p_meeting_point_time timestamptz,
  p_meeting_point_location text
) returns public.convocations
language plpgsql
set search_path = ''
as $$
declare
  v_convocation public.convocations;
begin
  insert into public.convocations (team_id, created_by, type, date, location)
  values (p_team_id, p_created_by, 'match', p_date, p_location)
  returning * into v_convocation;

  insert into public.match_details (convocation_id, opponent_id, is_home, meeting_point_time, meeting_point_location)
  values (v_convocation.id, p_opponent_id, p_is_home, p_meeting_point_time, p_meeting_point_location);

  insert into public.convocation_missions (convocation_id, template_id, label, capacity)
  select v_convocation.id, t.id, t.label, t.default_capacity
  from private.active_mission_templates('match') t;

  return v_convocation;
end;
$$;

create or replace function public.create_meeting_convocation(
  p_team_id uuid,
  p_created_by uuid,
  p_date timestamptz,
  p_location text,
  p_title text,
  p_agenda jsonb
) returns public.convocations
language plpgsql
set search_path = ''
as $$
declare
  v_convocation public.convocations;
begin
  insert into public.convocations (team_id, created_by, type, date, location)
  values (p_team_id, p_created_by, 'meeting', p_date, p_location)
  returning * into v_convocation;

  insert into public.meeting_details (convocation_id, title, agenda)
  values (v_convocation.id, p_title, p_agenda);

  insert into public.convocation_missions (convocation_id, template_id, label, capacity)
  select v_convocation.id, t.id, t.label, t.default_capacity
  from private.active_mission_templates('meeting') t;

  return v_convocation;
end;
$$;

-- Grants unchanged by `create or replace`, restated for readability.
revoke all on function public.create_training_convocation(uuid, uuid, timestamptz, uuid) from public;
grant execute on function public.create_training_convocation(uuid, uuid, timestamptz, uuid) to authenticated;
revoke all on function public.create_match_convocation(uuid, uuid, timestamptz, text, uuid, boolean, timestamptz, text) from public;
grant execute on function public.create_match_convocation(uuid, uuid, timestamptz, text, uuid, boolean, timestamptz, text) to authenticated;
revoke all on function public.create_meeting_convocation(uuid, uuid, timestamptz, text, text, jsonb) from public;
grant execute on function public.create_meeting_convocation(uuid, uuid, timestamptz, text, text, jsonb) to authenticated;
