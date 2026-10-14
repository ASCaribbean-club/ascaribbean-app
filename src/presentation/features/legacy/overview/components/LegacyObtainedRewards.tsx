import { cn } from '@presentation/shared/lib/utils'
import type { LegacyObtainedReward } from '../useLegacyViewModel'
import { LegacyTierBadge } from './LegacyTierBadge'

interface LegacyObtainedRewardsProps {
  rewards: LegacyObtainedReward[]
  emptyMessage: string
}

// "Récompenses obtenues" — PO-LG-20: every grant, all seasons, plus the tiers
// reached and still to hand over.
export function LegacyObtainedRewards({ rewards, emptyMessage }: LegacyObtainedRewardsProps) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-base font-extrabold text-white">Récompenses obtenues</h2>
      {rewards.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/20 p-3.5 text-[13px] text-white/60">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/5">
          {rewards.map((reward) => (
            <li key={reward.key} className="flex items-center gap-3 p-3.5">
              <LegacyTierBadge rank={reward.rank} />
              <div className="flex min-w-0 flex-1 flex-col">
                {reward.name && <p className="text-sm font-bold text-white">{reward.name}</p>}
                <p className="text-[12.5px] text-white/60">{reward.rewardLabel}</p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold',
                  reward.isHandedOver ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400',
                )}
              >
                {reward.statusLabel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
