import { Link } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import type { ConvocationFormViewModel } from '../useConvocationFormViewModel'
import { DateTimeFields } from './DateTimeFields'
import { FormFieldShell } from './FormFieldShell'

type TrainingFieldsProps = {
  vm: Pick<
    ConvocationFormViewModel,
    | 'values'
    | 'errors'
    | 'setField'
    | 'isSubmitting'
    | 'minDate'
    | 'trainingLocations'
    | 'hasNoTrainingLocations'
    | 'archivedCurrentLocation'
  >
}

// Training: Date/Heure then "Lieu d'entraînement" (non-archived venues only,
// AC-WC-15). When editing a training whose venue was archived since, the venue
// stays selected (disabled option) and is explained by a help line.
export function TrainingFields({ vm }: TrainingFieldsProps) {
  const archived = vm.archivedCurrentLocation

  return (
    <>
      <DateTimeFields vm={vm} />
      <FormFieldShell
        id="convocation-training-location"
        label="Lieu d’entraînement"
        required
        error={vm.errors.trainingLocationId}
        hint={
          <>
            {archived && <p className="text-sm text-muted-foreground">Lieu actuel : {archived.name} (archivé)</p>}
            {vm.hasNoTrainingLocations && (
              <p className="text-sm text-muted-foreground">
                Aucun lieu disponible. Créez-en un dans{' '}
                <Link to="/admin/locations" className="underline">
                  Lieux
                </Link>
                .
              </p>
            )}
          </>
        }
      >
        <Select
          value={vm.values.trainingLocationId}
          onValueChange={(value) => vm.setField('trainingLocationId', value)}
          disabled={vm.isSubmitting}
        >
          <SelectTrigger
            id="convocation-training-location"
            aria-invalid={!!vm.errors.trainingLocationId}
            className="h-11 w-full min-w-0 rounded-xl"
          >
            <SelectValue placeholder="Choisir un lieu" />
          </SelectTrigger>
          <SelectContent>
            {archived && (
              <SelectItem value={archived.id} disabled>
                {archived.name} (archivé)
              </SelectItem>
            )}
            {vm.trainingLocations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormFieldShell>
    </>
  )
}
