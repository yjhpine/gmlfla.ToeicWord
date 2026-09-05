/** DB·JSON 공통 단어 스키마 */

export type WordEntry = {
  word: string;
  meaning: string;
  example: string;
};

export type DayWordbook = {
  /** 학습 일차 (1~20) */
  day: number;
  /** 스크린샷 기준 날짜 (YYYY-MM-DD), 없으면 null */
  date: string | null;
  /** 원본 이미지 파일명 */
  sourceImage: string | null;
  words: WordEntry[];
};

export type WordbookIndex = {
  totalDays: number;
  totalWords: number;
  days: Array<{
    day: number;
    date: string | null;
    wordCount: number;
    file: string;
  }>;
};
