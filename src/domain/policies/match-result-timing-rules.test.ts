import { describe, expect, it } from 'vitest'
import { isMatchResultRecordable } from './match-result-timing-rules'

const KICKOFF = new Date('2026-09-24T18:00:00.000Z')

describe('isMatchResultRecordable', () => {
  it('is false just before kickoff', () => {
    expect(isMatchResultRecordable(KICKOFF, new Date('2026-09-24T17:59:59.000Z'))).toBe(false)
  })

  it('is false exactly at kickoff (strict comparison, boundary resolves to not-yet-started)', () => {
    expect(isMatchResultRecordable(KICKOFF, new Date(KICKOFF))).toBe(false)
  })

  it('is true just after kickoff', () => {
    expect(isMatchResultRecordable(KICKOFF, new Date('2026-09-24T18:00:01.000Z'))).toBe(true)
  })
})
