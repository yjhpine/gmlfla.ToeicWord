import { Fragment, useMemo, useState, type ClipboardEvent, type FormEvent } from "react";
import { WORDS_PER_BLOCK, registeredWordLocations, sameWordLocation, type RegisteredBlock, type TableInput } from "@/lib/registered";

const columns = [
  { field: "word", label: "영어" },
  { field: "meaning", label: "뜻" },
  { field: "example", label: "예문" },
] as const;

type Field = (typeof columns)[number]["field"];
const emptyRow = () => ({ word: "", meaning: "", example: "" });
type DraftRow = ReturnType<typeof emptyRow> & Pick<TableInput, "meaningTarget">;

export function WordRegistrationTable({ source, blocks, onSave }: {
  source: RegisteredBlock;
  blocks: readonly RegisteredBlock[];
  onSave: (rows: TableInput[]) => string | void;
}) {
  const existing = source.words;
  const locations = useMemo(() => registeredWordLocations(blocks), [blocks]);
  const [rows, setRows] = useState<DraftRow[]>(() => Array.from({ length: WORDS_PER_BLOCK }, (_, i) => {
    const entry = existing[i];
    return entry ? { word: entry.word, meaning: entry.meaning, example: entry.example } : emptyRow();
  }));
  const [showExamples, setShowExamples] = useState(false);
  const [error, setError] = useState("");
  const visibleColumns = showExamples ? columns : columns.slice(0, 2);

  function updateCell(index: number, field: Field, value: string) {
    setRows((current) => current.map((row, i) => i === index
      ? { ...row, [field]: value, meaningTarget: field === "word" ? undefined : row.meaningTarget } : row));
    setError("");
  }

  function selectTarget(index: number, meaningTarget: TableInput["meaningTarget"]) {
    setRows((current) => current.map((row, i) => i === index ? { ...row, meaningTarget } : row));
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
        const row: DraftRow = { ...(next[rowIndex + i] ?? emptyRow()) };
        if (columnIndex === 0) row.meaningTarget = undefined;
        line.forEach((value, j) => { row[visibleColumns[columnIndex + j].field] = value; });
        next[rowIndex + i] = row;
      });
      return next;
    });
    setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(onSave(rows.map(({ word, meaning, example, meaningTarget }, i) => ({
      word, meaning, example: existing[i] ? example.trim() : example.trim() || undefined, meaningTarget,
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
            {rows.map((row, i) => {
              const key = row.word.trim().toLowerCase();
              const matches = i < existing.length ? [] : (locations.get(key) ?? []).filter((m) => {
                const draft = m.blockId === source.id ? rows[m.rowIndex]?.word.trim().toLowerCase() : undefined;
                return !draft || draft === key;
              });
              return (
                <Fragment key={i}>
                  <tr className={existing[i] ? "bg-white/80" : "odd:bg-[#dce6f4] even:bg-[#eef3fb]"}>
                    <th scope="row" className="border-r border-t border-white text-center text-xs font-normal text-[var(--muted)]">{i + 1}</th>
                    {visibleColumns.map(({ field, label }, j) => {
                      if (field === "example" && existing[i]?.isSentence) return <td key={field} aria-label="문장에는 예문 없음" />;
                      const Cell = field === "example" || existing[i]?.isSentence ? "textarea" : "input";
                      return (
                        <td key={field} className="border-r border-t border-white p-0 last:border-r-0">
                          <Cell aria-label={`${i + 1}행 ${label}`} value={row[field]}
                            placeholder={matches.length > 0 && field === "meaning" ? "추가할 뜻" : i === existing.length && field === "word" ? "새 단어" : undefined}
                            disabled={field === "example" && typeof row.meaningTarget === "object"}
                            rows={Cell === "textarea" ? 2 : undefined} autoCapitalize={field === "word" ? "none" : undefined}
                            spellCheck={field === "word" ? false : undefined}
                            onChange={(event) => updateCell(i, field, event.target.value)}
                            onPaste={(event) => pasteCells(event, i, j)}
                            className="block min-h-11 w-full bg-transparent px-3 py-2 text-base text-[var(--fg)] focus:bg-white focus:outline-2 focus:-outline-offset-2 focus:outline-[var(--accent)]" />
                        </td>
                      );
                    })}
                  </tr>
                  {matches.length > 0 && (
                    <tr><td colSpan={visibleColumns.length + 1} className="border-y border-[var(--line)] bg-white px-3 py-3 text-sm">
                      <fieldset>
                        <legend className="font-semibold text-[var(--fg)]">{i + 1}행 · 이미 등록된 단어</legend>
                        <p className="mt-1 text-[var(--muted)]">뜻 칸에 새 뜻을 입력하고, 추가할 위치를 선택하세요.</p>
                        {matches.map((match) => (
                          <label key={`${match.blockId}-${match.rowIndex}`} className="mt-2 flex items-start gap-2">
                            <input type="radio" name={`meaning-target-${i}`} className="mt-1"
                              checked={typeof row.meaningTarget === "object" && sameWordLocation(row.meaningTarget, match)}
                              onChange={() => selectTarget(i, match)} />
                            <span><strong>{match.label}</strong><span className="block text-[var(--muted)]">기존 뜻 · {match.entry.meaning}</span></span>
                          </label>
                        ))}
                        {!matches.some((match) => match.category === source.category) && (
                          <label className="mt-2 flex items-center gap-2">
                            <input type="radio" name={`meaning-target-${i}`} checked={row.meaningTarget === "separate"}
                              onChange={() => selectTarget(i, "separate")} />
                            현재 영역에 별도 단어로 등록
                          </label>
                        )}
                      </fieldset>
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
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
