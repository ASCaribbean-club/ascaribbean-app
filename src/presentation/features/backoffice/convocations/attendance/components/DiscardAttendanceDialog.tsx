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

interface DiscardAttendanceDialogProps {
  open: boolean
  onKeepEditing: () => void
  onDiscard: () => void
}

export function DiscardAttendanceDialog({ open, onKeepEditing, onDiscard }: DiscardAttendanceDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onKeepEditing()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Abandonner les modifications ?</AlertDialogTitle>
          <AlertDialogDescription>Les choix non enregistrés seront perdus.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 rounded-full">Continuer la saisie</AlertDialogCancel>
          <AlertDialogAction onClick={onDiscard} className="h-11 rounded-full">
            Abandonner
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
