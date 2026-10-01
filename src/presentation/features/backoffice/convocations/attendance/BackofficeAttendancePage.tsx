import { useParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { ConvocationFormHeader } from '../form/components/ConvocationFormHeader'
import { AttendanceActionBar } from './components/AttendanceActionBar'
import { AttendanceRosterSkeleton } from './components/AttendanceRosterSkeleton'
import { AttendanceRow } from './components/AttendanceRow'
import { DiscardAttendanceDialog } from './components/DiscardAttendanceDialog'
import { useBackofficeAttendanceViewModel } from './useBackofficeAttendanceViewModel'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'convocations')!

// specs/web-create-convocation.md UI design "Écran 4" — Présent / Absent only
// (no "Excusé" nor "Note", AC-WC-29). Zero business logic here.
export function BackofficeAttendancePage() {
  const { convocationId = '' } = useParams()
  const vm = useBackofficeAttendanceViewModel(convocationId)

  const header = (
    <ConvocationFormHeader
      title="Saisir les présences"
      subtitle={vm.subtitle || undefined}
      backLabel="Retour aux convocations"
      onBack={vm.back}
    />
  )

  if (vm.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <AttendanceRosterSkeleton />
      </div>
    )
  }

  if (vm.loadError) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        {header}
        <Alert variant="destructive" role="alert">
          <AlertDescription>Impossible de charger les présences.</AlertDescription>
        </Alert>
        <div>
          <Button type="button" variant="outline" onClick={vm.retry} className="h-11 rounded-full">
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  if (vm.notFound || !vm.canEnter) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {header}
        <BackofficeEmptyState
          icon={navItem.icon}
          title={vm.notFound ? 'Convocation introuvable.' : 'Les présences ne peuvent pas être saisies pour cette convocation.'}
        >
          <Button type="button" variant="outline" onClick={vm.goToList} className="h-11 rounded-full">
            Retour aux convocations
          </Button>
        </BackofficeEmptyState>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {header}
      {vm.showAlreadyEnteredHint && <p className="text-sm text-muted-foreground">Présences déjà saisies. Modifiez-les si besoin.</p>}
      {vm.saveError && (
        <Alert variant="destructive" role="alert" className="max-w-2xl">
          <AlertDescription>{vm.saveError}</AlertDescription>
        </Alert>
      )}

      {vm.isEmptyRoster ? (
        <BackofficeEmptyState icon={navItem.icon} title="Aucun joueur dans l’effectif de cette équipe" />
      ) : (
        <ul className="flex max-w-2xl flex-col gap-3">
          {vm.players.map((player) => (
            <AttendanceRow
              key={player.userId}
              displayName={player.displayName}
              status={player.status}
              disabled={vm.isSaving}
              onChange={(status) => vm.choose(player.userId, status)}
            />
          ))}
        </ul>
      )}

      <AttendanceActionBar changedCount={vm.changedCount} isSaving={vm.isSaving} onLater={vm.later} onSave={vm.save} />
      <DiscardAttendanceDialog open={vm.isDiscardOpen} onKeepEditing={vm.keepEditing} onDiscard={vm.discard} />
    </div>
  )
}
