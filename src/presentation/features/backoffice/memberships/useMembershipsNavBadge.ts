import { useQuery } from '@tanstack/react-query'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { queryKeys } from '@presentation/shared/query-keys'

// specs/web-memberships.md §2.8 — backs BackofficeSidebar's badge on the
// "Adhésions" entry (the ONLY nav item with a badge in this pass — AC-WE-13
// reconduces the absence of one on "Utilisateurs" and of the two ALERTE
// blocks). Its own dedicated, LIGHT query (CountMembershipsRequiringAttentionUseCase
// → a `head: true` count, never the full admin list) and its own centralized
// queryKey — never inline, never reusing membershipsAdminList's key.
export function useMembershipsNavBadge() {
  const { countMembershipsRequiringAttentionUseCase } = useMembershipsDependencies()

  const query = useQuery({
    queryKey: queryKeys.membershipsBadgeCount(),
    queryFn: () => countMembershipsRequiringAttentionUseCase.execute(),
  })

  // §2.8 point "Visibilité" — masked (not a "0") when zero or still loading/
  // errored, so a transient network hiccup never flashes a wrong number in
  // permanent chrome rendered on every backoffice screen.
  const count = query.data ?? 0

  return { count }
}
