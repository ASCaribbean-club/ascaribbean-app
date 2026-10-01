import { IconAlertTriangle } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'
import type { ConvocationAttendanceView } from '../convocation-row-view'

interface ConvocationAttendanceCellProps {
  attendance: ConvocationAttendanceView
  linkLabel: string | null
  onOpen: () => void
}

// `PRÉSENCES` column (AC-WC-08) — counts of AttendanceRecord, never of
// ConvocationResponse. Its buttons stop click propagation so they don't also
// expand the row.
export function ConvocationAttendanceCell({ attendance, linkLabel, onOpen }: ConvocationAttendanceCellProps) {
  if (attendance.kind === 'none') return <span className="text-muted-foreground">—</span>

  const open = (event: React.MouseEvent) => {
    event.stopPropagation()
    onOpen()
  }

  if (attendance.kind === 'pending') {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={open}
        className="h-8 rounded-full border-coach-amber/60 bg-coach-amber/15 px-3 text-xs text-coach-amber hover:bg-coach-amber/20 hover:text-coach-amber"
      >
        <IconAlertTriangle className="size-3.5" aria-hidden />
        Présences non saisies
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-sm">
        {attendance.present} présents · {attendance.absent} absents · {attendance.unrecorded} non saisis
      </span>
      {linkLabel && (
        <Button type="button" variant="link" onClick={open} className="h-11 px-0 text-coach-green-link">
          {linkLabel}
        </Button>
      )}
    </div>
  )
}
