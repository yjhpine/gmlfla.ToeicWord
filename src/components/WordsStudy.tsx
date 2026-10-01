"use client";

import { useEffect, useMemo, useState } from "react";
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

export function WordsStudy({ books }: Props) {
  const [phase, setPhase] = useState<Phase>("select");
  const [day, setDay] = useState(books[0]?.day ?? 1);
  const [index, setIndex] = useState(0);
  const [blocks, setBlocks] = useState<RegisteredBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const current = useMemo(
    () => books.find((book) => book.day === day) ?? books[0],
    [books, day],
  );

  const entry = current?.words[index];
  const total = current?.words.length ?? 0;
  const progressRatio = total ? (index + 1) / total : 0;

  useEffect(() => {
    setIndex(0);
  }, [day]);

  useEffect(() => {
    function sync() {
      const next = loadRegisteredBlocks();
      setBlocks(next);
      setActiveBlockId((prev) => {
        if (prev && next.some((b) => b.id === prev)) return prev;
        return next[0]?.id ?? null;
      });
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

  if (!current) {
    return (
      <p className="text-[var(--muted)]">
        추출된 단어 데이터가 없습니다. `data/words/` 를 확인해 주세요.
      </p>
    );
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

  if (phase === "study" && entry) {
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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
        단어
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Day와 등록 블럭을 고르면 단어를 넘기며 학습합니다. 등록 블럭은{" "}
        {WORDS_PER_BLOCK}개까지입니다.
      </p>

      <ul className="mt-8 grid grid-cols-5 gap-2 sm:grid-cols-10">
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
        {blocks.map((block) => (
          <li key={block.id} className="col-span-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => openRegister(block.id)}
              title={`${block.name} · ${block.words.length}/${WORDS_PER_BLOCK}`}
              className="flex h-11 w-full items-center justify-center truncate rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] px-2 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
            >
              <span className="truncate">{block.name}</span>
              <span className="ml-1 shrink-0 text-xs opacity-80">
                ({block.words.length})
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm leading-relaxed text-[var(--muted)]">
        Day를 누르면 영단어·뜻·예문이 한 번에 나오고,
        <br />
        이전 / 다음으로 단어를 넘깁니다.
        <br />
        등록 블럭은 이름 변경이 가능하고, {WORDS_PER_BLOCK}개가 차면 「등록
        2」처럼 새 블럭이 생깁니다.
      </p>
    </div>
  );
}
