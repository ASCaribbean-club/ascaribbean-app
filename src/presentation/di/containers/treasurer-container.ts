import type { SupabaseClient } from '@supabase/supabase-js'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { TreasurerDueRepositoryImpl } from '@data/repositories/TreasurerDueRepositoryImpl'
import { GetTreasurerDuesUseCase } from '@domain/usecases/treasurer-dues/GetTreasurerDuesUseCase'

// specs/mobile-treasurer.md — read-only Cotisations screens. This
// container's OWN repository instances, same per-container pattern as the
// others.
export interface TreasurerContainer {
  getTreasurerDuesUseCase: GetTreasurerDuesUseCase
}

export function createTreasurerContainer(supabaseClient: SupabaseClient): TreasurerContainer {
  return {
    getTreasurerDuesUseCase: new GetTreasurerDuesUseCase(
      new TreasurerDueRepositoryImpl(supabaseClient),
      new SeasonRepositoryImpl(supabaseClient),
    ),
  }
}
