"use client";

import { useMemo, useState, useTransition } from "react";
import type { DayWordbook } from "@/lib/words/types";

type Props = {
  books: DayWordbook[];
};

export function WordsStudy({ books }: Props) {
  const [day, setDay] = useState(books[0]?.day ?? 1);
  const [, startTransition] = useTransition();

  const current = useMemo(
    () => books.find((book) => book.day === day) ?? books[0],
    [books, day],
  );

  if (!current) {
    return (
      <p className="text-[var(--muted)]">
        추출된 단어 데이터가 없습니다. `data/words/` 를 확인해 주세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
              단어
            </h1>
            <p className="mt-2 text-[var(--muted)]">
              Day를 고르면 영단어·뜻·예문을 한 화면에서 봅니다.
            </p>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {current.words.length}단어 · Day {current.day}
          </p>
        </div>

        <ul className="mt-6 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {books.map((book) => {
            const active = book.day === current.day;
            return (
              <li key={book.day}>
                <button
                  type="button"
                  onClick={() => startTransition(() => setDay(book.day))}
                  className={
                    active
                      ? "flex h-11 w-full items-center justify-center rounded-md bg-[var(--accent)] text-sm font-medium text-white transition"
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
      </div>

      <section key={current.day} className="animate-[fade-up_280ms_ease-out]">
        <h2 className="text-lg font-medium text-[var(--fg)]">{current.title}</h2>
        <ol className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {current.words.map((entry, index) => (
            <li key={`${current.day}-${entry.word}-${index}`} className="py-4">
              <div className="flex items-baseline gap-3">
                <span className="w-6 shrink-0 text-xs text-[var(--muted)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-semibold tracking-tight text-[var(--accent)]">
                    {entry.word}
                  </p>
                  <p className="mt-1 text-[var(--fg)]">{entry.meaning}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                    {entry.example}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
