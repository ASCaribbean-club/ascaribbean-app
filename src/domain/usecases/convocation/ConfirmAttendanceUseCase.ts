import type { ActualStatus, AttendanceRecord } from '@domain/entities/convocation'
import type { AttendanceRecordRepository } from '@domain/repositories/attendance-record-repository'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { can } from '@domain/policies/can'

export interface ConfirmAttendanceInput {
  convocationId: string
  // The player being marked present/absent — NOT the authenticated coach.
  userId: string
  actualStatus: ActualStatus
  // The authenticated coach/admin doing the confirming. AC-AT-04 requires
  // this to always equal the caller's own id, enforced by RLS
  // (attendance_records_insert_validate/_update_validate's
  // `validated_by = auth.uid()` check) — this use case must not trust an
  // arbitrary caller-supplied value for a THIRD party's id here either.
  validatedBy: string
  now: Date
}

// specs/coach-attendance-confirmation.md §1, "la règle centrale" — writes
// ONLY to attendance_records, never to convocation_responses (AC-AT-01):
// the coach isn't correcting the player's declared ConvocationResponse, this
// records a separate, coexisting fact (AC-AT-02). Net-new in this pass
// (spec §1, "réellement nouveau") — AttendanceRecordRepository had no
// implementation and no writer use case before this.
export class ConfirmAttendanceUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly convocationRepository: ConvocationRepository,
    private readonly attendanceRecordRepository: AttendanceRecordRepository,
  ) {}

  async execute(input: ConfirmAttendanceInput): Promise<AttendanceRecord> {
    const user = await this.userRepository.findById(input.validatedBy)
    if (!user) {
      throw new NotFoundError(`User ${input.validatedBy} not found.`)
    }

    const convocation = await this.convocationRepository.findById(input.convocationId)
    if (!convocation) {
      throw new NotFoundError(`Convocation ${input.convocationId} not found.`)
    }

    const canValidate = can(user, 'attendance:validate', { teamId: convocation.teamId })
    if (!canValidate) {
      throw new ForbiddenError(
        `User ${input.validatedBy} is not authorized to validate attendance for convocation with id ${input.convocationId} for convocation assigned to team ${convocation.teamId}`,
      )
    }

    // PO-AT-02 (spec §3, "Journal d'audit — à trancher, pas à omettre") —
    // whether correcting a previously-confirmed AttendanceRecord needs to be
    // logged is explicitly undecided, not explicitly "no". If/when the
    // Bureau decides it does, ARCHITECTURE.md §11's "action métier" pattern
    // says the call belongs HERE (the use case), never in a component or
    // ViewModel — do not add a logging call before that decision is made.

    return this.attendanceRecordRepository.upsert({
      convocationId: convocation.id,
      userId: input.userId,
      actualStatus: input.actualStatus,
      // absenceValidity and note are BOTH OPEN (PO-AT-05, PO-AT-06) —
      // always null in this pass, AC-AT-08. Don't add either to
      // ConfirmAttendanceInput "just in case": there is nowhere in this
      // pass that's allowed to collect them.
      absenceValidity: null,
      note: null,
      validatedBy: input.validatedBy,
      validatedAt: input.now.toISOString(),
    })
  }
}
