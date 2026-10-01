import { Badge } from '@presentation/shared/components/ui/badge'
import { cn } from '@presentation/shared/lib/utils'
import type { AvailabilityDisplayStatus } from '../availability-view'

// Label + colour, never colour alone (specs/player-unavailability.md UI
// design §2). "Malade / Blessé" is only reachable with status 'medical',
// which only the coach view can produce.
const BADGE: Record<AvailabilityDisplayStatus, { label: string; className: string }> = {
  available: { label: 'Disponible', className: 'border-coach-green/40 bg-coach-green/15 text-coach-green-text' },
  medical: { label: 'Malade / Blessé', className: 'border-coach-amber/40 bg-coach-amber/15 text-coach-amber' },
  unavailable: { label: 'Indisponible', className: 'border-coach-amber/40 bg-coach-amber/15 text-coach-amber' },
  suspended: { label: 'Suspendu', className: 'border-coach-red/40 bg-coach-red/15 text-coach-red-text' },
}

export function AvailabilityBadge({ status }: { status: AvailabilityDisplayStatus }) {
  const { label, className } = BADGE[status]
  return (
    <Badge variant="outline" className={cn('h-7 shrink-0 rounded-full px-3 text-[12.5px] font-bold', className)}>
      {label}
    </Badge>
  )
}
