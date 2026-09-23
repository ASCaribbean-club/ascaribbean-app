import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
import { userStatus } from '@domain/policies/user-status'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { useSectionAndTeamsDependencies } from '@presentation/di/hooks/use-section-and-teams-dependencies'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { BACKOFFICE_NAV_ITEMS, type BackofficeNavItemId } from '@presentation/features/backoffice/backoffice-nav'
import { useBackofficeDashboardViewModel } from '@presentation/features/backoffice/dashboard/useBackofficeDashboardViewModel'
import { assembleMembershipAdminRows, type MembershipAdminRow } from '@presentation/features/backoffice/memberships/membership-admin-row'
import type { NewsDialogState } from '@presentation/features/backoffice/news/useBackofficeNewsViewModel'
import type { TeamDialogState } from '@presentation/features/backoffice/teams/useBackofficeTeamsViewModel'
import type { InviteUserDialogTarget } from '@presentation/features/backoffice/users/useInviteUserDialogViewModel'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

// specs/web-dashboard.md UI design §"Plafond d'affichage" (PO-WD-02, non
// tranché — position par défaut retenue for this pass): 5 rows max per
// panel, the header link ("Voir…") is the overflow path.
const PANEL_ROW_CAP = 5

export interface DashboardStatCard {
  id: 'users' | 'memberships' | 'sections' | 'seasons'
  label: string
  // null while loading or on error (AC-WD-28 — never a flash of 0, never a
  // fabricated value); a real 0 is a genuine value, never confused with
  // either of those two states (see isLoading/errorMessage below, which the
  // Page branches on FIRST).
  value: number | null
  subline: string
  isLoading: boolean
  errorMessage: string | null
  to: string
}

export interface UnpaidDuesPanelData {
  isLoading: boolean
  errorMessage: string | null
  rows: MembershipAdminRow[]
  totalCount: number
  remainingCount: number
  totalRemainingCents: number
  to: string
}

export interface PendingInvitationsPanelData {
  isLoading: boolean
  errorMessage: string | null
  rows: AdminUserDirectoryEntry[]
  totalCount: number
  remainingCount: number
  to: string
}

function navItemPath(id: BackofficeNavItemId): string {
  // §2.2/AC-WD-08 — resolved from BACKOFFICE_NAV_ITEMS, never a hardcoded
  // '/admin/...' string in this ViewModel or in DashboardStatCard.tsx.
  return BACKOFFICE_NAV_ITEMS.find((item) => item.id === id)!.path
}

function blockErrorMessage(...errors: unknown[]): string | null {
  const firstError = errors.find((candidate) => candidate != null)
  return firstError ? mapDomainErrorToUiError(firstError).message : null
}

