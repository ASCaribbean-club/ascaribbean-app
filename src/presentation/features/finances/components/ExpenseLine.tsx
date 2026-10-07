import { categoryColor } from "../category-palette";
import type { ExpenseLineView } from "../finances-view";

// specs/mob-treasurer-finances.md §3 point 4 — dense, non-interactive line (no
// chevron: modification is out of scope, PO-FI-06). Text columns shrink and
// truncate; the amount column keeps its width.
export function ExpenseLine({ line }: { line: ExpenseLineView }) {
  return (
    <li className="flex min-w-0 items-stretch gap-3 border-b border-white/10 py-3">
      <span
        aria-hidden
        className={`w-1 shrink-0 rounded-full ${categoryColor(line.colorIndex).bar}`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[15px] font-bold">{line.label}</p>
        <p className="truncate text-[13px] text-white/60">{line.meta}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <p className="text-[15px] font-bold whitespace-nowrap text-coach-red-text">
          {line.amountLabel}
        </p>
        <p className="max-w-32 truncate text-[13px] text-white/60">{line.carrierLabel}</p>
      </div>
    </li>
  );
}
