import type { ReactNode } from 'react'
import type { UiError } from '@presentation/shared/errors/ui-error'
import { MATCH_ARRANGEMENTS_WINDOW_CLOSED_MESSAGE } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Input } from '@presentation/shared/components/ui/input'
import { SegmentedToggle } from '@presentation/shared/components/SegmentedToggle'
import { cn } from '@presentation/shared/lib/utils'
import { DateTimeInput } from './DateTimeInput'
import { FIELD_ROW_CLASSNAME } from './field-style'

export interface MatchDetailsFormValues {
  // Developer decision (2026-09-25), widening specs/edit-match-details.md's
  // original scope: the coach may also correct the convocation's own
  // kickoff (date/time) and venue, as long as the match hasn't begun yet —
  // `kickoffDate`/`kickoffTime` are bare `YYYY-MM-DD`/`HH:MM`, combined into
  // the ISO Convocation.date only at submit
  // (useConvocationDetailViewModel.onSubmitMatchDetails).
  kickoffDate: string
  kickoffTime: string
  matchLocation: string
  isHome: boolean
  meetingPointTime: string // `HH:MM` — combined with kickoffDate at submit, same calendar day (isValidMatchSchedule requires it)
  meetingPointLocation: string
}

interface MatchDetailsEditFormProps {
  values: MatchDetailsFormValues
  onChangeIsHome: (value: boolean) => void
  onChangeKickoffDate: (value: string) => void
  onChangeKickoffTime: (value: string) => void
  onChangeMatchLocation: (value: string) => void
  onChangeMeetingPointTime: (value: string) => void
  onChangeMeetingPointLocation: (value: string) => void
  canSubmit: boolean
  isSaving: boolean
  onSubmit: () => void
  onCancel: () => void
  saveError: UiError | null
  // UI design §5 — the window closed WHILE this form was already open
  // (kickoff crossed mid-edit): the form stays mounted with its values
  // intact, only the copy/buttons below change — never force-closed.
  windowClosed: boolean
}

// Taller, pill-shaped field box (docs/designs/coach-match-details/[v3]
// [Coach] Mob - Match editing infos.png) — distinct from field-style.ts's
// FIELD_CLASSNAME (CreateConvocationForm's own `h-11`/`rounded-lg` fields),
// specific to this screen's own visual language. `scheme-dark` still needed
// for DateTimeInput's native picker icon.
const MATCH_DETAILS_FIELD_BOX =
  'scheme-dark flex h-12 w-full items-center rounded-full border border-white/15 bg-white/5 px-4 text-[15px] font-medium text-white'

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-[11px] font-bold tracking-wide text-white/45 uppercase">{children}</span>
}

// docs/designs/coach-match-details/[v3] [Coach] Mob - Match editing infos.png
// — replaces MatchDetailsInfos' three InfoRow lines (plus the two identity
// rows InfosTab normally renders above them, "Coup d'envoi"/"Lieu" — see
// InfosTab.tsx) with this self-contained field list: MATCH (kickoff
// date+time) → DOMICILE/EXTÉRIEUR → RDV ÉQUIPE (time) → LIEU RDV → LIEU
// MATCH (venue) → Annuler/Enregistrer. Developer decision (2026-09-25):
// MATCH/LIEU MATCH are editable too (the mockup itself renders them in the
// exact same box as the other fields — this component now matches that
// literally, not just visually). The Domicile/Extérieur toggle isn't shown
// in that specific export, but AC-EM-02 requires isHome to stay one of the
// modifiable fields — added here using the same label-above/full-width-
// control language as every other row.
export function MatchDetailsEditForm({
  values,
  onChangeIsHome,
  onChangeKickoffDate,
  onChangeKickoffTime,
  onChangeMatchLocation,
  onChangeMeetingPointTime,
  onChangeMeetingPointLocation,
  canSubmit,
  isSaving,
  onSubmit,
  onCancel,
  saveError,
  windowClosed,
}: MatchDetailsEditFormProps) {
  // UI design §5 — the proactive "window closed mid-edit" message takes
  // priority over any earlier saveError (both are "the form isn't going
  // anywhere" states, but this one is more current — it means the render
  // gate itself just flipped, not just the last submit attempt).
  const alertMessage = windowClosed ? MATCH_ARRANGEMENTS_WINDOW_CLOSED_MESSAGE : (saveError?.message ?? null)

  return (
    <div className="flex flex-col gap-5 py-4">
      {/* Match — kickoff date/time, side by side. CLAUDE.md §6: grid items
          default to min-width: auto (floored at content's intrinsic
          width) — each gets its own `min-w-0` wrapper so neither field
          refuses to shrink to its track on a narrow phone. */}
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Match</FieldLabel>
        <div className={FIELD_ROW_CLASSNAME}>
          <div className="min-w-0">
            <DateTimeInput
              id="matchDetailsKickoffDate"
              type="date"
              value={values.kickoffDate}
              onChange={onChangeKickoffDate}
              className={MATCH_DETAILS_FIELD_BOX}
            />
          </div>
          <div className="min-w-0">
            <DateTimeInput
              id="matchDetailsKickoffTime"
              type="time"
              value={values.kickoffTime}
              onChange={onChangeKickoffTime}
              className={MATCH_DETAILS_FIELD_BOX}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Domicile / Extérieur</FieldLabel>
        <SegmentedToggle
          value={values.isHome}
          onChange={onChangeIsHome}
          trueLabel="Domicile"
          falseLabel="Extérieur"
          trueColor="coach-green"
          falseColor="coach-red"
          ariaLabel="Lieu de la rencontre"
          size="sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>RDV équipe (optionnel)</FieldLabel>
        <DateTimeInput
          id="matchDetailsMeetingPointTime"
          type="time"
          value={values.meetingPointTime}
          onChange={onChangeMeetingPointTime}
          className={MATCH_DETAILS_FIELD_BOX}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Lieu RDV (optionnel)</FieldLabel>
        <Input
          id="matchDetailsMeetingPointLocation"
          value={values.meetingPointLocation}
          onChange={(event) => onChangeMeetingPointLocation(event.target.value)}
          placeholder="Ex: Vestiaires — Stade municipal"
          className={cn(MATCH_DETAILS_FIELD_BOX, 'placeholder:text-white/35')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Lieu match</FieldLabel>
        <Input
          id="matchDetailsMatchLocation"
          value={values.matchLocation}
          onChange={(event) => onChangeMatchLocation(event.target.value)}
          placeholder="Ex: Stade municipal, terrain A"
          className={cn(MATCH_DETAILS_FIELD_BOX, 'placeholder:text-white/35')}
        />
      </div>

      {alertMessage && (
        <Alert variant="destructive">
          <AlertDescription>{alertMessage}</AlertDescription>
        </Alert>
      )}

      {/* h-12 minimum each (well above AC-EM-15's ~44px floor). "Annuler"
          becomes "Fermer" once the window has closed mid-edit — there's
          nothing left to annuler, just a view to leave (§5). Enregistrer
          stays disabled the whole time the window is closed: any tap would
          only be refused by the base anyway. */}
      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          onClick={onCancel}
          className="h-12 flex-1 rounded-full border-0 bg-white/10 text-white hover:bg-white/15"
        >
          {windowClosed ? 'Fermer' : 'Annuler'}
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || windowClosed}
          className="h-12 flex-1 rounded-full bg-coach-green font-extrabold text-white hover:bg-coach-green/90 disabled:opacity-40"
        >
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  )
}
