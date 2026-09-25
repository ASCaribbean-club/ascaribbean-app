import type { Convocation } from '@domain/entities/convocation'
import type { MatchDetails } from '@domain/entities/match-details'
import type { MeetingDetails } from '@domain/entities/meeting-details'
import type { UiError } from '@presentation/shared/errors/ui-error'
import { formatConvocationDate } from '@presentation/shared/formatters/match-schedule'
import { InfoRow } from '@presentation/features/convocation/components/InfoRow'
import { MatchDetailsInfos } from '@presentation/features/convocation/components/MatchDetailsInfos'
import { MeetingDetailsInfos } from '@presentation/features/convocation/components/MeetingDetailsInfos'
import { EditMatchDetailsButton } from './EditMatchDetailsButton'
import type { MatchDetailsFormValues } from './MatchDetailsEditForm'

// specs/edit-match-details.md — bundles useConvocationDetailViewModel's
// match-details-edit fields into one prop instead of ten loose ones.
// `canEdit` is the ViewModel's already-composed `canEditMatchDetails` (§2 of
// that spec — activeRole/roleMatchesConvocationTeam/type/status/isPastDate/
// usePermission, all five conditions already resolved to a single boolean
// before this component ever sees it — ARCHITECTURE.md §6).
export interface MatchDetailsEditProps {
  canEdit: boolean
  isEditing: boolean
  onStartEdit: () => void
  onCancel: () => void
  formValues: MatchDetailsFormValues | null
  onChangeIsHome: (value: boolean) => void
  // Developer decision (2026-09-25) — the convocation's own kickoff
  // date/time and venue are editable too, as long as the match hasn't
  // begun yet.
  onChangeKickoffDate: (value: string) => void
  onChangeKickoffTime: (value: string) => void
  onChangeMatchLocation: (value: string) => void
  onChangeMeetingPointTime: (value: string) => void
  onChangeMeetingPointLocation: (value: string) => void
  canSubmit: boolean
  isSaving: boolean
  onSubmit: () => void
  saveError: UiError | null
  windowClosed: boolean
}

interface InfosTabProps {
  convocation: Convocation
  matchDetails: MatchDetails | null
  meetingDetails: MeetingDetails | null
  matchDetailsEdit: MatchDetailsEditProps
}

// UI design §"Structure de l'écran", point 3. Identity rows (Coup d'envoi /
// Lieu) are common to all three types; everything below them is
// type-conditional and mutually exclusive — a `training` convocation
// renders NOTHING past "Lieu" (AC-MD-02, "pas d'espace vide compensatoire"),
// so there's no empty match/meeting block left dangling for that case.
export function InfosTab({ convocation, matchDetails, meetingDetails, matchDetailsEdit }: InfosTabProps) {
  // docs/designs/coach-match-details/[v3] [Coach] Mob - Match editing infos.png
  // — while editing, the card's own MATCH/LIEU MATCH rows (rendered inside
  // MatchDetailsEditForm) already carry the SAME Convocation.date/location
  // values the two identity InfoRow lines below show in the read state —
  // showing both at once would duplicate the same two facts in two
  // different visual styles. So the identity rows are skipped entirely
  // while editing a match's details; every other convocation type is
  // unaffected (isEditingMatchDetails can only ever be true for a match,
  // canEditMatchDetails requires convocation.type === 'match').
  const isEditingMatch = convocation.type === 'match' && matchDetailsEdit.isEditing

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-4 pb-8">
      {/* docs/designs/coach-match-details/... — "INFORMATIONS" heading +
          green pencil button, ABOVE the bordered card, mounted only while
          canEdit is true (moindre privilège, §2 "absent, jamais grisé" —
          AC-EM-01/AC-EM-12): no heading/button pair renders at all for a
          player, a coach of another team, a non-match convocation, or a
          closed window. */}
      {matchDetailsEdit.canEdit && (
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-bold tracking-wide text-white/60 uppercase">Informations</h2>
          {!matchDetailsEdit.isEditing && <EditMatchDetailsButton onClick={matchDetailsEdit.onStartEdit} />}
        </div>
      )}

      {/* Identity + type-specific rows sit inside one bordered card, per the
          mockup (docs/designs/player-match-details/.../selection_1.png) —
          InfoRow itself only draws the row dividers, not the outer card. */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 px-4">
        {!isEditingMatch && (
          <>
            {/* Match uses "Coup d'envoi" for the same Convocation.date field a
                training/meeting calls "Date" — the label changes, the underlying
                data and row don't (UI design §"Structure de l'écran", point 3). */}
            <InfoRow label={convocation.type === 'match' ? "Coup d'envoi" : convocation.type === 'training' ? 'Séance' : 'Date'}>
              {formatConvocationDate(convocation.date)}
            </InfoRow>
            <InfoRow label="Lieu">{convocation.location}</InfoRow>
          </>
        )}

        {convocation.type === 'match' && matchDetails && (
          <MatchDetailsInfos
            matchDetails={matchDetails}
            isEditing={matchDetailsEdit.isEditing}
            formValues={matchDetailsEdit.formValues}
            onChangeIsHome={matchDetailsEdit.onChangeIsHome}
            onChangeKickoffDate={matchDetailsEdit.onChangeKickoffDate}
            onChangeKickoffTime={matchDetailsEdit.onChangeKickoffTime}
            onChangeMatchLocation={matchDetailsEdit.onChangeMatchLocation}
            onChangeMeetingPointTime={matchDetailsEdit.onChangeMeetingPointTime}
            onChangeMeetingPointLocation={matchDetailsEdit.onChangeMeetingPointLocation}
            canSubmit={matchDetailsEdit.canSubmit}
            isSaving={matchDetailsEdit.isSaving}
            onSubmit={matchDetailsEdit.onSubmit}
            onCancel={matchDetailsEdit.onCancel}
            saveError={matchDetailsEdit.saveError}
            windowClosed={matchDetailsEdit.windowClosed}
          />
        )}
      </div>

      {convocation.type === 'meeting' && meetingDetails && <MeetingDetailsInfos meetingDetails={meetingDetails} />}
    </div>
  )
}
