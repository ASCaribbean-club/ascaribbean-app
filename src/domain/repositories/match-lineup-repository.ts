import type { Formation, LineupSlots, MatchLineup } from '../entities/match-lineup'

export interface MatchLineupRepository {
  // null when no lineup is recorded — AND, for a player token, when the
  // visibility window has not opened yet: the server returns nothing at all
  // before that instant (AC-MC-09), so the two cases are indistinguishable
  // here by design.
  findByConvocationId(convocationId: string): Promise<MatchLineup | null>

  // Upsert, last value wins (AC-MC-08): replaces formation and every slot.
  save(convocationId: string, formation: Formation, slots: LineupSlots): Promise<void>
}
