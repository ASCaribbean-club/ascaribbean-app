// One look for every single-select filter chip (section, team, status): a
// 44px-high pill, quiet when idle, solid white when selected. Shared so the
// filter rows of a screen read as one family.
export const FILTER_CHIP_CLASSNAME =
  'h-11 shrink-0 gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 text-[13px] font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white data-[state=on]:border-white data-[state=on]:bg-white data-[state=on]:text-black'

// Small uppercase caption above a filter row.
export const FILTER_LABEL_CLASSNAME = 'text-[11.5px] font-bold tracking-wider text-white/45 uppercase'
