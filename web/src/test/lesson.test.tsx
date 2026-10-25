import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import LessonPage from "../pages/LessonPage";

const LESSON = {
  id: 7,
  course_id: 3,
  title: "Capitals",
  birdbrain_level: 1,
  focus_index: 0,
  items: [
    {
      question_type: "multiple_choice",
      prompt: "Capital of France?",
      options: ["Paris", "Rome"],
    },
    {
      question_type: "translate",
      prompt: "Translate: gato",
    },
  ],
};

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return {
    ...actual,
    api: {
      getLesson: vi.fn(),
      checkAnswer: vi.fn(),
      submitAttempt: vi.fn(),
      tts: vi.fn(),
      speechAttempt: vi.fn(),
    },
  };
});

vi.mock("../session", () => ({
  useSession: () => ({ refresh: vi.fn(async () => undefined) }),
}));

function renderLesson() {
  return render(
    <MemoryRouter initialEntries={["/lesson/7"]}>
      <Routes>
        <Route path="/lesson/:lessonId" element={<LessonPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LessonPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getLesson).mockResolvedValue(structuredClone(LESSON) as never);
  });

  it("checks an answer, shows feedback, and finishes with the server results", async () => {
    vi.mocked(api.checkAnswer)
      .mockResolvedValueOnce({ correct: true, correct_answer: "Paris", explanation: null } as never)
      .mockResolvedValueOnce({ correct: false, correct_answer: "gato", explanation: null } as never);
    vi.mocked(api.submitAttempt).mockResolvedValue({
      passed: false,
      correct: 1,
      total: 2,
      xp_awarded: 10,
      streak: 3,
      hearts: 4,
      results: [
        { index: 0, correct: true, correct_answer: "Paris", given: "Paris", explanation: null },
        { index: 1, correct: false, correct_answer: "gato", given: "cat", explanation: null },
      ],
    } as never);

    renderLesson();

    expect(await screen.findByText("Capital of France?")).toBeInTheDocument();
    const check = screen.getByRole("button", { name: "Check" });
    expect(check).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Paris" }));
    fireEvent.click(check);

    expect(await screen.findByText("Correct!")).toBeInTheDocument();
    expect(api.checkAnswer).toHaveBeenCalledWith(7, 0, "Paris");

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Translate: gato")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Type your translation"), {
      target: { value: "cat" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText(/Not quite — answer: gato/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Finish lesson" }));

    await waitFor(() =>
      expect(api.submitAttempt).toHaveBeenCalledWith(
        7,
        ["Paris", "cat"],
        { seconds: expect.any(Number) },
      ),
    );
    expect(await screen.findByText("1 / 2 correct")).toBeInTheDocument();
    expect(screen.getByText("⚡ 10")).toBeInTheDocument();
    expect(screen.getByText("You answered: cat")).toBeInTheDocument();
  });
});
