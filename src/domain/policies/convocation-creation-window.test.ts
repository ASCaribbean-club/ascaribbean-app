import { describe, expect, it } from 'vitest'
import type { ConvocationType } from '../entities/convocation'
import { getConvocationCreationWindow, isRetroactiveConvocation } from './convocation-creation-window'

const START = new Date('2026-08-10T18:00:00.000Z')
const minutesFromStart = (minutes: number) => new Date(START.getTime() + minutes * 60_000)

// Response deadline = start minus this many minutes (response-deadline.ts).
const CASES: Array<[ConvocationType, number]> = [
  ['training', 10],
  ['match', 60],
  ['meeting', 60],
]

describe('getConvocationCreationWindow', () => {
  it.each(CASES)('%s — one minute before the deadline is open', (type, deadline) => {
    expect(getConvocationCreationWindow(type, START, minutesFromStart(-deadline - 1))).toBe('open')
  })

  it.each(CASES)('%s — exactly at the deadline is response_closed', (type, deadline) => {
    expect(getConvocationCreationWindow(type, START, minutesFromStart(-deadline))).toBe('response_closed')
  })

  it.each(CASES)('%s — one minute before kickoff is response_closed', (type) => {
    expect(getConvocationCreationWindow(type, START, minutesFromStart(-1))).toBe('response_closed')
  })

  it.each(CASES)('%s — exactly at kickoff is retroactive', (type) => {
    expect(getConvocationCreationWindow(type, START, START)).toBe('retroactive')
  })

  it.each(CASES)('%s — after kickoff is retroactive', (type) => {
    expect(getConvocationCreationWindow(type, START, minutesFromStart(60 * 24))).toBe('retroactive')
  })
})

describe('isRetroactiveConvocation', () => {
  const date = '2026-08-10T18:00:00.000Z'

  it('is false when created before kickoff', () => {
    expect(isRetroactiveConvocation({ date, createdAt: '2026-08-10T17:59:59.000Z' })).toBe(false)
  })

  it('is true when created exactly at kickoff', () => {
    expect(isRetroactiveConvocation({ date, createdAt: date })).toBe(true)
  })

  it('is true when created after kickoff', () => {
    expect(isRetroactiveConvocation({ date, createdAt: '2026-08-11T09:00:00.000Z' })).toBe(true)
  })
})
