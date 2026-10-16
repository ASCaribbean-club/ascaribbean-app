import { useState } from 'react'
import changelogMarkdown from '/CHANGELOG.md?raw'
import { useNavigate } from 'react-router-dom'
import {
  includesLaunchVersion,
  NOTIFICATIONS_LAUNCH_VERSION,
  type ActivationAlertVariant,
} from '@domain/policies/push-notification-onboarding'
import { usePushOnboarding } from '@presentation/shared/hooks/use-push-onboarding'
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
  const navigate = useNavigate()
  const onboarding = usePushOnboarding()
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

  // AC-NT-39/40: the activation alert exists only in the launch version's
  // window, and only when the default activation did not succeed.
  const isLaunchWindow = includesLaunchVersion(
    initial.map((release) => release.version),
    NOTIFICATIONS_LAUNCH_VERSION,
  )
  const activationAlertVariant: ActivationAlertVariant | null =
    isLaunchWindow && onboarding.data?.kind === 'fallback' ? onboarding.data.variant : null

  // Same closing consequence as "C'est noté" (version marked seen), then Settings.
  // Never asks the permission itself (AC-NT-13).
  const onActivationAlertAction = () => {
    onOpenChange(false)
    navigate('/settings')
  }

  return {
    activationAlertVariant,
    onActivationAlertAction,
    releases: initial,
    isOpen,
    onOpenChange,
    currentVersion: APP_VERSION,
  }
}
