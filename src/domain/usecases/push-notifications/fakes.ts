import { vi } from 'vitest'
import type { PushSubscriptionData } from '../../entities/push-subscription'
import type { PushDeviceRepository } from '../../repositories/push-device-repository'
import type { PushPreferenceRepository } from '../../repositories/push-preference-repository'
import type { PushSubscriptionRepository } from '../../repositories/push-subscription-repository'
import type { PushPermission, PushSupport } from '../../policies/push-notification-state'

export const SUBSCRIPTION: PushSubscriptionData = { endpoint: 'https://push.example/e1', p256dhKey: 'k', authKey: 'a' }

export function fakeDevice(overrides: {
  support?: PushSupport
  permission?: PushPermission
  requested?: PushPermission
  subscription?: PushSubscriptionData | null
} = {}) {
  const { support = 'supported', permission = 'default', requested = 'granted', subscription = null } = overrides
  return {
    getSupport: vi.fn(() => support),
    getPermission: vi.fn(() => permission),
    requestPermission: vi.fn().mockResolvedValue(requested),
    getSubscription: vi.fn().mockResolvedValue(subscription),
    subscribe: vi.fn().mockResolvedValue(SUBSCRIPTION),
    unsubscribe: vi.fn().mockResolvedValue(true),
  } satisfies PushDeviceRepository
}

export function fakeSubscriptions(exists = false) {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    existsByEndpoint: vi.fn().mockResolvedValue(exists),
    deleteByEndpoint: vi.fn().mockResolvedValue(undefined),
    releaseEndpoint: vi.fn().mockResolvedValue(undefined),
  } satisfies PushSubscriptionRepository
}

export function fakePreferences(initial: { attempted?: boolean; optOut?: boolean } = {}) {
  return {
    hasAttemptedAutoEnable: vi.fn(() => initial.attempted ?? false),
    markAutoEnableAttempted: vi.fn(),
    hasExplicitOptOut: vi.fn(() => initial.optOut ?? false),
    setExplicitOptOut: vi.fn(),
  } satisfies PushPreferenceRepository
}
