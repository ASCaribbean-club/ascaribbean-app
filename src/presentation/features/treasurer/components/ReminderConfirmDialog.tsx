import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@presentation/shared/components/ui/alert-dialog";
import { REMINDER_CONFIRM_BODY } from "../reminder-copy";

interface ReminderConfirmDialogProps {
  title: string | null;
  isOpen: boolean;
  isSending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// specs/mobile-treasurer.md amendement UI du 2026-10-05 (4), (a) point 5 —
// one confirmation for a single, "Tout relancer" and a selection. While
// sending: both buttons disabled, label "Envoi…", closing (Escape) blocked.
export function ReminderConfirmDialog({
  title,
  isOpen,
  isSending,
  onConfirm,
  onCancel,
}: ReminderConfirmDialogProps) {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{REMINDER_CONFIRM_BODY}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2">
          <AlertDialogCancel
            disabled={isSending}
            className="h-11 min-w-0 flex-1"
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isSending}
            onClick={(event) => {
              // Keep the dialog open while the call runs; the hook closes it.
              event.preventDefault();
              onConfirm();
            }}
            className="h-11 min-w-0 flex-1 bg-amber-500 font-bold text-black hover:bg-amber-400"
          >
            {isSending ? "Envoi…" : "Relancer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
