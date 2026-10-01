import { IconAlertTriangle, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'
import { CONVOCATION_TYPE_ACCENT } from '@presentation/shared/formatters/convocation-type-accent'
import { cn } from '@presentation/shared/lib/utils'
import { buildMonthGrid, formatMonthLabel } from '../calendar-grid'
import type { ConvocationRowView } from '../convocation-row-view'
import { formatConvocationTime } from '../format-convocation-date'
import { useNow } from '@presentation/shared/hooks/use-now'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

interface ConvocationCalendarProps {
  month: Date
  rows: ConvocationRowView[]
  isLoading: boolean
  onPreviousMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onSelect: (id: string) => void
}

// Calendar view of the list — a month grid fed by the same rows as the table.
// Each event is a button (type-coloured rail + time + team) that opens the same
// details panel the table expands inline; the grid itself writes nothing.
export function ConvocationCalendar({ month, rows, isLoading, onPreviousMonth, onNextMonth, onToday, onSelect }: ConvocationCalendarProps) {
  const now = useNow()
  const cells = buildMonthGrid(month, rows, (row) => row.startsAt, now)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Mois précédent"
          onClick={onPreviousMonth}
          className="h-9 w-9 rounded-full"
        >
          <IconChevronLeft className="size-4" aria-hidden />
        </Button>
        <h3 className="min-w-40 text-center text-base font-semibold text-foreground" aria-live="polite">
          {formatMonthLabel(month)}
        </h3>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Mois suivant"
          onClick={onNextMonth}
          className="h-9 w-9 rounded-full"
        >
          <IconChevronRight className="size-4" aria-hidden />
        </Button>
        <Button type="button" variant="outline" onClick={onToday} className="h-9 rounded-full px-3 text-xs">
          Aujourd’hui
        </Button>
      </div>

      <div className={cn('overflow-x-auto', isLoading && 'opacity-60')} aria-busy={isLoading}>
        <div className="grid min-w-[44rem] grid-cols-7 overflow-hidden rounded-xl border border-border">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="border-b border-border bg-muted/30 px-2 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              {day}
            </div>
          ))}
          {cells.map((cell) => (
            <div
              key={cell.key}
              className={cn('flex min-h-28 min-w-0 flex-col gap-1 border-r border-b border-border p-1.5', !cell.inMonth && 'bg-muted/20')}
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center self-end rounded-full text-xs',
                  cell.inMonth ? 'text-foreground' : 'text-muted-foreground/50',
                  cell.isToday && 'bg-coach-green font-semibold text-white',
                )}
              >
                {cell.day}
              </span>
              {cell.items.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onSelect(row.id)}
                  className="flex min-w-0 items-center gap-1.5 rounded-md bg-muted/40 px-1.5 py-1 text-left text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className={cn('h-4 w-1 shrink-0 rounded-full', CONVOCATION_TYPE_ACCENT[row.type].rail)} aria-hidden />
                  <span className="shrink-0 text-muted-foreground">{formatConvocationTime(row.startsAt)}</span>
                  <span className="truncate font-medium">{row.teamName}</span>
                  <span className="sr-only">{row.typeLabel}</span>
                  {row.attendance.kind === 'pending' && (
                    <IconAlertTriangle className="ml-auto size-3.5 shrink-0 text-coach-amber" aria-label="Présences non saisies" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
