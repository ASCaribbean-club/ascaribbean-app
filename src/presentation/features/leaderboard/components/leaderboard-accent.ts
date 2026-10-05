import type { LeaderboardCounterKind, LeaderboardMetric } from '@domain/entities/leaderboard'

// Per-tab accent classes (UI design §4): green goals, amber cards.
// Color is always doubled by a text label/number, never alone (AC-LB-17).
export const METRIC_LABEL: Record<LeaderboardMetric, string> = {
  goals: 'Buteurs',
  cards: 'Cartons',
}

export const METRIC_ACCENT: Record<LeaderboardMetric, { dot: string; text: string; border: string; tint: string; underline: string }> = {
  goals: {
    dot: 'bg-coach-green',
    text: 'text-coach-green-text',
    border: 'border-coach-green',
    tint: 'bg-coach-green/15',
    underline: 'data-[state=active]:border-coach-green',
  },
  cards: {
    dot: 'bg-coach-amber',
    text: 'text-coach-amber',
    border: 'border-coach-amber',
    tint: 'bg-coach-amber/15',
    underline: 'data-[state=active]:border-coach-amber',
  },
}

// Dot color of each displayed counter (a card counter is yellow or red).
export const COUNTER_DOT: Record<LeaderboardCounterKind, string> = {
  goals: 'bg-coach-green',
  yellow: 'bg-coach-amber',
  red: 'bg-coach-red',
}

// Shape per metric (mockups): goals = circle, cards = small rounded
// rectangle. Shape + label double the color (AC-LB-17).
export const METRIC_TAB_SHAPE: Record<LeaderboardMetric, string> = {
  goals: 'size-2.5 rounded-full',
  cards: 'size-2.5 rounded-xs',
}

export const COUNTER_SHAPE: Record<LeaderboardCounterKind, string> = {
  goals: 'size-2.5 rounded-full border border-coach-green',
  yellow: 'h-3 w-2 rounded-xs',
  red: 'h-3 w-2 rounded-xs',
}
