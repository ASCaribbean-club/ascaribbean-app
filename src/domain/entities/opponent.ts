// specs/create-convocation.md §2, "Adversaire — référentiel" (PO-CV-02).
// Flat and global — a club's identity doesn't change across seasons, so this
// entity carries no seasonId/teamId. team_opponents (the season/category-
// scoped relation used to populate the "choose an opponent" selector) has no
// domain entity of its own yet — it's consumed through a repository method,
// not a first-class concept anywhere in the UI or business rules.
export interface Opponent {
  id: string
  name: string
}