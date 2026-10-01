import type { IsoDate } from '@domain/entities/unavailability'
import type { User } from '@domain/entities/user'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import type { AvailabilityStatus, TeammateAvailabilityStatus } from '@domain/policies/availability'
import { toTeammateStatus } from '@domain/policies/availability'
import { can } from '@domain/policies/can'
import type { TeamAvailabilityRepository } from '@domain/repositories/team-availability-repository'

export interface GetTeamAvailabilityInput {
  user: User
  teamId: string
}

export interface CoachAvailabilityEntry {
  userId: string
  displayName: string
  status: AvailabilityStatus
  startsOn: IsoDate | null
  endsOn: IsoDate | null
}

// No `medical` variant and no medical dates can be expressed in this type:
// the view cannot show more than it receives (specs/player-unavailability.md
// UI design §3, AC-01).
export interface TeammateAvailabilityEntry {
  userId: string
  displayName: string
  status: TeammateAvailabilityStatus
  startsOn: IsoDate | null
  endsOn: IsoDate | null
}

export type TeamAvailability =
  | { view: 'coach'; entries: CoachAvailabilityEntry[] }
  | { view: 'teammate'; entries: TeammateAvailabilityEntry[] }

// specs/player-unavailability.md §2/§3 — the team list read. The repository
// (RPC) already projects per caller; this use case enforces
// 'availability:read-team' for the team and applies toTeammateStatus AGAIN for
// the player view as defence in depth (UX layer — RLS/RPC is the real
// security): even if a repository ever handed back 'medical', a player view
// reduces it to 'unavailable' and drops its dates.
export class GetTeamAvailabilityUseCase {
  constructor(private readonly repository: TeamAvailabilityRepository) {}

  async execute({ user, teamId }: GetTeamAvailabilityInput): Promise<TeamAvailability> {
    if (!can(user, 'availability:read-team', { teamId })) {
      throw new ForbiddenError('availability:read-team is not granted for this team')
    }

    const rows = await this.repository.listForTeam(teamId)
    const sorted = [...rows].sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'))

    // Same rule as the RPC: coach of the team wins over player.
    const isCoachOfTeam = user.roles.some((r) => r.role === 'coach' && r.teamIds.includes(teamId))

    if (isCoachOfTeam) {
      return {
        view: 'coach',
        entries: sorted.map((row) => {
          // 'unavailable' is the teammate projection and should never reach a
          // coach; if it does, the most cautious reading is the full status
          // it was projected from.
          const status: AvailabilityStatus = row.status === 'unavailable' ? 'medical' : row.status
          return {
            userId: row.userId,
            displayName: row.displayName,
            status,
            startsOn: status === 'available' ? null : row.startsOn,
            endsOn: status === 'available' ? null : row.endsOn,
          }
        }),
      }
    }

    return {
      view: 'teammate',
      entries: sorted.map((row) => {
        const status: TeammateAvailabilityStatus =
          row.status === 'unavailable' ? 'unavailable' : toTeammateStatus(row.status)
        // Suspension is not health data: its dates are shown (developer
        // decision 2026-10-01). Nothing else carries a date.
        const showDates = status === 'suspended'
        return {
          userId: row.userId,
          displayName: row.displayName,
          status,
          startsOn: showDates ? row.startsOn : null,
          endsOn: showDates ? row.endsOn : null,
        }
      }),
    }
  }
}
