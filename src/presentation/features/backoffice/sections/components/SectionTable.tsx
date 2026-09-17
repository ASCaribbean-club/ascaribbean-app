import { IconPencil } from '@tabler/icons-react'
import type { Section } from '@domain/entities/section'
import { CoachListCell } from '@presentation/features/backoffice/components/CoachListCell'
import { Button } from '@presentation/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import type { SectionAdminRow } from '../useBackofficeSectionsViewModel'
import { SECTION_TYPE_LABELS } from '../section-type-options'

interface SectionTableProps {
  rows: SectionAdminRow[]
  canWriteSections: boolean
  onEdit: (section: Section) => void
}

// specs/section-and-teams.md UI design, "Écran « Sections »" — four
// columns (NOM, TYPE, ÉQUIPES, COACH(S)) plus a pencil-only action column,
// same patron as SeasonTable. No "+ Coach" button anywhere on this table
// (AC-ST-45 — assignment always starts from a team row, never a section
// row).
export function SectionTable({ rows, canWriteSections, onEdit }: SectionTableProps) {
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
        {rows.map(({ section, teamCount, coaches }) => (
          <TableRow key={section.id}>
            <TableCell className="font-semibold whitespace-normal">{section.name}</TableCell>
            <TableCell>{SECTION_TYPE_LABELS[section.type]}</TableCell>
            {/* §2.3/AC-ST-18 — derived count, plain text, never a badge or a
                color. */}
            <TableCell>{teamCount}</TableCell>
            <TableCell>
              <CoachListCell coaches={coaches} />
            </TableCell>
            <TableCell>
              {canWriteSections && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Modifier la section « ${section.name} »`}
                  onClick={() => onEdit(section)}
                  className="h-11 w-11 rounded-full"
                >
                  <IconPencil className="size-4" aria-hidden />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
