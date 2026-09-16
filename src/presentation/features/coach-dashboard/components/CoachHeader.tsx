import type { Team } from '@domain/entities/team'
import { Avatar, AvatarFallback } from '../../../shared/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../shared/components/ui/select'
import { Dot } from '../../../shared/components/Dot'
import { Pill } from '../../../shared/components/Pill'
import { formatRole } from '../../../shared/formatters/role-labels'

// Reshapes shadcn's Select trigger to look like the role Pill beside it
// (rounded-full, translucent border/bg, same text size/weight) instead of
// its own default rectangular input look — visual parity is the point, the
// two pills should read as one family. Keeps the shadcn chevron icon rather
// than the hand-drawn "▾" the (non-Select) team Pill below still uses for
// its own disabled, non-selector state.
const TEAM_SELECT_TRIGGER_CLASSNAME =
  'h-auto w-auto gap-1.5 rounded-full border-white/15 bg-white/10 px-3 py-1.5 text-[12.5px] font-bold text-white data-[placeholder]:text-white [&>svg]:size-3.5 [&>svg]:text-white/60 [&>svg]:opacity-100'

interface CoachHeaderProps {
  firstName: string
  initials: string
  teamName?: string
  activeMemberCount?: number
  dayMarker?: string
  hasMultipleTeams: boolean
  hasMultipleRoles: boolean
  onRoleClick: () => void
  // PO-6/AC-CD-14 resolved: real selection, not a click-through. `teams` is
  // the coach's full team list (for the dropdown's options — including the
  // single-team case where nothing renders it, see below), `selectedTeamId`
  // is which one to show as selected (mirrors `teamName`, which is derived
  // from the SAME currentTeam upstream in useCoachDashboardViewModel — kept
  // as two props rather than one object so this component doesn't need to
  // know the shape of a "current team summary").
  teams: Team[]
  selectedTeamId: string | undefined
  onSelectTeam: (teamId: string) => void
  onAvatarClick: () => void
}

export function CoachHeader({
  firstName,
  initials,
  teamName,
  activeMemberCount,
  dayMarker,
  hasMultipleTeams,
  hasMultipleRoles,
  onRoleClick,
  teams,
  selectedTeamId,
  onSelectTeam,
  onAvatarClick: goToProfilePage,
}: CoachHeaderProps) {
  return (
    // `sticky top-0` (CLAUDE.md §6, "Back navigation stays reachable while
    // scrolling"): the dashboard content below can grow past the viewport,
    // so without this the team/headcount line would scroll away with the
    // rest of the page. Matches BackHeader's own sticky top-0 a screen over.
    <header className="sticky top-0 z-10 isolate flex flex-col gap-5 overflow-hidden bg-coach-bg px-5.5 pt-[max(1.375rem,env(safe-area-inset-top))] pb-5">
      {/* App background image behind the header, fading into coach-bg so it
          blends with the page below instead of hard-cutting at the header's
          edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-15 -top-10 -z-10 h-100 bg-[linear-gradient(180deg,transparent_0%,var(--color-coach-bg)_92%),url(/background.jpeg)] bg-cover bg-center"
      />

      <div className="relative flex items-center gap-2">
        {/* TODO(PO-2, AC-CD-13): no-op in v1 — Real behaviour (switch
            active role and recompose the dashboard) is a future feature,
            not this click handler. */}
        <Pill onClick={onRoleClick}>
          <img src="/icons/icon-512.png" alt="" aria-hidden className="size-5.5 shrink-0 rounded-full object-cover" />
          {formatRole('coach')}
          {hasMultipleRoles && <span className="text-white/60">▾</span>}
        </Pill>

        {/* Toujours affichée dès qu'une équipe est résolue — mais seule la
            variante multi-équipes est un vrai sélecteur (Select) : rien à
            choisir pour un coach mono-équipe, donc une Pill non cliquable,
            sans chevron, au même endroit (specs/coach-dashboard.md UI
            design §1 : absente devient grisée pour cette passe — la Pill
            reste visible pour que l'équipe soit toujours nommée). */}
        {hasMultipleTeams ? (
          <Select value={selectedTeamId} onValueChange={onSelectTeam}>
            <SelectTrigger className={TEAM_SELECT_TRIGGER_CLASSNAME} aria-label="Choisir une équipe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          teamName && (
            <Pill disabled className="disabled:cursor-default">
              {teamName}
            </Pill>
          )
        )}

        {/* Avatar/initiales : tap navigates to /profile (Mon profil) —
            sign-out lives on ProfilePage's own avatar (ProfileIdentityHeader)
            instead, since a single tap target can't sensibly do both at
            once. Positioned relative to this row (not the whole header) so
            its top edge lines up with the role/team pills instead of the
            header's own padding edge. */}
        <button type="button" onClick={goToProfilePage} aria-label="Mon profil" className="absolute top-0 right-0">
          <Avatar className="size-9.5 border-2 border-coach-red">
            <AvatarFallback className="bg-coach-green text-[13px] font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
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
