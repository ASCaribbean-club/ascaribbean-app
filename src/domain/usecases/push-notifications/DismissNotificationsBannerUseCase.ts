import type { PushPreferenceRepository } from '../../repositories/push-preference-repository'

// Closing the dashboard banner is remembered on this device, per account.
export class DismissNotificationsBannerUseCase {
  constructor(private readonly preferences: PushPreferenceRepository) {}

  execute(userId: string): void {
    this.preferences.dismissNotificationsBanner(userId)
  }
}
