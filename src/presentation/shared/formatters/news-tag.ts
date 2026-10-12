import type { ClubNewsTag } from '@domain/entities/club-news'

export const NEWS_TAG_LABELS: Record<ClubNewsTag, string> = {
  club: 'Club',
  equipes: 'Équipes',
  boutique: 'Boutique',
}

// Radix Select forbids an empty-string item value, so "no tag" is a sentinel
// at the form edge only; NewsFormValues.tag itself keeps '' for "none".
export const NO_NEWS_TAG_VALUE = 'none'
