import type { AdminFinanceCarrier } from '../../entities/finance'
import type { FinanceCarrierRepository } from '../../repositories/finance-carrier-repository'

// specs/web-finance-carriers.md §2.4 — read only, RLS-only (no matrix entry:
// the existing finance_carriers_select already admits the admin). Ordered by
// the repository (kind, then label); never re-sorted by the page.
export class ListFinanceCarriersForAdminUseCase {
  constructor(private readonly financeCarrierRepository: FinanceCarrierRepository) {}

  execute(): Promise<AdminFinanceCarrier[]> {
    return this.financeCarrierRepository.listForAdmin()
  }
}
