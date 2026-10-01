/** 사용자가 직접 등록한 단어 블럭 (브라우저 로컬, 블럭당 최대 20개) */

import type { QuizWord } from "@/lib/words/types";

export const REGISTERED_STORAGE_KEY = "heelim-toeic-registered-v2";
const LEGACY_STORAGE_KEY = "heelim-toeic-registered-v1";
export const REGISTERED_EVENT = "heelim-registered-updated";
export const WORDS_PER_BLOCK = 20;

export type RegisteredWord = {
  word: string;
  meaning: string;
  example: string;
  registeredAt: string;
};

export type RegisteredBlock = {
  id: string;
  name: string;
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

function normalizeWord(item: Partial<RegisteredWord>): RegisteredWord | null {
  if (typeof item.word !== "string" || typeof item.meaning !== "string") {
    return null;
  }
  return {
    word: item.word.trim(),
    meaning: item.meaning.trim(),
    example: (item.example ?? "").trim(),
    registeredAt: item.registeredAt ?? new Date().toISOString(),
  };
}

function chunkWords(words: RegisteredWord[]): RegisteredBlock[] {
  if (words.length === 0) {
    return [
      {
        id: createId(),
        name: "등록 1",
        words: [],
      },
    ];
  }
  const blocks: RegisteredBlock[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_BLOCK) {
    blocks.push({
      id: createId(),
      name: `등록 ${blocks.length + 1}`,
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

function saveBlocks(blocks: RegisteredBlock[]) {
  if (typeof window === "undefined") return;
  const store: StoreV2 = { version: 2, blocks };
  window.localStorage.setItem(REGISTERED_STORAGE_KEY, JSON.stringify(store));
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
        const blocks = chunkWords(words);
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
              words,
            } satisfies RegisteredBlock;
          });
        if (blocks.length === 0) {
          const empty = chunkWords([]);
          saveBlocks(empty);
          return empty;
        }
        return blocks;
      }
    }

    const migrated = migrateLegacy();
    if (migrated) {
      saveBlocks(migrated);
      return migrated;
    }

    const empty = chunkWords([]);
    saveBlocks(empty);
    return empty;
  } catch {
    return chunkWords([]);
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
  return getRegisteredBlockByDay(day)?.name ?? "등록";
}

export function registeredBlockToQuizWords(
  block: RegisteredBlock,
  blockIndex: number,
): QuizWord[] {
  const day = registeredBlockDay(blockIndex);
  return block.words.map((w) => ({
    word: w.word,
    meaning: w.meaning,
    example: w.example,
    exampleMeaning: "",
    day,
  }));
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

/** 단어 등록. 지정 블럭이 가득 차면 새 블럭을 만들고 그쪽에 추가 */
export function registerWord(
  input: {
    word: string;
    meaning: string;
    example: string;
  },
  blockId?: string,
): { blocks: RegisteredBlock[]; blockId: string; createdNewBlock: boolean } {
  const word = input.word.trim();
  const meaning = input.meaning.trim();
  const example = input.example.trim();
  const key = word.toLowerCase();
  let blocks = loadRegisteredBlocks().map((b) => ({
    ...b,
    words: b.words.filter((w) => w.word.trim().toLowerCase() !== key),
  }));

  const entry: RegisteredWord = {
    word,
    meaning,
    example,
    registeredAt: new Date().toISOString(),
  };

  let targetIndex = blockId
    ? blocks.findIndex((b) => b.id === blockId)
    : blocks.length - 1;
  if (targetIndex < 0) targetIndex = Math.max(blocks.length - 1, 0);
  const target = blocks[targetIndex];

  if (!target || target.words.length >= WORDS_PER_BLOCK) {
    const created: RegisteredBlock = {
      id: createId(),
      name: nextDefaultName(blocks),
      words: [entry],
    };
    const next = [...blocks.filter((b) => b.words.length > 0), created];
    saveBlocks(next);
    return { blocks: next, blockId: created.id, createdNewBlock: true };
  }

  const next = blocks
    .map((b, i) =>
      i === targetIndex
        ? { ...b, words: [entry, ...b.words].slice(0, WORDS_PER_BLOCK) }
        : b,
    )
    .filter((b) => b.words.length > 0);
  const finalBlocks = next.length > 0 ? next : chunkWords([]);
  saveBlocks(finalBlocks);
  return {
    blocks: finalBlocks,
    blockId: target.id,
    createdNewBlock: false,
  };
}

export function removeRegisteredWord(blockId: string, word: string) {
  const key = word.trim().toLowerCase();
  let blocks = loadRegisteredBlocks().map((b) =>
    b.id === blockId
      ? { ...b, words: b.words.filter((w) => w.word.trim().toLowerCase() !== key) }
      : b,
  );
  // 빈 블럭 제거, 하나도 없으면 등록 1 생성
  blocks = blocks.filter((b) => b.words.length > 0);
  if (blocks.length === 0) {
    blocks = chunkWords([]);
  }
  saveBlocks(blocks);
  return blocks;
}

/** 하위 호환 상수 (단일 등록 Day). 블럭 시스템에서는 isRegisteredDay 사용 */
export const REGISTERED_DAY = -1;
