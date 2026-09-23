import { describe, expect, it } from 'vitest'
import { buildInvitationMessage } from './invitation-message'

// specs/web-users-invitation-links.md §3 — generic first names only in
// fixtures, never a real person's name (CLAUDE.md §9).
describe('buildInvitationMessage', () => {
  it('includes the first name, the link, and the validity in hours', () => {
    const message = buildInvitationMessage({ firstName: 'Joueur', url: 'https://app.example.com/activation?token_hash=abc&type=invite', validityHours: 1 })

    expect(message).toContain('Bonjour Joueur')
    expect(message).toContain('https://app.example.com/activation?token_hash=abc&type=invite')
    expect(message).toContain('valable 1 h')
  })

  it('reflects a different validity value without a hardcoded fallback', () => {
    const message = buildInvitationMessage({ firstName: 'Membre', url: 'https://app.example.com/activation?token_hash=xyz&type=magiclink', validityHours: 24 })

    expect(message).toContain('valable 24 h')
  })
})
