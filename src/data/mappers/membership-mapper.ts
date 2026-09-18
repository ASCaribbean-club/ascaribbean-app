import type { Membership } from '@domain/entities/membership'
import type { CreateMembershipInput, UpdateMembershipInput } from '@domain/repositories/membership-repository'
import type { MembershipInsertRow, MembershipRow, MembershipUpdateRow } from '@data/dto/membership-dto'

// season_id is `not null` in the database as of
// supabase/migrations/20260917174652_web_memberships_write_policies.sql
// (§2.6a) — no non-null assertion needed here anymore, unlike before that
// migration.
export function toMembership(row: MembershipRow): Membership {
  return {
    id: row.id,
    userId: row.user_id,
    licenceNumber: row.licence_number,
    status: row.status,
    seasonId: row.season_id,
    validUntil: row.valid_until,
    amountDueCents: row.amount_due_cents,
  }
}

// specs/web-memberships.md §2.10 — the reverse direction, input -> row,
// needed by MembershipRepositoryImpl.create()/replaceArchived() (CLAUDE.md
// §4).
export function toMembershipInsertRow(input: CreateMembershipInput): MembershipInsertRow {
  return {
    user_id: input.userId,
    licence_number: input.licenceNumber,
    status: input.status,
    season_id: input.seasonId,
    valid_until: input.validUntil,
    amount_due_cents: input.amountDueCents,
  }
}

// Same reverse mapping for MembershipRepositoryImpl.update().
export function toMembershipUpdateRow(input: UpdateMembershipInput): MembershipUpdateRow {
  return {
    user_id: input.userId,
    licence_number: input.licenceNumber,
    status: input.status,
    season_id: input.seasonId,
    valid_until: input.validUntil,
    amount_due_cents: input.amountDueCents,
  }
}
