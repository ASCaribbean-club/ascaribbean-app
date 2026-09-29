import { describe, expect, it, vi } from 'vitest'
import type { AttendanceRecord, Convocation } from '../../entities/convocation'
import type { MatchEvent } from '../../entities/match-event'
import type { AttendanceRecordRepository } from '../../repositories/attendance-record-repository'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
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

describe('GetTeamStatsUseCase', () => {
  it('returns the roster from TeamRosterRepository unchanged', async () => {
    const roster: TeamRosterPlayer[] = [{ userId: 'player-1', displayName: 'Joueur 1' }]
    const useCase = new GetTeamStatsUseCase(
      fakeTeamRosterRepository(roster),
      fakeConvocationRepository(),
      fakeAttendanceRecordRepository(),
      fakeMatchEventRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1' })

    expect(result.roster).toBe(roster)
  })

  // AC-CTS-16 — "aucune séance constatée" is a valid empty state: the team
  // rate must be null, not a fabricated 0%.
  it('returns a null team attendance rate when there are no AttendanceRecord rows at all', async () => {
    const useCase = new GetTeamStatsUseCase(
      fakeTeamRosterRepository(),
      fakeConvocationRepository([convocationWith({ id: 'c1', type: 'training' })]),
      fakeAttendanceRecordRepository([]),
      fakeMatchEventRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1' })

    expect(result.attendance.team).toEqual({ tally: { presentCount: 0, totalCount: 0 }, rate: null })
    expect(result.attendance.byPlayer).toEqual({})
  })

  it('aggregates attendance across every player, keeping a player with no record entirely out of byPlayer (AC-CTS-07)', async () => {
    const roster: TeamRosterPlayer[] = [
      { userId: 'player-1', displayName: 'Joueur 1' },
      { userId: 'player-2', displayName: 'Joueur 2' },
    ]
    const records = [attendanceRecord('player-1', 'present'), attendanceRecord('player-1', 'absent')]
    const useCase = new GetTeamStatsUseCase(
      fakeTeamRosterRepository(roster),
      fakeConvocationRepository([convocationWith({ id: 'c1', type: 'training' })]),
      fakeAttendanceRecordRepository(records),
      fakeMatchEventRepository(),
    )

    const result = await useCase.execute({ teamId: 'team-1' })

    expect(result.attendance.team).toEqual({ tally: { presentCount: 1, totalCount: 2 }, rate: 50 })
    expect(result.attendance.byPlayer).toEqual({ 'player-1': { tally: { presentCount: 1, totalCount: 2 }, rate: 50 } })
    expect(Object.hasOwn(result.attendance.byPlayer, 'player-2')).toBe(false)
  })

  it('aggregates goals and cards per player and the team card total, from match_events only', async () => {
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
    )

    const result = await useCase.execute({ teamId: 'team-1' })

    expect(result.goalsByPlayer).toEqual({ 'player-1': 1 })
    expect(result.cards.byPlayer).toEqual({ 'player-1': { yellowCount: 1, redCount: 0 }, 'player-2': { yellowCount: 0, redCount: 1 } })
    expect(result.cards.team).toEqual({ yellowCount: 1, redCount: 1 })
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
    )

    await useCase.execute({ teamId: 'team-1' })

    expect(findByConvocations).toHaveBeenCalledExactlyOnceWith(['training-1', 'match-1', 'meeting-1'])
  })
})
