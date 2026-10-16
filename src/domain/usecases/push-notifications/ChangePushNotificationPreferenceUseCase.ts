import type { PushPreferenceRepository } from '../../repositories/push-preference-repository'
import type { DisablePushNotificationsUseCase } from './DisablePushNotificationsUseCase'
import type { EnablePushNotificationsUseCase, EnablePushOutcome } from './EnablePushNotificationsUseCase'

// specs/mob-notifications.md AC-NT-38, PO-NT-30 — the Settings switch. Turning
// off is an EXPLICIT opt-out, remembered per account on this device so the
// default activation never overrides it; turning on lifts it. Sign-out calls
// DisablePushNotificationsUseCase directly and so records no opt-out.
export class ChangePushNotificationPreferenceUseCase {
  constructor(
    private readonly enable: EnablePushNotificationsUseCase,
    private readonly disable: DisablePushNotificationsUseCase,
    private readonly preferences: PushPreferenceRepository,
  ) {}

  async execute(userId: string, wantEnabled: boolean): Promise<EnablePushOutcome | 'disabled'> {
    if (wantEnabled) {
      const outcome = await this.enable.execute()
      if (outcome === 'enabled') this.preferences.setExplicitOptOut(userId, false)
      return outcome
    }
    await this.disable.execute()
    this.preferences.setExplicitOptOut(userId, true)
    return 'disabled'
  }
}
