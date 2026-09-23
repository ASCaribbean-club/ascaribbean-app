import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

export interface MembershipFormValues {
  userId: string
  seasonId: string
  licenceNumber: string
  validUntil: string // yyyy-mm-dd, native <input type="date"> value
}

const EMPTY_VALUES: MembershipFormValues = { userId: '', seasonId: '', licenceNumber: '', validUntil: '' }
const EMPTY_SET: ReadonlySet<string> = new Set()

interface UseMembershipFormDialogViewModelParams {
  onSuccess: () => void
}

// specs/web-memberships.md UI design (amendement du 2026-09-17) — backs the
// "Nouvelle adhésion" dialog, /admin/memberships' ONLY caller
// (specs/web-users-membership-column.md §2.6 retires the "Créer / renouveler
// l'adhésion" entry point that used to also call this hook with a
// presetUserId — that parameter is gone, there's nothing left to
// pre-select). Modification of an EXISTING membership stays on the inline
// expandable row (useMembershipEditRowViewModel), which is why this hook
// still takes no mode/membership pair. Same remount-via-`key` pattern as
// useSeasonFormDialogViewModel/useTeamFormDialogViewModel (see
// MembershipFormDialog.tsx). The UTILISATEUR/SAISON dropdowns read the SAME
// centralized queryKeys already warmed by useBackofficeMembershipsViewModel
// — TanStack Query dedupes.
export function useMembershipFormDialogViewModel({ onSuccess }: UseMembershipFormDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { userRepository, seasonRepository, membershipRepository, createMembershipUseCase } = useMembershipsDependencies()

  const [values, setValues] = useState<MembershipFormValues>(() => ({ ...EMPTY_VALUES }))

  function setField<K extends keyof MembershipFormValues>(key: K, value: MembershipFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const usersQuery = useQuery({ queryKey: queryKeys.usersAdminList(), queryFn: () => userRepository.findAll() })
  const seasonsQuery = useQuery({ queryKey: queryKeys.seasonsAdminList(), queryFn: () => seasonRepository.findAll() })
  // Reuses membershipsAdminList — the SAME key /admin/memberships' own table
  // already warms, so opening this dialog from that screen costs no extra
  // request (TanStack Query dedupes). Used below to keep a user out of the
  // UTILISATEUR dropdown once they already hold a live membership for the
  // chosen season: the DB's partial unique index would reject the pair
  // anyway (DuplicateMembershipError), but surfacing that only after a
  // failed submit is worse UX than not offering the choice at all.
  const membershipsQuery = useQuery({ queryKey: queryKeys.membershipsAdminList(), queryFn: () => membershipRepository.findAllForAdmin() })
  // Same key/read useBackofficeMembershipsViewModel already warms
  // (queryKeys.seasonCurrent() — TanStack Query dedupes). Backs the SAISON
  // default below.
  const currentSeasonQuery = useQuery({ queryKey: queryKeys.seasonCurrent(), queryFn: () => seasonRepository.findCurrent() })
  const users = usersQuery.data ?? []
  const seasons = seasonsQuery.data ?? []
  const isLoadingOptions = usersQuery.isLoading || seasonsQuery.isLoading || membershipsQuery.isLoading || currentSeasonQuery.isLoading

  // §2.6b/AC-WM-20 pattern (useBackofficeMembershipsViewModel) — SAISON
  // defaults to the current season (Postgres-derived, never guessed) until
  // the admin explicitly picks a different one; no useEffect-driven reset,
  // just a plain derived value. This also makes the UTILISATEUR exclusion
  // below actually useful: without a default, opening UTILISATEUR (the
  // form's FIRST field) before ever touching SAISON left seasonId empty and
  // nothing was excluded.
  const effectiveSeasonId = values.seasonId || currentSeasonQuery.data?.id || ''

  // PO-WM-12 resolved (developer decision, 2026-09-23): VALIDE JUSQU'AU
  // defaults to the selected season's own end date — same derived-value
  // pattern as effectiveSeasonId above, so it tracks a season change right
  // up until the admin types their own date, and never fights a manual edit
  // once they have.
  const effectiveValidUntil = values.validUntil || seasons.find((season) => season.id === effectiveSeasonId)?.endDate || ''

  const userIdsWithMembershipBySeason = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const membership of membershipsQuery.data ?? []) {
      const bucket = map.get(membership.seasonId)
      if (bucket) bucket.add(membership.userId)
      else map.set(membership.seasonId, new Set([membership.userId]))
    }
    return map
  }, [membershipsQuery.data])

  const usersWithMembershipForSelectedSeason = effectiveSeasonId ? (userIdsWithMembershipBySeason.get(effectiveSeasonId) ?? EMPTY_SET) : EMPTY_SET
  const availableUsers = users.filter((candidate) => !usersWithMembershipForSelectedSeason.has(candidate.id))

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session — but keeps the mutationFn total
        // rather than calling a use case with an empty actorId.
        throw new Error('No authenticated admin session.')
      }
      const licenceNumber = values.licenceNumber.trim() || null

      // §2.1 — no amountDueCents field here: the "Nouvelle adhésion" dialog
      // never carries it (CreateMembershipUseCase sets it to null itself).
      // No status field either (developer decision): a brand-new membership
      // always starts 'pending' — its cotisation is by definition still due,
      // and CreateMembershipUseCase rejects 'active' outright anyway (it
      // requires a fully-settled cotisation, which a new membership can
      // never have). Promoting to 'active'/'suspended' is the edit row's job.
      return createMembershipUseCase.execute({
        actorId: user.id,
        userId: values.userId,
        seasonId: effectiveSeasonId,
        licenceNumber,
        status: 'pending',
        validUntil: effectiveValidUntil,
      })
    },
    onSuccess: () => {
      // AC-WM-24 — centralized queryKeys, invalidated so the list AND the
      // nav badge reflect the change without a manual reload.
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipsAdminList() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.membershipsBadgeCount() })
      // specs/web-users-membership-column.md §2.5/AC-WU-59 — the sense
      // inverts from before this amendment: creating a membership here now
      // also invalidates /admin/users' own two keys (criteria 2 AND 3 of
      // its completeness read), so its ADHÉSION SAISON column and nav badge
      // never go stale after an admin follows the redirect, creates the
      // membership, then comes back via the sidebar.
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersAdminDirectory() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersBadgeCount() })
      onSuccess()
    },
  })

  const canSubmit = !!values.userId && !!effectiveSeasonId && !!effectiveValidUntil && !mutation.isPending

  // AC-WM-25 — on failure the dialog stays open with the typed values
  // untouched, and shows a French message translated from the DomainError
  // (e.g. DuplicateMembershipError or ArchivedMembershipHasPaymentsError —
  // MembershipActivationRequirementsNotMetError can no longer surface from
  // this dialog now that it never sends 'active').
  const errorMessage = mutation.error ? mapDomainErrorToUiError(mutation.error).message : null

  return {
    // seasonId/validUntil are the EFFECTIVE ones (fall back to the current
    // season / that season's end date) — the controlled <Select>/<Input>
    // values need these, not the raw "has the admin explicitly touched it"
    // state.
    values: { ...values, seasonId: effectiveSeasonId, validUntil: effectiveValidUntil },
    setUserId: (value: string) => setField('userId', value),
    setSeasonId: (value: string) =>
      setValues((current) => {
        // A season change can make the currently-picked user unavailable
        // (they already hold a live membership for the new season) — drop
        // the stale selection rather than leaving an excluded user "chosen"
        // behind a dropdown that no longer lists them.
        const stillAvailable = !(userIdsWithMembershipBySeason.get(value)?.has(current.userId) ?? false)
        return { ...current, seasonId: value, userId: stillAvailable ? current.userId : '' }
      }),
    setLicenceNumber: (value: string) => setField('licenceNumber', value),
    setValidUntil: (value: string) => setField('validUntil', value),

    users: availableUsers,
    seasons,
    isLoadingOptions,

    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage,
    submit: () => mutation.mutate(),
  }
}
