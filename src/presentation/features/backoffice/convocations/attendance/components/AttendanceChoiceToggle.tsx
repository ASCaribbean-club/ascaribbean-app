import type { ActualStatus } from '@domain/entities/convocation'
import { ToggleGroup, ToggleGroupItem } from '@presentation/shared/components/ui/toggle-group'

interface AttendanceChoiceToggleProps {
  name: string
  status: ActualStatus | null
  disabled: boolean
  onChange: (status: ActualStatus) => void
}

// Présent / Absent, single choice. A chosen value can be switched but never
// cleared (Radix reports '' on re-click, ignored): no deletion of a presence.
export function AttendanceChoiceToggle({ name, status, disabled, onChange }: AttendanceChoiceToggleProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={status ?? ''}
      onValueChange={(value) => value && onChange(value as ActualStatus)}
      disabled={disabled}
      aria-label={`Présence de ${name}`}
    >
      <ToggleGroupItem
        value="present"
        className="h-11 rounded-full px-4 data-[state=on]:border-coach-green data-[state=on]:bg-coach-green data-[state=on]:text-white"
      >
        Présent
      </ToggleGroupItem>
      <ToggleGroupItem
        value="absent"
        className="h-11 rounded-full px-4 data-[state=on]:border-coach-red data-[state=on]:bg-coach-red data-[state=on]:text-white"
      >
        Absent
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
