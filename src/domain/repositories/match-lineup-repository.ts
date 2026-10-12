import type { Formation, LineupJerseyNumbers, LineupSlots, MatchLineup } from '../entities/match-lineup'

export interface MatchLineupRepository {
  // null when no lineup is recorded — AND, for a player token, when the
  // visibility window has not opened yet: the server returns nothing at all
  // before that instant (AC-MC-09), so the two cases are indistinguishable
  // here by design.
  findByConvocationId(convocationId: string): Promise<MatchLineup | null>

  // Upsert, last value wins (AC-MC-08): replaces formation and every slot.
  // `jerseyNumbers` is keyed by user id; only placed players' entries are
  // persisted (AC-MC-27). Never writes to memberships.
  save(convocationId: string, formation: Formation, slots: LineupSlots, jerseyNumbers: LineupJerseyNumbers): Promise<void>

  // AC-MC-26/PO-MC-16 — default numbers of the convoked pool, from each
  // player's membership for the season containing the convocation's date.
  // Players without a number (or without a season/membership) are simply
  // absent. Restricted to the lineup writer by the database.
  listDefaultJerseyNumbers(convocationId: string): Promise<Record<string, number>>
}
