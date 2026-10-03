import type { Convocation, ConvocationType } from '../entities/convocation'
import { getResponseDeadline } from './response-deadline'

// Where a convocation being created sits relative to its own response window.
//   open            — created before the response deadline: players can respond.
//   response_closed — from the deadline (inclusive) to kickoff (exclusive):
//                     players could not respond, forbidden for EVERYONE.
//   retroactive     — from kickoff (inclusive) onward: allowed only with
//                     'convocation:create_retroactive' (admin).
export type ConvocationCreationWindow = 'open' | 'response_closed' | 'retroactive'

// `now` is always passed in (never read here) so every boundary is testable.
// The deadline is `getResponseDeadline`, shared with `canPlayerRespond`.
//
// Enforced in CreateConvocationUseCase only, NOT in RLS or a trigger — the
// same accepted risk as the player response deadline. The PERMISSION to
// create after kickoff, unlike this time window, is mirrored in RLS
// (convocations_insert_create, 'convocation:create_retroactive').
export function getConvocationCreationWindow(
  type: ConvocationType,
  startsAt: Date,
  now: Date,
): ConvocationCreationWindow {
  if (now >= startsAt) return 'retroactive'
  if (now >= getResponseDeadline(type, startsAt)) return 'response_closed'
  return 'open'
}

// Derived, never stored: a convocation is retroactive iff it was created at or
// after its own kickoff — nobody could ever respond to it, so it must not count
// against players' RESPONSE rate (attendance, a coach-confirmed fact, is
// unaffected). Manual mirror of the `c.created_at < c.date` filter on the
// response counters of get_team_presence_leaderboard
// (supabase/migrations/20261003165053_presence_leaderboard_exclude_retroactive.sql).
export function isRetroactiveConvocation(convocation: Pick<Convocation, 'date' | 'createdAt'>): boolean {
  return new Date(convocation.createdAt) >= new Date(convocation.date)
}
