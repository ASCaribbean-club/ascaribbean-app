import type { PushPreferenceRepository } from '@domain/repositories/push-preference-repository'

const OPT_OUT_PREFIX = 'asc:push-explicit-opt-out:'
const BANNER_DISMISSED_PREFIX = 'asc:push-banner-dismissed:'

// Device-local markers (localStorage), one set per account. Storage failures
// (private mode) never throw: worst case the attempt may run again.
export class PushPreferenceRepositoryImpl implements PushPreferenceRepository {
  hasExplicitOptOut(userId: string): boolean {
    return this.read(OPT_OUT_PREFIX + userId)
  }
  setExplicitOptOut(userId: string, optedOut: boolean): void {
    this.write(OPT_OUT_PREFIX + userId, optedOut)
  }
  hasDismissedNotificationsBanner(userId: string): boolean {
    return this.read(BANNER_DISMISSED_PREFIX + userId)
  }
  dismissNotificationsBanner(userId: string): void {
    this.write(BANNER_DISMISSED_PREFIX + userId, true)
  }

  private read(key: string): boolean {
    try {
      return window.localStorage.getItem(key) === '1'
    } catch {
      return false
    }
  }
  private write(key: string, value: boolean): void {
    try {
      if (value) window.localStorage.setItem(key, '1')
      else window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
}
