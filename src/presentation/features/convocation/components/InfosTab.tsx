import type { Convocation } from '@domain/entities/convocation'
import type { MatchDetails } from '@domain/entities/match-details'
import type { MeetingDetails } from '@domain/entities/meeting-details'
import { formatConvocationDate } from '@presentation/shared/formatters/match-schedule'
import { InfoRow } from '@presentation/features/convocation/components/InfoRow'
import { MatchDetailsInfos } from '@presentation/features/convocation/components/MatchDetailsInfos'
import { MeetingDetailsInfos } from '@presentation/features/convocation/components/MeetingDetailsInfos'

interface InfosTabProps {
  convocation: Convocation
  matchDetails: MatchDetails | null
  meetingDetails: MeetingDetails | null
}

// UI design §"Structure de l'écran", point 3. Identity rows (Coup d'envoi /
// Lieu) are common to all three types; everything below them is
// type-conditional and mutually exclusive — a `training` convocation
// renders NOTHING past "Lieu" (AC-MD-02, "pas d'espace vide compensatoire"),
// so there's no empty match/meeting block left dangling for that case.
export function InfosTab({ convocation, matchDetails, meetingDetails }: InfosTabProps) {
  return (
    <div className="flex flex-col gap-4 px-5.5 pt-4 pb-8">
      {/* Identity + type-specific rows sit inside one bordered card, per the
          mockup (docs/designs/player-match-details/.../selection_1.png) —
          InfoRow itself only draws the row dividers, not the outer card. */}
      <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 px-4">
        {/* Match uses "Coup d'envoi" for the same Convocation.date field a
            training/meeting calls "Date" — the label changes, the underlying
            data and row don't (UI design §"Structure de l'écran", point 3). */}
        <InfoRow label={convocation.type === 'match' ? "Coup d'envoi" : convocation.type === 'training' ? 'Séance' : 'Date'}>
          {formatConvocationDate(convocation.date)}
        </InfoRow>
        <InfoRow label="Lieu">{convocation.location}</InfoRow>

        {convocation.type === 'match' && matchDetails && <MatchDetailsInfos matchDetails={matchDetails} />}
      </div>

      {convocation.type === 'meeting' && meetingDetails && <MeetingDetailsInfos meetingDetails={meetingDetails} />}
    </div>
  )
}
