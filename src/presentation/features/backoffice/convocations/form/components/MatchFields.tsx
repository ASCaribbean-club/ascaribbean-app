import { Link } from 'react-router-dom'
import { Input } from '@presentation/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import type { ConvocationFormViewModel } from '../useConvocationFormViewModel'
import { DateTimeFields } from './DateTimeFields'
import { FormFieldShell } from './FormFieldShell'
import { HomeAwayToggle } from './HomeAwayToggle'

type MatchFieldsProps = {
  vm: Pick<ConvocationFormViewModel, 'values' | 'errors' | 'setField' | 'isSubmitting' | 'minDate' | 'opponents' | 'hasNoOpponents'>
}

// Match: Adversaire (only the chosen team's opponents), Domicile/Extérieur,
// Date/Heure, Lieu (the field the mockup forgot, AC-WC-15), then the OPTIONAL
// RDV pair (no asterisk). "Lieu" and "RDV — lieu" are two distinct fields.
export function MatchFields({ vm }: MatchFieldsProps) {
  return (
    <>
      <FormFieldShell
        id="convocation-opponent"
        label="Adversaire"
        required
        error={vm.errors.opponentId}
        hint={
          vm.hasNoOpponents && (
            <p className="text-sm text-muted-foreground">
              Aucun adversaire pour cette équipe. Ajoutez-en depuis la page{' '}
              <Link to="/admin/teams" className="underline">
                Équipes
              </Link>
              .
            </p>
          )
        }
      >
        <Select
          value={vm.values.opponentId}
          onValueChange={(value) => vm.setField('opponentId', value)}
          disabled={vm.isSubmitting || vm.opponents.length === 0}
        >
          <SelectTrigger id="convocation-opponent" aria-invalid={!!vm.errors.opponentId} className="h-11 w-full min-w-0 rounded-xl">
            <SelectValue placeholder="Choisir un adversaire" />
          </SelectTrigger>
          <SelectContent>
            {vm.opponents.map((opponent) => (
              <SelectItem key={opponent.id} value={opponent.id}>
                {opponent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormFieldShell>

      <HomeAwayToggle vm={vm} />
      <DateTimeFields vm={vm} />

      <FormFieldShell id="convocation-location" label="Lieu" required error={vm.errors.location}>
        <Input
          id="convocation-location"
          value={vm.values.location}
          onChange={(event) => vm.setField('location', event.target.value)}
          disabled={vm.isSubmitting}
          aria-invalid={!!vm.errors.location}
          className="h-11 w-full min-w-0 rounded-xl"
        />
      </FormFieldShell>

      <div className="grid grid-cols-2 gap-4">
        <FormFieldShell id="convocation-meeting-point-time" label="RDV — heure" error={vm.errors.meetingPointTime}>
          <Input
            id="convocation-meeting-point-time"
            type="time"
            value={vm.values.meetingPointTime}
            onChange={(event) => vm.setField('meetingPointTime', event.target.value)}
            disabled={vm.isSubmitting}
            aria-invalid={!!vm.errors.meetingPointTime}
            className="h-11 w-full min-w-0 rounded-xl"
          />
        </FormFieldShell>
        <FormFieldShell id="convocation-meeting-point-location" label="RDV — lieu">
          <Input
            id="convocation-meeting-point-location"
            placeholder="Ex : Vestiaires"
            value={vm.values.meetingPointLocation}
            onChange={(event) => vm.setField('meetingPointLocation', event.target.value)}
            disabled={vm.isSubmitting}
            className="h-11 w-full min-w-0 rounded-xl"
          />
        </FormFieldShell>
      </div>
    </>
  )
}
