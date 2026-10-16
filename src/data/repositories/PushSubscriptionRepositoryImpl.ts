import type { SupabaseClient } from '@supabase/supabase-js'
import type { PushSubscriptionData } from '@domain/entities/push-subscription'
import type { PushSubscriptionRepository } from '@domain/repositories/push-subscription-repository'
import type { PushSubscriptionRow } from '../dto/push-subscription-row'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toRegisterPushSubscriptionDto } from '../mappers/push-subscription-mapper'

// RLS "own rows" on public.push_subscriptions (select/delete: user_id =
// auth.uid(), administrator included — AC-NT-02). Writes go through the
// upsert_push_subscription RPC: a plain upsert could not take over a row
// still owned by the previous account of a shared device.
export class PushSubscriptionRepositoryImpl implements PushSubscriptionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(subscription: PushSubscriptionData): Promise<void> {
    const { error } = await this.client.rpc('upsert_push_subscription', toRegisterPushSubscriptionDto(subscription))
    if (error) throw mapSupabaseError(error)
  }

  async existsByEndpoint(endpoint: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('push_subscriptions')
      .select('endpoint')
      .eq('endpoint', endpoint)
      .maybeSingle<PushSubscriptionRow>()
    if (error) throw mapSupabaseError(error)
    return data !== null
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    const { error } = await this.client.from('push_subscriptions').delete().eq('endpoint', endpoint)
    if (error) throw mapSupabaseError(error)
  }

  // release_push_endpoint RPC (security definer): own-row RLS cannot delete another account's row.
  async releaseEndpoint(endpoint: string): Promise<void> {
    const { error } = await this.client.rpc('release_push_endpoint', { p_endpoint: endpoint })
    if (error) throw mapSupabaseError(error)
  }
}
