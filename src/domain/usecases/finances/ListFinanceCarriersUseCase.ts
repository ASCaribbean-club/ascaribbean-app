import type { CarrierOption, FinanceRepository } from '../../repositories/finance-repository'

// specs/mob-treasurer-finances.md §2/AC-FI-31 — the carriers offered by the
// optional "Porteur" field of the payment forms. 'finances:read' is enforced
// by get_finance_carriers() (SQL).
export class ListFinanceCarriersUseCase {
  constructor(private readonly financeRepository: FinanceRepository) {}

  execute(): Promise<CarrierOption[]> {
    return this.financeRepository.listCarriers()
  }
}
