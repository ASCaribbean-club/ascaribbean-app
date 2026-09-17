import { DomainError } from './domain-error'

// specs/web-actus.md §2.4/AC-WA-11 — thrown by CreateClubNewsUseCase /
// UpdateClubNewsUseCase when title, details or publishedAt is missing.
// "depuis le domaine (DomainError, pas une validation de composant)" — same
// minimal pattern as InvalidScheduleError, the class carries no logic of
// its own.
export class InvalidNewsInputError extends DomainError {}
