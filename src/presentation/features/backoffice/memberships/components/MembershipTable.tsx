import { Fragment } from 'react'
import { IconArchive, IconChevronDown, IconPencil } from '@tabler/icons-react'
import type { UserSummary } from '@domain/repositories/user-repository'
import { Button } from '@presentation/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import { MembershipStatusBadge } from '@presentation/features/profile/components/MembershipStatusBadge'
import type { MembershipAdminRow } from '../useBackofficeMembershipsViewModel'
import { MembershipCotisationSummary } from './MembershipCotisationSummary'
import { MembershipEditRow } from './MembershipEditRow'

const COLUMN_COUNT = 7

interface MembershipTableProps {
  rows: MembershipAdminRow[]
  users: UserSummary[]
  canWriteMembership: boolean
  canRecordPayment: boolean
  expandedMembershipId: string | null
  onToggleEdit: (row: MembershipAdminRow) => void
  onCollapseEdit: () => void
  onRecordPayment: (row: MembershipAdminRow) => void
  onArchive: (row: MembershipAdminRow) => void
}

// specs/web-memberships.md §1/UI design "Tableau à sept colonnes" — exact
// mockup order: UTILISATEUR, SAISON, LICENCE, STATUT, VALIDE JUSQU'AU,
// COTISATION, ACTIONS.
export function MembershipTable({
  rows,
  users,
  canWriteMembership,
  canRecordPayment,
  expandedMembershipId,
  onToggleEdit,
  onCollapseEdit,
  onRecordPayment,
  onArchive,
}: MembershipTableProps) {
  const usersById = new Map(users.map((candidate) => [candidate.id, candidate]))

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
          {/* No visible label in the mockup for this column — sr-only text
              lives on an inner <span>, not the <th> itself (same reasoning
              as NewsTable/SeasonTable: sr-only on the <th> directly would
              collapse the cell out of the table's column layout). */}
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isExpanded = expandedMembershipId === row.membership.id
          return (
            <Fragment key={row.membership.id}>
              <TableRow aria-expanded={isExpanded}>
                <TableCell className="font-semibold whitespace-normal">{row.userFullName}</TableCell>
                <TableCell>{row.seasonLabel}</TableCell>
                {/* AC-WM-15/§2.1 — an empty licence number is a normal case, not
                    an error state (mockup row 1). */}
                <TableCell className="text-muted-foreground">{row.membership.licenceNumber || '—'}</TableCell>
                <TableCell>
                  {/* §2.4/AC-WM-18 — renders the STORED status alone, never
                      isActive()/isExpired(). */}
                  <MembershipStatusBadge status={row.membership.status} />
                </TableCell>
                {/* AC-WM-19 — `date` column, already "AAAA-MM-JJ" from
                    PostgREST, no second pass through toDateInputValue(new
                    Date(...)) (same reasoning as SeasonTable's startDate/
                    endDate — round-tripping a date-only string through `new
                    Date()` reads it as UTC midnight and can shift the day back
                    for any timezone behind UTC). */}
                <TableCell>{row.membership.validUntil}</TableCell>
                <TableCell>
                  {/* AC-WM-12/AC-WM-13 — the real per-row sum (amendement du
                      2026-09-17, PO-WM-01 resolved), computed once in the
                      ViewModel from the bulk payments read.
                      effectiveAmountDueCents (not the raw membership field)
                      — falls back to the season's own tarif when this
                      membership has no amount of its own yet, see that
                      field's own comment on MembershipAdminRow. */}
                  <MembershipCotisationSummary paidCents={row.paidCents} amountDueCents={row.effectiveAmountDueCents} status={row.paymentStatus} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {/* §1/AC-WM-23 — rendered on EVERY row, including an
                        already-"payé" one: PO-WM-02 (over-perception) is not
                        decided, hiding this once "payé" would preempt that
                        arbitration. */}
                    {canRecordPayment && (
                      <Button type="button" variant="outline" onClick={() => onRecordPayment(row)} className="h-11 rounded-full">
                        + Paiement
                      </Button>
                    )}
                    {/* §1/§7/UI design "Ligne dépliable d'édition" (amendement
                        du 2026-09-17) — a SINGLE icon that flips between
                        pencil (collapsed) and chevron (expanded), replacing
                        the earlier "opens a dialog" behaviour entirely. */}
                    {canWriteMembership && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-expanded={isExpanded}
                        aria-label={
                          isExpanded
                            ? `Réduire l'adhésion de « ${row.userFullName} »`
                            : `Modifier l'adhésion de « ${row.userFullName} »`
                        }
                        onClick={() => onToggleEdit(row)}
                        className="h-11 w-11 rounded-full"
                      >
                        {isExpanded ? <IconChevronDown className="size-4" aria-hidden /> : <IconPencil className="size-4" aria-hidden />}
                      </Button>
                    )}
                    {/* PO-WM-05 — not illustrated by any mockup: a neutral
                        (never text-destructive) archive icon, never a trash can,
                        so it never reads as a permanent deletion. */}
                    {canWriteMembership && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Archiver l'adhésion de « ${row.userFullName} »`}
                        onClick={() => onArchive(row)}
                        className="h-11 w-11 rounded-full text-muted-foreground hover:text-foreground"
                      >
                        <IconArchive className="size-4" aria-hidden />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {isExpanded && (
                <MembershipEditRow
                  row={row}
                  email={usersById.get(row.membership.userId)?.email ?? ''}
                  columnCount={COLUMN_COUNT}
                  onClose={onCollapseEdit}
                />
              )}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
