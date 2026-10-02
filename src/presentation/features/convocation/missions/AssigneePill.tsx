import { IconX } from '@tabler/icons-react'
import { Badge } from '@presentation/shared/components/ui/badge'
import { cn } from '@presentation/shared/lib/utils'
import { RoleBadge } from './RoleBadge'
import type { MissionRole } from './useConvocationMissionsViewModel'

interface AssigneePillProps {
  displayName: string
  isMe: boolean
  role: MissionRole
  // Present only when the viewer can remove (manager variant).
  onRemove?: () => void
}

// One registered person of a mission. The current user is labelled by text
// ("Vous", from the ViewModel) AND an accent outline — never colour alone.
// The remove control wraps a `size-11` button around a small icon: the touch
// target is 44px, the pill stays compact (negative margin).
export function AssigneePill({ displayName, isMe, role, onRemove }: AssigneePillProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-auto min-h-8 max-w-full min-w-0 gap-1 border-white/15 bg-white/8 px-3.5 py-1 text-[14px] font-medium text-white',
        isMe && 'border-coach-green/60 bg-coach-green/10',
        onRemove && 'pr-0',
      )}
    >
      <span className="min-w-0 truncate">{displayName}</span>
      <RoleBadge role={role} />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Retirer ${displayName}`}
          className="-my-1.5 flex size-11 shrink-0 items-center justify-center text-white/60 hover:text-white"
        >
          <IconX className="size-3.5" aria-hidden />
        </button>
      )}
    </Badge>
  )
}
