-- create_meeting_convocation() — atomic write for a 'meeting' convocation:
-- the convocations row and its meeting_details satellite (title + agenda) in
-- one transaction. Not SECURITY DEFINER: runs as the calling user, so
-- convocations_insert_create and meeting_details_insert_create RLS still
-- apply inside the function body.
create or replace function create_meeting_convocation(
  p_team_id uuid,
  p_created_by uuid,
  p_date timestamptz,
  p_location text,
  p_title text,
  p_agenda jsonb
) returns convocations
language plpgsql
as $$
declare
  v_convocation convocations;
begin
  insert into convocations (team_id, created_by, type, date, location)
  values (p_team_id, p_created_by, 'meeting', p_date, p_location)
  returning * into v_convocation;

  insert into meeting_details (convocation_id, title, agenda)
  values (v_convocation.id, p_title, p_agenda);

  return v_convocation;
end;
$$;

revoke all on function create_meeting_convocation(uuid, uuid, timestamptz, text, text, jsonb) from public;
grant execute on function create_meeting_convocation(uuid, uuid, timestamptz, text, text, jsonb) to authenticated;