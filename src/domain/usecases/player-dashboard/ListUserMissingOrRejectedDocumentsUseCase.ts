import { isMissingOrRejectedDocument } from '@/domain/rules/document-rules'
import type { Document } from '../../entities/document'
import type { DocumentRepository } from '../../repositories/document-repository'

export interface ListUserMissingOrRejectedDocumentsInput {
  userId: string
}
// Thin wrapper around DocumentRepository.listForUser — kept as a use case
// (rather than the ViewModel calling the repository directly) so `queryFn`
// always calls a use case, never a repository, even for a lookup this
// simple (ARCHITECTURE.md §6). No permission check inside: reading one's
// own documents is RLS-only (documents_select_own), no rbac-matrix entry —
// see specs/player-dashboard.md §2, "reste RLS-only, sans entrée de matrice".
export class ListUserMissingOrRejectedDocumentsUseCase {
  constructor(private readonly documentRepository: DocumentRepository) { }

  async execute(input: ListUserMissingOrRejectedDocumentsInput): Promise<Document[]> {
    const userDocuments = await this.documentRepository.listForUser(input.userId)
    return userDocuments.filter((d) => isMissingOrRejectedDocument(d))
  }
}
