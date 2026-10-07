import { Input } from "@presentation/shared/components/ui/input";
import type { ExpenseSheetViewModel } from "../useExpenseSheetViewModel";
import { AmountField } from "./AmountField";

// specs/finances-member-advances.md A2 step 1 — amount (large), then Libellé /
// Date side by side: a 5-column grid (label 3, date 2), `min-w-0` on each item
// so the native date input shrinks to its column instead of overlapping the
// label (CLAUDE.md §6). The date error sits under the pair.
export function ExpenseAmountStep({ vm }: { vm: ExpenseSheetViewModel }) {
  return (
    <>
      <AmountField
        id="expense-amount"
        label="Montant"
        size="large"
        value={vm.amountEuros}
        onChange={vm.setAmountEuros}
        hint={vm.amountHint}
        disabled={vm.isSubmitting}
      />

      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3 flex min-w-0 flex-col gap-1.5">
          <label
            htmlFor="expense-label"
            className="text-[11.5px] font-bold tracking-wider text-white/45 uppercase"
          >
            Libellé
          </label>
          <Input
            id="expense-label"
            value={vm.label}
            maxLength={vm.maxLabelLength}
            disabled={vm.isSubmitting}
            onChange={(event) => vm.setLabel(event.target.value)}
            className="h-11 min-w-0 rounded-xl border-white/15 bg-white/5 text-white"
          />
        </div>
        <div className="col-span-2 flex min-w-0 flex-col gap-1.5">
          <label
            htmlFor="expense-date"
            className="text-[11.5px] font-bold tracking-wider text-white/45 uppercase"
          >
            Date
          </label>
          <Input
            id="expense-date"
            type="date"
            min={vm.minSpentOn}
            max={vm.maxSpentOn}
            value={vm.spentOn}
            disabled={vm.isSubmitting}
            onChange={(event) => vm.setSpentOn(event.target.value)}
            aria-invalid={vm.dateMessage ? true : undefined}
            className="h-11 min-w-0 rounded-xl border-white/15 bg-white/5 px-2 text-white"
          />
        </div>
      </div>
      {vm.dateMessage && <p className="-mt-3 text-xs text-red-300">{vm.dateMessage}</p>}
    </>
  );
}
