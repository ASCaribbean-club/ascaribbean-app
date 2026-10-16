import { describe, expect, it } from 'vitest'
import { derivePushNotificationState, derivePushSupport } from './push-notification-state'

const full = { hasServiceWorker: true, hasPushManager: true, hasNotification: true, isIos: false, isStandalone: false }

describe('derivePushSupport', () => {
  it('is supported with all browser APIs', () => {
    expect(derivePushSupport(full)).toBe('supported')
  })
  it('flags an iPhone tab (no PushManager, not installed) for the install message', () => {
    expect(derivePushSupport({ ...full, hasPushManager: false, isIos: true, isStandalone: false })).toBe('unsupported-ios-not-installed')
  })
  it('is plainly unsupported on an installed iOS app without the APIs, or another browser', () => {
    expect(derivePushSupport({ ...full, hasPushManager: false, isIos: true, isStandalone: true })).toBe('unsupported')
    expect(derivePushSupport({ ...full, hasNotification: false })).toBe('unsupported')
  })
})

describe('derivePushNotificationState', () => {
  const facts = { support: 'supported', permission: 'granted', hasDeviceSubscription: true, hasServerSubscription: true } as const

  it('is enabled only with permission, device subscription and server row', () => {
    expect(derivePushNotificationState(facts)).toBe('enabled')
    expect(derivePushNotificationState({ ...facts, hasServerSubscription: false })).toBe('disabled')
    expect(derivePushNotificationState({ ...facts, hasDeviceSubscription: false })).toBe('disabled')
  })
  it('is disabled while the permission was never asked', () => {
    expect(derivePushNotificationState({ ...facts, permission: 'default', hasDeviceSubscription: false, hasServerSubscription: false })).toBe('disabled')
  })
  it('is denied when the system refuses', () => {
    expect(derivePushNotificationState({ ...facts, permission: 'denied' })).toBe('denied')
  })
  it('passes the unsupported variants through', () => {
    expect(derivePushNotificationState({ ...facts, support: 'unsupported' })).toBe('unsupported')
    expect(derivePushNotificationState({ ...facts, support: 'unsupported-ios-not-installed' })).toBe('unsupported-ios-not-installed')
  })
})
