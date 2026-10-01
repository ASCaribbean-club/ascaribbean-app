import { describe, expect, it } from 'vitest'
import type { ActualStatus } from '../entities/convocation'
import { diffAttendance } from './attendance-batch'

const stored = (entries: [string, ActualStatus][]) => new Map<string, ActualStatus>(entries)

describe('diffAttendance', () => {
  it('treats a player without a stored row as null, so any choice is a first entry', () => {
    expect(diffAttendance(stored([]), [{ userId: 'p1', actualStatus: 'present' }])).toEqual([
      { userId: 'p1', actualStatus: 'present', previousStatus: null },
    ])
  })

  it('ignores a choice equal to the stored value', () => {
    expect(diffAttendance(stored([['p1', 'absent']]), [{ userId: 'p1', actualStatus: 'absent' }])).toEqual([])
  })

  it('reports a flip with its previous value', () => {
    expect(diffAttendance(stored([['p1', 'present']]), [{ userId: 'p1', actualStatus: 'absent' }])).toEqual([
      { userId: 'p1', actualStatus: 'absent', previousStatus: 'present' },
    ])
  })

  it('keeps only the last choice per player', () => {
    const changes = diffAttendance(stored([]), [
      { userId: 'p1', actualStatus: 'present' },
      { userId: 'p1', actualStatus: 'absent' },
    ])
    expect(changes).toEqual([{ userId: 'p1', actualStatus: 'absent', previousStatus: null }])
  })

  it('a last choice that returns to the stored value is no change', () => {
    const changes = diffAttendance(stored([['p1', 'present']]), [
      { userId: 'p1', actualStatus: 'absent' },
      { userId: 'p1', actualStatus: 'present' },
    ])
    expect(changes).toEqual([])
  })

  it('returns one change per modified player in a batch', () => {
    const changes = diffAttendance(stored([['p1', 'present'], ['p2', 'absent']]), [
      { userId: 'p1', actualStatus: 'present' },
      { userId: 'p2', actualStatus: 'present' },
      { userId: 'p3', actualStatus: 'absent' },
    ])
    expect(changes.map((change) => change.userId)).toEqual(['p2', 'p3'])
  })
})
