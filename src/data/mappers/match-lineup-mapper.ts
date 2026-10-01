import type { LineupSlots, MatchLineup } from '@domain/entities/match-lineup'
import { LINEUP_SLOT_COUNT } from '@domain/entities/match-lineup'
import { isFormation } from '@domain/policies/match-lineup-rules'
import type { MatchLineupSlotDto } from '../dto/match-lineup-dto'

// No rows = no lineup (null). An unknown stored formation cannot happen (DB
// check constraint) but is treated as "no lineup" rather than trusted blindly.
export function toMatchLineup(convocationId: string, dtos: MatchLineupSlotDto[]): MatchLineup | null {
  if (dtos.length === 0) return null
  const formation = dtos[0].formation
  if (!isFormation(formation)) return null
  return {
    convocationId,
    formation,
    placements: dtos
      .map((dto) => ({ slotIndex: dto.slot_index, userId: dto.user_id, displayName: dto.display_name }))
      .sort((a, b) => a.slotIndex - b.slotIndex),
  }
}

// Domain slots -> the jsonb payload of save_match_lineup: only occupied
// slots are sent, free ones are simply absent.
export function toSaveSlotsPayload(slots: LineupSlots): { slot_index: number; user_id: string }[] {
  return slots
    .slice(0, LINEUP_SLOT_COUNT)
    .flatMap((userId, slotIndex) => (userId === null ? [] : [{ slot_index: slotIndex, user_id: userId }]))
}
