import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import HomePage from "../pages/HomePage";
import TrackPage from "../pages/TrackPage";

// vi.mock factories are hoisted above top-level consts, so the fixture has to
// be created inside vi.hoisted() to be referenceable from the api mock.
const { CATALOG } = vi.hoisted(() => ({
  CATALOG: [
    {
      slug: "python",
      name: "Python",
      description: "From a first script to a production data platform.",
      levels: [
        {
          number: 1,
          lessons: [
            {
              title: "Python Basics & Environment",
              kind: "reading",
              instruction: "Read: Python tooling and a first program.",
              difficulty: 1,
            },
            {
              title: "Ship a CLI tool",
              kind: "project",
              instruction: "Build: package a command-line tool and publish it.",
              difficulty: 2,
            },
          ],
        },
        {
          number: 2,
          lessons: [
            {
              title: "Data structures",
              kind: "practice",
              instruction: "Practice: lists, dicts, and sets.",
              difficulty: 2,
            },
          ],
        },
      ],
    },
    {
      slug: "cpp",
      name: "C++",
      description: "From a first hello world to production low-latency code.",
      levels: [
        {
          number: 1,
          lessons: [
            {
              title: "C++ Basics & Environment",
              kind: "reading",
              instruction: "Read: a first program and the toolchain.",
              difficulty: 1,
            },
          ],
        },
      ],
    },
  ],
}));

vi.mock("../api", () => ({
  api: {
    listMaterials: vi.fn(),
    listCourses: vi.fn(),
    catalog: vi.fn(),
    leaderboard: vi.fn(),
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

// src/test/setup.ts restores every mock after each test, so implementations
// have to be (re)attached per test rather than only in the factory.
beforeEach(() => {
  vi.mocked(api.listMaterials).mockResolvedValue([]);
  vi.mocked(api.listCourses).mockResolvedValue([]);
  vi.mocked(api.catalog).mockResolvedValue(CATALOG);
  vi.mocked(api.leaderboard).mockResolvedValue({
    tier: "bronze",
    week_start: "2026-10-19",
    entries: [],
    me: { user_id: 1, name: "demo", xp: 0, streak: 0, zone: "safe" },
  });
});

describe("Built-in course catalog", () => {
  it("lists the built-in tracks on the home page with links", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Python")).toBeInTheDocument();
    expect(screen.getByText("C++")).toBeInTheDocument();
    expect(screen.getByText(/2 levels · 3 lessons/)).toBeInTheDocument();
    expect(screen.getByText(/1 level · 1 lesson/)).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /Python/ }).getAttribute("href"),
    ).toBe("/track/python");
    expect(
      screen.getByRole("link", { name: /C\+\+/ }).getAttribute("href"),
    ).toBe("/track/cpp");
  });

  it("renders a track's levels and outline lessons", async () => {
    render(
      <MemoryRouter initialEntries={["/track/python"]}>
        <Routes>
          <Route path="/track/:slug" element={<TrackPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Python" })).toBeInTheDocument();
    expect(
      screen.getByText("From a first script to a production data platform."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Level 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Level 2" })).toBeInTheDocument();
    expect(screen.getByText("Python Basics & Environment")).toBeInTheDocument();
    expect(screen.getByText("Ship a CLI tool")).toBeInTheDocument();
    expect(screen.getByText("Data structures")).toBeInTheDocument();
    expect(screen.getByLabelText("Difficulty 1 of 5")).toBeInTheDocument();
  });
});
