// specs/create-convocation.md §2, "Lieu d'entraînement" (résolution
// ex-PO-CV-03). A fixed, code-level list — NOT a table, NOT domain/ (it has
// no business meaning, it only feeds a select in this one form). Revisit as
// a real table only if this list starts changing with real-world frequency
// — not before (§7, "non bloquant").
//
// TODO: this is placeholder content — replace with this team's actual
// training venues before shipping. The spec deliberately doesn't source
// these values from anywhere (no referentiel), so there's nothing to copy
// from; ask the Bureau/coach for the real list.
export const TRAINING_LOCATIONS = [
  'Stade municipal — Terrain A',
  'Stade municipal — Terrain B',
  'Gymnase Jean Moulin',
] as const