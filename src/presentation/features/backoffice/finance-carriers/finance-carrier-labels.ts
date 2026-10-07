import type { CarrierKind } from '@domain/entities/finance'

// specs/web-finance-carriers.md AC-FC-09 — the kind is always shown as text.
export const CARRIER_KIND_LABEL: Record<CarrierKind, string> = {
  bank: 'Banque',
  cash: 'Espèces',
}
