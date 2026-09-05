"use client";

import { useMemo, useState } from "react";
import { ExampleWithUnderline } from "@/components/ExampleWithUnderline";
import { SpeakButton } from "@/components/SpeakButton";
import type { DayWordbook, QuizWord } from "@/lib/words/types";

type Phase = "select" | "prompt" | "reveal" | "result";

type Props = {
  books: DayWordbook[];
};

type Snapshot = {
  remaining: QuizWord[];
  missedKeys: string[];
  retriedWords: QuizWord[];
  knownWords: QuizWord[];
};

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function wordKey(entry: QuizWord) {
  return `${entry.day}::${entry.word}`;
}

function MeaningSticker({
  meaning,
  revealed,
  onReveal,
}: {
  meaning: string;
  revealed: boolean;
  onReveal: () => void;
}) {
  const [peeling, setPeeling] = useState(false);

  if (revealed) {
    return (
      <span className="min-w-0 truncate text-sm text-[var(--fg)] animate-[fade-up_180ms_ease-out]">
        {meaning}
      </span>
    );
  }

  function handleClick() {
    if (peeling) return;
    setPeeling(true);
    window.setTimeout(() => {
      onReveal();
    }, 180);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`sticker-cover relative inline-flex h-8 min-w-[5.5rem] max-w-[12rem] shrink-0 items-center justify-center rounded-md px-3 text-xs font-medium text-[#7a5310] transition hover:brightness-105 ${
        peeling ? "pointer-events-none animate-[sticker-peel_180ms_ease-in_forwards]" : "rotate-[-1.5deg]"
      }`}
      aria-label="스티커를 눌러 뜻 보기"
    >
      탭해서 보기
    </button>
  );
}

