// specs/mob-notifications.md — sends Web Push messages for the items the
// database hands over (private.collect_due_push_notifications / the dues
// reminder trigger, via pg_net). Does exactly this:
//
//   1. Authenticates the CALLER with a shared secret header
//      (`x-dispatch-secret` == PUSH_DISPATCH_SECRET). Deployed with
//      verify_jwt = false (supabase/config.toml): the caller is the database,
//      not a signed-in user.
//   2. Reads the recipients' subscriptions with a service_role client built
//      HERE from this function's own environment (the key is never reachable
//      from a VITE_ variable, CLAUDE.md §7).
//   3. Builds each text from the single catalog (_shared/push-messages.ts) and
//      sends it with the VAPID PRIVATE key (secret of this function only).
//   4. Deletes a subscription the push service reports expired (404/410,
//      AC-NT-11). A send failure never raises: T3 must not undo the dues
//      reminder (AC-NT-06).
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:),
// PUSH_DISPATCH_SECRET, optional CLUB_TIME_ZONE. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by the platform. Neither the payload
// nor any endpoint is ever logged (§3 Analytics/observabilité).

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'
import { buildPushMessage, DEFAULT_CLUB_TIME_ZONE, type PushItem } from '../_shared/push-messages.ts'

interface SubscriptionRow {
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function secretsMatch(provided: string | null, expected: string): boolean {
  if (provided === null || provided.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i += 1) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const dispatchSecret = Deno.env.get('PUSH_DISPATCH_SECRET')
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  if (!supabaseUrl || !serviceRoleKey || !dispatchSecret || !vapidPublic || !vapidPrivate || !vapidSubject) {
    return json({ error: 'server_misconfigured' }, 500)
  }

  if (!secretsMatch(request.headers.get('x-dispatch-secret'), dispatchSecret)) {
    return json({ error: 'unauthorized' }, 401)
  }

  let items: PushItem[]
  try {
    const body = await request.json()
    items = Array.isArray(body?.items) ? body.items : []
  } catch {
    return json({ error: 'invalid_input' }, 400)
  }
  if (items.length === 0) return json({ sent: 0, expired: 0, failed: 0 }, 200)

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
  const timeZone = Deno.env.get('CLUB_TIME_ZONE') ?? DEFAULT_CLUB_TIME_ZONE
  const admin = createClient(supabaseUrl, serviceRoleKey)

  // One read for all recipients, never one per item (spec §6 note 8).
  const userIds = [...new Set(items.map((item) => item.user_id))]
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)
  if (error) return json({ error: 'subscriptions_unreadable' }, 500)

  const byUser = new Map<string, SubscriptionRow[]>()
  for (const row of (data ?? []) as SubscriptionRow[]) {
    byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row])
  }

  const now = new Date()
  const expiredEndpoints = new Set<string>()
  let sent = 0
  let failed = 0

  for (const item of items) {
    const payload = JSON.stringify(buildPushMessage(item, now, timeZone))
    for (const subscription of byUser.get(item.user_id) ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          payload,
          { TTL: 60 * 60 * 12 },
        )
        sent += 1
      } catch (sendError) {
        const statusCode = (sendError as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) expiredEndpoints.add(subscription.endpoint)
        else failed += 1
      }
    }
  }

  if (expiredEndpoints.size > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', [...expiredEndpoints])
  }

  return json({ sent, expired: expiredEndpoints.size, failed }, 200)
})
