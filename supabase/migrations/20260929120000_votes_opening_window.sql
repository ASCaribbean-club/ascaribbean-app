-- Player vote — resolves PO-PV-06(d) (specs/player-vote.md §5): voting only
-- opens once the match has kicked off (developer decision, 2026-09-29).
-- Mirrors CastVoteUseCase's own isVotingOpen check server-side — same
-- "domain check first, RLS as defense-in-depth" shape as
-- match_details_update_record_score's own c.date < now() condition
-- (20260925150603_edit_match_details_write_policy.sql, itself explained by
-- match-result-timing-rules.ts's comment: using/with check clauses aren't
-- bound by the IMMUTABLE restriction a CHECK constraint would be). The
-- 48h-after-match CLOSING half of PO-PV-06 stays open — this migration only
-- enforces the OPENING half.
--
-- Safe to alter directly: `votes` is empty, the feature isn't live yet
-- (same note as 20260916180308_votes_no_self_vote.sql).

drop policy votes_insert_cast on public.votes;

create policy votes_insert_cast on public.votes
  for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = votes.convocation_id
        and c.date < now()
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
        and private.is_player_of_team(c.team_id)
    )
  );
