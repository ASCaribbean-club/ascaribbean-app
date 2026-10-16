// specs/mob-notifications.md §3 — a Web Push subscription of ONE device. The
// endpoint and keys identify a device: personal data, never logged, never sent
// to analytics. Kept free of any DOM type (domain/ has no `window`).
export interface PushSubscriptionData {
  endpoint: string
  p256dhKey: string
  authKey: string
}
