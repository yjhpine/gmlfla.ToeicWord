import Link from "next/link";
import { useMemo } from "react";
import { registeredQuizDates, type RegisteredBlock, type RegisteredCategory } from "@/lib/registered";
import type { DayWordbook, QuizWord } from "@/lib/words/types";

export const quizAreaNames: Record<RegisteredCategory, string> = {
  general: "해커스", LC: "LC", RC: "RC",
};

const choiceStyle = "rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--fg)] hover:border-[var(--accent)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent)] aria-pressed:text-white";

function dateLabel(date: string) {
  if (!date) return "등록일 미상";
  const [year, month, day] = date.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

type Props = {
  area: RegisteredCategory;
  books: DayWordbook[];
  blocks: RegisteredBlock[];
  selected: string[];
  onSelect: (ids: string[]) => void;
  onBack: () => void;
  onStart: (words: QuizWord[], label: string) => void;
};

export function QuizRangePicker({ area, books, blocks, selected, onSelect, onBack, onStart }: Props) {
  const days = area === "general" ? books : [];
  const dates = useMemo(() => registeredQuizDates(blocks, area), [blocks, area]);
  const selectedDays = days.filter((book) => selected.includes(`day-${book.day}`));
  const selectedDates = dates.map(([date, ranges]) => ({
    date,
    ranges: ranges.filter((range) => selected.includes(range.id)),
  })).filter(({ ranges }) => ranges.length > 0);
  const selectedBlocks = selectedDates.flatMap(({ ranges }) => ranges);
  const count = selectedDays.reduce((n, book) => n + book.words.length, 0)
    + selectedBlocks.reduce((n, range) => n + range.words.length, 0);

  function toggle(ids: string[]) {
    const next = new Set(selected);
    const remove = ids.every((id) => next.has(id));
    for (const id of ids) {
      if (remove) next.delete(id);
      else next.add(id);
    }
    onSelect([...next]);
  }

  function start() {
    const words = [
      ...selectedDays.flatMap((book) => book.words.map((w) => ({ ...w, day: book.day }))),
      ...selectedBlocks.flatMap((range) => range.words),
    ];
    const labels = [
      ...selectedDays.map((book) => `Day ${book.day}`),
      ...selectedDates.map(({ date, ranges }) => `${dateLabel(date)} (${ranges.map((r) => r.name).join(", ")})`),
    ];
    onStart(words, `${quizAreaNames[area]} · ${labels.join(", ")}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <button type="button" onClick={onBack} className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
        ← 영역 선택
      </button>
      <h1 className="mt-4 text-3xl text-[var(--accent)]">{quizAreaNames[area]} 시험</h1>
      {days.length > 0 || dates.length > 0 ? (
        <p className="mt-2 text-[var(--muted)]">시험을 볼 날짜를 선택하세요. 여러 개를 함께 고를 수 있습니다.</p>
      ) : (
        <p className="mt-4 text-[var(--muted)]">
          아직 등록한 내용이 없습니다.{" "}
          <Link href="/words" className="text-[var(--accent)] underline">단어 학습에서 등록하기</Link>
        </p>
      )}

      {days.length > 0 && (
        <section aria-labelledby="quiz-days" className="mt-6 rounded-xl border border-[var(--line)] bg-white/60 p-4">
          <h2 id="quiz-days" className="font-semibold text-[var(--fg)]">Day 단어</h2>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {days.map((book) => {
              const id = `day-${book.day}`;
              return (
                <button key={id} type="button" disabled={!book.words.length} aria-pressed={selected.includes(id)}
                  className={`${choiceStyle} min-h-11 px-1 disabled:opacity-50`} onClick={() => toggle([id])}>
                  Day {book.day}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {dates.length > 0 && (
        <section aria-labelledby="quiz-dates" className="mt-6">
          <h2 id="quiz-dates" className="font-semibold text-[var(--fg)]">등록 날짜</h2>
          <ul className="mt-3 space-y-3">
            {dates.map(([date, ranges]) => {
              const ids = ranges.map((r) => r.id);
              const all = ids.every((id) => selected.includes(id));
              const some = ids.some((id) => selected.includes(id));
              const items = ranges.reduce((n, r) => n + r.words.length, 0);
              return (
                <li key={date} className="rounded-xl border border-[var(--line)] bg-white/60 p-3">
                  <button type="button" onClick={() => toggle(ids)} aria-pressed={all || (some ? "mixed" : false)}
                    className={`${choiceStyle} flex min-h-12 w-full flex-wrap items-center justify-between gap-2 text-left aria-[pressed=mixed]:border-[var(--accent)]`}>
                    <span className="font-medium">{dateLabel(date)}</span>
                    <span className="text-xs">{ranges.length === 1 ? ranges[0].name : `블록 ${ranges.length}개`} · {items}문항</span>
                  </button>
                  {ranges.length > 1 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ranges.map((range) => (
                        <button key={range.id} type="button" aria-pressed={selected.includes(range.id)}
                          onClick={() => toggle([range.id])} className={choiceStyle}>
                          {range.name} · {range.words.length}문항
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(days.length > 0 || dates.length > 0) && (
        <div className="mt-6 flex items-center gap-4">
          <button type="button" disabled={count === 0} onClick={start}
            className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
            시험 시작
          </button>
          <span role="status" className="text-sm text-[var(--muted)]">{count}문항 선택</span>
        </div>
      )}
    </div>
  );
}
