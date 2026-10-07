import type { FinancesSnapshot } from "@domain/entities/finance";
import { useOpeningBalanceSheetViewModel } from "../useOpeningBalanceSheetViewModel";
import { AmountField } from "./AmountField";
import { FinanceSheet } from "./FinanceSheet";

interface OpeningBalanceSheetProps {
  snapshot: FinancesSnapshot;
  carrierId: string;
  carrierName: string;
  onClose: () => void;
}

// specs/mob-treasurer-finances.md §6 — NOT in the mockups: a single-field
// sheet composed from the expense sheet's container. Treasurer only.
export function OpeningBalanceSheet({
  snapshot,
  carrierId,
  carrierName,
  onClose,
}: OpeningBalanceSheetProps) {
  const vm = useOpeningBalanceSheetViewModel({
    snapshot,
    carrierId,
    carrierName,
    onRecorded: onClose,
  });

  return (
    <FinanceSheet
      title="Solde d'ouverture"
      description={vm.recapLabel}
      submitLabel="Enregistrer le solde d'ouverture"
      submittingLabel="Enregistrement…"
      canSubmit={vm.canSubmit}
      isSubmitting={vm.isSubmitting}
      errorMessage={vm.errorMessage}
      isDirty={vm.isDirty}
      onCancel={onClose}
      onSubmit={vm.submit}
    >
      <AmountField
        id="opening-balance-amount"
        label="Montant"
        size="large"
        value={vm.amountEuros}
        onChange={vm.setAmountEuros}
        hint={vm.amountHint}
        disabled={vm.isSubmitting}
      />
      <p className="text-[13px] font-semibold text-amber-300">
        Ce montant ne pourra pas être modifié ensuite.
      </p>
    </FinanceSheet>
  );
}
