// Raw shape of public.push_subscriptions — see
// supabase/migrations/20261015120000_push_notifications_schema.sql. Only the
// endpoint is ever read by the client (own rows, existence check); the keys are
// write-only and never come back.
export interface PushSubscriptionRow {
  endpoint: string
}
