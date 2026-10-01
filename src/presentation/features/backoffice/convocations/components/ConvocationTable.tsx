import { Fragment } from 'react'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import type { ConvocationRowView } from '../convocation-row-view'
import { ConvocationAttendanceCell } from './ConvocationAttendanceCell'
import { ConvocationDetailsPanel } from './ConvocationDetailsPanel'
import { ConvocationStatusBadge } from './ConvocationStatusBadge'
import { ConvocationTypeMarker } from './ConvocationTypeMarker'

const COLUMN_COUNT = 6 // chevron, CONVOCATION, DATE & HEURE, LIEU, STATUT, PRÉSENCES

interface ConvocationTableProps {
  rows: ConvocationRowView[]
  expandedIds: ReadonlySet<string>
  onToggleExpanded: (id: string) => void
  onEdit: (id: string) => void
  onOpenAttendance: (id: string) => void
}

// specs/web-create-convocation.md UI design "Tableau" — expandable-row pattern
// of AuditLogTable: the chevron button is the accessible control
// (`aria-expanded`, keyboard), clicking elsewhere on the row expands too (mouse
// comfort). No sticky header (project memory); the Table primitive scrolls
// horizontally in its own container.
export function ConvocationTable({ rows, expandedIds, onToggleExpanded, onEdit, onOpenAttendance }: ConvocationTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <span className="sr-only">Détails</span>
          </TableHead>
          <TableHead>Convocation</TableHead>
          <TableHead>Date &amp; heure</TableHead>
          <TableHead>Lieu</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Présences</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isExpanded = expandedIds.has(row.id)
          return (
            <Fragment key={row.id}>
              <TableRow aria-expanded={isExpanded} className="cursor-pointer" onClick={() => onToggleExpanded(row.id)}>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Masquer les détails' : 'Afficher les détails'}
                    onClick={(event) => {
                      event.stopPropagation()
                      onToggleExpanded(row.id)
                    }}
                    className="h-11 w-11 rounded-full"
                  >
                    {isExpanded ? <IconChevronDown className="size-4" aria-hidden /> : <IconChevronRight className="size-4" aria-hidden />}
                  </Button>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <ConvocationTypeMarker teamName={row.teamName} type={row.type} typeLabel={row.typeLabel} />
                </TableCell>
                <TableCell className="whitespace-nowrap">{row.dateTimeLabel}</TableCell>
                <TableCell className="whitespace-normal">{row.locationLabel}</TableCell>
                <TableCell>
                  <ConvocationStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="whitespace-normal">
                  <ConvocationAttendanceCell
                    attendance={row.attendance}
                    linkLabel={row.attendanceLinkLabel}
                    onOpen={() => onOpenAttendance(row.id)}
                  />
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={COLUMN_COUNT} className="whitespace-normal bg-muted/30 p-4">
                    <ConvocationDetailsPanel row={row} onEdit={() => onEdit(row.id)} onOpenAttendance={() => onOpenAttendance(row.id)} />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
