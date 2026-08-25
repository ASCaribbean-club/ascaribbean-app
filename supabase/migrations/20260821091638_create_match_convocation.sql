-- create_match_convocation() — atomic write for a 'match' convocation: the
-- convocations row and its match_details satellite in one transaction, so a
-- failed satellite insert (e.g. invalid opponent_id) rolls back the parent
-- row too (a PL/pgSQL function body is one implicit transaction). Not
-- SECURITY DEFINER: runs as the calling user, so convocations_insert_create
-- and match_details_insert_create RLS still apply inside the function body —
-- do not add SECURITY DEFINER without a separate, explicit decision.
create or replace function create_match_convocation(
  p_team_id uuid,
  p_created_by uuid,
  p_date timestamptz,
  p_location text,
  p_opponent_id uuid,
  p_is_home boolean,
  p_meeting_point_time timestamptz,
  p_meeting_point_location text
) returns convocations
language plpgsql
as $$
declare
  v_convocation convocations;
begin
  insert into convocations (team_id, created_by, type, date, location)
  values (p_team_id, p_created_by, 'match', p_date, p_location)
  returning * into v_convocation;

  insert into match_details (convocation_id, opponent_id, is_home, meeting_point_time, meeting_point_location)
  values (v_convocation.id, p_opponent_id, p_is_home, p_meeting_point_time, p_meeting_point_location);

  return v_convocation;
end;
$$;

revoke all on function create_match_convocation(uuid, uuid, timestamptz, text, uuid, boolean, timestamptz, text) from public;
grant execute on function create_match_convocation(uuid, uuid, timestamptz, text, uuid, boolean, timestamptz, text) to authenticated;