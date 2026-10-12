-- Player vote — closing half of PO-PV-06 (specs/player-vote.md §5): a vote is
-- accepted from kickoff until kickoff + 1 hour + 3 days (developer decision,
-- 2026-10-12). Mirrors, MANUALLY, domain/policies/player-vote-rules.ts
-- isVotingClosed / getVotingDeadline (VOTING_DEADLINE_DAYS = 3,
-- VOTING_DEADLINE_START_OFFSET_HOURS = 1) and CastVoteUseCase's
-- VotingClosedError. Same strict comparison, server clock. The opening
-- condition (c.date < now()) is unchanged from
-- 20260929120000_votes_opening_window.sql.

drop policy votes_insert_cast on public.votes;

create policy votes_insert_cast on public.votes
  for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = votes.convocation_id
        and c.date < now()
        and now() < c.date + interval '1 hour' + interval '3 days'
        and private.is_player_of_team(c.team_id)
    )
  );

drop policy votes_update_cast on public.votes;

create policy votes_update_cast on public.votes
  for update to authenticated
  using (voter_id = (select auth.uid()))
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = votes.convocation_id
        and c.date < now()
        and now() < c.date + interval '1 hour' + interval '3 days'
        and private.is_player_of_team(c.team_id)
    )
  );
