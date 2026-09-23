import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Avatar, AvatarFallback } from '@presentation/shared/components/ui/avatar'
import { Button } from '@presentation/shared/components/ui/button'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { MembershipCotisationSummary } from '@presentation/features/backoffice/memberships/components/MembershipCotisationSummary'
import type { MembershipAdminRow } from '@presentation/features/backoffice/memberships/membership-admin-row'
import type { UnpaidDuesPanelData } from '../useBackofficeOverviewViewModel'
import { formatEuros } from '@presentation/shared/formatters/currency'
import { getInitials } from '@presentation/shared/formatters/greeting'

interface UnpaidDuesPanelProps {
  data: UnpaidDuesPanelData
  canRecordPayment: boolean
  onRecordPayment: (row: MembershipAdminRow) => void
}

// specs/web-dashboard.md UI design §4a — "Cotisations non soldées". Every
// row comes from the SAME MembershipAdminRow assembly
// (membership-admin-row.ts, AC-WD-12) /admin/memberships builds, and reuses
// MembershipCotisationSummary as-is (AC-WD-12: never a second progress-bar
// implementation). "Encaisser" opens RecordPaymentDialog, unmodified — this
// component only ever calls `onRecordPayment`, mounting the dialog itself is
// BackofficeOverviewPage's job (AC-WD-09).
export function UnpaidDuesPanel({ data, canRecordPayment, onRecordPayment }: UnpaidDuesPanelProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground">Cotisations non soldées</h3>
          {!data.isLoading && !data.errorMessage && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {data.totalCount} adhésion{data.totalCount > 1 ? 's' : ''} · {formatEuros(data.totalRemainingCents)} restant à percevoir
            </p>
          )}
        </div>
        <Link to={data.to} className="shrink-0 text-sm font-semibold text-foreground underline underline-offset-2 hover:text-muted-foreground">
          Voir les adhésions
        </Link>
      </div>

      {data.isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!data.isLoading && data.errorMessage && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{data.errorMessage}</AlertDescription>
        </Alert>
      )}

      {!data.isLoading && !data.errorMessage && data.rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune cotisation en attente.</p>
      )}

      {!data.isLoading && !data.errorMessage && data.rows.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.rows.map((row) => (
            <li key={row.membership.id} className="flex items-center gap-3">
              <Avatar className="size-9 shrink-0 border border-border">
                <AvatarFallback className="bg-coach-green text-xs font-semibold text-white">{getInitials(row.userFullName)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{row.userFullName}</span>
              <MembershipCotisationSummary paidCents={row.paidCents} amountDueCents={row.effectiveAmountDueCents} status={row.paymentStatus} />
              {canRecordPayment && (
                <Button type="button" variant="outline" onClick={() => onRecordPayment(row)} className="h-11 shrink-0 rounded-full">
                  Encaisser
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!data.isLoading && !data.errorMessage && data.remainingCount > 0 && (
        <p className="text-xs text-muted-foreground">et {data.remainingCount} de plus</p>
      )}
    </div>
  )
}
