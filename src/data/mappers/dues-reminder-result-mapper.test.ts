import { describe, expect, it } from 'vitest'
import { toDuesReminderResult } from './dues-reminder-result-mapper'

describe('toDuesReminderResult', () => {
  it.each(['sent', 'no_balance', 'cooldown', 'not_found'])('maps the known outcome %s', (outcome) => {
    expect(toDuesReminderResult({ membership_id: 'm-1', outcome })).toEqual({ membershipId: 'm-1', outcome })
  })

  it('reads an unknown outcome as not_found, never as sent', () => {
    expect(toDuesReminderResult({ membership_id: 'm-1', outcome: 'queued' })).toEqual({ membershipId: 'm-1', outcome: 'not_found' })
  })
})
