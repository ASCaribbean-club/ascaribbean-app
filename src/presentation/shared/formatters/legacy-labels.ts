import type { LegacyAction, LegacyEntry, LegacyRule } from '@domain/entities/legacy'
import type { SectionType } from '@domain/entities/section'

// docs/specs/asc-legacy.md §1 — French labels of the barème (presentation
// concern: the domain only knows the action codes).
export const LEGACY_ACTION_LABELS: Record<LegacyAction, string> = {
  training_attendance: 'Présence entraînement',
  match_attendance_official: 'Présence match officiel',
  match_attendance_friendly: 'Présence match amical',
  event_participation: 'Participation à un événement',
  equipment_setup: 'Installation / rangement du matériel',
  club_mission: 'Mission pour le club',
  referral: "Parrainage d'un nouveau membre",
  solidarity_action: 'Action solidaire / représentation du club',
  partner_contribution: "Apport d'un partenaire / organisation d'événement",
  exceptional_commitment: 'Engagement exceptionnel',
  season_end_bonus: 'Bonus fidélité fin de saison',
  points_catchup: 'Rattrapage de points',
}

export const LEGACY_CORRECTION_LABEL = 'Correction'

// A correction has no rule (PO-LG-01); every other entry is labelled from the
// action of the rule version that produced it.
export function formatLegacyEntryLabel(entry: LegacyEntry, rules: LegacyRule[]): string {
  if (entry.corrects !== null) return LEGACY_CORRECTION_LABEL
  if (entry.source.kind === 'season_end') return LEGACY_ACTION_LABELS.season_end_bonus
  const rule = rules.find((r) => r.id === entry.ruleId)
  return rule ? LEGACY_ACTION_LABELS[rule.action] : 'Points Legacy'
}

// "+5 pts" / "−5 pts" (true minus sign), "1 pt" never pluralised.
export function formatLegacyPoints(points: number, options: { signed?: boolean } = {}): string {
  const abs = Math.abs(points)
  const sign = points < 0 ? '−' : options.signed ? '+' : ''
  return `${sign}${abs.toLocaleString('fr-FR')} ${abs > 1 ? 'pts' : 'pt'}`
}

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  football: 'Football',
  esport: 'E-sport',
  echecs: 'Échecs',
  domino: 'Domino',
}
