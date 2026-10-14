import { IconFilter } from '@tabler/icons-react'
import { NewsCard } from './NewsCard'
import { NewsTagFilter } from './NewsTagFilter'
import { useNewsViewModel } from '../useNewsViewModel'

// specs/actus.md UI design (moved here unchanged from NewsPage so NewsPage can
// dispatch on the active role, specs/mobile-dirigeant-habilite.md §1.3) — primary nav destination (Actus tab), no back
// arrow, no sticky header needed. Identical for every role (§3): no
// isLoading/error/canX branch beyond the two generic ones the ViewModel
// already computes.
export function NewsFeed() {
  const vm = useNewsViewModel()

  return (
    <div className="flex min-h-[75svh] flex-col gap-5 px-5.5 pt-[max(1.375rem,env(safe-area-inset-top))] pb-[max(1.375rem,env(safe-area-inset-bottom))] text-white">
      <header className="flex flex-col gap-2 pt-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[26px] font-extrabold text-white">Actus</h1>
          {/* Shows/hides the tag filter. The dot signals a filter still
              applied while the chips are hidden. */}
          <button
            type="button"
            onClick={vm.toggleFilters}
            aria-label={vm.areFiltersVisible ? 'Masquer les filtres' : 'Afficher les filtres'}
            aria-expanded={vm.areFiltersVisible}
            className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <IconFilter className="size-5" aria-hidden />
            {!vm.areFiltersVisible && vm.isFilterActive && (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-coach-green" aria-hidden />
            )}
          </button>
        </div>
        <div aria-hidden className="h-1 w-24 rounded-full bg-linear-to-r from-coach-red via-coach-green to-white" />
      </header>

      {vm.areFiltersVisible && <NewsTagFilter value={vm.filter} onChange={vm.setFilter} />}

      {vm.isLoading && <p className="text-[13px] text-white/50">Chargement…</p>}
      {vm.error && <p role="alert" className="text-[13px] text-white/50">Impossible de charger les actualités.</p>}

      {!vm.isLoading && !vm.error && vm.news.length === 0 && (
        // Cas normal (aucune actu publiée non expirée), jamais une erreur — specs/actus.md § "États à couvrir".
        <p className="text-[13px] text-white/50">{vm.emptyMessage}</p>
      )}

      {!vm.isLoading && !vm.error && vm.news.length > 0 && (
        // Cards pad themselves; a short green/orange/red liseret (same family as
        // the header's) separates them instead of a full-bleed grey band.
        <ul className="m-0 -mx-5.5 flex list-none flex-col p-0">
          {vm.news.map((news, index) => (
            <li key={news.id} className="px-5.5 pt-5">
              <NewsCard news={news} isFavorite={vm.isFavorite(news.id)} onToggleFavorite={() => vm.toggleFavorite(news.id)} onOpenLink={vm.onOpenLink} />
              {index < vm.news.length - 1 && (
                <div aria-hidden className="mt-5 h-0.5 w-16 rounded-full bg-linear-to-r from-coach-green via-coach-amber to-coach-red" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
