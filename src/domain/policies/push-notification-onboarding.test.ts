import { describe, expect, it } from 'vitest'
import {
  decideNotificationOnboarding,
  includesLaunchVersion,
  selectActivationAlertVariant,
  type NotificationOnboardingFacts,
} from './push-notification-onboarding'

const base: NotificationOnboardingFacts = {
  support: 'supported',
  permission: 'granted',
  subscribed: false,
  deviceHasSubscription: false,
  explicitOptOut: false,
}

describe('decideNotificationOnboarding', () => {
  it('subscribes silently on a granted permission', () => {
    expect(decideNotificationOnboarding(base)).toBe('subscribe-silently')
  })
  it('re-syncs at every launch: no attempt limit (AC-NT-37)', () => {
    expect(decideNotificationOnboarding({ ...base, deviceHasSubscription: true })).toBe('subscribe-silently')
  })
  it('never overrides an explicit opt-out, whatever else', () => {
    expect(decideNotificationOnboarding({ ...base, explicitOptOut: true })).toBe('none')
    expect(decideNotificationOnboarding({ ...base, explicitOptOut: true, permission: 'default' })).toBe('none')
    expect(decideNotificationOnboarding({ ...base, explicitOptOut: true, subscribed: true })).toBe('none')
  })
  it('frees the device on explicit opt-out when a device subscription exists (AC-NT-42)', () => {
    expect(decideNotificationOnboarding({ ...base, explicitOptOut: true, deviceHasSubscription: true })).toBe('release-device')
  })
  it('does nothing when already subscribed', () => {
    expect(decideNotificationOnboarding({ ...base, subscribed: true })).toBe('none')
  })
  it('never prompts: default permission falls back', () => {
    expect(decideNotificationOnboarding({ ...base, permission: 'default' })).toBe('fallback')
  })
  it('falls back on denied and on unsupported', () => {
    expect(decideNotificationOnboarding({ ...base, permission: 'denied' })).toBe('fallback')
    expect(decideNotificationOnboarding({ ...base, support: 'unsupported' })).toBe('fallback')
    expect(decideNotificationOnboarding({ ...base, support: 'unsupported-ios-not-installed' })).toBe('fallback')
  })
})

describe('includesLaunchVersion', () => {
  it('is true when the launch version is among the unseen ones (also in a batch)', () => {
    expect(includesLaunchVersion(['1.1.0', '1.0.0'], '1.0.0')).toBe(true)
  })
  it('is false for later versions only, or nothing', () => {
    expect(includesLaunchVersion(['1.1.0'], '1.0.0')).toBe(false)
    expect(includesLaunchVersion([], '1.0.0')).toBe(false)
  })
})

describe('selectActivationAlertVariant', () => {
  it('uses the settings wording on a supported browser', () => {
    expect(selectActivationAlertVariant('supported')).toBe('open-settings')
  })
  it('uses the how-to wording otherwise', () => {
    expect(selectActivationAlertVariant('unsupported')).toBe('how-to')
    expect(selectActivationAlertVariant('unsupported-ios-not-installed')).toBe('how-to')
  })
})
