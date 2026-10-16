-- specs/mob-notifications.md §6 note 3 / AC-NT-26 — la règle « lauréat(s) d'un
-- match » est extraite de get_team_mvp dans private.match_winners() pour que
-- l'étoile in-app ET l'annonce T5 partagent UNE implémentation.
-- Règle (miroir manuel de resolveMatchWinners, push-notification-schedule.ts) :
-- plus grand nombre de voix, ÉGALITÉ = tous les ex æquo, aucun vote = aucun lauréat.
--
-- get_team_mvp ne change PAS de résultat : mêmes colonnes, même sélection du
-- « dernier match clos avec au moins un vote », même frontière de lecture
-- (membre de l'équipe, dirigeant habilité, admin). Seul le calcul du tally est
-- délégué. Migration à PROPOSER, jamais appliquée en silence.

create or replace function private.match_winners(p_convocation_id uuid, p_category_id text)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with tally as (
    select v.candidate_id, count(*) as vote_count
    from public.votes v
    where v.convocation_id = p_convocation_id
      and v.category_id = p_category_id
    group by v.candidate_id
  )
  select t.candidate_id as user_id
  from tally t
  where t.vote_count = (select max(vote_count) from tally);
$$;

revoke all on function private.match_winners(uuid, text) from public, anon, authenticated;

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
  )
  select w.user_id
  from last_closed lc
  cross join lateral private.match_winners(lc.id, p_category_id) w
  where (private.is_team_member(p_team_id) or private.has_role('authorized-officer') or private.is_admin());
$$;

revoke all on function public.get_team_mvp(uuid, text) from public;
grant execute on function public.get_team_mvp(uuid, text) to authenticated;
