import type { PostgrestError } from '@supabase/supabase-js'
import { DomainError } from '@domain/errors/domain-error'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { NotFoundError } from '@domain/errors/not-found-error'

// Traduit une erreur Postgres/PostgREST en erreur de domaine — le point qui
// empêche un code d'erreur Postgres de remonter jusqu'à un composant.
// Codes PostgREST : https://postgrest.org/en/stable/references/errors.html
export function mapSupabaseError(error: PostgrestError): DomainError {
  switch (error.code) {
    case 'PGRST116':
      return new NotFoundError(error.message)
    case '42501':
      return new ForbiddenError(error.message)
    default:
      return new NotFoundError(error.message)
  }
}
