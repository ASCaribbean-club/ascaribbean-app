import { describe, expect, it, vi } from 'vitest'
import type { NotificationRepository } from '../../repositories/notification-repository'
import { MarkNotificationReadUseCase } from './MarkNotificationReadUseCase'

describe('MarkNotificationReadUseCase', () => {
  it('marks the given notification as read', async () => {
    const markRead = vi.fn(async () => {})
    const repository: NotificationRepository = { findDuesReminderForMembership: async () => null, markRead }
    await new MarkNotificationReadUseCase(repository).execute({ notificationId: 'n-1' })
    expect(markRead).toHaveBeenCalledWith('n-1')
  })

  it('propagates a repository failure so the banner can come back', async () => {
    const repository: NotificationRepository = {
      findDuesReminderForMembership: async () => null,
      markRead: async () => { throw new Error('offline') },
    }
    await expect(new MarkNotificationReadUseCase(repository).execute({ notificationId: 'n-1' })).rejects.toThrow('offline')
  })
})
