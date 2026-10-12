import { DomainError } from './domain-error'

// specs/player-vote.md PO-PV-06 (closing half, developer decision
// 2026-10-12) — thrown by CastVoteUseCase when isVotingClosed(convocation.date,
// now) is true. RLS mirrors the same window server-side (supabase/migrations/
// 20261012090240_votes_closing_window.sql).
export class VotingClosedError extends DomainError {}
