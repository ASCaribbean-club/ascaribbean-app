import type { User } from '../entities/user'

export interface UserRepository {
  findById(id: string): Promise<User | null>
  // CDC §3.1 charter-acceptance gate — idempotent, see accept_charter() in
  // supabase/migrations/20260813075127_charter_acceptance.sql.
  acceptCharter(userId: string): Promise<void>
}
