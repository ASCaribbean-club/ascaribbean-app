import type { ConvocationType } from '@domain/entities/convocation'
import { ToggleGroup, ToggleGroupItem } from '@presentation/shared/components/ui/toggle-group'
import { formatConvocationType } from '@presentation/shared/formatters/convocation-labels'
import { CONVOCATION_TYPE_ACCENT } from '@presentation/shared/formatters/convocation-type-accent'
import { cn } from '@presentation/shared/lib/utils'
import type { ConvocationFormViewModel } from '../useConvocationFormViewModel'

const TYPES: ConvocationType[] = ['training', 'match', 'meeting']

// Selected state fills the pastille with the type's own colour.
const SELECTED_CLASSNAME: Record<ConvocationType, string> = {
  training: 'data-[state=on]:border-coach-green data-[state=on]:bg-coach-green data-[state=on]:text-white',
  match: 'data-[state=on]:border-coach-red data-[state=on]:bg-coach-red data-[state=on]:text-white',
  meeting: 'data-[state=on]:border-coach-amber data-[state=on]:bg-coach-amber data-[state=on]:text-white',
}

type ConvocationTypeToggleProps = {
  vm: Pick<ConvocationFormViewModel, 'values' | 'setType' | 'isSubmitting'>
}

// Creation only — the type is the convocation's identity and is never an
// editable field afterwards. Always one selected ("Entraînement" by default),
// so a re-click on the active pastille (Radix reports '') is ignored.
export function ConvocationTypeToggle({ vm }: ConvocationTypeToggleProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span id="convocation-type-label" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Type
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        value={vm.values.type}
        onValueChange={(value) => value && vm.setType(value as ConvocationType)}
        aria-labelledby="convocation-type-label"
        disabled={vm.isSubmitting}
        className="w-full"
      >
        {TYPES.map((type) => (
          <ToggleGroupItem key={type} value={type} className={cn('h-11 flex-1 rounded-full', SELECTED_CLASSNAME[type])}>
            <span className={cn('size-2 rounded-full', CONVOCATION_TYPE_ACCENT[type].rail)} aria-hidden />
            {formatConvocationType(type)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
