import type { FinancesSnapshot } from "@domain/entities/finance";
import { Button } from "@presentation/shared/components/ui/button";
import { Input } from "@presentation/shared/components/ui/input";
import { categoryColor } from "../category-palette";
import { useExpenseSheetViewModel } from "../useExpenseSheetViewModel";
import { AmountField } from "./AmountField";
import { ChoiceChips } from "./ChoiceChips";
import { FinanceSheet } from "./FinanceSheet";

interface ExpenseSheetProps {
  snapshot: FinancesSnapshot;
  today: string;
  onClose: () => void;
}

// specs/mob-treasurer-finances.md §4 (maquettes 5/6) — "Nouvelle dépense".
// Mounted only while open (treasurer only), so the form always starts fresh.
export function ExpenseSheet({ snapshot, today, onClose }: ExpenseSheetProps) {
  const vm = useExpenseSheetViewModel({ snapshot, today, onRecorded: onClose });

  return (
    <FinanceSheet
      title="Nouvelle dépense"
      description={`Saison ${vm.seasonLabel}`}
      submitLabel="Enregistrer la dépense"
      submittingLabel="Enregistrement…"
      canSubmit={vm.canSubmit}
      isSubmitting={vm.isSubmitting}
      errorMessage={vm.errorMessage}
      isDirty={vm.isDirty}
      onCancel={onClose}
      onSubmit={vm.submit}
    >
      <AmountField
        id="expense-amount"
        label="Montant"
        size="large"
        value={vm.amountEuros}
        onChange={vm.setAmountEuros}
        hint={vm.amountHint}
        disabled={vm.isSubmitting}
      />

      {/* Libellé / Date side by side: each item `min-w-0` so the native date
          input shrinks to its column instead of overlapping the label. */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
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
        <div className="flex min-w-0 flex-col gap-1.5">
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
            className="h-11 min-w-0 rounded-xl border-white/15 bg-white/5 text-white"
          />
        </div>
      </div>
      {vm.dateMessage && <p className="-mt-3 text-xs text-red-300">{vm.dateMessage}</p>}

      <div className="flex min-w-0 flex-col gap-3">
        <ChoiceChips
          legend="Catégorie"
          disabled={vm.isSubmitting}
          selectedId={vm.categoryId}
          onSelect={vm.selectCategory}
          options={vm.categoryOptions.map((option) => ({
            id: option.id,
            label: option.label,
            leading: (
              <span
                aria-hidden
                className={`size-2.5 shrink-0 rounded-full ${categoryColor(option.colorIndex).dot}`}
              />
            ),
          }))}
          trailing={
            !vm.isNewCategoryOpen && (
              <Button
                type="button"
                variant="outline"
                onClick={vm.openNewCategory}
                disabled={vm.isSubmitting}
                className="h-11 rounded-full border-dashed border-white/25 bg-transparent px-4 text-[14px] font-semibold text-white/80 hover:bg-white/10"
              >
                + Nouvelle
              </Button>
            )
          }
        />

        {vm.isNewCategoryOpen && (
          <div className="flex min-w-0 flex-col gap-2">
            {/* Field and buttons wrap below each other on a narrow phone. */}
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Input
                aria-label="Nom de la catégorie"
                placeholder="Nom de la catégorie"
                value={vm.newCategoryLabel}
                maxLength={vm.maxCategoryLength}
                disabled={vm.isCreatingCategory}
                onChange={(event) => vm.setNewCategoryLabel(event.target.value)}
                className="h-11 min-w-0 flex-1 basis-40 rounded-xl border-white/15 bg-white/5 text-white"
              />
              <Button
                type="button"
                onClick={vm.submitNewCategory}
                disabled={vm.isCreatingCategory}
                className="h-11 shrink-0 rounded-full bg-white px-4 font-bold text-black hover:bg-white/90"
              >
                Ajouter
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={vm.cancelNewCategory}
                disabled={vm.isCreatingCategory}
                className="h-11 shrink-0 rounded-full px-4 font-semibold text-white/70 hover:bg-white/10"
              >
                Annuler
              </Button>
            </div>
            {vm.newCategoryError && (
              <p role="alert" className="text-xs text-red-300">
                {vm.newCategoryError}
              </p>
            )}
          </div>
        )}
      </div>

      <ChoiceChips
        legend="Porteur · d'où sort l'argent"
        disabled={vm.isSubmitting}
        selectedId={vm.carrierId}
        onSelect={vm.selectCarrier}
        options={vm.carrierOptions}
      />

      <ChoiceChips
        legend="Mode de paiement"
        disabled={vm.isSubmitting}
        selectedId={vm.paymentMethod}
        onSelect={vm.selectPaymentMethod}
        options={vm.methodOptions}
      />
    </FinanceSheet>
  );
}
