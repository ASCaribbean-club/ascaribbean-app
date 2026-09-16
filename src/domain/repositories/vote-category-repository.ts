import type { VoteCategory, VoteCategoryId } from '@domain/entities/vote'

// Reference-data read for `public.vote_categories` — a category's own label
// is a database value (PO-PV-03), never duplicated as a hardcoded constant
// in presentation/.
export interface VoteCategoryRepository {
  findById(id: VoteCategoryId): Promise<VoteCategory | null>
}
