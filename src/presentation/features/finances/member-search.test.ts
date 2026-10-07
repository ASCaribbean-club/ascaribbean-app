import { describe, expect, it } from 'vitest'
import { filterAccounts } from './member-search'

const accounts = [
  { userId: 'u-1', displayName: 'Étoile' },
  { userId: 'u-2', displayName: 'Compte Martin' },
  { userId: 'u-3', displayName: 'Chaîne' },
]

describe('filterAccounts', () => {
  it('keeps everyone, in the supplied order, for an empty or blank query', () => {
    expect(filterAccounts(accounts, '').map((a) => a.userId)).toEqual(['u-1', 'u-2', 'u-3'])
    expect(filterAccounts(accounts, '   ').map((a) => a.userId)).toEqual(['u-1', 'u-2', 'u-3'])
  })

  it('ignores case and accents, both ways', () => {
    expect(filterAccounts(accounts, 'etoile').map((a) => a.userId)).toEqual(['u-1'])
    expect(filterAccounts(accounts, 'CHAINE').map((a) => a.userId)).toEqual(['u-3'])
    expect(filterAccounts(accounts, 'Étoiles').map((a) => a.userId)).toEqual([])
  })

  it('matches inside the name and ignores surrounding spaces', () => {
    expect(filterAccounts(accounts, ' martin ').map((a) => a.userId)).toEqual(['u-2'])
  })

  it('returns nothing when no account matches', () => {
    expect(filterAccounts(accounts, 'zzz')).toEqual([])
  })
})
