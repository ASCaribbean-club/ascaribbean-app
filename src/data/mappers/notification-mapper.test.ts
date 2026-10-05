import { describe, expect, it } from 'vitest'
import type { NotificationRow } from '../dto/notification-row'
import { toNotification } from './notification-mapper'

const row: NotificationRow = {
  id: 'n-1',
  recipient_id: 'u-1',
  kind: 'dues_reminder',
  membership_id: 'm-1',
  sent_at: '2026-10-05T08:00:00+00:00',
  read_at: null,
}

describe('toNotification', () => {
  it('maps every field of an unread dues reminder', () => {
    expect(toNotification(row)).toEqual({
      id: 'n-1',
      recipientId: 'u-1',
      kind: 'dues_reminder',
      membershipId: 'm-1',
      sentAt: '2026-10-05T08:00:00+00:00',
      readAt: null,
    })
  })

  it('keeps read_at when the notification was hidden', () => {
    expect(toNotification({ ...row, read_at: '2026-10-05T09:00:00+00:00' })?.readAt).toBe('2026-10-05T09:00:00+00:00')
  })

  it('keeps a null membership id', () => {
    expect(toNotification({ ...row, membership_id: null })?.membershipId).toBeNull()
  })

  it('returns null for a kind this client does not know', () => {
    expect(toNotification({ ...row, kind: 'something_else' })).toBeNull()
  })
})
