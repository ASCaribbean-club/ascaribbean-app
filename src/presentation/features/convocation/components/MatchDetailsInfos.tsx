import type { MatchDetails } from '@domain/entities/match-details'
import type { UiError } from '@presentation/shared/errors/ui-error'
import { formatTime } from '@presentation/shared/formatters/match-schedule'
import { InfoRow } from './InfoRow'
import { MatchDetailsEditForm, type MatchDetailsFormValues } from './MatchDetailsEditForm'

interface MatchDetailsInfosProps {
  matchDetails: MatchDetails
  // specs/edit-match-details.md UI design §3 — "une extension de
  // MatchDetailsInfos.tsx, qui prend en plus un état d'édition et les
  // callbacks associés (le calcul reste dans le ViewModel, ce composant ne
  // fait que rendre l'un des deux états)". `isEditing`/`formValues` both come
  // straight from useConvocationDetailViewModel via InfosTab — this
  // component never decides whether editing IS allowed (that's
  // canEditMatchDetails, InfosTab's own concern for the bandeau above the
  // card), only which of the two mutually-exclusive states to render.
  isEditing: boolean
  formValues: MatchDetailsFormValues | null
  onChangeIsHome: (value: boolean) => void
  // Developer decision (2026-09-25), widening this feature's original
  // scope: the convocation's own kickoff date/time and venue are editable
  // too, as long as the match hasn't begun yet — same callbacks shape as
  // the three original MatchDetails fields below.
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
  windowClosed: boolean
}

// AC-MD-03 — 3 distinct MatchDetails fields rendered read-only, none merged
// (opponentId isn't this component's concern, InfosTab renders it as an
// identity row above the card). isHome is rendered as a plain text line
// ("Domicile"/"Extérieur"), not a button/toggle, in the READ state — UI
// design: "l'information est un fait affiché, jamais une action" — that
// statement stays true for every role that can't edit; the coach-only EDIT
// state below is the one addition this feature makes.
export function MatchDetailsInfos({
  matchDetails,
  isEditing,
  formValues,
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
}: MatchDetailsInfosProps) {
  // `formValues` is only ever null before onStartEditMatchDetails has run —
  // isEditing can't be true without it (see useConvocationDetailViewModel's
  // onStartEditMatchDetails, which sets both together). Falling back to the
  // read state here is just a defensive guard, never expected to render in
  // practice.
  if (isEditing && formValues) {
    return (
      <MatchDetailsEditForm
        values={formValues}
        onChangeIsHome={onChangeIsHome}
        onChangeKickoffDate={onChangeKickoffDate}
        onChangeKickoffTime={onChangeKickoffTime}
        onChangeMatchLocation={onChangeMatchLocation}
        onChangeMeetingPointTime={onChangeMeetingPointTime}
        onChangeMeetingPointLocation={onChangeMeetingPointLocation}
        canSubmit={canSubmit}
        isSaving={isSaving}
        onSubmit={onSubmit}
        onCancel={onCancel}
        saveError={saveError}
        windowClosed={windowClosed}
      />
    )
  }

  return (
    <>
      <InfoRow label="Domicile / Extérieur">{matchDetails.isHome ? 'Domicile' : 'Extérieur'}</InfoRow>
      {/* RDV is optional (coach feedback, 2026-09-25) — a match created
          without one shows a plain placeholder rather than an empty/broken
          row (formatTime would throw on a null date). */}
      <InfoRow label="Heure de RDV">
        {matchDetails.meetingPointTime ? formatTime(matchDetails.meetingPointTime) : 'Non renseigné'}
      </InfoRow>
      <InfoRow label="Lieu de RDV">{matchDetails.meetingPointLocation ?? 'Non renseigné'}</InfoRow>
    </>
  )
}
