import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@presentation/shared/components/ui/alert-dialog'

interface LineupDiscardDialogProps {
  open: boolean
  onStay: () => void
  onDiscard: () => void
}

// specs/coach-match-composition.md UI design §4 / Q-UI-2 — shown when the back
// arrow is used while the edit mode holds unsaved changes.
export function LineupDiscardDialog({ open, onStay, onDiscard }: LineupDiscardDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onStay()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Abandonner les modifications ?</AlertDialogTitle>
          <AlertDialogDescription>La composition modifiée n’a pas été enregistrée.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay} className="h-11 rounded-full">
            Rester
          </AlertDialogCancel>
          <AlertDialogAction onClick={onDiscard} className="h-11 rounded-full bg-white font-bold text-black hover:bg-white/90">
            Abandonner
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
