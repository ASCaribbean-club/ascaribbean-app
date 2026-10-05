import type { NotificationRepository } from '../../repositories/notification-repository'

export interface MarkNotificationReadInput {
  notificationId: string
}

// specs/mobile-treasurer.md amendement (4), §H — "Masquer": sets read_at on
// the member's own notification (RLS: notifications_update_own_read, column
// grant on read_at only). A new reminder re-arms it server-side
// (read_at = null). Not audited: the member's own data (§E).
export class MarkNotificationReadUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(input: MarkNotificationReadInput): Promise<void> {
    await this.notificationRepository.markRead(input.notificationId)
  }
}
