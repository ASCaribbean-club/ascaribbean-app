import type { Membership } from '@domain/entities/membership'
import type { MembershipRow } from '@data/dto/membership-dto'

export function toMembership(row: MembershipRow): Membership {
  return {
    id: row.id,
    userId: row.user_id,
    licenceNumber: row.licence_number,
    status: row.status,
    // Non-null by construction here: MembershipRepositoryImpl only ever
    // queries rows filtered to a specific season_id (`.eq`, which never
    // matches a NULL column), so a matched row always carries the season it
    // was matched on — season_id can still be null in the table generally
    // (see membership-repository.ts), just never on a row that reaches here.
    seasonId: row.season_id!,
    validUntil: row.valid_until,
  }
}
