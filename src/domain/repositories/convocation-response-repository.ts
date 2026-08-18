import type { ConvocationResponse } from '../entities/convocation'

export interface ConvocationResponseRepository {
  upsert(response: Omit<ConvocationResponse, 'id'>): Promise<ConvocationResponse>
  findByConvocationAndUser(convocationId: string, userId: string): Promise<ConvocationResponse | null>
  // Added for specs/coach-dashboard.md — response bar + "À venir" rates need
  // every response for a convocation, not just one user's.
  findByConvocation(convocationId: string): Promise<ConvocationResponse[]>
}
