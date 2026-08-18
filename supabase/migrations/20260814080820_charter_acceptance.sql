-- Authentification et profils — charter-acceptance gate (CDC §3.1: "activation
-- après acceptation de la charte").
-- Mirrors src/domain/entities/user.ts User.charterAcceptedAt.

alter table public.users add column charter_accepted_at timestamptz;

-- =========================================================================
-- accept_charter — SECURITY DEFINER, but unlike the private.* helpers in
-- 20260811171754_initial_schema.sql (only ever called from inside an RLS
-- predicate), this one is meant to be invoked directly as an RPC from the
-- client. Deliberately narrower than an UPDATE policy on public.users would
-- be: users has no UPDATE policy today, and opening one for
-- charter_accepted_at would also let a player rewrite their own full_name /
-- email unless every other column were hand-guarded. This function only
-- ever touches charter_accepted_at, only for auth.uid(), and is idempotent.
--
-- No rbac-matrix.ts action backs this — charter acceptance applies to every
-- authenticated account regardless of role, not a role-gated action.
-- =========================================================================

create or replace function public.accept_charter()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.users
  set charter_accepted_at = now()
  where id = (select auth.uid())
    and charter_accepted_at is null;
$$;

revoke all on function public.accept_charter() from public;
grant execute on function public.accept_charter() to authenticated;
