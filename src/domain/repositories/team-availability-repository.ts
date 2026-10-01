import type { IsoDate } from '@domain/entities/unavailability'
import type { AvailabilityStatus, TeammateAvailabilityStatus } from '@domain/policies/availability'

// specs/player-unavailability.md §3 — read model of the team list, DISTINCT
// from UnavailabilityRepository (whose four methods are fixed by AC-PU-10 and
// return raw Unavailability entities). A teammate must never receive raw
// rows, so this port is backed by the get_team_availability RPC
// (supabase/migrations/20261001175044_player_unavailability.sql), which
// projects the status server-side per caller.
export interface TeamAvailabilityRow {
  userId: string
  displayName: string
  // Coach caller: 'available' | 'medical' | 'suspended'.
  // Player caller: 'available' | 'unavailable' | 'suspended'.
  status: AvailabilityStatus | TeammateAvailabilityStatus
  startsOn: IsoDate | null
  // expectedReturnOn / liftedOn — exclusive bound.
  endsOn: IsoDate | null
}

export interface TeamAvailabilityRepository {
  // An out-of-scope teamId resolves to [] (no existence leak), same shape as
  // TeamRosterRepository.listPlayers.
  listForTeam(teamId: string): Promise<TeamAvailabilityRow[]>
}
