import type { SupabaseClient } from '@supabase/supabase-js'
import type { Section } from '@domain/entities/section'
import type { SectionRepository } from '@domain/repositories/section-repository'
import type { SectionRow } from '@data/dto/section-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toSection } from '@data/mappers/section-mapper'

// RLS is already open for this read (`sections_select_authenticated`,
// supabase/migrations/20260811171754_initial_schema.sql) — no migration
// needed, only this application-layer implementation.
export class SectionRepositoryImpl implements SectionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Section | null> {
    const { data, error } = await this.client
      .from('sections')
      .select('id, name, type, created_at')
      .eq('id', id)
      .maybeSingle<SectionRow>()

    if (error) throw mapSupabaseError(error)
    return data ? toSection(data) : null
  }

  async findAll(): Promise<Section[]> {
    const { data, error } = await this.client
      .from('sections')
      .select('id, name, type, created_at')
      .overrideTypes<SectionRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toSection)
  }
}
