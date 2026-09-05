/** DB·JSON 공통 단어 스키마 */

export type WordEntry = {
  word: string;
  meaning: string;
  example: string;
  /** 예문 한국어 뜻 */
  exampleMeaning: string;
};

export type DayWordbook = {
  day: number;
  date: string | null;
  title: string;
  sourceImage: string | null;
  words: WordEntry[];
};

export type QuizWord = WordEntry & {
  day: number;
};

export type WordbookIndex = {
  totalDays: number;
  totalWords: number;
  days: Array<{
    day: number;
    date: string | null;
    title: string;
    wordCount: number;
    file: string;
    sourceImage: string | null;
  }>;
};
