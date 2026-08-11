export type MembershipStatus = 'pending' | 'active' | 'suspended'

export interface Membership {
  id: string
  userId: string
  licenceNumber: string | null
  status: MembershipStatus
  seasonId: string
  validUntil: string // ISO date
}
