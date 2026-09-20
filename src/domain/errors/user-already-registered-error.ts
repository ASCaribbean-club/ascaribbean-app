import { DomainError } from './domain-error'

// specs/web-users.md §2.5/AC-WU-34 — the invite-user Edge Function's
// supabase.auth.admin.inviteUserByEmail() rejected the address. Covers BOTH
// cases the spec names ("adresse déjà invitée" and "adresse déjà
// inscrite") under one error: GoTrue's admin API does not reliably
// distinguish "invited, not yet accepted" from "fully registered" — both
// surface as the same "already registered" condition (see
// scripts/create-user.mjs's own inviteError?.message check for the
// existing precedent of this exact ambiguity) — a deliberate, explicit
// decision, not a guess left unexamined.
export class UserAlreadyRegisteredError extends DomainError {}
