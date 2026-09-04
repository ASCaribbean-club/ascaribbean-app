import { NewsCard } from './components/NewsCard'
import { useNewsViewModel } from './useNewsViewModel'

// specs/actus.md UI design — primary nav destination (Actus tab), no back
// arrow, no sticky header needed. Identical for every role (§3): no
// isLoading/error/canX branch beyond the two generic ones the ViewModel
// already computes.
export function NewsPage() {
  const vm = useNewsViewModel()

  return (
    <div className="flex min-h-[75svh] flex-col gap-5 px-5.5 pt-[max(1.375rem,env(safe-area-inset-top))] pb-[max(1.375rem,env(safe-area-inset-bottom))] text-white">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-extrabold">Actus du club</h1>
        {/* Purely decorative banner from the mockup (club colors) — no
            interactivity, no state, specific to this screen only. */}
        <div aria-hidden className="h-1 w-24 rounded-full bg-linear-to-r from-coach-red via-coach-green to-white" />
      </header>

      {vm.isLoading && <p className="text-[13px] text-white/50">Chargement…</p>}
      {vm.error && <p role="alert" className="text-[13px] text-white/50">Impossible de charger les actualités.</p>}

      {!vm.isLoading && !vm.error && vm.news.length === 0 && (
        // Cas normal (aucune actu publiée non expirée), jamais une erreur — specs/actus.md § "États à couvrir".
        <p className="text-[13px] text-white/50">Aucune actu pour le moment</p>
      )}

      {!vm.isLoading && !vm.error && vm.news.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-5 p-0">
          {vm.news.map((news) => (
            <li key={news.id} className="border-b border-white/8 pb-5 last:border-b-0 last:pb-0">
              <NewsCard news={news} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
