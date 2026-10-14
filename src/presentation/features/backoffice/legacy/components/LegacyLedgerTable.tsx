import { Fragment } from 'react'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { Badge } from '@presentation/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import { cn } from '@presentation/shared/lib/utils'
import type { LedgerRowView } from '../useLegacyPointsViewModel'
import { LegacyEntryDetail } from './LegacyEntryDetail'

interface LegacyLedgerTableProps {
  rows: LedgerRowView[]
  expandedId: string | null
  onToggle: (id: string) => void
}

const COLUMN_COUNT = 7

// Each row expands (one at a time) to show where its points come from: the
// convocation, or the reason and author of a manual entry.
export function LegacyLedgerTable({ rows, expandedId, onToggle }: LegacyLedgerTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <span className="sr-only">Détail</span>
          </TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Joueur</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Attribution</TableHead>
          <TableHead>Détail</TableHead>
          <TableHead className="text-right">Points</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isExpanded = expandedId === row.id
          const panelId = `legacy-entry-${row.id}`
          return (
            <Fragment key={row.id}>
              <TableRow>
                <TableCell>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    aria-label={isExpanded ? 'Masquer le détail' : 'Afficher le détail'}
                    onClick={() => onToggle(row.id)}
                    className="flex size-9 items-center justify-center rounded-full hover:bg-muted"
                  >
                    {isExpanded ? <IconChevronDown className="size-4" aria-hidden /> : <IconChevronRight className="size-4" aria-hidden />}
                  </button>
                </TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell className="font-semibold whitespace-normal">{row.playerName}</TableCell>
                <TableCell className="whitespace-normal">{row.actionLabel}</TableCell>
                <TableCell>
                  <Badge variant={row.isManual ? 'default' : 'outline'}>{row.attributionLabel}</Badge>
                </TableCell>
                <TableCell className="max-w-64 truncate text-muted-foreground" title={row.detail}>
                  {row.detail}
                </TableCell>
                {/* The sign is part of the text, so the colour never carries it alone. */}
                <TableCell className={cn('text-right font-bold', row.isNegative ? 'text-destructive' : 'text-foreground')}>
                  {row.points}
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow id={panelId} className="bg-muted/40 hover:bg-muted/40">
                  <TableCell colSpan={COLUMN_COUNT} className="px-6 py-4 whitespace-normal">
                    <LegacyEntryDetail row={row} />
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
