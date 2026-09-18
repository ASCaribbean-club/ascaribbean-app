-- Backoffice write path on memberships, plus the new membership_payments
-- child table — specs/web-memberships.md §2/§5 (AC-WM-01 through AC-WM-09).
--
-- This is the FIRST real spec for public.memberships: the initial schema's
-- own table comment says "RLS here is a best-effort self-row guess pending
-- a real spec" — this migration is that spec's write path.
--
-- Mirrors domain/policies/rbac-matrix.ts's 'membership:write'/'payment:record':
-- both ['admin'] entries (CLAUDE.md §7 — manual mirror, never generated
-- either direction). private.is_admin() already exists
-- (20260811171754_initial_schema.sql) — nothing new to create there.

-- =========================================================================
-- (0) Pre-flight checks — §2.6a/§2.7/AC-WM-08. Never resolved silently: if
-- either check below finds an offending row, the migration ABORTS with a
-- clear message rather than guessing what to do with the data (same
-- principle as 20260917145402_section_team_write_policies.sql's own
-- season_id/section_id not-null check for public.teams).
-- =========================================================================

do $$
declare
  null_season_count integer;
begin
  select count(*) into null_season_count from public.memberships where season_id is null;
  if null_season_count > 0 then
    raise exception 'web-memberships: % row(s) of public.memberships have season_id = null; season_id cannot be set NOT NULL until each is assigned a season (specs/web-memberships.md §2.6a) — resolve manually, then re-run this migration.', null_season_count;
  end if;
end $$;

do $$
declare
  duplicate_pair_count integer;
begin
  select count(*) into duplicate_pair_count
  from (
    select user_id, season_id
    from public.memberships
    group by user_id, season_id
    having count(*) > 1
  ) duplicates;
  if duplicate_pair_count > 0 then
    raise exception 'web-memberships: % (user_id, season_id) pair(s) have more than one public.memberships row; the partial unique index (AC-WM-07) cannot be created until each is resolved to at most one row — resolve manually, then re-run this migration.', duplicate_pair_count;
  end if;
end $$;

-- =========================================================================
-- (1) public.memberships — new columns, then NOT NULL (§2.5/§2.6a).
-- =========================================================================

alter table public.memberships
  add column archived_at timestamptz,
  add column archived_by uuid references public.users (id);

-- Amendement du 2026-09-17, AC-WM-34 — resolves PO-WM-01 in favour of a
-- column on the membership itself (the export `payment-1` mockup's own
-- "Cotisation totale (€)" field), NOT a tariff table (specs/web-memberships.md
-- §2.1). Integer CENTS, never float (same reasoning as membership_payments.
-- amount_cents below), NULLABLE (the "Nouvelle adhésion" dialog does not
-- carry this field — a membership can be created with no amount due yet),
-- `>= 0` rather than `> 0`: a due amount of exactly 0 is a legitimate
-- "exonérée" case (§2.1 point 3), only a NEGATIVE amount is nonsensical.
-- Written by memberships_insert_admin/memberships_update_admin above — no
-- additional policy is created for this single column (§2.9).
alter table public.memberships
  add column amount_due_cents integer check (amount_due_cents >= 0);

alter table public.memberships
  alter column season_id set not null;

-- (2) §2.7/AC-WM-07 — partial unique index: at most one LIVE (non-archived)
-- row per (user_id, season_id) pair. As many ARCHIVED rows as needed remain
-- allowed for the same pair — this is what makes "recreate after archive"
-- (§2.7) possible without ever violating this constraint.
create unique index memberships_user_season_active_idx
  on public.memberships (user_id, season_id)
  where archived_at is null;

-- (3) mirrors 'membership:write'.
create policy memberships_insert_admin on public.memberships
  for insert to authenticated
  with check (private.is_admin());

-- (4) mirrors 'membership:write'. Archiving IS an update of archived_at/
-- archived_by (§2.5) — this same policy is what actually allows it, there
-- is no separate "archive" policy and no delete policy anywhere on this
-- table (AC-WM-05).
create policy memberships_update_admin on public.memberships
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- (5) §2.5/AC-WM-28 — memberships_select_own AMENDED to exclude archived
-- rows on the "own row" branch only; the admin branch is untouched and
-- keeps seeing every row (archived included), so nothing here regresses an
-- admin's ability to read what they need. Same policy name, same original
-- shape (supabase/migrations/20260811171754_initial_schema.sql) —
-- ALTER POLICY rather than drop+recreate, to keep this a visible diff of
-- exactly the clause that changed.
alter policy memberships_select_own on public.memberships
  using (
    (user_id = (select auth.uid()) and archived_at is null)
    or private.is_admin()
  );

-- =========================================================================
-- membership_payments — append-only child table (§2.2). EXPLICIT EXCEPTION
-- to CLAUDE.md §6's "upsert-on-conflict, not insert-and-grow" rule for
-- current-state tables (ConvocationResponse, AttendanceRecord): a payment is
-- a dated, CUMULATIVE fact, not a current-state row that a later value
-- should overwrite. Every payment is therefore a plain INSERT, never an
-- upsert, never `on conflict` — and there is NO update/delete policy at all
-- (AC-WM-06): once written, a payment is permanent from the application's
-- point of view. Corollary — how to correct a mis-keyed payment — is
-- PO-WM-04, explicitly out of scope for this pass (specs/web-memberships.md
-- §2.2).
-- =========================================================================

create table public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships (id) on delete cascade,
  -- §2.2 — integer CENTS, never float/numeric-with-fraction: a float 300€
  -- re-serializes as 299,99999… and a running total that never lands
  -- exactly on the amount due would corrupt the "payé" state itself.
  amount_cents integer not null check (amount_cents > 0),
  -- Date the payment was RECEIVED (§1 — this app never encaisses online),
  -- not a due date — no échéancier is modeled here.
  paid_at date not null,
  -- §4 — attribution, NOT the audit log itself (PO-WM-09 remains open and
  -- unbuilt): "qui a saisi ce paiement" must be recoverable even though no
  -- audit trail exists yet.
  recorded_by uuid not null references public.users (id),
  recorded_at timestamptz not null default now()
);

create index membership_payments_membership_id_idx on public.membership_payments (membership_id);

alter table public.membership_payments enable row level security;

-- (6) mirrors 'payment:record'.
create policy membership_payments_insert_admin on public.membership_payments
  for insert to authenticated
  with check (private.is_admin());

-- (7) §2.9 — "calquée sur celle du parent (sa propre ligne, ou administrateur)":
-- a member who can read their own membership but not the payments attached
-- to it would be a model inconsistency, even though no mobile screen
-- consumes this in this pass. Excludes an ARCHIVED parent row too, same as
-- memberships_select_own's own amended "own row" branch above.
create policy membership_payments_select_own_or_admin on public.membership_payments
  for select to authenticated
  using (
    private.is_admin()
    or exists (
      select 1 from public.memberships m
      where m.id = membership_payments.membership_id
        and m.user_id = (select auth.uid())
        and m.archived_at is null
    )
  );

-- No UPDATE, no DELETE policy on public.membership_payments (§2.2/AC-WM-06)
-- — not an oversight, the explicit design of this table.

-- =========================================================================
-- Table-level grants. RLS above is the actual gate — this grant just lets
-- the operation be attempted at all (same blanket-grant convention as
-- 20260811171754_initial_schema.sql's own grant statement; UPDATE/DELETE
-- are granted here too even though no policy currently allows either verb
-- on this table, mirroring that same convention rather than inventing a
-- narrower one for this single table).
-- =========================================================================

grant select, insert, update, delete on public.membership_payments to authenticated;
