import { describe, expect, it, vi } from 'vitest'
import type { AuthRepository } from '../../repositories/auth-repository'
import { RequestMagicLinkUseCase } from './RequestMagicLinkUseCase'

describe('RequestMagicLinkUseCase', () => {
  it('delegates to AuthRepository.requestMagicLink with the given email', async () => {
    const requestMagicLink = vi.fn().mockResolvedValue(undefined)
    const authRepository = { requestMagicLink } as unknown as AuthRepository

    await new RequestMagicLinkUseCase(authRepository).execute({ email: 'joueur@example.fr' })

    expect(requestMagicLink).toHaveBeenCalledWith('joueur@example.fr')
  })
})
