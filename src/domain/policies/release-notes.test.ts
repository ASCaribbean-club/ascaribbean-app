import { describe, expect, it } from 'vitest'
import { compareVersions, selectUnseenReleases } from './release-notes'

const releases = ['1.2.0', '1.0.0', '1.1.0', '0.9.0'].map((version) => ({ version }))

describe('compareVersions', () => {
  it('compares numerically, not lexically', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0)
    expect(compareVersions('1.0', '1.0.0')).toBe(0)
  })
})

describe('selectUnseenReleases', () => {
  it('shows nothing on a first launch (no recorded version)', () => {
    expect(selectUnseenReleases(releases, null, '1.2.0')).toEqual([])
  })
  it('lists every skipped version, most recent first', () => {
    expect(selectUnseenReleases(releases, '1.0.0', '1.2.0').map((r) => r.version)).toEqual(['1.2.0', '1.1.0'])
  })
  it('shows nothing when the version was already seen', () => {
    expect(selectUnseenReleases(releases, '1.2.0', '1.2.0')).toEqual([])
  })
  it('ignores releases newer than the running bundle', () => {
    expect(selectUnseenReleases(releases, '1.0.0', '1.1.0').map((r) => r.version)).toEqual(['1.1.0'])
  })
  it('shows nothing when the new version has no mobile notes', () => {
    expect(selectUnseenReleases([{ version: '1.0.0' }], '1.0.0', '1.0.1')).toEqual([])
  })
})
