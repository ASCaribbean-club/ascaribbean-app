-- Dirigeant habilité (authorized-officer): declare / edit / lift a SUSPENSION,
-- club-wide. Medical stays coach-only (health data, GDPR art. 9).
--
-- Mirrors domain/policies/rbac-matrix.ts 'availability:declare-suspension'
-- (['coach', 'authorized-officer']). The coach side is unchanged
-- (unavailabilities_insert_coach / unavailabilities_update_coach in
-- 20261001175044_player_unavailability.sql); these three policies are OR-ed
-- with them (permissive).
--
-- - SELECT: the officer must read the active suspension to pre-fill the edit
--   sheet. Restricted to kind = 'suspension': a suspension is not health data
--   and its dates are already visible to them through get_team_availability.
--   They get NO policy on medical rows.
-- - INSERT/UPDATE: kind = 'suspension' in both USING and WITH CHECK, so an
--   officer can neither create nor touch a medical row. The column grant
--   (kind, user_id, declared_by frozen) is unchanged.
-- - INSERT also requires the target to be a player of some team.
--
-- NOT APPLIED by the agent that wrote it: to be reviewed and applied by the
-- developer. After applying, rename the file to the timestamp recorded remotely.

-- rbac: 'availability:declare-suspension' (lecture préalable à l'édition).
create policy unavailabilities_select_officer_suspension on public.unavailabilities
  for select to authenticated
  using (kind = 'suspension' and private.has_role('authorized-officer'));

-- rbac: 'availability:declare-suspension' (déclaration).
create policy unavailabilities_insert_officer_suspension on public.unavailabilities
  for insert to authenticated
  with check (
    kind = 'suspension'
    and declared_by = (select auth.uid())
    and private.has_role('authorized-officer')
    and exists (
      select 1 from public.user_roles player
      where player.user_id = unavailabilities.user_id and player.role = 'player'
    )
  );

-- rbac: 'availability:declare-suspension' (modification / levée).
create policy unavailabilities_update_officer_suspension on public.unavailabilities
  for update to authenticated
  using (kind = 'suspension' and private.has_role('authorized-officer'))
  with check (kind = 'suspension' and private.has_role('authorized-officer'));
