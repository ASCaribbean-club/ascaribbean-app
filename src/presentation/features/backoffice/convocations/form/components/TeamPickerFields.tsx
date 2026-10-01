import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import type { ConvocationFormViewModel } from '../useConvocationFormViewModel'
import { FormFieldShell } from './FormFieldShell'

type TeamPickerFieldsProps = {
  vm: Pick<ConvocationFormViewModel, 'values' | 'errors' | 'sections' | 'teamOptions' | 'setField' | 'isSubmitting'>
}

// Creation only. "Équipe" is disabled until a section is chosen: a dependency
// between fields, not a right removed (UI design). Changing the section empties
// the team (done in the ViewModel's setField).
export function TeamPickerFields({ vm }: TeamPickerFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormFieldShell id="convocation-section" label="Section" required error={vm.errors.sectionId}>
        <Select value={vm.values.sectionId} onValueChange={(value) => vm.setField('sectionId', value)} disabled={vm.isSubmitting}>
          <SelectTrigger id="convocation-section" aria-invalid={!!vm.errors.sectionId} className="h-11 w-full min-w-0 rounded-xl">
            <SelectValue placeholder="Choisir une section" />
          </SelectTrigger>
          <SelectContent>
            {vm.sections.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                {section.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormFieldShell>

      <FormFieldShell id="convocation-team" label="Équipe" required error={vm.errors.teamId}>
        <Select
          value={vm.values.teamId}
          onValueChange={(value) => vm.setField('teamId', value)}
          disabled={vm.isSubmitting || !vm.values.sectionId}
        >
          <SelectTrigger id="convocation-team" aria-invalid={!!vm.errors.teamId} className="h-11 w-full min-w-0 rounded-xl">
            <SelectValue placeholder="Choisir une équipe" />
          </SelectTrigger>
          <SelectContent>
            {vm.teamOptions.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormFieldShell>
    </div>
  )
}
