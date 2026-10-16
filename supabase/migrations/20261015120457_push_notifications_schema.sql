-- specs/mob-notifications.md §2/§3/§6 — Web Push storage. Migration à PROPOSER à
-- l'application, jamais appliquée en silence.
--
--   1. public.push_subscriptions : un abonnement push par APPAREIL (donnée
--      personnelle). RLS « propre ligne » : select / insert / delete limités à
--      user_id = auth.uid(), administrateur compris (AC-NT-02). Pas d'update.
--   2. public.upsert_push_subscription() : seule voie d'écriture du client.
--      Upsert sur l'endpoint, SECURITY DEFINER : un appareil partagé dont
--      l'abonnement appartient encore au compte précédent est repris par le
--      compte courant, ce qu'aucune politique RLS « propre ligne » n'exprime.
--      user_id = auth.uid(), jamais reçu en paramètre.
--   3. public.push_send_log : journal d'envoi (idempotence, AC-NT-10). Aucune
--      politique pour `authenticated` : lu et écrit seulement par les fonctions
--      SECURITY DEFINER de 20261015120531_push_dispatch.sql. Sert à
--      l'idempotence, PAS à l'audit (PO-NT-13).
--   4. private.purge_push_data() : rétention. Durées PROPOSÉES par défaut
--      (PO-NT-14, à trancher avant la production) : abonnement inutilisé 6 mois,
--      journal 30 jours. Logique d'expiration ici, jamais dans domain/.

-- =========================================================================
-- 1. push_subscriptions
-- =========================================================================
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  -- Identifiant d'appareil chez le service push : unique, donc une ligne par appareil.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  -- Réarmé à chaque (ré)enregistrement ; sert à la purge des abonnements inutilisés.
  last_registered_at timestamptz not null default now()
);

comment on table public.push_subscriptions is
  'Abonnement Web Push par appareil (specs/mob-notifications.md §3). Donnée personnelle : endpoint et clés ne sont jamais journalisés. Lu seulement par son propriétaire (RLS) et par l''Edge Function send-push (service_role).';

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;
-- Les clés p256dh / auth ne reviennent jamais au client : lecture de l'endpoint seul.
revoke select, update on public.push_subscriptions from authenticated;
grant select (id, user_id, endpoint, created_at) on public.push_subscriptions to authenticated;
revoke insert on public.push_subscriptions from authenticated;
grant insert (user_id, endpoint, p256dh, auth) on public.push_subscriptions to authenticated;

create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- =========================================================================
-- 2. upsert_push_subscription
-- =========================================================================
create or replace function public.upsert_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'invalid push subscription' using errcode = '22023';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (v_user, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint)
  do update set user_id = excluded.user_id,
                p256dh = excluded.p256dh,
                auth = excluded.auth,
                last_registered_at = now();
end;
$$;

revoke all on function public.upsert_push_subscription(text, text, text) from public, anon;
grant execute on function public.upsert_push_subscription(text, text, text) to authenticated;

-- =========================================================================
-- 3. push_send_log
-- =========================================================================
-- Clé = (compte, déclencheur, convocation, étape) — AC-NT-10.
--   vote_reminder         : étapes 'opening' et 'before_closing' (T1, deux au plus)
--   convocation_reminder  : étape 'single' (T2)
--   mvp_announcement      : étape 'single' (T5)
-- T3 (dues_reminder) n'y figure pas : il suit la fenêtre de 7 jours de
-- send_dues_reminders().
create table public.push_send_log (
  user_id uuid not null references public.users (id) on delete cascade,
  trigger text not null check (trigger in ('vote_reminder', 'convocation_reminder', 'mvp_announcement')),
  convocation_id uuid not null references public.convocations (id) on delete cascade,
  stage text not null check (stage in ('opening', 'before_closing', 'single')),
  sent_at timestamptz not null default now(),
  primary key (user_id, trigger, convocation_id, stage)
);

create index push_send_log_convocation_id_idx on public.push_send_log (convocation_id);

alter table public.push_send_log enable row level security;
-- AUCUNE politique pour `authenticated` (AC-NT-02) ; privilèges de table retirés.
revoke all on public.push_send_log from anon, authenticated;

-- =========================================================================
-- 4. Purge (rétention, PO-NT-14 — durées par défaut à confirmer)
-- =========================================================================
create schema if not exists private;

create or replace function private.purge_push_data()
returns void
language sql
security definer
set search_path = ''
as $$
  -- Abonnement inutilisé depuis 6 mois.
  delete from public.push_subscriptions where last_registered_at < now() - interval '6 months';
  -- Journal : 30 jours après le dernier envoi.
  delete from public.push_send_log where sent_at < now() - interval '30 days';
$$;

revoke all on function private.purge_push_data() from public, anon, authenticated;
