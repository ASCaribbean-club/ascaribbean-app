// A switch that always renders "on" and never responds to input — used by
// RecipientsCard below. Deliberately NOT shadcn's Switch/Radix primitive:
// this element has no interactive behaviour at all (UI design
// §"Structure de l'écran", point 4 — "aucun gestionnaire de tap"), so
// pulling in a full interactive primitive (with its own keyboard/focus/
// aria-checked-toggling machinery) would be more than this needs and would
// invite someone to "helpfully" wire an onClick later, which the spec
// explicitly says not to do. `aria-readonly` + a fixed `aria-checked="true"`
// tell assistive tech what a sighted user sees, without implying it's
// operable. `role="switch"` still applies, same reasoning as an `<img>` with
// alt text: describing what's there, not what can be done with it. Rendered
// in gray rather than coach-green so it *reads* as non-interactive too —
// green there would look like a live "on" toggle inviting a tap.
export function StaticSwitch() {
  return (
    <span
      role="switch"
      aria-checked="true"
      aria-readonly="true"
      aria-label="Toute l'équipe (toujours activé)"
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-white/15"
    >
      <span aria-hidden className="ml-auto mr-0.5 size-5 rounded-full bg-white/50 shadow" />
    </span>
  )
}
