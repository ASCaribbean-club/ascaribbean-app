import type { VoteCategory } from '@domain/entities/vote'
import type { VoteCategoryRow } from '../dto/vote-category-row'

// CLAUDE.md §4 — a mapper is always present between DTO and entity, never
// skipped, even for a table this small.
export function toVoteCategory(row: VoteCategoryRow): VoteCategory {
  return {
    id: row.id,
    label: row.label,
  }
}
