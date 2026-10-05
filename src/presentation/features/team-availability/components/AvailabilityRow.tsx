import { IconChevronRight } from '@tabler/icons-react'
import { InitialsAvatar } from '@presentation/shared/components/InitialsAvatar'
import type { AvailabilityRowView } from '../availability-view'
import { AvailabilityBadge } from './AvailabilityBadge'

interface AvailabilityRowProps {
  row: AvailabilityRowView
  // Present only when the viewer may edit this row: the row is then a button
  // (chevron, pressed state); otherwise it stays a plain card.
  onSelect?: () => void
}

export function AvailabilityRow({ row, onSelect }: AvailabilityRowProps) {
  const content = (
    <>
      <InitialsAvatar name={row.displayName} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-[15px] font-bold text-white">{row.displayName}</span>
        {row.subtitle && <span className="text-[12.5px] leading-snug text-white/60">{row.subtitle}</span>}
      </div>
      <AvailabilityBadge status={row.status} />
      {onSelect && <IconChevronRight size={18} className="shrink-0 text-white/40" aria-hidden />}
    </>
  )
  const cardClassName = 'flex min-h-14 w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3'

  return (
    <li>
      {onSelect ? (
        <button type="button" onClick={onSelect} aria-label={`Modifier la disponibilité de ${row.displayName}`} className={`${cardClassName} active:bg-white/10`}>
          {content}
        </button>
      ) : (
        <div className={cardClassName}>{content}</div>
      )}
    </li>
  )
}
