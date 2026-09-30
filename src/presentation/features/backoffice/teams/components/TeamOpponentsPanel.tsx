import { Button } from "@presentation/shared/components/ui/button";
import { Skeleton } from "@presentation/shared/components/ui/skeleton";
import { useTeamOpponentsViewModel } from "../useTeamOpponentsViewModel";

interface TeamOpponentsPanelProps {
  teamId: string;
  canWriteTeams: boolean;
  onAdd: () => void;
}

// specs/team-opponents.md UI design, "Sous-section « ADVERSAIRES »" — header,
// content (loading / error / empty / list), then "+ Adversaire" below. Each
// opponent is a full-width bar (mockup "[Admin] Web - opponent - 1"). The
// mockup's per-bar pencil is not built: editing an opponent is not specified
// (PO-TO-03) and there is no update policy on `opponents`. No removal control
// either (AC-TO-17, PO-TO-10).
export function TeamOpponentsPanel({
  teamId,
  canWriteTeams,
  onAdd,
}: TeamOpponentsPanelProps) {
  const vm = useTeamOpponentsViewModel(teamId);

  return (
    <div className="flex flex-col items-start gap-2">
      <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Adversaires
      </h3>

      {vm.isLoading && (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      )}

      {vm.hasError && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-destructive">
            Impossible de charger les adversaires.
          </p>
          <Button
            type="button"
            variant="link"
            onClick={vm.retry}
            className="h-11"
          >
            Réessayer
          </Button>
        </div>
      )}

      {vm.isEmpty && (
        <p className="text-sm text-muted-foreground">
          Aucun adversaire relié pour l'instant.
        </p>
      )}

      {vm.opponents.length > 0 && (
        <ul className="flex w-full flex-col gap-2">
          {vm.opponents.map((opponent) => (
            <li
              key={opponent.id}
              className="flex min-h-11 items-center rounded-lg border bg-muted/30 px-3 text-sm font-semibold text-foreground"
            >
              <span className="min-w-0 truncate">{opponent.name}</span>
            </li>
          ))}
        </ul>
      )}

      {canWriteTeams && (
        <Button
          type="button"
          variant="outline"
          onClick={onAdd}
          className="h-11 rounded-full"
        >
          + Adversaire
        </Button>
      )}
    </div>
  );
}
