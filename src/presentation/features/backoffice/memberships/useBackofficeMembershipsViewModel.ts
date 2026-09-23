import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import type { MembershipStatus } from '@domain/entities/membership'
import type { MembershipPaymentStatus } from '@domain/rules/membership-payment-rules'
import { seasonStatus } from '@domain/policies/season-scope'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'
import { assembleMembershipAdminRows, type MembershipAdminRow } from './membership-admin-row'

export type MembershipStatusFilterValue = MembershipStatus | 'all'
export type MembershipCotisationFilterValue = MembershipPaymentStatus | 'all'

// specs/web-dashboard.md §2.4a/AC-WD-12 — the row shape (and the assembly
// function that builds it) moved to membership-admin-row.ts, shared with
// /admin/overview's own UnpaidDuesPanel, so a change to the "what counts as
// amount due" decision only ever needs to happen once. Re-exported here so
// every existing `import type { MembershipAdminRow } from
// '../useBackofficeMembershipsViewModel'` (RecordPaymentDialog,
// MembershipEditRow, MembershipTable, ArchiveMembershipDialog, ...) keeps
// working unchanged.
export type { MembershipAdminRow }

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

  // specs/web-users-membership-column.md §2.3a/AC-WU-58 — the ?user= URL
  // param branched onto the existing filter chain below, read via
  // useSearchParams (already the project's routing dependency, no library
  // added). Absent, `userFilter` is null and every branch below behaves
  // exactly as it did before this amendment (§2.3a's own non-negotiable
  // regression requirement).
  const [searchParams, setSearchParams] = useSearchParams()
  const userFilter = searchParams.get('user')

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

  // specs/web-users-membership-column.md §2.3b/PO-WU-18 — the filter-applied
  // banner's own account-name lookup, gated on `userFilter` being present.
  // The already-loaded membership list can't be relied on for this name
  // (the nominal landing case is zero rows for this account, §2.3c) — this
  // is the ONE small new read this amendment introduces, everything else
  // reuses already-loaded data.
  const filteredUserQuery = useQuery({
    queryKey: queryKeys.user(userFilter ?? ''),
    queryFn: () => userRepository.findById(userFilter as string),
    enabled: !!userFilter,
  })

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
      // specs/web-users-membership-column.md §2.5/AC-WU-59 — archiving the
      // only current-season membership flips criterion 2 of /admin/users'
      // own completeness read: invalidate its two keys too, so the ADHÉSION
      // SAISON column and its nav badge never drift stale.
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersAdminDirectory() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersBadgeCount() })
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

  // specs/web-dashboard.md §2.4a/AC-WD-12 — the SHARED assembly function
  // (membership-admin-row.ts), extracted from what used to be an inline
  // `.map(...)` here, imported by /admin/overview's own UnpaidDuesPanel too.
  const allRows = assembleMembershipAdminRows(memberships, users, seasons, allPayments)

  // §2.6b/AC-WM-20 — defaults to the current season (Postgres, never the
  // browser clock) until the admin explicitly picks something else.
  // §2.6c/AC-WM-21/UI design "Repli" — no current season falls back to
  // "Toutes les saisons", never a silent empty list.
  const effectiveSeasonFilter = seasonFilter ?? currentSeason?.id ?? 'all'

  const rows = allRows.filter((row) => {
    if (effectiveSeasonFilter !== 'all' && row.membership.seasonId !== effectiveSeasonFilter) return false
    if (statusFilter !== 'all' && row.membership.status !== statusFilter) return false
    if (cotisationFilter !== 'all' && row.paymentStatus !== cotisationFilter) return false
    // specs/web-users-membership-column.md §2.3a/AC-WU-58 — one filter line
    // more, same shape as the three above: the ?user= URL param, applied
    // client-side to the SAME already-loaded list (no new read, no new
    // queryKey, MembershipRepository untouched).
    if (userFilter && row.membership.userId !== userFilter) return false
    return true
  })

  // UI design point 5 — "état résultat de filtre vide", distinct from the
  // normal empty-list state (AC-WM-25): only counts as an ACTIVE filter once
  // the admin has explicitly touched the season select (or the status/
  // cotisation ones) — merely landing on the current-season default must
  // never itself read as "a filter is applied" (that default IS the normal
  // state, §2.6b). §2.3a of the amendment/AC-WU-58 — `userFilter` counts
  // too, so the empty state reads "Aucune adhésion ne correspond à ces
  // filtres" (AC-WM-25), never the club-startup empty state.
  const isFilterActive = seasonFilter !== null || statusFilter !== 'all' || cotisationFilter !== 'all' || !!userFilter

  const now = new Date()
  const seasonOptions = seasons.map((season) => ({
    id: season.id,
    // §2.6b/AC-WM-20 — reuses web-seasons's own 3-state predicate, never a
    // second inline test, for the "(en cours)" suffix.
    label: seasonStatus(season, now) === 'current' ? `${season.label} (en cours)` : season.label,
  }))

  // specs/web-users-membership-column.md §2.3b — the filter-applied
  // banner's own one-gesture cancel: removes `user` from the URL itself
  // (never just local state, §2.3b — a reload must not re-apply a cleared
  // filter) and returns the screen to its default state (current season, no
  // status/cotisation filter) — never an invented "toutes les saisons"
  // state.
  function clearUserFilter() {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('user')
      return next
    })
    setSeasonFilter(null)
    setStatusFilter('all')
    setCotisationFilter('all')
  }

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

    // specs/web-users-membership-column.md §2.3a/§2.3b — the
    // filter-applied banner: `userFilter` is the raw id from the URL (null
    // when absent, the SAME value the filter chain above already reads),
    // `filteredUserName` is the account's display name for the banner's
    // copy (null while loading or if the account can't be resolved —
    // the banner falls back to a generic phrase in that case, PO-WU-18
    // option (a)).
    userFilter,
    filteredUserName: filteredUserQuery.data?.fullName ?? null,
    clearUserFilter,

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
