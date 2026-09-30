import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSectionAndTeamsDependencies } from "@presentation/di/hooks/use-section-and-teams-dependencies";
import { useTeamOpponentsViewModel } from "./useTeamOpponentsViewModel";

// specs/team-opponents.md §2.6/AC-TO-13 — the expanded row's read: stable
// case-insensitive alphabetical order, and the loading / error / empty
// flags the panel branches on.

vi.mock("@presentation/di/hooks/use-section-and-teams-dependencies");

const mockedUseSectionAndTeamsDependencies = vi.mocked(
  useSectionAndTeamsDependencies,
);

function renderViewModel(findByTeamId: ReturnType<typeof vi.fn>) {
  mockedUseSectionAndTeamsDependencies.mockReturnValue({
    opponentRepository: { findByTeamId },
  } as never);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useTeamOpponentsViewModel("team-1"), { wrapper });
}

describe("useTeamOpponentsViewModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the opponents of the given team", async () => {
    const findByTeamId = vi.fn().mockResolvedValue([]);
    const { result } = renderViewModel(findByTeamId);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(findByTeamId).toHaveBeenCalledWith("team-1");
  });

  it("sorts opponents alphabetically, ignoring case and accents", async () => {
    const { result } = renderViewModel(
      vi.fn().mockResolvedValue([
        { id: "o-3", name: "zèbre FC" },
        { id: "o-1", name: "Étoile SC" },
        { id: "o-2", name: "as exemple" },
      ]),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.opponents.map((o) => o.name)).toEqual([
      "as exemple",
      "Étoile SC",
      "zèbre FC",
    ]);
  });

  it("is loading, and not empty, until the read resolves", async () => {
    const { result } = renderViewModel(
      vi.fn().mockReturnValue(new Promise(() => {})),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isEmpty).toBe(false);
  });

  it("is empty when the team has no linked opponent", async () => {
    const { result } = renderViewModel(vi.fn().mockResolvedValue([]));

    await waitFor(() => expect(result.current.isEmpty).toBe(true));

    expect(result.current.hasError).toBe(false);
  });

  it("reports an error, and is not empty, when the read fails", async () => {
    const { result } = renderViewModel(
      vi.fn().mockRejectedValue(new Error("network")),
    );

    await waitFor(() => expect(result.current.hasError).toBe(true));

    expect(result.current.isEmpty).toBe(false);
    expect(result.current.opponents).toEqual([]);
  });
});
