import type { Payment } from '../entities/payment'

// specs/web-memberships.md §2.10 — "Une interface distincte pour les
// paiements: ressource distincte, table distincte, cycle de vie distinct
// (append-only)." Never merged into MembershipRepository.
export interface PaymentRepository {
  // Most-recent-first (UI design, RecordPaymentDialog's history list) — the
  // repository implementation is responsible for the ordering, not callers.
  listForMembership(membershipId: string): Promise<Payment[]>

  // specs/web-memberships.md §2.10 (amendement du 2026-09-17) — backs the
  // /admin/memberships list's COTISATION column/filter for EVERY row at
  // once, a SINGLE request rather than one per membership (N+1). Returns
  // every payment readable by the caller (RLS: an admin sees every row) —
  // this repository never aggregates itself; the caller groups by
  // membershipId and reduces each group with
  // domain/rules/membership-payment-rules.ts's own sumPaymentsCents(), the
  // ONE place a sum is computed (AC-WM-12/AC-WM-13).
  findAllForAdmin(): Promise<Payment[]>

  // RecordPaymentUseCase is the only caller (AC-WM-16/AC-WM-31). Always an
  // INSERT — never an upsert, never `on conflict` (§2.2, CLAUDE.md §6
  // exception documented on the migration and on this repository's
  // implementation). There is no update()/delete() on this interface at
  // all: no RLS policy would ever allow either (AC-WM-06), so the interface
  // itself doesn't offer the temptation.
  create(input: CreatePaymentInput): Promise<Payment>
}

// Mirrors the entity minus what the database always derives itself
// (id, recordedAt).
export type CreatePaymentInput = Omit<Payment, 'id' | 'recordedAt'>
