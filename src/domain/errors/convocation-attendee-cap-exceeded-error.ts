import { DomainError } from './domain-error'

// specs/convocation-player-selection.md §2 / AC-CPS-06 — an official match
// cannot hold more than MAX_OFFICIAL_MATCH_ATTENDEES convoked players. Thrown
// by CreateConvocationUseCase / AddConvocationAttendeeUseCase, and by
// data/errors/map-supabase-error.ts when the database trigger refuses
// (message 'convocation_attendee_cap_exceeded').
export class ConvocationAttendeeCapExceededError extends DomainError {}
