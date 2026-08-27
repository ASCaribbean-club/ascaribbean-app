import type { SupabaseClient } from '@supabase/supabase-js'
import type { Document } from '@domain/entities/document'
import type { DocumentRepository } from '@domain/repositories/document-repository'
import { toDocument } from '@data/mappers/document-mapper'
import type { DocumentRow } from '@data/dto/document-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'

export class DocumentRepositoryImpl implements DocumentRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async listForUser(userId: string): Promise<Document[]> {
    const { data, error } = await this.client
      .from('documents')
      .select('id, user_id, type, status')
      .eq('user_id', userId)
      .overrideTypes<DocumentRow[]>()

    if (error) throw mapSupabaseError(error)
    if (!data) return []

    return (data ?? []).map(toDocument)
  }
}
