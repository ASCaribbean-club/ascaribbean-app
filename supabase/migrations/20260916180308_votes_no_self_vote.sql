-- Player vote — resolves PO-PV-10b (specs/player-vote.md §5): self-voting
-- is NOT permitted (developer decision, 2026-09-16). Enforced at the base,
-- not just by filtering the candidate list client-side (CLAUDE.md §6 —
-- RLS/DB is the real security, the front-end is UX only).
--
-- Safe to add directly: `votes` is empty, the feature isn't live yet.
alter table public.votes
  add constraint votes_no_self_vote check (candidate_id <> voter_id);
