#!/usr/bin/env node
// Provisions one club member account: creates the auth.users row via
// Supabase's admin API (a generated link, never an email — same
// specs/web-users-invitation-links.md §1 amendement the invite-user Edge
// Function itself follows, mirrored here by hand since this script talks
// to Supabase directly with its own service_role client rather than
// through that function), then upserts the matching public.users profile
// row.
//
// public.users has no INSERT policy for authenticated clients — account
// provisioning is explicitly left OPEN in
// supabase/migrations/20260811171754_initial_schema.sql. This script
// works around that with the service_role key instead of opening the
// policy, per CLAUDE.md §7 ("don't resolve a point explicitly marked OPEN").
//
// Prints the /activation link to the terminal — copy it and send it to the
// member yourself (WhatsApp/SMS/in person), same as the admin UI's own
// Copier/Partager. Nothing is emailed; this script never logs it anywhere
// but stdout, and doesn't store it.
//
// Usage (Node's --env-file loads .env, no dotenv dependency needed):
//   npm run create-user -- --email=joueur@example.fr --full-name="Prenom Nom"
//
// Optional role/team/section/season provisioning (see scripts/lib/provision-role.mjs
// for the exact flag rules — they mirror the user_roles_scope_check CHECK
// constraint). Section/season/team are created on the fly if they don't exist yet:
//   npm run create-user -- --email=coach@example.fr --full-name="Prenom Nom" \
//     --role=coach --team="U15,U17" --section="Football" --section-type=football \
//     --season="2026-2027" --season-start=2026-08-01 --season-end=2027-06-30
//
// Replay-safe: re-running with the same --email recovers the existing auth
// user and generates a FRESH link for it instead of failing (see this
// file's own top comment on why a fresh link — the exact same "reissue"
// case the admin UI's row action covers, generateLink({type:'magiclink'})
// rather than {type:'invite'}, which only works for a brand-new user), the
// public.users upsert only refreshes full_name — no duplicate rows — and
// re-running with the same --role/--team/--section never creates duplicate
// user_roles rows.

import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { assignRole, resolveRoleContext } from './lib/provision-role.mjs'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    'full-name': { type: 'string' },
    role: { type: 'string' },
    team: { type: 'string' },
    section: { type: 'string' },
    'section-type': { type: 'string' },
    season: { type: 'string' },
    'season-start': { type: 'string' },
    'season-end': { type: 'string' },
  },
})

if (!values.email || !values['full-name']) {
  console.error('Usage: npm run create-user -- --email=... --full-name="..."')
  process.exit(1)
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const siteUrl = process.env.SITE_URL

if (!supabaseUrl || !serviceRoleKey || !siteUrl) {
  console.error('VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et SITE_URL sont requis dans .env')
  process.exit(1)
}

// service_role bypasses RLS entirely — this client only ever lives in this
// script, run locally by an admin. Never import it from src/.
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Mirrors src/presentation/features/backoffice/users/invitation-message.ts's
// INVITE_LINK_VALIDITY_HOURS by hand (CLAUDE.md §7 — this plain .mjs script
// has no build step to import a TS file from src/ through). Keep both in
// sync manually if either changes.
const INVITE_LINK_VALIDITY_HOURS_REMINDER = 5

// Mirrors the invite-user Edge Function's own buildActivationUrl() by hand
// (CLAUDE.md §7) — the app's own /activation URL, built from the hashed
// token, never Supabase's action_link (same link-preview-consumption risk
// that function's own comment explains, relevant here too since the link
// is meant to be pasted into WhatsApp/SMS, not emailed).
function buildActivationUrl(hashedToken, type, name) {
  const url = new URL('/activation', siteUrl)
  url.searchParams.set('token_hash', hashedToken)
  url.searchParams.set('type', type)
  if (name) url.searchParams.set('name', name)
  return url.toString()
}

// supabase-js has no "get user by email" admin call — page through
// listUsers instead. Fine at club scale (a handful of accounts).
async function findExistingAuthUserId(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  return data.users.find((user) => user.email === email)?.id ?? null
}

async function main() {
  const email = values.email
  const fullName = values['full-name']

  // Resolve before touching auth.users: fail fast on a missing --team/--section
  // flag rather than sending an invite for an account with no role assigned.
  const roleContext = await resolveRoleContext(supabase, values.role, values)

  let userId
  let activationUrl
  const { data: invited, error: inviteError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: { full_name: fullName } },
  })

  if (invited?.user && invited.properties?.hashed_token) {
    userId = invited.user.id
    activationUrl = buildActivationUrl(invited.properties.hashed_token, 'invite', fullName)
  } else if (inviteError?.message.toLowerCase().includes('already registered')) {
    userId = await findExistingAuthUserId(email)
    if (!userId) throw inviteError
    // Same "existing, not yet confirmed user" case the admin UI's row
    // action covers — 'invite' only works for a brand-new auth user.
    const { data: reissued, error: reissueError } = await supabase.auth.admin.generateLink({ type: 'magiclink', email })
    if (reissueError || !reissued?.properties?.hashed_token) throw reissueError ?? new Error('generateLink failed.')
    // Reuses the --full-name this run was called with rather than reading
    // it back from public.users (unlike the Edge Function's reissue
    // branch, which has no --full-name flag of its own to fall back on).
    activationUrl = buildActivationUrl(reissued.properties.hashed_token, 'magiclink', fullName)
  } else {
    throw inviteError
  }

  const { error: upsertError } = await supabase
    .from('users')
    .upsert({ id: userId, email, full_name: fullName }, { onConflict: 'id' })

  if (upsertError) throw upsertError

  console.log(`Profil public.users a jour pour ${email}.`)

  if (values.role) {
    await assignRole(supabase, userId, values.role, roleContext)
  }

  console.log(`\nLien d'activation pour ${fullName} <${email}> :\n${activationUrl}\n`)
  console.log(`Personnel, valable ${INVITE_LINK_VALIDITY_HOURS_REMINDER}h — envoyez-le vous-meme (WhatsApp/SMS/en personne).`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
