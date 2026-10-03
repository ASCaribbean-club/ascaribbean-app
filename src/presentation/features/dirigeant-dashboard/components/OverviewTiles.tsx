interface OverviewTile {
  key: string
  label: string
  // null = counter unavailable (its own read failed): shown as "—".
  value: number | null
}

interface OverviewTilesProps {
  tiles: OverviewTile[]
}

// Three non-interactive tiles (no role="button", no hover): no door to a
// screen that does not exist. Club-wide, they do not follow the filter.
export function OverviewTiles({ tiles }: OverviewTilesProps) {
  return (
    <div className="grid grid-cols-3 items-stretch gap-2">
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-white/5 px-1.5 py-2 text-center"
        >
          <span className="text-[18px] leading-tight font-extrabold text-white">{tile.value ?? '—'}</span>
          <span className="text-[11px] font-semibold text-white/60">{tile.label}</span>
        </div>
      ))}
    </div>
  )
}
