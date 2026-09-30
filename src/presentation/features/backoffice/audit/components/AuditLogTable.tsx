import { Fragment, useState } from 'react'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import type { AuditLogEntry } from '@domain/entities/audit-log-entry'
import { isAuditAction } from '@domain/policies/audit-actions'
import { Button } from '@presentation/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import { AUDIT_ACTION_LABELS } from '../audit-action-labels'
import { formatAuditDate } from '../format-audit-date'
import { AuditSourceBadge } from './AuditSourceBadge'

const TARGET_ID_PREVIEW_LENGTH = 8
const COLUMN_COUNT = 6 // toggle, Date, Acteur, Action, Cible, Source

// specs/web-audit-logs.md UI design, "Tableau à quatre colonnes", amended by
// the 2026-09-30 (third addendum) mockup — now SIX columns:
// toggle/DATE/ACTEUR/ACTION/CIBLE/SOURCE, in this order.
//
// `metadata` is now fetched AND rendered, superseding the original AC-AU-15
// "metadata n'est pas affichée" — see the addendum for why this is safe
// (never health/medical content). Each row is expandable via a chevron
// toggle, shown when `metadata` isn't an empty object OR the row has a
// `targetId` (the Cible cell always truncates it — the expanded panel is
// also where the FULL id lives, merged into the same JSON block ahead of
// `metadata`'s own keys). Collapsed by default, local UI state only (no
// ViewModel change — this isn't business logic).
//
// `target_id` is still never resolved to a NAME — but it IS now prefixed by
// `target_type` when known (`targetType · shortId`, resolves PO-AU-02),
// falling back to the id-only rendering for pre-existing rows written
// before this column existed (`targetType` null).
//
// The table's own horizontal scroll comes from the `Table` primitive itself
// (presentation/shared/components/ui/table.tsx, `overflow-x-auto` on its
// container) — never the whole page. No `sticky top-0` header here on
// purpose (project memory: SeasonTable is the one outlier, not the model).
export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {/* No visible label for the toggle column — sr-only text lives on
              an inner <span>, not the <th> itself (same reasoning as
              NewsTable/SeasonTable/MembershipTable: sr-only on the <th>
              directly would collapse the cell out of the table's column
              layout). */}
          <TableHead>
            <span className="sr-only">Détails</span>
          </TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Acteur</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Cible</TableHead>
          <TableHead>Source</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          // The Cible cell always truncates target_id (TARGET_ID_PREVIEW_LENGTH)
          // — a row with a target but empty metadata (e.g. membership.archived,
          // password_reset.issued, user.updated) still needs an expand
          // affordance so the FULL id is reachable, not just the JSON. A row
          // with neither gets no toggle at all, same "no complementary data"
          // case as before.
          const hasMetadata = Object.keys(entry.metadata).length > 0
          const hasTarget = entry.targetId !== null
          const isExpandable = hasMetadata || hasTarget
          const isExpanded = isExpandable && expandedIds.has(entry.id)
          const expandedContent = {
            ...(entry.targetId ? { targetType: entry.targetType, targetId: entry.targetId } : {}),
            ...entry.metadata,
          }

          return (
            <Fragment key={entry.id}>
              <TableRow aria-expanded={isExpandable ? isExpanded : undefined}>
                <TableCell>
                  {isExpandable && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Masquer les données complémentaires' : 'Afficher les données complémentaires'}
                      onClick={() => toggleExpanded(entry.id)}
                      className="h-11 w-11 rounded-full"
                    >
                      {isExpanded ? <IconChevronDown className="size-4" aria-hidden /> : <IconChevronRight className="size-4" aria-hidden />}
                    </Button>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal">{formatAuditDate(entry.occurredAt)}</TableCell>
                <TableCell className="whitespace-normal">
                  <AuditLogActorCell entry={entry} />
                </TableCell>
                <TableCell>
                  <AuditLogActionCell action={entry.action} />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  <AuditLogTargetCell entry={entry} />
                </TableCell>
                <TableCell>
                  <AuditSourceBadge source={entry.source} />
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={COLUMN_COUNT} className="whitespace-normal bg-muted/30 p-4">
                    <pre className="overflow-x-auto font-mono text-xs text-muted-foreground">{JSON.stringify(expandedContent, null, 2)}</pre>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}

// §2.4/AC-AU-17/UI design — three distinct renders, never a blank cell:
// - actorId null -> "Système" (a service_role emitter, e.g. purge.executed)
// - actorId set, actorFullName null -> "Compte supprimé" (PO-AU-01, the
//   join found no row — a genuinely different story than "no actor at all")
// - actorId set, actorFullName set -> the resolved name, plain text.
function AuditLogActorCell({ entry }: { entry: AuditLogEntry }) {
  if (entry.actorId === null) {
    return <span className="text-muted-foreground italic">Système</span>
  }
  if (entry.actorFullName === null) {
    return <span className="text-muted-foreground italic">Compte supprimé</span>
  }
  return <span className="font-semibold">{entry.actorFullName}</span>
}

// AC-AU-08/AC-AU-11 — a code outside AUDIT_ACTIONS renders as "Action
// inconnue" + the raw code on its own line, never an exception: the raw
// code is always visible, on both branches, never swallowed.
function AuditLogActionCell({ action }: { action: string }) {
  const label = isAuditAction(action) ? AUDIT_ACTION_LABELS[action] : 'Action inconnue'
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold">{label}</span>
      <span className="font-mono text-xs text-muted-foreground">{action}</span>
    </div>
  )
}

// specs/web-audit-logs.md — 2026-09-30 (third addendum) — `targetType ?
// `${targetType} · ${shortId}` : shortId`, resolves PO-AU-02. Falls back to
// today's id-only behaviour when `targetType` is null (pre-existing rows
// written before this column existed). Still never a resolved NAME.
function AuditLogTargetCell({ entry }: { entry: AuditLogEntry }) {
  if (!entry.targetId) return <>—</>

  const shortId = `${entry.targetId.slice(0, TARGET_ID_PREVIEW_LENGTH)}…`
  return <>{entry.targetType ? `${entry.targetType} · ${shortId}` : shortId}</>
}
