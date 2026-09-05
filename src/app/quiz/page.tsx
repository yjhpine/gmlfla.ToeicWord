export default function QuizPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
        시험
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        여러 Day를 골라 범위를 정한 뒤 시험을 시작합니다. (로직 연동 예정)
      </p>
      <p className="mt-6 text-sm text-[var(--muted)]">
        사이클: 영단어 표시 → 터치 시 정답/예문 → 모르겠어요 / 맞췄어요
      </p>
    </div>
  );
}
