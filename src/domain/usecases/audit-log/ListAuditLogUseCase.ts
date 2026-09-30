import type { AuditLogFilters, AuditLogPage, AuditLogRepository } from '../../repositories/audit-log-repository'
import { InvalidAuditLogFiltersError } from '../../errors/invalid-audit-log-filters-error'

export interface ListAuditLogInput {
  filters: AuditLogFilters
  page: number
}

// specs/web-audit-logs.md §2.6/§2.7 — a plain async function, no
// `useQuery`/Supabase import (ARCHITECTURE.md §6): the ViewModel's
// `queryFn` calls this, this calls the repository interface. The only logic
// that belongs here rather than in AuditLogRepositoryImpl is the one rule
// that has nothing to do with how the data is fetched — an inverted date
// range is a caller mistake, not a query result.
export class ListAuditLogUseCase {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async execute(input: ListAuditLogInput): Promise<AuditLogPage> {
    const { filters, page } = input

    // §2.6 — both bounds optional, but when both are set `from` must
    // precede `to` strictly: an equal or inverted pair would silently read
    // as "no rows in range" instead of the caller mistake it actually is.
    if (filters.from && filters.to && filters.from.getTime() >= filters.to.getTime()) {
      throw new InvalidAuditLogFiltersError('La date de début doit précéder la date de fin.')
    }

    // Sorting (occurredAt desc, §2.6) is the repository implementation's
    // job, applied unconditionally — nothing to decide here.
    return this.auditLogRepository.list(filters, page)
  }
}
