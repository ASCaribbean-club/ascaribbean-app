import type { Membership } from '../entities/membership'

// specs/profile-page.md, 2026-09-04 addendum — resolves PO-PR-06. Scoped to
// (userId, seasonId) rather than just userId: `memberships` has no unique
// constraint on user_id (a member can carry one row per season over time),
// so "the" membership is meaningless without pinning a season — mirrors how
// TeamRepository already resolves teams against the current season rather
// than trusting a bare id lookup.
//
// specs/web-memberships.md §2.10 — "Une seule interface par ressource" — the
// admin read/write methods are added HERE, not on a separate
// BackofficeMembershipRepository (same position as NewsRepository/
// SeasonRepository/TeamRepository). findForUserAndSeason() keeps its exact
// signature and behaviour (AC-WM-17/AC-WM-28), with one deliberate
// narrowing: it now excludes archived rows (§2.5) so the mobile profile
// screen never surfaces one.
export interface MembershipRepository {
  findForUserAndSeason(userId: string, seasonId: string): Promise<Membership | null>

  // specs/web-memberships.md §2.10/AC-WM-19 — the /admin/memberships admin
  // list. No `now`/season parameter: unlike TeamRepository.findByIds, this
  // read applies NO season filter (the screen's own SAISON filter is
  // client-side, §2.6b/UI design) — it excludes archived rows only (§2.5).
  findAllForAdmin(): Promise<Membership[]>

  // specs/web-memberships.md §2.7/PO-WM-03 — resolves whether an ARCHIVED
  // membership already exists for this (user, season) pair, so
  // CreateMembershipUseCase can apply the "recreate after archive" rule
  // without a second, redundant read of every membership. Returns null both
  // when no membership exists at all for this pair, AND when a LIVE one
  // does (only archived rows match) — the partial unique index
  // (memberships_user_season_active_idx) already guarantees at most one of
  // those exists at a time.
  findArchivedForUserAndSeason(userId: string, seasonId: string): Promise<Membership | null>

  // CreateMembershipUseCase is the only caller (AC-WM-14/AC-WM-31). Throws
  // DuplicateMembershipError if a LIVE row already exists for this
  // (user, season) pair (memberships_user_season_active_idx) — this method
  // never pre-checks that itself (TOCTOU, same reasoning as
  // SeasonRepository.create() and its overlap constraint).
  create(input: CreateMembershipInput): Promise<Membership>

  // UpdateMembershipUseCase is the only caller. Targets the SAME row
  // (AC-WM-26) — no "which rows are modifiable" restriction (§2.9).
  update(id: string, input: UpdateMembershipInput): Promise<Membership>

  // specs/web-memberships.md §2.7/PO-WM-03 — the ONLY implemented reading of
  // "remplacer" (R1: desarchive the existing row and overwrite it in place),
  // reserved for the case where the archived row carries NO payments yet
  // (CreateMembershipUseCase checks this before calling). Sets
  // archived_at/archived_by back to null in the same write as the new
  // field values — single row, same id, never a second insert.
  replaceArchived(id: string, input: CreateMembershipInput): Promise<Membership>

  // ArchiveMembershipUseCase is the only caller. Sets archived_at/archived_by
  // — never a DELETE (§2.5, AC-WM-05: no delete policy exists on this table).
  archive(id: string, actorId: string): Promise<Membership>

  // specs/web-memberships.md §2.8 — backs the nav badge's dedicated, LIGHT
  // read (never the full admin list, loaded and counted client-side). Counts
  // 'pending'-status, non-archived memberships for one season — see
  // CountMembershipsRequiringAttentionUseCase's own comment on why this
  // reading of "à traiter" was picked over the alternative "not fully paid"
  // one (PO-WM-06 — still open after the 2026-09-17 amendment, which
  // resolved PO-WM-01, a separate point).
  countPendingForSeason(seasonId: string): Promise<number>
}

// Mirrors the entity minus what the database always derives itself (id).
export type CreateMembershipInput = Omit<Membership, 'id'>

// Same fields as CreateMembershipInput — a membership has nothing else to
// update (§2.1, no audit columns exist yet on this table, PO-WM-10).
export type UpdateMembershipInput = Omit<Membership, 'id'>
