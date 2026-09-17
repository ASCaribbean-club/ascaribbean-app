import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'

const SKELETON_ROW_COUNT = 4
const SKELETON_COLUMN_COUNT = 7 // Titre, Contenu, Date, Expiration, Lien, Statut, action

// specs/web-actus.md UI design, "États de l'écran liste" — skeleton rows
// while listAll() is in flight, never an empty table (which would read as
// "no news" for a split second, AC-WA-20's "jamais un flash de liste
// vide").
export function NewsTableSkeleton() {
  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow>
          <TableHead>Titre</TableHead>
          <TableHead>Contenu</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Expiration</TableHead>
          <TableHead>Lien</TableHead>
          <TableHead>Statut</TableHead>
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
                <Skeleton className="h-4 w-full max-w-24" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
