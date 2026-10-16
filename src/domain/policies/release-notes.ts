// specs/mob-notifications.md §1 T4 — which release notes to announce after an
// automatic update. Pure: the "last version seen" marker lives on the device
// (presentation), never in domain/ nor in the database.

/** Numeric parts of `x.y.z`; anything non-numeric counts as 0. */
function parseVersion(version: string): number[] {
  return version.split('.').map((part) => {
    const value = Number.parseInt(part, 10)
    return Number.isNaN(value) ? 0 : value
  })
}

/** Negative if a < b, 0 if equal, positive if a > b. Missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a)
  const right = parseVersion(b)
  const length = Math.max(left.length, right.length)
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * Releases strictly newer than `lastSeenVersion` and not newer than the
 * running `currentVersion`, most recent first (PO-NT-19 defaults: every
 * skipped version is listed; nothing on a first launch, i.e. when no version
 * has ever been recorded). Releases without a mobile section are already
 * dropped by the changelog parser, so they never reach this function.
 */
export function selectUnseenReleases<T extends { version: string }>(
  releases: T[],
  lastSeenVersion: string | null,
  currentVersion: string,
): T[] {
  if (lastSeenVersion === null) return []
  return releases
    .filter(
      (release) => compareVersions(release.version, lastSeenVersion) > 0 && compareVersions(release.version, currentVersion) <= 0,
    )
    .sort((a, b) => compareVersions(b.version, a.version))
}
