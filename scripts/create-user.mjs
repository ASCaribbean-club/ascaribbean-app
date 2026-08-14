#!/usr/bin/env node
// Provisions one club member account: creates the auth.users row via
// Supabase's invite-by-email admin API, then upserts the matching
// public.users profile row.
//
// public.users has no INSERT policy for authenticated clients — account
// provisioning is explicitly left OPEN in
// supabase/migrations/20260811171754_initial_schema.sql. This script
// works around that with the service_role key instead of opening the
// policy, per CLAUDE.md §7 ("don't resolve a point explicitly marked OPEN").
//
// Invite emails currently go through Supabase's default email service —
// Brevo (docs/GOUVERNANCE.md §3, "Envoi des emails de l'application") isn't
// wired up as custom SMTP yet, so this only works at low volume for now.
//
// Usage (Node's --env-file loads .env, no dotenv dependency needed):
//   npm run create-user -- --email=joueur@example.fr --full-name="Prenom Nom"
//
// Replay-safe: re-running with the same --email recovers the existing
// auth user instead of failing once the invite has already been sent or
// accepted, and the public.users upsert only refreshes full_name — no
// duplicate rows, no duplicate invite emails.

import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    'full-name': { type: 'string' },
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

// Where the invite email's link lands — UpdatePasswordPage is the one screen
// that handles both "set your first password after an invite" and
// "complete a password reset" (see AuthRepository.updatePassword's doc
// comment in src/domain/repositories/auth-repository.ts).
const redirectTo = `${siteUrl}/update-password`

// service_role bypasses RLS entirely — this client only ever lives in this
// script, run locally by an admin. Never import it from src/.
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

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

  let userId
  const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  })

  if (invited?.user) {
    userId = invited.user.id
    console.log(`Invitation envoyee a ${email}.`)
  } else if (inviteError?.message.toLowerCase().includes('already registered')) {
    userId = await findExistingAuthUserId(email)
    if (!userId) throw inviteError
    console.log(`${email} a deja un compte auth — pas de nouvel email envoye.`)
  } else {
    throw inviteError
  }

  const { error: upsertError } = await supabase
    .from('users')
    .upsert({ id: userId, email, full_name: fullName }, { onConflict: 'id' })

  if (upsertError) throw upsertError

  console.log(`Profil public.users a jour pour ${email}.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
