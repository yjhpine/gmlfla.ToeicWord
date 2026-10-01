/** 사용자가 직접 등록한 단어 (브라우저 로컬) */

import type { QuizWord } from "@/lib/words/types";

export const REGISTERED_STORAGE_KEY = "heelim-toeic-registered-v1";
export const REGISTERED_EVENT = "heelim-registered-updated";
/** Day 그리드에서 등록 단어를 나타내는 가상 Day 번호 */
export const REGISTERED_DAY = 0;

export type RegisteredWord = {
  word: string;
  meaning: string;
  example: string;
  registeredAt: string;
};

export function registeredToQuizWords(): QuizWord[] {
  return loadRegisteredWords().map((w) => ({
    word: w.word,
    meaning: w.meaning,
    example: w.example,
    exampleMeaning: "",
    day: REGISTERED_DAY,
  }));
}

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
        word: w.word.trim(),
        meaning: w.meaning.trim(),
        example: (w.example ?? "").trim(),
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

export function registerWord(input: {
  word: string;
  meaning: string;
  example: string;
}): RegisteredWord[] {
  const word = input.word.trim();
  const meaning = input.meaning.trim();
  const example = input.example.trim();
  const key = word.toLowerCase();
  const current = loadRegisteredWords();
  const next: RegisteredWord[] = [
    {
      word,
      meaning,
      example,
      registeredAt: new Date().toISOString(),
    },
    ...current.filter((w) => w.word.trim().toLowerCase() !== key),
  ].slice(0, 100);
  saveRegisteredWords(next);
  return next;
}

export function removeRegisteredWord(word: string) {
  const key = word.trim().toLowerCase();
  saveRegisteredWords(
    loadRegisteredWords().filter((w) => w.word.trim().toLowerCase() !== key),
  );
}
