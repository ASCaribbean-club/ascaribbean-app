import { describe, expect, it } from 'vitest'
import type { AttendanceRecord } from '@domain/entities/convocation'
import type { AttendanceRecordRow } from '../dto/attendance-record-dto'
import { toAttendanceRecord, toAttendanceRecordRow } from './attendance-record-mapper'

const row: AttendanceRecordRow = {
  id: 'attendance-1',
  convocation_id: 'convocation-1',
  user_id: 'player-1',
  actual_status: 'absent',
  absence_validity: null,
  note: null,
  validated_by: 'coach-1',
  validated_at: '2026-08-30T12:00:00.000Z',
}

const record: AttendanceRecord = {
  id: 'attendance-1',
  convocationId: 'convocation-1',
  userId: 'player-1',
  actualStatus: 'absent',
  absenceValidity: null,
  note: null,
  validatedBy: 'coach-1',
  validatedAt: '2026-08-30T12:00:00.000Z',
}

describe('toAttendanceRecord', () => {
  it('maps a row to an entity', () => {
    expect(toAttendanceRecord(row)).toEqual(record)
  })
})

describe('toAttendanceRecordRow', () => {
  // AC-AT-08, PO-AT-05/PO-AT-06 — the mapper must not invent a non-null
  // absenceValidity/note; this test guards against ever forgetting that
  // constraint while reshaping, not against ConfirmAttendanceUseCase's own
  // behavior (already covered by ConfirmAttendanceUseCase.test.ts).
  it('maps an entity (minus id) to a row, passing absenceValidity/note through unchanged whether null or set', () => {
    const withoutId: Omit<AttendanceRecord, 'id'> = {
      convocationId: record.convocationId,
      userId: record.userId,
      actualStatus: record.actualStatus,
      absenceValidity: record.absenceValidity,
      note: record.note,
      validatedBy: record.validatedBy,
      validatedAt: record.validatedAt,
    }
    expect(toAttendanceRecordRow(withoutId)).toEqual({
      convocation_id: 'convocation-1',
      user_id: 'player-1',
      actual_status: 'absent',
      absence_validity: null,
      note: null,
      validated_by: 'coach-1',
      validated_at: '2026-08-30T12:00:00.000Z',
    })

    expect(toAttendanceRecordRow({ ...withoutId, absenceValidity: 'excused', note: 'Joueuse invitée' })).toEqual(
      expect.objectContaining({ absence_validity: 'excused', note: 'Joueuse invitée' }),
    )
  })
})
