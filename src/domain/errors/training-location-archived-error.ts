import { DomainError } from './domain-error'

// specs/web-localizations.md §2.3/AC-WL-06/AC-WL-10 — a convocation cannot be
// created on an archived training location. The authority is the database
// (BEFORE INSERT trigger on convocations); data/errors/map-supabase-error.ts
// translates its error into this class so no raw Postgres text reaches a
// component.
export class TrainingLocationArchivedError extends DomainError {}
