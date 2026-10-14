import { describe, expect, it } from 'vitest'
import { DomainError } from '@domain/errors/domain-error'
import { shouldReportError } from './should-report-error'

// Découvre toutes les sous-classes de DomainError du dossier : une nouvelle
// erreur métier est couverte automatiquement, sans toucher à ce test.
const modules = import.meta.glob('@domain/errors/*.ts', { eager: true }) as Record<string, Record<string, unknown>>

const domainErrorClasses = Object.values(modules)
  .flatMap((mod) => Object.values(mod))
  .filter(
    (value): value is new (...args: never[]) => DomainError =>
      typeof value === 'function' && value !== DomainError && value.prototype instanceof DomainError,
  )

describe('shouldReportError', () => {
  it('finds the DomainError subclasses', () => {
    expect(domainErrorClasses.length).toBeGreaterThan(50)
  })

  it.each(domainErrorClasses.map((cls) => [cls.name, cls] as const))('does not report %s (business rule, not a bug)', (_name, cls) => {
    // Object.create : évite les constructeurs qui exigent des arguments précis.
    const instance = Object.create(cls.prototype) as DomainError
    expect(shouldReportError(instance)).toBe(false)
  })

  it('does not report a subclass defined outside domain/errors', () => {
    class LocalDomainError extends DomainError {}
    expect(shouldReportError(new LocalDomainError('x'))).toBe(false)
  })

  it.each([
    ['Error', new Error('network down')],
    ['TypeError', new TypeError('x is undefined')],
    ['RangeError', new RangeError('out of range')],
    ['a string', 'boom'],
    ['an object', { code: 500 }],
    ['null', null],
    ['undefined', undefined],
  ])('reports %s (network, unknown or programming error)', (_label, error) => {
    expect(shouldReportError(error)).toBe(true)
  })
})
