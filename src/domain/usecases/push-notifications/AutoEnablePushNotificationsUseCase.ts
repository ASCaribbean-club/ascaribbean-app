import type { PushDeviceRepository } from '../../repositories/push-device-repository'
import type { PushPreferenceRepository } from '../../repositories/push-preference-repository'
import type { PushSubscriptionRepository } from '../../repositories/push-subscription-repository'
import {
  decideNotificationOnboarding,
  selectActivationAlertVariant,
  type ActivationAlertVariant,
} from '../../policies/push-notification-onboarding'
import type { EnablePushNotificationsUseCase } from './EnablePushNotificationsUseCase'

export type AutoEnableResult =
  | { kind: 'subscribed' }
  | { kind: 'none' }
  | { kind: 'fallback'; variant: ActivationAlertVariant }

// specs/mob-notifications.md AC-NT-37..42 — silent re-sync at EVERY signed-in
// launch and login: with permission already 'granted' and no explicit opt-out,
// the device subscription exists and belongs to the current account (the
// upsert takes over an endpoint tied to another account). Idempotent, no
// attempt limit; only the fallback alert is "once" (enforced by the What's new
// window, AC-NT-40). Never asks the system permission (PO-NT-29). An explicit
// opt-out wins and frees the device from another account (PO-NT-34).
export class AutoEnablePushNotificationsUseCase {
  constructor(
    private readonly device: PushDeviceRepository,
    private readonly subscriptions: PushSubscriptionRepository,
    private readonly preferences: PushPreferenceRepository,
    private readonly enable: EnablePushNotificationsUseCase,
  ) {}

  async execute(userId: string): Promise<AutoEnableResult> {
    const support = this.device.getSupport()
    const permission = support === 'supported' ? this.device.getPermission() : 'default'
    const subscription = permission === 'granted' ? await this.device.getSubscription() : null
    const subscribed = subscription
      ? await this.subscriptions.existsByEndpoint(subscription.endpoint)
      : false

    const decision = decideNotificationOnboarding({
      support,
      permission,
      subscribed,
      deviceHasSubscription: subscription !== null,
      explicitOptOut: this.preferences.hasExplicitOptOut(userId),
    })

    if (decision === 'release-device' && subscription) {
      try {
        await this.subscriptions.releaseEndpoint(subscription.endpoint)
      } catch {
        // Best effort: retried at the next launch.
      }
      return { kind: 'none' }
    }

    if (decision === 'none') {
      return subscribed ? { kind: 'subscribed' } : { kind: 'none' }
    }
    if (decision === 'fallback') {
      this.preferences.markAutoEnableAttempted(userId)
      return { kind: 'fallback', variant: selectActivationAlertVariant(support) }
    }

    try {
      const outcome = await this.enable.execute()
      if (outcome === 'enabled') return { kind: 'subscribed' }
    } catch {
      // Silent: the user sees the fallback alert instead of an error.
    }
    this.preferences.markAutoEnableAttempted(userId)
    return { kind: 'fallback', variant: selectActivationAlertVariant(support) }
  }
}
