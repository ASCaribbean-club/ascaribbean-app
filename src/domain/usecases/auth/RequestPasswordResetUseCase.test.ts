import { describe, expect, it, vi } from 'vitest'
import type { AuthRepository } from '../../repositories/auth-repository'
import { RequestPasswordResetUseCase } from './RequestPasswordResetUseCase'

describe('RequestPasswordResetUseCase', () => {
  it('delegates to AuthRepository.requestPasswordReset with the given email', async () => {
    const requestPasswordReset = vi.fn().mockResolvedValue(undefined)
    const authRepository = { requestPasswordReset } as unknown as AuthRepository

    await new RequestPasswordResetUseCase(authRepository).execute({ email: 'joueur@example.fr' })

    expect(requestPasswordReset).toHaveBeenCalledWith('joueur@example.fr')
  })
})
