-- team_roster_headcount — number of players rostered on a team ("N membres"
-- in the coach dashboard header), independent of membership status. Sibling of
-- team_active_headcount (20260818145523), which only counts players whose
-- membership is active and unexpired ("N licenciés"). A player with a
-- 'pending' membership is rostered but not yet counted there.
--
-- Same access model as team_active_headcount: aggregate, non-nominative integer,
-- gated by the "authenticated" grant only. security_invoker = false because
-- user_roles' own RLS would otherwise collapse the count to the caller's rows.
-- No zero-fill: a team with no player role has no row (callers default to 0).

create view public.team_roster_headcount
with (security_invoker = false)
as
select
  ur.team_id,
  count(distinct ur.user_id)::integer as headcount
from public.user_roles ur
where ur.role = 'player'
  and ur.team_id is not null
group by ur.team_id;

revoke all on public.team_roster_headcount from public;
grant select on public.team_roster_headcount to authenticated;
