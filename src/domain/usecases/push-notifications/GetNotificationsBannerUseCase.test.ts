import { describe, expect, it } from 'vitest'
import { fakeDevice, fakePreferences, fakeSubscriptions, SUBSCRIPTION } from './fakes'
import { DismissNotificationsBannerUseCase } from './DismissNotificationsBannerUseCase'
import { GetNotificationsBannerUseCase } from './GetNotificationsBannerUseCase'
import { GetPushNotificationStateUseCase } from './GetPushNotificationStateUseCase'

function build(device = fakeDevice(), subs = fakeSubscriptions(), prefs = fakePreferences()) {
  return new GetNotificationsBannerUseCase(new GetPushNotificationStateUseCase(device, subs), prefs)
}

describe('GetNotificationsBannerUseCase', () => {
  it('shows when notifications are off on this device', async () => {
    expect(await build().execute('u1')).toBe(true)
  })
  it('hides when notifications are enabled', async () => {
    const device = fakeDevice({ permission: 'granted', subscription: SUBSCRIPTION })
    expect(await build(device, fakeSubscriptions(true)).execute('u1')).toBe(false)
  })
  it('hides after a dismissal on this account', async () => {
    const prefs = fakePreferences({ bannerDismissed: true })
    expect(await build(fakeDevice(), fakeSubscriptions(), prefs).execute('u1')).toBe(false)
    expect(prefs.hasDismissedNotificationsBanner).toHaveBeenCalledWith('u1')
  })
  it('hides after a manual opt-out', async () => {
    expect(await build(fakeDevice(), fakeSubscriptions(), fakePreferences({ optOut: true })).execute('u1')).toBe(false)
  })
})

describe('DismissNotificationsBannerUseCase', () => {
  it('remembers the dismissal for the account', () => {
    const prefs = fakePreferences()
    new DismissNotificationsBannerUseCase(prefs).execute('u1')
    expect(prefs.dismissNotificationsBanner).toHaveBeenCalledWith('u1')
  })
})
