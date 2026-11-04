import { DomainError } from './domain-error'

// DuplicateTrainingUseCase creates the copies one after the other, so a
// failure on copy N leaves copies 1..N-1 in place. This error carries the
// counts so the screen can say exactly what was and wasn't created.
export class TrainingDuplicationIncompleteError extends DomainError {
  constructor(
    message: string,
    readonly createdCount: number,
    readonly requestedCount: number,
    readonly firstFailedDate: string,
    readonly reason: unknown,
  ) {
    super(message)
  }
}
