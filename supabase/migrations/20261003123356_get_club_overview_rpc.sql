-- Club-wide counters for the Dirigeant dashboard tiles —
-- specs/mobile-dirigeant-habilite.md §2 "Compteurs" (PO-DH-05, AC-DH-19).
--
-- Rule name: club:view-overview  (no rbac-matrix.ts entry — this function IS
-- the boundary, same shape as get_team_roster / get_my_attendance_summary /
-- leaderboard:view-team-counts).
--
-- SECURITY DEFINER: RLS does not apply inside the body (memberships is
-- readable one's own row only, memberships_select_own is NOT modified), so
-- the explicit role check below is the authorization boundary. Anyone who is
-- neither authorized-officer nor admin gets SQLSTATE 42501.
--
-- Returns INTEGERS ONLY, no parameter to forge: no membership row, no payment
-- status, no amount, no identifier (AC-DH-19).
--
-- Counting rules (PO-DH-06 is OPEN — these are the defaults, to be confirmed
-- by the Bureau):
--   * sections_count: every row of public.sections.
--   * members_count: distinct users holding an active membership of the
--     current season (status 'active', valid_until >= current_date,
--     archived_at is null) — same notion of "licencié" as
--     team_active_headcount, club-wide.
create or replace function public.get_club_overview()
returns table (
  sections_count integer,
  members_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_role('authorized-officer') or private.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.sections)::integer as sections_count,
    (select count(distinct m.user_id)
       from public.memberships m
      where m.season_id = (select id from public.current_season())
        and m.status = 'active'
        and m.valid_until >= current_date
        and m.archived_at is null)::integer as members_count;
end;
$$;

revoke all on function public.get_club_overview() from public;
grant execute on function public.get_club_overview() to authenticated;
