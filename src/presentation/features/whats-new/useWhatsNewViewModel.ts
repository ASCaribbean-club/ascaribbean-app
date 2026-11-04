import { useState } from 'react'
import changelogMarkdown from '/CHANGELOG.md?raw'
import { selectUnseenReleases } from '@domain/policies/release-notes'
import { parseMobileChangelog } from '@presentation/shared/changelog/parse-changelog'

// specs/mob-notifications.md §1 T4 — after the autoUpdate reload, the NEW
// bundle compares APP_VERSION with the last version seen on this device. The
// marker is device-local (localStorage), never in the database and not in
// domain/ (PO-NT-17, AC-NT-19). First launch: the version is recorded without
// being shown (PO-NT-19 default).
export const LAST_SEEN_VERSION_STORAGE_KEY = 'asc:last-seen-version'

const releases = parseMobileChangelog(changelogMarkdown)

function readLastSeen(): string | null {
  try {
    return window.localStorage.getItem(LAST_SEEN_VERSION_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeLastSeen(version: string): void {
  try {
    window.localStorage.setItem(LAST_SEEN_VERSION_STORAGE_KEY, version)
  } catch {
    // Storage unavailable (private mode): the dialog may show again, never throws.
  }
}

export function useWhatsNewViewModel() {
  // Computed once per mount: the unseen releases never change while it is open.
  const [initial] = useState(() => {
    const lastSeen = readLastSeen()
    const unseen = selectUnseenReleases(releases, lastSeen, APP_VERSION)
    // First launch, or a version with nothing new for mobile: record silently.
    if (lastSeen === null || unseen.length === 0) writeLastSeen(APP_VERSION)
    return unseen
  })
  const [isOpen, setIsOpen] = useState(initial.length > 0)

  // Any way of closing (button, cross, Escape, outside tap) marks it seen.
  const onOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) writeLastSeen(APP_VERSION)
  }

  return {
    releases: initial,
    isOpen,
    onOpenChange,
    currentVersion: APP_VERSION,
  }
}
