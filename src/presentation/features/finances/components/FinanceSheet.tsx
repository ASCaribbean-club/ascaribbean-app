import type { FormEvent, ReactNode } from "react";
import { Alert, AlertDescription } from "@presentation/shared/components/ui/alert";
import { Button } from "@presentation/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@presentation/shared/components/ui/dialog";

// specs/mob-treasurer-finances-edit.md §2 — "Supprimer" at the END of the
// scrolling body (not in the action bar), then an in-place confirmation that
// REPLACES the action bar (no stacked dialog). Absent unless the ViewModel
// passes it (canDelete*).
export interface FinanceSheetDeletion {
  label: string;
  // Sentence of the confirmation, naming the object in text.
  confirmMessage: string;
  isConfirming: boolean;
  isDeleting: boolean;
  onRequest: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

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
  deletion?: FinanceSheetDeletion;
  // specs/finances-member-advances.md A1 — wizard frame, all optional so the
  // checkpoint / opening-balance sheets are unchanged. `stepHeader` sits in the
  // FIXED part under the title (always visible), `actionBar` replaces the
  // default full-width submit button (it is still replaced by the in-place
  // delete confirmation), `showHandle` draws the decorative handle (no drag).
  stepHeader?: ReactNode;
  actionBar?: ReactNode;
  showHandle?: boolean;
}

// specs/mob-treasurer-finances.md §4/§6/§7 — shared bottom-anchored sheet
// (same container as RecordDuePaymentDialog): scrolling body, opaque
// `sticky bottom-0` action bar so the submit button is always visible
// (AC-FI-23), "Annuler" at the top right (`h-11`). The wizard variant adds a
// decorative handle, a step header and its own action bar.
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
  deletion,
  stepHeader,
  actionBar,
  showHandle,
}: FinanceSheetProps) {
  const isBusy = isSubmitting || (deletion?.isDeleting ?? false);
  const isConfirmingDelete = deletion?.isConfirming ?? false;
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
        {showHandle && <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/20" />}
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
            disabled={isBusy}
            className="h-11 shrink-0 px-3 text-[14px] font-semibold text-white/70 hover:bg-white/10 hover:text-white"
          >
            Annuler
          </Button>
        </div>

        {stepHeader}

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div
            className={`flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5.5 pb-5 ${
              isConfirmingDelete ? "pointer-events-none opacity-60" : ""
            }`}
            inert={isConfirmingDelete}
          >
            {children}
            {deletion && !isConfirmingDelete && (
              <div className="mt-2 flex flex-col gap-3 border-t border-white/10 pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={deletion.onRequest}
                  disabled={isBusy}
                  className="h-11 w-full rounded-full border-coach-red-text/60 bg-transparent font-semibold text-coach-red-text hover:bg-coach-red/10"
                >
                  {deletion.label}
                </Button>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 flex flex-col gap-2 border-t border-white/10 bg-coach-bg px-5.5 py-4">
            {errorMessage && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            {deletion && isConfirmingDelete ? (
              <>
                <p className="text-[14px] text-white/80">{deletion.confirmMessage}</p>
                <Button
                  type="button"
                  onClick={deletion.onConfirm}
                  disabled={deletion.isDeleting}
                  className="h-11 w-full rounded-full bg-coach-red text-[15px] font-bold text-white hover:bg-coach-red disabled:opacity-50"
                >
                  {deletion.isDeleting ? "Suppression…" : "Supprimer définitivement"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={deletion.onCancel}
                  disabled={deletion.isDeleting}
                  className="h-11 w-full rounded-full border-white/20 bg-white/5 font-semibold text-white hover:bg-white/10"
                >
                  Annuler
                </Button>
              </>
            ) : actionBar ? (
              actionBar
            ) : (
              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-12 w-full rounded-full bg-coach-green text-[15px] font-bold text-white hover:bg-coach-green disabled:opacity-50"
              >
                {isSubmitting ? submittingLabel : submitLabel}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
