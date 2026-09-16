import type { VoteCategoryId, VoteTally } from '@domain/entities/vote'

// AC-PV-10, structural: this interface can only ever return a VoteTally
// (counts per candidate) — there is no method on it capable of returning an
// individual voter's identity, for any caller/role. That's deliberate: the
// shape of the interface is what makes the privacy guarantee hold, the same
// way ConvocationRespondersRepository's `hasResponded: boolean` (not
// `status: DeclaredStatus`) makes it structurally impossible to leak a
// declared status through that read path
// (docs/convocation_visibility_rls_correction.md §2.1). Do not add a method
// here that accepts a voterId or returns per-voter rows.
export interface VoteTallyRepository {
  // Consumed by BOTH role variants (player sees percentages, coach sees
  // absolute counts, per the UI design's "Coach vs joueuse: deux unités de
  // restitution différentes") — the unit conversion is a presentation
  // concern, not a reason to fork this method (AC-PV-10 holds identically
  // either way).
  getTally(convocationId: string, categoryId: VoteCategoryId): Promise<VoteTally>
}
