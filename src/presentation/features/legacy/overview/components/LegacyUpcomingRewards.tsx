import type { LegacyUpcomingReward } from '../useLegacyViewModel'
import { LegacyTierBadge } from './LegacyTierBadge'

interface LegacyUpcomingRewardsProps {
  rewards: LegacyUpcomingReward[]
}

// "Prochaines récompenses" — the next tiers, each with what is still missing.
export function LegacyUpcomingRewards({ rewards }: LegacyUpcomingRewardsProps) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-base font-extrabold text-white">Prochaines récompenses</h2>
      <ul className="flex flex-col divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/5">
        {rewards.map((reward) => (
          <li key={reward.tierId} className="flex items-start gap-3 p-3.5">
            <LegacyTierBadge rank={reward.rank} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm font-bold text-white">
                {reward.name} <span className="font-semibold text-emerald-400">{reward.discount}</span>
              </p>
              <p className="text-[12.5px] text-white/60">{reward.rewardLabel}</p>
              <p className="flex flex-wrap gap-x-3 text-[12px] font-semibold">
                <Requirement met={reward.missingPoints === 0} label={reward.missingPoints === 0 ? 'Points atteints' : `Points : ${reward.missingPoints.toLocaleString('fr-FR')} restants`} />
                <Requirement
                  met={reward.missingSeasons === 0}
                  label={
                    reward.missingSeasons === 0
                      ? 'Saisons atteintes'
                      : `Saisons : ${reward.missingSeasons} restante${reward.missingSeasons > 1 ? 's' : ''}`
                  }
                />
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={met ? 'text-emerald-400' : 'text-amber-400'}>
      <span aria-hidden>{met ? '✓' : '○'}</span> {label}
    </span>
  )
}
