import { LegacyTierBadge } from './LegacyTierBadge'

interface LegacyBalanceCardProps {
  balance: string
  caption: string
  tierName: string
  tierRank: number | null
  seniorityLabel: string
}

// Mockup §"État principal" — big balance, caption (mode), tier + seniority pills.
export function LegacyBalanceCard({ balance, caption, tierName, tierRank, seniorityLabel }: LegacyBalanceCardProps) {
  return (
    <section className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4.5">
      <LegacyTierBadge rank={tierRank} className="size-16 text-3xl" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-4xl font-extrabold text-white">
          {balance} <span className="text-base font-semibold text-white/60">pts</span>
        </p>
        <p className="text-[12.5px] text-white/60">{caption}</p>
        <div className="flex flex-wrap gap-2 pt-1 text-[12.5px] font-semibold">
          <span className="rounded-full bg-white/10 px-3 py-1 text-white">{tierName}</span>
          <span className="py-1 text-white/70">{seniorityLabel}</span>
        </div>
      </div>
    </section>
  )
}
