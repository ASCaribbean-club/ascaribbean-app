// specs/mob-notifications.md PO-NT-30 — device-local markers, indexed by
// account: "automatic attempt done" and "explicit opt-out". Never on the
// server; the implementation in data/ owns the storage.
export interface PushPreferenceRepository {
  hasAttemptedAutoEnable(userId: string): boolean
  markAutoEnableAttempted(userId: string): void
  hasExplicitOptOut(userId: string): boolean
  setExplicitOptOut(userId: string, optedOut: boolean): void
}
