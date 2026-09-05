import { QuizApp } from "@/components/QuizApp";
import { getAllDayWordbooks } from "@/lib/words/load";

export default function QuizPage() {
  const books = getAllDayWordbooks();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <QuizApp books={books} />
    </div>
  );
}
