#!/usr/bin/env node
// Dev-only helper: creates (or resets) an already-confirmed member account with
// a password you choose, and connects it straight away — no invite email, so
// none of this touches Supabase's 2-emails/hour built-in quota (see
// create-user.mjs's header comment). Never use this for real member
// onboarding: it skips email verification entirely. Use create-user.mjs for
// that — this script exists purely to keep testing the app locally after
// you've already exercised the real invite/update-password flow once.
//
// Usage (Node's --env-file loads .env, no dotenv dependency needed):
//   npm run create-user-directly -- --email=joueur@example.fr --password=... [--full-name="Prenom Nom"]
//
// Replay-safe: re-running with the same --email resets the existing user's
// password instead of failing.

import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    'full-name': { type: 'string' },
  },
})

if (!values.email || !values.password) {
  console.error('Usage: npm run create-user-directly -- --email=... --password=... [--full-name="..."]')
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
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
