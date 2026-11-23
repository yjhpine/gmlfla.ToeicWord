"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ExampleWithUnderline } from "@/components/ExampleWithUnderline";
import { SpeakButton } from "@/components/SpeakButton";
import { WordRegister } from "@/components/WordRegister";
import {
  REGISTERED_EVENT,
  WORDS_PER_BLOCK,
  loadRegisteredBlocks,
  type RegisteredBlock,
} from "@/lib/registered";
import { markDayStudied } from "@/lib/progress";
import type { DayWordbook } from "@/lib/words/types";

type Phase = "select" | "study" | "register";

type Props = {
  books: DayWordbook[];
};

function StudyGroup({
  id,
  title,
  description,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="overflow-hidden rounded-xl border border-[var(--line)] bg-white/60"
    >
      <h2 id={`${id}-heading`}>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
        >
          <span>
            <span className="block text-lg font-semibold text-[var(--accent)]">
              {title}
            </span>
            <span className="mt-1 block text-xs text-[var(--muted)]">
              {description}
            </span>
          </span>
          <span className="shrink-0 text-xs text-[var(--muted)]">
            {expanded ? "접기" : "펼치기"}{" "}
            <span aria-hidden>{expanded ? "▴" : "▾"}</span>
          </span>
        </button>
      </h2>
      <div
        id={`${id}-content`}
        hidden={!expanded}
        className="border-t border-[var(--line)] p-4"
      >
        {children}
      </div>
    </section>
  );
}

