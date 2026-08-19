import { formatRole } from '../../../shared/formatters/role-labels'

interface CoachHeaderProps {
  firstName: string
  initials: string
  teamName?: string
  activeMemberCount?: number
  dayMarker?: string
  hasMultipleTeams: boolean
  onRoleClick: () => void
  onTeamSelectorClick: () => void
}

export function CoachHeader({
  firstName,
  initials,
  teamName,
  activeMemberCount,
  dayMarker,
  hasMultipleTeams,
  onRoleClick,
  onTeamSelectorClick,
}: CoachHeaderProps) {
  return (
    <header className="coach-dashboard__header">
      <div className="coach-dashboard__pills">
        {/* TODO(PO-2, AC-CD-13): no-op in v1 — Real behaviour (switch
            active role and recompose the dashboard) is a future feature,
            not this click handler. */}
        <button type="button" className="coach-dashboard__pill coach-dashboard__pill--role" onClick={onRoleClick}>
          <span className="coach-dashboard__role-icon" aria-hidden />
          {formatRole('coach')}
        </button>

        {/* Rendue seulement pour un coach multi-équipes — absente, pas
            grisée, sinon (specs/coach-dashboard.md UI design §1). */}
        {hasMultipleTeams && (
          <button
            type="button"
            className="coach-dashboard__pill coach-dashboard__pill--team"
            onClick={onTeamSelectorClick}
          >
            {teamName} ▾
          </button>
        )}
      </div>

      {/* Avatar/initiales + pastille de notification : la pastille est
          purement décorative ici — son comportement (lu/non-lu) reste hors
          périmètre de cette feature (spec UI design §1). */}
      <div className="coach-dashboard__avatar-wrap">
        <div className="coach-dashboard__avatar" aria-hidden>
          {initials}
        </div>
        <span className="coach-dashboard__avatar-dot" aria-hidden />
      </div>

      <h1 className="coach-dashboard__greeting">
        Bonjour,
        <br />
        {firstName}
      </h1>

      <p className="coach-dashboard__context-line">
        <span className="coach-dashboard__context-dot" aria-hidden />
        <span>
          {teamName} · {activeMemberCount !== undefined ? `${activeMemberCount} licenciés` : null}
          {dayMarker ? ` · J${dayMarker}` : null}
        </span>
      </p>
    </header>
  )
}
