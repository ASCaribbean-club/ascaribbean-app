import { Avatar, AvatarFallback } from '@presentation/shared/components/ui/avatar'

interface ProfileIdentityHeaderProps {
  fullName: string
  initials: string
  // Only passed for the flat (single distinct role) variant — v4
  // (docs/designs/profile-page/) shows the role as its own pill next to the
  // position pill there. The tabbed (2+ roles) variant has no separate role
  // pill in its own v4 mockup — the TabsList already communicates which
  // role is active, so a second pill saying the same thing would be
  // redundant. null/undefined renders nothing.
  roleLabel?: string | null
  // AC-PR-07 — player only, omitted when null. Unlike roleLabel, this is
  // NOT gated on the flat variant: v4's tabbed mockup still shows a pill
  // here even with a role tab bar underneath, so it's treated as a fact
  // about the person rather than about whichever tab happens to be active
  // — see ProfilePage's own call site. Deliberately NOT paired with an
  // edit affordance: the mockup shows a pencil icon next to this value, but
  // AC-PR-09 forbids any edit control on this screen (no UPDATE policy on
  // public.users) — flagged discrepancy, not implemented.
  positionLabel?: string | null
}

// UI design §"Bloc identité — nouveau composant, volontairement pas une
// reprise de CoachHeader/PlayerHeader": those headers carry three things
// this screen must NOT show — (a) the clickable role pill, whose
// onRoleClick is semantically tied to the dashboard's active-role selector
// (TODO PO-2 there) and would wrongly imply a link to useActiveRole() that
// AC-PR-04 forbids; (b) the "Bonjour, {prénom}" dashboard greeting tone,
// wrong register for a dossier consultation; (c) the notification dot on
// the avatar, no notification concept exists on this screen. What's left
// is just the avatar + name — no edit affordance (AC-PR-09). `email` was
// dropped from this component (developer feedback 2026-09-04: not shown in
// the actual mockups, docs/designs/DESIGN_LINKS.md §2), narrower than spec
// §1 point 1's "identité : fullName, email" — same flagged spec/mockup
// discrepancy as the charter/documents note on ProfilePage.tsx, not
// resolved here.
//
// Not `sticky` (unlike BackHeader/CoachHeader/PlayerHeader): there's no
// long list ABOVE this block on this screen that would justify pinning it
// — it scrolls away with the rest of the page, per the spec's own "Pas
// sticky" note.
export function ProfileIdentityHeader({ fullName, initials, roleLabel, positionLabel }: ProfileIdentityHeaderProps) {
  return (
    <header className="mx-5.5 mt-[max(1.375rem,env(safe-area-inset-top))] flex flex-col items-center gap-1.5 rounded-3xl border border-white/10 bg-gradient-to-b from-coach-green/20 to-transparent px-5 pt-7 pb-6 text-center">
      {/* Plain identity avatar, no tap affordance — sign-out briefly lived
          here as an AlertDialog trigger, but a further 2026-09-04
          correction consolidated it into the Menu screen's own
          LogoutButton (menu/components/LogoutButton.tsx) as the single
          place it lives, rather than duplicating it on this avatar too. */}
      <Avatar className="size-20">
        <AvatarFallback className="bg-coach-green text-2xl font-semibold text-white">{initials}</AvatarFallback>
      </Avatar>

      <p className="text-[19px] font-extrabold text-white">{fullName}</p>

      {/* v4 shows both pills side by side (role, then position) rather than
          stacked — flex-wrap so a long role label + position label pair
          still wraps to two lines instead of overflowing on a narrow phone. */}
      {(roleLabel || positionLabel) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {roleLabel && (
            <span className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-[12.5px] font-semibold text-white/80">
              {roleLabel}
            </span>
          )}
          {positionLabel && (
            <span className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-[12.5px] font-semibold text-white/80">
              {positionLabel}
            </span>
          )}
        </div>
      )}
    </header>
  )
}
