export type MembershipStatus = 'pending' | 'active' | 'suspended'

export type Season = `${number}-${number}`

export interface Membership {
  id: string
  userId: string
  licenceNumber: string | null
  status: MembershipStatus
  season: Season
  validUntil: string // ISO date
}
