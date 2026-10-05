-- Payment method on membership_payments + get_treasurer_dues() extended to
-- return it — specs/mobile-treasurer.md (amendement "moyen de paiement").
-- New file: neither this nor 20261005130000 is edited after being applied.
--
-- Constant referential, NO lookup table: mirrors by hand
-- src/domain/entities/payment-method.ts PAYMENT_METHODS
-- ('card', 'transfer', 'other') — change both together (CLAUDE.md §7).
-- TEXT, nullable (existing rows have no method). No new policy: the existing
-- membership_payments_insert_admin ('payment:record') already covers the new
-- column; there is still no update/delete policy.
alter table public.membership_payments
  add column payment_method text
  constraint membership_payments_payment_method_check
  check (payment_method in ('card', 'transfer', 'other'));

-- The return type changes, so the function must be dropped first
-- (create or replace cannot alter a return table).
drop function if exists public.get_treasurer_dues();

-- Same body and rule as 20261005130000_get_treasurer_dues_rpc.sql
-- (dues:read, financial slice only), plus payment_method per payment.
create function public.get_treasurer_dues()
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
                jsonb_build_object(
                  'id', p.id,
                  'amount_cents', p.amount_cents,
                  'paid_at', p.paid_at,
                  'payment_method', p.payment_method)
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
