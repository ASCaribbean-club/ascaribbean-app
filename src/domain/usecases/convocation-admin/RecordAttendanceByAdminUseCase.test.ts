import { describe, expect, it, vi } from 'vitest'
import type { AttendanceRecord, Convocation } from '../../entities/convocation'
import type { User } from '../../entities/user'
import { AttendanceWindowClosedError } from '../../errors/attendance-window-closed-error'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidConvocationInputError } from '../../errors/invalid-convocation-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import type { AttendanceRecordRepository } from '../../repositories/attendance-record-repository'
import type { AuditLogRepository, RecordAuditLogEntryInput } from '../../repositories/audit-log-repository'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { TeamRosterRepository } from '../../repositories/team-roster-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { RecordAttendanceByAdminUseCase } from './RecordAttendanceByAdminUseCase'

const NOW = new Date('2026-10-01T12:00:00.000Z')
const PAST = '2026-09-30T18:00:00.000Z'

function userWith(roles: User['roles']): User {
  return { id: 'admin-1', fullName: 'Admin', email: 'a@example.com', roles, position: null, age: null, handedness: null, charterAcceptedAt: null }
}

function convocationOf(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: 'convocation-1',
    teamId: 'team-1',
    type: 'training',
    date: PAST,
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

function recordOf(userId: string, actualStatus: 'present' | 'absent'): AttendanceRecord {
  return {
    id: `record-${userId}`,
    convocationId: 'convocation-1',
    userId,
    actualStatus,
    absenceValidity: null,
    note: null,
    validatedBy: 'admin-1',
    validatedAt: PAST,
  }
}

interface SetupOptions {
  user?: User | null
  convocation?: Convocation | null
  stored?: AttendanceRecord[]
  roster?: string[]
  recordFails?: boolean
  upsertFailsFor?: string
}

function setup(options: SetupOptions = {}) {
  const user = options.user === undefined ? userWith([{ role: 'admin' }]) : options.user
  const convocation = options.convocation === undefined ? convocationOf() : options.convocation
  const upsert = vi.fn(async (record: Omit<AttendanceRecord, 'id'>) => {
    if (record.userId === options.upsertFailsFor) throw new Error('write refused')
    return { id: 'new', ...record }
  })
  const record = vi.fn(async (_entry: RecordAuditLogEntryInput) => {
    if (options.recordFails) throw new Error('audit down')
  })
  const useCase = new RecordAttendanceByAdminUseCase(
    { findById: async () => user } as unknown as UserRepository,
    { findById: async () => convocation } as unknown as ConvocationRepository,
    { upsert, findByConvocation: async () => options.stored ?? [] } as unknown as AttendanceRecordRepository,
    {
      listPlayers: async () => (options.roster ?? ['p1', 'p2', 'p3']).map((userId) => ({ userId, displayName: userId })),
    } as TeamRosterRepository,
    { list: async () => ({ entries: [], hasMore: false }), record } as AuditLogRepository,
  )
  return { useCase, upsert, record }
}

const input = (choices: { userId: string; actualStatus: 'present' | 'absent' }[]) => ({
  actorId: 'admin-1',
  convocationId: 'convocation-1',
  choices,
  now: NOW,
})

describe('RecordAttendanceByAdminUseCase', () => {
  describe('authorization and window', () => {
    it('refuses an unknown actor', async () => {
      const { useCase } = setup({ user: null })
      await expect(useCase.execute(input([]))).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('throws NotFoundError for an unknown convocation', async () => {
      const { useCase } = setup({ convocation: null })
      await expect(useCase.execute(input([]))).rejects.toBeInstanceOf(NotFoundError)
    })

    it('refuses a coach of the team (backoffice entry is admin-only, no audit for coaches, AC-WC-33)', async () => {
      const { useCase, upsert, record } = setup({ user: userWith([{ role: 'coach', teamIds: ['team-1'] }]) })
      await expect(useCase.execute(input([{ userId: 'p1', actualStatus: 'present' }]))).rejects.toBeInstanceOf(ForbiddenError)
      expect(upsert).not.toHaveBeenCalled()
      expect(record).not.toHaveBeenCalled()
    })

    it('refuses an upcoming convocation (AC-WC-26)', async () => {
      const { useCase, upsert } = setup({ convocation: convocationOf({ date: '2026-10-02T12:00:00.000Z' }) })
      await expect(useCase.execute(input([{ userId: 'p1', actualStatus: 'present' }]))).rejects.toBeInstanceOf(
        AttendanceWindowClosedError,
      )
      expect(upsert).not.toHaveBeenCalled()
    })

    it('refuses a cancelled convocation', async () => {
      const { useCase } = setup({ convocation: convocationOf({ status: 'cancelled' }) })
      await expect(useCase.execute(input([{ userId: 'p1', actualStatus: 'present' }]))).rejects.toBeInstanceOf(
        AttendanceWindowClosedError,
      )
    })

    it('accepts a date exactly equal to now', async () => {
      const { useCase, upsert } = setup({ convocation: convocationOf({ date: NOW.toISOString() }) })
      await useCase.execute(input([{ userId: 'p1', actualStatus: 'present' }]))
      expect(upsert).toHaveBeenCalledOnce()
    })

    it('accepts a closed convocation (correction after closure)', async () => {
      const { useCase, upsert } = setup({ convocation: convocationOf({ status: 'closed' }), stored: [recordOf('p1', 'present')] })
      await useCase.execute(input([{ userId: 'p1', actualStatus: 'absent' }]))
      expect(upsert).toHaveBeenCalledOnce()
    })

    it('refuses a player outside the team roster, before any write', async () => {
      const { useCase, upsert } = setup()
      await expect(useCase.execute(input([{ userId: 'stranger', actualStatus: 'present' }]))).rejects.toBeInstanceOf(
        InvalidConvocationInputError,
      )
      expect(upsert).not.toHaveBeenCalled()
    })
  })

  describe('writes', () => {
    it('writes only attendance fields, validatedBy = actor, absenceValidity and note null (AC-WC-29)', async () => {
      const { useCase, upsert } = setup()
      await useCase.execute(input([{ userId: 'p1', actualStatus: 'absent' }]))
      expect(upsert).toHaveBeenCalledExactlyOnceWith({
        convocationId: 'convocation-1',
        userId: 'p1',
        actualStatus: 'absent',
        absenceValidity: null,
        note: null,
        validatedBy: 'admin-1',
        validatedAt: NOW.toISOString(),
      })
    })

    it('writes only the modified lines (AC-WC-27)', async () => {
      const { useCase, upsert } = setup({ stored: [recordOf('p1', 'present'), recordOf('p2', 'absent')] })
      const result = await useCase.execute(
        input([
          { userId: 'p1', actualStatus: 'present' }, // unchanged
          { userId: 'p2', actualStatus: 'present' }, // flipped
          { userId: 'p3', actualStatus: 'absent' }, // first entry
        ]),
      )
      expect(upsert.mock.calls.map(([r]) => r.userId)).toEqual(['p2', 'p3'])
      expect(result.changedCount).toBe(2)
    })

    it('writes nothing for an empty batch ("Plus tard")', async () => {
      const { useCase, upsert, record } = setup()
      const result = await useCase.execute(input([]))
      expect(upsert).not.toHaveBeenCalled()
      expect(record).not.toHaveBeenCalled()
      expect(result.changedCount).toBe(0)
    })

    // AC-WC-24/AC-AT-02 — the use case has no ConvocationResponse dependency
    // at all; a player who DECLARED "present" is recorded "absent" as a
    // coexisting, separate fact.
    it('records "absent" for a player who declared "present", without any ConvocationResponse involvement', async () => {
      const { useCase, upsert } = setup()
      expect(useCase).not.toHaveProperty('convocationResponseRepository')
      await useCase.execute(input([{ userId: 'p1', actualStatus: 'absent' }]))
      expect(upsert.mock.calls[0]?.[0]).toMatchObject({ userId: 'p1', actualStatus: 'absent' })
    })
  })

  describe('audit (AC-WC-30/31/33)', () => {
    it('emits exactly one attendance.updated per effective change, with ids and statuses only', async () => {
      const { useCase, record } = setup({ stored: [recordOf('p1', 'present'), recordOf('p2', 'absent')] })
      await useCase.execute(
        input([
          { userId: 'p1', actualStatus: 'present' }, // unchanged -> no entry
          { userId: 'p2', actualStatus: 'present' },
          { userId: 'p3', actualStatus: 'absent' },
        ]),
      )
      expect(record).toHaveBeenCalledTimes(2)
      expect(record).toHaveBeenNthCalledWith(1, {
        action: 'attendance.updated',
        targetId: 'p2',
        targetType: 'user',
        metadata: { convocationId: 'convocation-1', previousStatus: 'absent', newStatus: 'present' },
      })
      expect(record).toHaveBeenNthCalledWith(2, {
        action: 'attendance.updated',
        targetId: 'p3',
        targetType: 'user',
        metadata: { convocationId: 'convocation-1', previousStatus: null, newStatus: 'absent' },
      })
    })

    it('never puts free text or an actor id in the metadata, and passes no actor field', async () => {
      const { useCase, record } = setup()
      await useCase.execute(input([{ userId: 'p1', actualStatus: 'present' }]))
      const entry = record.mock.calls[0]?.[0] as RecordAuditLogEntryInput
      expect(Object.keys(entry.metadata ?? {}).sort()).toEqual(['convocationId', 'newStatus', 'previousStatus'])
      expect(entry).not.toHaveProperty('actorId')
    })

    it('emits nothing when a business refusal happens (window closed)', async () => {
      const { useCase, record } = setup({ convocation: convocationOf({ date: '2026-10-02T12:00:00.000Z' }) })
      await expect(useCase.execute(input([{ userId: 'p1', actualStatus: 'present' }]))).rejects.toBeInstanceOf(
        AttendanceWindowClosedError,
      )
      expect(record).not.toHaveBeenCalled()
    })

    it('emits the entry AFTER the write, and none for a player whose write failed', async () => {
      const { useCase, upsert, record } = setup({ upsertFailsFor: 'p2' })
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      await expect(
        useCase.execute(
          input([
            { userId: 'p1', actualStatus: 'present' },
            { userId: 'p2', actualStatus: 'absent' },
            { userId: 'p3', actualStatus: 'present' },
          ]),
        ),
      ).rejects.toThrow('write refused')
      expect(upsert).toHaveBeenCalledTimes(2)
      expect(record).toHaveBeenCalledTimes(1)
      expect(record.mock.calls[0]?.[0]).toMatchObject({ targetId: 'p1' })
      expect(upsert.mock.invocationCallOrder[0]).toBeLessThan(record.mock.invocationCallOrder[0] as number)
      consoleError.mockRestore()
    })

    it('does not reject when record() fails: the attendance write already succeeded', async () => {
      const { useCase, upsert } = setup({ recordFails: true })
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = await useCase.execute(input([{ userId: 'p1', actualStatus: 'present' }]))
      expect(result.changedCount).toBe(1)
      expect(upsert).toHaveBeenCalledOnce()
      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })
})
