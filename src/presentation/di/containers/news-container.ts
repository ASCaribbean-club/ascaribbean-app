import type { SupabaseClient } from '@supabase/supabase-js'
import { NewsRepositoryImpl } from '@data/repositories/NewsRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { NewsRepository } from '@domain/repositories/news-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { ArchiveClubNewsUseCase } from '@domain/usecases/news/ArchiveClubNewsUseCase'
import { CreateClubNewsUseCase } from '@domain/usecases/news/CreateClubNewsUseCase'
import { ListPublishedNewsUseCase } from '@domain/usecases/news/ListPublishedNewsUseCase'
import { UpdateClubNewsUseCase } from '@domain/usecases/news/UpdateClubNewsUseCase'

export interface NewsContainer {
  newsRepository: NewsRepository
  // specs/web-actus.md §2.4 — CreateClubNewsUseCase/UpdateClubNewsUseCase/
  // ArchiveClubNewsUseCase need a UserRepository of their own (authorization
  // lookup), same per-container instance pattern as convocation-container.ts
  // rather than a single shared instance across containers.
  userRepository: UserRepository
  listPublishedNewsUseCase: ListPublishedNewsUseCase
  createClubNewsUseCase: CreateClubNewsUseCase
  updateClubNewsUseCase: UpdateClubNewsUseCase
  // 2026-09-17 developer decision (resolves PO-WA-06) — "Supprimer" action.
  archiveClubNewsUseCase: ArchiveClubNewsUseCase
}

export function createNewsContainer(supabaseClient: SupabaseClient): NewsContainer {
  const newsRepository = new NewsRepositoryImpl(supabaseClient)
  const userRepository = new UserRepositoryImpl(supabaseClient)
  const listPublishedNewsUseCase = new ListPublishedNewsUseCase(newsRepository)
  const createClubNewsUseCase = new CreateClubNewsUseCase(userRepository, newsRepository)
  const updateClubNewsUseCase = new UpdateClubNewsUseCase(userRepository, newsRepository)
  const archiveClubNewsUseCase = new ArchiveClubNewsUseCase(userRepository, newsRepository)

  return {
    newsRepository,
    userRepository,
    listPublishedNewsUseCase,
    createClubNewsUseCase,
    updateClubNewsUseCase,
    archiveClubNewsUseCase,
  }
}
