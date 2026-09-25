import { describe, expect, it, vi } from 'vitest'
import type { MatchArrangements, MatchDetails } from '../../entities/match-details'
import type { Convocation } from '../../entities/convocation'
import { InvalidScheduleError } from '../../errors/invalid-schedule-error'
import { MatchArrangementsWindowClosedError } from '../../errors/match-arrangements-window-closed-error'
import { NotFoundError } from '../../errors/not-found-error'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import { UpdateMatchDetailsUseCase } from './UpdateMatchDetailsUseCase'

function convocationWith(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: 'convocation-1',
    teamId: 'team-1',
    type: 'match',
    date: '2026-08-10T15:00:00.000Z', // kickoff
    location: 'Stade municipal',
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'coach-1',
    ...overrides,
  }
}

function arrangementsWith(overrides: Partial<MatchArrangements> = {}): MatchArrangements {
  return {
    isHome: true,
    meetingPointTime: '2026-08-10T13:30:00.000Z', // before kickoff, same day
    meetingPointLocation: 'Vestiaires',
    ...overrides,
  }
}

function fakeConvocationRepository(convocation: Convocation | null, overrides: Partial<ConvocationRepository> = {}): ConvocationRepository {
  return {
    listForTeam: async () => [],
    findById: async () => convocation,
    createTraining: async () => convocation as Convocation,
    createMatch: async () => convocation as Convocation,
    createMeeting: async () => convocation as Convocation,
    updateArrangements: async (id, arrangements) => ({ ...(convocation as Convocation), id, ...arrangements }),
    ...overrides,
  }
}

function fakeMatchDetailsRepository(overrides: Partial<MatchDetailsRepository> = {}): MatchDetailsRepository {
  return {
    upsert: async (details) => details,
    findByConvocationId: async () => null,
    updateArrangements: async (convocationId, arrangements) => ({
      convocationId,
      opponentId: 'opponent-1',
      ...arrangements,
    }),
    ...overrides,
  }
}

