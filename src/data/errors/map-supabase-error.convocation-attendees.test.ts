import type { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { ConvocationAttendeeAddRefusedError } from '@domain/errors/convocation-attendee-add-refused-error'
import { ConvocationAttendeeCapExceededError } from '@domain/errors/convocation-attendee-cap-exceeded-error'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidConvocationInputError } from '@domain/errors/invalid-convocation-input-error'
import { mapSupabaseError } from './map-supabase-error'

const pgError = (code: string, message: string): PostgrestError => ({ code, message, details: '', hint: '', name: 'PostgrestError', toJSON: () => ({}) }) as PostgrestError

// specs/convocation-player-selection.md AC-CPS-04/AC-CPS-06/AC-CPS-11
describe('mapSupabaseError — convocation attendees', () => {
  it('maps the cap trigger to ConvocationAttendeeCapExceededError', () => {
    expect(mapSupabaseError(pgError('23514', 'convocation_attendee_cap_exceeded'))).toBeInstanceOf(ConvocationAttendeeCapExceededError)
  })

  it('maps the team-player trigger and the empty-list guard to InvalidConvocationInputError', () => {
    expect(mapSupabaseError(pgError('23514', 'convocation_attendee_not_team_player'))).toBeInstanceOf(InvalidConvocationInputError)
    expect(mapSupabaseError(pgError('23514', 'convocation_attendees_required'))).toBeInstanceOf(InvalidConvocationInputError)
  })

  it('maps a row-level-security refusal on convocation_attendees to ConvocationAttendeeAddRefusedError', () => {
    const result = mapSupabaseError(pgError('42501', 'new row violates row-level security policy for table "convocation_attendees"'))
    expect(result).toBeInstanceOf(ConvocationAttendeeAddRefusedError)
  })

  it('keeps any other 42501 refusal as ForbiddenError', () => {
    expect(mapSupabaseError(pgError('42501', 'new row violates row-level security policy for table "convocations"'))).toBeInstanceOf(
      ForbiddenError,
    )
  })
})
