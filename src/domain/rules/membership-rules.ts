// Règles dérivées de l'état d'une Membership : "qu'est-ce qui est vrai",
// jamais "qui a le droit" — l'autorisation reste dans domain/policies/.

import type { Membership } from '../entities/membership'

export function isExpired(membership: Membership): boolean {
  return new Date(membership.validUntil).getTime() < Date.now()
}

export function hasValidLicence(membership: Membership): boolean {
  return membership.licenceNumber !== null && !isExpired(membership)
}

export function isActive(membership: Membership): boolean {
  return membership.status === 'active' && !isExpired(membership)
}
