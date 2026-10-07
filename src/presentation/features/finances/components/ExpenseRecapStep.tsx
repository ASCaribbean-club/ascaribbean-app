import type { ExpenseSheetViewModel } from "../useExpenseSheetViewModel";

// specs/finances-member-advances.md A2 step 4 — a rounded card, "label muted on
// the left, value bold on the right", a rule between rows (none after the last).
// Long values wrap (`min-w-0`, `break-words`): never truncate an amount or a
// name. No edit control in the card: one goes back with "Retour" or the step
// header.
export function ExpenseRecapStep({ vm }: { vm: ExpenseSheetViewModel }) {
  return (
    <dl className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-white/5 px-4">
      {vm.recapRows.map((row) => (
        <div
          key={row.label}
          className="flex min-w-0 items-baseline justify-between gap-4 border-b border-white/10 py-3 last:border-b-0"
        >
          <dt className="shrink-0 text-[14px] text-white/60">{row.label}</dt>
          <dd className="min-w-0 text-right text-[15px] font-bold break-words">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
