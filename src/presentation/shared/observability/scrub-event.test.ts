import { describe, expect, it } from 'vitest'
import { scrubEvent } from './scrub-event'

describe('scrubEvent', () => {
  it('replaces the resolved URL with the route pattern', () => {
    const result = scrubEvent(
      { event: 'screen_viewed', properties: { route: '/convocations/:id', $current_url: 'https://x/convocations/abc', $pathname: '/convocations/abc', $referrer: 'https://x/members/jean', $title: 'Jean D.' } },
      '/convocations/:id',
    )
    expect(result.properties).toEqual({ route: '/convocations/:id', $current_url: '/convocations/:id', $pathname: '/convocations/:id', $geoip_disable: true })
  })

  it('drops the exception message but keeps class name and stack', () => {
    const result = scrubEvent(
      {
        event: '$exception',
        properties: {
          $exception_list: [{ type: 'TypeError', value: 'Cannot read name of Jean Dupont', mechanism: { handled: false }, stacktrace: { type: 'raw', frames: [{ filename: 'a.js', lineno: 1 }] } }],
          $exception_message: 'Cannot read name of Jean Dupont',
          source: 'window_error',
        },
      },
      '/calendar',
    )
    const list = result.properties!.$exception_list as Record<string, unknown>[]
    expect(list[0]).toEqual({ type: 'TypeError', mechanism: { handled: false }, stacktrace: { type: 'raw', frames: [{ filename: 'a.js', lineno: 1 }] } })
    expect(JSON.stringify(result)).not.toContain('Jean')
    expect(result.properties).not.toHaveProperty('$exception_message')
  })

  it('drops unknown properties (email, name, reason)', () => {
    const result = scrubEvent({ event: 'convocation_responded', properties: { status: 'present', email: 'a@b.c', fullName: 'X', reason: 'blessé' } }, '/')
    expect(result.properties).toHaveProperty('status', 'present')
    expect(result.properties).not.toHaveProperty('email')
    expect(result.properties).not.toHaveProperty('fullName')
    expect(result.properties).not.toHaveProperty('reason')
  })

  it('keeps only roles in person properties', () => {
    const result = scrubEvent({ event: '$identify', properties: {}, $set: { roles: ['coach'], email: 'a@b.c', name: 'X' }, $set_once: { $initial_current_url: 'https://x/members/jean' } }, '/')
    expect(result.$set).toEqual({ roles: ['coach'] })
    expect(result.$set_once).toBeUndefined()
  })

  it('keeps convocation context and the active role, nothing else', () => {
    const result = scrubEvent(
      {
        event: 'convocation_tab_viewed',
        properties: { tab: 'votes', convocation_type: 'match', convocation_date: '2026-10-14', active_role: 'coach', convocation_id: 'secret', opponent: 'AS Rivale' },
      },
      '/convocations/:id',
    )
    expect(result.properties).toMatchObject({ tab: 'votes', convocation_type: 'match', convocation_date: '2026-10-14', active_role: 'coach' })
    expect(result.properties).not.toHaveProperty('convocation_id')
    expect(result.properties).not.toHaveProperty('opponent')
  })
})
