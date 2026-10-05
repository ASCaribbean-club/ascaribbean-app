import { DomainError } from './domain-error'

// specs/mobile-treasurer.md amendement (4) — thrown by
// SendDuesRemindersUseCase when no membership id is given or the batch
// exceeds MAX_REMINDER_BATCH_SIZE.
export class InvalidDuesReminderInputError extends DomainError {}
