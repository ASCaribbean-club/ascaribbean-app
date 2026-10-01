import type { ConvocationType } from '@domain/entities/convocation'
import { CONVOCATION_TYPE_ACCENT } from '@presentation/shared/formatters/convocation-type-accent'
import { cn } from '@presentation/shared/lib/utils'

interface ConvocationTypeMarkerProps {
  teamName: string
  type: ConvocationType
  typeLabel: string
}

// `CONVOCATION` column — vertical bar coloured by type + team name in bold,
// the type written underneath: color never carries the information alone.
export function ConvocationTypeMarker({ teamName, type, typeLabel }: ConvocationTypeMarkerProps) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('h-10 w-1 shrink-0 rounded-full', CONVOCATION_TYPE_ACCENT[type].rail)} aria-hidden />
      <div className="flex min-w-0 flex-col">
        <span className="font-semibold">{teamName}</span>
        <span className="text-xs text-muted-foreground">{typeLabel}</span>
      </div>
    </div>
  )
}
