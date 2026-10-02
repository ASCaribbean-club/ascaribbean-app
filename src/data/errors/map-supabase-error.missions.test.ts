import type { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidMissionTemplateError } from '@domain/errors/invalid-mission-template-error'
import { MissionFullError } from '@domain/errors/mission-full-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { mapSupabaseError } from './map-supabase-error'

const pgError = (code: string, message: string): PostgrestError => ({ code, message, details: '', hint: '', name: 'PostgrestError', toJSON: () => ({}) }) as PostgrestError

// specs/match-details-missions.md AC-MM-15
describe('mapSupabaseError — missions', () => {
  it('maps the claim_mission capacity refusal to MissionFullError, never NotFoundError nor raw text', () => {
    const result = mapSupabaseError(pgError('42501', 'mission_full: mission m1 holds 2 of 2 places'))
    expect(result).toBeInstanceOf(MissionFullError)
    expect(result).not.toBeInstanceOf(NotFoundError)
  })

  it('keeps any other claim_mission refusal (42501) as ForbiddenError', () => {
    expect(mapSupabaseError(pgError('42501', 'mission_manage_refused'))).toBeInstanceOf(ForbiddenError)
    expect(mapSupabaseError(pgError('42501', 'mission_target_not_eligible'))).toBeInstanceOf(ForbiddenError)
  })

  it('does not capture a check violation on convocation_missions as an invalid mission TEMPLATE', () => {
    const result = mapSupabaseError(
      pgError('23514', 'new row for relation "convocation_missions" violates check constraint "convocation_missions_capacity_check"'),
    )
    expect(result).not.toBeInstanceOf(InvalidMissionTemplateError)
  })

  it('still maps a mission_templates check violation to InvalidMissionTemplateError', () => {
    expect(
      mapSupabaseError(pgError('23514', 'new row for relation "mission_templates" violates check constraint "mission_templates_default_capacity_check"')),
    ).toBeInstanceOf(InvalidMissionTemplateError)
  })
})
