import type { TrainingLocation } from '@domain/entities/training-location'
import type { CreateTrainingLocationInput, UpdateTrainingLocationInput } from '@domain/repositories/training-location-repository'
import type {
  TrainingLocationArchiveUpdateRow,
  TrainingLocationEmbedRow,
  TrainingLocationRow,
  TrainingLocationWriteRow,
} from '../dto/training-location-row'

// Accepts the embedded subset too (a convocation's joined venue) — same
// four domain fields either way; created_at is not part of the entity.
export function toTrainingLocation(row: TrainingLocationRow | TrainingLocationEmbedRow): TrainingLocation {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    isArchived: row.is_archived,
  }
}

export function toTrainingLocationWriteRow(input: CreateTrainingLocationInput | UpdateTrainingLocationInput): TrainingLocationWriteRow {
  return {
    name: input.name,
    address: input.address,
  }
}

export function toTrainingLocationArchiveUpdateRow(): TrainingLocationArchiveUpdateRow {
  return { is_archived: true }
}
