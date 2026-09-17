import { DomainError } from './domain-error'

// specs/web-seasons.md §2.4/AC-WS-10 — thrown by CreateSeasonUseCase /
// UpdateSeasonUseCase, from the domain and before any network call, when
// label/startDate/endDate is missing OR when startDate is after endDate.
// The last case has no Postgres CHECK constraint behind it — left
// unvalidated it would fail daterange construction with an error code
// map-supabase-error.ts doesn't recognize, falling through its `default`
// branch to a mismapped NotFoundError (§2.4). Same minimal pattern as
// InvalidNewsInputError, the class carries no logic of its own.
export class InvalidSeasonInputError extends DomainError {}
