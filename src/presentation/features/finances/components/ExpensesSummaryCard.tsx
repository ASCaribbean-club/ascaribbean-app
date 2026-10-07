import { categoryColor } from "../category-palette";
import type { ExpensesTabView } from "../finances-view";

interface ExpensesSummaryCardProps {
  view: ExpensesTabView;
}

// specs/mob-treasurer-finances.md §3 point 1 — season total, "Ce mois", the
// decorative segmented bar and the legend (colour dot + label + amount in TEXT:
// colour is never the only carrier, AC-FI-07). Does NOT react to the filter.
export function ExpensesSummaryCard({ view }: ExpensesSummaryCardProps) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4.5">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <h2 className="min-w-0 truncate text-[13px] font-bold tracking-wider text-coach-red-text uppercase">
          Dépenses saison
        </h2>
        <p className="shrink-0 text-[13px] text-white/60">
          Ce mois : <span className="font-bold text-white">{view.monthLabel}</span>
        </p>
      </div>
      <p className="text-[34px] leading-none font-extrabold">{view.totalLabel}</p>

      {view.segments.length > 0 && (
        <>
          <div aria-hidden className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
            {view.segments.map((segment) => (
              <span
                key={segment.id}
                style={{ width: `${segment.percent}%` }}
                className={`h-full ${categoryColor(segment.colorIndex).bar}`}
              />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
            {view.segments.map((segment) => (
              <li key={segment.id} className="flex min-w-0 items-center gap-2 text-[13.5px]">
                <span
                  aria-hidden
                  className={`size-2.5 shrink-0 rounded-full ${categoryColor(segment.colorIndex).dot}`}
                />
                <span className="min-w-0 flex-1 truncate text-white/75">{segment.label}</span>
                <span className="shrink-0 font-bold">{segment.amountLabel}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