describe('UpdateMatchDetailsUseCase', () => {
  it('throws NotFoundError when the convocation does not exist', async () => {
    const useCase = new UpdateMatchDetailsUseCase(fakeConvocationRepository(null), fakeMatchDetailsRepository())

    await expect(
      useCase.execute({ convocationId: 'convocation-1', arrangements: arrangementsWith(), now: new Date('2026-08-10T12:00:00.000Z') }),
    ).rejects.toThrow(NotFoundError)
  })

  // AC-EM-11 — a convocation whose type isn't 'match' has no MatchDetails
  // row to edit at all: same NotFoundError as "doesn't exist", never a
  // silent no-op and never a call to updateArrangements.
  it('throws NotFoundError when the convocation is not a match', async () => {
    const updateArrangements = vi.fn()
    const useCase = new UpdateMatchDetailsUseCase(
      fakeConvocationRepository(convocationWith({ type: 'training' })),
      fakeMatchDetailsRepository({ updateArrangements }),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', arrangements: arrangementsWith(), now: new Date('2026-08-10T12:00:00.000Z') }),
    ).rejects.toThrow(NotFoundError)
    expect(updateArrangements).not.toHaveBeenCalled()
  })

  // §3 — "Convocation closed ou cancelled": refused regardless of the date,
  // the status check is independent of isPastDate.
  it('throws MatchArrangementsWindowClosedError when the convocation is closed', async () => {
    const useCase = new UpdateMatchDetailsUseCase(
      fakeConvocationRepository(convocationWith({ status: 'closed' })),
      fakeMatchDetailsRepository(),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', arrangements: arrangementsWith(), now: new Date('2026-08-10T12:00:00.000Z') }),
    ).rejects.toThrow(MatchArrangementsWindowClosedError)
  })

  it('throws MatchArrangementsWindowClosedError when the convocation is cancelled', async () => {
    const useCase = new UpdateMatchDetailsUseCase(
      fakeConvocationRepository(convocationWith({ status: 'cancelled' })),
      fakeMatchDetailsRepository(),
    )

    await expect(
      useCase.execute({ convocationId: 'convocation-1', arrangements: arrangementsWith(), now: new Date('2026-08-10T12:00:00.000Z') }),
    ).rejects.toThrow(MatchArrangementsWindowClosedError)
  })

  // AC-EM-04, §3/§10 — "ouvert avant, soumis après": the SAME kickoff
  // instant, but two DISTINCT `now` values — a named test, not a side
  // effect of another one, per the mentor-agent note (§10).
  it('rejects a submission made after kickoff even though the form was opened before it (AC-EM-04)', async () => {
    const kickoff = '2026-08-10T15:00:00.000Z'
    const useCase = new UpdateMatchDetailsUseCase(fakeConvocationRepository(convocationWith({ date: kickoff })), fakeMatchDetailsRepository())

    const openedAt = new Date('2026-08-10T14:58:00.000Z')
    const submittedAt = new Date('2026-08-10T15:01:00.000Z')

    // Opening the form (evaluated with `openedAt`) would still be within
    // the window — this use case is only ever called at submission time,
    // with the LATER `now`, which is what must be rejected.
    expect(isPastDateFixture(kickoff, openedAt)).toBe(false)

    await expect(useCase.execute({ convocationId: 'convocation-1', arrangements: arrangementsWith(), now: submittedAt })).rejects.toThrow(
      MatchArrangementsWindowClosedError,
    )
  })

  it('allows a submission made exactly at kickoff to go through (isPastDate is strictly-less-than)', async () => {
    const kickoff = '2026-08-10T15:00:00.000Z'
    const useCase = new UpdateMatchDetailsUseCase(fakeConvocationRepository(convocationWith({ date: kickoff })), fakeMatchDetailsRepository())

    const result = await useCase.execute({
      convocationId: 'convocation-1',
      arrangements: arrangementsWith(),
      now: new Date(kickoff),
    })

    expect(result.meetingPointLocation).toBe('Vestiaires')
  })

  // §3 — reused as-is from create-convocation (PO-CV-09): the RDV must
  // precede kickoff, the same day.
  it('throws InvalidScheduleError when the new meeting point time is at or after kickoff', async () => {
    const useCase = new UpdateMatchDetailsUseCase(fakeConvocationRepository(convocationWith()), fakeMatchDetailsRepository())

    await expect(
      useCase.execute({
        convocationId: 'convocation-1',
        arrangements: arrangementsWith({ meetingPointTime: '2026-08-10T15:30:00.000Z' }),
        now: new Date('2026-08-10T12:00:00.000Z'),
      }),
    ).rejects.toThrow(InvalidScheduleError)
  })

  it('throws InvalidScheduleError when the new meeting point time is on a different day than kickoff', async () => {
    const useCase = new UpdateMatchDetailsUseCase(fakeConvocationRepository(convocationWith()), fakeMatchDetailsRepository())

    await expect(
      useCase.execute({
        convocationId: 'convocation-1',
        arrangements: arrangementsWith({ meetingPointTime: '2026-08-09T13:30:00.000Z' }),
        now: new Date('2026-08-09T12:00:00.000Z'),
      }),
    ).rejects.toThrow(InvalidScheduleError)
  })

  // The narrow write path itself — proves the use case calls
  // updateArrangements with exactly the three-field Pick<>, never upsert,
  // and never invents/derives opponentId along the way.
  it('calls updateArrangements with exactly the three arrangements fields (never upsert)', async () => {
    const upsert = vi.fn()
    const updateArrangements = vi.fn(async (convocationId: string, arrangements: MatchArrangements): Promise<MatchDetails> => ({
      convocationId,
      opponentId: 'opponent-1',
      ...arrangements,
    }))
    const useCase = new UpdateMatchDetailsUseCase(
      fakeConvocationRepository(convocationWith()),
      fakeMatchDetailsRepository({ upsert, updateArrangements }),
    )

    const arrangements = arrangementsWith({ isHome: false, meetingPointLocation: 'Parking visiteurs' })
    const result = await useCase.execute({ convocationId: 'convocation-1', arrangements, now: new Date('2026-08-10T12:00:00.000Z') })

    expect(updateArrangements).toHaveBeenCalledExactlyOnceWith('convocation-1', arrangements)
    expect(upsert).not.toHaveBeenCalled()
    expect(result.isHome).toBe(false)
    expect(result.meetingPointLocation).toBe('Parking visiteurs')
  })

  // Coach feedback (2026-09-25) — RDV is optional: clearing it back to unset
  // (null) has nothing to validate against kickoff, and must not throw.
  it('allows clearing the RDV back to unset, without running isValidMatchSchedule', async () => {
    const updateArrangements = vi.fn(async (convocationId: string, arrangements: MatchArrangements): Promise<MatchDetails> => ({
      convocationId,
      opponentId: 'opponent-1',
      ...arrangements,
    }))
    const useCase = new UpdateMatchDetailsUseCase(
      fakeConvocationRepository(convocationWith()),
      fakeMatchDetailsRepository({ updateArrangements }),
    )

    const result = await useCase.execute({
      convocationId: 'convocation-1',
      arrangements: arrangementsWith({ meetingPointTime: null, meetingPointLocation: null }),
      now: new Date('2026-08-10T12:00:00.000Z'),
    })

    expect(result.meetingPointTime).toBeNull()
    expect(result.meetingPointLocation).toBeNull()
  })

  // AC-02-equivalent for a race at the application layer: a race where the
  // repository itself rejects (mirrors the DB refusing a stale write) must
  // surface as-is, not be swallowed.
  it('propagates a rejection from the repository write itself (server-side race)', async () => {
    const updateArrangements = vi.fn(async () => {
      throw new NotFoundError('convocation-1')
    })
    const useCase = new UpdateMatchDetailsUseCase(fakeConvocationRepository(convocationWith()), fakeMatchDetailsRepository({ updateArrangements }))

    await expect(
      useCase.execute({ convocationId: 'convocation-1', arrangements: arrangementsWith(), now: new Date('2026-08-10T12:00:00.000Z') }),
    ).rejects.toThrow(NotFoundError)
  })

  // Developer decision (2026-09-25) — widens the original scope: the coach
  // may also correct the convocation's own kickoff/location, not just
  // MatchDetails. Optional and backward-compatible: every test above omits
  // `convocationArrangements` and keeps passing unchanged.
  describe('convocationArrangements (developer decision, 2026-09-25)', () => {
    it('writes the convocation arrangements before the match arrangements, and validates the RDV against the NEW kickoff', async () => {
      const updateConvocationArrangements = vi.fn(async (id: string, arrangements: { date: string; location: string }) => ({
        ...convocationWith(),
        id,
        ...arrangements,
      }))
      const updateMatchArrangements = vi.fn(async (convocationId: string, arrangements: MatchArrangements) => ({
        convocationId,
        opponentId: 'opponent-1',
        ...arrangements,
      }))
      const useCase = new UpdateMatchDetailsUseCase(
        fakeConvocationRepository(convocationWith(), { updateArrangements: updateConvocationArrangements }),
        fakeMatchDetailsRepository({ updateArrangements: updateMatchArrangements }),
      )

      // Kickoff moves to a new day; the RDV is on THAT new day (would be
      // invalid against the original 2026-08-10 kickoff read in step 1).
      const newKickoff = '2026-08-12T15:00:00.000Z'
      const result = await useCase.execute({
        convocationId: 'convocation-1',
        arrangements: arrangementsWith({ meetingPointTime: '2026-08-12T13:30:00.000Z' }),
        convocationArrangements: { date: newKickoff, location: 'Nouveau stade' },
        now: new Date('2026-08-10T12:00:00.000Z'),
      })

      expect(updateConvocationArrangements).toHaveBeenCalledExactlyOnceWith('convocation-1', {
        date: newKickoff,
        location: 'Nouveau stade',
      })
      expect(updateMatchArrangements).toHaveBeenCalledExactlyOnceWith(
        'convocation-1',
        expect.objectContaining({ meetingPointTime: '2026-08-12T13:30:00.000Z' }),
      )
      expect(result.meetingPointLocation).toBe('Vestiaires')
    })

    it('still evaluates the window against the ORIGINAL convocation, not the new kickoff being submitted', async () => {
      // Convocation is already closed — moving the kickoff must not bypass
      // the window check.
      const useCase = new UpdateMatchDetailsUseCase(fakeConvocationRepository(convocationWith({ status: 'closed' })), fakeMatchDetailsRepository())

      await expect(
        useCase.execute({
          convocationId: 'convocation-1',
          arrangements: arrangementsWith(),
          convocationArrangements: { date: '2026-08-20T15:00:00.000Z', location: 'Nouveau stade' },
          now: new Date('2026-08-10T12:00:00.000Z'),
        }),
      ).rejects.toThrow(MatchArrangementsWindowClosedError)
    })

    it('rejects when the RDV is invalid against the NEW kickoff even though it was valid against the original one', async () => {
      const useCase = new UpdateMatchDetailsUseCase(
        fakeConvocationRepository(convocationWith()), // original kickoff: 2026-08-10T15:00
        fakeMatchDetailsRepository(),
      )

      await expect(
        useCase.execute({
          convocationId: 'convocation-1',
          // Valid against the ORIGINAL kickoff (2026-08-10T15:00) but not
          // against the NEW one (2026-08-11).
          arrangements: arrangementsWith({ meetingPointTime: '2026-08-10T13:30:00.000Z' }),
          convocationArrangements: { date: '2026-08-11T15:00:00.000Z', location: 'Stade municipal' },
          now: new Date('2026-08-10T12:00:00.000Z'),
        }),
      ).rejects.toThrow(InvalidScheduleError)
    })

    it('never calls the convocation write when convocationArrangements is omitted (backward compatible)', async () => {
      const updateArrangements = vi.fn()
      const useCase = new UpdateMatchDetailsUseCase(
        fakeConvocationRepository(convocationWith(), { updateArrangements }),
        fakeMatchDetailsRepository(),
      )

      await useCase.execute({ convocationId: 'convocation-1', arrangements: arrangementsWith(), now: new Date('2026-08-10T12:00:00.000Z') })

      expect(updateArrangements).not.toHaveBeenCalled()
    })
  })
})

// Local copy of the exact comparison isPastDate performs, used only to
// document the `openedAt` value's own status in the AC-EM-04 test above —
// NOT a re-implementation the use case depends on.
function isPastDateFixture(date: string, now: Date): boolean {
  return new Date(date) < now
}
