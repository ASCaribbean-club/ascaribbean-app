import type { SupabaseClient } from '@supabase/supabase-js'
import { MembershipRepositoryImpl } from '@data/repositories/MembershipRepositoryImpl'
import { PaymentRepositoryImpl } from '@data/repositories/PaymentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { MembershipRepository } from '@domain/repositories/membership-repository'
import type { PaymentRepository } from '@domain/repositories/payment-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { ArchiveMembershipUseCase } from '@domain/usecases/memberships/ArchiveMembershipUseCase'
import { CountMembershipsRequiringAttentionUseCase } from '@domain/usecases/memberships/CountMembershipsRequiringAttentionUseCase'
import { CreateMembershipUseCase } from '@domain/usecases/memberships/CreateMembershipUseCase'
import { RecordPaymentUseCase } from '@domain/usecases/memberships/RecordPaymentUseCase'
import { UpdateMembershipUseCase } from '@domain/usecases/memberships/UpdateMembershipUseCase'

// specs/web-memberships.md §2.10 — a dedicated container for the
// /admin/memberships write path, same per-container instance pattern used
// throughout di/containers/ (its OWN SeasonRepositoryImpl/UserRepositoryImpl,
// not shared with the ones other containers instantiate for their own
// needs).
export interface MembershipsContainer {
  membershipRepository: MembershipRepository
  paymentRepository: PaymentRepository
  seasonRepository: SeasonRepository
  userRepository: UserRepository

  createMembershipUseCase: CreateMembershipUseCase
  updateMembershipUseCase: UpdateMembershipUseCase
  archiveMembershipUseCase: ArchiveMembershipUseCase
  recordPaymentUseCase: RecordPaymentUseCase
  countMembershipsRequiringAttentionUseCase: CountMembershipsRequiringAttentionUseCase
}

export function createMembershipsContainer(supabaseClient: SupabaseClient): MembershipsContainer {
  const membershipRepository = new MembershipRepositoryImpl(supabaseClient)
  const paymentRepository = new PaymentRepositoryImpl(supabaseClient)
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const userRepository = new UserRepositoryImpl(supabaseClient)

  return {
    membershipRepository,
    paymentRepository,
    seasonRepository,
    userRepository,
    createMembershipUseCase: new CreateMembershipUseCase(userRepository, membershipRepository, paymentRepository),
    updateMembershipUseCase: new UpdateMembershipUseCase(userRepository, membershipRepository, paymentRepository),
    archiveMembershipUseCase: new ArchiveMembershipUseCase(userRepository, membershipRepository),
    recordPaymentUseCase: new RecordPaymentUseCase(userRepository, paymentRepository),
    countMembershipsRequiringAttentionUseCase: new CountMembershipsRequiringAttentionUseCase(seasonRepository, membershipRepository),
  }
}
