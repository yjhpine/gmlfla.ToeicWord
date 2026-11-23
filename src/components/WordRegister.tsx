"use client";

import { useEffect, useState } from "react";
import { ExampleWithUnderline } from "@/components/ExampleWithUnderline";
import { RegisteredEntryForm, type EntryFields, type FormMode } from "@/components/RegisteredEntryForm";
import { SpeakButton } from "@/components/SpeakButton";
import {
  REGISTERED_EVENT,
  WORDS_PER_BLOCK,
  editRegisteredWord,
  getRegisteredBlock,
  loadRegisteredBlocks,
  registerWord,
  registeredBlockLabel,
  removeRegisteredWord,
  renameRegisteredBlock,
  type RegisteredBlock,
  type RegisteredWord,
} from "@/lib/registered";

type Props = {
  blockId: string;
  onBack: () => void;
  onBlockChange?: (blockId: string) => void;
};

type RegistrationForm = {
  kind: FormMode;
  editing?: { blockId: string; original: RegisteredWord };
};

export function WordRegister({ blockId, onBack, onBlockChange }: Props) {
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<RegistrationForm | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [block, setBlock] = useState<RegisteredBlock | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    function sync() {
      const current = getRegisteredBlock(blockId);
      if (!current) {
        const fallback = loadRegisteredBlocks()[0] ?? null;
        setBlock(fallback);
        setNameDraft(fallback?.name ?? "");
        if (fallback && fallback.id !== blockId) {
          onBlockChange?.(fallback.id);
        }
      } else {
        setBlock(current);
        setNameDraft(current.name);
      }
      setReady(true);
      setIndex((i) => {
        const len = current?.words.length ?? 0;
        if (len === 0) return 0;
        return Math.min(i, len - 1);
      });
    }
    sync();
    window.addEventListener(REGISTERED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(REGISTERED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [blockId, onBlockChange]);

  const registered: RegisteredWord[] = block?.words ?? [];
  const entry = registered[index];
  const total = registered.length;
  const progressRatio = total ? (index + 1) / total : 0;
  const isFull = total >= WORDS_PER_BLOCK;
  const blockLabel = block ? registeredBlockLabel(block) : "등록";

  const isSentenceForm = form?.kind === "sentence";

  function openForm(kind: FormMode, original?: RegisteredWord) {
    if (!block) return;
    setForm({ kind, editing: original ? { blockId: block.id, original } : undefined });
    setStatusMessage(null);
  }

  function closeForm() {
    setForm(null);
    setStatusMessage(null);
  }

  function saveName() {
    if (!block) return;
    const next = nameDraft.trim();
    if (!next || next === block.name) {
      setNameDraft(block.name);
      return;
    }
    const blocks = renameRegisteredBlock(block.id, next);
    const updated = blocks.find((b) => b.id === block.id);
    if (updated) {
      setBlock(updated);
      setNameDraft(updated.name);
    }
  }

  function saveEntry(input: EntryFields) {
    if (!block) return "블록을 다시 열어 주세요.";
    if (form?.editing) {
      const { blockId: originalBlockId, original } = form.editing;
      const result = editRegisteredWord(originalBlockId, original, input);
      if (!result.ok) return result.error;
      setBlock(result.block);
      setIndex(result.index);
      closeForm();
      setStatusMessage("수정 내용을 저장했어요.");
      return;
    }

    const result = registerWord({ ...input, isSentence: isSentenceForm }, block.id);
    const nextBlock = result.blocks.find((b) => b.id === result.blockId) ?? null;
    setBlock(nextBlock);
    setNameDraft(nextBlock?.name ?? "");
    closeForm();
    setIndex(0);

    if (result.createdNewBlock) {
      setStatusMessage(
        `「${input.word}」등록 · 블럭이 가득 차서 「${nextBlock?.name ?? "새 등록"}」을 만들었어요.`,
      );
      onBlockChange?.(result.blockId);
    } else {
      setStatusMessage(`「${input.word}」를 등록했어요.`);
      if (result.blockId !== block.id) onBlockChange?.(result.blockId);
    }
  }

  function deleteEntry() {
    if (block?.category !== "RC" || !entry) return;
    if (!window.confirm(`${blockLabel}에서 이 단어를 삭제할까요?\n\n${entry.word}\n${entry.meaning}`)) return;

    try {
      const result = removeRegisteredWord(block.id, entry);
      setStatusMessage(result
        ? `「${entry.word}」 단어를 삭제했어요.`
        : "단어가 변경되었거나 이미 삭제되었습니다. 현재 카드를 확인해 주세요.");
    } catch {
      setStatusMessage("삭제 내용을 저장할 수 없습니다. 다시 시도해 주세요.");
    }
  }

  function goPrev() {
    if (index <= 0) return;
    setIndex((i) => i - 1);
    setStatusMessage(null);
  }

  function goNext() {
    setStatusMessage(null);
    if (index >= total - 1) {
      onBack();
      return;
    }
    setIndex((i) => i + 1);
  }

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 text-sm text-[var(--muted)]">
        불러오는 중…
      </div>
    );
  }

  if (form) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 animate-[fade-up_280ms_ease-out]">
        <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <button
            type="button"
            onClick={total === 0 ? onBack : closeForm}
            className="rounded-md px-2 py-1 transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          >
            {total === 0 ? "← 블록 목록" : "← 학습으로"}
          </button>
          <span>
            {blockLabel} · {total}/{WORDS_PER_BLOCK}
          </span>
        </div>

        <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">
          {isSentenceForm ? "문장" : "단어"} {form.editing ? "수정" : "등록"}
        </h1>
        {!form.editing && (
          <p className="mt-2 text-sm text-[var(--muted)]">
            블럭당 최대 {WORDS_PER_BLOCK}개입니다.
            {isFull
              ? " 가득 찬 상태라 등록하면 새 블럭이 만들어집니다."
              : ` 남은 자리 ${WORDS_PER_BLOCK - total}개.`}
          </p>
        )}

        <div className="mt-6">
          <RegisteredEntryForm
            kind={form.kind}
            original={form.editing?.original}
            submitLabel={form.editing ? "수정 저장" : isFull ? "새 블럭에 등록하기" : "등록하기"}
            onSave={saveEntry}
            onCancel={form.editing ? closeForm : undefined}
          />
        </div>
      </div>
    );
  }

  const formModes: FormMode[] = block?.category === "LC" ? ["sentence", "word"] : ["word"];
  const registrationButtons = formModes.map((formMode) => (
    <button
      key={formMode}
      type="button"
      onClick={() => openForm(formMode)}
      className={
        total === 0
          ? "rounded-md border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--fg)] first:border-[var(--accent)] first:bg-[var(--accent)] first:text-white hover:opacity-90"
          : "shrink-0 rounded-md border border-[var(--line)] bg-white px-3 py-1 text-xs font-medium text-[var(--fg)] hover:bg-[var(--accent-soft)]"
      }
    >
      {formMode === "sentence" ? "문장 등록" : "단어 등록"}
    </button>
  ));

  if (total === 0 || !entry) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 animate-[fade-up_280ms_ease-out]">
        <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md px-2 py-1 transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          >
            ← 블럭 선택
          </button>
          <span>
            {blockLabel} · 0/{WORDS_PER_BLOCK}
          </span>
        </div>

        <label className="mt-6 block">
          <span className="text-xs font-medium text-[var(--muted)]">
            블럭 이름
          </span>
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="mt-1 w-full max-w-sm rounded-md border border-[var(--line)] bg-white px-3 py-2 text-lg font-medium text-[var(--accent)] outline-none transition focus:border-[var(--accent)]"
          />
        </label>

        <p className="mt-3 text-sm text-[var(--muted)]">
          {block?.category === "LC"
            ? "영어 문장이나 단어를 뜻과 함께 등록해 보세요."
            : "아직 단어가 없어요. 「단어 등록」으로 추가하면 Day처럼 학습할 수 있습니다."}
          {" "}(블록당 최대 {WORDS_PER_BLOCK}개)
        </p>
        {statusMessage && <p role="status" className="mt-2 text-sm text-[var(--muted)]">{statusMessage}</p>}
        <div className="mt-8 flex flex-wrap gap-2">{registrationButtons}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 pt-2 text-sm text-[var(--muted)]">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-2 py-1 transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
        >
          ← 블럭 선택
        </button>
        <div className="flex min-w-0 items-center gap-2">
          {registrationButtons}
          <span className="truncate">
            {blockLabel} · {index + 1} / {total}
          </span>
        </div>
      </div>
      <div className="mx-auto mt-2 h-1 w-full max-w-3xl overflow-hidden px-4">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>

      <div className="mx-auto mt-3 w-full max-w-3xl px-4">
        <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <span className="shrink-0">이름</span>
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-white/80 px-2 py-1 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--accent)]"
          />
        </label>
      </div>

      <div
        key={`${entry.word}-${index}`}
        className="flex flex-1 flex-col items-center justify-center px-6 text-center animate-[fade-up_240ms_ease-out]"
      >
        <p className="text-xs text-[var(--muted)]">
          {blockLabel} · {total}/{WORDS_PER_BLOCK}
        </p>
        <p className={entry.isSentence
          ? "mt-4 max-w-full whitespace-pre-line wrap-anywhere text-2xl leading-relaxed text-[var(--fg)] sm:text-3xl"
          : "mt-4 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--fg)] sm:text-5xl"}>
          {entry.word}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <SpeakButton text={entry.word} label={entry.isSentence ? "문장 듣기" : undefined}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]" />
          <button type="button" onClick={() => openForm(entry.isSentence ? "sentence" : "word", entry)}
            className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--fg)] hover:bg-[var(--accent-soft)]">
            {entry.isSentence ? "문장 수정" : "단어 수정"}
          </button>
          {block?.category === "RC" && (
            <button type="button" onClick={deleteEntry}
              className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">
              단어 삭제
            </button>
          )}
        </div>
        {statusMessage && <p role="status" className="mt-2 text-sm text-[var(--muted)]">{statusMessage}</p>}
        <div className="mt-8 w-full max-w-lg">
          <p className="whitespace-pre-line wrap-anywhere text-xl font-medium text-[var(--accent)]">
            {entry.meaning}
          </p>
          {entry.example ? (
            <p className="mt-3 text-base leading-relaxed text-[var(--fg)]">
              <ExampleWithUnderline example={entry.example} word={entry.word} />
            </p>
          ) : !entry.isSentence ? (
            <p className="mt-3 text-sm text-[var(--muted)]">예문 없음</p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 px-4 pb-8">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="rounded-md border border-[var(--line)] bg-white px-4 py-4 text-sm font-medium text-[var(--fg)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          이전
        </button>
        <button
          type="button"
          onClick={goNext}
          className="rounded-md bg-[var(--accent)] px-4 py-4 text-sm font-medium text-white transition hover:opacity-90"
        >
          {index >= total - 1 ? "블럭 선택으로" : "다음"}
        </button>
      </div>
    </div>
  );
}
