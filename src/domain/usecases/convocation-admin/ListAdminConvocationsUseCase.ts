import type { AdminConvocationFilters, AdminConvocationPage } from '@domain/entities/admin-convocation'
import type { AdminConvocationRepository } from '@domain/repositories/admin-convocation-repository'

export interface ListAdminConvocationsInput {
  filters: AdminConvocationFilters
  page: number // 0-based
  now: Date
}

// specs/web-create-convocation.md AC-WC-06 — filtering, ordering and
// pagination are the repository's (server-side); this only refuses a
// nonsensical page index. Authorization is RLS (admin reads club-wide) plus the
// 'backoffice:access' route guard, no matrix entry of its own.
export class ListAdminConvocationsUseCase {
  constructor(private readonly adminConvocationRepository: AdminConvocationRepository) {}

  execute(input: ListAdminConvocationsInput): Promise<AdminConvocationPage> {
    const page = Number.isInteger(input.page) && input.page > 0 ? input.page : 0
    return this.adminConvocationRepository.list(input.filters, page, input.now)
  }
}
