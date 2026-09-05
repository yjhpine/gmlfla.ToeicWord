export default function WordsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
        단어
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Day를 선택하면 영단어·뜻·예문을 한 화면에 보여줍니다. (데이터 연동 예정)
      </p>
      <ul className="mt-8 grid grid-cols-4 gap-2 sm:grid-cols-5">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((day) => (
          <li
            key={day}
            className="flex h-12 items-center justify-center rounded-md border border-[var(--line)] bg-white/60 text-sm text-[var(--muted)]"
          >
            Day {day}
          </li>
        ))}
      </ul>
    </div>
  );
}
