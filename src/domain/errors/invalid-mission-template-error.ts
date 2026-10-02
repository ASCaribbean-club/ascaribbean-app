import { DomainError } from '@domain/errors/domain-error'

// specs/web-mission-templates.md §2.2/AC-MT-08 — thrown by the create/update
// use cases, before any network call, when the label is empty once trimmed
// or the capacity is outside 1..3. Also the translation of a check-constraint
// violation on public.mission_templates (data/errors/map-supabase-error.ts).
export class InvalidMissionTemplateError extends DomainError {}
