import type { Convocation } from '../entities/convocation'
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
}