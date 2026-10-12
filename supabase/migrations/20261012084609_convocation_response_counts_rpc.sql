-- get_convocation_response_counts — present / absent / pending headcounts per
-- convocation, readable by every team member (player included), never WHO.
-- Mirrors domain: summarizeRosterStatuses (domain/rules/convocation-rules.ts)
-- — a convoked player with no convocation_responses row counts as pending.
--
-- SECURITY DEFINER because convocation_responses_select_own_or_coach
-- (20260903205143) restricts row reads to the player's own row or the team's
-- coach; only the aggregate crosses that boundary here, same reasoning as
-- get_convocation_responders (20260901120018). The is_team_member/is_admin
-- predicate below is the actual authorization boundary (the function owner
-- is exempt from RLS), so an out-of-scope convocation id is silently absent
-- from the result — no existence leak.

create or replace function public.get_convocation_response_counts(p_convocation_ids uuid[])
returns table (convocation_id uuid, present_count integer, absent_count integer, pending_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id as convocation_id,
    (count(*) filter (where cr.status = 'present'))::integer as present_count,
    (count(*) filter (where cr.status = 'absent'))::integer as absent_count,
    (count(*) filter (where cr.status is null or cr.status not in ('present', 'absent')))::integer as pending_count
  from public.convocations c
  join public.user_roles ur on ur.team_id = c.team_id and ur.role = 'player'
  left join public.convocation_responses cr
    on cr.convocation_id = c.id and cr.user_id = ur.user_id
  where c.id = any(p_convocation_ids)
    and (private.is_team_member(c.team_id) or private.is_admin())
  group by c.id;
$$;

revoke all on function public.get_convocation_response_counts(uuid[]) from public;
grant execute on function public.get_convocation_response_counts(uuid[]) to authenticated;
