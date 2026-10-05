import { Alert, AlertDescription } from "@presentation/shared/components/ui/alert";
import { Button } from "@presentation/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@presentation/shared/components/ui/dialog";
import { Input } from "@presentation/shared/components/ui/input";
import { Label } from "@presentation/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@presentation/shared/components/ui/select";
import type { DueView } from "../../due-view";
import { useRecordDuePaymentViewModel } from "../useRecordDuePaymentViewModel";

interface RecordDuePaymentDialogProps {
  due: DueView | null;
  seasonLabel: string;
  onClose: () => void;
  onRecorded: (amountCents: number) => void;
}

// specs/mobile-treasurer.md amendement UI du 2026-10-05 (3), "Formulaire".
// Mounted only while a card's button targeted a membership, keyed on it, so
// the form always starts fresh (date = today, empty amount).
export function RecordDuePaymentDialog({
  due,
  seasonLabel,
  onClose,
  onRecorded,
}: RecordDuePaymentDialogProps) {
  if (!due) return null;
  return (
    <RecordDuePaymentDialogContent
      key={due.id}
      due={due}
      seasonLabel={seasonLabel}
      onClose={onClose}
      onRecorded={onRecorded}
    />
  );
}

const LABEL_CLASS =
  "text-xs font-semibold tracking-wider text-muted-foreground uppercase";

function RecordDuePaymentDialogContent({
  due,
  seasonLabel,
  onClose,
  onRecorded,
}: Omit<RecordDuePaymentDialogProps, "due"> & { due: DueView }) {
  const vm = useRecordDuePaymentViewModel({
    membershipId: due.id,
    onRecorded,
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* Anchored at the bottom, full width on mobile; body scrolls, footer
          stays visible (sticky bottom-0, opaque background). */}
      <DialogContent className="top-auto bottom-0 flex max-h-[90dvh] max-w-full translate-y-0 flex-col gap-0 overflow-hidden rounded-b-none p-0 sm:max-w-[480px]">
        <DialogHeader className="min-w-0 px-4 pt-4 pb-3 pr-12">
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <DialogDescription className="min-w-0 truncate">
            {due.name} · saison {seasonLabel}
          </DialogDescription>
          <p className="text-sm text-muted-foreground">
            {due.amountsLabel}
            {due.remainingLabel ? ` · ${due.remainingLabel}` : ""}
          </p>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            vm.submit();
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            {vm.errorMessage && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{vm.errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="due-payment-amount" className={LABEL_CLASS}>
                Montant
              </Label>
              <div className="relative">
                <Input
                  id="due-payment-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  disabled={vm.isSubmitting}
                  value={vm.amountEuros}
                  onChange={(event) => vm.setAmountEuros(event.target.value)}
                  onBlur={vm.onAmountBlur}
                  aria-invalid={vm.amountErrorMessage !== null}
                  aria-describedby={
                    vm.amountErrorMessage ? "due-payment-amount-error" : undefined
                  }
                  className="h-11 min-w-0 rounded-xl pr-8"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                  €
                </span>
              </div>
              {vm.amountErrorMessage && (
                <p id="due-payment-amount-error" className="text-xs text-destructive">
                  Erreur : {vm.amountErrorMessage}
                </p>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="due-payment-paid-at" className={LABEL_CLASS}>
                Date du versement
              </Label>
              <Input
                id="due-payment-paid-at"
                type="date"
                max={vm.maxPaidAt}
                disabled={vm.isSubmitting}
                value={vm.paidAt}
                onChange={(event) => vm.setPaidAt(event.target.value)}
                onBlur={vm.onDateBlur}
                aria-invalid={vm.dateErrorMessage !== null}
                aria-describedby={
                  vm.dateErrorMessage ? "due-payment-paid-at-error" : undefined
                }
                className="h-11 min-w-0 rounded-xl"
              />
              {vm.dateErrorMessage && (
                <p id="due-payment-paid-at-error" className="text-xs text-destructive">
                  Erreur : {vm.dateErrorMessage}
                </p>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="due-payment-method" className={LABEL_CLASS}>
                Moyen de paiement
              </Label>
              <Select
                value={vm.paymentMethodValue}
                onValueChange={vm.setPaymentMethodValue}
                disabled={vm.isSubmitting}
              >
                <SelectTrigger
                  id="due-payment-method"
                  className="h-11 w-full min-w-0 rounded-xl"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="min-h-11">
                    Non précisé
                  </SelectItem>
                  {vm.paymentMethodOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="min-h-11"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground italic">
              La cotisation peut être versée en plusieurs fois : ce montant
              s'ajoute aux versements déjà enregistrés.
            </p>
          </div>

          <div className="sticky bottom-0 flex gap-2 border-t bg-background p-4">
            <Button
              type="button"
              variant="outline"
              disabled={vm.isSubmitting}
              onClick={onClose}
              className="h-11 min-w-0 flex-1 rounded-full"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!vm.canSubmit}
              className="h-11 min-w-0 flex-1 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green disabled:opacity-60"
            >
              {vm.isSubmitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
