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

interface NewsDiscardDialogProps {
  open: boolean
  onStay: () => void
  onDiscard: () => void
}

// Shown when the back arrow is used while the form holds unsaved changes
// (UI design §4, Q-UI-05 — removable without side effect).
export function NewsDiscardDialog({ open, onStay, onDiscard }: NewsDiscardDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onStay()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Abandonner les modifications ?</AlertDialogTitle>
          <AlertDialogDescription>Les modifications de l’actu n’ont pas été enregistrées.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay} className="h-11 rounded-full">
            Continuer
          </AlertDialogCancel>
          <AlertDialogAction onClick={onDiscard} className="h-11 rounded-full bg-white font-bold text-black hover:bg-white/90">
            Abandonner
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
