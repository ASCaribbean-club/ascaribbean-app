import { IconTrophy } from '@tabler/icons-react'
import { ToggleGroup, ToggleGroupItem } from '@presentation/shared/components/ui/toggle-group'
import type { ConvocationFormViewModel } from '../useConvocationFormViewModel'
import { FormFieldShell } from './FormFieldShell'

type CompetitionToggleProps = {
  vm: Pick<ConvocationFormViewModel, 'values' | 'errors' | 'setField' | 'isSubmitting'>
}

// specs/convocation-player-selection.md AC-CPS-05 — "Compétition", Officiel /
// Amical, NO preselected value (the database has no default either). Creation
// only: the type is not editable afterwards (PO-CPS-05). The trophy never
// replaces the label.
export function CompetitionToggle({ vm }: CompetitionToggleProps) {
  return (
    <FormFieldShell id="convocation-competition" label="Compétition" required error={vm.errors.competitionType}>
      <ToggleGroup
        id="convocation-competition"
        type="single"
        variant="outline"
        value={vm.values.competitionType}
        onValueChange={(value) => vm.setField('competitionType', value === 'official' || value === 'friendly' ? value : '')}
        disabled={vm.isSubmitting}
        className="w-full"
        spacing={0}
        aria-label="Compétition"
      >
        <ToggleGroupItem value="official" className="h-11 flex-1 gap-1.5">
          <IconTrophy aria-hidden className="size-4" />
          Officiel
        </ToggleGroupItem>
        <ToggleGroupItem value="friendly" className="h-11 flex-1">
          Amical
        </ToggleGroupItem>
      </ToggleGroup>
    </FormFieldShell>
  )
}
