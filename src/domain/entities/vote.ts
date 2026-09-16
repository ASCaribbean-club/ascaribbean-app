// specs/player-vote.md — new entity, net-new in this pass. Split into two
// shapes for the same reason AttendanceRecord/ConvocationResponse are kept
// separate entities (CLAUDE.md §6): a vote and its published tally answer
// different questions, and AC-PV-10 requires the second one to be
// STRUCTURALLY unable to carry a voter's identity, for any role.

// specs/player-vote.md PO-PV-02/AC-PV-16/PO-PV-03 — only the POSITIVE
// category exists (`vote_categories.id = 'man_of_the_match'`, seeded by
// supabase/migrations/20260916172217_vote_categories.sql, developer
// decision 2026-09-16). Modeled as a plain `string` rather than a literal
// union: the table is the source of truth for valid ids, domain/ doesn't
// re-encode its contents. Do not add a second literal/row for "carton rouge
// symbolique" — that category is REJECTED (PO-PV-02, final) and must not
// exist anywhere in this scaffold.
export type VoteCategoryId = string

// Reference data backing `vote_categories` — the label is a database value,
// not a hardcoded UI constant: `presentation/` resolves it through
// GetVoteCategoryUseCase/VoteCategoryRepository rather than duplicating the
// seeded row's text in TypeScript.
export interface VoteCategory {
  id: VoteCategoryId
  label: string
}

// Write-side, "current state" entity — mirrors AttendanceRecord/
// ConvocationResponse (CLAUDE.md §6, "Upsert-on-conflict, not
// insert-and-grow... for any current state table"): a vote is "who I'm
// voting for right now in this category", last-value-wins, not a log of
// every vote ever cast. Unique per (convocationId, categoryId, voterId) —
// AC-PV-04, enforced by a DB constraint once the migration is written
// (PO-PV-01 is resolved — nothing blocks writing it now), never re-derived
// here.
//
// `voterId` deliberately lives on THIS entity, not on VoteTally below —
// specs/player-vote.md §3, "L'anonymat annoncé... est un pseudonymat, pas un
// anonymat": the identity has to exist somewhere for AC-PV-04's uniqueness
// constraint and AC-PV-05's "changer mon vote" to work at all. It is never
// allowed to leak into the aggregate read path (see VoteTally).
export interface Vote {
  id: string
  convocationId: string
  categoryId: VoteCategoryId
  voterId: string
  candidateId: string
  // TODO: PO-PV-10b — is voting for yourself (candidateId === voterId)
  // permitted, excluded from the candidate list, or listed-but-disabled?
  // Not modeled here one way or the other; the UI design deliberately
  // renders a fully generic candidate list until this is decided.
  votedAt: string // ISO date
}

// AC-PV-10 — the ONLY shape the read path may ever return, for ANY role
// including coach and (if PO-PV-04 is ever resolved favorably) section
// manager: an aggregate, counts per candidate, no voter-identity column
// anywhere in the shape itself — not merely hidden by a component. Mirrors
// the `convocation_responders` view precedent (see
// docs/convocation_visibility_rls_correction.md §2.1): the privacy
// guarantee is structural, at the type/schema level, not a rendering
// choice.
export interface VoteCandidateTally {
  candidateId: string
  candidateDisplayName: string
  voteCount: number
}

export interface VoteTally {
  convocationId: string
  categoryId: VoteCategoryId
  candidates: VoteCandidateTally[]
  // TODO: PO-PV-10a — the denominator ("N joueuses" in "11 votes sur 14
  // joueuses") depends on which candidate set is authoritative (effectif,
  // convoquées, or présences constatées) — explicitly open, and explicitly
  // NOT to be answered by creating a `convocation_attendees` table
  // (specs/player-vote.md §5, "Ce qui reste explicitement OPEN").
  totalEligibleVoters: number
}

// TODO: PO-PV-01 is resolved (ASC Legacy attachment, decided 2026-09-16) —
// but the Legacy points grid itself is a SEPARATE, still-unresolved matter
// (CDC §8, "à valider par le Bureau avant développement"). Nothing in this
// file should grow a points/score/badge field: this entity is the data
// source Legacy may consume later, never the grid itself (AC-PV-15).
