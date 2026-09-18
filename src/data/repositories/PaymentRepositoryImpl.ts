import type { SupabaseClient } from '@supabase/supabase-js'
import type { Payment } from '@domain/entities/payment'
import type { CreatePaymentInput, PaymentRepository } from '@domain/repositories/payment-repository'
import type { PaymentRow } from '@data/dto/payment-dto'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toPayment, toPaymentInsertRow } from '@data/mappers/payment-mapper'

const PAYMENT_COLUMNS = 'id, membership_id, amount_cents, paid_at, recorded_by, recorded_at'

export class PaymentRepositoryImpl implements PaymentRepository {
  constructor(private readonly client: SupabaseClient) {}

  // membership_payments_select_own_or_admin (RLS) — own membership's
  // payments, or admin. Most-recent-first (paid_at, then recorded_at as a
  // tiebreaker for same-day payments) — UI design, RecordPaymentDialog's
  // history list.
  async listForMembership(membershipId: string): Promise<Payment[]> {
    const { data, error } = await this.client
      .from('membership_payments')
      .select(PAYMENT_COLUMNS)
      .eq('membership_id', membershipId)
      .order('paid_at', { ascending: false })
      .order('recorded_at', { ascending: false })
      .overrideTypes<PaymentRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toPayment)
  }

  // specs/web-memberships.md §2.10 (amendement du 2026-09-17) — a SINGLE
  // request for every payment across every membership (RLS: an admin sees
  // every row via membership_payments_select_own_or_admin), rather than one
  // request per row on the admin list (N+1). No ordering guarantee needed
  // here (unlike listForMembership above): the caller only ever groups and
  // sums these, never renders them as a chronological list.
  async findAllForAdmin(): Promise<Payment[]> {
    const { data, error } = await this.client.from('membership_payments').select(PAYMENT_COLUMNS).overrideTypes<PaymentRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toPayment)
  }

  // membership_payments_insert_admin (RLS) — mirrors 'payment:record'.
  // Always a plain INSERT — never `.upsert()`, never `on conflict` (§2.2,
  // CLAUDE.md §6 exception: a payment is an append-only journal entry, not
  // a current-state row).
  async create(input: CreatePaymentInput): Promise<Payment> {
    const { data, error } = await this.client
      .from('membership_payments')
      .insert(toPaymentInsertRow(input))
      .select(PAYMENT_COLUMNS)
      .single()
      .overrideTypes<PaymentRow>()

    if (error) throw mapSupabaseError(error)
    return toPayment(data)
  }
}
