import { Input } from '@presentation/shared/components/ui/input'
import type { ConvocationFormViewModel } from '../useConvocationFormViewModel'
import { AgendaEditor } from './AgendaEditor'
import { DateTimeFields } from './DateTimeFields'
import { FormFieldShell } from './FormFieldShell'

type MeetingFieldsProps = {
  vm: Pick<
    ConvocationFormViewModel,
    | 'values'
    | 'errors'
    | 'setField'
    | 'isSubmitting'
    | 'minDate'
    | 'agendaDraft'
    | 'setAgendaDraft'
    | 'addAgendaPoint'
    | 'removeAgendaPoint'
  >
}

// Meeting: Titre, Date/Heure, Lieu, Ordre du jour (optional).
export function MeetingFields({ vm }: MeetingFieldsProps) {
  return (
    <>
      <FormFieldShell id="convocation-title" label="Titre" required error={vm.errors.title}>
        <Input
          id="convocation-title"
          value={vm.values.title}
          onChange={(event) => vm.setField('title', event.target.value)}
          disabled={vm.isSubmitting}
          aria-invalid={!!vm.errors.title}
          className="h-11 w-full min-w-0 rounded-xl"
        />
      </FormFieldShell>
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
      <AgendaEditor vm={vm} />
    </>
  )
}
