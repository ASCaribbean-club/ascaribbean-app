import type { IsoDate } from '@domain/entities/unavailability'
import type { User } from '@domain/entities/user'
import { can } from '@domain/policies/can'
import type { TeamAvailabilityRepository } from '@domain/repositories/team-availability-repository'

export interface GetConvocationAvailabilityInput {
  user: User
  teamId: string
  // Day of the convocation; omitted = today (date not chosen yet).
  on?: IsoDate
}

// Why a player cannot be convoked. A medical unavailability is collapsed to
// 'unavailable' on purpose: a convocation screen must never show health
// detail, only that the player is out.
export interface ConvocationUnavailability {
  userId: string
  reason: 'unavailable' | 'suspended' | 'absent'
  // Free text of an 'absent' record only.
  detail: string | null
  // Exclusive bound: back on this day. Null for 'unavailable' (health) and
  // when no end date was given.
  returnOn: IsoDate | null
}

// Which players of a team are out on the day of a convocation, keyed by user
// id. Players who are available do not appear. A caller who may not read the
// team's availability (e.g. a section manager) gets {} — nobody is flagged,
// the database stays the authority on what can be created.
export class GetConvocationAvailabilityUseCase {
  constructor(private readonly repository: TeamAvailabilityRepository) {}

  async execute({ user, teamId, on }: GetConvocationAvailabilityInput): Promise<Record<string, ConvocationUnavailability>> {
    if (!can(user, 'availability:read-team', { teamId })) return {}

    const rows = await this.repository.listForTeam(teamId, on)
    const result: Record<string, ConvocationUnavailability> = {}
    for (const row of rows) {
      switch (row.status) {
        case 'available':
          break
        case 'medical':
        case 'unavailable':
          result[row.userId] = { userId: row.userId, reason: 'unavailable', detail: null, returnOn: null }
          break
        case 'suspended':
          result[row.userId] = { userId: row.userId, reason: 'suspended', detail: null, returnOn: row.endsOn }
          break
        case 'absent':
          result[row.userId] = { userId: row.userId, reason: 'absent', detail: row.reason, returnOn: row.endsOn }
          break
      }
    }
    return result
  }
}
