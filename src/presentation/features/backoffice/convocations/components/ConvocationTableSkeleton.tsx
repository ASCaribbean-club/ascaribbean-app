import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'

const SKELETON_ROW_COUNT = 5
const SKELETON_COLUMN_COUNT = 6

// AC-WC-10 — five skeleton rows while the first page is in flight; a load is
// never rendered as an empty list. `aria-busy` marks the region as loading.
export function ConvocationTableSkeleton() {
  return (
    <div aria-busy="true">
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
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
            // Static placeholder rows, no stable id — index is fine here.
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
    </div>
  )
}
