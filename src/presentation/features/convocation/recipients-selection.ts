import type { CompetitionType } from '@domain/entities/competition-type'
import type { ConvocationType } from '@domain/entities/convocation'
import type { ConvocationUnavailability } from '@domain/usecases/team-availability/GetConvocationAvailabilityUseCase'
import {
  getAttendeeCap,
  getAttendeeCapExcess,
  hasMinimumAttendees,
  isWithinAttendeeCap,
} from '@domain/policies/convocation-attendee-rules'

// specs/convocation-player-selection.md UI design §3 — the pure part of the
// DESTINATAIRES card's ViewModel: which ids are selected, what the counter
// says, which blocking message applies. No React here, so it is unit-tested
// directly. The cap itself comes from domain/policies/convocation-attendee-rules
// (never a number in a component).

/**
 * `custom` is `null` while the coach keeps "Toute l'équipe" (every player of the
 * team is convoked); it holds the explicit selection once the list is in use.
 * Ids that are no longer players of the team (refetched roster) are dropped.
 */
export function resolveSelectedIds(allPlayerIds: string[], custom: string[] | null): string[] {
  if (custom === null) return allPlayerIds
  const known = new Set(allPlayerIds)
  return custom.filter((id) => known.has(id))
}

export function toggleSelection(selectedIds: string[], userId: string): string[] {
  return selectedIds.includes(userId) ? selectedIds.filter((id) => id !== userId) : [...selectedIds, userId]
}

/**
 * PO-CPS-10: on an official match of a team larger than the cap, "Toute
 * l'équipe" cannot stay active — selecting everyone would break the cap.
 */
export function isAllTeamLocked(
  playerCount: number,
  type: ConvocationType,
  competitionType: CompetitionType | null,
): boolean {
  return !isWithinAttendeeCap(playerCount, type, competitionType)
}

export type CounterTone = 'ok' | 'warning' | 'error'

export interface RecipientsCounter {
  text: string
  tone: CounterTone
}

/** The header counter of the card (UI design §3, "Compteur et plafond"). */
export function describeCounter(count: number, type: ConvocationType, competitionType: CompetitionType | null): RecipientsCounter {
  if (count === 0) return { text: 'Aucun sélectionné', tone: 'error' }

  const cap = getAttendeeCap(type, competitionType)
  if (cap === null) return { text: `${count} sélectionné${count > 1 ? 's' : ''}`, tone: 'ok' }

  if (count > cap) return { text: `${count} / ${cap} · ${cap} maximum`, tone: 'error' }
  if (count === cap) return { text: `${cap} / ${cap} · maximum atteint`, tone: 'warning' }
  return { text: `${count} / ${cap} sélectionné${count > 1 ? 's' : ''}`, tone: 'ok' }
}

/** "Décochez N joueur(s)" blocking message, or null when the selection is valid. */
export function describeCapExcess(count: number, type: ConvocationType, competitionType: CompetitionType | null): string | null {
  const cap = getAttendeeCap(type, competitionType)
  const excess = getAttendeeCapExcess(count, type, competitionType)
  if (cap === null || excess === 0) return null
  return `Un match officiel est limité à ${cap} convoqués. Décochez ${excess} joueur${excess > 1 ? 's' : ''} pour continuer.`
}

export const NO_PLAYER_SELECTED_MESSAGE = 'Sélectionnez au moins un joueur'
export const EMPTY_TEAM_MESSAGE = 'Cette équipe n’a aucun joueur à convoquer'

/**
 * The single blocking message of the selection (first that applies), or null.
 * Mirrors what the use case and the database refuse (≥ 1, ≤ cap).
 */
export function getSelectionBlockingMessage(
  count: number,
  type: ConvocationType,
  competitionType: CompetitionType | null,
): string | null {
  if (!hasMinimumAttendees(count)) return NO_PLAYER_SELECTED_MESSAGE
  return describeCapExcess(count, type, competitionType)
}

const RETURN_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

function formatReturnDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return RETURN_DATE.format(new Date(year, month - 1, day))
}

/**
 * Text shown on a player who cannot be convoked. The end bound is exclusive
 * (the player is back ON that day), hence "retour le". A medical case arrives
 * as a bare 'unavailable': no reason, no date.
 */
export function describeUnavailability(unavailability: ConvocationUnavailability): string {
  const back = unavailability.returnOn ? ` · retour le ${formatReturnDate(unavailability.returnOn)}` : ''
  switch (unavailability.reason) {
    case 'absent':
      return `Indisponible : ${unavailability.detail ?? 'absent'}${back}`
    case 'suspended':
      return `Suspendu${back}`
    case 'unavailable':
      return 'Indisponible'
  }
}

export function describeUnavailableNotice(unavailableCount: number): string | null {
  if (unavailableCount === 0) return null
  return unavailableCount === 1
    ? '1 joueur indisponible ne peut pas être convoqué'
    : `${unavailableCount} joueurs indisponibles ne peuvent pas être convoqués`
}

// --- Shape handed by the ViewModel to RecipientsCard (components/RecipientsCard.tsx).
// Declared here, next to the pure logic that fills it, so the component only
// renders booleans/strings it was given (ARCHITECTURE.md §6).

export interface RecipientsPlayerView {
  userId: string
  displayName: string
  selected: boolean
  // Non-null = the player cannot be convoked: the row is disabled and shows
  // this text (reason + return date when known). Never a health detail.
  unavailableLabel: string | null
}

export interface RecipientsViewModel {
  status: 'loading' | 'error' | 'empty' | 'ready'
  players: RecipientsPlayerView[]
  // The "Toute l'équipe" switch state, and whether it can be turned on.
  isAllTeamActive: boolean
  isAllTeamLocked: boolean
  // Replaces the card subtitle while the switch is locked (PO-CPS-10).
  allTeamLockedMessage: string | null
  // "N joueurs" under the switch when the list is open.
  playerCountLabel: string
  // "N indisponibles ne seront pas convoqués", null when everyone can be convoked.
  unavailableNotice: string | null
  counter: RecipientsCounter | null
  // First blocking message of the selection (also repeated by the form's sticky
  // error zone), rendered as the destructive alert under the list.
  blockingMessage: string | null
  // "Tout désélectionner" / "Tout sélectionner"; null = absent (never greyed).
  bulkActionLabel: string | null
  onToggleAllTeam: (active: boolean) => void
  onTogglePlayer: (userId: string) => void
  onBulkAction: () => void
  onRetry: () => void
}
