import type { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { ConvocationNotEditableError } from '@domain/errors/convocation-not-editable-error'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { TrainingLocationArchivedError } from '@domain/errors/training-location-archived-error'
import { mapSupabaseError } from './map-supabase-error'

const pgError = (code: string, message: string): PostgrestError => ({ code, message, details: '', hint: '', name: 'PostgrestError', toJSON: () => ({}) }) as PostgrestError

describe('mapSupabaseError — specs/web-create-convocation.md', () => {
  it('maps the RPC window refusal to ConvocationNotEditableError (AC-WC-23)', () => {
    expect(mapSupabaseError(pgError('42501', 'convocation_not_editable: convocation x is past'))).toBeInstanceOf(
      ConvocationNotEditableError,
    )
  })

  it('keeps a plain RLS/guard refusal (42501) as ForbiddenError, e.g. a coach writing opponent_id (AC-WC-21)', () => {
    expect(mapSupabaseError(pgError('42501', 'opponent_locked: only an administrator may change a match opponent'))).toBeInstanceOf(
      ForbiddenError,
    )
  })

  it('maps the archived-location refusal on UPDATE like on insert (AC-WC-19)', () => {
    expect(mapSupabaseError(pgError('23514', 'training_location_archived: location x is archived'))).toBeInstanceOf(
      TrainingLocationArchivedError,
    )
  })
})
