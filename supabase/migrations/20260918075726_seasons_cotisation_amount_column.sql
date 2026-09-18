-- specs/web-seasons.md §2.7/AC-WS-33 — amendement du 2026-09-17 (2). Adds
-- exactly one column to public.seasons: cotisation_amount, the season's
-- reference cotisation amount. numeric(10, 2) rather than integer cents
-- (a developer call, unlike memberships.amount_due_cents) — stores euros
-- directly, up to 99,999,999.99. Nullable ("tarif non fixé"), no default,
-- `>= 0` (a due amount of exactly 0 is a legitimate "gratuit" case, a
-- negative one is not). Written by seasons_insert_admin/seasons_update_admin
-- (20260917122358_web_seasons_write_policies.sql) — no additional policy is
-- created for this single column, same reasoning as
-- memberships.amount_due_cents (specs/web-memberships.md §2.9). Since
-- seasons_update_admin's `using`/`with check` both require
-- `end_date >= current_date`, this amount is frozen, like every other
-- column, once a season has ended.
alter table public.seasons
  add column cotisation_amount numeric(10, 2) check (cotisation_amount >= 0);
