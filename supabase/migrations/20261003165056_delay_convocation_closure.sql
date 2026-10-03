-- A convocation no longer closes as soon as every attendance record is set:
-- it closes 6h after its start. Mirrors CONVOCATION_CLOSURE_DELAY_MS in
-- src/domain/rules/convocation-rules.ts.

create or replace function private.close_convocation_if_complete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
  v_date timestamptz;
  required_count int;
  recorded_count int;
begin
  select team_id, date into v_team_id, v_date
  from public.convocations
  where id = new.convocation_id;

  -- Too early: private.close_elapsed_convocations closes it once 6h have passed.
  if now() < v_date + interval '6 hours' then
    return new;
  end if;

  select count(*) into required_count
  from public.user_roles
  where team_id = v_team_id and role = 'player';

  select count(*) into recorded_count
  from public.attendance_records
  where convocation_id = new.convocation_id;

  if recorded_count >= required_count then
    update public.convocations
    set status = 'closed', closed_at = now(), closed_by = new.validated_by
    where id = new.convocation_id and status = 'open';
  end if;

  return new;
end;
$$;

-- Sweep for fully-recorded convocations whose 6h delay has elapsed.
-- closed_by comes from the last validation of the record set.
create or replace function private.close_elapsed_convocations()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.convocations c
  set status = 'closed', closed_at = now(),
      closed_by = (
        select ar.validated_by from public.attendance_records ar
        where ar.convocation_id = c.id
        order by ar.validated_at desc limit 1
      )
  where c.status = 'open'
    and c.date + interval '6 hours' <= now()
    and (select count(*) from public.attendance_records ar where ar.convocation_id = c.id)
        >= (select count(*) from public.user_roles ur where ur.team_id = c.team_id and ur.role = 'player')
    and exists (select 1 from public.attendance_records ar where ar.convocation_id = c.id);
$$;

create extension if not exists pg_cron;
select cron.schedule('close-elapsed-convocations', '*/15 * * * *', 'select private.close_elapsed_convocations()');
