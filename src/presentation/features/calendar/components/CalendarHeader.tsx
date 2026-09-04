interface CalendarHeaderProps {
  // "Aoû 2026" — pre-formatted by the ViewModel (formatMonthYear), not
  // computed here: this component only renders strings, same rule as every
  // other header in this app (CoachHeader/PlayerHeader take pre-derived
  // props too).
  monthYearLabel: string
}

// UI design §"Structure de l'écran" point 1 — deliberately the SMALLEST
// header in the app: title + a read-only month/year subtitle, nothing else.
// No back arrow (AC-CA-18 — this is a primary nav destination inside
// AppShell, not a pushed screen) and, unlike CoachHeader/PlayerHeader, NO
// avatar/role pill on the right (AC-CA-07 is explicit and absolute for this
// screen — "no avatar under any form" — so this isn't the usual
// avatar-that-opens-profile pattern minus a badge, it's a header with no
// right-hand slot at all). That's also why this is its own tiny component
// rather than a reuse of CoachHeader/PlayerHeader with props toggled off:
// reusing either would mean carrying dead avatar/role-pill markup this
// screen must never render for any role.
export function CalendarHeader({ monthYearLabel }: CalendarHeaderProps) {
  return (
    <header className="flex flex-col gap-1 px-5.5 pt-6 pb-2">
      <h1 className="text-[26px] font-extrabold text-white">Calendrier</h1>
      <p className="text-[13.5px] font-semibold text-white/50">{monthYearLabel}</p>
    </header>
  )
}
