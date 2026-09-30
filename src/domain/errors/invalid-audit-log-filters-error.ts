import { DomainError } from './domain-error'

// specs/web-audit-logs.md §2.6 — thrown by
// domain/usecases/audit-log/ListAuditLogUseCase.ts when both date bounds
// are set and `from` is not strictly before `to`. No Postgres constraint
// backs this (the two bounds reach `audit_log_entries` as two independent
// `gte`/`lt` predicates, never a single column comparison) — left
// unvalidated, an inverted range would just silently return zero rows
// instead of surfacing as a mistake. Same minimal pattern as
// InvalidScheduleError/InvalidSeasonInputError, no logic of its own.
export class InvalidAuditLogFiltersError extends DomainError {}
