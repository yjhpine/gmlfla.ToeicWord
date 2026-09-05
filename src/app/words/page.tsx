import { WordsStudy } from "@/components/WordsStudy";
import { getAllDayWordbooks } from "@/lib/words/load";

export default function WordsPage() {
  const books = getAllDayWordbooks();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <WordsStudy books={books} />
    </div>
  );
}
