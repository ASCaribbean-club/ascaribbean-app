-- specs asc-legacy (docs/specs/asc-legacy.md) PO-LG-03 / PO-LG-04 / PO-LG-23 /
-- PO-LG-26 — convocation closure change, award reconciliation, backfill and
-- season-end bonus job.
--
-- Manual mirror (CLAUDE.md §7, never generated) of the spec §4 domain policies,
-- each function names its counterpart (domain/policies/ files are written in
-- the next pass; SQL is authoritative in production, the TypeScript functions
-- exist so the rule is readable and testable):
--   actionForConvocation (§4.1)         private.legacy_action_for_convocation
--   resolveRule (§4.2)                  private.legacy_resolve_convocation_rule
--   expectedConvocationAwards (§4.3)    private.reconcile_convocation_awards (CTE `expected`)
--   reconcileConvocationAwards (§4.4)   private.reconcile_convocation_awards (CTE `deltas`)
--   PO-LG-16 "fully configured"         private.legacy_season_is_configured
--   attendance write rule (PO-LG-23)    attendance_records_*_validate / _validate_admin
--   convocation-closure.ts              private.close_convocation_if_complete /
--                                       private.close_elapsed_convocations
--

-- =========================================================================
-- 1. Closure rule change (PO-LG-23 / ex-OPEN-LG-07)
-- =========================================================================
-- A convocation closes ONLY when all attendance is recorded AND 3 days have
-- passed since its date (assumed: counted from convocations.date, to confirm;
-- a convocation with incomplete attendance stays open). Replaces the 6 h rule
-- of 20261003165056_delay_convocation_closure.sql in BOTH paths (trigger on
-- attendance writes, and the pg_cron sweep) so they stay consistent. Awards
-- are then computed once, at closure, and a closed convocation can no longer
-- be edited (section 2), so a later edit cannot bypass them.

create or replace function private.close_convocation_if_complete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date timestamptz;
  required_count int;
  recorded_count int;
begin
  select date into v_date
  from public.convocations
  where id = new.convocation_id;

  -- Too early: private.close_elapsed_convocations closes it once 3 days have passed.
  if now() < v_date + interval '3 days' then
    return new;
  end if;

  select count(*) into required_count
  from public.convocation_attendees
  where convocation_id = new.convocation_id;

  select count(*) into recorded_count
  from public.attendance_records ar
  where ar.convocation_id = new.convocation_id
    and exists (
      select 1 from public.convocation_attendees ca
      where ca.convocation_id = ar.convocation_id and ca.user_id = ar.user_id
    );

  if required_count > 0 and recorded_count >= required_count then
    update public.convocations
    set status = 'closed', closed_at = now(), closed_by = new.validated_by
    where id = new.convocation_id and status = 'open';
  end if;

  return new;
end;
$$;

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
    and c.date + interval '3 days' <= now()
    and (select count(*) from public.convocation_attendees ca where ca.convocation_id = c.id) > 0
    and (
      select count(*)
      from public.attendance_records ar
      where ar.convocation_id = c.id
        and exists (
          select 1 from public.convocation_attendees ca
          where ca.convocation_id = ar.convocation_id and ca.user_id = ar.user_id
        )
    ) >= (select count(*) from public.convocation_attendees ca where ca.convocation_id = c.id)
    and exists (select 1 from public.attendance_records ar where ar.convocation_id = c.id);
$$;
-- The existing cron job 'close-elapsed-convocations' (every 15 min) keeps
-- calling private.close_elapsed_convocations(); no reschedule needed.

-- =========================================================================
-- 2. Closed convocation attendance is not editable (PO-LG-23)
-- =========================================================================
-- Coach policies (attendance:validate): add `status <> 'closed'`. Admin
-- policies: the explicit "correction after closure is allowed" of
-- 20261001120000_web_create_convocation.sql is REMOVED; still past and never
-- cancelled. Read policy attendance_records_select_coach_admin is unchanged.

drop policy attendance_records_insert_validate on public.attendance_records;
drop policy attendance_records_update_validate on public.attendance_records;
drop policy attendance_records_insert_validate_admin on public.attendance_records;
drop policy attendance_records_update_validate_admin on public.attendance_records;

