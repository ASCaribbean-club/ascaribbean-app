import { describe, expect, it } from 'vitest'
import { toMvpUserIds } from './team-mvp-mapper'

describe('toMvpUserIds', () => {
  it('maps each row to its user id', () => {
    expect(toMvpUserIds([{ user_id: 'p1' }, { user_id: 'p2' }])).toEqual(['p1', 'p2'])
  })

  it('returns an empty list when there is no MVP yet', () => {
    expect(toMvpUserIds([])).toEqual([])
  })
})
