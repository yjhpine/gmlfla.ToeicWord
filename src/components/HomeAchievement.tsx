"use client";

import { useEffect, useState } from "react";
import {
  PROGRESS_EVENT,
  calcAchievement,
  loadProgress,
  type AchievementSummary,
} from "@/lib/progress";

type Props = {
  totalDays: number;
};

export function HomeAchievement({ totalDays }: Props) {
  const [summary, setSummary] = useState<AchievementSummary>(() =>
    calcAchievement({ studiedDays: [], quizzedDays: [] }, totalDays),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function refresh() {
      setSummary(calcAchievement(loadProgress(), totalDays));
      setReady(true);
    }
    refresh();
    window.addEventListener(PROGRESS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [totalDays]);

  return (
    <div className="mt-10 max-w-md animate-[fade-up_280ms_ease-out]">
      <p className="text-sm font-medium tracking-wide text-[var(--muted)]">
        학업 성취도
      </p>
      <div className="mt-2 flex items-end gap-3">
        <p
          className="font-[family-name:var(--font-display)] text-6xl leading-none tracking-tight text-[var(--accent)] sm:text-7xl"
          aria-live="polite"
        >
          {ready ? summary.percent : "—"}
          <span className="ml-1 text-3xl sm:text-4xl">%</span>
        </p>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--accent-soft)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
          style={{ width: `${ready ? summary.percent : 0}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        학습 {summary.studiedCount}/{summary.totalDays} Day · 시험{" "}
        {summary.quizzedCount}/{summary.totalDays} Day
      </p>
    </div>
  );
}
