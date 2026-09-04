import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import type { CalendarDayInfo } from './calendar-day'
import { RangeModeToggle, type CalendarRangeMode } from './RangeModeToggle'
import { WeekDayStrip } from './WeekDayStrip'
import { MonthGrid } from './MonthGrid'
import { Button } from '@presentation/shared/components/ui/button'

interface CalendarRangeNavProps {
  mode: CalendarRangeMode
  onChangeMode: (mode: CalendarRangeMode) => void
  // "Cette semaine" / "Ce mois" — a static label per mode, not a computed
  // date range, so it's passed as a plain string rather than recomputed
  // here (this component doesn't know today's date or the selected week).
  scopeLabel: string
  onNavigatePrevious: () => void
  onNavigateNext: () => void
  selectedDate: Date
  today: Date
  onSelectDate: (date: Date) => void
  // Only the branch matching `mode` is actually read by the caller, but
  // both are typed as required rather than one `days | weeks` union prop:
  // keeps useCalendarViewModel free to compute whichever it wants without
  // narrowing on `mode` itself, and keeps this component's prop surface a
  // flat list rather than a discriminated union a mentee has to pattern-
  // match to understand.
  weekDays: CalendarDayInfo[]
  monthWeeks: (CalendarDayInfo | null)[][]
}

// specs/calendar.md UI design, "Composant nouveau" §1 — CalendarRangeNav,
// the one genuinely new patron on this screen (no existing shared component
// covers date navigation/selection). Composes RangeModeToggle + the two
// navigation chevrons + whichever of WeekDayStrip/MonthGrid matches `mode`.
// All the temporal math (which 7 days make up "this week", which month grid
// cells are padding, which day is initially selected) is deliberately NOT
// here — this component only renders the `weekDays`/`monthWeeks` it's
// handed and reports taps back via callbacks, same passive-component rule
// as everywhere else in this codebase (ARCHITECTURE.md §6).
export function CalendarRangeNav({
  mode,
  onChangeMode,
  scopeLabel,
  onNavigatePrevious,
  onNavigateNext,
  selectedDate,
  today,
  onSelectDate,
  weekDays,
  monthWeeks,
}: CalendarRangeNavProps) {
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-extrabold text-white">{scopeLabel}</h2>

        <div className="flex items-center gap-1.5">
          {/* h-11 w-11 (not shadcn's un-overridden `icon` size, which is
              32px): CLAUDE.md §6's ~44px minimum touch target applies to
              these chevrons just like any other interactive control. */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full bg-white/8 text-white hover:bg-white/15"
            aria-label={mode === 'week' ? 'Semaine précédente' : 'Mois précédent'}
            onClick={onNavigatePrevious}
          >
            <IconChevronLeft className="size-5" aria-hidden />
          </Button>

          <RangeModeToggle mode={mode} onChange={onChangeMode} />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full bg-white/8 text-white hover:bg-white/15"
            aria-label={mode === 'week' ? 'Semaine suivante' : 'Mois suivant'}
            onClick={onNavigateNext}
          >
            <IconChevronRight className="size-5" aria-hidden />
          </Button>
        </div>
      </div>

      {mode === 'week' ? (
        <WeekDayStrip days={weekDays} selectedDate={selectedDate} today={today} onSelectDate={onSelectDate} />
      ) : (
        <MonthGrid weeks={monthWeeks} selectedDate={selectedDate} today={today} onSelectDate={onSelectDate} />
      )}
    </section>
  )
}
