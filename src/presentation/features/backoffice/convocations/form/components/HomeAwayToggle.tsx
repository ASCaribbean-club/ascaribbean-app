import { ToggleGroup, ToggleGroupItem } from '@presentation/shared/components/ui/toggle-group'
import type { ConvocationFormViewModel } from '../useConvocationFormViewModel'
import { FormFieldShell } from './FormFieldShell'

type HomeAwayToggleProps = {
  vm: Pick<ConvocationFormViewModel, 'values' | 'setField' | 'isSubmitting'>
}

// "Lieu de la rencontre" = Domicile / Extérieur, two full-width segments,
// "Domicile" by default. One is always selected.
export function HomeAwayToggle({ vm }: HomeAwayToggleProps) {
  return (
    <FormFieldShell id="convocation-home-away" label="Lieu de la rencontre">
      <ToggleGroup
        id="convocation-home-away"
        type="single"
        variant="outline"
        value={vm.values.isHome ? 'home' : 'away'}
        onValueChange={(value) => value && vm.setField('isHome', value === 'home')}
        disabled={vm.isSubmitting}
        className="w-full"
        spacing={0}
      >
        <ToggleGroupItem value="home" className="h-11 flex-1">
          Domicile
        </ToggleGroupItem>
        <ToggleGroupItem value="away" className="h-11 flex-1">
          Extérieur
        </ToggleGroupItem>
      </ToggleGroup>
    </FormFieldShell>
  )
}
