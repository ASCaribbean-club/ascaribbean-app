import { describe, expect, it, vi } from 'vitest'
import type { AuthRepository } from '../../repositories/auth-repository'
import { UpdatePasswordUseCase } from './UpdatePasswordUseCase'

describe('UpdatePasswordUseCase', () => {
  it('delegates to AuthRepository.updatePassword with the given password', async () => {
    const updatePassword = vi.fn().mockResolvedValue(undefined)
    const authRepository = { updatePassword } as unknown as AuthRepository

    await new UpdatePasswordUseCase(authRepository).execute({ newPassword: 'nouveauMotDePasse1' })

    expect(updatePassword).toHaveBeenCalledWith('nouveauMotDePasse1')
  })
})
