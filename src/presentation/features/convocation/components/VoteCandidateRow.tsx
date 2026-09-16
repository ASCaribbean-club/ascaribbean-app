import { InitialsAvatar } from './InitialsAvatar'
import { Label } from '@presentation/shared/components/ui/label'
import { RadioGroupItem } from '@presentation/shared/components/ui/radio-group'
import { VoteResultBar } from './VoteResultBar'
import { cn } from '@presentation/shared/lib/utils'

// Discriminated union, same reasoning as ResponderStatusBadge/RosterList
// elsewhere on this screen: a row is either a selectable ballot line or a
// read-only result line, never both — the caller (VoteCategoryCard) already
// knows which one applies for the current state, so this component doesn't
// need an extra prop just to disambiguate.
type VoteCandidateRowProps =
  | {
      mode: 'ballot'
      candidateId: string
      name: string
      // Selection/submission state itself lives on the wrapping `RadioGroup`
      // in VoteCategoryCard (Radix manages `value`/`onValueChange`/
      // `disabled` at the Root level) — this row only needs to know whether
      // IT is the selected one, for its own highlight styling. AC-PV-12 — a
      // disabled/submitting ballot is still fully absent-or-present as a
      // WHOLE (VoteCategoryCard decides that), never half-rendered here.
      selected: boolean
    }
  | {
      mode: 'result'
      candidateId: string
      name: string
      unit: 'percentage' | 'absolute'
      value: number
      // Bar length relative to the category's OWN highest value, not to
      // 100/the raw percentage — computed by the caller (VoteCategoryCard),
      // which is the one place that already knows every candidate's value
      // and can find the max once instead of each row guessing at it.
      fillPercentage: number
      // Drives the "Ton choix" TEXT label only — player-only, a coach never
      // has a vote of their own to flag (kept separate from the bar's own
      // colour rule below, which follows a DIFFERENT rule per role).
      isMyChoice: boolean
      // Whether THIS row's bar renders in the accent colour. Deliberately
      // NOT the same value as `isMyChoice`: per the mockups, the coach view
      // colours EVERY row (mockup 1 — no personal-choice concept for a
      // coach to single one out), while the player view colours ONLY the
      // row matching the player's own vote (mockup 3 — the leading
      // candidate at 43% stays grey when it isn't the player's own pick).
      // VoteCategoryCard resolves which rule applies (it already knows the
      // role from whether `myCandidateId` is even present), this row just
      // renders whichever boolean it's handed.
      emphasizeBar: boolean
    }

// UI design §"Nouveau composant — VoteCategoryCard / VoteCandidateRow": the
// WHOLE row is the tap target (~44px, AC-PV-19), not just the small radio
// pastille shown on the mockup — wrapping the row in a <label> means a tap
// anywhere (avatar, name, empty space) toggles the associated
// RadioGroupItem, same "whole-row-is-the-control" idea SelfRosterRow/
// RosterRow already establish for the Effectif tab.
export function VoteCandidateRow(props: VoteCandidateRowProps) {
  if (props.mode === 'ballot') {
    return (
      <Label
        htmlFor={`vote-candidate-${props.candidateId}`}
        className={cn(
          'flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors',
          props.selected ? 'border-coach-green/50 bg-coach-green/10' : 'border-white/10 bg-white/5',
        )}
      >
        <InitialsAvatar name={props.name} />
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-white">{props.name}</span>
        {/* AC-PV-20 — selection is doubled by the card-level background/
            border tint above AND this pastille, never colour alone. Clicking
            anywhere in the <Label> (via htmlFor) activates this item —
            that's what makes the WHOLE row the tap target, not just the
            pastille itself (AC-PV-19). */}
        <RadioGroupItem
          id={`vote-candidate-${props.candidateId}`}
          value={props.candidateId}
          className={cn('size-5 shrink-0', props.selected && 'border-coach-green [&_svg]:text-coach-green')}
        />
      </Label>
    )
  }

  const valueLabel = props.unit === 'percentage' ? `${Math.round(props.value)}%` : `${props.value}`

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
      <InitialsAvatar name={props.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-white">{props.name}</p>
        {/* AC-PV-20 — "Ton choix" is a TEXT label, not just the bar's own
            colour (UI design: "trois signaux, dont deux non colorés") —
            player-only, a coach never has a vote of their own to flag. */}
        {props.isMyChoice && <p className="text-[11px] font-bold text-coach-green-text">Ton choix</p>}
      </div>
      <div className="flex w-28 shrink-0 items-center gap-2">
        <VoteResultBar fillPercentage={props.fillPercentage} emphasize={props.emphasizeBar} />
        <span className="w-10 shrink-0 text-right text-[13px] font-bold text-white">{valueLabel}</span>
      </div>
    </li>
  )
}
