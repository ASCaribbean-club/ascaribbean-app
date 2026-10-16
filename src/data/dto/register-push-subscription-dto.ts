// Arguments of the upsert_push_subscription RPC — mirrored BY HAND with
// supabase/migrations/20261015120000_push_notifications_schema.sql.
export interface RegisterPushSubscriptionDto {
  p_endpoint: string
  p_p256dh: string
  p_auth: string
}
