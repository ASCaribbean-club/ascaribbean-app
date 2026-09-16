import { describe, expect, it } from 'vitest'
import type { VoteCategoryRow } from '../dto/vote-category-row'
import { toVoteCategory } from './vote-category-mapper'

describe('toVoteCategory', () => {
  it('maps a vote_categories row to a VoteCategory', () => {
    const row: VoteCategoryRow = { id: 'man_of_the_match', label: 'Joueur du match' }

    expect(toVoteCategory(row)).toEqual({ id: 'man_of_the_match', label: 'Joueur du match' })
  })
})
