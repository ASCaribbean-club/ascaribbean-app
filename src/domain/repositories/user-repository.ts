import type { Handedness, RoleAssignment, User } from '../entities/user'
import type { MissingElementFacts } from '../policies/user-completeness'

// specs/section-and-teams.md §2.11/PO-ST-12b — minimal shape for the
// `UTILISATEUR` dropdown in AssignCoachDialog: an id and a display name,
// nothing else of the account's own profile. PO-ST-12b (non-blocking,
// position taken here per the task's own instruction): "all users", not
// filtered by charter acceptance or active status — the export shows
// nothing to filter by, and neither concept has a settled definition yet.
// To confirm with the developer/Bureau before this dropdown is final.
export interface UserSummary {
  id: string
  fullName: string
  // specs/web-memberships.md §2.10/§4 — added for the /admin/memberships
  // edit row's "INFORMATIONS DU JOUEUR" panel (export payment-1), which
  // shows the account's e-mail alongside its name, both read-only: "donnée
  // du compte utilisateur, jamais écrite depuis cet écran". Additive field,
  // AssignCoachDialog (the other UserSummary consumer) simply ignores it.
  email: string
}

// specs/web-users.md §2.2/§2.10/AC-WU-11 — the admin directory read
// (/admin/users' own table), a DIFFERENT, richer shape than UserSummary
// above (AC-WU-20: distinct queryKey, never reused). `roles` stays
// RoleAssignment[] — ids only, no team/section NAME resolved here: §2.2
// explicitly allows "une composition de repositories" as one of three
// valid ways to resolve those labels, and this repository has no
// TeamRepository/SectionRepository dependency of its own (same
// interface-segregation reasoning as every other repository in this
// codebase never depending on a sibling one) — the ViewModel composes the
// label from the SAME teamsAdminList/sectionsAdminList reads
// useAssignCoachDialogViewModel already warms.
export interface AdminUserDirectoryEntry {
  id: string
  fullName: string
  email: string
  age: number | null
  handedness: Handedness | null
  charterAcceptedAt: Date | null
  roles: RoleAssignment[]
  // §2.2/§2.3 — the four completeness facts for THIS row, backing the
  // NOM cell's warning icon (AC-WU-16/AC-WU-37). Computed by the SAME
  // internal read findMissingElementFacts() below performs, never a second,
  // divergent computation (AC-WU-17).
  missingElementFacts: MissingElementFacts
}

// specs/web-users.md §2.3/§2.8/AC-WU-17 — the nav badge's own dedicated,
// LIGHT read: one entry per account, facts only, never the full directory
// above (with its role/label resolution) loaded and counted client-side.
export interface UserMissingElementFactsEntry {
  userId: string
  facts: MissingElementFacts
}

// specs/web-users.md §2.5 — InviteUserUseCase's payload to the Edge
// Function-backed invite() method below.
export interface InviteUserInput {
  fullName: string
  email: string
  age: number | null
  handedness: Handedness | null
}

// Fields an admin may write on public.users — full_name, age, handedness
// (see the column-level grant in 20260930172452_user_age_handedness.sql).
// Never email, never position/charter_accepted_at.
export interface UpdateUserProfileInput {
  fullName: string
  age: number | null
  handedness: Handedness | null
}

// specs/web-users-invitation-links.md §2 — what invite()/reissueInvitationLink()
// hand back: the app's own /activation URL (never Supabase's action_link,
// see the invite-user Edge Function's own comment on why), built from the
// hashed OTP token. Extended only if the function genuinely returns more —
// no speculative fields.
//
// specs/web-audit-logs.md — 2026-09-30 (fourth addendum) — `userId` added,
// populated by invite() ONLY: InviteUserUseCase needs the newly created
// account's id as its 'user.invited' audit targetId, and the Edge Function's
// 'create' branch is the only place that id is computed (see its own
// comment). reissueInvitationLink()/generatePasswordResetLink() never
// populate this field — the account they act on already exists, and its id
// is already known to their own caller's input (targetUserId/userId), so
// there's nothing new to hand back.
//
// A distinct `CreatedInvitationLink extends InvitationLink { userId: string }`
// type was considered instead of widening this one with an optional field —
// it would make invite()'s return type more honest (only the method that
// truly always returns an id would carry one). Rejected here: about two
// dozen existing test files across this codebase construct a fake
// `UserRepository.invite()` returning a bare `{ url }` as an unrelated
// stub (they exercise a different use case entirely and never assert on
// invite()'s own return value) — a required field would force every one of
// them to grow an unused `userId` just to keep satisfying the interface.
// An optional field on the existing type is the narrower change, and
// `userId?: string` costs reissueInvitationLink()/generatePasswordResetLink()
// nothing beyond a field they simply never populate — no caller of either
// reads it.
export interface InvitationLink {
  url: string
  userId?: string
}

