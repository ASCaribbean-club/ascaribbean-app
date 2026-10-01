import type { NewUnavailability, Unavailability } from '@domain/entities/unavailability'
import type { UnavailabilityInsertRow, UnavailabilityRow, UnavailabilityUpdateRow } from '@data/dto/unavailability-row'

export function toUnavailability(row: UnavailabilityRow): Unavailability {
  const base = {
    id: row.id,
    userId: row.user_id,
    startsOn: row.starts_on,
    declaredBy: row.declared_by,
    declaredAt: row.declared_at,
  }

  switch (row.kind) {
    case 'medical':
      // No free-text column is read for a medical row, even if one existed.
      return { ...base, kind: 'medical', expectedReturnOn: row.expected_return_on }
    case 'suspension':
      return {
        ...base,
        kind: 'suspension',
        matchCount: row.match_count ?? 0,
        reason: row.reason,
        liftedOn: row.lifted_on,
      }
    default:
      throw new Error(`Unknown unavailability kind: ${row.kind}`)
  }
}

export function toUnavailabilityInsertRow(input: NewUnavailability): UnavailabilityInsertRow {
  const base = {
    user_id: input.userId,
    kind: input.kind,
    starts_on: input.startsOn,
    declared_by: input.declaredBy,
  }

  switch (input.kind) {
    case 'medical':
      return { ...base, expected_return_on: input.expectedReturnOn, match_count: null, reason: null, lifted_on: null }
    case 'suspension':
      return {
        ...base,
        expected_return_on: null,
        match_count: input.matchCount,
        reason: input.reason,
        lifted_on: input.liftedOn,
      }
    default: {
      const unreachable: never = input
      return unreachable
    }
  }
}

export function toUnavailabilityUpdateRow(u: Unavailability): UnavailabilityUpdateRow {
  switch (u.kind) {
    case 'medical':
      return { starts_on: u.startsOn, expected_return_on: u.expectedReturnOn, match_count: null, reason: null, lifted_on: null }
    case 'suspension':
      return { starts_on: u.startsOn, expected_return_on: null, match_count: u.matchCount, reason: u.reason, lifted_on: u.liftedOn }
    default: {
      const unreachable: never = u
      return unreachable
    }
  }
}
