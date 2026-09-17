import { IconPencil } from '@tabler/icons-react'
import type { Team } from '@domain/entities/team'
import { CoachListCell } from '@presentation/features/backoffice/components/CoachListCell'
import { SeasonStatusBadge } from '@presentation/features/backoffice/seasons/components/SeasonStatusBadge'
import { Button } from '@presentation/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import type { TeamAdminRow } from '../useBackofficeTeamsViewModel'

interface TeamTableProps {
  rows: TeamAdminRow[]
  canWriteTeams: boolean
  canAssignCoach: boolean
  onEdit: (team: Team) => void
  onAssignCoach: (team: Team) => void
}

// specs/section-and-teams.md UI design, "Écran « Équipes »" — four columns
// (NOM, SECTION, SAISON, COACH(S)) plus two action buttons per row: "+
// Coach" (AC-ST-45, rendered on EVERY row, including ones that already show
// a coach — never conditioned on the absence of one) and the edit pencil.
export function TeamTable({ rows, canWriteTeams, canAssignCoach, onEdit, onAssignCoach }: TeamTableProps) {
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
        {rows.map(({ team, sectionName, season, seasonStatus, coaches }) => (
          <TableRow key={team.id}>
            <TableCell className="font-semibold whitespace-normal">{team.name}</TableCell>
            {/* AC-ST-17 — the section's NAME, never sections.id. */}
            <TableCell>{sectionName}</TableCell>
            <TableCell>
              {/* PO-ST-08 (resolved by reuse) — the season's own label
                  followed by the already-computed 3-state badge; never a new
                  color re-derived from scratch here (AC-ST-19). */}
              <span className="mr-2">{season?.label ?? '—'}</span>
              <SeasonStatusBadge status={seasonStatus} />
            </TableCell>
            <TableCell>
              <CoachListCell coaches={coaches} />
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                {canAssignCoach && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onAssignCoach(team)}
                    className="h-11 rounded-full"
                  >
                    + Coach
                  </Button>
                )}
                {canWriteTeams && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Modifier l'équipe « ${team.name} »`}
                    onClick={() => onEdit(team)}
                    className="h-11 w-11 rounded-full"
                  >
                    <IconPencil className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
