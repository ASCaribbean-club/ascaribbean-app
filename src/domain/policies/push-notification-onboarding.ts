import type { PushNotificationState, PushPermission, PushSupport } from './push-notification-state'

// specs/mob-notifications.md §1 "Activation par défaut" (AC-NT-37..39,
// PO-NT-29..30) — pure decisions only. Reading Notification.permission,
// PushManager and localStorage stays in data/ and presentation/.

export interface NotificationOnboardingFacts {
  support: PushSupport
  permission: PushPermission
  // The server holds a subscription of THIS account for the device's endpoint.
  subscribed: boolean
  // A browser subscription exists on this device (it may be tied to another account).
  deviceHasSubscription: boolean
  // The account switched notifications off by hand on this device (PO-NT-30).
  explicitOptOut: boolean
}

export type NotificationOnboardingDecision = 'subscribe-silently' | 'release-device' | 'none'

/**
 * AC-NT-37/38/42: an explicit opt-out is never overridden, and frees the device
 * if it is still tied to another account (PO-NT-34); an active subscription
 * needs nothing; on an already-granted permission the silent re-sync runs at
 * EVERY signed-in launch (no attempt limit) and never prompts (PO-NT-29);
 * everything else does nothing (the dashboard banner points to Settings).
 */
export function decideNotificationOnboarding(facts: NotificationOnboardingFacts): NotificationOnboardingDecision {
  if (facts.explicitOptOut) return facts.deviceHasSubscription ? 'release-device' : 'none'
  if (facts.subscribed) return 'none'
  if (facts.support === 'supported' && facts.permission === 'granted') return 'subscribe-silently'
  return 'none'
}

export interface NotificationsBannerFacts {
  state: PushNotificationState
  // The account switched notifications off by hand on this device (PO-NT-30).
  explicitOptOut: boolean
  // The account closed the dashboard banner on this device.
  dismissed: boolean
}

/**
 * Dashboard banner pointing to Menu > Paramètres. Shown only when there is
 * something to do there: notifications off (or the iPhone "add to home screen"
 * case). Never after a manual opt-out or a dismissal, never when already
 * enabled, and not when the device blocks or cannot do notifications (the
 * banner would promise something Settings cannot deliver by a tap).
 */
export function shouldShowNotificationsBanner(facts: NotificationsBannerFacts): boolean {
  if (facts.dismissed || facts.explicitOptOut) return false
  return facts.state === 'disabled' || facts.state === 'unsupported-ios-not-installed'
}
