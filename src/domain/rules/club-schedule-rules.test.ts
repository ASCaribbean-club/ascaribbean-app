import { describe, expect, it } from 'vitest'
import type { Convocation } from '../entities/convocation'
import type { Team } from '../entities/team'
import { countEventsInWeek, filterBySection, filterTeamsBySection, getWeekBounds, selectUpcoming } from './club-schedule-rules'

function convocation(id: string, date: string, overrides: Partial<Convocation> = {}): Convocation {
  return {
    id,
    teamId: 'team-1',
    type: 'training',
    date,
    location: null,
    trainingLocation: null,
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'u1',
    createdAt: '2026-10-01T08:00:00.000Z',
    ...overrides,
  }
}

function team(id: string, sectionId: string): Team {
  return { id, name: `Team ${id}`, sectionId, seasonId: 'season-1' }
}

describe('filterBySection', () => {
  const items = [
    { id: 'a', team: team('t1', 'football') },
    { id: 'b', team: team('t2', 'esport') },
  ]

  it('returns everything under "Toutes" (null)', () => {
    expect(filterBySection(items, null)).toHaveLength(2)
  })

  it('keeps only the items whose team belongs to the section', () => {
    expect(filterBySection(items, 'esport').map((i) => i.id)).toEqual(['b'])
  })

  it('returns an empty list for a section without any item (never another section)', () => {
    expect(filterBySection(items, 'chess')).toEqual([])
  })
})

describe('filterTeamsBySection', () => {
  const teams = [team('t1', 'football'), team('t2', 'esport'), team('t3', 'football')]

  it('returns the teams of the chosen section', () => {
    expect(filterTeamsBySection(teams, 'football').map((t) => t.id)).toEqual(['t1', 't3'])
  })

  it('returns no team while no section is chosen', () => {
    expect(filterTeamsBySection(teams, null)).toEqual([])
    expect(filterTeamsBySection(teams, '')).toEqual([])
  })
})

describe('selectUpcoming', () => {
  const now = new Date('2026-10-05T12:00:00.000Z')

  it('keeps open future convocations, soonest first', () => {
    const items = [
      { convocation: convocation('late', '2026-10-09T10:00:00.000Z') },
      { convocation: convocation('soon', '2026-10-06T10:00:00.000Z') },
    ]
    expect(selectUpcoming(items, now).map((i) => i.convocation.id)).toEqual(['soon', 'late'])
  })

  it('drops past, cancelled and closed convocations', () => {
    const items = [
      { convocation: convocation('past', '2026-10-01T10:00:00.000Z') },
      { convocation: convocation('cancelled', '2026-10-09T10:00:00.000Z', { status: 'cancelled' }) },
      { convocation: convocation('closed', '2026-10-09T10:00:00.000Z', { status: 'closed' }) },
    ]
    expect(selectUpcoming(items, now)).toEqual([])
  })

  it('excludes a convocation starting exactly at now', () => {
    expect(selectUpcoming([{ convocation: convocation('x', now.toISOString()) }], now)).toEqual([])
  })
})

describe('getWeekBounds', () => {
  it('starts on Monday 00:00 local and ends the next Monday for a mid-week date', () => {
    const { start, end } = getWeekBounds(new Date(2026, 9, 7, 15, 0)) // Wed 7 Oct 2026
    expect(start).toEqual(new Date(2026, 9, 5))
    expect(end).toEqual(new Date(2026, 9, 12))
  })

  it('treats Sunday as the last day of the week', () => {
    const { start } = getWeekBounds(new Date(2026, 9, 11, 23, 0)) // Sun 11 Oct 2026
    expect(start).toEqual(new Date(2026, 9, 5))
  })

  it('treats Monday 00:00 as the first instant of the week', () => {
    const { start } = getWeekBounds(new Date(2026, 9, 5, 0, 0))
    expect(start).toEqual(new Date(2026, 9, 5))
  })
})

describe('countEventsInWeek', () => {
  const now = new Date(2026, 9, 7, 12, 0) // Wed 7 Oct 2026

  it('counts events of the week, past ones included', () => {
    const items = [
      { convocation: convocation('mon', new Date(2026, 9, 5, 9, 0).toISOString()) },
      { convocation: convocation('sun', new Date(2026, 9, 11, 20, 0).toISOString()) },
    ]
    expect(countEventsInWeek(items, now)).toBe(2)
  })

  it('excludes cancelled convocations', () => {
    const items = [{ convocation: convocation('c', new Date(2026, 9, 8, 9, 0).toISOString(), { status: 'cancelled' }) }]
    expect(countEventsInWeek(items, now)).toBe(0)
  })

  it('excludes events of the previous and next weeks (end bound exclusive)', () => {
    const items = [
      { convocation: convocation('prev', new Date(2026, 9, 4, 23, 59).toISOString()) },
      { convocation: convocation('next', new Date(2026, 9, 12, 0, 0).toISOString()) },
    ]
    expect(countEventsInWeek(items, now)).toBe(0)
  })
})
