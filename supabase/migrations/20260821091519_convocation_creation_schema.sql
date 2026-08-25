-- Convocation creation — schema (specs/create-convocation.md §2, "création de
-- convocation" addendum). Adds what the three atomic per-type creation RPCs
-- (next migrations) need:
-- - opponents / team_opponents: match_details.opponent_id needs a valid FK
--   target (PO-CV-02, docs/DEFAULTS-A-CHALLENGER.md "Autorisation de
--   création d'un opponents").
-- - convocations.created_by: ordinary business data (author), see
--   domain/entities/convocation.ts.
-- - match_details / meeting_details: 1:1 satellites of convocations, PK = FK
--   (see domain/entities/match-details.ts, meeting-details.ts).
-- - convocations_insert_create: adds the section-manager branch that
--   rbac-matrix.ts already grants for 'convocation:create' but this policy
--   never mirrored (specs/create-convocation.md migration checklist).

-- =========================================================================
-- 1. opponents / team_opponents (PO-CV-02)
-- =========================================================================

create table public.opponents (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table public.team_opponents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  opponent_id uuid not null references public.opponents (id) on delete cascade,
  unique (team_id, opponent_id)
);

alter table public.opponents enable row level security;
alter table public.team_opponents enable row level security;

-- opponents / team_opponents: reference data needed by every role to
-- populate forms and display match details — open read, same shape as
-- sections/seasons.
create policy opponents_select_authenticated on public.opponents
  for select to authenticated
  using (true);

create policy team_opponents_select_authenticated on public.team_opponents
  for select to authenticated
  using (true);

-- Provisional: write access restricted to admin pending the open decision on
-- who may create an opponent (see DEFAULTS-A-CHALLENGER.md, "Autorisation de
-- création d'un opponents (PO-CV-02)"). Revisit when the season-preparation /
-- opponents-management screen is specified.
create policy opponents_insert_admin on public.opponents
  for insert to authenticated
  with check (private.is_admin());

create policy team_opponents_insert_admin on public.team_opponents
  for insert to authenticated
  with check (private.is_admin());

-- =========================================================================
-- 2. convocations.created_by (specs/create-convocation.md §2)
-- =========================================================================

alter table public.convocations
  add column created_by uuid not null references public.users (id);

-- =========================================================================
-- 3. private.is_section_manager_of_team() — mirrors is_coach_of_team()'s
-- shape, but section-manager scope is by teams.section_id, not team_id
-- directly (RoleAssignment: { role: 'section-manager'; sectionId }). Defined
-- here, before match_details/meeting_details policies below, both of which
-- reference it.
-- =========================================================================

create or replace function private.is_section_manager_of_team(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.teams t on t.section_id = ur.section_id
    where ur.user_id = (select auth.uid())
      and ur.role = 'section-manager'
      and t.id = p_team_id
  );
$$;

revoke all on function private.is_section_manager_of_team(uuid) from public;
grant execute on function private.is_section_manager_of_team(uuid) to authenticated;

-- convocations_insert_create: add the section-manager branch — rbac-matrix.ts
-- 'convocation:create' already grants 'section-manager' (see rbac-matrix.ts
-- comment), but this policy never mirrored it. Mirrors can.ts's grants()
-- 'section-manager' branch: assignment.sectionId === target team's sectionId.
drop policy convocations_insert_create on public.convocations;

create policy convocations_insert_create on public.convocations
  for insert to authenticated
  with check (
    private.is_coach_of_team(team_id)
    or private.is_section_manager_of_team(team_id)
    or private.has_role('authorized-officer')
    or private.is_admin()
  );

-- =========================================================================
-- 4. match_details — 1:1 satellite, PK = FK (domain/entities/match-details.ts)
-- =========================================================================

create table public.match_details (
  convocation_id uuid primary key references public.convocations (id) on delete cascade,
  opponent_id uuid not null references public.opponents (id),
  is_home boolean not null,
  meeting_point_time timestamptz not null,
  meeting_point_location text not null
);

alter table public.match_details enable row level security;

-- match_details: team-scoped read, same shape as convocations (join through
-- convocation_id since this table carries no team_id of its own).
create policy match_details_select_team_scoped on public.match_details
  for select to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = match_details.convocation_id
        and (private.is_team_member(c.team_id) or private.is_admin())
    )
  );

-- match_details: insert mirrors convocations_insert_create — written only as
-- part of creating the parent convocation (see create_match_convocation()
-- RPC, next migration), same authorized roles.
create policy match_details_insert_create on public.match_details
  for insert to authenticated
  with check (
    exists (
      select 1 from public.convocations c
      where c.id = match_details.convocation_id
        and (
          private.is_coach_of_team(c.team_id)
          or private.is_section_manager_of_team(c.team_id)
          or private.has_role('authorized-officer')
          or private.is_admin()
        )
    )
  );

-- =========================================================================
-- 5. meeting_details — 1:1 satellite, PK = FK (domain/entities/meeting-details.ts)
-- `title` alongside `agenda` (mid-pass correction, see that entity's comment).
-- =========================================================================

create table public.meeting_details (
  convocation_id uuid primary key references public.convocations (id) on delete cascade,
  title text not null,
  agenda jsonb not null default '[]'::jsonb
);

alter table public.meeting_details enable row level security;

create policy meeting_details_select_team_scoped on public.meeting_details
  for select to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = meeting_details.convocation_id
        and (private.is_team_member(c.team_id) or private.is_admin())
    )
  );

create policy meeting_details_insert_create on public.meeting_details
  for insert to authenticated
  with check (
    exists (
      select 1 from public.convocations c
      where c.id = meeting_details.convocation_id
        and (
          private.is_coach_of_team(c.team_id)
          or private.is_section_manager_of_team(c.team_id)
          or private.has_role('authorized-officer')
          or private.is_admin()
        )
    )
  );