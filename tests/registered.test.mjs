import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import {
  REGISTERED_STORAGE_KEY,
  loadRegisteredBlocks,
  registerWord,
  removeRegisteredWord,
  renameRegisteredBlock,
  registeredLabelForDay,
  registeredToQuizWords,
} from '../src/lib/registered.ts';

const word = (value, meaning = '뜻') => ({
  word: value, meaning, example: '', registeredAt: '2026-01-01T00:00:00.000Z',
});
const blockIn = (category) => loadRegisteredBlocks().find((b) => b.category === category);

beforeEach(() => {
  const values = new Map();
  globalThis.window = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
    },
  });
});
afterEach(() => { delete globalThis.window; });

test('new stores have independent general, LC and RC blocks with stable IDs', () => {
  const blocks = loadRegisteredBlocks();
  assert.deepEqual(blocks.map((b) => [b.category, b.name, b.words.length]), [
    ['general', '등록 1', 0], ['LC', '등록 1', 0], ['RC', '등록 1', 0],
  ]);
  assert.equal(new Set(blocks.map((b) => b.id)).size, 3);
  assert.deepEqual(loadRegisteredBlocks(), blocks);
});

test('existing v2 words, names, IDs, order and quiz Days survive adding categories', () => {
  const old = [
    { id: 'old-1', name: '내 단어', words: [word('old')] },
    { id: 'old-2', name: '복습', words: [word('review')] },
  ];
  window.localStorage.setItem(REGISTERED_STORAGE_KEY, JSON.stringify({ version: 2, blocks: old }));
  const blocks = loadRegisteredBlocks();
  assert.deepEqual(blocks.slice(0, 2), old.map((b) => ({ ...b, category: 'general' })));
  assert.deepEqual(blocks.slice(2).map((b) => [b.category, b.words.length]), [['LC', 0], ['RC', 0]]);
  assert.equal(registeredLabelForDay(-1), '내 단어');
  assert.equal(registeredLabelForDay(-2), '복습');
  assert.deepEqual(registeredToQuizWords([-2]).map((w) => w.word), ['review']);
  assert.deepEqual(loadRegisteredBlocks(), blocks);
});

test('v1 legacy words remain in general blocks; migration repeats without duplication', () => {
  const words = Array.from({ length: 21 }, (_, i) => word(`legacy-${i}`));
  window.localStorage.setItem('heelim-toeic-registered-v1', JSON.stringify(words));
  const blocks = loadRegisteredBlocks();
  assert.deepEqual(blocks.filter((b) => b.category === 'general').flatMap((b) => b.words), words);
  assert.deepEqual(blocks.map((b) => b.words.length), [20, 1, 0, 0]);
  assert.deepEqual(loadRegisteredBlocks(), blocks);
});

test('the same word can be registered separately in general, LC and RC', () => {
  for (const category of ['general', 'LC', 'RC']) {
    registerWord(word('shared', category), blockIn(category).id);
  }
  const lc = blockIn('LC');
  registerWord(word('SHARED', 'updated LC'), lc.id);
  assert.equal(blockIn('general').words[0].meaning, 'general');
  assert.equal(blockIn('RC').words[0].meaning, 'RC');
  assert.deepEqual(blockIn('LC').words.map((w) => w.meaning), ['updated LC']);
});

test('overflow stays in its category and keeps other empty blocks and quiz IDs', () => {
  const initial = loadRegisteredBlocks();
  const lc = blockIn('LC');
  const rc = blockIn('RC');
  for (let i = 0; i < 20; i++) registerWord(word(`lc-${i}`), lc.id);
  const result = registerWord(word('lc-overflow'), lc.id);
  assert.equal(result.createdNewBlock, true);
  assert.deepEqual(result.blocks.slice(0, 3).map((b) => b.id), initial.map((b) => b.id));
  const extra = result.blocks.find((b) => b.id === result.blockId);
  assert.equal(extra.category, 'LC');
  assert.equal(extra.name, '등록 2');
  registerWord(word('rc-word'), rc.id);
  assert.deepEqual(registeredToQuizWords([-3]).map((w) => w.word), ['rc-word']);
  assert.deepEqual(registeredToQuizWords([-4]).map((w) => w.word), ['lc-overflow']);
  assert.equal(registeredLabelForDay(-4), 'LC 등록 2');
});

test('renaming and removing the last word retain group identity and quiz indices', () => {
  const initial = loadRegisteredBlocks();
  const lc = blockIn('LC');
  const rc = blockIn('RC');
  registerWord(word('listen'), lc.id);
  registerWord(word('read'), rc.id);
  renameRegisteredBlock(lc.id, '듣기 복습');
  removeRegisteredWord(lc.id, 'listen');
  assert.deepEqual(loadRegisteredBlocks().map((b) => b.id), initial.map((b) => b.id));
  assert.equal(blockIn('LC').name, '듣기 복습');
  assert.equal(blockIn('LC').words.length, 0);
  assert.equal(registeredLabelForDay(-2), 'LC 듣기 복습');
  assert.deepEqual(registeredToQuizWords([-3]).map((w) => w.word), ['read']);
});

test('calls without a block ID continue registering in the general group', () => {
  registerWord(word('original'));
  assert.deepEqual(blockIn('general').words.map((w) => w.word), ['original']);
  assert.equal(blockIn('LC').words.length, 0);
  assert.equal(blockIn('RC').words.length, 0);
});
