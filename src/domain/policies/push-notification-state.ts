// specs/mob-notifications.md §1 "Écran Paramètres" / AC-NT-14 — the four
// states of the Notifications switch, derived from facts the browser/device
// reports. The browser calls themselves stay outside domain/ (data/ gathers
// the flags); this file only decides.

export type PushSupport = 'supported' | 'unsupported-ios-not-installed' | 'unsupported'
export type PushPermission = 'default' | 'granted' | 'denied'

export interface PushSupportFlags {
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
  isIos: boolean
  // Launched from the home screen icon (PWA installed).
  isStandalone: boolean
}

/**
 * PO-NT-02: on iPhone/iPad Web Push only exists for an installed PWA, never in
 * a Safari tab — that case gets its own message ("add to home screen").
 */
export function derivePushSupport(flags: PushSupportFlags): PushSupport {
  const fullySupported = flags.hasServiceWorker && flags.hasPushManager && flags.hasNotification
  if (fullySupported) return 'supported'
  if (flags.isIos && !flags.isStandalone) return 'unsupported-ios-not-installed'
  return 'unsupported'
}

export type PushNotificationState = 'enabled' | 'disabled' | 'denied' | 'unsupported' | 'unsupported-ios-not-installed'

export interface PushStateFacts {
  support: PushSupport
  permission: PushPermission
  // This device holds a browser push subscription.
  hasDeviceSubscription: boolean
  // The server has a row for that subscription's endpoint, owned by the caller.
  hasServerSubscription: boolean
}

/**
 * AC-NT-34: "enabled" only when permission is granted AND the device is
 * subscribed AND the server knows the subscription — never an "enabled"
 * display without a stored subscription (AC-NT-36).
 */
export function derivePushNotificationState(facts: PushStateFacts): PushNotificationState {
  if (facts.support !== 'supported') return facts.support
  if (facts.permission === 'denied') return 'denied'
  if (facts.permission === 'granted' && facts.hasDeviceSubscription && facts.hasServerSubscription) return 'enabled'
  return 'disabled'
}
