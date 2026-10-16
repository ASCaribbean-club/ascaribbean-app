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
    const { useCase, device, subs, prefs } = build()
    expect(await useCase.execute('u1')).toEqual({ kind: 'subscribed' })
    expect(device.requestPermission).not.toHaveBeenCalled()
    expect(subs.save).toHaveBeenCalledWith(SUBSCRIPTION)
    expect(prefs.markAutoEnableAttempted).not.toHaveBeenCalled()
  })
  it('never prompts on default permission: fallback', async () => {
    const { useCase, device, prefs } = build(fakeDevice({ permission: 'default' }))
    expect(await useCase.execute('u1')).toEqual({ kind: 'fallback', variant: 'open-settings' })
    expect(device.requestPermission).not.toHaveBeenCalled()
    expect(prefs.markAutoEnableAttempted).toHaveBeenCalledOnce()
  })
  it('falls back with the how-to variant when unsupported', async () => {
    const { useCase } = build(fakeDevice({ support: 'unsupported-ios-not-installed' }))
    expect(await useCase.execute('u1')).toEqual({ kind: 'fallback', variant: 'how-to' })
  })
  it('respects an explicit opt-out: no subscription, no alert, nothing to free', async () => {
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
  it('re-syncs on every launch, even after a previous attempt (AC-NT-37)', async () => {
    const { useCase, subs } = build(fakeDevice({ permission: 'granted' }), fakeSubscriptions(), fakePreferences({ attempted: true }))
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
  it('falls back (without throwing) when the silent subscription fails', async () => {
    const subs = fakeSubscriptions()
    subs.save.mockRejectedValue(new Error('boom'))
    const { useCase } = build(fakeDevice({ permission: 'granted' }), subs)
    expect((await useCase.execute('u1')).kind).toBe('fallback')
  })
})
