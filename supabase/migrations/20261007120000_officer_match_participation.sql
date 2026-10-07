-- Dirigeant habilité (authorized-officer) takes part in a match day like a
-- player WITHOUT being convoked: reads the match detail, registers on a
-- mission and votes for the man of the match. Club-wide, no team scope.
--
-- Mirrors rbac-matrix.ts:
--   'vote:cast'           -> ['player', 'authorized-officer']
--   'mission:self-assign' -> ['player', 'authorized-officer']
-- Reading (match/meeting details, roster for the ballot, vote tally) stays
-- RLS-only, no matrix entry.

-- 1. Read the match / meeting details (convocations and missions are already
--    readable by the officer).
drop policy match_details_select_team_scoped on public.match_details;
create policy match_details_select_team_scoped on public.match_details
  for select to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = match_details.convocation_id
        and (private.is_team_member(c.team_id) or private.has_role('authorized-officer') or private.is_admin())
    )
  );

drop policy meeting_details_select_team_scoped on public.meeting_details;
create policy meeting_details_select_team_scoped on public.meeting_details
  for select to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = meeting_details.convocation_id
        and (private.is_team_member(c.team_id) or private.has_role('authorized-officer') or private.is_admin())
    )
  );

-- 2. Roster of the convocation: the ballot's candidate list.
create or replace function public.get_convocation_responders(p_convocation_id uuid)
returns table (user_id uuid, display_name text, has_responded boolean, "position" text)
language sql
security definer
set search_path = ''
as $$
  select
    cr.user_id,
    u.full_name as display_name,
    cr.has_responded,
    u."position"
  from public.convocation_responders cr
  left join public.users u on u.id = cr.user_id
  where cr.convocation_id = p_convocation_id
    and exists (
      select 1 from public.convocations c
      where c.id = p_convocation_id
        and (private.is_team_member(c.team_id) or private.has_role('authorized-officer') or private.is_admin())
    );
$$;

-- 3. Votes: cast/change (same kickoff window as before) and read the tally.
drop policy votes_insert_cast on public.votes;
create policy votes_insert_cast on public.votes
  for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = votes.convocation_id
        and c.date < now()
        and (private.is_player_of_team(c.team_id) or private.has_role('authorized-officer'))
    )
  );

drop policy votes_update_cast on public.votes;
create policy votes_update_cast on public.votes
  for update to authenticated
  using (voter_id = (select auth.uid()))
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = votes.convocation_id
        and c.date < now()
        and (private.is_player_of_team(c.team_id) or private.has_role('authorized-officer'))
    )
  );

create or replace function public.get_vote_tally(p_convocation_id uuid, p_category_id text)
returns table (candidate_id uuid, candidate_display_name text, vote_count integer, total_eligible_voters integer)
language sql
security definer
set search_path = ''
as $$
  select
    v.candidate_id,
    u.full_name as candidate_display_name,
    count(*)::integer as vote_count,
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
    and (private.is_team_member(c.team_id) or private.has_role('authorized-officer') or private.is_admin())
  group by v.candidate_id, u.full_name, c.team_id;
$$;

-- 4. Missions: an officer registers THEMSELVES without being a player of the
--    team (they already hold manage rights, so no status/deadline gate).
--    Only change vs. 20261002171438: the eligibility check.
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
    if not v_is_manager and not (private.is_player_of_team(v_team_id) and v_status = 'open') then
      raise exception 'mission_self_assign_refused' using errcode = '42501';
    end if;
  elsif not v_is_manager then
    raise exception 'mission_manage_refused' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.user_roles
    where user_id = p_user_id and team_id = v_team_id and role = 'player'
  ) and not (p_user_id = v_caller and private.has_role('authorized-officer')) then
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
