import type { DeclaredStatus } from '@domain/entities/convocation'
import { Button } from '@presentation/shared/components/ui/button'
import { cn } from '@presentation/shared/lib/utils'

interface ResponseActionsProps {
  // AC-PD-06 — true only while the player is both authorized to respond
  // (RBAC) AND still within the response window (canPlayerRespond,
  // domain/policies/response-deadline.ts). The ViewModel is responsible for
  // combining the two into this single boolean; this component doesn't
  // know or care which check failed.
  canRespond: boolean
  // The player's own declared status for this convocation, or `null` if no
  // ConvocationResponse row exists yet (AC-PD-03 — never an
  // AttendanceRecord, never another player's response).
  myResponse: DeclaredStatus | null
  onRespondPresent: () => void
  onRespondAbsent: () => void
  // 'default' (full-width h-11 pair, CLAUDE.md §6's ~44px touch-target
  // minimum) is this component's original NextConvocationCard shape and
  // stays the default so that caller is unaffected. 'compact' is for
  // SelfRosterRow (specs/match_details_page.md mockup, Effectif tab): the
  // mockup's Présente/Absente pills sit inline next to the row's badge, so
  // this keeps their smaller font/padding but floors height at `min-h-11`
  // (AC-MD-23) rather than shrinking the tap target with the pill.
  size?: 'default' | 'compact'
}

// specs/player-dashboard.md UI design §4 — the screen's one real business
// action, and its only genuinely interactive control. Two mutually
// exclusive rendering modes:
//
//   - `canRespond` true: two buttons side by side. Neither is
//     pre-selected until `myResponse` says otherwise, at which point the
//     matching button goes solid (green for "présent", red for "absent")
//     — AC-PD-17 requires the color to always be doubled by the button's
//     own visible text label, so there's no color-only state here to get
//     wrong.
//   - `canRespond` false (deadline passed, AC-PD-06): the buttons are
//     entirely ABSENT, never disabled/greyed — replaced by a one-line
//     status if a response was recorded in time, or nothing at all if it
//     wasn't (§UI design point 4, last bullet under "États des boutons").
//
// A tap on "Absent" commits directly, exactly like "Présent" (UI design §4,
// "Interaction retenue pour Absent") — there is no second confirmation
// step or motive field to render here (PO-PD-03, correction §6.2): both
// buttons call their respective `onRespond*` prop straight away, and the
// caller (usePlayerDashboardViewModel) is responsible for making that a
// single upsert, never two writes (AC-PD-04).
export function ResponseActions({ canRespond, myResponse, onRespondPresent, onRespondAbsent, size = 'default' }: ResponseActionsProps) {
  if (!canRespond) {
    if (myResponse === 'present' || myResponse === 'absent') {
      return (
        <p className="text-[12.5px] font-semibold text-white/60">
          Vous avez répondu : {myResponse === 'present' ? 'présent' : 'absent'}
        </p>
      )
    }
    // No response was given before the deadline — nothing renders here,
    // not even an empty-state message (UI design §4: "ou rien du tout si
    // aucune réponse n'a été donnée avant l'échéance").
    return null
  }

  const isPresent = myResponse === 'present'
  const isAbsent = myResponse === 'absent'
  const isCompact = size === 'compact'

  return (
    // CLAUDE.md §6 "Mobile touch targets and side-by-side fields": each
    // button gets `min-w-0` (so it can shrink below its own text's
    // intrinsic width on a narrow phone instead of overflowing its
    // grid track). Height is `h-11` (~44px) by default, not shadcn
    // Button's un-overridden `h-8` default — `compact` keeps the smaller
    // visual pill (font/padding) but floors height at `min-h-11` so the
    // tap target still meets AC-MD-23.
    <div className={cn('grid grid-cols-2', isCompact ? 'gap-2' : 'gap-2.5')}>
      <Button
        type="button"
        aria-pressed={isPresent}
        onClick={onRespondPresent}
        className={cn(
          'min-w-0 rounded-full border border-white/18',
          isCompact
            ? 'text-[10.5px] font-semibold text-white bg-white/14 px-2.5 py-1.25 tracking-[0.03em]'
            : 'h-11 text-[14px]',
          isPresent
            ? 'border-transparent bg-coach-green text-white hover:bg-coach-green/90'
            : 'bg-transparent text-white hover:bg-white/10',
        )}
      >
        Présent
      </Button>
      <Button
        type="button"
        aria-pressed={isAbsent}
        onClick={onRespondAbsent}
        className={cn(
          'min-w-0 rounded-full border border-white/20 font-bold',
          isCompact
            ? 'text-[10.5px] font-semibold text-white bg-white/14 px-2.5 py-1.25 tracking-[0.03em]'
            : 'h-11 text-[14px]',
          isAbsent
            ? 'border-transparent bg-coach-red text-white hover:bg-coach-red/90'
            : 'bg-transparent text-white hover:bg-white/10',
        )}
      >
        Absent
      </Button>
    </div>
  )
}
