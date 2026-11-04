import { TRAINING_RECURRENCE_FREQUENCIES, type TrainingRecurrenceFrequency } from '@domain/policies/training-recurrence'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { Switch } from '@presentation/shared/components/ui/switch'
import { REPEAT_FREQUENCY_LABELS } from '../repeat-frequency-labels'
import type { ConvocationFormViewModel } from '../useConvocationFormViewModel'
import { FormFieldShell } from './FormFieldShell'

type RepeatFieldsProps = {
  vm: Pick<
    ConvocationFormViewModel,
    'values' | 'errors' | 'setField' | 'isSubmitting' | 'isRepeating' | 'repeatMinDate' | 'repeatMaxDate' | 'repeatCount'
  >
}

// Training creation only: "Répéter cet entraînement" creates the training and
// its repetitions at once, up to 3 months after the first one. The frequency
// is a Select (not a toggle row): three labels don't fit side by side on a
// narrow screen. The list of trainings is shown in the recap before anything
// is created.
export function RepeatFields({ vm }: RepeatFieldsProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Label htmlFor="convocation-repeat" className="text-sm font-medium text-foreground">
          Répéter cet entraînement
        </Label>
        <Switch
          id="convocation-repeat"
          checked={vm.values.repeat}
          onCheckedChange={(checked) => vm.setField('repeat', checked)}
          disabled={vm.isSubmitting}
        />
      </div>

      {vm.isRepeating && (
        <div className="grid grid-cols-2 gap-4">
          <FormFieldShell id="convocation-repeat-frequency" label="Fréquence">
            <Select
              value={vm.values.repeatFrequency}
              onValueChange={(value) => vm.setField('repeatFrequency', value as TrainingRecurrenceFrequency)}
              disabled={vm.isSubmitting}
            >
              <SelectTrigger id="convocation-repeat-frequency" className="h-11 w-full min-w-0 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRAINING_RECURRENCE_FREQUENCIES.map((frequency) => (
                  <SelectItem key={frequency} value={frequency}>
                    {REPEAT_FREQUENCY_LABELS[frequency]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormFieldShell>
          <FormFieldShell id="convocation-repeat-until" label="Jusqu’au" required error={vm.errors.repeatUntil}>
            <Input
              id="convocation-repeat-until"
              type="date"
              min={vm.repeatMinDate}
              max={vm.repeatMaxDate}
              value={vm.values.repeatUntil}
              onChange={(event) => vm.setField('repeatUntil', event.target.value)}
              disabled={vm.isSubmitting}
              aria-invalid={!!vm.errors.repeatUntil}
              className="h-11 w-full min-w-0 rounded-xl"
            />
          </FormFieldShell>
        </div>
      )}

      {vm.isRepeating && (
        <p className="text-xs text-muted-foreground">
          {vm.repeatCount > 0
            ? `${vm.repeatCount} entraînements seront créés (le premier inclus).`
            : 'Au plus 3 mois après le premier entraînement.'}
        </p>
      )}
    </div>
  )
}
