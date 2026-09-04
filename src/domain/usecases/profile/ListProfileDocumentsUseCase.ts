import type { Document } from '../../entities/document'
import type { DocumentRepository } from '../../repositories/document-repository'

export interface ListProfileDocumentsInput {
  userId: string
}

// AC-PR-14 — the FULL list of the user's own documents, unfiltered. This is
// deliberately a separate use case from player-dashboard's
// ListUserMissingOrRejectedDocumentsUseCase (which keeps only missing/
// rejected rows for the dashboard alert): same table, different resource
// shape, so a distinct use case + distinct query key
// (queryKeys.profileDocuments) rather than reusing/parameterizing that one.
// RLS-only (documents_select_own), no rbac-matrix entry — same reasoning as
// that sibling use case's own comment (specs/player-dashboard.md §2).
//
// TODO: this looks like a thin delegation to
// DocumentRepository.listForUser(input.userId) — but decide for yourself
// whether `execute` should do anything else here (e.g. any ordering the
// spec implies for "Mes documents"), or whether it's genuinely a pure
// passthrough. See ARCHITECTURE.md §6 on why even a thin call site stays a
// use case rather than the ViewModel calling the repository directly.
export class ListProfileDocumentsUseCase {
  constructor(private readonly documentRepository: DocumentRepository) {}

  async execute(_input: ListProfileDocumentsInput): Promise<Document[]> {
    // Referenced only to keep constructor injection in place ahead of the
    // real implementation — `noUnusedLocals` flags an unread private field.
    void this.documentRepository
    throw new Error('ListProfileDocumentsUseCase.execute is not implemented yet')
  }
}
