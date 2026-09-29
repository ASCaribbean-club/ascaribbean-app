import type { ResponseSummary } from '@domain/entities/response-summary'
import type { ResponseSummaryDto } from '../dto/response-summary-dto'

// CLAUDE.md §4 — mapper always present between DTO and entity.
export function toResponseSummary(dto: ResponseSummaryDto): ResponseSummary {
  return {
    convocatedCount: dto.convocated_count,
    respondedCount: dto.responded_count,
  }
}
