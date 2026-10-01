-- Training locations referential — specs/web-localizations.md §2 / AC-WL-01
-- through AC-WL-06. Replaces the hard-coded TRAINING_LOCATIONS list with a
-- table managed by the administrator, and makes a training convocation
-- REFERENCE its location by foreign key instead of copying a text.
--
-- No existing migration is modified (AC-WL-01). No seed data: the former
-- placeholder values were never real venues (PO-WL-10, to be decided before
-- production — until an administrator adds a location, no training can be
-- created).
--
-- Mirrors domain/policies/rbac-matrix.ts's 'training_location:write':
-- ['admin'] (CLAUDE.md §7 — manual mirror, never generated either
-- direction). Reading stays RLS-only, no matrix entry.

-- =========================================================================
-- 1. public.training_locations (§2.1)
-- =========================================================================

create table public.training_locations (
  id uuid primary key default gen_random_uuid(),
  -- AC-WL-03 — trimmed and non-empty, enforced by the database as well as
  -- by the domain (CreateTrainingLocationUseCase / UpdateTrainingLocationUseCase).
  -- address is required by default, PO-WL-04 (open, non-blocking).
  name text not null check (btrim(name) <> ''),
  address text not null check (btrim(address) <> ''),
  -- PO-WL-03 — archived, never deleted: no longer offered when creating a
  -- training, still resolved for the convocations that reference it.
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.training_locations enable row level security;

-- Exactly three policies, and NO delete policy (AC-WL-01/AC-WL-02).

-- Read: every authenticated account, archived rows included (§2.4). Players
-- read their team's convocations, so they must be able to resolve the venue;
-- hiding archived rows would break the display of convocations that
-- reference them. The selector's "not archived" filter is a query filter.
-- Not nominative or sensitive data (public venues). RLS-only, no matrix entry.
create policy training_locations_select_authenticated on public.training_locations
  for select to authenticated
  using (true);

-- 'training_location:write' (insert) — administrator only.
create policy training_locations_insert_admin on public.training_locations
  for insert to authenticated
  with check (private.is_admin());

-- 'training_location:write' (update) — administrator only. Covers editing
-- name/address AND archiving (is_archived = true): there is no dedicated
-- archive policy.
create policy training_locations_update_admin on public.training_locations
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- Column-level restriction: an update can only touch the three business
-- columns, never id/created_at, even from a forged admin request.
revoke update on public.training_locations from authenticated;
grant update (name, address, is_archived) on public.training_locations to authenticated;

-- =========================================================================
-- 2. convocations.training_location_id + the two valid shapes (§2.2)
-- =========================================================================

-- No `on delete` action (AC-WL-04): the default (no action) makes a direct
-- delete of a referenced location fail rather than silently erase a
-- training's venue. Name/address are NOT copied onto the convocation.
alter table public.convocations
  add column training_location_id uuid references public.training_locations (id);

-- Matches/meetings and legacy trainings keep their free-text location.
alter table public.convocations
  alter column location drop not null;

-- Valid shapes (§2.2), accepting every existing row without rewrite
-- (they all have location not null and no training_location_id):
--   - match / meeting          : location set, no training_location_id
--   - training (new)           : training_location_id set (location null)
--   - training (legacy)        : location set, no training_location_id
-- i.e. for a training at least one of the two is set; for any other type,
-- location is set and training_location_id is null.
alter table public.convocations
  add constraint convocations_location_shape_check
  check (
    (type = 'training' and (training_location_id is not null or location is not null))
    or (type <> 'training' and training_location_id is null and location is not null)
  );

-- training_location_id is deliberately NOT added to any `grant update`
-- (AC-WL-06): the existing `grant update (date, location)` from
-- 20260925150603_edit_match_details_write_policy.sql is left untouched, so
-- the link cannot be changed after creation.

-- =========================================================================
-- 3. Refuse an archived location at insert time (§2.3 / AC-WL-06)
-- =========================================================================

-- BEFORE INSERT trigger, not only a check inside the function:
-- convocations_insert_create allows a direct INSERT on convocations, and the
-- refusal must hold there too. Insert only — archiving a location never
-- invalidates an existing convocation. check_violation (23514) with a
-- recognisable message, translated by data/errors/map-supabase-error.ts
-- into TrainingLocationArchivedError. A non-existent location is already
-- refused by the foreign key.
create or replace function public.convocations_refuse_archived_training_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.training_location_id is not null
     and exists (
       select 1 from public.training_locations tl
       where tl.id = new.training_location_id and tl.is_archived
     ) then
    raise exception 'training_location_archived: location % is archived', new.training_location_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger convocations_training_location_not_archived
  before insert on public.convocations
  for each row execute function public.convocations_refuse_archived_training_location();

-- =========================================================================
-- 4. create_training_convocation: id instead of text (§2.3 / AC-WL-05)
-- =========================================================================

-- Postgres tells overloads apart by argument types: the old signature
-- (…, p_location text) must be dropped explicitly, otherwise it would stay
-- callable with free text.
drop function public.create_training_convocation(uuid, uuid, timestamptz, text);

-- Still NOT security definer (create-convocation.md §2): the role check is
-- convocations_insert_create, unchanged. create_match_convocation and
-- create_meeting_convocation are untouched.
create or replace function public.create_training_convocation(
  p_team_id uuid,
  p_created_by uuid,
  p_date timestamptz,
  p_training_location_id uuid
) returns public.convocations
language plpgsql
set search_path = ''
as $$
declare
  v_convocation public.convocations;
begin
  insert into public.convocations (team_id, created_by, type, date, training_location_id)
  values (p_team_id, p_created_by, 'training', p_date, p_training_location_id)
  returning * into v_convocation;

  return v_convocation;
end;
$$;

revoke all on function public.create_training_convocation(uuid, uuid, timestamptz, uuid) from public;
grant execute on function public.create_training_convocation(uuid, uuid, timestamptz, uuid) to authenticated;
