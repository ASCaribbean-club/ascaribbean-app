import type { PushPreferenceRepository } from '../../repositories/push-preference-repository'
import { shouldShowNotificationsBanner } from '../../policies/push-notification-onboarding'
import type { GetPushNotificationStateUseCase } from './GetPushNotificationStateUseCase'

// Dashboard banner "you can enable notifications in Menu > Paramètres".
// Read only: the REAL device state (same source as the Settings switch) plus
// the two device-local markers. Never asks for a permission.
export class GetNotificationsBannerUseCase {
  constructor(
    private readonly getState: GetPushNotificationStateUseCase,
    private readonly preferences: PushPreferenceRepository,
  ) {}

  async execute(userId: string): Promise<boolean> {
    const state = await this.getState.execute()
    return shouldShowNotificationsBanner({
      state,
      explicitOptOut: this.preferences.hasExplicitOptOut(userId),
      dismissed: this.preferences.hasDismissedNotificationsBanner(userId),
    })
  }
}
