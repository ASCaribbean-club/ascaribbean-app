import { DomainError } from './domain-error'

// specs/web-create-convocation.md §3/AC-WC-18/AC-WC-23 — a convocation can no
// longer be modified: it is past or no longer 'open' (window
// `date > now() and status = 'open'`). Thrown by UpdateConvocationUseCase at
// the instant of the write, and by data/errors/map-supabase-error.ts when the
// database refuses for the same reason (message 'convocation_not_editable').
export class ConvocationNotEditableError extends DomainError {}
