-- specs/mobile-treasurer.md — amendement du 2026-10-05 (4), §B/§C/§D :
--   1. public.send_dues_reminders(uuid[]) — la seule voie d'écriture de
--      public.dues_reminders et de la notification de relance ;
--   2. public.get_treasurer_dues() étendue : reminder_count et
--      last_reminded_at par adhésion (lecture agrégée de l'historique).
-- Dépend de 20261005170000_dues_reminders_schema.sql (tables) et de
-- 20261005170100_dues_reminders_audit.sql. Migration à PROPOSER à
-- l'application, jamais appliquée en silence.

-- =========================================================================
-- 1. send_dues_reminders
-- =========================================================================
-- Règle : 'dues:remind' (domain/policies/rbac-matrix.ts : ['treasurer']).
-- Trésorier SEULEMENT : ni admin (PO-TR-14), ni dirigeant habilité.
--
-- SECURITY DEFINER : le Trésorier écrit une ligne destinée à un AUTRE
-- utilisateur ; aucune politique RLS d'insertion ne l'exprimerait sans ouvrir
-- l'écriture libre. Le contrôle de rôle ci-dessous est donc LA frontière.
-- L'expéditeur est lu depuis auth.uid(), jamais reçu en paramètre.
--
-- Un appel est ATOMIQUE (une seule transaction) : si l'appel échoue, aucune
-- relance de l'appel n'est enregistrée. Il renvoie une ligne par identifiant
-- DISTINCT reçu : (membership_id, outcome), outcome dans
--   'sent' | 'no_balance' | 'cooldown' | 'not_found'
-- (mirroir de domain/entities/dues-reminder.ts DUES_REMINDER_OUTCOMES). Une
-- adhésion archivée, hors saison en cours ou inexistante renvoie 'not_found'
-- : pour le modèle de lecture du Trésorier, elle n'existe pas.
--
-- MIROIRS MANUELS (CLAUDE.md §7, AC-TR-30) — à modifier ensemble :
--   - c_cooldown        <-> REMINDER_COOLDOWN_DAYS (dues-reminder-rules.ts) ;
--   - c_max_batch       <-> MAX_REMINDER_BATCH_SIZE (dues-reminder-rules.ts) ;
--   - bloc « montant dû » <-> effectiveAmountDueCents() / remainingDueCents() /
--     membershipPaymentStatus() (membership-payment-rules.ts) ;
--   - éligibilité       <-> reminderEligibility() (dues-reminder-rules.ts).
create or replace function public.send_dues_reminders(p_membership_ids uuid[])
returns table (membership_id uuid, outcome text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  -- <-> REMINDER_COOLDOWN_DAYS = 7 (fenêtre glissante, PO-TR-13).
  c_cooldown constant interval := interval '7 days';
  -- <-> MAX_REMINDER_BATCH_SIZE = 100.
  c_max_batch constant integer := 100;
  -- § F : expires_at de la notification = sent_at + 12 mois (proposition).
  c_notification_ttl constant interval := interval '12 months';

  v_actor uuid := (select auth.uid());
  v_season_id uuid;
  v_tariff numeric;
  v_id uuid;
  v_user_id uuid;
  v_membership_season uuid;
  v_archived_at timestamptz;
  v_own_amount integer;
  v_amount integer;
  v_paid bigint;
  v_found boolean;
begin
  -- dues:remind
  if not private.has_role('treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_membership_ids is null or cardinality(p_membership_ids) = 0 then
    return;
  end if;
  if cardinality(p_membership_ids) > c_max_batch then
    raise exception 'too many memberships in one call (max %)', c_max_batch
      using errcode = '22023';
  end if;

  select cs.id, cs.cotisation_amount
    into v_season_id, v_tariff
    from public.current_season() cs;

  -- Identifiants distincts, en ordre stable : deux appels concurrents prennent
  -- les verrous dans le même ordre (pas d'interblocage, lock-deadlock-prevention).
  for v_id in
    select distinct x from unnest(p_membership_ids) as x where x is not null order by x
  loop
    -- Verrou de ligne : un second envoi concurrent sur la même adhésion
    -- attend, puis voit la relance du premier et sort en 'cooldown'
    -- (AC-TR-31 : « n'en produisent qu'un »).
    select m.user_id, m.season_id, m.archived_at, m.amount_due_cents
      into v_user_id, v_membership_season, v_archived_at, v_own_amount
      from public.memberships m
     where m.id = v_id
       for update;
    v_found := found;

    if not v_found or v_archived_at is not null or v_membership_season is distinct from v_season_id then
      return query select v_id, 'not_found'::text;
      continue;
    end if;

    -- Bloc « montant dû » — <-> effectiveAmountDueCents(): le montant de
    -- l'adhésion, sinon le tarif de saison (euros -> centimes).
    v_amount := coalesce(v_own_amount, round(v_tariff * 100)::integer);
    select coalesce(sum(p.amount_cents), 0)
      into v_paid
      from public.membership_payments p
     where p.membership_id = v_id;

    -- <-> membershipPaymentStatus() : montant nul/absent/<= 0 -> 'undefined',
    -- payé >= dû -> 'paid' ; dans les deux cas rien à relancer.
    if v_amount is null or v_amount <= 0 or v_paid >= v_amount then
      return query select v_id, 'no_balance'::text;
      continue;
    end if;

    -- <-> reminderEligibility() : `sent_at > now - 7 jours` (strict : exactement
    -- 7 jours, c'est de nouveau permis).
    if exists (
      select 1
        from public.dues_reminders r
       where r.membership_id = v_id
         and r.sent_at > now() - c_cooldown
    ) then
      return query select v_id, 'cooldown'::text;
      continue;
    end if;

    insert into public.dues_reminders (membership_id, sent_by, sent_at)
    values (v_id, v_actor, now());

    -- Upsert sur conflit : une nouvelle relance ré-arme la ligne existante
    -- (sent_at = now(), read_at = null, expires_at repoussée). Une seule ligne
    -- par (destinataire, type, adhésion). Destinataire = titulaire de
    -- l'adhésion, quel que soit son rôle.
    insert into public.notifications (recipient_id, kind, membership_id, sent_at, read_at, expires_at)
    values (v_user_id, 'dues_reminder', v_id, now(), null, now() + c_notification_ttl)
    on conflict (recipient_id, kind, membership_id)
    do update set sent_at = excluded.sent_at,
                  read_at = null,
                  expires_at = excluded.expires_at;

    return query select v_id, 'sent'::text;
  end loop;
end;
$$;

revoke all on function public.send_dues_reminders(uuid[]) from public, anon;
grant execute on function public.send_dues_reminders(uuid[]) to authenticated;

-- =========================================================================
-- 2. get_treasurer_dues() — étendue de reminder_count / last_reminded_at
-- =========================================================================
-- Le type de retour change : la fonction doit être supprimée puis recréée
-- (create or replace ne peut pas modifier une table de retour). Corps et règle
-- identiques à 20261005140000_payment_method.sql ('dues:read' :
-- treasurer, authorized-officer, admin), plus l'agrégat de relances. Pas
-- l'expéditeur. Le dirigeant habilité reçoit donc aussi ces deux champs
-- (PO-TR-15, lecture seule).
drop function if exists public.get_treasurer_dues();

create function public.get_treasurer_dues()
returns table (
  membership_id uuid,
  member_name text,
  amount_due_cents integer,
  sections jsonb,
  payments jsonb,
  reminder_count integer,
  last_reminded_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- dues:read
  if not (
    private.has_role('treasurer')
    or private.has_role('authorized-officer')
    or private.is_admin()
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    m.id as membership_id,
    u.full_name as member_name,
    m.amount_due_cents as amount_due_cents,
    coalesce(
      (select jsonb_agg(distinct jsonb_build_object('id', s.id, 'name', s.name))
         from public.user_roles ur
         join public.teams t on t.id = ur.team_id
         join public.sections s on s.id = t.section_id
        where ur.user_id = m.user_id
          and ur.role = 'player'
          and t.season_id = m.season_id),
      '[]'::jsonb
    ) as sections,
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'id', p.id,
                  'amount_cents', p.amount_cents,
                  'paid_at', p.paid_at,
                  'payment_method', p.payment_method)
                order by p.paid_at desc, p.recorded_at desc)
         from public.membership_payments p
        where p.membership_id = m.id),
      '[]'::jsonb
    ) as payments,
    (select count(*)::integer
       from public.dues_reminders r
      where r.membership_id = m.id) as reminder_count,
    (select max(r.sent_at)
       from public.dues_reminders r
      where r.membership_id = m.id) as last_reminded_at
  from public.memberships m
  join public.users u on u.id = m.user_id
  where m.season_id = (select cs.id from public.current_season() cs)
    and m.archived_at is null
  order by u.full_name;
end;
$$;

revoke all on function public.get_treasurer_dues() from public;
grant execute on function public.get_treasurer_dues() to authenticated;
