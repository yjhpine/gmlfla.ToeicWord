/** 사용자가 직접 등록한 단어 블럭 (브라우저 로컬, 블럭당 최대 20개) */

import type { QuizWord } from "@/lib/words/types";
import { updateImportantWord } from "./important.ts";

export const REGISTERED_STORAGE_KEY = "heelim-toeic-registered-v2";
const LEGACY_STORAGE_KEY = "heelim-toeic-registered-v1";
export const REGISTERED_EVENT = "heelim-registered-updated";
export const WORDS_PER_BLOCK = 20;
export const REGISTERED_CATEGORIES = ["general", "LC", "RC"] as const;
export type RegisteredCategory = (typeof REGISTERED_CATEGORIES)[number];

export type RegisteredWord = {
  word: string;
  meaning: string;
  example: string;
  registeredAt: string;
  isSentence?: boolean;
};

export type RegisteredBlock = {
  id: string;
  name: string;
  category: RegisteredCategory;
  words: RegisteredWord[];
};

type StoreV2 = {
  version: 2;
  blocks: RegisteredBlock[];
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `reg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nextDefaultName(blocks: RegisteredBlock[]) {
  const used = new Set(blocks.map((b) => b.name));
  let n = 1;
  while (used.has(`등록 ${n}`)) n += 1;
  return `등록 ${n}`;
}

function ensureCategories(blocks: RegisteredBlock[]): RegisteredBlock[] {
  // Append new groups so existing negative quiz Day IDs keep their indices.
  const next = [...blocks];
  for (const category of REGISTERED_CATEGORIES) {
    if (!next.some((block) => block.category === category)) {
      next.push({ id: createId(), name: "등록 1", category, words: [] });
    }
  }
  return next;
}

export function registeredBlockLabel(block: RegisteredBlock): string {
  return block.category === "general"
    ? block.name
    : `${block.category} ${block.name}`;
}

function normalizeWord(item: Partial<RegisteredWord>): RegisteredWord | null {
  if (typeof item.word !== "string" || typeof item.meaning !== "string") {
    return null;
  }
  return {
    word: item.word.trim(),
    meaning: item.meaning.trim(),
    example: (item.example ?? "").trim(),
    registeredAt: item.registeredAt ?? new Date().toISOString(),
    ...(item.isSentence === true && { isSentence: true }),
  };
}

function chunkWords(words: RegisteredWord[]): RegisteredBlock[] {
  if (words.length === 0) {
    return [
      {
        id: createId(),
        name: "등록 1",
        category: "general",
        words: [],
      },
    ];
  }
  const blocks: RegisteredBlock[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_BLOCK) {
    blocks.push({
      id: createId(),
      name: `등록 ${blocks.length + 1}`,
      category: "general",
      words: words.slice(i, i + WORDS_PER_BLOCK),
    });
  }
  return blocks;
}

function migrateLegacy(): RegisteredBlock[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const words = parsed
      .map((item) =>
        item && typeof item === "object"
          ? normalizeWord(item as Partial<RegisteredWord>)
          : null,
      )
      .filter((w): w is RegisteredWord => w !== null);
    return chunkWords(words);
  } catch {
    return null;
  }
}

function emitUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(REGISTERED_EVENT));
}

function writeBlocks(blocks: RegisteredBlock[]) {
  if (typeof window === "undefined") return;
  const store: StoreV2 = { version: 2, blocks };
  window.localStorage.setItem(REGISTERED_STORAGE_KEY, JSON.stringify(store));
}

function saveBlocks(blocks: RegisteredBlock[]) {
  writeBlocks(blocks);
  emitUpdate();
}

export function loadRegisteredBlocks(): RegisteredBlock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REGISTERED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoreV2> | RegisteredWord[];
      if (Array.isArray(parsed)) {
        // 잘못된 형태면 레거시처럼 처리
        const words = parsed
          .map((item) => normalizeWord(item as Partial<RegisteredWord>))
          .filter((w): w is RegisteredWord => w !== null);
        const blocks = ensureCategories(chunkWords(words));
        saveBlocks(blocks);
        return blocks;
      }
      if (parsed && parsed.version === 2 && Array.isArray(parsed.blocks)) {
        const blocks = parsed.blocks
          .filter((b) => b && typeof b === "object")
          .map((b, index) => {
            const words = Array.isArray(b.words)
              ? b.words
                  .map((w) => normalizeWord(w))
                  .filter((w): w is RegisteredWord => w !== null)
                  .slice(0, WORDS_PER_BLOCK)
              : [];
            return {
              id: typeof b.id === "string" && b.id ? b.id : createId(),
              name:
                typeof b.name === "string" && b.name.trim()
                  ? b.name.trim()
                  : `등록 ${index + 1}`,
              category:
                b.category === "LC" || b.category === "RC"
                  ? b.category
                  : "general",
              words,
            } satisfies RegisteredBlock;
          });
        const next = ensureCategories(blocks);
        if (JSON.stringify(next) !== JSON.stringify(parsed.blocks)) {
          saveBlocks(next);
        }
        return next;
      }
    }

    const migrated = migrateLegacy();
    if (migrated) {
      const blocks = ensureCategories(migrated);
      saveBlocks(blocks);
      return blocks;
    }

    const empty = ensureCategories(chunkWords([]));
    saveBlocks(empty);
    return empty;
  } catch {
    return ensureCategories(chunkWords([]));
  }
}

/** 하위 호환: 전체 등록 단어 평탄화 */
export function loadRegisteredWords(): RegisteredWord[] {
  return loadRegisteredBlocks().flatMap((b) => b.words);
}

export function getRegisteredBlock(blockId: string): RegisteredBlock | null {
  return loadRegisteredBlocks().find((b) => b.id === blockId) ?? null;
}

/** QuizWord.day 로 쓸 음수 Day: -1, -2, ... */
export function registeredBlockDay(blockIndex: number): number {
  return -(blockIndex + 1);
}

export function isRegisteredDay(day: number): boolean {
  return day < 0;
}

export function registeredDayToBlockIndex(day: number): number {
  return -day - 1;
}

export function getRegisteredBlockByDay(day: number): RegisteredBlock | null {
  if (!isRegisteredDay(day)) return null;
  const blocks = loadRegisteredBlocks();
  return blocks[registeredDayToBlockIndex(day)] ?? null;
}

export function registeredLabelForDay(day: number): string {
  const block = getRegisteredBlockByDay(day);
  return block ? registeredBlockLabel(block) : "등록";
}

function toQuizWord(w: RegisteredWord, day: number): QuizWord {
  return {
    word: w.word,
    meaning: w.meaning,
    example: w.example,
    exampleMeaning: "",
    day,
    ...(w.isSentence && { isSentence: true }),
  };
}

export function registeredBlockToQuizWords(block: RegisteredBlock, blockIndex: number): QuizWord[] {
  const day = registeredBlockDay(blockIndex);
  return block.words.map((word) => toQuizWord(word, day));
}

type DatedQuizBlock = { id: string; name: string; words: QuizWord[] };

const registrationDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
});

export function registeredQuizDates(blocks: RegisteredBlock[], category: RegisteredCategory) {
  const dates = new Map<string, DatedQuizBlock[]>();
  blocks.forEach((block, blockIndex) => {
    if (block.category !== category) return;
    const byDate = new Map<string, QuizWord[]>();
    const quizWords = registeredBlockToQuizWords(block, blockIndex);
    block.words.forEach((word, index) => {
      const timestamp = Date.parse(word.registeredAt);
      const date = Number.isFinite(timestamp) ? registrationDate.format(timestamp) : "";
      const words = byDate.get(date);
      if (words) words.push(quizWords[index]);
      else byDate.set(date, [quizWords[index]]);
    });
    for (const [date, words] of byDate) {
      const range = { id: `${date}/${block.id}`, name: block.name, words };
      const ranges = dates.get(date);
      if (ranges) ranges.push(range);
      else dates.set(date, [range]);
    }
  });
  return [...dates].sort(([a], [b]) => b.localeCompare(a));
}

export function registeredToQuizWords(days?: number[]): QuizWord[] {
  const blocks = loadRegisteredBlocks();
  if (!days || days.length === 0) {
    return blocks.flatMap((block, index) =>
      registeredBlockToQuizWords(block, index),
    );
  }
  const selected = new Set(days.filter(isRegisteredDay));
  return blocks.flatMap((block, index) => {
    const day = registeredBlockDay(index);
    if (!selected.has(day)) return [];
    return registeredBlockToQuizWords(block, index);
  });
}

export function renameRegisteredBlock(blockId: string, name: string) {
  const nextName = name.trim();
  if (!nextName) return loadRegisteredBlocks();
  const blocks = loadRegisteredBlocks();
  const next = blocks.map((b) =>
    b.id === blockId ? { ...b, name: nextName.slice(0, 24) } : b,
  );
  saveBlocks(next);
  return next;
}

function matchesEntry(entry: RegisteredWord, key: string, isSentence: boolean) {
  return Boolean(entry.isSentence) === isSentence && entry.word.trim().toLowerCase() === key;
}

function matchesOriginal(entry: RegisteredWord, original: RegisteredWord) {
  return entry.word === original.word && entry.meaning === original.meaning &&
    entry.example === original.example && entry.registeredAt === original.registeredAt &&
    Boolean(entry.isSentence) === Boolean(original.isSentence);
}

export function editRegisteredWord(
  blockId: string,
  original: RegisteredWord,
  input: Pick<RegisteredWord, "word" | "meaning" | "example">,
): { ok: true; block: RegisteredBlock; index: number } | { ok: false; error: string } {
  const blocks = loadRegisteredBlocks();
  const blockIndex = blocks.findIndex((b) => b.id === blockId);
  const block = blocks[blockIndex];
  const isSentence = Boolean(original.isSentence);
  const index = block?.words.findIndex((w) => matchesOriginal(w, original)) ?? -1;
  if (index < 0) {
    return { ok: false, error: "항목이 변경되었거나 삭제되었습니다. 학습 화면에서 다시 열어 주세요." };
  }

  const word = input.word.trim();
  const meaning = input.meaning.trim();
  if (!word || !meaning) return { ok: false, error: "영어와 뜻을 모두 입력해 주세요." };
  const key = word.toLowerCase();
  const duplicate = blocks.some((b) => b.category === block.category && b.words.some(
    (w, i) => (b.id !== blockId || i !== index) && matchesEntry(w, key, isSentence),
  ));
  if (duplicate) {
    return { ok: false, error: `이 영역에 같은 ${isSentence ? "문장이" : "단어가"} 이미 있습니다.` };
  }

  const updated = { ...block.words[index], word, meaning, example: isSentence ? "" : input.example.trim() };
  const nextBlock = { ...block, words: [...block.words] };
  nextBlock.words[index] = updated;
  const nextBlocks = [...blocks];
  nextBlocks[blockIndex] = nextBlock;
  const day = registeredBlockDay(blockIndex);
  const storageError = "변경 내용을 저장할 수 없습니다. 브라우저 저장 공간을 확인하고 다시 시도해 주세요.";
  try {
    writeBlocks(nextBlocks);
  } catch {
    return { ok: false, error: storageError };
  }
  try {
    updateImportantWord(toQuizWord(original, day), toQuizWord(updated, day));
  } catch {
    writeBlocks(blocks);
    return { ok: false, error: storageError };
  }
  emitUpdate();
  return { ok: true, block: nextBlock, index };
}

export type RegistrationInput = Pick<RegisteredWord, "word" | "meaning"> & { example?: string };

type RegistrationResult =
  | { ok: true; firstBlock: RegisteredBlock; count: number; newBlockCount: number }
  | { ok: false; error: string };

function storeEntries(
  inputs: readonly RegistrationInput[],
  blocks: RegisteredBlock[],
  target: RegisteredBlock | undefined,
  isSentence: boolean,
): RegistrationResult {
  if (!target) return { ok: false, error: "등록할 블록을 다시 열어 주세요." };
  const registeredAt = new Date().toISOString();
  const entries = new Map<string, RegisteredWord>();
  const keepExamples = new Set<string>();
  for (const [index, input] of inputs.entries()) {
    const word = input.word.trim();
    const meaning = input.meaning.trim();
    const example = isSentence ? "" : input.example?.trim() ?? "";
    if (!word && !meaning && !example) continue;
    if (!word || !meaning) return { ok: false, error: `${index + 1}행의 영어와 뜻을 모두 입력해 주세요.` };
    const key = word.toLowerCase();
    if (entries.has(key)) return { ok: false, error: `${index + 1}행의 「${word}」가 표에 두 번 입력됐어요.` };
    if (!isSentence && input.example === undefined) keepExamples.add(key);
    entries.set(key, { word, meaning, example, registeredAt, ...(isSentence && { isSentence: true }) });
  }
  if (!entries.size) return { ok: false, error: "등록할 영어와 뜻을 한 줄 이상 입력해 주세요." };

  const category = target.category;
  for (const block of blocks) {
    if (block.category !== category) continue;
    block.words = block.words.filter((previous) => {
      const key = previous.word.toLowerCase();
      const replacement = entries.get(key);
      if (!replacement || Boolean(previous.isSentence) !== isSentence) return true;
      if (keepExamples.has(key)) replacement.example = previous.example;
      return false;
    });
  }

  const words = Array.from(entries.values());
  let firstBlock = target;
  let newBlockCount = 0;
  let offset = 0;
  while (offset < words.length) {
    if (target.words.length === WORDS_PER_BLOCK) {
      target = { id: createId(), name: nextDefaultName(blocks.filter((b) => b.category === category)), category, words: [] };
      blocks.push(target);
      newBlockCount++;
    }
    if (offset === 0) firstBlock = target;
    const chunk = words.slice(offset, offset + WORDS_PER_BLOCK - target.words.length);
    target.words.unshift(...chunk);
    offset += chunk.length;
  }

  try {
    saveBlocks(blocks);
  } catch {
    return { ok: false, error: "등록 내용을 저장할 수 없습니다. 브라우저 저장 공간을 확인하고 다시 시도해 주세요." };
  }
  return { ok: true, firstBlock, count: words.length, newBlockCount };
}

export function registerEntries(inputs: readonly RegistrationInput[], blockId: string, isSentence = false) {
  const blocks = loadRegisteredBlocks();
  const target = blocks.find((b) => b.id === blockId && (!isSentence || b.category === "LC"));
  return storeEntries(inputs, blocks, target, isSentence);
}

export function registerWord(
  input: Pick<RegisteredWord, "word" | "meaning" | "example" | "isSentence">,
  blockId?: string,
) {
  const blocks = loadRegisteredBlocks();
  const isSentence = input.isSentence === true;
  const target = blocks.find((b) => b.id === blockId && (!isSentence || b.category === "LC"))
    ?? blocks.findLast((b) => b.category === (isSentence ? "LC" : "general"));
  const result = storeEntries([input], blocks, target, isSentence);
  if (!result.ok) throw new Error(result.error);
  return { blocks, blockId: result.firstBlock.id, createdNewBlock: result.newBlockCount > 0 };
}

export function removeRegisteredWord(blockId: string, word: string, isSentence?: boolean): RegisteredBlock[];
export function removeRegisteredWord(blockId: string, original: RegisteredWord): RegisteredBlock[] | null;
export function removeRegisteredWord(blockId: string, target: string | RegisteredWord, isSentence = false) {
  const blocks = loadRegisteredBlocks();
  const block = blocks.find((b) => b.id === blockId);
  if (typeof target === "string") {
    if (!block) return blocks;
    const key = target.trim().toLowerCase();
    block.words = block.words.filter((w) => !matchesEntry(w, key, isSentence));
  } else {
    const index = block?.words.findIndex((w) => matchesOriginal(w, target)) ?? -1;
    if (!block || index < 0) return null;
    block.words.splice(index, 1);
  }
  // Keep empty blocks: their IDs, category and quiz Day indices must stay stable.
  saveBlocks(blocks);
  return blocks;
}

/** 하위 호환 상수 (단일 등록 Day). 블럭 시스템에서는 isRegisteredDay 사용 */
export const REGISTERED_DAY = -1;
