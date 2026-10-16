-- Clôture du vote « homme du match » : 3 jours -> 2 jours après le coup d'envoi
-- + 1 h (décision de la développeuse, 2026-10-16). Nouvelle fenêtre :
-- coup d'envoi + 1 h + 2 j. Aucune donnée n'est modifiée : seules les règles
-- de lecture/écriture et le calcul des notifications changent.
--
-- Miroirs MANUELS (jamais générés, CLAUDE.md §7) — chaque côté nomme l'autre :
--   - domain/policies/player-vote-rules.ts VOTING_DEADLINE_DAYS = 2
--       <-> votes_insert_cast / votes_update_cast (ci-dessous)
--       <-> get_team_mvp (ci-dessous)
--       <-> c_voting_window de private.collect_due_push_notifications (ci-dessous)
--   - Les deux étapes de rappel T1 se déduisent de la clôture
--     (c_t1_before_closing = 24 h avant) : rien d'autre à changer.
--
-- Hors périmètre, volontairement inchangé : la clôture d'une convocation pour
-- l'ASC Legacy (« 3 jours », 20261013134916_legacy_closure_and_reconciliation.sql)
-- est une règle distincte.
--
-- Corps repris à l'identique de 20261012090240_votes_closing_window.sql,
-- 20261015120508_match_winners_refactor.sql (get_team_mvp) et
-- 20261015120531_push_dispatch.sql (collect_due_push_notifications), avec
-- uniquement l'intervalle changé.
--
-- Appliquée sur la base de dev (2026-10-16). Production : voir la section
-- Migrations de la PR.

-- =========================================================================
-- 1. Policies de vote
-- =========================================================================

drop policy votes_insert_cast on public.votes;

create policy votes_insert_cast on public.votes
  for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = votes.convocation_id
        and c.date < now()
        and now() < c.date + interval '1 hour' + interval '2 days'
        and private.is_player_of_team(c.team_id)
    )
  );

drop policy votes_update_cast on public.votes;

create policy votes_update_cast on public.votes
  for update to authenticated
  using (voter_id = (select auth.uid()))
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = votes.convocation_id
        and c.date < now()
        and now() < c.date + interval '1 hour' + interval '2 days'
        and private.is_player_of_team(c.team_id)
    )
  );

-- =========================================================================
-- 2. get_team_mvp
-- =========================================================================

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
      and now() >= c.date + interval '1 hour' + interval '2 days'
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

-- =========================================================================
-- 3. Notifications push (T1 rappel de vote, T5 annonce)
-- =========================================================================

create or replace function private.collect_due_push_notifications()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- <-> CONVOCATION_REMINDER_LEAD_HOURS (match 24, meeting 24, training 12).
  c_t2_lead_match constant interval := interval '24 hours';
  c_t2_lead_meeting constant interval := interval '24 hours';
  c_t2_lead_training constant interval := interval '12 hours';
  -- <-> VOTE_REMINDER_OPENING_OFFSET_HOURS (= VOTING_DEADLINE_START_OFFSET_HOURS = 1).
  c_t1_opening_offset constant interval := interval '1 hour';
  -- <-> VOTE_REMINDER_BEFORE_CLOSING_HOURS = 24.
  c_t1_before_closing constant interval := interval '24 hours';
  -- <-> getVotingDeadline : coup d'envoi + 1 h + 2 j.
  c_voting_window constant interval := interval '1 hour' + interval '2 days';
  -- <-> MVP_ANNOUNCEMENT_LOOKBACK_DAYS = 7.
  c_t5_lookback constant interval := interval '7 days';
  c_category constant text := 'man_of_the_match';

  v_result jsonb;
