import type { Convocation, ConvocationArrangements } from '../entities/convocation'
import type {
  UpdateMatchConvocationPayload,
  UpdateMeetingConvocationPayload,
  UpdateTrainingConvocationPayload,
} from '../usecases/convocation/UpdateConvocationUseCase'
import type {
  CreateMatchConvocationInput,
  CreateMeetingConvocationInput,
  CreateTrainingConvocationInput,
} from '../usecases/convocation/CreateConvocationUseCase'

// One method per convocation type, not a generic create() + separate
// satellite upsert — creating a Convocation together with its type-specific
// satellite (match_details / meeting_details) is one logical write and must
// happen inside a single transaction (see the RPC-per-type implementation in
// data/repositories/ConvocationRepositoryImpl.ts).
export interface ConvocationRepository {
  listForTeam(teamId: string): Promise<Convocation[]>
  findById(id: string): Promise<Convocation | null>
  createTraining(input: CreateTrainingConvocationInput): Promise<Convocation>
  createMatch(input: CreateMatchConvocationInput): Promise<Convocation>
  createMeeting(input: CreateMeetingConvocationInput): Promise<Convocation>

  // specs/edit-match-details.md, developer decision (2026-09-25) — a
  // narrow write path, same shape/reasoning as
  // MatchDetailsRepository.updateArrangements: a `Pick<>` of exactly
  // `date`/`location`, never a generic `update(Convocation)` that could
  // drift into writing `status`/`type`/`teamId`. Used by
  // UpdateMatchDetailsUseCase, gated on the same "before kickoff" window as
  // the MatchDetails write.
  updateArrangements(id: string, arrangements: ConvocationArrangements): Promise<Convocation>

  // A coach correcting a training's start time before it begins: `date` only.
  // Separate from updateArrangements because that one also writes `location`,
  // which a training leaves null (its venue is `training_location_id`,
  // admin-only) — the `grant update (date, location)` + coach RLS policy
  // behind it already allow this narrower write.
  updateDate(id: string, date: string): Promise<Convocation>

  // specs/web-create-convocation.md §3/AC-WC-20 — admin edit of an UPCOMING,
  // open convocation, one method per type like the create* methods above: the
  // convocation row and its satellite change in ONE transaction (an RPC per
  // type on the data side), all-or-nothing. Payloads are the narrow,
  // type-specific field sets of UpdateConvocationUseCase — never the whole
  // entity, so `teamId`/`type`/`status` stay unwritable by construction.
  updateTraining(payload: UpdateTrainingConvocationPayload): Promise<Convocation>
  updateMatch(payload: UpdateMatchConvocationPayload): Promise<Convocation>
  updateMeeting(payload: UpdateMeetingConvocationPayload): Promise<Convocation>

  // Hard delete — satellites (match_details, responses, attendance, …) go
  // with it via ON DELETE CASCADE. Only the coach RLS policy
  // convocations_delete_coach (upcoming + open) lets it through.
  delete(id: string): Promise<void>
}
