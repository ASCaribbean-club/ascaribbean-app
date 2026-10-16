import type { PushDeviceRepository } from '../../repositories/push-device-repository'
import type { PushSubscriptionRepository } from '../../repositories/push-subscription-repository'

// specs/mob-notifications.md §1 / AC-NT-34 — removes THIS device's
// subscription: the server row first (so a failure leaves the switch honestly
// "on"), then the browser subscription. Also reused on sign-out (AC-NT-07).
export class DisablePushNotificationsUseCase {
  constructor(
    private readonly device: PushDeviceRepository,
    private readonly subscriptions: PushSubscriptionRepository,
  ) {}

  async execute(): Promise<void> {
    if (this.device.getSupport() !== 'supported') return
    const subscription = await this.device.getSubscription()
    if (!subscription) return
    await this.subscriptions.deleteByEndpoint(subscription.endpoint)
    await this.device.unsubscribe()
  }
}
