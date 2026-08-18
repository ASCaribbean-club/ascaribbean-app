import type { Convocation } from '../../entities/convocation'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { ConvocationResponseRepository } from '../../repositories/convocation-response-repository'
import { isUpcoming, summarizeResponses, type ResponseCounts } from '../../rules/convocation-rules'

export interface ListUpcomingTeamConvocationsInput {
  teamId: string
  now: Date
}

export interface UpcomingConvocation {
  convocation: Convocation
  responseCounts: ResponseCounts
}

export class ListUpcomingTeamConvocationsUseCase {
  private readonly convocationRepository: ConvocationRepository
  private readonly convocationResponseRepository: ConvocationResponseRepository

  constructor(
    convocationRepository: ConvocationRepository,
    convocationResponseRepository: ConvocationResponseRepository,
  ) {
    this.convocationRepository = convocationRepository
    this.convocationResponseRepository = convocationResponseRepository
  }

  async execute(input: ListUpcomingTeamConvocationsInput): Promise<UpcomingConvocation[]> {
    const teamConvocations = await this.convocationRepository.listForTeam(input.teamId)
    const upcomingConvocations = teamConvocations.filter((convocation) =>
      isUpcoming(convocation, input.now),
    )

    // For each convocation, get the responses and reduce thems as count them by status
    const upcomingConvocationsWithCounts: UpcomingConvocation[] = await Promise.all(

      upcomingConvocations.map(async (convocation) => {
        const responses = await this.convocationResponseRepository.findByConvocation(convocation.id)

        const counts = summarizeResponses(responses)

        return { convocation: convocation, responseCounts: counts }
      })
    )

    return upcomingConvocationsWithCounts
  }
}
