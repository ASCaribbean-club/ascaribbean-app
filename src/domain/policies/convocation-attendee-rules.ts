import type { Convocation, ConvocationType } from '../entities/convocation'
import type { CompetitionType } from '../entities/competition-type'

// specs/convocation-player-selection.md §2 — pure rules on the list of
// convoked players, no I/O. Mirrored MANUALLY in SQL (CLAUDE.md §7), rule names
// on both sides:
//   'convocation-attendees:official-match-cap' -> private.convocation_attendee_cap_check
//     (and private.match_details_competition_type_cap_check) in
//     supabase/migrations/20261012181248_convocation_attendees_schema.sql
//   'convocation_attendee:add' window          -> policy convocation_attendees_insert_add
//     (convocation open, before kickoff — PO-CPS-06, hypothesis)
// The database is the actual authority; these functions give the form and the
// use cases the same answer without a round trip.

// PO-CPS-04: one constant for every official match (only football exists).
// SQL side: the literal 14 in the trigger above.
export const MAX_OFFICIAL_MATCH_ATTENDEES = 14

// PO-CPS-10 (hypothesis): at least one convoked player to create.
export const MIN_ATTENDEES = 1

/**
 * The cap that applies to a convocation, or `null` when none does. Only an
 * official match is capped; a friendly match, a training and a meeting are not
 * (AC-CPS-07). A match whose competition type is not chosen yet has no cap
 * either (the form cannot be submitted anyway).
 */
export function getAttendeeCap(type: ConvocationType, competitionType: CompetitionType | null): number | null {
  return type === 'match' && competitionType === 'official' ? MAX_OFFICIAL_MATCH_ATTENDEES : null
}

/** "The number of convoked players respects the cap" — exactly the cap is allowed. */
export function isWithinAttendeeCap(count: number, type: ConvocationType, competitionType: CompetitionType | null): boolean {
  const cap = getAttendeeCap(type, competitionType)
  return cap === null || count <= cap
}

/** How many players are over the cap (0 when within it or when no cap applies). */
export function getAttendeeCapExcess(count: number, type: ConvocationType, competitionType: CompetitionType | null): number {
  const cap = getAttendeeCap(type, competitionType)
  return cap === null ? 0 : Math.max(0, count - cap)
}

/** True when one more attendee can still be added (strictly below the cap). */
export function canAddAnotherAttendee(currentCount: number, type: ConvocationType, competitionType: CompetitionType | null): boolean {
  const cap = getAttendeeCap(type, competitionType)
  return cap === null || currentCount < cap
}

export function hasMinimumAttendees(count: number): boolean {
  return count >= MIN_ATTENDEES
}

/**
 * PO-CPS-06 (hypothesis): a player can be added while the convocation is open
 * AND strictly before kickoff — a `now` exactly equal to the kickoff is already
 * "too late", same boundary as the SQL `c.date > now()`.
 */
export function isAttendeeAddWindowOpen(convocation: Pick<Convocation, 'status' | 'date'>, now: Date): boolean {
  return convocation.status === 'open' && now < new Date(convocation.date)
}

/** Whether `userId` is on the list of convoked players. */
export function isConvoked(userId: string, attendeeIds: string[]): boolean {
  return attendeeIds.includes(userId)
}
