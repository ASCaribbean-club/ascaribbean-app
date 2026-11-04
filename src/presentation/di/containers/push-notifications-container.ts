import type { SupabaseClient } from '@supabase/supabase-js'
import { PushDeviceRepositoryImpl } from '@data/repositories/PushDeviceRepositoryImpl'
import { PushPreferenceRepositoryImpl } from '@data/repositories/PushPreferenceRepositoryImpl'
import { PushSubscriptionRepositoryImpl } from '@data/repositories/PushSubscriptionRepositoryImpl'
import { AutoEnablePushNotificationsUseCase } from '@domain/usecases/push-notifications/AutoEnablePushNotificationsUseCase'
import { ChangePushNotificationPreferenceUseCase } from '@domain/usecases/push-notifications/ChangePushNotificationPreferenceUseCase'
import { DismissNotificationsBannerUseCase } from '@domain/usecases/push-notifications/DismissNotificationsBannerUseCase'
import { DisablePushNotificationsUseCase } from '@domain/usecases/push-notifications/DisablePushNotificationsUseCase'
import { EnablePushNotificationsUseCase } from '@domain/usecases/push-notifications/EnablePushNotificationsUseCase'
import { GetNotificationsBannerUseCase } from '@domain/usecases/push-notifications/GetNotificationsBannerUseCase'
import { GetPushNotificationStateUseCase } from '@domain/usecases/push-notifications/GetPushNotificationStateUseCase'

// specs/mob-notifications.md — device push subscription. Only the PUBLIC VAPID
// key is read here (VITE_VAPID_PUBLIC_KEY); the private key is an Edge
// Function secret and must never carry the VITE_ prefix (CLAUDE.md §7).
export interface PushNotificationsContainer {
  getPushNotificationStateUseCase: GetPushNotificationStateUseCase
  enablePushNotificationsUseCase: EnablePushNotificationsUseCase
  disablePushNotificationsUseCase: DisablePushNotificationsUseCase
  autoEnablePushNotificationsUseCase: AutoEnablePushNotificationsUseCase
  changePushNotificationPreferenceUseCase: ChangePushNotificationPreferenceUseCase
  getNotificationsBannerUseCase: GetNotificationsBannerUseCase
  dismissNotificationsBannerUseCase: DismissNotificationsBannerUseCase
}

export function createPushNotificationsContainer(supabaseClient: SupabaseClient): PushNotificationsContainer {
  const device = new PushDeviceRepositoryImpl()
  const subscriptions = new PushSubscriptionRepositoryImpl(supabaseClient)
  const preferences = new PushPreferenceRepositoryImpl()
  const enable = new EnablePushNotificationsUseCase(device, subscriptions, import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '')
  const disable = new DisablePushNotificationsUseCase(device, subscriptions)
  const getState = new GetPushNotificationStateUseCase(device, subscriptions)
  return {
    getPushNotificationStateUseCase: getState,
    enablePushNotificationsUseCase: enable,
    disablePushNotificationsUseCase: disable,
    autoEnablePushNotificationsUseCase: new AutoEnablePushNotificationsUseCase(device, subscriptions, preferences, enable),
    changePushNotificationPreferenceUseCase: new ChangePushNotificationPreferenceUseCase(enable, disable, preferences),
    getNotificationsBannerUseCase: new GetNotificationsBannerUseCase(getState, preferences),
    dismissNotificationsBannerUseCase: new DismissNotificationsBannerUseCase(preferences),
  }
}
