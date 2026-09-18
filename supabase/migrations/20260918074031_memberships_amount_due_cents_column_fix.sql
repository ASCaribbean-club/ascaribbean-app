-- Fixes a gap where 20260917174652_web_memberships_write_policies.sql was
-- applied to remote BEFORE the amount_due_cents column (amendement du
-- 2026-09-17, AC-WM-34) was added to that migration file locally — the
-- ALTER never ran remotely, so admin/memberships list reads 400'd with
-- "column memberships.amount_due_cents does not exist".

alter table public.memberships
  add column amount_due_cents integer check (amount_due_cents >= 0);
