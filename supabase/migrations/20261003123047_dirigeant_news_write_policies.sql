-- Authorized-officer (Dirigeant habilité) write path on club_news —
-- specs/mobile-dirigeant-habilite.md §2 (AC-DH-21, PO-DH-02/04/14).
--
-- Adds exactly 3 policies on top of the existing ones, none of which is
-- touched: club_news_select_visible (read for every role, published and not
-- expired) and the three admin policies club_news_select_admin /
-- club_news_insert_admin / club_news_update_admin
-- (20260917082318_web_actus_news_write_policies.sql). PostgreSQL permissive
-- policies combine with OR, so the read result for the 6 other roles
-- (coach, player, treasurer, ...) is unchanged.
--
-- Mirrors domain/policies/rbac-matrix.ts: 'news:create' and 'news:update'
-- = ['admin', 'authorized-officer'] (manual mirror, never generated either
-- direction, CLAUDE.md §7). 'news:write' (['admin']) keeps guarding the
-- archive action and the backoffice console: the officer must NOT be able to
-- archive, which is why every status clause below is limited to
-- ('draft', 'published') — the database refuses an archive even if the UI
-- never offers it.
--
-- No delete policy (soft delete = status 'archived' = admin-only update).
--
-- NOTE (PO-DH-13): with policy (1) below, specs/actus.md AC-AT-05 ("read
-- identical across all roles") is literally false for a second role, after
-- the admin (PO-WA-01). Flagged for acceptance testing.
-- NOTE (PO-DH-14): select/update cover rows of ALL authors (default
-- retained). Restricting to own rows would add `created_by = auth.uid()`
-- to (1) and (3).

-- (1) mirrors 'news:update' (read needed to filter by status and to re-read a
-- draft): drafts and published rows (expired included) of all authors,
-- never 'archived'.
create policy club_news_select_authorized_officer on public.club_news
  for select to authenticated
  using (
    private.has_role('authorized-officer')
    and status in ('draft', 'published')
  );

-- (2) mirrors 'news:create' — created_by forced to the caller, status limited
-- to draft/published (no row can be created already archived).
create policy club_news_insert_authorized_officer on public.club_news
  for insert to authenticated
  with check (
    private.has_role('authorized-officer')
    and created_by = (select auth.uid())
    and status in ('draft', 'published')
  );

-- (3) mirrors 'news:update' — the officer may edit a draft/published row and
-- cannot move it to 'archived' (with check) nor touch an archived row
-- (using).
create policy club_news_update_authorized_officer on public.club_news
  for update to authenticated
  using (
    private.has_role('authorized-officer')
    and status in ('draft', 'published')
  )
  with check (
    private.has_role('authorized-officer')
    and status in ('draft', 'published')
  );
