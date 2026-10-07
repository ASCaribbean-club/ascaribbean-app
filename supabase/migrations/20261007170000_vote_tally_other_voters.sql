-- Vote tally: also expose how many voters are NOT players of the convocation's
-- team (authorized officers voting without being convoked), so the UI can show
-- "11 votes sur 14 joueurs +2 autres". A voter who is a player of the team
-- counts as a player, even if they also hold another role. Aggregate only, no
-- voter identity (AC-PV-10).
drop function public.get_vote_tally(uuid, text);

create function public.get_vote_tally(p_convocation_id uuid, p_category_id text)
returns table (
  candidate_id uuid,
  candidate_display_name text,
  vote_count integer,
  total_eligible_voters integer,
  other_voters integer
)
language sql
security definer
set search_path = ''
as $$
  select
    v.candidate_id,
    u.full_name as candidate_display_name,
    count(*)::integer as vote_count,
    (
      select count(*)::integer
      from public.user_roles ur
      where ur.team_id = c.team_id and ur.role = 'player'
    ) as total_eligible_voters,
    (
      select count(*)::integer
      from public.votes ov
      where ov.convocation_id = c.id
        and ov.category_id = p_category_id
        and not exists (
          select 1 from public.user_roles ur
          where ur.user_id = ov.voter_id and ur.team_id = c.team_id and ur.role = 'player'
        )
    ) as other_voters
  from public.convocations c
  join public.votes v
    on v.convocation_id = c.id and v.category_id = p_category_id
  join public.users u on u.id = v.candidate_id
  where c.id = p_convocation_id
    and (private.is_team_member(c.team_id) or private.has_role('authorized-officer') or private.is_admin())
  group by v.candidate_id, u.full_name, c.id, c.team_id;
$$;

revoke all on function public.get_vote_tally(uuid, text) from public;
grant execute on function public.get_vote_tally(uuid, text) to authenticated;
