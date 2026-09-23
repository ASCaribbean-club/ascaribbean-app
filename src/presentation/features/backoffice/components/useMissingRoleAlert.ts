import { useQuery } from '@tanstack/react-query'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { queryKeys } from '@presentation/shared/query-keys'

// specs/web-dashboard.md §2.5 — bloc ALERTE 2, "N utilisateur(s) sans rôle
// assigné". Twin of useMembershipsNavBadge/useUsersNavBadge (its own
// isolated child component/hook, so its query only ever runs for THIS
// block), reusing usersAdminDirectory() (PO-WD-04 — the developer's own
// retained position: no new, dedicated light read for this pass) — the
// SAME cache entry /admin/users and the "UTILISATEURS ACTIFS" card already
// warm, never a second network call once either has been visited.
//
// AC-WD-17/AC-WD-18 — counts the ONE criterion `missingElementFacts.hasRole`,
// never `hasMissingElement()` (four criteria combined by OR): this number
// legitimately differs from the "Utilisateurs" nav badge, and that is
// correct, not a bug to reconcile. `hasRole` is read straight off
// AdminUserDirectoryEntry, never re-derived from `roles.length` here.
export function useMissingRoleAlert() {
  const { userRepository, seasonRepository } = useUsersDependencies()

  const currentSeasonQuery = useQuery({ queryKey: queryKeys.seasonCurrent(), queryFn: () => seasonRepository.findCurrent() })
  const currentSeasonId = currentSeasonQuery.data?.id ?? null

  const directoryQuery = useQuery({
    queryKey: queryKeys.usersAdminDirectory(),
    queryFn: () => userRepository.findAdminDirectory(currentSeasonId),
    enabled: currentSeasonQuery.isSuccess,
  })

  const entries = directoryQuery.data ?? []
  const missingRoleNames = entries.filter((entry) => !entry.missingElementFacts.hasRole).map((entry) => entry.fullName)

  return { count: missingRoleNames.length, names: missingRoleNames }
}
