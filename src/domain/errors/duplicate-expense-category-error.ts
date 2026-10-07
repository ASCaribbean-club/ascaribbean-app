import { DomainError } from './domain-error'

// specs/mob-treasurer-finances.md AC-FI-13 — a category label already exists
// (case and accent insensitive). Thrown by CreateExpenseCategoryUseCase, and by
// data/errors/map-supabase-error.ts from expense_categories_label_key_unique.
export class DuplicateExpenseCategoryError extends DomainError {}
