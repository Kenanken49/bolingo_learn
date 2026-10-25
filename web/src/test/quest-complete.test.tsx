import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import HomePage from "../pages/HomePage";

vi.mock("../api", () => ({
  api: {
    listMaterials: vi.fn().mockResolvedValue([]),
    listCourses: vi.fn().mockResolvedValue([]),
    catalog: vi.fn().mockResolvedValue([]),
    leaderboard: vi.fn().mockResolvedValue({
      tier: "bronze",
      week_start: "2026-10-19",
      entries: [],
      me: { user_id: 1, name: "demo", xp: 0, streak: 3, zone: "safe" },
    }),
  },
}));

vi.mock("../session", () => ({
  useSession: () => ({
    user: {
      id: 1,
      email: "demo@bolingo.app",
      xp: 100,
      streak: 3,
      hearts: 5,
      hearts_refill_seconds: 0,
      lessons_completed: 4,
      daily_quest: {
        id: 5,
        quest_type: "earn_xp",
        target: 20,
        current: 20,
        progress_percent: 100,
        completed: true,
      },
      activity_days: ["2026-10-20", "2026-10-22"],
      league_tier: "bronze",
      league_points: 0,
      league_next_in: 0,
      league_rank: 1,
      league_zone: "safe",
      created_at: "2026-01-01T00:00:00",
    },
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("HomePage completed daily quest", () => {
  it("celebrates the finished quest and asks the learner to return tomorrow", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/Quest complete! You banked every XP/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Come back tomorrow/)).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar").getAttribute("aria-valuenow"),
    ).toBe("100");
    expect(screen.queryByText(/· 100%/)).not.toBeInTheDocument();
  });
});
