// specs/mob-notifications.md — Web Push handlers, loaded into the generated
// service worker through workbox `importScripts` (vite.config.ts). Plain JS on
// purpose: it is served as-is from /push-sw.js.
//
// The payload is built server-side (supabase/functions/_shared/push-messages.ts,
// the single catalog of push texts): { title, body, url, tag }. Nothing is
// logged here — an endpoint or a payload never reaches the console/analytics.

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }
  const title = typeof payload.title === 'string' && payload.title ? payload.title : 'AS Caribbean'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof payload.body === 'string' ? payload.body : '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: typeof payload.tag === 'string' ? payload.tag : undefined,
      data: { url: typeof payload.url === 'string' ? payload.url : '/' },
    }),
  )
})

// AC-NT-12 — a tap opens the target, app closed or open.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = (event.notification.data && event.notification.data.url) || '/'
  // Same-origin targets only.
  const target = new URL(rawUrl, self.location.origin)
  const url = target.origin === self.location.origin ? target.href : self.location.origin + '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus()
          if ('navigate' in client) return client.navigate(url)
          return undefined
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
