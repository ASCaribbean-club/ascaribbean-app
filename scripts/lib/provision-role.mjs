// Shared by create-user.mjs and create-user-directly.mjs: resolves the
// --role/--team/--section/--season CLI flags into user_roles rows, creating
// the referenced section/season/team first if they don't exist yet.
//
// Mirrors the user_roles_scope_check CHECK constraint in
// supabase/migrations/20260811171754_initial_schema.sql:
//   - player / coach        -> team_id required, section_id null
//   - section-manager       -> section_id required, team_id null
//   - everyone else         -> club-wide, no team_id/section_id
//
// Every write here goes through the service_role client passed in by the
// caller — same "never import from src/" rule as the rest of scripts/.

const CLUB_WIDE_ROLES = ['authorized-officer', 'treasurer', 'medical-referent', 'volunteer', 'admin']

async function findOrCreateSection(supabase, name, type) {
  const { data: existing, error: findError } = await supabase
    .from('sections')
    .select('id')
    .eq('name', name)
    .maybeSingle()
  if (findError) throw findError
  if (existing) return existing.id

  if (!type) {
    throw new Error(`La section "${name}" n'existe pas encore — ajoutez --section-type pour la creer.`)
  }

  const { data, error } = await supabase.from('sections').insert({ name, type }).select('id').single()
  if (error) throw error
  console.log(`Section "${name}" (${type}) creee.`)
  return data.id
}

async function findOrCreateSeason(supabase, label, startDate, endDate) {
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

async function findOrCreateTeam(supabase, name, sectionId, seasonId) {
  const { data: existing, error: findError } = await supabase
    .from('teams')
    .select('id')
    .eq('name', name)
    .eq('section_id', sectionId)
    .eq('season_id', seasonId)
    .maybeSingle()
  if (findError) throw findError
  if (existing) return existing.id

  const { data, error } = await supabase
    .from('teams')
    .insert({ name, section_id: sectionId, season_id: seasonId })
    .select('id')
    .single()
  if (error) throw error
  console.log(`Equipe "${name}" creee.`)
  return data.id
}

// Resolves --role's CLI flags into the ids assignRole() needs, creating
// section/season/team along the way if they're missing. Returns null when
// no --role was passed (role assignment is optional on both scripts).
export async function resolveRoleContext(supabase, role, opts) {
  if (!role) return null

  if (role === 'player' || role === 'coach') {
    if (!opts.team) throw new Error(`--team est requis pour le role "${role}".`)
    if (!opts.section) throw new Error(`--section est requis pour resoudre ou creer l'equipe.`)
    if (!opts.season) throw new Error(`--season est requis pour resoudre ou creer l'equipe.`)

    const teamNames = opts.team
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
    if (role === 'player' && teamNames.length > 1) {
      throw new Error(`Un joueur n'a qu'une seule equipe — passez un seul --team pour le role "player".`)
    }

    const sectionId = await findOrCreateSection(supabase, opts.section, opts['section-type'])
    const seasonId = await findOrCreateSeason(supabase, opts.season, opts['season-start'], opts['season-end'])
    const teamIds = []
    for (const teamName of teamNames) {
      teamIds.push(await findOrCreateTeam(supabase, teamName, sectionId, seasonId))
    }
    return { teamIds }
  }

  if (role === 'section-manager') {
    if (!opts.section) throw new Error(`--section est requis pour le role "section-manager".`)
    const sectionId = await findOrCreateSection(supabase, opts.section, opts['section-type'])
    return { sectionId }
  }

  if (CLUB_WIDE_ROLES.includes(role)) return {}

  throw new Error(`Role inconnu: "${role}".`)
}

// Replay-safe: looks up the exact scoped row before inserting, so re-running
// the script with the same flags never creates a duplicate user_roles row
// (same guarantee as the rest of these scripts, e.g. findExistingAuthUserId).
export async function assignRole(supabase, userId, role, context) {
  const isTeamScoped = role === 'player' || role === 'coach'
  const teamIds = isTeamScoped ? context.teamIds : [null]

  for (const teamId of teamIds) {
    let query = supabase.from('user_roles').select('id').eq('user_id', userId).eq('role', role)
    if (isTeamScoped) {
      query = query.eq('team_id', teamId)
    } else if (role === 'section-manager') {
      query = query.eq('section_id', context.sectionId).is('team_id', null)
    } else {
      query = query.is('team_id', null).is('section_id', null)
    }
    const { data: existing, error: findError } = await query.maybeSingle()
    if (findError) throw findError
    if (existing) continue

    const row = { user_id: userId, role }
    if (isTeamScoped) row.team_id = teamId
    if (role === 'section-manager') row.section_id = context.sectionId

    const { error } = await supabase.from('user_roles').insert(row)
    if (error) throw error
  }

  console.log(`Role "${role}" assigne.`)
}
