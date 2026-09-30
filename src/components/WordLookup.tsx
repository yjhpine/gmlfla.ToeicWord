"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ExampleWithUnderline } from "@/components/ExampleWithUnderline";
import {
  REGISTERED_EVENT,
  loadRegisteredWords,
  registerLookupResult,
  removeRegisteredWord,
  type RegisteredWord,
} from "@/lib/registered";
import type { LookupResult } from "@/lib/words/lookup";

type LookupResponse =
  | { result: LookupResult; error?: undefined }
  | { result?: undefined; error: string };

export function WordLookup() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<RegisteredWord[]>([]);
  const [pending, setPending] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

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
    const word = query.trim();
    if (!word) {
      setError("영단어를 입력해 주세요.");
      setResult(null);
      return;
    }

    setError(null);
    setJustRegistered(false);
    setPending(true);
    void (async () => {
      try {
        const res = await fetch(`/api/lookup?word=${encodeURIComponent(word)}`);
        const data = (await res.json()) as LookupResponse;
        if (!res.ok || !data.result) {
          setResult(null);
          setError(data.error ?? "검색에 실패했어요.");
          return;
        }
        setResult(data.result);
        setError(null);
      } catch {
        setResult(null);
        setError("네트워크 오류로 검색하지 못했어요.");
      } finally {
        setPending(false);
      }
    })();
  }

  function onRegister() {
    if (!result) return;
    setRegistered(registerLookupResult(result));
    setJustRegistered(true);
  }

  return (
    <section className="mt-10 animate-[fade-up_280ms_ease-out]">
      <h2 className="text-lg font-medium text-[var(--fg)]">단어 등록·해설</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        영단어를 타자로 입력하면 뜻과 예문을 찾아 해설해 줍니다.
      </p>

      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: occupation"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-[12rem] flex-1 rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--accent)]"
          aria-label="등록할 영단어"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "검색 중…" : "뜻·예문 검색"}
        </button>
      </form>

      {error ? (
        <p className="mt-3 text-sm text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-5 border-y border-[var(--line)] py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
                {result.word}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {result.source === "local"
                  ? `단어장 Day ${result.day}`
                  : "영어 사전 + 번역"}
                {result.partOfSpeech ? ` · ${result.partOfSpeech}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onRegister}
              className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--fg)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {justRegistered ? "등록됨" : "내 목록에 등록"}
            </button>
          </div>

          <p className="mt-3 text-lg font-medium text-[var(--fg)]">
            {result.meaning}
          </p>
          {result.meaningEn && result.meaningEn !== result.meaning ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{result.meaningEn}</p>
          ) : null}

          {result.example ? (
            <p className="mt-3 text-base leading-relaxed text-[var(--fg)]">
              <ExampleWithUnderline
                example={result.example}
                word={result.word}
              />
            </p>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">예문 없음</p>
          )}
          {result.exampleMeaning ? (
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
              {result.exampleMeaning}
            </p>
          ) : null}

          <div className="mt-4 rounded-md bg-[var(--accent-soft)]/60 px-3 py-3">
            <p className="text-xs font-medium tracking-wide text-[var(--accent)]">
              해설
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--fg)]">
              {result.explanation}
            </p>
          </div>
        </div>
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
                    onClick={() => removeRegisteredWord(item.word)}
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
