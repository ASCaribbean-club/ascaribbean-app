import type { FinancesSnapshot } from '../../entities/finance'
import type { FinanceRepository } from '../../repositories/finance-repository'

// specs/mob-treasurer-finances.md AC-FI-27 — ONE aggregated read (never one
// request per carrier or category). Authorization is the database function's
// own role check ('finances:read', get_finances_snapshot()); presentation/
// additionally gates the route with can(user, 'finances:read'). Balances and
// totals are computed from this snapshot by domain/rules/finance-rules.ts.
export class GetFinancesUseCase {
  constructor(private readonly financeRepository: FinanceRepository) {}

  execute(): Promise<FinancesSnapshot> {
    return this.financeRepository.getSnapshot()
  }
}
