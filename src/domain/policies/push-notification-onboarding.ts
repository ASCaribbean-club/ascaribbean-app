import type { PushPermission, PushSupport } from './push-notification-state'

// specs/mob-notifications.md §1 "Activation par défaut" (AC-NT-37..40,
// PO-NT-29..31) — pure decisions only. Reading Notification.permission,
// PushManager and localStorage stays in data/ and presentation/.

// Single constant (AC-NT-40): the one release whose "What's new" window may
// carry the activation alert.
export const NOTIFICATIONS_LAUNCH_VERSION = '1.0.0'

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

export type NotificationOnboardingDecision = 'subscribe-silently' | 'release-device' | 'fallback' | 'none'

/**
 * AC-NT-37/38/42: an explicit opt-out is never overridden, and frees the device
 * if it is still tied to another account (PO-NT-34); an active subscription
 * needs nothing; on an already-granted permission the silent re-sync runs at
 * EVERY signed-in launch (no attempt limit — only the fallback alert is "once",
 * AC-NT-40) and never prompts (PO-NT-29); everything else falls back to the alert.
 */
export function decideNotificationOnboarding(facts: NotificationOnboardingFacts): NotificationOnboardingDecision {
  if (facts.explicitOptOut) return facts.deviceHasSubscription ? 'release-device' : 'none'
  if (facts.subscribed) return 'none'
  if (facts.support === 'supported' && facts.permission === 'granted') return 'subscribe-silently'
  return 'fallback'
}

/** AC-NT-40/PO-NT-31(a): the alert belongs to the launch version's window only, also inside a batch of unseen versions. */
export function includesLaunchVersion(unseenVersions: string[], launchVersion: string): boolean {
  return unseenVersions.includes(launchVersion)
}

export type ActivationAlertVariant = 'open-settings' | 'how-to'

/** Alert text variant: iPhone outside the installed app / no notification support gets the "how to" wording. */
export function selectActivationAlertVariant(support: PushSupport): ActivationAlertVariant {
  return support === 'supported' ? 'open-settings' : 'how-to'
}
