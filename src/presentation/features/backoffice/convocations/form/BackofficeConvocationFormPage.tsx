import { useParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { ConvocationFormFooter } from './components/ConvocationFormFooter'
import { ConvocationFormHeader } from './components/ConvocationFormHeader'
import { ConvocationTypeToggle } from './components/ConvocationTypeToggle'
import { MatchFields } from './components/MatchFields'
import { MeetingFields } from './components/MeetingFields'
import { TeamPickerFields } from './components/TeamPickerFields'
import { TrainingFields } from './components/TrainingFields'
import { useConvocationFormViewModel } from './useConvocationFormViewModel'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'convocations')!

// specs/web-create-convocation.md UI design "Écran 2/3" — creation
// (`/admin/convocations/new`) and edition (`/admin/convocations/:id/edit`) share
// this page; the mode is carried by the route. Zero business logic: every
// branch below reads a boolean the ViewModel computed.
export function BackofficeConvocationFormPage() {
  const { convocationId } = useParams()
  const vm = useConvocationFormViewModel(convocationId ? { mode: 'edit', convocationId } : { mode: 'create' })

  const header = (
    <ConvocationFormHeader
      title={vm.isEdit ? 'Modifier la convocation' : 'Créer une convocation'}
      subtitle={vm.isEdit && vm.editSubtitle ? vm.editSubtitle : undefined}
      backLabel="Retour aux convocations"
      onBack={vm.cancel}
    />
  )

  if (vm.isLoading) {
    return (
      <div className="flex max-w-2xl flex-col gap-4" aria-busy="true">
        {header}
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    )
  }

  if (vm.loadError) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        {header}
        <Alert variant="destructive" role="alert">
          <AlertDescription>{vm.loadError.message}</AlertDescription>
        </Alert>
        <div>
          <Button type="button" variant="outline" onClick={vm.retryLoad} className="h-11 rounded-full">
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  // States reached by a hand-typed URL.
  if (vm.notFound || vm.notEditable) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {header}
        <BackofficeEmptyState
          icon={navItem.icon}
          title={vm.notFound ? 'Convocation introuvable.' : 'Cette convocation n’est plus modifiable.'}
        >
          <Button type="button" variant="outline" onClick={vm.cancel} className="h-11 rounded-full">
            Retour aux convocations
          </Button>
        </BackofficeEmptyState>
      </div>
    )
  }

  return (
    <form
      className="flex max-w-2xl flex-col gap-5 pb-8"
      onSubmit={(event) => {
        event.preventDefault()
        vm.submit()
      }}
      noValidate
    >
      {header}

      {vm.windowClosed && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>Cette convocation n’est plus modifiable : elle est passée ou son statut a changé.</AlertDescription>
        </Alert>
      )}
      {vm.submitError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{vm.submitError}</AlertDescription>
        </Alert>
      )}

      {!vm.isEdit && (
        <>
          <TeamPickerFields vm={vm} />
          <ConvocationTypeToggle vm={vm} />
        </>
      )}

      {vm.values.type === 'training' && <TrainingFields vm={vm} />}
      {vm.values.type === 'match' && <MatchFields vm={vm} />}
      {vm.values.type === 'meeting' && <MeetingFields vm={vm} />}

      <ConvocationFormFooter
        cancelLabel={vm.windowClosed ? 'Retour' : 'Annuler'}
        onCancel={vm.cancel}
        showSubmit={!vm.windowClosed}
        submitDisabled={!vm.canSubmit}
        isSubmitting={vm.isSubmitting}
        submitLabel={vm.isEdit ? 'Enregistrer les modifications' : 'Créer la convocation'}
        submittingLabel={vm.isEdit ? 'Enregistrement…' : 'Création…'}
      />
    </form>
  )
}
