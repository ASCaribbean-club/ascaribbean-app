import type { CarrierKind } from '@domain/entities/finance'
import { Badge } from '@presentation/shared/components/ui/badge'
import { cn } from '@presentation/shared/lib/utils'
import { CARRIER_KIND_LABEL } from '../finance-carrier-labels'

// specs/web-finance-carriers.md UI design — a text pill (never colour alone),
// same shape as NewsStatusBadge but in NEUTRAL tints, distinct per kind, so it
// never reads as a good/bad status.
export function FinanceCarrierKindBadge({ kind }: { kind: CarrierKind }) {
  return (
    <Badge
      className={cn(
        'rounded-full px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide uppercase',
        kind === 'bank'
          ? 'border-border bg-muted text-muted-foreground'
          : 'border-coach-green/35 bg-coach-green/15 text-coach-green-text',
      )}
    >
      {CARRIER_KIND_LABEL[kind]}
    </Badge>
  )
}
