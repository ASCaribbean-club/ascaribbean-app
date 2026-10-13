import { describe, expect, it } from 'vitest'
import {
  MAX_OFFICIAL_MATCH_ATTENDEES,
  canAddAnotherAttendee,
  getAttendeeCap,
  getAttendeeCapExcess,
  hasMinimumAttendees,
  isAttendeeAddWindowOpen,
  isConvoked,
  isWithinAttendeeCap,
} from './convocation-attendee-rules'

describe('getAttendeeCap', () => {
  it('is 14 for an official match', () => {
    expect(MAX_OFFICIAL_MATCH_ATTENDEES).toBe(14)
    expect(getAttendeeCap('match', 'official')).toBe(14)
  })

  it('does not cap a friendly match, a training or a meeting', () => {
    expect(getAttendeeCap('match', 'friendly')).toBeNull()
    expect(getAttendeeCap('training', null)).toBeNull()
    expect(getAttendeeCap('meeting', null)).toBeNull()
  })

  it('does not cap a match whose competition is not chosen yet', () => {
    expect(getAttendeeCap('match', null)).toBeNull()
  })

  it('never caps a non-match even if an official type leaked in', () => {
    expect(getAttendeeCap('training', 'official')).toBeNull()
  })
})

describe('isWithinAttendeeCap', () => {
  it('accepts up to and including 14 for an official match', () => {
    expect(isWithinAttendeeCap(13, 'match', 'official')).toBe(true)
    expect(isWithinAttendeeCap(14, 'match', 'official')).toBe(true)
  })

  it('refuses 15 for an official match', () => {
    expect(isWithinAttendeeCap(15, 'match', 'official')).toBe(false)
  })

  it('accepts any number above 14 for a friendly match, a training and a meeting (AC-CPS-07)', () => {
    expect(isWithinAttendeeCap(30, 'match', 'friendly')).toBe(true)
    expect(isWithinAttendeeCap(30, 'training', null)).toBe(true)
    expect(isWithinAttendeeCap(30, 'meeting', null)).toBe(true)
  })
})

describe('getAttendeeCapExcess', () => {
  it('is the number of players over the cap', () => {
    expect(getAttendeeCapExcess(15, 'match', 'official')).toBe(1)
    expect(getAttendeeCapExcess(20, 'match', 'official')).toBe(6)
  })

  it('is 0 at or under the cap, and when no cap applies', () => {
    expect(getAttendeeCapExcess(14, 'match', 'official')).toBe(0)
    expect(getAttendeeCapExcess(3, 'match', 'official')).toBe(0)
    expect(getAttendeeCapExcess(20, 'match', 'friendly')).toBe(0)
  })
})

describe('canAddAnotherAttendee', () => {
  it('allows an addition at 13 and refuses it at 14 and above for an official match', () => {
    expect(canAddAnotherAttendee(13, 'match', 'official')).toBe(true)
    expect(canAddAnotherAttendee(14, 'match', 'official')).toBe(false)
    expect(canAddAnotherAttendee(17, 'match', 'official')).toBe(false)
  })

  it('always allows an addition when no cap applies', () => {
    expect(canAddAnotherAttendee(40, 'match', 'friendly')).toBe(true)
    expect(canAddAnotherAttendee(40, 'training', null)).toBe(true)
  })
})

describe('hasMinimumAttendees', () => {
  it('requires at least one convoked player', () => {
    expect(hasMinimumAttendees(0)).toBe(false)
    expect(hasMinimumAttendees(1)).toBe(true)
  })
})

describe('isAttendeeAddWindowOpen', () => {
  const kickoff = '2026-11-01T15:00:00.000Z'

  it('is open while the convocation is open and before kickoff', () => {
    expect(isAttendeeAddWindowOpen({ status: 'open', date: kickoff }, new Date('2026-11-01T14:59:59.000Z'))).toBe(true)
  })

  it('is closed exactly at kickoff', () => {
    expect(isAttendeeAddWindowOpen({ status: 'open', date: kickoff }, new Date(kickoff))).toBe(false)
  })

  it('is closed after kickoff', () => {
    expect(isAttendeeAddWindowOpen({ status: 'open', date: kickoff }, new Date('2026-11-01T16:00:00.000Z'))).toBe(false)
  })

  it('is closed for a closed or cancelled convocation, even before kickoff', () => {
    const before = new Date('2026-10-30T10:00:00.000Z')
    expect(isAttendeeAddWindowOpen({ status: 'closed', date: kickoff }, before)).toBe(false)
    expect(isAttendeeAddWindowOpen({ status: 'cancelled', date: kickoff }, before)).toBe(false)
  })
})

describe('isConvoked', () => {
  it('is true only for an id on the list', () => {
    expect(isConvoked('u1', ['u1', 'u2'])).toBe(true)
    expect(isConvoked('u3', ['u1', 'u2'])).toBe(false)
    expect(isConvoked('u1', [])).toBe(false)
  })
})
