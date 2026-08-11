export type DocumentStatus = 'missing' | 'pending_validation' | 'valid' | 'rejected'

export interface Document {
  id: string
  userId: string
  type: string
  status: DocumentStatus
}
