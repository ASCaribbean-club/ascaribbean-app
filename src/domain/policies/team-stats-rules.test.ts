import { describe, expect, it } from 'vitest'
import type { AttendanceRecord } from '../entities/convocation'
import type { MatchEvent } from '../entities/match-event'
import type { MatchDetails } from '../entities/match-details'
import { attendanceRate, sumTeamGoals, tallyAttendance, tallyAttendanceByPlayer, tallyCardsByPlayer, tallyGoalsByPlayer, tallyTeamCards } from './team-stats-rules'

function attendanceRecord(userId: string, actualStatus: AttendanceRecord['actualStatus'], overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: `ar-${userId}-${Math.random()}`,
    convocationId: 'convocation-1',
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
    convocationId: 'convocation-1',
    userId,
    eventType,
    isPenalty: false,
    createdBy: 'coach-1',
    createdAt: '2026-09-01T18:00:00Z',
    ...overrides,
  }
}

describe('tallyAttendance', () => {
  it('returns zeroed counts when no records exist and no open convocations (AC-CTS-16, "aucune séance constatée")', () => {
    expect(tallyAttendance([], 0)).toEqual({ presentCount: 0, totalCount: 0 })
  })

  // PO-CTS-04(a)/(d) tranché — totalCount is the OPEN CONVOCATION count
  // passed in by the caller, never records.length: with several players on
  // a roster, summing every player's own rows produces a number with no
  // "how many sessions" meaning.
  it('counts present across every record regardless of player, and totalCount from the open-convocation count, not records.length', () => {
    const records = [
      attendanceRecord('player-1', 'present'),
      attendanceRecord('player-2', 'absent'),
      attendanceRecord('player-1', 'present'),
    ]
    expect(tallyAttendance(records, 2)).toEqual({ presentCount: 2, totalCount: 2 })
  })

  it('counts a record with actualStatus "absent" toward presentCount as zero, independently of the open-convocation count', () => {
    expect(tallyAttendance([attendanceRecord('player-1', 'absent')], 1)).toEqual({ presentCount: 0, totalCount: 1 })
  })

  // AC-CTS-06 — never derives from anything but actualStatus itself; a
  // record carrying absenceValidity/note must not change the count.
  it('ignores absenceValidity and note entirely (AC-CTS-06/AC-CTS-10)', () => {
    const records = [attendanceRecord('player-1', 'absent', { absenceValidity: 'excused', note: 'Blessé' })]
    expect(tallyAttendance(records, 1)).toEqual({ presentCount: 0, totalCount: 1 })
  })
})

describe('attendanceRate', () => {
  // AC-CTS-16/AC-CTS-17 — the exact boundary this rule exists for: zero
  // records is "no data", not a fabricated 0%.
  it('returns null when totalCount is 0, never a fabricated 0%', () => {
    expect(attendanceRate({ presentCount: 0, totalCount: 0 })).toBeNull()
  })

  // A genuine 0% (every recorded session was an absence) must stay
  // distinguishable from "no data" — this is the case attendanceRate's own
  // comment calls out explicitly.
  it('returns 0 (not null) when every recorded session was an absence', () => {
    expect(attendanceRate({ presentCount: 0, totalCount: 4 })).toBe(0)
  })

  it('returns 100 when every recorded session was a presence', () => {
    expect(attendanceRate({ presentCount: 4, totalCount: 4 })).toBe(100)
  })

  it('rounds a non-integer ratio to the nearest percent', () => {
    expect(attendanceRate({ presentCount: 1, totalCount: 3 })).toBe(33)
    expect(attendanceRate({ presentCount: 2, totalCount: 3 })).toBe(67)
  })

  // presentCount exactly equal to totalCount is already covered above (100);
  // this covers the other literal equality boundary the harness asks for —
  // presentCount exactly equal to 0 with a non-zero totalCount, same as the
  // "0%, not null" case but phrased as the boundary itself.
  it('treats presentCount === 0 as a real value, not as "unset"', () => {
    expect(attendanceRate({ presentCount: 0, totalCount: 1 })).toBe(0)
  })
})

