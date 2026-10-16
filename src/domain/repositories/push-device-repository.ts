import type { PushSubscriptionData } from '../entities/push-subscription'
import type { PushPermission, PushSupport } from '../policies/push-notification-state'

// specs/mob-notifications.md §6 note 5 — the browser/device side of Web Push
// (Notification, PushManager, service worker). A port: the implementation in
// data/ touches `navigator`/`window`, which domain/ must never do.
export interface PushDeviceRepository {
  getSupport(): PushSupport
  getPermission(): PushPermission
  // System permission prompt. Only ever called from an explicit user gesture
  // (AC-NT-13). Resolves with the resulting permission ('default' = dismissed).
  requestPermission(): Promise<PushPermission>
  // This device's current browser subscription, or null.
  getSubscription(): Promise<PushSubscriptionData | null>
  // Creates the browser subscription (or returns the existing one).
  subscribe(vapidPublicKey: string): Promise<PushSubscriptionData>
  // Removes the browser subscription; true if one existed.
  unsubscribe(): Promise<boolean>
}
