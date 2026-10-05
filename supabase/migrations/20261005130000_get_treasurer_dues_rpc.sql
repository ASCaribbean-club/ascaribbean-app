-- Read model of the Treasurer's mobile cotisations views —
-- specs/mobile-treasurer.md §2/§3 (AC-TR-04, AC-TR-05).
--
-- Rule name: dues:read  (mirrors rbac-matrix.ts 'dues:read' =
-- ['treasurer', 'authorized-officer', 'admin']; this function is also the real
-- boundary, same shape as get_club_overview / get_team_roster). Read-only
-- pass (PO-TR-01 resolved): no insert/update policy is added anywhere. The
-- authorized-officer gets the same read, in read mode only (developer scope
-- update).
--
-- SECURITY DEFINER: RLS does not apply inside the body (memberships, users and
-- user_roles are readable one's own row only; memberships_select_own and the
-- other policies are NOT modified), so the explicit role check below is the
-- authorization boundary. Anyone who is neither treasurer, authorized-officer nor admin gets
-- SQLSTATE 42501. No parameter to forge.
--
-- Returns the FINANCIAL slice only: membership id, display name, amount due,
-- section(s), payments. NEVER licence_number, status, valid_until or e-mail
-- (the Treasurer is "financier seulement" on member files).
--
-- Scope: current season (current_season(), decided by Postgres) and
-- non-archived memberships.
--
-- Section attachment (PO-TR-02, resolved by the developer's default):
-- memberships carry no section, so it is derived from user_roles
-- (role = 'player', team_id) -> teams.section_id on the membership's season.
-- A member with no such team gets '[]' ("Sans section" on the client); a
-- member who is a player in two sections gets both (counted in each).
create or replace function public.get_treasurer_dues()
returns table (
  membership_id uuid,
  member_name text,
  amount_due_cents integer,
  sections jsonb,
  payments jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- dues:read
  if not (
    private.has_role('treasurer')
    or private.has_role('authorized-officer')
    or private.is_admin()
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    m.id as membership_id,
    u.full_name as member_name,
    m.amount_due_cents as amount_due_cents,
    coalesce(
      (select jsonb_agg(distinct jsonb_build_object('id', s.id, 'name', s.name))
         from public.user_roles ur
         join public.teams t on t.id = ur.team_id
         join public.sections s on s.id = t.section_id
        where ur.user_id = m.user_id
          and ur.role = 'player'
          and t.season_id = m.season_id),
      '[]'::jsonb
    ) as sections,
    coalesce(
      (select jsonb_agg(
                jsonb_build_object('id', p.id, 'amount_cents', p.amount_cents, 'paid_at', p.paid_at)
                order by p.paid_at desc, p.recorded_at desc)
         from public.membership_payments p
        where p.membership_id = m.id),
      '[]'::jsonb
    ) as payments
  from public.memberships m
  join public.users u on u.id = m.user_id
  where m.season_id = (select cs.id from public.current_season() cs)
    and m.archived_at is null
  order by u.full_name;
end;
$$;

revoke all on function public.get_treasurer_dues() from public;
grant execute on function public.get_treasurer_dues() to authenticated;
