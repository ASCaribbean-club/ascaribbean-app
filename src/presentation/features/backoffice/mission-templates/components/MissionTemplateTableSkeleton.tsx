import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'

const SKELETON_ROW_COUNT = 4
const SKELETON_COLUMN_COUNT = 3

// specs/web-mission-templates.md "États de la page" — skeleton rows while
// loading, never a flash of the empty state.
export function MissionTemplateTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mission</TableHead>
          <TableHead>Capacité</TableHead>
          <TableHead>Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
          // Static placeholder rows with no stable id — index is fine here.
          <TableRow key={rowIndex}>
            {Array.from({ length: SKELETON_COLUMN_COUNT }).map((__, columnIndex) => (
              <TableCell key={columnIndex}>
                <Skeleton className="h-4 w-full max-w-40" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
