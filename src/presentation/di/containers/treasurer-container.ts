import type { SupabaseClient } from '@supabase/supabase-js'
import { DuesReminderRepositoryImpl } from '@data/repositories/DuesReminderRepositoryImpl'
import { AuditLogRepositoryImpl } from '@data/repositories/AuditLogRepositoryImpl'
import { PaymentRepositoryImpl } from '@data/repositories/PaymentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { TreasurerDueRepositoryImpl } from '@data/repositories/TreasurerDueRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import { RecordPaymentUseCase } from '@domain/usecases/memberships/RecordPaymentUseCase'
import { SendDuesRemindersUseCase } from '@domain/usecases/treasurer-dues/SendDuesRemindersUseCase'
import { GetTreasurerDuesUseCase } from '@domain/usecases/treasurer-dues/GetTreasurerDuesUseCase'

// specs/mobile-treasurer.md — Cotisations screens: the read use case, plus
// (amendement UI du 2026-10-05 (3), PO-TR-01(a)) the EXISTING
// RecordPaymentUseCase, unchanged. This container's OWN repository
// instances, same per-container pattern as the others.
export interface TreasurerContainer {
  getTreasurerDuesUseCase: GetTreasurerDuesUseCase
  recordPaymentUseCase: RecordPaymentUseCase
  // Amendement (4), PO-TR-01(c): payment reminders.
  sendDuesRemindersUseCase: SendDuesRemindersUseCase
}

export function createTreasurerContainer(supabaseClient: SupabaseClient): TreasurerContainer {
  return {
    getTreasurerDuesUseCase: new GetTreasurerDuesUseCase(
      new TreasurerDueRepositoryImpl(supabaseClient),
      new SeasonRepositoryImpl(supabaseClient),
    ),
    recordPaymentUseCase: new RecordPaymentUseCase(
      new UserRepositoryImpl(supabaseClient),
      new PaymentRepositoryImpl(supabaseClient),
      new AuditLogRepositoryImpl(supabaseClient),
    ),
    sendDuesRemindersUseCase: new SendDuesRemindersUseCase(
      new UserRepositoryImpl(supabaseClient),
      new DuesReminderRepositoryImpl(supabaseClient),
      new AuditLogRepositoryImpl(supabaseClient),
    ),
  }
}
