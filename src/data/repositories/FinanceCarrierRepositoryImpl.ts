import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminFinanceCarrier } from '@domain/entities/finance'
import type {
  CreateFinanceCarrierInput,
  FinanceCarrierRepository,
  UpdateFinanceCarrierInput,
} from '@domain/repositories/finance-carrier-repository'
import { NotFoundError } from '@domain/errors/not-found-error'
import type { FinanceCarrierRow } from '../dto/finance-carrier-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toAdminFinanceCarrier, toFinanceCarrierInsertRow, toFinanceCarrierUpdateRow } from '../mappers/finance-carrier-mapper'

const CARRIER_COLUMNS = 'id, label, kind, detail, manager_user_id, archived_at, manager:manager_user_id(full_name)'

// supabase/migrations/20261007142228_finance_carriers_admin.sql and
// 20261007151442_finances_member_advances.sql (archive / restore). NO delete
// method, on purpose (AC-FC-07): the database grants no delete privilege
// either.
export class FinanceCarrierRepositoryImpl implements FinanceCarrierRepository {
  constructor(private readonly client: SupabaseClient) {}

  // finance_carriers_select (RLS, 'finances:read', admin included). The
  // manager's name is read through users_select_own's admin branch. Archived
  // carriers are listed AFTER the active ones (UI-FA-09): the sort is stable, so
  // each group keeps the kind-then-label order of the query.
  async listForAdmin(): Promise<AdminFinanceCarrier[]> {
    const { data, error } = await this.client
      .from('finance_carriers')
      .select(CARRIER_COLUMNS)
      .order('kind', { ascending: true })
      .order('label', { ascending: true })
      .overrideTypes<FinanceCarrierRow[]>()
    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toAdminFinanceCarrier).sort((a, b) => Number(a.archivedAt !== null) - Number(b.archivedAt !== null))
  }

  // 'finance_carrier:create' — finance_carriers_insert_admin. label_key is
  // computed by the BEFORE trigger, never sent.
  async create(input: CreateFinanceCarrierInput): Promise<AdminFinanceCarrier> {
    const { data, error } = await this.client
      .from('finance_carriers')
      .insert(toFinanceCarrierInsertRow(input))
      .select(CARRIER_COLUMNS)
      .single<FinanceCarrierRow>()
    if (error) throw mapSupabaseError(error)
    return toAdminFinanceCarrier(data)
  }

  // 'finance_carrier:update' — finance_carriers_update_admin + column grant
  // (label, detail, manager_user_id). Zero rows affected (unknown id, or
  // refused by RLS) surfaces as NotFoundError.
  async update(id: string, input: UpdateFinanceCarrierInput): Promise<AdminFinanceCarrier> {
    const { data, error } = await this.client
      .from('finance_carriers')
      .update(toFinanceCarrierUpdateRow(input))
      .eq('id', id)
      .select(CARRIER_COLUMNS)
      .maybeSingle<FinanceCarrierRow>()
    if (error) throw mapSupabaseError(error)
    if (!data) throw new NotFoundError(`Finance carrier not found: ${id}`)
    return toAdminFinanceCarrier(data)
  }

  // archive_finance_carrier() — 'finance_carrier:archive'. The SERVER computes
  // the current balance and refuses with a dedicated cause (never a balance sent
  // by the client).
  async archive(id: string): Promise<void> {
    const { error } = await this.client.rpc('archive_finance_carrier', { p_id: id })
    if (error) throw mapSupabaseError(error)
  }

  // restore_finance_carrier() — 'finance_carrier:archive' (one action for both).
  async restore(id: string): Promise<void> {
    const { error } = await this.client.rpc('restore_finance_carrier', { p_id: id })
    if (error) throw mapSupabaseError(error)
  }
}
