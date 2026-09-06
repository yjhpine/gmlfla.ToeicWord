import Link from "next/link";
import { HomeAchievement } from "@/components/HomeAchievement";
import { getWordbookIndex } from "@/lib/words/load";

export default function Home() {
  const index = getWordbookIndex();

  return (
    <section className="relative flex flex-1 flex-col justify-end overflow-hidden px-6 pb-16 pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,var(--accent-soft),transparent_55%),radial-gradient(ellipse_at_95%_75%,#c5e7fa,transparent_50%),linear-gradient(180deg,#e8f4fc_0%,transparent_45%)]"
      />
      <div className="relative mx-auto w-full max-w-3xl">
        <p className="font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight text-[var(--accent)] sm:text-6xl">
          희림 토익
        </p>
        <HomeAchievement totalDays={index.totalDays || 20} />
        <p className="mt-6 max-w-sm text-[var(--muted)]">
          Day 학습과 시험을 끝낼수록 성취도가 올라갑니다.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/words"
            className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-12px_#1d6fd8] transition hover:opacity-90"
          >
            단어 학습
          </Link>
          <Link
            href="/quiz"
            className="rounded-md border border-[var(--line)] bg-white/80 px-5 py-2.5 text-sm font-medium text-[var(--fg)] transition hover:bg-white"
          >
            시험 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
