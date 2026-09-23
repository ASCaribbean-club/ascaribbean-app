import { describe, expect, it, vi } from 'vitest'
import { InvitationLinkInvalidError } from '../../errors/invitation-link-invalid-error'
import type { AuthRepository } from '../../repositories/auth-repository'
import { VerifyInvitationLinkUseCase } from './VerifyInvitationLinkUseCase'

function fakeAuthRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    getSession: async () => null,
    onSessionChange: () => () => {},
    signInWithPassword: async () => {},
    requestMagicLink: async () => {},
    requestPasswordReset: async () => {},
    verifyInvitationLink: vi.fn(async () => {}),
    hasRecoveryLinkError: () => false,
    updatePassword: async () => {},
    signOut: async () => {},
    ...overrides,
  }
}

describe('VerifyInvitationLinkUseCase', () => {
  it('calls through to the repository with the token hash and type', async () => {
    const verifyInvitationLink = vi.fn(async () => {})
    const useCase = new VerifyInvitationLinkUseCase(fakeAuthRepository({ verifyInvitationLink }))

    await useCase.execute({ tokenHash: 'abc', type: 'invite' })

    expect(verifyInvitationLink).toHaveBeenCalledWith('abc', 'invite')
  })

  it('propagates whatever error the repository throws, without swallowing or rewrapping it', async () => {
    const useCase = new VerifyInvitationLinkUseCase(
      fakeAuthRepository({
        verifyInvitationLink: vi.fn(async () => {
          throw new InvitationLinkInvalidError('expired')
        }),
      }),
    )

    await expect(useCase.execute({ tokenHash: 'abc', type: 'magiclink' })).rejects.toThrow(InvitationLinkInvalidError)
  })
})
