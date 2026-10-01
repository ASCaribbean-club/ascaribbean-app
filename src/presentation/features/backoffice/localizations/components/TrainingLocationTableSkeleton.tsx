import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'

const SKELETON_ROW_COUNT = 4
const SKELETON_COLUMN_COUNT = 3 // Nom, Adresse, action

// specs/web-localizations.md UI design, "États de l'écran liste" — skeleton
// rows while the list is in flight, never a flash of an empty table. No
// sticky header (project convention for admin tables).
export function TrainingLocationTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Adresse</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
          // Static placeholder rows with no stable id to key by — index is fine here.
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
