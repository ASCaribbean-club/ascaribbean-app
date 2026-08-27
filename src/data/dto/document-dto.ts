import type { DocumentStatus } from '@domain/entities/document'

// Raw shape of public.documents, see
// supabase/migrations/20260811171754_initial_schema.sql.
export interface DocumentRow {
  id: string
  user_id: string
  type: string
  status: DocumentStatus
}
