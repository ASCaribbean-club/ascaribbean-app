import { useQuery } from '@tanstack/react-query'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { queryKeys } from '@presentation/shared/query-keys'

// specs/web-users.md §2.8 — backs BackofficeSidebar's badge on the
// "Utilisateurs" entry. Twin of useMembershipsNavBadge, copied not
// reinvented (§2.8's own instruction): its own dedicated, LIGHT query
// (CountUsersRequiringAttentionUseCase → the four-criteria completeness
// facts read, never the full admin directory counted client-side) and its
// own centralized queryKey — never inline, never reusing usersAdminDirectory's
// key.
export function useUsersNavBadge() {
  const { countUsersRequiringAttentionUseCase } = useUsersDependencies()

  const query = useQuery({
    queryKey: queryKeys.usersBadgeCount(),
    queryFn: () => countUsersRequiringAttentionUseCase.execute(),
  })

  // §2.8 point "Visibilité"/AC-WU-16 — masked (not a "0") when zero or still
  // loading/errored, so a transient network hiccup never flashes a wrong
  // number in permanent chrome rendered on every backoffice screen.
  const count = query.data ?? 0

  return { count }
}
