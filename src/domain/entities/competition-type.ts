// specs/convocation-player-selection.md §2 "Type de compétition" + PO-CPS-01
// (decided by the developer): exactly two values, persisted on
// match_details.competition_type (not null, no default, check constraint).
// 'official' covers league AND cup matches — no separate is_official boolean
// next to this column, and no third value.
export type CompetitionType = 'official' | 'friendly'

export const COMPETITION_TYPES: CompetitionType[] = ['official', 'friendly']
