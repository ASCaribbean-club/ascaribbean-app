import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ConvocationRespondersRepository,
  ConvocationResponderStatus,
} from '@domain/repositories/convocation-responders-repository'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { ConvocationResponderMapper } from '../mappers/convocation-responder-mapper'

export class ConvocationRespondersRepositoryImpl implements ConvocationRespondersRepository {
  constructor(private supabaseClient: SupabaseClient) { }

  // docs/convocation_visibility_rls_correction.md §4 left the shape open
  // ("two queries, joined client-side, or a single RPC wrapping both —
  // implementer's call, not specified here"); this is the single-RPC form —
  // `get_convocation_responders(p_convocation_id)` returns roster +
  // `has_responded` boolean + display name in one round trip (see that RPC's
  // own comment in supabase/migrations/20260901120018_convocation_responder_
  // visibility_correction.sql for why it's SECURITY DEFINER and how it stays
  // team-scoped).
  //
  // AC-MD-08 is only proven by a real request against this RPC — see this
  // file's sibling `.rls.test.ts`, never a component/render test
  // (docs/convocation_visibility_rls_correction.md §5.5).
  async listForConvocation(convocationId: string): Promise<ConvocationResponderStatus[]> {
    const { data, error } = await this.supabaseClient
      .rpc('get_convocation_responders', {
        p_convocation_id: convocationId,
      })

    if (error) throw mapSupabaseError(error)

    return (data ?? []).map(ConvocationResponderMapper.toDomain)
  }
}
