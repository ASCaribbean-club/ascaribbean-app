import type { Document } from '../entities/document'

export interface DocumentRepository {
  listForUser(userId: string): Promise<Document[]>
}
