"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ExampleWithUnderline } from "@/components/ExampleWithUnderline";
import {
  REGISTERED_EVENT,
  loadRegisteredWords,
  registerWord,
  removeRegisteredWord,
  type RegisteredWord,
} from "@/lib/registered";

export function WordRegister() {
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [registered, setRegistered] = useState<RegisteredWord[]>([]);

  useEffect(() => {
    function sync() {
      setRegistered(loadRegisteredWords());
    }
    sync();
    window.addEventListener(REGISTERED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(REGISTERED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

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

    setRegistered(
      registerWord({
        word: nextWord,
        meaning: nextMeaning,
        example: nextExample,
      }),
    );
    setWord("");
    setMeaning("");
    setExample("");
    setError(null);
    setOkMessage(`「${nextWord}」를 등록했어요.`);
  }

  return (
    <section className="mt-10 animate-[fade-up_280ms_ease-out]">
      <h2 className="text-lg font-medium text-[var(--fg)]">단어 등록</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        영단어·뜻·예문을 직접 입력해 내 목록에 저장합니다.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
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
      </form>

      {error ? (
        <p className="mt-3 text-sm text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}
      {okMessage ? (
        <p className="mt-3 text-sm text-[var(--accent)]" role="status">
          {okMessage}
        </p>
      ) : null}

      {registered.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-[var(--muted)]">
            등록한 단어 ({registered.length})
          </h3>
          <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {registered.map((item) => (
              <li key={`${item.word}-${item.registeredAt}`} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--accent)]">
                      {item.word}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--fg)]">
                      {item.meaning}
                    </p>
                    {item.example ? (
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        <ExampleWithUnderline
                          example={item.example}
                          word={item.word}
                        />
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeRegisteredWord(item.word);
                      setOkMessage(null);
                    }}
                    className="shrink-0 text-xs text-[var(--muted)] underline decoration-dotted underline-offset-2"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