function WordResultList({
  title,
  words,
  emptyText,
}: {
  title: string;
  words: QuizWord[];
  emptyText: string;
}) {
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  function reveal(key: string) {
    setRevealed((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }

  return (
    <section className="mt-8">
      <h2 className="text-base font-medium text-[var(--fg)]">
        {title}{" "}
        <span className="text-[var(--muted)]">({words.length})</span>
      </h2>
      {words.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">{emptyText}</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {words.map((entry) => {
            const key = wordKey(entry);
            return (
              <li key={key} className="py-2.5">
                <div className="flex items-center gap-3">
                  <p className="w-10 shrink-0 text-xs text-[var(--muted)]">
                    D{entry.day}
                  </p>
                  <p className="w-[38%] min-w-0 shrink-0 truncate text-base font-semibold text-[var(--accent)] sm:w-44 sm:text-lg">
                    {entry.word}
                  </p>
                  <div className="min-w-0 flex-1">
                    <MeaningSticker
                      meaning={entry.meaning}
                      revealed={revealed.has(key)}
                      onReveal={() => reveal(key)}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ResultScreen({
  selectedLabel,
  totalCount,
  knownWords,
  retriedWords,
  canUndo,
  onUndo,
  onRestart,
  onHome,
}: {
  selectedLabel: string;
  totalCount: number;
  knownWords: QuizWord[];
  retriedWords: QuizWord[];
  canUndo: boolean;
  onUndo: () => void;
  onRestart: () => void;
  onHome: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
        시험 완료
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        {selectedLabel} · 전체 {totalCount}개 · 바로 맞춤 {knownWords.length} ·
        다시 맞춤 {retriedWords.length}
      </p>
      <p className="mt-3 text-sm text-[var(--muted)]">
        예문 없이 단어만 복습해요. 노란 스티커를 누르면 뜻이 나타납니다.
      </p>

      <WordResultList
        title="모르겠어요 했던 단어"
        words={retriedWords}
        emptyText="한 번도 모르겠어요를 누르지 않았어요."
      />
      <WordResultList
        title="바로 맞춘 단어"
        words={knownWords}
        emptyText="바로 맞춘 단어가 없어요."
      />

      <div className="mt-10 flex flex-wrap gap-3">
        {canUndo ? (
          <button
            type="button"
            onClick={onUndo}
            className="rounded-md border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-white"
          >
            마지막 단어로 돌아가기
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRestart}
          className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          같은 범위 다시
        </button>
        <button
          type="button"
          onClick={onHome}
          className="rounded-md border border-[var(--line)] bg-white/70 px-5 py-2.5 text-sm font-medium transition hover:bg-white"
        >
          Day 다시 선택
        </button>
      </div>
    </div>
  );
}

export function QuizApp({ books }: Props) {
  const [selected, setSelected] = useState<number[]>([1]);
  const [phase, setPhase] = useState<Phase>("select");
  const [remaining, setRemaining] = useState<QuizWord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [missedKeys, setMissedKeys] = useState<Set<string>>(new Set());
  const [retriedWords, setRetriedWords] = useState<QuizWord[]>([]);
  const [knownWords, setKnownWords] = useState<QuizWord[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);

  const current = remaining[0];
  const cleared = Math.max(totalCount - remaining.length, 0);
  const progressRatio = totalCount ? cleared / totalCount : 0;
  const canUndo = history.length > 0;

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

  function pushHistory() {
    setHistory((prev) => [
      ...prev,
      {
        remaining: [...remaining],
        missedKeys: [...missedKeys],
        retriedWords: [...retriedWords],
        knownWords: [...knownWords],
      },
    ]);
  }

  function undoLast() {
    if (history.length === 0) return;
    const snapshot = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRemaining(snapshot.remaining);
    setMissedKeys(new Set(snapshot.missedKeys));
    setRetriedWords(snapshot.retriedWords);
    setKnownWords(snapshot.knownWords);
    // 다시 선택하도록 정답 공개 상태로 복원
    setPhase("reveal");
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
    const shuffled = shuffle(words);
    setRemaining(shuffled);
    setTotalCount(shuffled.length);
    setMissedKeys(new Set());
    setRetriedWords([]);
    setKnownWords([]);
    setHistory([]);
    setPhase("prompt");
  }

  function reveal() {
    if (phase === "prompt") setPhase("reveal");
  }

  function markWrong() {
    if (!current) return;
    pushHistory();
    const key = wordKey(current);
    setMissedKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    const [head, ...rest] = remaining;
    setRemaining([...rest, head]);
    setPhase("prompt");
  }

  function markCorrect() {
    if (!current) return;
    pushHistory();
    const key = wordKey(current);
    if (missedKeys.has(key)) {
      setRetriedWords((prev) => [...prev, current]);
    } else {
      setKnownWords((prev) => [...prev, current]);
    }

    if (remaining.length <= 1) {
      setRemaining([]);
      setPhase("result");
      return;
    }
    setRemaining(remaining.slice(1));
    setPhase("prompt");
  }

  function resetToSelect() {
    setPhase("select");
    setRemaining([]);
    setTotalCount(0);
    setMissedKeys(new Set());
    setRetriedWords([]);
    setKnownWords([]);
    setHistory([]);
  }

  if (phase === "result") {
    return (
      <ResultScreen
        selectedLabel={selectedLabel}
        totalCount={totalCount}
        knownWords={knownWords}
        retriedWords={retriedWords}
        canUndo={canUndo}
        onUndo={undoLast}
        onRestart={startQuiz}
        onHome={resetToSelect}
      />
    );
  }

  if (phase === "prompt" || phase === "reveal") {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pt-4 text-sm text-[var(--muted)]">
          <button
            type="button"
            onClick={undoLast}
            disabled={!canUndo}
            className="rounded-md px-2 py-1 transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--muted)]"
          >
            ← 이전 단어
          </button>
          <span className="text-right">
            {selectedLabel}
            <br />
            완료 {cleared} / {totalCount}
            {remaining.length > 0 ? ` · 남음 ${remaining.length}` : ""}
          </span>
        </div>
        <div className="mx-auto mt-2 h-1 w-full max-w-3xl overflow-hidden px-4">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
            style={{ width: `${progressRatio * 100}%` }}
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
          {current?.word ? (
            <div className="mt-4">
              <SpeakButton text={current.word} />
            </div>
          ) : null}
          {phase === "prompt" ? (
            <p className="mt-8 animate-pulse text-sm text-[var(--muted)]">
              화면을 터치하면 정답과 예문이 나옵니다
            </p>
          ) : (
            <div className="mt-10 w-full max-w-lg animate-[fade-up_240ms_ease-out]">
              <p className="text-xl font-medium text-[var(--accent)]">
                {current?.meaning}
              </p>
              <p className="mt-3 text-base leading-relaxed text-[var(--fg)]">
                {current ? (
                  <ExampleWithUnderline
                    example={current.example}
                    word={current.word}
                  />
                ) : null}
              </p>
              {current?.exampleMeaning ? (
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {current.exampleMeaning}
                </p>
              ) : null}
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
        영단어만 보이다가 화면을 누르면 뜻·예문이 나옵니다.
        <br />
        모르겠어요 → 맨 뒤로 보내 다시 출제 / 맞췄어요 → 다음
        <br />
        잘못 눌렀다면 ← 이전 단어 로 바로 전 문제로 돌아갈 수 있습니다.
      </p>
    </div>
  );
}
