import { describe, expect, it } from 'vitest'
import { AutoEnablePushNotificationsUseCase } from './AutoEnablePushNotificationsUseCase'
import { EnablePushNotificationsUseCase } from './EnablePushNotificationsUseCase'
import { fakeDevice, fakePreferences, fakeSubscriptions, SUBSCRIPTION } from './fakes'

function build(device = fakeDevice({ permission: 'granted' }), subs = fakeSubscriptions(), prefs = fakePreferences()) {
  const enable = new EnablePushNotificationsUseCase(device, subs, 'KEY')
  return { device, subs, prefs, useCase: new AutoEnablePushNotificationsUseCase(device, subs, prefs, enable) }
}

describe('AutoEnablePushNotificationsUseCase', () => {
  it('subscribes silently on a granted permission', async () => {
    const { useCase, device, subs } = build()
    expect(await useCase.execute('u1')).toEqual({ kind: 'subscribed' })
    expect(device.requestPermission).not.toHaveBeenCalled()
    expect(subs.save).toHaveBeenCalledWith(SUBSCRIPTION)
  })
  it('never prompts on default permission: does nothing', async () => {
    const { useCase, device, subs } = build(fakeDevice({ permission: 'default' }))
    expect(await useCase.execute('u1')).toEqual({ kind: 'none' })
    expect(device.requestPermission).not.toHaveBeenCalled()
    expect(subs.save).not.toHaveBeenCalled()
  })
  it('does nothing when unsupported', async () => {
    const { useCase } = build(fakeDevice({ support: 'unsupported-ios-not-installed' }))
    expect(await useCase.execute('u1')).toEqual({ kind: 'none' })
  })
  it('respects an explicit opt-out: no subscription, nothing to free', async () => {
    const subs = fakeSubscriptions()
    const { useCase, device } = build(fakeDevice({ permission: 'granted' }), subs, fakePreferences({ optOut: true }))
    expect(await useCase.execute('u1')).toEqual({ kind: 'none' })
    expect(device.subscribe).not.toHaveBeenCalled()
    expect(subs.releaseEndpoint).not.toHaveBeenCalled()
  })
  it('frees the device from another account on explicit opt-out (AC-NT-42)', async () => {
    const subs = fakeSubscriptions()
    const { useCase, device } = build(fakeDevice({ permission: 'granted', subscription: SUBSCRIPTION }), subs, fakePreferences({ optOut: true }))
    expect(await useCase.execute('u1')).toEqual({ kind: 'none' })
    expect(subs.releaseEndpoint).toHaveBeenCalledWith(SUBSCRIPTION.endpoint)
    expect(device.subscribe).not.toHaveBeenCalled()
    expect(subs.save).not.toHaveBeenCalled()
  })
  it('still returns none when freeing the device fails', async () => {
    const subs = fakeSubscriptions()
    subs.releaseEndpoint.mockRejectedValue(new Error('boom'))
    const { useCase } = build(fakeDevice({ permission: 'granted', subscription: SUBSCRIPTION }), subs, fakePreferences({ optOut: true }))
    expect(await useCase.execute('u1')).toEqual({ kind: 'none' })
  })
  it('re-syncs on every launch (AC-NT-37)', async () => {
    const { useCase, subs } = build(fakeDevice({ permission: 'granted' }), fakeSubscriptions())
    expect(await useCase.execute('u1')).toEqual({ kind: 'subscribed' })
    expect(subs.save).toHaveBeenCalledWith(SUBSCRIPTION)
  })
  it('takes over an endpoint tied to another account (own-row check false, browser subscription present)', async () => {
    const { useCase, subs } = build(fakeDevice({ permission: 'granted', subscription: SUBSCRIPTION }), fakeSubscriptions(false))
    expect(await useCase.execute('u1')).toEqual({ kind: 'subscribed' })
    expect(subs.save).toHaveBeenCalledWith(SUBSCRIPTION)
  })
  it('reports subscribed without re-subscribing when already active', async () => {
    const { useCase, device } = build(fakeDevice({ permission: 'granted', subscription: SUBSCRIPTION }), fakeSubscriptions(true))
    expect(await useCase.execute('u1')).toEqual({ kind: 'subscribed' })
    expect(device.subscribe).not.toHaveBeenCalled()
  })
  it('returns none (without throwing) when the silent subscription fails', async () => {
    const subs = fakeSubscriptions()
    subs.save.mockRejectedValue(new Error('boom'))
    const { useCase } = build(fakeDevice({ permission: 'granted' }), subs)
    expect(await useCase.execute('u1')).toEqual({ kind: 'none' })
  })
})
