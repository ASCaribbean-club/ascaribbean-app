import type { CardsSummary } from '@domain/entities/cards-summary'
import type { CardsSummaryDto } from '../dto/cards-summary-dto'

// CLAUDE.md §4 — mapper always present between DTO and entity.
export function toCardsSummary(dto: CardsSummaryDto): CardsSummary {
  return {
    yellowCount: dto.yellow_count,
    redCount: dto.red_count,
  }
}
