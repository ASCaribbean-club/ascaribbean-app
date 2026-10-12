import type { ConvocationResponseCountsRepository } from '../../repositories/convocation-response-counts-repository'
import type { ResponseCounts } from '../../rules/convocation-rules'

// Player-facing ✓/✗/? tally for one convocation (Effectif tab, player
// variant) — numbers only, never the roster's individual statuses.
export class GetConvocationResponseCountsUseCase {
  constructor(private readonly convocationResponseCountsRepository: ConvocationResponseCountsRepository) { }

  async execute(convocationId: string): Promise<ResponseCounts> {
    const countsByConvocationId = await this.convocationResponseCountsRepository.countForConvocations([convocationId])
    return countsByConvocationId[convocationId] ?? { present: 0, absent: 0, pending: 0 }
  }
}
