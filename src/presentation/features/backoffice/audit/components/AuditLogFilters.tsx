import { useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { AUDIT_ACTIONS, type AuditAction } from '@domain/policies/audit-actions'
import { Badge } from '@presentation/shared/components/ui/badge'
import { Button } from '@presentation/shared/components/ui/button'
import { Checkbox } from '@presentation/shared/components/ui/checkbox'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@presentation/shared/components/ui/popover'
import { auditActionLabel } from '../audit-action-labels'

interface AuditLogFiltersProps {
  fromDate: string
  onFromDateChange: (value: string) => void
  toDate: string
  onToDateChange: (value: string) => void
  selectedActions: AuditAction[]
  onToggleAction: (action: AuditAction) => void
  onSelectAllActions: () => void
  onClearActions: () => void
}

// specs/web-audit-logs.md §2.6/UI design — two independent, optional date
// bounds and a multi-select action filter, all server-side (AC-AU-12): every
// change here flows straight into useBackofficeAuditViewModel's own state,
// which is what actually re-triggers the query. This component holds no
// query/filtering logic of its own.
export function AuditLogFilters({
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  selectedActions,
  onToggleAction,
  onSelectAllActions,
  onClearActions,
}: AuditLogFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* CLAUDE.md §6 — min-w-0 on BOTH date fields, same piège already
            documented on SeasonFormDialog's Début/Fin pair: a native
            <input type="date">'s segmented value carries an intrinsic width
            floor that overlaps its sibling without this guard. */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="audit-log-from-date" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Du
          </Label>
          <Input
            id="audit-log-from-date"
            type="date"
            value={fromDate}
            onChange={(event) => onFromDateChange(event.target.value)}
            className="h-11 w-40 min-w-0 rounded-xl"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="audit-log-to-date" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            au
          </Label>
          <Input
            id="audit-log-to-date"
            type="date"
            value={toDate}
            onChange={(event) => onToDateChange(event.target.value)}
            className="h-11 w-40 min-w-0 rounded-xl"
          />
        </div>

        <AuditActionMultiSelect selectedActions={selectedActions} onToggleAction={onToggleAction} onSelectAll={onSelectAllActions} onClear={onClearActions} />
      </div>

      {/* §2.6 "Aucune sélection = aucun filtre" — badges only render once at
          least one action is checked, and each is individually removable
          without reopening the popover. */}
      {selectedActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedActions.map((action) => (
            <Badge key={action} variant="outline" className="gap-1 border-white/15 bg-white/10 text-white/70">
              {auditActionLabel(action)}
              <button
                type="button"
                aria-label={`Retirer le filtre ${auditActionLabel(action)}`}
                onClick={() => onToggleAction(action)}
                className="ml-0.5 flex size-4 items-center justify-center rounded-full hover:bg-white/20"
              >
                <IconX className="size-3" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

interface AuditActionMultiSelectProps {
  selectedActions: AuditAction[]
  onToggleAction: (action: AuditAction) => void
  onSelectAll: () => void
  onClear: () => void
}

// specs/web-audit-logs.md UI design, "Nouveau composant — sélecteur
// multiple d'actions" — no mockup reference (it shows a single-select),
// modeled on AssignCoachDialog's own bordered checklist (the one
// multi-select precedent already in production in this backoffice) rather
// than inventing a new pattern.
function AuditActionMultiSelect({ selectedActions, onToggleAction, onSelectAll, onClear }: AuditActionMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  const triggerLabel = selectedActions.length === 0 ? 'Toutes les actions' : `${selectedActions.length} action(s)`

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-11 w-fit rounded-xl">
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="flex max-h-64 flex-col overflow-y-auto rounded-xl border border-border">
          {AUDIT_ACTIONS.map((action) => (
            <label key={action} htmlFor={`audit-action-${action}`} className="flex min-h-11 items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
              <Checkbox id={`audit-action-${action}`} checked={selectedActions.includes(action)} onCheckedChange={() => onToggleAction(action)} />
              <span className="text-sm">{auditActionLabel(action)}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between p-1">
          <Button type="button" variant="ghost" className="h-11 rounded-full text-xs" onClick={onSelectAll}>
            Tout sélectionner
          </Button>
          <Button type="button" variant="ghost" className="h-11 rounded-full text-xs" onClick={onClear}>
            Réinitialiser
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
