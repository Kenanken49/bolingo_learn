import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import HomePage from "../pages/HomePage";

function daysAgo(offset: number): string {
  const day = new Date();
  day.setDate(day.getDate() - offset);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(
    day.getDate(),
  ).padStart(2, "0")}`;
}

const ACTIVE_DAYS = [daysAgo(0), daysAgo(2), daysAgo(5)];

vi.mock("../api", () => ({
  api: {
    listMaterials: vi.fn().mockResolvedValue([]),
    listCourses: vi.fn().mockResolvedValue([]),
    catalog: vi.fn().mockResolvedValue([]),
    leaderboard: vi.fn().mockResolvedValue({
      tier: "bronze",
      week_start: "2026-10-19",
      entries: [
        { user_id: 7, name: "pendo", xp: 120, streak: 9, zone: "promotion" },
        { user_id: 1, name: "demo", xp: 100, streak: 7, zone: "safe" },
      ],
      me: { user_id: 1, name: "demo", xp: 100, streak: 7, zone: "safe" },
    }),
  },
}));

vi.mock("../session", () => ({
  useSession: () => ({
    user: {
      id: 1,
      email: "demo@bolingo.app",
      xp: 100,
      streak: 7,
      hearts: 4,
      hearts_refill_seconds: 0,
      lessons_completed: 3,
      daily_quest: {
        id: 5,
        quest_type: "earn_xp",
        target: 20,
        current: 10,
        progress_percent: 50,
        completed: false,
      },
      activity_days: ACTIVE_DAYS,
      league_tier: "bronze",
      league_points: 100,
      league_next_in: 40,
      league_rank: 2,
      league_zone: "safe",
      created_at: "2026-01-01T00:00:00",
    },
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("HomePage gamification", () => {
  it("shows the daily quest, streak warning and league leaderboard", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Earn 20 XP today")).toBeInTheDocument();
    expect(screen.getByText(/10 \/ 20 XP/)).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar").getAttribute("aria-valuenow"),
    ).toBe("50");
    expect(screen.getByText(/7 days in a row/)).toBeInTheDocument();
    expect(screen.getByText("3 active days")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/ active$/)).toHaveLength(3);
    expect(screen.getAllByText(/Bronze league/i).length).toBeGreaterThan(0);
    expect(screen.getByText("pendo")).toBeInTheDocument();
    expect(screen.getByText("demo")).toBeInTheDocument();
    expect(screen.getByText(/40 XP to the promotion zone/)).toBeInTheDocument();
  });
});
