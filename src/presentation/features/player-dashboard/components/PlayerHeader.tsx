import { Avatar, AvatarFallback } from '../../../shared/components/ui/avatar'
import { Pill } from '../../../shared/components/Pill'
import { formatRole } from '../../../shared/formatters/role-labels'
import { TeamPill } from './TeamPill'

interface PlayerHeaderProps {
  firstName: string
  initials: string
  teamName?: string
  hasMultipleRoles: boolean
  onRoleClick: () => void
  onAvatarClick: () => void
}

// Reuses the header pattern established by coach-dashboard's CoachHeader
// (see that file's own comments for the sticky/decorative-stripe/avatar
// reasoning, not repeated here — specs/player-dashboard.md UI design §1
// explicitly says to reapply it, not reinvent it). The differences are all
// content, never structure:
//   - the team pill is a `TeamPill` (static <span>), not a second
//     clickable `Pill` like the coach's team selector — this pill has no
//     bascule to be a no-op stand-in FOR (§1, "purement informative");
//   - no "{équipe} · {N} licenciés · J{repère}" context line under the
//     salutation — nothing in this spec founds one for the player;
//   - no ASC Legacy points line either (§6 correction 1, AC-PD-12) — the
//     salutation is followed directly by whatever the page renders next
//     (the alert banner or the convocation card), not by this component.
export function PlayerHeader({ firstName, initials, teamName, hasMultipleRoles, onRoleClick, onAvatarClick: goToProfilePage }: PlayerHeaderProps) {
  return (
    // `sticky top-0` (CLAUDE.md §6, "Back navigation stays reachable while
    // scrolling") — same reasoning as CoachHeader: the content below can
    // grow past the viewport.
    <header className="sticky top-0 z-10 isolate flex flex-col gap-5 overflow-hidden bg-coach-bg px-5.5 pt-[max(1.375rem,env(safe-area-inset-top))] pb-5">
      {/* App background image behind the header, identical treatment to
          CoachHeader's — same fade into coach-bg so it blends with the page
          below instead of hard-cutting at the header's edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-15 -top-10 -z-10 h-100 bg-[linear-gradient(180deg,transparent_0%,var(--color-coach-bg)_92%),url(/background.jpeg)] bg-cover bg-center"
      />

      <div className="relative flex items-center gap-2">
        {/* TODO(PO-2, AC-PD-18): no-op in v1 — real behaviour (switch
            active role and recompose the dashboard) is a future feature,
            not this click handler. Same decision as coach
            (specs/coach-dashboard.md PO-2), not reopened here. */}
        <Pill onClick={onRoleClick}>
          <img src="/icons/icon-512.png" alt="" aria-hidden className="size-5.5 shrink-0 rounded-full object-cover" />
          {formatRole('player')}
          {hasMultipleRoles && <span className="text-white/60">▾</span>}
        </Pill>

        {/* Rendered only once the player's team resolves — absent, not
            grey, while loading/if there's no current-season assignment
            (AC-PD-01), same "carte absente" rule as everywhere else on
            this screen. */}
        {teamName && <TeamPill teamName={teamName} />}

        {/* Avatar/initiales : reprise identique de CoachHeader. Tap
            navigates to /profile — see CoachHeader's own comment for why
            sign-out lives on ProfilePage's avatar instead of duplicated on
            both dashboard headers. */}
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
    </header>
  )
}
