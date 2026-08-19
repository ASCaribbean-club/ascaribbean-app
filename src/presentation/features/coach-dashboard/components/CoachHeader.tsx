import { formatRole } from '../../../shared/formatters/role-labels'

interface CoachHeaderProps {
  firstName: string
  teamName?: string
  activeMemberCount?: number
  dayMarker?: string
  hasMultipleTeams: boolean
  onRoleClick: () => void
  onTeamSelectorClick: () => void
}

export function CoachHeader({
  firstName,
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
        {/* TODO(PO-2, AC-CD-13): no-op in v1 — pastille cliquable visuellement
            (curseur pointeur) mais sans effet. The real behaviour (switch
            active role and recompose the dashboard) is a future feature,
            not this click handler. */}
        <button type="button" className="coach-dashboard__pill coach-dashboard__pill--role" onClick={onRoleClick}>
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

      {/* Avatar/initiales + pastille de notification : comportement de la
          pastille hors périmètre de cette feature (spec UI design §1). */}
      <div className="coach-dashboard__avatar" aria-hidden />

      <h1 className="coach-dashboard__greeting">Bonjour, {firstName}</h1>

      <p className="coach-dashboard__context-line">
        {teamName} · {activeMemberCount !== undefined ? `${activeMemberCount} licenciés` : null}
        {dayMarker ? ` · J${dayMarker}` : null}
      </p>
    </header>
  )
}
