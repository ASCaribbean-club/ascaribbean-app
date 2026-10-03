import { describe, expect, it } from 'vitest'
import { toClubOverview } from './club-overview-mapper'

describe('toClubOverview', () => {
  it('maps the two integer columns to the entity', () => {
    expect(toClubOverview({ sections_count: 4, members_count: 87 })).toEqual({ sectionsCount: 4, membersCount: 87 })
  })

  it('keeps zeros (an empty club is a valid state)', () => {
    expect(toClubOverview({ sections_count: 0, members_count: 0 })).toEqual({ sectionsCount: 0, membersCount: 0 })
  })

  it('exposes nothing but the two counters', () => {
    expect(Object.keys(toClubOverview({ sections_count: 1, members_count: 2 }))).toEqual(['sectionsCount', 'membersCount'])
  })
})
