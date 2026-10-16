import { describe, expect, it, vi } from 'vitest'
import type { LegacyEntry, LegacyRule, LegacyTier } from '@domain/entities/legacy'
import type { Season } from '@domain/entities/season'
import type { User } from '@domain/entities/user'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidLegacyInputError } from '@domain/errors/invalid-legacy-input-error'
import { LegacyChosenSeasonNotConfiguredError } from '@domain/errors/legacy-chosen-season-not-configured-error'
import { LegacyDateOutsideSeasonError } from '@domain/errors/legacy-date-outside-season-error'
import { LegacySeasonNotConfiguredError } from '@domain/errors/legacy-season-not-configured-error'
import type { AuditLogRepository } from '@domain/repositories/audit-log-repository'
import type { LegacyRepository } from '@domain/repositories/legacy-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { AwardLegacyPointsUseCase } from './AwardLegacyPointsUseCase'

function user(id: string, roles: User['roles']): User {
  return { id, fullName: id, email: `${id}@example.com`, roles, position: null, age: null, handedness: null, charterAcceptedAt: null }
}

const ADMIN = user('admin-1', [{ role: 'admin' }])
const PLAYER = user('p1', [{ role: 'player', teamId: 't1' }])

const RULE: LegacyRule = {
  id: 'r-ref', action: 'referral', teamType: null, channel: 'manual', pointsKind: 'fixed',
  points: 15, maxPoints: null, reasonRequired: true, validFrom: '2026-08-01', validTo: null,
}
const CATCHUP_RULE: LegacyRule = {
  id: 'r-catchup', action: 'points_catchup', teamType: null, channel: 'manual', pointsKind: 'variable',
  points: null, maxPoints: 300, reasonRequired: true, validFrom: '2024-01-01', validTo: null,
}
const AUTOMATIC_RULE: LegacyRule = { ...RULE, id: 'r-train', action: 'training_attendance', teamType: 'football', channel: 'automatic', reasonRequired: false }

const SEASON: Season = { id: 's1', label: '2026-2027', startDate: '2026-08-01', endDate: '2027-06-30', cotisationAmount: null, paymentUrl: null }
const PAST_SEASON: Season = { id: 's0', label: '2024-2025', startDate: '2024-07-01', endDate: '2025-06-30', cotisationAmount: null, paymentUrl: null }
const TIER = { id: 't1' } as LegacyTier

const INPUT = { actorId: 'admin-1', userId: 'p1', ruleId: 'r-ref', points: 15, reason: ' Parrainage de X ', earnedOn: '2026-10-01' }

function build(options: { actor?: User | null; mode?: 'cumulative' | null; tiers?: LegacyTier[]; seasons?: Season[]; auditFails?: boolean } = {}) {
  const addManualEntry = vi.fn(async (e) => ({ id: 'e1', ...e }) as unknown as LegacyEntry)
  const record = vi.fn(async () => {
    if (options.auditFails) throw new Error('audit down')
  })
  const users = {
    findById: async (id: string) => (id === 'admin-1' ? (options.actor === undefined ? ADMIN : options.actor) : id === 'p1' ? PLAYER : user(id, [{ role: 'coach', teamIds: [] }])),
  } as unknown as UserRepository
  const legacy = {
    findRules: async () => [RULE, AUTOMATIC_RULE, CATCHUP_RULE],
    findSeasonMode: async () => (options.mode === undefined ? 'cumulative' : options.mode),
    findTiers: async () => options.tiers ?? [TIER],
    addManualEntry,
  } as unknown as LegacyRepository
  const seasons = { findAll: async () => options.seasons ?? [SEASON, PAST_SEASON] } as unknown as SeasonRepository
  const audit = { record } as unknown as AuditLogRepository
  return { useCase: new AwardLegacyPointsUseCase(users, legacy, seasons, audit), addManualEntry, record }
}

