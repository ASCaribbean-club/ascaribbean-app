// Shape of the browser's PushSubscription.toJSON(), the only thing data/ reads
// from it. Every field is optional in the DOM typing, hence the same here.
export interface DevicePushSubscriptionDto {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}
