import { DomainError } from './domain-error'

// specs/convocation-player-selection.md §4 — the convocation no longer accepts
// an additional convoked player: it is not open, kickoff has passed
// (PO-CPS-06) or the caller is not the coach of the team. Thrown by
// AddConvocationAttendeeUseCase for the window, and by
// data/errors/map-supabase-error.ts when the row-level policy
// convocation_attendees_insert_add refuses the insert.
export class ConvocationAttendeeAddRefusedError extends DomainError {}
