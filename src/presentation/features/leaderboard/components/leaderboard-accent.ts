import type { LeaderboardMetric } from '@domain/entities/leaderboard'

// Per-tab accent classes (UI design §4): green goals, amber yellow, red red.
// Color is always doubled by a text label/number, never alone (AC-LB-17).
export const METRIC_LABEL: Record<LeaderboardMetric, string> = {
  goals: 'Buteurs',
  yellow: 'Jaunes',
  red: 'Rouges',
}

export const METRIC_ACCENT: Record<LeaderboardMetric, { dot: string; text: string; border: string; tint: string; underline: string }> = {
  goals: {
    dot: 'bg-coach-green',
    text: 'text-coach-green-text',
    border: 'border-coach-green',
    tint: 'bg-coach-green/15',
    underline: 'data-[state=active]:border-coach-green',
  },
  yellow: {
    dot: 'bg-coach-amber',
    text: 'text-coach-amber',
    border: 'border-coach-amber',
    tint: 'bg-coach-amber/15',
    underline: 'data-[state=active]:border-coach-amber',
  },
  red: {
    dot: 'bg-coach-red',
    text: 'text-coach-red-text',
    border: 'border-coach-red',
    tint: 'bg-coach-red/15',
    underline: 'data-[state=active]:border-coach-red',
  },
}

// Shape per metric (mockups): goals = circle, cards = small rounded
// rectangle. Shape + label double the color (AC-LB-17).
export const METRIC_SHAPE: Record<LeaderboardMetric, { tab: string; counter: string }> = {
  goals: { tab: 'size-2.5 rounded-full', counter: 'size-2.5 rounded-full border border-coach-green' },
  yellow: { tab: 'size-2.5 rounded-xs', counter: 'h-3 w-2 rounded-xs' },
  red: { tab: 'size-2.5 rounded-xs', counter: 'h-3 w-2 rounded-xs' },
}