// specs/web-dashboard.md §2/§2.8 — composes EIGHT reads already used
// elsewhere in this backoffice (AC-WD-02: usersAdminDirectory,
// membershipsBadgeCount, membershipsAdminList, membershipPaymentsAdminList,
// usersAdminList, seasonsAdminList, seasonCurrent, sectionsAdminList,
// teamsAdminList), through the SAME three DI containers /admin/users,
// /admin/memberships and /admin/sections+teams already use — never a new
// container, never a new use case, never a new queryKey (§2.8 table: domain/
// and data/ gain nothing from this feature). Each card/panel below degrades
// INDEPENDENTLY (AC-WD-28) rather than the whole screen failing on one
// query.
export function useBackofficeOverviewViewModel() {
  const { firstName } = useBackofficeDashboardViewModel()

  const { userRepository } = useUsersDependencies()
  const { sectionRepository, teamRepository } = useSectionAndTeamsDependencies()
  const {
    membershipRepository,
    paymentRepository,
    userRepository: membershipsUserRepository,
    seasonRepository,
    countMembershipsRequiringAttentionUseCase,
  } = useMembershipsDependencies()

  // §3/UI design "Ce qui change par rôle" — five independent booleans,
  // never collapsed into one generic canDoAdminStuff (AC-WD-11): a future
  // widening of only ONE of these five actions must not silently unlock the
  // other four.
  const canInviteUser = usePermission('user:invite')
  const canWriteTeam = usePermission('team:write')
  const canWriteMembership = usePermission('membership:write')
  const canWriteNews = usePermission('news:write')
  const canRecordPayment = usePermission('payment:record')

  const currentSeasonQuery = useQuery({ queryKey: queryKeys.seasonCurrent(), queryFn: () => seasonRepository.findCurrent() })
  const currentSeasonId = currentSeasonQuery.data?.id ?? null

  const directoryQuery = useQuery({
    queryKey: queryKeys.usersAdminDirectory(),
    queryFn: () => userRepository.findAdminDirectory(currentSeasonId),
    enabled: currentSeasonQuery.isSuccess,
  })
  const membershipsBadgeQuery = useQuery({
    queryKey: queryKeys.membershipsBadgeCount(),
    queryFn: () => countMembershipsRequiringAttentionUseCase.execute(),
  })
  const sectionsQuery = useQuery({ queryKey: queryKeys.sectionsAdminList(), queryFn: () => sectionRepository.findAll() })
  const teamsQuery = useQuery({ queryKey: queryKeys.teamsAdminList(), queryFn: () => teamRepository.findAllForAdmin() })
  const seasonsQuery = useQuery({ queryKey: queryKeys.seasonsAdminList(), queryFn: () => seasonRepository.findAll() })
  const membershipsListQuery = useQuery({ queryKey: queryKeys.membershipsAdminList(), queryFn: () => membershipRepository.findAllForAdmin() })
  const allPaymentsQuery = useQuery({ queryKey: queryKeys.membershipPaymentsAdminList(), queryFn: () => paymentRepository.findAllForAdmin() })
  const usersAdminListQuery = useQuery({ queryKey: queryKeys.usersAdminList(), queryFn: () => membershipsUserRepository.findAll() })

  const entries: AdminUserDirectoryEntry[] = directoryQuery.data ?? []
  // AC-WD-15 — ONE lecture (usersAdminDirectory, above), TWO derived counts:
  // the "UTILISATEURS ACTIFS" card's own value AND its "N invitation(s) en
  // attente" subline both come from filtering this SAME `entries` array,
  // never a second network call.
  const activeUsersCount = entries.filter((entry) => userStatus(entry.charterAcceptedAt) === 'active').length
  const invitedEntries = entries.filter((entry) => userStatus(entry.charterAcceptedAt) === 'invited')

  const usersCardLoading = currentSeasonQuery.isLoading || (currentSeasonQuery.isSuccess && directoryQuery.isLoading)
  const usersCardError = blockErrorMessage(currentSeasonQuery.error, directoryQuery.error)

  const sectionsCardLoading = sectionsQuery.isLoading || teamsQuery.isLoading
  const sectionsCardError = blockErrorMessage(sectionsQuery.error, teamsQuery.error)
  const teamsCount = teamsQuery.data?.length ?? 0

  const seasonsCardLoading = seasonsQuery.isLoading || currentSeasonQuery.isLoading
  const seasonsCardError = blockErrorMessage(seasonsQuery.error, currentSeasonQuery.error)

  // AC-WD-06/PO-WD-06 — no "actives" qualifier: Section carries no notion of
  // activity in the domain, so the word is dropped rather than simulated.
  const statCards: DashboardStatCard[] = [
    {
      id: 'users',
      label: 'Utilisateurs actifs',
      value: usersCardLoading || usersCardError ? null : activeUsersCount,
      subline: `${invitedEntries.length} invitation${invitedEntries.length > 1 ? 's' : ''} en attente`,
      isLoading: usersCardLoading,
      errorMessage: usersCardError,
      to: navItemPath('users'),
    },
    {
      id: 'memberships',
      label: 'Adhésions à renouveler',
      value: membershipsBadgeQuery.isLoading || membershipsBadgeQuery.isError ? null : (membershipsBadgeQuery.data ?? 0),
      // §2.1 point 4 — a fixed label, not a computed sub-count: the card's
      // number and the copy underneath describe the SAME
      // CountMembershipsRequiringAttentionUseCase reading, never a second
      // definition of "à traiter" (PO-WM-06, inherited not re-litigated).
      subline: 'Statut « en attente »',
      isLoading: membershipsBadgeQuery.isLoading,
      errorMessage: blockErrorMessage(membershipsBadgeQuery.error),
      to: navItemPath('memberships'),
    },
    {
      id: 'sections',
      label: 'Sections',
      value: sectionsCardLoading || sectionsCardError ? null : (sectionsQuery.data?.length ?? 0),
      subline: `${teamsCount} équipe${teamsCount > 1 ? 's' : ''} au total`,
      isLoading: sectionsCardLoading,
      errorMessage: sectionsCardError,
      to: navItemPath('sections'),
    },
    {
      id: 'seasons',
      label: 'Saisons',
      value: seasonsCardLoading || seasonsCardError ? null : (seasonsQuery.data?.length ?? 0),
      // §2.1 "Repli" / AC-WD-07 — no current season: an explicit label,
      // never a blank subline and never an invented one.
      subline: currentSeasonQuery.data ? currentSeasonQuery.data.label : 'Aucune saison en cours',
      isLoading: seasonsCardLoading,
      errorMessage: seasonsCardError,
      to: navItemPath('seasons'),
    },
  ]

  // §2.7 — the header's own context line, built from the SAME two reads
  // (seasonCurrent/sectionsAdminList) the cards above already warm, no new
  // query. `null` (line omitted, not broken) while sections hasn't resolved
  // yet or failed — the season segment alone is optional (AC-WD-07), but the
  // sections COUNT is not: without it there's nothing to build the line
  // around at all.
  const sectionsCount = sectionsQuery.data?.length ?? null
  const contextLine =
    sectionsCount === null
      ? null
      : [
          currentSeasonQuery.data ? `Saison ${currentSeasonQuery.data.label}` : null,
          `${sectionsCount} section${sectionsCount > 1 ? 's' : ''}`,
          'club invitation-only',
        ]
          .filter((segment): segment is string => segment !== null)
          .join(' · ')

  // §2.4a/AC-WD-12 — the SAME shared assembly function
  // useBackofficeMembershipsViewModel now imports too (membership-admin-row.ts),
  // never a second, divergent computation of effectiveAmountDueCents/
  // paidCents/paymentStatus.
  const membershipRows: MembershipAdminRow[] = assembleMembershipAdminRows(
    membershipsListQuery.data ?? [],
    usersAdminListQuery.data ?? [],
    seasonsQuery.data ?? [],
    allPaymentsQuery.data ?? [],
  )

  // §2.4a point 3/AC-WD-14/PO-WD-05 — bounded to the CURRENT season only
  // (never "toutes saisons confondues"); no current season means no row
  // qualifies, which naturally renders as the panel's own positive empty
  // state (AC-WD-07) rather than a special-cased message.
  const unpaidRows = currentSeasonId
    ? membershipRows.filter((row) => row.membership.seasonId === currentSeasonId && row.paymentStatus !== 'paid')
    : []
  const unpaidDuesTotalRemainingCents = unpaidRows.reduce(
    (total, row) => total + Math.max(0, (row.effectiveAmountDueCents ?? 0) - row.paidCents),
    0,
  )

  const unpaidDuesLoading =
    membershipsListQuery.isLoading || allPaymentsQuery.isLoading || usersAdminListQuery.isLoading || seasonsQuery.isLoading || currentSeasonQuery.isLoading
  const unpaidDuesError = blockErrorMessage(
    membershipsListQuery.error,
    allPaymentsQuery.error,
    usersAdminListQuery.error,
    seasonsQuery.error,
    currentSeasonQuery.error,
  )

  // §2.4b/AC-WD-15 — the SAME `entries` (usersAdminDirectory) the
  // "UTILISATEURS ACTIFS" card reads above, one network call for both
  // displays.
  const pendingInvitationsLoading = usersCardLoading
  const pendingInvitationsError = usersCardError

  const [inviteDialogTarget, setInviteDialogTarget] = useState<InviteUserDialogTarget | null>(null)
  const [teamDialog, setTeamDialog] = useState<TeamDialogState>(null)
  const [isMembershipDialogOpen, setIsMembershipDialogOpen] = useState(false)
  const [newsDialog, setNewsDialog] = useState<NewsDialogState>(null)
  const [paymentTarget, setPaymentTarget] = useState<MembershipAdminRow | null>(null)

  return {
    firstName,
    contextLine,

    statCards,

    canInviteUser,
    canWriteTeam,
    canWriteMembership,
    canWriteNews,
    canRecordPayment,

    // §2.3 — AC-WD-09/AC-WD-10: each opens the EXISTING dialog verbatim,
    // never a new one, never a pre-selection MembershipFormDialog/
    // TeamFormDialog don't already support.
    inviteDialogTarget,
    openInviteDialog: () => setInviteDialogTarget({ mode: 'create' }),
    closeInviteDialog: () => setInviteDialogTarget(null),

    teamDialog,
    openCreateTeamDialog: () => setTeamDialog({ mode: 'create' }),
    closeTeamDialog: () => setTeamDialog(null),

    isMembershipDialogOpen,
    openMembershipDialog: () => setIsMembershipDialogOpen(true),
    closeMembershipDialog: () => setIsMembershipDialogOpen(false),

    newsDialog,
    openCreateNewsDialog: () => setNewsDialog({ mode: 'create' }),
    closeNewsDialog: () => setNewsDialog(null),

    unpaidDues: {
      isLoading: unpaidDuesLoading,
      errorMessage: unpaidDuesError,
      rows: unpaidRows.slice(0, PANEL_ROW_CAP),
      totalCount: unpaidRows.length,
      remainingCount: Math.max(0, unpaidRows.length - PANEL_ROW_CAP),
      totalRemainingCents: unpaidDuesTotalRemainingCents,
      to: navItemPath('memberships'),
    },
    paymentTarget,
    openPaymentDialog: (row: MembershipAdminRow) => setPaymentTarget(row),
    closePaymentDialog: () => setPaymentTarget(null),

    pendingInvitations: {
      isLoading: pendingInvitationsLoading,
      errorMessage: pendingInvitationsError,
      rows: invitedEntries.slice(0, PANEL_ROW_CAP),
      totalCount: invitedEntries.length,
      remainingCount: Math.max(0, invitedEntries.length - PANEL_ROW_CAP),
      to: navItemPath('users'),
    },
  }
}
