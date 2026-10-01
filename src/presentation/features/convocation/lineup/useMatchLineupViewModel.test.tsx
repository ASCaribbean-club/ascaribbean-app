import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatchLineup } from '@domain/entities/match-lineup'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { useConvocationDependencies } from '@presentation/di/hooks/use-convocation-dependencies'
import { useMatchLineupViewModel } from './useMatchLineupViewModel'

vi.mock('@presentation/shared/hooks/use-permission')
vi.mock('@presentation/di/hooks/use-convocation-dependencies')

const KICKOFF = '2026-10-10T15:00:00.000Z'
const RDV = '2026-10-10T13:30:00.000Z'

const savedLineup: MatchLineup = {
  convocationId: 'c1',
  formation: '4-4-2',
  placements: [
    { slotIndex: 0, userId: 'a', displayName: 'Player A' },
    { slotIndex: 1, userId: 'b', displayName: 'Player B' },
  ],
}

const save = vi.fn(async () => true)

function setup(overrides: Partial<Parameters<typeof useMatchLineupViewModel>[0]> = {}, lineup: MatchLineup | null = savedLineup) {
  vi.mocked(usePermission).mockReturnValue(true)
  vi.mocked(useConvocationDependencies).mockReturnValue({
    getMatchLineupUseCase: { execute: async () => lineup },
    saveMatchLineupUseCase: { execute: save },
    listConvocationRespondersUseCase: {
      execute: async () =>
        ['a', 'b', 'c'].map((id) => ({ userId: id, hasResponded: false, displayName: `Player ${id.toUpperCase()}`, position: null })),
    },
  } as unknown as ReturnType<typeof useConvocationDependencies>)

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
  )
  return renderHook(
    () =>
      useMatchLineupViewModel({
        convocationId: 'c1',
        teamId: 't1',
        convocationType: 'match',
        kickoff: KICKOFF,
        meetingPointTime: RDV,
        sectionType: 'football',
        activeRole: 'coach',
        roleMatchesConvocationTeam: true,
        isTabActive: true,
        now: new Date('2026-10-10T10:00:00.000Z'),
        onLeave: vi.fn(),
        ...overrides,
      }),
    { wrapper },
  )
}

describe('useMatchLineupViewModel', () => {
  beforeEach(() => save.mockClear())

  it('hides the tab for a training or a non-football section (AC-MC-01)', () => {
    expect(setup({ convocationType: 'training' }).result.current.isTabAvailable).toBe(false)
    expect(setup({ sectionType: 'esport' }).result.current.isTabAvailable).toBe(false)
  })

  it('shows a player the waiting message with the computed RDV time before the window (AC-MC-10)', () => {
    const { result } = setup({ activeRole: 'player' })
    expect(result.current.status).toBe('waiting')
    expect(result.current.waitingMessage).toMatch(/^La composition sera disponible à l’heure du rendez-vous, à \d{2}:\d{2}\.$/)
    expect(result.current.canEdit).toBe(false)
  })

  it('uses wording without a rendez-vous in the fallback case (PO-MC-12)', () => {
    const { result } = setup({ activeRole: 'player', meetingPointTime: null })
    expect(result.current.waitingMessage).toMatch(/une heure avant le coup d’envoi/)
    expect(result.current.waitingMessage).not.toMatch(/rendez-vous/)
  })

  it('lets a player read once the window has opened, without edit control (AC-MC-11)', async () => {
    const { result } = setup({ activeRole: 'player', now: new Date('2026-10-10T14:00:00.000Z') })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.canEdit).toBe(false)
    expect(result.current.title).toBe('COMPOSITION — 4-4-2')
  })

  it('lets the coach read before the RDV (PO-MC-02, AC-MC-23)', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.canEdit).toBe(true)
  })

  it('shows the explicit empty state when no lineup exists (AC-MC-14)', async () => {
    const { result } = setup({}, null)
    await waitFor(() => expect(result.current.status).toBe('empty'))
  })

  it('starts a first composition on 4-3-3 with eleven free slots', async () => {
    const { result } = setup({}, null)
    await waitFor(() => expect(result.current.status).toBe('empty'))
    act(() => result.current.onStartEditing())
    expect(result.current.formation).toBe('4-3-3')
    expect(result.current.slots.every((slot) => slot.userId === null)).toBe(true)
    expect(result.current.bannerText).toBe('Composition incomplète : 11 poste(s) à pourvoir.')
  })

  it('swaps two players and keeps the formation change from removing anyone (AC-MC-04/05)', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.onStartEditing())
    act(() => result.current.onSelectFormation('3-5-2'))
    expect(result.current.slots.filter((slot) => slot.userId).length).toBe(2)

    act(() => result.current.onSelectSlot(0))
    act(() => result.current.onToggleSwap())
    expect(result.current.bannerText).toBe('Touchez un autre joueur pour échanger les positions.')
    act(() => result.current.onSelectSlot(1))

    expect(result.current.slots[0].userId).toBe('b')
    expect(result.current.slots[1].userId).toBe('a')
    expect(result.current.panel).toBeNull()
  })

  it('offers only convoked players off the field in Remplacer, and replaces (AC-MC-06)', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    await waitFor(() => expect(result.current.canEdit).toBe(true))
    act(() => result.current.onStartEditing())
    act(() => result.current.onSelectSlot(0))
    act(() => result.current.onToggleReplace())
    await waitFor(() => expect(result.current.panel?.availablePlayers).toEqual([{ userId: 'c', displayName: 'Player C' }]))

    act(() => result.current.onPickPlayer('c'))
    expect(result.current.slots[0].userId).toBe('c')
    expect(result.current.slots.some((slot) => slot.userId === 'a')).toBe(false)
  })

  it('saves on Terminé when changed, and skips the call when nothing changed (AC-MC-08)', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.onStartEditing())
    act(() => result.current.onDone())
    expect(save).not.toHaveBeenCalled()
    expect(result.current.isEditing).toBe(false)

    act(() => result.current.onStartEditing())
    act(() => result.current.onSelectFormation('4-3-3'))
    act(() => result.current.onDone())
    await waitFor(() => expect(save).toHaveBeenCalledOnce())
    await waitFor(() => expect(result.current.isEditing).toBe(false))
  })

  it('keeps the edit mode open and the draft when saving fails', async () => {
    save.mockRejectedValueOnce(new Error('boom'))
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.onStartEditing())
    act(() => result.current.onSelectFormation('4-3-3'))
    act(() => result.current.onDone())
    await waitFor(() => expect(result.current.saveError).toBe('Enregistrement impossible. Réessayez.'))
    expect(result.current.isEditing).toBe(true)
    expect(result.current.formation).toBe('4-3-3')
  })

  it('asks for confirmation before leaving with unsaved changes', async () => {
    const onLeave = vi.fn()
    const { result } = setup({ onLeave })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.onStartEditing())
    act(() => result.current.requestLeave())
    expect(onLeave).toHaveBeenCalledOnce() // nothing changed yet -> no dialog

    act(() => result.current.onSelectFormation('4-3-3'))
    act(() => result.current.requestLeave())
    expect(result.current.isLeavePending).toBe(true)
    expect(onLeave).toHaveBeenCalledOnce()
    act(() => result.current.confirmLeave())
    expect(onLeave).toHaveBeenCalledTimes(2)
  })
})
