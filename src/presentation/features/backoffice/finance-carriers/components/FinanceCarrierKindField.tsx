import type { CarrierKind } from '@domain/entities/finance'
import { Input } from '@presentation/shared/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@presentation/shared/components/ui/toggle-group'
import { CARRIER_KIND_LABEL } from '../finance-carrier-labels'

const KINDS: CarrierKind[] = ['bank', 'cash']
const LABEL_CLASSNAME = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase'

interface FinanceCarrierKindFieldProps {
  value: CarrierKind | ''
  readOnly: boolean
  disabled: boolean
  onChange: (value: CarrierKind) => void
}

// specs/web-finance-carriers.md UI design, champ 2 (UI-FC-02 default). Create:
// two toggle chips, NOTHING preselected (the choice is final). Edit: a locked
// control showing the value, never an editable choice (PO-FC-01).
export function FinanceCarrierKindField({ value, readOnly, disabled, onChange }: FinanceCarrierKindFieldProps) {
  if (readOnly) {
    return (
      <div className="flex flex-col gap-1.5">
        <span id="finance-carrier-kind-label" className={LABEL_CLASSNAME}>
          Type
        </span>
        <Input
          aria-labelledby="finance-carrier-kind-label"
          aria-describedby="finance-carrier-kind-help"
          value={value === '' ? '' : CARRIER_KIND_LABEL[value]}
          disabled
          readOnly
          className="h-11 rounded-xl"
        />
        <p id="finance-carrier-kind-help" className="text-xs text-muted-foreground">
          Le type est définitif.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id="finance-carrier-kind-label" className={LABEL_CLASSNAME}>
        Type
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        value={value}
        onValueChange={(next) => next && onChange(next as CarrierKind)}
        aria-labelledby="finance-carrier-kind-label"
        aria-describedby="finance-carrier-kind-help"
        disabled={disabled}
        className="w-full"
      >
        {KINDS.map((kind) => (
          <ToggleGroupItem
            key={kind}
            value={kind}
            className="h-11 flex-1 rounded-full data-[state=on]:border-coach-green data-[state=on]:bg-coach-green data-[state=on]:text-white"
          >
            {CARRIER_KIND_LABEL[kind]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p id="finance-carrier-kind-help" className="text-xs text-muted-foreground">
        Le type ne pourra plus être modifié après la création.
      </p>
    </div>
  )
}
