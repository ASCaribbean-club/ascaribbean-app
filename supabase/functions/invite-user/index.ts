// specs/web-users-invitation-links.md §1 (amendement du 2026-09-18,
// remplace l'envoi d'e-mail — CDC §3.1 "par courriel ou lien sécurisé", la
// première branche retirée) — extends the original invite-user function
// rather than adding a second one. Does exactly four things, in this
// order, and nothing else:
//
//   1. Verifies the CALLER is an authenticated administrator, from their
//      OWN JWT (the `Authorization` header supabase.functions.invoke()
//      forwards) — an `anon`-key client scoped to THAT session, reading
//      user_roles under RLS exactly as the caller would directly
//      (user_roles_select_own already lets a session read its own rows,
//      supabase/migrations/20260811171754_initial_schema.sql). NEVER a
//      client-supplied `isAdmin` flag — the caller proves it, it doesn't
//      declare it (AC-WU-32).
//   2. Depending on `mode`:
//      - 'create': calls `auth.admin.generateLink({ type: 'invite', ... })`
//        with a `service_role` client built HERE, from this function's own
//        server-side environment. This is the ONLY place in the whole
//        codebase that reads `SUPABASE_SERVICE_ROLE_KEY` (CLAUDE.md §7,
//        AC-WU-03) — never a `VITE_`-prefixed variable, never imported by
//        `presentation/` or `data/`.
//      - 'reissue': calls `generateLink({ type: 'magiclink', ... })` for an
//        EXISTING user (already created by a prior 'create' call, still
//        unconfirmed) — 'invite' itself is documented to create a NEW auth
//        user and was not verified against a live project to also accept
//        an existing one (no local Supabase stack was available to test
//        this — Docker was not running); 'magiclink' is Supabase's own
//        documented mechanism for generating a sign-in link for "a new or
//        existing" email — the exact same "existing, not yet confirmed"
//        case. Flagged here rather than silently assumed: confirm this
//        against the real project before depending on it operationally.
//      - 'reset-password' (amendement — replaces a member-triggered
//        `resetPasswordForEmail()`, same reasoning as the original
//        email-invitation removal above): calls
//        `generateLink({ type: 'recovery', ... })` for an EXISTING,
//        'active' user. Never sends mail itself — same as every other mode
//        here, the admin shares the returned URL manually.
//   3. 'create' only: inserts the `public.users` row itself (`id` from the
//      generated link, `full_name`/`email` as submitted,
//      `charter_accepted_at` null) — the `service_role` client bypasses
//      RLS, which is precisely why no `INSERT` policy is ever opened on
//      `public.users` for `authenticated` (AC-WU-04). The row is created
//      at GENERATE time, not at acceptance (§2's own "c'est l'affichage
//      qui fait foi") — `charter_accepted_at` staying null is exactly what
//      makes the row render "Invité" the instant the caller's cache is
//      invalidated (AC-WU-33). 'reissue'/'reset-password' touch no row: the
//      account already exists, nothing about it changes.
//   4. Builds and returns the app's OWN /activation or /update-password URL
//      (mode-dependent), built from `data.properties.hashed_token` — NEVER
//      Supabase's own `action_link`. A messaging app (WhatsApp, SMS,
//      iMessage…) fetches a URL to build a link preview before the member
//      ever taps it; `action_link` performs the OTP verification on that
//      plain GET, so the preview fetch alone would burn the single-use
//      token before the member sees the link. An app URL only serves
//      static HTML (index.html's own <meta property="og:*"> tags) to the
//      preview crawler — the token itself is only consumed when the member
//      taps "Activer mon compte"/"Réinitialiser mon mot de passe", which
//      calls verifyOtp() explicitly (§5).
//
// Request/response contract mirrored BY HAND (never generated, CLAUDE.md
// §7) with src/data/dto/invite-user-dto.ts — keep the two files in sync
// manually if either changes. Never logs the link or token, never stores
// it in a table (§1.6).

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mirrors InviteUserErrorDto/InviteUserErrorCode in
// src/data/dto/invite-user-dto.ts.
type InviteUserErrorCode = 'unauthorized' | 'forbidden' | 'invalid_input' | 'already_registered' | 'target_not_active' | 'directory_insert_failed' | 'server_misconfigured'

