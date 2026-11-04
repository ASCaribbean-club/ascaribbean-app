import { describe, expect, it } from 'vitest'
import { toConvocationAttendee, toConvocationAttendeeRow } from './convocation-attendee-mapper'

describe('convocation-attendee-mapper', () => {
  it('maps a (convocation, player) pair to a row with exactly two columns', () => {
    expect(toConvocationAttendeeRow('c1', 'u1')).toEqual({ convocation_id: 'c1', user_id: 'u1' })
  })

  it('maps a row back to a domain attendee', () => {
    expect(toConvocationAttendee({ convocation_id: 'c1', user_id: 'u1' })).toEqual({ convocationId: 'c1', userId: 'u1' })
  })
})
