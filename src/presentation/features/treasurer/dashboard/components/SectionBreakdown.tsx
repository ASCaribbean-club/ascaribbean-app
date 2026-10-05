import { CollectionProgressBar } from "../../components/CollectionProgressBar";

// Sections are data-driven (no colour column), so bars cycle through a fixed
// palette by row order; the "Sans section" row stays neutral.
const BAR_CLASSNAMES = [
  "*:data-[slot=progress-indicator]:bg-red-500",
  "*:data-[slot=progress-indicator]:bg-blue-500",
  "*:data-[slot=progress-indicator]:bg-emerald-500",
  "*:data-[slot=progress-indicator]:bg-orange-500",
];

interface SectionRow {
  key: string;
  name: string;
  amountsLabel: string;
  percent: number;
}

interface SectionBreakdownProps {
  rows: SectionRow[];
}

export function SectionBreakdown({ rows }: SectionBreakdownProps) {
  return (
    <section
      aria-label="Par section"
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4.5"
    >
      <h2 className="text-[11.5px] font-bold tracking-wider text-white/45 uppercase">
        Par section
      </h2>
      {rows.map((row, index) => (
        <div key={row.key} className="flex flex-col gap-1.5">
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <span className="shrink-0 text-[14px] font-bold text-white">
              {row.name}
            </span>
            <span className="min-w-0 truncate text-[12.5px] font-semibold text-white/70">
              {row.amountsLabel}
            </span>
          </div>
          <CollectionProgressBar
            percent={row.percent}
            label={`${row.name} : ${row.percent}% encaissé`}
            indicatorClassName={
              row.key === "none"
                ? "bg-white/10 *:data-[slot=progress-indicator]:bg-white/40"
                : BAR_CLASSNAMES[index % BAR_CLASSNAMES.length]
            }
          />
        </div>
      ))}
    </section>
  );
}
