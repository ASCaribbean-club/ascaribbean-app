// specs/mob-treasurer-finances.md O-FI-UI-05 — fixed palette of category
// colours (never typed by a user); the stored `colorIndex` is CYCLED over it.
// Colour is never the only carrier of information: every category is also
// written as text with its amount. Static class names (Tailwind scans source).
const PALETTE = [
  { bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  { bar: 'bg-orange-500', dot: 'bg-orange-500' },
  { bar: 'bg-rose-400', dot: 'bg-rose-400' },
  { bar: 'bg-cyan-500', dot: 'bg-cyan-500' },
  { bar: 'bg-violet-400', dot: 'bg-violet-400' },
  { bar: 'bg-blue-500', dot: 'bg-blue-500' },
] as const

export function categoryColor(colorIndex: number): (typeof PALETTE)[number] {
  return PALETTE[((colorIndex % PALETTE.length) + PALETTE.length) % PALETTE.length]
}
