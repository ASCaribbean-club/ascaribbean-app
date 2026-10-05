const VALUE_CLASSNAMES: Record<string, string> = {
  paid: "text-emerald-400",
  partial: "text-amber-400",
  unpaid: "text-red-400",
};

interface StatusTile {
  key: string;
  label: string;
  value: number;
}

interface StatusTilesProps {
  tiles: StatusTile[];
}

// Three non-interactive tiles (no filter by tile in this pass, UI-TR-05).
// min-w-0 on each so they shrink to their column on narrow phones.
export function StatusTiles({ tiles }: StatusTilesProps) {
  return (
    <div className="grid grid-cols-3 items-stretch gap-2">
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-white/5 px-1.5 py-2.5 text-center"
        >
          <span
            className={`text-[22px] leading-tight font-extrabold ${VALUE_CLASSNAMES[tile.key] ?? "text-white"}`}
          >
            {tile.value}
          </span>
          <span className="max-w-full truncate text-[11.5px] font-semibold text-white/70">
            {tile.label}
          </span>
        </div>
      ))}
    </div>
  );
}
