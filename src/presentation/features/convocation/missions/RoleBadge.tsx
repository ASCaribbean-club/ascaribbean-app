import { cn } from '@presentation/shared/lib/utils'
import type { MissionRole } from './useConvocationMissionsViewModel'

const ROLE_STYLES: Record<MissionRole, { label: string; className: string }> = {
  player: { label: 'JOUEUR', className: 'bg-white/10 text-white/60' },
  volunteer: { label: 'BÉNÉVOLE', className: 'bg-sky-400/15 text-sky-300' },
}

// Small uppercase role tag shown next to a person's name (missions mockups).
export function RoleBadge({ role }: { role: MissionRole }) {
  const { label, className } = ROLE_STYLES[role]
  return <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-wider', className)}>{label}</span>
}
