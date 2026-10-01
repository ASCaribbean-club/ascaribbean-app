import { describe, expect, it } from 'vitest'
import type { Team } from '@domain/entities/team'
import {
  DEFAULT_CONVOCATION_FILTER_STATE,
  isConvocationFilterActive,
  isOnlyUnrecordedFilterActive,
  teamsForFilters,
} from './convocation-filters'

const DEFAULTS = DEFAULT_CONVOCATION_FILTER_STATE

describe('isConvocationFilterActive', () => {
  it('is inactive at the defaults', () => {
    expect(isConvocationFilterActive(DEFAULTS, 'season-1')).toBe(false)
  })

  it('treats the current season selected explicitly as the default', () => {
    expect(isConvocationFilterActive({ ...DEFAULTS, seasonId: 'season-1' }, 'season-1')).toBe(false)
  })

  it('is active for another season, any section/team/type, a non-default period or the pastille', () => {
    expect(isConvocationFilterActive({ ...DEFAULTS, seasonId: 'season-0' }, 'season-1')).toBe(true)
    expect(isConvocationFilterActive({ ...DEFAULTS, sectionId: 's' }, 'season-1')).toBe(true)
    expect(isConvocationFilterActive({ ...DEFAULTS, teamId: 't' }, 'season-1')).toBe(true)
    expect(isConvocationFilterActive({ ...DEFAULTS, type: 'match' }, 'season-1')).toBe(true)
    expect(isConvocationFilterActive({ ...DEFAULTS, period: 'past' }, 'season-1')).toBe(true)
    expect(isConvocationFilterActive({ ...DEFAULTS, unrecordedOnly: true }, 'season-1')).toBe(true)
  })
})

describe('isOnlyUnrecordedFilterActive', () => {
  it('is true when the pastille is the only narrowing filter', () => {
    expect(isOnlyUnrecordedFilterActive({ ...DEFAULTS, unrecordedOnly: true }, 'season-1')).toBe(true)
  })

  it('is false when another filter is combined with it, or when it is off', () => {
    expect(isOnlyUnrecordedFilterActive({ ...DEFAULTS, unrecordedOnly: true, type: 'match' }, 'season-1')).toBe(false)
    expect(isOnlyUnrecordedFilterActive(DEFAULTS, 'season-1')).toBe(false)
  })
})

describe('teamsForFilters', () => {
  const teams: Team[] = [
    { id: 'b', name: 'Équipe B', sectionId: 's1', seasonId: 'y1' },
    { id: 'a', name: 'Équipe A', sectionId: 's1', seasonId: 'y1' },
    { id: 'c', name: 'Équipe C', sectionId: 's2', seasonId: 'y1' },
    { id: 'd', name: 'Équipe D', sectionId: 's1', seasonId: 'y0' },
  ]

  it('restricts to the season and sorts by name', () => {
    expect(teamsForFilters(teams, 'y1', null).map((t) => t.id)).toEqual(['a', 'b', 'c'])
  })

  it('restricts to the section too', () => {
    expect(teamsForFilters(teams, 'y1', 's1').map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('does not restrict by season when none is known', () => {
    expect(teamsForFilters(teams, null, 's1').map((t) => t.id)).toEqual(['a', 'b', 'd'])
  })
})
