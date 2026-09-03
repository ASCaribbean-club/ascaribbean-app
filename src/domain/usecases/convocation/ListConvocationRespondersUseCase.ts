import type { ConvocationRespondersRepository, ConvocationResponderStatus } from '../../repositories/convocation-responders-repository'

// specs/match_details_page.md §1 point 4, "Vue joueur" — the full convoked
// roster with a per-player BOOLEAN only (AC-MD-09, AC-MD-08). This is a
// thin pass-through on purpose: the actual "never expose status/reason"
// guarantee lives in the `convocation_responders` view/RLS
// (docs/convocation_visibility_rls_correction.md §2.1), not in this class —
// don't be tempted to add filtering/derivation logic here that duplicates
// what the database already guarantees.
export class ListConvocationRespondersUseCase {
  constructor(private readonly convocationRespondersRepository: ConvocationRespondersRepository) { }

  async execute(convocationId: string): Promise<ConvocationResponderStatus[]> {
    return await this.convocationRespondersRepository.listForConvocation(convocationId)
  }
}
