import type { SupabaseClient } from '@supabase/supabase-js'
import { NewsRepositoryImpl } from '@data/repositories/NewsRepositoryImpl'
import type { NewsRepository } from '@domain/repositories/news-repository'
import { ListPublishedNewsUseCase } from '@domain/usecases/news/ListPublishedNewsUseCase'

export interface NewsContainer {
  newsRepository: NewsRepository
  listPublishedNewsUseCase: ListPublishedNewsUseCase
}

export function createNewsContainer(supabaseClient: SupabaseClient): NewsContainer {
  const newsRepository = new NewsRepositoryImpl(supabaseClient)
  const listPublishedNewsUseCase = new ListPublishedNewsUseCase(newsRepository)

  return {
    newsRepository,
    listPublishedNewsUseCase,
  }
}
