-- Player profile facts on public.users: age and handedness (droitier/
-- gaucher), backing domain/entities/user.ts's `age` and `Handedness`.
-- Both nullable — unknown until an admin sets them.
--
-- Written by ADMINS ONLY, through the create (invite-user Edge Function,
-- service_role) and edit (users_update_admin) dialogs. No new policy: the
-- existing users_update_admin policy already gates rows on
-- private.is_admin(); only the column-level grant below widens. Mirrors
-- 'user:write' (domain/policies/rbac-matrix.ts).

alter table public.users
  add column age smallint check (age between 1 and 120),
  add column handedness text check (handedness in ('right', 'left'));

-- Re-grant with the two new columns. A column-level GRANT UPDATE is
-- additive, so the set is restated in full here for readability — it
-- equals the previous (full_name) plus (age, handedness). email,
-- charter_accepted_at and position stay unwritable.
grant update (full_name, age, handedness) on public.users to authenticated;
