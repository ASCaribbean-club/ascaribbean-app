// specs/web-users.md §2.3/AC-WU-37 — "élément manquant", tranché le
// 2026-09-18: FOUR criteria, combined by OR, never an AND, never a
// weighting. Pure function of a minimal facts structure — no repository
// dependency here, on purpose (§2.3 point 1): the row icon (fed by the
// admin directory read, §2.2) and the nav badge count (fed by its own
// dedicated, lighter read, §2.8) must consume this SAME predicate so the two
// can never diverge on a corner case (AC-WU-17) — only the two REPOSITORY
// reads that assemble this facts structure differ, never the rule itself.
export interface MissingElementFacts {
  // Criterion 1 — the account carries zero RoleAssignment.
  hasRole: boolean
  // Criterion 2 — a (non-archived) membership exists for the season
  // Postgres' current_season() currently resolves. Always false when no
  // season is current (§2.3, "repli") — never an error, never evaluated
  // against a season that doesn't exist.
  hasMembershipForCurrentSeason: boolean
  // Criterion 3 — that same current-season membership carries a non-blank
  // licence number. Meaningless (and always false) when
  // hasMembershipForCurrentSeason is itself false, but the OR below makes
  // that redundancy harmless rather than something callers must special-case.
  hasLicenceNumberForCurrentSeason: boolean
  // Criterion 4 — mirrors userStatus(charterAcceptedAt) === 'invited'.
  // Deliberately KEPT despite the redundancy with the STATUT column — see
  // this file's own note below, not a copy/paste accident.
  charterAccepted: boolean
}

// §2.3 — "un compte présente un ou plusieurs éléments manquants si AU MOINS
// UN des quatre critères est vrai". Criterion 4 (charterAccepted) is
// retained ON PURPOSE even though it's already visible via the STATUT
// column/userStatus() — the developer's own explicit 2026-09-18 decision: an
// invited account that never accepted the charter is a file to chase up,
// and the nav badge must count it even when nobody is looking at the table.
// Do NOT "clean up" this criterion as a duplicate of userStatus() — it is
// one on purpose.
export function hasMissingElement(facts: MissingElementFacts): boolean {
  return (
    !facts.hasRole ||
    !facts.hasMembershipForCurrentSeason ||
    !facts.hasLicenceNumberForCurrentSeason ||
    !facts.charterAccepted
  )
}
