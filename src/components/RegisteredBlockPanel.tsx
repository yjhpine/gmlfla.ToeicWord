import { useId, useState } from "react";
import { RegisteredEntryForm, type EntryFields, type FormMode } from "./RegisteredEntryForm";
import { editRegisteredWord, type RegisteredBlock, type RegisteredWord } from "@/lib/registered";

function RegisteredEntryRow({ blockId, entry }: { blockId: string; entry: RegisteredWord }) {
  const [original, setOriginal] = useState<RegisteredWord | null>(null);

  function save(fields: EntryFields) {
    if (!original) return;
    const result = editRegisteredWord(blockId, original, fields);
    if (!result.ok) return result.error;
    setOriginal(null);
  }

  return (
    <li className="px-4 py-3">
      {original ? (
        <RegisteredEntryForm
          kind={original.isSentence ? "sentence" : "word"}
          original={original}
          submitLabel="수정 저장"
          onSave={save}
          onCancel={() => setOriginal(null)}
        />
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 whitespace-pre-line wrap-anywhere">
            <p lang="en" className="font-semibold text-[var(--fg)]">{entry.word}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{entry.meaning}</p>
            {entry.example && <p lang="en" className="mt-1 text-sm text-[var(--muted)]">{entry.example}</p>}
          </div>
          <button type="button" aria-label={`${entry.word} 수정`} onClick={() => setOriginal(entry)}
            className="shrink-0 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]">
            수정
          </button>
        </div>
      )}
    </li>
  );
}

type Props = {
  block: RegisteredBlock;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (kind?: FormMode) => void;
};

export function RegisteredBlockPanel({ block, expanded, onToggle, onOpen }: Props) {
  const id = useId();
  const empty = block.words.length === 0;
  const actionStyle = "rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--fg)] hover:border-[var(--accent)]";

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <button
        type="button"
        aria-expanded={empty ? undefined : expanded}
        aria-controls={expanded && !empty ? id : undefined}
        onClick={empty ? () => onOpen() : onToggle}
        className="flex min-h-12 w-full items-center justify-between gap-2 bg-[var(--accent-soft)] px-4 py-3 text-left text-sm font-semibold text-[var(--accent)]"
      >
        <span className="min-w-0 wrap-anywhere">{block.name} ({block.words.length})</span>
        <span className="shrink-0 text-xs font-medium">{empty ? "등록하기" : expanded ? "접기 ▴" : "펼치기 ▾"}</span>
      </button>
      {!empty && expanded && (
        <div id={id}>
          <div className="flex flex-wrap gap-2 border-y border-[var(--line)] px-4 py-3">
            <button type="button" onClick={() => onOpen()} className={actionStyle}>카드 학습</button>
            {block.category === "LC" && (
              <button type="button" onClick={() => onOpen("sentence")} className={actionStyle}>문장 등록</button>
            )}
            <button type="button" onClick={() => onOpen("word")} className={actionStyle}>단어 등록</button>
          </div>
          <ul aria-label={`${block.name} 등록 목록`} className="divide-y divide-[var(--line)]">
            {block.words.map((entry) => (
              <RegisteredEntryRow
                key={JSON.stringify([entry.registeredAt, Boolean(entry.isSentence), entry.word])}
                blockId={block.id}
                entry={entry}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