-- 'attendance:validate' (coach)
create policy attendance_records_insert_validate on public.attendance_records
  for insert to authenticated
  with check (
    validated_by = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and c.status <> 'closed'
        and private.is_coach_of_team(c.team_id)
    )
  );

create policy attendance_records_update_validate on public.attendance_records
  for update to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and c.status <> 'closed'
        and private.is_coach_of_team(c.team_id)
    )
  )
  with check (
    validated_by = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and c.status <> 'closed'
        and private.is_coach_of_team(c.team_id)
    )
  );

-- 'attendance:validate' (admin) — past convocation, neither cancelled nor closed.
create policy attendance_records_insert_validate_admin on public.attendance_records
  for insert to authenticated
  with check (
    validated_by = (select auth.uid())
    and private.is_admin()
    and exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and c.date <= now()
        and c.status not in ('cancelled', 'closed')
    )
  );

create policy attendance_records_update_validate_admin on public.attendance_records
  for update to authenticated
  using (
    private.is_admin()
    and exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and c.date <= now()
        and c.status not in ('cancelled', 'closed')
    )
  )
  with check (
    validated_by = (select auth.uid())
    and private.is_admin()
    and exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and c.date <= now()
        and c.status not in ('cancelled', 'closed')
    )
  );

-- =========================================================================
-- 3. Reference rules — mirrors of §4.1 / §4.2 and PO-LG-16
-- =========================================================================

