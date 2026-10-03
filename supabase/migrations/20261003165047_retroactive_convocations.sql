-- Retroactive convocations — a convocation created at or after its own kickoff
-- (a forgotten entry by an administrator). "Retroactive" is DERIVED from two
-- timestamps (created_at >= date), never stored as a flag. See
-- specs/create-convocation.md, section "Retroactive convocations and creation
-- window".
--
-- Manual mirror (CLAUDE.md §7, never generated) of:
--   domain/policies/rbac-matrix.ts      'convocation:create_retroactive' : ['admin']
--                                       -> convocations_insert_create (section 3 below)
--   domain/policies/convocation-creation-window.ts
--                                       isRetroactiveConvocation <-> `created_at >= date`
--
-- Asymmetry, on purpose: the PERMISSION (who may create after kickoff) is
-- mirrored in RLS below; the TIME WINDOW `response_closed` (from the response
-- deadline to kickoff, forbidden for everyone) is enforced in
-- CreateConvocationUseCase only — the same accepted risk as the player response
-- deadline (canPlayerRespond). Do not turn it into a constraint here.
--
-- NOT APPLIED by the agent that wrote it: to be reviewed and applied by the
-- developer. After applying, rename the file to the timestamp recorded
-- remotely.

-- =========================================================================
-- 1. public.convocations.created_at
-- =========================================================================
-- Did not exist before this migration. Added nullable, backfilled, then made
-- NOT NULL, so existing rows are never flagged retroactive by accident:
-- their real creation time is unknown, but every creation path (use case, web
-- and mobile forms) refused a past date until now, so each was created before
-- its own kickoff. `least(now(), date - 1 second)` keeps created_at < date and
-- never in the future. The backfilled value is an approximation by design.
alter table public.convocations
  add column created_at timestamptz;

update public.convocations
   set created_at = least(now(), date - interval '1 second');

alter table public.convocations
  alter column created_at set not null,
  alter column created_at set default now();

-- =========================================================================
-- 2. created_at is unforgeable — server-set on insert, immutable on update
-- =========================================================================
-- The whole retroactive rule relies on created_at. A column-level REVOKE is not
-- reliable when a table-level grant exists, so a trigger forces the value
-- whatever the caller sends (also for the service role / SQL console: a data
-- correction cannot rewrite it either).
create or replace function private.convocations_force_created_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger convocations_force_created_at
  before insert or update on public.convocations
  for each row execute function private.convocations_force_created_at();

-- =========================================================================
-- 3. convocations_insert_create — 'convocation:create_retroactive' (admin)
-- =========================================================================
-- Same role predicate as before (unchanged), plus: a kickoff that is already
-- past (`date <= now()`) is accepted only for an administrator. Mirrors
-- 'convocation:create' (unchanged branches) and
-- 'convocation:create_retroactive' (the `private.is_admin()` branch).
drop policy convocations_insert_create on public.convocations;

create policy convocations_insert_create on public.convocations
  for insert to authenticated
  with check (
    (
      private.is_coach_of_team(team_id)
      or private.is_section_manager_of_team(team_id)
      or private.has_role('authorized-officer')
      or private.is_admin()
    )
    and (
      date > now()
      or private.is_admin()
    )
  );
