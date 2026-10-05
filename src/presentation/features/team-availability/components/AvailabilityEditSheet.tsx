import { Button } from '@presentation/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@presentation/shared/components/ui/dialog'
import { Input } from '@presentation/shared/components/ui/input'
import { DateTimeInput } from '@presentation/features/convocation/components/DateTimeInput'
import { FIELD_CLASSNAME, FIELD_ROW_CLASSNAME } from '@presentation/features/convocation/components/field-style'
import { FormField } from '@presentation/features/convocation/components/FormField'
import { useAvailabilityEditViewModel } from '../useAvailabilityEditViewModel'
import { useUnavailabilityFormViewModel } from '../useUnavailabilityFormViewModel'

interface AvailabilityEditSheetProps {
  teamId: string
  playerId: string
  playerName: string
  onClose: () => void
}

// Bottom sheet built on the shadcn Dialog (no Sheet primitive vendored yet),
// anchored to the bottom edge. Page > Sheet > Form: the sheet only loads, the
// form owns its fields (mounted after the load so its state is seeded once).
export function AvailabilityEditSheet({ teamId, playerId, playerName, onClose }: AvailabilityEditSheetProps) {
  const vm = useAvailabilityEditViewModel(teamId, playerId)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="top-auto bottom-0 left-0 max-h-[90vh] max-w-full translate-x-0 translate-y-0 overflow-y-auto rounded-t-3xl rounded-b-none border-0 bg-coach-bg p-5.5 pb-8 text-white sm:max-w-full"
      >
        <DialogHeader>
          <DialogTitle className="text-[17px] font-bold">{playerName}</DialogTitle>
          <DialogDescription className="text-white/60">Disponibilité du joueur</DialogDescription>
        </DialogHeader>

        {vm.isLoading ? (
          <p className="py-6 text-center text-[14px] text-white/60">Chargement…</p>
        ) : vm.hasError ? (
          <div role="alert" className="flex flex-col items-center gap-4 py-6 text-center">
            <p className="text-[14px] font-semibold text-white/70">Impossible de charger la situation du joueur.</p>
            <Button type="button" variant="outline" onClick={vm.refetch} className="h-11 rounded-full border-white/15 bg-transparent px-6 text-white">
              Réessayer
            </Button>
          </div>
        ) : (
          <UnavailabilityForm teamId={teamId} playerId={playerId} kinds={vm.kinds} active={vm.active} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

const KIND_LABEL = { medical: 'Malade / Blessé', suspension: 'Suspendu' } as const

function UnavailabilityForm(props: Parameters<typeof useUnavailabilityFormViewModel>[0]) {
  const vm = useUnavailabilityFormViewModel(props)
  const isSuspension = vm.kind === 'suspension'

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (vm.canSubmit) vm.submit()
      }}
    >
      {vm.kinds.length > 1 && (
        <div role="tablist" aria-label="Type d’indisponibilité" className="grid grid-cols-2 gap-2">
          {vm.kinds.map((kind) => (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={vm.kind === kind}
              onClick={() => vm.setKind(kind)}
              className={`h-11 rounded-full border text-[13.5px] font-bold ${
                vm.kind === kind ? 'border-white/40 bg-white/15 text-white' : 'border-white/12 bg-transparent text-white/60'
              }`}
            >
              {KIND_LABEL[kind]}
            </button>
          ))}
        </div>
      )}

      <div className={FIELD_ROW_CLASSNAME}>
        <FormField label="Depuis le" htmlFor="startsOn">
          <DateTimeInput id="startsOn" type="date" value={vm.values.startsOn} onChange={vm.setStartsOn} />
        </FormField>
        <FormField label={isSuspension ? 'Levée le (optionnel)' : 'Retour le (optionnel)'} htmlFor="endsOn">
          <DateTimeInput id="endsOn" type="date" value={vm.values.endsOn} onChange={vm.setEndsOn} />
        </FormField>
      </div>

      {isSuspension && (
        <>
          <FormField label="Matchs de suspension" htmlFor="matchCount">
            <Input
              id="matchCount"
              type="number"
              inputMode="numeric"
              min={0}
              value={vm.values.matchCount}
              onChange={(event) => vm.setMatchCount(event.target.value)}
              className={FIELD_CLASSNAME}
            />
          </FormField>
          <FormField label="Motif (optionnel)" htmlFor="reason">
            <Input id="reason" value={vm.values.reason} onChange={(event) => vm.setReason(event.target.value)} className={FIELD_CLASSNAME} />
          </FormField>
        </>
      )}

      {vm.errorMessage && (
        <p role="alert" className="text-[13px] font-semibold text-coach-red-text">
          {vm.errorMessage}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        <Button type="submit" disabled={!vm.canSubmit} className="h-11 rounded-full">
          {vm.isEditing ? 'Enregistrer' : 'Déclarer'}
        </Button>
        {vm.canLift && (
          <Button type="button" variant="outline" onClick={vm.lift} className="h-11 rounded-full border-white/15 bg-transparent text-white">
            Marquer disponible
          </Button>
        )}
      </div>
    </form>
  )
}
