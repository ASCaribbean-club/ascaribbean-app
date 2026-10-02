import { describe, expect, it } from 'vitest'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { MissionDeadlinePassedError } from '@domain/errors/mission-deadline-passed-error'
import { ReleaseMissionUseCase } from './ReleaseMissionUseCase'
import {
  AT_DEADLINE,
  BEFORE_DEADLINE,
  CONVOCATION_ID,
  coachOfTeam,
  fakeConvocationRepository,
  fakeMissionRepository,
  fakeRespondersRepository,
  fakeTeamRepository,
  fakeUserRepository,
  playerAndAdmin,
  playerUser,
} from './convocation-mission-fakes'
import type { User } from '@domain/entities/user'

function build(user: User, now: Date, rosterIds: string[], repo = fakeMissionRepository()) {
  const useCase = new ReleaseMissionUseCase(
    fakeUserRepository(user),
    fakeConvocationRepository(),
    fakeTeamRepository(),
    fakeRespondersRepository(rosterIds),
    repo,
    () => now,
  )
  return { useCase, repo }
}

const input = (actorId: string) => ({ actorId, convocationId: CONVOCATION_ID, missionId: 'mission-1' })

describe('ReleaseMissionUseCase', () => {
  it('releases the actor own assignment before the deadline', async () => {
    const { useCase, repo } = build(playerUser(), BEFORE_DEADLINE, ['player-1'])
    await useCase.execute(input('player-1'))
    expect(repo.release).toHaveBeenCalledWith('mission-1', 'player-1')
  })

  it('throws ForbiddenError without mission:self-assign', async () => {
    const { useCase, repo } = build(coachOfTeam(), BEFORE_DEADLINE, ['coach-1'])
    await expect(useCase.execute(input('coach-1'))).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.release).not.toHaveBeenCalled()
  })

  it('throws MissionDeadlinePassedError past the deadline, without repository call', async () => {
    const { useCase, repo } = build(playerUser(), AT_DEADLINE, ['player-1'])
    await expect(useCase.execute(input('player-1'))).rejects.toBeInstanceOf(MissionDeadlinePassedError)
    expect(repo.release).not.toHaveBeenCalled()
  })

  it('exempts a holder of mission:manage from the deadline', async () => {
    const { useCase, repo } = build(playerAndAdmin(), AT_DEADLINE, ['player-admin-1'])
    await useCase.execute(input('player-admin-1'))
    expect(repo.release).toHaveBeenCalledWith('mission-1', 'player-admin-1')
  })
})
