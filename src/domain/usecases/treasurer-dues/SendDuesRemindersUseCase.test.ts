import { describe, expect, it, vi } from 'vitest'
import type { DuesReminderResult } from '../../entities/dues-reminder'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidDuesReminderInputError } from '../../errors/invalid-dues-reminder-input-error'
import type { AuditLogRepository, RecordAuditLogEntryInput } from '../../repositories/audit-log-repository'
import type { DuesReminderRepository } from '../../repositories/dues-reminder-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { MAX_REMINDER_BATCH_SIZE } from '../../rules/dues-reminder-rules'
import { SendDuesRemindersUseCase } from './SendDuesRemindersUseCase'

function userWith(roles: User['roles'], id = 'actor-1'): User {
  return { id, fullName: 'Compte', email: 'compte@example.com', roles, position: null, age: null, handedness: null, charterAcceptedAt: null }
}

function userRepository(user: User | null): UserRepository {
  return { findById: async () => user } as unknown as UserRepository
}

function remindersRepository(results: DuesReminderResult[] | ((ids: string[]) => DuesReminderResult[])) {
  return {
    send: vi.fn(async (ids: string[]) => (typeof results === 'function' ? results(ids) : results)),
  } satisfies DuesReminderRepository
}

function auditRepository(overrides: Partial<AuditLogRepository> = {}) {
  return {
    list: async () => ({ entries: [], hasMore: false }),
    record: vi.fn(async (_entry: RecordAuditLogEntryInput) => {}),
    ...overrides,
  } satisfies AuditLogRepository
}

const treasurer = () => userWith([{ role: 'treasurer' }])

