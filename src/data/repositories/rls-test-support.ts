// Shared setup for src/data/repositories/*.rls.test.ts — real integration
// tests against a LOCAL Supabase stack (`supabase start`), never the anon
// key this project's client bundle uses and never the remote project.
// See ConvocationRespondersRepositoryImpl.rls.test.ts for why a real
// per-role session is the point of these tests, not an implementation detail.
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface LocalSupabaseEnv {
  url: string
  anonKey: string
  serviceRoleKey: string
}

let cachedEnv: LocalSupabaseEnv | null = null

// Reads the running local stack's URL/keys from the CLI itself, rather than
// hardcoding the well-known local demo JWTs, so this keeps working across a
// `supabase init`/CLI upgrade that changes them.
export function getLocalSupabaseEnv(): LocalSupabaseEnv {
  if (cachedEnv) return cachedEnv

  let raw: string
  try {
    raw = execSync('supabase status -o json', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (error) {
    throw new Error('Local Supabase stack is not running — run `supabase start` before `npm run test:rls`.', {
      cause: error,
    })
  }

  const status = JSON.parse(raw) as { API_URL: string; ANON_KEY: string; SERVICE_ROLE_KEY: string }
  cachedEnv = { url: status.API_URL, anonKey: status.ANON_KEY, serviceRoleKey: status.SERVICE_ROLE_KEY }
  return cachedEnv
}

// service_role bypasses RLS entirely — this client only ever lives in this
// test-support file, never imported by src/ application code.
export function createAdminClient(env: LocalSupabaseEnv): SupabaseClient {
  return createClient(env.url, env.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Disposable per-run test identity, one random email per call so repeated
// runs against the same local stack never collide on `users.email`'s unique
// constraint. Mirrors scripts/create-user-directly.mjs's "already confirmed,
// password-only" account shape; skips that script's --role/--team flag
// parsing since these fixtures already know their exact team/section ids.
export async function createTestUser(
  admin: SupabaseClient,
  params: { emailPrefix: string; password: string; fullName: string },
): Promise<{ id: string; email: string }> {
  const email = `${params.emailPrefix}-${randomUUID().slice(0, 8)}@rls-test.local`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: params.password,
    email_confirm: true,
  })
  if (error || !data.user) throw error ?? new Error('createUser returned no user')

  const { error: upsertError } = await admin
    .from('users')
    .upsert({ id: data.user.id, email, full_name: params.fullName }, { onConflict: 'id' })
  if (upsertError) throw upsertError

  return { id: data.user.id, email }
}

export async function assignRole(
  admin: SupabaseClient,
  userId: string,
  role: string,
  scope: { teamId?: string; sectionId?: string } = {},
): Promise<void> {
  const { error } = await admin
    .from('user_roles')
    .insert({ user_id: userId, role, team_id: scope.teamId ?? null, section_id: scope.sectionId ?? null })
  if (error) throw error
}

// A real password grant — the actual per-role JWT a member's device
// receives, as opposed to the anon key the app's own bundle starts with.
export async function signInAsTestUser(env: LocalSupabaseEnv, email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(env.url, env.anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}
