import type { SupabaseClient } from '@supabase/supabase-js'
import type { Opponent } from '@domain/entities/opponent'
import type { OpponentRepository } from '@domain/repositories/opponent-repository'
import { mapSupabaseError } from '../errors/map-supabase-error'
import type { OpponentRow } from '../dto/opponent-dto'
import { OpponentMapper } from '../mappers/opponent-mapper'

export class OpponentRepositoryImpl implements OpponentRepository {
  constructor(private supabaseClient: SupabaseClient) {}

  async findByTeamId(teamId: string): Promise<Opponent[]> {
    const { data, error } = await this.supabaseClient
      .from('team_opponents')
      .select('opponent_id, opponents(id, name)')
      .eq('team_id', teamId)

    if (error) throw error

    const opponents = data
      ?.map((row) => {
        const opponent = (row.opponents as unknown as OpponentRow | null)
        if (!opponent) return null
        return OpponentMapper.toDomain(opponent)
      })
      .filter((o) => o !== null) as Opponent[]

    return opponents ?? []
  }

  async findById(id: string): Promise<Opponent | null> {
    const { data, error } = await this.supabaseClient
      .from('opponents')
      .select('id, name')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return OpponentMapper.toDomain(data as OpponentRow)
  }

  async create(name: string): Promise<Opponent> {
    const { data, error } = await this.supabaseClient
      .from('opponents')
      .insert({ name })
      .select()
      .single()

    if (error) throw error

    return OpponentMapper.toDomain(data as OpponentRow)
  }

  // specs/team-opponents.md §2.3/§2.5 — one RPC = one transaction: find by
  // exact name, else create, then link (on conflict do nothing). Mirrors the
  // add_opponent_to_team() function and 'team:write'
  // (supabase/migrations/20260930175109_add_opponent_to_team.sql).
  async addToTeam(teamId: string, name: string): Promise<Opponent> {
    const { data, error } = await this.supabaseClient
      .rpc('add_opponent_to_team', { p_team_id: teamId, p_name: name })
      .single<OpponentRow>()

    if (error) throw mapSupabaseError(error)

    return OpponentMapper.toDomain(data)
  }
}
