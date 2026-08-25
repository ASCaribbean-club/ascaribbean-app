-- create_training_convocation() — atomic write for a 'training' convocation.
-- Training has no satellite table yet (training_details reserved, not built,
-- see domain/entities/ neighbourhood) — this function only inserts the
-- convocations row. Not SECURITY DEFINER: runs as the calling user, so
-- convocations_insert_create RLS still applies inside the function body
-- (a PL/pgSQL function body executes in a single implicit transaction —
-- nothing to roll back here since there's only one insert, but this mirrors
-- create_match_convocation/create_meeting_convocation for a consistent
-- per-type creation surface on ConvocationRepository).
create or replace function create_training_convocation(
  p_team_id uuid,
  p_created_by uuid,
  p_date timestamptz,
  p_location text
) returns convocations
language plpgsql
as $$
declare
  v_convocation convocations;
begin
  insert into convocations (team_id, created_by, type, date, location)
  values (p_team_id, p_created_by, 'training', p_date, p_location)
  returning * into v_convocation;

  return v_convocation;
end;
$$;

revoke all on function create_training_convocation(uuid, uuid, timestamptz, text) from public;
grant execute on function create_training_convocation(uuid, uuid, timestamptz, text) to authenticated;