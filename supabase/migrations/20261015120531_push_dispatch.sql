-- specs/mob-notifications.md §1 (T1, T2, T3, T5), §6 notes 7-8, PO-NT-15 —
-- server-side triggers of the push notifications. Migration à PROPOSER à
-- l'application, jamais appliquée en silence. Dépend de
-- 20261015120457_push_notifications_schema.sql et
-- 20261015120508_match_winners_refactor.sql.
--
-- Circuit : pg_cron (15 min) -> private.dispatch_due_push_notifications()
--   -> private.collect_due_push_notifications() calcule EN BLOC les envois dus
--      et les « réserve » dans push_send_log (INSERT ... ON CONFLICT DO NOTHING
--      RETURNING : deux exécutions parallèles ne réservent jamais deux fois)
--   -> pg_net POST vers l'Edge Function send-push.
-- Réserver avant d'envoyer = au plus une fois (« un push n'est pas garanti »,
-- l'in-app reste la source de vérité).
--
-- Configuration requise (Vault), à poser par la développeuse, JAMAIS dans ce
-- fichier : secrets 'push_dispatch_url' (URL de l'Edge Function send-push) et
-- 'push_dispatch_secret' (même valeur que le secret PUSH_DISPATCH_SECRET de la
-- fonction). Tant qu'ils sont absents, rien n'est réservé ni envoyé.
--
-- MIROIRS MANUELS (CLAUDE.md §7) — à modifier ensemble avec
-- src/domain/policies/push-notification-schedule.ts (+ player-vote-rules.ts,
-- response-deadline.ts) :
--   c_t2_lead_match / _meeting / _training <-> CONVOCATION_REMINDER_LEAD_HOURS
--   délai de réponse (60 / 60 / 10 min)     <-> RESPONSE_DEADLINE_MINUTES / canPlayerRespond
--   c_t1_opening_offset                     <-> VOTE_REMINDER_OPENING_OFFSET_HOURS (PO-NT-28)
--   c_t1_before_closing                     <-> VOTE_REMINDER_BEFORE_CLOSING_HOURS
--   clôture du vote (1 h + 3 j)             <-> getVotingDeadline / isVotingClosed
--   c_t5_lookback                           <-> MVP_ANNOUNCEMENT_LOOKBACK_DAYS
--   destinataires T5                        <-> resolveMvpAnnouncementRecipients
--   lauréat(s)                              <-> resolveMatchWinners (private.match_winners)

create extension if not exists pg_net;

-- =========================================================================
-- 1. Éligibilité d'un compte : abonné et non désactivé (AC-NT-08)
-- =========================================================================
-- « Désactivé » = compte Auth banni ou supprimé (aucune colonne de statut
-- métier n'existe, cf. user-status.ts) ; à ajuster si la désactivation prend
-- une autre forme.
create or replace function private.push_eligible_users()
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct ps.user_id
  from public.push_subscriptions ps
  join auth.users au on au.id = ps.user_id
  where au.deleted_at is null
    and (au.banned_until is null or au.banned_until <= now());
$$;

revoke all on function private.push_eligible_users() from public, anon, authenticated;

-- =========================================================================
-- 2. T1 / T2 / T5 — calcul en bloc + réservation dans le journal
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
  -- <-> getVotingDeadline : coup d'envoi + 1 h + 3 j.
  c_voting_window constant interval := interval '1 hour' + interval '3 days';
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

-- =========================================================================
-- 3. Envoi vers l'Edge Function (pg_net, asynchrone)
-- =========================================================================
-- Sans configuration Vault : ne fait rien. Ne lève jamais (T3 ne doit pas
-- annuler la relance, AC-NT-06).
create or replace function private.post_push_batch(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    return;
  end if;

  select ds.decrypted_secret into v_url from vault.decrypted_secrets ds where ds.name = 'push_dispatch_url';
  select ds.decrypted_secret into v_secret from vault.decrypted_secrets ds where ds.name = 'push_dispatch_secret';
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', v_secret),
    body := jsonb_build_object('items', p_items)
  );
exception when others then
  -- Un échec d'envoi n'a jamais d'effet sur l'appelant.
  null;
end;
$$;

revoke all on function private.post_push_batch(jsonb) from public, anon, authenticated;

create or replace function private.dispatch_due_push_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_configured boolean;
begin
  select count(*) = 2 into v_configured
  from vault.decrypted_secrets ds
  where ds.name in ('push_dispatch_url', 'push_dispatch_secret');
  -- Rien à réserver tant que l'envoi ne peut pas partir.
  if not v_configured then
    return;
  end if;

  perform private.post_push_batch(private.collect_due_push_notifications());
end;
$$;

revoke all on function private.dispatch_due_push_notifications() from public, anon, authenticated;

-- PO-NT-15 : même cadence que close-elapsed-convocations (tolérance 15 min).
create extension if not exists pg_cron;
select cron.schedule('dispatch-push-notifications', '*/15 * * * *', 'select private.dispatch_due_push_notifications()');
-- Rétention (PO-NT-14, durées par défaut) : une fois par jour.
select cron.schedule('purge-push-data', '17 3 * * *', 'select private.purge_push_data()');

-- =========================================================================
-- 4. T3 — relance de cotisation
-- =========================================================================
-- Branché APRÈS le résultat 'sent' de send_dues_reminders() sans modifier cette
-- fonction : celle-ci écrit (upsert) la notification 'dues_reminder' ; ce
-- trigger la suit. Le push ne porte ni montant, ni expéditeur (AC-NT-09).
-- Toute erreur est absorbée : la relance et l'alerte in-app ne sont jamais
-- annulées (AC-NT-06). Sans abonnement/compte éligible : aucun envoi.
create or replace function private.push_on_dues_reminder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'dues_reminder'
     and exists (select 1 from private.push_eligible_users() e where e.user_id = new.recipient_id) then
    perform private.post_push_batch(jsonb_build_array(
      jsonb_build_object('user_id', new.recipient_id, 'kind', 'dues_reminder')
    ));
  end if;
  return new;
exception when others then
  return new;
end;
$$;

revoke all on function private.push_on_dues_reminder() from public, anon, authenticated;

-- UPDATE OF sent_at : le « ré-armement » (on conflict do update set sent_at)
-- déclenche, le simple « Masquer » (read_at seul) non.
create trigger notifications_push_dues_reminder
  after insert or update of sent_at on public.notifications
  for each row execute function private.push_on_dues_reminder();
