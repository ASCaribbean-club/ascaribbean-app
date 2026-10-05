// Raw shape of public.notifications — see
// supabase/migrations/20261005170000_dues_reminders_schema.sql. `expires_at`
// is read by nobody on the client (purge is a Supabase job), so it is not
// selected.
export interface NotificationRow {
  id: string
  recipient_id: string
  kind: string
  membership_id: string | null
  sent_at: string
  read_at: string | null
}
