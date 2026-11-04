import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@presentation/shared/components/ui/alert-dialog'
import type { ConvocationFormViewModel } from '../useConvocationFormViewModel'
import { REPEAT_FREQUENCY_LABELS } from '../repeat-frequency-labels'

type RepeatRecapDialogProps = {
  vm: Pick<
    ConvocationFormViewModel,
    | 'values'
    | 'isRecapOpen'
    | 'closeRecap'
    | 'confirmRecap'
    | 'repeatCount'
    | 'repeatDateLabels'
    | 'recapTeamName'
    | 'recapLocationName'
  >
}

// Recap shown before creating several trainings at once: nothing is written
// until "Confirmer". "Modifier" goes back to the form with every value kept.
export function RepeatRecapDialog({ vm }: RepeatRecapDialogProps) {
  return (
    <AlertDialog open={vm.isRecapOpen} onOpenChange={(open) => !open && vm.closeRecap()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Créer {vm.repeatCount} entraînements ?</AlertDialogTitle>
          <AlertDialogDescription>
            {[vm.recapTeamName, vm.recapLocationName, REPEAT_FREQUENCY_LABELS[vm.values.repeatFrequency]].filter(Boolean).join(' · ')}.
            Tous les joueurs de l’équipe seront convoqués à chaque séance.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ol className="max-h-64 list-inside list-decimal overflow-y-auto text-sm text-foreground">
          {vm.repeatDateLabels.map((label) => (
            <li key={label} className="py-0.5">
              {label}
            </li>
          ))}
        </ol>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 rounded-full">Modifier</AlertDialogCancel>
          <AlertDialogAction onClick={vm.confirmRecap} className="h-11 rounded-full">
            Confirmer la création
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
