import type { Document } from '@domain/entities/document'
import type { DocumentRow } from '../dto/document-dto'

// CLAUDE.md §4 — a mapper is always present between DTO and entity, never
// skipped even for a table this small.
export function toDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    status: row.status,
  }
}
