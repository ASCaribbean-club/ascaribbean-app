import { Link } from 'react-router-dom'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Avatar, AvatarFallback } from '@presentation/shared/components/ui/avatar'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { UserStatusBadge } from '@presentation/features/backoffice/users/components/UserStatusBadge'
import { getInitials } from '@presentation/shared/formatters/greeting'
import type { PendingInvitationsPanelData } from '../useBackofficeOverviewViewModel'

interface PendingInvitationsPanelProps {
  data: PendingInvitationsPanelData
}

// specs/web-dashboard.md UI design §4b — "Invitations en attente". Reuses
// UserStatusBadge as-is (AC-WD-15 — same predicate, same pastille as
// /admin/users' own STATUT column, never a second one invented for this
// panel).
export function PendingInvitationsPanel({ data }: PendingInvitationsPanelProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base font-bold text-foreground">Invitations en attente</h3>
        <Link to={data.to} className="shrink-0 text-sm font-semibold text-foreground underline underline-offset-2 hover:text-muted-foreground">
          Voir les utilisateurs
        </Link>
      </div>

      {data.isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      )}

      {!data.isLoading && data.errorMessage && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{data.errorMessage}</AlertDescription>
        </Alert>
      )}

      {!data.isLoading && !data.errorMessage && data.rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune invitation en attente.</p>
      )}

      {!data.isLoading && !data.errorMessage && data.rows.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.rows.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3">
              <Avatar className="size-9 shrink-0 border border-border">
                <AvatarFallback className="bg-coach-amber text-xs font-semibold text-white">{getInitials(entry.fullName)}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-sm font-semibold text-foreground">{entry.fullName}</span>
                <span className="truncate text-xs text-muted-foreground">{entry.email}</span>
              </span>
              <UserStatusBadge charterAcceptedAt={entry.charterAcceptedAt} />
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