export function WordsStudy({ books }: Props) {
  const [phase, setPhase] = useState<Phase>("select");
  const [day, setDay] = useState(books[0]?.day ?? 1);
  const [index, setIndex] = useState(0);
  const [blocks, setBlocks] = useState<RegisteredBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState({ hackers: true, LC: true, RC: true });
  const [daysOpen, setDaysOpen] = useState(false);

  const current = useMemo(
    () => books.find((book) => book.day === day) ?? books[0],
    [books, day],
  );

  const entry = current?.words[index];
  const total = current?.words.length ?? 0;
  const progressRatio = total ? (index + 1) / total : 0;

  useEffect(() => {
    function sync() {
      setBlocks(loadRegisteredBlocks());
    }
    sync();
    window.addEventListener(REGISTERED_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(REGISTERED_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  function startStudy(nextDay: number) {
    setDay(nextDay);
    setIndex(0);
    setPhase("study");
  }

  function openRegister(blockId: string) {
    setActiveBlockId(blockId);
    setPhase("register");
  }

  function goPrev() {
    if (index <= 0) return;
    setIndex((i) => i - 1);
  }

  function goNext() {
    if (!current) return;
    if (index >= current.words.length - 1) {
      markDayStudied(current.day);
      setPhase("select");
      return;
    }
    setIndex((i) => i + 1);
  }

  if (phase === "register" && activeBlockId) {
    return (
      <WordRegister
        blockId={activeBlockId}
        onBlockChange={setActiveBlockId}
        onBack={() => {
          setBlocks(loadRegisteredBlocks());
          setPhase("select");
        }}
      />
    );
  }

  if (phase === "study" && current && entry) {
    return (
      <div className="flex min-h-[70vh] flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-2 text-sm text-[var(--muted)]">
          <button
            type="button"
            onClick={() => setPhase("select")}
            className="rounded-md px-2 py-1 transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          >
            ← Day 선택
          </button>
          <span>
            Day {current.day} · {index + 1} / {total}
          </span>
        </div>
        <div className="mx-auto mt-2 h-1 w-full max-w-3xl overflow-hidden px-4">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>

        <div
          key={`${current.day}-${index}`}
          className="flex flex-1 flex-col items-center justify-center px-6 text-center animate-[fade-up_240ms_ease-out]"
        >
          <p className="text-xs text-[var(--muted)]">{current.title}</p>
          <p className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--fg)] sm:text-5xl">
            {entry.word}
          </p>
          <SpeakButton text={entry.word} />
          <div className="mt-8 w-full max-w-lg">
            <p className="text-xl font-medium text-[var(--accent)]">
              {entry.meaning}
            </p>
            <p className="mt-3 text-base leading-relaxed text-[var(--fg)]">
              <ExampleWithUnderline example={entry.example} word={entry.word} />
            </p>
            {entry.exampleMeaning ? (
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {entry.exampleMeaning}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 px-4 pb-8">
          <button
            type="button"
            onClick={goPrev}
            disabled={index === 0}
            className="rounded-md border border-[var(--line)] bg-white px-4 py-4 text-sm font-medium text-[var(--fg)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-md bg-[var(--accent)] px-4 py-4 text-sm font-medium text-white transition hover:opacity-90"
          >
            {index >= total - 1 ? "Day 선택으로" : "다음"}
          </button>
        </div>
      </div>
    );
  }

  function renderBlocks(items: RegisteredBlock[]) {
    return (
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.filter((block, i) => i === 0 || block.words.length > 0).map((block) => (
          <li key={block.id}>
            <button
              type="button"
              onClick={() => openRegister(block.id)}
              title={`${block.name} · ${block.words.length}/${WORDS_PER_BLOCK}`}
              className="flex min-h-14 w-full items-center justify-center rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
            >
              <span className="truncate">{block.name}</span>
              <span className="ml-1 shrink-0 text-xs opacity-80">({block.words.length})</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
        단어
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        학습할 단어장을 선택하세요.
      </p>

      <div className="mt-8 space-y-5">
        <StudyGroup
          id="study-hackers"
          title="해커스"
          description={`Day 단어 ${books.length}일차 · 등록 단어`}
          expanded={expanded.hackers}
          onToggle={() => setExpanded((prev) => ({ ...prev, hackers: !prev.hackers }))}
        >
          <h3>
            <button
              type="button"
              aria-expanded={daysOpen}
              aria-controls="hackers-days"
              onClick={() => setDaysOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-md px-1 py-2 text-sm font-medium text-[var(--fg)] hover:text-[var(--accent)]"
            >
              Day 단어
              <span className="text-xs text-[var(--muted)]">
                {daysOpen ? "접기" : "펼치기"} <span aria-hidden>{daysOpen ? "▴" : "▾"}</span>
              </span>
            </button>
          </h3>
          <div id="hackers-days" hidden={!daysOpen}>
            <ul className="grid grid-cols-5 gap-2 pt-2 sm:grid-cols-10">
              {books.map((book) => (
                <li key={book.day}>
                  <button
                    type="button"
                    onClick={() => startStudy(book.day)}
                    className="flex h-11 w-full items-center justify-center rounded-md border border-[var(--line)] bg-white/60 text-sm text-[var(--muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                  >
                    {book.day}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <h3 className="mb-3 mt-4 border-t border-[var(--line)] px-1 pt-4 text-sm font-medium text-[var(--fg)]">
            등록 단어
          </h3>
          {renderBlocks(blocks.filter((block) => block.category === "general"))}
        </StudyGroup>

        {(["LC", "RC"] as const).map((category) => {
          const categoryBlocks = blocks.filter(
            (block) => block.category === category,
          );
          const wordCount = categoryBlocks.reduce(
            (count, block) => count + block.words.length,
            0,
          );
          return (
            <StudyGroup
              key={category}
              id={`study-${category}`}
              title={category}
              description={`${category === "LC" ? "듣기 단어·문장" : "읽기 단어"} · ${wordCount}개 등록`}
              expanded={expanded[category]}
              onToggle={() =>
                setExpanded((prev) => ({ ...prev, [category]: !prev[category] }))
              }
            >
              {renderBlocks(categoryBlocks)}
            </StudyGroup>
          );
        })}
      </div>

      <p className="mt-10 text-sm leading-relaxed text-[var(--muted)]">
        등록 블록을 누르면 학습 카드가 열립니다. 카드에서 단어나 문장을 수정할 수 있습니다.
        <br />
        같은 영역의 등록 단어는 블록당 {WORDS_PER_BLOCK}개씩 모입니다.
      </p>
    </div>
  );
}
