import type { MatchDetails } from '@domain/entities/match-details'
import { formatTime } from '@presentation/shared/formatters/match-schedule'
import { InfoRow } from './InfoRow'

interface MatchDetailsInfosProps {
  matchDetails: MatchDetails
}

// AC-MD-03 — 4 distinct MatchDetails fields, none merged. isHome is rendered
// as a plain text line ("Domicile"/"Extérieur"), not a button/toggle — UI
// design: "l'information est un fait affiché, jamais une action".
export function MatchDetailsInfos({ matchDetails }: MatchDetailsInfosProps) {
  return (
    <>
      <InfoRow label="Domicile / Extérieur">{matchDetails.isHome ? 'Domicile' : 'Extérieur'}</InfoRow>
      <InfoRow label="Heure de RDV">{formatTime(matchDetails.meetingPointTime)}</InfoRow>
      <InfoRow label="Lieu de RDV">{matchDetails.meetingPointLocation}</InfoRow>
    </>
  )
}
