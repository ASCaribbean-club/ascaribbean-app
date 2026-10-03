-- 'convocation:delete' : ['coach'] (domain/policies/rbac-matrix.ts) — manual
-- mirror, never generated. A coach may delete an UPCOMING, open convocation of
-- one of their own teams. Satellites (match_details, responses, attendance,
-- lineups, missions, votes) are removed by their ON DELETE CASCADE foreign keys.
-- The DELETE grant on public.convocations already exists (initial schema).

create policy convocations_delete_coach on public.convocations
  for delete to authenticated
  using (
    private.is_coach_of_team(team_id)
    and date > now()
    and status = 'open'
  );
