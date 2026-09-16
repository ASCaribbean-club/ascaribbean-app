import { describe, expect, it } from 'vitest'
import type { AttendanceRecord, ConvocationResponse } from '../../entities/convocation'
import type { AttendanceRecordRepository } from '../../repositories/attendance-record-repository'
import type { ConvocationResponderStatus, ConvocationRespondersRepository } from '../../repositories/convocation-responders-repository'
import type { ConvocationResponseRepository } from '../../repositories/convocation-response-repository'
import { GetConvocationRosterForCoachUseCase } from './GetConvocationRosterForCoachUseCase'

// In-memory fakes, same pattern as AssembleConvocationDetailFieldsUseCase.test.ts —
// no Supabase mock needed, domain/ is plain TypeScript.
function fakeConvocationRespondersRepository(roster: ConvocationResponderStatus[]): ConvocationRespondersRepository {
  return {
    listForConvocation: async () => roster,
  }
}

function fakeConvocationResponseRepository(responses: ConvocationResponse[]): ConvocationResponseRepository {
  return {
    upsert: async (response) => ({ id: 'r1', ...response }),
    findByConvocationAndUser: async () => null,
    findByConvocation: async () => responses,
  }
}

// specs/coach-attendance-confirmation.md §7 — third constructor dependency,
// merged into `actualStatus` by execute() the same "find-or-default" shape
// as `userResponse`/`status` above.
function fakeAttendanceRecordRepository(records: AttendanceRecord[] = []): AttendanceRecordRepository {
  return {
    upsert: async (record) => ({ id: 'a1', ...record }),
    findByConvocation: async () => records,
  }
}

function attendanceRecord(userId: string, actualStatus: AttendanceRecord['actualStatus']): AttendanceRecord {
  return {
    id: `attendance-${userId}`,
    convocationId: 'c1',
    userId,
    actualStatus,
    absenceValidity: null,
    note: null,
    validatedBy: 'coach-1',
    validatedAt: '2026-08-30T12:00:00.000Z',
  }
}

function response(userId: string, status: ConvocationResponse['status']): ConvocationResponse {
  return {
    id: `response-${userId}`,
    convocationId: 'c1',
    userId,
    status,
    reason: null,
    respondedAt: '2026-08-30T10:00:00.000Z',
  }
}

describe('GetConvocationRosterForCoachUseCase', () => {
  it('defaults a convoked player with no ConvocationResponse row to pending (AC-MD-09)', async () => {
    const useCase = new GetConvocationRosterForCoachUseCase(
      fakeConvocationRespondersRepository([{ userId: 'player-1', hasResponded: false, displayName: 'Joueur 1', position: null }]),
      fakeConvocationResponseRepository([]),
      fakeAttendanceRecordRepository(),
    )

    const result = await useCase.execute('c1')

    expect(result.roster).toEqual([{ userId: 'player-1', displayName: 'Joueur 1', position: null, status: 'pending', actualStatus: null }])
  })

  it('passes the responder position through unchanged', async () => {
    const useCase = new GetConvocationRosterForCoachUseCase(
      fakeConvocationRespondersRepository([{ userId: 'player-1', hasResponded: false, displayName: 'Joueur 1', position: 'goalkeeper' }]),
      fakeConvocationResponseRepository([]),
      fakeAttendanceRecordRepository(),
    )

    const result = await useCase.execute('c1')

    expect(result.roster).toEqual([{ userId: 'player-1', displayName: 'Joueur 1', position: 'goalkeeper', status: 'pending', actualStatus: null }])
  })

  it('uses the real status for a roster entry with a matching ConvocationResponse', async () => {
    const useCase = new GetConvocationRosterForCoachUseCase(
      fakeConvocationRespondersRepository([{ userId: 'player-1', hasResponded: true, displayName: 'Joueur 1', position: null }]),
      fakeConvocationResponseRepository([response('player-1', 'absent')]),
      fakeAttendanceRecordRepository(),
    )

    const result = await useCase.execute('c1')

    expect(result.roster).toEqual([{ userId: 'player-1', displayName: 'Joueur 1', position: null, status: 'absent', actualStatus: null }])
  })

  it('computes responseCounts from the assembled roster, counting a non-responder as pending (AC-MD-06, AC-MD-10, AC-CD-05)', async () => {
    const useCase = new GetConvocationRosterForCoachUseCase(
      fakeConvocationRespondersRepository([
        { userId: 'player-1', hasResponded: true, displayName: 'Joueur 1', position: null },
        { userId: 'player-2', hasResponded: true, displayName: 'Joueur 2', position: null },
        { userId: 'player-3', hasResponded: false, displayName: 'Joueur 3', position: null },
      ]),
      fakeConvocationResponseRepository([response('player-1', 'present'), response('player-2', 'absent')]),
      fakeAttendanceRecordRepository(),
    )

    const result = await useCase.execute('c1')

    expect(result.responseCounts).toEqual({ present: 1, absent: 1, pending: 1 })
  })

  it('coexists a declared status with a contradicting confirmed actualStatus, never merging them (AC-AT-02)', async () => {
    const useCase = new GetConvocationRosterForCoachUseCase(
      fakeConvocationRespondersRepository([{ userId: 'player-1', hasResponded: true, displayName: 'Joueur 1', position: null }]),
      fakeConvocationResponseRepository([response('player-1', 'present')]),
      fakeAttendanceRecordRepository([attendanceRecord('player-1', 'absent')]),
    )

    const result = await useCase.execute('c1')

    expect(result.roster).toEqual([{ userId: 'player-1', displayName: 'Joueur 1', position: null, status: 'present', actualStatus: 'absent' }])
  })

  it('defaults actualStatus to null for a convoked player with no AttendanceRecord row yet (AC-AT-12)', async () => {
    const useCase = new GetConvocationRosterForCoachUseCase(
      fakeConvocationRespondersRepository([{ userId: 'player-1', hasResponded: false, displayName: 'Joueur 1', position: null }]),
      fakeConvocationResponseRepository([]),
      fakeAttendanceRecordRepository([attendanceRecord('player-2', 'present')]),
    )

    const result = await useCase.execute('c1')

    expect(result.roster).toEqual([{ userId: 'player-1', displayName: 'Joueur 1', position: null, status: 'pending', actualStatus: null }])
  })

  it('returns an empty roster and zeroed counts when nobody is convoked', async () => {
    const useCase = new GetConvocationRosterForCoachUseCase(
      fakeConvocationRespondersRepository([]),
      fakeConvocationResponseRepository([]),
      fakeAttendanceRecordRepository(),
    )

    const result = await useCase.execute('c1')

    expect(result).toEqual({ roster: [], responseCounts: { present: 0, absent: 0, pending: 0 } })
  })
})
