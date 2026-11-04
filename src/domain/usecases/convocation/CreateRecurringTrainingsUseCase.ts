import type { Convocation } from '@domain/entities/convocation'
import { InvalidConvocationInputError } from '@domain/errors/invalid-convocation-input-error'
import { TrainingDuplicationIncompleteError } from '@domain/errors/training-duplication-incomplete-error'
import {
  computeTrainingOccurrences,
  isRecurrenceEndAllowed,
  MAX_RECURRENCE_MONTHS,
  type TrainingRecurrenceFrequency,
} from '@domain/policies/training-recurrence'
import type { CreateConvocationUseCase, CreateTrainingConvocationInput } from './CreateConvocationUseCase'

export interface CreateRecurringTrainingsInput {
  // The first training; the copies reuse its team, venue, time of day and
  // convoked players.
  training: CreateTrainingConvocationInput
  frequency: TrainingRecurrenceFrequency
  // Last calendar day (inclusive) a copy may fall on, at most 3 months after
  // the first training.
  until: Date
}

// Creates a training and its repetitions (admin form "Répéter"). Every
// training goes through CreateConvocationUseCase, so authorization, creation
// window and the venue-archived refusal stay defined in one place. They are
// created in date order and the run stops at the first refusal; what was
// already created stays (TrainingDuplicationIncompleteError carries the counts).
// Returns the created trainings, the first one included.
export class CreateRecurringTrainingsUseCase {
  constructor(private readonly createConvocationUseCase: CreateConvocationUseCase) { }

  async execute(input: CreateRecurringTrainingsInput): Promise<Convocation[]> {
    const startsAt = new Date(input.training.date)

    if (!isRecurrenceEndAllowed(startsAt, input.until)) {
      throw new InvalidConvocationInputError(`Repetitions cannot extend more than ${MAX_RECURRENCE_MONTHS} months after the training`)
    }
    const copies = computeTrainingOccurrences(startsAt, input.frequency, input.until)
    if (copies.length === 0) {
      throw new InvalidConvocationInputError('The end date leaves no repetition to create')
    }

    const dates = [startsAt, ...copies]
    const created: Convocation[] = []
    for (const date of dates) {
      try {
        created.push(await this.createConvocationUseCase.execute({ ...input.training, date: date.toISOString() }))
      } catch (error) {
        // Nothing created yet: the original refusal is the useful signal
        // (forbidden, window closed, venue archived...).
        if (created.length === 0) throw error
        throw new TrainingDuplicationIncompleteError(
          `Created ${created.length} of ${dates.length} trainings, failed on ${date.toISOString()}`,
          created.length,
          dates.length,
          date.toISOString(),
          error,
        )
      }
    }
    return created
  }
}