export interface UserRepository {
  findById(id: string): Promise<User | null>
  // CDC §3.1 charter-acceptance gate — idempotent, see accept_charter() in
  // supabase/migrations/20260813075127_charter_acceptance.sql.
  acceptCharter(userId: string): Promise<void>

  // specs/section-and-teams.md §2.11/PO-ST-12b — admin-only directory read,
  // backed by the existing users_select_own policy's `or private.is_admin()`
  // branch (no new RLS policy, §2.11). Never called from a non-admin
  // screen — for any other caller RLS silently narrows this to their own
  // single row, same "no existence leak" shape as CoachRepository's admin
  // read.
  findAll(): Promise<UserSummary[]>

  // specs/web-users.md §2.2/§2.10/AC-WU-11/AC-WU-20 — /admin/users' own
  // table read. `currentSeasonId` is resolved by the CALLER (the
  // ViewModel, via SeasonRepository.findCurrent(), the same
  // seasonCurrent() queryKey useBackofficeMembershipsViewModel already
  // warms) rather than by this method itself, so the "what season is
  // current" resolution happens exactly once per screen, not once per
  // repository call. `null` means no season is current — §2.3's own repli
  // (criteria 2/3 both false, never an error).
  findAdminDirectory(currentSeasonId: string | null): Promise<AdminUserDirectoryEntry[]>

  // specs/web-users.md §2.3/§2.8/AC-WU-17 — backs
  // CountUsersRequiringAttentionUseCase's own dedicated, light read. Same
  // currentSeasonId contract as findAdminDirectory above.
  findMissingElementFacts(currentSeasonId: string | null): Promise<UserMissingElementFactsEntry[]>

  // specs/web-users.md §2.7/AC-WU-38 — UpdateUserUseCase is the
  // only caller. Writes full_name, age and handedness ONLY — backed by
  // users_update_admin, a policy structurally incapable of touching any
  // other column (§2.7, column-level `grant update`).
  updateProfile(userId: string, input: UpdateUserProfileInput): Promise<void>

  // specs/web-users-invitation-links.md §2/§4 (replaces the CDC §3.1
  // email-invitation flow — amendement du 2026-09-18) — InviteUserUseCase
  // is the only caller. Invokes the invite-user Edge Function
  // (supabase.functions.invoke, mode 'create') — the ONLY place in this
  // codebase's client-reachable code that talks to that function, and it
  // never sees a service_role key (that key lives exclusively inside the
  // function's own server-side environment). The public.users row this
  // creates is NOT returned here — a successful call still means "go
  // re-fetch the directory" for the row itself (same "invalidate, don't
  // thread the new row through" shape every other write in this screen
  // already uses); the activation link and the new account's `userId` are
  // what's threaded back to the caller — the link exists nowhere else to be
  // re-fetched from (it is never stored, §1.6), and `userId` is
  // InviteUserUseCase's own audit targetId (see InvitationLink's comment).
  invite(input: InviteUserInput): Promise<InvitationLink>

  // specs/web-users-invitation-links.md §2/§4 — ReissueInvitationLinkUseCase
  // is the only caller. Same Edge Function, mode 'reissue': a fresh link
  // for an EXISTING, still-'invited' auth user (no new public.users row,
  // no directory re-fetch needed — nothing in AdminUserDirectoryEntry
  // changes when a link is re-issued).
  reissueInvitationLink(userId: string): Promise<InvitationLink>

  // specs/web-users-invitation-links.md §2/§4 (amendement — password reset
  // is admin-mediated, not a member-triggered
  // supabase.auth.resetPasswordForEmail() email: same "no service_role key
  // reachable client-side" reasoning as invite()/reissueInvitationLink()
  // above, and the application still never sends mail itself).
  // GeneratePasswordResetLinkUseCase is the only caller. Same Edge
  // Function, mode 'reset-password': a fresh /update-password?type=recovery
  // link for an EXISTING, 'active' auth user — no public.users row change,
  // no directory re-fetch needed.
  generatePasswordResetLink(userId: string): Promise<InvitationLink>
}
