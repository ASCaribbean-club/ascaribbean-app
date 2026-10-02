-- Charte + droit à l'image — second consent captured at charter acceptance.
-- Both answers are required by the UI before activation, but the image-rights
-- choice is optional in substance (refusal doesn't block membership), so it is
-- stored as a boolean: true = authorises, false = refuses.
-- Nullable only for accounts activated before this column existed (unknown).
--
-- Like charter_accepted_at, written EXCLUSIVELY by accept_charter() — no
-- UPDATE policy on public.users covers it.

alter table public.users add column image_rights_consent boolean;

-- The signature changes, so the zero-arg version must be dropped first.
drop function if exists public.accept_charter();

create or replace function public.accept_charter(p_image_rights_consent boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.users
  set charter_accepted_at = now(),
      image_rights_consent = p_image_rights_consent
  where id = (select auth.uid())
    and charter_accepted_at is null;
$$;

revoke all on function public.accept_charter(boolean) from public;
grant execute on function public.accept_charter(boolean) to authenticated;
