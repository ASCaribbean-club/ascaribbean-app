import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'

const SKELETON_ROW_COUNT = 4
const SKELETON_COLUMN_COUNT = 5 // NOM, TYPE, ÉQUIPES, COACH(S), action

// specs/section-and-teams.md UI design — skeleton rows while the three
// admin reads are in flight, never an empty table (AC-ST-23's "jamais un
// flash de liste vide"). No `sticky top-0` on the header — unlike
// SeasonTableSkeleton, which is a one-off carried over from an earlier
// pass, not the convention for this backoffice's admin tables.
export function SectionTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Équipes</TableHead>
          <TableHead>Coach(s)</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: SKELETON_COLUMN_COUNT }).map((__, columnIndex) => (
              <TableCell key={columnIndex}>
                <Skeleton className="h-4 w-full max-w-24" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
