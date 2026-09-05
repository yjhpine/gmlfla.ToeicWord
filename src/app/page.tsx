import Link from "next/link";

export default function Home() {
  return (
    <section className="relative flex flex-1 flex-col justify-end overflow-hidden px-6 pb-16 pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,var(--accent-soft),transparent_55%),radial-gradient(ellipse_at_90%_80%,#d8e8df,transparent_50%)]"
      />
      <div className="relative mx-auto w-full max-w-3xl">
        <p className="font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight text-[var(--accent)] sm:text-6xl">
          희림 토익
        </p>
        <h1 className="mt-4 max-w-md text-xl font-medium text-[var(--fg)] sm:text-2xl">
          날짜별 단어를 익히고, 선택한 Day로 시험을 봅니다.
        </h1>
        <p className="mt-3 max-w-sm text-[var(--muted)]">
          스크린샷에서 추출한 영단어·뜻·예문을 Day 단위로 학습합니다.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/words"
            className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            단어 학습
          </Link>
          <Link
            href="/quiz"
            className="rounded-md border border-[var(--line)] bg-white/70 px-5 py-2.5 text-sm font-medium text-[var(--fg)] transition hover:bg-white"
          >
            시험 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
