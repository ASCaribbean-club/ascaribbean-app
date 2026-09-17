import { describe, expect, it } from 'vitest'
import type { CreateClubNewsInput, UpdateClubNewsInput } from '@domain/repositories/news-repository'
import type { ClubNewsRow } from '../dto/club-news-row'
import { toClubNews, toClubNewsInsertRow, toClubNewsUpdateRow } from './club-news-mapper'

describe('toClubNews', () => {
  it('maps every column, including null link/expires_at', () => {
    const row: ClubNewsRow = {
      id: 'news-1',
      title: 'Reprise des entraînements',
      details: 'Tous les groupes reprennent le 2 septembre',
      link: null,
      status: 'published',
      published_at: '2026-09-01T00:00:00.000Z',
      created_at: '2026-08-30T00:00:00.000Z',
      created_by: 'admin-1',
      expires_at: null,
    }

    expect(toClubNews(row)).toEqual({
      id: 'news-1',
      title: 'Reprise des entraînements',
      details: 'Tous les groupes reprennent le 2 septembre',
      link: null,
      status: 'published',
      publishedAt: '2026-09-01T00:00:00.000Z',
      createdAt: '2026-08-30T00:00:00.000Z',
      createdBy: 'admin-1',
      expiresAt: null,
    })
  })

  it('maps a non-null link and expires_at', () => {
    const row: ClubNewsRow = {
      id: 'news-2',
      title: 'Réunion extraordinaire',
      details: 'Assemblée générale',
      link: 'https://example.com/agenda',
      status: 'published',
      published_at: '2026-09-05T00:00:00.000Z',
      created_at: '2026-09-04T00:00:00.000Z',
      created_by: 'admin-2',
      expires_at: '2026-09-10T00:00:00.000Z',
    }

    const result = toClubNews(row)

    expect(result.link).toBe('https://example.com/agenda')
    expect(result.expiresAt).toBe('2026-09-10T00:00:00.000Z')
  })
})

describe('toClubNewsInsertRow', () => {
  it('maps every field to its snake_case column, status always carried through as-is', () => {
    const input: CreateClubNewsInput = {
      title: 'Reprise des entraînements',
      details: 'Tous les groupes reprennent le 2 septembre',
      link: null,
      status: 'published',
      publishedAt: '2026-09-01T00:00:00.000Z',
      createdBy: 'admin-1',
      expiresAt: null,
    }

    expect(toClubNewsInsertRow(input)).toEqual({
      title: 'Reprise des entraînements',
      details: 'Tous les groupes reprennent le 2 septembre',
      link: null,
      status: 'published',
      published_at: '2026-09-01T00:00:00.000Z',
      created_by: 'admin-1',
      expires_at: null,
    })
  })

  it('carries a non-null link and expiresAt through', () => {
    const input: CreateClubNewsInput = {
      title: 'Réunion extraordinaire',
      details: 'Assemblée générale',
      link: 'https://example.com/agenda',
      status: 'published',
      publishedAt: '2026-09-05T00:00:00.000Z',
      createdBy: 'admin-2',
      expiresAt: '2026-09-10T00:00:00.000Z',
    }

    expect(toClubNewsInsertRow(input)).toEqual({
      title: 'Réunion extraordinaire',
      details: 'Assemblée générale',
      link: 'https://example.com/agenda',
      status: 'published',
      published_at: '2026-09-05T00:00:00.000Z',
      created_by: 'admin-2',
      expires_at: '2026-09-10T00:00:00.000Z',
    })
  })

  // 2026-09-17 developer decision (resolves PO-WA-02) — a draft row has no
  // publishedAt yet.
  it('carries a draft status and a null publishedAt through', () => {
    const input: CreateClubNewsInput = {
      title: 'Brouillon',
      details: 'À finaliser',
      link: null,
      status: 'draft',
      publishedAt: null,
      createdBy: 'admin-1',
      expiresAt: null,
    }

    expect(toClubNewsInsertRow(input)).toEqual({
      title: 'Brouillon',
      details: 'À finaliser',
      link: null,
      status: 'draft',
      published_at: null,
      created_by: 'admin-1',
      expires_at: null,
    })
  })
})

describe('toClubNewsUpdateRow', () => {
  it('maps the 5 mockup fields plus status, never created_by', () => {
    const input: UpdateClubNewsInput = {
      title: 'Nouveau titre',
      details: 'Nouveau contenu',
      link: null,
      status: 'published',
      publishedAt: '2026-09-01T00:00:00.000Z',
      expiresAt: null,
    }

    const row = toClubNewsUpdateRow(input)

    expect(row).toEqual({
      title: 'Nouveau titre',
      details: 'Nouveau contenu',
      link: null,
      status: 'published',
      published_at: '2026-09-01T00:00:00.000Z',
      expires_at: null,
    })
    expect(row).not.toHaveProperty('created_by')
  })

  // 2026-09-17 developer decision (resolves PO-WA-02) — draft is now
  // selectable, and a draft may carry a null publishedAt.
  it('carries a draft status and a null publishedAt through', () => {
    const input: UpdateClubNewsInput = {
      title: 'Nouveau titre',
      details: 'Nouveau contenu',
      link: null,
      status: 'draft',
      publishedAt: null,
      expiresAt: null,
    }

    expect(toClubNewsUpdateRow(input)).toEqual({
      title: 'Nouveau titre',
      details: 'Nouveau contenu',
      link: null,
      status: 'draft',
      published_at: null,
      expires_at: null,
    })
  })

  it('carries a non-null link and expiresAt through', () => {
    const input: UpdateClubNewsInput = {
      title: 'Nouveau titre',
      details: 'Nouveau contenu',
      link: 'https://example.com/album',
      status: 'published',
      publishedAt: '2026-09-05T00:00:00.000Z',
      expiresAt: '2026-09-10T00:00:00.000Z',
    }

    expect(toClubNewsUpdateRow(input)).toEqual({
      title: 'Nouveau titre',
      details: 'Nouveau contenu',
      link: 'https://example.com/album',
      status: 'published',
      published_at: '2026-09-05T00:00:00.000Z',
      expires_at: '2026-09-10T00:00:00.000Z',
    })
  })
})
