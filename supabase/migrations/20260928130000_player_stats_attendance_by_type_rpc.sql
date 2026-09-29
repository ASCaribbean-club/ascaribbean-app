-- specs/player-stats.md addendum "troisième passage" (2026-09-28) —
-- PO-PS-12 partially resolved: the attendance rate gains a breakdown by
-- convocation type (training/match/meeting) for v1. The response rate is
-- explicitly NOT ventilated in this same pass, per that addendum — do not
-- extend get_my_response_summary() by inference.
--
-- get_my_attendance_summary_by_type() mirrors rbac-matrix.ts action
-- attendance:read-own-summary -> ['player'] — the SAME action as
-- get_my_attendance_summary() (20260928120000_player_stats_summary_rpcs.sql),
-- a second read shape over the same boundary, not a new right. Same
-- SECURITY DEFINER / auth.uid()-internal-filter reasoning as that function:
-- attendance_records' RLS stays closed to players (PO-PS-02), no new SELECT
-- policy here either.
--
-- One row per convocation type the player has AT LEAST ONE validated
-- attendance_records row for this season (`group by c.type`) — never a
-- 0/0 row for a type with none, same "no data" omission as the global
-- aggregate (AC-PS-17, applied row by row per AC-PS-26/27).

create or replace function public.get_my_attendance_summary_by_type()
returns table (convocation_type text, validated_count integer, present_count integer)
language sql
security definer
set search_path = ''
as $$
  select
    c.type as convocation_type,
    count(*)::integer as validated_count,
    count(*) filter (where ar.actual_status = 'present')::integer as present_count
  from public.attendance_records ar
  join public.convocations c on c.id = ar.convocation_id
  join public.teams t on t.id = c.team_id
  where ar.user_id = (select auth.uid())
    and t.season_id = (select id from public.current_season())
  group by c.type;
$$;

comment on function public.get_my_attendance_summary_by_type() is
  'Mirrors rbac-matrix.ts action attendance:read-own-summary -> [player] '
  '(same action as get_my_attendance_summary(), a second read shape over '
  'the same boundary, not a new right). Person-scoped via auth.uid() '
  'internally, never a parameter. specs/player-stats.md addendum '
  '"troisième passage", AC-PS-26/27.';

revoke all on function public.get_my_attendance_summary_by_type() from public, anon;
grant execute on function public.get_my_attendance_summary_by_type() to authenticated;
