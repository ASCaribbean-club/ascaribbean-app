import { IconChevronRight } from '@tabler/icons-react'
import { cn } from '@presentation/shared/lib/utils'
import type { LegacyEntryRow } from '../useLegacyViewModel'

interface LegacyHistoryListProps {
  entries: LegacyEntryRow[]
  onOpen: (href: string) => void
}

// "Historique" — the most recent entries. A convocation-sourced row is a real
// button (≥44px) leading to the convocation; others are plain rows.
// Filters and "Voir plus" belong to the dedicated history page (PO-LG-21).
export function LegacyHistoryList({ entries, onOpen }: LegacyHistoryListProps) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-base font-extrabold text-white">Historique</h2>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => {
          const content = (
            <>
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <p className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="truncate">{entry.label}</span>
                </p>
                <p className="truncate text-[12.5px] text-white/60">{entry.detail}</p>
              </div>
              <span className={cn('shrink-0 text-sm font-extrabold', entry.isNegative ? 'text-red-400' : 'text-emerald-400')}>
                {entry.points}
              </span>
              {entry.href && <IconChevronRight aria-hidden className="size-4 shrink-0 text-white/40" />}
            </>
          )
          const className = 'flex min-h-11 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3'
          return (
            <li key={entry.id}>
              {entry.href ? (
                <button type="button" className={className} onClick={() => onOpen(entry.href as string)}>
                  {content}
                </button>
              ) : (
                <div className={className}>{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
