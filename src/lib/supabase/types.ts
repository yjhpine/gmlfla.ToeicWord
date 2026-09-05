import type { WordEntry } from "@/lib/words/types";

/** Supabase public.wordbooks / public.words 테이블 타입 */

export type WordbookRow = {
  id: string;
  day: number;
  date: string | null;
  title: string;
  created_at: string;
};

export type WordRow = {
  id: string;
  wordbook_id: string;
  word: string;
  meaning: string;
  example: string;
  sort_order: number;
  created_at: string;
};

export type WordInsert = WordEntry & {
  wordbook_id: string;
  sort_order: number;
};
