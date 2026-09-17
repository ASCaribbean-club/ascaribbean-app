import { IconPencil } from '@tabler/icons-react'
import type { Season } from '@domain/entities/season'
import { Button } from '@presentation/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import type { SeasonRow } from '../useBackofficeSeasonsViewModel'
import { SeasonStatusBadge } from './SeasonStatusBadge'

interface SeasonTableProps {
  rows: SeasonRow[]
  canWrite: boolean
  onEdit: (season: Season) => void
}

export function SeasonTable({ rows, canWrite, onEdit }: SeasonTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Libellé</TableHead>
          <TableHead>Début</TableHead>
          <TableHead>Fin</TableHead>
          <TableHead>Statut</TableHead>
          {/* No visible label in the mockup for this column (§0) — sr-only
              text lives on an inner <span>, not the <th> itself: sr-only
              sets `position: absolute`, which on the <th> directly would
              collapse the cell out of the table's column layout and
              misalign every row's last column against this header. */}
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ season, status }) => (
          <TableRow key={season.id}>
            <TableCell className="font-semibold whitespace-normal">{season.label}</TableCell>
            {/* AC-WS-17 — rendered in AAAA-MM-JJ format, deliberately WITHOUT
                routing through toDateInputValue(new Date(...)) the way
                NewsTable does for publishedAt/expiresAt: those are
                timestamptz columns that genuinely need reconstructing into a
                local Date first. season.startDate/endDate back a plain SQL
                `date` column (supabase/migrations/20260811171754_initial_schema.sql)
                with no time component, already serialized by PostgREST as
                exactly "AAAA-MM-JJ" — the same shape toDateInputValue would
                produce. Round-tripping it through `new Date(dateOnlyString)`
                would actually be WRONG here: a date-only ISO string parses
                as UTC midnight per the JS spec, and toDateInputValue reads
                LOCAL Y/M/D back out — for any timezone behind UTC (most of
                the Americas/Caribbean) that silently shows the day before.
                No second date formatter is introduced either: there is
                simply nothing left to format. */}
            <TableCell>{season.startDate}</TableCell>
            <TableCell>{season.endDate}</TableCell>
            <TableCell>
              {/* AC-WS-18 — status is the ALREADY-COMPUTED prop, never
                  re-derived here. */}
              <SeasonStatusBadge status={status} />
            </TableCell>
            <TableCell>
              {/* AC-WS-19/AC-WS-20 — rendered only if canWrite AND the
                  season isn't "ended": absent on a finished row, never
                  disabled/greyed ("une carte disparaît, elle n'apparaît pas
                  désactivée"). Rendered and active on "current"/"upcoming". */}
              {canWrite && status !== 'ended' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Modifier la saison « ${season.label} »`}
                  onClick={() => onEdit(season)}
                  className="h-11 w-11 rounded-full"
                >
                  <IconPencil className="size-4" aria-hidden />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
