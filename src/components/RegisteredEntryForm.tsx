import { useId, useState, type FormEvent } from "react";
import type { RegisteredWord } from "@/lib/registered";

export type EntryFields = Pick<RegisteredWord, "word" | "meaning" | "example">;
export type FormMode = "word" | "sentence";

type Props = {
  kind: FormMode;
  original?: RegisteredWord;
  submitLabel: string;
  onSave: (fields: EntryFields) => string | void;
  onCancel?: () => void;
};

export function RegisteredEntryForm({ kind, original, submitLabel, onSave, onCancel }: Props) {
  const id = useId();
  const [error, setError] = useState("");
  const isSentence = kind === "sentence";
  const TextField = isSentence ? "textarea" : "input";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const word = String(data.get("word") ?? "").trim();
    const meaning = String(data.get("meaning") ?? "").trim();
    const example = String(data.get("example") ?? "").trim();
    if (!word) {
      setError(isSentence ? "영어 문장을 입력해 주세요." : "영단어를 입력해 주세요.");
      return;
    }
    if (!meaning) {
      setError("뜻을 입력해 주세요.");
      return;
    }
    setError(onSave({ word, meaning, example }) || "");
  }

  return (
    <form aria-label={original ? `${original.word} 수정` : isSentence ? "문장 등록" : "단어 등록"}
      onSubmit={onSubmit} className="space-y-3">
      <div>
        <label htmlFor={`${id}-english`} className="text-xs font-medium text-[var(--muted)]">
          {isSentence ? "영어 문장" : "단어"}
        </label>
        <TextField
          id={`${id}-english`}
          rows={isSentence ? 3 : undefined}
          name="word"
          autoFocus={Boolean(original)}
          defaultValue={original?.word ?? ""}
          placeholder={isSentence ? "예: Could we move the meeting to Friday?" : "예: occupation"}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--accent)]"
        />
      </div>
      <div>
        <label htmlFor={`${id}-meaning`} className="text-xs font-medium text-[var(--muted)]">뜻</label>
        <TextField
          id={`${id}-meaning`}
          rows={isSentence ? 2 : undefined}
          name="meaning"
          defaultValue={original?.meaning ?? ""}
          placeholder={isSentence ? "예: 회의를 금요일로 옮길 수 있을까요?" : "예: 직업"}
          className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--accent)]"
        />
      </div>
      {!isSentence && (
        <div>
          <label htmlFor={`${id}-example`} className="text-xs font-medium text-[var(--muted)]">
            예문 (선택)
          </label>
          <textarea
            id={`${id}-example`}
            name="example"
            defaultValue={original?.example ?? ""}
            placeholder="예: She decided to pursue a different occupation."
            rows={3}
            className="mt-1 w-full resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--accent)]"
          />
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md border border-[var(--line)] bg-white px-4 py-2.5 text-sm">
            취소
          </button>
        )}
      </div>
      {error ? (
        <p className="text-sm text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
