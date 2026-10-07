import type { TreasuryCheckpointDetail } from '../../entities/finance'
import { ForbiddenError } from '../../errors/forbidden-error'
import { NotFoundError } from '../../errors/not-found-error'
import { can } from '../../policies/can'
import type { FinanceRepository } from '../../repositories/finance-repository'
import type { UserRepository } from '../../repositories/user-repository'

// specs/mob-treasurer-finances-edit.md §2 (PO-FIE-04) — dedicated read of ONE
// point, debrief included, for the correction sheet only. Gated by
// 'treasury_checkpoint:update' (no new action): the aggregated snapshot still
// omits the debrief on purpose.
export class GetTreasuryCheckpointDetailUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly financeRepository: FinanceRepository,
  ) {}

  async execute(input: { actorId: string; checkpointId: string }): Promise<TreasuryCheckpointDetail> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)
    if (!can(user, 'treasury_checkpoint:update')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to read a checkpoint for correction`)
    }

    const detail = await this.financeRepository.getTreasuryCheckpointDetail(input.checkpointId)
    if (!detail) throw new NotFoundError(`Treasury checkpoint not found: ${input.checkpointId}`)
    return detail
  }
}
