import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { LegacyEntry, LegacyRule, LegacyTier } from '@domain/entities/legacy'
import { useLegacyDependencies } from '@presentation/di/hooks/use-legacy-dependencies'
import { formatLongDate } from '@presentation/shared/formatters/long-date'
import {
  formatLegacyEntryLabel,
  formatLegacyPoints,
} from '@presentation/shared/formatters/legacy-labels'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

// docs/specs/asc-legacy.md §6.1 — how many "prochaines récompenses" the screen lists.
const UPCOMING_REWARDS_COUNT = 2

export interface LegacyEntryRow {
  id: string
  label: string
  detail: string
  points: string
  isNegative: boolean
  isCorrection: boolean
  // PO-LG-05 — a convocation source navigates to its detail; mapping a source
  // to a route is a presentation concern. null = no navigable source.
  href: string | null
}

export interface LegacyUpcomingReward {
  tierId: string
  rank: number
  name: string
  rewardLabel: string
  discount: string
  missingPoints: number
  missingSeasons: number
}

export interface LegacyObtainedReward {
  key: string
  rank: number | null
  name: string | null
  rewardLabel: string
  // "Remise le 12/09/2026" or "À remettre"
  statusLabel: string
  isHandedOver: boolean
}

function formatDiscount(tier: LegacyTier): string {
  return `−${tier.discountPercent} %${tier.discountLifetime ? ' à vie' : ''}`
}

function formatSeniority(seasons: number): string {
  if (seasons <= 0) return 'Aucune saison'
  return seasons === 1 ? '1re saison au club' : `${seasons} saisons au club`
}

function toEntryRow(entry: LegacyEntry, rules: LegacyRule[]): LegacyEntryRow {
  const source = entry.source
  let detail = formatLongDate(entry.earnedOn)
  if (source.kind === 'manual') detail = `${detail} · « ${source.reason} »`
  return {
    id: entry.id,
    label: formatLegacyEntryLabel(entry, rules),
    detail,
    points: formatLegacyPoints(entry.points, { signed: true }),
    isNegative: entry.points < 0,
    isCorrection: entry.corrects !== null,
    href: source.kind === 'convocation' && source.convocationId ? `/convocations/${source.convocationId}` : null,
  }
}

// docs/specs/asc-legacy.md §6.1 — the player's own Legacy screen. One query
// (the overview bundle); every branch the page takes is a boolean computed here.
export function useLegacyViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { getLegacyOverviewUseCase } = useLegacyDependencies()

  const overviewQuery = useQuery({
    queryKey: queryKeys.legacyOverview(user?.id ?? ''),
    queryFn: () => getLegacyOverviewUseCase.execute({ userId: user?.id ?? '' }),
    enabled: !!user,
  })
  const overview = overviewQuery.data

  const base = {
    isLoading: overviewQuery.isPending,
    isError: overviewQuery.isError,
    goBack: () => navigate(-1),
    openEntry: (href: string) => navigate(href),
  }

  if (!overview) return { ...base, content: null }

  const { tierStatus, tiers, season } = overview
  const currentRank = tierStatus.currentTier?.rank ?? 0

  const upcomingRewards: LegacyUpcomingReward[] = tiers
    .filter((t) => t.rank > currentRank)
    .slice(0, UPCOMING_REWARDS_COUNT)
    .map((t) => ({
      tierId: t.id,
      rank: t.rank,
      name: t.name,
      rewardLabel: t.rewardLabel,
      discount: formatDiscount(t),
      missingPoints: Math.max(0, t.minPoints - overview.balance),
      missingSeasons: Math.max(0, t.minSeasons - overview.seniority),
    }))

  const next = tierStatus.nextTier
  const pointsMet = next !== null && tierStatus.missingPoints === 0
  const progress = next
    ? {
        title: `Vers ${next.name}`,
        current: overview.balance,
        target: next.minPoints,
        percent: next.minPoints > 0 ? Math.min(100, Math.round((overview.balance / next.minPoints) * 100)) : 100,
        // Mockup state 2: points alone never unlock a tier — said explicitly.
        isBlockedBySeasons: pointsMet && tierStatus.missingSeasons > 0,
        hint:
          pointsMet && tierStatus.missingSeasons > 0
            ? `Points atteints · ${tierStatus.missingSeasons} saison${tierStatus.missingSeasons > 1 ? 's' : ''} manquante${tierStatus.missingSeasons > 1 ? 's' : ''}`
            : `Plus que ${formatLegacyPoints(tierStatus.missingPoints)}`,
      }
    : null

  // PO-LG-20 — every grant, all seasons, then the tiers still to hand over.
  const grantedKeys = new Set(overview.grants.map((g) => `${g.tierId}:${g.seasonId}`))
  const tierById = new Map(tiers.map((t) => [t.id, t]))
  const obtainedRewards: LegacyObtainedReward[] = [
    ...overview.rewards
      .filter((r) => r.state === 'to_hand_over' && !grantedKeys.has(`${r.tier.id}:${r.tier.seasonId}`))
      .map((r) => ({
        key: `todo-${r.tier.id}`,
        rank: r.tier.rank,
        name: r.tier.name,
        rewardLabel: r.tier.rewardLabel,
        statusLabel: 'À remettre',
        isHandedOver: false,
      })),
    ...overview.grants.map((g) => {
      const tier = tierById.get(g.tierId)
      return {
        key: g.id,
        rank: tier?.rank ?? null,
        name: tier?.name ?? null,
        rewardLabel: g.rewardLabel,
        statusLabel: `Remise le ${formatLongDate(g.grantedAt.slice(0, 10))}`,
        isHandedOver: true,
      }
    }),
  ]

  const firstUpcoming = upcomingRewards[0]
  const emptyRewardsMessage = firstUpcoming
    ? `Aucune récompense pour l'instant. Le niveau ${firstUpcoming.name} se débloque à ${tiers
        .find((t) => t.id === firstUpcoming.tierId)
        ?.minPoints.toLocaleString('fr-FR')} pts et ${tiers.find((t) => t.id === firstUpcoming.tierId)?.minSeasons} saison(s).`
    : "Aucune récompense pour l'instant."

  const content = {
    emptyRewardsMessage,
    isNotConfigured: !overview.configured,
    isMaxReached: tierStatus.maxReached,
    isEmpty: overview.recentEntries.length === 0,
    balance: overview.balance.toLocaleString('fr-FR'),
    balanceCaption: overview.mode === 'per_season' && season ? `Saison ${season.label}` : 'Cumul depuis votre arrivée',
    tierName: tierStatus.currentTier?.name ?? 'Aucun niveau',
    tierRank: tierStatus.currentTier?.rank ?? null,
    seniorityLabel: formatSeniority(overview.seniority),
    progress,
    upcomingRewards,
    obtainedRewards,
    entries: overview.recentEntries.map((e) => toEntryRow(e, overview.rules)),
  }

  return { ...base, content }
}
