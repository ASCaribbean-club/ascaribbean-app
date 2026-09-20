import { IconArrowUpRight } from '@tabler/icons-react'

interface UserMembershipSeasonCellProps {
  hasMembershipForCurrentSeason: boolean
  currentSeasonId: string | null
  fullName: string
  onRedirect: () => void
}

// specs/web-users-membership-column.md §2.1/§2.3d, specs/web-users.md UI
// design "Nouvelle colonne — ADHÉSION SAISON" — reads
// row.missingElementFacts.hasMembershipForCurrentSeason EXCLUSIVELY, the
// SAME boolean UserMissingElementIndicator's own criterion 2 already
// consumes (AC-WU-57): no second calculation, no new repository method, no
// new domain predicate. Exactly three states, never a fourth.
export function UserMembershipSeasonCell({ hasMembershipForCurrentSeason, currentSeasonId, fullName, onRedirect }: UserMembershipSeasonCellProps) {
  // §2.3d — "aucune saison en cours" wins over the boolean fact itself:
  // toMissingElementFacts() forces hasMembershipForCurrentSeason to false in
  // that case too (that mapper's own comment) — rendered as-is, that would
  // read "Non" (and offer a dead-end redirect) for EVERY account in the
  // club during a summer break. Neutral, muted, non-actionable instead —
  // the aria-label carries the explanation, never a silent bare dash.
  if (currentSeasonId === null) {
    return (
      <span className="text-sm text-white/30" aria-label="Aucune saison en cours : adhésion non évaluable">
        —
      </span>
    )
  }

  if (hasMembershipForCurrentSeason) {
    // §2.1/PO-WU-15 — deliberately plain text, no Badge, no green: "Oui"
    // here means "a non-archived membership row exists for the current
    // season", not "membership is active" — a pending or suspended
    // membership reads "Oui" too. Same treatment as the EMAIL column.
    // Inert on purpose (CLAUDE.md §7) — nothing asks for a "view
    // membership" action from an already-member row.
    return <span className="text-sm text-white/80">Oui</span>
  }

  // §2.3a — the redirect control. A real button (never a div with
  // onClick), keyboard-reachable, h-11/min-w-11 real touch target
  // (CLAUDE.md §6, "y compris sur desktop"), amber register matching the
  // row's own warning icon (a dossier to complete, not a failure — the red
  // register stays reserved for destructive actions/real failures
  // elsewhere in this backoffice). Never the color alone (AC-WU-28): the
  // visible text "Non" carries the state, the amber only reinforces it.
  return (
    <button
      type="button"
      onClick={onRedirect}
      aria-label={`Voir ou créer l'adhésion de ${fullName}`}
      className="inline-flex h-11 min-w-11 items-center gap-1.5 rounded-full border border-coach-amber/35 bg-coach-amber/10 px-3 text-xs font-semibold text-coach-amber hover:bg-coach-amber/20 focus-visible:ring-2 focus-visible:ring-coach-amber/50 focus-visible:ring-offset-1"
    >
      Non
      <IconArrowUpRight className="size-3.5" aria-hidden />
    </button>
  )
}
