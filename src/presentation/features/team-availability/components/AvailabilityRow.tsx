import { InitialsAvatar } from '@presentation/shared/components/InitialsAvatar'
import type { AvailabilityRowView } from '../availability-view'
import { AvailabilityBadge } from './AvailabilityBadge'

// Compact card, not interactive in this pass (the coach status sheet is a
// follow-up): no chevron, no pressed state.
export function AvailabilityRow({ row }: { row: AvailabilityRowView }) {
  return (
    <li className="flex min-h-14 items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
      <InitialsAvatar name={row.displayName} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-bold text-white">{row.displayName}</span>
        {row.subtitle && <span className="truncate text-[12.5px] text-white/60">{row.subtitle}</span>}
      </div>
      <AvailabilityBadge status={row.status} />
    </li>
  )
}
