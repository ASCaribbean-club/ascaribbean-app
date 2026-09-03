import { NotFoundError } from '@/domain/errors/not-found-error'
import type { Convocation } from '../../entities/convocation'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { AssembleConvocationDetailFieldsUseCase, ConvocationDetailFields } from './AssembleConvocationDetailFieldsUseCase'
import type { GetConvocationDetailsUseCase } from './GetConvocationDetailsUseCase'

// Same shape as ListUpcomingConvocationsForPlayerUseCase's
// UpcomingConvocationForPlayer — both extend ConvocationDetailFields rather
// than each re-declaring matchDetails/opponent/meetingDetails.
export interface ConvocationWithDetails extends ConvocationDetailFields {
  convocation: Convocation
}

// specs/match_details_page.md §1 point 3 — the "bloc d'identité" +
// "bloc spécifique au type" data assembly for the detail screen, one
// convocation at a time (contrast with ListUpcomingConvocationsForPlayerUseCase,
// which does the same assembly for a whole list).
export class GetConvocationWithDetailsUseCase {
  constructor(
    private readonly convocationRepository: ConvocationRepository,
    private readonly getConvocationDetailsUseCase: GetConvocationDetailsUseCase,
    private readonly assembleConvocationDetailFieldsUseCase: AssembleConvocationDetailFieldsUseCase,
  ) { }

  // Returns `null` when the convocation doesn't exist OR is outside the
  // caller's RLS scope — specs/match_details_page.md §1, "Périmètre de
  // données": these two cases must render as the SAME "introuvable" state
  // (AC-MD-01, no existence leak), which is exactly what
  // ConvocationRepository.findById already collapses into a single `null`
  // at the database boundary — don't add a second branch here to
  // distinguish them.
  //
  // specs/match_details_page.md §7 — GetConvocationDetailsUseCase throws for
  // `type === 'training'` on purpose (no training_details table yet, §7 "no
  // shape defined yet"). Resolved here with a `training -> null` branch
  // rather than a third call-site guard (ListUpcomingConvocationsForPlayerUseCase
  // already has its own): `details` stays null for training WITHOUT ever
  // calling GetConvocationDetailsUseCase.execute, so its throw never fires,
  // and AssembleConvocationDetailFieldsUseCase already returns all-null
  // fields for training regardless of `details` — so the screen still
  // renders the identity block alone, with no exception (AC-MD-02). Only
  // match/meeting throw below, and only when their satellite row is
  // genuinely missing. Revisit once training_details exists: at that point
  // GetConvocationDetailsUseCase.execute can handle 'training' directly and
  // this ternary can be removed.
  async execute(convocationId: string): Promise<ConvocationWithDetails | null> {

    const convocation = await this.convocationRepository.findById(convocationId)

    if (!convocation) return null

    const details = convocation.type === 'training'
      ? null
      : await this.getConvocationDetailsUseCase.execute(convocation)

    if (!details && convocation.type !== 'training') {
      throw new NotFoundError(`Details not found for convocation: ${convocationId}`)
    }

    const detailFields = await this.assembleConvocationDetailFieldsUseCase.execute(convocation, details)

    return {
      convocation: convocation,
      ...detailFields,
    }

  }
}
