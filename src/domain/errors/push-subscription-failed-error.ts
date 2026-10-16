import { DomainError } from './domain-error'

// specs/mob-notifications.md AC-NT-36 — registering or removing the device's
// push subscription failed; the screen shows an explicit error and the switch
// goes back to the real state.
export class PushSubscriptionFailedError extends DomainError {}