describe('AwardLegacyPointsUseCase', () => {
  it('awards a manual rule, trims the reason and audits it', async () => {
    const { useCase, addManualEntry, record } = build()
    await useCase.execute(INPUT)

    expect(addManualEntry).toHaveBeenCalledWith({
      userId: 'p1', ruleId: 'r-ref', points: 15, reason: 'Parrainage de X', earnedOn: '2026-10-01', createdBy: 'admin-1',
    })
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'legacy_points.awarded', targetId: 'e1', metadata: expect.not.objectContaining({ reason: expect.anything() }) }),
    )
  })

  it('refuses a role that cannot award, before anything else', async () => {
    const { useCase, addManualEntry } = build({ actor: user('admin-1', [{ role: 'treasurer' }]) })
    await expect(useCase.execute(INPUT)).rejects.toThrow(ForbiddenError)
    expect(addManualEntry).not.toHaveBeenCalled()
  })

  it('refuses a target that is not a player', async () => {
    const { useCase } = build()
    await expect(useCase.execute({ ...INPUT, userId: 'coach-1' })).rejects.toThrow(InvalidLegacyInputError)
  })

  it('refuses an unknown rule and an automatic-channel rule', async () => {
    const { useCase } = build()
    await expect(useCase.execute({ ...INPUT, ruleId: 'nope' })).rejects.toThrow(InvalidLegacyInputError)
    await expect(useCase.execute({ ...INPUT, ruleId: 'r-train', points: 5 })).rejects.toThrow(InvalidLegacyInputError)
  })

  it('refuses points that differ from a fixed rule and an empty reason', async () => {
    const { useCase } = build()
    await expect(useCase.execute({ ...INPUT, points: 20 })).rejects.toThrow(InvalidLegacyInputError)
    await expect(useCase.execute({ ...INPUT, reason: '  ' })).rejects.toThrow(InvalidLegacyInputError)
  })

  it('refuses a fact dated in a season that is not configured (PO-LG-16)', async () => {
    await expect(build({ mode: null }).useCase.execute(INPUT)).rejects.toThrow(LegacySeasonNotConfiguredError)
    await expect(build({ tiers: [] }).useCase.execute(INPUT)).rejects.toThrow(LegacySeasonNotConfiguredError)
  })

  it('refuses a fact dated in no season', async () => {
    await expect(build({ seasons: [] }).useCase.execute(INPUT)).rejects.toThrow(LegacySeasonNotConfiguredError)
  })

  it('still succeeds when the audit write fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { useCase } = build({ auditFails: true })
    await expect(useCase.execute(INPUT)).resolves.toMatchObject({ id: 'e1' })
    spy.mockRestore()
  })

  describe('points_catchup (PO-LPC-03)', () => {
    const CATCHUP = { actorId: 'admin-1', userId: 'p1', ruleId: 'r-catchup', points: 150, reason: 'saison précédente', earnedOn: '2025-03-10', seasonId: 's0' }

    it('records a catch-up in a configured past season, even with no convocation, and audits the rule action', async () => {
      const { useCase, addManualEntry, record } = build()
      await useCase.execute(CATCHUP)
      expect(addManualEntry).toHaveBeenCalledWith(expect.objectContaining({ points: 150, earnedOn: '2025-03-10', reason: 'saison précédente' }))
      expect(addManualEntry).toHaveBeenCalledWith(expect.not.objectContaining({ seasonId: expect.anything() }))
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'legacy_points.awarded', metadata: expect.objectContaining({ ruleAction: 'points_catchup', points: 150 }) }),
      )
    })

    it('accepts both boundary days of the chosen season', async () => {
      const { useCase } = build()
      await expect(useCase.execute({ ...CATCHUP, earnedOn: '2024-07-01' })).resolves.toBeDefined()
      await expect(useCase.execute({ ...CATCHUP, earnedOn: '2025-06-30' })).resolves.toBeDefined()
    })

    it('refuses a date outside the chosen season, boundary days excluded (AC-LPC-05)', async () => {
      const { useCase, addManualEntry } = build()
      await expect(useCase.execute({ ...CATCHUP, earnedOn: '2025-07-01' })).rejects.toThrow(LegacyDateOutsideSeasonError)
      await expect(useCase.execute({ ...CATCHUP, earnedOn: '2024-06-30' })).rejects.toThrow(LegacyDateOutsideSeasonError)
      // a date inside ANOTHER season is still outside the chosen one
      await expect(useCase.execute({ ...CATCHUP, earnedOn: '2026-10-01' })).rejects.toThrow(LegacyDateOutsideSeasonError)
      expect(addManualEntry).not.toHaveBeenCalled()
    })

    it('refuses a chosen season that is not configured (AC-LPC-06)', async () => {
      await expect(build({ mode: null }).useCase.execute(CATCHUP)).rejects.toThrow(LegacyChosenSeasonNotConfiguredError)
      await expect(build({ tiers: [] }).useCase.execute(CATCHUP)).rejects.toThrow(LegacySeasonNotConfiguredError)
    })

    it('checks the date in the season before the configuration', async () => {
      await expect(build({ mode: null }).useCase.execute({ ...CATCHUP, earnedOn: '2026-10-01' })).rejects.toThrow(LegacyDateOutsideSeasonError)
    })

    it('refuses a missing or unknown chosen season', async () => {
      const { useCase } = build()
      await expect(useCase.execute({ ...CATCHUP, seasonId: undefined })).rejects.toThrow(InvalidLegacyInputError)
      await expect(useCase.execute({ ...CATCHUP, seasonId: 'nope' })).rejects.toThrow(InvalidLegacyInputError)
    })

    it('refuses 0, 301 and a blank reason before any season check', async () => {
      const { useCase, addManualEntry } = build()
      await expect(useCase.execute({ ...CATCHUP, points: 0 })).rejects.toThrow(InvalidLegacyInputError)
      await expect(useCase.execute({ ...CATCHUP, points: 301 })).rejects.toThrow(InvalidLegacyInputError)
      await expect(useCase.execute({ ...CATCHUP, reason: '  ' })).rejects.toThrow(InvalidLegacyInputError)
      expect(addManualEntry).not.toHaveBeenCalled()
    })

    it('refuses a role without legacy:award (AC-LPC-09)', async () => {
      const { useCase } = build({ actor: user('admin-1', [{ role: 'coach', teamIds: [] }]) })
      await expect(useCase.execute(CATCHUP)).rejects.toThrow(ForbiddenError)
    })
  })
})
