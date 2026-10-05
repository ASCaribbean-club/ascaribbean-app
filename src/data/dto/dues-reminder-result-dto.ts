// `send_dues_reminders(uuid[])` RPC return value — Dto convention (CLAUDE.md
// §4): one row per membership received, no table behind it. See
// supabase/migrations/20261005170200_send_dues_reminders.sql.
export interface DuesReminderResultDto {
  membership_id: string
  outcome: string
}
