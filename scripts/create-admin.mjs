#!/usr/bin/env node
// Dev-only helper: creates (or resets) an admin account for testing the
// backoffice (specs/web-empty-state.md) — same no-invite-email mechanics as
// create-user-directly.mjs, with --role=admin hardcoded so you don't have to
// pass it. Admin is club-wide (see provision-role.mjs's CLUB_WIDE_ROLES), so
// there's no --team/--section/--season to resolve.
//
// Usage (Node's --env-file loads .env, no dotenv dependency needed):
//   npm run create-admin -- --email=admin@example.fr --password=... [--full-name="Prenom Nom"]
//
// Replay-safe: re-running with the same --email resets the existing user's
// password instead of failing; re-running never creates a duplicate
// user_roles row.

import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { assignRole } from './lib/provision-role.mjs'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    'full-name': { type: 'string' },
  },
})

if (!values.email || !values.password) {
  console.error('Usage: npm run create-admin -- --email=... --password=... [--full-name="..."]')
  process.exit(1)
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env')
  process.exit(1)
}

// service_role bypasses RLS entirely — this client only ever lives in this
// script, run locally by an admin. Never import it from src/.
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findExistingAuthUserId(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  return data.users.find((user) => user.email === email)?.id ?? null
}

async function main() {
  const email = values.email
  const password = values.password
  const fullName = values['full-name'] ?? email.split('@')[0]

  let userId
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (created?.user) {
    userId = created.user.id
    console.log(`Compte cree pour ${email}.`)
  } else if (createError?.message.toLowerCase().includes('already been registered')) {
    userId = await findExistingAuthUserId(email)
    if (!userId) throw createError
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password })
    if (updateError) throw updateError
    console.log(`${email} avait deja un compte — mot de passe reinitialise.`)
  } else {
    throw createError
  }

  const { error: upsertError } = await supabase
    .from('users')
    .upsert({ id: userId, email, full_name: fullName }, { onConflict: 'id' })

  if (upsertError) throw upsertError

  console.log(`Profil public.users a jour pour ${email}. Connexion possible avec ce mot de passe.`)

  await assignRole(supabase, userId, 'admin', {})
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
