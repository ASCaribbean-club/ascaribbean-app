import { IconPencil } from '@tabler/icons-react'
import type { MissionTemplate } from '@domain/entities/mission-template'
import { Button } from '@presentation/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import { cn } from '@presentation/shared/lib/utils'
import { formatMissionCapacity, missionDescriptionToShow } from '../mission-template-view'

interface MissionTemplateTableProps {
  rows: MissionTemplate[]
  canManage: boolean
  pendingToggleId: string | null
  onEdit: (missionTemplate: MissionTemplate) => void
  onToggleActive: (missionTemplate: MissionTemplate) => void
}

// specs/web-mission-templates.md UI design "Tableau" — MISSION / CAPACITÉ /
// STATUT plus an action column (sr-only header, only if canManage). No sticky
// header. NO delete control, not even disabled (AC-MT-16). The status is
// carried by text; the dimming of an inactive row is only reinforcement.
export function MissionTemplateTable({ rows, canManage, pendingToggleId, onEdit, onToggleActive }: MissionTemplateTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mission</TableHead>
          <TableHead>Capacité</TableHead>
          <TableHead>Statut</TableHead>
          {canManage && (
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isPending = pendingToggleId === row.id
          return (
            <TableRow key={row.id}>
              <TableCell className={cn('whitespace-normal', !row.isActive && 'text-white/40')}>
                <span className="font-semibold">{row.label}</span>
                {/* Second line only when a description exists. */}
                {missionDescriptionToShow(row.description) && (
                  <p className="mt-0.5 text-sm font-normal text-muted-foreground">{missionDescriptionToShow(row.description)}</p>
                )}
              </TableCell>
              <TableCell className={cn('text-muted-foreground', !row.isActive && 'text-white/40')}>
                {formatMissionCapacity(row.defaultCapacity)}
              </TableCell>
              <TableCell className={cn('font-semibold', row.isActive ? 'text-coach-green' : 'text-muted-foreground')}>
                {row.isActive ? 'Actif' : 'Inactif'}
              </TableCell>
              {canManage && (
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {row.isActive ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        aria-label={`Désactiver la mission « ${row.label} »`}
                        onClick={() => onToggleActive(row)}
                        className="h-11 rounded-full"
                      >
                        {isPending ? 'Désactivation…' : 'Désactiver'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={isPending}
                        aria-label={`Réactiver la mission « ${row.label} »`}
                        onClick={() => onToggleActive(row)}
                        className="h-11 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green"
                      >
                        {isPending ? 'Réactivation…' : 'Réactiver'}
                      </Button>
                    )}
                    {/* PO-MT-11 default: editing an inactive row is allowed. */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Modifier la mission « ${row.label} »`}
                      onClick={() => onEdit(row)}
                      className="h-11 w-11 rounded-full"
                    >
                      <IconPencil className="size-4" aria-hidden />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
