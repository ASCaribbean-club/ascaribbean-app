import { DomainError } from '@domain/errors/domain-error'

// docs/specs/asc-legacy.md §4.9/§4.10 — thrown by the Legacy use cases when a
// manual award or a correction is invalid (rule not manual or not valid at the
// date, points off the rule, empty reason, ...). Rejected from domain/, before
// any network call; RLS refuses the same cases on the SQL side (AC-LG-07).
export class InvalidLegacyInputError extends DomainError {}
