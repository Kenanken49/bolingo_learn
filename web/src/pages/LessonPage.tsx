import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  api,
  base64ToAudioUrl,
  type AttemptResult,
  type CheckResult,
  type LessonDetail,
} from "../api";
import { useSession } from "../session";
import BirdbrainModal from "../components/BirdbrainModal";

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Choose the correct answer",
  fill_in_blank: "Fill in the blank",
  translate: "Translate",
  listening: "Listen and choose",
  speak: "Speak this sentence",
};

export default function LessonPage() {
  const { lessonId } = useParams();
  const { refresh } = useSession();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Map<number, CheckResult>>(new Map());
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [recording, setRecording] = useState(false);
  const [birdbrainOpen, setBirdbrainOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setResult(null);
    setIndex(0);
    setFeedback(new Map());
    try {
      const data = await api.getLesson(Number(lessonId));
      setLesson(data);
      setAnswers(new Array(data.items.length).fill(""));
    } catch (err) {
      setLesson(null);
      setError((err as Error).message);
    }
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  const item = lesson?.items[index];
  const currentFeedback = feedback.get(index);
  const answer = answers[index] ?? "";
  const isLast = lesson ? index === lesson.items.length - 1 : false;

  const setAnswer = useCallback(
    (value: string) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    },
    [index],
  );

  const check = useCallback(
    async (value: string) => {
      if (!lesson || !item) return;
      setChecking(true);
      setError(null);
      try {
        const res = await api.checkAnswer(lesson.id, index, value);
        setFeedback((prev) => {
          const next = new Map(prev);
          next.set(index, res);
          return next;
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setChecking(false);
      }
    },
    [lesson, item, index],
  );

  const playPrompt = useCallback(async () => {
    if (!item) return;
    try {
      const res = await api.tts(item.prompt);
      const url = base64ToAudioUrl(res.audio_base64, res.content_type);
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => undefined);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [item]);

  const handleSpeech = useCallback(
    async (file: Blob) => {
      if (!lesson || !item) return;
      setRecording(true);
      setError(null);
      try {
        const res = await api.speechAttempt(lesson.id, index, file);
        setAnswer(res.transcript);
        await refresh();
        setFeedback((prev) => {
          const next = new Map(prev);
          next.set(index, {
            index,
            correct: res.correct,
            correct_answer: res.correct_answer,
            explanation: null,
          });
          return next;
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setRecording(false);
      }
    },
    [lesson, item, index, setAnswer, refresh],
  );

  const toggleRecording = useCallback(async () => {
    const active = recorderRef.current;
    if (active) {
      active.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicError("Recording isn't supported in this browser.");
      return;
    }
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 0) void handleSpeech(blob);
      };
      recorder.start();
      setRecording(true);
    } catch {
      setMicError("Microphone access was blocked.");
    }
  }, [handleSpeech]);

  const submit = useCallback(async () => {
    if (!lesson) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitAttempt(lesson.id, answers);
      setResult(res);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [lesson, answers, refresh]);

  const next = useCallback(() => {
    if (!lesson) return;
    if (isLast) {
      void submit();
    } else {
      setIndex((prev) => prev + 1);
    }
  }, [lesson, isLast, submit]);

  const progress = useMemo(() => {
    if (!lesson) return 0;
    return Math.round((feedback.size / lesson.items.length) * 100);
  }, [lesson, feedback]);

  if (error && !lesson) {
    return (
      <div className="rounded-2xl border border-duo-border bg-white p-6 text-center">
        <p className="text-sm font-semibold text-duo-red">{error}</p>
        <Link to="/" className="mt-3 btn btn-ghost">
          Back home
        </Link>
      </div>
    );
  }

  if (!lesson || !item) {
    return (
      <div className="rounded-2xl border border-duo-border bg-white p-6 text-center text-duo-muted">
        Loading lesson…
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex flex-col gap-6">
        <section className="animate-pop rounded-2xl border border-duo-border bg-white p-6 text-center">
          <p className="text-4xl">{result.passed ? "🎉" : "💪"}</p>
          <h1 className="mt-2 text-2xl font-extrabold text-duo-ink">
            {result.passed ? "Lesson complete!" : "Almost there"}
          </h1>
          <p className="mt-1 text-sm text-duo-muted">
            {result.correct} / {result.total} correct
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-duo-surface p-3">
              <p className="text-xs font-bold uppercase text-duo-muted">XP earned</p>
              <p className="text-xl font-extrabold text-duo-yellow">⚡ {result.xp_awarded}</p>
            </div>
            <div className="rounded-xl bg-duo-surface p-3">
              <p className="text-xs font-bold uppercase text-duo-muted">Streak</p>
              <p className="text-xl font-extrabold text-duo-orange">🔥 {result.streak}</p>
            </div>
            <div className="rounded-xl bg-duo-surface p-3">
              <p className="text-xs font-bold uppercase text-duo-muted">Hearts</p>
              <p className="text-xl font-extrabold text-duo-red">♥ {result.hearts}</p>
            </div>
          </div>
          <ul className="mt-5 space-y-2 text-left">
            {result.results.map((r) => (
              <li
                key={r.index}
                className={`rounded-xl p-3 text-sm font-semibold ${
                  r.correct ? "bg-duo-green/10 text-duo-green" : "bg-duo-red/10 text-duo-red"
                }`}
              >
                <span>
                  {r.index + 1}. {r.correct ? "Correct" : `Not quite — answer: ${r.correct_answer}`}
                </span>
                {!r.correct && r.given && (
                  <span className="block text-xs font-medium text-duo-muted">You answered: {r.given}</span>
                )}
                {r.explanation && (
                  <span className="block text-xs font-medium text-duo-muted">{r.explanation}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to={`/course/${lesson.course_id}`} className="btn btn-green">
              Back to course
            </Link>
            <button onClick={() => void load()} className="btn btn-ghost">
              Try again
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-duo-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-duo-ink">{lesson.title}</h1>
            <p className="text-sm text-duo-muted">
              Question {index + 1} of {lesson.items.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setBirdbrainOpen(true)}
              className="text-sm font-semibold text-duo-blue"
            >
              Birdbrain
            </button>
            <Link to={`/course/${lesson.course_id}`} className="text-sm font-semibold text-duo-blue">
              Quit
            </Link>
          </div>
        </div>
        <BirdbrainModal
          level={lesson.birdbrain_level}
          open={birdbrainOpen}
          onClose={() => setBirdbrainOpen(false)}
        />
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-duo-surface">
          <div className="h-full rounded-full bg-duo-green transition-all" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="flex-1 rounded-2xl border border-duo-border bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-duo-muted">
          {TYPE_LABELS[item.question_type] ?? item.question_type}
        </p>
        <p className="mt-2 text-lg font-bold text-duo-ink">{item.prompt}</p>

        {item.question_type === "listening" && (
          <button onClick={playPrompt} className="mt-3 btn btn-blue">
            ♪ Play
          </button>
        )}

        {(item.question_type === "multiple_choice" ||
          (item.question_type === "listening" && item.options)) &&
          item.options && (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.options.map((option) => {
                const selected = answer === option;
                const correct = currentFeedback?.correct && option === currentFeedback.correct_answer;
                const wrong = currentFeedback && !currentFeedback.correct && selected;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAnswer(option)}
                    disabled={Boolean(currentFeedback) || checking}
                    className={`option-card ${selected ? "border-duo-blue bg-duo-blue/10" : ""} ${
                      correct ? "border-duo-green bg-duo-green/10" : ""
                    } ${wrong ? "border-duo-red bg-duo-red/10" : ""}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}

        {item.question_type === "fill_in_blank" && (
          <div className="mt-4 flex flex-col gap-3">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={Boolean(currentFeedback)}
              placeholder="Type the missing word"
              className="w-full rounded-xl border-2 border-duo-border px-3 py-2.5 font-semibold outline-none focus:border-duo-blue"
            />
            {item.options && (
              <div className="flex flex-wrap gap-2">
                {item.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAnswer(option)}
                    disabled={Boolean(currentFeedback)}
                    className={`option-card ${answer === option ? "border-duo-blue bg-duo-blue/10" : ""}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {item.question_type === "translate" && (
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={Boolean(currentFeedback)}
            placeholder="Type your translation"
            className="mt-4 w-full rounded-xl border-2 border-duo-border px-3 py-2.5 font-semibold outline-none focus:border-duo-blue"
          />
        )}

        {item.question_type === "speak" && (
          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              className="btn btn-blue"
              disabled={recording || Boolean(currentFeedback)}
              onClick={() => void toggleRecording()}
            >
              {recording ? "Stop recording" : "Record your answer"}
            </button>
            {micError && <p className="text-xs font-semibold text-duo-red">{micError}</p>}
            <p className="text-xs text-duo-muted">
              {answer ? `Heard: “${answer}”` : "Record yourself reading the sentence above."}
            </p>
          </div>
        )}

        {currentFeedback && (
          <div
            className={`mt-4 rounded-xl p-3 text-sm font-semibold ${
              currentFeedback.correct ? "bg-duo-green/10 text-duo-green" : "bg-duo-red/10 text-duo-red"
            }`}
          >
            {currentFeedback.correct ? "Correct!" : `Not quite — answer: ${currentFeedback.correct_answer}`}
            {currentFeedback.explanation && (
              <p className="mt-1 text-xs font-medium text-duo-muted">{currentFeedback.explanation}</p>
            )}
          </div>
        )}

        {item.question_type !== "speak" && (
          <div className="mt-5 flex flex-wrap gap-3">
            {!currentFeedback ? (
              <button
                onClick={() => void check(answer)}
                disabled={!answer.trim() || checking}
                className="btn btn-blue"
              >
                {checking ? "Checking…" : "Check"}
              </button>
            ) : (
              <button onClick={next} disabled={submitting} className="btn btn-green">
                {isLast ? (submitting ? "Finishing…" : "Finish lesson") : "Continue"}
              </button>
            )}
          </div>
        )}

        {item.question_type === "speak" && currentFeedback && (
          <button onClick={next} disabled={submitting} className="mt-5 btn btn-green">
            {isLast ? (submitting ? "Finishing…" : "Finish lesson") : "Continue"}
          </button>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-duo-red">{error}</p>}
      </section>
    </div>
  );
}
