// specs/mob-notifications.md PO-NT-30 — device-local markers, indexed by
// account: "explicit opt-out" and "dashboard
// banner dismissed". Never on the
// server; the implementation in data/ owns the storage.
export interface PushPreferenceRepository {
  hasExplicitOptOut(userId: string): boolean
  setExplicitOptOut(userId: string, optedOut: boolean): void
  hasDismissedNotificationsBanner(userId: string): boolean
  dismissNotificationsBanner(userId: string): void
}
