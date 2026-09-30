import { describe, expect, it } from 'vitest'
import type { AuditLogEntry } from '../../entities/audit-log-entry'
import type { AuditLogFilters, AuditLogPage, AuditLogRepository } from '../../repositories/audit-log-repository'
import { InvalidAuditLogFiltersError } from '../../errors/invalid-audit-log-filters-error'
import { ListAuditLogUseCase } from './ListAuditLogUseCase'

function buildEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: 'entry-1',
    occurredAt: new Date('2026-01-10T10:00:00.000Z'),
    actorId: 'admin-1',
    actorFullName: 'Compte admin',
    action: 'role.granted',
    targetId: 'target-1',
    targetType: 'user',
    source: 'usecase',
    metadata: {},
    ...overrides,
  }
}

// In-memory fake, same pattern as
// domain/usecases/convocation/ListConvocationRespondersUseCase.test.ts — no
// Supabase mock needed, domain/ is plain TypeScript. Records the
// filters/page it was called with so delegation can be asserted.
function fakeAuditLogRepository(page: AuditLogPage): AuditLogRepository & { calls: Array<{ filters: AuditLogFilters; page: number }> } {
  const calls: Array<{ filters: AuditLogFilters; page: number }> = []
  return {
    calls,
    async list(filters, pageArg) {
      calls.push({ filters, page: pageArg })
      return page
    },
    // Follow-up pass to specs/web-audit-logs.md (2026-09-30 addendum) —
    // added to the interface by that pass; unrelated to this test's own
    // assertions, stubbed so the fake keeps satisfying the interface.
    async record() {},
  }
}

describe('ListAuditLogUseCase', () => {
  it('delegates to the repository unchanged when no bounds are set', async () => {
    const page: AuditLogPage = { entries: [buildEntry()], hasMore: false }
    const repository = fakeAuditLogRepository(page)
    const useCase = new ListAuditLogUseCase(repository)

    const result = await useCase.execute({ filters: {}, page: 0 })

    expect(result).toEqual(page)
    expect(repository.calls).toEqual([{ filters: {}, page: 0 }])
  })

  it('delegates the exact filters and page number given, unmodified', async () => {
    const filters: AuditLogFilters = {
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-02-01T00:00:00.000Z'),
      actions: ['role.granted', 'role.revoked'],
    }
    const page: AuditLogPage = { entries: [], hasMore: true }
    const repository = fakeAuditLogRepository(page)
    const useCase = new ListAuditLogUseCase(repository)

    await useCase.execute({ filters, page: 2 })

    expect(repository.calls).toEqual([{ filters, page: 2 }])
  })

  it('accepts a from strictly before to', async () => {
    const filters: AuditLogFilters = {
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-02T00:00:00.000Z'),
    }
    const repository = fakeAuditLogRepository({ entries: [], hasMore: false })
    const useCase = new ListAuditLogUseCase(repository)

    await expect(useCase.execute({ filters, page: 0 })).resolves.toEqual({ entries: [], hasMore: false })
  })

  it('rejects an inverted range (from after to) with InvalidAuditLogFiltersError, before ever calling the repository', async () => {
    const filters: AuditLogFilters = {
      from: new Date('2026-02-01T00:00:00.000Z'),
      to: new Date('2026-01-01T00:00:00.000Z'),
    }
    const repository = fakeAuditLogRepository({ entries: [], hasMore: false })
    const useCase = new ListAuditLogUseCase(repository)

    await expect(useCase.execute({ filters, page: 0 })).rejects.toBeInstanceOf(InvalidAuditLogFiltersError)
    expect(repository.calls).toEqual([])
  })

  it('rejects an equal from/to pair — not a valid, if empty, range', async () => {
    const sameInstant = new Date('2026-01-01T00:00:00.000Z')
    const filters: AuditLogFilters = { from: sameInstant, to: sameInstant }
    const repository = fakeAuditLogRepository({ entries: [], hasMore: false })
    const useCase = new ListAuditLogUseCase(repository)

    await expect(useCase.execute({ filters, page: 0 })).rejects.toBeInstanceOf(InvalidAuditLogFiltersError)
  })
})
