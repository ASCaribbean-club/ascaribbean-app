import type { ActualStatus } from '@domain/entities/convocation'
import { AttendanceWindowClosedError } from '@domain/errors/attendance-window-closed-error'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidConvocationInputError } from '@domain/errors/invalid-convocation-input-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { can } from '@domain/policies/can'
import { canEnterAttendance } from '@domain/policies/convocation-admin-windows'
import type { AttendanceRecordRepository } from '@domain/repositories/attendance-record-repository'
import type { AuditLogRepository } from '@domain/repositories/audit-log-repository'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { TeamRosterRepository } from '@domain/repositories/team-roster-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { diffAttendance, type AttendanceChoice } from '@domain/rules/attendance-batch'

export interface RecordAttendanceByAdminInput {
  actorId: string
  convocationId: string
  // The admin's choices. Players whose choice equals the stored value are
  // ignored; a player the admin left "Non saisi" simply isn't in this list.
  choices: AttendanceChoice[]
  now: Date
}

export interface RecordAttendanceByAdminResult {
  // Number of players whose value effectively changed (= audit entries).
  changedCount: number
}

// specs/web-create-convocation.md §3/§4 — the admin's batch entry of attendance
// on a PAST convocation (Présent / Absent only, PO-WC-12).
//
// Writes ONLY to attendance_records, never to convocation_responses
// (AC-WC-24/AC-AT-01): this class has no ConvocationResponse dependency at all.
// absenceValidity and note are always null (AC-WC-29/AC-AT-08).
//
// Audit (AC-WC-30/31/33): ONE 'attendance.updated' entry per player whose value
// effectively changes, emitted from HERE (a business action, CLAUDE.md §6),
// right after THAT player's upsert succeeded — never before, never from a
// component. `metadata` carries ids and statuses only: no free text, no
// medical content. The actor is resolved server-side by the RPC, never passed.
// A failed record() is only logged, not thrown: no shared transaction exists
// between the client-RLS upsert and the SECURITY DEFINER audit RPC (same
// tradeoff as AssignRoleUseCase; PO-WC-08 asks whether to harden it).
// Partial failure of the batch itself (PO-WC-13) is not made atomic: players
// written before the failure keep their value AND their audit entry.
export class RecordAttendanceByAdminUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly convocationRepository: ConvocationRepository,
    private readonly attendanceRecordRepository: AttendanceRecordRepository,
    private readonly teamRosterRepository: TeamRosterRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: RecordAttendanceByAdminInput): Promise<RecordAttendanceByAdminResult> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) throw new ForbiddenError(`User not found: ${input.actorId}`)

    const convocation = await this.convocationRepository.findById(input.convocationId)
    if (!convocation) throw new NotFoundError(`Convocation ${input.convocationId} not found.`)

    // 'attendance:validate' for the team, AND an admin: this entry point is
    // the backoffice one, and only an admin's write is audited (AC-WC-33, a
    // coach's write is not — PO-AT-02 still open).
    if (!can(user, 'attendance:validate', { teamId: convocation.teamId }) || !can(user, 'backoffice:access')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to enter attendance for convocation ${input.convocationId}`)
    }

    // Window, at the instant of the write (AC-WC-26): past, not cancelled.
    if (!canEnterAttendance(convocation, input.now)) {
      throw new AttendanceWindowClosedError(`Attendance can't be entered on convocation ${input.convocationId} (upcoming or cancelled).`)
    }

    // A choice for someone who isn't on the team's roster is refused.
    const roster = await this.teamRosterRepository.listPlayers(convocation.teamId)
    const rosterIds = new Set(roster.map((player) => player.userId))
    const unknown = input.choices.find((choice) => !rosterIds.has(choice.userId))
    if (unknown) {
      throw new InvalidConvocationInputError(`Player ${unknown.userId} is not on the roster of team ${convocation.teamId}`)
    }

    // Re-read the stored values right before writing: `previousStatus` of the
    // audit entry comes from here, `null` on a first entry.
    const stored = await this.attendanceRecordRepository.findByConvocation(convocation.id)
    const storedStatuses = new Map<string, ActualStatus>(stored.map((record) => [record.userId, record.actualStatus]))
    const changes = diffAttendance(storedStatuses, input.choices)

    for (const change of changes) {
      await this.attendanceRecordRepository.upsert({
        convocationId: convocation.id,
        userId: change.userId,
        actualStatus: change.actualStatus,
        absenceValidity: null,
        note: null,
        validatedBy: input.actorId,
        validatedAt: input.now.toISOString(),
      })

      try {
        await this.auditLogRepository.record({
          action: 'attendance.updated',
          targetId: change.userId,
          targetType: 'user',
          metadata: {
            convocationId: convocation.id,
            previousStatus: change.previousStatus,
            newStatus: change.actualStatus,
          },
        })
      } catch (auditError) {
        console.error('RecordAttendanceByAdminUseCase: failed to record attendance.updated audit entry', {
          actorId: input.actorId,
          targetId: change.userId,
          auditError,
        })
      }
    }

    return { changedCount: changes.length }
  }
}
