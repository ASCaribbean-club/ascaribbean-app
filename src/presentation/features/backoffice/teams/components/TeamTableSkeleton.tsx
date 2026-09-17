import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'

const SKELETON_ROW_COUNT = 5
const SKELETON_COLUMN_COUNT = 5 // NOM, SECTION, SAISON, COACH(S), actions

// specs/section-and-teams.md UI design — skeleton rows while the four admin
// reads are in flight, never an empty table flash (AC-ST-23). Jumeau of
// SectionTableSkeleton — no `sticky top-0` on the header, same reasoning.
export function TeamTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Section</TableHead>
          <TableHead>Saison</TableHead>
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
