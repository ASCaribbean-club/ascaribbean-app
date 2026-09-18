import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Membership, MembershipStatus } from '@domain/entities/membership'
import { membershipPaymentStatus, sumPaymentsCents, type MembershipPaymentStatus } from '@domain/rules/membership-payment-rules'
import { seasonStatus } from '@domain/policies/season-scope'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

export type MembershipStatusFilterValue = MembershipStatus | 'all'
export type MembershipCotisationFilterValue = MembershipPaymentStatus | 'all'

export interface MembershipAdminRow {
  membership: Membership
  userFullName: string
  seasonLabel: string
  // AC-WM-12/AC-WM-13 — the REAL sum of this membership's payments
  // (amendement du 2026-09-17, PO-WM-01 resolved), computed ONCE here from
  // paymentRepository.findAllForAdmin()'s bulk read grouped by membership id
  // — never a per-row network call (see paidCentsByMembership below).
  paidCents: number
  // AC-WM-12/AC-WM-13 — computed via the SAME predicate the "cotisation"
  // filter and the activation rule (AC-WM-35) also call, never a second
  // calculation.
  paymentStatus: MembershipPaymentStatus
}

// specs/web-memberships.md §2.10/AC-WM-19/AC-WM-31 — plain reads composed
// directly here (membershipRepository.findAllForAdmin(), userRepository.findAll(),
// seasonRepository.findAll(), paymentRepository.findAllForAdmin()), same "no
// wrapping use case for a plain passthrough read" precedent as
// useBackofficeTeamsViewModel: RLS is the sole authority on what comes back.
// The WRITES (create/update/archive) each go through a use case — see
// useMembershipFormDialogViewModel (create), useMembershipEditRowViewModel
// (update), this hook for archive.
export function useBackofficeMembershipsViewModel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { membershipRepository, userRepository, seasonRepository, paymentRepository, archiveMembershipUseCase } = useMembershipsDependencies()

  // §3/UI design — computed independently, never collapsed into one generic
  // canManageMembership: a future widening of ONLY 'payment:record' (e.g. to
  // 'treasurer', PO-WM-08) must not silently also unlock 'membership:write'.
  const canWriteMembership = usePermission('membership:write')
  const canRecordPayment = usePermission('payment:record')

  const [statusFilter, setStatusFilter] = useState<MembershipStatusFilterValue>('all')
  const [cotisationFilter, setCotisationFilter] = useState<MembershipCotisationFilterValue>('all')
  // null = "follow the current-season default" (§2.6b) — becomes a concrete
  // string ('all' or a season id) the instant the admin touches the select,
  // and stays that way even if the underlying current season later changes.
  // No useEffect-driven reset (same reasoning as SeasonFormDialog's own
  // remount-via-key comment): this is a plain derived default, computed
  // below from currentSeasonQuery.data once it resolves.
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  // specs/web-memberships.md §1/§7/UI design (amendement du 2026-09-17) —
  // the ONE reconciled edit surface: a table row expands in place, never a
  // dialog. At most one expanded at a time (UI design, "une seule ligne
  // dépliée à la fois suffit") — expanding a second row collapses the first.
  const [expandedMembershipId, setExpandedMembershipId] = useState<string | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<MembershipAdminRow | null>(null)
  const [pendingArchive, setPendingArchive] = useState<MembershipAdminRow | null>(null)

  const membershipsQuery = useQuery({ queryKey: queryKeys.membershipsAdminList(), queryFn: () => membershipRepository.findAllForAdmin() })
  const usersQuery = useQuery({ queryKey: queryKeys.usersAdminList(), queryFn: () => userRepository.findAll() })
  const seasonsQuery = useQuery({ queryKey: queryKeys.seasonsAdminList(), queryFn: () => seasonRepository.findAll() })
  const currentSeasonQuery = useQuery({ queryKey: queryKeys.seasonCurrent(), queryFn: () => seasonRepository.findCurrent() })
  // specs/web-memberships.md §2.10 (amendement du 2026-09-17) — ONE bulk
  // read for every payment across every membership, grouped below, rather
  // than one request per row (N+1). Backs the COTISATION column/filter for
  // every row AND the archive-confirmation dialog's own "already paid"
  // phrase (no separate per-target read needed anymore).
  const allPaymentsQuery = useQuery({ queryKey: queryKeys.membershipPaymentsAdminList(), queryFn: () => paymentRepository.findAllForAdmin() })

  const archiveMutation = useMutation({
    mutationFn: (membershipId: string) => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }
      return archiveMembershipUseCase.execute({ actorId: user.id, membershipId })
    },
    onSuccess: () => {
      // AC-WM-22/AC-WM-24 — centralized queryKeys, invalidated so the row
      // disappears and the badge updates without a manual reload.
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipsAdminList() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipsBadgeCount() })
      setPendingArchive(null)
    },
  })

  const isLoading =
    membershipsQuery.isLoading || usersQuery.isLoading || seasonsQuery.isLoading || currentSeasonQuery.isLoading || allPaymentsQuery.isLoading
  const queryError = membershipsQuery.error ?? usersQuery.error ?? seasonsQuery.error ?? currentSeasonQuery.error ?? allPaymentsQuery.error
  const error = queryError ? mapDomainErrorToUiError(queryError) : null

  const memberships = membershipsQuery.data ?? []
  const users = usersQuery.data ?? []
  const seasons = seasonsQuery.data ?? []
  const currentSeason = currentSeasonQuery.data ?? null
  const allPayments = allPaymentsQuery.data ?? []

  const usersById = new Map(users.map((candidate) => [candidate.id, candidate]))
  const seasonsById = new Map(seasons.map((season) => [season.id, season]))

  // §2.10/AC-WM-12 — grouped here (plain arithmetic, data composition), the
  // actual SUM still computed by domain/rules's own sumPaymentsCents() per
  // group, never a second summing implementation.
  const paymentsByMembership = new Map<string, typeof allPayments>()
  for (const payment of allPayments) {
    const bucket = paymentsByMembership.get(payment.membershipId)
    if (bucket) bucket.push(payment)
    else paymentsByMembership.set(payment.membershipId, [payment])
  }

  const allRows: MembershipAdminRow[] = memberships.map((membership) => {
    const paidCents = sumPaymentsCents(paymentsByMembership.get(membership.id) ?? [])
    return {
      membership,
      userFullName: usersById.get(membership.userId)?.fullName ?? '',
      seasonLabel: seasonsById.get(membership.seasonId)?.label ?? '',
      paidCents,
      paymentStatus: membershipPaymentStatus(paidCents, membership.amountDueCents),
    }
  })

  // §2.6b/AC-WM-20 — defaults to the current season (Postgres, never the
  // browser clock) until the admin explicitly picks something else.
  // §2.6c/AC-WM-21/UI design "Repli" — no current season falls back to
  // "Toutes les saisons", never a silent empty list.
  const effectiveSeasonFilter = seasonFilter ?? currentSeason?.id ?? 'all'

  const rows = allRows.filter((row) => {
    if (effectiveSeasonFilter !== 'all' && row.membership.seasonId !== effectiveSeasonFilter) return false
    if (statusFilter !== 'all' && row.membership.status !== statusFilter) return false
    if (cotisationFilter !== 'all' && row.paymentStatus !== cotisationFilter) return false
    return true
  })

  // UI design point 5 — "état résultat de filtre vide", distinct from the
  // normal empty-list state (AC-WM-25): only counts as an ACTIVE filter once
  // the admin has explicitly touched the season select (or the status/
  // cotisation ones) — merely landing on the current-season default must
  // never itself read as "a filter is applied" (that default IS the normal
  // state, §2.6b).
  const isFilterActive = seasonFilter !== null || statusFilter !== 'all' || cotisationFilter !== 'all'

  const now = new Date()
  const seasonOptions = seasons.map((season) => ({
    id: season.id,
    // §2.6b/AC-WM-20 — reuses web-seasons's own 3-state predicate, never a
    // second inline test, for the "(en cours)" suffix.
    label: seasonStatus(season, now) === 'current' ? `${season.label} (en cours)` : season.label,
  }))

  return {
    isLoading,
    error,
    rows,
    isFilterActive,
    canWriteMembership,
    canRecordPayment,

    users,
    seasonOptions,

    seasonFilter: effectiveSeasonFilter,
    setSeasonFilter: (value: string) => setSeasonFilter(value),
    noCurrentSeason: !currentSeasonQuery.isLoading && currentSeason === null,
    statusFilter,
    setStatusFilter,
    cotisationFilter,
    setCotisationFilter,

    isCreateDialogOpen,
    openCreateDialog: () => setIsCreateDialogOpen(true),
    closeCreateDialog: () => setIsCreateDialogOpen(false),

    // specs/web-memberships.md §1/UI design (amendement du 2026-09-17) — the
    // chevron/pencil toggle in ACTIONS. Expanding a row collapses any other
    // expanded row (single-expansion, see this hook's own state comment).
    expandedMembershipId,
    toggleEditRow: (row: MembershipAdminRow) =>
      setExpandedMembershipId((current) => (current === row.membership.id ? null : row.membership.id)),
    collapseEditRow: () => setExpandedMembershipId(null),

    paymentTarget,
    openPaymentDialog: (row: MembershipAdminRow) => setPaymentTarget(row),
    closePaymentDialog: () => setPaymentTarget(null),

    pendingArchive,
    // §2.10 — reuses the SAME bulk-fetched sum every row already carries,
    // no separate per-target read anymore (amendement du 2026-09-17).
    archiveTargetPaidCents: pendingArchive?.paidCents ?? 0,
    requestArchive: (row: MembershipAdminRow) => setPendingArchive(row),
    cancelArchive: () => setPendingArchive(null),
    confirmArchive: () => pendingArchive && archiveMutation.mutate(pendingArchive.membership.id),
    isArchiving: archiveMutation.isPending,
    archiveErrorMessage: archiveMutation.error ? mapDomainErrorToUiError(archiveMutation.error).message : null,
  }
}
