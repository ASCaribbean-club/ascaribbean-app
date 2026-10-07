import type { FinancesSnapshot } from "@domain/entities/finance";
import { useOpeningBalanceSheetViewModel } from "../useOpeningBalanceSheetViewModel";
import { AmountField } from "./AmountField";
import { FinanceSheet } from "./FinanceSheet";

interface OpeningBalanceSheetProps {
  snapshot: FinancesSnapshot;
  carrierId: string;
  carrierName: string;
  // Present = correction of the balance already entered (edit spec §5).
  existingCents?: number;
  onClose: () => void;
}

// specs/mob-treasurer-finances.md §6 — NOT in the mockups: a single-field
// sheet composed from the expense sheet's container. Treasurer only. Also the
// "Corriger le solde d'ouverture" sheet (edit spec §5): no warning text, no
// "Supprimer" (PO-FIE-05).
export function OpeningBalanceSheet({
  snapshot,
  carrierId,
  carrierName,
  existingCents,
  onClose,
}: OpeningBalanceSheetProps) {
  const vm = useOpeningBalanceSheetViewModel({
    snapshot,
    carrierId,
    carrierName,
    existingCents,
    onRecorded: onClose,
  });

  return (
    <FinanceSheet
      title={vm.title}
      description={vm.recapLabel}
      submitLabel={vm.submitLabel}
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
    </FinanceSheet>
  );
}
