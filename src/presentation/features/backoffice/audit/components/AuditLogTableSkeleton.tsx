import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'

const SKELETON_ROW_COUNT = 4
const SKELETON_COLUMN_COUNT = 6 // toggle, Date, Acteur, Action, Cible, Source

// specs/web-audit-logs.md UI design, "Cinq états" — skeleton rows while the
// first page is in flight, never an empty-table flash (AC-AU-18's "un
// chargement en cours n'est jamais rendu comme un journal vide"). Jumeau de
// MembershipTableSkeleton/NewsTableSkeleton/SeasonTableSkeleton. Column
// count updated to 6 by the 2026-09-30 (third addendum) toggle/Source
// columns, so the skeleton doesn't shift width once real rows replace it.
export function AuditLogTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <span className="sr-only">Détails</span>
          </TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Acteur</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Cible</TableHead>
          <TableHead>Source</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
          // Static placeholder rows with no stable id to key by — index is fine here.
          <TableRow key={rowIndex}>
            {Array.from({ length: SKELETON_COLUMN_COUNT }).map((__, columnIndex) => (
              <TableCell key={columnIndex}>
                <Skeleton className="h-4 w-full max-w-32" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
