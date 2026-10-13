import { byDateAscending, isUpcoming } from '@/domain/rules/convocation-rules'
import type { Convocation, ConvocationResponse } from '@/domain/entities/convocation'
import type { ConvocationAttendeeRepository } from '@/domain/repositories/convocation-attendee-repository'
import type { ConvocationRepository } from '@/domain/repositories/convocation-repository'
import type { ConvocationResponseRepository } from '@/domain/repositories/convocation-response-repository'
import type { AssembleConvocationDetailFieldsUseCase, ConvocationDetailFields } from '@/domain/usecases/convocation/AssembleConvocationDetailFieldsUseCase'
import type { GetConvocationDetailsUseCase } from '@/domain/usecases/convocation/GetConvocationDetailsUseCase'

export interface ListConvocationsForPlayerInput {
  teamId: string
  userId: string
  now: Date
  includePast?: boolean
}

export interface ConvocationForPlayer extends ConvocationDetailFields {
  convocation: Convocation
  // The player's OWN declared intent for this convocation — never an
  // aggregate across the team (PO-PD-05, AC-PD-09 — contrast with
  // ListTeamConvocationsUseCase's `responseCounts`) and never an
  // AttendanceRecord (AC-PD-03). `null` means no response row exists yet,
  // which is a distinct state from a ConvocationResponse whose `status`
  // happens to be 'pending' (domain/entities/convocation.ts, DeclaredStatus).
  myResponse: ConvocationResponse | null
  // specs/convocation-player-selection.md PO-CPS-03 (hypothesis) — false when
  // the player is not on the list of convoked players of this convocation:
  // not "à répondre", no response buttons.
  isConvoked: boolean
}

export class ListUpcomingConvocationsForPlayerUseCase {
  constructor(
    private readonly convocationRepository: ConvocationRepository,
    private readonly convocationResponseRepository: ConvocationResponseRepository,
    private readonly assembleConvocationDetailFieldsUseCase: AssembleConvocationDetailFieldsUseCase,
    private readonly getConvocationDetailsUseCase: GetConvocationDetailsUseCase,
    private readonly convocationAttendeeRepository: ConvocationAttendeeRepository,
  ) { }

  async execute(input: ListConvocationsForPlayerInput): Promise<ConvocationForPlayer[]> {
    // Despite the name, `input.includePast` means this set is not
    // exclusively upcoming convocations (specs/calendar.md PO-CA-02) —
    // same reasoning as ListTeamConvocationsUseCase's own scopedConvocations.
    const scopedConvocations = (await this.convocationRepository.listForTeam(input.teamId))
      .filter((convocation) => input.includePast ? true : isUpcoming(convocation, input.now))
      .sort(byDateAscending)

    // One read for the whole set: which of these convocations the player is
    // convoked to.
    const convokedIds = new Set(
      await this.convocationAttendeeRepository.listConvokedConvocationIds(
        input.userId,
        scopedConvocations.map((convocation) => convocation.id),
      ),
    )

    return await Promise.all(scopedConvocations.map(async (convocation) => {
      const details = convocation.type === 'training' // TODO To remove when training will be mapped
        ? null
        : await this.getConvocationDetailsUseCase.execute(convocation)

      const detailFields = await this.assembleConvocationDetailFieldsUseCase.execute(convocation, details)

      const myResponse = await this.convocationResponseRepository.findByConvocationAndUser(convocation.id, input.userId)
      return {
        convocation: convocation,
        myResponse: myResponse,
        isConvoked: convokedIds.has(convocation.id),
        ...detailFields,
      }
    }))
  }
}

