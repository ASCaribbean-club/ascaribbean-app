import { describe, expect, it, vi } from 'vitest'
import type { AttendanceRecord, Convocation } from '../../entities/convocation'
import { NotFoundError } from '../../errors/not-found-error'
import type { AttendanceRecordRepository } from '../../repositories/attendance-record-repository'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { TeamRepository } from '../../repositories/team-repository'
import type { TeamRosterRepository } from '../../repositories/team-roster-repository'
import { GetAdminAttendanceSheetUseCase } from './GetAdminAttendanceSheetUseCase'

const NOW = new Date('2026-10-01T12:00:00.000Z')

function convocationOf(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: 'convocation-1',
    teamId: 'team-1',
    type: 'training',
    date: '2026-09-30T18:00:00.000Z',
    location: null,
    trainingLocation: null,
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'creator-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function setup(convocation: Convocation | null, records: Partial<AttendanceRecord>[] = []) {
  const listPlayers = vi.fn(async () => [
    { userId: 'p2', displayName: 'Joueur B' },
    { userId: 'p1', displayName: 'Joueur A' },
  ])
  const findByConvocation = vi.fn(async () => records as AttendanceRecord[])
  const useCase = new GetAdminAttendanceSheetUseCase(
    { findById: async () => convocation } as unknown as ConvocationRepository,
    { findById: async () => ({ id: 'team-1', name: 'Équipe A', sectionId: 's', seasonId: 'y' }) } as unknown as TeamRepository,
    { listPlayers } as TeamRosterRepository,
    { findByConvocation } as unknown as AttendanceRecordRepository,
  )
  return { useCase, listPlayers, findByConvocation }
}

describe('GetAdminAttendanceSheetUseCase', () => {
  it('throws NotFoundError for an unknown convocation', async () => {
    const { useCase } = setup(null)
    await expect(useCase.execute('x', NOW)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('returns the roster sorted by name, with null (Non saisi) for a player without a record', async () => {
    const { useCase } = setup(convocationOf(), [{ userId: 'p2', actualStatus: 'absent' }])
    const sheet = await useCase.execute('convocation-1', NOW)
    expect(sheet.canEnter).toBe(true)
    expect(sheet.teamName).toBe('Équipe A')
    expect(sheet.players).toEqual([
      { userId: 'p1', displayName: 'Joueur A', actualStatus: null },
      { userId: 'p2', displayName: 'Joueur B', actualStatus: 'absent' },
    ])
    expect(sheet.hasStoredRecords).toBe(true)
  })

  it('reports no stored record on a first entry', async () => {
    const { useCase } = setup(convocationOf())
    expect((await useCase.execute('convocation-1', NOW)).hasStoredRecords).toBe(false)
  })

  it.each([
    convocationOf({ date: '2026-10-02T12:00:00.000Z' }),
    convocationOf({ status: 'cancelled' }),
  ])('for a non-eligible convocation returns canEnter=false and reads neither roster nor records', async (convocation) => {
    const { useCase, listPlayers, findByConvocation } = setup(convocation)
    const sheet = await useCase.execute('convocation-1', NOW)
    expect(sheet.canEnter).toBe(false)
    expect(sheet.players).toEqual([])
    expect(listPlayers).not.toHaveBeenCalled()
    expect(findByConvocation).not.toHaveBeenCalled()
  })
})
