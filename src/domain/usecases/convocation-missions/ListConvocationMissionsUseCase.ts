import type { ConvocationMissionWithAssignees } from '@domain/entities/convocation-mission'
import type { ConvocationMissionRepository } from '@domain/repositories/convocation-mission-repository'

// specs/match-details-missions.md §2.4 — read only: no can() (RLS alone
// decides what is visible, criterion documented at the top of rbac-matrix.ts).
export class ListConvocationMissionsUseCase {
  constructor(private readonly missionRepository: ConvocationMissionRepository) {}

  execute(convocationId: string): Promise<ConvocationMissionWithAssignees[]> {
    return this.missionRepository.listForConvocation(convocationId)
  }
}
