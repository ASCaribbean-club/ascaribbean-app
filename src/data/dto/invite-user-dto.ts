// specs/web-users-invitation-links.md §2 — the request/response CONTRACT
// with the invite-user Edge Function (supabase/functions/invite-user/index.ts),
// mirrored manually on both sides (CLAUDE.md §7: never generated from one
// direction to the other). Not a table/view row (no `XxxRow`) and not a
// Postgres RPC return value either — an external-ish payload to a Deno
// function, hence `XxxDto` per CLAUDE.md §4. Three modes, one shape:
// 'create' uses fullName/email, 'reissue' and 'reset-password' both use
// userId — the function itself validates which fields a given mode
// actually needs.
export interface InviteUserRequestDto {
  mode: 'create' | 'reissue' | 'reset-password'
  fullName?: string
  email?: string
  age?: number | null
  handedness?: 'right' | 'left' | null
  userId?: string
}

// The function's success body — the app's own /activation URL, never
// Supabase's action_link (see the function's own top comment).
//
// specs/web-audit-logs.md — 2026-09-30 (fourth addendum) — `id` added,
// 'create' mode only: the newly created account's id, needed by
// InviteUserUseCase as its 'user.invited' audit targetId
// (domain/repositories/user-repository.ts's InvitationLink.userId). The
// function's 'reissue'/'reset-password' branches never set it (see their
// own JSON literals in supabase/functions/invite-user/index.ts, both left
// unchanged by this addendum).
export interface InviteUserResponseDto {
  url: string
  id?: string
}

// The function's JSON error body on a non-2xx response. `error` is a
// stable, machine-readable code — never the raw message a future
// refactor of the function's own wording could silently change underneath
// mapInviteFunctionError().
export type InviteUserErrorCode = 'unauthorized' | 'forbidden' | 'invalid_input' | 'already_registered' | 'target_not_active' | 'directory_insert_failed' | 'server_misconfigured'

export interface InviteUserErrorDto {
  error: InviteUserErrorCode | string
  message?: string
}
