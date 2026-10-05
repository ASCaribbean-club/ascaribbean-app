import type { SupabaseClient } from '@supabase/supabase-js'
import { MembershipRepositoryImpl } from '@data/repositories/MembershipRepositoryImpl'
import { NotificationRepositoryImpl } from '@data/repositories/NotificationRepositoryImpl'
import { PaymentRepositoryImpl } from '@data/repositories/PaymentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { GetMyDuesReminderUseCase } from '@domain/usecases/notifications/GetMyDuesReminderUseCase'
import { MarkNotificationReadUseCase } from '@domain/usecases/notifications/MarkNotificationReadUseCase'

// specs/mobile-treasurer.md amendement (4), §H — the member-side dues reminder
// banner. Own-row reads and one own-row update, all under the caller's RLS.
export interface NotificationsContainer {
  getMyDuesReminderUseCase: GetMyDuesReminderUseCase
  markNotificationReadUseCase: MarkNotificationReadUseCase
}

export function createNotificationsContainer(supabaseClient: SupabaseClient): NotificationsContainer {
  const notificationRepository = new NotificationRepositoryImpl(supabaseClient)
  return {
    getMyDuesReminderUseCase: new GetMyDuesReminderUseCase(
      new SeasonRepositoryImpl(supabaseClient),
      new MembershipRepositoryImpl(supabaseClient),
      new PaymentRepositoryImpl(supabaseClient),
      notificationRepository,
    ),
    markNotificationReadUseCase: new MarkNotificationReadUseCase(notificationRepository),
  }
}
