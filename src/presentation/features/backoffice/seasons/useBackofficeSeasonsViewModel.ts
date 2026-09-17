import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Season } from '@domain/entities/season'
import { seasonStatus, type SeasonStatus } from '@domain/policies/season-scope'
import { useSeasonsDependencies } from '@presentation/di/hooks/use-seasons-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

export type SeasonDialogState = { mode: 'create' } | { mode: 'edit'; season: Season } | null

export interface SeasonRow {
  season: Season
  // seasonStatus(season, now) computed ONCE here (AC-WS-18) — SeasonStatusBadge
  // and the edit-pencil visibility both only ever consume this ALREADY-COMPUTED
  // value, neither ever re-derives it from a Season row.
  status: SeasonStatus
}

// specs/web-seasons.md §2.6/AC-WS-13/AC-WS-30 — findAll() called directly
// through the DI-provided SeasonRepository, the same "no wrapping use case
// for a plain passthrough read" precedent as useBackofficeNewsViewModel's
// listAll() call: there is no business rule between "authenticated token"
// and "every seasons row" — seasons_select_authenticated (RLS) is the sole
// authority on what comes back (§2.5, unlike club_news there's no
// admin-specific read policy either). The two WRITES (create/update) each go
// through a use case, per AC-WS-14 — see useSeasonFormDialogViewModel.
export function useBackofficeSeasonsViewModel() {
  const { seasonRepository } = useSeasonsDependencies()
  // AC-WS-19 — computed independently of having reached this route
  // (backoffice:access already gated that), and independently of
  // 'section:manage' (§3).
  const canWrite = usePermission('season:write')

  const [dialog, setDialog] = useState<SeasonDialogState>(null)

  const seasonsQuery = useQuery({
    queryKey: queryKeys.seasonsAdminList(),
    queryFn: () => seasonRepository.findAll(),
  })

  const now = new Date()
  const rows: SeasonRow[] = (seasonsQuery.data ?? []).map((season) => ({
    season,
    status: seasonStatus(season, now),
  }))

  return {
    isLoading: seasonsQuery.isLoading,
    error: seasonsQuery.error ? mapDomainErrorToUiError(seasonsQuery.error) : null,
    rows,
    canWrite,

    dialog,
    openCreateDialog: () => setDialog({ mode: 'create' }),
    openEditDialog: (season: Season) => setDialog({ mode: 'edit', season }),
    closeDialog: () => setDialog(null),
  }
}
