import type { ConvocationResponse } from '../entities/convocation'

export interface ConvocationResponseRepository {
  upsert(response: Omit<ConvocationResponse, 'id'>): Promise<ConvocationResponse>
  findByConvocationAndUser(convocationId: string, userId: string): Promise<ConvocationResponse | null>
}
