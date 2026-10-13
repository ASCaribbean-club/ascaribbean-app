import { IconCheck } from '@tabler/icons-react'
import { InitialsAvatar } from '@presentation/shared/components/InitialsAvatar'
import { cn } from '@presentation/shared/lib/utils'

interface PlayerSelectRowProps {
  name: string
  selected: boolean
  onToggle: () => void
}

// specs/convocation-player-selection.md UI design §3 — one row of the
// DESTINATAIRES list. Same gabarit as PlayerPickerRow (`min-h-11`,
// `rounded-2xl`, avatar + truncated name) but MULTI-selection: role="checkbox",
// the WHOLE row is the touch target (AC-CPS-20), the player's name is the
// accessible label (AC-CPS-21). The checked state is shown by the tick AND
// the green row, never by colour alone. The visual box on the right is
// presentational (`aria-hidden`): a shadcn Checkbox here would double the role
// and its 16px box is not the target. No availability / health information is
// ever rendered in this row (PO-CPS-12).
export function PlayerSelectRow({ name, selected, onToggle }: PlayerSelectRowProps) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={onToggle}
        className={cn(
          'flex min-h-11 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
          selected ? 'border-coach-green bg-coach-green/12' : 'border-white/10 bg-white/5 hover:bg-white/8',
        )}
      >
        <InitialsAvatar name={name} />
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-white">{name}</span>
        <span
          aria-hidden
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-md border',
            selected ? 'border-coach-green bg-coach-green text-white' : 'border-white/30 bg-transparent',
          )}
        >
          {selected && <IconCheck className="size-4" stroke={3} />}
        </span>
      </button>
    </li>
  )
}
