import type { SupabaseClient } from '@supabase/supabase-js'
import type { Section } from '@domain/entities/section'
import type { CreateSectionInput, SectionRepository, UpdateSectionInput } from '@domain/repositories/section-repository'
import type { SectionRow } from '@data/dto/section-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toSection, toSectionInsertRow, toSectionUpdateRow } from '@data/mappers/section-mapper'

const SECTION_COLUMNS = 'id, name, type, created_at'

// RLS is already open for the read (`sections_select_authenticated`,
// supabase/migrations/20260811171754_initial_schema.sql) — no migration
// needed for findById/findAll. create()/update() are backed by
// sections_insert_admin/sections_update_admin, added by
// supabase/migrations/20260917140000_section_team_write_policies.sql
// (specs/section-and-teams.md §2.6).
export class SectionRepositoryImpl implements SectionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Section | null> {
    const { data, error } = await this.client
      .from('sections')
      .select(SECTION_COLUMNS)
      .eq('id', id)
      .maybeSingle<SectionRow>()

    if (error) throw mapSupabaseError(error)
    return data ? toSection(data) : null
  }

  // specs/section-and-teams.md §2.7 — the /admin/sections admin list, every
  // row. No extra filter here: sections_select_authenticated already
  // returns every row to every authenticated caller, admin included (same
  // shape as SeasonRepository.findAll()).
  async findAll(): Promise<Section[]> {
    const { data, error } = await this.client
      .from('sections')
      .select(SECTION_COLUMNS)
      .overrideTypes<SectionRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toSection)
  }

  // sections_insert_admin (RLS) — mirrors 'section:write'.
  async create(input: CreateSectionInput): Promise<Section> {
    const { data, error } = await this.client
      .from('sections')
      .insert(toSectionInsertRow(input))
      .select(SECTION_COLUMNS)
      .single()
      .overrideTypes<SectionRow>()

    if (error) throw mapSupabaseError(error)
    return toSection(data)
  }

  // sections_update_admin (RLS) — mirrors 'section:write'. No "which rows
  // are modifiable" restriction (§2.6, unlike seasons_update_admin) — this
  // repository doesn't pre-filter by row state either.
  async update(id: string, input: UpdateSectionInput): Promise<Section> {
    const { data, error } = await this.client
      .from('sections')
      .update(toSectionUpdateRow(input))
      .eq('id', id)
      .select(SECTION_COLUMNS)
      .single()
      .overrideTypes<SectionRow>()

    if (error) throw mapSupabaseError(error)
    return toSection(data)
  }
}
