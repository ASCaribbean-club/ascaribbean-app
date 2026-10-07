import { DomainError } from './domain-error'

// specs/mob-treasurer-finances.md AC-FI-28 — one opening balance per
// (carrier, season). Surfaces from opening_balances_carrier_season_unique via
// data/errors/map-supabase-error.ts.
export class DuplicateOpeningBalanceError extends DomainError {}
