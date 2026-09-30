/** 타자로 등록한 단어 해설 (브라우저 로컬) */

import type { LookupResult } from "@/lib/words/lookup";

export const REGISTERED_STORAGE_KEY = "heelim-toeic-registered-v1";
export const REGISTERED_EVENT = "heelim-registered-updated";

export type RegisteredWord = LookupResult & {
  registeredAt: string;
};

export function loadRegisteredWords(): RegisteredWord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REGISTERED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RegisteredWord => {
        if (!item || typeof item !== "object") return false;
        const w = item as Partial<RegisteredWord>;
        return typeof w.word === "string" && typeof w.meaning === "string";
      })
      .map((w) => ({
        word: w.word,
        meaning: w.meaning,
        meaningEn: w.meaningEn ?? "",
        example: w.example ?? "",
        exampleMeaning: w.exampleMeaning ?? "",
        explanation: w.explanation ?? "",
        source: w.source === "local" ? "local" : "dictionary",
        partOfSpeech: w.partOfSpeech ?? "",
        day: typeof w.day === "number" ? w.day : null,
        registeredAt: w.registeredAt ?? new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

function saveRegisteredWords(words: RegisteredWord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REGISTERED_STORAGE_KEY, JSON.stringify(words));
  window.dispatchEvent(new Event(REGISTERED_EVENT));
}

export function registerLookupResult(result: LookupResult): RegisteredWord[] {
  const current = loadRegisteredWords();
  const key = result.word.trim().toLowerCase();
  const next: RegisteredWord[] = [
    {
      ...result,
      registeredAt: new Date().toISOString(),
    },
    ...current.filter((w) => w.word.trim().toLowerCase() !== key),
  ].slice(0, 50);
  saveRegisteredWords(next);
  return next;
}

export function removeRegisteredWord(word: string) {
  const key = word.trim().toLowerCase();
  saveRegisteredWords(
    loadRegisteredWords().filter((w) => w.word.trim().toLowerCase() !== key),
  );
}
