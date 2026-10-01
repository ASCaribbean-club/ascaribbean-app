import { Input } from '@presentation/shared/components/ui/input'
import type { ConvocationFormViewModel } from '../useConvocationFormViewModel'
import { FormFieldShell } from './FormFieldShell'

type DateTimeFieldsProps = {
  vm: Pick<ConvocationFormViewModel, 'values' | 'errors' | 'setField' | 'isSubmitting' | 'minDate'>
}

// Date / Heure pair — native inputs, like SeasonFormDialog and AuditLogFilters.
// `min-w-0` on each cell AND each field: a native date input's segmented value
// has an intrinsic width floor that overlaps its neighbour without it, even on
// desktop (CLAUDE.md §6, AC-WC-35). `min` is only an input aid: the use case
// and the database are the authority on past dates.
export function DateTimeFields({ vm }: DateTimeFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormFieldShell id="convocation-date" label="Date" required error={vm.errors.date}>
        <Input
          id="convocation-date"
          type="date"
          min={vm.minDate}
          value={vm.values.date}
          onChange={(event) => vm.setField('date', event.target.value)}
          disabled={vm.isSubmitting}
          aria-invalid={!!vm.errors.date}
          className="h-11 w-full min-w-0 rounded-xl"
        />
      </FormFieldShell>
      <FormFieldShell id="convocation-time" label="Heure" required error={vm.errors.time}>
        <Input
          id="convocation-time"
          type="time"
          value={vm.values.time}
          onChange={(event) => vm.setField('time', event.target.value)}
          disabled={vm.isSubmitting}
          aria-invalid={!!vm.errors.time}
          className="h-11 w-full min-w-0 rounded-xl"
        />
      </FormFieldShell>
    </div>
  )
}
