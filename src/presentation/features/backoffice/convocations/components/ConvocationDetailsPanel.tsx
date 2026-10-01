import { IconAlertTriangle, IconPencil } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'
import type { ConvocationRowView } from '../convocation-row-view'

interface ConvocationDetailsPanelProps {
  row: ConvocationRowView
  onEdit: () => void
  onOpenAttendance: () => void
}

// specs/web-create-convocation.md UI design "Panneau d'information" (PO-WC-14
// proposal) — read-only, no form control, no nominative response data and no
// health data. The footer buttons are ABSENT when not applicable, never
// greyed (AC-WC-12). Expanding writes nothing (AC-WC-11).
export function ConvocationDetailsPanel({ row, onEdit, onOpenAttendance }: ConvocationDetailsPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        {row.panelFields.map((field) => (
          <div key={field.label} className="min-w-0">
            <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{field.label}</dt>
            <dd className="mt-1 text-sm break-words text-foreground">
              {'items' in field ? (
                field.items.length === 0 ? (
                  <span className="text-muted-foreground">{field.emptyLabel}</span>
                ) : (
                  <ol className="list-inside list-decimal">
                    {field.items.map((item, index) => (
                      // The agenda is an ordered list of free strings with no id.
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ol>
                )
              ) : (
                field.value
              )}
            </dd>
          </div>
        ))}
      </dl>

      {row.attendanceSummary && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Présences</span>
          <div className="flex items-center gap-3">
            {row.attendance.kind === 'pending' && (
              <IconAlertTriangle className="size-4 text-coach-amber" aria-label="Présences non saisies" />
            )}
            {/* Same ✓ / ✗ / ? tally as the coach's match details (RosterList). */}
            <ul className="m-0 flex list-none items-center gap-3 p-0 text-[13px] font-bold">
              <li className="flex items-center gap-1 text-coach-green-text">
                <span aria-hidden>✓</span>
                {row.attendanceSummary.present}
                <span className="sr-only"> présents</span>
              </li>
              <li className="flex items-center gap-1 text-coach-red-text">
                <span aria-hidden>✗</span>
                {row.attendanceSummary.absent}
                <span className="sr-only"> absents</span>
              </li>
              <li className="flex items-center gap-1 text-muted-foreground">
                <span aria-hidden>?</span>
                {row.attendanceSummary.unrecorded}
                <span className="sr-only"> non saisis</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {(row.canEdit || row.attendanceLinkLabel) && (
        <div className="flex justify-end gap-2">
          {row.canEdit && (
            <Button type="button" variant="outline" onClick={onEdit} className="h-11 rounded-full">
              <IconPencil className="size-4" aria-hidden />
              Modifier
            </Button>
          )}
          {row.attendanceLinkLabel && (
            <Button type="button" variant="outline" onClick={onOpenAttendance} className="h-11 rounded-full">
              {row.attendanceLinkLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
