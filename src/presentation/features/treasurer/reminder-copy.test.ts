import { describe, expect, it } from 'vitest'
import { buildReminderConfirmTitle, buildReminderFeedback } from './reminder-copy'

describe('buildReminderConfirmTitle', () => {
  it('names the member for a single named card', () => {
    expect(buildReminderConfirmTitle(1, 'Joueur A')).toBe('Relancer Joueur A ?')
  })

  it('counts a bulk send and pluralises', () => {
    expect(buildReminderConfirmTitle(3)).toBe('Relancer 3 licenciés ?')
    expect(buildReminderConfirmTitle(1)).toBe('Relancer 1 licencié ?')
  })
})

describe('buildReminderFeedback', () => {
  it('reports a complete send on one line for 3 s', () => {
    expect(buildReminderFeedback(1, 0)).toEqual({ tone: 'success', lines: ['1 relance envoyée'], durationMs: 3000 })
    expect(buildReminderFeedback(8, 0).lines).toEqual(['8 relances envoyées'])
  })

  it('adds a "non envoyée(s)" line with the reason on a partial send, shown 5 s', () => {
    const feedback = buildReminderFeedback(7, 2)
    expect(feedback.tone).toBe('success')
    expect(feedback.lines).toHaveLength(2)
    expect(feedback.lines[0]).toBe('7 relances envoyées')
    expect(feedback.lines[1]).toBe('2 non envoyée(s) : déjà relancé(s) il y a moins de 7 jours ou soldé(s) entre-temps')
    expect(feedback.durationMs).toBe(5000)
  })

  it('is neutral when nothing was sent', () => {
    const feedback = buildReminderFeedback(0, 3)
    expect(feedback.tone).toBe('neutral')
    expect(feedback.lines).toEqual(['Aucune relance envoyée : déjà relancé(s) il y a moins de 7 jours ou soldé(s) entre-temps'])
  })
})
