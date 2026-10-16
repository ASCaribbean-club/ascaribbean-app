import { describe, expect, it } from 'vitest'
import { fakeDevice, fakeSubscriptions, SUBSCRIPTION } from './fakes'
import { DisablePushNotificationsUseCase } from './DisablePushNotificationsUseCase'

describe('DisablePushNotificationsUseCase', () => {
  it('deletes the server row then unsubscribes the device', async () => {
    const device = fakeDevice({ permission: 'granted', subscription: SUBSCRIPTION })
    const subs = fakeSubscriptions(true)
    await new DisablePushNotificationsUseCase(device, subs).execute()
    expect(subs.deleteByEndpoint).toHaveBeenCalledWith(SUBSCRIPTION.endpoint)
    expect(device.unsubscribe).toHaveBeenCalledOnce()
  })
  it('does nothing without a device subscription', async () => {
    const device = fakeDevice({ permission: 'granted' })
    const subs = fakeSubscriptions()
    await new DisablePushNotificationsUseCase(device, subs).execute()
    expect(subs.deleteByEndpoint).not.toHaveBeenCalled()
  })
  it('keeps the browser subscription when the server delete fails', async () => {
    const device = fakeDevice({ permission: 'granted', subscription: SUBSCRIPTION })
    const subs = fakeSubscriptions(true)
    subs.deleteByEndpoint.mockRejectedValue(new Error('boom'))
    await expect(new DisablePushNotificationsUseCase(device, subs).execute()).rejects.toThrow('boom')
    expect(device.unsubscribe).not.toHaveBeenCalled()
  })
})
