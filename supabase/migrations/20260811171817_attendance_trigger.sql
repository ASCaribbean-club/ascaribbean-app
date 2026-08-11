-- Auto-closure of a convocation once every required player has an
-- attendance_records row. This is the SQL side of
-- src/domain/policies/convocation-closure.ts's isConvocationComplete —
-- that file explicitly says the trigger here is authoritative in
-- production (fires on every write path, including direct SQL edits) and
-- must be kept in sync manually with the TypeScript rule.

create or replace function private.close_convocation_if_complete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
  required_count int;
  recorded_count int;
begin
  select team_id into v_team_id
  from public.convocations
  where id = new.convocation_id;

  -- required players = isConvocationComplete's requiredUserIds: every
  -- player on the convocation's team, per user_roles.
  select count(*) into required_count
  from public.user_roles
  where team_id = v_team_id and role = 'player';

  select count(*) into recorded_count
  from public.attendance_records
  where convocation_id = new.convocation_id;

  if recorded_count >= required_count then
    -- closed_by = "userId of the coach whose validation completed the
    -- record set" (domain/entities/convocation.ts Convocation.closedBy).
    update public.convocations
    set status = 'closed', closed_at = now(), closed_by = new.validated_by
    where id = new.convocation_id and status = 'open';
  end if;

  return new;
end;
$$;

create trigger attendance_records_close_convocation
  after insert or update on public.attendance_records
  for each row
  execute function private.close_convocation_if_complete();
