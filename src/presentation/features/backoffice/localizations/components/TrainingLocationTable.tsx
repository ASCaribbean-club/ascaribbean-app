import { IconArchive, IconPencil } from '@tabler/icons-react'
import type { TrainingLocation } from '@domain/entities/training-location'
import { Button } from '@presentation/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import { cn } from '@presentation/shared/lib/utils'
import { TrainingLocationArchivedBadge } from './TrainingLocationArchivedBadge'

interface TrainingLocationTableProps {
  rows: TrainingLocation[]
  canWrite: boolean
  onEdit: (trainingLocation: TrainingLocation) => void
  onArchive: (trainingLocation: TrainingLocation) => void
}

// specs/web-localizations.md UI design "Tableau" — two visible columns
// (NOM / ADRESSE) like the mockup, plus an action column with an sr-only
// header. No sticky header (project convention for admin tables). No delete
// control and no un-archive control, not even disabled (AC-WL-15).
export function TrainingLocationTable({ rows, canWrite, onEdit, onArchive }: TrainingLocationTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Adresse</TableHead>
          {/* sr-only on an inner <span>, not the <th> itself: sr-only sets
              `position: absolute`, which on the <th> would collapse the cell
              out of the table's column layout. */}
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((trainingLocation) => (
          <TableRow key={trainingLocation.id}>
            <TableCell className="font-semibold whitespace-normal">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn(trainingLocation.isArchived && 'opacity-70')}>{trainingLocation.name}</span>
                {trainingLocation.isArchived && <TrainingLocationArchivedBadge />}
              </div>
            </TableCell>
            <TableCell className={cn('text-muted-foreground whitespace-normal', trainingLocation.isArchived && 'opacity-70')}>
              {trainingLocation.address}
            </TableCell>
            <TableCell>
              {/* Rendered only if canWrite — absent otherwise, never
                  disabled. The pencil also shows on an archived row (fixing
                  a typo on a still-referenced venue stays useful);
                  "Archiver" only on a non-archived one, no greyed variant. */}
              {canWrite && (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Modifier le lieu « ${trainingLocation.name} »`}
                    onClick={() => onEdit(trainingLocation)}
                    className="h-11 w-11 rounded-full"
                  >
                    <IconPencil className="size-4" aria-hidden />
                  </Button>
                  {!trainingLocation.isArchived && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Archiver le lieu « ${trainingLocation.name} »`}
                      onClick={() => onArchive(trainingLocation)}
                      className="h-11 w-11 rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <IconArchive className="size-4" aria-hidden />
                    </Button>
                  )}
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
