import { describe, expect, it } from 'vitest'
import {
  describeCapExcess,
  describeCounter,
  getSelectionBlockingMessage,
  isAllTeamLocked,
  resolveSelectedIds,
  toggleSelection,
} from './recipients-selection'

describe('resolveSelectedIds', () => {
  it('selects the whole team while no custom selection exists', () => {
    expect(resolveSelectedIds(['a', 'b'], null)).toEqual(['a', 'b'])
  })

  it('keeps an explicit selection, including the empty one', () => {
    expect(resolveSelectedIds(['a', 'b', 'c'], ['b'])).toEqual(['b'])
    expect(resolveSelectedIds(['a', 'b'], [])).toEqual([])
  })

  it('drops ids that are no longer players of the team', () => {
    expect(resolveSelectedIds(['a'], ['a', 'gone'])).toEqual(['a'])
  })
})

describe('toggleSelection', () => {
  it('adds a missing id and removes a present one', () => {
    expect(toggleSelection(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleSelection(['a', 'b'], 'a')).toEqual(['b'])
  })
})

describe('isAllTeamLocked', () => {
  it('locks "Toute l\'équipe" only for an official match above the cap', () => {
    expect(isAllTeamLocked(15, 'match', 'official')).toBe(true)
    expect(isAllTeamLocked(14, 'match', 'official')).toBe(false)
    expect(isAllTeamLocked(30, 'match', 'friendly')).toBe(false)
    expect(isAllTeamLocked(30, 'training', null)).toBe(false)
    expect(isAllTeamLocked(30, 'match', null)).toBe(false)
  })
})

describe('describeCounter', () => {
  it('shows a plain count when no cap applies', () => {
    expect(describeCounter(12, 'training', null)).toEqual({ text: '12 sélectionnés', tone: 'ok' })
    expect(describeCounter(1, 'meeting', null)).toEqual({ text: '1 sélectionné', tone: 'ok' })
    expect(describeCounter(20, 'match', 'friendly')).toEqual({ text: '20 sélectionnés', tone: 'ok' })
    expect(describeCounter(20, 'match', null)).toEqual({ text: '20 sélectionnés', tone: 'ok' })
  })

  it('shows N / 14 below the cap of an official match', () => {
    expect(describeCounter(13, 'match', 'official')).toEqual({ text: '13 / 14 sélectionnés', tone: 'ok' })
  })

  it('warns exactly at the cap', () => {
    expect(describeCounter(14, 'match', 'official')).toEqual({ text: '14 / 14 · maximum atteint', tone: 'warning' })
  })

  it('flags an excess as an error', () => {
    expect(describeCounter(15, 'match', 'official')).toEqual({ text: '15 / 14 · 14 maximum', tone: 'error' })
  })

  it('reports an empty selection as an error whatever the type', () => {
    expect(describeCounter(0, 'training', null)).toEqual({ text: 'Aucun sélectionné', tone: 'error' })
    expect(describeCounter(0, 'match', 'official')).toEqual({ text: 'Aucun sélectionné', tone: 'error' })
  })
})

describe('describeCapExcess', () => {
  it('is null at or under the cap and when no cap applies', () => {
    expect(describeCapExcess(14, 'match', 'official')).toBeNull()
    expect(describeCapExcess(40, 'match', 'friendly')).toBeNull()
  })

  it('agrees singular and plural', () => {
    expect(describeCapExcess(15, 'match', 'official')).toBe('Un match officiel est limité à 14 convoqués. Décochez 1 joueur pour continuer.')
    expect(describeCapExcess(17, 'match', 'official')).toBe('Un match officiel est limité à 14 convoqués. Décochez 3 joueurs pour continuer.')
  })
})

describe('getSelectionBlockingMessage', () => {
  it('requires at least one player', () => {
    expect(getSelectionBlockingMessage(0, 'training', null)).toBe('Sélectionnez au moins un joueur')
  })

  it('reports the excess of an official match', () => {
    expect(getSelectionBlockingMessage(16, 'match', 'official')).toContain('Décochez 2 joueurs')
  })

  it('is null for a valid selection', () => {
    expect(getSelectionBlockingMessage(14, 'match', 'official')).toBeNull()
    expect(getSelectionBlockingMessage(30, 'match', 'friendly')).toBeNull()
  })
})
