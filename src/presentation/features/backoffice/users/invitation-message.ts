// specs/web-users-invitation-links.md §3 — wording/formatting is a display
// concern (presentation/, never domain/): a pure function, tested without
// React. Draft French copy, tone (tu/vous, emoji) NOT validated by the
// Bureau yet (explicitly OPEN, see this feature's own OPEN-points list) —
// kept in this one place so it's easy to change later without touching the
// dialog/ViewModel that calls it.

// specs/web-users-invitation-links.md §3 — must mirror the link/OTP expiry
// configured in Supabase Auth (supabase/config.toml, `[auth] otp_expiry`,
// same manual-mirroring convention as RLS ↔ rbac-matrix.ts, CLAUDE.md §7).
// Tranché à 5h le 2026-09-23 (manual WhatsApp/SMS delivery needs more slack
// than an immediate email) — also set otp_expiry = 18000 in config.toml AND
// in the hosted project's own Auth setting (Dashboard > Authentication >
// Providers > Email > Email OTP Expiration); config.toml alone does not
// reach a project that isn't using `supabase config push`. Never write
// "expire bientôt" without a number, and never hardcode a number anywhere
// else in this message.
export const INVITE_LINK_VALIDITY_HOURS = 5

export interface BuildInvitationMessageParams {
  firstName: string
  url: string
  validityHours: number
}

export function buildInvitationMessage({ firstName, url, validityHours }: BuildInvitationMessageParams): string {
  return `Bonjour ${firstName} 👋

Tu es invité·e à rejoindre l'application de l'AS Caribbean.

Pour activer ton compte :
1. Ouvre ce lien : ${url}
2. Appuie sur « Activer mon compte »
3. Choisis ton mot de passe

⏳ Ce lien est personnel et valable ${validityHours} h. Ne le transfère à personne.
S'il a expiré, demande un nouveau lien à un administrateur du club.`
}
