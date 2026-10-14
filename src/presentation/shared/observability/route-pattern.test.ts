import { describe, expect, it } from 'vitest'
import { toRoutePattern } from './route-pattern'

describe('toRoutePattern', () => {
  it('replaces a param value with its name', () => {
    expect(toRoutePattern('/convocations/abc-123', { id: 'abc-123' })).toBe('/convocations/:id')
  })

  it('handles several params', () => {
    expect(toRoutePattern('/admin/convocations/c1/attendance', { convocationId: 'c1' })).toBe('/admin/convocations/:convocationId/attendance')
  })

  it('leaves static routes untouched', () => {
    expect(toRoutePattern('/calendar', {})).toBe('/calendar')
    expect(toRoutePattern('/', {})).toBe('/')
  })

  it('matches URL-encoded values', () => {
    expect(toRoutePattern('/actus/a%20b/edit', { newsId: 'a b' })).toBe('/actus/:newsId/edit')
  })

  it('never leaks a param value', () => {
    expect(toRoutePattern('/convocations/secret-uuid', { id: 'secret-uuid' })).not.toContain('secret-uuid')
  })
})
