import type { Section } from '../entities/section'

export interface SectionRepository {
  findById(id: string): Promise<Section | null>
  findAll(): Promise<Section[]>
}
