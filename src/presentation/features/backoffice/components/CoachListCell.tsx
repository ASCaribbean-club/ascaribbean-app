import type { TeamCoach } from '@domain/repositories/coach-repository'

interface CoachListCellProps {
  coaches: TeamCoach[]
}

// specs/section-and-teams.md UI design, "Nouveau composant — CoachListCell"
// — shared between SectionTable and TeamTable (one component, not two
// duplicated variants). Props are an ALREADY-RESOLVED list (AC-ST-42/
// AC-ST-43); this component makes no request and no join of its own.
export function CoachListCell({ coaches }: CoachListCellProps) {
  if (coaches.length === 0) {
    // AC-ST-42 — a deliberate deviation from the mockup's bare "—": the
    // spec's own §1 point 2 requires an explicit TEXTUAL state, never a
    // blank cell and never color alone. Text-only, no icon, no alert color.
    return <span className="text-white/50">Aucun coach</span>
  }

  if (coaches.length === 1) {
    return <span>{coaches[0].fullName}</span>
  }

  // PO-ST-15 (open, not decided here) — no mockup shows a multi-coach
  // cell. Deliberately minimal rather than inventing a new visual pattern
  // (avatars, "+N" truncation) without a reference: a comma-separated list,
  // wrapping naturally.
  return <span className="whitespace-normal">{coaches.map((coach) => coach.fullName).join(', ')}</span>
}
