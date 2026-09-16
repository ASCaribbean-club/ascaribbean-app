import { IconCheck, IconX } from '@tabler/icons-react'
import type { ActualStatus, DeclaredStatus } from '@domain/entities/convocation'
import type { PlayerPosition } from '@domain/entities/user'
import { formatPlayerPosition } from '@presentation/shared/formatters/player-position-labels'
import { Button } from '@presentation/shared/components/ui/button'
import { Separator } from '@presentation/shared/components/ui/separator'
import { cn } from '@presentation/shared/lib/utils'
import { InitialsAvatar } from './InitialsAvatar'
import { ResponderStatusBadge } from './ResponderStatusBadge'

interface AttendanceConfirmRowProps {
  name: string
  position: PlayerPosition | null
  // The player's own declared intent (ConvocationResponse.status) — rendered
  // via the SAME tri-state badge the plain RosterRow already uses. Never
  // recomputed or reinterpreted here: this component only adds a SECOND,
  // independent piece of information below it (spec §1, "la règle
  // centrale" — ConvocationResponse and AttendanceRecord never merge).
  declaredStatus: DeclaredStatus
  // The coach-CONFIRMED fact (AttendanceRecord.actualStatus). `null` means
  // no AttendanceRecord row exists yet for this player on this convocation
  // — rendered as "Confirmer la présence", never pre-filled from
  // `declaredStatus` above (AC-AT-12: a coach must actively confirm, the UI
  // must never presume "declared present" means "actually present").
  actualStatus: ActualStatus | null
  // True only while THIS row's own upsert is in flight — the ViewModel is
  // responsible for scoping this to a single userId (spec UI design,
  // "État d'écriture en cours... pas de blocage de toute la liste pour une
  // ligne en vol"): every other row of the list must stay fully
  // interactive while one is saving.
  isSaving: boolean
  // Set only for THIS row's own last failed write. Rendered in place of the
  // status label (never a full-screen Alert — same reasoning as above, an
  // error on one row must not block/alarm the rest of the list).
  errorMessage: string | null
  onConfirmPresent: () => void
  onConfirmAbsent: () => void
}

// UI design §"Nouveau composant — contrôle de confirmation par ligne" —
// extends the plain RosterRow silhouette with a second section, reusing the
// exact two-part layout SelfRosterRow already established (identity row +
// Separator + action row) rather than inventing a new shape. Only ever
// rendered for the coach variant of RosterList, and only when the viewer is
// actually authorized (AC-AT-06/07 — RosterList decides that, not this
// component: an unauthorized viewer gets a plain RosterRow instead, this
// component is simply never mounted for them rather than mounted-and-hidden).
export function AttendanceConfirmRow({
  name,
  position,
  declaredStatus,
  actualStatus,
  isSaving,
  errorMessage,
  onConfirmPresent,
  onConfirmAbsent,
}: AttendanceConfirmRowProps) {
  const positionLabel = formatPlayerPosition(position)
  const isConfirmedPresent = actualStatus === 'present'
  const isConfirmedAbsent = actualStatus === 'absent'

  // AC-AT-13/AC-AT-15 — three states, each with its OWN text, never the
  // same label/only-a-color-change for two of them. The error state (set by
  // the ViewModel after a failed upsert) takes over this same slot instead
  // of adding a fourth visual element, per the UI design's "micro-pattern
  // d'erreur inline par ligne" — flagged there as net-new/unconfirmed (see
  // that section's own "Questions ouvertes UI" #3), so double-check with
  // the developer/designer that this treatment is still the intended one.
  const statusLabel = errorMessage ?? (isConfirmedPresent ? 'Présence confirmée' : isConfirmedAbsent ? 'Absence confirmée' : 'Confirmer la présence')
  const statusLabelClassName = errorMessage
    ? 'text-coach-red-text'
    : isConfirmedPresent
      ? 'text-coach-green-text'
      : isConfirmedAbsent
        ? 'text-coach-red-text'
        : 'text-white/45'

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/8 px-4 py-3.5">
      {/* Identity row — deliberately identical markup/props to plain
          RosterRow (UI design: "la ligne d'identité... ne change pas du
          tout"). Duplicated here rather than nesting <RosterRow> (which
          renders its own <li>) inside this <li>, same reasoning SelfRosterRow
          already applies for the same structural constraint. */}
      <div className="flex items-center gap-3">
        <InitialsAvatar name={name} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-white">{name}</p>
          {positionLabel && <p className="text-[12px] text-white/50">{positionLabel}</p>}
        </div>
        <ResponderStatusBadge variant="tri-state" status={declaredStatus} />
      </div>

      <Separator className="bg-white/8" />

      {/* Confirmation row — CLAUDE.md §6 "Mobile touch targets and
          side-by-side fields": the label is the element allowed to shrink
          (`min-w-0 flex-1`, so it can truncate on a narrow phone rather than
          push the buttons off-track), the button pair is fixed-size
          (`shrink-0`) since AC-AT-14 requires each to stay at its full
          ~44px tap target no matter how long the label's text gets. This is
          the inverse of a Date/Heure pair, where BOTH sides are allowed to
          shrink — here only one of the two may. */}
      <div className="flex items-center gap-2">
        <p className={cn('min-w-0 flex-1 truncate text-[10.5px] font-bold uppercase tracking-[0.03em]', statusLabelClassName)}>
          {statusLabel}
        </p>

        <div className="ml-auto flex shrink-0 gap-2">
          {/* UI design §"Nouveau composant": deliberately round ICON buttons
              (not the text pill pattern ResponseActions uses for
              présent/absent) — the contrôle that writes an AttendanceRecord
              must never visually resemble the one that writes a
              ConvocationResponse, so a coach can't confuse "confirming what
              happened" with "the player's own declared answer" at a glance
              (spec §1, "la règle centrale"). `size="icon"` is shadcn's
              32px (`size-8`) default — overridden to `size-11` (~44px) here,
              same override BackHeader/MeetingAgendaField already apply for
              the same CLAUDE.md §6 touch-target rule. Both `aria-label`s are
              mandatory (AC-AT-15): neither icon carries visible text. */}
          <Button
            type="button"
            aria-label="Confirmer présent"
            aria-pressed={isConfirmedPresent}
            disabled={isSaving}
            onClick={onConfirmPresent}
            size="icon"
            className={cn(
              'size-8 rounded-full border',
              isConfirmedPresent
                ? 'border-transparent bg-coach-green text-white hover:bg-coach-green/90'
                : 'border-white/20 bg-transparent text-white/70 hover:bg-white/10',
            )}
          >
            <IconCheck className="size-5" />
          </Button>
          <Button
            type="button"
            aria-label="Confirmer absent"
            aria-pressed={isConfirmedAbsent}
            disabled={isSaving}
            onClick={onConfirmAbsent}
            size="icon"
            className={cn(
              'size-8 rounded-full border',
              isConfirmedAbsent
                ? 'border-transparent bg-coach-red text-white hover:bg-coach-red/90'
                : 'border-white/20 bg-transparent text-white/70 hover:bg-white/10',
            )}
          >
            <IconX className="size-5" />
          </Button>
        </div>
      </div>
    </li>
  )
}
