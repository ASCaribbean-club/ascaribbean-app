import { describe, expect, it } from 'vitest'
import { PushSubscriptionFailedError } from '../../errors/push-subscription-failed-error'
import { fakeDevice, fakeSubscriptions, SUBSCRIPTION } from './fakes'
import { EnablePushNotificationsUseCase } from './EnablePushNotificationsUseCase'

describe('EnablePushNotificationsUseCase', () => {
  it('asks the permission, subscribes and stores the subscription', async () => {
    const device = fakeDevice()
    const subs = fakeSubscriptions()
    expect(await new EnablePushNotificationsUseCase(device, subs, 'KEY').execute()).toBe('enabled')
    expect(device.requestPermission).toHaveBeenCalledOnce()
    expect(device.subscribe).toHaveBeenCalledWith('KEY')
    expect(subs.save).toHaveBeenCalledWith(SUBSCRIPTION)
  })
  it('does not re-ask a permission already granted', async () => {
    const device = fakeDevice({ permission: 'granted' })
    await new EnablePushNotificationsUseCase(device, fakeSubscriptions(), 'KEY').execute()
    expect(device.requestPermission).not.toHaveBeenCalled()
  })
  it('returns dismissed when the prompt is closed without a choice', async () => {
    const device = fakeDevice({ requested: 'default' })
    const subs = fakeSubscriptions()
    expect(await new EnablePushNotificationsUseCase(device, subs, 'KEY').execute()).toBe('dismissed')
    expect(device.subscribe).not.toHaveBeenCalled()
    expect(subs.save).not.toHaveBeenCalled()
  })
  it('returns denied when refused, or already denied without prompting', async () => {
    expect(await new EnablePushNotificationsUseCase(fakeDevice({ requested: 'denied' }), fakeSubscriptions(), 'KEY').execute()).toBe('denied')
    const blocked = fakeDevice({ permission: 'denied' })
    expect(await new EnablePushNotificationsUseCase(blocked, fakeSubscriptions(), 'KEY').execute()).toBe('denied')
    expect(blocked.requestPermission).not.toHaveBeenCalled()
  })
  it('returns unsupported on an unsupported device', async () => {
    expect(await new EnablePushNotificationsUseCase(fakeDevice({ support: 'unsupported' }), fakeSubscriptions(), 'KEY').execute()).toBe('unsupported')
  })
  it('rolls the browser subscription back when the server save fails', async () => {
    const device = fakeDevice()
    const subs = fakeSubscriptions()
    subs.save.mockRejectedValue(new Error('boom'))
    await expect(new EnablePushNotificationsUseCase(device, subs, 'KEY').execute()).rejects.toThrow('boom')
    expect(device.unsubscribe).toHaveBeenCalledOnce()
  })
  it('fails explicitly without a VAPID public key', async () => {
    await expect(new EnablePushNotificationsUseCase(fakeDevice(), fakeSubscriptions(), '').execute()).rejects.toBeInstanceOf(PushSubscriptionFailedError)
  })
})
