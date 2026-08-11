import type { User } from '../entities/user'

export interface UserRepository {
  findById(id: string): Promise<User | null>
}
