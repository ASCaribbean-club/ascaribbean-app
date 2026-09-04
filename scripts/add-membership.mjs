#!/usr/bin/env node
// Provisions or updates one member's membership row for a season
// (public.memberships — see domain/entities/membership.ts).
//
// memberships has no unique constraint on user_id (a member can carry one
// row per season over time, see MembershipRepository's doc comment in
// src/domain/repositories/membership-repository.ts) — so replay safety
// here is done by hand: look up the existing (user_id, season_id) row and
// update it instead of inserting a duplicate.
//
// public.memberships has no client-facing INSERT/UPDATE policy yet (RLS
// there is a "best-effort self-row guess pending a real spec", per
// supabase/migrations/20260811171754_initial_schema.sql), so this uses the
// service_role key to bypass RLS, same as the rest of scripts/.
//
// Usage (Node's --env-file loads .env, no dotenv dependency needed):
//   npm run add-membership -- --email=joueur@example.fr --season="2026-2027" \
//     --status=active --valid-until=2027-06-30 [--licence-number=1234567]
//
// The season must already exist (npm run create-user already resolves/creates
// one) unless you pass --season-start/--season-end to create it on the fly:
//   npm run add-membership -- --email=joueur@example.fr --season="2026-2027" \
//     --season-start=2026-08-01 --season-end=2027-06-30 --status=pending \
//     --valid-until=2027-06-30

import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'

const MEMBERSHIP_STATUSES = ['pending', 'active', 'suspended'] // domain/entities/membership.ts MembershipStatus

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    season: { type: 'string' },
    'season-start': { type: 'string' },
    'season-end': { type: 'string' },
    status: { type: 'string' },
    'valid-until': { type: 'string' },
    'licence-number': { type: 'string' },
  },
})

if (!values.email || !values.season || !values.status || !values['valid-until']) {
  console.error(
    'Usage: npm run add-membership -- --email=... --season="..." --status=pending|active|suspended --valid-until=YYYY-MM-DD [--licence-number=...]',
  )
  process.exit(1)
}

if (!MEMBERSHIP_STATUSES.includes(values.status)) {
  console.error(`--status doit etre l'un de: ${MEMBERSHIP_STATUSES.join(', ')}`)
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

async function findUserByEmail(email) {
  const { data, error } = await supabase.from('users').select('id, full_name').eq('email', email).maybeSingle()
  if (error) throw error
  if (!data) {
    throw new Error(`Aucun compte public.users pour "${email}" — creez-le d'abord avec create-user(-directly).`)
  }
  return data
}

async function findOrCreateSeason(label, startDate, endDate) {
  const { data: existing, error: findError } = await supabase
    .from('seasons')
    .select('id')
    .eq('label', label)
    .maybeSingle()
  if (findError) throw findError
  if (existing) return existing.id

  if (!startDate || !endDate) {
    throw new Error(
      `La saison "${label}" n'existe pas encore — ajoutez --season-start et --season-end pour la creer.`,
    )
  }

  const { data, error } = await supabase
    .from('seasons')
    .insert({ label, start_date: startDate, end_date: endDate })
    .select('id')
    .single()
  if (error) throw error
  console.log(`Saison "${label}" creee.`)
  return data.id
}

async function upsertMembership(userId, seasonId, fields) {
  const { data: existing, error: findError } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('season_id', seasonId)
    .maybeSingle()
  if (findError) throw findError

  if (existing) {
    const { error } = await supabase.from('memberships').update(fields).eq('id', existing.id)
    if (error) throw error
    console.log(`Membership existante mise a jour (${existing.id}).`)
    return
  }

  const { data, error } = await supabase
    .from('memberships')
    .insert({ user_id: userId, season_id: seasonId, ...fields })
    .select('id')
    .single()
  if (error) throw error
  console.log(`Membership creee (${data.id}).`)
}

async function main() {
  const user = await findUserByEmail(values.email)
  const seasonId = await findOrCreateSeason(values.season, values['season-start'], values['season-end'])

  await upsertMembership(user.id, seasonId, {
    status: values.status,
    valid_until: values['valid-until'],
    licence_number: values['licence-number'] ?? null,
  })

  console.log(`\n✓ Membership "${values.status}" pour ${user.full_name} (${values.email}), saison "${values.season}".`)
}

main().catch((error) => {
  console.error(`\n✗ Erreur: ${error.message}`)
  process.exit(1)
})
