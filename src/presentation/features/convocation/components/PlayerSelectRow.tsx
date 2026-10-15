import { IconBan, IconCheck } from '@tabler/icons-react'
import { InitialsAvatar } from '@presentation/shared/components/InitialsAvatar'
import { cn } from '@presentation/shared/lib/utils'

interface PlayerSelectRowProps {
  name: string
  selected: boolean
  // Non-null = cannot be convoked: the row is disabled and says why.
  unavailableLabel?: string | null
  onToggle: () => void
}

// specs/convocation-player-selection.md UI design §3 — one row of the
// DESTINATAIRES list. Same gabarit as PlayerPickerRow (`min-h-11`,
// `rounded-2xl`, avatar + truncated name) but MULTI-selection: role="checkbox",
// the WHOLE row is the touch target (AC-CPS-20), the player's name is the
// accessible label (AC-CPS-21). The checked state is shown by the tick AND
// the green row, never by colour alone. The visual box on the right is
// presentational (`aria-hidden`): a shadcn Checkbox here would double the role
// and its 16px box is not the target. An unavailable player (absence,
// suspension, or a medical case collapsed to a bare "Indisponible" — never a
// health detail) is DISABLED and the reason is written under the name, so the
// state is never carried by dimming alone. This supersedes PO-CPS-12 (no
// availability information in this row).
export function PlayerSelectRow({ name, selected, unavailableLabel = null, onToggle }: PlayerSelectRowProps) {
  const isUnavailable = unavailableLabel !== null

  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        disabled={isUnavailable}
        onClick={onToggle}
        className={cn(
          'flex min-h-11 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
          isUnavailable
            ? 'cursor-not-allowed border-white/10 bg-white/3'
            : selected
              ? 'border-coach-green bg-coach-green/12'
              : 'border-white/10 bg-white/5 hover:bg-white/8',
        )}
      >
        <InitialsAvatar name={name} className={cn(isUnavailable && 'opacity-50')} />
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-[13.5px] font-semibold', isUnavailable ? 'text-white/50' : 'text-white')}>{name}</span>
          {isUnavailable && <span className="mt-0.5 block text-[12px] font-semibold text-coach-amber">{unavailableLabel}</span>}
        </span>
        {isUnavailable ? (
          <IconBan aria-hidden className="size-5 shrink-0 text-coach-amber" />
        ) : (
          <span
            aria-hidden
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-md border',
              selected ? 'border-coach-green bg-coach-green text-white' : 'border-white/30 bg-transparent',
            )}
          >
            {selected && <IconCheck className="size-4" stroke={3} />}
          </span>
        )}
      </button>
    </li>
  )
}
