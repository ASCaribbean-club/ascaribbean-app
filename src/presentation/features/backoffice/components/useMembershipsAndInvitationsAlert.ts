import { useQuery } from '@tanstack/react-query'
import { userStatus } from '@domain/policies/user-status'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { queryKeys } from '@presentation/shared/query-keys'

// specs/web-dashboard.md §2.5 — bloc ALERTE 1, "N adhésion(s) et M
// invitation(s) à traiter". N = membershipsBadgeCount() (the SAME
// CountMembershipsRequiringAttentionUseCase reading the "Adhésions" nav
// badge and the dashboard's own "ADHÉSIONS À RENOUVELER" card already use,
// AC-WD-05); M = the SAME usersAdminDirectory() 'invited' count the
// "UTILISATEURS ACTIFS" card's own subline reads. Its own isolated
// component/hook (twin of MembershipsNavBadge/UsersNavBadge) so its queries
// only ever run for this one block.
export function useMembershipsAndInvitationsAlert() {
  const { countMembershipsRequiringAttentionUseCase } = useMembershipsDependencies()
  const { userRepository, seasonRepository } = useUsersDependencies()

  const membershipsCountQuery = useQuery({
    queryKey: queryKeys.membershipsBadgeCount(),
    queryFn: () => countMembershipsRequiringAttentionUseCase.execute(),
  })

  const currentSeasonQuery = useQuery({ queryKey: queryKeys.seasonCurrent(), queryFn: () => seasonRepository.findCurrent() })
  const currentSeasonId = currentSeasonQuery.data?.id ?? null

  const directoryQuery = useQuery({
    queryKey: queryKeys.usersAdminDirectory(),
    queryFn: () => userRepository.findAdminDirectory(currentSeasonId),
    enabled: currentSeasonQuery.isSuccess,
  })

  const membershipsCount = membershipsCountQuery.data ?? 0
  const invitationsCount = (directoryQuery.data ?? []).filter((entry) => userStatus(entry.charterAcceptedAt) === 'invited').length

  return { membershipsCount, invitationsCount }
}
