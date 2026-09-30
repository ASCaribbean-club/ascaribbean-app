import { describe, expect, it, vi } from 'vitest'
import type { AttendanceRecord, Convocation } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { MatchEvent } from '../../entities/match-event'
import type { AttendanceRecordRepository } from '../../repositories/attendance-record-repository'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { MatchEventRepository } from '../../repositories/match-event-repository'
import type { TeamRosterPlayer, TeamRosterRepository } from '../../repositories/team-roster-repository'
import { GetTeamStatsUseCase } from './GetTeamStatsUseCase'

function convocationWith(overrides: Partial<Convocation>): Convocation {
  return {
    id: 'c1',
    teamId: 'team-1',
    type: 'training',
    date: '2026-08-20T18:00:00.000Z',
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

function attendanceRecord(userId: string, actualStatus: AttendanceRecord['actualStatus'], overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: `ar-${userId}-${Math.random()}`,
    convocationId: 'c1',
    userId,
    actualStatus,
    absenceValidity: null,
    note: null,
    validatedBy: 'coach-1',
    validatedAt: '2026-09-01T18:00:00Z',
    ...overrides,
  }
}

function matchEvent(userId: string, eventType: MatchEvent['eventType'], overrides: Partial<MatchEvent> = {}): MatchEvent {
  return {
    id: `ev-${userId}-${Math.random()}`,
    convocationId: 'c2',
    userId,
    eventType,
    isPenalty: false,
    createdBy: 'coach-1',
    createdAt: '2026-09-01T18:00:00Z',
    ...overrides,
  }
}

function fakeTeamRosterRepository(players: TeamRosterPlayer[] = []): TeamRosterRepository {
  return { listPlayers: async () => players }
}

function fakeConvocationRepository(convocations: Convocation[] = []): ConvocationRepository {
  return {
    listForTeam: async () => convocations,
    findById: async () => null,
    createTraining: vi.fn(),
    createMatch: vi.fn(),
    createMeeting: vi.fn(),
    updateArrangements: vi.fn(),
  } as unknown as ConvocationRepository
}

function fakeAttendanceRecordRepository(records: AttendanceRecord[] = []): AttendanceRecordRepository {
  return {
    upsert: async (record) => ({ id: 'a1', ...record }),
    findByConvocation: async () => records,
    findByConvocations: async () => records,
    getOwnAttendanceSummary: async () => ({ validatedCount: 0, presentCount: 0 }),
    getOwnAttendanceSummaryByType: async () => [],
  }
}

function fakeMatchEventRepository(events: MatchEvent[] = []): MatchEventRepository {
  return {
    add: async (event) => ({ id: 'event-new', createdAt: new Date().toISOString(), ...event }) as MatchEvent,
    delete: async () => {},
    findByConvocation: async () => events,
    findByConvocations: async () => events,
    getOwnGoalsCountForCurrentSeason: async () => 0,
    getOwnCardsCountForCurrentSeason: async () => ({ yellowCount: 0, redCount: 0 }),
  }
}

function fakeMatchDetailsRepository(matchDetails: MatchDetails[] = []): MatchDetailsRepository {
  return {
    upsert: vi.fn(),
    findByConvocationId: vi.fn(),
    recordScore: vi.fn(),
    updateArrangements: vi.fn(),
    findByConvocations: async () => matchDetails,
  }
}

describe('GetTeamStatsUseCase', () => {
  it('returns the roster from TeamRosterRepository unchanged', async () => {
    const roster: TeamRosterPlayer[] = [{ userId: 'player-1', displayName: 'Joueur 1' }]
    const useCase = new GetTeamStatsUseCase(
      fakeTeamRosterRepository(roster),
      fakeConvocationRepository(),
      fakeAttendanceRecordRepository(),
      fakeMatchEventRepository(),
      fakeMatchDetailsRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1' })

    expect(result.roster).toBe(roster)
  })

  // AC-CTS-16 — "aucune séance constatée" is a valid empty state: the team
  // rate must be null, not a fabricated 0%. With no OPEN convocation at all,
  // openConvocations.length is 0 regardless of AttendanceRecord rows.
  it('returns a null team attendance rate when there is no open convocation at all', async () => {
    const useCase = new GetTeamStatsUseCase(
      fakeTeamRosterRepository(),
      fakeConvocationRepository([convocationWith({ id: 'c1', type: 'training', status: 'cancelled' })]),
      fakeAttendanceRecordRepository([]),
      fakeMatchEventRepository(),
      fakeMatchDetailsRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1' })

    expect(result.attendance.team).toEqual({ tally: { presentCount: 0, totalCount: 0 }, rate: null })
    expect(result.attendance.byPlayer).toEqual({})
  })

  // PO-CTS-04(a)/(d) tranché (développeuse, 2026-09-29) — a cancelled
  // convocation never took place and is excluded from both the attendance
  // read and the total. This is now a REAL 0%, not the AC-CTS-16 empty
  // state above: an open convocation exists, it simply has no recorded
  // attendance yet — an accepted, known edge case of counting
  // openConvocations.length rather than "convocations with at least one
  // recorded row".
  it('counts an open convocation toward the total even with zero AttendanceRecord rows for it', async () => {
    const useCase = new GetTeamStatsUseCase(
      fakeTeamRosterRepository(),
      fakeConvocationRepository([
        convocationWith({ id: 'c1', type: 'training', status: 'open' }),
        convocationWith({ id: 'c2', type: 'training', status: 'cancelled' }),
      ]),
      fakeAttendanceRecordRepository([]),
      fakeMatchEventRepository(),
      fakeMatchDetailsRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1' })

    expect(result.attendance.team).toEqual({ tally: { presentCount: 0, totalCount: 1 }, rate: 0 })
  })

  it('aggregates attendance across every player, keeping a player with no record entirely out of byPlayer (AC-CTS-07)', async () => {
    const roster: TeamRosterPlayer[] = [
      { userId: 'player-1', displayName: 'Joueur 1' },
      { userId: 'player-2', displayName: 'Joueur 2' },
    ]
    const records = [attendanceRecord('player-1', 'present'), attendanceRecord('player-1', 'absent')]
    const useCase = new GetTeamStatsUseCase(
      fakeTeamRosterRepository(roster),
      fakeConvocationRepository([
        convocationWith({ id: 'c1', type: 'training' }),
        convocationWith({ id: 'c2', type: 'training' }),
        // Third open convocation with NO AttendanceRecord row at all —
        // proves totalCount tracks convocation count (3), not records.length
        // (2): the two would otherwise coincide and this test would pass
        // for the wrong reason.
        convocationWith({ id: 'c3', type: 'training' }),
      ]),
      fakeAttendanceRecordRepository(records),
      fakeMatchEventRepository(),
      fakeMatchDetailsRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1' })

    // PO-CTS-04(a)/(d) tranché — team totalCount is the OPEN CONVOCATION
    // count (3 here), never records.length (2).
    expect(result.attendance.team).toEqual({ tally: { presentCount: 1, totalCount: 3 }, rate: 33 })
    // Per-player totalCount is unaffected by this change: records.length
    // still matches 1:1 with "convocations this player has a row for",
    // since the use case only ever fetches rows for open convocations now.
    expect(result.attendance.byPlayer).toEqual({ 'player-1': { tally: { presentCount: 1, totalCount: 2 }, rate: 50 } })
    expect(Object.hasOwn(result.attendance.byPlayer, 'player-2')).toBe(false)
  })

  it('aggregates per-player goals/cards from match_events and the card total from match_events', async () => {
    const events = [
      matchEvent('player-1', 'goal'),
      matchEvent('player-1', 'yellow_card'),
      matchEvent('player-2', 'red_card'),
    ]
    const useCase = new GetTeamStatsUseCase(
      fakeTeamRosterRepository(),
      fakeConvocationRepository([convocationWith({ id: 'c2', type: 'match' })]),
      fakeAttendanceRecordRepository(),
      fakeMatchEventRepository(events),
      fakeMatchDetailsRepository([{ convocationId: 'c2', goalsFor: 1, goalsAgainst: 0 } as MatchDetails]),
    )

    const result = await useCase.execute({ teamId: 'team-1' })

    expect(result.goals.byPlayer).toEqual({ 'player-1': 1 })
    expect(result.cards.byPlayer).toEqual({ 'player-1': { yellowCount: 1, redCount: 0 }, 'player-2': { yellowCount: 0, redCount: 1 } })
    expect(result.cards.team).toEqual({ yellowCount: 1, redCount: 1 })
  })

  // specs/coach-team-stats.md §6 point 4 — "un bilan d'équipe se lit sur
  // match_details", never recomputed from match_events: goal events can
  // legitimately undercount goals_for (AC-MS-05/17, a coach isn't required
  // to attribute every goal to a scorer), so the team total must track
  // goals_for even when it disagrees with the scorer-event count.
  it('sums the team goal total from match_details.goalsFor, not from match_events, even when they disagree', async () => {
    const events = [matchEvent('player-1', 'goal')]
    const matchDetails = [
      { convocationId: 'c2', goalsFor: 3, goalsAgainst: 1 } as MatchDetails,
      { convocationId: 'c3', goalsFor: 2, goalsAgainst: 2 } as MatchDetails,
      // A match not yet played (both null) must not contribute — AC-MS-15.
      { convocationId: 'c4', goalsFor: null, goalsAgainst: null } as MatchDetails,
    ]
    const useCase = new GetTeamStatsUseCase(
      fakeTeamRosterRepository(),
      fakeConvocationRepository([
        convocationWith({ id: 'c2', type: 'match' }),
        convocationWith({ id: 'c3', type: 'match' }),
        convocationWith({ id: 'c4', type: 'match' }),
      ]),
      fakeAttendanceRecordRepository(),
      fakeMatchEventRepository(events),
      fakeMatchDetailsRepository(matchDetails),
    )

    const result = await useCase.execute({ teamId: 'team-1' })

    expect(result.goals.team).toBe(5)
    expect(result.goals.byPlayer).toEqual({ 'player-1': 1 })
  })

  // AC-MS-18 — match_events only ever exist on 'match' convocations. This
  // proves the use case restricts the bulk read to match convocation ids
  // rather than passing every convocation id through.
  it('only requests match events for convocations of type "match"', async () => {
    const findByConvocations = vi.fn(async () => [])
    const convocations = [
      convocationWith({ id: 'training-1', type: 'training' }),
      convocationWith({ id: 'match-1', type: 'match' }),
      convocationWith({ id: 'meeting-1', type: 'meeting' }),
    ]
    const matchEventRepository: MatchEventRepository = {
      add: vi.fn(),
      delete: vi.fn(),
      findByConvocation: vi.fn(),
      findByConvocations,
      getOwnGoalsCountForCurrentSeason: vi.fn(),
      getOwnCardsCountForCurrentSeason: vi.fn(),
    }
    const useCase = new GetTeamStatsUseCase(
      fakeTeamRosterRepository(),
      fakeConvocationRepository(convocations),
      fakeAttendanceRecordRepository(),
      matchEventRepository,
      fakeMatchDetailsRepository(),
    )

    await useCase.execute({ teamId: 'team-1' })

    expect(findByConvocations).toHaveBeenCalledExactlyOnceWith(['match-1'])
  })

  it('only requests match details for convocations of type "match"', async () => {
    const findByConvocations = vi.fn(async () => [])
    const convocations = [
      convocationWith({ id: 'training-1', type: 'training' }),
      convocationWith({ id: 'match-1', type: 'match' }),
      convocationWith({ id: 'meeting-1', type: 'meeting' }),
    ]
    const matchDetailsRepository: MatchDetailsRepository = {
      upsert: vi.fn(),
      findByConvocationId: vi.fn(),
      recordScore: vi.fn(),
      updateArrangements: vi.fn(),
      findByConvocations,
    }
    const useCase = new GetTeamStatsUseCase(
      fakeTeamRosterRepository(),
      fakeConvocationRepository(convocations),
      fakeAttendanceRecordRepository(),
      fakeMatchEventRepository(),
      matchDetailsRepository,
    )

    await useCase.execute({ teamId: 'team-1' })

    expect(findByConvocations).toHaveBeenCalledExactlyOnceWith(['match-1'])
  })

  it('requests attendance records for every convocation of the team, regardless of type', async () => {
    const findByConvocations = vi.fn(async () => [])
    const convocations = [
      convocationWith({ id: 'training-1', type: 'training' }),
      convocationWith({ id: 'match-1', type: 'match' }),
      convocationWith({ id: 'meeting-1', type: 'meeting' }),
    ]
    const attendanceRecordRepository: AttendanceRecordRepository = {
      upsert: vi.fn(),
      findByConvocation: vi.fn(),
      findByConvocations,
      getOwnAttendanceSummary: vi.fn(),
      getOwnAttendanceSummaryByType: vi.fn(),
    }
    const useCase = new GetTeamStatsUseCase(
      fakeTeamRosterRepository(),
      fakeConvocationRepository(convocations),
      attendanceRecordRepository,
      fakeMatchEventRepository(),
      fakeMatchDetailsRepository(),
    )

    await useCase.execute({ teamId: 'team-1' })

    expect(findByConvocations).toHaveBeenCalledExactlyOnceWith(['training-1', 'match-1', 'meeting-1'])
  })
})
