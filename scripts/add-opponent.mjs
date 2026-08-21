#!/usr/bin/env node
// Provisions an opponent and links it to a team (team_opponents).
//
// Opponent creation is provisionally admin-only (see DEFAULTS-A-CHALLENGER.md,
// "Autorisation de création d'un opponents"), so this script uses the
// service_role key to bypass RLS policies.
//
// Replay-safe: re-running with the same --opponent/--team combination is
// idempotent — the unique(team_id, opponent_id) constraint on team_opponents
// prevents duplicates. The opponent row is only created if it doesn't already
// exist by name.
//
// Usage (Node's --env-file loads .env):
//   npm run add-opponent -- --opponent="Opponent Name" --team="U15"
//
// Flags:
//   --opponent (required) name of the opponent
//   --team (required) team name to link the opponent to
//   --team-id (optional) UUID of the team — if provided, --team is used only
//     as a fallback lookup key
//
// Example:
//   npm run add-opponent -- --opponent="AS Rivale" --team="U15"

import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'

const { values } = parseArgs({
  options: {
    opponent: { type: 'string' },
    team: { type: 'string' },
    'team-id': { type: 'string' },
  },
})

if (!values.opponent || !values.team) {
  console.error('Usage: npm run add-opponent -- --opponent="..." --team="..."')
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

async function findTeamByIdOrName(teamId, teamName) {
  let query = supabase.from('teams').select('id, name')

  if (teamId) {
    const { data, error } = await query.eq('id', teamId).single()
    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
    if (data) {
      console.log(`Team trouvee par ID: ${data.name} (${data.id})`)
      return data
    }
  }

  // Fallback to name-based lookup
  const { data, error } = await query.eq('name', teamName).single()
  if (error && error.code !== 'PGRST116') throw error
  if (!data) {
    throw new Error(
      `Team "${teamName}" not found. ` +
        `Available teams: use SQL directly to list them or specify --team-id.`,
    )
  }

  console.log(`Team trouvee par nom: ${data.name} (${data.id})`)
  return data
}

async function findOrCreateOpponent(opponentName) {
  // Check if opponent already exists
  const { data: existing, error: selectError } = await supabase
    .from('opponents')
    .select('id, name')
    .eq('name', opponentName)
    .single()

  if (selectError && selectError.code !== 'PGRST116') throw selectError

  if (existing) {
    console.log(`Opponent trouvee: ${existing.name} (${existing.id})`)
    return existing
  }

  // Create new opponent
  const { data: created, error: insertError } = await supabase
    .from('opponents')
    .insert({ name: opponentName })
    .select()
    .single()

  if (insertError) throw insertError

  console.log(`Nouvel opponent cree: ${created.name} (${created.id})`)
  return created
}

async function linkOpponentToTeam(teamId, opponentId) {
  // Check if link already exists
  const { data: existing, error: selectError } = await supabase
    .from('team_opponents')
    .select('id')
    .eq('team_id', teamId)
    .eq('opponent_id', opponentId)
    .single()

  if (selectError && selectError.code !== 'PGRST116') throw selectError

  if (existing) {
    console.log(
      `Le lien team_opponents existe deja (${existing.id}) — aucune action necessaire.`,
    )
    return
  }

  // Create new link
  const { data: created, error: insertError } = await supabase
    .from('team_opponents')
    .insert({ team_id: teamId, opponent_id: opponentId })
    .select()
    .single()

  if (insertError) throw insertError

  console.log(`Lien team_opponents cree (${created.id})`)
}

async function main() {
  try {
    const team = await findTeamByIdOrName(values['team-id'], values.team)
    const opponent = await findOrCreateOpponent(values.opponent)
    await linkOpponentToTeam(team.id, opponent.id)

    console.log(
      `\n✓ Opponent "${opponent.name}" lie a l'equipe "${team.name}".`,
    )
  } catch (error) {
    console.error(`\n✗ Erreur: ${error.message}`)
    process.exit(1)
  }
}

main()
