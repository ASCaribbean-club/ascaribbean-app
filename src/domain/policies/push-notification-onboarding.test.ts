import { describe, expect, it } from 'vitest'
import {
  decideNotificationOnboarding,
  shouldShowNotificationsBanner,
  type NotificationsBannerFacts,
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
  it('never prompts: default permission does nothing', () => {
    expect(decideNotificationOnboarding({ ...base, permission: 'default' })).toBe('none')
  })
  it('does nothing on denied and on unsupported', () => {
    expect(decideNotificationOnboarding({ ...base, permission: 'denied' })).toBe('none')
    expect(decideNotificationOnboarding({ ...base, support: 'unsupported' })).toBe('none')
    expect(decideNotificationOnboarding({ ...base, support: 'unsupported-ios-not-installed' })).toBe('none')
  })
})

describe('shouldShowNotificationsBanner', () => {
  const facts: NotificationsBannerFacts = { state: 'disabled', explicitOptOut: false, dismissed: false }

  it('shows when notifications are off', () => {
    expect(shouldShowNotificationsBanner(facts)).toBe(true)
  })
  it('shows on iPhone outside the installed app (Settings explains how)', () => {
    expect(shouldShowNotificationsBanner({ ...facts, state: 'unsupported-ios-not-installed' })).toBe(true)
  })
  it('hides when already enabled', () => {
    expect(shouldShowNotificationsBanner({ ...facts, state: 'enabled' })).toBe(false)
  })
  it('hides when the device blocks or cannot do notifications', () => {
    expect(shouldShowNotificationsBanner({ ...facts, state: 'denied' })).toBe(false)
    expect(shouldShowNotificationsBanner({ ...facts, state: 'unsupported' })).toBe(false)
  })
  it('hides after a dismissal', () => {
    expect(shouldShowNotificationsBanner({ ...facts, dismissed: true })).toBe(false)
  })
  it('hides after a manual opt-out', () => {
    expect(shouldShowNotificationsBanner({ ...facts, explicitOptOut: true })).toBe(false)
  })
})
