import type { DeclaredStatus } from '../../entities/convocation'
import type { PlayerPosition } from '../../entities/user'
import { summarizeRosterStatuses, type ResponseCounts } from '../../rules/convocation-rules'
import type { ConvocationRespondersRepository } from '../../repositories/convocation-responders-repository'
import type { ConvocationResponseRepository } from '../../repositories/convocation-response-repository'

export interface CoachRosterStatusItem {
  userId: string
  displayName: string
  position: PlayerPosition | null
  // Real tri-state status, not a boolean — PO-MD-03 (2026-08-28, décision
  // développeuse, specs/match_details_page.md §1 point 4 / §5). 'pending' for
  // a convoked player with no ConvocationResponse row yet, same "en attente,
  // jamais absent de la liste" rule as the player-facing badge, just with
  // the real value instead of a boolean (legitimate here — the coach is
  // authorized to see status, unlike the player, §2).
  status: DeclaredStatus
}

export interface ConvocationRosterForCoach {
  roster: CoachRosterStatusItem[]
  // Coach-only aggregate (AC-MD-06, AC-MD-10) — tallied from `roster` itself
  // (domain/rules/convocation-rules.ts summarizeRosterStatuses), not from
  // ConvocationResponse directly, so a non-responder's default 'pending'
  // status is counted instead of silently missing. Never AttendanceRecord.
  responseCounts: ResponseCounts
}

// specs/match_details_page.md §1 point 4, "Vue coach" (PO-MD-03) — combines
// two sources that each only have half the answer:
//   - ConvocationRespondersRepository gives the COMPLETE convoked roster
//     (identity + hasResponded), already completed for non-responders. Reuse
//     that completion instead of re-deriving "who's convoked" a second way.
//   - ConvocationResponseRepository.findByConvocation gives the REAL status,
//     but only for users who've actually responded (no row otherwise —
//     domain/entities/convocation.ts, "no materialization at creation").
export class GetConvocationRosterForCoachUseCase {
  constructor(
    private readonly convocationRespondersRepository: ConvocationRespondersRepository,
    private readonly convocationResponseRepository: ConvocationResponseRepository,
  ) { }

  async execute(convocationId: string): Promise<ConvocationRosterForCoach> {
    const [convocationResponders, responses] = await Promise.all([
      this.convocationRespondersRepository.listForConvocation(convocationId),
      this.convocationResponseRepository.findByConvocation(convocationId),
    ])

    const coachRosters = convocationResponders.map((convocationResponder) => {
      const userId = convocationResponder.userId
      const userResponse = responses.find((r) => r.userId === userId) ?? null

      return {
        userId: userId,
        displayName: convocationResponder.displayName,
        position: convocationResponder.position,
        status: userResponse?.status ?? 'pending'
      }
    }
    )

    return { roster: coachRosters, responseCounts: summarizeRosterStatuses(coachRosters) }
  }
}

