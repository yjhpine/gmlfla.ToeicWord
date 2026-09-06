/** 브라우저 로컬 학습·시험 진행도 (학업 성취도) */

export const PROGRESS_STORAGE_KEY = "heelim-toeic-progress-v1";
export const PROGRESS_EVENT = "heelim-progress-updated";

export type StudyProgress = {
  studiedDays: number[];
  quizzedDays: number[];
};

export type AchievementSummary = {
  percent: number;
  studiedCount: number;
  quizzedCount: number;
  totalDays: number;
};

const EMPTY: StudyProgress = { studiedDays: [], quizzedDays: [] };

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

export function loadProgress(): StudyProgress {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<StudyProgress>;
    return {
      studiedDays: uniqueSorted(
        Array.isArray(parsed.studiedDays) ? parsed.studiedDays.map(Number) : [],
      ),
      quizzedDays: uniqueSorted(
        Array.isArray(parsed.quizzedDays) ? parsed.quizzedDays.map(Number) : [],
      ),
    };
  } catch {
    return EMPTY;
  }
}

function saveProgress(next: StudyProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function markDayStudied(day: number) {
  const current = loadProgress();
  if (current.studiedDays.includes(day)) return;
  saveProgress({
    ...current,
    studiedDays: uniqueSorted([...current.studiedDays, day]),
  });
}

export function markDaysQuizzed(days: number[]) {
  if (days.length === 0) return;
  const current = loadProgress();
  saveProgress({
    ...current,
    quizzedDays: uniqueSorted([...current.quizzedDays, ...days]),
  });
}

/** 학습 Day + 시험 Day 각각 절반 비중으로 성취도 계산 */
export function calcAchievement(
  progress: StudyProgress,
  totalDays: number,
): AchievementSummary {
  const studiedCount = progress.studiedDays.filter(
    (d) => d >= 1 && d <= totalDays,
  ).length;
  const quizzedCount = progress.quizzedDays.filter(
    (d) => d >= 1 && d <= totalDays,
  ).length;
  const max = Math.max(totalDays * 2, 1);
  const percent = Math.round(((studiedCount + quizzedCount) / max) * 100);
  return {
    percent: Math.min(100, Math.max(0, percent)),
    studiedCount,
    quizzedCount,
    totalDays,
  };
}
