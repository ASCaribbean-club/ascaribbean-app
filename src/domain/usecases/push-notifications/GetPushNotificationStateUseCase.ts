import type { PushDeviceRepository } from '../../repositories/push-device-repository'
import type { PushSubscriptionRepository } from '../../repositories/push-subscription-repository'
import { derivePushNotificationState, type PushNotificationState } from '../../policies/push-notification-state'

// specs/mob-notifications.md AC-NT-34/AC-NT-14 — the REAL state of the
// Notifications switch on this device: system permission + browser
// subscription + the server's own row. Read only; never asks for permission.
export class GetPushNotificationStateUseCase {
  constructor(
    private readonly device: PushDeviceRepository,
    private readonly subscriptions: PushSubscriptionRepository,
  ) {}

  async execute(): Promise<PushNotificationState> {
    const support = this.device.getSupport()
    if (support !== 'supported') {
      return derivePushNotificationState({
        support,
        permission: 'default',
        hasDeviceSubscription: false,
        hasServerSubscription: false,
      })
    }

    const permission = this.device.getPermission()
    // Nothing to look up while the permission isn't granted.
    const deviceSubscription = permission === 'granted' ? await this.device.getSubscription() : null
    const hasServerSubscription = deviceSubscription
      ? await this.subscriptions.existsByEndpoint(deviceSubscription.endpoint)
      : false

    return derivePushNotificationState({
      support,
      permission,
      hasDeviceSubscription: deviceSubscription !== null,
      hasServerSubscription,
    })
  }
}
