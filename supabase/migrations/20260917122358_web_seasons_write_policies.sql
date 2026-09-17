-- Backoffice write path on seasons — specs/web-seasons.md §2.5/§5 (AC-WS-01
-- through AC-WS-08).
--
-- Adds exactly 2 policies on top of the existing seasons_select_authenticated
-- (supabase/migrations/20260811171754_initial_schema.sql), which is NOT
-- touched, modified or replaced by this migration (AC-WS-02): every
-- authenticated role keeps reading every season, past ones included —
-- unlike club_news, there is no separate admin-only SELECT policy to add
-- here, the existing one already returns every row to every role (§2.5).
-- No delete policy either — specs/web-seasons.md §1/§2.5: no suppression or
-- archive control exists anywhere on /admin/seasons, this is not an
-- oversight to fill in later (PO-WS-06, AC-WS-21).
--
-- Mirrors domain/policies/rbac-matrix.ts's 'season:write': ['admin'] entry
-- (CLAUDE.md §7 — manual mirror, never generated either direction).
-- private.is_admin() already exists (20260811171754_initial_schema.sql) —
-- nothing new to create there. season_range, seasons_no_overlap and
-- current_season() are all untouched (AC-WS-08).

-- (1) specs/web-seasons.md §2.5 point 1, mirrors 'season:write'.
create policy seasons_insert_admin on public.seasons
  for insert to authenticated
  with check (private.is_admin());

-- (2) specs/web-seasons.md §2.5 point 2, mirrors 'season:write' AND the
-- "saison terminée non modifiable" domain rule (§2.3, the new 3-state
-- predicate in domain/policies/season-scope.ts) — this policy is where that
-- rule is ACTUALLY enforced, not the front end, which only hides the edit
-- pencil for UX (CLAUDE.md §6, "the front-end policy is UX only... never
-- treat a front-end check as sufficient"). `current_date` is evaluated by
-- Postgres here, never trusted from a client-supplied date (§2.3b) — a
-- forward-set client clock must never be able to open up a write this
-- policy would otherwise refuse.
--
-- Both clauses are required and do not say the same thing (§2.5):
--   `using`      — forbids TARGETING a season that has already ended.
--   `with check` — forbids PRODUCING, via the update itself, a row that has
--                  already ended (e.g. pushing end_date into the past in a
--                  single request, which would put it out of reach of any
--                  further edit).
-- end_date is an inclusive bound (season_range's '[]', §2.3c): a season
-- whose end_date is today is still "en cours", not "terminée", hence >=
-- rather than >.
create policy seasons_update_admin on public.seasons
  for update to authenticated
  using (private.is_admin() and end_date >= current_date)
  with check (private.is_admin() and end_date >= current_date);
