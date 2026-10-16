import type { PushPreferenceRepository } from '@domain/repositories/push-preference-repository'

const ATTEMPTED_PREFIX = 'asc:push-auto-enable-attempted:'
const OPT_OUT_PREFIX = 'asc:push-explicit-opt-out:'

// Device-local markers (localStorage), one pair per account. Storage failures
// (private mode) never throw: worst case the attempt may run again.
export class PushPreferenceRepositoryImpl implements PushPreferenceRepository {
  hasAttemptedAutoEnable(userId: string): boolean {
    return this.read(ATTEMPTED_PREFIX + userId)
  }
  markAutoEnableAttempted(userId: string): void {
    this.write(ATTEMPTED_PREFIX + userId, true)
  }
  hasExplicitOptOut(userId: string): boolean {
    return this.read(OPT_OUT_PREFIX + userId)
  }
  setExplicitOptOut(userId: string, optedOut: boolean): void {
    this.write(OPT_OUT_PREFIX + userId, optedOut)
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
