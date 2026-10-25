import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import LibraryPage from "../pages/LibraryPage";

const { COURSE } = vi.hoisted(() => ({
  COURSE: {
    slug: "html-css-basics",
    title: "HTML & CSS Basics",
    description: "Build a page.",
    source: "Bolingo original",
    source_url: null,
    lesson_count: 1,
    lessons: [
      {
        slug: "first-html-page",
        title: "Your first HTML page",
        body: "Intro paragraph.\n\n```html\n<h1>Hi</h1>\n```\n\nClosing <b>text</b>.",
      },
    ],
  },
}));

vi.mock("../api", () => ({
  api: {
    libraryCourse: vi.fn(),
    libraryCourses: vi.fn(),
  },
}));

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.mocked(api.libraryCourse).mockResolvedValue(structuredClone(COURSE) as never);
  });

  it("renders lessons, prose and code blocks as text", async () => {
    render(
      <MemoryRouter initialEntries={["/library/html-css-basics"]}>
        <Routes>
          <Route path="/library/:slug" element={<LibraryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "HTML & CSS Basics" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "1. Your first HTML page" })).toBeInTheDocument();
    expect(screen.getByText("Intro paragraph.")).toBeInTheDocument();
    expect(screen.getByText("<h1>Hi</h1>").tagName).toBe("CODE");
    // Raw HTML in prose is shown as text, not parsed into an element.
    expect(screen.getByText("Closing <b>text</b>.")).toBeInTheDocument();
    expect(document.querySelector("b")).toBeNull();
  });
});
