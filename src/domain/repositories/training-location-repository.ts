import type { TrainingLocation } from '../entities/training-location'

// specs/web-localizations.md §2.5 — deliberately NO delete method (PO-WL-03):
// archiving is the only way a location leaves the selector.
export interface TrainingLocationRepository {
  // Admin list: every row, archived included. Ordering (PO-WL-07 default):
  // alphabetical by name, archived rows last.
  findAll(): Promise<TrainingLocation[]>

  // Selector options for the convocation form: non-archived rows only,
  // alphabetical by name. The "not archived" filter is a query filter, not
  // an RLS restriction (§2.4) — RLS lets every authenticated account read
  // every row so a convocation's location can always be resolved.
  findAvailable(): Promise<TrainingLocation[]>

  create(input: CreateTrainingLocationInput): Promise<TrainingLocation>
  update(id: string, input: UpdateTrainingLocationInput): Promise<TrainingLocation>

  // Sets is_archived = true. Idempotent: archiving an already archived row
  // succeeds (§2.5).
  archive(id: string): Promise<TrainingLocation>
}

export type CreateTrainingLocationInput = Pick<TrainingLocation, 'name' | 'address'>
export type UpdateTrainingLocationInput = Pick<TrainingLocation, 'name' | 'address'>
