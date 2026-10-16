import type { PushSubscriptionData } from '@domain/entities/push-subscription'
import { PushSubscriptionFailedError } from '@domain/errors/push-subscription-failed-error'
import type { DevicePushSubscriptionDto } from '../dto/device-push-subscription-dto'
import type { RegisterPushSubscriptionDto } from '../dto/register-push-subscription-dto'

// Browser subscription JSON -> entity. A subscription without endpoint or keys
// cannot receive anything: refused rather than stored half-empty.
export function toPushSubscriptionData(dto: DevicePushSubscriptionDto): PushSubscriptionData {
  const endpoint = dto.endpoint
  const p256dh = dto.keys?.p256dh
  const auth = dto.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    throw new PushSubscriptionFailedError('Incomplete push subscription')
  }
  return { endpoint, p256dhKey: p256dh, authKey: auth }
}

export function toRegisterPushSubscriptionDto(subscription: PushSubscriptionData): RegisterPushSubscriptionDto {
  return { p_endpoint: subscription.endpoint, p_p256dh: subscription.p256dhKey, p_auth: subscription.authKey }
}

// VAPID public keys are base64url; PushManager.subscribe wants raw bytes.
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i)
  return bytes
}
