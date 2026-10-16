import { PushSubscriptionFailedError } from '../../errors/push-subscription-failed-error'
import type { PushDeviceRepository } from '../../repositories/push-device-repository'
import type { PushSubscriptionRepository } from '../../repositories/push-subscription-repository'

// 'enabled'   — permission granted, subscription created and stored.
// 'dismissed' — the system prompt was closed without a choice (permission
//               stays 'default'): not an error, the switch just stays off.
// 'denied'    — the system (or an earlier choice) refuses notifications.
// 'unsupported' — nothing to enable on this browser/device.
export type EnablePushOutcome = 'enabled' | 'dismissed' | 'denied' | 'unsupported'

// specs/mob-notifications.md §1 "Section Notifications" — activating asks the
// system permission (called from the switch tap only, AC-NT-13), then
// registers the subscription. AC-NT-36: if storing it on the server fails, the
// browser subscription is rolled back so the device never looks "enabled"
// without a server row, and the error is rethrown for the screen to show.
// `vapidPublicKey` is the PUBLIC key only — the private one is an Edge Function secret.
export class EnablePushNotificationsUseCase {
  constructor(
    private readonly device: PushDeviceRepository,
    private readonly subscriptions: PushSubscriptionRepository,
    private readonly vapidPublicKey: string,
  ) {}

  async execute(): Promise<EnablePushOutcome> {
    if (this.device.getSupport() !== 'supported') return 'unsupported'
    if (this.vapidPublicKey === '') {
      throw new PushSubscriptionFailedError('VAPID public key is not configured')
    }

    let permission = this.device.getPermission()
    if (permission === 'default') permission = await this.device.requestPermission()
    if (permission === 'denied') return 'denied'
    if (permission !== 'granted') return 'dismissed'

    const subscription = await this.device.subscribe(this.vapidPublicKey)
    try {
      await this.subscriptions.save(subscription)
    } catch (error) {
      await this.device.unsubscribe().catch(() => false)
      throw error
    }
    return 'enabled'
  }
}
