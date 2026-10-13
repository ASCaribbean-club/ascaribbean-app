-- Convocation attendees — part 3/3: the three create_*_convocation functions
-- now receive the list of convoked players and write it in the same
-- transaction as the convocation (AC-CPS-03). specs/convocation-player-selection.md §2.
-- create_match_convocation also receives the competition type (AC-CPS-05).
--
-- All three stay `security invoker` (specs/create-convocation.md §2): the
-- policies of convocations, the satellites, convocation_missions and
-- convocation_attendees (convocation_attendees_insert_create, 'convocation:create')
-- apply to every statement. The player-of-team rule and the 14-cap on official
-- matches are held by the triggers of 20261012181248 — a forged call cannot
-- bypass them. Order inside a match: convocation -> match_details (the cap
-- trigger reads competition_type) -> attendees -> missions.
--
-- The signatures change (extra parameters): the previous overloads are dropped,
-- otherwise PostgREST would keep two candidates for the same RPC name.
-- p_attendee_ids must hold at least one id (PO-CPS-10 hypothesis, also checked
-- by CreateConvocationUseCase); duplicates are collapsed.

drop function public.create_training_convocation(uuid, uuid, timestamptz, uuid);
drop function public.create_match_convocation(uuid, uuid, timestamptz, text, uuid, boolean, timestamptz, text);
drop function public.create_meeting_convocation(uuid, uuid, timestamptz, text, text, jsonb);

create function public.create_training_convocation(
  p_team_id uuid,
  p_created_by uuid,
  p_date timestamptz,
  p_training_location_id uuid,
  p_attendee_ids uuid[]
) returns public.convocations
language plpgsql
set search_path = ''
as $$
declare
  v_convocation public.convocations;
begin
  if coalesce(array_length(p_attendee_ids, 1), 0) = 0 then
    raise exception 'convocation_attendees_required' using errcode = '23514';
  end if;

  insert into public.convocations (team_id, created_by, type, date, training_location_id)
  values (p_team_id, p_created_by, 'training', p_date, p_training_location_id)
  returning * into v_convocation;

  insert into public.convocation_attendees (convocation_id, user_id)
  select distinct v_convocation.id, a.user_id
  from unnest(p_attendee_ids) as a(user_id);

  insert into public.convocation_missions (convocation_id, template_id, label, capacity)
  select v_convocation.id, t.id, t.label, t.default_capacity
  from private.active_mission_templates('training') t;

  return v_convocation;
end;
$$;

create function public.create_match_convocation(
  p_team_id uuid,
  p_created_by uuid,
  p_date timestamptz,
  p_location text,
  p_opponent_id uuid,
  p_is_home boolean,
  p_meeting_point_time timestamptz,
  p_meeting_point_location text,
  p_competition_type text,
  p_attendee_ids uuid[]
) returns public.convocations
language plpgsql
set search_path = ''
as $$
declare
  v_convocation public.convocations;
begin
  if coalesce(array_length(p_attendee_ids, 1), 0) = 0 then
    raise exception 'convocation_attendees_required' using errcode = '23514';
  end if;

  insert into public.convocations (team_id, created_by, type, date, location)
  values (p_team_id, p_created_by, 'match', p_date, p_location)
  returning * into v_convocation;

  -- competition_type is not null, no default, check ('official', 'friendly'):
  -- a missing or unknown value is refused here (AC-CPS-05).
  insert into public.match_details (convocation_id, opponent_id, is_home, meeting_point_time, meeting_point_location, competition_type)
  values (v_convocation.id, p_opponent_id, p_is_home, p_meeting_point_time, p_meeting_point_location, p_competition_type);

  insert into public.convocation_attendees (convocation_id, user_id)
  select distinct v_convocation.id, a.user_id
  from unnest(p_attendee_ids) as a(user_id);

  insert into public.convocation_missions (convocation_id, template_id, label, capacity)
  select v_convocation.id, t.id, t.label, t.default_capacity
  from private.active_mission_templates('match') t;

  return v_convocation;
end;
$$;

create function public.create_meeting_convocation(
  p_team_id uuid,
  p_created_by uuid,
  p_date timestamptz,
  p_location text,
  p_title text,
  p_agenda jsonb,
  p_attendee_ids uuid[]
) returns public.convocations
language plpgsql
set search_path = ''
as $$
declare
  v_convocation public.convocations;
begin
  if coalesce(array_length(p_attendee_ids, 1), 0) = 0 then
    raise exception 'convocation_attendees_required' using errcode = '23514';
  end if;

  insert into public.convocations (team_id, created_by, type, date, location)
  values (p_team_id, p_created_by, 'meeting', p_date, p_location)
  returning * into v_convocation;

  insert into public.meeting_details (convocation_id, title, agenda)
  values (v_convocation.id, p_title, p_agenda);

  insert into public.convocation_attendees (convocation_id, user_id)
  select distinct v_convocation.id, a.user_id
  from unnest(p_attendee_ids) as a(user_id);

  insert into public.convocation_missions (convocation_id, template_id, label, capacity)
  select v_convocation.id, t.id, t.label, t.default_capacity
  from private.active_mission_templates('meeting') t;

  return v_convocation;
end;
$$;

revoke all on function public.create_training_convocation(uuid, uuid, timestamptz, uuid, uuid[]) from public;
grant execute on function public.create_training_convocation(uuid, uuid, timestamptz, uuid, uuid[]) to authenticated;
revoke all on function public.create_match_convocation(uuid, uuid, timestamptz, text, uuid, boolean, timestamptz, text, text, uuid[]) from public;
grant execute on function public.create_match_convocation(uuid, uuid, timestamptz, text, uuid, boolean, timestamptz, text, text, uuid[]) to authenticated;
revoke all on function public.create_meeting_convocation(uuid, uuid, timestamptz, text, text, jsonb, uuid[]) from public;
grant execute on function public.create_meeting_convocation(uuid, uuid, timestamptz, text, text, jsonb, uuid[]) to authenticated;
