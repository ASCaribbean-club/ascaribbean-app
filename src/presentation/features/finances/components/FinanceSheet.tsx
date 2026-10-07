import type { FormEvent, ReactNode } from "react";
import { Alert, AlertDescription } from "@presentation/shared/components/ui/alert";
import { Button } from "@presentation/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@presentation/shared/components/ui/dialog";

interface FinanceSheetProps {
  title: string;
  // Short recap line under the title (screen readers and sighted users).
  description: string;
  children: ReactNode;
  submitLabel: string;
  submittingLabel: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  // True once something was typed: an outside tap then no longer closes the sheet.
  isDirty: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

// specs/mob-treasurer-finances.md §4/§6/§7 — shared bottom-anchored sheet
// (same container as RecordDuePaymentDialog): scrolling body, opaque
// `sticky bottom-0` action bar so the submit button is always visible
// (AC-FI-23), "Annuler" at the top right (`h-11`). No drag handle (O-FI-UI-07).
export function FinanceSheet({
  title,
  description,
  children,
  submitLabel,
  submittingLabel,
  canSubmit,
  isSubmitting,
  errorMessage,
  isDirty,
  onCancel,
  onSubmit,
}: FinanceSheetProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(event) => {
          if (isDirty) event.preventDefault();
        }}
        className="top-auto bottom-0 flex max-h-[90dvh] max-w-full translate-y-0 flex-col gap-0 overflow-hidden rounded-b-none bg-coach-bg p-0 text-white ring-white/10 sm:max-w-[480px]"
      >
        <div className="flex min-w-0 items-start justify-between gap-3 px-5.5 pt-5 pb-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <DialogTitle className="truncate text-xl font-extrabold">
              {title}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-white/60">
              {description}
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-11 shrink-0 px-3 text-[14px] font-semibold text-white/70 hover:bg-white/10 hover:text-white"
          >
            Annuler
          </Button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5.5 pb-5">
            {children}
          </div>

          <div className="sticky bottom-0 flex flex-col gap-2 border-t border-white/10 bg-coach-bg px-5.5 py-4">
            {errorMessage && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-12 w-full rounded-full bg-coach-green text-[15px] font-bold text-white hover:bg-coach-green disabled:opacity-50"
            >
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
