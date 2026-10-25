import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import LearnPage from "../pages/LearnPage";

const { CATALOG, PROGRESS } = vi.hoisted(() => ({
  CATALOG: [
    {
      slug: "python",
      name: "Python",
      description: "Intro",
      levels: [
        {
          number: 1,
          lessons: [
            { title: "Basics", kind: "reading", instruction: "Read.", difficulty: 1 },
            { title: "CLI tool", kind: "project", instruction: "Build.", difficulty: 2 },
          ],
        },
        {
          number: 2,
          lessons: [{ title: "Data", kind: "practice", instruction: "Practice.", difficulty: 2 }],
        },
      ],
    },
  ],
  PROGRESS: {
    gems: 5,
    gems_per_lesson: 5,
    gems_per_unlock: 50,
    tracks: [
      {
        slug: "python",
        levels: [
          {
            number: 1,
            unlocked: true,
            unlock_cost: 0,
            lessons: [
              { index: 0, completed: false },
              { index: 1, completed: false },
            ],
          },
          {
            number: 2,
            unlocked: false,
            unlock_cost: 50,
            lessons: [{ index: 0, completed: false }],
          },
        ],
      },
    ],
  },
}));

vi.mock("../api", () => ({
  api: {
    catalog: vi.fn(),
    catalogProgress: vi.fn(),
    completeCatalogLesson: vi.fn(),
    unlockCatalogLevel: vi.fn(),
  },
}));

vi.mock("../session", () => ({
  useSession: () => ({ refresh: vi.fn(async () => undefined) }),
}));

describe("LearnPage", () => {
  beforeEach(() => {
    vi.mocked(api.catalog).mockResolvedValue(CATALOG as never);
    vi.mocked(api.catalogProgress).mockResolvedValue(structuredClone(PROGRESS) as never);
  });

  it("shows gems, locks level 2 and completes the next lesson on the path", async () => {
    vi.mocked(api.completeCatalogLesson).mockResolvedValue({
      gems_awarded: 5,
      gems: 10,
      already_completed: false,
    });

    render(
      <MemoryRouter>
        <LearnPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/5 gems/)).toBeInTheDocument();
    expect(screen.getByText(/Unlock for 50 gems/)).toBeDisabled();

    const first = screen.getByRole("button", { name: "Basics" });
    const second = screen.getByRole("button", { name: "CLI tool" });
    expect(first).toBeEnabled();
    expect(second).toBeDisabled();

    fireEvent.click(first);

    await waitFor(() =>
      expect(api.completeCatalogLesson).toHaveBeenCalledWith("python", 1, 0),
    );
    expect(await screen.findByText("+5 gems")).toBeInTheDocument();
  });
});