describe('SendDuesRemindersUseCase', () => {
  it.each([
    [{ role: 'admin' }],
    [{ role: 'authorized-officer' }],
    [{ role: 'player', teamId: 'team-1' }],
    [{ role: 'coach', teamIds: ['team-1'] }],
  ] as User['roles'][])('refuses %j before any call', async (role) => {
    const reminders = remindersRepository([])
    const audit = auditRepository()
    const useCase = new SendDuesRemindersUseCase(userRepository(userWith([role])), reminders, audit)

    await expect(useCase.execute({ actorId: 'actor-1', membershipIds: ['m-1'] })).rejects.toBeInstanceOf(ForbiddenError)
    expect(reminders.send).not.toHaveBeenCalled()
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('refuses an unknown actor', async () => {
    const useCase = new SendDuesRemindersUseCase(userRepository(null), remindersRepository([]), auditRepository())
    await expect(useCase.execute({ actorId: 'ghost', membershipIds: ['m-1'] })).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('rejects an empty batch and an oversized one', async () => {
    const reminders = remindersRepository([])
    const useCase = new SendDuesRemindersUseCase(userRepository(treasurer()), reminders, auditRepository())
    await expect(useCase.execute({ actorId: 'actor-1', membershipIds: [] })).rejects.toBeInstanceOf(InvalidDuesReminderInputError)
    const tooMany = Array.from({ length: MAX_REMINDER_BATCH_SIZE + 1 }, (_, index) => `m-${index}`)
    await expect(useCase.execute({ actorId: 'actor-1', membershipIds: tooMany })).rejects.toBeInstanceOf(InvalidDuesReminderInputError)
    expect(reminders.send).not.toHaveBeenCalled()
  })

  it('accepts a batch of exactly the maximum size', async () => {
    const ids = Array.from({ length: MAX_REMINDER_BATCH_SIZE }, (_, index) => `m-${index}`)
    const useCase = new SendDuesRemindersUseCase(
      userRepository(treasurer()),
      remindersRepository((received) => received.map((membershipId) => ({ membershipId, outcome: 'sent' as const }))),
      auditRepository(),
    )
    const summary = await useCase.execute({ actorId: 'actor-1', membershipIds: ids })
    expect(summary.sentCount).toBe(MAX_REMINDER_BATCH_SIZE)
  })

  it('sends a single reminder as a batch of 1 and audits it with mode "single"', async () => {
    const reminders = remindersRepository([{ membershipId: 'm-1', outcome: 'sent' }])
    const audit = auditRepository()
    const summary = await new SendDuesRemindersUseCase(userRepository(treasurer()), reminders, audit).execute({
      actorId: 'actor-1',
      membershipIds: ['m-1'],
    })

    expect(reminders.send).toHaveBeenCalledWith(['m-1'])
    expect(summary).toEqual({ results: [{ membershipId: 'm-1', outcome: 'sent' }], sentCount: 1, notSentCount: 0 })
    expect(audit.record).toHaveBeenCalledTimes(1)
    expect(audit.record).toHaveBeenCalledWith({
      action: 'dues.reminder_sent',
      targetId: 'm-1',
      targetType: 'membership',
      metadata: { mode: 'single', batch_size: 1 },
    })
  })

  it('audits only the reminders effectively sent, in bulk mode, and reports the refused ones', async () => {
    const reminders = remindersRepository([
      { membershipId: 'm-1', outcome: 'sent' },
      { membershipId: 'm-2', outcome: 'cooldown' },
      { membershipId: 'm-3', outcome: 'no_balance' },
      { membershipId: 'm-4', outcome: 'not_found' },
      { membershipId: 'm-5', outcome: 'sent' },
    ])
    const audit = auditRepository()
    const summary = await new SendDuesRemindersUseCase(userRepository(treasurer()), reminders, audit).execute({
      actorId: 'actor-1',
      membershipIds: ['m-1', 'm-2', 'm-3', 'm-4', 'm-5'],
    })

    expect(summary.sentCount).toBe(2)
    expect(summary.notSentCount).toBe(3)
    expect(audit.record).toHaveBeenCalledTimes(2)
    const targets = vi.mocked(audit.record).mock.calls.map(([entry]) => entry.targetId)
    expect(targets).toEqual(['m-1', 'm-5'])
    for (const [entry] of vi.mocked(audit.record).mock.calls) {
      expect(entry.metadata).toEqual({ mode: 'bulk', batch_size: 5 })
    }
  })

  it('writes no audit entry when nothing was sent', async () => {
    const audit = auditRepository()
    await new SendDuesRemindersUseCase(
      userRepository(treasurer()),
      remindersRepository([{ membershipId: 'm-1', outcome: 'cooldown' }]),
      audit,
    ).execute({ actorId: 'actor-1', membershipIds: ['m-1'] })
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('de-duplicates ids before sending and counts the batch once', async () => {
    const reminders = remindersRepository([{ membershipId: 'm-1', outcome: 'sent' }])
    const audit = auditRepository()
    await new SendDuesRemindersUseCase(userRepository(treasurer()), reminders, audit).execute({
      actorId: 'actor-1',
      membershipIds: ['m-1', 'm-1'],
    })
    expect(reminders.send).toHaveBeenCalledWith(['m-1'])
    expect(vi.mocked(audit.record).mock.calls[0][0].metadata).toEqual({ mode: 'single', batch_size: 1 })
  })

  it('does not reject when an audit write fails after the reminders were sent', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const audit = auditRepository({ record: vi.fn(async () => { throw new Error('audit down') }) })
    const summary = await new SendDuesRemindersUseCase(
      userRepository(treasurer()),
      remindersRepository([{ membershipId: 'm-1', outcome: 'sent' }]),
      audit,
    ).execute({ actorId: 'actor-1', membershipIds: ['m-1'] })

    expect(summary.sentCount).toBe(1)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('writes no audit entry and rethrows when the RPC fails (atomic call, nothing sent)', async () => {
    const audit = auditRepository()
    const reminders: DuesReminderRepository = { send: async () => { throw new Error('network') } }
    const useCase = new SendDuesRemindersUseCase(userRepository(treasurer()), reminders, audit)
    await expect(useCase.execute({ actorId: 'actor-1', membershipIds: ['m-1'] })).rejects.toThrow('network')
    expect(audit.record).not.toHaveBeenCalled()
  })
})
