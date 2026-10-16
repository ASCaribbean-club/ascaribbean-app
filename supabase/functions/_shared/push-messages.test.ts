import { describe, expect, it } from 'vitest'
import { buildPushMessage, dayRelativeTo, formatClockTime, joinNames } from './push-messages'

const TZ = 'Europe/Paris'
const now = new Date('2026-10-20T10:00:00.000Z')
const emoji = /\p{Extended_Pictographic}/gu

describe('helpers', () => {
  it('formats the clock time', () => {
    expect(formatClockTime(new Date('2026-10-21T13:00:00.000Z'), TZ)).toBe('15 h')
    expect(formatClockTime(new Date('2026-10-21T13:30:00.000Z'), TZ)).toBe('15 h 30')
  })
  it('resolves today / tomorrow in the club zone', () => {
    expect(dayRelativeTo(new Date('2026-10-20T20:00:00.000Z'), now, TZ)).toBe('today')
    expect(dayRelativeTo(new Date('2026-10-21T13:00:00.000Z'), now, TZ)).toBe('tomorrow')
    expect(dayRelativeTo(new Date('2026-10-25T13:00:00.000Z'), now, TZ)).toBe('other')
  })
  it('joins names', () => {
    expect(joinNames(['A'])).toBe('A')
    expect(joinNames(['A', 'B'])).toBe('A et B')
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B et C')
  })
})

describe('buildPushMessage', () => {
  const base = { user_id: 'u', convocation_id: 'c1', opponent_name: 'Opponent', category_label: 'Joueur du match' }

  it('T1 opening and before closing, with the category label from the base', () => {
    const opening = buildPushMessage({ ...base, kind: 'vote_reminder', stage: 'opening' }, now, TZ)
    const closing = buildPushMessage({ ...base, kind: 'vote_reminder', stage: 'before_closing' }, now, TZ)
    expect(opening.body).toContain('joueur du match contre Opponent')
    expect(opening.url).toBe('/convocations/c1')
    expect(closing.body).toContain('24 h')
    expect(opening.tag).not.toBe(closing.tag)
  })

  it('T2 match tomorrow and training this evening', () => {
    const match = buildPushMessage(
      { ...base, kind: 'convocation_reminder', convocation_type: 'match', starts_at: '2026-10-21T13:00:00.000Z' },
      now,
      TZ,
    )
    expect(match.title).toBe('Match demain à 15 h')
    const training = buildPushMessage(
      { ...base, kind: 'convocation_reminder', convocation_type: 'training', starts_at: '2026-10-20T17:30:00.000Z' },
      now,
      TZ,
    )
    expect(training.title).toBe('Entraînement ce soir à 19 h 30')
  })

  it('T3 carries no emoji, amount or link to a person', () => {
    const msg = buildPushMessage({ user_id: 'u', kind: 'dues_reminder' }, now, TZ)
    expect(msg.title.match(emoji)).toBeNull()
    expect(msg.body.match(emoji)).toBeNull()
    expect(`${msg.title} ${msg.body}`).not.toMatch(/\d/)
    expect(msg.url).toBe('/')
  })

  it('T5 names a single winner, or every tied winner', () => {
    const one = buildPushMessage({ ...base, kind: 'mvp_announcement', winners: ['Winner One'] }, now, TZ)
    expect(one.title).toBe('🏆 Joueur du match contre Opponent')
    expect(one.body).toBe('Bravo à Winner One !')
    const tie = buildPushMessage({ ...base, kind: 'mvp_announcement', winners: ['Winner One', 'Winner Two'] }, now, TZ)
    expect(tie.title).toContain('Égalité')
    expect(tie.body).toBe('Bravo à Winner One et Winner Two, élus ex æquo !')
  })

  it('never uses more than one emoji per notification', () => {
    const items = [
      { ...base, kind: 'vote_reminder', stage: 'opening' },
      { ...base, kind: 'vote_reminder', stage: 'before_closing' },
      { ...base, kind: 'convocation_reminder', convocation_type: 'match', starts_at: '2026-10-21T13:00:00.000Z' },
      { ...base, kind: 'mvp_announcement', winners: ['A', 'B'] },
    ] as const
    for (const item of items) {
      const msg = buildPushMessage(item, now, TZ)
      expect(`${msg.title} ${msg.body}`.match(emoji)?.length ?? 0).toBeLessThanOrEqual(1)
    }
  })
})
