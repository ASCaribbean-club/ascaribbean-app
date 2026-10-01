import type { ActualStatus, Convocation } from '@domain/entities/convocation'
import { NotFoundError } from '@domain/errors/not-found-error'
import { canEnterAttendance } from '@domain/policies/convocation-admin-windows'
import type { AttendanceRecordRepository } from '@domain/repositories/attendance-record-repository'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { TeamRosterRepository } from '@domain/repositories/team-roster-repository'
import { byDisplayNameAscending } from '@domain/rules/convocation-rules'

export interface AdminAttendanceSheetPlayer {
  userId: string
  displayName: string
  // null = "Non saisi" (no AttendanceRecord). NEVER pre-filled from the
  // player's declared ConvocationResponse (AC-WC-24/AC-AT-12).
  actualStatus: ActualStatus | null
}

export interface AdminAttendanceSheet {
  convocation: Convocation
  teamName: string
  // false for an upcoming or cancelled convocation (URL typed by hand): the
  // screen then shows its own "not allowed" state instead of the roster.
  canEnter: boolean
  players: AdminAttendanceSheetPlayer[]
  hasStoredRecords: boolean
}

// specs/web-create-convocation.md UI design "Écran 4" — assembles the roster
// and the stored AttendanceRecord rows only. Reads attendance_records, never
// convocation_responses.
export class GetAdminAttendanceSheetUseCase {
  constructor(
    private readonly convocationRepository: ConvocationRepository,
    private readonly teamRepository: TeamRepository,
    private readonly teamRosterRepository: TeamRosterRepository,
    private readonly attendanceRecordRepository: AttendanceRecordRepository,
  ) {}

  async execute(convocationId: string, now: Date): Promise<AdminAttendanceSheet> {
    const convocation = await this.convocationRepository.findById(convocationId)
    if (!convocation) throw new NotFoundError(`Convocation ${convocationId} not found.`)

    const canEnter = canEnterAttendance(convocation, now)
    const team = await this.teamRepository.findById(convocation.teamId)
    const teamName = team?.name ?? ''

    if (!canEnter) {
      return { convocation, teamName, canEnter, players: [], hasStoredRecords: false }
    }

    const [roster, records] = await Promise.all([
      this.teamRosterRepository.listPlayers(convocation.teamId),
      this.attendanceRecordRepository.findByConvocation(convocation.id),
    ])
    const statusByUser = new Map(records.map((record) => [record.userId, record.actualStatus]))

    const players = roster
      .map((player) => ({
        userId: player.userId,
        displayName: player.displayName,
        actualStatus: statusByUser.get(player.userId) ?? null,
      }))
      .sort(byDisplayNameAscending)

    return { convocation, teamName, canEnter, players, hasStoredRecords: records.length > 0 }
  }
}
