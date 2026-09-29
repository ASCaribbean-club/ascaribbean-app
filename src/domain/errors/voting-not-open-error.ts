import { DomainError } from './domain-error'

// specs/player-vote.md PO-PV-06(d) — thrown by CastVoteUseCase when
// isVotingOpen(convocation.date, now) is false. Domain-level, before any
// write, same "fail fast, RLS is defense-in-depth" shape as
// MatchNotStartedError — votes_insert_cast/votes_update_cast mirror the
// same c.date < now() condition server-side (supabase/migrations/
// 20260929120000_votes_opening_window.sql).
export class VotingNotOpenError extends DomainError {}
