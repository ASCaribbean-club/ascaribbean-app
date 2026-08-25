-- Fix: create_training_convocation / create_match_convocation /
-- create_meeting_convocation were created without `set search_path = ''`,
-- unlike every other function in this project (private.has_role,
-- private.is_admin, private.is_section_manager_of_team,
-- public.current_season) — flagged by the Supabase security linter
-- (function_search_path_mutable) right after creation. Re-created here with
-- a pinned empty search_path and public.-qualified table/type references, so
-- an unqualified name in the function body can't be hijacked by a
-- session-local search_path.

create or replace function create_training_convocation(
  p_team_id uuid,
  p_created_by uuid,
  p_date timestamptz,
  p_location text
) returns public.convocations
language plpgsql
set search_path = ''
as $$
declare
  v_convocation public.convocations;
begin
  insert into public.convocations (team_id, created_by, type, date, location)
  values (p_team_id, p_created_by, 'training', p_date, p_location)
  returning * into v_convocation;

  return v_convocation;
end;
$$;

create or replace function create_match_convocation(
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

  return v_convocation;
end;
$$;

create or replace function create_meeting_convocation(
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

  return v_convocation;
end;
$$;
