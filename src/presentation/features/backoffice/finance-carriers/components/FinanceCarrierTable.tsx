import { IconArchive, IconArchiveOff, IconPencil } from '@tabler/icons-react'
import type { AdminFinanceCarrier } from '@domain/entities/finance'
import { Button } from '@presentation/shared/components/ui/button'
import { cn } from '@presentation/shared/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import { FinanceCarrierArchivedBadge } from './FinanceCarrierArchivedBadge'
import { FinanceCarrierKindBadge } from './FinanceCarrierKindBadge'

interface FinanceCarrierTableProps {
  rows: AdminFinanceCarrier[]
  canUpdate: boolean
  // canArchive gates BOTH "Archiver" and "Restaurer" (AC-FA-19).
  canArchive: boolean
  onEdit: (carrier: AdminFinanceCarrier) => void
  onArchive: (carrier: AdminFinanceCarrier) => void
  onRestore: (carrier: AdminFinanceCarrier) => void
  // The row whose restoration is in flight: its button is disabled.
  restoringCarrierId: string | null
}

// specs/web-finance-carriers.md UI design "Liste (tableau)". Order comes from
// the read, never re-sorted here (active first, archived after). No sticky
// header (admin table convention). Archived rows stay listed, marked "Archivé"
// in TEXT; an active row carries "Archiver", an archived one "Restaurer", each
// only if canArchive — absent otherwise, never disabled. NO delete control,
// ever (AC-FC-10, AC-FA-19).
export function FinanceCarrierTable({
  rows,
  canUpdate,
  canArchive,
  onEdit,
  onArchive,
  onRestore,
  restoringCarrierId,
}: FinanceCarrierTableProps) {
  const isArchived = (carrier: AdminFinanceCarrier) => carrier.archivedAt !== null
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Libellé</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Détail</TableHead>
          <TableHead>Responsable</TableHead>
          {/* sr-only on an inner <span>, not the <th> itself (see
              TrainingLocationTable). */}
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((carrier) => (
          <TableRow key={carrier.id}>
            <TableCell className="font-semibold whitespace-normal">
              <div className="flex items-center gap-2">
                <span className={cn(isArchived(carrier) && 'opacity-70')}>{carrier.label}</span>
                {isArchived(carrier) && <FinanceCarrierArchivedBadge />}
              </div>
            </TableCell>
            <TableCell>
              <FinanceCarrierKindBadge kind={carrier.kind} />
            </TableCell>
            <TableCell className={cn('text-muted-foreground whitespace-normal', isArchived(carrier) && 'opacity-70')}>
              {carrier.detail ?? '—'}
            </TableCell>
            <TableCell className="whitespace-normal">
              {carrier.managerName ?? <span className="text-muted-foreground">Aucun</span>}
            </TableCell>
            <TableCell>
              {/* Each control is rendered only if its boolean is true — absent
                  otherwise, never disabled. A renamed archived carrier is
                  allowed (PO-FA-11), so the pencil stays on archived rows. */}
              {(canUpdate || canArchive) && (
                <div className="flex items-center justify-end">
                  {canUpdate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Modifier le porteur « ${carrier.label} »`}
                      onClick={() => onEdit(carrier)}
                      className="h-11 w-11 rounded-full"
                    >
                      <IconPencil className="size-4" aria-hidden />
                    </Button>
                  )}
                  {canArchive && !isArchived(carrier) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Archiver le porteur « ${carrier.label} »`}
                      onClick={() => onArchive(carrier)}
                      className="h-11 w-11 rounded-full"
                    >
                      <IconArchive className="size-4" aria-hidden />
                    </Button>
                  )}
                  {canArchive && isArchived(carrier) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Restaurer le porteur « ${carrier.label} »`}
                      disabled={restoringCarrierId === carrier.id}
                      onClick={() => onRestore(carrier)}
                      className="h-11 w-11 rounded-full"
                    >
                      <IconArchiveOff className="size-4" aria-hidden />
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
