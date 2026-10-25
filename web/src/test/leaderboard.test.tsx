import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import LeaderboardPage from "../pages/LeaderboardPage";

vi.mock("../api", () => ({
  api: {
    leaderboard: vi.fn().mockResolvedValue({
      tier: "silver",
      week_start: "2026-10-19",
      entries: [
        { user_id: 7, name: "pendo", xp: 120, streak: 12, zone: "promotion" },
        { user_id: 1, name: "demo", xp: 90, streak: 4, zone: "safe" },
        { user_id: 9, name: "keza", xp: 60, streak: 2, zone: "demotion" },
      ],
      me: { user_id: 1, name: "demo", xp: 90, streak: 4, zone: "safe" },
    }),
  },
}));

vi.mock("../session", () => ({
  useSession: () => ({
    user: {
      id: 1,
      email: "demo@bolingo.app",
      xp: 4200,
      streak: 4,
      hearts: 5,
      hearts_refill_seconds: 0,
      lessons_completed: 6,
      daily_quest: null,
      activity_days: [],
      league_tier: "silver",
      league_points: 90,
      league_next_in: 31,
      league_rank: 2,
      league_zone: "safe",
      created_at: "2026-01-01T00:00:00",
    },
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("LeaderboardPage", () => {
  it("shows weekly points, my rank, zones and the ladder", async () => {
    render(
      <MemoryRouter>
        <LeaderboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("pendo")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "League" })).toBeInTheDocument();
    expect(screen.getByText("⚡ 90 XP this week")).toBeInTheDocument();
    expect(screen.getByText("#2 in your league")).toBeInTheDocument();
    expect(screen.getByText("31 XP to the promotion zone.")).toBeInTheDocument();
    expect(screen.getByText("You are here")).toBeInTheDocument();
    expect(screen.getAllByText("Silver league").length).toBeGreaterThan(0);
    expect(screen.getByText("keza")).toBeInTheDocument();
    expect(screen.getByText("you")).toBeInTheDocument();
    expect(screen.getByText("Promotion")).toBeInTheDocument();
    expect(screen.getByText("Demotion")).toBeInTheDocument();
  });
});
