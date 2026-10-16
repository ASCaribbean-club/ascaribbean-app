import { describe, expect, it } from 'vitest'
import { PushSubscriptionFailedError } from '@domain/errors/push-subscription-failed-error'
import {
  toPushSubscriptionData,
  toRegisterPushSubscriptionDto,
  urlBase64ToUint8Array,
} from './push-subscription-mapper'

describe('toPushSubscriptionData', () => {
  it('maps the browser JSON to the entity', () => {
    expect(toPushSubscriptionData({ endpoint: 'e', keys: { p256dh: 'p', auth: 'a' } })).toEqual({
      endpoint: 'e',
      p256dhKey: 'p',
      authKey: 'a',
    })
  })
  it.each([
    [{ keys: { p256dh: 'p', auth: 'a' } }],
    [{ endpoint: 'e' }],
    [{ endpoint: 'e', keys: { p256dh: 'p' } }],
    [{ endpoint: 'e', keys: { auth: 'a' } }],
  ])('refuses an incomplete subscription %#', (dto) => {
    expect(() => toPushSubscriptionData(dto)).toThrow(PushSubscriptionFailedError)
  })
})

describe('toRegisterPushSubscriptionDto', () => {
  it('maps to the RPC arguments', () => {
    expect(toRegisterPushSubscriptionDto({ endpoint: 'e', p256dhKey: 'p', authKey: 'a' })).toEqual({
      p_endpoint: 'e',
      p_p256dh: 'p',
      p_auth: 'a',
    })
  })
})

describe('urlBase64ToUint8Array', () => {
  it('decodes base64url without padding', () => {
    // "hello?>" -> aGVsbG8_Pg (base64url, url-safe chars and no padding)
    expect([...urlBase64ToUint8Array('aGVsbG8_Pg')]).toEqual([...new TextEncoder().encode('hello?>')])
  })
})
