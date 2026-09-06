/** 시험 결과에서 고른 중요 단어 (브라우저 로컬) */

import type { QuizWord } from "@/lib/words/types";

export const IMPORTANT_STORAGE_KEY = "heelim-toeic-important-v1";
export const IMPORTANT_EVENT = "heelim-important-updated";

export function importantKey(entry: Pick<QuizWord, "day" | "word">) {
  return `${entry.day}::${entry.word}`;
}

export function loadImportantWords(): QuizWord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(IMPORTANT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is QuizWord => {
        if (!item || typeof item !== "object") return false;
        const w = item as Partial<QuizWord>;
        return (
          typeof w.day === "number" &&
          typeof w.word === "string" &&
          typeof w.meaning === "string" &&
          typeof w.example === "string"
        );
      })
      .map((w) => ({
        day: w.day,
        word: w.word,
        meaning: w.meaning,
        example: w.example,
        exampleMeaning: w.exampleMeaning ?? "",
      }));
  } catch {
    return [];
  }
}

function saveImportantWords(words: QuizWord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IMPORTANT_STORAGE_KEY, JSON.stringify(words));
  window.dispatchEvent(new Event(IMPORTANT_EVENT));
}

export function isImportantWord(entry: Pick<QuizWord, "day" | "word">) {
  const key = importantKey(entry);
  return loadImportantWords().some((w) => importantKey(w) === key);
}

/** 없으면 추가, 있으면 제거. 결과로 중요 여부 반환 */
export function toggleImportantWord(entry: QuizWord): boolean {
  const key = importantKey(entry);
  const current = loadImportantWords();
  const exists = current.some((w) => importantKey(w) === key);
  if (exists) {
    saveImportantWords(current.filter((w) => importantKey(w) !== key));
    return false;
  }
  saveImportantWords([
    ...current,
    {
      day: entry.day,
      word: entry.word,
      meaning: entry.meaning,
      example: entry.example,
      exampleMeaning: entry.exampleMeaning ?? "",
    },
  ]);
  return true;
}
