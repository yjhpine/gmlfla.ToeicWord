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
