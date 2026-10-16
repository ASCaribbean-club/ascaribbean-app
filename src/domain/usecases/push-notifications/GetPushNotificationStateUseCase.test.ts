import { describe, expect, it } from 'vitest'
import { fakeDevice, fakeSubscriptions, SUBSCRIPTION } from './fakes'
import { GetPushNotificationStateUseCase } from './GetPushNotificationStateUseCase'

describe('GetPushNotificationStateUseCase', () => {
  it('reports unsupported without touching the server', async () => {
    const subs = fakeSubscriptions()
    const state = await new GetPushNotificationStateUseCase(fakeDevice({ support: 'unsupported-ios-not-installed' }), subs).execute()
    expect(state).toBe('unsupported-ios-not-installed')
    expect(subs.existsByEndpoint).not.toHaveBeenCalled()
  })
  it('reports denied', async () => {
    expect(await new GetPushNotificationStateUseCase(fakeDevice({ permission: 'denied' }), fakeSubscriptions()).execute()).toBe('denied')
  })
  it('reports disabled before the permission was asked', async () => {
    expect(await new GetPushNotificationStateUseCase(fakeDevice(), fakeSubscriptions()).execute()).toBe('disabled')
  })
  it('reports enabled when granted, subscribed and known by the server', async () => {
    const device = fakeDevice({ permission: 'granted', subscription: SUBSCRIPTION })
    expect(await new GetPushNotificationStateUseCase(device, fakeSubscriptions(true)).execute()).toBe('enabled')
  })
  it('reports disabled when the server lost the subscription', async () => {
    const device = fakeDevice({ permission: 'granted', subscription: SUBSCRIPTION })
    expect(await new GetPushNotificationStateUseCase(device, fakeSubscriptions(false)).execute()).toBe('disabled')
  })
})
