/** 시험 결과에서 고른 중요 단어 (브라우저 로컬) */

import type { QuizWord } from "@/lib/words/types";

export const IMPORTANT_STORAGE_KEY = "heelim-toeic-important-v1";
export const IMPORTANT_EVENT = "heelim-important-updated";

type ImportantIdentity = Pick<QuizWord, "day" | "word" | "isSentence" | "bookmarkDay">;

export function importantKey(entry: ImportantIdentity) {
  return `${entry.isSentence ? "sentence:" : ""}${entry.bookmarkDay ?? entry.day}::${entry.word}`;
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
        ...(w.isSentence === true && { isSentence: true }),
        ...(typeof w.bookmarkDay === "number" && w.bookmarkDay < 0 && { bookmarkDay: w.bookmarkDay }),
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

export type ImportantWordChange = { previous: QuizWord; updated: QuizWord };

export function updateImportantWords(changes: readonly ImportantWordChange[]) {
  if (!changes.length) return;
  const originals = new Map(changes.map(({ previous, updated }) => [importantKey(previous), updated]));
  const destinations = new Map(changes.map(({ updated }) => [importantKey(updated), updated]));
  const seen = new Set<string>();
  let changed = false;
  const next = loadImportantWords().flatMap((entry) => {
    const key = importantKey(entry);
    const updated = originals.get(key) ?? destinations.get(key);
    if (!updated) return [entry];
    changed = true;
    const newKey = importantKey(updated);
    if (seen.has(newKey)) return [];
    seen.add(newKey);
    return [updated];
  });
  if (changed) saveImportantWords(next);
}

export function isImportantWord(entry: ImportantIdentity) {
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
      ...(entry.isSentence && { isSentence: true }),
      ...(entry.bookmarkDay !== undefined && { bookmarkDay: entry.bookmarkDay }),
    },
  ]);
  return true;
}
