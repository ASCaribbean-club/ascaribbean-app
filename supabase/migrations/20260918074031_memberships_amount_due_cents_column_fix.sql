-- Fixes a gap where 20260917174652_web_memberships_write_policies.sql was
-- applied to remote BEFORE the amount_due_cents column (amendement du
-- 2026-09-17, AC-WM-34) was added to that migration file locally — the
-- ALTER never ran remotely, so admin/memberships list reads 400'd with
-- "column memberships.amount_due_cents does not exist".

-- IF NOT EXISTS: idempotent so a fresh sequential replay (e.g. building a new
-- environment from supabase/migrations/ alone) doesn't fail here — the
-- column already exists at this point on such a replay, because
-- 20260917174652_web_memberships_write_policies.sql was edited after dev had
-- already applied it and now creates the column itself (see header above).
alter table public.memberships
  add column if not exists amount_due_cents integer check (amount_due_cents >= 0);
