import type { PushSubscriptionData } from '../entities/push-subscription'

// specs/mob-notifications.md §2 — server side of the caller's OWN subscriptions
// (RLS: select/delete own rows only, administrator included, AC-NT-02).
export interface PushSubscriptionRepository {
  // Registers (or re-assigns to the caller) the device subscription. Upsert on
  // the endpoint: a device is registered once, last account wins (a shared
  // device re-used by a second account).
  save(subscription: PushSubscriptionData): Promise<void>
  // Does the server hold a subscription of the caller for this endpoint?
  existsByEndpoint(endpoint: string): Promise<boolean>
  // Removes the caller's subscription for this endpoint (no-op if absent).
  deleteByEndpoint(endpoint: string): Promise<void>
  // Frees the device from ANOTHER account's subscription (PO-NT-34, AC-NT-42):
  // deletes the row of this endpoint if it belongs to someone else; no-op otherwise.
  releaseEndpoint(endpoint: string): Promise<void>
}
