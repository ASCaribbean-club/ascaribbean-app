import { describe, expect, it } from 'vitest'
import { formatNameList } from './name-list'

describe('formatNameList', () => {
  it('returns an empty string for an empty list', () => {
    expect(formatNameList([])).toBe('')
  })

  it('joins names under the cap with a comma, no "et N autres" suffix', () => {
    expect(formatNameList(['Compte Un'])).toBe('Compte Un')
    expect(formatNameList(['Compte Un', 'Compte Deux'])).toBe('Compte Un, Compte Deux')
  })

  // Boundary case — exactly at the cap: still no overflow suffix (mirrors
  // the isNewsVisible-style "at exactly now" boundary CLAUDE.md §8 asks for).
  it('shows every name with no suffix when the count is exactly the cap', () => {
    expect(formatNameList(['Compte Un', 'Compte Deux', 'Compte Trois'], 3)).toBe('Compte Un, Compte Deux, Compte Trois')
  })

  it('caps at maxVisible and appends "et N autres" once the list overflows, plural', () => {
    expect(formatNameList(['Compte Un', 'Compte Deux', 'Compte Trois', 'Compte Quatre'], 3)).toBe(
      'Compte Un, Compte Deux, Compte Trois et 1 autre',
    )
    expect(formatNameList(['Compte Un', 'Compte Deux', 'Compte Trois', 'Compte Quatre', 'Compte Cinq'], 3)).toBe(
      'Compte Un, Compte Deux, Compte Trois et 2 autres',
    )
  })

  it('respects a custom maxVisible', () => {
    expect(formatNameList(['Compte Un', 'Compte Deux'], 1)).toBe('Compte Un et 1 autre')
  })
})
