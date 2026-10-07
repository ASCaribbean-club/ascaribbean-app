import { IconAlertTriangle } from '@tabler/icons-react'
import type { Team } from '@domain/entities/team'
import { Avatar, AvatarFallback } from '../../../shared/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../shared/components/ui/select'
import { Dot } from '../../../shared/components/Dot'
import { Pill } from '../../../shared/components/Pill'
import { RoleSwitcher } from '../../../shared/components/RoleSwitcher'

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
  rosterMemberCount?: number
  dayMarker?: string
  hasMultipleTeams: boolean
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
  // specs/coach-alerts.md §1/§2, UI design "Emplacement — écran et entrée"
  // — a real, named control with a real destination, distinct from the
  // avatar (AC-AL-15). Always rendered for a coach (CoachHeader only ever
  // renders on the coach role already, §2) — the gate on which actions are
  // actually missing lives on the destination screen itself, not here.
  onAlertsClick: () => void
  // specs/coach-alerts.md PO-AL-03, re-résolu 2026-09-30 (décision
  // développeuse) — the count itself is computed by useCoachDashboardViewModel
  // (same bulk-read use case/query cache as the Alerts screen, never a
  // second independent read here), this component only renders the number
  // it's given. `0` means "no badge", not "badge showing 0" (AC-CD-05c-style
  // "exception only" rule — a clean dashboard shows a bare icon).
  alertsCount: number
}

export function CoachHeader({
  firstName,
  initials,
  teamName,
  activeMemberCount,
  rosterMemberCount,
  dayMarker,
  hasMultipleTeams,
  teams,
  selectedTeamId,
  onSelectTeam,
  onAvatarClick: goToProfilePage,
  onAlertsClick,
  alertsCount,
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
        <RoleSwitcher />

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

        {/* specs/coach-alerts.md UI design "Emplacement — écran et entrée"
            — the `absolute top-0 right-0` anchor moves from the avatar
            itself to this wrapping flex container, so the alert button can
            sit beside it (never posted ON TOP of it, AC-AL-15) while the
            overall anchor point (header's top-right corner) is unchanged —
            only the occupied width grows by one more pill. Positioned
            relative to this row (not the whole header) so its top edge
            lines up with the role/team pills instead of the header's own
            padding edge. */}
        <div className="absolute top-0 right-0 flex items-center gap-2">
          <button
            type="button"
            onClick={onAlertsClick}
            // The count itself is never color-only: it's read out through
            // the accessible name too (mirrors AC-AL-17's "toujours doublé
            // d'un libellé" rule elsewhere in this feature), not just a
            // visual badge a screen reader would silently skip.
            aria-label={alertsCount > 0 ? `Alertes, ${alertsCount} à traiter` : 'Alertes'}
            className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-white/8 text-white hover:bg-white/15"
          >
            <IconAlertTriangle className="size-5" aria-hidden />
            {alertsCount > 0 && (
              <span
                aria-hidden
                className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-coach-bg bg-coach-red px-1 text-[10px] font-extrabold text-white"
              >
                {alertsCount > 9 ? '9+' : alertsCount}
              </span>
            )}
          </button>

          {/* Avatar/initiales : tap navigates to /profile (Mon profil) —
              sign-out lives on ProfilePage's own avatar
              (ProfileIdentityHeader) instead, since a single tap target
              can't sensibly do both at once. Size/border/destination
              unchanged by this pass (AC-AL-15 — the avatar itself is
              untouched, only its wrapping container moved). */}
          <button type="button" onClick={goToProfilePage} aria-label="Mon profil">
            <Avatar className="size-9.5 border-2 border-coach-red">
              <AvatarFallback className="bg-coach-green text-[13px] font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      {/* pr-28, up from pr-13 (specs/coach-alerts.md UI design pass) — the
          absolutely positioned top-right control cluster this padding
          clears grew by one more size-11 button + gap (see the wrapping div
          above), so the greeting title needs proportionally more clearance
          than when only the avatar occupied that corner. */}
      <h1 className="pr-28 text-[30px] leading-[1.05] font-black tracking-tight text-white">
        Bonjour,
        <br />
        {firstName}
      </h1>

      <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white/75">
        <Dot className="bg-coach-green" />
        <span>
          {teamName}
          {rosterMemberCount !== undefined ? ` · ${rosterMemberCount} membres` : null}
          {/* Licenciés (active memberships) only adds information when it differs
              from the roster count. */}
          {activeMemberCount !== undefined && activeMemberCount !== rosterMemberCount
            ? ` · ${activeMemberCount} licenciés`
            : null}
          {dayMarker ? ` · J${dayMarker}` : null}
        </span>
      </p>
    </header>
  )
}