interface InviteUserRequestBody {
  mode?: unknown
  fullName?: unknown
  email?: unknown
  userId?: unknown
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function errorResponse(error: InviteUserErrorCode, message: string, status: number): Response {
  return jsonResponse({ error, message }, status)
}

// §1.4 — the app's own /activation URL, built from the hashed token.
// SITE_URL is this function's own secret (the deployed app's origin, same
// variable name/purpose scripts/create-user.mjs already reads from .env for
// its own redirectTo, .env.example — but set here as a Supabase Edge
// Function secret, `supabase secrets set SITE_URL=...`, since a deployed
// function never reads this repo's local .env), distinct from SUPABASE_URL.
//
// `name` is DISPLAY ONLY — ActivationPage shows it before the member taps
// "Activer mon compte" so they can confirm the link is really theirs (the
// page still never verifies on load, §5 point 1: this is just text read
// straight from the URL, no auth.verifyOtp() call). Safe to carry in the
// URL: it adds no capability beyond the token_hash that's already there,
// and the shared message text already puts the same name next to the link
// in plain sight.
function buildActivationUrl(siteUrl: string, hashedToken: string, type: 'invite' | 'magiclink', name: string): string {
  const url = new URL('/activation', siteUrl)
  url.searchParams.set('token_hash', hashedToken)
  url.searchParams.set('type', type)
  if (name) url.searchParams.set('name', name)
  return url.toString()
}

// specs/web-users-invitation-links.md §5 (amendement — password reset is
// admin-mediated, not a member-triggered email) — the app's own
// /update-password URL, same reasoning as buildActivationUrl above: no
// `name` param (UpdatePasswordPage shows none, the admin's own dialog
// already has the target's fullName for its Copier/Partager message).
function buildRecoveryUrl(siteUrl: string, hashedToken: string): string {
  const url = new URL('/update-password', siteUrl)
  url.searchParams.set('token_hash', hashedToken)
  url.searchParams.set('type', 'recovery')
  return url.toString()
}

Deno.serve(async (request: Request) => {
  // Browser preflight — supabase.functions.invoke() sends a custom
  // Authorization/apikey header, which triggers one.
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (request.method !== 'POST') {
    return errorResponse('invalid_input', 'This function only accepts POST.', 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const siteUrl = Deno.env.get('SITE_URL')
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !siteUrl) {
    // Deployment/config issue, never reachable in a correctly configured
    // project — fails closed rather than proceeding without everything
    // this function needs. A DISTINCT code from 'unauthorized' (a real
    // caller-side auth failure): the two used to share a code and a caller
    // whose SITE_URL secret simply wasn't set yet saw "Vous n'êtes plus
    // autorisé à effectuer cette action" — a misleading permissions
    // message for what is actually a deployment problem the caller can't
    // fix by re-authenticating.
    return errorResponse('server_misconfigured', 'This function is missing its environment configuration.', 500)
  }

  // §1 point 1 / AC-WU-32 — the caller's own JWT, forwarded by
  // supabase.functions.invoke() as the Authorization header. An `anon`-key
  // client scoped to THIS session (never service_role) so every read below
  // goes through RLS exactly as it would for the caller directly.
  const authorization = request.headers.get('Authorization')
  if (!authorization) {
    return errorResponse('unauthorized', 'Missing Authorization header.', 401)
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser()

  if (callerError || !caller) {
    return errorResponse('unauthorized', 'Invalid or expired session.', 401)
  }

  const { data: callerRoles, error: rolesError } = await callerClient.from('user_roles').select('role').eq('user_id', caller.id)

  if (rolesError) {
    return errorResponse('unauthorized', 'Could not verify the caller’s roles.', 401)
  }

  const isCallerAdmin = (callerRoles ?? []).some((row: { role: string }) => row.role === 'admin')
  if (!isCallerAdmin) {
    // AC-WU-32 — refused before the service_role client is ever built, no
    // link generated.
    return errorResponse('forbidden', 'Only an administrator can invite an account.', 403)
  }

  let body: InviteUserRequestBody
  try {
    body = await request.json()
  } catch {
    return errorResponse('invalid_input', 'Malformed JSON body.', 400)
  }

  const mode = body.mode === 'reissue' ? 'reissue' : body.mode === 'reset-password' ? 'reset-password' : 'create'

  // §1 point 2 — the ONLY place in this codebase that reads
  // SUPABASE_SERVICE_ROLE_KEY, built HERE from this function's own
  // server-side environment (AC-WU-03).
  const serviceRoleClient = createClient(supabaseUrl, serviceRoleKey)

  if (mode === 'reissue') {
    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
    if (!userId) {
      return errorResponse('invalid_input', 'userId is required.', 400)
    }

    const { data: targetUser, error: targetUserError } = await serviceRoleClient.auth.admin.getUserById(userId)
    if (targetUserError || !targetUser?.user?.email) {
      return errorResponse('invalid_input', 'No such user, or the user has no email.', 400)
    }

    // For the activation page's own display-only name (buildActivationUrl's
    // own comment) — public.users, not auth user_metadata: it's the same
    // full_name the admin UI's own row already shows, and it's guaranteed
    // to exist for any account this action can even target (created at
    // 'create' time, §1 point 3).
    const { data: profileRow } = await serviceRoleClient.from('users').select('full_name').eq('id', userId).single()

    // See this file's own top comment — 'magiclink', not 'invite': 'invite'
    // creates a NEW auth user and was not verified to also accept an
    // existing, unconfirmed one.
    const { data: reissued, error: reissueError } = await serviceRoleClient.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.user.email,
    })

    if (reissueError || !reissued?.properties?.hashed_token) {
      return jsonResponse({ error: 'invite_failed', message: reissueError?.message ?? 'generateLink failed.' }, 502)
    }

    return jsonResponse({ url: buildActivationUrl(siteUrl, reissued.properties.hashed_token, 'magiclink', profileRow?.full_name ?? '') }, 200)
  }

  if (mode === 'reset-password') {
    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
    if (!userId) {
      return errorResponse('invalid_input', 'userId is required.', 400)
    }

    const { data: targetUser, error: targetUserError } = await serviceRoleClient.auth.admin.getUserById(userId)
    if (targetUserError || !targetUser?.user?.email) {
      return errorResponse('invalid_input', 'No such user, or the user has no email.', 400)
    }

    // Server-side mirror of GeneratePasswordResetLinkUseCase's own 'active'
    // guard — CLAUDE.md §6 "la policy front n'est jamais la sécurité"
    // applies here to this function's own service_role boundary exactly as
    // it does to RLS elsewhere: a caller with a valid admin JWT hitting
    // this function directly (bypassing the use case) must not be able to
    // generate a recovery link for a still-'invited' account, which has no
    // password yet and never went through the charter-acceptance-gated
    // /activation flow.
    const { data: targetProfile } = await serviceRoleClient.from('users').select('charter_accepted_at').eq('id', userId).single()
    if (!targetProfile?.charter_accepted_at) {
      return errorResponse('target_not_active', 'This account has not activated its access yet.', 409)
    }

    const { data: recovery, error: recoveryError } = await serviceRoleClient.auth.admin.generateLink({
      type: 'recovery',
      email: targetUser.user.email,
    })

    if (recoveryError || !recovery?.properties?.hashed_token) {
      return jsonResponse({ error: 'invite_failed', message: recoveryError?.message ?? 'generateLink failed.' }, 502)
    }

    return jsonResponse({ url: buildRecoveryUrl(siteUrl, recovery.properties.hashed_token) }, 200)
  }

  // Defence in depth only — InviteUserUseCase already validates both
  // fields before this call is ever made (§2).
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!fullName || !email) {
    return errorResponse('invalid_input', 'fullName and email are required.', 400)
  }

  const { data: invited, error: inviteError } = await serviceRoleClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: { full_name: fullName } },
  })

  if (inviteError || !invited?.user || !invited.properties?.hashed_token) {
    // AC-WU-34 — "adresse déjà invitée ou déjà inscrite" is what Supabase
    // Auth itself distinguishes least reliably across versions, so it's
    // matched on the returned message rather than a status code.
    const alreadyRegistered = /already.*(registered|exists|been invited)/i.test(inviteError?.message ?? '')
    if (alreadyRegistered) {
      return errorResponse('already_registered', inviteError?.message ?? 'This email is already invited or registered.', 409)
    }
    return jsonResponse({ error: 'invite_failed', message: inviteError?.message ?? 'generateLink failed.' }, 502)
  }

  // §1 point 3 / AC-WU-04 — the row is created HERE, at generate time.
  const { error: insertError } = await serviceRoleClient.from('users').insert({
    id: invited.user.id,
    full_name: fullName,
    email,
    charter_accepted_at: null,
  })

  if (insertError) {
    // AC-WU-34 — the auth user itself already exists; the caller must
    // learn this SPECIFIC failure, never a generic one that would let an
    // administrator believe the account was fully created.
    return errorResponse('directory_insert_failed', insertError.message, 502)
  }

  // TODO(audit): CDC §11.3 names "création de compte" as a business action
  // to trace (domain/, per ARCHITECTURE.md §11) — no audit
  // table/repository/write path exists anywhere in this codebase yet
  // (PO-WU-07, still open). Not added here: this function has no business
  // knowing about that infrastructure any more than InviteUserUseCase
  // does — same gap, flagged at both ends.

  return jsonResponse({ url: buildActivationUrl(siteUrl, invited.properties.hashed_token, 'invite', fullName) }, 200)
})
