import { Tabs, TabsList, TabsTrigger } from '@presentation/shared/components/ui/tabs'

export type CalendarRangeMode = 'week' | 'month'

interface RangeModeToggleProps {
  mode: CalendarRangeMode
  onChange: (mode: CalendarRangeMode) => void
}

// UI design §2 — the "Sem | Mois" two-state switch. Built on shadcn's Tabs
// primitive rather than hand-rolled buttons (CLAUDE.md §2, "prefer a shadcn
// primitive over a hand-rolled component"): Tabs already gives the
// roving-tabindex/aria-selected keyboard behavior AC-CA-17 asks for
// ("navigation clavier opérationnelle") for free, even though this screen
// never renders TabsContent — only the trigger row is used, as a plain
// segmented control.
export function RangeModeToggle({ mode, onChange }: RangeModeToggleProps) {
  return (
    <Tabs value={mode} onValueChange={(value) => onChange(value as CalendarRangeMode)}>
      <TabsList className="h-11 gap-0.5 bg-white/8 p-1">
        {/* min-w-0 (CLAUDE.md §6): the two segments sit side by side and
            must be able to shrink below their own label width rather than
            overflow their shared track on a narrow phone. */}
        <TabsTrigger value="week" className="min-w-0 text-white/70 data-[state=active]:bg-white/15 data-[state=active]:text-white">
          Sem
        </TabsTrigger>
        <TabsTrigger value="month" className="min-w-0 text-white/70 data-[state=active]:bg-white/15 data-[state=active]:text-white">
          Mois
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
