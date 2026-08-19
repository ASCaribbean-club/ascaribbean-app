import { Avatar, AvatarFallback } from '../../../shared/components/ui/avatar'
import { Dot } from '../../../shared/components/Dot'
import { Pill } from '../../../shared/components/Pill'
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
    <header className="relative isolate flex flex-col gap-5 overflow-hidden">
      {/* Decorative stripe/fade behind the header, approximating the
          mockup's angled red banners without hardcoding a fixed frame width. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-15 -top-10 -z-10 h-55 bg-[repeating-linear-gradient(-18deg,transparent_0_54px,oklch(58%_0.2_26/0.5)_54px_62px,transparent_62px_150px),linear-gradient(180deg,transparent_0%,var(--color-coach-bg)_92%)]"
      />

      <div className="flex items-center gap-2">
        {/* TODO(PO-2, AC-CD-13): no-op in v1 — Real behaviour (switch
            active role and recompose the dashboard) is a future feature,
            not this click handler. */}
        <Pill onClick={onRoleClick}>
          <span
            aria-hidden
            className="size-[22px] shrink-0 rounded-full bg-[conic-gradient(var(--color-coach-green)_0deg_180deg,var(--color-coach-red)_180deg_360deg)]"
          />
          {formatRole('coach')}
        </Pill>

        {/* Rendue seulement pour un coach multi-équipes — absente, pas
            grisée, sinon (specs/coach-dashboard.md UI design §1). */}
        {hasMultipleTeams && (
          <Pill onClick={onTeamSelectorClick}>
            {teamName} <span className="text-white/60">▾</span>
          </Pill>
        )}
      </div>

      {/* Avatar/initiales + pastille de notification : la pastille est
          purement décorative ici — son comportement (lu/non-lu) reste hors
          périmètre de cette feature (spec UI design §1). */}
      <div className="absolute top-0 right-0">
        <Avatar className="size-9.5 border-2 border-coach-red">
          <AvatarFallback className="bg-coach-green text-[13px] font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-coach-bg bg-coach-red" />
      </div>

      <h1 className="pr-13 text-[30px] leading-[1.05] font-black tracking-tight text-white">
        Bonjour,
        <br />
        {firstName}
      </h1>

      <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white/75">
        <Dot className="bg-coach-green" />
        <span>
          {teamName} · {activeMemberCount !== undefined ? `${activeMemberCount} licenciés` : null}
          {dayMarker ? ` · J${dayMarker}` : null}
        </span>
      </p>
    </header>
  )
}
