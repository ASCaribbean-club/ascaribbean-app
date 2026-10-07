import { DomainError } from './domain-error'

// specs/mob-treasurer-finances-edit.md AC-FIE-09 — deleting a category still
// referenced by an expense (any season). Thrown by data/errors/map-supabase-error.ts
// from the FK `on delete restrict` (23503), the last line of defence behind the
// "used" information the UI already hides the control with.
export class ExpenseCategoryInUseError extends DomainError {}
