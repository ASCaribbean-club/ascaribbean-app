import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'

const SKELETON_ROW_COUNT = 4
const SKELETON_COLUMN_COUNT = 7 // Utilisateur, Saison, Licence, Statut, Valide jusqu'au, Cotisation, Actions

// specs/web-memberships.md UI design, "Trois états" — skeleton rows while
// the admin list is in flight, never an empty table (AC-WM-25's "jamais un
// flash de liste vide"), jumeau de NewsTableSkeleton/SeasonTableSkeleton.
export function MembershipTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Utilisateur</TableHead>
          <TableHead>Saison</TableHead>
          <TableHead>Licence</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Valide jusqu&rsquo;au</TableHead>
          <TableHead>Cotisation</TableHead>
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
