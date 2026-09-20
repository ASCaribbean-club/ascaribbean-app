// specs/web-users.md §2.5 (PO-WU-01 résolu) — the FIRST Edge Function in
// this repo (supabase/functions/ previously held only a .gitkeep). Does
// exactly three things, in this order, and nothing else:
//
//   1. Verifies the CALLER is an authenticated administrator, from their
//      OWN JWT (the `Authorization` header supabase.functions.invoke()
//      forwards) — an `anon`-key client scoped to THAT session, reading
//      user_roles under RLS exactly as the caller would directly
//      (user_roles_select_own already lets a session read its own rows,
//      supabase/migrations/20260811171754_initial_schema.sql). NEVER a
//      client-supplied `isAdmin` flag — the caller proves it, it doesn't
//      declare it (AC-WU-32).
//   2. Calls `auth.admin.inviteUserByEmail()` with a `service_role` client
//      built HERE, from this function's own server-side environment. This
//      is the ONLY place in the whole codebase that reads
//      `SUPABASE_SERVICE_ROLE_KEY` (CLAUDE.md §7, AC-WU-03) — never a
//      `VITE_`-prefixed variable, never imported by `presentation/` or
//      `data/`.
//   3. Inserts the `public.users` row itself (`id` from the invite,
//      `full_name`/`email` as submitted, `charter_accepted_at` null) — the
//      `service_role` client bypasses RLS, which is precisely why no
//      `INSERT` policy is ever opened on `public.users` for `authenticated`
//      (AC-WU-04). The row is created at SEND time, not at acceptance
//      (§2.5's own "c'est l'affichage qui fait foi") — `charter_accepted_at`
//      staying null is exactly what makes the row render "Invité" the
//      instant the caller's cache is invalidated (AC-WU-33).
//
// Request/response contract mirrored BY HAND (never generated, CLAUDE.md
// §7) with src/data/dto/invite-user-dto.ts — keep the two files in sync
// manually if either changes.

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mirrors InviteUserErrorDto/InviteUserErrorCode in
// src/data/dto/invite-user-dto.ts.
type InviteUserErrorCode = 'unauthorized' | 'forbidden' | 'invalid_input' | 'already_registered' | 'directory_insert_failed'

interface InviteUserRequestBody {
  fullName?: unknown
  email?: unknown
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
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    // Deployment/config issue, never reachable in a correctly configured
    // project — fails closed rather than proceeding without one of the two
    // clients this function needs.
    return errorResponse('unauthorized', 'This function is missing its Supabase environment configuration.', 500)
  }

  // §2.5 point 1 / AC-WU-32 — the caller's own JWT, forwarded by
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
    // invitation sent.
    return errorResponse('forbidden', 'Only an administrator can invite an account.', 403)
  }

  let body: InviteUserRequestBody
  try {
    body = await request.json()
  } catch {
    return errorResponse('invalid_input', 'Malformed JSON body.', 400)
  }

  // Defence in depth only — InviteUserUseCase already validates both fields
  // before this call is ever made (§2.5).
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!fullName || !email) {
    return errorResponse('invalid_input', 'fullName and email are required.', 400)
  }

  // §2.5 point 2 — the ONLY place in this codebase that reads
  // SUPABASE_SERVICE_ROLE_KEY, built HERE from this function's own
  // server-side environment (AC-WU-03).
  const serviceRoleClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: invited, error: inviteError } = await serviceRoleClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  })

  if (inviteError || !invited?.user) {
    // AC-WU-34 — "adresse déjà invitée ou déjà inscrite" is what Supabase
    // Auth itself distinguishes least reliably across versions, so it's
    // matched on the returned message rather than a status code.
    const alreadyRegistered = /already.*(registered|exists|been invited)/i.test(inviteError?.message ?? '')
    if (alreadyRegistered) {
      return errorResponse('already_registered', inviteError?.message ?? 'This email is already invited or registered.', 409)
    }
    return jsonResponse({ error: 'invite_failed', message: inviteError?.message ?? 'inviteUserByEmail failed.' }, 502)
  }

  // §2.5 point 3 / AC-WU-04 — the row is created HERE, at send time.
  const { error: insertError } = await serviceRoleClient.from('users').insert({
    id: invited.user.id,
    full_name: fullName,
    email,
    charter_accepted_at: null,
  })

  if (insertError) {
    // AC-WU-34 — the invitation itself already went out; the caller must
    // learn this SPECIFIC failure, never a generic one that would let an
    // administrator believe the account was fully created.
    return errorResponse('directory_insert_failed', insertError.message, 502)
  }

  return jsonResponse({ id: invited.user.id }, 200)
})
