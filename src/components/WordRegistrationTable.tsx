import { useState, type ClipboardEvent, type FormEvent } from "react";
import { WORDS_PER_BLOCK, type RegisteredWord, type RegistrationInput } from "@/lib/registered";

const columns = [
  { field: "word", label: "영어" },
  { field: "meaning", label: "뜻" },
  { field: "example", label: "예문" },
] as const;

type Field = (typeof columns)[number]["field"];
const emptyRow = () => ({ word: "", meaning: "", example: "" });

export function WordRegistrationTable({ existing, onSave }: {
  existing: readonly RegisteredWord[];
  onSave: (rows: RegistrationInput[]) => string | void;
}) {
  const [rows, setRows] = useState(() => Array.from({ length: WORDS_PER_BLOCK }, (_, i) => {
    const entry = existing[i];
    return entry ? { word: entry.word, meaning: entry.meaning, example: entry.example } : emptyRow();
  }));
  const [showExamples, setShowExamples] = useState(false);
  const [error, setError] = useState("");
  const visibleColumns = showExamples ? columns : columns.slice(0, 2);

  function updateCell(index: number, field: Field, value: string) {
    setRows((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
    setError("");
  }

  function pasteCells(event: ClipboardEvent, rowIndex: number, columnIndex: number) {
    const text = event.clipboardData.getData("text/plain");
    if ((visibleColumns[columnIndex].field === "example" || existing[rowIndex]?.isSentence) && !text.includes("\t")) return;
    if (!text.includes("\t") && !text.includes("\n")) return;
    event.preventDefault();
    const cells = text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n").map((line) => line.split("\t"));
    if (cells.some((line) => columnIndex + line.length > visibleColumns.length)) {
      setError("붙여넣을 열이 더 많아요. 영어 열에서 시작하거나 예문 열을 열어 주세요.");
      return;
    }
    setRows((current) => {
      const next = [...current];
      cells.forEach((line, i) => {
        const row = { ...(next[rowIndex + i] ?? emptyRow()) };
        line.forEach((value, j) => { row[visibleColumns[columnIndex + j].field] = value; });
        next[rowIndex + i] = row;
      });
      return next;
    });
    setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(onSave(rows.map(({ word, meaning, example }, i) => ({
      word, meaning, example: existing[i] ? example.trim() : example.trim() || undefined,
    }))) || "");
  }

  return (
    <form aria-label="단어 등록" onSubmit={submit}>
      <div className="overflow-hidden rounded-lg border border-[var(--line)]">
        <table aria-label="단어 입력표" className="w-full table-fixed border-collapse text-left">
          <thead className="bg-[#436eb2] text-white">
            <tr><th scope="col" className="w-10 border-r border-white/60 text-center text-xs font-medium">번호</th>
            {visibleColumns.map(({ field, label }) => (
              <th key={field} scope="col" className="border-r border-white/60 px-3 py-2 text-sm font-semibold last:border-0">
                {label}
              </th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={existing[i] ? "bg-white/80" : "odd:bg-[#dce6f4] even:bg-[#eef3fb]"}>
                <th scope="row" className="border-r border-t border-white text-center text-xs font-normal text-[var(--muted)]">{i + 1}</th>
                {visibleColumns.map(({ field, label }, j) => {
                  if (field === "example" && existing[i]?.isSentence) return <td key={field} aria-label="문장에는 예문 없음" />;
                  const Cell = field === "example" || existing[i]?.isSentence ? "textarea" : "input";
                  return (
                    <td key={field} className="border-r border-t border-white p-0 last:border-r-0">
                      <Cell aria-label={`${i + 1}행 ${label}`} value={row[field]}
                        placeholder={i === existing.length && field === "word" ? "새 단어" : undefined}
                        rows={Cell === "textarea" ? 2 : undefined} autoCapitalize={field === "word" ? "none" : undefined}
                        spellCheck={field === "word" ? false : undefined}
                        onChange={(event) => updateCell(i, field, event.target.value)}
                        onPaste={(event) => pasteCells(event, i, j)}
                        className="block min-h-11 w-full bg-transparent px-3 py-2 text-base text-[var(--fg)] focus:bg-white focus:outline-2 focus:-outline-offset-2 focus:outline-[var(--accent)]" />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setRows((current) => [...current, emptyRow()])}
          className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--accent)]">
          + 행 추가
        </button>
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={showExamples} onChange={(event) => setShowExamples(event.target.checked)} />
          예문 입력
        </label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <button type="submit" className="mt-5 rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
        등록하기
      </button>
    </form>
  );
}
