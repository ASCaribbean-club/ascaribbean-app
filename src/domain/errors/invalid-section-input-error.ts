import { DomainError } from './domain-error'

// specs/section-and-teams.md §2.5/AC-ST-11 — thrown by CreateSectionUseCase/
// UpdateSectionUseCase, from the domain and before any network call, when
// name is empty/whitespace-only or type is outside SECTION_TYPES. Same
// minimal pattern as InvalidSeasonInputError/InvalidNewsInputError, the
// class carries no logic of its own.
export class InvalidSectionInputError extends DomainError {}
