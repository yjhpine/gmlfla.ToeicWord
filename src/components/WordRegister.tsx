"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ExampleWithUnderline } from "@/components/ExampleWithUnderline";
import { SpeakButton } from "@/components/SpeakButton";
import {
  REGISTERED_EVENT,
  loadRegisteredWords,
  registerWord,
  type RegisteredWord,
} from "@/lib/registered";

type Props = {
  onBack: () => void;
};

type Mode = "study" | "form";

export function WordRegister({ onBack }: Props) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("study");
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [registered, setRegistered] = useState<RegisteredWord[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    function sync() {
      const words = loadRegisteredWords();
      setRegistered(words);
      setReady(true);
      setIndex((i) => {
        if (words.length === 0) return 0;
        return Math.min(i, words.length - 1);
      });
    }
    sync();
    window.addEventListener(REGISTERED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(REGISTERED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const entry = registered[index];
  const total = registered.length;
  const progressRatio = total ? (index + 1) / total : 0;

  function openForm() {
    setMode("form");
    setError(null);
    setOkMessage(null);
  }

  function closeForm() {
    setMode("study");
    setError(null);
    setOkMessage(null);
    setWord("");
    setMeaning("");
    setExample("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextWord = word.trim();
    const nextMeaning = meaning.trim();
    const nextExample = example.trim();

    if (!nextWord) {
      setError("영단어를 입력해 주세요.");
      setOkMessage(null);
      return;
    }
    if (!nextMeaning) {
      setError("뜻을 입력해 주세요.");
      setOkMessage(null);
      return;
    }

    const next = registerWord({
      word: nextWord,
      meaning: nextMeaning,
      example: nextExample,
    });
    setRegistered(next);
    setWord("");
    setMeaning("");
    setExample("");
    setError(null);
    setOkMessage(`「${nextWord}」를 등록했어요.`);
    // 방금 등록한 단어부터 학습
    setIndex(0);
    setMode("study");
  }

  function goPrev() {
    if (index <= 0) return;
    setIndex((i) => i - 1);
  }

  function goNext() {
    if (index >= total - 1) {
      onBack();
      return;
    }
    setIndex((i) => i + 1);
  }

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 text-sm text-[var(--muted)]">
        불러오는 중…
      </div>
    );
  }

  if (mode === "form") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 animate-[fade-up_280ms_ease-out]">
        <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <button
            type="button"
            onClick={() => {
              if (registered.length === 0) onBack();
              else closeForm();
            }}
            className="rounded-md px-2 py-1 transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          >
            {registered.length === 0 ? "← Day 선택" : "← 학습으로"}
          </button>
          <span>등록 단어 · {registered.length}개</span>
        </div>

        <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
          단어 등록
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          영단어·뜻·예문을 입력해 저장합니다.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-[var(--muted)]">단어</span>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="예: occupation"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-[var(--muted)]">뜻</span>
            <input
              type="text"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder="예: 직업"
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-[var(--muted)]">
              예문 (선택)
            </span>
            <textarea
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="예: She decided to pursue a different occupation."
              rows={3}
              className="mt-1 w-full resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            등록하기
          </button>
          {error ? (
            <p className="text-sm text-[#b42318]" role="alert">
              {error}
            </p>
          ) : null}
          {okMessage ? (
            <p className="text-sm text-[var(--accent)]" role="status">
              {okMessage}
            </p>
          ) : null}
        </form>
      </div>
    );
  }

  if (total === 0 || !entry) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 animate-[fade-up_280ms_ease-out]">
        <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md px-2 py-1 transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          >
            ← Day 선택
          </button>
          <span>등록 단어 · 0개</span>
        </div>
        <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
          등록
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          아직 등록한 단어가 없어요. 아래에서 추가한 뒤 Day처럼 학습할 수
          있습니다.
        </p>
        <button
          type="button"
          onClick={openForm}
          className="mt-8 w-fit rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          단어 등록
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pt-2 text-sm text-[var(--muted)]">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-2 py-1 transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
        >
          ← Day 선택
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openForm}
            className="rounded-md border border-[var(--line)] bg-white px-3 py-1 text-xs font-medium text-[var(--fg)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            단어 등록
          </button>
          <span>
            등록 · {index + 1} / {total}
          </span>
        </div>
      </div>
      <div className="mx-auto mt-2 h-1 w-full max-w-3xl overflow-hidden px-4">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>

      <div
        key={`${entry.word}-${index}`}
        className="flex flex-1 flex-col items-center justify-center px-6 text-center animate-[fade-up_240ms_ease-out]"
      >
        <p className="text-xs text-[var(--muted)]">내가 등록한 단어</p>
        <p className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--fg)] sm:text-5xl">
          {entry.word}
        </p>
        <SpeakButton text={entry.word} />
        <div className="mt-8 w-full max-w-lg">
          <p className="text-xl font-medium text-[var(--accent)]">
            {entry.meaning}
          </p>
          {entry.example ? (
            <p className="mt-3 text-base leading-relaxed text-[var(--fg)]">
              <ExampleWithUnderline example={entry.example} word={entry.word} />
            </p>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">예문 없음</p>
          )}
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
