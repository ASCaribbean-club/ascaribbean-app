-- get_team_mvp — the current "joueur du match" of a team: the most voted
-- candidate(s) of the team's latest match whose vote is CLOSED and received at
-- least one vote. A player keeps the star until the vote of a later match
-- closes (tie: every tied candidate). Mirrors, MANUALLY, the vote deadline of
-- domain/policies/player-vote-rules.ts getVotingDeadline / isVotingClosed
-- (kickoff + 1 hour + 3 days, same as 20261012090240_votes_closing_window.sql).
--
-- Aggregate only: candidate ids, never a voter identity (AC-PV-10). Same
-- boundary as get_vote_tally: team member, authorized officer or admin; an
-- out-of-scope team yields no rows (no existence leak).

create or replace function public.get_team_mvp(p_team_id uuid, p_category_id text)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with last_closed as (
    select c.id
    from public.convocations c
    where c.team_id = p_team_id
      and c.type = 'match'
      and c.status <> 'cancelled'
      and now() >= c.date + interval '1 hour' + interval '3 days'
      and exists (
        select 1 from public.votes v
        where v.convocation_id = c.id and v.category_id = p_category_id
      )
    order by c.date desc
    limit 1
  ),
  tally as (
    select v.candidate_id, count(*) as vote_count
    from public.votes v
    join last_closed lc on lc.id = v.convocation_id
    where v.category_id = p_category_id
    group by v.candidate_id
  )
  select t.candidate_id as user_id
  from tally t
  where t.vote_count = (select max(vote_count) from tally)
    and (private.is_team_member(p_team_id) or private.has_role('authorized-officer') or private.is_admin());
$$;

revoke all on function public.get_team_mvp(uuid, text) from public;
grant execute on function public.get_team_mvp(uuid, text) to authenticated;
