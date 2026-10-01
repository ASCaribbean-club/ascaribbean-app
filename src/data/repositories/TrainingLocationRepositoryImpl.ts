import type { SupabaseClient } from '@supabase/supabase-js'
import type { TrainingLocation } from '@domain/entities/training-location'
import type {
  CreateTrainingLocationInput,
  TrainingLocationRepository,
  UpdateTrainingLocationInput,
} from '@domain/repositories/training-location-repository'
import type { TrainingLocationRow } from '../dto/training-location-row'
import { mapSupabaseError } from '../errors/map-supabase-error'
import {
  toTrainingLocation,
  toTrainingLocationArchiveUpdateRow,
  toTrainingLocationWriteRow,
} from '../mappers/training-location-mapper'

const TRAINING_LOCATION_COLUMNS = 'id, name, address, is_archived, created_at'

// specs/web-localizations.md §2.4/§2.5. Reads: training_locations_select_authenticated
// (RLS, every row for every authenticated account). Writes:
// training_locations_insert_admin / training_locations_update_admin
// ('training_location:write'). No delete method — there is no delete policy.
export class TrainingLocationRepositoryImpl implements TrainingLocationRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  // Admin list — PO-WL-07 default: alphabetical by name, archived rows last
  // (`is_archived` false < true).
  async findAll(): Promise<TrainingLocation[]> {
    const { data, error } = await this.client
      .from('training_locations')
      .select(TRAINING_LOCATION_COLUMNS)
      .order('is_archived', { ascending: true })
      .order('name', { ascending: true })
      .overrideTypes<TrainingLocationRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toTrainingLocation)
  }

  // Selector options — the "not archived" filter is a QUERY filter, not an
  // RLS restriction (§2.4): RLS must keep archived rows readable so a
  // convocation can still resolve its venue.
  async findAvailable(): Promise<TrainingLocation[]> {
    const { data, error } = await this.client
      .from('training_locations')
      .select(TRAINING_LOCATION_COLUMNS)
      .eq('is_archived', false)
      .order('name', { ascending: true })
      .overrideTypes<TrainingLocationRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toTrainingLocation)
  }

  async create(input: CreateTrainingLocationInput): Promise<TrainingLocation> {
    const { data, error } = await this.client
      .from('training_locations')
      .insert(toTrainingLocationWriteRow(input))
      .select(TRAINING_LOCATION_COLUMNS)
      .single()
      .overrideTypes<TrainingLocationRow>()

    if (error) throw mapSupabaseError(error)
    return toTrainingLocation(data)
  }

  async update(id: string, input: UpdateTrainingLocationInput): Promise<TrainingLocation> {
    const { data, error } = await this.client
      .from('training_locations')
      .update(toTrainingLocationWriteRow(input))
      .eq('id', id)
      .select(TRAINING_LOCATION_COLUMNS)
      .single()
      .overrideTypes<TrainingLocationRow>()

    if (error) throw mapSupabaseError(error)
    return toTrainingLocation(data)
  }

  // Idempotent by construction: `is_archived = true` on an already archived
  // row is a no-op update that still returns the row.
  async archive(id: string): Promise<TrainingLocation> {
    const { data, error } = await this.client
      .from('training_locations')
      .update(toTrainingLocationArchiveUpdateRow())
      .eq('id', id)
      .select(TRAINING_LOCATION_COLUMNS)
      .single()
      .overrideTypes<TrainingLocationRow>()

    if (error) throw mapSupabaseError(error)
    return toTrainingLocation(data)
  }
}