begin
  with eligible as (
    select user_id from private.push_eligible_users()
  ),
  -- T2 — convocation sans réponse. <-> isConvocationReminderDue :
  -- convoqué, ni 'present' ni 'absent', convocation 'open', seuil atteint et
  -- canPlayerRespond encore vrai (échéance : match 60 min, entraînement 10 min,
  -- réunion 60 min — OPEN comme dans response-deadline.ts).
  t2 as (
    select ca.user_id, 'convocation_reminder'::text as trigger, 'single'::text as stage, c.id as convocation_id
    from public.convocations c
    join public.convocation_attendees ca on ca.convocation_id = c.id
    join eligible e on e.user_id = ca.user_id
    where c.status = 'open'
      and now() >= c.date - (case c.type
            when 'training' then c_t2_lead_training
            when 'meeting' then c_t2_lead_meeting
            else c_t2_lead_match end)
      and now() < c.date - (case c.type
            when 'training' then interval '10 minutes'
            else interval '60 minutes' end)
      and not exists (
        select 1 from public.convocation_responses cr
        where cr.convocation_id = c.id
          and cr.user_id = ca.user_id
          and cr.status in ('present', 'absent')
      )
  ),
  -- T1 — rappel de vote. <-> getDueVoteReminderStage : joueur de l'équipe du
  -- match, match non annulé, fenêtre de vote ouverte et non close, pas de vote ;
  -- seule l'étape la PLUS RÉCENTE échue est envoyée (jamais de rattrapage).
  t1 as (
    select ur.user_id,
           'vote_reminder'::text as trigger,
           (case when now() >= c.date + c_voting_window - c_t1_before_closing
                 then 'before_closing' else 'opening' end)::text as stage,
           c.id as convocation_id
    from public.convocations c
    join public.user_roles ur on ur.team_id = c.team_id and ur.role = 'player'
    join eligible e on e.user_id = ur.user_id
    where c.type = 'match'
      and c.status <> 'cancelled'
      and now() >= c.date + c_t1_opening_offset
      and now() < c.date + c_voting_window
      and not exists (
        select 1 from public.votes v
        where v.convocation_id = c.id
          and v.category_id = c_category
          and v.voter_id = ur.user_id
      )
  ),
  -- T5 — annonce. <-> isMvpAnnouncementDue + resolveMvpAnnouncementRecipients :
  -- vote clos, au moins un vote, joueurs et coachs de l'équipe + tous les
  -- dirigeants habilités, dédoublonnés par compte.
  t5_matches as (
    select c.id, c.team_id
    from public.convocations c
    where c.type = 'match'
      and c.status <> 'cancelled'
      and now() >= c.date + c_voting_window
      and now() < c.date + c_voting_window + c_t5_lookback
      and exists (
        select 1 from public.votes v
        where v.convocation_id = c.id and v.category_id = c_category
      )
  ),
  t5 as (
    select distinct ur.user_id, 'mvp_announcement'::text as trigger, 'single'::text as stage, m.id as convocation_id
    from t5_matches m
    join public.user_roles ur
      on (ur.role in ('player', 'coach') and ur.team_id = m.team_id)
      or ur.role = 'authorized-officer'
    join eligible e on e.user_id = ur.user_id
  ),
  candidates as (
    select * from t2
    union all select * from t1
    union all select * from t5
  ),
  claimed as (
    insert into public.push_send_log (user_id, trigger, convocation_id, stage)
    select user_id, trigger, convocation_id, stage from candidates
    on conflict (user_id, trigger, convocation_id, stage) do nothing
    returning user_id, trigger, convocation_id, stage
  )
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'user_id', cl.user_id,
             'kind', cl.trigger,
             'stage', cl.stage,
             'convocation_id', cl.convocation_id,
             'convocation_type', c.type,
             'starts_at', c.date,
             'opponent_name', o.name,
             -- Libellé lu en base (AC-NT-28), jamais écrit en dur.
             'category_label', (select vc.label from public.vote_categories vc where vc.id = c_category),
             -- Noms des seuls lauréats (T5) ; ni voix, ni votants (AC-NT-09).
             'winners', case when cl.trigger = 'mvp_announcement' then
                 coalesce((select jsonb_agg(u.full_name order by u.full_name)
                             from private.match_winners(c.id, c_category) w
                             join public.users u on u.id = w.user_id), '[]'::jsonb)
               else null end
           )), '[]'::jsonb)
    into v_result
  from claimed cl
  join public.convocations c on c.id = cl.convocation_id
  left join public.match_details md on md.convocation_id = c.id
  left join public.opponents o on o.id = md.opponent_id;

  return v_result;
end;
$$;

revoke all on function private.collect_due_push_notifications() from public, anon, authenticated;