-- actionForConvocation (§4.1): training -> training_attendance; match +
-- official -> match_attendance_official; match + friendly ->
-- match_attendance_friendly; meeting -> event_participation. A match whose
-- type is null or unknown yields NO action: it is never read as official.
create or replace function private.legacy_action_for_convocation(
  p_convocation_type text, p_match_type text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_convocation_type
    when 'training' then 'training_attendance'
    when 'meeting' then 'event_participation'
    when 'match' then case p_match_type
      when 'official' then 'match_attendance_official'
      when 'friendly' then 'match_attendance_friendly'
      else null
    end
    else null
  end;
$$;

-- PO-LG-16: a season must be fully configured (points mode AND tiers) for
-- points to count on facts dated in it. "Tiers" read as at least one tier row
-- for the season (the spec does not say more). A date in no season: not
-- configured.
create or replace function private.legacy_season_is_configured(p_on date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.seasons s
    join public.legacy_season_settings st on st.season_id = s.id
    where s.season_range @> p_on
      and exists (select 1 from public.legacy_tiers t where t.season_id = s.id)
  );
$$;

-- resolveRule (§4.2) applied to a convocation: key = convocation type + match
-- type + team type (convocation -> team -> section -> sections.type, PO-LG-11)
-- + date of the fact. The rule is the one valid AT earned_on (inclusive
-- boundaries), never the latest. earned_on = club-local date (Europe/Paris) of
-- the convocation, which also covers retroactive convocations (PO-LG-04).
-- o_outcome: 'ok' | 'not_found' | 'no_action' | 'season_not_configured' | 'no_rule'
-- (the last three let the Administrateur see why nothing was awarded, AC-LG-12).
create or replace function private.legacy_resolve_convocation_rule(
  p_convocation_id uuid,
  out o_outcome text,
  out o_rule_id uuid,
  out o_points integer,
  out o_earned_on date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_conv public.convocations;
  v_team_type text;
  v_match_type text;
  v_action text;
begin
  select * into v_conv from public.convocations where id = p_convocation_id;
  if not found then
    o_outcome := 'not_found';
    return;
  end if;

  o_earned_on := (v_conv.date at time zone 'Europe/Paris')::date;

  select s.type into v_team_type
  from public.teams t
  join public.sections s on s.id = t.section_id
  where t.id = v_conv.team_id;

  if v_conv.type = 'match' then
    select md.competition_type into v_match_type
    from public.match_details md where md.convocation_id = p_convocation_id;
  end if;

  v_action := private.legacy_action_for_convocation(v_conv.type, v_match_type);
  if v_action is null then
    o_outcome := 'no_action';
    return;
  end if;

  if not private.legacy_season_is_configured(o_earned_on) then
    o_outcome := 'season_not_configured';
    return;
  end if;

  select r.id, r.points into o_rule_id, o_points
  from public.legacy_rules r
  where r.action = v_action
    and r.channel = 'automatic'
    and r.team_type is not distinct from v_team_type
    and r.valid_from <= o_earned_on
    and (r.valid_to is null or o_earned_on <= r.valid_to);

  if o_rule_id is null then
    o_outcome := 'no_rule';
    return;
  end if;

  o_outcome := 'ok';
end;
$$;

-- =========================================================================
-- 4. Reconciliation by difference (PO-LG-03) — idempotent, retroactive
-- =========================================================================
-- expectedConvocationAwards (§4.3): only actual_status = 'present' of the
-- coach-confirmed attendance_records counts; convocation_responses is never
-- read (AC-LG-13). reconcileConvocationAwards (§4.4): delta = expected -
-- already awarded BY THIS CONVOCATION (source 'convocation' entries only, so a
-- manual correction is never counted nor undone, AC-LG-15); only non-zero
-- deltas are inserted (AC-LG-04). The original entries are never touched; a
-- change present -> absent writes one compensating negative entry (AC-LG-05).
-- Returns the number of entries inserted. Convocation not closed, or no
-- applicable rule: 0 (no entry written, AC-LG-12).
create or replace function private.reconcile_convocation_awards(p_convocation_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_res record;
  v_inserted integer;
begin
  -- Serialise concurrent runs on the same convocation (closure trigger vs backfill).
  perform pg_advisory_xact_lock(hashtextextended(p_convocation_id::text, 0));

  select status into v_status from public.convocations where id = p_convocation_id;
  if v_status is distinct from 'closed' then
    return 0;
  end if;

  select * into v_res from private.legacy_resolve_convocation_rule(p_convocation_id);
  if v_res.o_outcome is distinct from 'ok' then
    return 0;
  end if;

  with expected as (
    select ar.user_id, v_res.o_points as points
    from public.attendance_records ar
    where ar.convocation_id = p_convocation_id
      and ar.actual_status = 'present'
  ),
  awarded as (
    select e.user_id, sum(e.points)::integer as points
    from public.legacy_points_entries e
    where e.convocation_id = p_convocation_id
      and e.source = 'convocation'
    group by e.user_id
  ),
  deltas as (
    select coalesce(x.user_id, a.user_id) as user_id,
           coalesce(x.points, 0) - coalesce(a.points, 0) as delta
    from expected x
    full join awarded a on a.user_id = x.user_id
  )
  insert into public.legacy_points_entries
    (user_id, points, rule_id, source, convocation_id, earned_on)
  select d.user_id, d.delta, v_res.o_rule_id, 'convocation', p_convocation_id, v_res.o_earned_on
  from deltas d
  where d.delta <> 0;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- Hook on the transition to 'closed', whichever path closes it (attendance
-- trigger, 15-min sweep, or any other update). A failure must never block a
-- coach saving attendance: it is reported as a warning and the idempotent
-- backfill below catches the convocation up later.
create or replace function private.legacy_on_convocation_closed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform private.reconcile_convocation_awards(new.id);
  exception when others then
    raise warning 'legacy reconciliation failed for convocation %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

create trigger convocations_legacy_reconcile_on_close
  after update of status on public.convocations
  for each row
  when (old.status is distinct from 'closed' and new.status = 'closed')
  execute function private.legacy_on_convocation_closed();

-- One-time go-live backfill (PO-LG-04): the SAME reconciliation over every
-- already-closed convocation, no special code path for the past. Idempotent:
-- the second run inserts nothing (AC-LG-14). Optional season filter, so it
-- can also catch up a season configured later (PO-LG-16, to confirm with the
-- developer: NOT run automatically on configuration). NOT run by this
-- migration: no season is fully configured yet (the points mode is not seeded).
create or replace function private.legacy_backfill_closed_convocations(p_season_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv uuid;
  v_total integer := 0;
begin
  for v_conv in
    select c.id
    from public.convocations c
    where c.status = 'closed'
      and (
        p_season_id is null
        or exists (
          select 1 from public.seasons s
          where s.id = p_season_id
            and s.season_range @> (c.date at time zone 'Europe/Paris')::date
        )
      )
    order by c.date
  loop
    v_total := v_total + private.reconcile_convocation_awards(v_conv);
  end loop;
  return v_total;
end;
$$;

-- Administrateur entry point for the backfill ('legacy:manage_tiers' scope:
-- season configuration; no new RBAC action).
create or replace function public.run_legacy_backfill(p_season_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'not authorized to run the legacy backfill';
  end if;
  return private.legacy_backfill_closed_convocations(p_season_id);
end;
$$;

-- PO-LG-02 / AC-LG-12 — the Administrateur can see closed convocations with at
-- least one present player that awarded nothing, with the reason
-- ('no_action' = match without type, 'season_not_configured', 'no_rule').
create or replace function public.get_legacy_unawarded_convocations()
returns table (convocation_id uuid, convocation_date timestamptz, team_id uuid, reason text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'not authorized to read unawarded convocations';
  end if;

  return query
  select c.id, c.date, c.team_id, res.o_outcome
  from public.convocations c
  cross join lateral private.legacy_resolve_convocation_rule(c.id) res
  where c.status = 'closed'
    and res.o_outcome <> 'ok'
    and exists (
      select 1 from public.attendance_records ar
      where ar.convocation_id = c.id and ar.actual_status = 'present'
    )
  order by c.date desc;
end;
$$;

-- =========================================================================
-- 5. Season-end bonus (PO-LG-26) — scheduled job
-- =========================================================================
-- +50 per player with an `active`, non-archived membership in the season, once
-- per user and season (unique index legacy_points_entries_season_end_key makes
-- it idempotent), earned_on = the season's end date, no team type. Needs a
-- season_end_bonus rule valid at that date (no rule, no bonus) and a fully
-- configured season (PO-LG-16). "Player" = holds the `player` role (any
-- team). Runs daily and only processes seasons already over (end_date before
-- the club-local today), so a season ended while the job was down is caught up.
create or replace function private.award_legacy_season_end_bonus(p_today date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, (now() at time zone 'Europe/Paris')::date);
  v_inserted integer;
begin
  insert into public.legacy_points_entries
    (user_id, points, rule_id, source, season_id, earned_on)
  select m.user_id, r.points, r.id, 'season_end', s.id, s.end_date
  from public.seasons s
  join public.legacy_season_settings st on st.season_id = s.id
  join public.legacy_rules r
    on r.action = 'season_end_bonus'
   and r.channel = 'automatic'
   and r.team_type is null
   and r.valid_from <= s.end_date
   and (r.valid_to is null or s.end_date <= r.valid_to)
  join (
    select distinct mm.user_id, mm.season_id
    from public.memberships mm
    where mm.status = 'active' and mm.archived_at is null
  ) m on m.season_id = s.id
  where s.end_date < v_today
    and exists (select 1 from public.legacy_tiers t where t.season_id = s.id)
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = m.user_id and ur.role = 'player'
    )
  on conflict (user_id, season_id) where source = 'season_end' do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create extension if not exists pg_cron;
select cron.schedule('legacy-season-end-bonus', '0 3 * * *', 'select private.award_legacy_season_end_bonus()');

-- Internal functions: not callable by clients (the admin wrappers above are).
revoke all on function private.legacy_action_for_convocation(text, text) from public;
revoke all on function private.legacy_season_is_configured(date) from public;
revoke all on function private.legacy_resolve_convocation_rule(uuid) from public;
revoke all on function private.reconcile_convocation_awards(uuid) from public;
revoke all on function private.legacy_on_convocation_closed() from public;
revoke all on function private.legacy_backfill_closed_convocations(uuid) from public;
revoke all on function private.award_legacy_season_end_bonus(date) from public;
revoke all on function public.run_legacy_backfill(uuid) from public;
revoke all on function public.get_legacy_unawarded_convocations() from public;
grant execute on function public.run_legacy_backfill(uuid) to authenticated;
grant execute on function public.get_legacy_unawarded_convocations() to authenticated;
