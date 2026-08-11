-- Initial schema for AS Caribbean.
-- Mirrors src/domain/entities/* and src/domain/repositories/* as of this migration.
-- Every RLS policy below is commented with the domain/policies/rbac-matrix.ts action
-- it mirrors, or with a note when no such action exists yet.

create schema if not exists private;

-- =========================================================================
-- Reference data: sections, seasons
-- Both are club-wide reference data with no scoping parameter on their
-- repositories (SectionRepository.findAll / SeasonRepository.findAll) —
-- RLS mirrors that: any authenticated user reads all rows, nobody writes
-- via the client yet (no use case exists for creating a section/season).
-- =========================================================================

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('football', 'esport', 'echecs', 'domino')), -- domain/entities/section.ts SectionType
  created_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  label text not null, -- domain/entities/season.ts SeasonLabel, e.g. "2026-2027"
  start_date date not null,
  end_date date not null
);

-- =========================================================================
-- users — profile table, one row per auth.users row.
-- No INSERT policy: account provisioning (signup -> profile row) is not
-- specified anywhere in domain/ yet. Left closed (OPEN) rather than guessed.
-- =========================================================================

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- teams — backs domain/entities/team.ts.
-- section_id / season_id are nullable: whether a Team can exist without a
-- Section/Season is explicitly OPEN per spec, not decided in this pass.
-- =========================================================================

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section_id uuid references public.sections (id),
  season_id uuid references public.seasons (id)
);

-- =========================================================================
-- user_roles — backs User.roles: RoleAssignment[] (domain/entities/user.ts).
-- One row per assignment: player/coach are team-scoped (coach can have many
-- rows, one per team), section-manager is section-scoped, the rest are
-- club-wide (team_id and section_id both null).
-- =========================================================================

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null check (
    role in (
      'player', 'coach', 'section-manager', 'authorized-officer',
      'treasurer', 'medical-referent', 'volunteer', 'admin'
    )
  ),
  team_id uuid references public.teams (id) on delete cascade,
  section_id uuid references public.sections (id) on delete cascade,
  constraint user_roles_scope_check check (
    (role in ('player', 'coach') and team_id is not null and section_id is null)
    or (role = 'section-manager' and section_id is not null and team_id is null)
    or (
      role in ('authorized-officer', 'treasurer', 'medical-referent', 'volunteer', 'admin')
      and team_id is null and section_id is null
    )
  )
);

-- One row per (user, role, team) for team-scoped roles, one row per
-- (user, role, section) for the section-scoped role, one row per (user, role)
-- for club-wide roles. Postgres treats NULLs as distinct, so a plain unique
-- constraint can't express this — three partial indexes instead.
create unique index user_roles_team_scoped_idx on public.user_roles (user_id, role, team_id)
  where team_id is not null;
create unique index user_roles_section_scoped_idx on public.user_roles (user_id, role, section_id)
  where section_id is not null;
create unique index user_roles_global_idx on public.user_roles (user_id, role)
  where team_id is null and section_id is null;

-- =========================================================================
-- memberships — backs domain/entities/membership.ts.
-- No repository exists yet for this entity; table created because the type
-- is fully specified and other tables reference the same season concept.
-- RLS here is a best-effort self-row guess pending a real spec.
-- season_id nullable: same OPEN nullability question as teams.season_id.
-- =========================================================================

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  licence_number text,
  status text not null check (status in ('pending', 'active', 'suspended')),
  season_id uuid references public.seasons (id),
  valid_until date not null
);

-- =========================================================================
-- convocations — backs domain/entities/convocation.ts Convocation.
-- =========================================================================

create table public.convocations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  type text not null check (type in ('training', 'match', 'meeting')),
  date timestamptz not null,
  location text not null,
  status text not null check (status in ('open', 'closed', 'cancelled')) default 'open',
  closed_at timestamptz,
  closed_by uuid references public.users (id),
  cancelled_at timestamptz,
  cancelled_by uuid references public.users (id),
  cancellation_reason text
);

-- =========================================================================
-- convocation_responses — backs Convocation.ConvocationResponse.
-- Player-declared intent. Upsert-on-conflict (CLAUDE.md §6): unique on
-- (convocation_id, user_id), last-value-wins, never append-only.
-- =========================================================================

create table public.convocation_responses (
  id uuid primary key default gen_random_uuid(),
  convocation_id uuid not null references public.convocations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null check (status in ('pending', 'present', 'absent')) default 'pending',
  reason text,
  responded_at timestamptz,
  unique (convocation_id, user_id)
);

-- =========================================================================
-- attendance_records — backs Convocation.AttendanceRecord.
-- Coach/admin-confirmed fact. Same upsert-on-conflict shape as above.
-- =========================================================================

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  convocation_id uuid not null references public.convocations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  actual_status text not null check (actual_status in ('present', 'absent')),
  absence_validity text check (absence_validity in ('excused', 'unexcused')),
  note text,
  validated_by uuid not null references public.users (id),
  validated_at timestamptz not null default now(),
  unique (convocation_id, user_id)
);

-- =========================================================================
-- documents — backs domain/entities/document.ts.
-- Only DocumentRepository.listForUser (read) exists today — no upload/
-- validation use case yet. Table is read-only at the RLS layer for now.
-- =========================================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  status text not null check (status in ('missing', 'pending_validation', 'valid', 'rejected')) default 'missing'
);

-- =========================================================================
-- Indexes on FK columns used in joins / RLS policies that aren't already
-- covered as the leading column of a unique index above.
-- =========================================================================

create index user_roles_user_id_idx on public.user_roles (user_id);
create index user_roles_team_id_idx on public.user_roles (team_id);
create index teams_section_id_idx on public.teams (section_id);
create index teams_season_id_idx on public.teams (season_id);
create index convocations_team_id_idx on public.convocations (team_id);
create index convocation_responses_user_id_idx on public.convocation_responses (user_id);
create index attendance_records_user_id_idx on public.attendance_records (user_id);
create index documents_user_id_idx on public.documents (user_id);
create index memberships_user_id_idx on public.memberships (user_id);

-- =========================================================================
-- private schema — SECURITY DEFINER helper functions for RLS policies.
-- Not in PostgREST's exposed schema list, so not callable as an RPC.
-- Each wraps a user_roles lookup so policies do an indexed function call
-- instead of a per-row auth.uid() re-evaluation (security-rls-performance).
-- Kept executable by `authenticated`: RLS predicates evaluate under the
-- querying session's role, so revoking EXECUTE from authenticated would
-- break every policy that calls these — SECURITY DEFINER only changes what
-- the function body can read, not who may call it.
-- =========================================================================

create or replace function private.has_role(p_role text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = p_role
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.has_role('admin');
$$;

create or replace function private.is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid())
      and team_id = p_team_id
      and role in ('player', 'coach')
  );
$$;

create or replace function private.is_coach_of_team(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid())
      and team_id = p_team_id
      and role = 'coach'
  );
$$;

create or replace function private.is_player_of_team(p_team_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid())
      and team_id = p_team_id
      and role = 'player'
  );
$$;

revoke all on function private.has_role(text) from public;
revoke all on function private.is_admin() from public;
revoke all on function private.is_team_member(uuid) from public;
revoke all on function private.is_coach_of_team(uuid) from public;
revoke all on function private.is_player_of_team(uuid) from public;

grant execute on function private.has_role(text) to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_team_member(uuid) to authenticated;
grant execute on function private.is_coach_of_team(uuid) to authenticated;
grant execute on function private.is_player_of_team(uuid) to authenticated;

-- =========================================================================
-- RLS — enable on every table. This is the real security (ARCHITECTURE.md
-- §7): "Sans RLS, il n'y a aucune sécurité." The front-end can() policy is
-- UX only.
-- =========================================================================

alter table public.sections enable row level security;
alter table public.seasons enable row level security;
alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.user_roles enable row level security;
alter table public.memberships enable row level security;
alter table public.convocations enable row level security;
alter table public.convocation_responses enable row level security;
alter table public.attendance_records enable row level security;
alter table public.documents enable row level security;

-- sections / seasons: club-wide reference data, no scoping param on the
-- repositories — RLS-only, no domain/policies entry (read-access classification spec).
create policy sections_select_authenticated on public.sections
  for select to authenticated
  using (true);

create policy seasons_select_authenticated on public.seasons
  for select to authenticated
  using (true);

-- teams: read scope = own team (player/coach) or admin. Same "own row +
-- team-scoped" default as convocations below — RLS-only, no domain/policies entry.
create policy teams_select_team_scoped on public.teams
  for select to authenticated
  using (private.is_team_member(id) or private.is_admin());

-- users: own profile only. Confirmed default (read-access classification spec).
-- No INSERT policy — account provisioning is OPEN, not decided here.
create policy users_select_own on public.users
  for select to authenticated
  using ((select auth.uid()) = id or private.is_admin());

-- user_roles: own assignments only (needed to build the User.roles array for
-- the querying user), or admin. Confirmed default.
create policy user_roles_select_own on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

-- memberships: own row only. Best-effort — no repository exists yet, flagged in table comment above.
create policy memberships_select_own on public.memberships
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

-- convocations: team-scoped read (confirmed default).
create policy convocations_select_team_scoped on public.convocations
  for select to authenticated
  using (private.is_team_member(team_id) or private.is_admin());

-- convocations: mirrors rbac-matrix.ts 'convocation:create' -> ['coach','authorized-officer','admin'].
-- Coach is team-scoped (must be coach of the target team, per can.ts's
-- assignment.teamIds.includes(context.teamId) check); authorized-officer is
-- unscoped in can.ts, so no team check here either.
-- No UPDATE policy: cancelling/closing a convocation via the client has no
-- rbac-matrix action yet (closure is trigger-driven — see the next migration).
create policy convocations_insert_create on public.convocations
  for insert to authenticated
  with check (
    private.is_coach_of_team(team_id)
    or private.has_role('authorized-officer')
    or private.is_admin()
  );

-- convocation_responses: team-scoped read (confirmed default), same shape as convocations.
create policy convocation_responses_select_team_scoped on public.convocation_responses
  for select to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = convocation_responses.convocation_id
        and (private.is_team_member(c.team_id) or private.is_admin())
    )
  );

-- convocation_responses: mirrors rbac-matrix.ts 'convocation:respond' -> ['player'].
-- Split into INSERT + UPDATE because upsert-on-conflict needs both to pass.
-- Scoped to assignment.teamId === context.teamId per can.ts's grants() switch.
create policy convocation_responses_insert_respond on public.convocation_responses
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = convocation_responses.convocation_id
        and private.is_player_of_team(c.team_id)
    )
  );

create policy convocation_responses_update_respond on public.convocation_responses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = convocation_responses.convocation_id
        and private.is_player_of_team(c.team_id)
    )
  );

-- attendance_records: read = coach of team or admin only (confirmed decision
-- — not the player themself, that's left closed/undecided).
create policy attendance_records_select_coach_admin on public.attendance_records
  for select to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and (private.is_coach_of_team(c.team_id) or private.is_admin())
    )
  );

-- attendance_records: no rbac-matrix.ts action exists for this yet. Derived
-- from AttendanceRecord.validatedBy's own field comment ("userId of the
-- coach or admin") per user-confirmed decision. Follow-up: rbac-matrix.ts /
-- actions.ts should eventually gain an explicit 'attendance:validate' action
-- to close the mirroring loop formally.
create policy attendance_records_insert_validate on public.attendance_records
  for insert to authenticated
  with check (
    validated_by = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and (private.is_coach_of_team(c.team_id) or private.is_admin())
    )
  );

create policy attendance_records_update_validate on public.attendance_records
  for update to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and (private.is_coach_of_team(c.team_id) or private.is_admin())
    )
  )
  with check (
    validated_by = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = attendance_records.convocation_id
        and (private.is_coach_of_team(c.team_id) or private.is_admin())
    )
  );

-- documents: self-read only, no write policy at all (confirmed decision —
-- upload/validation workflow is genuinely undefined, left OPEN).
create policy documents_select_own on public.documents
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

-- =========================================================================
-- Table-level grants. RLS above is the actual gate — these grants just let
-- the operation be attempted at all. Invitation-only app (CLAUDE.md §1: no
-- public area), so no grants to `anon`, only to `authenticated`.
-- =========================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.sections,
  public.seasons,
  public.users,
  public.teams,
  public.user_roles,
  public.memberships,
  public.convocations,
  public.convocation_responses,
  public.attendance_records,
  public.documents
to authenticated;
