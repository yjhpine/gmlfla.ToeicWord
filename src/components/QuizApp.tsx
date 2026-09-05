"use client";

import { useMemo, useState } from "react";
import type { DayWordbook, QuizWord } from "@/lib/words/types";

type Phase = "select" | "prompt" | "reveal" | "result";

type Props = {
  books: DayWordbook[];
};

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function QuizApp({ books }: Props) {
  const [selected, setSelected] = useState<number[]>([1]);
  const [phase, setPhase] = useState<Phase>("select");
  const [queue, setQueue] = useState<QuizWord[]>([]);
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState<QuizWord[]>([]);

  const current = queue[index];
  const progress = queue.length ? Math.min(index + 1, queue.length) : 0;

  const selectedLabel = useMemo(() => {
    if (selected.length === 0) return "Day를 선택하세요";
    const sorted = [...selected].sort((a, b) => a - b);
    return `Day ${sorted.join(", ")}`;
  }, [selected]);

  function toggleDay(day: number) {
    setSelected((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function startQuiz() {
    const days = new Set(selected);
    const words = books
      .filter((book) => days.has(book.day))
      .flatMap((book) =>
        book.words.map((word) => ({
          ...word,
          day: book.day,
        })),
      );
    if (words.length === 0) return;
    setQueue(shuffle(words));
    setIndex(0);
    setWrong([]);
    setPhase("prompt");
  }

  function reveal() {
    if (phase === "prompt") setPhase("reveal");
  }

  function markWrong() {
    if (!current) return;
    setWrong((prev) => [...prev, current]);
    goNext();
  }

  function markCorrect() {
    goNext();
  }

  function goNext() {
    const nextIndex = index + 1;
    if (nextIndex >= queue.length) {
      setPhase("result");
      return;
    }
    setIndex(nextIndex);
    setPhase("prompt");
  }

  function resetToSelect() {
    setPhase("select");
    setQueue([]);
    setIndex(0);
    setWrong([]);
  }

  if (phase === "result") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
          시험 결과
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          {selectedLabel} · 총 {queue.length}문제 중 틀린 단어 {wrong.length}개
        </p>

        {wrong.length === 0 ? (
          <p className="mt-10 text-lg font-medium text-[var(--accent)]">
            전부 맞췄어요. 잘했습니다!
          </p>
        ) : (
          <ol className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {wrong.map((entry, i) => (
              <li key={`${entry.day}-${entry.word}-${i}`} className="py-4">
                <p className="text-xs text-[var(--muted)]">Day {entry.day}</p>
                <p className="mt-1 text-xl font-semibold text-[var(--accent)]">
                  {entry.word}
                </p>
                <p className="mt-1 text-[var(--fg)]">{entry.meaning}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{entry.example}</p>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startQuiz}
            className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            같은 범위 다시
          </button>
          <button
            type="button"
            onClick={resetToSelect}
            className="rounded-md border border-[var(--line)] bg-white/70 px-5 py-2.5 text-sm font-medium transition hover:bg-white"
          >
            Day 다시 선택
          </button>
        </div>
      </div>
    );
  }

  if (phase === "prompt" || phase === "reveal") {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-4 text-sm text-[var(--muted)]">
          <span>{selectedLabel}</span>
          <span>
            {progress} / {queue.length}
          </span>
        </div>
        <div className="mx-auto mt-2 h-1 w-full max-w-3xl overflow-hidden px-4">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
            style={{ width: `${(progress / Math.max(queue.length, 1)) * 100}%` }}
          />
        </div>

        <button
          type="button"
          onClick={reveal}
          className="flex flex-1 flex-col items-center justify-center px-6 text-center"
          aria-label={phase === "prompt" ? "화면을 눌러 정답 보기" : "정답 표시됨"}
        >
          <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--fg)] sm:text-5xl">
            {current?.word}
          </p>
          {phase === "prompt" ? (
            <p className="mt-8 animate-pulse text-sm text-[var(--muted)]">
              화면을 터치하면 정답과 예문이 나옵니다
            </p>
          ) : (
            <div className="mt-10 w-full max-w-lg animate-[fade-up_240ms_ease-out]">
              <p className="text-xl font-medium text-[var(--accent)]">
                {current?.meaning}
              </p>
              <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
                {current?.example}
              </p>
            </div>
          )}
        </button>

        {phase === "reveal" ? (
          <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 px-4 pb-8 animate-[fade-up_240ms_ease-out]">
            <button
              type="button"
              onClick={markWrong}
              className="rounded-md border border-[var(--line)] bg-white px-4 py-4 text-sm font-medium text-[var(--fg)] transition hover:bg-[#f7ebe8]"
            >
              모르겠어요
            </button>
            <button
              type="button"
              onClick={markCorrect}
              className="rounded-md bg-[var(--accent)] px-4 py-4 text-sm font-medium text-white transition hover:opacity-90"
            >
              맞췄어요
            </button>
          </div>
        ) : (
          <div className="h-24" />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
        시험
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        시험을 볼 Day를 여러 개 고른 뒤 시작하세요.
      </p>

      <ul className="mt-8 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {books.map((book) => {
          const active = selected.includes(book.day);
          return (
            <li key={book.day}>
              <button
                type="button"
                onClick={() => toggleDay(book.day)}
                className={
                  active
                    ? "flex h-11 w-full items-center justify-center rounded-md bg-[var(--accent)] text-sm font-medium text-white"
                    : "flex h-11 w-full items-center justify-center rounded-md border border-[var(--line)] bg-white/50 text-sm text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }
                aria-pressed={active}
              >
                {book.day}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={startQuiz}
          disabled={selected.length === 0}
          className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          시험 시작
        </button>
        <p className="text-sm text-[var(--muted)]">{selectedLabel}</p>
      </div>

      <p className="mt-10 text-sm leading-relaxed text-[var(--muted)]">
        영단어만 보이다가 화면을 누르면 뜻·예문이 나오고,
        <br />
        모르겠어요 / 맞췄어요로 다음으로 넘어갑니다.
      </p>
    </div>
  );
}
