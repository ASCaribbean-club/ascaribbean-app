import { describe, expect, it } from 'vitest'
import { ChangePushNotificationPreferenceUseCase } from './ChangePushNotificationPreferenceUseCase'
import { DisablePushNotificationsUseCase } from './DisablePushNotificationsUseCase'
import { EnablePushNotificationsUseCase } from './EnablePushNotificationsUseCase'
import { fakeDevice, fakePreferences, fakeSubscriptions, SUBSCRIPTION } from './fakes'

function build(device = fakeDevice({ permission: 'granted', subscription: SUBSCRIPTION })) {
  const subs = fakeSubscriptions(true)
  const prefs = fakePreferences()
  return {
    device,
    subs,
    prefs,
    useCase: new ChangePushNotificationPreferenceUseCase(
      new EnablePushNotificationsUseCase(device, subs, 'KEY'),
      new DisablePushNotificationsUseCase(device, subs),
      prefs,
    ),
  }
}

describe('ChangePushNotificationPreferenceUseCase', () => {
  it('turning off unsubscribes and records the explicit opt-out', async () => {
    const { useCase, subs, prefs } = build()
    expect(await useCase.execute('u1', false)).toBe('disabled')
    expect(subs.deleteByEndpoint).toHaveBeenCalled()
    expect(prefs.setExplicitOptOut).toHaveBeenCalledWith('u1', true)
  })
  it('turning on lifts the opt-out once enabled', async () => {
    const { useCase, prefs } = build()
    expect(await useCase.execute('u1', true)).toBe('enabled')
    expect(prefs.setExplicitOptOut).toHaveBeenCalledWith('u1', false)
  })
  it('keeps the opt-out when the permission is refused', async () => {
    const { useCase, prefs } = build(fakeDevice({ permission: 'denied' }))
    expect(await useCase.execute('u1', true)).toBe('denied')
    expect(prefs.setExplicitOptOut).not.toHaveBeenCalled()
  })
  it('records no opt-out when disabling fails', async () => {
    const { useCase, subs, prefs } = build()
    subs.deleteByEndpoint.mockRejectedValue(new Error('boom'))
    await expect(useCase.execute('u1', false)).rejects.toThrow('boom')
    expect(prefs.setExplicitOptOut).not.toHaveBeenCalled()
  })
})
