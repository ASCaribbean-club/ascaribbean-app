import type { Handedness } from '@domain/entities/user'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'

interface UserProfileFieldsProps {
  idPrefix: string
  age: string
  onAgeChange: (value: string) => void
  handedness: Handedness | ''
  onHandednessChange: (value: Handedness | '') => void
  disabled: boolean
}

const LABEL_CLASSNAME = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase'

// Radix Select rejects an empty-string item value, so "not set" gets its own
// sentinel, translated back to '' at the boundary below.
const NOT_SET = 'none'

// ÂGE / MAIN — shared by InviteUserDialog and UserEditDialog, both admin-only
// screens. `min-w-0` on each grid item: CLAUDE.md §6, side-by-side fields.
export function UserProfileFields({ idPrefix, age, onAgeChange, handedness, onHandednessChange, disabled }: UserProfileFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-age`} className={LABEL_CLASSNAME}>
          Âge
        </Label>
        <Input
          id={`${idPrefix}-age`}
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          step={1}
          disabled={disabled}
          value={age}
          onChange={(event) => onAgeChange(event.target.value)}
          className="h-11 rounded-xl"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-handedness`} className={LABEL_CLASSNAME}>
          Main
        </Label>
        <Select
          value={handedness || NOT_SET}
          onValueChange={(value) => onHandednessChange(value === NOT_SET ? '' : (value as Handedness))}
          disabled={disabled}
        >
          <SelectTrigger id={`${idPrefix}-handedness`} className="h-11 w-full rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NOT_SET}>Non renseigné</SelectItem>
            <SelectItem value="right">Droitier</SelectItem>
            <SelectItem value="left">Gaucher</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
