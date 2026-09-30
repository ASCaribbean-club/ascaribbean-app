import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidOpponentInputError } from "@domain/errors/invalid-opponent-input-error";
import { useSectionAndTeamsDependencies } from "@presentation/di/hooks/use-section-and-teams-dependencies";
import { useAuth } from "@presentation/shared/hooks/use-auth";
import { queryKeys } from "@presentation/shared/query-keys";
import { useAddOpponentDialogViewModel } from "./useAddOpponentDialogViewModel";

// specs/team-opponents.md §2.2/§2.6/AC-TO-15/AC-TO-16 — submit gating, and
// the invalidation of the CHOSEN team's list (not the row the dialog was
// opened from).

vi.mock("@presentation/di/hooks/use-section-and-teams-dependencies");
vi.mock("@presentation/shared/hooks/use-auth");

const mockedUseSectionAndTeamsDependencies = vi.mocked(
  useSectionAndTeamsDependencies,
);
const mockedUseAuth = vi.mocked(useAuth);

function renderViewModel({
  execute,
  onSuccess = vi.fn(),
}: {
  execute: ReturnType<typeof vi.fn>;
  onSuccess?: () => void;
}) {
  mockedUseAuth.mockReturnValue({ user: { id: "admin-1" } } as never);
  mockedUseSectionAndTeamsDependencies.mockReturnValue({
    addOpponentToTeamUseCase: { execute },
  } as never);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () =>
      useAddOpponentDialogViewModel({ initialTeamId: "team-row", onSuccess }),
    { wrapper },
  );
  return { ...hook, invalidateQueries, onSuccess };
}

describe("useAddOpponentDialogViewModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with the row team preselected and submit disabled", () => {
    const { result } = renderViewModel({ execute: vi.fn() });

    expect(result.current.teamId).toBe("team-row");
    expect(result.current.name).toBe("");
    expect(result.current.canSubmit).toBe(false);
  });

  it("keeps submit disabled for a whitespace-only name", () => {
    const { result } = renderViewModel({ execute: vi.fn() });

    act(() => result.current.setName("   "));

    expect(result.current.canSubmit).toBe(false);
  });

  it("enables submit once a name is typed", () => {
    const { result } = renderViewModel({ execute: vi.fn() });

    act(() => result.current.setName("AS Exemple"));

    expect(result.current.canSubmit).toBe(true);
  });

  it("submits the actor, the chosen team and the typed name", async () => {
    const execute = vi
      .fn()
      .mockResolvedValue({ id: "o-1", name: "AS Exemple" });
    const { result } = renderViewModel({ execute });

    act(() => {
      result.current.setName("AS Exemple");
      result.current.setTeamId("team-chosen");
    });
    act(() => result.current.submit());

    await waitFor(() => expect(execute).toHaveBeenCalled());
    expect(execute).toHaveBeenCalledWith({
      actorId: "admin-1",
      teamId: "team-chosen",
      name: "AS Exemple",
    });
  });

  it("invalidates the chosen team's opponents, not the row's, then calls onSuccess", async () => {
    const { result, invalidateQueries, onSuccess } = renderViewModel({
      execute: vi.fn().mockResolvedValue({ id: "o-1", name: "AS Exemple" }),
    });

    act(() => {
      result.current.setName("AS Exemple");
      result.current.setTeamId("team-chosen");
    });
    act(() => result.current.submit());

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.teamOpponents("team-chosen"),
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: queryKeys.teamOpponents("team-row"),
    });
  });

  it("surfaces a mapped message and stays open when the use case fails", async () => {
    const { result, onSuccess } = renderViewModel({
      execute: vi
        .fn()
        .mockRejectedValue(new InvalidOpponentInputError("name is required")),
    });

    act(() => result.current.setName("AS Exemple"));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.errorMessage).not.toBeNull());
    expect(result.current.errorMessage).toBe(
      "Le nom de l'adversaire et l'équipe du club concernée sont obligatoires.",
    );
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.name).toBe("AS Exemple");
  });
});
