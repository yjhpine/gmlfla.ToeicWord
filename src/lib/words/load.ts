import { readFileSync, existsSync } from "fs";
import path from "path";
import type { DayWordbook, QuizWord, WordbookIndex } from "./types";

const WORDS_DIR = path.join(process.cwd(), "data", "words");

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

export function getWordbookIndex(): WordbookIndex {
  const indexPath = path.join(WORDS_DIR, "index.json");
  if (!existsSync(indexPath)) {
    return { totalDays: 0, totalWords: 0, days: [] };
  }
  const raw = readJson<{
    totalDays?: number;
    totalWords?: number;
    days: WordbookIndex["days"];
  }>(indexPath);
  return {
    totalDays: raw.totalDays ?? raw.days.length,
    totalWords: raw.totalWords ?? raw.days.reduce((n, d) => n + d.wordCount, 0),
    days: raw.days,
  };
}

export function getDayWordbook(day: number): DayWordbook | null {
  const filePath = path.join(WORDS_DIR, `day-${String(day).padStart(2, "0")}.json`);
  if (!existsSync(filePath)) return null;
  return readJson<DayWordbook>(filePath);
}

export function getAllDayWordbooks(): DayWordbook[] {
  const index = getWordbookIndex();
  return index.days
    .map((d) => getDayWordbook(d.day))
    .filter((d): d is DayWordbook => d !== null);
}

export function getQuizWords(days: number[]): QuizWord[] {
  const selected = new Set(days);
  return getAllDayWordbooks()
    .filter((book) => selected.has(book.day))
    .flatMap((book) =>
      book.words.map((word) => ({
        ...word,
        day: book.day,
      })),
    );
}

/** 배열을 섞은 새 배열 반환 */
export function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
