import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../shared/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '../../../shared/components/ui/avatar'
import { Pill } from '../../../shared/components/Pill'
import { formatRole } from '../../../shared/formatters/role-labels'
import { TeamPill } from './TeamPill'

interface PlayerHeaderProps {
  firstName: string
  initials: string
  teamName?: string
  onRoleClick: () => void
  onLogout: () => void
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
export function PlayerHeader({ firstName, initials, teamName, onRoleClick, onLogout }: PlayerHeaderProps) {
  return (
    // `sticky top-0` (CLAUDE.md §6, "Back navigation stays reachable while
    // scrolling") — same reasoning as CoachHeader: the content below can
    // grow past the viewport.
    <header className="sticky top-0 z-10 isolate flex flex-col gap-5 overflow-hidden bg-coach-bg px-5.5 pt-[max(1.375rem,env(safe-area-inset-top))] pb-5">
      {/* Decorative stripe/fade behind the header, identical treatment to
          CoachHeader's — same dark-theme mockup family (v4_coach_dashboard
          and v2_joueur_dashboard share this diagonal red/green motif). */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-15 -top-10 -z-10 h-55 bg-[repeating-linear-gradient(-18deg,transparent_0_54px,oklch(58%_0.2_26/0.5)_54px_62px,transparent_62px_150px),linear-gradient(180deg,transparent_0%,var(--color-coach-bg)_92%)]"
      />

      <div className="relative flex items-center gap-2">
        {/* TODO(PO-2, AC-PD-18): no-op in v1 — real behaviour (switch
            active role and recompose the dashboard) is a future feature,
            not this click handler. Same decision as coach
            (specs/coach-dashboard.md PO-2), not reopened here. */}
        <Pill onClick={onRoleClick}>
          <span
            aria-hidden
            className="size-5.5 shrink-0 rounded-full bg-[conic-gradient(var(--color-coach-green)_0deg_180deg,var(--color-coach-red)_180deg_360deg)]"
          />
          {formatRole('player')}
        </Pill>

        {/* Rendered only once the player's team resolves — absent, not
            grey, while loading/if there's no current-season assignment
            (AC-PD-01), same "carte absente" rule as everywhere else on
            this screen. */}
        {teamName && <TeamPill teamName={teamName} />}

        {/* Avatar/initiales + pastille de notification : reprise identique
            de CoachHeader (comportement de la pastille hors périmètre de
            cette feature). Tap ouvre la confirmation de déconnexion. */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" aria-label="Compte" className="absolute top-0 right-0">
              <Avatar className="size-9.5 border-2 border-coach-red">
                <AvatarFallback className="bg-coach-green text-[13px] font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-coach-bg bg-coach-red" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
              <AlertDialogDescription>
                Vous devrez vous reconnecter pour accéder à l'application.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={onLogout}>Se déconnecter</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <h1 className="pr-13 text-[30px] leading-[1.05] font-black tracking-tight text-white">
        Bonjour,
        <br />
        {firstName}
      </h1>
    </header>
  )
}
