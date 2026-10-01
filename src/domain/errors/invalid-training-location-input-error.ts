import { DomainError } from './domain-error'

// specs/web-localizations.md §2.5/AC-WL-08 — thrown by
// CreateTrainingLocationUseCase / UpdateTrainingLocationUseCase, from the
// domain and before any network call, when name or address is empty once
// trimmed. Same minimal pattern as InvalidSeasonInputError.
export class InvalidTrainingLocationInputError extends DomainError {}
