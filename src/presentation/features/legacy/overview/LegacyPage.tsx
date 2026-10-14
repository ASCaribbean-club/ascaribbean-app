import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { LegacyBalanceCard } from './components/LegacyBalanceCard'
import { LegacyHistoryList } from './components/LegacyHistoryList'
import { LegacyLoadingState } from './components/LegacyLoadingState'
import { LegacyMaxLevelCard } from './components/LegacyMaxLevelCard'
import { LegacyObtainedRewards } from './components/LegacyObtainedRewards'
import { LegacyProgressCard } from './components/LegacyProgressCard'
import { LegacyUpcomingRewards } from './components/LegacyUpcomingRewards'
import { useLegacyViewModel } from './useLegacyViewModel'

// docs/specs/asc-legacy.md §6.1 + mockup (5 states) — pushed route from the
// Menu "ASC Legacy" card (PO-LG-15): BackHeader, `sticky top-0`, no BottomNav
// change. Zero business logic: only branches on booleans the ViewModel computed.
// "Voir plus" / "Comment gagner des points" are separate pages (PO-LG-21), not
// built yet — no dead button is rendered for them.
export function LegacyPage() {
  const vm = useLegacyViewModel()
  const { content } = vm

  return (
    <div className="flex flex-col text-white">
      <BackHeader title="ASC Legacy" onBack={vm.goBack} />

      {vm.isLoading ? (
        <LegacyLoadingState />
      ) : vm.isError || content === null ? (
        <p role="alert" className="px-5.5 text-sm text-white/70">
          Impossible de charger ton ASC Legacy.
        </p>
      ) : content.isNotConfigured ? (
        <p className="mx-5.5 rounded-2xl border border-dashed border-white/20 p-3.5 text-[13px] text-white/60">
          L'ASC Legacy n'est pas encore configuré pour cette saison.
        </p>
      ) : (
        <div className="flex flex-col gap-5 px-5.5 pb-8">
          <LegacyBalanceCard
            balance={content.balance}
            caption={content.balanceCaption}
            tierName={content.tierName}
            tierRank={content.tierRank}
            seniorityLabel={content.seniorityLabel}
          />
          {content.isMaxReached ? (
            <LegacyMaxLevelCard />
          ) : (
            content.progress && <LegacyProgressCard {...content.progress} />
          )}
          {content.upcomingRewards.length > 0 && <LegacyUpcomingRewards rewards={content.upcomingRewards} />}
          <LegacyObtainedRewards rewards={content.obtainedRewards} emptyMessage={content.emptyRewardsMessage} />
          {!content.isEmpty && <LegacyHistoryList entries={content.entries} onOpen={vm.openEntry} />}
        </div>
      )}
    </div>
  )
}
