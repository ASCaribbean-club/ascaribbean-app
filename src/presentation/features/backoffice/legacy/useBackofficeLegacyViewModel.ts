import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LegacyPointsMode, LegacyTier, LegacyTierInput } from '@domain/entities/legacy'
import type { Season } from '@domain/entities/season'
import { seasonStatus } from '@domain/policies/season-scope'
import { useLegacyDependencies } from '@presentation/di/hooks/use-legacy-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

// Number inputs are kept as typed strings at the presentation boundary and only
// parsed on save, same discipline as the season dialog's cotisation field.
export interface TierDraft {
  key: string
  rank: number
  name: string
  minSeasons: string
  minPoints: string
  rewardLabel: string
  discountPercent: string
  discountLifetime: boolean
}

export const LEGACY_MODE_LABELS: Record<LegacyPointsMode, string> = {
  cumulative: 'Cumulatif (depuis l’arrivée)',
  per_season: 'Par saison',
}

function toDraft(tier: LegacyTier): TierDraft {
  return {
    key: tier.id,
    rank: tier.rank,
    name: tier.name,
    minSeasons: String(tier.minSeasons),
    minPoints: String(tier.minPoints),
    rewardLabel: tier.rewardLabel,
    discountPercent: String(tier.discountPercent),
    discountLifetime: tier.discountLifetime,
  }
}

function toInput(draft: TierDraft): LegacyTierInput {
  return {
    rank: draft.rank,
    name: draft.name,
    minSeasons: Number(draft.minSeasons),
    minPoints: Number(draft.minPoints),
    rewardLabel: draft.rewardLabel,
    discountPercent: Number(draft.discountPercent),
    discountLifetime: draft.discountLifetime,
  }
}

// docs/specs/asc-legacy.md §6.4 — backoffice "ASC Legacy" tab. The tiers are
// edited once and written to the CURRENT season and every FUTURE one; a past
// season only shows the tiers it had (read-only). The season selector decides
// what is displayed, never where a save lands.
export function useBackofficeLegacyViewModel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { seasonRepository, legacyRepository, saveLegacyTiersUseCase, setLegacySeasonModeUseCase } = useLegacyDependencies()
  const canManage = usePermission('legacy:manage_tiers')

  const seasonsQuery = useQuery({
    queryKey: queryKeys.seasonsAdminList(),
    queryFn: () => seasonRepository.findAll(),
  })
  const now = new Date()
  const seasons: Season[] = seasonsQuery.data ?? []
  const defaultSeason = seasons.find((s) => seasonStatus(s, now) === 'current') ?? seasons[0]

  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null)
  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId) ?? defaultSeason ?? null
  const seasonId = selectedSeason?.id ?? ''

  const tiersQuery = useQuery({
    queryKey: queryKeys.legacyTiers(seasonId),
    queryFn: () => legacyRepository.findTiers(seasonId),
    enabled: !!selectedSeason,
  })
  const modeQuery = useQuery({
    queryKey: queryKeys.legacySeasonMode(seasonId),
    queryFn: () => legacyRepository.findSeasonMode(seasonId),
    enabled: !!selectedSeason,
  })

  // null = untouched: the table shows the stored tiers. Reset whenever the
  // selected season changes (see selectSeason).
  const [draft, setDraft] = useState<TierDraft[] | null>(null)
  const rows = draft ?? (tiersQuery.data ?? []).map(toDraft)

  const isEditable = canManage && !!selectedSeason && seasonStatus(selectedSeason, now) !== 'ended'

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('No authenticated admin session.')
      return saveLegacyTiersUseCase.execute({
        actorId: user.id,
        tiers: rows.map(toInput),
      })
    },
    onSuccess: () => {
      setDraft(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.legacyRoot() })
    },
  })

  // The points mode of the SELECTED season, saved on change (a single choice, no
  // draft). Also editable from the season dialog — same use case.
  const modeMutation = useMutation({
    mutationFn: (newMode: LegacyPointsMode) => {
      if (!user) throw new Error('No authenticated admin session.')
      return setLegacySeasonModeUseCase.execute({
        actorId: user.id,
        seasonId,
        mode: newMode,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.legacyRoot() })
    },
  })

  function updateRow(key: string, patch: Partial<TierDraft>) {
    setDraft(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function addTier() {
    const nextRank = rows.reduce((max, row) => Math.max(max, row.rank), 0) + 1
    setDraft([
      ...rows,
      {
        key: `new-${nextRank}`,
        rank: nextRank,
        name: '',
        minSeasons: '',
        minPoints: '',
        rewardLabel: '',
        discountPercent: '0',
        discountLifetime: false,
      },
    ])
  }

  const mode = modeQuery.data ?? null
  const isFilled = (row: TierDraft) =>
    row.name.trim() !== '' && row.rewardLabel.trim() !== '' && row.minSeasons !== '' && row.minPoints !== '' && row.discountPercent !== ''

  return {
    isLoading: seasonsQuery.isLoading || tiersQuery.isLoading,
    error: seasonsQuery.error || tiersQuery.error ? mapDomainErrorToUiError((seasonsQuery.error ?? tiersQuery.error)!) : null,

    seasons: seasons.map((s) => ({ id: s.id, label: s.label })),
    selectedSeasonId: selectedSeason?.id ?? null,
    selectSeason: (id: string) => {
      setSelectedSeasonId(id)
      setDraft(null)
      mutation.reset()
      modeMutation.reset()
    },

    modeLabel: mode ? LEGACY_MODE_LABELS[mode] : 'Non configuré',
    isModeConfigured: mode !== null,
    mode,
    modeOptions: (Object.keys(LEGACY_MODE_LABELS) as LegacyPointsMode[]).map((value) => ({ value, label: LEGACY_MODE_LABELS[value] })),
    setMode: (newMode: LegacyPointsMode) => modeMutation.mutate(newMode),
    isSavingMode: modeMutation.isPending,
    modeErrorMessage: modeMutation.error ? mapDomainErrorToUiError(modeMutation.error).message : null,

    rows,
    isEditable,
    isReadOnlyPastSeason: canManage && !!selectedSeason && !isEditable,
    isDirty: draft !== null,
    addTier,
    updateRow,

    canSave: isEditable && draft !== null && rows.every(isFilled) && !mutation.isPending,
    isSaving: mutation.isPending,
    saveErrorMessage: mutation.error ? mapDomainErrorToUiError(mutation.error).message : null,
    savedSeasonCount: mutation.isSuccess ? mutation.data : null,
    save: () => mutation.mutate(),
    discard: () => {
      setDraft(null)
      mutation.reset()
    },
  }
}
