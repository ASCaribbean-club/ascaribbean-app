import type { PushSubscriptionData } from '@domain/entities/push-subscription'
import { PushSubscriptionFailedError } from '@domain/errors/push-subscription-failed-error'
import {
  derivePushSupport,
  type PushPermission,
  type PushSupport,
} from '@domain/policies/push-notification-state'
import type { PushDeviceRepository } from '@domain/repositories/push-device-repository'
import { toPushSubscriptionData, urlBase64ToUint8Array } from '../mappers/push-subscription-mapper'

const SERVICE_WORKER_READY_TIMEOUT_MS = 10_000

// Browser side of Web Push. Lives in data/ because it touches `navigator` and
// `window`, which domain/ must not. Never logs the endpoint or keys.
export class PushDeviceRepositoryImpl implements PushDeviceRepository {
  getSupport(): PushSupport {
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    return derivePushSupport({
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPushManager: 'PushManager' in window,
      hasNotification: 'Notification' in window,
      isIos,
      isStandalone: standalone,
    })
  }

  getPermission(): PushPermission {
    return Notification.permission
  }

  async requestPermission(): Promise<PushPermission> {
    return Notification.requestPermission()
  }

  async getSubscription(): Promise<PushSubscriptionData | null> {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    return subscription ? toPushSubscriptionData(subscription.toJSON()) : null
  }

  async subscribe(vapidPublicKey: string): Promise<PushSubscriptionData> {
    const registration = await this.waitForRegistration()
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
    return toPushSubscriptionData(subscription.toJSON())
  }

  async unsubscribe(): Promise<boolean> {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    return subscription ? subscription.unsubscribe() : false
  }

  // `serviceWorker.ready` never settles when no worker is registered: bounded.
  private async waitForRegistration(): Promise<ServiceWorkerRegistration> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new PushSubscriptionFailedError('Service worker not ready')), SERVICE_WORKER_READY_TIMEOUT_MS),
    )
    return Promise.race([navigator.serviceWorker.ready, timeout])
  }
}
