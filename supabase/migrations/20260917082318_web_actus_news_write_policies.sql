-- Backoffice write path on club_news — specs/web-actus.md §2.3/§5 (AC-WA-01
-- through AC-WA-07).
--
-- Adds exactly 3 policies on top of the existing club_news_select_visible
-- (supabase/migrations/20260904205258_club_news.sql), which is NOT touched,
-- modified or replaced by this migration: PostgreSQL permissive policies
-- combine with OR, so the read result for the 7 non-admin roles is
-- unchanged (AC-WA-02). No delete policy is created — specs/web-actus.md
-- §1 "Hors périmètre": no deletion/archiving control exists anywhere on the
-- /admin/news screen, this isn't an oversight to fill in later (PO-WA-06).
--
-- Mirrors domain/policies/rbac-matrix.ts's 'news:write': ['admin'] entry
-- (CLAUDE.md §7 — manual mirror, never generated either direction).
-- private.is_admin() already exists (20260811171754_initial_schema.sql) —
-- nothing new to create there.
--
-- 2026-09-17 developer decision (resolves PO-WA-06, amends the "hors
-- périmètre" note above): "Supprimer" on a row is a SOFT delete — the
-- ArchiveClubNewsUseCase sets status = 'archived', nothing more. That's an
-- UPDATE, already covered by policy (3) below — still no `delete` policy on
-- this table, and none is needed for this feature.
--
-- NOTE (PO-WA-01, specs/web-actus.md §2.3): policy (1) below makes
-- specs/actus.md's AC-AT-05 literally false for an admin token (that
-- criterion claims the read result is identical across all 8 roles). The
-- underlying intent of AC-AT-05 — the MOBILE feed doesn't vary by role — is
-- still true; only the wording needs an amendment, which specs/actus.md
-- itself is not modified to carry in this pass (see that spec's header).
-- Flagged here so it isn't missed in an RLS audit.

-- (1) specs/web-actus.md §2.3 point 1, mirrors 'news:write' — actually this
-- is a READ, not a write, but it exists FOR the write console: the mockup's
-- list shows an "Expirée" row that club_news_select_visible alone would
-- never return. Additive: combines with club_news_select_visible via OR.
create policy club_news_select_admin on public.club_news
  for select to authenticated
  using (private.is_admin());

-- (2) specs/web-actus.md §2.3 point 2, mirrors 'news:write' — created_by is
-- forced to the authenticated caller, never trusted from the client
-- (AC-WA-05).
create policy club_news_insert_admin on public.club_news
  for insert to authenticated
  with check (private.is_admin() and created_by = (select auth.uid()));

-- (3) specs/web-actus.md §2.3 point 3, mirrors 'news:write' — no "own row"
-- restriction: an admin may edit a row authored by a different admin, the
-- mockup's edit pencil renders on every row with no author column to
-- restrict by. Also backs the archive/soft-delete action (see note above):
-- ArchiveClubNewsUseCase's `update({ status: 'archived' })` is just another
-- caller of this same policy, not a separate grant.
create policy club_news_update_admin on public.club_news
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());