describe('tallyAttendanceByPlayer', () => {
  it('returns an empty map when no records exist', () => {
    expect(tallyAttendanceByPlayer([])).toEqual({})
  })

  // AC-CTS-07 — the function itself has no notion of "the roster": a player
  // with zero AttendanceRecord rows simply never gets a key here. It's the
  // caller's job (GetTeamStatsUseCase / the ViewModel) to still render that
  // player, using the roster as the source of truth for who's on the list.
  it('omits a player entirely from the map when they have no AttendanceRecord at all', () => {
    const records = [attendanceRecord('player-1', 'present')]
    const result = tallyAttendanceByPlayer(records)
    expect(result).toEqual({ 'player-1': { presentCount: 1, totalCount: 1 } })
    expect(Object.hasOwn(result, 'player-2')).toBe(false)
  })

  it('tallies each player independently across multiple records', () => {
    const records = [
      attendanceRecord('player-1', 'present'),
      attendanceRecord('player-1', 'absent'),
      attendanceRecord('player-2', 'present'),
    ]
    expect(tallyAttendanceByPlayer(records)).toEqual({
      'player-1': { presentCount: 1, totalCount: 2 },
      'player-2': { presentCount: 1, totalCount: 1 },
    })
  })
})

describe('tallyGoalsByPlayer', () => {
  it('counts only "goal" events, ignoring cards and penalty_missed', () => {
    const events = [
      matchEvent('player-1', 'goal'),
      matchEvent('player-1', 'goal', { isPenalty: true }),
      matchEvent('player-1', 'yellow_card'),
      matchEvent('player-2', 'penalty_missed'),
      matchEvent('player-2', 'goal'),
    ]
    expect(tallyGoalsByPlayer(events)).toEqual({ 'player-1': 2, 'player-2': 1 })
  })

  it('returns an empty map when there are no goal events', () => {
    expect(tallyGoalsByPlayer([matchEvent('player-1', 'yellow_card')])).toEqual({})
  })
})

describe('tallyCardsByPlayer', () => {
  it('separates yellow and red cards per player, ignoring goal/penalty_missed', () => {
    const events = [
      matchEvent('player-1', 'yellow_card'),
      matchEvent('player-1', 'yellow_card'),
      matchEvent('player-1', 'red_card'),
      matchEvent('player-2', 'goal'),
      matchEvent('player-2', 'penalty_missed'),
    ]
    expect(tallyCardsByPlayer(events)).toEqual({ 'player-1': { yellowCount: 2, redCount: 1 } })
    expect(Object.hasOwn(tallyCardsByPlayer(events), 'player-2')).toBe(false)
  })

  it('returns an empty map when there are no card events (AC-CTS-16, "aucun carton" is a normal state)', () => {
    expect(tallyCardsByPlayer([matchEvent('player-1', 'goal')])).toEqual({})
  })
})

describe('tallyTeamCards', () => {
  it('returns zeroed counts when there are no card events', () => {
    expect(tallyTeamCards([])).toEqual({ yellowCount: 0, redCount: 0 })
  })

  it('sums yellow and red cards across every player', () => {
    const events = [
      matchEvent('player-1', 'yellow_card'),
      matchEvent('player-2', 'yellow_card'),
      matchEvent('player-2', 'red_card'),
      matchEvent('player-3', 'goal'),
    ]
    expect(tallyTeamCards(events)).toEqual({ yellowCount: 2, redCount: 1 })
  })
})

describe('sumTeamGoals', () => {
  it('returns 0 when there is no match_details row', () => {
    expect(sumTeamGoals([])).toBe(0)
  })

  it('sums goalsFor across every match, ignoring a not-yet-played match (AC-MS-15, both null)', () => {
    const matchDetails: Pick<MatchDetails, 'goalsFor'>[] = [{ goalsFor: 3 }, { goalsFor: 1 }, { goalsFor: null }]
    expect(sumTeamGoals(matchDetails)).toBe(4)
  })

  // specs/coach-team-stats.md §6 point 4 — the team total is read directly
  // from goals_for, never recomputed from goal events: a match can have more
  // recorded goals than attributed scorer events (AC-MS-05/17).
  it('does not depend on match_events at all — only the primary goalsFor fact', () => {
    expect(sumTeamGoals([{ goalsFor: 5 }])).toBe(5)
  })
})
