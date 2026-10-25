import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import HomePage from "../pages/HomePage";

vi.mock("../api", () => ({
  api: {
    listMaterials: vi.fn().mockResolvedValue([]),
    listCourses: vi.fn().mockResolvedValue([
      { id: 12, title: "planets", language: "es", material_id: 3, lesson_count: 2 },
      { id: 13, title: "swahili", language: null, material_id: 4, lesson_count: 1 },
    ]),
    catalog: vi.fn().mockResolvedValue([]),
    leaderboard: vi.fn().mockResolvedValue({
      tier: "bronze",
      week_start: "2026-10-19",
      entries: [],
      me: { user_id: 1, name: "demo", xp: 0, streak: 0, zone: "safe" },
    }),
  },
}));

vi.mock("../session", () => ({
  useSession: () => ({
    user: {
      id: 1,
      email: "demo@bolingo.app",
      xp: 0,
      streak: 0,
      hearts: 5,
      hearts_refill_seconds: 0,
      lessons_completed: 0,
      daily_quest: null,
      activity_days: [],
      league_tier: "bronze",
      league_points: 0,
      league_next_in: 0,
      league_rank: null,
      league_zone: "safe",
      created_at: "2026-01-01T00:00:00",
    },
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("HomePage courses", () => {
  it("lists the learner's courses with lesson counts and links", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("planets")).toBeInTheDocument();
    expect(screen.getByText("swahili")).toBeInTheDocument();
    expect(screen.getByText(/2 lessons · es/)).toBeInTheDocument();
    expect(screen.getByText(/1 lesson · auto/)).toBeInTheDocument();

    const openLinks = screen.getAllByRole("link", { name: "Open" });
    expect(openLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/course/12",
      "/course/13",
    ]);
  });
});
