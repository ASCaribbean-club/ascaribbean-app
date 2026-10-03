import { IconSearchOff } from '@tabler/icons-react'
import { EmptyState } from '@presentation/shared/components/EmptyState'
import { Button } from '@presentation/shared/components/ui/button'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { NewsEditorForm } from './components/NewsEditorForm'
import { useNewsEditorViewModel } from './useNewsEditorViewModel'

// Pushed full-screen route (no bottom nav), one component for both create and
// edit (specs/mobile-dirigeant-habilite.md §4). Only isLoading / isNotFound /
// isAllowed branches computed by the ViewModel.
export function NewsEditorPage() {
  const vm = useNewsEditorViewModel()

  if (!vm.isAllowed) {
    return (
      <div className="flex min-h-full flex-col bg-coach-bg font-coach text-white">
        <BackHeader onBack={vm.goBack} />
        <EmptyState icon={IconSearchOff} message="Cet écran n’est pas disponible pour votre rôle actif." />
      </div>
    )
  }

  if (vm.isLoading) {
    return (
      <div className="flex min-h-full flex-col bg-coach-bg font-coach text-white">
        <BackHeader title={vm.title} onBack={vm.goBack} />
        <div className="flex flex-col gap-5 px-5.5 pt-5.5" aria-hidden>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-11 w-full bg-white/10" />
          ))}
        </div>
      </div>
    )
  }

  if (vm.hasLoadError) {
    return (
      <div className="flex min-h-full flex-col bg-coach-bg font-coach text-white">
        <BackHeader title={vm.title} onBack={vm.goBack} />
        <div className="flex flex-col items-start gap-3 px-5.5 pt-5.5">
          <p role="alert" className="text-[13px] text-white/70">
            Impossible de charger l’actu.
          </p>
          <Button type="button" variant="outline" onClick={vm.retryLoad} className="h-11 border-white/20 text-white">
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  if (vm.isNotFound) {
    return (
      <div className="flex min-h-full flex-col bg-coach-bg font-coach text-white">
        <BackHeader title={vm.title} onBack={vm.goBack} />
        <EmptyState icon={IconSearchOff} message="Cette actu est introuvable" />
        <div className="flex justify-center pb-10">
          <Button type="button" variant="outline" onClick={vm.goBack} className="h-11 border-white/20 text-white">
            Retour
          </Button>
        </div>
      </div>
    )
  }

  return <NewsEditorForm key={vm.news?.id ?? 'create'} mode={vm.mode} title={vm.title} news={vm.news} />
}
