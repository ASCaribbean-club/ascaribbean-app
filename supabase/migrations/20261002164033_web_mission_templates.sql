-- Mission templates referential — specs/web-mission-templates.md §2.3 /
-- AC-MT-01 through AC-MT-05. A club-wide list of volunteer-mission templates
-- per convocation type, managed by the administrator. Never deleted:
-- deactivated / reactivated. No existing migration is modified.
--
-- Mirrors domain/policies/rbac-matrix.ts's 'mission-template:manage':
-- ['admin'] (CLAUDE.md §7 — manual mirror, never generated either direction).

create table public.mission_templates (
  id uuid primary key default gen_random_uuid(),
  -- Same list as convocations.type.
  convocation_type text not null check (convocation_type in ('training', 'match', 'meeting')),
  -- Mirrors isValidMissionLabel (domain/policies/mission-rules.ts).
  label text not null check (btrim(label) <> ''),
  -- Mirrors isValidMissionCapacity / MIN_MISSION_CAPACITY / MAX_MISSION_CAPACITY
  -- (domain/policies/mission-rules.ts).
  default_capacity integer not null check (default_capacity between 1 and 3),
  -- Optional details. Mirrors isValidMissionDescription /
  -- MAX_MISSION_DESCRIPTION_LENGTH (domain/policies/mission-rules.ts). The use
  -- cases store blank input as null.
  description text check (description is null or char_length(description) <= 500),
  is_active boolean not null default true,
  -- Creation order for the admin list (PO-MT-03).
  created_at timestamptz not null default now()
);

alter table public.mission_templates enable row level security;

-- Exactly three policies, and NO delete policy (AC-MT-03).

-- 'mission-template:manage' (read) — administrator only.
create policy mission_templates_select_admin on public.mission_templates
  for select to authenticated
  using (private.is_admin());

-- 'mission-template:manage' (insert) — administrator only.
create policy mission_templates_insert_admin on public.mission_templates
  for insert to authenticated
  with check (private.is_admin());

-- 'mission-template:manage' (update) — administrator only. Covers editing
-- label/capacity AND deactivating/reactivating (is_active).
create policy mission_templates_update_admin on public.mission_templates
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- AC-MT-05 — column-level restriction: convocation_type is fixed at
-- creation, never rewritable, even from a forged admin request.
revoke update on public.mission_templates from authenticated;
grant update (label, default_capacity, description, is_active) on public.mission_templates to authenticated;
