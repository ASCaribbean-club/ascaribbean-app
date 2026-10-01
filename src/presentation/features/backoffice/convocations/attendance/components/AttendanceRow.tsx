import type { ActualStatus } from '@domain/entities/convocation'
import { InitialsAvatar } from '@presentation/shared/components/InitialsAvatar'
import { AttendanceChoiceToggle } from './AttendanceChoiceToggle'

interface AttendanceRowProps {
  displayName: string
  status: ActualStatus | null
  disabled: boolean
  onChange: (status: ActualStatus) => void
}

// The "Non saisi" state is also written, never conveyed by color alone.
export function AttendanceRow({ displayName, status, disabled, onChange }: AttendanceRowProps) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <InitialsAvatar name={displayName} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{displayName}</span>
          {status === null && <span className="text-xs text-muted-foreground">Non saisi</span>}
        </div>
      </div>
      <AttendanceChoiceToggle name={displayName} status={status} disabled={disabled} onChange={onChange} />
    </li>
  )
}
