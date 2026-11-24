"use client";

import { useEffect, useState } from "react";
import { ExampleWithUnderline } from "@/components/ExampleWithUnderline";
import { QuizRangePicker, quizAreaNames } from "@/components/QuizRangePicker";
import { SpeakButton } from "@/components/SpeakButton";
import {
  IMPORTANT_EVENT,
  importantKey,
  isImportantWord,
  loadImportantWords,
  toggleImportantWord,
} from "@/lib/important";
import { markDaysQuizzed } from "@/lib/progress";
import {
  REGISTERED_CATEGORIES,
  REGISTERED_EVENT,
  isRegisteredDay,
  loadRegisteredBlocks,
  registeredLabelForDay,
  type RegisteredBlock,
  type RegisteredCategory,
} from "@/lib/registered";
import type { DayWordbook, QuizWord } from "@/lib/words/types";

type Phase = "select" | "prompt" | "reveal" | "result";
type QuizSource = "days" | "important";

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

function AnswerSticker({
  answer,
  label,
  revealed,
  onReveal,
}: {
  answer: string;
  label: string;
  revealed: boolean;
  onReveal: () => void;
}) {
  const [peeling, setPeeling] = useState(false);

  if (revealed) {
    return (
      <span className="min-w-0 text-sm text-[var(--fg)] animate-[fade-up_180ms_ease-out]">
        {answer}
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
        peeling
          ? "pointer-events-none animate-[sticker-peel_180ms_ease-in_forwards]"
          : "rotate-[-1.5deg]"
      }`}
      aria-label={label}
    >
      탭해서 보기
    </button>
  );
}

function ImportantToggle({ entry }: { entry: QuizWord }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    function sync() {
      setActive(isImportantWord(entry));
    }
    sync();
    window.addEventListener(IMPORTANT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(IMPORTANT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [entry]);

  return (
    <button
      type="button"
      onClick={() => setActive(toggleImportantWord(entry))}
      className={
        active
          ? "flex h-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] px-2 text-xs font-semibold text-white"
          : "flex h-8 shrink-0 items-center justify-center rounded-md border border-[var(--line)] bg-white px-2 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      }
      aria-pressed={active}
      aria-label={active ? "중요 목록에서 제거" : "중요 목록에 추가"}
      title={active ? "중요 해제" : "중요"}
    >
      중요
    </button>
  );
}

function WordResultList({
  title,
  words,
  emptyText,
  koreanFirst,
}: {
  title: string;
  words: QuizWord[];
  emptyText: string;
  koreanFirst: boolean;
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
            const key = importantKey(entry);
            return (
              <li key={key} className="py-2.5">
                <div className={entry.isSentence ? "flex flex-wrap items-center gap-3" : "flex items-center gap-3"}>
                  <ImportantToggle entry={entry} />
                  <p className="w-14 shrink-0 truncate text-xs text-[var(--muted)]">
                    {isRegisteredDay(entry.day)
                      ? registeredLabelForDay(entry.day, entry)
                      : `D${entry.day}`}
                  </p>
                  <p className={entry.isSentence
                    ? "w-full whitespace-pre-line wrap-anywhere text-base font-semibold text-[var(--accent)]"
                    : "w-[38%] min-w-0 shrink-0 truncate text-base font-semibold text-[var(--accent)] sm:w-44 sm:text-lg"}>
                    {koreanFirst ? entry.meaning : entry.word}
                  </p>
                  <div className={entry.isSentence ? "w-full whitespace-pre-line wrap-anywhere" : "min-w-0 flex-1 [&>span]:truncate"}>
                    <AnswerSticker
                      answer={koreanFirst ? entry.word : entry.meaning}
                      label={koreanFirst ? "스티커를 눌러 영어 문장 보기" : "스티커를 눌러 뜻 보기"}
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
  koreanFirst,
  totalCount,
  knownWords,
  retriedWords,
  canUndo,
  onUndo,
  onRestart,
  onHome,
  returnLabel,
}: {
  selectedLabel: string;
  koreanFirst: boolean;
  totalCount: number;
  knownWords: QuizWord[];
  retriedWords: QuizWord[];
  canUndo: boolean;
  onUndo: () => void;
  onRestart: () => void;
  onHome: () => void;
  returnLabel: string;
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
        왼쪽 「중요」를 누르면 중요 목록에 저장되고, 나중에 그 목록만으로 시험볼
        수 있어요. 노란 스티커를 누르면 {koreanFirst ? "영어 문장이" : "뜻이"} 나타납니다.
      </p>

      <WordResultList
        title={koreanFirst ? "모르겠어요 했던 문장" : "모르겠어요 했던 단어"}
        koreanFirst={koreanFirst}
        words={retriedWords}
        emptyText="한 번도 모르겠어요를 누르지 않았어요."
      />
      <WordResultList
        title={koreanFirst ? "바로 맞춘 문장" : "바로 맞춘 단어"}
        koreanFirst={koreanFirst}
        words={knownWords}
        emptyText={koreanFirst ? "바로 맞춘 문장이 없어요." : "바로 맞춘 단어가 없어요."}
      />

      <div className="mt-10 flex flex-wrap gap-3">
        {canUndo ? (
          <button
            type="button"
            onClick={onUndo}
            className="rounded-md border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-white"
          >
            마지막 {koreanFirst ? "문장으로" : "단어로"} 돌아가기
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
          {returnLabel}
        </button>
      </div>
    </div>
  );
}

export function QuizApp({ books }: Props) {
  const [area, setArea] = useState<RegisteredCategory | null>(null);
  const [koreanFirst, setKoreanFirst] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("select");
  const [session, setSession] = useState<{ words: QuizWord[]; label: string; source: QuizSource }>({
    words: [], label: "", source: "days",
  });
  const [remaining, setRemaining] = useState<QuizWord[]>([]);
  const totalCount = session.words.length;
  const [missedKeys, setMissedKeys] = useState<Set<string>>(new Set());
  const [retriedWords, setRetriedWords] = useState<QuizWord[]>([]);
  const [knownWords, setKnownWords] = useState<QuizWord[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [importantCount, setImportantCount] = useState(0);
  const [regBlocks, setRegBlocks] = useState<RegisteredBlock[]>([]);

  const current = remaining[0];
  const cleared = Math.max(totalCount - remaining.length, 0);
  const progressRatio = totalCount ? cleared / totalCount : 0;
  const canUndo = history.length > 0;

  useEffect(() => {
    function syncCounts() {
      setImportantCount(loadImportantWords().length);
      setRegBlocks(loadRegisteredBlocks());
    }
    syncCounts();
    window.addEventListener(IMPORTANT_EVENT, syncCounts);
    window.addEventListener(REGISTERED_EVENT, syncCounts);
    window.addEventListener("storage", syncCounts);
    window.addEventListener("focus", syncCounts);
    return () => {
      window.removeEventListener(IMPORTANT_EVENT, syncCounts);
      window.removeEventListener(REGISTERED_EVENT, syncCounts);
      window.removeEventListener("storage", syncCounts);
      window.removeEventListener("focus", syncCounts);
    };
  }, []);

  function chooseArea(nextArea: RegisteredCategory | null) {
    setArea(nextArea);
    setKoreanFirst(false);
    setSelected([]);
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
    setPhase("reveal");
  }

  function beginQuiz(words: QuizWord[], label: string, source: QuizSource) {
    if (words.length === 0) return;
    const shuffled = shuffle(words);
    setSession({ words, label, source });
    setRemaining(shuffled);
    setMissedKeys(new Set());
    setRetriedWords([]);
    setKnownWords([]);
    setHistory([]);
    setPhase("prompt");
  }

  function startImportantQuiz() {
    const words = loadImportantWords();
    const unique = new Map<string, QuizWord>();
    for (const word of words) {
      unique.set(importantKey(word), word);
    }
    if (unique.size === 0) {
      resetToSelect();
      return;
    }
    beginQuiz([...unique.values()], `중요 목록 · ${unique.size}문항`, "important");
  }

  function restartQuiz() {
    if (session.source === "important") {
      startImportantQuiz();
      return;
    }
    beginQuiz(session.words, session.label, session.source);
  }

  function reveal() {
    if (phase === "prompt") setPhase("reveal");
  }

  function markWrong() {
    if (!current) return;
    pushHistory();
    const key = importantKey(current);
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
    const key = importantKey(current);
    if (missedKeys.has(key)) {
      setRetriedWords((prev) => [...prev, current]);
    } else {
      setKnownWords((prev) => [...prev, current]);
    }

    if (remaining.length <= 1) {
      setRemaining([]);
      if (session.source === "days") {
        const completedDays = new Set(session.words.map((w) => w.day).filter((day) => day > 0));
        markDaysQuizzed([...completedDays]);
      }
      setPhase("result");
      return;
    }
    setRemaining(remaining.slice(1));
    setPhase("prompt");
  }

  function resetToSelect() {
    setPhase("select");
    setSession({ words: [], label: "", source: "days" });
    setRemaining([]);
    setMissedKeys(new Set());
    setRetriedWords([]);
    setKnownWords([]);
    setHistory([]);
    setImportantCount(loadImportantWords().length);
    setRegBlocks(loadRegisteredBlocks());
  }

  if (phase === "result") {
    return (
      <ResultScreen
        selectedLabel={session.label}
        koreanFirst={koreanFirst}
        totalCount={totalCount}
        knownWords={knownWords}
        retriedWords={retriedWords}
        canUndo={canUndo}
        onUndo={undoLast}
        onRestart={restartQuiz}
        onHome={resetToSelect}
        returnLabel={area ? "날짜 다시 선택" : "영역 선택"}
      />
    );
  }

  if (phase === "prompt" || phase === "reveal") {
    const prompt = koreanFirst ? current?.meaning : current?.word;
    const revealHint = koreanFirst ? "화면을 터치하면 영어 문장이 나옵니다"
      : current?.isSentence ? "화면을 터치하면 문장의 뜻이 나옵니다" : "화면을 터치하면 정답과 예문이 나옵니다";
    return (
      <div className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pt-4 text-sm text-[var(--muted)]">
          <button
            type="button"
            onClick={undoLast}
            disabled={!canUndo}
            className="rounded-md px-2 py-1 transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--muted)]"
          >
            ← 이전 {koreanFirst ? "문장" : "단어"}
          </button>
          <span className="text-right">
            {session.label}
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

        <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
          {phase === "prompt" && (
            <button type="button" onClick={reveal} className="absolute inset-0 z-10 rounded-md"
              aria-label={`${prompt} ${koreanFirst ? "영어 문장 보기" : "정답 보기"}`} />
          )}
          <p className={current?.isSentence
            ? "max-w-full whitespace-pre-line wrap-anywhere text-2xl leading-relaxed text-[var(--fg)] sm:text-3xl"
            : "font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--fg)] sm:text-5xl"}>
            {prompt}
          </p>
          {!koreanFirst && current?.word && (
            <div className="pointer-events-none relative z-20 [&>button]:pointer-events-auto">
              <SpeakButton text={current.word} label={current.isSentence ? "문장 듣기" : undefined} />
            </div>
          )}
          {phase === "prompt" ? (
            <p className="mt-8 animate-pulse text-sm text-[var(--muted)]">
              {revealHint}
            </p>
          ) : (
            <div className="mt-10 w-full max-w-lg animate-[fade-up_240ms_ease-out]">
              <p className="whitespace-pre-line wrap-anywhere text-xl font-medium text-[var(--accent)]">
                {koreanFirst ? current?.word : current?.meaning}
              </p>
              {koreanFirst && current?.word && (
                <SpeakButton text={current.word} label="문장 듣기" />
              )}
              {current?.example && (
                <p className="mt-3 text-base leading-relaxed text-[var(--fg)]">
                  <ExampleWithUnderline
                    example={current.example}
                    word={current.word}
                  />
                </p>
              )}
              {current?.exampleMeaning ? (
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {current.exampleMeaning}
                </p>
              ) : null}
            </div>
          )}
        </div>

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

  if (area) {
    return (
      <QuizRangePicker
        area={area}
        books={books}
        blocks={regBlocks}
        selected={selected}
        koreanFirst={koreanFirst}
        onKoreanFirstChange={setKoreanFirst}
        onSelect={setSelected}
        onBack={() => chooseArea(null)}
        onStart={(words, label) => beginQuiz(words, label, "days")}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">시험</h1>
      <p className="mt-2 text-[var(--muted)]">시험을 볼 영역을 선택하세요.</p>
      <ul aria-label="시험 영역" className="mt-8 space-y-3">
        {REGISTERED_CATEGORIES.map((category) => (
          <li key={category}>
            <button
              type="button"
              onClick={() => chooseArea(category)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white/60 px-5 py-4 text-left transition hover:border-[var(--accent)] hover:bg-white"
            >
              <span>
                <span className="block text-lg font-semibold text-[var(--accent)]">{quizAreaNames[category]}</span>
                <span className="mt-1 block text-sm text-[var(--muted)]">
                  {category === "general" ? "Day 단어 · 등록 단어" : category === "LC" ? "듣기 단어·문장" : "읽기 단어"}
                </span>
              </span>
              <span aria-hidden="true" className="text-xl text-[var(--accent)]">›</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={startImportantQuiz}
        disabled={importantCount === 0}
        className="mt-6 rounded-md border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--fg)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        중요 단어 시험{importantCount > 0 ? ` (${importantCount})` : ""}
      </button>
    </div>
  );
}
